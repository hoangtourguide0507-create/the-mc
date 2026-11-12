> **Lưu ý:** tài liệu này mô tả bản React + react-three-fiber cũ, đã bị xoá khỏi repo (2026-11-12). Kiến trúc hiện tại: xem `CLAUDE.md` và `docs/VANILLA_THREE_MIGRATION.md`.

# TÀI LIỆU BÀN GIAO KỸ THUẬT CHO AI (AI HANDOVER & MASTER SPECIFICATION)
**Dự án**: `MC Life · English Stage (3D WebGL Edition)`  
**Thư mục gốc**: `mc-life-3d/`  
**Mục tiêu**: Tài liệu chuẩn hoá toàn bộ kiến trúc, hợp đồng dữ liệu (data contracts), công thức toán học, quy tắc bất khả xâm phạm và danh sách công việc tiếp theo để bất kỳ AI Agent nào (Claude, Cursor, GPT, Gemini...) cũng có thể đọc và hoàn thiện 100% dự án mà không làm hỏng logic gốc.

---

## 1. TỔNG QUAN & TRẠNG THÁI HIỆN TẠI CỦA CODEBASE

Dự án đã được chuyển đổi từ bản đơn tệp 2D SVG (`index.html` ~6.660 dòng) sang kiến trúc **Modern 3D WebGL** sử dụng:
- **Runtime & Bundler**: Vite 5 + React 18 + TypeScript 5
- **3D Engine**: Three.js (`r169`) + `@react-three/fiber` + `@react-three/drei`
- **State Management**: `zustand` (đồng bộ `localStorage['mclife.v2']`)
- **Styling**: Tailwind CSS 3 (Phong cách `"Neon Stage × Glass"`, nền `#120A30`, font `Baloo 2` & `Nunito`)

### Sơ đồ cấu trúc thư mục hiện có (`mc-life-3d/`)
```text
mc-life-3d/
├── package.json                 # Dependencies & scripts (dev, build, preview, test:logic)
├── tsconfig.json                # Cấu hình TypeScript strict
├── vite.config.ts               # Cấu hình Vite bundler
├── tailwind.config.js           # Bảng màu Neon Stage (#120A30, #FF4FD8, #22D3EE, #7CFF6B)
├── index.html                   # Entry HTML (khoá zoom iOS, nạp font Baloo 2 & Nunito)
├── tests/
│   └── test_core_logic.py       # Unit test kiểm tra công thức kinh tế, đồng hồ & cấu trúc file
└── src/
    ├── main.tsx                 # React DOM Root
    ├── App.tsx                  # Router chính + sự kiện pagehide / visibilitychange (qua nửa đêm)
    ├── index.css                # Tailwind directives + iOS touch-action & dark background
    ├── types/
    │   └── game.ts              # Toàn bộ TypeScript Interfaces (GameState, SceneData, TurnData, LookConfig...)
    ├── data/
    │   └── content.ts           # Dữ liệu NPCS (8), SCENES (7), SHOP (6), WORLD_LOCS (8), WORLD_PROPS, STREET_TALK...
    ├── core/
    │   ├── clock.ts             # Đồng hồ (420..1440), SCHEDULE, sceneStatus, blockReason, latePenalty, dayPlan
    │   ├── evaluator.ts         # PronunciationEvaluator (Normalize, Levenshtein, Metaphone, Soundex, NW DP Alignment)
    │   └── store.ts             # Zustand Store (mclife.v2, deepMerge, v1->v2 migration, gain(), startScene, finishScene)
    ├── audio/
    │   └── audioSystem.ts       # SFX (19 âm WebAudio), Ambience (day/night), AudioBus (Half-Duplex), Voice (clip ElevenLabs render sẵn + TTS trình duyệt dự phòng), ClipAudio, SpeechEngine (STT)
    ├── three/
    │   ├── ClayCharacter3D.tsx  # Model nhân vật 3D Claymorphism + 5 Viseme miệng + Chớp mắt + 4 Mood + Trang phục/Đạo cụ
    │   ├── HubRoom3D.tsx        # Phòng Studio 3D của MC Thiên Ân (cửa sổ theo buổi, bàn Sổ tay, kệ Nâng cấp)
    │   ├── CityWorld3D.tsx      # Điều phối bản đồ: camera bám MC, ánh sáng theo buổi, nhãn địa điểm, bản đồ nhỏ, thẻ cửa
    │   ├── city/cityMap.ts      # Lưới 28×28 ô, 3 khu (Trung tâm / Phố đêm / Ven biển), nhà phụ, đạo cụ, BFS, làn xe
    │   ├── city/Buildings.tsx   # 8 toà nhà địa điểm kiến trúc riêng + 5 kiểu nhà phụ; mặt tiền cửa sổ vẽ bằng canvas
    │   ├── city/Ground.tsx      # Mặt đất instanced (đường, vỉa hè, cỏ, cát), vạch kẻ đường, biển, bệ sa bàn
    │   ├── city/Props.tsx       # Cây, cọ, đèn đường (+ vũng sáng đêm), đài phun nước, dù biển, hải đăng, thuyền
    │   ├── city/Agents.tsx      # MC / 10 người đi đường / 12 xe — vị trí đọc từ ref mỗi frame (không re-render)
    │   └── Stage3D.tsx          # 8 bối cảnh sân khấu 3D, đèn Spotlight, sóng âm 3D Hologram, Camera động theo người nói
    └── components/
        ├── HUD.tsx              # Thanh 4 viên chỉ số (Energy, Charisma, XP, Cash) đếm số mượt 800ms + số bay (+N/-N)
        ├── HubView.tsx          # Giao diện Phòng MC (chia 2 cột trên iPad, 1 cột trên iPhone, dải Poster GIG_ORDER)
        ├── StageView.tsx        # Máy trạng thái 5 loại lượt diễn, Blind Listening, Micro & bộ Giả lập dự phòng
        └── SheetsAndModals.tsx  # WelcomeOverlay, PhrasebookSheet (kèm Luyện từ yếu), ShopSheet, ResultModal, StreetTalkModal, GlobalOverlays (đã bỏ VoiceSelectorModal)
```

