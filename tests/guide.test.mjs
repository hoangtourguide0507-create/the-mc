// Kiểm thử nội dung Hướng dẫn (src/data/guide.ts) khớp với các mục thật trong app.ts. Chạy: npm run test:guide
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-guide-${process.pid}.mjs`);
await build({ entryPoints: [path.join(root, 'src/data/guide.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const { GUIDE, GUIDE_BY_ID, GUIDE_GROUPS, searchGuide, isStrongMatch, fold } = await import(pathToFileURL(outfile).href);

// Các mục của tab Luyện tập đọc thẳng từ app.ts, để thêm mục mới mà quên viết hướng dẫn thì test báo
const app = readFileSync(path.join(root, 'src/app.ts'), 'utf8');
const trainBlock = app.slice(app.indexOf("key: 'train'"), app.indexOf("tab === 'notebook'"));
const trainIds = [...trainBlock.matchAll(/\{ id: '([a-z]+)', label: '[^']+', mount:/g)].map((m) => m[1]);
assert.ok(trainIds.length >= 9, `đọc được ${trainIds.length} mục Luyện tập từ app.ts`);
for (const id of trainIds) assert.ok(GUIDE_BY_ID[id], `mục Luyện tập "${id}" chưa có bài hướng dẫn`);
for (const id of ['notebook', 'quests', 'start', 'lesson', 'perform', 'home']) assert.ok(GUIDE_BY_ID[id], `thiếu bài ${id}`);
assert.match(app, /help: 'notebook'/);
assert.match(app, /help: 'quests'/);

const TABS = new Set(['home', 'train', 'notebook', 'quests']);
const groups = new Set(GUIDE_GROUPS.map((g) => g.id));
assert.equal(new Set(GUIDE.map((e) => e.id)).size, GUIDE.length, 'trùng id');
for (const e of GUIDE) {
  assert.ok(groups.has(e.group), `${e.id}: nhóm sai`);
  assert.ok(e.title && e.short && e.what && e.steps.length > 0, `${e.id}: thiếu nội dung`);
  assert.ok(e.short.length <= 140, `${e.id}: câu tóm tắt dài ${e.short.length} ký tự`);
  if (e.target) {
    assert.ok(TABS.has(e.target.tab), `${e.id}: tab "${e.target.tab}" không có`);
    if (e.target.section) {
      assert.equal(e.target.tab, 'train', `${e.id}: chỉ tab Luyện tập có mục con`);
      assert.ok(trainIds.includes(e.target.section), `${e.id}: mục "${e.target.section}" không có trong tab Luyện tập`);
    }
  }
  for (const line of [e.short, e.what, ...e.steps, ...(e.scoring ?? []), ...(e.tips ?? [])]) {
    assert.ok(!/[⚡⭐]|Ra Phố|năng lượng|đồng hồ trong game/.test(line), `${e.id}: nhắc tới tính năng đã bỏ: ${line}`);
  }
}
for (const g of GUIDE_GROUPS) assert.ok(GUIDE.some((e) => e.group === g.id), `nhóm ${g.id} trống`);

// Tìm kiếm không cần dấu, mọi từ phải khớp
assert.equal(fold('Đổi Văn phong'), 'doi van phong');
assert.equal(searchGuide('van phong')[0].id, 'register', 'bài khớp tiêu đề đứng đầu');
assert.ok(isStrongMatch(GUIDE_BY_ID.register, 'Văn phong') && !isStrongMatch(GUIDE_BY_ID.talk, 'van phong'));
assert.equal(searchGuide('dich')[0].id, 'interp');
assert.ok(searchGuide('micro').some((e) => e.id === 'mic'));
assert.ok(searchGuide('dien danh tieng').some((e) => e.id === 'perform'));
assert.equal(searchGuide('').length, GUIDE.length);
assert.equal(searchGuide('zzzqxy').length, 0);

console.log(`guide.test: ${GUIDE.length} bài, phủ ${trainIds.length} mục Luyện tập — OK`);
