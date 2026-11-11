// Kiểm thử logic học: giảm dần hỗ trợ, chấm tự nói, hộp ôn cụm, nhịp ngắt nghỉ, năng lực.
// Chạy: npm run test:learning
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
const R = await load('src/core/recall.ts');
const K = await load('src/core/chunks.ts');
const P = await load('src/core/phonology.ts');
const D = await load('src/core/cando.ts');

// ── 1. Giảm dần hỗ trợ ──
assert.equal(R.supportStage(undefined), 0);
assert.equal(R.supportStage(0), 0);
assert.equal(R.supportStage(1), 1);
assert.equal(R.supportStage(2), 2);
assert.equal(R.supportStage(9), 2);

const scripted = { mode: 'scripted', npc: 'Hi', cue: 'Could you give us one specific example?' };
const catchT = { mode: 'catch', npc: 'x', cue: 'A garden wedding in June?', catchAnswers: ['garden', 'June'] };
const quiz = { mode: 'quiz', npc: 'x', reflex: 15, options: [{ t: 'No', ok: false }, { t: 'Yes, he is seated. Standing by.', ok: true }] };
const semi = { mode: 'semi', npc: 'x', frame: 'I ___', blanks: 1 };
const free = { mode: 'free', npc: 'x', task: 't' };

assert.deepEqual(R.planTurn(scripted, 0), { kind: 'authored' });
assert.deepEqual(R.planTurn(scripted, 1), { kind: 'recall', target: scripted.cue, hint: true });
assert.deepEqual(R.planTurn(scripted, 2), { kind: 'recall', target: scripted.cue, hint: false });
assert.deepEqual(R.planTurn(scripted, 0, true), { kind: 'recall', target: scripted.cue, hint: true }, 'tự chọn thử thách ở lần đầu vẫn có gợi ý');
assert.equal(R.planTurn(catchT, 1).kind, 'recall');
assert.deepEqual(R.planTurn(quiz, 0), { kind: 'authored' });
assert.deepEqual(R.planTurn(quiz, 1), { kind: 'react', target: 'Yes, he is seated. Standing by.', seconds: 10 }, 'thời gian phản xạ tối đa 10 giây');
assert.equal(R.planTurn({ ...quiz, reflex: undefined }, 2).seconds, R.REACT_SECONDS);
assert.deepEqual(R.planTurn(quiz, 0, true), { kind: 'authored' }, 'thử thách tự chọn không đổi lượt chọn đáp án');
assert.deepEqual(R.planTurn(semi, 2), { kind: 'authored' });
assert.deepEqual(R.planTurn(free, 2), { kind: 'authored' });

// ── 2. Chấm tự nói ──
const T = 'Could you give us one specific example?';
assert.equal(R.evaluateRecall(T, 'could you give us one specific example').stars, 3);
// Diễn đạt khác nhưng đủ ý vẫn đạt
assert.ok(R.evaluateRecall(T, 'can you give me one specific example please').stars >= 2);
// Thiếu ý chính
assert.ok(R.evaluateRecall(T, 'could you tell us more').stars <= 1);
assert.equal(R.evaluateRecall(T, '').stars, 0);
// Chỉ nói vài từ khóa rời rạc bị trừ vì câu quá ngắn
const short = R.evaluateRecall('I will walk to the lectern and use the wired microphone tonight', 'lectern wired microphone');
const full = R.evaluateRecall('I will walk to the lectern and use the wired microphone tonight', 'i will walk to the lectern and use the wired microphone tonight');
assert.ok(short.score < full.score && short.stars < 3);
assert.deepEqual(R.evaluateRecall(T, 'give us one example').missingKeywords, ['specific']);
// Câu toàn từ chức năng vẫn chấm được
assert.equal(R.evaluateRecall('So have I.', 'so have i').stars, 3);
assert.equal(R.evaluateRecallCandidates(T, ['hello', 'could you give us one specific example']).stars, 3);

// ── 3. Hộp ôn cụm ──
assert.deepEqual(K.newChunkCard(4), { box: 1, due: 5 });
assert.deepEqual(K.scheduleChunk({ box: 1, due: 5 }, true, 5), { box: 2, due: 7 });
assert.deepEqual(K.scheduleChunk({ box: 3, due: 5 }, false, 5), { box: 1, due: 6 }, 'sai thì về hộp 1');
assert.equal(K.scheduleChunk({ box: 5, due: 5 }, true, 5).box, 5);
const deck = { a: { box: 2, due: 3 }, b: { box: 1, due: 5 }, c: { box: 1, due: 9 }, d: { box: 1, due: 3 } };
assert.deepEqual(K.dueChunkIds(deck, 5), ['d', 'a', 'b'], 'quá hạn lâu nhất trước, rồi hộp thấp trước');
assert.deepEqual(K.dueChunkIds(deck, 5, 2), ['d', 'a']);
assert.equal(K.masteredChunks({ x: { box: 4, due: 1 }, y: { box: 3, due: 1 } }), 1);

