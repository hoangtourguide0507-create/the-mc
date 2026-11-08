import type { GameState } from '../types/game';

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
