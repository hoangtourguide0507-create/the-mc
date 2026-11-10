import type { QuizOption, TurnData } from '../../types/game';

/**
 * Bộ tình huống (scenario): một kịch bản trọn vẹn cho một cảnh, khác hẳn kịch bản gốc về
 * tình huống giao tiếp chứ không chỉ đổi chữ. Mỗi ngày trong game một cảnh dùng một bộ,
 * xoay vòng theo thứ tự (xem scenarioForDay trong content.ts).
 *
 * Quy ước bắt buộc (tests/scenarios.test.mjs kiểm tra):
 * - Số lượt phải bằng số lượt của kịch bản gốc, vì nhiệm vụ và sổ tay đánh số theo vị trí lượt.
 * - Lượt bắt từ: mọi từ trong {ngoặc} phải có trong câu NPC (người chơi nghe rồi bắt từ).
 * - Lượt ứng biến: câu mẫu phải chứa ít nhất một từ của mỗi nhóm bắt buộc.
 */
export interface Scenario {
  id: string;
  /** Tên tình huống bằng tiếng Việt, hiện trên thanh tiêu đề màn show. */
  title: string;
  turns: TurnData[];
}

type Opt = Partial<Pick<TurnData, 'who' | 'speaker' | 'channel' | 'reflex'>>;
type Pair = readonly [en: string, vi: string];

/** Đọc theo thẻ nhắc. */
export const say = (npc: Pair, cue: Pair, tip: string, o: Opt = {}): TurnData => ({
  mode: 'scripted',
  npc: npc[0],
  npcVi: npc[1],
  cue: cue[0],
  cueVi: cue[1],
  tip,
  ...o,
});

/** Bắt từ rồi nói: cue chứa {từ} cần bắt (phải có trong câu NPC), kèm các từ gây nhiễu. */
export const grab = (npc: Pair, cue: Pair, distractors: string[], tip: string, o: Opt = {}): TurnData => ({
  mode: 'catch',
  npc: npc[0],
  npcVi: npc[1],
  cue: cue[0],
  cueVi: cue[1],
  catch: distractors,
  tip,
  ...o,
});

/** Điền ô rồi nói: frame có ___, mỗi ô một nhóm lựa chọn. Câu mẫu dùng lựa chọn đầu của mỗi ô. */
export const fill = (npc: Pair, frame: Pair, pools: string[][], tip: string, o: Opt = {}): TurnData => {
  let sample = frame[0];
  pools.forEach((p) => {
    sample = sample.replace('___', p[0]);
  });
  return {
    mode: 'semi',
    npc: npc[0],
    npcVi: npc[1],
    frame: frame[0],
    cueVi: frame[1],
    blanks: pools.length,
    blankPool: pools,
    sample,
    tip,
    ...o,
  };
};

/** Phản xạ nghe hiểu: một câu đáp đúng, hai câu sai. Vị trí câu đúng cố định theo nội dung câu hỏi. */
export const pick = (
  npc: Pair,
  question: string,
  ok: Pair,
  wrong: readonly [string, string],
  tip: string,
  o: Opt = {},
): TurnData => {
  let h = 0;
  for (let i = 0; i < npc[0].length; i++) h = (h * 31 + npc[0].charCodeAt(i)) >>> 0;
  const options: QuizOption[] = [{ t: wrong[0], ok: false }, { t: wrong[1], ok: false }];
  options.splice(h % 3, 0, { t: ok[0], ok: true });
  return {
    mode: 'quiz',
    npc: npc[0],
    npcVi: npc[1],
    question,
    options,
    cueVi: ok[1],
    tip,
    ...o,
  };
};

/** Ứng biến tự do: nhiệm vụ, nhóm từ khóa bắt buộc, nhóm từ khóa thưởng và một câu mẫu. */
export const improv = (
  npc: Pair,
  task: Pair,
  required: string[][],
  bonus: string[][],
  sample: string,
  tip: string,
  o: Opt = {},
): TurnData => ({
  mode: 'free',
  npc: npc[0],
  npcVi: npc[1],
  task: task[0],
  taskVi: task[1],
  requiredKeywords: required,
  bonusKeywords: bonus,
  sample,
  minWords: Math.max(8, Math.min(12, Math.floor(sample.split(/\s+/).length * 0.6))),
  tip,
  ...o,
});
