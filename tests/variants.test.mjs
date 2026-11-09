// Kiểm thử biến thể lượt thoại theo ngày. Chạy: npm run test:variants
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'variants-'));
const outfile = path.join(dir, 'content.mjs');
await build({
  entryPoints: [path.join(root, 'src/data/content.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});
const C = await import(pathToFileURL(outfile).href);

const lower = (s = '') => s.toLowerCase();
const includesAny = (text, words) => words.some((w) => lower(text).includes(lower(w)));
const ALL = ['coffee', 'market', 'backstage', 'wedding', 'beach', 'gala', 'interview'];
let checked = 0;

// Kiểm tra một bộ lượt: cùng số lượt, cùng mode theo vị trí, và các trường khớp nhau
function validateTurns(list, base, where) {
  assert.equal(list.length, base.length, `${where}: số lượt khác kịch bản gốc`);
  list.forEach((t, i) => {
    assert.equal(t.mode, base[i].mode, `${where} lượt ${i + 1}: mode ${t.mode} ≠ ${base[i].mode}`);
    assert.ok(t.npc && t.npcVi && t.tip, `${where} lượt ${i + 1}: thiếu npc/npcVi/tip`);
    if (t.who) assert.ok(C.NPCS[t.who], `${where} lượt ${i + 1}: NPC "${t.who}" không tồn tại`);
    if (t.mode === 'catch') {
      assert.ok(t.catchAnswers?.length, `${where} lượt ${i + 1}: catch thiếu từ cần bắt`);
      assert.ok(!t.cue.includes('{'), `${where} lượt ${i + 1}: cue còn dấu {}`);
      for (const a of t.catchAnswers) {
        assert.ok(lower(t.cue).includes(lower(a)), `${where} lượt ${i + 1}: "${a}" không có trong cue`);
      }
      for (const d of t.catch || []) {
        assert.ok(!t.catchAnswers.includes(d), `${where} lượt ${i + 1}: "${d}" vừa là đáp án vừa là nhiễu`);
      }
    }
    if (t.mode === 'semi') {
      assert.equal(t.blankPool?.length, t.blanks, `${where} lượt ${i + 1}: blankPool không khớp số ô`);
      assert.equal((t.frame.match(/___/g) || []).length, t.blanks, `${where} lượt ${i + 1}: frame không khớp số ô`);
      t.blankPool.forEach((pool, bi) => {
        assert.ok(includesAny(t.sample, pool), `${where} lượt ${i + 1}: sample không chứa đáp án ô ${bi + 1}`);
      });
    }
    if (t.mode === 'quiz') {
      assert.equal(t.options.length, 3, `${where} lượt ${i + 1}: quiz cần đúng 3 đáp án`);
      assert.equal(t.options.filter((o) => o.ok).length, 1, `${where} lượt ${i + 1}: quiz phải có đúng 1 đáp án đúng`);
    }
    if (t.mode === 'free') {
      const sample = t.sample || '';
      for (const group of t.requiredKeywords || []) {
        assert.ok(includesAny(sample, group), `${where} lượt ${i + 1}: sample thiếu từ khóa bắt buộc ${group}`);
      }
      for (const bad of t.forbiddenKeywords || []) {
        assert.ok(!lower(sample).includes(bad), `${where} lượt ${i + 1}: sample chứa từ cấm "${bad}"`);
      }
    }
    checked += 1;
  });
}

// Bộ sinh cho mọi cảnh: kiểm tra 400 ngày, mọi tổ hợp phải hợp lệ
const DAYS = 400;
for (const id of ALL) {
  const scene = C.SCENES[id];
  assert.ok(scene, `thiếu cảnh ${id}`);
  const seen = new Set();
  for (let day = 2; day <= DAYS; day++) {
    const turns = C.turnsForDay(scene, day);
    validateTurns(turns, scene.turns, `${id} ngày ${day}`);
    seen.add(JSON.stringify(turns.map((t) => [t.npc, t.cue ?? t.frame ?? t.question])));
  }
  // Cảnh hằng ngày cần hàng trăm bộ khác nhau; cảnh show cần ít nhất 150 (tổ hợp ít hơn)
  const min = ['coffee', 'market'].includes(id) ? 300 : 150;
  assert.ok(seen.size >= min, `${id}: chỉ có ${seen.size} bộ khác nhau (cần ≥ ${min}) trong ${DAYS - 1} ngày`);
  console.log(`  ${id}: ${seen.size} bộ lượt khác nhau trong ${DAYS - 1} ngày`);
}

// 3) Chọn theo ngày
const coffee = C.SCENES.coffee;
assert.equal(C.turnsForDay(coffee, 1), coffee.turns, 'ngày 1 dùng kịch bản gốc');
assert.equal(C.turnsForDay(coffee, 0), coffee.turns, 'ngày không hợp lệ dùng kịch bản gốc');
assert.equal(C.turnsForDay(coffee, Number.NaN), coffee.turns);
assert.deepEqual(C.turnsForDay(coffee, 7), C.turnsForDay(coffee, 7), 'cùng một ngày phải cho cùng một bộ');
assert.notDeepEqual(C.turnsForDay(coffee, 2), C.turnsForDay(coffee, 3), 'ngày kế tiếp phải khác');

// 4) Biến thể sai số lượt bị bỏ qua; cảnh không có biến thể dùng kịch bản gốc
// Cảnh không có bộ sinh (giả lập) dùng kịch bản gốc
const plain = { ...C.SCENES.coffee, id: 'unknown-scene' };
assert.equal(C.turnsForDay(plain, 9), plain.turns, 'cảnh không có bộ sinh dùng kịch bản gốc');

console.log(`variants.test: ${checked} lượt đã kiểm tra, mọi phép chọn theo ngày đều đúng.`);
