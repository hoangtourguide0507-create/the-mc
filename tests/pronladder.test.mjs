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

const { PRON_DRILLS, PRON_LADDER, PRON_ALWAYS_OPEN, unlockedGroups, availableDrills, groupMastered, pickPronDrill } = R;
const ALL = [...PRON_LADDER, ...PRON_ALWAYS_OPEN];

// Mọi nhóm trong lộ trình đều có bài, và không có bài nào ngoài lộ trình
for (const d of PRON_DRILLS) assert.ok(ALL.includes(d.group), `bài ${d.id} không thuộc lộ trình`);
for (const g of ALL) assert.ok(PRON_DRILLS.some((d) => d.group === g), `nhóm ${g} chưa có bài`);

// Ban đầu chỉ mở nhóm đầu tiên, cộng các nhóm luôn mở (đuôi -ed)
assert.deepEqual(unlockedGroups({}), [PRON_LADDER[0], ...PRON_ALWAYS_OPEN]);
assert.equal(availableDrills({}).every((d) => d.group === PRON_LADDER[0] || PRON_ALWAYS_OPEN.includes(d.group)), true);
assert.ok(PRON_ALWAYS_OPEN.every((g) => !PRON_LADDER.includes(g)), 'nhóm luôn mở không nằm trong lộ trình');
// Mã bài không trùng
assert.equal(new Set(PRON_DRILLS.map((d) => d.id)).size, PRON_DRILLS.length);
// Bài nhóm -ed: có từ để nghe phân biệt, và dạng gốc không được nhận là đúng
for (const d of PRON_DRILLS.filter((x) => x.group === 'ed')) {
  assert.ok(d.pair, `${d.id} thiếu từ nghe phân biệt`);
  assert.ok(!d.accepted.includes(d.pair), `${d.id} không được nhận ${d.pair}`);
  assert.ok(d.sentence.en.toLowerCase().includes(d.word), `${d.id}: câu ví dụ phải chứa ${d.word}`);
}

// Một bài đúng dưới 60% thì nhóm chưa đạt
const first = PRON_DRILLS.filter((d) => d.group === PRON_LADDER[0]);
const weak = Object.fromEntries(first.map((d) => [d.id, { tries: 5, ok: 2 }]));
assert.equal(groupMastered(weak, PRON_LADDER[0]), false);
assert.deepEqual(unlockedGroups(weak), [PRON_LADDER[0], ...PRON_ALWAYS_OPEN]);

// Mọi bài trong nhóm đạt 60% trở lên thì mở nhóm kế tiếp
const strong = Object.fromEntries(first.map((d) => [d.id, { tries: 5, ok: 3 }]));
assert.equal(groupMastered(strong, PRON_LADDER[0]), true);
assert.deepEqual(unlockedGroups(strong), [PRON_LADDER[0], PRON_LADDER[1], ...PRON_ALWAYS_OPEN]);

// Bài chưa thử ở nhóm đã mở vẫn được tính là chưa đạt
const partial = { ...strong };
delete partial[first[0].id];
assert.equal(groupMastered(partial, PRON_LADDER[0]), false);

// Chọn bài chỉ trong nhóm đang mở
const picks = new Set();
for (let i = 0; i < 200; i++) picks.add(pickPronDrill({}, [], () => (i % 100) / 100).group);
assert.deepEqual([...picks].sort(), [PRON_LADDER[0], ...PRON_ALWAYS_OPEN].sort());

console.log('pronladder.test: mở khoá theo nhóm và chọn bài trong phạm vi đều đúng.');
