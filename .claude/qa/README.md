# Bộ kiểm thử dùng chung (cho các agent trong `.claude/agents/`)

```bash
python3 .claude/qa/snap.py                 # chụp tất cả màn, iPhone + iPad → /tmp/mc-shots
python3 .claude/qa/snap.py hub shop --only iphone
python3 .claude/qa/snap.py gallery         # bảng toàn bộ NPC
python3 .claude/qa/snap.py world world-walk world-card world-talk world-night world-enter
```
- Bản đồ thành phố: `world` (vừa ra phố, 07:00) · `world-walk` (MC đang đi tới Nhà hát) · `world-card` (tới Quán cà phê → thẻ “Vào…”) ·
  `world-talk` (bắt chuyện người đi đường gần nhất) · `world-night` (21:30, đèn đêm) · `world-enter` (18:00, đi tới Nhà hàng cưới và vào thẳng show → Stage).
  Giờ đặt qua `WORLD_CLOCK` trong snap.py (`state.clock`, phút từ 00:00).
- Cần `playwright` (Python) + Chrome/Chromium; lần đầu tự cài `tailwindcss@3` vào `/tmp/mc-qa-cache` để thay Tailwind CDN.
- Dữ liệu người chơi giả lập: Charisma Lv.9 (mở hết show), $400, streak 4.
- Thoát mã 1 nếu có lỗi JS ở bất kỳ màn nào.
- Thư mục bắt đầu bằng dấu chấm nên GitHub Pages không đăng công khai.

Kiểm tra cú pháp JS nhanh:
```bash
python3 - <<'P'
import re;s=open('mc-life-english-stage/index.html').read()
open('/tmp/app.js','w').write(re.findall(r'<script>([\s\S]*?)</script>',s)[-1])
P
node --check /tmp/app.js
```
