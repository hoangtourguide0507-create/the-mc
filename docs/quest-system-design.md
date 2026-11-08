# Thiết kế C: Hệ thống nhiệm vụ (Quest) gắn với học tiếng Anh

Trạng thái: **đã triển khai** (dữ liệu, store, logic thuần, giao diện, test). Mục 6 mô tả nội dung thực tế.

## 1. Mục tiêu

- Người chơi mới biết việc cần làm tiếp theo mà không cần hướng dẫn riêng.
- Mỗi nhiệm vụ ép người chơi luyện đúng các mẫu câu tiếng Anh cụ thể, không chỉ "dẫn show cho xong".
- Giữ nguyên toàn bộ kinh tế và quy tắc thời gian trong `AI_HANDOVER_SPEC.md`. Quest chỉ *thưởng thêm* và *định hướng*, không đổi công thức cũ.
- Phương án B (hướng dẫn từng bước) được gộp vào Chương 1 của quest, nên không làm riêng.

## 2. Khái niệm

- **Chương**: nhóm quest theo khu vực hoặc chủ đề (Chương 1 "Ngày đầu" ở quán Leo, Chương 2 "Hậu trường", …).
- **Quest**: một nhiệm vụ có tên tiếng Anh và tiếng Việt, gồm một hoặc nhiều **mục tiêu**, và phần thưởng.
- **Mục tiêu** (objective) là một trong ba loại:
  - `phrase`: hoàn thành một lượt cụ thể đạt ≥ `minStars` sao. Khóa định danh dùng đúng `phraseId` đang có (`${scene.id}-${turnIdx}`, xem `unlockPhrase`).
  - `show`: dẫn xong một show (`sceneId`) với tổng sao trung bình ≥ `minAvg`.
  - `street`: trả lời đúng một mục `STREET_TALK` (`itemId`).

## 3. Mô hình dữ liệu

Thêm vào `GameState` (mặc định rỗng, đi qua `deepMerge`, nên save cũ vẫn chạy):

