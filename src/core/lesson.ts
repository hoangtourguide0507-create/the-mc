// Luồng "chỉ bài học" của bản giao diện mới: không còn đồng hồ trong ngày, năng lượng, tiền.
// Vào bài chỉ xét cấp MC và danh tiếng; thưởng chỉ còn Charisma (và XP tính ở màn bài học).
// Các hàm ở đây thuần tuý để test được: npm run test:lesson
import { DAILY_REPEAT_CHA } from './clock';

export interface LessonLock {
  kind: 'level' | 'rep';
  /** Cấp cần đạt (kind = level) hoặc danh tiếng tối thiểu (kind = rep) */
  need: number;
}

/** Lý do một tình huống còn khoá, hoặc null nếu vào được. Thứ tự xét: cấp trước, danh tiếng sau. */
export function lessonLock(
  scene: { reqLv: number; minRep?: number },
  lv: number,
  rep: { avg: number; n: number } | undefined
): LessonLock | null {
  if (lv < scene.reqLv) return { kind: 'level', need: scene.reqLv };
  if (scene.minRep && (!rep || rep.n <= 0 || rep.avg < scene.minRep)) return { kind: 'rep', need: scene.minRep };
  return null;
}

/**
 * Charisma nhận sau một bài. Giữ công thức gốc: reward · (0.6 + 0.15·avg) · k.
 * Lần đầu trong ngày: show nhân (1 + bonusCha), hoạt động khởi động nhân 1.
 * Luyện lại cùng bài trong ngày: nhân 0,5 cho cả hai loại (bản cũ chặn hẳn việc dẫn lại show;
 * bản mới cho luyện lại thoải mái nhưng không để cày cấp bằng một bài).
 */
export function lessonCharisma(
  rewardCharisma: number,
  avgStars: number,
  opts: { isShow: boolean; repeatToday: boolean; bonusCha?: number }
): number {
  const mult = 0.6 + 0.15 * avgStars;
  const k = opts.repeatToday ? DAILY_REPEAT_CHA : opts.isShow ? 1 + (opts.bonusCha ?? 0) : 1;
  return Math.round(rewardCharisma * mult * k);
}

/** Sang ngày thật mới thì ngày học tăng 1 (kịch bản xoay theo ngày học). */
export function isNewLessonDay(dayDate: string, today: string): boolean {
  return dayDate !== today;
}

/** Danh tiếng chỉ thay đổi khi DIỄN một show; Tập và các bài khởi động không tính. */
export function countsForRep(sceneType: string, perform: boolean): boolean {
  return sceneType === 'show' && perform;
}
