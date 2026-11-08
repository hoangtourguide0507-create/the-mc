import { GIG_ORDER, SCENES } from './content';
import type { ChapterDef, QuestDef, QuestObjective } from '../types/game';

/**
 * Nhiệm vụ (quest) định hướng người chơi luyện đúng mẫu câu tiếng Anh.
 * Chỉ đọc dữ liệu từ content.ts; không chứa thoại mới, nên không kích hoạt render giọng ElevenLabs.
 * Thưởng nhỏ, đi qua gain() trong store.
 */

const titleOf = (sceneId: string) => SCENES[sceneId]?.title ?? sceneId;

/** Mỗi lượt của hoạt động phải đạt ít nhất 1★. */
const phraseObjectives = (sceneId: string): QuestObjective[] => {
  const scene = SCENES[sceneId];
  if (!scene) return [];
  return scene.turns.map((_, i) => ({
    kind: 'phrase' as const,
    phraseId: `${sceneId}-${i}`,
    minStars: 1,
  }));
};

const showObjective = (sceneId: string, minStars: number): QuestObjective => ({
  kind: 'show',
  sceneId,
  minStars,
});

const PHRASE_REWARD = { xp: 10, charisma: 5 };
const SHOW_REWARD = { xp: 15, charisma: 8 };
const STAR_REWARD = { xp: 30, charisma: 15 };
const STREET_REWARD = { xp: 10, charisma: 3 };

export const CHAPTERS: ChapterDef[] = [
  { id: 'c1', title: 'Chương 1 · Ngày đầu tiên ☕', reward: { xp: 25 } },
  { id: 'c2', title: 'Chương 2 · Lên sân khấu 🎤', reward: { xp: 25 } },
  { id: 'c3', title: 'Chương 3 · Đêm tiệc lớn 🥂', reward: { xp: 40 } },
  { id: 'c4', title: 'Chương 4 · Đường phố 🚶', reward: { xp: 25 } },
  { id: 'c5', title: 'Chương 5 · Ngôi sao MC ⭐', reward: { xp: 60 } },
];

export const QUESTS: QuestDef[] = [
  // Chương 1
  {
    id: 'c1-coffee',
    chapter: 'c1',
    title: `Luyện mẫu câu: ${titleOf('coffee')}`,
    objectives: phraseObjectives('coffee'),
    reward: PHRASE_REWARD,
  },
  {
    id: 'c1-market',
    chapter: 'c1',
    title: `Luyện mẫu câu: ${titleOf('market')}`,
    objectives: phraseObjectives('market'),
    reward: PHRASE_REWARD,
  },
  {
    id: 'c1-backstage',
    chapter: 'c1',
    title: `Lên sân khấu lần đầu: ${titleOf('backstage')}`,
    objectives: [...phraseObjectives('backstage'), showObjective('backstage', 1)],
    reward: SHOW_REWARD,
  },
  // Chương 2
  {
    id: 'c2-wedding',
    chapter: 'c2',
    title: `Show tiệc cưới: ${titleOf('wedding')}`,
    objectives: [...phraseObjectives('wedding'), showObjective('wedding', 2)],
    reward: SHOW_REWARD,
  },
  {
    id: 'c2-beach',
    chapter: 'c2',
    title: `Show ven biển: ${titleOf('beach')}`,
    objectives: [...phraseObjectives('beach'), showObjective('beach', 2)],
    reward: SHOW_REWARD,
  },
  // Chương 3
  {
    id: 'c3-gala',
    chapter: 'c3',
    title: `Gala: ${titleOf('gala')}`,
    objectives: [...phraseObjectives('gala'), showObjective('gala', 2)],
    reward: SHOW_REWARD,
  },
  {
    id: 'c3-interview',
    chapter: 'c3',
    title: `Phỏng vấn truyền hình: ${titleOf('interview')}`,
    objectives: [...phraseObjectives('interview'), showObjective('interview', 2)],
    reward: SHOW_REWARD,
  },
  // Chương 4: nói chuyện với người đi đường
  {
    id: 'c4-street-5',
    chapter: 'c4',
    title: 'Trò chuyện với 5 người đi đường',
    objectives: [{ kind: 'street', count: 5 }],
    reward: STREET_REWARD,
  },
  {
    id: 'c4-street-15',
    chapter: 'c4',
    title: 'Trò chuyện với 15 người đi đường',
    objectives: [{ kind: 'street', count: 15 }],
    reward: STREET_REWARD,
  },
  {
    id: 'c4-street-30',
    chapter: 'c4',
    title: 'Trò chuyện với 30 người đi đường',
    objectives: [{ kind: 'street', count: 30 }],
    reward: STREET_REWARD,
  },
  // Chương 5
  {
    id: 'c5-five-stars',
    chapter: 'c5',
    title: 'Dẫn đủ 5 show với trung bình 3★',
    objectives: GIG_ORDER.map((id) => showObjective(id, 3)),
    reward: STAR_REWARD,
  },
];
