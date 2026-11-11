# Hướng dẫn làm việc cho dự án MC Life · English Stage (3D)

Đọc file này trước khi sửa code. Tài liệu kỹ thuật chi tiết hơn nằm ở `AI_HANDOVER_SPEC.md` và `README.md`.
Lưu ý: hai file đó còn ghi Vite 5, trong khi repo đang dùng Vite 8 (`package.json`).

## Stack
- Vite 8, React 18, TypeScript 5 (strict), Three.js r169 với `@react-three/fiber` và `drei`, Zustand, Tailwind 3.
- Giao diện và nội dung học viên bằng tiếng Việt, nội dung tiếng Anh cho luyện nói.

## Đang chuyển sang three.js thuần
- Kế hoạch và quy tắc: `docs/VANILLA_THREE_MIGRATION.md`. Đọc trước khi viết code 3D hoặc UI mới.
- Code mới nằm ở `src/engine`, `src/scenes`, `src/ui`, `src/app.ts` và trang `v2.html`.
- Store là `gameStore` trong `src/core/store.ts` (vanilla). Code React cũ dùng `src/core/storeReact.ts`.
- Không thêm tính năng mới vào `src/components` hay các file `.tsx` trong `src/three`.
- Phạm vi mới (2026-11-11): chỉ giữ bài học tiếng Anh và thang nghề. Bỏ thành phố, đồng hồ, năng lượng, tiền, shop, nhân vật 3D và phòng MC 3D. 3D chỉ là nền `StageBackdrop`, nội dung là HTML phủ lên. Không dùng phong cách Ghibli.
- Phong cách: nền sáng là mặc định (giấy ấm, chữ nâu than). Nền tối là tuỳ chọn qua `<html data-theme="dark">`, lưu ở `localStorage['mclife.ui.theme']`. Giao diện dịu mắt cho phiên học dài: không đen trắng tuyệt đối, chữ từ 16px.
- Lộ trình: GĐ1 đến GĐ4 đã xong (GĐ4 mới xong phần cốt lõi). GĐ5 đến GĐ7 chưa làm. Bản React cũ sẽ bị xoá ở GĐ7.

## Lệnh thường dùng
- `npm ci` (cài đặt đúng theo lockfile), `npm run dev`, `npm run build` (gồm `tsc -b` và `vite build`).
- Test, chạy từng cái (danh sách đầy đủ ở `package.json` và `pages.yml`):
  - `npm run test:logic` (Python, `tests/test_core_logic.py`)
  - `npm run test:quests`
  - `npm run test:evaluator`
  - `npm run test:difficulty`
- Ảnh QA: `npm run build && npx vite preview --port 4173 &` rồi `python3 tools/qa_shot.py world hub stage`.
- Có thể mở game với `?qa=1` để truy cập store qua `window.__mc`.

