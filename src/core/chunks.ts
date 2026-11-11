// "Cụm mang về": mỗi tình huống chốt vài cụm dùng lại được. Cụm vào hộp ôn (Leitner) và quay lại
// trong phần Khởi động đầu ngày, nơi người học phải tự nói một câu có cụm đó trong ngữ cảnh khác.
import { normalizeText, wordSim } from './evaluator';
import { SRS_INTERVALS, SRS_MAX_BOX } from './srs';

export interface ChunkCard {
  box: number;
  /** Ngày trong game mà cụm đến hạn ôn. */
  due: number;
}

/** Thẻ mới: đến hạn vào ngày hôm sau. */
export function newChunkCard(day: number): ChunkCard {
  return { box: 1, due: day + 1 };
}

export function scheduleChunk(card: ChunkCard | undefined, correct: boolean, day: number): ChunkCard {
  const box = Math.min(SRS_MAX_BOX, Math.max(1, Math.floor(card?.box ?? 1)));
  if (!correct) return { box: 1, due: day + SRS_INTERVALS[1] };
  const next = Math.min(SRS_MAX_BOX, box + 1);
  return { box: next, due: day + SRS_INTERVALS[next] };
}

/** Các cụm đến hạn hôm nay: quá hạn lâu nhất trước, rồi hộp thấp trước. Tối đa `limit` cụm. */
export function dueChunkIds(deck: Record<string, ChunkCard>, day: number, limit = 8): string[] {
  return Object.entries(deck)
    .filter(([, c]) => c.due <= day)
    .sort((a, b) => a[1].due - b[1].due || a[1].box - b[1].box || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
}

/** Số cụm đã vững (hộp 4 trở lên, tức đã nói đúng ít nhất ba lần cách quãng). */
export function masteredChunks(deck: Record<string, ChunkCard>): number {
  return Object.values(deck).filter((c) => c.box >= 4).length;
}

export interface ChunkUse {
  ok: boolean;
  /** Câu nói có chứa cụm (các từ của cụm liền nhau, cho phép lệch phát âm nhẹ). */
  hasChunk: boolean;
  /** Câu đủ dài để là một câu trọn vẹn, không chỉ đọc lại cụm. */
  fullSentence: boolean;
}

/** Kiểm tra người học có dùng cụm trong một câu trọn vẹn không. */
export function evaluateChunkUse(chunk: string, transcript: string): ChunkUse {
  const need = normalizeText(chunk);
  const spoken = normalizeText(transcript);
  let hasChunk = false;
  for (let i = 0; need.length > 0 && i + need.length <= spoken.length && !hasChunk; i++) {
    hasChunk = need.every((w, k) => {
      const r = wordSim(w, spoken[i + k]);
      return r.sim >= 0.8 || r.phonetic;
    });
  }
  const fullSentence = spoken.length >= need.length + 2;
  return { ok: hasChunk && fullSentence, hasChunk, fullSentence };
}
