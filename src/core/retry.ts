// Chấm cộng dồn giữa các lần đọc và luyện riêng cụm từ còn sai.
//
// Bộ nhận dạng giọng nói của trình duyệt không ổn định: cùng một cách đọc, lần này nó nghe đúng
// từ A sai từ B, lần sau ngược lại. Nếu mỗi lần đọc bị chấm lại từ đầu, người học phải đọc đi
// đọc lại cả câu chỉ để "trúng" máy. Ở đây từ nào đã đọc đúng một lần thì được giữ là đúng,
// và người học chỉ cần luyện lại cụm còn sai.
import type { EvalResult, EvaluatedToken, TokenStatus } from '../types/game';
import { scoreToStars } from './evaluator';

const RANK: Record<TokenStatus, number> = { bad: 0, near: 1, ok: 2 };

/** Điểm của một kết quả đã gộp: trung bình độ khớp của các từ (từ đã "ok" tính tròn 1). */
function scoreOf(tokens: EvaluatedToken[]): number {
  if (tokens.length === 0) return 0;
  const sum = tokens.reduce((acc, t) => acc + (t.status === 'ok' ? 1 : t.sim), 0);
  return Math.max(0, Math.min(100, Math.round((sum / tokens.length) * 100)));
}

function better(a: EvaluatedToken, b: EvaluatedToken): EvaluatedToken {
  if (RANK[b.status] !== RANK[a.status]) return RANK[b.status] > RANK[a.status] ? b : a;
  return b.sim > a.sim ? b : a;
}

function rebuild(tokens: EvaluatedToken[], base: EvalResult, floor: EvalResult): EvalResult {
  // Không bao giờ thấp hơn kết quả tốt nhất đã có (điểm gốc còn trừ từ thừa, điểm gộp thì không).
  const score = Math.max(scoreOf(tokens), floor.score);
  const stars = Math.max(scoreToStars(score), floor.stars) as 0 | 1 | 2 | 3;
  return { ...base, tokens, score, stars };
}

/**
 * Gộp lần đọc mới vào kết quả cộng dồn của cùng một câu mẫu: mỗi từ giữ kết quả tốt nhất.
 * Hai kết quả phải cùng câu mẫu (cùng số từ); nếu không thì trả về kết quả điểm cao hơn.
 */
export function mergeAttempts(prev: EvalResult | null, next: EvalResult): EvalResult {
  if (!prev) return next;
  if (prev.tokens.length === 0 || prev.tokens.length !== next.tokens.length) {
    return next.score >= prev.score ? next : { ...prev, transcript: next.transcript };
  }
  const tokens = prev.tokens.map((p, i) => better(p, next.tokens[i]));
  const floor = next.score >= prev.score ? next : prev;
  return rebuild(tokens, next, floor);
}

export interface FocusChunk {
  /** Vị trí từ đầu và từ cuối của cụm trong câu (tính cả hai đầu). */
  start: number;
  end: number;
  /** Cụm cần đọc, đã bỏ dấu câu ở hai đầu. */
  text: string;
  /** Các từ còn sai trong cụm. */
  weak: string[];
}

const stripEdges = (s: string) => s.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');

/**
 * Chọn cụm ngắn đầu tiên còn chứa từ chưa đúng: gom các từ sai nằm gần nhau, thêm một từ đệm
 * mỗi bên để người học đọc trong ngữ cảnh, tối thiểu 3 từ, tối đa `maxWords` từ.
 * Trả về null khi mọi từ đã đúng.
 */
export function focusChunk(tokens: EvaluatedToken[], maxWords = 6): FocusChunk | null {
  const first = tokens.findIndex((t) => t.status !== 'ok');
  if (first < 0) return null;
  let last = first;
  for (let i = first + 1; i < tokens.length && i - first < maxWords - 2; i++) {
    if (tokens[i].status !== 'ok' && i - last <= 2) last = i;
  }
  let start = Math.max(0, first - 1);
  let end = Math.min(tokens.length - 1, last + 1);
  // Câu ngắn hoặc từ sai ở đầu/cuối câu: nới thêm cho đủ 3 từ
  while (end - start + 1 < 3 && (start > 0 || end < tokens.length - 1)) {
    if (end < tokens.length - 1) end++;
    else start--;
  }
  const words = tokens.slice(start, end + 1);
  return {
    start,
    end,
    text: stripEdges(words.map((t) => t.word).join(' ')),
    weak: words.filter((t) => t.status !== 'ok').map((t) => stripEdges(t.word)),
  };
}

/**
 * Ghi kết quả đọc riêng một cụm vào kết quả cộng dồn của cả câu.
 * `chunkEval` là kết quả chấm cụm `chunk.text` (evaluateScripted), có đúng số từ của cụm.
 */
export function applyChunkAttempt(full: EvalResult, chunk: FocusChunk, chunkEval: EvalResult): EvalResult {
  const size = chunk.end - chunk.start + 1;
  if (chunkEval.tokens.length !== size) return full;
  const tokens = full.tokens.map((t, i) => {
    if (i < chunk.start || i > chunk.end) return t;
    const c = chunkEval.tokens[i - chunk.start];
    // Giữ nguyên chữ hiển thị của câu gốc (có dấu câu), chỉ lấy kết quả chấm
    return better(t, { ...t, sim: c.sim, status: c.status, phonetic: c.phonetic });
  });
  return rebuild(tokens, full, full);
}