## Quy trình đưa code lên
- **Không push trực tiếp lên `main` khi chưa được người dùng đồng ý rõ ràng.** Mọi thay đổi làm trên nhánh riêng (`fix/...`, `feat/...`, `docs/...`), rồi push nhánh và báo người dùng.
- Push lên `main` sẽ kích hoạt `.github/workflows/pages.yml`: chạy các test, build, rồi deploy lên GitHub Pages (`https://hoangtourguide0507-create.github.io/the-mc/`). Trang chỉ đổi khi `main` đổi.
- Giọng NPC theo quy tắc **"một vai, một giọng"**: mỗi vai dùng clip Kokoro (`public/audio/manifest.kokoro.json`) cho mọi câu, trừ khi vai đó nằm trong `completeRoles` của `public/audio/manifest.json`, tức ElevenLabs đã có clip cho 100% câu của vai. Không trộn hai bộ giọng trong một vai; giọng trình duyệt chỉ là phương án cuối khi câu chưa render. Danh sách câu nằm ở `tools/voice-lines.mjs` (`npm run test:voicelines`). Thêm thoại mới cho một vai sẽ đưa vai đó về Kokoro cho tới khi ElevenLabs render đủ lại.
- `voices.yml` (ElevenLabs) chạy khi push `main` có thay đổi trong `src/data/**`, `tools/voices.config.json`, `tools/render-voices.mjs`, `tools/voice-lines.mjs`, và mỗi tuần một lần. Mỗi lần render lần lượt từng vai, vai gần xong nhất trước. Cần secret `ELEVENLABS_API_KEY`; gói miễn phí có 10.000 credit mỗi tháng. `coach` và `passer` để trống `voiceId` nên luôn dùng Kokoro.
- Push lên `main` (hoặc nhánh `feat/voices-*`) mà có thay đổi trong `src/data/**`, `tools/voices.kokoro.json`, `tools/render-kokoro.py` hoặc `tools/voice-lines.mjs` sẽ kích hoạt `voices-kokoro.yml`: render bằng Kokoro (miễn phí, chạy CPU, không cần khóa API) mọi câu của mọi vai chưa có clip Kokoro. Chạy tại máy: `pip install kokoro-onnx` rồi `npm run voices:kokoro` (cần `ffmpeg`). Kokoro chỉ có giọng Mỹ và Anh, không có giọng Úc.
- Mỗi commit kết thúc bằng dòng `Co-Authored-By:` và `Claude-Session:` theo quy ước của phiên làm việc.

## Lỗi đã gặp và cách xử lý
- `npm ci` có thể lỗi tạm thời: bước tải binary của `onnxruntime-node` bị 504 hoặc timeout. Chạy lại job là thường đủ. Game dùng `device: 'wasm'` nên không cần binary CUDA; có thể đặt `npm_config_onnxruntime_node_install_cuda=skip` để bỏ bước đó (chưa áp dụng vào workflow).
- Trong `src/three/artStyle.ts` có vá shader nội bộ của three.js (`lights_physical_pars_fragment`). Sau mỗi lần nâng `three`, cần kiểm tra vá còn áp dụng: cảnh báo `[artStyle] Không vá được shader` trong console là dấu hiệu lỗi.

