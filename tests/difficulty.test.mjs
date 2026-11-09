// Kiểm thử mở khoá độ khó tình huống trò chuyện. Chạy: npm run test:difficulty
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'difficulty-'));
const load = async (entry, name) => {
  const outfile = path.join(dir, name);
  await build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const D = await load('src/core/difficulty.ts', 'difficulty.mjs');
const C = await load('src/data/content.ts', 'content.mjs');

// Mốc mở khoá theo cấp
assert.equal(D.unlockedTier(1), 1);
assert.equal(D.unlockedTier(2), 1);
assert.equal(D.unlockedTier(3), 2);
assert.equal(D.unlockedTier(4), 2);
assert.equal(D.unlockedTier(5), 3);
assert.equal(D.unlockedTier(10), 3);

// Nhãn không chuẩn được quy về tầng
assert.equal(D.itemTier('Beginner'), 1);
assert.equal(D.itemTier('Intermediate'), 2);
assert.equal(D.itemTier('Advanced'), 3);

// Dữ liệu thật: ở Lv 1 không có tình huống B1/B2 nào mở khoá
const all = C.STREET_TALK;
const at1 = all.filter((it) => D.isStreetTalkUnlocked(it.level, 1));
assert.ok(at1.length > 0, 'phải có tình huống A2 cho người mới');
assert.ok(at1.every((it) => D.itemTier(it.level) === 1), 'Lv 1 chỉ được A2');
assert.ok(all.filter((it) => D.isStreetTalkUnlocked(it.level, 4)).every((it) => D.itemTier(it.level) <= 2));
// Mọi nhãn trong dữ liệu đều đã ánh xạ được (không rơi vào mặc định ngầm)
for (const it of all) {
  assert.ok(it.level in { A2: 1, B1: 1, B2: 1, Beginner: 1, 'Beginner+': 1, Intermediate: 1, Advanced: 1 }, `nhãn lạ: ${it.level}`);
}
console.log(`difficulty: ${at1.length}/${all.length} tình huống mở ở Lv 1 — pass`);
