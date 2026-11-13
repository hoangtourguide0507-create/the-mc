// Kiểm thử chế độ Hậu trường (src/core/backstage.ts, src/core/aiClient.ts, splitSentences/voiceFor).
// Chạy: npm run test:backstage
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-backstage-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-backstage-entry-${process.pid}.ts`);
const q = (rel) => JSON.stringify(path.join(root, rel));
writeFileSync(
  entry,
  [
    `export * as B from ${q('src/core/backstage.ts')};`,
    `export * as A from ${q('src/core/aiClient.ts')};`,
    `export { PERSONAS } from ${q('src/data/backstage.ts')};`,
  ].join('\n')
);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { B, A, PERSONAS } = await import(pathToFileURL(outfile).href);

// liveVoice kéo theo audioSystem (DOM), nên chỉ dựng riêng hai hàm thuần của nó
const lvOut = path.join(os.tmpdir(), `mc-livevoice-${process.pid}.mjs`);
await build({
  entryPoints: [path.join(root, 'src/audio/liveVoice.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: lvOut,
  logLevel: 'silent',
  external: ['kokoro-js', '@huggingface/transformers'],
  plugins: [{ name: 'stub-audio', setup(b) { b.onResolve({ filter: /audioSystem$/ }, () => ({ path: 'stub', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const ClipAudio = { play: async () => "ended", stop() {} }; export const SFX = { ctx: null };' })); } }],
});
const LV = await import(pathToFileURL(lvOut).href);

const kokoro = JSON.parse(readFileSync(path.join(root, 'tools/voices.kokoro.json'), 'utf8'));

// 1) Vai: đủ trường, id không trùng, giọng có thật và là giọng đơn (một vai, một giọng)
const ids = new Set();
for (const p of PERSONAS) {
  for (const k of ['id', 'name', 'voiceRole', 'roleVi', 'role', 'setting', 'goal', 'goalVi', 'twist', 'opener', 'openerVi']) {
    assert.ok(typeof p[k] === 'string' && p[k].trim().length > 0, `${p.id}: thiếu ${k}`);
  }
  assert.ok(!ids.has(p.id), `trùng id ${p.id}`);
  ids.add(p.id);
  const v = kokoro.roles[p.voiceRole];
  assert.ok(v, `${p.id}: vai giọng ${p.voiceRole} không có trong voices.kokoro.json`);
  assert.ok(!v.voice.includes('+'), `${p.id}: giọng ${v.voice} là giọng trộn, bản trình duyệt không đọc giống clip được`);
  assert.equal(LV.voiceFor(p.voiceRole).voice, v.voice);
  assert.ok(p.opener.split(' ').length <= 45, `${p.id}: câu mở đầu quá dài`);
}
assert.ok(PERSONAS.length >= 6);

// 2) Lời nhắc: có vai, mục tiêu, rắc rối, và yêu cầu JSON
const P = PERSONAS[0];
const sys = B.systemPrompt(P);
assert.ok(sys.includes(P.goal) && sys.includes(P.twist) && sys.includes('JSON'));

// 3) buildMessages: system trước, lịch sử đúng vai, câu mới ở cuối, cắt cửa sổ nhưng giữ câu mở đầu
let hist = [{ who: 'npc', text: P.opener }];
let msgs = B.buildMessages(P, hist, '  Hi   Emma, sure!  ');
assert.equal(msgs[0].role, 'system');
assert.equal(msgs[1].role, 'assistant');
assert.equal(JSON.parse(msgs[1].content).reply, P.opener);
assert.deepEqual(msgs.at(-1), { role: 'user', content: 'Hi Emma, sure!' });
const long = [{ who: 'npc', text: P.opener }];
for (let i = 0; i < 20; i++) long.push({ who: i % 2 ? 'npc' : 'me', text: `line ${i}` });
msgs = B.buildMessages(P, long, 'next');
assert.equal(msgs.length, 1 + 1 + B.HISTORY_WINDOW + 1, 'system + câu mở đầu + cửa sổ + câu mới');
assert.equal(JSON.parse(msgs[1].content).reply, P.opener);
assert.equal(B.cleanInput('x'.repeat(1000)).length, 400);

// 4) parseAiReply: JSON chuẩn, có rào ```, chữ thừa, không phải JSON, sửa chỉ khác dấu câu thì bỏ
let r = B.parseAiReply('{"reply":"Great! What time?","correction":{"fixed":"I agree with you.","noteVi":"Agree là động từ."},"goalMet":false}', 'I am agree with you');
assert.equal(r.reply, 'Great! What time?');
assert.deepEqual(r.correction, { original: 'I am agree with you', fixed: 'I agree with you.', noteVi: 'Agree là động từ.' });
assert.equal(r.goalMet, false);
r = B.parseAiReply('```json\n{"reply":"Bye!","correction":null,"goalMet":true}\n```', 'thanks');
assert.equal(r.reply, 'Bye!');
assert.equal(r.correction, null);
assert.equal(r.goalMet, true);
r = B.parseAiReply('Sure thing. {"reply":"Okay.","correction":null} hope that helps', 'ok');
assert.equal(r.reply, 'Okay.');
r = B.parseAiReply('Sounds lovely, see you then.', 'ok');
assert.equal(r.reply, 'Sounds lovely, see you then.');
assert.equal(r.correction, null);
r = B.parseAiReply('{"reply":"Okay.","correction":{"fixed":"Yes, of course.","noteVi":"x"}}', 'yes of course');
assert.equal(r.correction, null, 'chỉ khác hoa thường/dấu câu thì không tính là lỗi');
r = B.parseAiReply('{"correction":{"fixed":""}}', 'hi');
assert.ok(r.reply.length > 0 && r.correction === null, 'thiếu reply thì có câu dự phòng');
r = B.parseAiReply('', 'hi');
assert.ok(r.reply.length > 0);

