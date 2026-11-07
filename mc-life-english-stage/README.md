# 🎙️ MC Life · English Stage

Game luyện **tiếng Anh giao tiếp (Nghe · Đọc · Nói)** qua nghề **MC sự kiện & MC cưới** — phong cách *The Sims × Duolingo*.
Tối ưu cho **Safari trên iPhone (dọc)** và **iPad (ngang)**, cài được như app qua “Thêm vào Màn hình chính”.

> Một file `index.html` duy nhất · HTML5 + Tailwind CSS (CDN) + Vanilla JS · không cần build, không cần server riêng.

---

## ✨ Tính năng

| Nhóm | Nội dung |
|---|---|
| **Vòng lặp The Sims** | ⚡ Energy · ✨ Charisma (cấp độ) · 🎙️ Fluency XP · 💰 Cát-xê. Daily Life miễn phí hồi năng lượng → nhận show (−20⚡) → kiếm cát-xê → mua đồ / nâng cấp → lên cấp mở show khó hơn |
| **7 kịch bản** | ☕ Morning Coffee Run · 🛒 Supermarket Run · 🎚️ Rehearsal & Soundcheck · 💍 Grand Entrance & First Toast · 🏖️ Sunset Beach Wedding · 🏆 VIP Gala – Stage Delay · 🎙️ On-Stage CEO Interview |
| **NPC clay 3D** | Leo, Alex, Emma & Liam, Victoria… chớp mắt tự nhiên, lip-sync khi nói, sóng âm toả ra, 4 biểu cảm (idle · lắng nghe · vui ✨ · bối rối 💧), giọng đọc riêng (en-US / en-GB / en-AU, pitch, rate) |
| **Luyện nghe** | ① Blind Listening (ẩn chữ, ×2 Listening XP) · ② Word-Catcher (bắt từ nghe được để mở khoá micro) · ③ In-ear Director (tiếng bộ đàm + đồng hồ phản xạ) |
| **Luyện nói** | Nhận diện giọng nói thật (`webkitSpeechRecognition`), chấm từng từ bằng Levenshtein + Metaphone + Soundex, tô 🟩/🟨/🟥, chạm từ đỏ để nghe mẫu. Chế độ Scripted · Semi-scripted · Freeform (từ khoá bắt buộc / thưởng / cấm nói) |
| **Sổ tay** | Cụm từ đã học + **Từ cần luyện lại** (tự lưu từ đọc sai) — luyện đúng để nhận XP |
| **Cửa hàng** | Đồ hồi năng lượng + nâng cấp vĩnh viễn: 🎤 Micro Vàng · 👗 Váy Dạ Hội · 🎧 Tai nghe In-ear |
| **Lưu tiến trình** | Tự động vào `localStorage` của trình duyệt |
| **Dự phòng** | Nút ⌨️ *Giả lập / Bàn phím* để test khi không tiện nói |

---

## 🚀 Đưa lên GitHub & chạy online (GitHub Pages)

1. Tạo repo mới trên GitHub (ví dụ `mc-life-english-stage`), để **Public**.
2. Đẩy toàn bộ thư mục này lên nhánh `main`:
   ```bash
   git init
   git add .
   git commit -m "MC Life · English Stage"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/mc-life-english-stage.git
   git push -u origin main
   ```
   *(Hoặc trên web GitHub: **Add file → Upload files** → kéo thả tất cả file & thư mục `icons/` vào.)*
3. Vào **Settings → Pages** → mục *Build and deployment* chọn **Source: Deploy from a branch** → **Branch: `main`**, thư mục **`/ (root)`** → **Save**.
4. Đợi ~1 phút, game chạy tại:
   `https://<tên-bạn>.github.io/mc-life-english-stage/`

> GitHub Pages có sẵn **HTTPS** — đây là điều kiện bắt buộc để Safari cho phép dùng micro.

---

## 📱 Cài trên iPhone / iPad

1. Mở link GitHub Pages bằng **Safari**.
2. Bấm **Chia sẻ → Thêm vào Màn hình chính** → app chạy toàn màn hình, có icon riêng.
3. Lần đầu bấm **☀️ Bắt đầu Ngày Mới** để mở khoá âm thanh.
4. Khi chạm micro, cho phép Safari dùng **Micro**.

**Nếu micro không nhận giọng nói**, kiểm tra:
- **Cài đặt › Cài đặt chung › Bàn phím › Bật Đọc chính tả** (nhận diện giọng nói của Safari dùng dịch vụ này).
- **Cài đặt › Safari › Micro → Cho phép**.
- Thiết bị có **Internet** (nhận diện chạy trên máy chủ của Apple).

