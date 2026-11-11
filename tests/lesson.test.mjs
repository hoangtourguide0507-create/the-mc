// Kiểm thử luồng chỉ-bài-học (src/core/lesson.ts). Chạy: npm run test:lesson
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (rel) => {
  const outfile = path.join(os.tmpdir(), `mc-${path.basename(rel)}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, rel)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const L = await load('src/core/lesson.ts');

// 1) Khoá: xét cấp trước, danh tiếng sau; không còn xét giờ hay năng lượng
const gala = { reqLv: 7, minRep: 2.0 };
assert.deepEqual(L.lessonLock(gala, 3, { avg: 3, n: 9 }), { kind: 'level', need: 7 });
assert.deepEqual(L.lessonLock(gala, 7, { avg: 1.9, n: 9 }), { kind: 'rep', need: 2.0 });
assert.deepEqual(L.lessonLock(gala, 7, { avg: 0, n: 0 }), { kind: 'rep', need: 2.0 }, 'chưa dẫn show nào thì chưa có danh tiếng');
assert.deepEqual(L.lessonLock(gala, 7, undefined), { kind: 'rep', need: 2.0 });
assert.equal(L.lessonLock(gala, 7, { avg: 2.0, n: 1 }), null);
assert.equal(L.lessonLock({ reqLv: 1 }, 1, { avg: 0, n: 0 }), null, 'bài không đòi danh tiếng thì người mới vào được');

// 2) Charisma: giữ công thức gốc reward · (0.6 + 0.15·avg) · k
assert.equal(L.lessonCharisma(40, 3, { isShow: true, repeatToday: false }), Math.round(40 * 1.05));
assert.equal(L.lessonCharisma(40, 0, { isShow: true, repeatToday: false }), 24);
assert.equal(L.lessonCharisma(40, 2, { isShow: true, repeatToday: false, bonusCha: 0.1 }), Math.round(40 * 0.9 * 1.1));
assert.equal(L.lessonCharisma(10, 2, { isShow: false, repeatToday: false, bonusCha: 0.1 }), 9, 'khởi động không ăn bonus show');
// Luyện lại trong ngày: còn một nửa, cho cả show lẫn khởi động
assert.equal(L.lessonCharisma(40, 3, { isShow: true, repeatToday: true, bonusCha: 0.1 }), 21);
assert.equal(L.lessonCharisma(10, 2, { isShow: false, repeatToday: true }), Math.round(10 * 0.9 * 0.5));

// 3) Ngày học
assert.equal(L.isNewLessonDay('', '2026-11-11'), true);
assert.equal(L.isNewLessonDay('2026-11-10', '2026-11-11'), true);
assert.equal(L.isNewLessonDay('2026-11-11', '2026-11-11'), false);

console.log('lesson: OK');
