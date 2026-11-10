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
 * falls back to the Kokoro clip, then the browser voice, for them).
 * "Một vai, một giọng": the game uses a role's ElevenLabs voice only when every line of that
 * role has a clip (manifest.completeRoles); until then the role speaks with Kokoro for all
 * its lines. Roles are rendered one at a time, the one closest to completion first.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collect, loadContent, root } from './voice-lines.mjs';

const AUDIO_DIR = path.join(root, 'public', 'audio');
const CLIP_DIR = path.join(AUDIO_DIR, 'clips');
const MANIFEST = path.join(AUDIO_DIR, 'manifest.json');
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const PRUNE = args.has('--prune');
const API_KEY = process.env.ELEVENLABS_API_KEY || '';

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
  const manifest = { version: 1, completeRoles: [], clips: {} };
  const keep = new Set();
  const todo = [];
  let uncast = 0;
  /** Per cast role: lines in total and characters still to render. */
  const roleStats = {};

  for (const item of all) {
    const role = cfg.roles[item.role];
    if (!role?.voiceId || phaseRank(item.phase) === Infinity) {
      uncast++;
      continue;
    }
    const stat = (roleStats[item.role] ??= { lines: 0, missing: 0, missingChars: 0 });
    stat.lines++;
    const { file, settings } = clipName(item, role, cfg);
    if (await exists(path.join(AUDIO_DIR, file))) {
      manifest.clips[item.key] = file;
      keep.add(file);
    } else {
      stat.missing++;
      stat.missingChars += item.text.length;
      todo.push({ ...item, file, settings, voiceId: role.voiceId });
    }
  }
  // One role at a time, the role closest to full coverage first: the game only switches a
  // role to its ElevenLabs voice once every one of its lines has a clip ("một vai, một giọng").
  todo.sort(
    (a, b) =>
      roleStats[a.role].missingChars - roleStats[b.role].missingChars ||
      a.role.localeCompare(b.role) ||
      phaseRank(a.phase) - phaseRank(b.phase)
  );
  const finishManifest = () => {
    const missing = {};
    for (const [role, st] of Object.entries(roleStats)) missing[role] = st.lines;
    for (const key of Object.keys(manifest.clips)) missing[key.slice(0, key.indexOf('|'))]--;
    manifest.completeRoles = Object.keys(missing).filter((r) => missing[r] === 0).sort();
  };

  const pending = todo.reduce((n, t) => n + t.text.length, 0);
  console.log(
    `Lines: ${all.length} total, ${Object.keys(manifest.clips).length} with a clip, ` +
      `${todo.length} to render (~${pending} credits), ${uncast} left to Kokoro (role has no voiceId or phase not listed).`
  );
  for (const [role, st] of Object.entries(roleStats).sort((a, b) => a[1].missingChars - b[1].missingChars)) {
    console.log(`  ${role}: ${st.lines - st.missing}/${st.lines} lines, ~${st.missingChars} credits to go`);
  }

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
  finishManifest();
  await writeFile(MANIFEST, JSON.stringify({ version: 1, completeRoles: manifest.completeRoles, clips: sorted }, null, 1) + '\n');
  console.log(`Roles fully voiced by ElevenLabs: ${manifest.completeRoles.join(', ') || '(none yet)'}.`);
  console.log(`Rendered ${done} clips this run, ~${spent} credits. Manifest has ${Object.keys(sorted).length} clips.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
