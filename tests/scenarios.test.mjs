// Kiểm thử các bộ tình huống (src/data/scenarios) và phép xoay vòng theo ngày. Chạy: npm run test:scenarios
import assert from 'node:assert/strict';
import { loadContent } from '../tools/voice-lines.mjs';

const C = await loadContent();
const lower = (s = '') => String(s).toLowerCase();
const includesAny = (text, words) => words.some((w) => lower(text).includes(lower(w)));
const ALL = ['coffee', 'market', 'backstage', 'wedding', 'beach', 'gala', 'interview'];
const hasVi = (s) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s);

let scenarios = 0;
let turnsChecked = 0;
const allIds = new Set();
const npcLines = new Map();

for (const id of ALL) {
  const scene = C.SCENES[id];
  // Một vòng = mọi bộ tình huống + 1 ngày bộ sinh. Gom các bộ qua 40 ngày.
  const seen = new Map();
  const order = [];
  for (let day = 2; day <= 41; day++) {
    const script = C.scenarioForDay(scene, day);
    assert.equal(script.turns.length, scene.turns.length, `${id} ngày ${day}: số lượt khác kịch bản gốc`);
    order.push(script.scenarioId);
    if (script.scenarioId) seen.set(script.scenarioId, script);
  }
  assert.ok(seen.size >= 6, `${id}: chỉ có ${seen.size} bộ tình huống (cần ≥ 6)`);

  // Không lặp gần: cùng một tình huống phải cách nhau ít nhất 5 ngày
  order.forEach((sid, i) => {
    if (!sid) return;
    for (let k = 1; k <= 5 && i + k < order.length; k++) {
      assert.notEqual(order[i + k], sid, `${id}: tình huống ${sid} lặp lại sau ${k} ngày`);
    }
  });
  // Ngày 2 phải là tình huống mới, không phải kịch bản gốc
  assert.ok(order[0], `${id}: ngày 2 chưa dùng bộ tình huống mới`);
  assert.equal(C.scenarioForDay(scene, 1).turns, scene.turns, `${id}: ngày 1 phải dùng kịch bản gốc`);

  for (const [sid, script] of seen) {
    assert.ok(!allIds.has(sid), `trùng id tình huống ${sid}`);
    allIds.add(sid);
    assert.ok(script.title && hasVi(script.title + ' đ') , `${sid}: thiếu tên tình huống`);
    scenarios++;
    const modes = new Set();
    script.turns.forEach((t, i) => {
      const where = `${sid} lượt ${i + 1}`;
      modes.add(t.mode);
      assert.ok(t.npc && t.npcVi && t.tip, `${where}: thiếu npc/npcVi/tip`);
      assert.ok(!hasVi(t.npc), `${where}: câu NPC tiếng Anh lẫn dấu tiếng Việt`);
      assert.ok(t.npc.length <= 190, `${where}: câu NPC quá dài (${t.npc.length} ký tự)`);
      if (t.who) assert.ok(C.NPCS[t.who], `${where}: NPC "${t.who}" không tồn tại`);
      if (t.who === 'couple') assert.ok(t.speaker, `${where}: cặp đôi cần speaker`);
      assert.ok(!npcLines.has(t.npc), `${where}: câu NPC trùng với ${npcLines.get(t.npc)}`);
      npcLines.set(t.npc, where);

      if (t.mode === 'scripted') {
        assert.ok(t.cue && t.cueVi && !t.cue.includes('{'), `${where}: thiếu cue/cueVi`);
        assert.ok(!hasVi(t.cue), `${where}: cue lẫn dấu tiếng Việt`);
      } else if (t.mode === 'catch') {
        assert.ok(t.catchAnswers?.length >= 1, `${where}: catch thiếu từ cần bắt`);
        assert.ok(!t.cue.includes('{'), `${where}: cue còn dấu {}`);
        for (const a of t.catchAnswers) {
          assert.ok(lower(t.cue).includes(lower(a)), `${where}: "${a}" không có trong cue`);
          // Người chơi bắt từ bằng cách nghe NPC, nên từ phải có trong câu NPC
          assert.ok(lower(t.npc).includes(lower(a)), `${where}: từ cần bắt "${a}" không có trong câu NPC`);
        }
        assert.ok((t.catch || []).length >= 3, `${where}: cần ≥ 3 từ gây nhiễu`);
        for (const d of t.catch || []) {
          assert.ok(!t.catchAnswers.some((a) => lower(a) === lower(d)), `${where}: "${d}" vừa là đáp án vừa là nhiễu`);
        }
        assert.equal(new Set(t.catchAnswers.map(lower)).size, t.catchAnswers.length, `${where}: đáp án bắt từ bị trùng`);
      } else if (t.mode === 'semi') {
        assert.equal(t.blankPool?.length, t.blanks, `${where}: blankPool không khớp số ô`);
        assert.equal((t.frame.match(/___/g) || []).length, t.blanks, `${where}: frame không khớp số ô`);
        assert.equal((t.cueVi.match(/___/g) || []).length, t.blanks, `${where}: cueVi không khớp số ô`);
        assert.ok(!t.sample.includes('___'), `${where}: sample còn ô trống`);
        t.blankPool.forEach((pool, bi) => assert.ok(includesAny(t.sample, pool), `${where}: sample thiếu đáp án ô ${bi + 1}`));
      } else if (t.mode === 'quiz') {
        assert.equal(t.options.length, 3, `${where}: quiz cần đúng 3 đáp án`);
        assert.equal(t.options.filter((o) => o.ok).length, 1, `${where}: quiz phải có đúng 1 đáp án đúng`);
        assert.equal(new Set(t.options.map((o) => o.t)).size, 3, `${where}: đáp án quiz bị trùng`);
        assert.ok(t.question && t.cueVi, `${where}: quiz thiếu câu hỏi hoặc bản dịch`);
      } else if (t.mode === 'free') {
        assert.ok(t.task && t.taskVi && t.sample, `${where}: free thiếu task/taskVi/sample`);
        assert.ok(t.requiredKeywords?.length >= 2, `${where}: free cần ≥ 2 nhóm từ khóa bắt buộc`);
        for (const group of t.requiredKeywords) assert.ok(includesAny(t.sample, group), `${where}: sample thiếu từ khóa bắt buộc [${group}]`);
        assert.ok(t.sample.split(/\s+/).length >= t.minWords, `${where}: sample ngắn hơn minWords`);
      } else {
        assert.fail(`${where}: mode lạ ${t.mode}`);
      }
      turnsChecked++;
    });
    // Mỗi bộ phải luyện ít nhất 3 kiểu bài khác nhau
    assert.ok(modes.size >= 3, `${sid}: chỉ có ${modes.size} kiểu bài (cần ≥ 3)`);
  }
  console.log(`  ${id}: ${seen.size} bộ tình huống, vòng ${seen.size + 1} ngày`);
}

