// Kiểm thử "Hỏi AI" trong thẻ từ: gọi Groq có dự phòng mô hình (src/core/aiClient.ts), dựng câu hỏi
// và tách câu trả lời (src/core/ask.ts), lưu hỏi đáp vào sổ (addQa). Không gọi mạng thật.
// Chạy: npm run test:ask
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (entry, name) => {
  const outfile = path.join(os.tmpdir(), `mc-${name}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const C = await load('src/core/aiClient.ts', 'ai');
const A = await load('src/core/ask.ts', 'ask');
const N = await load('src/core/notes.ts', 'ask-notes');

const ok = (content) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const recorder = (replies) => {
  const calls = [];
  const fetcher = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const r = replies[calls.length - 1];
    if (r === 'throw') throw new Error('offline');
    return r;
  };
  return { calls, fetcher };
};

// Chưa có khoá
await assert.rejects(C.chatText('', []), (e) => e.kind === 'no-key');

// Thành công ngay: gửi kèm tuỳ chọn suy luận ngắn, mô hình đầu tiên
{
  const { calls, fetcher } = recorder([ok('Trả lời')]);
  const r = await C.chatText('gsk_x', [{ role: 'user', content: 'hi' }], fetcher);
  assert.equal(r.text, 'Trả lời');
  assert.equal(r.model, C.GROQ_MODELS[0]);
  assert.equal(calls[0].reasoning_effort, 'low');
}

// 400 vì tuỳ chọn: thử lại cùng mô hình không kèm tuỳ chọn
{
  const { calls, fetcher } = recorder([fail(400), ok('Được')]);
  const r = await C.chatText('gsk_x', [], fetcher);
  assert.equal(r.model, C.GROQ_MODELS[0]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].reasoning_effort, undefined);
}

// Mô hình bị ngừng (404): chuyển sang mô hình sau
{
  const { calls, fetcher } = recorder([fail(404), ok('<think>nháp</think>Mô hình hai')]);
  const r = await C.chatText('gsk_x', [], fetcher);
  assert.equal(r.model, C.GROQ_MODELS[1]);
  assert.equal(r.text, 'Mô hình hai');
  assert.equal(calls[1].model, C.GROQ_MODELS[1]);
}

// Khoá sai và hết lượt: dừng ngay, không thử mô hình khác
for (const [status, kind] of [[401, 'bad-key'], [429, 'rate-limit']]) {
  const { calls, fetcher } = recorder([fail(status), ok('x')]);
  await assert.rejects(C.chatText('gsk_x', [], fetcher), (e) => e.kind === kind);
  assert.equal(calls.length, 1);
}

// Mất mạng
{
  const { fetcher } = recorder(['throw']);
  await assert.rejects(C.chatText('gsk_x', [], fetcher), (e) => e.kind === 'network');
}

// Mọi mô hình đều lỗi máy chủ
{
  const { calls, fetcher } = recorder(Array(10).fill(fail(500)));
  await assert.rejects(C.chatText('gsk_x', [], fetcher), (e) => e.kind === 'server');
  assert.equal(calls.length, C.GROQ_MODELS.length);
}

// Gemini: nhận theo dạng khoá, gửi đúng định dạng, đọc đúng câu trả lời
const GK = 'AIza' + 'b'.repeat(35);
assert.equal(C.providerOf(GK), 'gemini');
assert.equal(C.providerOf('gsk_' + 'a'.repeat(40)), 'groq');
assert.equal(C.providerOf('sk-abc'), null);
// Khoá Gemini dạng mới của AI Studio (AQ.…)
assert.equal(C.providerOf('AQ.Ab8' + 'x_Y-z9'.repeat(8)), 'gemini');
assert.equal(C.providerOf('AQ.'), null);
const gOk = (text) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'nháp', thought: true }, { text }] } }] }) });
const gFail = (status, message = '') => ({ ok: false, status, json: async () => ({ error: { message } }) });
const grec = (replies) => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return replies[calls.length - 1];
  };
  return { calls, fetcher };
};
{
  const { calls, fetcher } = grec([gOk('Giải thích')]);
  const msgs = [{ role: 'system', content: 'Dặn' }, { role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Đáp' }, { role: 'user', content: 'Hỏi tiếp' }];
  const r = await C.chatText(GK, msgs, fetcher);
  assert.equal(r.text, 'Giải thích', 'bỏ phần suy nghĩ nháp');
  assert.equal(r.model, C.GEMINI_MODELS[0]);
  assert.ok(calls[0].url.endsWith(`/${C.GEMINI_MODELS[0]}:generateContent`));
  assert.equal(calls[0].headers['x-goog-api-key'], GK);
  assert.equal(calls[0].body.systemInstruction.parts[0].text, 'Dặn');
  assert.deepEqual(calls[0].body.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.deepEqual(calls[0].body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
}
{
  // Tuỳ chọn bị từ chối (400) thì thử lại không kèm; mô hình không có (404) thì sang mô hình sau
  const { calls, fetcher } = grec([gFail(400, 'Unknown field thinkingConfig'), gFail(404), gOk('OK')]);
  const r = await C.chatText(GK, [{ role: 'user', content: 'x' }], fetcher);
  assert.equal(calls[1].body.generationConfig.thinkingConfig, undefined);
  assert.equal(r.model, C.GEMINI_MODELS[1]);
}
{
  // Khoá sai: Gemini trả 400 kèm lời báo, phải hiểu là khoá sai và dừng ngay
  const { calls, fetcher } = grec([gFail(400, 'API key not valid. Please pass a valid API key.'), gOk('x')]);
  await assert.rejects(C.chatText(GK, [], fetcher), (e) => e.kind === 'bad-key' && /Gemini/.test(e.message));
  assert.equal(calls.length, 1);
}
{
  const { fetcher } = grec([gFail(429, 'Resource has been exhausted')]);
  await assert.rejects(C.chatText(GK, [], fetcher), (e) => e.kind === 'rate-limit');
}

assert.equal(C.looksLikeKey('gsk_' + 'a'.repeat(40)), true);
assert.equal(C.looksLikeKey('sk-abc'), false);
assert.equal(C.stripThinking('<think>\nabc\n</think>\n\nKết quả'), 'Kết quả');

// Dựng câu hỏi: lượt đầu có câu gốc và cụm; lượt sau giữ lịch sử
const ctx = { phrase: 'change of plan', sentence: 'Thien An, change of plan. The dance group is stuck in traffic.', sentenceVi: 'Đổi kế hoạch.' };
const first = A.buildAskMessages(ctx, [], 'Sao không nói we change plan?');
assert.equal(first[0].role, 'system');
assert.match(first[0].content, /tiếng Việt/);
assert.equal(first.length, 2);
assert.match(first[1].content, /change of plan/);
assert.match(first[1].content, /stuck in traffic/);
assert.match(first[1].content, /we change plan/);
const follow = A.buildAskMessages(ctx, [{ q: 'Sao không nói we change plan?', a: 'Vì…' }], 'Còn "plans" thì sao?');
assert.deepEqual(follow.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
assert.equal(follow[3].content, 'Còn "plans" thì sao?');

assert.equal(A.fillQuestion(A.QUICK_ASKS[0].q, 'stuck in'), A.QUICK_ASKS[0].q.replace('{p}', 'stuck in'));
assert.equal(A.askCacheKey(ctx, ' Vì  sao? '), A.askCacheKey({ ...ctx, phrase: 'Change of PLAN' }, 'vì sao?'));

// Tách câu trả lời: đoạn, gạch đầu dòng, chữ đậm; bỏ tiêu đề và đường kẻ
const blocks = A.parseAnswer('## Giải thích\n"Change of plan" là **cụm danh từ**.\n\n- Sai: **We change plan**\n* Đúng: **We have changed the plan**\n---\n1. Ví dụ');
assert.deepEqual(blocks.map((b) => b.kind), ['p', 'p', 'li', 'li', 'li']);
assert.equal(blocks[0].parts[0].text, 'Giải thích');
assert.deepEqual(blocks[1].parts.find((p) => p.bold), { text: 'cụm danh từ', bold: true });
assert.equal(blocks[3].parts[1].text, 'We have changed the plan');
// Chữ AI trả về không bao giờ thành thẻ HTML: chỉ là chữ
assert.equal(A.parseAnswer('<img src=x onerror=alert(1)>')[0].parts[0].text, '<img src=x onerror=alert(1)>');

// Lưu hỏi đáp vào sổ
let book = N.upsertNote({}, { text: 'change of plan', vocab: true, ctx: ctx.sentence }, 100);
book = N.addQa(book, 'change of plan', 'Vì sao?', 'Vì…', 1);
book = N.addQa(book, 'change of plan', 'vì sao? ', 'Vì… (mới)', 2);
assert.equal(book['change of plan'].qa.length, 1, 'câu hỏi trùng thì thay câu trả lời');
assert.equal(book['change of plan'].qa[0].a, 'Vì… (mới)');
for (let i = 0; i < 10; i++) book = N.addQa(book, 'change of plan', `Hỏi ${i}`, 'Đáp', 10 + i);
assert.equal(book['change of plan'].qa.length, N.NOTE_QA_MAX);
assert.equal(book['change of plan'].qa.at(-1).q, 'Hỏi 9');
assert.equal(N.addQa(book, 'khong co', 'q', 'a'), book);

console.log('ask.test: gọi AI có dự phòng mô hình, dựng câu hỏi, tách câu trả lời và lưu hỏi đáp đều đúng.');
