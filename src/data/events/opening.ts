// Khai trương: MC dẫn lễ khai trương một showroom mới: chào khách, giới thiệu chủ cửa hàng,
// mời khách cắt băng, thông báo ưu đãi và mời khách vào tham quan.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Khai trương', theme: 'lounge' },
  objective: {
    cefr: 'A2',
    can: 'Open a store opening: greet guests, introduce the owner, invite a guest to cut the ribbon and announce an offer.',
    canVi: 'Mở đầu lễ khai trương: chào khách, giới thiệu chủ cửa hàng, mời khách cắt băng và thông báo ưu đãi.',
  },
  npcs: {
    grace: npc('grace', 'Grace', 'Store Manager', { lang: 'en-US', gender: 'f', pitch: 1.04, rate: 1.0 }),
  },
  chunks: [
    [
      'make yourself at home',
      'Cứ tự nhiên như ở nhà',
      'Khách đang chờ ở quầy nước, bạn mời họ ngồi xuống sofa.',
      'Please make yourself at home on the sofa while the coffee is served.',
    ],
    [
      'cut the ribbon',
      'Cắt băng',
      'Một quán cà phê mới sắp khai trương cuối tuần này.',
      'The mayor will cut the ribbon at the next opening, so please arrive early.',
    ],
  ],
  scene: eventScene({
    id: 'opening',
    kind: 'Khai trương',
    level: 'Beginner+',
    reqLv: 1,
    title: 'Grand Opening',
    sub: 'Dẫn lễ khai trương showroom mới cùng quản lý cửa hàng Grace',
    npc: 'grace',
    charisma: 25,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, the guests are arriving now. Please welcome them and tell them why we are here today.',
        npcVi: 'Thiên Ân, khách đang đến rồi. Bạn hãy chào đón họ và cho họ biết hôm nay chúng ta có mặt ở đây để làm gì.',
        cue: 'Good morning, everyone, and welcome to the grand opening of our new showroom. Please make yourself at home.',
        cueVi: 'Chào buổi sáng quý vị và chào mừng đến với lễ khai trương showroom mới của chúng tôi. Xin mời quý vị cứ tự nhiên như ở nhà.',
        key: 'welcome to the grand opening',
        tip: 'Nói chậm, rõ tên showroom và dừng một nhịp trước câu mời khách.',
      },
      {
        mode: 'catch',
        npc: 'Now introduce the owner of this showroom, Ms. Linh, who started with one simple dream and a small team.',
        npcVi: 'Giờ hãy giới thiệu chủ showroom, cô Linh, người bắt đầu từ một ước mơ giản dị cùng một đội nhỏ.',
        cue: 'Please welcome the {owner} of this showroom, Ms. Linh, who started with one simple {dream} and a small team.',
        cueVi: 'Xin mời quý vị chào đón chủ showroom, cô Linh, người bắt đầu từ một ước mơ giản dị cùng một đội nhỏ.',
        catch: ['manager', 'designer', 'investor', 'guest'],
        key: 'the owner of this showroom',
        tip: 'Nghe hai danh từ: người làm chủ cửa hàng và điều khởi đầu của cô Linh.',
      },
      {
        mode: 'semi',
        npc: 'Now count down from three, and invite our guest of honor, Mr. Tran, to cut the ribbon with us.',
        npcVi: 'Giờ hãy đếm ngược từ ba, rồi mời khách danh dự, ông Trần, cùng chúng tôi cắt băng.',
        frame: 'Please count down with me: three, two, one, and we ___ the ribbon together with our ___ of honor!',
        cueVi: 'Xin quý vị cùng tôi đếm ngược: ba, hai, một, và chúng ta ___ băng khánh thành cùng ___ danh dự!',
        blanks: 2,
        blankPool: [
          ['cut', 'open', 'unveil'],
          ['guest', 'guests'],
        ],
        sample: 'Please count down with me: three, two, one, and we cut the ribbon together with our guest of honor!',
        key: 'we cut the ribbon together',
        tip: 'Đếm đều ba, hai, một, rồi điền động từ cắt băng và danh từ chỉ khách mời.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Great! Before the offers, remember one rule: do not reveal the free gift yet. We will talk about it at the end.',
        npcVi: 'Tuyệt! Trước khi nói về ưu đãi, nhớ một quy tắc: đừng tiết lộ quà tặng miễn phí vội. Chúng ta sẽ nói về món quà ấy vào cuối chương trình.',
        question: 'Grace vừa dặn điều gì về quà tặng miễn phí?',
        options: [
          { t: 'Our free gift is waiting at the door, so please go and collect it right now.', ok: false },
          { t: 'Please give every guest a free gift right now, so they can enjoy the showroom.', ok: false },
          { t: 'We will talk about the free gift a little later, at the end of the event.', ok: true },
        ],
        cueVi: 'Chúng ta sẽ nói về quà tặng miễn phí vào cuối chương trình, xin quý vị chờ thêm một chút nhé.',
        tip: 'Nghe kỹ "do not reveal" và "at the end": quà chưa được nhắc đến ngay bây giờ.',
      },
      {
        mode: 'scripted',
        npc: 'Now announce our opening offer: ten percent off every item in the showroom, for today only.',
        npcVi: 'Giờ hãy công bố ưu đãi khai trương: giảm mười phần trăm cho mọi sản phẩm trong showroom, chỉ trong hôm nay.',
        cue: 'Our opening offer is simple: ten percent off every item in the showroom, valid for today only.',
        cueVi: 'Ưu đãi khai trương của chúng tôi rất đơn giản: giảm mười phần trăm cho mọi sản phẩm trong showroom, chỉ trong hôm nay.',
        key: 'ten percent off every item',
        tip: 'Nhấn mạnh con số "ten percent" và cụm "today only" để khách nhớ.',
      },
      {
        mode: 'free',
        npc: 'Wonderful opening! Please thank the guests, and invite them to tour the showroom and see the new collection.',
        npcVi: 'Lễ khai trương thật tuyệt! Bạn hãy cảm ơn khách và mời họ tham quan showroom cùng xem bộ sưu tập mới.',
        task: 'Cảm ơn khách đã đến và mời họ vào tham quan showroom.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks) và lời mời tham quan (tour / visit / explore).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['tour', 'visit', 'explore'],
        ],
        bonusKeywords: [
          ['today', 'coming', 'joining'],
          ['enjoy', 'welcome', 'collection'],
        ],
        sample: 'Thank you all for coming today. Please visit the showroom, explore the new collection, and enjoy your tour!',
        minWords: 15,
        key: 'visit the showroom',
        tip: 'Kết bằng lời cảm ơn, rồi mời khách đi tham quan một cách cụ thể.',
      },
    ],
  }),
};

export default pack;
