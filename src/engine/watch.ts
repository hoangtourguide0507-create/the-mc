import { gameStore, type GameStore } from '../core/store';

/**
 * Theo dõi một lát cắt của store; chỉ gọi lại khi giá trị đổi (so sánh ===).
 * Trả về hàm huỷ đăng ký. `fireNow` gọi ngay một lần với giá trị hiện tại.
 */
export function watch<T>(
  selector: (s: GameStore) => T,
  onChange: (value: T, prev: T) => void,
  fireNow = true
): () => void {
  let prev = selector(gameStore.getState());
  if (fireNow) onChange(prev, prev);
  return gameStore.subscribe((s) => {
    const next = selector(s);
    if (next === prev) return;
    const old = prev;
    prev = next;
    onChange(next, old);
  });
}
