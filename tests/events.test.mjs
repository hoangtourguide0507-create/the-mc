// Kiểm thử các gói sự kiện (src/data/events). Chạy: npm run test:events
// Kiểm riêng một file đang viết: node tests/events.test.mjs src/data/events/<tên>.ts
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (rel) => {
  const outfile = path.join(os.tmpdir(), `mc-ev-${rel.replace(/\W/g, '_')}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, rel)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const E = await load('src/core/evaluator.ts');
const K = await load('src/core/chunks.ts');

const single = process.argv[2];
const packs = single ? [(await load(single)).default] : (await load('src/data/events/index.ts')).EVENT_PACKS;
const EXISTING_NPCS = ['leo', 'alex', 'couple', 'victoria', 'sam', 'tom', 'ivy', 'david', 'grandpa', 'grandma', 'boy', 'girl', 'coach', 'passer'];
const EXISTING_SCENES = ['coffee', 'market', 'backstage', 'wedding', 'beach', 'gala', 'interview'];
const THEMES = ['lounge', 'conference', 'runway', 'concert', 'wedding', 'gala'];

const lower = (s = '') => String(s).toLowerCase();
const includesAny = (text, words) => words.some((w) => lower(text).includes(lower(w)));
const hasVi = (s) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s);
const norm = (s) => E.normalizeText(s).join(' ');
/** Giống prepareTurns trong content.ts: tách {từ} thành catchAnswers */
const prepare = (t) => {
  if (t.cue && t.cue.includes('{')) {
    const catchAnswers = [];
    const cue = t.cue.replace(/\{([^}]+)\}/g, (_, w) => (catchAnswers.push(w), w));
    return { ...t, mode: 'catch', cueRaw: t.cue, cue, catchAnswers };
  }
  return { ...t, mode: t.mode || 'scripted' };
};

const sceneIds = new Set();
const npcIds = new Set();
const npcLines = new Set();
const samples = new Set();
let turnsChecked = 0;

for (const pack of packs) {
  const sc = pack.scene;
  const id = sc.id;
  assert.match(id, /^[a-z]+$/, `id "${id}" chỉ gồm chữ thường`);
  assert.ok(!EXISTING_SCENES.includes(id) && !sceneIds.has(id), `${id}: trùng id tình huống`);
  sceneIds.add(id);
  assert.equal(sc.type, 'show');
  assert.ok(sc.title && sc.sub && hasVi(sc.sub), `${id}: thiếu title/sub (sub bằng tiếng Việt)`);
  assert.ok(sc.reqLv >= 1 && sc.reqLv <= 10, `${id}: reqLv ngoài 1..10`);
  assert.ok(sc.reward.charisma >= 20 && sc.reward.charisma <= 90, `${id}: charisma thưởng ngoài 20..90`);
  assert.ok(THEMES.includes(pack.ui.theme) && pack.ui.kind, `${id}: ui.theme/kind không hợp lệ`);
  assert.ok(['A2', 'B1', 'B2'].includes(pack.objective.cefr) && pack.objective.can && hasVi(pack.objective.canVi), `${id}: objective thiếu`);

  for (const [nid, n] of Object.entries(pack.npcs)) {
    assert.equal(n.id, nid);
    assert.ok(!EXISTING_NPCS.includes(nid) && !npcIds.has(nid), `${id}: trùng id nhân vật ${nid}`);
    npcIds.add(nid);
    assert.ok(n.name && n.role && ['en-US', 'en-GB', 'en-AU'].includes(n.voice.lang), `${nid}: thiếu name/role/voice`);
  }
  assert.ok(pack.npcs[sc.npc], `${id}: scene.npc "${sc.npc}" không có trong npcs của gói`);

  const turns = sc.turns.map(prepare);
  assert.ok(turns.length >= 6 && turns.length <= 8, `${id}: cần 6 đến 8 lượt (đang có ${turns.length})`);
  const modes = new Set();
  turns.forEach((t, i) => {
    const where = `${id} lượt ${i + 1}`;
    modes.add(t.mode);
    assert.ok(t.npc && t.npcVi && t.tip, `${where}: thiếu npc/npcVi/tip`);
    assert.ok(!hasVi(t.npc), `${where}: câu NPC tiếng Anh lẫn dấu tiếng Việt`);
    assert.ok(hasVi(t.npcVi), `${where}: npcVi phải là tiếng Việt`);
    assert.ok(t.npc.length <= 190, `${where}: câu NPC quá dài (${t.npc.length} ký tự)`);
    if (t.who) assert.ok(pack.npcs[t.who], `${where}: NPC "${t.who}" không có trong gói`);
    assert.ok(!npcLines.has(t.npc), `${where}: câu NPC bị trùng`);
    npcLines.add(t.npc);

    if (t.mode === 'scripted') {
      assert.ok(t.cue && t.cueVi && !hasVi(t.cue), `${where}: thiếu cue/cueVi hoặc cue lẫn tiếng Việt`);
    } else if (t.mode === 'catch') {
      assert.ok(t.catchAnswers.length >= 1 && t.catchAnswers.length <= 3, `${where}: catch cần 1 đến 3 từ`);
      for (const a of t.catchAnswers) assert.ok(lower(t.npc).includes(lower(a)), `${where}: từ cần bắt "${a}" không có trong câu NPC`);
      assert.ok((t.catch || []).length >= 3, `${where}: cần ≥ 3 từ gây nhiễu`);
      for (const d of t.catch) {
        assert.ok(!t.catchAnswers.some((a) => lower(a) === lower(d)), `${where}: "${d}" vừa là đáp án vừa là nhiễu`);
        assert.ok(!lower(t.npc).includes(lower(d)), `${where}: từ gây nhiễu "${d}" lại có trong câu NPC`);
      }
      assert.ok(t.cueVi, `${where}: thiếu cueVi`);
    } else if (t.mode === 'semi') {
      assert.equal(t.blankPool?.length, t.blanks, `${where}: blankPool không khớp số ô`);
      assert.equal((t.frame.match(/___/g) || []).length, t.blanks, `${where}: frame không khớp số ô`);
      assert.equal((t.cueVi.match(/___/g) || []).length, t.blanks, `${where}: cueVi không khớp số ô`);
      assert.ok(t.sample && !t.sample.includes('___'), `${where}: sample thiếu hoặc còn ô trống`);
      t.blankPool.forEach((pool, bi) => assert.ok(includesAny(t.sample, pool), `${where}: sample thiếu đáp án ô ${bi + 1}`));
    } else if (t.mode === 'quiz') {
      assert.equal(t.options.length, 3, `${where}: quiz cần đúng 3 đáp án`);
      assert.equal(t.options.filter((o) => o.ok).length, 1, `${where}: quiz phải có đúng 1 đáp án đúng`);
      assert.ok(t.question && hasVi(t.question) && t.cueVi, `${where}: quiz thiếu câu hỏi tiếng Việt hoặc cueVi`);
    } else if (t.mode === 'free') {
      assert.ok(t.task && t.taskVi && t.sample && t.minWords, `${where}: free thiếu task/taskVi/sample/minWords`);
      assert.ok(t.requiredKeywords?.length >= 2, `${where}: free cần ≥ 2 nhóm từ khóa bắt buộc`);
      for (const g of t.requiredKeywords) assert.ok(includesAny(t.sample, g), `${where}: sample thiếu từ khóa bắt buộc [${g}]`);
      assert.ok(t.sample.split(/\s+/).length >= t.minWords, `${where}: sample ngắn hơn minWords`);
    } else assert.fail(`${where}: mode lạ ${t.mode}`);

    // Câu mẫu phải tự đạt 3 sao với bộ chấm thật của game
    if (t.mode !== 'quiz') {
      const res = E.evaluateTurnCandidates(t, [t.cue || t.sample]);
      assert.equal(res.stars, 3, `${where} (${t.mode}): câu mẫu chỉ đạt ${res.stars}★ (${res.score}%) thiếu=${JSON.stringify(res.missingKeywords || [])}`);
    }
    turnsChecked++;
  });
  assert.ok(modes.size >= 4, `${id}: chỉ có ${modes.size} kiểu bài (cần ≥ 4 trong: scripted, catch, semi, quiz, free)`);
  assert.ok(modes.has('free'), `${id}: cần ít nhất một lượt ứng biến (free)`);

  // Cụm mang về
  const text = norm(turns.map((t) => [t.cue, t.sample, (t.options || []).find((o) => o.ok)?.t].filter(Boolean).join(' ')).join(' '));
  assert.ok(pack.chunks.length >= 2, `${id}: cần ít nhất 2 cụm mang về`);
  for (const [en, vi, useVi, sample] of pack.chunks) {
    assert.ok(en && hasVi(vi + useVi) && sample, `${id}: cụm "${en}" thiếu trường`);
    assert.ok(text.includes(norm(en)), `${id}: cụm "${en}" không có trong câu trả lời của kịch bản`);
    assert.ok(K.evaluateChunkUse(en, sample).ok, `${id}: câu mẫu của cụm "${en}" không chứa cụm hoặc quá ngắn`);
    assert.ok(!text.includes(norm(sample)), `${id}: câu mẫu của cụm "${en}" trùng câu trong kịch bản`);
    assert.ok(!samples.has(sample), `${id}: câu mẫu cụm bị trùng`);
    samples.add(sample);
  }
}
console.log(`events.test: ${packs.length} gói sự kiện, ${turnsChecked} lượt hợp lệ, câu mẫu đều đạt 3★.`);
