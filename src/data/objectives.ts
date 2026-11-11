import { EVENT_OBJECTIVES } from './events';
// Mục tiêu năng lực (can-do) cho từng cảnh, theo khung CEFR.
// Mỗi cảnh có một câu "bạn có thể…" để người học biết buổi này nhằm rèn kỹ năng gì.

export type Cefr = 'A2' | 'B1' | 'B2';

export interface SceneObjective {
  cefr: Cefr;
  can: string;
  canVi: string;
}

/** Số sao trung bình tối thiểu để tính là đạt mục tiêu. */
export const OBJECTIVE_PASS_STARS = 2;

export const SCENE_OBJECTIVES: Record<string, SceneObjective> = {
  coffee: { cefr: 'A2', can: 'Order a drink and a snack, and answer a simple question.', canVi: 'Gọi đồ uống và món nhẹ, rồi trả lời một câu hỏi đơn giản.' },
  market: { cefr: 'A2', can: 'Ask where an item is, understand a promotion, and pay.', canVi: 'Hỏi vị trí món hàng, hiểu khuyến mãi và thanh toán.' },
  backstage: { cefr: 'B1', can: 'Run a sound check and a short welcome with clear pronunciation.', canVi: 'Kiểm tra âm thanh và chào mừng ngắn gọn với phát âm rõ ràng.' },
  wedding: { cefr: 'B1', can: 'Introduce the couple and guide guests through a toast with warm, formal English.', canVi: 'Giới thiệu cô dâu chú rể và dẫn quan khách nâng ly bằng tiếng Anh trang trọng, ấm áp.' },
  beach: { cefr: 'B1', can: 'Handle a changing situation calmly and guide a crowd.', canVi: 'Xử lý tình huống thay đổi một cách bình tĩnh và dẫn dắt đám đông.' },
  gala: { cefr: 'B2', can: 'Recover from an unexpected delay while keeping the audience positive.', canVi: 'Ứng biến khi có sự cố bất ngờ mà vẫn giữ khán giả tích cực.' },
  interview: { cefr: 'B2', can: 'Redirect a conversation and close an interview politely.', canVi: 'Chuyển hướng cuộc trò chuyện và kết thúc phỏng vấn một cách lịch sự.' },
};

Object.assign(SCENE_OBJECTIVES, EVENT_OBJECTIVES);
