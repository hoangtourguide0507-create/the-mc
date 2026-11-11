// Bài "Nhịp ngắt nghỉ": lời dẫn của MC, dấu / đánh dấu chỗ nên dừng một nhịp.
// Người học đọc cả câu; máy đếm số quãng nghỉ trong bản ghi (checkPauses trong phonology.ts).

export interface RhythmDrill {
  id: string;
  /** Câu có dấu " / " ở các chỗ ngắt. */
  marked: string;
  vi: string;
  tip: string;
}

export const RHYTHM_DRILLS: RhythmDrill[] = [
  { id: 'welcome', marked: 'Ladies and gentlemen, / good evening, / and welcome to the City Theater!', vi: 'Kính thưa quý vị, chào buổi tối, và chào mừng đến Nhà hát Thành phố!', tip: 'Dừng sau lời xưng hô và sau lời chào. Lên giọng ở "City Theater".' },
  { id: 'intro-guest', marked: 'Please join me / in welcoming / Chairwoman Victoria Ashworth!', vi: 'Xin hãy cùng tôi chào đón Chủ tịch Victoria Ashworth!', tip: 'Chỗ dừng trước tên là quan trọng nhất: nó báo cho khán giả chuẩn bị vỗ tay.' },
  { id: 'toast', marked: 'Everyone, / please raise your glasses / to Emma and Liam!', vi: 'Mọi người, xin mời nâng ly chúc mừng Emma và Liam!', tip: 'Dừng sau "Everyone" để cả phòng kịp cầm ly.' },
  { id: 'patience', marked: 'Please bear with me / for just a moment. / Thank you for your patience!', vi: 'Xin vui lòng chờ tôi một chút. Cảm ơn sự kiên nhẫn của quý vị!', tip: 'Hai câu, hai hơi. Đừng nói dính liền khi đang xử lý sự cố.' },
  { id: 'award', marked: 'And the winner / of the Lifetime Service Award / is…', vi: 'Và người nhận Giải thưởng Cống hiến Trọn đời là…', tip: 'Kéo dài chỗ dừng trước "is" để tạo hồi hộp.' },
  { id: 'safety', marked: 'Ladies and gentlemen, / please remain seated. / This is a false alarm, / and there is no danger.', vi: 'Kính thưa quý vị, xin ngồi yên tại chỗ. Đây là báo động giả, không có gì nguy hiểm.', tip: 'Thông báo an toàn: chậm, mỗi ý một nhịp, giọng trầm.' },
  { id: 'first-dance', marked: 'Please turn your attention / to the dance floor / for the first dance / of Emma and Liam!', vi: 'Xin mời hướng về sàn nhảy cho điệu nhảy đầu tiên của Emma và Liam!', tip: 'Chia câu dài thành bốn cụm ý. Mỗi cụm một hơi ngắn.' },
  { id: 'break', marked: 'We will be right back / after this short break. / Stay with us!', vi: 'Chúng tôi sẽ trở lại ngay sau quảng cáo. Đừng đi đâu nhé!', tip: 'Dừng ngắn trước "Stay with us" rồi nói câu đó thật gọn.' },
  { id: 'sponsor', marked: 'A big thank you / to our sponsor, / Greenleaf Energy, / for making tonight possible.', vi: 'Xin gửi lời cảm ơn lớn tới nhà tài trợ Greenleaf Energy, vì đã làm nên đêm nay.', tip: 'Tách tên nhà tài trợ ra bằng hai chỗ dừng để tên được nghe rõ.' },
  { id: 'closing', marked: 'Thank you all / for joining us tonight. / Please travel home safely, / and good night!', vi: 'Cảm ơn tất cả quý vị đã tham dự tối nay. Chúc quý vị về nhà an toàn, và chúc ngủ ngon!', tip: 'Hạ giọng dần qua từng cụm. Câu kết là câu chậm nhất của đêm.' },
];

export const rhythmPauses = (d: RhythmDrill): number => (d.marked.match(/ \/ /g) || []).length;
export const rhythmPlain = (d: RhythmDrill): string => d.marked.replace(/ \/ /g, ' ');