---

## 2. HỢP ĐỒNG DỮ LIỆU & CÔNG THỨC BẤT KHẢ XÂM PHẠM (CORE INVARIANTS)

Khi chỉnh sửa hoặc mở rộng dự án, **AI KHÔNG ĐƯỢC LÀM SAI LỆCH** các quy tắc và công thức dưới đây:

### 2.1. Lưu trữ & Tương thích dữ liệu (`src/core/store.ts`)
1. **Khoá lưu trữ**: `localStorage['mclife.v2']`.
2. **Khởi tạo & Ghép mặc định**: Luôn `deepClone(DEFAULT_STATE)` rồi `deepMerge(base, savedData)` (object lồng nhau trộn từng trường, mảng và giá trị đơn ghi đè).
3. **Migration `v1 → v2`**: Nếu chưa có `mclife.v2` mà có `mclife.v1`, giữ lại `energy, xp, cash, day, muted, voiceURI, charisma` và tính `stats.shows = tổng số lần hoàn thành các show trừ cafe/coffee`.
4. **Ghi dữ liệu**:
   - `persistStateDebounced`: gộp các thay đổi liên tiếp sau `120ms`.
   - `persistStateNow`: ghi ngay lập tức khi `pagehide` hoặc `visibilitychange === 'hidden'`. Mọi lỗi `localStorage` (QuotaExceeded / Private Mode) phải được `try/catch` nuốt gọn để không sập game.

### 2.2. Kinh tế & Công thức Thưởng (`src/core/store.ts` & `src/core/clock.ts`)
1. **Hàm thay đổi chỉ số duy nhất**: Mọi biến động của `energy`, `xp`, `cash`, `charisma` phải đi qua `gain({ energy, xp, cash, charisma })`.
   - `energy` kẹp trong `[0, maxEnergy]`.
   - `charisma.pts` cộng điểm và lặp `while (lv < 10 && pts >= chaNeed(lv))` — **thang nghề 10 cấp** (`src/core/career.ts`):
     `CHA_TABLE = [60, 90, 200, 260, 380, 460, 600, 700, 900]` (Lv1→2 … Lv9→10, tổng 3.650). Lv.10 “Ngôi sao MC” là tối đa.
     Danh hiệu: Tân binh, MC tập sự, MC sự kiện, MC tiệc cưới, MC chuyên nghiệp, MC sân khấu lớn, MC Gala, MC truyền hình, MC hạng A, Ngôi sao MC.
   - **Danh tiếng** `state.rep = { avg, n }`: sau mỗi *show* (không tính daily) `avg = n==0 ? showAvg : avg·0.75 + showAvg·0.25`, làm tròn 2 chữ số.
   - **Mở khoá show**: backstage Lv1 · wedding Lv3 · beach Lv5 + ⭐1.6 · gala Lv7 + ⭐2.0 · interview Lv9 + ⭐2.4.
