// Kiểm thử lộ trình luyện phát âm. Chạy: npm run test:pronladder
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'pronladder-'));
const outfile = path.join(dir, 'pron.mjs');
await build({ entryPoints: [path.join(root, 'src/data/pronunciation.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const R = await import(pathToFileURL(outfile).href);

const { PRON_DRILLS, PRON_LADDER, unlockedGroups, availableDrills, groupMastered, pickPronDrill } = R;

// Mọi nhóm trong lộ trình đều có bài, và không có bài nào ngoài lộ trình
for (const d of PRON_DRILLS) assert.ok(PRON_LADDER.includes(d.group), `bài ${d.id} không thuộc lộ trình`);
for (const g of PRON_LADDER) assert.ok(PRON_DRILLS.some((d) => d.group === g), `nhóm ${g} chưa có bài`);

// Ban đầu chỉ mở nhóm đầu tiên
assert.deepEqual(unlockedGroups({}), [PRON_LADDER[0]]);
assert.equal(availableDrills({}).every((d) => d.group === PRON_LADDER[0]), true);

// Một bài đúng dưới 60% thì nhóm chưa đạt
const first = PRON_DRILLS.filter((d) => d.group === PRON_LADDER[0]);
const weak = Object.fromEntries(first.map((d) => [d.id, { tries: 5, ok: 2 }]));
assert.equal(groupMastered(weak, PRON_LADDER[0]), false);
assert.deepEqual(unlockedGroups(weak), [PRON_LADDER[0]]);

// Mọi bài trong nhóm đạt 60% trở lên thì mở nhóm kế tiếp
const strong = Object.fromEntries(first.map((d) => [d.id, { tries: 5, ok: 3 }]));
assert.equal(groupMastered(strong, PRON_LADDER[0]), true);
assert.deepEqual(unlockedGroups(strong), [PRON_LADDER[0], PRON_LADDER[1]]);

// Bài chưa thử ở nhóm đã mở vẫn được tính là chưa đạt
const partial = { ...strong };
delete partial[first[0].id];
assert.equal(groupMastered(partial, PRON_LADDER[0]), false);

// Chọn bài chỉ trong nhóm đang mở
const picks = new Set();
for (let i = 0; i < 200; i++) picks.add(pickPronDrill({}, [], () => (i % 100) / 100).group);
assert.deepEqual([...picks], [PRON_LADDER[0]]);

console.log('pronladder.test: mở khoá theo nhóm và chọn bài trong phạm vi đều đúng.');