const use = (t) => K.evaluateChunkUse('walk me through', t);
assert.equal(use('could you walk me through the schedule for tonight').ok, true);
assert.equal(use('walk me through').ok, false, 'chỉ đọc lại cụm thì chưa đạt');
assert.equal(use('walk me through').hasChunk, true);
assert.equal(use('could you show me the schedule for tonight').ok, false);
assert.equal(use('please walk through me the plan today').hasChunk, false, 'sai thứ tự từ');

// ── 4. Nhịp ngắt nghỉ ──
const RATE = 16000;
const signal = (parts) => {
  // parts: [ms tiếng, ms lặng, ms tiếng, ...]
  const total = parts.reduce((a, b) => a + b, 0);
  const out = new Float32Array(Math.round((total / 1000) * RATE));
  let pos = 0;
  parts.forEach((ms, i) => {
    const n = Math.round((ms / 1000) * RATE);
    for (let k = 0; k < n; k++) out[pos + k] = i % 2 === 0 ? 0.3 * Math.sin((2 * Math.PI * 180 * k) / RATE) : 0.001 * Math.sin(k);
    pos += n;
  });
  return out;
};
const two = P.checkPauses(signal([600, 350, 700, 400, 900]), 2, RATE);
assert.equal(two.found, 2);
assert.equal(two.verdict, 'ok');
const rushed = P.checkPauses(signal([600, 80, 700, 100, 900]), 2, RATE);
assert.equal(rushed.found, 0, 'quãng lặng ngắn hơn 220 ms không tính là ngắt nghỉ');
assert.equal(rushed.verdict, 'rushed');
const choppy = P.checkPauses(signal([200, 300, 200, 300, 200, 300, 200, 300, 200, 300, 200]), 1, RATE);
assert.equal(choppy.verdict, 'choppy');
assert.equal(P.checkPauses(new Float32Array(RATE), 2, RATE).verdict, 'silent');
// Lặng ở đầu và cuối bản ghi không tính là ngắt nghỉ
const padded = new Float32Array(RATE * 3);
padded.set(signal([500, 300, 500]), RATE);
assert.equal(P.checkPauses(padded, 1, RATE).found, 1);

// ── 5. Năng lực và kiểm tra tuần ──
const learn = JSON.parse(JSON.stringify(D.EMPTY_LEARN));
let list = D.canDoList(learn);
assert.equal(list.length, 16, '13 cảnh (7 gốc + 6 gói sự kiện) + cụm + nhịp + kiểm tra tuần');
assert.ok(list.every((c) => !c.done && c.have === 0));
learn.unsupported.coffee = 7;
learn.chunks = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`c${i}`, { box: 4, due: 1 }]));
learn.rhythm = { a: 1, b: 2, c: 0 };
learn.weekly.history = [{ day: 7, score: 55 }, { day: 14, score: 72 }];
list = D.canDoList(learn);
const by = Object.fromEntries(list.map((c) => [c.id, c]));
assert.equal(by['scene:coffee'].done, true);
assert.equal(by['scene:coffee'].have, D.CAN_DO_NEED, 'không vượt quá mức cần');
assert.equal(by['scene:gala'].done, false);
assert.equal(by.chunks.done, true);
assert.equal(by.rhythm.have, 2);
assert.equal(by.weekly.done, true);
assert.equal(D.weeklyTrend(learn), 17);
assert.equal(D.weeklyTrend(D.EMPTY_LEARN), null);

assert.equal(D.weeklyDue(D.EMPTY_LEARN, 30), false, 'chưa gặp kịch bản nào thì chưa có bài kiểm tra');
assert.equal(D.weeklyDue({ ...D.EMPTY_LEARN, exposure: { x: 1 } }, 6), false);
assert.equal(D.weeklyDue({ ...D.EMPTY_LEARN, exposure: { x: 1 } }, 7), true);
assert.equal(D.weeklyDue({ ...learn, exposure: { x: 1 }, weekly: { lastDay: 14, history: [] } }, 20), false);

const pool = Array.from({ length: 20 }, (_, i) => i);
assert.deepEqual(D.pickForDay(pool, 7, 6), D.pickForDay(pool, 7, 6), 'cùng ngày ra cùng bộ đề');
assert.notDeepEqual(D.pickForDay(pool, 7, 6), D.pickForDay(pool, 14, 6));
assert.equal(new Set(D.pickForDay(pool, 7, 6)).size, 6);
assert.equal(D.pickForDay([1, 2], 3, 6).length, 2);

console.log('learning.test: giảm dần hỗ trợ, chấm tự nói, hộp ôn cụm, nhịp ngắt nghỉ, năng lực đều đúng.');
