// Kiểm thử Nói dài và Dịch nối tiếp (src/core/longturn.ts, src/data/longturns.ts, src/data/interpret.ts).
// Chạy: npm run test:longturn
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-long-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-long-entry-${process.pid}.ts`);
const q = (rel) => JSON.stringify(path.join(root, rel));
writeFileSync(entry, `export * as L from ${q('src/core/longturn.ts')};\nexport { LONG_TASKS } from ${q('src/data/longturns.ts')};\nexport { INTERP_SETS } from ${q('src/data/interpret.ts')};\nexport { REGISTER_SETS } from ${q('src/data/register.ts')};\nexport { FUNCTIONS, FN_BY_ID } from ${q('src/data/functions.ts')};\nexport { TALKS } from ${q('src/data/talks.ts')};\nexport { normalizeText } from ${q('src/core/evaluator.ts')};`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { L, LONG_TASKS, INTERP_SETS, REGISTER_SETS, FUNCTIONS, FN_BY_ID, TALKS, normalizeText } = await import(pathToFileURL(outfile).href);

const OFF_TOPIC = 'I had noodles for lunch with my cousin and then we watched a football match on television because it was raining outside all afternoon and nobody wanted to go to the market or the beach so we stayed at home and cooked rice and fish and talked about our favourite films and songs until it was very late and everybody fell asleep on the sofa with the cat and the dog next to the window in the kitchen of my grandmother house in the countryside far away from the city where I usually work every single day of the week';
const CEFR = new Set(['B1', 'B2', 'C1']);

/* ---------- Nói dài ---------- */
assert.ok(LONG_TASKS.length >= 12, 'cần ít nhất 12 bài nói dài');
const ids = new Set();
let modelWords = 0;
for (const t of LONG_TASKS) {
  assert.ok(!ids.has(t.id), `trùng id ${t.id}`);
  ids.add(t.id);
  assert.ok(CEFR.has(t.cefr) && t.kind && t.title && t.brief && t.tip, `${t.id}: thiếu trường`);
  assert.equal(t.ideas.length, 6, `${t.id}: dàn ý phải có 6 ý`);
  t.ideas.forEach((idea, k) => {
    const at = `${t.id} ý ${k + 1} (${idea.label})`;
    assert.ok(idea.label && idea.say && idea.key && idea.need.length > 0, `${at}: thiếu trường`);
    assert.equal(L.coverIdeas([idea], idea.say)[0], true, `${at}: câu mẫu không trúng ý của chính nó`);
    const sayTok = normalizeText(idea.say).join(' ');
    assert.ok(sayTok.includes(normalizeText(idea.key).join(' ')), `${at}: cụm gợi ý "${idea.key}" không nằm trong câu mẫu`);
    assert.equal(L.coverIdeas([idea], OFF_TOPIC)[0], false, `${at}: câu lạc đề vẫn trúng ý`);
  });
  const model = L.modelOf(t);
  const words = normalizeText(model).length;
  modelWords += words;
  assert.ok(words >= 110 && words <= 190, `${t.id}: bài mẫu ${words} từ, cần 110-190`);
  const full = L.scoreLong(t, [model], 75);
  assert.equal(full.stars, 3, `${t.id}: bài mẫu phải đạt 3 sao`);
  assert.equal(full.hit, 6);
  assert.equal(full.pace, 'ok', `${t.id}: bài mẫu nói 75 giây phải ở tốc độ vừa (${full.wpm} từ/phút)`);
  assert.ok(full.markers.length >= 3, `${t.id}: bài mẫu cần ít nhất 3 lời dẫn, có ${full.markers.join(', ')}`);
  assert.deepEqual(L.longAdvice(t, full), [], `${t.id}: bài mẫu không cần lời khuyên`);
  const off = L.scoreLong(t, [OFF_TOPIC], 70);
  assert.equal(off.stars, 0, `${t.id}: bài lạc đề phải 0 sao (trúng ${off.hit} ý)`);
  // Nói bốn ý đầu: 2 sao; hai ý đầu: 1 sao
  const four = t.ideas.slice(0, 4).map((x) => x.say).join(' ');
  assert.equal(L.scoreLong(t, [four], 40).stars, normalizeText(four).length >= L.LONG_OK_WORDS ? 2 : 1, `${t.id}: bốn ý`);
  const two = t.ideas.slice(0, 2).map((x) => x.say).join(' ');
  assert.ok(L.scoreLong(t, [two], 15).stars <= 1, `${t.id}: hai ý không quá 1 sao`);
}

// Luật chấm chung
const T = LONG_TASKS[0];
const model = L.modelOf(T);
assert.equal(L.scoreLong(T, [model], 0).wpm, null, 'gõ thay mic thì không có tốc độ');
assert.equal(L.scoreLong(T, [model], 0).stars, 3, 'không đo được thời gian vẫn chấm ý');
assert.equal(L.scoreLong(T, [model], 30).pace, 'fast');
assert.equal(L.scoreLong(T, [model], 150).pace, 'slow');
assert.equal(L.scoreLong(T, [model], 150).timing, 'long');
assert.equal(L.scoreLong(T, [model], 40).timing, 'short');
assert.equal(L.scoreLong(T, ['', 'hello', model], 75).stars, 3, 'lấy phương án máy nghe tốt nhất');
assert.equal(L.scoreLong(T, [], 75).stars, 0);
assert.equal(L.scoreLong(T, ['um well uh you know um ' + model], 80).fillers, 4);
// Đủ ý nhưng quá ngắn thì chưa được 3 sao
const terse = 'Good evening everyone. I am your host. The wedding of Emma and Liam. Thank you for coming. Please take your seats. Please welcome the bride and groom.';
const terseScore = L.scoreLong(T, [terse], 20);
assert.equal(terseScore.hit, 6);
assert.ok(terseScore.stars < 3, 'đủ ý nhưng cụt lủn thì không đạt 3 sao');
assert.ok(L.longAdvice(T, terseScore).some((a) => a.includes('từ')), 'phải khuyên nói dài hơn');
const partial = L.scoreLong(T, [T.ideas.slice(0, 3).map((x) => x.say).join(' ')], 30);
assert.ok(L.longAdvice(T, partial)[0].startsWith('Còn thiếu 3 ý'));
assert.ok(L.longAdvice(T, partial).length <= 3);

/* ---------- Dịch nối tiếp ---------- */
assert.ok(INTERP_SETS.length >= 8, 'cần ít nhất 8 bộ dịch');
let segs = 0;
for (const s of INTERP_SETS) {
  assert.ok(!ids.has(s.id), `trùng id ${s.id}`);
  ids.add(s.id);
  assert.ok(CEFR.has(s.cefr) && s.kind && s.title && s.brief, `${s.id}: thiếu trường`);
  assert.equal(s.segments.length, 5, `${s.id}: mỗi bộ 5 câu`);
  s.segments.forEach((g, k) => {
    const at = `${s.id} câu ${k + 1}`;
    segs += 1;
    assert.ok(g.vi && g.say && g.ideas.length >= 2 && g.ideas.length <= 3, `${at}: cần 2-3 ý`);
    const r = L.scoreInterp(g, [g.say]);
    assert.equal(r.stars, 3, `${at}: bản dịch mẫu thiếu ý ${g.ideas.filter((_, i) => !r.covered[i]).map((x) => x.label).join('; ')}`);
    assert.equal(L.scoreInterp(g, [g.say], true).stars, 2, `${at}: xem lại câu gốc thì tối đa 2 sao`);
    assert.equal(L.scoreInterp(g, [OFF_TOPIC]).stars, 0, `${at}: câu lạc đề phải 0 sao`);
    assert.equal(L.scoreInterp(g, ['Yes.']).stars, 0);
    assert.ok(L.showSeconds(g.vi) >= 5 && L.showSeconds(g.vi) <= 14);
  });
}
// Dịch thoát ý vẫn được chấp nhận
const g0 = INTERP_SETS.find((s) => s.id === 'yearend-director').segments[1];
assert.equal(L.scoreInterp(g0, ['Our sales increased by 20 percent compared to the previous year']).stars, 3);
assert.equal(L.scoreInterp(g0, ['Sales went up a lot']).stars, 1, 'thiếu con số và mốc so sánh');
assert.deepEqual([L.setStars([3, 3, 3, 2, 3]), L.setStars([2, 2, 2, 2, 1]), L.setStars([1, 1, 1, 0, 2]), L.setStars([0, 0, 1, 0, 0]), L.setStars([])], [3, 2, 1, 0, 0]);

/* ---------- Đổi văn phong ---------- */
assert.ok(REGISTER_SETS.length >= 6, 'cần ít nhất 6 bộ đổi văn phong');
let regSegs = 0;
for (const s of REGISTER_SETS) {
  assert.ok(!ids.has(s.id), `trùng id ${s.id}`);
  ids.add(s.id);
  assert.ok(CEFR.has(s.cefr) && ['Nâng tông', 'Hạ tông'].includes(s.kind) && s.title && s.brief, `${s.id}: thiếu trường`);
  assert.equal(s.segments.length, 5, `${s.id}: mỗi bộ 5 câu`);
  s.segments.forEach((g, k) => {
    const at = `${s.id} câu ${k + 1}`;
    regSegs += 1;
    assert.ok(g.avoid?.length > 0, `${at}: cần danh sách từ sai tông`);
    const r = L.scoreInterp(g, [g.say]);
    assert.equal(r.stars, 3, `${at}: bản mẫu thiếu ý ${g.ideas.filter((_, i) => !r.covered[i]).map((x) => x.label).join('; ')} hoặc còn từ sai tông ${r.offTone.join(', ')}`);
    const src = L.scoreInterp(g, [g.vi]);
    assert.ok(src.stars <= 1, `${at}: lặp lại câu nguồn không được quá 1 sao (được ${src.stars})`);
    assert.equal(L.scoreInterp(g, [OFF_TOPIC]).stars, 0, `${at}: câu lạc đề phải 0 sao`);
  });
}
assert.ok(REGISTER_SETS.some((s) => s.cefr === 'C1') && REGISTER_SETS.some((s) => s.kind === 'Hạ tông'));
// Đủ ý nhưng còn từ suồng sã thì tối đa 1 sao và báo đúng từ
const reg0 = REGISTER_SETS[0].segments[0];
const mixed = L.scoreInterp(reg0, ['Ladies and gentlemen, guys, please take your seats, we are about to begin']);
assert.equal(mixed.hit, 3);
assert.equal(mixed.stars, 1);
assert.deepEqual(mixed.offTone, ['guys']);
assert.deepEqual(L.scoreInterp(INTERP_SETS[0].segments[0], [INTERP_SETS[0].segments[0].say]).offTone, [], 'bài dịch không có từ sai tông');

/* ---------- Chức năng lời nói ---------- */
assert.equal(new Set(FUNCTIONS.map((f) => f.id)).size, FUNCTIONS.length);
const fnCount = Object.fromEntries(FUNCTIONS.map((f) => [f.id, 0]));
for (const [name, list] of [['Nói dài', LONG_TASKS], ['Dịch', INTERP_SETS], ['Văn phong', REGISTER_SETS], ['Trò chuyện', TALKS]]) {
  for (const item of list) {
    assert.ok(FN_BY_ID[item.fn], `${name} ${item.id}: chức năng "${item.fn}" không có trong functions.ts`);
    fnCount[item.fn] += 1;
  }
}
for (const f of FUNCTIONS) assert.ok(fnCount[f.id] >= 3, `chức năng ${f.id} mới có ${fnCount[f.id]} bài, cần ít nhất 3`);
assert.ok(TALKS.length >= 30, 'cần ít nhất 30 cuộc trò chuyện');
assert.ok(TALKS.filter((t) => t.cefr === 'C1').length >= 4, 'cần ít nhất 4 cuộc trò chuyện C1');

console.log(`longturn.test: ${LONG_TASKS.length} bài nói dài (${modelWords} từ mẫu), ${INTERP_SETS.length} bộ dịch (${segs} câu), ${REGISTER_SETS.length} bộ văn phong (${regSegs} câu), ${TALKS.length} cuộc trò chuyện — OK`);
