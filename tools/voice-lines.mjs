/**
 * Danh sách mọi câu tiếng Anh mà game có thể đọc to, kèm vai (role) đọc câu đó.
 * Dùng chung cho tools/render-voices.mjs (ElevenLabs) và tools/render-kokoro.py (Kokoro).
 *
 *   node tools/voice-lines.mjs --json > lines.json   # xuất danh sách cho Kokoro
 *   node tools/voice-lines.mjs                       # in thống kê theo phase
 */
import { build } from 'esbuild';
import { rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Số ngày chơi được quét để gom các câu sinh tự động (dailyGen.ts, showGen.ts). */
export const GENERATED_DAYS = 60;

/** Must match normText() in src/audio/audioSystem.ts. */
export function normText(s) {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function loadContent() {
  const entry = path.join(os.tmpdir(), `mc-entry-${process.pid}.ts`);
  const outfile = path.join(os.tmpdir(), `mc-content-${process.pid}.mjs`);
  const src = (f) => JSON.stringify(path.join(root, 'src', 'data', f));
  await writeFile(
    entry,
    `export * from ${src('content.ts')};\nexport { PRON_DRILLS, coachFor } from ${src('pronunciation.ts')};\n` +
      `export { CHUNKS } from ${src('chunks.ts')};\nexport { RHYTHM_DRILLS, rhythmPlain } from ${src('rhythm.ts')};\n` +
      `export { INCIDENTS } from ${src('incidents.ts')};\n`
  );
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    await rm(outfile, { force: true });
    await rm(entry, { force: true });
  }
}

/** Every line the game can speak, tagged with the role whose voice says it. */
export function collect(C) {
  const items = [];
  const seen = new Set();
  const add = (phase, role, text) => {
    if (typeof text !== 'string' || !text.trim()) return;
    const key = `${role}|${normText(text)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ phase, role, text: text.trim(), key });
  };

  const playerLines = [];
  const addTurns = (phase, scene, turns) => {
    for (const t of turns || []) {
      const npc = t.who || scene.npc;
      const role = npc === 'couple' ? `couple:${t.speaker || 'emma'}` : npc;
      add(phase, role, t.npc);
      add(phase, 'coach', t.cue);
      add(phase, 'coach', t.sample);
      playerLines.push(t.cue || '', t.sample || '');
    }
  };

  // 1. Kịch bản gốc (ngày 1)
  for (const scene of Object.values(C.SCENES)) addTurns('scenes', scene, scene.turns);

  // 2. Các lượt sinh theo ngày (từ ngày 2)
  if (typeof C.turnsForDay === 'function') {
    for (let day = 2; day <= GENERATED_DAYS + 1; day++) {
      for (const scene of Object.values(C.SCENES)) addTurns('generated', scene, C.turnsForDay(scene, day));
    }
  }

  // 3. Luyện phát âm: từ, từ dễ nhầm và câu ví dụ, đọc bằng giọng NPC huấn luyện của nhóm
  for (const d of C.PRON_DRILLS || []) {
    const role = C.coachFor ? C.coachFor(d) : 'coach';
    add('pronunciation', role, d.word);
    add('pronunciation', role, d.pair);
    add('pronunciation', role, d.sentence?.en);
  }

  // 4. Trò chuyện trên đường
  for (const it of C.STREET_TALK || []) {
    add('streettalk', 'passer', it.prompt?.en);
    add('streettalk', 'coach', it.say);
    for (const o of it.options || []) if (o.ok) add('streettalk', 'coach', o.en);
  }

  // 5. Cụm mang về (câu mẫu trong ngữ cảnh mới) và bài nhịp ngắt nghỉ
  for (const ch of Object.values(C.CHUNKS || {})) {
    add('chunks', 'coach', ch.en);
    add('chunks', 'coach', ch.sample);
  }
  for (const d of C.RHYTHM_DRILLS || []) add('rhythm', 'coach', C.rhythmPlain(d));
  // Câu mẫu của sự cố bất ngờ (màn diễn)
  for (const inc of C.INCIDENTS || []) add('incidents', 'coach', inc.sample);

  // 6. Sổ tay và từ đơn (chạm vào từ để nghe)
  for (const p of C.STARTER || []) add('phrasebook', 'coach', p.en);
  const words = new Set();
  for (const line of playerLines) {
    for (const w of line.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []) words.add(w);
  }
  for (const w of words) add('words', 'coach', w);
  return items;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const items = collect(await loadContent());
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(items));
  } else {
    const by = {};
    for (const it of items) {
      by[it.phase] ??= { lines: 0, chars: 0 };
      by[it.phase].lines++;
      by[it.phase].chars += it.text.length;
    }
    console.table(by);
    console.log(`Tổng: ${items.length} câu, ${items.reduce((n, i) => n + i.text.length, 0)} ký tự.`);
  }
}
