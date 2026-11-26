// Từ khó trong lượt đọc theo thẻ: đếm số lần một từ bị chấm sai, nhận ra khi bộ nhận giọng nghe
// thành dạng gốc của từ (switched → switch, guests → guest), mở bài "luyện riêng từ này" và
// không bắt người học đọc lại cả câu mãi.
//
// Vì sao cần: bộ nhận giọng của trình duyệt đoán từ theo ngữ cảnh chứ không nghe từng âm. Với đuôi
// -ed, -s và cụm phụ âm cuối (switched /tʃt/), thiếu một âm nhỏ là nó trả về dạng gốc, nên người
// học đọc bao nhiêu lần cũng không biết mình sai ở đâu. Mô hình nghe từng âm thì chỉ ra được.
import type { EvalResult, EvaluatedToken } from '../types/game';
import { normalizeText } from './evaluator';
import type { AlignOp, PhoneScore } from './phonology';
import { withTokens } from './retry';

/** Sai từ lần thứ 2 thì mời luyện riêng bằng chấm từng âm. */
export const DRILL_AFTER = 2;
/** Sai từ lần thứ 3 mà máy luôn nghe ra dạng gốc thì tạm tính gần đúng. */
export const FORGIVE_AFTER = 3;
/** Ngưỡng đạt khi luyện riêng một từ trong bài */
export const WORD_DRILL_PASS = 0.75;

const clean = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');

/** Dạng gốc có thể có của một từ có đuôi -ed, -d, -s, -es. Rỗng nếu từ không có đuôi như vậy. */
export function inflectionBases(word: string): string[] {
  const w = clean(word);
  const out = new Set<string>();
  if (w.length < 4) return [];
  if (w.endsWith('ied')) out.add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) {
    out.add(w.slice(0, -2)); // switched → switch, started → start
    out.add(w.slice(0, -1)); // arrived → arrive
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4]) out.add(w.slice(0, -3)); // planned → plan
  }
  if (w.endsWith('ies')) out.add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) out.add(w.slice(0, -2)); // watches → watch
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) out.add(w.slice(0, -1)); // guests → guest
  out.delete(w);
  return [...out].filter((x) => x.length >= 2);
}

/** Máy nghe ra dạng gốc của từ (mà không nghe ra chính từ đó) trong câu nói. */
export function droppedEnding(word: string, transcript: string): boolean {
  const bases = inflectionBases(word);
  if (bases.length === 0) return false;
  const heard = normalizeText(transcript);
  if (heard.includes(clean(word))) return false;
  return heard.some((h) => bases.includes(h));
}

/** Theo dõi từng từ của câu mẫu trong một lượt. */
export interface WordTrack {
  misses: number[];
  /** Có ít nhất một lần máy nghe ra dạng gốc */
  dropped: boolean[];
}

export const newTrack = (n: number): WordTrack => ({ misses: new Array(n).fill(0), dropped: new Array(n).fill(false) });

/**
 * Ghi một lần đọc (cả câu hoặc một cụm bắt đầu ở `offset`). `tokens` là kết quả chấm của lần đọc
 * đó (chưa gộp), `transcript` là câu máy nghe được.
 */
export function trackAttempt(track: WordTrack, tokens: EvaluatedToken[], transcript: string, offset = 0): WordTrack {
  const misses = [...track.misses];
  const dropped = [...track.dropped];
  tokens.forEach((t, k) => {
    const i = offset + k;
    if (i >= misses.length || t.status === 'ok') return;
    misses[i] += 1;
    if (droppedEnding(t.word, transcript)) dropped[i] = true;
  });
  return { misses, dropped };
}

/** Vị trí các từ nên mời luyện riêng: còn sai và đã sai từ DRILL_AFTER lần. */
export function drillCandidates(result: EvalResult, track: WordTrack): number[] {
  return result.tokens.map((t, i) => (t.status !== 'ok' && (track.misses[i] ?? 0) >= DRILL_AFTER && clean(t.word).length >= 2 ? i : -1)).filter((i) => i >= 0);
}

/**
 * Tạm tính gần đúng những từ mà máy cứ nghe ra dạng gốc sau FORGIVE_AFTER lần: người học không phải
 * đọc lại cả câu mãi chỉ vì bộ nhận giọng. Từ đó được đánh dấu `forgiven` (hiện khác màu) và nên
 * được đưa vào Sổ tay để luyện riêng. Trả về kết quả mới và danh sách từ vừa được tạm tính.
 */