// 5) Kết thúc và tổng kết
hist = [{ who: 'npc', text: 'a' }];
for (let i = 0; i < B.MAX_MY_TURNS - 1; i++) hist.push({ who: 'me', text: 'x' }, { who: 'npc', text: 'y' });
assert.equal(B.isFinished(hist, false), false);
hist.push({ who: 'me', text: 'x' });
assert.equal(B.isFinished(hist, false), true, 'đủ 10 lượt thì kết thúc');
assert.equal(B.isFinished([{ who: 'npc', text: 'a' }], true), true, 'đạt mục tiêu thì kết thúc');
const sum = B.summarize(
  [
    { who: 'npc', text: 'a' },
    { who: 'me', text: 'x', correction: { original: 'x', fixed: 'y', noteVi: '' } },
    { who: 'npc', text: 'b' },
    { who: 'me', text: 'z', correction: null },
  ],
  true
);
assert.equal(sum.myTurns, 2);
assert.equal(sum.corrected, 1);
assert.equal(sum.cleanPct, 50);
assert.equal(sum.xp, 2 * 2 + 1 + 10);
assert.equal(B.summarize([{ who: 'npc', text: 'a' }], false).xp, 0);

// 6) AI giả: sửa lỗi điển hình, câu đúng thì không sửa, đủ lượt thì đạt mục tiêu
r = B.mockReply(P, [{ who: 'npc', text: 'a' }], 'I am agree and he have a plan');
assert.equal(r.correction.fixed, 'I agree and he has a plan');
assert.equal(B.mockReply(P, [{ who: 'npc', text: 'a' }], 'Sure, let us do that.').correction, null);
const h5 = [{ who: 'npc', text: 'a' }];
for (let i = 0; i < 5; i++) h5.push({ who: 'me', text: 'x' }, { who: 'npc', text: 'y' });
assert.equal(B.mockReply(P, h5, 'ok').goalMet, true);

