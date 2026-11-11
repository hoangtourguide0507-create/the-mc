// Kiểm thử dữ liệu "cụm mang về" và bài nhịp. Chạy: npm run test:chunks
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { loadContent, root } from '../tools/voice-lines.mjs';

const load = async (rel) => {
  const outfile = path.join(os.tmpdir(), `mc-${rel.replace(/\W/g, '_')}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, rel)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const C = await loadContent();
const { CHUNKS, CHUNKS_BY_SCRIPT } = await load('src/data/chunks.ts');
const K = await load('src/core/chunks.ts');
const { RHYTHM_DRILLS, rhythmPauses, rhythmPlain } = await load('src/data/rhythm.ts');
const E = await load('src/core/evaluator.ts');

const norm = (s) => E.normalizeText(s).join(' ');
const playerText = (turns) =>
  norm(turns.map((t) => [t.cue, t.sample, (t.options || []).find((o) => o.ok)?.t].filter(Boolean).join(' ')).join(' '));

// Gom kịch bản: ngày 1 của mỗi cảnh và mọi bộ tình huống
const scripts = new Map();
for (const [id, scene] of Object.entries(C.SCENES)) {
  scripts.set(`${id}:base`, scene.turns);
  for (let day = 2; day <= 12; day++) {
    const sc = C.scenarioForDay(scene, day);
    if (sc.scenarioId) scripts.set(sc.scenarioId, sc.turns);
  }
}

let count = 0;
for (const [key, turns] of scripts) {
  const chunks = CHUNKS_BY_SCRIPT[key];
  assert.ok(chunks?.length >= 2, `${key}: cần ít nhất 2 cụm mang về`);
  const text = playerText(turns);
  for (const ch of chunks) {
    assert.equal(CHUNKS[ch.id], ch);
    assert.ok(ch.en && ch.vi && ch.useVi && ch.sample, `${ch.id}: thiếu trường`);
    assert.ok(text.includes(norm(ch.en)), `${ch.id}: cụm "${ch.en}" không có trong câu trả lời của kịch bản`);
    // Câu mẫu dùng cụm trong ngữ cảnh mới phải tự đạt với bộ chấm
    assert.ok(K.evaluateChunkUse(ch.en, ch.sample).ok, `${ch.id}: câu mẫu không chứa cụm hoặc quá ngắn`);
    // Ngữ cảnh mới: câu mẫu không được là câu của chính kịch bản
    assert.ok(!text.includes(norm(ch.sample)), `${ch.id}: câu mẫu trùng với câu trong kịch bản`);
    count++;
  }
}
for (const key of Object.keys(CHUNKS_BY_SCRIPT)) assert.ok(scripts.has(key), `cụm gắn với kịch bản không tồn tại: ${key}`);
assert.equal(new Set(Object.values(CHUNKS).map((c) => c.sample)).size, count, 'câu mẫu bị trùng');

// Bài nhịp
const ids = new Set();
for (const d of RHYTHM_DRILLS) {
  assert.ok(!ids.has(d.id), `trùng id bài nhịp ${d.id}`);
  ids.add(d.id);
  assert.ok(rhythmPauses(d) >= 1 && rhythmPauses(d) <= 4, `${d.id}: số chỗ ngắt phải từ 1 đến 4`);
  assert.ok(!rhythmPlain(d).includes('/'), `${d.id}: còn dấu / sau khi bỏ đánh dấu`);
  assert.ok(d.vi && d.tip);
}
assert.ok(RHYTHM_DRILLS.length >= 8);

console.log(`chunks.test: ${count} cụm cho ${scripts.size} kịch bản, ${RHYTHM_DRILLS.length} bài nhịp — OK`);