**Giọng NPC tự nhiên hơn:** **Cài đặt › Trợ năng › Nội dung được đọc › Giọng nói › Tiếng Anh** → tải bản *Enhanced / Nâng cao* của Samantha, Daniel, Kate, Karen, Lee… Game tự ưu tiên các giọng này (xem gán giọng ở nút 🗣️ trong phòng MC).

---

## 💻 Chạy thử trên máy tính

Mở trực tiếp `index.html` sẽ **không** dùng được micro (cần `https://` hoặc `localhost`). Hãy chạy một server tĩnh:

```bash
# Python (có sẵn trên macOS)
python3 -m http.server 8080
# hoặc Node
npx serve .
```

Rồi mở `http://localhost:8080` bằng **Chrome / Edge / Safari**.
*(Firefox chưa hỗ trợ nhận diện giọng nói — dùng nút ⌨️ Giả lập / Bàn phím.)*

---

## 🗂️ Cấu trúc

```
mc-life-english-stage/
├── index.html              # Toàn bộ game (HTML + CSS + JS)
├── manifest.webmanifest    # Cấu hình PWA (tên, màu, icon)
├── icons/                  # Icon app 180 / 192 / 512 / maskable
├── .nojekyll               # Để GitHub Pages phục vụ file nguyên trạng
└── README.md
```

Trong `index.html`, phần JavaScript chia theo mục đánh số:

| Mục | Nội dung |
|---|---|
| `1. STATE` | Lưu/tải `localStorage` (khoá `mclife.v2`) |
| `2. SFX ENGINE` | Âm thanh tổng hợp bằng Web Audio (ting, coin, bộ đàm…) |
| `3. AUDIO BUS` · `3b. VOICE` | Bán song công TTS ⇄ micro, chọn giọng NPC |
| `4. SPEECH ENGINE` · `4c. PRONUNCIATION EVALUATOR` | Nhận diện & chấm phát âm |
| `5. ART` · `5b. CLAY NPC` | Bối cảnh SVG & nhân vật clay |
| `6. NỘI DUNG` | **`NPCS` + `SCENES` — nơi thêm/sửa kịch bản** |
| `10–13` | Hub, Sổ tay, Cửa hàng, Sân khấu, sự kiện |

---

## ✍️ Thêm kịch bản mới

Thêm một mục vào `SCENES` (mục 6). Mỗi lượt (`turns`) là một trong các kiểu:

```js
// Scripted — đọc theo Cue Card
{ npc: "NPC nói…", npcVi: "Bản dịch…", cue: "Câu người chơi đọc", cueVi: "…", key: "cụm cần nhấn", tip: "💡 …" }

// Word-Catcher — đặt từ cần bắt trong {ngoặc nhọn}, catch = từ gây nhiễu
{ npc: "Your mic is on channel four.", npcVi: "…", cue: "Channel {four}, got it!", catch: ['fourteen', 'forty'], cueVi: "…", key: "got it" }

// Freeform — ứng biến
{ mode: 'free', npc: "…", npcVi: "…", task: "Yêu cầu (EN)", taskVi: "…",
  requiredKeywords: [['thank', 'thanks'], ['enjoy', 'dinner']],   // mỗi nhóm = các từ đồng nghĩa
  bonusKeywords: [['wonderful', 'beautiful']], forbiddenKeywords: [['late']],
  sample: "Câu mẫu", sampleVi: "…", minWords: 8 }

// Nghe hiểu qua tai nghe đạo diễn
{ who: 'alex', mode: 'quiz', channel: 'inear', reflex: 15, npc: "…", npcVi: "…",
  question: "Đạo diễn vừa dặn gì?", options: [{ t: 'Đáp án A' }, { t: 'Đáp án đúng', ok: true }] }
```

Nếu là show (không phải Daily Life), thêm `id` vào mảng `GIG_ORDER` để hiện trong *Lịch Nhận Show*.

---

## 🧰 Ghi chú kỹ thuật

- **Không cần build:** Tailwind chạy qua CDN, font Nunito/Fredoka từ Google Fonts → cần Internet khi mở game.
- **Dữ liệu chơi** lưu riêng trên từng trình duyệt/thiết bị. Xoá & chơi lại: *Cửa hàng → 🔄 Xoá dữ liệu*.
- **Bán song công (half-duplex):** micro không bao giờ mở khi NPC đang nói (tránh lỗi âm thanh trên iOS).
- Đã kiểm thử bằng trình duyệt giả lập kích thước iPhone 14 / iPhone SE / iPad Air ngang; nên thử lại micro & giọng đọc trên máy thật.
