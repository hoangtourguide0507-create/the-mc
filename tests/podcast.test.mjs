// Kiểm thử Podcast du lịch (src/core/podcast.ts, src/data/podcasts*.ts). Chạy: npm run test:podcast
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collect, loadContent, normText } from '../tools/voice-lines.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-pod-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-pod-entry-${process.pid}.ts`);
const q = (rel) => JSON.stringify(path.join(root, rel));
writeFileSync(entry, `export * as P from ${q('src/core/podcast.ts')};\nexport { PODCASTS } from ${q('src/data/podcasts.ts')};`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { P, PODCASTS } = await import(pathToFileURL(outfile).href);
const kokoro = JSON.parse(readFileSync(path.join(root, 'tools/voices.kokoro.json'), 'utf8'));

/* ---------- Nội dung ---------- */
assert.ok(PODCASTS.length >= 20, `cần ít nhất 20 tập, có ${PODCASTS.length}`);
const ids = new Set();
let lastLevel = 0;
let totalWords = 0;
for (const ep of PODCASTS) {
  const at = ep.id;
  assert.ok(!ids.has(ep.id), `trùng id ${ep.id}`);
  ids.add(ep.id);
  for (const k of ['place', 'placeVi', 'region', 'hookVi']) assert.ok(ep[k]?.trim(), `${at}: thiếu ${k}`);
  const lv = P.POD_LEVELS.indexOf(ep.level);
  assert.ok(lv >= 0, `${at}: bậc lạ ${ep.level}`);
  assert.ok(lv >= lastLevel, `${at}: danh sách phải xếp từ dễ đến khó`);
  lastLevel = lv;

  // Lời thoại: đủ hai người dẫn, độ dài vừa một tập 2–4 phút
  assert.ok(ep.lines.length >= 18 && ep.lines.length <= 30, `${at}: ${ep.lines.length} câu thoại`);
  assert.ok(ep.lines.some((l) => l.who === 'nora') && ep.lines.some((l) => l.who === 'owen'), `${at}: phải có cả Nora và Owen`);
  for (const l of ep.lines) {
    assert.ok(P.POD_HOSTS[l.who], `${at}: người dẫn lạ ${l.who}`);
    assert.ok(l.en.trim() && l.vi.trim(), `${at}: câu thiếu chữ hoặc bản dịch`);
    assert.ok(!/[“”‘’]/.test(l.en), `${at}: dùng dấu nháy thẳng trong câu tiếng Anh: ${l.en}`);
    assert.ok(l.en.length <= 330, `${at}: câu quá dài để nghe một hơi: ${l.en.slice(0, 60)}…`);
  }
  const words = P.wordCount(ep);
  totalWords += words;
  assert.ok(words >= 280 && words <= 620, `${at}: ${words} từ`);

  // Câu hỏi: 5 câu, đáp án hợp lệ, không trùng lựa chọn, đoạn chứa đáp án tìm được trong lời thoại
  assert.equal(ep.questions.length, 5, `${at}: cần đúng 5 câu hỏi`);
  const answers = new Set();
  ep.questions.forEach((qq, qi) => {
    const qa = `${at} câu ${qi + 1}`;
    assert.ok(qq.q.trim() && qq.qVi.trim() && qq.whyVi.trim(), `${qa}: thiếu chữ`);
    assert.ok(qq.options.length >= 3 && qq.options.length <= 4, `${qa}: cần 3–4 lựa chọn`);
    assert.equal(new Set(qq.options.map((x) => x.toLowerCase())).size, qq.options.length, `${qa}: lựa chọn trùng`);
    assert.ok(Number.isInteger(qq.answer) && qq.answer >= 0 && qq.answer < qq.options.length, `${qa}: đáp án ngoài phạm vi`);
    const ev = P.evidenceLines(ep, qq);
    assert.ok(ev.length >= 1, `${qa}: không tìm thấy "${qq.find}" trong lời thoại`);
    assert.ok(ev.length <= 2, `${qa}: "${qq.find}" có ở ${ev.length} câu, cần cụm cụ thể hơn`);
    const span = P.replaySpan(ep, qq);
    assert.ok(span.length >= 1 && span.length <= 4 && span.includes(ev[0]), `${qa}: đoạn nghe lại sai`);
    answers.add(qq.answer);
  });
  assert.ok(answers.size >= 2, `${at}: đáp án đúng không nên luôn ở cùng một vị trí`);
}

/* ---------- Giọng ---------- */
for (const host of Object.keys(P.POD_HOSTS)) assert.ok(kokoro.roles[host]?.voice, `vai ${host} chưa có giọng Kokoro`);
assert.ok(kokoro.phases.includes('podcast'), 'voices.kokoro.json thiếu phase podcast');
const items = collect(await loadContent());
const keys = new Set(items.map((i) => i.key));
for (const ep of PODCASTS) for (const l of ep.lines) assert.ok(keys.has(`${l.who}|${normText(l.en)}`), `${ep.id}: câu chưa có trong danh sách giọng: ${l.en.slice(0, 50)}`);

/* ---------- Chấm điểm ---------- */
const ep = PODCASTS[0];
const max = P.podMax(ep);
assert.equal(max, 10);
let st = P.newQuiz(ep);
assert.equal(st.done, false);

// Đúng ngay: +2
let r = P.answerPod(ep, st, ep.questions[0].answer);
assert.ok(r.correct && r.settled && r.gained === 2);
st = P.nextQuestion(ep, r.state);
assert.equal(st.qi, 1);

// Sai lần đầu: được chọn lại; chọn lại đúng: +1
const wrong1 = (ep.questions[1].answer + 1) % ep.questions[1].options.length;
r = P.answerPod(ep, st, wrong1);
assert.ok(!r.correct && r.retry && !r.settled && r.gained === 0);
// Không sang câu kế khi chưa xong
assert.equal(P.nextQuestion(ep, r.state).qi, 1);
// Chọn lại đúng lựa chọn đã sai thì bỏ qua
assert.equal(P.answerPod(ep, r.state, wrong1).state, r.state);
r = P.answerPod(ep, r.state, ep.questions[1].answer);
assert.ok(r.correct && r.settled && r.gained === 1);
st = P.nextQuestion(ep, r.state);

// Sai hai lần: lộ đáp án, 0 điểm
const opts = ep.questions[2].options.map((_, i) => i).filter((i) => i !== ep.questions[2].answer);
r = P.answerPod(ep, st, opts[0]);
r = P.answerPod(ep, r.state, opts[1]);
assert.ok(!r.correct && r.reveal && r.settled && r.gained === 0);
assert.equal(r.state.results[2], 0);
st = P.nextQuestion(ep, r.state);

// Hai câu cuối đúng ngay
for (let k = 3; k < 5; k++) {
  r = P.answerPod(ep, st, ep.questions[k].answer);
  st = P.nextQuestion(ep, r.state);
}
assert.ok(st.done);
assert.equal(st.points, 2 + 1 + 0 + 2 + 2);
assert.deepEqual(st.results, [2, 1, 0, 2, 2]);
// Đã xong thì không chấm nữa
assert.equal(P.answerPod(ep, st, 0).state, st);

// Sao và XP
assert.equal(P.podStars(10, 10), 3);
assert.equal(P.podStars(9, 10), 3);
assert.equal(P.podStars(8, 10), 2);
assert.equal(P.podStars(6, 10), 2);
assert.equal(P.podStars(3, 10), 1);
assert.equal(P.podStars(2, 10), 0);
assert.equal(P.podStars(10, 10, true), 2, 'xem lời thoại khi đang làm: tối đa 2 sao');
assert.equal(P.podStars(0, 0), 0);
assert.equal(P.podXp(10, 10), 40);
assert.equal(P.podXp(10, 10, true), 30);
assert.equal(P.podXp(7, 10), 21);

// Đoạn nghe lại có câu trước để có ngữ cảnh
const q0 = ep.questions[0];
const ev0 = P.evidenceLines(ep, q0);
assert.deepEqual(P.replaySpan(ep, q0).slice(0, 2), [Math.max(0, ev0[0] - 1), ev0[0]].filter((v, i, a) => a.indexOf(v) === i));
// Tìm theo cả từ, không khớp nửa chữ
assert.deepEqual(P.evidenceLines({ lines: [{ who: 'nora', en: 'The harvests were good.', vi: '' }] }, { find: 'harvest' }), []);
assert.deepEqual(P.evidenceLines({ lines: [{ who: 'nora', en: "It's twenty-one, isn't it?", vi: '' }] }, { find: 'twenty one' }), [0]);

const mins = Math.round((totalWords / P.POD_WPM) * 10) / 10;
console.log(`podcast.test: ${PODCASTS.length} tập, ${totalWords} từ (~${mins} phút nghe) — OK`);
