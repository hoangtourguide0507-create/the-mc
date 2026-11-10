// Kiểm thử chấm cộng dồn và luyện cụm sai (src/core/retry.ts). Chạy: npm run test:retry
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (rel) => {
  const outfile = path.join(os.tmpdir(), `mc-${path.basename(rel)}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, rel)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const R = await load('src/core/retry.ts');
const E = await load('src/core/evaluator.ts');

const CUE = 'Good morning, Leo! Could I get an iced oat latte with less ice, please?';
const statuses = (res) => res.tokens.map((t) => t.status);
const weakWords = (res) => res.tokens.filter((t) => t.status !== 'ok').map((t) => t.clean);

// 1) Hai lần đọc, mỗi lần máy nghe trật một chỗ khác nhau → gộp lại phải đủ điểm tối đa
const a1 = E.evaluateScripted(CUE, 'good morning leo could i get an iced boat latte with less ice please');
const a2 = E.evaluateScripted(CUE, 'good morning leo could i get an iced oat latte with less rice peas');
assert.ok(weakWords(a1).includes('oat'), 'lần 1 phải sai "oat"');
assert.ok(weakWords(a2).length >= 1, 'lần 2 phải sai ở cuối câu');
const merged = R.mergeAttempts(a1, a2);
assert.deepEqual(weakWords(merged), [], 'từ đã đúng ở một lần phải được giữ là đúng');
assert.equal(merged.score, 100);
assert.equal(merged.stars, 3);
assert.equal(merged.transcript, a2.transcript, 'hiện câu máy nghe được ở lần mới nhất');

// 2) Không bao giờ tụt điểm: lần sau tệ hơn vẫn giữ kết quả tốt
const good = E.evaluateScripted(CUE, 'good morning leo could i get an iced oat latte with less ice please');
const bad = E.evaluateScripted(CUE, 'um hello');
const kept = R.mergeAttempts(good, bad);
assert.equal(kept.stars, 3);
assert.ok(kept.score >= good.score);
assert.deepEqual(statuses(kept), statuses(good));

// 3) Chưa có lần trước → trả đúng lần hiện tại; khác câu mẫu → lấy kết quả điểm cao hơn
assert.equal(R.mergeAttempts(null, a1), a1);
const other = E.evaluateScripted('Thank you very much', 'thank you very much');
assert.equal(R.mergeAttempts(a1, other).score, Math.max(a1.score, other.score));

// 4) Từ chưa đúng ở cả hai lần vẫn chưa đúng
const b1 = E.evaluateScripted(CUE, 'good morning leo could i get an iced boat latte with less ice please');
const b2 = E.evaluateScripted(CUE, 'good morning leo could i get an iced coat latte with less ice please');
assert.deepEqual(weakWords(R.mergeAttempts(b1, b2)), ['oat']);

// 5) focusChunk: cụm ngắn quanh từ sai, có từ đệm hai bên, bỏ dấu câu ở hai đầu
const chunk = R.focusChunk(b1.tokens);
assert.ok(chunk, 'phải có cụm cần luyện');
assert.deepEqual(chunk.weak, ['oat']);
assert.equal(chunk.text, 'iced oat latte');
assert.equal(R.focusChunk(good.tokens), null, 'câu đúng hết thì không còn cụm nào');

// Từ sai ở cuối câu: cụm vẫn đủ 3 từ và không dính dấu chấm hỏi
const endMiss = E.evaluateScripted(CUE, 'good morning leo could i get an iced oat latte with less ice');
const endChunk = R.focusChunk(endMiss.tokens);
assert.deepEqual(endChunk.weak, ['please']);
assert.equal(endChunk.text, 'less ice, please');
assert.equal(endChunk.end - endChunk.start + 1, 3);

// Hai từ sai gần nhau gom vào một cụm; từ sai ở xa để cho cụm sau
const two = E.evaluateScripted(CUE, 'good morning leo could i get an nice boat latte with less ice');
const c2 = R.focusChunk(two.tokens);
assert.deepEqual(c2.weak, ['iced', 'oat']);
assert.ok(c2.end - c2.start + 1 <= 6);

// 6) applyChunkAttempt: đọc đúng riêng cụm sai thì cả câu được tính đúng các từ đó
const chunkEval = E.evaluateScripted(chunk.text, 'iced oat latte');
const fixed = R.applyChunkAttempt(b1, chunk, chunkEval);
assert.deepEqual(weakWords(fixed), []);
assert.equal(fixed.stars, 3);
assert.equal(fixed.tokens[chunk.start + 1].word, b1.tokens[chunk.start + 1].word, 'giữ chữ hiển thị của câu gốc');
// Đọc cụm vẫn sai → không đổi gì, không tụt điểm
const stillBad = R.applyChunkAttempt(b1, chunk, E.evaluateScripted(chunk.text, 'iced boat latte'));
assert.deepEqual(weakWords(stillBad), ['oat']);
assert.ok(stillBad.score >= b1.score && stillBad.stars >= b1.stars);
// Đọc cụm tệ hơn cả lần đầu → từ đang đúng trong cụm không bị biến thành sai
const worse = R.applyChunkAttempt(b1, chunk, E.evaluateScripted(chunk.text, 'um'));
assert.deepEqual(statuses(worse), statuses(b1));
// Kết quả cụm sai số từ → bỏ qua
assert.equal(R.applyChunkAttempt(b1, chunk, other), b1);

// 7) Sửa lần lượt từng cụm thì cuối cùng hết cụm cần luyện
let cur = two;
for (let guard = 0; guard < 5; guard++) {
  const c = R.focusChunk(cur.tokens);
  if (!c) break;
  cur = R.applyChunkAttempt(cur, c, E.evaluateScripted(c.text, c.text));
}
assert.equal(R.focusChunk(cur.tokens), null);
assert.equal(cur.stars, 3);

console.log('retry.test: cộng dồn giữa các lần đọc và luyện cụm sai đều đúng.');
