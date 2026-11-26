// Sổ từ tự chọn: người học chạm một từ (hoặc kéo chọn một cụm) trong câu để ghi lại,
// gắn nhãn "từ mới" và/hoặc "cần luyện phát âm". Mỗi mục có lịch ôn kiểu hộp Leitner
// tính theo ngày thật (không theo ngày trong game, vì ngày trong game không còn tự trôi).
import { normalizeText, wordSim } from './evaluator';
import { SRS_INTERVALS, SRS_MAX_BOX } from './srs';
import { findGrammarIssues, grammarErrors, type GrammarIssue } from './grammar';
import type { WeakWord } from '../types/game';

export interface WordNote {
  /** Khoá chuẩn hoá: các từ viết thường, cách nhau một dấu cách. */
  key: string;
  /** Từ hoặc cụm như hiện trong câu gốc. */
  text: string;
  vocab: boolean;
  pron: boolean;
  /** Câu gốc nơi người học gặp từ. */
  ctx: string;
  ctxVi?: string;
  /** Nhân vật nói câu gốc, để phát lại đúng giọng. */
  npcId?: string;
  speaker?: 'emma' | 'liam';
  scene?: string;
  /** Ngày thật (số ngày từ mốc) lúc ghi. */
  day: number;
  at: number;
  /** Ghi chú riêng người học tự gõ. */
  memo?: string;
  /** Hỏi đáp với AI về từ này (mới nhất ở cuối, tối đa NOTE_QA_MAX). */
  qa?: { q: string; a: string; at: number }[];
  /** Mục do máy gợi ý (đọc sai nhiều lần) và người học đã đồng ý thêm. */
  auto?: boolean;
  box: number;
  due: number;
}

export type NoteBook = Record<string, WordNote>;

export interface NoteInput {
  text: string;
  vocab?: boolean;
  pron?: boolean;
  ctx?: string;
  ctxVi?: string;
  npcId?: string;
  speaker?: 'emma' | 'liam';
  scene?: string;
  auto?: boolean;
}

/** Số ngày thật kể từ mốc, theo giờ máy người học. */
export function realDay(now = Date.now(), tzOffsetMin = new Date(now).getTimezoneOffset()): number {
  return Math.floor((now - tzOffsetMin * 60000) / 86400000);
}

const EDGE = /^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g;

/** Bỏ dấu câu ở hai đầu một từ ("welcome," -> "welcome"). */
export function cleanWord(raw: string): string {
  return raw.replace(/[’‘]/g, "'").replace(EDGE, '').replace(/^'+|'+$/g, '');
}

export function noteKey(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => cleanWord(w).toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export interface PickToken {
  /** Chữ hiện ra, giữ nguyên dấu câu. */
  raw: string;
  /** Từ đã bỏ dấu câu; rỗng nếu mảnh này không có chữ (ví dụ dấu gạch). */
  word: string;
}

/** Tách câu thành các mảnh theo khoảng trắng; mỗi mảnh có chữ là một từ chạm được. */
export function splitWords(sentence: string): PickToken[] {
  return sentence
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, word: cleanWord(raw) }));
}

