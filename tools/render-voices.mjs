#!/usr/bin/env node
/**
 * Render game speech to mp3 with ElevenLabs, once per line.
 *
 *   ELEVENLABS_API_KEY=sk_... node tools/render-voices.mjs            # render missing clips
 *   node tools/render-voices.mjs --dry-run                           # list what would be rendered, no API calls
 *   ELEVENLABS_API_KEY=sk_... node tools/render-voices.mjs --prune   # also delete clips no longer used
 *
 * Casting, model, phases and the per-run character budget live in tools/voices.config.json.
 * Output: public/audio/clips/<hash>.mp3 and public/audio/manifest.json.
 * A clip's hash covers voice, model, settings and text, so it is rendered again only
 * when one of those changes. Lines whose role has no voiceId are skipped (the game
 * falls back to the browser voice for them).
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = path.join(root, 'public', 'audio');
const CLIP_DIR = path.join(AUDIO_DIR, 'clips');
const MANIFEST = path.join(AUDIO_DIR, 'manifest.json');
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const PRUNE = args.has('--prune');
const API_KEY = process.env.ELEVENLABS_API_KEY || '';

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

async function loadContent() {
  const outfile = path.join(os.tmpdir(), `mc-content-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(root, 'src', 'data', 'content.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    await rm(outfile, { force: true });
  }
}

/** Every line the game can speak, tagged with the role whose voice says it. */
function collect(C) {
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
  for (const scene of Object.values(C.SCENES)) {
    for (const t of scene.turns || []) {
      const npc = t.who || scene.npc;
      const role = npc === 'couple' ? `couple:${t.speaker || 'emma'}` : npc;
      add('scenes', role, t.npc);
      add('scenes', 'coach', t.cue);
      add('scenes', 'coach', t.sample);
      playerLines.push(t.cue || '', t.sample || '');
    }
  }
  for (const it of C.STREET_TALK || []) {
    add('streettalk', 'passer', it.prompt?.en);
    for (const o of it.options || []) if (o.ok) add('streettalk', 'coach', o.en);
  }
  for (const p of C.STARTER || []) add('phrasebook', 'coach', p.en);

  const words = new Set();
  for (const line of playerLines) {
    for (const w of line.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []) words.add(w);
  }
  for (const w of words) add('words', 'coach', w);
  return items;
}

function clipName(item, role, cfg) {
  const settings = { ...cfg.defaultSettings, ...(role.settings || {}) };
  const h = createHash('sha1')
    .update(JSON.stringify([role.voiceId, cfg.model, cfg.outputFormat, settings, item.text]))
    .digest('hex')
    .slice(0, 16);
  return { file: `clips/${h}.mp3`, settings };
}

async function exists(f) {
  try {
    return (await stat(f)).size > 0;
  } catch {
    return false;
  }
}

async function tts(text, voiceId, cfg, settings) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${cfg.outputFormat}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: cfg.model, voice_settings: settings }),
    });
    if (res.ok) {
      return { buf: Buffer.from(await res.arrayBuffer()), cost: Number(res.headers.get('character-cost') || text.length) };
    }
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    const err = new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
    err.fatal = [401, 402, 403].includes(res.status) || body.includes('quota_exceeded');
    throw err;
  }
  throw new Error('ElevenLabs: too many retries');
}

async function main() {
  const cfg = JSON.parse(await readFile(path.join(root, 'tools', 'voices.config.json'), 'utf8'));
  const C = await loadContent();
  const all = collect(C);
  const phaseRank = (p) => {
    const i = cfg.phases.indexOf(p);
    return i < 0 ? Infinity : i;
  };

  await mkdir(CLIP_DIR, { recursive: true });
  const manifest = { version: 1, clips: {} };
  const keep = new Set();
  const todo = [];
  let uncast = 0;

  for (const item of all) {
    const role = cfg.roles[item.role];
    if (!role?.voiceId) {
      uncast++;
      continue;
    }
    const { file, settings } = clipName(item, role, cfg);
    if (await exists(path.join(AUDIO_DIR, file))) {
      manifest.clips[item.key] = file;
      keep.add(file);
    } else if (phaseRank(item.phase) !== Infinity) {
      todo.push({ ...item, file, settings, voiceId: role.voiceId });
    }
  }
  todo.sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase));

  const pending = todo.reduce((n, t) => n + t.text.length, 0);
  console.log(
    `Lines: ${all.length} total, ${Object.keys(manifest.clips).length} already rendered, ` +
      `${todo.length} to render (~${pending} credits), ${uncast} skipped (role has no voiceId).`
  );

  if (DRY) {
    for (const t of todo.slice(0, 20)) console.log(`  [${t.phase}/${t.role}] ${t.text}`);
    if (todo.length > 20) console.log(`  ... and ${todo.length - 20} more`);
    return;
  }
  if (todo.length && !API_KEY) {
    console.log('ELEVENLABS_API_KEY is not set: nothing rendered.');
    todo.length = 0;
  }

  let spent = 0;
  let done = 0;
  for (const t of todo) {
    if (spent + t.text.length > cfg.maxCharsPerRun) {
      console.log(`Budget of ${cfg.maxCharsPerRun} characters for this run reached; the rest waits for the next run.`);
      break;
    }
    try {
      const { buf, cost } = await tts(t.text, t.voiceId, cfg, t.settings);
      await writeFile(path.join(AUDIO_DIR, t.file), buf);
      manifest.clips[t.key] = t.file;
      keep.add(t.file);
      spent += cost;
      done++;
      console.log(`  ✓ [${t.role}] ${t.text.slice(0, 70)}`);
    } catch (err) {
      console.error(`  ✗ [${t.role}] ${t.text.slice(0, 50)}: ${err.message}`);
      if (err.fatal) break;
    }
  }

  if (PRUNE) {
    for (const f of await readdir(CLIP_DIR)) {
      if (!keep.has(`clips/${f}`)) await rm(path.join(CLIP_DIR, f));
    }
  }

  const sorted = Object.fromEntries(Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, JSON.stringify({ version: 1, clips: sorted }, null, 1) + '\n');
  console.log(`Rendered ${done} clips this run, ~${spent} credits. Manifest has ${Object.keys(sorted).length} clips.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