// 7) aiClient: khoá, phân loại lỗi, gửi đúng yêu cầu, đọc nội dung
assert.equal(A.looksLikeKey('gsk_' + 'a'.repeat(40)), true);
assert.equal(A.looksLikeKey('sk-abc'), false);
assert.equal(A.classifyStatus(401), 'bad-key');
assert.equal(A.classifyStatus(429), 'rate-limit');
assert.equal(A.classifyStatus(500), 'server');
let sent = null;
const okFetch = async (url, init) => {
  sent = { url, init };
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"reply":"Hi"}' } }] }) };
};
assert.equal(await A.chatCompletion('gsk_x', [{ role: 'user', content: 'hi' }], okFetch), '{"reply":"Hi"}');
assert.equal(sent.url, A.GROQ_URL);
assert.equal(sent.init.headers.Authorization, 'Bearer gsk_x');
const body = JSON.parse(sent.init.body);
assert.equal(body.model, A.GROQ_MODEL);
assert.deepEqual(body.response_format, { type: 'json_object' });
await assert.rejects(A.chatCompletion('', [], okFetch), (e) => e.kind === 'no-key');
await assert.rejects(A.chatCompletion('k', [], async () => ({ ok: false, status: 429, json: async () => ({}) })), (e) => e.kind === 'rate-limit');
await assert.rejects(A.chatCompletion('k', [], async () => { throw new Error('offline'); }), (e) => e.kind === 'network');
await assert.rejects(A.chatCompletion('k', [], async () => ({ ok: true, status: 200, json: async () => ({}) })), (e) => e.kind === 'server');

// 8) Tách câu để phát dần: gộp mẩu quá ngắn
assert.deepEqual(LV.splitSentences('Oh! That is great news. See you at nine?'), ['Oh! That is great news.', 'See you at nine?']);
assert.deepEqual(LV.splitSentences('No punctuation here'), ['No punctuation here']);
assert.equal(LV.voiceFor('nadia').voice, 'bf_emma', 'giọng trộn lấy thành phần đầu');
assert.equal(LV.voiceFor('khong-co').voice, 'bf_emma');

// 9) Kiểm tra âm thanh có tiếng (để biết GPU có tạo ra âm câm không)
assert.equal(LV.audible(new Float32Array(2400)), false, 'toàn số 0 là câm');
assert.equal(LV.audible(Float32Array.from({ length: 2400 }, (_, i) => Math.sin(i / 5) * 0.2)), true);
assert.equal(LV.audible(Float32Array.from([0.3, NaN, 0.2])), false, 'NaN là lỗi');
assert.equal(LV.audible([]), false);

// 10) WAV 16-bit PCM (iPhone không phát WAV số thực 32-bit)
const wav = new DataView(LV.encodeWav16(Float32Array.from([0, 1, -1, 0.5, 2]), 24000));
assert.equal(wav.byteLength, 44 + 10);
assert.equal(String.fromCharCode(wav.getUint8(0), wav.getUint8(1), wav.getUint8(2), wav.getUint8(3)), 'RIFF');
assert.equal(wav.getUint16(20, true), 1, 'định dạng PCM');
assert.equal(wav.getUint16(34, true), 16, '16 bit');
assert.equal(wav.getUint32(24, true), 24000);
assert.equal(wav.getUint32(40, true), 10);
assert.deepEqual([44, 46, 48, 50, 52].map((o) => wav.getInt16(o, true)), [0, 32767, -32767, 16384, 32767], 'cắt ngọn ngoài [-1, 1]');

// 11) Chốt chống kẹt: việc xong kịp thì trả kết quả; đứng im quá hạn thì báo lỗi; còn tick thì chưa tính là kẹt
assert.equal(await LV.withStallGuard(async () => 'ok', 200, 'kẹt'), 'ok');
await assert.rejects(LV.withStallGuard(() => new Promise(() => {}), 60, 'kẹt'), /kẹt/);
await assert.rejects(LV.withStallGuard(async () => { throw new Error('hỏng'); }, 200, 'kẹt'), /hỏng/);
assert.equal(
  await LV.withStallGuard(async (tick) => {
    for (let i = 0; i < 5; i++) { await new Promise((r) => setTimeout(r, 40)); tick(); }
    return 'xong';
  }, 100, 'kẹt'),
  'xong'
);

console.log('backstage: OK');