2. **Chi phí vào Show (`startScene`)**:
   - Thứ tự kiểm tra bắt buộc: **Giờ giấc (`blockReason`) → Cấp Charisma (`reqLv`) → Danh tiếng (`minRep`) → Đủ Energy (`20 ⚡`)**.
   - Trừ `20 Energy` ngay lúc vào show (không hoàn lại nếu rời sân khấu giữa chừng). Hoạt động `daily` (`coffee`, `market`) miễn phí Energy.
3. **Phạt đi trễ (`latePenalty`)**:
   - Số phút trễ được chụp **lúc vào cửa** (`stageEntry = { at: now, late }`), không phải lúc kết thúc show.
   - Ân hạn 5 phút đầu (`LATE_GRACE_MIN = 5`). Quá 5 phút trừ `1.2%/phút`, tối đa `50%`:
     $$\text{latePenalty}(\text{late}) = \text{clamp}\big((\text{late} - 5) \times 0.012,\ 0,\ 0.5\big)$$
4. **Phần thưởng cuối Show (`finishScene`)**:
   Với $\text{avg}$ là trung bình sao của mọi lượt trong show (lượt bỏ qua tính 0, thang 0–3):
   $$\begin{aligned}
   \text{mult} &= 0.6 + 0.15 \times \text{avg} \\
   \text{cash} &= \text{round}\Big(\text{round}\big(\text{reward}_{\text{cash}} \cdot (0.8 + 0.1\,\text{avg}) \cdot (1 + \text{bonus}_{\text{cash}})\big) \cdot (1 - \text{latePenalty})\Big) \\
   \text{charisma} &= \text{round}\big(\text{reward}_{\text{cha}} \cdot \text{mult} \cdot k\big), \quad k = \begin{cases} 1 + \text{bonus}_{\text{cha}} & \text{nếu là show} \\ 1 & \text{nếu là daily lần đầu trong ngày} \\ 0.5 & \text{nếu là daily lặp lại trong ngày} \end{cases} \\
   \text{energy} &= \text{round}(\text{reward}_{\text{energy}} \cdot \text{mult}) \quad \text{(chỉ với daily lần đầu trong ngày, còn lại } 0\text{)}
   \end{aligned}$$
5. **Công thức Fluency XP (`StageView.tsx`)** — mọi mức đều nhân $(1 + \text{bonus}_{\text{xp}})$ (trừ hội thoại người đi đường):
   - **Speaking XP** (mỗi khi vượt số sao tốt nhất `prev` của lượt đó, không áp dụng cho `quiz`):
     $$\text{rawSpeakXP} = (\text{stars} - \text{prev}) \times 5 + (\text{prev} === 0\ ?\ 5 : 0)$$
   - **Listening XP** (một lần duy nhất mỗi lượt khi lượt đạt $\ge 1$ sao):
     - $\text{base} = 8$ (`quiz`), hoặc $4 + 2 \times \text{số đáp án}$ (`catch`), hoặc $4$ (thường).
     - Trừ $2$ cho mỗi lần bắt từ hụt / chọn đáp án sai: $\text{afterMistakes} = \max(1, \text{base} - 2 \times \text{mistakes})$.
     - Nhân $2$ nếu người chơi **không bấm "Hiện chữ"** trước khi chấm điểm (`!revealed`).
     - Cộng thêm $+5$ nếu là lượt `quiz` có `reflex` và trả lời kịp trước khi hết giờ.
   - **Luyện từ yếu trong Sổ tay**: $+10$ XP nếu từ đang đỏ (`bad`), $+6$ XP nếu từ đang vàng (`near`).
   - **Người đi đường (`StreetTalk`)**: $+3$ XP cố định (không nhân bonus).

### 2.3. Hệ thống Thời gian & Lịch trình (`src/core/clock.ts`)
- **Đồng hồ không chạy theo thời gian thực (No Realtime Tick)**: Tuyệt đối không cộng phút trong `useFrame` hay `setInterval`. Đồng hồ chỉ tiến khi:
  1. Đi bộ trên bản đồ: $\max(2, \text{round}(\text{số ô} \times 2.5))$ phút (bản đồ 28×28, xa nhất ≈ 24 ô ≈ 60 phút).
  2. Hoàn thành hoạt động: $\text{beginAt} = \max(\text{entry.at}, \text{start})$ với show (đến sớm phải chờ tới giờ diễn), $\text{endAt} = \min(1440, \text{beginAt} + \text{duration})$.
  3. Bấm nút `"⏩ Chờ đến HH:MM"` (`waitUntilMinute`).