## Quy tắc khi sửa code
- **React hooks phải nằm trước mọi câu lệnh `return null` sớm** trong component. Hộp thoại dùng hook `useDialog` (`src/components/useDialog.ts`) để có Esc, bấm nền và thuộc tính trợ năng.
- Màn hình show (`StageView.tsx`): thanh mic ghim ở đáy và nằm ngoài vùng cuộn; HUD thu thành một dải mỏng (`STAGE_TOP_PAD` trong `HUD.tsx`). Đừng đặt nội dung cuộn chung với thanh mic.
- Ba màn hình 3D được `React.lazy` trong `App.tsx`; đừng import tĩnh `three` vào `App.tsx` hay `main.tsx`.
- Nút tương tác phải có `min-h-[44px]` (vùng chạm tối thiểu) nếu chữ nhỏ.
- Chấm lượt đọc theo thẻ và bắt từ là **cộng dồn** (`src/core/retry.ts`, `npm run test:retry`): từ đã đúng ở một lần đọc thì giữ là đúng, điểm không bao giờ tụt; phần còn sai được tách thành một cụm ngắn để đọc riêng (`focusChunk`, `applyChunkAttempt`). Lượt điền ô và ứng biến vẫn chấm từng lần.
- **Giảm dần hỗ trợ** (`src/core/recall.ts`): số lần đã hoàn thành một kịch bản nằm ở `state.learn.exposure`. Lần 1 chơi như kịch bản; lần 2 lượt đọc thẻ/bắt từ thành "tự nói" với gợi ý tiếng Việt và lượt chọn đáp án thành phản xạ nói có đồng hồ; từ lần 3 không còn gợi ý. Lượt tự nói chấm bằng `evaluateRecall` (tỉ lệ từ mang ý của câu mẫu), không dùng `evaluateScripted`.
- **Phòng luyện** (`TrainingSheet.tsx`, nút 🎯 ở phòng MC): Khởi động ôn "cụm mang về" (`src/data/chunks.ts`, hai cụm mỗi kịch bản, hộp Leitner trong `src/core/chunks.ts`); Nhịp ngắt nghỉ (`src/data/rhythm.ts`, `checkPauses` trong `phonology.ts` đếm quãng lặng, chưa kiểm tra vị trí); Năng lực và kiểm tra tuần (`src/core/cando.ts`). Test: `npm run test:learning`, `npm run test:chunks`. Viết kịch bản mới thì phải thêm cụm cho nó trong `chunks.ts`.
- Thêm test cho mọi thay đổi logic trong `src/core/`. Logic chấm điểm nằm ở `evaluator.ts`, mở khoá nội dung nằm ở `difficulty.ts` và `quests.ts`.
- Nội dung theo ngày: ngày 1 dùng kịch bản gốc trong `content.ts`; từ ngày 2 mỗi cảnh xoay vòng qua các **bộ tình huống** trong `src/data/scenarios/<cảnh>.ts` (50 bộ, mỗi bộ là một tình huống khác hẳn), cuối vòng là một ngày bộ sinh (`dailyGen.ts`, `showGen.ts`). Chọn bộ ở `scenarioForDay` trong `content.ts`. Viết bộ mới bằng các hàm `say`, `grab`, `fill`, `pick`, `improv` trong `scenarios/helpers.ts`. Ràng buộc (`npm run test:scenarios`): số lượt bằng kịch bản gốc của cảnh (nhiệm vụ đánh số theo vị trí lượt), từ cần bắt phải có trong câu NPC, câu mẫu phải đạt 3★ với `evaluator.ts`, mỗi bộ có ít nhất 3 kiểu bài.
- **Gói sự kiện** (`src/data/events/`, `npm run test:events`): mỗi thể loại sự kiện là một file tự chứa tình huống, nhân vật, mục tiêu CEFR và 2 cụm mang về (mẫu: `launch.ts`; khai báo ở `index.ts`). Hiện có 12 gói: khai trương, ra mắt sản phẩm, tiệc tất niên, team building, giao lưu thần tượng, thời trang, lễ ký kết, sự kiện quốc tế, hội nghị khách hàng, họp báo, đấu giá từ thiện, lễ trao giải. Nhân vật mới phải có giọng trong `tools/voices.kokoro.json`. Các gói này mới có kịch bản ngày 1, chưa có bộ tình huống xoay vòng theo ngày. Kiểm riêng một file: `node tests/events.test.mjs src/data/events/<tên>.ts`.
- Dữ liệu nội dung: `src/data/content.ts` (scene, shop, lịch, thế giới), `src/data/streetTalkExtra*.ts` (tình huống trò chuyện trên đường), `src/data/pronunciation.ts` (luyện phát âm), `src/data/quests.ts`.

## Hằng số trò chơi quan trọng (`src/core/clock.ts`)
- Một ngày từ 07:00 (`DAY_START = 420`) đến 24:00 (`DAY_END = 1440`).
- Mỗi show tốn 20 năng lượng. Đi ngủ hồi 100%, ngất lúc 24:00 hồi 60%.
- Đến trễ: 5 phút đầu không phạt, sau đó trừ 1,2% mỗi phút, tối đa 50%. Quá 45 phút là lỡ show.
- Tầng tình huống trò chuyện: A2 mở từ Lv 1, B1 từ Lv 3, B2 từ Lv 5 (`src/core/difficulty.ts`).

## Việc chưa làm và nên ưu tiên xem
- Độ khó của luyện phát âm, lượt nói trong show và quiz chưa được phân tầng theo cấp.
- Bộ chấm phát âm: "it"/"its" vẫn được coi là đồng âm (có thể là chủ ý, cần xác nhận).
- Chưa có bước kiểm thử trên trình duyệt thật cho hộp thoại và bố cục sau khi đổi `min-h`.
