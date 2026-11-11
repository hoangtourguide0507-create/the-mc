# Chuyển sang three.js thuần

## Mục tiêu
Bỏ React, `@react-three/fiber`, `drei` và Tailwind. Giữ Vite và TypeScript. Giữ logic bài học (`src/core/`, `src/data/`, `src/audio/`) và thang nghề.

## Phạm vi và phong cách (từ 2026-11-11)
- Giữ: bài học tiếng Anh, thang nghề (cấp MC, danh tiếng, mở tình huống theo `reqLv` và `minRep`), nhiệm vụ, phòng luyện, sổ tay.
- Bỏ: thành phố đi bộ, đồng hồ trong ngày, năng lượng, tiền, shop, nhân vật 3D (chibi, VRM), phòng MC 3D.
- Nền sáng là mặc định: giấy ấm, chữ nâu than. Nền tối là tuỳ chọn, bật bằng `<html data-theme="dark">`. Lựa chọn lưu ở `localStorage['mclife.ui.theme']`.
- Giao diện dịu mắt cho phiên học 2-3 tiếng: không đen và trắng tuyệt đối, chữ từ 16px, không kính mờ, chuyển động chậm. Tôn trọng `prefers-reduced-motion`.
- Không còn Ghibli. `src/app.ts` không gọi `installGhibliShading`.
- 3D chỉ làm nền. Một cảnh duy nhất là `StageBackdrop`, đổi bối cảnh bằng `setTheme` (lounge, conference, runway, concert, wedding, gala).
- Nội dung học là HTML phủ lên, chiếm gần hết màn hình.

## Kiến trúc hiện tại
- `v2.html`: trang vào của bản mới. Có canvas `#stage3d` và lớp `#ui`.
- `index.html`: bản React cũ, sẽ xoá ở GĐ7.
- `src/app.ts`: điểm vào. Tạo `Engine`, đăng ký `StageBackdrop`, đặt chủ đề sáng hoặc tối, chuyển giữa màn chính và màn bài học, lưu khi trang ẩn.
- `src/engine/Engine.ts`: một `WebGLRenderer` dùng chung. Interface `GameScene` (`scene`, `camera`, `update`, `dispose`; tuỳ chọn `enter`, `leave`, `resize`, `render`). Có `register`, `preload`, `show`, `unload`, `disposeTree()`.
- `src/engine/smooth.ts`: `damp` và `dampVec3`, làm mượt theo hàm mũ.
- `src/engine/watch.ts`: `watch(selector, onChange, fireNow?)` theo dõi store ngoài React.
- `src/ui/dom.ts`: `h()` dựng DOM, `clear()` xoá con, `append()` thêm nhiều phần tử.
- `src/ui/base.css`: CSS thuần. Biến màu (`--bg`, `--panel`, `--ink`, `--accent`, `--rec`), `--tap: 44px`. Font Playfair Display cho tiêu đề, Be Vietnam Pro cho nội dung.
- `src/scenes/StageBackdrop.ts`: nền sân khấu duy nhất, có bloom qua EffectComposer (chỉ bật ở nền tối). `setMode('light' | 'dark')` đổi chế độ. `setCalm(level)` làm dịu nền: màn chính 1, bài học 0.45.
- `src/ui/screens/home.ts`: màn chính. Thang nghề, danh sách tình huống, nút đổi nền.
- `src/ui/screens/lesson.ts`: màn bài học (xem mục dưới).
- `src/core/lesson.ts`: `lessonLock`, `lessonCharisma`, `isNewLessonDay`. Hàm thuần, test bằng `npm run test:lesson`.
- `src/core/store.ts`: `gameStore` (vanilla). `src/core/storeReact.ts` là cầu nối cho code React cũ, sẽ xoá.

