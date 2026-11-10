// Kiểm tra danh sách câu đọc to (tools/voice-lines.mjs) và cấu hình giọng Kokoro.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { collect, loadContent, normText, root } from '../tools/voice-lines.mjs';

const C = await loadContent();
const items = collect(C);
const kokoro = JSON.parse(await readFile(path.join(root, 'tools', 'voices.kokoro.json'), 'utf8'));
const eleven = JSON.parse(await readFile(path.join(root, 'tools', 'voices.config.json'), 'utf8'));

// 1. Mọi phase đều có câu
const phases = new Set(items.map((i) => i.phase));
for (const p of ['scenes', 'generated', 'pronunciation', 'streettalk', 'phrasebook', 'words']) {
  assert.ok(phases.has(p), `thiếu phase ${p}`);
}

// 2. Không trùng khóa, khóa khớp normText
const keys = new Set();
for (const it of items) {
  assert.equal(it.key, `${it.role}|${normText(it.text)}`);
  assert.ok(!keys.has(it.key), `trùng khóa ${it.key}`);
  keys.add(it.key);
}

// 3. Mọi vai xuất hiện đều có giọng Kokoro (passer dùng passerPool)
const roles = new Set(items.map((i) => i.role));
for (const r of roles) {
  if (r === 'passer') assert.ok(kokoro.passerPool.length > 0, 'passerPool rỗng');
  else assert.ok(kokoro.roles[r]?.voice, `vai ${r} chưa có giọng Kokoro`);
}

// 4. Câu sinh theo ngày 2 của mọi cảnh đều nằm trong danh sách (không rơi về giọng trình duyệt)
for (const scene of Object.values(C.SCENES)) {
  for (const t of C.turnsForDay(scene, 2)) {
    const npc = t.who || scene.npc;
    const role = npc === 'couple' ? `couple:${t.speaker || 'emma'}` : npc;
    if (t.npc) assert.ok(keys.has(`${role}|${normText(t.npc)}`), `thiếu câu NPC: ${t.npc}`);
    if (t.cue) assert.ok(keys.has(`coach|${normText(t.cue)}`), `thiếu câu mẫu: ${t.cue}`);
  }
}

// 5. Mọi phase trong cấu hình đều là phase có thật
for (const p of [...kokoro.phases, ...eleven.phases]) assert.ok(phases.has(p), `phase lạ: ${p}`);

console.log(`voice lines: ${items.length} câu, ${roles.size} vai — OK`);
