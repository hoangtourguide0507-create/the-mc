# MC Life · English Stage — hướng dẫn cho Claude

Game nằm ở `mc-life-english-stage/` (một file `index.html` duy nhất: HTML + Tailwind CDN + vanilla JS).
GitHub Pages deploy thẳng từ nhánh `main` → https://hoangtourguide0507-create.github.io/the-mc/mc-life-english-stage/

## Quy trình mỗi lần sửa
1. `git pull origin main` trước khi sửa (chủ repo có thể upload file trên web GitHub).
2. **Tăng `APP_VERSION`** trong `index.html` (định dạng `YYYY.MM.DD-n`). Game dựa vào số này để hiện nút “Có bản mới — Chạm để cập nhật” cho người chơi.
3. Kiểm tra ở khung iPhone dọc (390×844) và iPad ngang (1180×820) trước khi push.
4. Commit lên `main` rồi push; khoảng 1–2 phút sau trang live cập nhật.

## Đội agent (`.claude/agents/`)
Mỗi agent sở hữu một nhóm khu vực trong `index.html` (theo các tiêu đề đánh số `0.`–`15.` trong `<script>`):

| Agent | Phụ trách |
|---|---|
| `ui-designer` | CSS, markup, HUD, Hub, Sổ tay/Cửa hàng, modal, responsive |
| `character-artist` | Nhân vật SVG (`5b. CLAY NPC`), bối cảnh (`5. ART`), `look` của NPC |
| `lesson-content` | Kịch bản tiếng Anh, `SCENES`, lời thoại, bản dịch, cụm từ Sổ tay |
| `game-systems` | State/lưu dữ liệu, Energy/Charisma/XP/cát-xê, Streak, ngày, Shop, phần thưởng |
| `audio-speech` | TTS, mic/SpeechRecognition, chấm phát âm, SFX, mở khoá âm thanh iOS |
| `world-map` | Bản đồ thành phố kiểu The Sims (`9b. WORLD MAP`, `#view-world`) |
| `qa-release` | Kiểm thử iPhone/iPad, tăng `APP_VERSION`, commit & push, xác nhận trang live |

Quy tắc phối hợp:
- Yêu cầu chạm nhiều mảng → giao cho từng agent phần của mình; agent không sửa khu vực của agent khác (ghi chú lại để chuyển giao).
- Chạy song song chỉ khi các phần không chạm cùng khu vực; mỗi agent làm trên git worktree riêng, người điều phối gộp lại.
- **Chỉ `qa-release` được push lên `main`**, sau khi `.claude/qa/snap.py` không báo lỗi JS và ảnh chụp đã được rà.
- Công cụ chụp thử: `.claude/qa/snap.py` (xem `.claude/qa/README.md`).

## Quy ước giao diện
- Tông “Neon Stage × Glass”: nền tối tím `#120A30`, panel kính mờ, nút bóng (glossy), điểm nhấn neon hồng `#FF4FD8` / xanh `#22D3EE` / xanh lá `#7CFF6B`.
- Font tiêu đề **Baloo 2** (có đủ dấu tiếng Việt) — không dùng Fredoka (thiếu dấu tiếng Việt).
- Nền `html, body` phải giữ màu tối để vùng thanh trạng thái / thanh công cụ Safari iOS không bị trắng.
- Nhân vật vẽ bằng SVG trong `clayFig()` / `propArt()`; giữ các class `.fig`, `.eye`, `.m-*` để chớp mắt, khẩu hình và biểu cảm còn chạy.
- Giao diện viết tiếng Việt; nội dung hội thoại luyện tập bằng tiếng Anh.
