// Mức hỗ trợ tiếng Việt theo khung CEFR. Người mới được hỗ trợ đầy đủ; càng lên cao càng giảm
// để người học tự dựa vào tiếng Anh. Quyết định nằm ở một chỗ để giao diện và test cùng dùng.
import type { Cefr } from '../data/objectives';

export interface ViSupport {
  /** Nút "Dịch" cho câu NPC có hiện không. */
  npcToggle: boolean;
  /** Bản dịch câu trả lời gợi ý (cueVi, semi frame) có hiện không. */
  cueVi: boolean;
  /** Dòng nhiệm vụ tiếng Việt (taskVi) có hiện không. */
  taskVi: boolean;
  /** Mẹo của huấn luyện viên (tip) có hiện không. */
  tip: boolean;
}

export function viSupport(cefr: Cefr | undefined): ViSupport {
  switch (cefr) {
    case 'B1':
      return { npcToggle: true, cueVi: false, taskVi: false, tip: true };
    case 'B2':
      return { npcToggle: false, cueVi: false, taskVi: false, tip: false };
    case 'A2':
    default:
      return { npcToggle: true, cueVi: true, taskVi: true, tip: true };
  }
}
