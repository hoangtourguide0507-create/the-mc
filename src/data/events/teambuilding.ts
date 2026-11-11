// Team building: MC (quản trò) dẫn buổi team building ngoài trời cho công ty có nhân viên nước ngoài:
// chào đón, chia đội, nêu luật từng bước, nhắc an toàn, hô bắt đầu, công bố đội thắng và mời chụp ảnh chung.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Team building', theme: 'lounge' },
  objective: {
    cefr: 'A2',
    can: 'Lead a short team-building day: welcome the group, explain the rules step by step and close with thanks.',
    canVi: 'Dẫn buổi team building ngắn: chào đón nhóm, giải thích luật từng bước và kết thúc bằng lời cảm ơn.',
  },
  npcs: {
    zoe: npc('zoe', 'Zoe', 'Activity Coordinator', { lang: 'en-US', gender: 'f', pitch: 1.06, rate: 1.04 }),
  },
  chunks: [
    [
      'stay inside the marked area',
      'ở lại trong khu vực đã đánh dấu',
      'Ở sân bay, nhân viên yêu cầu hành khách đứng trong khu vực đã đánh dấu khi chờ đợi.',
      'At the airport, the staff asked passengers to stay inside the marked area while they waited.',
    ],
    [
      'the timer starts now',
      'đồng hồ bắt đầu chạy ngay bây giờ',
      'Trong cuộc họp, bạn nhắc đồng nghiệp rằng hạn nộp báo cáo đã bắt đầu tính.',
      'Your report is due at five, so the timer starts now.',
    ],
  ],
  scene: eventScene({
    id: 'teambuilding',
    kind: 'Team building',
    level: 'Beginner+',
    reqLv: 2,
    title: 'Team Day Games',
    sub: 'Dẫn buổi team building ngoài trời cùng chuyên viên tổ chức Zoe',
    npc: 'zoe',
    charisma: 30,
    turns: [
      {
        mode: 'scripted',
        npc: 'Good morning, Thien An. The team is here and full of energy. Please welcome everyone and get them excited for the games today.',
        npcVi: 'Chào buổi sáng, Thiên Ân. Cả đội đã có mặt và tràn đầy năng lượng. Bạn hãy chào mừng mọi người và làm họ hào hứng với các trò chơi hôm nay.',
        cue: 'Good morning, everyone, and welcome to our team building day! Are you ready to have some fun?',
        cueVi: 'Chào buổi sáng mọi người, và chào mừng đến với ngày team building của chúng ta! Mọi người đã sẵn sàng vui chơi chưa?',
        key: 'welcome to our team building day',
        tip: 'Nói với năng lượng cao từ câu đầu, và mỉm cười khi nhắc tên ngày hội.',
      },
      {
        mode: 'catch',
        npc: 'Please form two teams of six people, and each team must choose one captain before the first game.',
        npcVi: 'Xin hãy lập hai đội, mỗi đội sáu người, và mỗi đội phải chọn một đội trưởng trước trò chơi đầu tiên.',
        cue: 'Okay everyone, please form two {teams} of six, and each team must choose one {captain}.',
        cueVi: 'Được rồi mọi người, xin hãy lập hai đội, mỗi đội sáu người, và mỗi đội phải chọn một đội trưởng.',
        catch: ['balloon', 'tent', 'music', 'bottle'],
        key: 'form two teams',
        tip: 'Nghe hai danh từ nói về cách chia nhóm và người dẫn đầu. Đó là hai từ cần bắt.',
      },
      {
        mode: 'semi',
        npc: 'Now explain the safety rules. Tell them to stay inside the marked area and hold the rope tightly at all times.',
        npcVi: 'Bây giờ hãy giải thích luật an toàn. Dặn mọi người đứng trong khu vực đã đánh dấu và luôn giữ chắc sợi dây.',
        frame: 'Safety first, everyone. Rule one: stay ___ the marked area at all times, and ___ the rope tightly.',
        cueVi: 'An toàn là trên hết, mọi người nhé. Quy tắc số một: hãy ___ trong khu vực đã đánh dấu suốt thời gian, và ___ chắc sợi dây.',
        blanks: 2,
        blankPool: [
          ['inside', 'within'],
          ['hold', 'grab'],
        ],
        sample: 'Safety first, everyone. Rule one: stay inside the marked area at all times, and hold the rope tightly.',
        key: 'stay inside the marked area',
        tip: 'Điền giới từ chỉ vị trí cho ô đầu và động từ chỉ việc giữ dây cho ô sau.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Remember, nobody starts moving until I blow the whistle. Stay still and wait for my signal.',
        npcVi: 'Nhớ nhé, không ai được di chuyển cho đến khi tôi thổi còi. Hãy đứng yên và chờ tín hiệu của tôi.',
        question: 'Zoe vừa dặn điều gì về lúc bắt đầu chơi?',
        options: [
          { t: 'Start running to the finish line now, and I will count the points later.', ok: false },
          { t: 'Please wait here until you hear my whistle, and then start moving.', ok: true },
          { t: 'Feel free to begin now, and I will blow the whistle later.', ok: false },
        ],
        cueVi: 'Xin mọi người đứng yên ở đây cho đến khi nghe tiếng còi của tôi, rồi hãy bắt đầu di chuyển.',
        tip: 'Nghe kỹ cụm "until I blow the whistle": phải chờ tiếng còi rồi mới được chạy.',
      },
      {
        mode: 'scripted',
        npc: 'Everyone is ready. Count down from three, then tell them the timer starts now and they have ten minutes.',
        npcVi: 'Mọi người đã sẵn sàng. Hãy đếm ngược từ ba, rồi nói rằng đồng hồ bắt đầu chạy và các đội có mười phút.',
        cue: 'Three, two, one, go! The timer starts now, so move quickly and stay safe.',
        cueVi: 'Ba, hai, một, bắt đầu! Đồng hồ bắt đầu chạy ngay bây giờ, nên hãy di chuyển thật nhanh và giữ an toàn nhé.',
        key: 'the timer starts now',
        tip: 'Đếm chậm và dứt khoát, rồi nhấn mạnh chữ "go" để cả đội cùng xuất phát.',
      },
      {
        mode: 'scripted',
        npc: 'Time is up! Announce that the Blue Team has won, and ask everyone to give them a big round of applause.',
        npcVi: 'Hết giờ rồi! Hãy công bố đội Xanh chiến thắng và mời mọi người vỗ tay thật lớn.',
        cue: 'Time is up! The winner today is the Blue Team. Please give them a big round of applause!',
        cueVi: 'Hết giờ rồi! Đội chiến thắng hôm nay là đội Xanh. Xin mọi người dành cho họ một tràng pháo tay thật lớn!',
        key: 'the blue team',
        tip: 'Nhấn mạnh tên đội chiến thắng, rồi nghỉ một nhịp để khán giả vỗ tay.',
      },
      {
        mode: 'free',
        npc: 'Great job, Thien An. Please thank everyone for joining, and invite the whole team to take a group photo together.',
        npcVi: 'Làm tốt lắm, Thiên Ân. Bạn hãy cảm ơn mọi người đã tham gia và mời cả đội chụp một bức ảnh chung.',
        task: 'Kết thúc ngày team building: cảm ơn mọi người và mời cả đội chụp ảnh chung.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks / grateful) và lời mời chụp ảnh (photo / picture / camera).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['photo', 'picture', 'camera'],
        ],
        bonusKeywords: [
          ['today', 'tonight', 'everyone', 'this morning'],
          ['enjoy', 'great', 'fantastic', 'amazing'],
        ],
        sample: 'Thank you, everyone, for coming today. Please gather here and enjoy a group photo together!',
        minWords: 12,
        key: 'enjoy a group photo',
        tip: 'Kết bằng lời cảm ơn, rồi mời cả đội tập trung lại để chụp ảnh.',
      },
    ],
  }),
};

export default pack;
