/**
 * Nói dài và dịch nối tiếp: chấm theo Ý, không theo từng chữ.
 * - Nói dài: người học tự nói 60-90 giây theo một dàn ý (mở màn, giới thiệu diễn giả, bế mạc…).
 *   Máy dò từng ý bằng nhóm từ khoá, đếm số từ và tốc độ nói.
 * - Dịch nối tiếp: người học nghe/đọc một câu tiếng Việt của người phát biểu rồi nói lại bằng tiếng Anh.
 * Hàm ở đây đều thuần (không DOM, không âm thanh). Test: npm run test:longturn
 */
import { containsTokenSequence, normalizeText } from './evaluator';
import { capForGrammar, findGrammarIssues, grammarErrors, type GrammarIssue } from './grammar';

export interface Idea {
  /** Ý cần có, tiếng Việt (hiện trong dàn ý và bảng kết quả) */
  label: string;
  /** Các nhóm từ khoá: mỗi nhóm phải có ít nhất một biến thể xuất hiện */
  need: string[][];
  /** Câu mẫu cho riêng ý này; ghép các câu mẫu lại thành bài mẫu */
  say: string;
  /** Cụm then chốt gợi ý khi người học bí từ */
  key: string;
}

export interface LongTask {
  id: string;
  kind: string;
  cefr: 'B1' | 'B2' | 'C1';
  title: string;
  /** Chức năng lời nói chính (src/data/functions.ts) */
  fn?: string;
  /** Tình huống và việc phải làm, tiếng Việt */
  brief: string;
  ideas: Idea[];
  tip: string;
}

export interface InterpSegment {
  /** Câu nguồn: lời người phát biểu bằng tiếng Việt (dịch nối tiếp) hoặc câu tiếng Anh cần đổi văn phong */
  vi: string;
  ideas: { label: string; need: string[][] }[];
  /** Đổi văn phong: các từ sai tông phải tránh (ví dụ "guys" khi cần trang trọng) */
  avoid?: string[];
  /** Bản dịch mẫu */
  say: string;
}

export interface InterpSet {
  id: string;
  kind: string;
  cefr: 'B1' | 'B2' | 'C1';
  title: string;
  fn?: string;
  /** Ai đang nói, trong hoàn cảnh nào (tiếng Việt) */
  brief: string;
  segments: InterpSegment[];
}

/** Thời lượng mục tiêu của một lượt nói dài, giây. */
export const LONG_MIN_SEC = 60;
export const LONG_MAX_SEC = 90;
/** Số từ tối thiểu để lượt nói được coi là đủ dài (bài mẫu dài chừng 130-170 từ). */
export const LONG_FULL_WORDS = 90;
export const LONG_OK_WORDS = 55;
export const LONG_SOME_WORDS = 25;
/** Tốc độ nói dễ nghe của MC trên sân khấu, từ mỗi phút. */
export const PACE_SLOW = 100;
export const PACE_FAST = 165;

/** Từ nối và lời dẫn giúp bài nói mạch lạc. */
export const MARKERS = [
  'ladies and gentlemen',
  'first of all',
  'first',
  'before we begin',
  'before we start',
  'now',
  'next',
  'then',
  'after that',
  'in a moment',
  'in just a moment',
  'shortly',
  'finally',
  'once again',
  'on behalf of',
  'please',
  'without further ado',
  'at this time',
  'tonight',
  'today',
];

const FILLERS = ['um', 'uh', 'er', 'erm', 'hmm', 'you know', 'i mean'];

function hits(tokens: string[], need: string[][]): boolean {
  return need.every((group) => group.some((v) => containsTokenSequence(tokens, normalizeText(v))));
}

/** Ý nào có mặt trong câu nói. */
export function coverIdeas(ideas: { need: string[][] }[], transcript: string): boolean[] {
  const tokens = normalizeText(transcript);
  return ideas.map((i) => hits(tokens, i.need));
}