// Vị trí đáp án đúng của quiz không được dồn hết vào một chỗ
const pos = [0, 0, 0];
for (const id of ALL) for (let day = 2; day <= 12; day++) for (const t of C.scenarioForDay(C.SCENES[id], day).turns) {
  if (t.mode === 'quiz') pos[t.options.findIndex((o) => o.ok)]++;
}
assert.ok(pos.every((n) => n > 0), `vị trí đáp án đúng của quiz bị lệch: ${pos}`);

assert.ok(scenarios >= 50, `mới có ${scenarios} bộ tình huống (cần ≥ 50)`);
console.log(`scenarios.test: ${scenarios} bộ tình huống, ${turnsChecked} lượt hợp lệ; quiz đúng ở vị trí ${pos.join('/')}.`);

// Câu mẫu phải tự đạt điểm cao khi đưa qua bộ chấm thật của game (evaluator.ts)
{
  const { build } = await import('esbuild');
  const os = await import('node:os');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { root } = await import('../tools/voice-lines.mjs');
  const outfile = path.join(os.tmpdir(), `mc-eval-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, 'src/core/evaluator.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  const E = await import(pathToFileURL(outfile).href);
  let graded = 0;
  const fails = [];
  for (const id of ALL) {
    for (let day = 2; day <= 10; day++) {
      const script = C.scenarioForDay(C.SCENES[id], day);
      if (!script.scenarioId) continue;
      script.turns.forEach((t, i) => {
        if (t.mode === 'quiz') return;
        const text = t.cue || t.sample;
        const res = E.evaluateTurnCandidates(t, [text]);
        if (res.stars < 3) fails.push(`${script.scenarioId} lượt ${i + 1} (${t.mode}): câu mẫu chỉ đạt ${res.stars}★ (${res.score}%) thiếu=${JSON.stringify(res.missingKeywords || [])}`);
        graded++;
      });
    }
  }
  assert.equal(fails.length, 0, `câu mẫu không đạt 3★:\n${fails.join('\n')}`);
  console.log(`scenarios.test: ${graded} câu mẫu đều đạt 3★ với bộ chấm của game.`);
}