export function forgiveDroppedEndings(result: EvalResult, track: WordTrack): { result: EvalResult; forgiven: string[] } {
  const forgiven: string[] = [];
  const tokens = result.tokens.map((t, i) => {
    if (t.status === 'ok' || !track.dropped[i] || (track.misses[i] ?? 0) < FORGIVE_AFTER) return t;
    forgiven.push(clean(t.word));
    return { ...t, status: 'ok' as const, sim: Math.max(t.sim, 0.8), forgiven: true };
  });
  return forgiven.length ? { result: withTokens(result, tokens), forgiven } : { result, forgiven };
}

/** Luyện riêng đạt: tính từ ở vị trí `index` là đúng. */
export function markVerified(result: EvalResult, index: number): EvalResult {
  if (!result.tokens[index]) return result;
  const tokens = result.tokens.map((t, i) => (i === index ? { ...t, status: 'ok' as const, sim: 1, forgiven: false, verified: true } : t));
  return withTokens(result, tokens);
}

/** Đạt khi đủ độ khớp và không mất âm cuối (lỗi chính của người Việt). */
export function wordDrillPass(res: PhoneScore): boolean {
  if (res.score < WORD_DRILL_PASS) return false;
  const lastTarget = [...res.ops].reverse().find((o) => o.kind !== 'extra');
  return !lastTarget || (lastTarget.kind !== 'missing' && lastTarget.kind !== 'wrong');
}

/** Âm vị bị thiếu hoặc đọc sai, để nói cho người học biết sai ở đâu. */
export function phoneProblems(ops: AlignOp[]): string[] {
  const out: string[] = [];
  ops.forEach((o, i) => {
    const last = !ops.slice(i + 1).some((x) => x.kind !== 'extra');
    if (o.kind === 'missing') out.push(last ? `thiếu /${o.target}/ cuối từ` : `thiếu /${o.target}/`);
    else if (o.kind === 'wrong') out.push(`/${o.target}/ nghe thành /${o.heard}/`);
  });
  return out;
}

/* ---------- Luật đọc đuôi -ed và -s ---------- */

const VOICELESS = new Set(['p', 'k', 'f', 'θ', 's', 'ʃ', 'tʃ', 'h']);

export interface EndingRule {
  ending: '-ed' | '-s';
  /** Cách đọc đuôi: /t/, /d/, /ɪd/ hoặc /s/, /z/, /ɪz/ */
  sound: string;
  /** Giải thích ngắn bằng tiếng Việt */
  why: string;
}

/**
 * Luật đọc đuôi dựa vào âm cuối của từ gốc. `baseLastPhone` là âm vị cuối của từ gốc
 * (ví dụ 'tʃ' của switch). Trả về null nếu từ không có đuôi -ed/-s.
 */
export function endingRule(word: string, baseLastPhone: string): EndingRule | null {
  const w = clean(word);
  if (w.endsWith('ed') && inflectionBases(w).length) {
    if (baseLastPhone === 't' || baseLastPhone === 'd') return { ending: '-ed', sound: '/ɪd/', why: `Từ gốc tận cùng bằng /${baseLastPhone}/ nên -ed thêm một âm tiết /ɪd/.` };
    if (VOICELESS.has(baseLastPhone)) return { ending: '-ed', sound: '/t/', why: `Từ gốc tận cùng bằng âm vô thanh /${baseLastPhone}/ nên -ed chỉ là một âm /t/ rất ngắn, không có nguyên âm.` };
    return { ending: '-ed', sound: '/d/', why: `Từ gốc tận cùng bằng âm hữu thanh /${baseLastPhone}/ nên -ed đọc /d/, cổ họng rung nhẹ.` };
  }
  if (/s$/.test(w) && !/(ss|us|is)$/.test(w) && inflectionBases(w).length) {
    if (['s', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ'].includes(baseLastPhone)) return { ending: '-s', sound: '/ɪz/', why: `Sau /${baseLastPhone}/, đuôi -s/-es thêm âm tiết /ɪz/.` };
    if (VOICELESS.has(baseLastPhone) || baseLastPhone === 't') return { ending: '-s', sound: '/s/', why: `Sau âm vô thanh /${baseLastPhone}/, đuôi -s đọc /s/ (xì nhẹ, không rung cổ).` };
    return { ending: '-s', sound: '/z/', why: `Sau âm hữu thanh /${baseLastPhone}/, đuôi -s đọc /z/ (rung cổ nhẹ).` };
  }
  return null;
}
