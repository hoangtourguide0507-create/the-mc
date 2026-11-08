# Đặc tả: Thành phố kiểu The Sims (bản đồ + đồng hồ trong ngày)

Mục tiêu: người chơi rời phòng MC, **đi bộ trên bản đồ thành phố isometric**, tới đúng địa điểm, đúng giờ để dẫn show. Một ngày trong game có giờ giấc thật (07:00 → 24:00); về nhà đi ngủ để sang ngày mới.

Các phần giữ chỗ `[STUB · owner: …]` đã có sẵn trong `index.html` — **mỗi agent chỉ thay stub của mình và giữ nguyên tên/hợp đồng dưới đây**. Không sửa stub của agent khác.

## 1. Địa điểm (world-map định nghĩa `WORLD_LOCS` trong `9b. WORLD MAP`)
| locId | Tên hiển thị | Hoạt động (scene id) | building id (WORLD_ART) |
|---|---|---|---|
| `home` | Nhà MC Thiên Ân | về Hub (`goTo('hub')`), đi ngủ | `home` |
| `cafe` | Quán cà phê | `coffee` | `cafe` |
| `market` | Siêu thị | `market` | `market` |
| `theater` | Nhà hát (hậu trường) | `backstage` | `theater` |
| `wedding` | Nhà hàng tiệc cưới | `wedding` | `wedding` |
| `hotel` | Khách sạn Gala | `gala` | `hotel` |
| `beach` | Bãi biển | `beach` | `beach` |
| `tv` | Đài truyền hình | `interview` | `tv` |

## 2. `WORLD_ART` — owner **character-artist** (section `5. ART`, ngay trước `5b. CLAY NPC`)
- `WORLD_ART.building(id) → string` SVG `viewBox="0 0 240 260"`. Hệ isometric 2:1. Chân đế chiếm **2×2 ô** = hình thoi top(120,140) · right(240,200) · bottom(120,260) · left(0,200). Toà nhà mọc lên phía trên, không vượt ra ngoài viewBox.
  - Cửa sổ có `class="win"` (world-map bật sáng ban đêm bằng CSS `.wm-night .win { fill: … }`), biển hiệu neon `class="sign"`.
  - Mỗi toà nhà nhận diện được ngay: quán cà phê có ly/biển cà phê, siêu thị có xe đẩy/mái hiên, nhà hát có rèm đỏ/đèn, nhà hàng cưới có cổng hoa, khách sạn cao tầng có sao, bãi biển có chòi lá + cát + nước, đài truyền hình có ăng-ten/chữ ON AIR, nhà MC có ban công + biển "MC Thiên Ân".
  - ID trong SVG duy nhất theo `id` toà nhà (vd `wa-cafe-…`).
- `WORLD_ART.prop(kind) → string` SVG `viewBox="0 0 60 80"`, chạm đất tại (30,78). kind: `tree`, `palm`, `lamp`, `bench`, `bush`, `car` (car nhận thêm tham số màu: `prop('car', '#FF4FD8')`), `hydrant`.
- `WORLD_ART.tile(kind) → string` SVG `viewBox="0 0 120 60"` một ô nền hình thoi (top 60,0 · right 120,30 · bottom 60,60 · left 0,30): `grass`, `road`, `road-x` (ngã tư), `plaza`, `sand`, `water`. Đường có vạch kẻ; nước/cát cho bãi biển.
- `WORLD_ART.passerLooks` — mảng ≥ 8 object `look` (định dạng `look` của NPC, dùng với `npcSVG({ key, look })`), đa dạng người đi đường Việt Nam/quốc tế.
- Phong cách: Neon Stage × Glass ban đêm / pastel ấm ban ngày; cạnh tối bên phải, sáng bên trái (ánh sáng từ trái-trên).

## 3. `Clock`, `SCHEDULE` — owner **game-systems** (section `10c. CLOCK`)
- `state.clock` (phút từ 00:00, mặc định 420 = 07:00 khi bắt đầu ngày), `state.loc` (locId hiện tại, mặc định `'home'`), `state.doneToday` (`{ sceneId: true }`, reset khi sang ngày). Thêm vào `DEFAULT_STATE`.
- `Clock.now()`, `Clock.label(m?) → "HH:MM"`, `Clock.period(m?) → 'morning'|'afternoon'|'evening'|'night'`.
- `Clock.advance(min)` cộng giờ, lưu, phát `document.dispatchEvent(new CustomEvent('clock', { detail: { now } }))`. Chạm 24:00 → tự ngất xỉu về nhà ngủ (`Clock.sleep({ forced: true })`).
- `Clock.travelMinutes(tiles)` thời gian đi bộ (≈ 3–4 phút/ô).
- `Clock.sceneStatus(sceneId) → { state: 'closed'|'early'|'open'|'late'|'missed'|'done', minutesLate, label }` dựa trên `SCHEDULE` (show có giờ `start`, mở cửa từ `start − 60`, trễ tối đa 45 phút rồi `missed`; daily có `open/close`). `label` là chuỗi tiếng Việt ngắn (vd "Mở cửa đến 11:00", "Bắt đầu 18:30 · còn 1g20", "Trễ 15 phút", "Đã lỡ show").
- Luật: show chỉ nhận **1 lần/ngày** (`doneToday`); daily lặp được nhưng chỉ hồi năng lượng lần đầu trong ngày. Đến trễ → cát-xê giảm theo phút trễ (tối đa −50%). Dẫn show tốn thời gian `sc.duration` (mặc định show 90′, daily 30′) — cộng khi kết thúc.
- `Clock.sleep({ forced })`: sang ngày mới (`state.day++`, `dayDate = dayKey()`), `clock = 420`, hồi năng lượng đầy (forced: chỉ hồi 60%), `doneToday = {}`, `loc = 'home'`, gọi `renderHUD()` và phát sự kiện `clock`.
- Giữ luật đã có: mở app trong cùng ngày thật → tiếp tục ngày cũ; sang ngày thật mới mà chưa ngủ → tự bắt đầu ngày mới (07:00).

