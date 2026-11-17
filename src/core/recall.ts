// Giảm dần hỗ trợ theo số lần đã gặp một tình huống ("fading"), và chấm câu tự nói khi không có thẻ.
//
// Lần đầu gặp: như kịch bản (đọc thẻ, bắt từ, chọn đáp án).
// Lần hai:     thẻ tiếng Anh bị ẩn, chỉ còn gợi ý tiếng Việt; câu hỏi chọn đáp án thành phản xạ nói.
// Từ lần ba:   không còn gợi ý nào ngoài câu NPC (gợi ý tiếng Việt chỉ hiện khi người học bấm xin).
// Lượt điền ô và ứng biến vốn đã là tự nói nên giữ nguyên.
import type { EvalResult, TurnData } from '../types/game';
import { normalizeText, wordSim } from './evaluator';
import { capForGrammar, findGrammarIssues, type GrammarIssue } from './grammar';

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
  let score = spoken.length === 0 ? 0 : Math.round(coverage * 100 * (enough ? 1 : 0.8));
  let stars: 0 | 1 | 2 | 3 = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  // Đã nói gần đủ ý thì xét thêm ngữ pháp: so cấu trúc với câu mẫu và các mẫu lỗi thường gặp.
  // Có lỗi thì tối đa 2 sao; điểm cũng hạ dưới mức 3 sao để phương án máy nghe sạch lỗi được ưu tiên.
  const structure = coverage >= 0.6 ? structureIssues(target, transcript) : [];
  const all = coverage >= 0.6 ? mergeIssues(findGrammarIssues(transcript), structure) : [];
  // Câu vỡ cấu trúc (sai thứ tự từ, hoặc từ 3 chỗ sai trở lên) thì tối đa 1 sao, còn lại tối đa 2 sao
  const severe = structure.some((i) => i.why?.startsWith('Sai thứ tự')) || all.filter((i) => i.kind !== 'style').length >= 3;
  const capped = severe ? (Math.min(stars, 1) as 0 | 1) : capForGrammar(stars, all);
  if (capped < stars) {
    stars = capped;
    score = Math.min(score, capped === 1 ? 59 : 79);
  }
  return { score, stars, transcript, tokens: [], matchedKeywords: matched, missingKeywords: missing, grammarIssues: all.slice(0, 3) };
}

/* ---------- So cấu trúc với câu mẫu ---------- */

/** Từ nhỏ mang ngữ pháp: thiếu hoặc sai dạng là sai câu, phải khớp đúng chữ. */
const CORE = new Set(
  'is are am was were be been being have has had do does did will would can could should must may might to a an the not'.split(' ')
);
const ARTICLES = new Set(['a', 'an', 'the']);

function same(t: string, s: string): boolean {
  if (CORE.has(t) || CORE.has(s)) return t === s;
  const r = wordSim(t, s);
  return r.sim >= 0.8 || r.phonetic;
}

/** Cặp chỉ số khớp nhau theo thứ tự (dãy con chung dài nhất). */
function lcsPairs(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = same(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(a[i], b[j])) {
      out.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/**
 * So câu nói với câu mẫu ở những từ nhỏ mang ngữ pháp (is, are, to, will, the…) và thứ tự từ.
 * Không bắt lỗi khi người học dùng từ khác cho phần nội dung: lượt tự nói cho phép diễn đạt khác.
 * Máy nghe hay làm rơi mạo từ khi nói nhanh, nên bỏ qua một mạo từ thiếu.
 */
export function structureIssues(target: string, transcript: string): GrammarIssue[] {
  const t = normalizeText(target);
  const s = normalizeText(transcript);
  if (t.length === 0 || s.length === 0) return [];
  const pairs = lcsPairs(t, s);
  const out: GrammarIssue[] = [];
  let articleGrace = 1;
  // Duyệt từng khoảng trống giữa hai cặp khớp liên tiếp
  const anchors: [number, number][] = [[-1, -1], ...pairs, [t.length, s.length]];
  for (let k = 0; k + 1 < anchors.length; k++) {
    const [ti, si] = anchors[k];
    const [tj, sj] = anchors[k + 1];
    const tGap = t.slice(ti + 1, tj);
    const sGap = s.slice(si + 1, sj);
    const coreMissing = tGap.filter((w) => CORE.has(w));
    if (coreMissing.length === 0) continue;
    // Khoảng trống chỉ thiếu mạo từ: tha một lần
    if (coreMissing.every((w) => ARTICLES.has(w)) && sGap.every((w) => ARTICLES.has(w)) && articleGrace > 0) {
      articleGrace -= 1;
      continue;
    }
    const tFrom = Math.max(0, ti);
    const sFrom = Math.max(0, si);
    const fix = t.slice(tFrom, Math.min(t.length, tj + 1)).join(' ');
    const wrong = s.slice(sFrom, Math.min(s.length, sj + 1)).join(' ');
    if (!wrong || wrong === fix) continue;
    const word = coreMissing.join(', ');
    out.push({
      wrong,
      fix,
      kind: 'grammar',
      why: sGap.length === 0 ? `Thiếu "${word}" so với câu mẫu.` : `Dùng sai "${sGap.join(' ')}"; câu mẫu dùng "${word}".`,
    });
  }
  // Thứ tự từ: từ mang ý có mặt trong câu nói nhưng không nằm đúng thứ tự
  const inOrder = new Set(pairs.map(([i]) => i));
  const misplaced = t.filter((w, i) => !CORE.has(w) && w.length > 1 && !inOrder.has(i) && s.some((x) => same(w, x)));
  if (misplaced.length >= 2) {
    out.unshift({ wrong: s.join(' '), fix: t.join(' '), kind: 'grammar', why: `Sai thứ tự từ (${misplaced.slice(0, 3).join(', ')}) so với câu mẫu.` });
  }
  return out;
}

/** Gộp hai danh sách lỗi, bỏ lỗi trùng chỗ (một bên chứa đoạn sai của bên kia). */
export function mergeIssues(a: GrammarIssue[], b: GrammarIssue[]): GrammarIssue[] {
  const out = [...a];
  for (const x of b) {
    const xw = x.wrong.toLowerCase();
    if (out.some((y) => { const yw = y.wrong.toLowerCase(); return xw.includes(yw) || yw.includes(xw); })) continue;
    out.push(x);
  }
  return out;
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