/** Trong các phương án máy nghe được, lấy phương án trúng nhiều ý nhất (bằng nhau thì lấy câu dài hơn). */
export function bestCandidate(ideas: { need: string[][] }[], candidates: string[]): { transcript: string; covered: boolean[] } {
  let best = { transcript: candidates[0] ?? '', covered: ideas.map(() => false) };
  let bestN = -1;
  let bestLen = -1;
  for (const c of candidates) {
    if (!c) continue;
    const covered = coverIdeas(ideas, c);
    const n = covered.filter(Boolean).length;
    const len = normalizeText(c).length;
    if (n > bestN || (n === bestN && len > bestLen)) {
      best = { transcript: c, covered };
      bestN = n;
      bestLen = len;
    }
  }
  return best;
}

export type Pace = 'slow' | 'ok' | 'fast';

export interface LongScore {
  transcript: string;
  covered: boolean[];
  hit: number;
  words: number;
  /** Từ mỗi phút; null khi không đo được thời gian (gõ thay mic) hoặc nói quá ngắn. */
  wpm: number | null;
  pace: Pace | null;
  /** Thời lượng so với mục tiêu 60-90 giây. */
  timing: 'short' | 'ok' | 'long' | null;
  markers: string[];
  fillers: number;
  /** Lỗi ngữ pháp trong bài nói: có lỗi thì tối đa 2 sao */
  grammar: GrammarIssue[];
  stars: 0 | 1 | 2 | 3;
}

export function paceOf(wpm: number): Pace {
  return wpm < PACE_SLOW ? 'slow' : wpm > PACE_FAST ? 'fast' : 'ok';
}

/**
 * Chấm một lượt nói dài. `seconds` là thời gian nói thật; 0 hoặc thiếu nghĩa là không đo được.
 * 3 sao: đủ mọi ý và đủ dài. 2 sao: từ hai phần ba số ý. 1 sao: từ một phần ba số ý.
 */
export function scoreLong(task: LongTask, candidates: string[], seconds = 0): LongScore {
  const { transcript, covered } = bestCandidate(task.ideas, candidates);
  const tokens = normalizeText(transcript);
  const words = tokens.length;
  const hit = covered.filter(Boolean).length;
  const frac = task.ideas.length > 0 ? hit / task.ideas.length : 0;
  const measurable = seconds >= 8 && words >= 10;
  const wpm = measurable ? Math.round(words / (seconds / 60)) : null;
  const markers = MARKERS.filter((m) => containsTokenSequence(tokens, normalizeText(m)));
  const fillers = FILLERS.reduce((n, f) => {
    const seq = normalizeText(f);
    let count = 0;
    for (let i = 0; i + seq.length <= tokens.length; i++) if (seq.every((w, k) => tokens[i + k] === w)) count += 1;
    return n + count;
  }, 0);
  let stars: 0 | 1 | 2 | 3 = 0;
  if (frac >= 1 && words >= LONG_FULL_WORDS) stars = 3;
  else if (frac >= 0.66 && words >= LONG_OK_WORDS) stars = 2;
  else if (frac >= 0.33 && words >= LONG_SOME_WORDS) stars = 1;
  const grammar = findGrammarIssues(transcript);
  stars = capForGrammar(stars, grammar);
  return {
    transcript,
    covered,
    hit,
    words,
    wpm,
    pace: wpm === null ? null : paceOf(wpm),
    timing: seconds >= 8 ? (seconds < LONG_MIN_SEC ? 'short' : seconds > LONG_MAX_SEC + 15 ? 'long' : 'ok') : null,
    markers,
    fillers,
    grammar,
    stars,
  };
}

/** Bài mẫu đầy đủ của một lượt nói dài. */
export function modelOf(task: LongTask): string {
  return task.ideas.map((i) => i.say).join(' ');
}