- **Ngất xỉu lúc 24:00 (`1440`)**: Khi `clock >= 1440`, nếu đang ở `stage` hoặc đang hiện `ResultModal` thì bật cờ `faintPending = true` và đợi người chơi đóng bảng kết quả mới gọi `sleepDay({ forced: true })` (hồi `60%` Energy, về thẳng `hub`).

### 2.3b. Quy tắc hoạt cảnh 3D
- Mọi làm mượt dùng $a \mathrel{+}= (b-a)\,(1-e^{-k\,dt})$, **không** dùng `lerp(a, b, dt*k)` (khi khung hình giật `dt*k > 2` sẽ phóng đại tới vô cực → nhân vật biến mất).
- Vị trí nhân vật/xe trên bản đồ đọc từ ref trong `useFrame`; không `setState` mỗi frame.
- Nhãn `<Html>` trong cảnh: không dùng `distanceFactor` (nhãn phình to trên khung nhỏ), luôn đặt `zIndexRange` thấp để không đè HUD.

### 2.3c. Nhân vật
- `ClayCharacter3D` = anime chibi: decal mặt đổi texture theo trạng thái (mắt open/closed/happy/wide, mày neutral/up/worried, miệng rest/m/a/e/o/smile); tóc gộp 1 lưới/kiểu tóc; viền = vỏ lộn ngược (`hullMat`), KHÔNG dùng drei `<Outlines>` (không vẽ ra trong bản này).
- `lod="low"` cho nhân vật trên bản đồ (bỏ viền/chi tiết nhỏ).
- `look.vrmUrl` → `VrmCharacter3D` (lazy-load `@pixiv/three-vrm`); danh sách trong `VRM_MODELS` (content.ts).

### 2.4. AudioBus Bán Song Công & Chấm Phát Âm (`src/audio/audioSystem.ts` & `src/core/evaluator.ts`)
- **Half-Duplex bắt buộc**:
  - Máy trạng thái 4 bước: `idle → speaking → arming → listening`.
  - Khi mở Mic (`armMic()`): Huỷ `speechSynthesis.cancel()`, đợi tối đa `1500ms` cho tới khi `speechSynthesis.speaking === false`, sau đó **nghỉ thêm `320ms`** rồi mới gọi `rec.start()`.
  - Sau khi nhả Mic (`releaseMic()`): **Nghỉ `350ms`** trước khi cho phép TTS nói câu tiếp theo.
- **Token huỷ lượt cũ (`attemptRef.current`)**:
  - Mọi thao tác bất đồng bộ trong `StageView.tsx` phải tăng và kiểm tra `++attemptRef.current`. Nếu kết quả STT hoặc hẹn giờ trả về khi `attemptRef.current` đã đổi thì phải bỏ qua ngay lập tức.

---

## 3. DANH SÁCH CÔNG VIỆC ĐỂ AI TIẾP THEO HOÀN THIỆN & NÂNG CẤP (TODO ROADMAP)

Khi bàn giao cho AI tiếp theo, bạn có thể yêu cầu AI thực hiện lần lượt **4 nhóm hạng mục hoàn thiện** sau:

### Hạng mục 1: Mở rộng toàn bộ dữ liệu Nội dung (`src/data/content.ts`)
Hiện tại `src/data/content.ts` đã có đầy đủ cấu trúc 8 NPC, 7 Scene (mỗi scene 4 lượt chuẩn covering đủ 5 chế độ chơi) và 6 câu `STREET_TALK` mẫu. AI tiếp theo có thể:
- [ ] Bổ sung đủ **32 câu `STREET_TALK`** (10 câu A2, 11 câu B1, 11 câu B2) phân bổ theo buổi (`morning`: 27, `afternoon`: 27, `evening`: 27, `night`: 18) từ file gốc nếu muốn kho câu hỏi đường phố phong phú tối đa.
- [ ] Mở rộng số lượt (`turns`) của mỗi show trong `SCENES` từ 4 lượt lên 6–8 lượt như bản đầy đủ, sử dụng danh sách 24 từ chúc phúc `BLESSINGS` cho các lượt `catch` của đám cưới.

### Hạng mục 2: Nâng cấp Model 3D (`.glb` Pipeline & Hiệu ứng Hậu kỳ WebGL)
Hiện tại `ClayCharacter3D.tsx`, `CityWorld3D.tsx`, `HubRoom3D.tsx`, và `Stage3D.tsx` đang dựng bằng **Procedural 3D Clay Meshes** để chạy ngay lập tức không cần file ngoài. AI tiếp theo có thể nâng cấp mỹ thuật 3D lên một tầm cao nữa:
- [x] **Hỗ trợ nạp file `.glb` từ Blender trong `ClayCharacter3D.tsx`** (đã làm trong `src/three/GlbCharacter3D.tsx`; chỉ bật khi `look.glbUrl` có giá trị; tên morph nằm ở `VISEME_MORPH_NAMES` và `BLINK_MORPH_NAMES`):
  - Kiểm tra nếu `look.glbUrl` tồn tại thì dùng `useGLTF(look.glbUrl)` từ `@react-three/drei`.
  - Ánh xạ trực tiếp 5 `viseme` (`a, e, o, m, rest`) và `blinking` vào `mesh.morphTargetInfluences` (BlendShapes) của model `.glb`.
