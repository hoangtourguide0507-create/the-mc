// Kiểm thử luật buổi diễn sống (src/core/show.ts). Chạy: npm run test:show
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-show-${process.pid}.mjs`);
await build({ entryPoints: [path.join(root, 'src/core/show.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const S = await import(pathToFileURL(outfile).href);

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

console.log('show.test: thanh khán giả, chuỗi liên tiếp và điểm diễn đều đúng.');
