import type { GameState } from '../types/game';

export interface TourStep {
  id: string;
  /** Giá trị của data-tour trên phần tử cần chỉ. */
  target: string;
  text: string;
  when: (st: GameState) => boolean;
}

/** Các bước chỉ điểm ngày đầu, theo thứ tự. Mỗi bước hiện khi điều kiện đúng và chưa được xác nhận. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'career',
    target: 'career',
    text: 'Bảng này ghi số cụm từ đã mở, số show đã dẫn và điểm Charisma còn thiếu để lên cấp.',
    when: (st) => st.stats.daily === 0 && st.stats.shows === 0,
  },
  {
    id: 'coffee',
    target: 'coffee',
    text: 'Bước 1 · Chạm thẻ Morning Coffee để luyện nói. Hoạt động này miễn phí và hồi ⚡.',
    when: (st) => st.stats.daily === 0 && st.stats.shows === 0,
  },
  {
    id: 'map',
    target: 'map',
    text: 'Bước 2 · Chạm "Ra Phố" để đi bộ tới Hậu trường và dẫn show đầu tiên (mở lúc 15:00).',
    when: (st) => st.stats.daily >= 1 && st.stats.shows === 0,
  },
  {
    id: 'gigs',
    target: 'gigs',
    text: 'Mỗi show xong sẽ cộng danh tiếng ⭐. Beach, Gala và Interview cần danh tiếng để mở.',
    when: (st) => st.stats.shows >= 1 && st.rep.n === 0,
  },
];

/** Bước chỉ điểm đang hiện, hoặc null nếu đã tắt hoặc không còn bước nào. */
export function currentTourStep(st: GameState): TourStep | null {
  if (st.tour.skipped) return null;
  return TOUR_STEPS.find((s) => !st.tour.acked[s.id] && s.when(st)) ?? null;
}

/**
 * Gợi ý bước tiếp theo cho người chơi mới, suy ra từ trạng thái hiện tại.
 * Trả về null khi không còn gợi ý nào. Hàm thuần, không đổi state.
 */
export function nextHint(st: GameState): string | null {
  if (st.stats.daily === 0 && st.stats.shows === 0) {
    return 'Bước 1 · Đi uống cà phê ☕ ở thẻ "Morning Coffee Run" bên dưới. Việc này miễn phí và hồi ⚡.';
  }
  if (st.stats.shows === 0) {
    return 'Bước 2 · Dẫn show đầu tiên ở Hậu trường (mở lúc 15:00). Chạm "Ra Phố" để đi bộ tới đó.';
  }
  if (st.rep.n === 0) {
    return 'Bước 3 · Mỗi show xong sẽ cộng danh tiếng ⭐. Beach, Gala và Interview cần danh tiếng để mở.';
  }
  return null;
}
