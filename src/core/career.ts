/**
 * Thang nghề MC — 10 cấp + Danh tiếng.
 *
 * - Charisma cần để lên cấp lấy từ bảng CHA_TABLE (Lv.1→2 … Lv.9→10). Lv.10 là cấp tối đa.
 * - Danh tiếng (rep) = trung bình trượt số sao các show đã dẫn (0–3 sao).
 *   Show đầu tiên đặt thẳng giá trị; các show sau: rep = rep·(1−REP_WEIGHT) + avg·REP_WEIGHT.
 *   Hoạt động daily (cà phê, siêu thị) không ảnh hưởng danh tiếng.
 * - Show lớn đòi cả cấp Charisma (reqLv) lẫn danh tiếng tối thiểu (minRep).
 */

export const MAX_LV = 10;

/** Charisma cần để đi từ Lv.n lên Lv.n+1 (chỉ số 0 = Lv.1→2). */
export const CHA_TABLE = [60, 90, 200, 260, 380, 460, 600, 700, 900];

export const REP_WEIGHT = 0.25;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Tân binh',
  2: 'MC tập sự',
  3: 'MC sự kiện',
  4: 'MC tiệc cưới',
  5: 'MC chuyên nghiệp',
  6: 'MC sân khấu lớn',
  7: 'MC Gala',
  8: 'MC truyền hình',
  9: 'MC hạng A',
  10: 'Ngôi sao MC',
};

export function chaNeed(lv: number): number {
  if (lv >= MAX_LV) return Infinity;
  return CHA_TABLE[Math.max(1, lv) - 1];
}

export function levelTitle(lv: number): string {
  return LEVEL_TITLES[Math.min(MAX_LV, Math.max(1, lv))] || LEVEL_TITLES[1];
}

/** Danh tiếng mới sau một show có số sao trung bình `showAvg`. */
export function nextRep(rep: { avg: number; n: number }, showAvg: number): { avg: number; n: number } {
  const avg = rep.n <= 0 ? showAvg : rep.avg * (1 - REP_WEIGHT) + showAvg * REP_WEIGHT;
  return { avg: Math.round(avg * 100) / 100, n: rep.n + 1 };
}

/** Danh tiếng hiển thị: "—" khi chưa dẫn show nào. */
export function fmtRep(rep: { avg: number; n: number } | undefined): string {
  if (!rep || rep.n <= 0) return '—';
  return rep.avg.toFixed(1);
}
