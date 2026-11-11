// Thời trang: MC dẫn show Xuân Hè của một nhà thiết kế trước khách VIP và giới truyền thông.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Thời trang', theme: 'runway' },
  objective: {
    cefr: 'B1',
    can: 'Host a runway show: welcome guests, introduce a collection and a designer, and handle a delay.',
    canVi: 'Dẫn một show thời trang: chào khách, giới thiệu bộ sưu tập và nhà thiết kế, xử lý việc trễ giờ.',
  },
  npcs: {
    isabelle: npc('isabelle', 'Isabelle', 'Creative Director', { lang: 'en-GB', gender: 'f', pitch: 1.0, rate: 0.98 }),
  },
  chunks: [
    [
      'Thank you for your patience',
      'Cảm ơn quý vị đã kiên nhẫn',
      'Ở khách sạn, khi thang máy phải sửa, bạn cảm ơn khách đã kiên nhẫn chờ.',
      'Thank you for your patience while our technicians repair the elevator.',
    ],
    [
      'would be delighted to',
      'sẽ rất vui mừng được',
      'Trong email đặt phòng, bạn nói đội ngũ rất vui được giúp khách.',
      'Our team would be delighted to help you with your booking.',
    ],
  ],
  scene: eventScene({
    id: 'fashion',
    kind: 'Thời trang',
    level: 'Intermediate',
    reqLv: 4,
    minRep: 1.4,
    title: 'Runway Night',
    sub: 'Dẫn show thời trang Xuân Hè của nhà thiết kế Julian Hale cùng Isabelle',
    npc: 'isabelle',
    charisma: 45,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, our VIP guests and fashion press have taken their seats. Please greet them and introduce the collection for this evening.',
        npcVi: 'Thiên Ân, khách VIP và giới truyền thông thời trang đã vào chỗ. Bạn hãy chào đón mọi người và giới thiệu bộ sưu tập tối nay.',
        cue: 'Good evening, distinguished guests and members of the press. Welcome to our Spring Summer show, and thank you for being here with us tonight.',
        cueVi: 'Chào buổi tối, kính chào quý khách và quý vị truyền thông. Chào mừng quý vị đến với show Xuân Hè của chúng tôi, và cảm ơn quý vị đã có mặt tối nay.',
        key: 'welcome to our Spring Summer show',
        tip: 'Chào khách bằng giọng ấm, rồi ngắt một nhịp ngắn trước tên show.',
      },
      {
        mode: 'catch',
        npc: 'Before we begin, please remind our guests to switch off their phones and avoid using flash photography during the show.',
        npcVi: 'Trước khi bắt đầu, bạn nhắc khách tắt chuông điện thoại và không dùng đèn flash khi chụp ảnh trong suốt show.',
        cue: 'May I kindly ask all guests to switch off their {phones} and avoid any {flash} photography during the show.',
        cueVi: 'Xin quý khách vui lòng tắt chuông điện thoại, và không sử dụng đèn flash khi chụp ảnh trong suốt buổi trình diễn.',
        catch: ['music', 'seats', 'cameras', 'drinks'],
        key: 'switch off their phones',
        tip: 'Nghe hai danh từ: điện thoại và đèn flash. Đây là hai điều khách hay quên.',
      },
      {
        mode: 'semi',
        npc: 'Now tell them about the collection. The designer drew inspiration from the Mediterranean coast and the warm light of late summer.',
        npcVi: 'Giờ hãy giới thiệu bộ sưu tập. Nhà thiết kế lấy cảm hứng từ bờ biển Địa Trung Hải và ánh nắng cuối hè.',
        frame: 'This collection is inspired by ___, and every piece celebrates ___.',
        cueVi: 'Bộ sưu tập này lấy cảm hứng từ ___, và mỗi thiết kế đều tôn vinh ___.',
        blanks: 2,
        blankPool: [
          ['the Mediterranean coast', 'the coast', 'the sea'],
          ['the summer light', 'the warm light', 'freedom'],
        ],
        sample: 'This collection is inspired by the Mediterranean coast, and every piece celebrates the summer light.',
        key: 'inspired by the Mediterranean coast',
        tip: 'Điền hai cụm: nơi lấy cảm hứng và điều thiết kế tôn vinh. Nói chậm, nhấn vào danh từ.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Bad news: the lighting team needs a few more minutes, so the show will start a little late. Please handle the delay gracefully.',
        npcVi: 'Tin không vui: đội ánh sáng cần thêm vài phút nên show sẽ bắt đầu hơi muộn. Bạn hãy xử lý việc trễ này thật khéo léo.',
        question: 'Isabelle vừa báo show trễ. Bạn nên nói gì với khách?',
        options: [
          { t: 'The show will begin right now, so please take your seats immediately.', ok: false },
          { t: 'We have no idea when the show will start, so please wait outside.', ok: false },
          { t: 'Thank you for your patience. The show will begin in a few minutes, so please enjoy your drinks.', ok: true },
        ],
        cueVi: 'Cảm ơn quý vị đã kiên nhẫn. Show sẽ bắt đầu sau ít phút nữa, xin mời quý vị thưởng thức đồ uống.',
        tip: 'Khi trễ giờ, cảm ơn khách trước, rồi cho biết khách còn phải chờ bao lâu và nên làm gì.',
      },
      {
        mode: 'scripted',
        npc: 'Excellent. Now bring out the designer, Julian Hale, so he can take a bow and thank the audience.',
        npcVi: 'Tuyệt vời. Giờ mời nhà thiết kế Julian Hale bước ra chào và cảm ơn khán giả.',
        cue: 'Please join me in welcoming the visionary behind this collection, our designer, Julian Hale!',
        cueVi: 'Xin mời quý vị cùng tôi chào đón người đứng sau bộ sưu tập này, nhà thiết kế của chúng tôi, Julian Hale!',
        key: 'welcoming the visionary behind this collection',
        tip: 'Đọc tên nhà thiết kế chậm và rõ, đặt tên ở cuối câu để khán giả vỗ tay đúng lúc.',
      },
      {
        mode: 'free',
        npc: 'Wonderful show! Please thank the guests and invite them to the after party in the garden, where drinks are waiting.',
        npcVi: 'Show thật tuyệt! Bạn hãy cảm ơn khách và mời họ dự tiệc sau show ở khu vườn, nơi có đồ uống đang chờ.',
        task: 'Cảm ơn khách đã có mặt và mời họ dự tiệc sau show ở khu vườn.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank) và lời mời dự tiệc (party / join / invite). Nói thêm về khu vườn hoặc đồ uống để đạt 3 sao.',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['party', 'join', 'invite'],
        ],
        bonusKeywords: [
          ['garden', 'terrace'],
          ['welcome', 'invite'],
        ],
        sample: 'Thank you all for coming. Please join us for the after party in the garden, where we would be delighted to welcome you.',
        minWords: 12,
        key: 'after party in the garden',
        tip: 'Kết bằng một lời mời cụ thể: đi đâu và có gì.',
      },
    ],
  }),
};

export default pack;
