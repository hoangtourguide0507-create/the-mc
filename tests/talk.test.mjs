// Kiểm thử Trò chuyện rẽ nhánh (src/core/talk.ts, src/data/talks.ts). Chạy: npm run test:talk
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collect, loadContent, normText } from '../tools/voice-lines.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-talk-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-talk-entry-${process.pid}.ts`);
const q = (rel) => JSON.stringify(path.join(root, rel));
writeFileSync(entry, `export * as T from ${q('src/core/talk.ts')};\nexport { TALKS } from ${q('src/data/talks.ts')};\nexport { NPCS } from ${q('src/data/content.ts')};`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { T, TALKS, NPCS } = await import(pathToFileURL(outfile).href);
const kokoro = JSON.parse(readFileSync(path.join(root, 'tools/voices.kokoro.json'), 'utf8'));

const OFF_TOPIC = ['I had noodles for lunch with my cousin.', 'My favourite colour is blue and green.'];
const BARE = ['Yes.', 'Okay.', 'Sure.', 'No problem.', 'Hello.'];

assert.ok(TALKS.length >= 6);
const ids = new Set();
let lines = 0;
for (const talk of TALKS) {
  assert.ok(!ids.has(talk.id), `trùng id ${talk.id}`);
  ids.add(talk.id);
  assert.ok(NPCS[talk.npcId], `${talk.id}: không có nhân vật ${talk.npcId}`);
  const role = talk.npcId === 'couple' ? `couple:${talk.speaker}` : talk.npcId;
  assert.ok(kokoro.roles[role]?.voice, `${talk.id}: vai ${role} chưa có giọng Kokoro`);
  assert.ok(talk.nodes.length >= 5 && talk.end && talk.endVi && talk.goalVi && talk.roleVi);
  talk.nodes.forEach((node, ni) => {
    const at = `${talk.id} lượt ${ni + 1}`;
    for (const k of ['ask', 'askVi', 'task', 'nudge']) assert.ok(node[k]?.trim(), `${at}: thiếu ${k}`);
    const specific = node.replies.filter((r) => !r.stay);
    assert.ok(specific.length >= 1 && specific.every((r) => r.say), `${at}: ý cụ thể phải có câu mẫu`);
    assert.ok(node.replies.some((r) => r.stay), `${at}: cần một nhánh trả lời mơ hồ`);
    assert.equal(new Set(node.replies.map((r) => r.react)).size, node.replies.length, `${at}: các câu đáp phải khác nhau`);
    // Câu mẫu phải được nhận đúng ý của chính nó
    node.replies.forEach((r, ri) => {
      lines++;
      assert.ok(r.react?.trim() && r.label?.trim() && r.need.length > 0, `${at}: nhánh ${ri} thiếu dữ liệu`);
      if (!r.say) return;
      const m = T.matchReply(node, [r.say]);
      assert.ok(m, `${at}: câu mẫu không được nhận: ${r.say}`);
      assert.equal(m.index, ri, `${at}: câu mẫu "${r.say}" bị nhận nhầm thành "${m.reply.label}"`);
    });
    // Câu lạc đề không được đi tiếp; câu cụt lủn không được đi tiếp
    for (const s of [...OFF_TOPIC, ...BARE]) {
      const m = T.matchReply(node, [s]);
      assert.ok(!m || m.reply.stay, `${at}: "${s}" không được tính là trả lời đạt (trúng "${m?.reply.label}")`);
    }
    assert.equal(T.matchReply(node, [OFF_TOPIC[0]]), null, `${at}: câu lạc đề phải không trúng ý nào`);
  });
}

// Luật đi tiếp
const talk = TALKS[0];
const n0 = talk.nodes[0];
let st = T.newTalk();
let s = T.step(talk, st, [n0.replies[0].say]);
assert.equal(s.outcome, 'advance');
assert.equal(s.gained, T.POINTS_FIRST);
assert.deepEqual(s.npc, [n0.replies[0].react, talk.nodes[1].ask], 'nhân vật đáp theo ý rồi hỏi tiếp');
assert.deepEqual(s.state, { node: 1, tries: 0, points: 2, done: false });

// Mơ hồ → hỏi vặn, chưa đi tiếp; trả lời đạt ở lần hai được 1 điểm
s = T.step(talk, st, ['Yes.']);
assert.equal(s.outcome, 'press');
assert.equal(s.state.node, 0);
assert.equal(s.reveal, false);
assert.deepEqual(s.npc, [n0.replies.find((r) => r.stay).react]);
let s2 = T.step(talk, s.state, [n0.replies[0].say]);
assert.equal(s2.outcome, 'advance');
assert.equal(s2.gained, T.POINTS_LATER);

// Không rõ ý → hỏi lại; lần hai hiện câu mẫu; lần ba tự đi tiếp, 0 điểm
s = T.step(talk, st, [OFF_TOPIC[0]]);
assert.equal(s.outcome, 'nudge');
assert.deepEqual(s.npc, [n0.nudge]);
s = T.step(talk, s.state, [OFF_TOPIC[1]]);
assert.equal(s.reveal, true);
s = T.step(talk, s.state, [OFF_TOPIC[0]]);
assert.equal(s.outcome, 'forced');
assert.equal(s.gained, 0);
assert.equal(s.state.node, 1);

// Máy nghe ra nhiều phương án: lấy phương án trúng ý cụ thể
assert.equal(T.matchReply(n0, ['yes', n0.replies[0].say]).index, 0);

// Chơi hết bằng câu mẫu: đủ điểm, 3 sao, câu cuối là lời chào kết
for (const t of TALKS) {
  let x = T.newTalk();
  let last;
  while (!x.done) {
    last = T.step(t, x, [T.firstSample(t.nodes[x.node]).say]);
    x = last.state;
  }
  assert.equal(x.points, T.maxPoints(t));
  assert.equal(last.npc.at(-1), t.end);
  assert.equal(T.starsFor(x.points, T.maxPoints(t)), 3);
}
assert.equal(T.starsFor(0, 10), 0);
assert.equal(T.starsFor(5, 10), 1);
assert.equal(T.starsFor(6, 10), 2);
assert.equal(T.starsFor(9, 10), 3);
assert.equal(T.xpFor(10, 10), 26);
assert.equal(T.xpFor(4, 10), 8);

// Mọi câu nhân vật và câu mẫu đều nằm trong danh sách render giọng (phase talk)
const keys = new Set(collect(await loadContent()).filter((i) => i.phase === 'talk').map((i) => i.key));
for (const t of TALKS) {
  const role = t.npcId === 'couple' ? `couple:${t.speaker}` : t.npcId;
  const need = [[role, t.end]];
  for (const n of t.nodes) {
    need.push([role, n.ask], [role, n.nudge]);
    for (const r of n.replies) {
      need.push([role, r.react]);
      if (r.say) need.push(['coach', r.say]);
    }
  }
  for (const [ro, text] of need) assert.ok(keys.has(`${ro}|${normText(text)}`), `thiếu giọng: [${ro}] ${text}`);
}
assert.ok(kokoro.phases.includes('talk'), 'voices.kokoro.json phải có phase talk');

console.log(`talk: ${TALKS.length} cuộc, ${lines} nhánh — OK`);
