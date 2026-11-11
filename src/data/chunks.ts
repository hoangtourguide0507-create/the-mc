// "Cụm mang về": mỗi kịch bản chốt hai cụm dùng lại được trong nhiều ngữ cảnh.
// Mỗi dòng: [cụm tiếng Anh, nghĩa tiếng Việt, tình huống MỚI để dùng cụm (tiếng Việt), câu mẫu].
// Cụm phải xuất hiện trong câu trả lời của kịch bản đó, và câu mẫu phải chứa cụm
// (tests/chunks.test.mjs kiểm tra). Khóa: id tình huống, hoặc "<cảnh>:base" cho kịch bản ngày 1.

import { EVENT_CHUNKS } from './events';

export interface Chunk {
  id: string;
  en: string;
  vi: string;
  /** Tình huống khác với kịch bản gốc, để người học mang cụm sang ngữ cảnh mới. */
  useVi: string;
  sample: string;
}

type Row = [en: string, vi: string, useVi: string, sample: string];

const RAW: Record<string, Row[]> = {
  // ── Quán cà phê ──
  'coffee:base': [
    ['Could I get', 'Cho tôi xin / cho tôi gọi', 'Ở khách sạn, bạn xin thêm một cái gối.', 'Could I get an extra pillow for my room, please?'],
    ['Have a wonderful', 'Chúc bạn một … tuyệt vời', 'Kết thúc cuộc gọi với khách hàng vào chiều thứ Sáu.', 'Thank you for your time. Have a wonderful weekend!'],
  ],
  'coffee-wrong-order': [
    ['I think there is a mistake', 'Tôi nghĩ có nhầm lẫn', 'Hóa đơn nhà hàng tính thừa một món.', 'Excuse me, I think there is a mistake on our bill.'],
    ['Thank you for fixing it', 'Cảm ơn đã sửa lại giúp', 'Kỹ thuật viên vừa chỉnh xong micro cho bạn.', 'The sound is clear now. Thank you for fixing it so quickly.'],
  ],
  'coffee-sold-out': [
    ['What else do you recommend', 'Bạn gợi ý món nào khác', 'Nhà hàng hết món cá bạn định gọi.', 'No fish today? What else do you recommend for dinner?'],
    ['let me ask', 'để tôi hỏi', 'Khách hỏi giờ xe đưa đón mà bạn không chắc.', 'I am not sure about the shuttle, but let me ask the driver.'],
  ],
  'coffee-loyalty': [
    ['I have never tried', 'Tôi chưa từng thử', 'Bạn bè rủ đi lướt sóng lần đầu.', 'I have never tried surfing, but it looks like fun.'],
    ['What does it taste like', 'Vị của nó thế nào', 'Ở chợ, bạn hỏi về một loại trái cây lạ.', 'I have not seen this fruit before. What does it taste like?'],
  ],
  'coffee-old-friend': [
    ['How have you been', 'Dạo này bạn thế nào', 'Gặp lại một khách hàng cũ ở sự kiện.', 'It is great to see you again! How have you been?'],
    ['Let me check my calendar', 'Để tôi xem lịch', 'Có người mời bạn dẫn tiệc công ty tháng sau.', 'That sounds interesting. Let me check my calendar and call you back.'],
  ],
  'coffee-work-table': [
    ['Is there a', 'Có … nào không', 'Bạn tìm chỗ sạc điện thoại ở sân bay.', 'Excuse me, is there a place where I can charge my phone?'],
    ['please have a seat', 'mời ngồi', 'Khách mời tới phòng chờ trước giờ lên sóng.', 'Welcome to the studio. Please have a seat while we get ready.'],
  ],
  'coffee-crew-order': [
    ['I need to order', 'Tôi cần đặt', 'Gọi điện đặt hoa cho sân khấu.', 'Hello, I need to order flowers for an event on Saturday.'],
    ['No need to', 'Không cần phải', 'Đồng nghiệp định in lại cả kịch bản vì một lỗi nhỏ.', 'No need to print it again. I will fix it by hand.'],
  ],
  'coffee-spill': [
    ['I am so sorry', 'Tôi rất xin lỗi', 'Bạn đến buổi tổng duyệt trễ mười phút.', 'I am so sorry I am late. The traffic was terrible.'],
    ['You are a lifesaver', 'Bạn đúng là cứu tinh', 'Đồng nghiệp mang tới bộ pin dự phòng đúng lúc.', 'You brought spare batteries? You are a lifesaver!'],
  ],
  'coffee-sore-throat': [
    ['I have a sore throat', 'Tôi bị đau họng', 'Bạn xin đạo diễn cho nghỉ nói trong buổi tập.', 'I have a sore throat today, so I will speak quietly in rehearsal.'],
    ['Thank you for the advice', 'Cảm ơn lời khuyên', 'Một MC lâu năm góp ý cho bạn sau show.', 'Thank you for the advice. I will slow down next time.'],
  ],

  // ── Siêu thị ──
  'market:base': [
    ['can I find', 'tôi tìm … ở đâu', 'Ở hội trường lạ, bạn tìm phòng thay đồ.', 'Excuse me, where can I find the dressing room?'],
    ['Thank you for your help', 'Cảm ơn bạn đã giúp', 'Nhân viên khách sạn vừa mang hành lý lên giúp.', 'Thank you for your help with my bags today.'],
  ],
  'market-return': [
    ['I would like to return', 'Tôi muốn trả lại', 'Chiếc áo vest bạn mua bị chật.', 'I would like to return this jacket. It is too small.'],
    ['I would prefer to', 'Tôi muốn … hơn', 'Được hỏi muốn tập buổi sáng hay buổi chiều.', 'I would prefer to rehearse in the morning, if possible.'],
  ],
  'market-self-checkout': [
    ['will not', 'không chịu (hoạt động)', 'Bộ điều khiển trình chiếu không bấm được.', 'The remote will not change the slides. Can you help?'],
    ['Could I have a receipt', 'Cho tôi xin hóa đơn', 'Trả tiền taxi và cần hóa đơn để thanh toán công tác.', 'Could I have a receipt for the taxi, please?'],
  ],
  'market-recipe-help': [
    ['I do not know what I need', 'Tôi không biết mình cần gì', 'Lần đầu thuê thiết bị âm thanh.', 'I want to rent a sound system, but I do not know what I need.'],
    ['could you cut it for me', 'bạn cắt giúp tôi được không', 'Ở tiệm bánh, bạn mua một ổ bánh mì dài.', 'It is too long for my bag. Could you cut it for me, please?'],
  ],
  'market-price-check': [
    ['I think the price is wrong', 'Tôi nghĩ giá bị sai', 'Giá vé trên máy khác với giá trên trang web.', 'Excuse me, I think the price is wrong. The website said twenty dollars.'],
    ['No problem at all', 'Không có vấn đề gì cả', 'Khách xin lỗi vì đổi giờ họp vào phút chót.', 'No problem at all. Three o\'clock works for me too.'],
  ],
  'market-lost-child': [
    ['Do not worry, I will help you', 'Đừng lo, tôi sẽ giúp bạn', 'Một vị khách lạc đường trong khách sạn lớn.', 'Do not worry, I will help you find the ballroom.'],
    ['make an announcement', 'phát thông báo', 'Có xe đỗ chắn lối ra, bạn nhờ lễ tân.', 'Could you make an announcement about the white car at the gate?'],
  ],
  'market-closing-time': [
    ['Where can I find', 'Tôi tìm … ở đâu', 'Tại sảnh sự kiện, bạn tìm bàn đăng ký.', 'Good morning. Where can I find the registration desk?'],
    ['I am in a hurry', 'Tôi đang vội', 'Bạn nhờ tài xế chạy nhanh hơn một chút.', 'I am in a hurry because my show starts in twenty minutes.'],
  ],
  'market-gift': [
    ['I am looking for', 'Tôi đang tìm', 'Vào cửa hàng tìm một chiếc cà vạt màu xanh.', 'Hello, I am looking for a dark blue tie for a wedding.'],
    ['as well', 'nữa / thêm vào đó', 'Gọi thêm nước khi đã gọi món chính.', 'I will have the chicken, and a bottle of water as well.'],
  ],
  'market-allergy': [
    ['could you tell me what is in it', 'cho tôi hỏi trong đó có gì', 'Phục vụ mời bạn một ly cocktail đặc biệt.', 'It looks great, but could you tell me what is in it first?'],
    ['I think you will like', 'Tôi nghĩ bạn sẽ thích', 'Giới thiệu một quán ăn Việt cho khách nước ngoài.', 'Try the noodle shop on the corner. I think you will like it.'],
  ],

  // ── Hậu trường ──
  'backstage:base': [
    ['how does', '… nghe/trông thế nào', 'Bạn thử trang phục và hỏi ý kiến stylist.', 'I changed the tie. How does it look from the front?'],
    ['Please take your seats', 'Xin mời an tọa', 'Hội nghị sắp bắt đầu phiên buổi chiều.', 'Please take your seats. The afternoon session begins in two minutes.'],
  ],
  'backstage-mic-failure': [
    ['please bear with me', 'xin vui lòng chờ tôi một chút', 'Máy chiếu chưa lên hình khi bạn đang thuyết trình.', 'Please bear with me while I restart the projector.'],
    ['Thank you for your patience', 'Cảm ơn sự kiên nhẫn của quý vị', 'Chuyến xe đưa khách tới trễ mười lăm phút.', 'The bus is here now. Thank you for your patience, everyone.'],
  ],
  'backstage-schedule-change': [
    ['the running order', 'thứ tự chương trình', 'Bạn xin đạo diễn bản chương trình mới nhất.', 'Could you send me the running order before lunch?'],
    ['please welcome', 'xin chào đón', 'Giới thiệu ban nhạc trong tiệc công ty.', 'To start the party, please welcome our band for tonight!'],
  ],
  'backstage-name-check': [
    ['Could you help me with', 'Bạn giúp tôi … được không', 'Bạn chưa biết cài micro cài áo.', 'Could you help me with this clip-on microphone?'],
    ['please join me in', 'xin hãy cùng tôi', 'Chúc mừng đội thắng giải cuối năm.', 'Ladies and gentlemen, please join me in congratulating our sales team!'],
  ],
  'backstage-lighting-cues': [
    ['move on to', 'chuyển sang', 'Hết giờ phần hỏi đáp trong hội thảo.', 'Thank you for your questions. Let us move on to the final topic.'],
    ['Please stay in your seats', 'Xin quý vị ngồi yên tại chỗ', 'Máy bay sắp hạ cánh, bạn nhắc đoàn khách.', 'Please stay in your seats until the plane stops completely.'],
  ],
  'backstage-timing': [
    ['go straight to', 'vào thẳng / đi thẳng tới', 'Cuộc họp trễ giờ, bạn đề nghị bỏ phần giới thiệu.', 'We are short of time, so let us go straight to the main point.'],
    ['A big thank you to', 'Xin gửi lời cảm ơn lớn tới', 'Cuối sự kiện, bạn cảm ơn đội tình nguyện viên.', 'A big thank you to our volunteers, who worked all weekend.'],
  ],
  'backstage-nervous-speaker': [
    ['That is completely normal', 'Chuyện đó hoàn toàn bình thường', 'Cô dâu lo lắng trước giờ làm lễ.', 'You feel nervous? That is completely normal on your wedding day.'],
    ['We are good to go', 'Chúng ta sẵn sàng rồi', 'Đạo diễn hỏi đội hình đã đủ chưa.', 'Everyone is in position. We are good to go.'],
  ],
  'backstage-walkthrough': [
    ['Thanks for the warning', 'Cảm ơn đã nhắc trước', 'Đồng nghiệp báo đường tới hội trường đang kẹt xe.', 'Thanks for the warning. I will leave thirty minutes earlier.'],
    ['Thank you all for joining us', 'Cảm ơn tất cả quý vị đã tham dự cùng chúng tôi', 'Kết thúc một buổi hội thảo trực tuyến.', 'Thank you all for joining us online today. See you next month!'],
  ],

  // ── Tiệc cưới ──
  'wedding:base': [
    ['please rise', 'xin mời đứng dậy', 'Lễ chào cờ mở đầu một sự kiện.', 'Ladies and gentlemen, please rise for the national anthem.'],
    ['please raise your glasses', 'xin mời nâng ly', 'Tiệc mừng thọ của một người ông.', 'Everyone, please raise your glasses to Grandpa on his eightieth birthday!'],
  ],
  'wedding-rings-missing': [
    ['Stay calm', 'Bình tĩnh nào', 'Đồng nghiệp hoảng vì mất file trình chiếu.', 'Stay calm. I have a copy of the slides on my phone.'],
    ['in just a moment', 'chỉ trong giây lát nữa', 'Khán giả đang chờ tiết mục kế tiếp.', 'Our next speaker will be with you in just a moment.'],
  ],
  'wedding-speeches': [
    ['Speak from the heart', 'Hãy nói từ trái tim', 'Bạn thân nhờ góp ý cho bài phát biểu chia tay.', 'Do not read every line. Speak from the heart.'],
    ['Thank you for those beautiful words', 'Cảm ơn những lời thật đẹp đó', 'Sau bài phát biểu của vị khách danh dự.', 'Thank you for those beautiful words, Chairwoman. We are truly inspired.'],
  ],
  'wedding-first-dance': [
    ['let me tell you', 'để tôi kể quý vị nghe', 'Lấp thời gian khi diễn giả chưa lên kịp.', 'While we wait, let me tell you a little about tonight\'s speaker.'],
    ['please turn your attention to', 'xin mời hướng sự chú ý về', 'Sắp chiếu video kỷ niệm của công ty.', 'Ladies and gentlemen, please turn your attention to the screen for a short film.'],
  ],
  'wedding-cake-cutting': [
    ['Please keep the path clear', 'Xin để trống lối đi', 'Đội phục vụ sắp đẩy xe đồ ăn vào sảnh.', 'Please keep the path clear for our waiters.'],
    ['count with me', 'cùng đếm với tôi', 'Đếm ngược đón năm mới tại tiệc.', 'Everyone, count with me: ten, nine, eight!'],
  ],
  'wedding-bouquet-games': [
    ['may I offer you a seat', 'tôi mời bà/ông ngồi nhé', 'Một vị khách lớn tuổi đứng chờ ở sảnh.', 'Sir, may I offer you a seat while you wait?'],
    ['On the count of three', 'Đếm tới ba thì', 'Chụp ảnh tập thể cho cả công ty.', 'On the count of three, everybody smile at the camera!'],
  ],
  'wedding-farewell': [
    ['It was my honor', 'Đó là vinh dự của tôi', 'Ban tổ chức cảm ơn bạn sau lễ trao giải.', 'It was my honor to host your awards night.'],
    ['Please travel home safely', 'Chúc quý vị về nhà an toàn', 'Kết thúc tiệc tất niên của công ty.', 'Thank you for a great year. Please travel home safely tonight.'],
  ],

  // ── Bãi biển ──
  'beach:base': [
    ['right away', 'ngay lập tức', 'Khách báo micro ở bàn họ không có tiếng.', 'I am sorry about that. I will send a technician right away.'],
    ['Please join us', 'Xin mời cùng chúng tôi', 'Mời khách sang phòng bên dùng tiệc trà.', 'Please join us in the garden for tea and coffee.'],
  ],
  'beach-rain': [
    ['Do we have a backup plan', 'Mình có phương án dự phòng không', 'Diễn giả chính có thể bị trễ chuyến bay.', 'If her flight is late, do we have a backup plan?'],
    ['please follow me to', 'xin mời theo tôi tới', 'Dẫn đoàn khách tới phòng tiệc.', 'Dinner is ready. Please follow me to the dining room.'],
  ],
  'beach-late-groom': [
    ['Leave it to me', 'Cứ để tôi lo', 'Sếp lo không ai đón khách ở sân bay.', 'Leave it to me. I will meet them at the airport.'],
    ['He is on his way', 'Anh ấy đang trên đường tới', 'Khán giả hỏi khi nào ca sĩ xuất hiện.', 'He is on his way and will be on stage in ten minutes.'],
  ],
  'beach-sound-wind': [
    ['Please feel free to', 'Xin cứ tự nhiên', 'Mời khách dùng tiệc buffet.', 'The buffet is open. Please feel free to help yourselves.'],
    ['Can everyone at the back hear me', 'Quý vị ở phía sau nghe rõ tôi không', 'Mở đầu buổi nói chuyện trong hội trường lớn.', 'Before we start, can everyone at the back hear me?'],
  ],
  'beach-vows': [
    ['I will give her a moment', 'Tôi sẽ để cô ấy có chút thời gian', 'Người nhận giải xúc động không nói nên lời.', 'She is very moved, so I will give her a moment.'],
    ['In this special moment', 'Trong khoảnh khắc đặc biệt này', 'Trước khi công bố người thắng giải.', 'In this special moment, let us thank everyone who took part.'],
  ],
  'beach-group-photo': [
    ['I will ask everyone to', 'Tôi sẽ mời mọi người', 'Sắp tới giờ khai mạc mà khách còn ở sảnh.', 'I will ask everyone to move into the hall now.'],
    ['squeeze in', 'đứng sát vào', 'Bàn tiệc thêm hai người khách.', 'Could we squeeze in two more chairs at this table?'],
  ],
  'beach-sunset-toast': [
    ['on his behalf', 'thay mặt anh ấy', 'Giám đốc vắng mặt, bạn nhận giải thay.', 'Our director could not be here, so I will accept the award on his behalf.'],
    ['May your', 'Chúc … của bạn', 'Lời chúc trong tiệc khai trương cửa hàng.', 'May your new shop bring you joy and success.'],
  ],
  'beach-dress-code': [
    ['You may leave', 'Quý vị có thể để lại', 'Hướng dẫn khách gửi áo khoác ở sảnh.', 'You may leave your coats with our staff at the door.'],
    ['please take my arm', 'mời vịn tay tôi', 'Một cụ bà bước xuống bậc thang trơn.', 'The steps are wet, ma\'am. Please take my arm.'],
  ],

  // ── Gala ──
  'gala:base': [
    ['goes directly toward', 'được chuyển thẳng tới', 'Giải thích tiền bán vé gây quỹ dùng vào đâu.', 'Every ticket you buy goes directly toward new books for the school.'],
    ['please join me in welcoming', 'xin hãy cùng tôi chào đón', 'Giới thiệu ngài thị trưởng lên phát biểu.', 'Now, please join me in welcoming the mayor to the stage!'],
  ],
  'gala-auction': [
    ['Could you walk me through', 'Bạn hướng dẫn tôi từng bước … được không', 'Lần đầu dùng bàn trộn âm thanh mới.', 'Could you walk me through the new sound desk before the show?'],
    ['Do I hear', 'Có ai trả (giá)', 'Bán đấu giá một chiếc áo có chữ ký.', 'We have two hundred dollars. Do I hear two hundred and fifty?'],
  ],
  'gala-late-keynote': [
    ['I am delighted to share', 'Tôi rất vui được chia sẻ', 'Thông báo công ty đạt mục tiêu năm.', 'I am delighted to share that we reached our target this year.'],
    ['dinner is served', 'bữa tối đã sẵn sàng', 'Mời khách trong tiệc cưới vào bàn.', 'Ladies and gentlemen, dinner is served. Please find your tables.'],
  ],
  'gala-award': [
    ['build the suspense', 'tạo sự hồi hộp', 'Bàn với đạo diễn cách công bố giải nhất.', 'I will pause before the name to build the suspense.'],
    ['thank you for a lifetime of', 'cảm ơn vì cả một đời', 'Tiễn một thầy giáo về hưu.', 'Mr. Lee, thank you for a lifetime of teaching.'],
  ],
  'gala-vip-seating': [
    ['I will handle it quietly', 'Tôi sẽ xử lý thật kín đáo', 'Có hai khách ngồi nhầm bàn VIP.', 'Two guests are at the wrong table. I will handle it quietly.'],
    ['Not at all', 'Hoàn toàn không', 'Khách hỏi có làm phiền bạn không.', 'Not at all. I am happy to answer your question.'],
  ],
  'gala-fire-alarm': [
    ['please remain seated', 'xin vui lòng ngồi yên tại chỗ', 'Đèn sân khấu chập chờn giữa chương trình.', 'Ladies and gentlemen, please remain seated while we check the lights.'],
    ['Thank you for staying so calm', 'Cảm ơn quý vị đã rất bình tĩnh', 'Sau khi mất điện vài phút trong hội trường.', 'The power is back. Thank you for staying so calm.'],
  ],
  'gala-sponsor-thanks': [
    ['Could you confirm', 'Bạn xác nhận giúp … được không', 'Bạn cần chắc giờ bắt đầu tổng duyệt.', 'Could you confirm the rehearsal time for tomorrow?'],
    ['would simply not be possible', 'đơn giản là không thể có được', 'Cảm ơn đội kỹ thuật sau một show lớn.', 'Without our technical crew, this show would simply not be possible.'],
  ],
  'gala-closing-appeal': [
    ['May I announce', 'Tôi xin phép công bố', 'Một khách mời vừa tặng học bổng.', 'That is wonderful news. May I announce it to our guests?'],
    ['Thank you for your generosity', 'Cảm ơn sự hào phóng của quý vị', 'Kết thúc buổi quyên góp sách cho trường học.', 'We collected two thousand books. Thank you for your generosity!'],
  ],

  // ── Talkshow ──
  'interview:base': [
    ['Welcome to the show', 'Chào mừng đến với chương trình', 'Mở đầu podcast với một đầu bếp nổi tiếng.', 'Welcome to the show, Chef Maria! It is great to have you here.'],
    ['Thank you so much for', 'Cảm ơn rất nhiều vì', 'Kết thúc buổi phỏng vấn một vận động viên.', 'Thank you so much for your time and your honest answers.'],
  ],
  'interview-vague-answer': [
    ['Could you give us one specific example', 'Anh/chị cho một ví dụ cụ thể được không', 'Diễn giả nói "làm việc nhóm rất quan trọng" mà không giải thích.', 'Teamwork matters, you say. Could you give us one specific example?'],
    ['Thank you for sharing that', 'Cảm ơn đã chia sẻ điều đó', 'Khách mời vừa kể về thất bại đầu tiên.', 'Thank you for sharing that story with our audience.'],
  ],
  'interview-sensitive-question': [
    ['Would you like to tell us', 'Anh/chị có muốn chia sẻ với chúng tôi', 'Khách mời vừa nhận một giải thưởng lớn.', 'Would you like to tell us how you felt when you heard the news?'],
    ['I appreciate your honesty', 'Tôi trân trọng sự thẳng thắn của anh/chị', 'Đồng nghiệp nhận lỗi về một sai sót trong show.', 'I appreciate your honesty. Let us fix it together.'],
  ],
  'interview-audience-question': [
    ['So the question is', 'Vậy câu hỏi là', 'Khán giả hỏi dài dòng về chuyện khởi nghiệp.', 'So the question is: when is the right time to start a business?'],
    ['let us move on', 'chúng ta chuyển sang phần tiếp', 'Hết giờ cho phần thảo luận đầu tiên.', 'That was a great discussion. Now, let us move on to the next topic.'],
  ],
  'interview-product-launch': [
    ['What problem were you trying to solve', 'Bạn muốn giải quyết vấn đề gì', 'Phỏng vấn một nhà thiết kế về chiếc ghế mới.', 'It is a beautiful chair. What problem were you trying to solve?'],
    ['Tell me more about', 'Kể thêm cho tôi về', 'Khách mời nhắc thoáng qua thời thơ ấu.', 'Tell me more about your first job in the theater.'],
  ],
  'interview-technical-break': [
    ['Which of the three', 'Trong ba điều đó, điều nào', 'Khách mời kể ba thành phố đã sống.', 'Paris, Tokyo, and Hanoi. Which of the three feels most like home?'],
    ['We will be right back', 'Chúng tôi sẽ trở lại ngay', 'Tạm nghỉ giữa hai phần của một buổi livestream.', 'We will be right back after a short coffee break.'],
  ],
  'interview-rapid-fire': [
    ['you answer in one word', 'bạn trả lời bằng một từ', 'Chơi trò hỏi nhanh với khán giả.', 'I say a city, and you answer in one word.'],
    ['what is the best advice you have ever received', 'lời khuyên hay nhất bạn từng nhận là gì', 'Phỏng vấn một ca sĩ kỳ cựu.', 'After forty years on stage, what is the best advice you have ever received?'],
  ],
  'interview-opening-intro': [
    ['My guest this evening is', 'Khách mời của tôi tối nay là', 'Mở đầu một buổi trò chuyện với nhà văn.', 'Good evening! My guest this evening is the writer Anna Lee.'],
    ['Let us start at the beginning', 'Chúng ta bắt đầu từ đầu nhé', 'Mở đầu phỏng vấn về sự nghiệp của một đầu bếp.', 'Let us start at the beginning: who taught you to cook?'],
  ],
};

// Cụm của các gói sự kiện (src/data/events) gắn với kịch bản ngày 1 của sự kiện đó
for (const [id, rows] of Object.entries(EVENT_CHUNKS)) RAW[`${id}:base`] = rows;

export const CHUNKS: Record<string, Chunk> = {};
/** Các cụm của từng kịch bản (theo khóa kịch bản). */
export const CHUNKS_BY_SCRIPT: Record<string, Chunk[]> = {};

for (const [key, rows] of Object.entries(RAW)) {
  CHUNKS_BY_SCRIPT[key] = rows.map(([en, vi, useVi, sample], i) => {
    const chunk: Chunk = { id: `${key}#${i + 1}`, en, vi, useVi, sample };
    CHUNKS[chunk.id] = chunk;
    return chunk;
  });
}