/** Cụm từ vị trí `from` đến `to` (gồm cả hai đầu), bỏ dấu câu ở hai đầu cụm. */
export function phraseOf(tokens: PickToken[], from: number, to: number): string {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(tokens.length - 1, Math.max(from, to));
  const parts = tokens.slice(a, b + 1).map((t) => t.raw);
  if (parts.length === 0) return '';
  parts[0] = parts[0].replace(/^[^A-Za-z0-9']+/, '');
  parts[parts.length - 1] = parts[parts.length - 1].replace(/[^A-Za-z0-9']+$/, '');
  return parts.join(' ').trim();
}

/** Thêm mục mới hoặc gộp nhãn vào mục đã có. Trả về sổ mới, không sửa đầu vào. */
export function upsertNote(book: NoteBook, input: NoteInput, day: number, now = Date.now()): NoteBook {
  const key = noteKey(input.text);
  if (!key) return book;
  const old = book[key];
  const next: WordNote = old
    ? {
        ...old,
        vocab: input.vocab ?? old.vocab,
        pron: input.pron ?? old.pron,
        ctx: old.ctx || input.ctx || '',
        ctxVi: old.ctxVi || input.ctxVi,
        npcId: old.npcId || input.npcId,
        speaker: old.speaker || input.speaker,
        scene: old.scene || input.scene,
      }
    : {
        key,
        text: input.text.trim(),
        vocab: input.vocab ?? false,
        pron: input.pron ?? false,
        ctx: input.ctx || '',
        ctxVi: input.ctxVi,
        npcId: input.npcId,
        speaker: input.speaker,
        scene: input.scene,
        day,
        at: now,
        auto: input.auto || undefined,
        box: 1,
        due: day,
      };
  // Bỏ cả hai nhãn nghĩa là bỏ mục
  if (!next.vocab && !next.pron) return removeNote(book, key);
  return { ...book, [key]: next };
}

export function removeNote(book: NoteBook, key: string): NoteBook {
  if (!(key in book)) return book;
  const out = { ...book };
  delete out[key];
  return out;
}

export const NOTE_QA_MAX = 6;

/** Lưu một lượt hỏi đáp vào mục đã có; bỏ lượt trùng câu hỏi, giữ tối đa NOTE_QA_MAX lượt. */
export function addQa(book: NoteBook, key: string, q: string, a: string, now = Date.now()): NoteBook {
  const n = book[key];
  if (!n || !q.trim() || !a.trim()) return book;
  const same = (x: string) => x.trim().toLowerCase();
  const qa = [...(n.qa ?? []).filter((t) => same(t.q) !== same(q)), { q: q.trim(), a: a.trim(), at: now }].slice(-NOTE_QA_MAX);
  return { ...book, [key]: { ...n, qa } };
}

export function setMemo(book: NoteBook, key: string, memo: string): NoteBook {
  const n = book[key];
  if (!n) return book;
  return { ...book, [key]: { ...n, memo: memo.trim() || undefined } };
}

/** Đúng thì lên hộp và giãn ngày ôn; sai thì về hộp 1, ôn lại ngày mai. */
export function scheduleNote(note: WordNote, correct: boolean, day: number): WordNote {
  if (!correct) return { ...note, box: 1, due: day + SRS_INTERVALS[1] };
  const box = Math.min(SRS_MAX_BOX, Math.max(1, note.box) + 1);
  return { ...note, box, due: day + SRS_INTERVALS[box] };
}

export function isNoteDue(note: WordNote, day: number): boolean {
  return note.due <= day;
}

/** Mục đến hạn lên trước, hộp thấp trước, rồi mục mới ghi. */
export function sortNotes(book: NoteBook, day: number): WordNote[] {
  return Object.values(book).sort((a, b) => {
    const da = isNoteDue(a, day) ? 0 : 1;
    const db = isNoteDue(b, day) ? 0 : 1;
    if (da !== db) return da - db;
    if (a.box !== b.box) return a.box - b.box;
    return b.at - a.at;
  });
}

export function dueNotes(book: NoteBook, day: number): WordNote[] {
  return sortNotes(book, day).filter((n) => isNoteDue(n, day));
}

/** Đánh dấu những từ trong câu đã nằm trong sổ (từ lẻ hoặc thuộc một cụm đã ghi). */
export function notedMask(tokens: PickToken[], book: NoteBook): boolean[] {
  const words = tokens.map((t) => t.word.toLowerCase());
  const mask = words.map((w) => Boolean(w) && w in book);
  for (const key of Object.keys(book)) {
    if (!key.includes(' ')) continue;
    const need = key.split(' ');
    // Chỉ so trên các mảnh có chữ, để dấu gạch đứng riêng không làm đứt cụm
    const idx = words.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
    for (let s = 0; s + need.length <= idx.length; s++) {
      if (need.every((w, k) => words[idx[s + k]] === w)) for (let k = 0; k < need.length; k++) mask[idx[s + k]] = true;
    }
  }
  return mask;
}

export interface NoteUse {
  ok: boolean;
  /** Câu nói có chứa từ hoặc cụm đã ghi. */
  hasNote: boolean;
  /** Câu đủ dài để là một câu trọn vẹn, không chỉ đọc lại từ. */
  fullSentence: boolean;
  grammar: GrammarIssue[];
}

/** Ôn "từ mới" bằng cách nói: người học tự đặt một câu có từ đó. */
export function evaluateNoteUse(noteText: string, transcript: string): NoteUse {
  const need = normalizeText(noteText);
  const spoken = normalizeText(transcript);
  let hasNote = false;
  for (let i = 0; need.length > 0 && i + need.length <= spoken.length && !hasNote; i++) {
    hasNote = need.every((w, k) => {
      const r = wordSim(w, spoken[i + k]);
      return r.sim >= 0.8 || r.phonetic;
    });
  }
  const fullSentence = spoken.length >= need.length + 3;
  const grammar = findGrammarIssues(transcript);
  return { ok: hasNote && fullSentence && grammarErrors(grammar).length === 0, hasNote, fullSentence, grammar };
}

/** Ôn "phát âm": máy nghe ra đúng từ (hoặc cụm) đã ghi trong một phương án bất kỳ. */
export function evaluateNoteSay(noteText: string, candidates: string[]): boolean {
  const need = normalizeText(noteText);
  if (need.length === 0) return false;
  return candidates.some((c) => {
    const spoken = normalizeText(c || '');
    for (let i = 0; i + need.length <= spoken.length; i++) {
      if (need.every((w, k) => wordSim(w, spoken[i + k]).sim >= 0.85)) return true;
    }
    return false;
  });
}

export const SUGGEST_MISSES = 2;

/** Từ đọc sai từ 2 lần trở lên mà chưa có trong sổ và chưa bị người học từ chối. */
export function suggestFromWeak(weak: WeakWord[], book: NoteBook, skipped: string[]): WeakWord[] {
  return weak.filter((w) => w.misses >= SUGGEST_MISSES && !(w.key in book) && !skipped.includes(w.key));
}

/* ---------- Bảng từ (IPA và nghĩa) ---------- */

/** word -> [ipa, nghĩa tiếng Việt]; nghĩa rỗng nếu chưa soạn. */
export type Glossary = Record<string, [ipa: string, vi: string]>;

export interface Gloss {
  ipa: string;
  vi: string;
  /** Có giá trị khi nghĩa lấy từ dạng gốc của từ (ví dụ "guests" -> "guest"). */
  lemma?: string;
}

/** Các dạng gốc có thể có của một từ đã biến đổi (số nhiều, quá khứ, -ing). */
export function lemmaCandidates(w: string): string[] {
  const c: string[] = [];
  if (w.endsWith("'s")) c.push(w.slice(0, -2));
  if (w.length < 4 || /(ss|us|is)$/.test(w)) return c;
  if (w.endsWith('ies')) c.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) c.push(w.slice(0, -2));
  if (w.endsWith('s')) c.push(w.slice(0, -1));
  if (w.endsWith('ied')) c.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) {
    c.push(w.slice(0, -2), w.slice(0, -1));
    if (w.length > 4 && w[w.length - 3] === w[w.length - 4]) c.push(w.slice(0, -3));
  }
  if (w.endsWith('ing')) {
    c.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (w.length > 5 && w[w.length - 4] === w[w.length - 5]) c.push(w.slice(0, -4));
  }
  if (w.endsWith('ly')) c.push(w.slice(0, -2));
  if (w.endsWith('er')) c.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('est')) c.push(w.slice(0, -3), w.slice(0, -2));
  return c;
}

/** Tra một từ hoặc cụm. Cụm: ghép IPA từng từ, không có nghĩa soạn sẵn. */
export function lookupGloss(glossary: Glossary, text: string): Gloss {
  const words = noteKey(text).split(' ').filter(Boolean);
  if (words.length === 0) return { ipa: '', vi: '' };
  if (words.length > 1) {
    const parts = words.map((w) => glossary[w]?.[0] ?? '');
    return { ipa: parts.every(Boolean) ? parts.join(' ') : '', vi: '' };
  }
  const w = words[0];
  const hit = glossary[w];
  if (hit && hit[1]) return { ipa: hit[0], vi: hit[1] };
  for (const l of lemmaCandidates(w)) {
    const base = glossary[l];
    if (base && base[1]) return { ipa: hit?.[0] ?? '', vi: base[1], lemma: l };
  }
  return { ipa: hit?.[0] ?? '', vi: '' };
}

/* ---------- Xuất danh sách ---------- */

const cell = (s: string) => (/[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV có dòng tiêu đề, mở được bằng Excel và nhập được vào Anki. */
export function exportNotes(book: NoteBook, glossary: Glossary | null): string {
  const rows = [['Từ', 'Phiên âm', 'Nghĩa', 'Nhãn', 'Câu gốc', 'Nghĩa câu gốc', 'Ghi chú']];
  for (const n of Object.values(book).sort((a, b) => a.at - b.at)) {
    const g = glossary ? lookupGloss(glossary, n.text) : { ipa: '', vi: '' };
    rows.push([
      n.text,
      g.ipa ? `/${g.ipa}/` : '',
      g.vi,
      [n.vocab ? 'từ mới' : '', n.pron ? 'phát âm' : ''].filter(Boolean).join(' + '),
      n.ctx,
      n.ctxVi ?? '',
      n.memo ?? '',
    ]);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

/* ---------- Chấm từng âm cho từ tự chọn ---------- */

/**
 * Đổi IPA của bảng từ sang cách viết của mô hình nhận âm vị (espeak, giọng Mỹ),
 * kèm một biến thể không uốn lưỡi /r/ để giọng Anh không bị tính sai.
 */
export function phoneTargetIpas(ipa: string): string[] {
  const us = ipa.replace(/ɜːr/g, 'ɜː').replace(/ər/g, 'ɚ').replace(/e(?!ɪ)/g, 'ɛ');
  const uk = ipa.replace(/ɜːr/g, 'ɜː').replace(/ər/g, 'ə').replace(/e(?!ɪ)/g, 'ɛ').replace(/oʊ/g, 'əʊ');
  return us === uk ? [us] : [us, uk];
}

/** Ngưỡng đạt khi chấm từng âm cho từ tự chọn: nới hơn bài luyện soạn tay vì IPA lấy tự động. */
export const NOTE_PHONE_PASS = 0.75;
