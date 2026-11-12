// Kiểm thử luật buổi diễn sống (src/core/show.ts). Chạy: npm run test:show
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-show-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-show-entry-${process.pid}.ts`);
const { writeFileSync } = await import('node:fs');
const q = (rel) => JSON.stringify(path.join(root, rel));
writeFileSync(entry, `export * as S from ${q('src/core/show.ts')};\nexport * as I from ${q('src/core/incident.ts')};\nexport { INCIDENTS } from ${q('src/data/incidents.ts')};\nexport * as L from ${q('src/core/lesson.ts')};`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { S, I, INCIDENTS, L } = await import(pathToFileURL(outfile).href);

// 1) Bắt đầu: khán phòng ở giữa, chưa có chuỗi
let s = S.newShow();
assert.deepEqual(s, { heat: 50, streak: 0, bestStreak: 0, score: 0 });
assert.equal(S.multiplier(0), 1);
assert.equal(S.multiplier(5), 2);
assert.equal(S.multiplier(99), 2, 'hệ số nhân có trần');

// 2) Ba lượt 3 sao sạch: chuỗi tăng, điểm nhân theo chuỗi, khán phòng nóng dần
let o = S.applyTurn(s, 3, true);
assert.equal(o.state.streak, 1);
assert.equal(o.points, 360);
assert.equal(o.heatDelta, 10);
o = S.applyTurn(o.state, 3, true);
assert.equal(o.points, 420);
o = S.applyTurn(o.state, 3, true);
assert.equal(o.state.streak, 3);
assert.equal(o.state.score, 360 + 420 + 480);
assert.ok(o.state.heat > 80);

// 3) 3 sao nhưng không sạch: cắt chuỗi, không nhân điểm
const dirty = S.applyTurn(o.state, 3, false);
assert.equal(dirty.state.streak, 0);
assert.equal(dirty.points, 300);
assert.equal(dirty.streakBroken, true);
assert.equal(dirty.state.bestStreak, 3, 'giữ kỷ lục chuỗi');

// 4) 2 sao cắt chuỗi nhưng không làm nguội; 1 sao làm nguội
const two = S.applyTurn(o.state, 2, true);
assert.equal(two.state.streak, 0);
assert.ok(two.heatDelta >= 0);
const one = S.applyTurn(S.newShow(), 1, true);
assert.equal(one.heatDelta, -6);
assert.equal(one.streakBroken, false, 'chưa có chuỗi thì không báo cắt chuỗi');

// 5) Hụt, bỏ qua, nói lại
const miss = S.applyMiss(o.state);
assert.equal(miss.state.streak, 3, 'một lần hụt chưa cắt chuỗi; lượt đó chỉ không còn sạch');
assert.equal(miss.heatDelta, -4);
const skip = S.applySkip(o.state);
assert.equal(skip.state.streak, 0);
assert.equal(skip.heatDelta, -15);
const up = S.applyImprove(one.state, 1, 3);
assert.equal(up.points, 200);
assert.equal(up.heatDelta, 6);
assert.equal(S.applyImprove(one.state, 3, 2).points, 0, 'điểm không bao giờ tụt');

// 6) Độ nóng luôn trong 0..100
let cold = S.newShow();
for (let i = 0; i < 20; i++) cold = S.applySkip(cold).state;
assert.equal(cold.heat, 0);
let hot = S.newShow();
for (let i = 0; i < 20; i++) hot = S.applyTurn(hot, 3, true).state;
assert.equal(hot.heat, 100);
assert.equal(hot.streak, 20);

// 7) Tâm trạng và nhận xét
assert.equal(S.moodOf(10), 'cold');
assert.equal(S.moodOf(50), 'warm');
assert.equal(S.moodOf(70), 'hot');
assert.notEqual(S.verdict(100).title, S.verdict(0).title);
for (const h of [0, 29, 30, 44, 45, 69, 70, 84, 85, 100]) assert.ok(S.verdict(h).title.length > 0);

// 8) Sự cố: cứu được thì nối chuỗi, hỏng thì cắt chuỗi và nguội mạnh
const base = S.applyTurn(S.applyTurn(S.newShow(), 3, true).state, 3, true).state;
const saved = S.applyIncident(base, 3, true);
assert.equal(saved.state.streak, 3);
assert.equal(saved.points, Math.round(400 * 1.6));
assert.equal(S.applyIncident(base, 3, false).state.streak, 2, 'đủ ý nhưng trễ giờ: giữ chuỗi, không nối');
assert.equal(S.applyIncident(base, 3, false).points, 200);
const failed = S.applyIncident(base, 0, true);
assert.equal(failed.state.streak, 0);
assert.equal(failed.heatDelta, -12);
assert.equal(failed.streakBroken, true);
assert.equal(S.performBonus(90), 1.5);
assert.equal(S.performBonus(70), 1.25);
assert.equal(S.performBonus(69), 1);

// 9) Dữ liệu sự cố: id không trùng, câu mẫu đạt 3 sao, câu trống 0 sao, mỗi nhóm đủ dùng
const ids = new Set();
const perGroup = {};
for (const inc of INCIDENTS) {
  assert.ok(!ids.has(inc.id), `trùng id ${inc.id}`);
  ids.add(inc.id);
  perGroup[inc.group] = (perGroup[inc.group] || 0) + 1;
  assert.ok(inc.need.length >= 2, `${inc.id}: cần ít nhất 2 ý`);
  const r = I.evaluateIncident(inc, [inc.sample]);
  assert.equal(r.stars, 3, `${inc.id}: câu mẫu chỉ đạt ${r.stars} sao, thiếu ${r.missing.join(', ')}`);
  assert.equal(I.evaluateIncident(inc, ['']).stars, 0);
  assert.equal(I.evaluateIncident(inc, ['hello there my friend how are you']).stars, 0, `${inc.id}: câu lạc đề không được có sao`);
}
for (const g of ['any', 'wedding', 'formal', 'brand', 'party']) assert.ok(perGroup[g] >= 6, `nhóm ${g} có ${perGroup[g]} sự cố`);
// Chấm theo ý: thiếu một nửa ý thì 2 sao; chọn bản nghe tốt nhất
const mic = INCIDENTS.find((x) => x.id === 'any-mic');
assert.equal(I.evaluateIncident(mic, ['sorry about that everyone']).stars, 2);
assert.equal(I.evaluateIncident(mic, ['sorry continue']).stars, 2, 'đủ ý nhưng quá ngắn: tối đa 2 sao');
assert.equal(I.evaluateIncident(mic, ['blah', mic.sample]).stars, 3);

// 10) Xếp sự cố vào show: không sau lượt cuối, không liền nhau, không trùng, ưu tiên đúng thể loại
let seed = 7;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let run = 0; run < 200; run++) {
  const turns = 6 + (run % 3);
  const plan = I.planIncidents(INCIDENTS, 'wedding', turns, 2, rng);
  assert.equal(plan.size, 2);
  const at = [...plan.keys()].sort((a, b) => a - b);
  assert.ok(at[0] >= 0 && at[1] <= turns - 2, 'không chen sau lượt cuối');
  assert.ok(at[1] - at[0] >= 2, 'hai sự cố không liền nhau');
  const picked = [...plan.values()];
  assert.notEqual(picked[0].id, picked[1].id);
  for (const p of picked) assert.ok(p.group === 'wedding' || p.group === 'any');
}
assert.equal(I.planIncidents(INCIDENTS, 'any', 1, 2, rng).size, 0, 'bài một lượt thì không có sự cố');
assert.equal(I.planIncidents(INCIDENTS, 'formal', 3, 1, rng).size, 1);
assert.equal(I.incidentGroupOf('wedding'), 'wedding');
assert.equal(I.incidentGroupOf('gala'), 'party');
assert.equal(I.incidentGroupOf('lounge'), 'any');

// 11) Danh tiếng chỉ tính khi Diễn
assert.equal(L.countsForRep('show', true), true);
assert.equal(L.countsForRep('show', false), false);
assert.equal(L.countsForRep('daily', true), false);

console.log(`show.test: ${INCIDENTS.length} sự cố hợp lệ.`);
console.log('show.test: thanh khán giả, chuỗi liên tiếp và điểm diễn đều đúng.');
