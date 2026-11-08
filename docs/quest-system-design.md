# Thiết kế C: Hệ thống nhiệm vụ (Quest) gắn với học tiếng Anh

Trạng thái: **bản thiết kế, chờ duyệt**. Chưa có code.

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

## 6. Nội dung đề xuất (Chương 1, 2 quest đầu)

| Quest | Mục tiêu | Thưởng |
|---|---|---|
| C1-Q1 Gọi cà phê | `phrase` coffee-0 đạt ≥1★; `phrase` coffee-1 đạt ≥1★ | +10 XP, +5 Cha |
| C1-Q2 Hỏi đường | 2 mục `street` nhóm A2 (st-dir-1 và một mục khác) | +15 XP |

Chương 2 (hậu trường) sẽ dựa vào `backstage` và các mục `phrase` của show đó. Số lượng quest đầy đủ sẽ chốt sau khi bạn duyệt phạm vi nội dung (mục 9).

## 7. Kiểm thử

- Thêm vào `tests/test_core_logic.py`: quest chỉ hoàn thành khi đủ mục tiêu, không hoàn thành hai lần, thưởng đi qua `gain()`, và save cũ (không có `quests`) vẫn load được.
- Kiểm tra tay trên iPhone 390×844 và iPad 1180×820 bằng `tools/qa_shot.py` theo mục QA trong README.

## 8. Các giai đoạn

1. **Dữ liệu & store**: `QuestProgress`, `quests.ts`, `evaluateQuests()`, test logic.
2. **UI**: thẻ nhiệm vụ ở Hub, trang nhiệm vụ trong Sổ tay, toast và thẻ thưởng.
3. **Nội dung**: viết quest Chương 1 và 2 (tiếng Anh + tiếng Việt), thêm `key` và voice cho mẫu câu mới.
4. **Cân bằng**: chỉnh số thưởng sau khi thử.

## 9. Câu hỏi cần bạn quyết

1. **Khối lượng nội dung.** Mục tiêu của bạn là 4–5 giờ chơi mỗi ngày. Hiện có 7 hoạt động (2 hằng ngày, 5 show), mỗi hoạt động 4 lượt, cùng nhiều file `STREET_TALK` bổ sung. Bạn muốn Chương 1–2 (khoảng 10 quest) trước, hay cả game ngay?
2. **Giọng đọc cho câu mới.** Mỗi câu mới cần render giọng qua `voices.yml`, dùng ElevenLabs. Bạn đã ghi là chỉ dùng gói miễn phí. Cần kiểm tra hạn mức trước khi viết nhiều câu, vì nếu hết hạn mức thì câu mới sẽ rơi về giọng trình duyệt.
3. **Thưởng quest có làm lệch kinh tế không.** Mình đề xuất thưởng nhỏ (XP và Cha), không cộng tiền lớn, để không phá cân bằng show.
4. **Quest có bắt buộc không.** Mình đề xuất không bắt buộc: người chơi vẫn dẫn show bình thường, quest chỉ là định hướng.
