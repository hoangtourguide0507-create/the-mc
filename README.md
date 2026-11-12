> **Lưu ý:** tài liệu này mô tả bản React + react-three-fiber cũ, đã bị xoá khỏi repo (2026-11-12). Kiến trúc hiện tại: xem `CLAUDE.md` và `docs/VANILLA_THREE_MIGRATION.md`.

# MC Life · English Stage (3D WebGL Edition)

Phiên bản **3D WebGL (React + Three.js / React Three Fiber + TypeScript + Tailwind CSS)** của **MC Life · English Stage** với phong cách mỹ thuật **Toy-Clay Diorama × Neon Stage Glassmorphism**.

## 🚀 Cách chạy dự án

```bash
cd mc-life-3d
npm install
npm run dev
```

Sau đó mở trình duyệt tại `http://localhost:5173` (hoặc địa chỉ IP LAN hiển thị trên terminal để mở trên Safari iPhone / iPad).

## 🏗️ Kiến trúc thư mục

- [`src/types/game.ts`](src/types/game.ts): Toàn bộ kiểu dữ liệu TypeScript cho State, NPC, Scene, Turn, City Grid, Evaluator và AudioBus.
- [`src/data/content.ts`](src/data/content.ts): Dữ liệu 8 NPC, 7 hoạt động/show (`coffee`, `market`, `backstage`, `wedding`, `beach`, `gala`, `interview`), lịch trình `SCHEDULE`, 8 toà nhà `WORLD_LOCS`, 43 đạo cụ `WORLD_PROPS`, 6 vật phẩm `SHOP` và hội thoại đường phố `STREET_TALK`.
- [`src/core/clock.ts`](src/core/clock.ts): Hệ thống thời gian trong ngày (07:00 → 24:00), kiểm tra giờ mở cửa/đóng cửa/trễ giờ (`sceneStatus`, `blockReason`, `latePenalty`), chu kỳ Sáng/Chiều/Hoàng hôn/Đêm.
- [`src/core/evaluator.ts`](src/core/evaluator.ts): Bộ chấm phát âm `PronunciationEvaluator` (Chuẩn hoá số/giờ/tiền tệ/rút gọn, từ đồng âm, Levenshtein, Metaphone, Soundex, gióng hàng quy hoạch động Needleman–Wunsch hỗ trợ gộp/tách từ, chấm điểm 3 chế độ `scripted`, `semi`, `free`).
- [`src/core/store.ts`](src/core/store.ts): Quản lý trạng thái bằng Zustand, tương thích ngược `localStorage['mclife.v2']`, `deepMerge` với `DEFAULT_STATE`, migration `v1 → v2`, tự động lưu khi `pagehide`/`visibilitychange`, hàm `gain()` duy nhất.
- [`src/audio/audioSystem.ts`](src/audio/audioSystem.ts):
  - `SFX`: Tổng hợp 19 hiệu ứng âm thanh bằng Web Audio API + DynamicsCompressor.
  - `Ambience`: Âm nền thành phố Ngày/Đêm.
  - `AudioBus`: Máy trạng thái bán song công (`idle → speaking → arming → listening`) bảo vệ phiên âm thanh iOS.
  - `Voice`: Phát file giọng ElevenLabs render sẵn (`public/audio/manifest.json`) theo vai (`leo`, `couple:emma`, `coach`, `passer`…); câu chưa có file thì dùng giọng trình duyệt theo accent/giới tính, cao độ và tốc độ giữ nguyên (không bóp méo). Chế độ chậm = `playbackRate 0.8` giữ cao độ. Phát sự kiện `Viseme` (`a, e, o, m, rest`).
  - Giọng NPC: chọn vai trong `tools/voices.config.json`, render bằng `tools/render-voices.mjs` (workflow `.github/workflows/voices.yml`, cần secret `ELEVENLABS_API_KEY`). Mỗi câu chỉ render một lần; chơi lại không tốn credit.
  - `SpeechEngine`: Nhận dạng giọng nói `webkitSpeechRecognition` kèm `mergeChunks` chống lặp từ trên iOS.
- [`src/three/ClayCharacter3D.tsx`](src/three/ClayCharacter3D.tsx): Nhân vật 3D Stylized Clay với trang phục/đạo cụ gắn rời (`goldmic`, `gown`, `inear`), 5 khẩu hình `Viseme` nội suy mượt, chớp mắt tự nhiên (`Blink`) và 4 biểu cảm (`idle`, `listening`, `happy`, `confused`).
- [`src/three/HubRoom3D.tsx`](src/three/HubRoom3D.tsx): Phòng Studio 3D của MC Thiên Ân với cửa sổ đổi màu bầu trời theo giờ và kệ trưng bày nâng cấp 3D.
- [`src/three/CityWorld3D.tsx`](src/three/CityWorld3D.tsx) + [`src/three/city/`](src/three/city/): Sa bàn thành phố 3D 28×28 ô, 3 khu phố (Trung tâm · Phố đêm · Ven biển), 8 toà nhà địa điểm kiến trúc riêng + 20 nhà phụ, công viên đài phun nước, bãi biển, cầu cảng, hải đăng; 10 người đi đường, 12 xe; bản đồ nhỏ; ánh sáng theo buổi.
- [`src/core/career.ts`](src/core/career.ts): Thang nghề 10 cấp + Danh tiếng (sao trung bình) để mở khoá show lớn.
- QA: `npm run build && npx vite preview --port 4173 &` rồi `python3 tools/qa_shot.py world hub stage` (ảnh iPhone 390×844 + iPad 1180×820).
- [`src/three/Stage3D.tsx`](src/three/Stage3D.tsx): 8 bối cảnh sân khấu 3D với đèn Spotlight động, sóng âm 3D Hologram cầu vồng và Camera tự động lia theo người nói.

## Nhân vật anime

- Mặc định: nhân vật anime chibi dựng bằng code — `src/three/ClayCharacter3D.tsx` (mặt decal vẽ tay trong `src/three/anime/faceTextures.ts`, tóc lọn trong `src/three/anime/hair.ts`, tô màu toon + viền).
- Mô hình VRM (VRoid Studio, miễn phí): xuất file `.vrm` → đặt vào `public/vrm/` → điền vào `VRM_MODELS` trong `src/data/content.ts` (ví dụ `mc: 'vrm/mc.vrm'`). Game tự dùng khẩu hình `aa/ee/oh`, chớp mắt `blink`, cảm xúc `happy/surprised/relaxed`, hạ tay khỏi tư thế chữ T và tự đi bộ (`src/three/VrmCharacter3D.tsx`).
- Phong cách đồ hoạ thử nghiệm Ghibli: mở link kèm `?style=ghibli` (tắt: `?style=neon`).
