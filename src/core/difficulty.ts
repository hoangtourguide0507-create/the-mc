/**
 * Độ khó tăng dần cho tình huống trò chuyện trên đường.
 * Tầng: 1 = A2, 2 = B1, 3 = B2. Mỗi tầng mở khoá theo cấp Charisma,
 * khớp với các mốc mở show (Lv 1 / 3 / 5).
 */

/** Quy nhãn trong dữ liệu về tầng. Các nhãn không chuẩn CEFR được quy về tầng gần nhất. */
const TIER_BY_LABEL: Record<string, number> = {
  A2: 1,
  Beginner: 1,
  'Beginner+': 1,
  B1: 2,
  Intermediate: 2,
  B2: 3,
  Advanced: 3,
};

/** Cấp Charisma tối thiểu để mở từng tầng. */
export const TIER_MIN_LV: Record<number, number> = { 1: 1, 2: 3, 3: 5 };

export function itemTier(level: string): number {
  return TIER_BY_LABEL[level] ?? 1;
}

/** Tầng cao nhất người chơi đã mở ở cấp `lv`. */
export function unlockedTier(lv: number): number {
  let tier = 1;
  for (const t of Object.keys(TIER_MIN_LV).map(Number).sort((a, b) => a - b)) {
    if (lv >= TIER_MIN_LV[t]) tier = t;
  }
  return tier;
}

export function isStreetTalkUnlocked(level: string, lv: number): boolean {
  return itemTier(level) <= unlockedTier(lv);
}