```ts
interface QuestProgress {
  active: string[];                 // quest đang làm
  done: Record<string, true>;       // quest đã xong
  objDone: Record<string, true>;    // key dạng `${questId}#${i}`
}
// GameState.quests: QuestProgress
```

Quest định nghĩa trong `src/data/quests.ts` (tĩnh, không lưu vào save):

```ts
interface QuestDef {
  id: string;            // 'c1-q1'
  chapter: string;
  title: { en: string; vi: string };
  objectives: Objective[];
  reward: { xp?: number; cash?: number; charisma?: number };
  unlockAfter?: string;  // id quest tiên quyết
}
```

## 4. Luồng xử lý

1. `finishScene` và `markStreetTalkUsed` gọi một hàm mới `evaluateQuests()`.
2. `evaluateQuests()` đọc `stats.bestStars`, `learned`, `streetTalkDoneIds`, và duyệt các mục tiêu chưa xong.
3. Mục tiêu nào đạt thì ghi vào `objDone`. Khi đủ mục tiêu của một quest, quest chuyển sang `done` và phát thưởng.
4. Phần thưởng đi qua `gain({ xp, cash, charisma })` duy nhất, đúng quy tắc 2.1 của spec. Không cộng trực tiếp vào state.
5. Mở quest kế tiếp khi quest tiên quyết xong. Quest không bao giờ khóa show nào: lịch show và điều kiện Lv/Danh tiếng giữ nguyên.

## 5. Giao diện

- **Thẻ "Nhiệm vụ hôm nay"** ở đầu Hub, thay cho dòng "Mục tiêu" đã đề xuất ở B. Hiện quest đang làm và mục tiêu còn thiếu, ví dụ "Gọi cà phê: 1/3 lượt đạt ≥1★".
- **Trang Nhiệm vụ** mở từ Sổ tay (tab mới), liệt kê chương và trạng thái.
- **Toast** khi hoàn thành mục tiêu, và **thẻ thưởng** khi xong quest (dùng lại `Confetti`).
- Trên lượt diễn, nếu mẫu câu đang luyện thuộc một quest, hiện nhãn "Nhiệm vụ: …" ở góc.

## 6. Nội dung đã triển khai

Nội dung nằm trong `src/data/quests.ts`, chỉ đọc từ `content.ts`, không thêm thoại mới nên không tốn credit ElevenLabs.

| Chương | Quest | Mục tiêu |
|---|---|---|
| 1 · Ngày đầu tiên | Luyện mẫu câu Morning Coffee Run, Supermarket | mọi lượt đạt ≥1★ |
| 1 | Lên sân khấu lần đầu (Backstage) | mẫu câu backstage + show ≥1★ |
| 2 · Lên sân khấu | Tiệc cưới, Ven biển | mẫu câu + show ≥2★ |
| 3 · Đêm tiệc lớn | Gala, Phỏng vấn | mẫu câu + show ≥2★ |
| 4 · Đường phố | Trò chuyện với 5 / 15 / 30 người đi đường | đếm số `STREET_TALK` đã trả lời |
| 5 · Ngôi sao MC | Dẫn đủ 5 show với trung bình 3★ | show ≥3★ |

Thưởng: quest +10 đến +30 XP và +3 đến +15 Charisma tùy quest; chương +25 đến +60 XP. Mọi khoản đi qua `gain()`.

## 7. Kiểm thử

- Thêm vào `tests/test_core_logic.py`: quest chỉ hoàn thành khi đủ mục tiêu, không hoàn thành hai lần, thưởng đi qua `gain()`, và save cũ (không có `quests`) vẫn load được.
- Kiểm tra tay trên iPhone 390×844 và iPad 1180×820 bằng `tools/qa_shot.py` theo mục QA trong README.

## 8. Các giai đoạn

1. **Dữ liệu & store**: `QuestProgress`, `quests.ts`, `evaluateQuests()`, test logic.
2. **UI**: thẻ nhiệm vụ ở Hub, trang nhiệm vụ trong Sổ tay, toast và thẻ thưởng.
3. **Nội dung**: viết quest Chương 1 và 2 (tiếng Anh + tiếng Việt), thêm `key` và voice cho mẫu câu mới.
4. **Cân bằng**: chỉnh số thưởng sau khi thử.

## 9. Quyết định đã chốt

1. **Phạm vi nội dung: làm cả game ngay.** Quest phủ toàn bộ 7 hoạt động và toàn bộ `STREET_TALK`, không làm từng chương. Vì vậy các giai đoạn ở mục 8 được làm theo lô: dữ liệu và store trước, rồi nội dung cho toàn bộ quest, rồi mới đến giao diện đầy đủ.
2. **Giọng đọc: dùng các giọng đã có, không cần giọng mới.** `tools/voices.config.json` đã gán sẵn giọng ElevenLabs cho từng vai (leo, ivy, victoria, couple:emma, couple:liam, alex, sam, tom…). Câu mới chỉ cần đúng vai là được render. Ràng buộc thực tế:
   - Việc render chạy trong GitHub Actions (`voices.yml`) và cần secret `ELEVENLABS_API_KEY`. Mình không có khóa này, nên không tự render được. Bạn cần chạy workflow sau khi merge, hoặc đưa khóa để mình chạy `--dry-run` trước.
   - Mỗi lần chạy có giới hạn `maxCharsPerRun: 5200` ký tự. Với toàn bộ game, việc render sẽ cần nhiều lần chạy. Hãy kiểm tra hạn mức gói miễn phí trước khi render lô lớn.
   - Vai không có `voiceId` sẽ dùng giọng trình duyệt, nên không bị lỗi nhưng kém tự nhiên.
3. **Mức thưởng (quyết định của mình):**
   - Mỗi quest: +10 XP và +5 Charisma. Không cộng tiền.
   - Mỗi chương xong: +25 XP.
   - Không thưởng Energy, vì Energy là tài nguyên giới hạn của show. Mức này nhỏ hơn một lượt show đạt 3★, nên không làm lệch kinh tế hiện có.
4. **Quest là tùy chọn.** Người chơi vẫn dẫn show bình thường. Quest chỉ định hướng và thưởng thêm.
