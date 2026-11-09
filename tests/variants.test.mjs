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
const DAILY = ['coffee', 'market'];

let checked = 0;
for (const [id, scene] of Object.entries(C.SCENES)) {
  const base = scene.turns;
  const variants = scene.variants || [];

  // Mỗi biến thể dùng đúng số lượt và đúng chế độ ở từng vị trí như kịch bản gốc
  for (const [vi, list] of variants.entries()) {
    const where = `${id} variant ${vi + 2}`;
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

  // Cảnh hằng ngày: ít nhất lời NPC của mỗi biến thể phải khác kịch bản gốc
  if (DAILY.includes(id)) {
    for (const [vi, list] of variants.entries()) {
      const same = list.filter((t, i) => t.npc === base[i].npc).length;
      assert.ok(same <= 1, `${id} variant ${vi + 2}: quá nhiều lời NPC giống kịch bản gốc (${same})`);
    }
    assert.ok(variants.length >= 2, `${id}: cảnh hằng ngày cần ít nhất 2 biến thể`);
  }
}

// Chọn biến thể theo ngày: ngày 1 là gốc, rồi luân phiên
const coffee = C.SCENES.coffee;
const pick = (day) => C.turnsForDay(coffee, day);
assert.equal(pick(1), coffee.turns);
assert.equal(pick(2), coffee.variants[0]);
assert.equal(pick(3), coffee.variants[1]);
assert.equal(pick(4), coffee.turns);
assert.equal(pick(0), coffee.turns, 'ngày không hợp lệ phải dùng kịch bản gốc');
assert.equal(pick(Number.NaN), coffee.turns);

// Cùng một ngày luôn cho cùng một bộ lượt
assert.equal(pick(5), pick(5));

// Biến thể sai số lượt bị bỏ qua
const broken = { ...coffee, variants: [coffee.turns.slice(1)] };
assert.equal(C.turnsForDay(broken, 2), coffee.turns);

// Cảnh không có biến thể vẫn dùng kịch bản gốc
const bare = { ...coffee, variants: undefined };
assert.equal(C.turnsForDay(bare, 9), coffee.turns);

console.log(`variants.test: ${checked} lượt biến thể đã kiểm tra, các phép chọn theo ngày đều đúng.`);
