// Ra mắt sản phẩm: MC dẫn buổi công bố một mẫu đồng hồ thông minh trước báo chí và đối tác.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Ra mắt sản phẩm', theme: 'conference' },
  objective: {
    cefr: 'B1',
    can: 'Open a product launch, build anticipation and introduce a speaker.',
    canVi: 'Mở màn buổi ra mắt sản phẩm, tạo sự mong chờ và giới thiệu diễn giả.',
  },
  npcs: {
    maya: npc('maya', 'Maya', 'Brand Director', { lang: 'en-US', gender: 'f', pitch: 1.05, rate: 1.0 }),
  },
  chunks: [
    ['It is my pleasure to', 'Tôi rất hân hạnh được', 'Bạn giới thiệu trưởng phòng mới trong buổi họp công ty.', 'It is my pleasure to introduce our new head of marketing.'],
    ['Please join me in welcoming', 'Xin mời mọi người cùng tôi chào đón', 'Ở tiệc tất niên, bạn mời giám đốc lên phát biểu.', 'Please join me in welcoming our director to say a few words.'],
  ],
  scene: eventScene({
    id: 'launch',
    kind: 'Ra mắt sản phẩm',
    level: 'Beginner+',
    reqLv: 2,
    title: 'The Big Reveal',
    sub: 'Dẫn buổi ra mắt đồng hồ thông minh Aura One cùng giám đốc thương hiệu Maya',
    npc: 'maya',
    charisma: 30,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, the doors are open and the press is seated. Please welcome everyone and tell them what tonight is about.',
        npcVi: 'Thiên Ân, cửa đã mở và báo chí đã ngồi vào chỗ. Bạn hãy chào mọi người và cho họ biết tối nay có gì nhé.',
        cue: 'Good evening and welcome to the official launch of Aura One. It is my pleasure to be your host tonight.',
        cueVi: 'Chào buổi tối và chào mừng quý vị đến với lễ ra mắt chính thức của Aura One. Tôi rất hân hạnh được dẫn dắt chương trình tối nay.',
        key: 'welcome to the official launch',
        tip: 'Ngắt một nhịp ngắn trước tên sản phẩm "Aura One" để khán giả chú ý.',
      },
      {
        mode: 'catch',
        npc: 'Before the reveal, remind them that the battery lasts seven days and the design took three years.',
        npcVi: 'Trước màn công bố, bạn nhắc khán giả rằng pin dùng được bảy ngày và thiết kế mất ba năm.',
        cue: 'Here is a hint: the {battery} lasts seven days, and the {design} took three years to perfect.',
        cueVi: 'Một gợi ý nhỏ: pin dùng được bảy ngày, và thiết kế mất ba năm để hoàn thiện.',
        catch: ['camera', 'screen', 'price', 'weight'],
        key: 'the battery lasts seven days',
        tip: 'Nghe hai danh từ chỉ đặc điểm sản phẩm mà Maya nhấn mạnh.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Small change: do not announce the price yet. Our CEO will reveal it herself at the end of her speech.',
        npcVi: 'Thay đổi nhỏ: bạn đừng công bố giá vội. CEO của chúng tôi sẽ tự công bố ở cuối bài phát biểu.',
        question: 'Maya vừa dặn điều gì về giá sản phẩm?',
        options: [
          { t: 'The price is nine hundred dollars, available from tomorrow morning!', ok: false },
          { t: 'As for the price, our CEO has a special announcement for you very soon.', ok: true },
          { t: 'Sadly, there will be no information about the price this year.', ok: false },
        ],
        cueVi: 'Còn về giá, CEO của chúng tôi sẽ sớm có một thông báo đặc biệt dành cho quý vị.',
        tip: 'Nghe kỹ cụm "do not announce the price yet": MC giữ bí mật, không nói con số.',
      },
      {
        mode: 'semi',
        npc: 'Now build the moment. Count down from three, then ask the audience to look at the main screen.',
        npcVi: 'Giờ hãy đẩy không khí lên. Đếm ngược từ ba, rồi mời khán giả nhìn lên màn hình chính.',
        frame: 'Ladies and gentlemen, in three, two, one, please turn your eyes to the ___ and meet ___!',
        cueVi: 'Kính thưa quý vị, ba, hai, một, xin hãy hướng mắt lên ___ và gặp gỡ ___!',
        blanks: 2,
        blankPool: [
          ['main screen', 'screen', 'stage'],
          ['Aura One', 'our new watch', 'the future'],
        ],
        sample: 'Ladies and gentlemen, in three, two, one, please turn your eyes to the main screen and meet Aura One!',
        key: 'please turn your eyes to the main screen',
        tip: 'Đếm "three, two, one" chậm và đều, lên giọng ở tên sản phẩm.',
      },
      {
        mode: 'scripted',
        npc: 'That was perfect! Next on the program is our CEO, Elena Park. Please bring her on stage.',
        npcVi: 'Tuyệt lắm! Tiếp theo chương trình là CEO của chúng tôi, Elena Park. Bạn mời cô ấy lên sân khấu nhé.',
        cue: 'Please join me in welcoming the woman behind this vision, our chief executive officer, Elena Park!',
        cueVi: 'Xin mời quý vị cùng tôi chào đón người đứng sau tầm nhìn này, tổng giám đốc điều hành của chúng tôi, Elena Park!',
        key: 'please join me in welcoming',
        tip: 'Tên diễn giả luôn đặt cuối câu và nói to nhất để khán giả vỗ tay đúng lúc.',
      },
      {
        mode: 'free',
        npc: 'Wonderful launch! Please close the event, thank the guests, and invite them to try the watch at the demo area.',
        npcVi: 'Buổi ra mắt tuyệt vời! Bạn hãy kết thúc chương trình, cảm ơn khách mời và mời họ trải nghiệm đồng hồ ở khu dùng thử.',
        task: 'Cảm ơn khách mời đã tham dự và mời họ sang khu trải nghiệm để dùng thử sản phẩm.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank) và lời mời trải nghiệm (try / demo / experience).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['try', 'demo', 'experience', 'hands-on'],
        ],
        bonusKeywords: [
          ['joining', 'evening', 'tonight'],
          ['enjoy', 'invite', 'welcome'],
        ],
        sample: 'Thank you all for joining us tonight. We invite you to visit the demo area and try Aura One for yourself. Enjoy the evening!',
        minWords: 12,
        key: 'visit the demo area and try',
        tip: 'Kết bằng một lời mời cụ thể: đi đâu, làm gì.',
      },
    ],
  }),
};

export default pack;
