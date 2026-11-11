// Đấu giá từ thiện: MC dẫn đêm gala gây quỹ xây trường cho trẻ vùng cao, giới thiệu vật phẩm,
// khuấy động khi giá tăng, chốt phiên đấu giá và công bố tổng số tiền quyên góp.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Đấu giá từ thiện', theme: 'gala' },
  objective: {
    cefr: 'B2',
    can: 'Host a charity auction: state a fundraising purpose, introduce lots and bids, and close each sale with confidence.',
    canVi: 'Dẫn đêm đấu giá từ thiện: nêu mục đích gây quỹ, giới thiệu vật phẩm và giá khởi điểm, khuấy động khi giá tăng rồi chốt và cảm ơn nhà hảo tâm.',
  },
  npcs: {
    arthur: npc('arthur', 'Arthur', 'Auctioneer', { lang: 'en-GB', gender: 'm', pitch: 0.94, rate: 1.0 }),
  },
  chunks: [
    [
      'with an opening bid of',
      'với giá khởi điểm là',
      'Bạn rao bán một cây đàn piano cũ trong hội chợ của khu phố.',
      'The old piano goes on sale tomorrow with an opening bid of two hundred dollars.',
    ],
    [
      'thank you for your generosity',
      'cảm ơn sự hào phóng của bạn',
      'Ở tiệm bánh cuối năm, bạn cảm ơn khách quen vì đã ủng hộ và tặng họ một ly cà phê.',
      'Thank you for your generosity toward our bakery this year, and please enjoy a free coffee on the house.',
    ],
  ],
  scene: eventScene({
    id: 'auction',
    kind: 'Đấu giá từ thiện',
    level: 'Advanced',
    reqLv: 7,
    minRep: 2.0,
    title: 'Paddle Up for Every Child',
    sub: 'Dẫn đêm gala đấu giá gây quỹ xây trường cho trẻ vùng cao cùng quản trì đấu giá Arthur',
    npc: 'arthur',
    charisma: 65,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, our guests are seated and the paddles are ready. Welcome them warmly and tell them why we are gathered tonight.',
        npcVi: 'Thiên Ân, khách mời đã ngồi vào chỗ và bảng trả giá đã sẵn sàng. Bạn hãy chào đón thật ấm áp và cho họ biết vì sao chúng ta có mặt tối nay.',
        cue: 'Good evening, everyone, and welcome to tonight\'s gala. Every child deserves a classroom, and together we will build one in remote highland villages.',
        cueVi: 'Chào buổi tối quý vị, và chào mừng quý vị đến với đêm gala tối nay. Mỗi em nhỏ đều xứng đáng có một lớp học, và chúng ta sẽ cùng nhau xây dựng một ngôi trường ở các bản làng vùng cao.',
        key: 'every child deserves a classroom',
        tip: 'Nói chậm câu mục đích gây quỹ, dừng một nhịp sau "a classroom" để khán giả cảm nhận.',
      },
      {
        mode: 'catch',
        npc: 'Our first lot is a hand-painted ceramic vase made by a local artisan, and the opening bid is five thousand dollars.',
        npcVi: 'Vật phẩm đầu tiên là một chiếc bình gốm vẽ tay do một nghệ nhân địa phương làm, và giá khởi điểm là năm nghìn đô la.',
        cue: 'Our first lot is a hand-painted ceramic {vase} crafted by a local {artisan}, with an opening bid of five thousand dollars.',
        cueVi: 'Vật phẩm đầu tiên là một chiếc bình gốm vẽ tay, do một nghệ nhân địa phương làm, với giá khởi điểm là năm nghìn đô la.',
        catch: ['painting', 'weekend', 'watch', 'dinner'],
        key: 'ceramic vase made by a local artisan',
        tip: 'Nghe hai danh từ: tên vật phẩm và người làm ra nó. Đọc con số giá khởi điểm thật rõ.',
      },
      {
        mode: 'semi',
        npc: 'Now explain how to bid. Ask the guests to raise their paddle high, and to keep it up until you call the number.',
        npcVi: 'Giờ hãy hướng dẫn cách trả giá. Mời khách giơ bảng trả giá thật cao, và giữ nguyên cho đến khi bạn xướng số.',
        frame: 'Ladies and gentlemen, if you wish to bid, please ___ your paddle high and ___ it until I call the number.',
        cueVi: 'Thưa quý vị, nếu quý vị muốn trả giá, xin vui lòng ___ bảng trả giá thật cao và ___ nó cho đến khi tôi xướng số.',
        blanks: 2,
        blankPool: [
          ['raise', 'lift'],
          ['keep', 'hold'],
        ],
        sample: 'Ladies and gentlemen, if you wish to bid, please raise your paddle high and keep it up until I call the number.',
        key: 'raise your paddle high',
        tip: 'Ô đầu là động từ "giơ lên", ô sau là động từ "giữ nguyên".',
      },
      {
        mode: 'scripted',
        npc: 'The bidding is rising fast now! Build the energy, praise the bidders, and encourage everyone to go a little higher.',
        npcVi: 'Giá đang tăng nhanh! Hãy đẩy không khí lên, khen ngợi những người trả giá và khuyến khích mọi người trả cao hơn một chút.',
        cue: 'Wonderful energy in this room! The bid has jumped to ten thousand dollars, so let us see who will go even higher.',
        cueVi: 'Năng lượng trong phòng thật tuyệt! Giá đã nhảy lên mười nghìn đô la, vậy hãy xem ai sẽ trả cao hơn nữa.',
        key: 'the bid has jumped to ten thousand dollars',
        tip: 'Giọng càng lúc càng cao theo nhịp tăng giá, nhưng vẫn rõ từng con số.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Bidding is slowing down. Do not rush the final call. Pause for a moment, then ask the room once more if anyone wants to bid.',
        npcVi: 'Giá đang chậm lại. Đừng vội chốt. Hãy dừng một nhịp, rồi hỏi cả phòng một lần nữa xem có ai muốn trả giá không.',
        question: 'Arthur vừa dặn MC điều gì khi giá bắt đầu chậm lại?',
        options: [
          { t: 'Before I close this lot, is there anyone who would like to raise a paddle one last time?', ok: true },
          { t: 'Going once, going twice, sold, to the gentleman in the front row!', ok: false },
          { t: 'The auction is now over, so please collect your paddles and thank the staff.', ok: false },
        ],
        cueVi: 'Trước khi tôi chốt vật phẩm này, còn ai muốn giơ bảng trả giá lần cuối không?',
        tip: 'Nghe kỹ "do not rush" và "pause for a moment". Chưa chốt ngay, mà hỏi lại một lần nữa.',
      },
      {
        mode: 'scripted',
        npc: 'Now close the lot. Count slowly, announce the final price, and congratulate the winning bidder by name.',
        npcVi: 'Giờ hãy chốt vật phẩm. Đếm chậm, công bố giá cuối cùng và chúc mừng người thắng đấu giá.',
        cue: 'Going once, going twice, sold! Congratulations to the generous bidder in the front row, for fifteen thousand dollars.',
        cueVi: 'Một lần, hai lần, đã bán! Xin chúc mừng nhà hảo tâm ngồi hàng đầu, với mức giá mười lăm nghìn đô la.',
        key: 'going once, going twice, sold',
        tip: 'Ngắt nhịp giữa từng "going" để tạo kịch tính, rồi nói "sold" thật dứt khoát.',
      },
      {
        mode: 'free',
        npc: 'Splendid result! Please thank the donors, announce the total raised tonight, and tell them how the school will benefit.',
        npcVi: 'Kết quả thật tuyệt! Bạn hãy cảm ơn các nhà hảo tâm, công bố tổng số tiền quyên góp tối nay và cho họ biết ngôi trường sẽ được hưởng lợi thế nào.',
        task: 'Cảm ơn các nhà hảo tâm và công bố tổng số tiền quyên góp được tối nay.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks / grateful) và câu nói về số tiền đã quyên góp (raised / total).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['raised', 'total'],
        ],
        bonusKeywords: [
          ['donors', 'generous', 'supporters'],
          ['school', 'children', 'classroom'],
        ],
        sample: 'Thank you for your generosity, dear donors. Together we have raised one hundred and twenty thousand dollars for the school children.',
        minWords: 15,
        key: 'together we have raised one hundred and twenty thousand dollars',
        tip: 'Kết bằng lời cảm ơn, rồi đọc tổng số tiền thật rõ và nói số tiền ấy giúp ích gì.',
      },
    ],
  }),
};

export default pack;
