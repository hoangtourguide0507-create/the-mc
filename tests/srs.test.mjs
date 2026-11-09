// Kiểm thử lịch ôn lặp lại ngắt quãng. Chạy: npm run test:srs
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'srs-'));
const outfile = path.join(dir, 'srs.mjs');
await build({ entryPoints: [path.join(root, 'src/core/srs.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const S = await import(pathToFileURL(outfile).href);

const base = { key: 'warm', word: 'warm', ctx: '', status: 'bad', misses: 1, scene: 'coffee', at: 0 };

// Từ mới gặp: hộp 1, đến hạn ngay
assert.equal(S.boxOf(base), 1);
assert.equal(S.isDue(base, 5), true, 'thiếu due thì đến hạn ngay');

// Đúng thì lên hộp và giãn khoảng cách
let w = S.scheduleAfter({ ...base, box: 1, due: 5 }, true, 5);
assert.equal(w.box, 2);
assert.equal(w.due, 5 + S.SRS_INTERVALS[2]);
w = S.scheduleAfter(w, true, 7);
assert.equal(w.box, 3);
assert.equal(w.due, 7 + S.SRS_INTERVALS[3]);

// Sai thì về hộp 1, ôn ngày mai
const wrong = S.scheduleAfter({ ...base, box: 4, due: 3 }, false, 10);
assert.equal(wrong.box, 1);
assert.equal(wrong.due, 11);
assert.equal(wrong.status, 'near');

// Hộp không vượt quá tối đa
const top = S.scheduleAfter({ ...base, box: S.SRS_MAX_BOX, due: 1 }, true, 1);
assert.equal(top.box, S.SRS_MAX_BOX);

// Không sửa đầu vào
const orig = { ...base, box: 2, due: 4 };
S.scheduleAfter(orig, true, 4);
assert.equal(orig.box, 2);

// Thứ tự: từ đến hạn trước; trong mỗi nhóm, hộp thấp đứng trước
const day = 10;
const items = [
  { ...base, key: 'a', box: 3, due: 20, at: 1 },
  { ...base, key: 'b', box: 2, due: 9, at: 1 },
  { ...base, key: 'c', box: 1, due: 9, at: 1 },
  { ...base, key: 'd', box: 1, due: 12, at: 9 },
];
assert.deepEqual(S.sortForReview(items, day).map((x) => x.key), ['c', 'b', 'd', 'a']);
assert.equal(S.dueCount(items, day), 2);

console.log('srs.test: lịch hộp, ngày đến hạn và thứ tự ôn đều đúng.');
