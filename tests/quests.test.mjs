// Kiểm thử logic nhiệm vụ (quest). Chạy: npm run test:quests
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'quests-'));
const outfile = path.join(dir, 'quests.mjs');
await build({
  entryPoints: [path.join(root, 'src/core/quests.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});
const Q = await import(pathToFileURL(outfile).href);

const fresh = () => ({
  quests: { phraseStars: {}, streetDone: {}, done: {}, chapterDone: {} },
  stats: { bestStars: {} },
});

// Trạng thái ban đầu không có quest nào hoàn thành.
{
  const r = Q.applyQuestProgress(fresh());
  assert.equal(r.newQuests.length, 0);
  assert.equal(r.newChapters.length, 0);
  assert.equal(r.xp, 0);
}

// Cấu trúc dữ liệu: id duy nhất, chương hợp lệ, mẫu câu trỏ đúng lượt.
{
  const ids = Q.QUESTS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, 'quest id trùng');
  const chapterIds = new Set(Q.CHAPTERS.map((c) => c.id));
  for (const q of Q.QUESTS) {
    assert.ok(chapterIds.has(q.chapter), `chương không tồn tại: ${q.chapter}`);
    assert.ok(q.objectives.length > 0, `quest rỗng: ${q.id}`);
    for (const o of q.objectives) {
      if (o.kind === 'phrase') {
        const cut = o.phraseId.lastIndexOf('-');
        const sceneId = o.phraseId.slice(0, cut);
        const idx = Number(o.phraseId.slice(cut + 1));
        const scene = Q.SCENES[sceneId];
        assert.ok(scene, `hoạt động không tồn tại: ${sceneId}`);
        assert.ok(idx >= 0 && idx < scene.turns.length, `lượt không tồn tại: ${o.phraseId}`);
      }
    }
  }
}

// Mẫu câu: đủ mọi lượt đạt 1★ thì quest cà phê hoàn thành, thưởng đúng một lần.
{
  const st = fresh();
  const coffeeQuest = Q.QUESTS.find((q) => q.id === 'c1-coffee');
  const n = coffeeQuest.objectives.length;
  for (let i = 0; i < n - 1; i++) st.quests.phraseStars[`coffee-${i}`] = 1;
  assert.equal(Q.applyQuestProgress(st).newQuests.length, 0, 'chưa đủ lượt mà đã xong');

  st.quests.phraseStars[`coffee-${n - 1}`] = 1;
  const r = Q.applyQuestProgress(st);
  assert.ok(r.newQuests.some((d) => d.id === 'c1-coffee'));
  assert.equal(r.charisma >= coffeeQuest.reward.charisma, true);

  st.quests = { ...st.quests, done: { ...st.quests.done, 'c1-coffee': true } };
  const again = Q.applyQuestProgress(st);
  assert.ok(!again.newQuests.some((d) => d.id === 'c1-coffee'), 'thưởng lặp lại');
}

// Show: điểm trung bình tốt nhất của show phải đạt ngưỡng.
{
  const st = fresh();
  st.stats.bestStars.backstage = 1;
  for (const o of Q.QUESTS.find((q) => q.id === 'c1-backstage').objectives) {
    if (o.kind === 'phrase') st.quests.phraseStars[o.phraseId] = 1;
  }
  const r = Q.applyQuestProgress(st);
  assert.ok(r.newQuests.some((d) => d.id === 'c1-backstage'));
}

// Trò chuyện: đếm số mục STREET_TALK đã trả lời.
{
  const st = fresh();
  for (let i = 0; i < 5; i++) st.quests.streetDone[`st-${i}`] = true;
  const r = Q.applyQuestProgress(st);
  assert.ok(r.newQuests.some((d) => d.id === 'c4-street-5'));
  assert.ok(!r.newQuests.some((d) => d.id === 'c4-street-15'));
}

// Hoàn thành cả chương: thưởng chương đúng một lần.
{
  const st = fresh();
  for (const q of Q.QUESTS.filter((d) => d.chapter === 'c4')) {
    st.quests.done[q.id] = true;
  }
  for (let i = 0; i < 30; i++) st.quests.streetDone[`st-${i}`] = true;
  const r = Q.applyQuestProgress(st);
  assert.ok(r.newChapters.some((c) => c.id === 'c4'));
  const r2 = Q.applyQuestProgress({ ...st, quests: { ...st.quests, chapterDone: { c4: true } } });
  assert.ok(!r2.newChapters.some((c) => c.id === 'c4'));
}

console.log(`quests: ${Q.QUESTS.length} nhiệm vụ, ${Q.CHAPTERS.length} chương — tất cả kiểm thử đều pass`);
