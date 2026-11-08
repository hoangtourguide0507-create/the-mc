import { SCENES } from '../data/content';
import { CHAPTERS, QUESTS } from '../data/quests';
import type {
  ChapterDef,
  GameState,
  QuestDef,
  QuestObjective,
  QuestState,
} from '../types/game';

export { CHAPTERS, QUESTS, SCENES };

export function objectiveMet(o: QuestObjective, st: GameState): boolean {
  switch (o.kind) {
    case 'phrase':
      return (st.quests.phraseStars[o.phraseId] || 0) >= o.minStars;
    case 'show':
      return (st.stats.bestStars[o.sceneId] || 0) >= o.minStars;
    case 'street':
      return Object.keys(st.quests.streetDone).length >= o.count;
  }
}

export function questMet(def: QuestDef, st: GameState): boolean {
  return def.objectives.every((o) => objectiveMet(o, st));
}

/** Số mục tiêu đã đạt trên tổng số mục tiêu của quest. */
export function questProgress(def: QuestDef, st: GameState): { met: number; total: number } {
  return {
    met: def.objectives.filter((o) => objectiveMet(o, st)).length,
    total: def.objectives.length,
  };
}

/** Nhãn hiển thị cho một mục tiêu. */
export function objectiveLabel(o: QuestObjective, st: GameState): string {
  switch (o.kind) {
    case 'phrase': {
      const cut = o.phraseId.lastIndexOf('-');
      const sceneId = o.phraseId.slice(0, cut);
      const turn = Number(o.phraseId.slice(cut + 1)) + 1;
      const title = SCENES[sceneId]?.title ?? sceneId;
      return `${title} · lượt ${turn} đạt ≥ ${o.minStars}★`;
    }
    case 'show': {
      const title = SCENES[o.sceneId]?.title ?? o.sceneId;
      return `${title} · trung bình ≥ ${o.minStars}★`;
    }
    case 'street': {
      const n = Object.keys(st.quests.streetDone).length;
      return `Trò chuyện với người đi đường: ${Math.min(n, o.count)}/${o.count}`;
    }
  }
}

/** Quest đầu tiên chưa hoàn thành, theo thứ tự chương. */
export function currentQuest(st: GameState): QuestDef | null {
  return QUESTS.find((q) => !st.quests.done[q.id]) ?? null;
}

export interface QuestProgressResult {
  quests: QuestState;
  newQuests: QuestDef[];
  newChapters: ChapterDef[];
  xp: number;
  charisma: number;
}

/**
 * Xét lại mọi quest từ trạng thái hiện tại. Quest đã xong không được thưởng lần nữa.
 * Hàm thuần: không đổi st, không gọi gain(). Store sẽ áp dụng kết quả.
 */
export function applyQuestProgress(st: GameState): QuestProgressResult {
  const quests: QuestState = {
    ...st.quests,
    done: { ...st.quests.done },
    chapterDone: { ...st.quests.chapterDone },
  };

  const newQuests: QuestDef[] = [];
  for (const def of QUESTS) {
    if (quests.done[def.id]) continue;
    if (questMet(def, st)) {
      quests.done[def.id] = true;
      newQuests.push(def);
    }
  }

  const newChapters: ChapterDef[] = [];
  for (const ch of CHAPTERS) {
    if (quests.chapterDone[ch.id]) continue;
    const members = QUESTS.filter((d) => d.chapter === ch.id);
    if (members.length > 0 && members.every((d) => quests.done[d.id])) {
      quests.chapterDone[ch.id] = true;
      newChapters.push(ch);
    }
  }

  const xp =
    newQuests.reduce((sum, d) => sum + d.reward.xp, 0) +
    newChapters.reduce((sum, c) => sum + c.reward.xp, 0);
  const charisma = newQuests.reduce((sum, d) => sum + d.reward.charisma, 0);

  return { quests, newQuests, newChapters, xp, charisma };
}
