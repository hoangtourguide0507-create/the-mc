// Lịch ôn lặp lại ngắt quãng (kiểu hộp Leitner) cho từ cần luyện.
// Hộp 1 ôn ngay ngày kế tiếp; trả lời đúng thì lên hộp và giãn khoảng cách; sai thì về hộp 1.
import type { WeakWord } from '../types/game';

export const SRS_MAX_BOX = 5;
/** Số ngày chờ trước khi ôn lại, theo từng hộp (chỉ số 1..5). */
export const SRS_INTERVALS: readonly number[] = [0, 1, 2, 4, 8, 16];

export function boxOf(item: WeakWord): number {
  const b = item.box ?? 1;
  return Math.min(SRS_MAX_BOX, Math.max(1, Math.floor(b)));
}

export function dueOf(item: WeakWord, day: number): number {
  return item.due ?? day;
}

export function isDue(item: WeakWord, day: number): boolean {
  return dueOf(item, day) <= day;
}

/** Cập nhật hộp và ngày đến hạn sau một lần trả lời. Trả về bản mới, không sửa đầu vào. */
export function scheduleAfter(item: WeakWord, correct: boolean, day: number): WeakWord {
  const box = boxOf(item);
  if (!correct) {
    return { ...item, box: 1, due: day + SRS_INTERVALS[1], status: 'near' };
  }
  const next = Math.min(SRS_MAX_BOX, box + 1);
  return { ...item, box: next, due: day + SRS_INTERVALS[next] };
}

/** Từ đến hạn lên trước; trong nhóm, hộp thấp hơn lên trước; cuối cùng là từ mới gặp gần đây. */
export function sortForReview(items: WeakWord[], day: number): WeakWord[] {
  return [...items].sort((a, b) => {
    const da = isDue(a, day) ? 0 : 1;
    const db = isDue(b, day) ? 0 : 1;
    if (da !== db) return da - db;
    if (boxOf(a) !== boxOf(b)) return boxOf(a) - boxOf(b);
    return (b.at ?? 0) - (a.at ?? 0);
  });
}

export function dueCount(items: WeakWord[], day: number): number {
  return items.filter((w) => isDue(w, day)).length;
}