/** Lời khuyên ngắn cho lần nói sau, theo thứ tự ưu tiên: thiếu ý, quá ngắn, tốc độ, mạch lạc. */
export function longAdvice(task: LongTask, s: LongScore): string[] {
  const out: string[] = [];
  const missing = task.ideas.filter((_, i) => !s.covered[i]);
  if (missing.length > 0) out.push(`Còn thiếu ${missing.length} ý: ${missing.map((m) => m.label).join('; ')}.`);
  const errs = grammarErrors(s.grammar);
  if (errs.length > 0) out.push(`Sửa ${errs.length} lỗi ngữ pháp bên dưới; còn lỗi thì bài tối đa 2 sao.`);
  if (s.words < LONG_FULL_WORDS) out.push(`Bài mới có ${s.words} từ. Mỗi ý nên nói hai câu, cả bài từ ${LONG_FULL_WORDS} từ trở lên.`);
  if (s.pace === 'fast') out.push(`Bạn nói ${s.wpm} từ mỗi phút, hơi nhanh cho sân khấu. Ngắt một nhịp sau mỗi ý.`);
  if (s.pace === 'slow') out.push(`Bạn nói ${s.wpm} từ mỗi phút, hơi chậm. Chuẩn bị sẵn cụm mở đầu của từng ý để bớt ngập ngừng.`);
  if (s.timing === 'short' && s.words >= LONG_FULL_WORDS) out.push('Bài chưa tới 60 giây. Thêm một câu chuyển ý giữa các phần.');
  if (s.markers.length < 3) out.push('Dùng thêm lời dẫn để khán giả theo kịp: “First of all…”, “In a moment…”, “Finally…”.');
  if (s.fillers >= 3) out.push(`Có ${s.fillers} tiếng đệm (um, uh, you know). Thay bằng một quãng lặng ngắn.`);
  return out.slice(0, 3);
}

export interface InterpScore {
  transcript: string;
  covered: boolean[];
  hit: number;
  grammar: GrammarIssue[];
  /** Từ sai tông còn sót trong câu nói (chỉ có ở bài đổi văn phong) */
  offTone: string[];
  stars: 0 | 1 | 2 | 3;
}

/** Chấm một câu dịch. Xem lại câu gốc sau khi đã ẩn thì tối đa 2 sao. */
export function scoreInterp(seg: InterpSegment, candidates: string[], peeked = false): InterpScore {
  const { transcript, covered } = bestCandidate(seg.ideas, candidates);
  const hit = covered.filter(Boolean).length;
  const frac = seg.ideas.length > 0 ? hit / seg.ideas.length : 0;
  let stars: 0 | 1 | 2 | 3 = frac >= 1 ? 3 : frac >= 0.6 ? 2 : frac >= 0.3 ? 1 : 0;
  if (peeked && stars > 2) stars = 2;
  const tokens = normalizeText(transcript);
  if (tokens.length < 3) stars = 0;
  // Đổi văn phong: đủ ý nhưng còn từ sai tông thì tối đa 1 sao
  const offTone = (seg.avoid ?? []).filter((w) => containsTokenSequence(tokens, normalizeText(w)));
  if (offTone.length > 0 && stars > 1) stars = 1;
  // Đủ ý nhưng sai ngữ pháp rõ ràng thì tối đa 2 sao
  const grammar = findGrammarIssues(transcript);
  stars = capForGrammar(stars, grammar);
  return { transcript, covered, hit, grammar, offTone, stars };
}

/** Thời gian hiện câu tiếng Việt trước khi ẩn, theo độ dài câu (giây). */
export function showSeconds(vi: string): number {
  const words = vi.trim().split(/\s+/).length;
  return Math.max(5, Math.min(14, Math.round(words * 0.45)));
}

/** Sao của cả bộ dịch: trung bình sao các câu, làm tròn xuống nửa trên. */
export function setStars(stars: number[]): 0 | 1 | 2 | 3 {
  if (stars.length === 0) return 0;
  const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
  return (avg >= 2.6 ? 3 : avg >= 1.8 ? 2 : avg >= 0.9 ? 1 : 0) as 0 | 1 | 2 | 3;
}

export interface SpeakProgress {
  long: Record<string, { stars: number; tries: number; wpm?: number; blind?: boolean }>;
  interp: Record<string, { stars: number; tries: number }>;
  /** Bài đổi văn phong (src/data/register.ts) */
  register?: Record<string, { stars: number; tries: number }>;
}

export const EMPTY_SPEAK: SpeakProgress = { long: {}, interp: {} };
