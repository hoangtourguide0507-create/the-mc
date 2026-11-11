// Kiểm thử báo cáo tiến độ theo mục tiêu CEFR. Chạy: npm run test:progress
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'progress-'));
const outfile = path.join(dir, 'progress.mjs');
await build({ entryPoints: [path.join(root, 'src/core/progress.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const P = await import(pathToFileURL(outfile).href);

// Mỗi cảnh có đúng một mục tiêu; tổng theo CEFR khớp dữ liệu
const none = P.objectiveReport({});
assert.deepEqual(none, { A2: { met: 0, total: 2 }, B1: { met: 0, total: 7 }, B2: { met: 0, total: 4 } }); // 7 cảnh gốc + 6 gói sự kiện

// Đạt khi sao tốt nhất >= 2
const some = P.objectiveReport({ coffee: 3, market: 1, wedding: 2, gala: 2 });
assert.deepEqual(some.A2, { met: 1, total: 2 });
assert.deepEqual(some.B1, { met: 1, total: 7 });
assert.deepEqual(some.B2, { met: 1, total: 4 });

// Ngưỡng đạt mục tiêu
assert.equal(P.objectiveMetBy(1.9), false);
assert.equal(P.objectiveMetBy(2), true);

console.log('progress.test: báo cáo CEFR và ngưỡng đạt mục tiêu đều đúng.');