## Luồng bài học (bản mới)
- Vào bài: `startLesson(sceneId)` chỉ xét cấp và danh tiếng. Gọi trong thao tác chạm để mở khoá âm thanh trên iOS.
- Trong bài: 5 kiểu lượt (đọc theo thẻ, bắt từ rồi nói, điền ô rồi nói, ứng biến, chọn đáp án). Khi giảm dần hỗ trợ, lượt đổi thành tự nói (`src/core/recall.ts`). Chấm cộng dồn và luyện riêng cụm còn sai (`src/core/retry.ts`). Token `attempt` huỷ kết quả bất đồng bộ của lượt cũ.
- Kết thúc: `finishScene` ở `lessonMode` chỉ cộng Charisma và XP. Show còn ghi danh tiếng. Không tiền, không năng lượng, không chạy đồng hồ, không ngất. Luyện lại cùng bài trong ngày nhận Charisma giảm một nửa (chú thích trong `core/lesson.ts`).
- Ngày học: `rollLessonDay()` chạy khi mở app và khi trang hiện lại. Sang ngày thật mới thì ngày học tăng và xoá dấu đã làm hôm nay.
- Thoát: `closeLesson()` xoá `activeSceneId` và `lessonMode`. Rời bài cần chạm hai lần trong 3 giây.

## Quy tắc viết cảnh 3D mới
- Cảnh implement `GameScene` và đăng ký trong `src/app.ts` bằng `engine.register(tên, factory)`.
- `dt` đã kẹp tối đa 0.1s. Làm mượt bằng `damp` hoặc `dampVec3`, không dùng `lerp(a, b, dt * k)`.
- Không gọi `setState` mỗi khung hình. Đọc store bằng `gameStore.getState()` hoặc `watch`.
- Mọi tài nguyên giải phóng trong `dispose()`. Dùng `disposeTree()` cho cây đối tượng.
- Không thêm nhân vật hay đạo cụ kiểu chibi, VRM vào nền sân khấu.
- Ở nền sáng, màu đèn pha về màu nền (`pastel`) và không cộng sáng (additive), vì sẽ cháy trắng.

## Quy tắc UI
- Dựng giao diện bằng HTML/CSS thuần qua `h()`. Không thêm React hay Tailwind vào code mới.
- Nút tương tác cao ít nhất 44px (`--tap`). Nút chính `.btn` cao 52px.
- Màu, khoảng cách và font lấy từ biến CSS trong `base.css`.
- Không dùng `window.confirm` và `alert`. Thông báo đi qua toast của store.
- Trong `lesson.ts`, mọi thay đổi trạng thái gọi `render()`. Riêng chữ máy đang nghe cập nhật thẳng vào `heardText`, không dựng lại DOM mỗi lần.
- Màn bài học: thanh mic ghim ở đáy, nằm ngoài vùng cuộn. Không đặt nội dung cuộn chung với thanh mic.
- `docs/STYLE_GHIBLI.md` mô tả giao diện React cũ, không áp dụng cho bản mới.

## Lộ trình
| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| GĐ1 | Nền móng: engine, store vanilla | Xong |
| GĐ2 | Nền sân khấu 3D, hệ thiết kế, màn chính (bản đầu) | Xong |
| GĐ3 | Màn bài học: HTML thuần của `StageView.tsx`, 5 kiểu lượt, giảm dần hỗ trợ, chấm cộng dồn, màn kết quả. Đã bỏ nút thử đúng, gần đúng, sai. Chỉ còn ô gõ thay mic. | Xong |
| GĐ4 | Gỡ đồng hồ, năng lượng, tiền khỏi luồng bài học (`src/core`, có test). Giữ Charisma, danh tiếng, XP. | Xong phần cốt lõi. Action cũ (`startScene`, đồng hồ, shop) còn cho bản React tới GĐ7 |
| GĐ5 | Luyện tập (phòng luyện, phát âm), Sổ tay, Nhiệm vụ | Chưa làm. Tab hiện chỉ báo "sẽ có ở bước kế tiếp" |
| GĐ6 | Tình huống mới cho hội nghị, thời trang, idol (kèm cụm trong `chunks.ts` và giọng) | Chưa làm |
| GĐ7 | Xoá React và code 3D cũ. Đổi `v2.html` thành `index.html`. Cập nhật `pages.yml`, README, spec. | Chưa làm |

## Cách chạy thử
1. Chạy `npm run dev`.
2. Mở `/v2.html` trên trình duyệt.
3. Thêm `?qa=1` vào địa chỉ để có `window.__mc` (store), `window.__engine` và `window.__backdrop`.
4. Test logic bài học: `npm run test:lesson`.

Bản React cũ vẫn mở ở `/` như trước.