- [~] **Tích hợp `@react-three/postprocessing`** (ĐÃ LÀM: Bloom theo ngưỡng sáng trên `CityWorld3D` và `Stage3D`; CHƯA LÀM: Tilt-shift/DOF, và Selective Bloom thật):
  - Thêm hiệu ứng **Selective Bloom** cho các cửa sổ `.win`, biển hiệu `.sign` trên bản đồ thành phố vào ban đêm và đèn sân khấu ở `Stage3D`.
  - Thêm hiệu ứng **Tilt-Shift / DepthOfField** nhẹ trên `CityWorld3D` để tạo cảm giác sa bàn mô hình thu nhỏ (miniature diorama) chân thực như *Link's Awakening*.
- [x] **Camera Vùng Chết (Dead-Zone Follow) & Nút Định Tâm `🎯` trên `CityWorld3D.tsx`** (đã làm: `CameraFollowRig`, damping, kéo >9px tắt bám, nút 🎯 bật lại):
  - Hiện tại bản đồ dùng `MapControls` cho phép xoay/kéo tự do. Hãy bổ sung cơ chế: mặc định Camera bám theo MC Thiên Ân với độ mượt mũ $k = 1 - e^{-6\,\text{dt}}$ trong vùng chết; khi người chơi kéo 1 ngón (`> 9px`) thì tắt tự bám và hiện nút `🎯` ở góc phải dưới để bấm đưa camera quay về theo dõi MC.

### Hạng mục 3: Nâng cấp "Game Juice" & Vi tương tác UI/UX (`src/components/`)
- [x] **Hiệu ứng Pháo giấy 2 đợt (`confetti`) & Tia sáng xoay ở `ResultModal`** (`src/components/Confetti.tsx`) (`src/components/SheetsAndModals.tsx`):
  - Khi hoàn thành show đạt $\ge 1$ sao, bắn 2 đợt pháo giấy Canvas/CSS và thêm đĩa tia sáng xoay tròn phía sau 3 ngôi sao.
- [x] **Hiệu ứng Rung (`shake`) khi chọn sai** (class `animate-shake` ở Word-Catcher, Quiz, StreetTalk):
  - Thêm animation rung ngang (`animate-shake` 300ms) khi người chơi chạm sai thẻ từ ở lượt `Word-Catcher` hoặc chọn sai đáp án ở lượt `Quiz` / `StreetTalk`.
- [ ] **Tổng hợp đầy đủ tiếng ồn xe cộ & dế kêu bằng Web Audio Nodes trong `Ambience`** (`src/audio/audioSystem.ts`):
  - Bổ sung bộ tạo nhiễu nâu lọc thông thấp (Low-pass Brown Noise) điều biến chậm cho tiếng rì rầm thành phố xa xăm, kèm cổng âm lượng kiểm tra mỗi `200ms` (tự hạ xuống `50%` khi TTS đang nói và `0%` khi Mic đang thu).

---

## 4. CÂU LỆNH MẪU (PROMPT) ĐỂ BẠN GIAO VIỆC CHO AI KHÁC

Bạn chỉ cần copy đoạn Prompt dưới đây và gửi cho AI tiếp theo:

```markdown
Hãy đọc file `mc-life-3d/AI_HANDOVER_SPEC.md` để nắm toàn bộ kiến trúc, quy tắc logic và trạng thái hiện tại của dự án **MC Life · English Stage (3D WebGL Edition)**.

Sau khi đọc xong:
1. Chạy `python3 mc-life-3d/tests/test_core_logic.py` để xác nhận toàn bộ công thức cốt lõi đang pass 100%.
2. Kiểm tra và hoàn thiện lần lượt các mục trong Phần 3 (TODO ROADMAP) của `AI_HANDOVER_SPEC.md` (bắt đầu từ Hạng mục 2: nâng cấp Camera Dead-zone + nút 🎯 trên bản đồ 3D và hiệu ứng Post-Processing / Confetti UI), đảm bảo giữ nguyên 100% các quy tắc bất khả xâm phạm ở Phần 2.
```
