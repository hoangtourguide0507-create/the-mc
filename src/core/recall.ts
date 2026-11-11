// Giảm dần hỗ trợ theo số lần đã gặp một tình huống ("fading"), và chấm câu tự nói khi không có thẻ.
//
// Lần đầu gặp: như kịch bản (đọc thẻ, bắt từ, chọn đáp án).
// Lần hai:     thẻ tiếng Anh bị ẩn, chỉ còn gợi ý tiếng Việt; câu hỏi chọn đáp án thành phản xạ nói.
// Từ lần ba:   không còn gợi ý nào ngoài câu NPC (gợi ý tiếng Việt chỉ hiện khi người học bấm xin).
// Lượt điền ô và ứng biến vốn đã là tự nói nên giữ nguyên.
import type { EvalResult, TurnData } from '../types/game';
import { normalizeText, wordSim } from './evaluator';

export type SupportStage = 0 | 1 | 2;

export function supportStage(exposures: number | undefined): SupportStage {
  const n = Number.isFinite(exposures) ? Math.floor(exposures as number) : 0;
  if (n <= 0) return 0;
  return n === 1 ? 1 : 2;
}

export type TurnPlan =
  /** Chơi đúng như kịch bản. */
  | { kind: 'authored' }
  /** Tự nói lại câu trả lời; hint: có hiện sẵn gợi ý tiếng Việt không. */
  | { kind: 'recall'; target: string; hint: boolean }
  /** Phản xạ nói có giới hạn thời gian (thay cho chọn đáp án). */
  | { kind: 'react'; target: string; seconds: number };

/** Thời gian (giây) để bắt đầu nói ở lượt phản xạ khi kịch bản không ghi rõ. */
export const REACT_SECONDS = 8;

export function planTurn(turn: TurnData, stage: SupportStage, forceRecall = false): TurnPlan {
  if (turn.mode === 'scripted' || turn.mode === 'catch') {
    if (stage === 0 && !forceRecall) return { kind: 'authored' };
    if (!turn.cue) return { kind: 'authored' };
    return { kind: 'recall', target: turn.cue, hint: stage <= 1 };
  }
  if (turn.mode === 'quiz' && stage >= 1) {
    const ok = (turn.options || []).find((o) => o.ok);
    if (!ok) return { kind: 'authored' };
    return { kind: 'react', target: ok.t, seconds: turn.reflex && turn.reflex > 0 ? Math.min(turn.reflex, 10) : REACT_SECONDS };
  }
  return { kind: 'authored' };
}

// Từ chức năng: không mang ý, người học đổi cách diễn đạt là chúng đổi theo.
const FUNCTION_WORDS = new Set(
  ('a an the to of and or but so in on at by for with from as into about than then that this these those it its is are am ' +
    'was were be been being do does did have has had will would can could should shall may might must i you he she we they ' +
    'me my your his her our their us them him not no yes please just very really here there now well oh ok okay').split(' ')
);

export function contentWords(text: string): string[] {
  const all = normalizeText(text);
  const content = all.filter((w) => !FUNCTION_WORDS.has(w) && w.length > 1);
  return [...new Set(content.length > 0 ? content : all)];
}

/**
 * Chấm câu tự nói so với câu mẫu khi người học không nhìn thấy câu mẫu.
 * Không đòi đúng từng chữ: tính tỉ lệ các từ mang ý của câu mẫu xuất hiện trong câu nói
 * (cho phép lệch phát âm nhẹ). Câu quá ngắn so với câu mẫu bị trừ bớt.
 */
export function evaluateRecall(target: string, transcript: string): EvalResult {
  const need = contentWords(target);
  const spoken = normalizeText(transcript);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const w of need) {
    const hit = spoken.some((s) => {
      const r = wordSim(w, s);
      return r.sim >= 0.8 || r.phonetic;
    });
    (hit ? matched : missing).push(w);
  }
  const coverage = need.length > 0 ? matched.length / need.length : 0;
  const targetLen = normalizeText(target).length;
  const enough = spoken.length >= Math.max(2, Math.floor(targetLen * 0.5));
  const score = spoken.length === 0 ? 0 : Math.round(coverage * 100 * (enough ? 1 : 0.8));
  const stars: 0 | 1 | 2 | 3 = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  return { score, stars, transcript, tokens: [], matchedKeywords: matched, missingKeywords: missing };
}

/** Chấm nhiều phương án máy nghe được, lấy phương án điểm cao nhất. */
export function evaluateRecallCandidates(target: string, candidates: string[]): EvalResult {
  let best = evaluateRecall(target, '');
  for (const c of candidates) {
    const r = evaluateRecall(target, c || '');
    if (r.score > best.score) best = r;
  }
  return best;
}
