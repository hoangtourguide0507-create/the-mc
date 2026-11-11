# Chuyển sang three.js thuần

## Mục tiêu
Bỏ React, `@react-three/fiber`, `drei` và Tailwind ở phần giao diện 3D. Giữ Vite và TypeScript. Logic game (`src/core/`, `src/data/`, `src/audio/`) giữ nguyên.

## Kiến trúc mới
- `v2.html`: trang vào của bản mới. Có canvas `#stage3d` và lớp `#ui`.
- `index.html`: vẫn là bản React cũ, sẽ xoá ở GĐ7.
- `src/app.ts`: điểm vào bản mới. Đăng ký cảnh, theo dõi `view` của store, xử lý `pagehide` và `visibilitychange`.
- `src/engine/Engine.ts`: một `WebGLRenderer` dùng chung. Interface `GameScene`, các hàm `register`, `preload`, `show`, `unload`, và `disposeTree()`.
- `src/engine/smooth.ts`: `damp` và `dampVec3`, làm mượt theo mũ.
- `src/engine/watch.ts`: `watch(selector, onChange)` theo dõi store ngoài React.
- `src/ui/dom.ts`: hàm `h()` dựng DOM.
- `src/ui/base.css`: CSS thuần, biến màu Ghibli, `--tap: 44px`.
- `src/scenes/PlaceholderScene.ts`: cảnh tạm, sẽ bị thay.
- `src/core/store.ts`: `gameStore` (vanilla, dùng `zustand/vanilla`).
- `src/core/storeReact.ts`: cầu nối tạm cho code React cũ (`useGameStore`), sẽ xoá.

## Quy tắc viết cảnh mới
- Cảnh implement `GameScene`: có `scene`, `camera`, `update(dt, elapsed)`, `dispose()`. Có thể thêm `enter`, `leave`, `resize`, `render`.
- Đăng ký cảnh trong `src/app.ts` bằng `engine.register(tên, factory)`.
- `dt` đã kẹp tối đa 0.1s. Làm mượt bằng `damp` hoặc `dampVec3`, không dùng `lerp(a, b, dt * k)`.
- Không gọi `setState` mỗi khung hình. Chỉ đọc store qua `gameStore.getState()` hoặc `watch`.
- Mọi tài nguyên phải được giải phóng trong `dispose()`. Dùng `disposeTree()` cho cây đối tượng.

## Quy tắc UI
- Dựng giao diện bằng HTML/CSS thuần qua `h()`.
- Nút tương tác có chiều cao tối thiểu 44px (`--tap`).
- Không thêm Tailwind hay React vào code mới.
- Màu lấy từ biến CSS trong `base.css`, theo `docs/STYLE_GHIBLI.md`.

## Lộ trình
| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| GĐ1 | Nền móng: engine, chuyển cảnh, lớp UI, store vanilla | Xong |
| GĐ2 | Nhân vật (chibi + VRM) | Chưa làm |
| GĐ3 | Thành phố 28×28 | Chưa làm |
| GĐ4 | Phòng MC, HUD và sheet bằng HTML | Chưa làm |
| GĐ5 | Sân khấu và máy trạng thái lượt diễn | Chưa làm |
| GĐ6 | Phòng luyện, phát âm, tour, kết quả, bloom | Chưa làm |
| GĐ7 | Xoá React, đổi `v2.html` thành `index.html` | Chưa làm |

## Cách chạy thử
1. Chạy `npm run dev`.
2. Mở `/v2.html` trên trình duyệt.
3. Thêm `?qa=1` vào địa chỉ để có `window.__mc` (store) và `window.__engine` (engine).

Bản React cũ vẫn mở ở `/` như trước.
