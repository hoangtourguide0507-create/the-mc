// Hội nghị khách hàng: MC dẫn buổi tri ân khách hàng và đối tác thường niên của một công ty,
// giới thiệu chương trình, mời giám đốc kinh doanh trình bày, vinh danh đại lý, xử lý sự cố máy chiếu
// và mời khách dự tiệc trưa.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Hội nghị khách hàng', theme: 'conference' },
  objective: {
    cefr: 'B1',
    can: 'Host a client appreciation conference: welcome guests, introduce the programme, invite a speaker, honour top partners and close the event.',
    canVi: 'Dẫn hội nghị tri ân khách hàng: chào mừng khách, giới thiệu chương trình, mời diễn giả, vinh danh đối tác xuất sắc và kết thúc buổi họp.',
  },
  npcs: {
    ryan: npc('ryan', 'Ryan', 'Sales Director', { lang: 'en-US', gender: 'm', pitch: 0.98, rate: 1.0 }),
  },
  chunks: [
    [
      'continued trust and partnership',
      'Sự tin tưởng và đồng hành liên tục',
      'Ở lễ tổng kết năm học, bạn cảm ơn phụ huynh đã gắn bó với nhà trường.',
      'We are grateful for the continued trust and partnership of every family at our school.',
    ],
    [
      'round of applause for',
      'một tràng pháo tay cho',
      'Trước khi chuyển sang tiết mục mới, bạn mời khán giả vỗ tay cảm ơn đội bếp.',
      'Before we continue, please give a round of applause for the kitchen team that prepared our lunch.',
    ],
  ],
  scene: eventScene({
    id: 'customer',
    kind: 'Hội nghị khách hàng',
    level: 'Intermediate',
    reqLv: 5,
    minRep: 1.6,
    title: 'Partner Appreciation Day',
    sub: 'Dẫn hội nghị tri ân khách hàng và đối tác thường niên cùng giám đốc kinh doanh Ryan',
    npc: 'ryan',
    charisma: 50,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, the guests are seated and the room is full. Please welcome everyone and thank them for their continued partnership this year.',
        npcVi: 'Thiên Ân, khách mời đã ngồi kín phòng. Bạn hãy chào đón mọi người và cảm ơn sự đồng hành của họ trong năm nay.',
        cue: 'Good morning, everyone, and welcome to our annual partner day. Thank you for your continued trust and partnership this year.',
        cueVi: 'Chào buổi sáng quý vị và chào mừng đến với ngày hội đối tác thường niên của chúng tôi. Cảm ơn quý vị vì sự tin tưởng và đồng hành liên tục trong năm nay.',
        key: 'annual partner day',
        tip: 'Chào thật ấm áp và nói rõ đây là buổi tri ân, không phải buổi bán hàng.',
      },
      {
        mode: 'catch',
        npc: 'Tell the guests the full schedule includes a sales review, the awards ceremony and a new partner policy for next year.',
        npcVi: 'Hãy cho khách biết lịch đầy đủ gồm buổi đánh giá doanh số, lễ trao giải và chính sách mới cho đối tác năm sau.',
        cue: 'Here is the {schedule} for today: a sales review, the {awards} ceremony, and a new partner policy.',
        cueVi: 'Đây là lịch trình hôm nay: buổi đánh giá doanh số, lễ trao giải và chính sách mới dành cho đối tác.',
        catch: ['banquet', 'workshop', 'keynote', 'lottery'],
        key: 'the awards ceremony',
        tip: 'Nghe hai danh từ: lịch trình và lễ trao giải là hai ý chính của chương trình.',
      },
      {
        mode: 'semi',
        npc: 'Thien An, I am ready to present our results. Please invite me to the stage and mention that we reached record sales this year.',
        npcVi: 'Thiên Ân, tôi đã sẵn sàng trình bày kết quả. Bạn hãy mời tôi lên sân khấu và nhắc rằng năm nay chúng ta đạt doanh số kỷ lục.',
        frame: 'Now, please ___ our sales director to the stage, who will share our ___ results of the year.',
        cueVi: 'Bây giờ, xin ___ giám đốc kinh doanh của chúng ta lên sân khấu, người sẽ chia sẻ những kết quả ___ nhất trong năm.',
        blanks: 2,
        blankPool: [
          ['invite', 'ask', 'call'],
          ['record', 'strong', 'outstanding'],
        ],
        sample: 'Now, please invite our sales director to the stage, who will share our record results of the year.',
        key: 'please invite our sales director',
        tip: 'Điền động từ mời lên sân khấu và tính từ nói về kết quả trong năm.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Please do not announce the bonus amounts yet. Each partner will receive their figures privately after lunch.',
        npcVi: 'Bạn đừng công bố các mức thưởng vội. Mỗi đối tác sẽ nhận con số của mình riêng sau bữa trưa.',
        question: 'Ryan vừa dặn MC điều gì về các mức thưởng?',
        options: [
          { t: 'The bonus amounts are on the screen, so let us read them together right now.', ok: false },
          { t: 'The bonus details will stay private today, and every partner will receive them after lunch.', ok: true },
          { t: 'We will announce every bonus amount right after this speech, so stay with us.', ok: false },
        ],
        cueVi: 'Các mức thưởng sẽ được giữ kín hôm nay, và mỗi đối tác sẽ nhận thông tin sau bữa trưa.',
        tip: 'Nghe cụm "do not announce ... yet" và "privately after lunch": thông tin được giữ kín đến sau bữa trưa.',
      },
      {
        mode: 'scripted',
        npc: 'Next, we honor our top regional partner of the year, Sarah Lin from the northern region. Please invite her up to receive the award.',
        npcVi: 'Tiếp theo, chúng tôi vinh danh đối tác khu vực xuất sắc nhất năm, Sarah Lin đến từ khu vực miền Bắc. Bạn mời cô ấy lên nhận giải nhé.',
        cue: 'Let us give a round of applause for our top regional partner of the year, Sarah Lin, from the northern region!',
        cueVi: 'Xin quý vị dành một tràng pháo tay cho đối tác khu vực xuất sắc nhất năm, Sarah Lin, đến từ khu vực miền Bắc!',
        key: 'top regional partner of the year',
        tip: 'Đọc to tên và khu vực, ngắt nhẹ trước tên để khán giả vỗ tay đúng lúc.',
      },
      {
        mode: 'scripted',
        npc: 'The projector just stopped working. Tell the guests we will pause for a moment while the technical team fixes it.',
        npcVi: 'Máy chiếu vừa ngừng hoạt động. Bạn hãy báo khách rằng chúng ta sẽ tạm dừng một lát trong khi kỹ thuật viên sửa.',
        cue: 'Our screen is having a small technical problem, so we will take a short pause while our team fixes it.',
        cueVi: 'Màn hình của chúng ta đang gặp một sự cố kỹ thuật nhỏ, nên chúng ta sẽ tạm nghỉ ngắn trong lúc đội ngũ khắc phục.',
        key: 'take a short pause',
        tip: 'Giữ giọng bình tĩnh và nói rõ thời gian chờ để khách không lo lắng.',
      },
      {
        mode: 'free',
        npc: 'Thank you, Thien An, that was a wonderful morning. Please close the event, thank the partners for their trust, and invite them to lunch in the main hall.',
        npcVi: 'Cảm ơn bạn, buổi sáng thật tuyệt vời. Bạn hãy kết thúc chương trình, cảm ơn các đối tác vì sự tin tưởng và mời họ dự tiệc trưa ở sảnh chính.',
        task: 'Kết thúc buổi tri ân: cảm ơn đối tác vì sự tin tưởng và mời họ dự tiệc trưa ở sảnh chính.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks) và lời mời dự tiệc trưa (lunch / luncheon / dining).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['lunch', 'luncheon', 'dining'],
        ],
        bonusKeywords: [
          ['partners', 'guests', 'trust'],
          ['join', 'enjoy', 'welcome'],
        ],
        sample: 'Thank you all for your trust today. Please join us for lunch in the main hall and enjoy your meal.',
        minWords: 14,
        key: 'join us for lunch',
        tip: 'Kết bằng lời cảm ơn, rồi mời khách dự tiệc trưa đúng địa điểm.',
      },
    ],
  }),
};

export default pack;
