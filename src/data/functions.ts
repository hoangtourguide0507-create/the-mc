/**
 * Chức năng lời nói của MC: trục thứ hai để chọn bài, bên cạnh thể loại sự kiện.
 * Trò chuyện, Nói dài, Dịch và Văn phong gắn `fn` theo các mã dưới đây (tests/functions.test.mjs kiểm).
 */
export interface SpeechFn {
  id: string;
  label: string;
  /** Người học làm được gì khi vững chức năng này */
  can: string;
}

export const FUNCTIONS: SpeechFn[] = [
  { id: 'open', label: 'Mở màn', can: 'Chào khách, tự giới thiệu, mở chương trình' },
  { id: 'intro', label: 'Giới thiệu, vinh danh', can: 'Giới thiệu diễn giả, công bố giải, mời người lên sân khấu' },
  { id: 'announce', label: 'Thông báo', can: 'Thông báo hậu cần, chuyển phần, điều khiển khán phòng' },
  { id: 'trouble', label: 'Xử lý sự cố', can: 'Xin lỗi, trấn an, báo chậm trễ, từ chối khéo' },
  { id: 'thanks', label: 'Cảm ơn, kêu gọi', can: 'Cảm ơn nhà tài trợ, nâng ly, kêu gọi ủng hộ' },
  { id: 'qa', label: 'Hỏi đáp', can: 'Điều phối câu hỏi, giữ giờ, né câu hỏi khó' },
  { id: 'close', label: 'Bế mạc', can: 'Tổng kết, chúc khách, chào tạm biệt' },
  { id: 'backstage', label: 'Hậu trường', can: 'Phối hợp với kỹ thuật, ban nhạc, nhà hàng, phiên dịch' },
  { id: 'client', label: 'Khách hàng', can: 'Báo giá, nhận yêu cầu, phản biện, nhận góp ý' },
  { id: 'social', label: 'Xã giao', can: 'Bắt chuyện, giải thích phong tục, trò chuyện với khách' },
];

export const FN_BY_ID: Record<string, SpeechFn> = Object.fromEntries(FUNCTIONS.map((f) => [f.id, f]));
