# Chuyển sang three.js thuần

## Mục tiêu
Bỏ React, `@react-three/fiber`, `drei` và Tailwind. Giữ Vite và TypeScript. Giữ logic bài học (`src/core/`, `src/data/`, `src/audio/`) và thang nghề.

## Phạm vi và phong cách (từ 2026-11-11)
- Giữ: bài học tiếng Anh, thang nghề (10 cấp MC, danh tiếng, mở show theo `reqLv` và `minRep`), nhiệm vụ, phòng luyện, sổ tay.
- Bỏ: thành phố đi bộ, đồng hồ trong ngày, năng lượng, tiền, shop, nhân vật 3D (chibi, VRM), phòng MC 3D.
- Phong cách: sân khấu tối, đèn sang trọng. Không còn Ghibli trong bản mới, nên `installGhibliShading` không được gọi ở `src/app.ts`.
- 3D chỉ làm nền. Một cảnh duy nhất là `StageBackdrop`, đổi bối cảnh bằng `setTheme` (lounge, conference, runway, concert, wedding, gala).
- Nội dung học là HTML phủ lên, chiếm gần hết màn hình.

## Kiến trúc hiện tại
- `v2.html`: trang vào của bản mới. Có canvas `#stage3d` và lớp `#ui`.
- `index.html`: bản React cũ, sẽ xoá ở GĐ7.
- `src/app.ts`: điểm vào. Tạo `Engine`, đăng ký `StageBackdrop`, dựng màn chính, lưu khi trang ẩn.
- `src/engine/Engine.ts`: một `WebGLRenderer` dùng chung. Interface `GameScene` (`scene`, `camera`, `update`, `dispose`; tuỳ chọn `enter`, `leave`, `resize`, `render`). Có `register`, `preload`, `show`, `unload`, `disposeTree()`.
- `src/engine/smooth.ts`: `damp` và `dampVec3`, làm mượt theo hàm mũ.
- `src/engine/watch.ts`: `watch(selector, onChange, fireNow?)` theo dõi store ngoài React.
- `src/ui/dom.ts`: `h()` dựng DOM, `clear()` xoá con.
- `src/ui/base.css`: CSS thuần. Biến màu (`--gold`, `--panel`, `--ivory`), `--tap: 44px`. Font Playfair Display cho tiêu đề, Be Vietnam Pro cho nội dung.
- `src/scenes/StageBackdrop.ts`: nền sân khấu duy nhất, có bloom qua EffectComposer.
- `src/ui/screens/home.ts`: màn chính (thang nghề và danh sách tình huống).
- `src/core/store.ts`: `gameStore` (vanilla). `src/core/storeReact.ts` là cầu nối cho code React cũ, sẽ xoá.

## Quy tắc viết cảnh 3D mới
- Cảnh implement `GameScene` và đăng ký trong `src/app.ts` bằng `engine.register(tên, factory)`.
- `dt` đã kẹp tối đa 0.1s. Làm mượt bằng `damp` hoặc `dampVec3`, không dùng `lerp(a, b, dt * k)`.
- Không gọi `setState` mỗi khung hình. Đọc store bằng `gameStore.getState()` hoặc `watch`.
- Mọi tài nguyên giải phóng trong `dispose()`. Dùng `disposeTree()` cho cây đối tượng.
- Không thêm nhân vật hay đạo cụ theo kiểu chibi, VRM vào nền sân khấu.

## Quy tắc UI
- Dựng giao diện bằng HTML/CSS thuần qua `h()`.
- Nút tương tác cao ít nhất 44px (`--tap`).
- Không thêm React hay Tailwind vào code mới.
- Màu, khoảng cách và font lấy từ biến CSS trong `base.css`.
- `docs/STYLE_GHIBLI.md` mô tả giao diện React cũ, không áp dụng cho bản mới.
- Màn bài học: thanh mic ghim ở đáy, nằm ngoài vùng cuộn. Không đặt nội dung cuộn chung với thanh mic.

## Lộ trình
| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| GĐ1 | Nền móng: engine, store vanilla | Xong |
| GĐ2 | Nền sân khấu 3D, hệ thiết kế, màn chính (bản đầu) | Xong |
| GĐ3 | Màn bài học: chuyển máy trạng thái 5 kiểu lượt của `StageView.tsx` sang HTML thuần. Giữ mic half-duplex, chấm cộng dồn, giảm dần hỗ trợ. Rủi ro cao nhất. | Chưa làm |
| GĐ4 | Gỡ đồng hồ, năng lượng, tiền khỏi luồng show và nhận thưởng (`src/core`, có test). Giữ charisma, danh tiếng, XP. | Chưa làm |
| GĐ5 | Luyện tập (phòng luyện, phát âm), Sổ tay, Nhiệm vụ, màn kết quả | Chưa làm |
| GĐ6 | Tình huống mới cho hội nghị, thời trang, idol (kèm cụm trong `chunks.ts` và giọng) | Chưa làm |
| GĐ7 | Xoá React và code 3D cũ. Đổi `v2.html` thành `index.html`. Cập nhật `pages.yml`, README, spec | Chưa làm |

## Cách chạy thử
1. Chạy `npm run dev`.
2. Mở `/v2.html` trên trình duyệt.
3. Thêm `?qa=1` vào địa chỉ để có `window.__mc` (store), `window.__engine` và `window.__backdrop`.

Bản React cũ vẫn mở ở `/` như trước.