## 4. `STREET_TALK` — owner **lesson-content** (section `6. NỘI DUNG`, cuối khu vực)
- Mảng ≥ 24 mục: `{ id, level: 'A2'|'B1'|'B2', loc: locId|null, prompt: { en, vi }, options: [ { en, vi, ok: true|false, why? } ×3 ] }` — đúng **1** option `ok: true`, `why` (tiếng Việt) giải thích vì sao sai.
- Chủ đề: hỏi đường, small talk, khen/hỏi về nghề MC, mời dẫn tiệc, gặp fan, khách nước ngoài ở khách sạn/bãi biển, nhân viên quán. `loc` gắn mục với địa điểm gần đó (null = ở đâu cũng được).
- Câu ngắn (≤ 18 từ), tự nhiên, lịch sự.

## 5. Âm thanh — owner **audio-speech** (section `2. SFX ENGINE`)
- Thêm vào `SFX.sounds`: `step` (bước chân nhẹ), `door` (chuông cửa khi vào toà nhà), `tick` (tíc đồng hồ khi nhảy giờ), `night` (chuông chuyển tối), `chat` (bong bóng thoại bật lên), `sleep` (giai điệu ru ngắn).
- `Ambience.start('day'|'night')` / `Ambience.stop()` — âm nền phố tổng hợp bằng Web Audio (tiếng xe xa, chim ban ngày, côn trùng ban đêm), rất nhỏ, tắt khi `state.muted`, tự dừng khi `AudioBus` đang thu mic. Không dùng file ngoài.

## 6. World map — owner **world-map** (section `9b. WORLD MAP`, view `#view-world`, CSS tiền tố `.wm-`)
- `World.open({ target?: locId, enter?: sceneId })`: chuyển sang view world; nếu có `target` thì tự đi tới đó (và mở thẻ vào cửa / vào thẳng `enter`).
- `World.travelTo(locId, opts)` công khai cho Hub dùng.
- Bản đồ isometric ≈ 14×14 ô, đường phố lưới, toà nhà 2×2 ô đặt cạnh đường, cây/đèn/ghế, xe chạy trên đường (vài chiếc), người đi đường ≤ 6 (dùng `WORLD_ART.passerLooks` + `npcSVG`), trời ngày/đêm theo `Clock.period()` (lớp `.wm-night` / `.wm-evening`).
- MC (dùng `playerLook({ prop: false })` + `npcSVG`) đi theo đường ngắn nhất (BFS/A* trên ô đường), animation bước + `SFX.play('step')`, camera bám theo; kéo một ngón để xem bản đồ; chạm toà nhà → đi tới cửa; tới nơi → thẻ kính "Vào [tên]" liệt kê hoạt động + `Clock.sceneStatus` (nút bị khoá nếu closed/missed/done hoặc thiếu Charisma/năng lượng). Đi bộ gọi `Clock.advance(Clock.travelMinutes(số ô))`.
- Vào hoạt động: `startScene(sceneId, el, { returnTo: 'world' })` (hook `returnTo` đã có sẵn). Vào `home` → `goTo('hub')`.
- Chạm người đi đường → bong bóng hội thoại kính: đọc `prompt.en` bằng `Voice` (giọng ngẫu nhiên), hiện 3 lựa chọn; đúng → +Fluency XP nhỏ (`gain({ xp: 3 })`) + `SFX.play('correct')`; sai → hiện `why`. Mỗi người chỉ bắt chuyện 1 lần.
- Thanh trên của bản đồ: đồng hồ (`Clock.label()` + biểu tượng buổi), tên địa điểm gần nhất, nút 🏠 về nhà. `Ambience.start(...)` khi vào bản đồ, `stop()` khi rời.
- Hiệu năng iPhone: transform + rAF, không reflow mỗi khung hình, SVG tĩnh render 1 lần.

## 7. Hub — owner **ui-designer**
- Nút lớn **"🗺️ Ra phố"** trong Hub (nổi bật, neon) → `World.open()`.
- Viên đồng hồ trong header phòng: `Clock.label()` + icon buổi, cập nhật khi có sự kiện `clock`.
- Nút **"🌙 Đi ngủ"** ở phòng (chỉ bật từ 18:00 hoặc khi năng lượng < 30) → hỏi xác nhận → `Clock.sleep()`; hiệu ứng màn tối + `SFX.play('sleep')`.
- Poster lịch show & 2 nút Coffee/Supermarket: thay vì vào thẳng show, gọi `World.open({ target: <locId>, enter: <sceneId> })`; hiện thêm `Clock.sceneStatus(id).label` trên poster.
- Không sửa nội dung `9b`, `10c`, `WORLD_ART`, `STREET_TALK`, âm thanh.

## Quy tắc chung
- Mỗi agent làm trên worktree riêng, **commit vào nhánh của worktree, không push**. Người điều phối gộp và giao `qa-release` phát hành.
- Chạy `node --check` (xem `.claude/qa/README.md`) và `.claude/qa/snap.py` trước khi báo xong. Không để lỗi JS.
- Trong lúc làm, stub của agent khác vẫn chạy được (placeholder) — code phải chạy đúng cả khi phần của người khác chưa hoàn thiện.
