/**
 * Luật "buổi diễn sống": thanh khán giả và chuỗi liên tiếp.
 * Thuần logic, không đụng DOM hay store. Bộ chấm sao của từng lượt vẫn nằm ở evaluator/recall/retry;
 * file này chỉ biến số sao thành phản ứng của khán phòng.
 */
export interface ShowState {
  /** Độ nóng của khán phòng, 0 đến 100 */
  heat: number;
  /** Số lượt 3 sao ngay lần nói đầu, liên tiếp */
  streak: number;
  bestStreak: number;
  /** Điểm diễn của cả show */
  score: number;
}

export type Mood = 'cold' | 'warm' | 'hot';

export const HEAT_START = 50;
export const STREAK_CAP = 5;

export function newShow(): ShowState {
  return { heat: HEAT_START, streak: 0, bestStreak: 0, score: 0 };
}

const clampHeat = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Hệ số nhân điểm theo chuỗi: x1.0 đến x2.0 */
export function multiplier(streak: number): number {
  return 1 + Math.min(Math.max(0, streak), STREAK_CAP) * 0.2;
}

export function moodOf(heat: number): Mood {
  return heat < 30 ? 'cold' : heat < 70 ? 'warm' : 'hot';
}

export interface TurnOutcome {
  state: ShowState;
  /** Điểm cộng thêm ở bước này */
  points: number;
  /** Thay đổi độ nóng (đã kẹp trong 0..100) */
  heatDelta: number;
  /** Chuỗi vừa bị cắt (đang có ≥2 thì về 0) */
  streakBroken: boolean;
}

function settle(prev: ShowState, heat: number, streak: number, points: number): TurnOutcome {
  const h = clampHeat(heat);
  return {
    state: { heat: h, streak, bestStreak: Math.max(prev.bestStreak, streak), score: prev.score + points },
    points,
    heatDelta: h - prev.heat,
    streakBroken: prev.streak >= 2 && streak === 0,
  };
}

/**
 * Kết quả ĐẦU TIÊN có sao của một lượt.
 * `clean` = đạt ngay lần nói đầu, không có lần hụt (0 sao) hay chọn sai nào trước đó.
 * Chỉ 3 sao sạch mới nối chuỗi; mọi kết quả khác cắt chuỗi.
 */
export function applyTurn(s: ShowState, stars: 1 | 2 | 3, clean: boolean): TurnOutcome {
  if (stars === 3 && clean) {
    const streak = s.streak + 1;
    const points = Math.round(300 * multiplier(streak));
    return settle(s, s.heat + 8 + Math.min(streak, STREAK_CAP) * 2, streak, points);
  }
  if (stars === 3) return settle(s, s.heat + 5, 0, 300);
  if (stars === 2) return settle(s, s.heat + 1, 0, 200);
  return settle(s, s.heat - 6, 0, 100);
}

/** Nói lại và vượt số sao cũ của lượt: khán giả ấm lại một chút, không nối chuỗi, không nhân điểm. */
export function applyImprove(s: ShowState, fromStars: number, toStars: number): TurnOutcome {
  const d = Math.max(0, toStars - fromStars);
  return settle(s, s.heat + d * 3, s.streak, d * 100);
}

/** Một lần nói hụt (0 sao) hoặc một lần chọn sai: khán phòng xì xào. */
export function applyMiss(s: ShowState): TurnOutcome {
  return settle(s, s.heat - 4, s.streak, 0);
}

/** Bỏ qua lượt khi chưa có sao nào: mất nhiều nhất. */
export function applySkip(s: ShowState): TurnOutcome {
  return settle(s, s.heat - 15, 0, 0);
}

/** Nhận xét cuối show theo độ nóng khán phòng. */
export function verdict(heat: number): { title: string; line: string } {
  if (heat >= 85) return { title: 'Khán phòng đứng dậy vỗ tay', line: 'Bạn giữ được cả khán phòng từ đầu tới cuối.' };
  if (heat >= 70) return { title: 'Khán giả rất hào hứng', line: 'Một buổi diễn chắc tay. Giữ chuỗi dài hơn để lên mức cao nhất.' };
  if (heat >= 45) return { title: 'Khán giả lịch sự theo dõi', line: 'Ổn, nhưng chưa có khoảnh khắc bùng nổ. Thử nói 3 sao ngay lần đầu.' };
  if (heat >= 30) return { title: 'Khán phòng hơi nguội', line: 'Vài lượt ngập ngừng làm khán giả mất tập trung.' };
  return { title: 'Khán giả bắt đầu xem điện thoại', line: 'Luyện lại bài này ở tốc độ chậm rồi diễn lại nhé.' };
}

/**
 * Sự cố bất ngờ giữa show: MC ứng biến một câu.
 * `inTime` = bấm mic trước khi hết đồng hồ. Cứu được sự cố thì nối chuỗi; hỏng thì cắt chuỗi.
 */
export function applyIncident(s: ShowState, stars: 0 | 1 | 2 | 3, inTime: boolean): TurnOutcome {
  if (stars === 3 && inTime) {
    const streak = s.streak + 1;
    return settle(s, s.heat + 12, streak, Math.round(400 * multiplier(streak)));
  }
  if (stars >= 2) return settle(s, s.heat + 4, s.streak, 200);
  if (stars === 1) return settle(s, s.heat - 5, 0, 50);
  return settle(s, s.heat - 12, 0, 0);
}

/** Thưởng điểm thang nghề cho chế độ Diễn theo độ nóng cuối show (Tập luôn ×1). */
export function performBonus(heat: number): number {
  return heat >= 85 ? 1.5 : heat >= 70 ? 1.25 : 1;
}

/** Số lần được nói cho một lượt ở chế độ Diễn: một lần chính thức, thêm một lần nếu máy không nghe ra gì. */
export const PERFORM_TRIES = 2;
