import type { TurnData } from '../types/game';

/**
 * Sinh lượt thoại hằng ngày bằng cách ghép các mẫu đã khớp sẵn.
 *
 * Mỗi mẫu gồm câu NPC và câu trả lời của người chơi đi cùng nhau, nên mọi tổ hợp đều hợp lý
 * (ví dụ đồ uống được gọi luôn khớp với câu chào tạm biệt). Mỗi vị trí lượt chọn mẫu riêng
 * theo (cảnh, ngày, tên vị trí), nên cùng một ngày thì nội dung ổn định, sang ngày khác thì đổi.
 * Ngày 1 không dùng bộ sinh này (xem turnsForDay trong content.ts).
 */

type Pair = readonly [en: string, vi: string];

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Trộn bit (murmur finalizer) để các lựa chọn độc lập nhau khi lấy modulo
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

function pickOf<T>(arr: readonly T[], scene: string, day: number, name: string): T {
  return arr[hash(`${scene}|${day}|${name}`) % arr.length];
}

/** Điền lần lượt các ô ___ bằng một mục được chọn từ mỗi ô. */
function fillFrame(frame: string, pools: readonly (readonly string[])[], scene: string, day: number, tag: string): { filled: string; picks: string[] } {
  const picks: string[] = [];
  let filled = frame;
  pools.forEach((pool, i) => {
    const choice = pickOf(pool, scene, day, `${tag}-blank${i}`);
    picks.push(choice);
    filled = filled.replace('___', choice);
  });
  return { filled, picks };
}

// ───────────────────────── QUÁN CÀ PHÊ ─────────────────────────

const COFFEE_OPENERS: Pair[] = [
  ['Good morning, Thien An! Big day of hosting ahead? What can I get started for you today?', 'Chào buổi sáng, Thiên Ân! Hôm nay lại chạy show lớn hả? Tôi pha gì cho bạn đây?'],
  ['Rainy morning, huh? Everybody wants something warm today. What can I get started for you?', 'Sáng mưa nhỉ? Hôm nay ai cũng muốn uống nóng. Tôi pha gì cho bạn đây?'],
  ['Morning, MC! Long rehearsal last night? What would you like to order?', 'Chào MC! Tối qua tập muộn hả? Bạn muốn gọi gì?'],
  ['Good morning! The line is already long, so let us keep it quick. What will it be?', 'Chào buổi sáng! Hàng đã dài rồi, mình làm nhanh nhé. Bạn dùng gì?'],
  ['Hey Thien An, you are in early today! What can I make for you this morning?', 'Thiên Ân, hôm nay bạn đến sớm thế! Sáng nay tôi làm gì cho bạn đây?'],
  ['Quiet morning today, so I have time to chat. What is your usual order?', 'Sáng nay vắng khách nên tôi có thời gian trò chuyện. Bạn vẫn gọi món quen chứ?'],
];

const COFFEE_DRINKS: Pair[] = [
  ['iced oat latte with less ice', 'latte yến mạch đá, ít đá'],
  ['hot caramel latte with oat milk', 'latte caramel nóng với sữa yến mạch'],
  ['medium iced green tea with honey', 'trà xanh đá cỡ vừa, thêm mật ong'],
  ['double espresso with a splash of milk', 'espresso đôi với một chút sữa'],
  ['mango smoothie with no sugar', 'sinh tố xoài không đường'],
  ['flat white with extra foam', 'flat white nhiều bọt'],
  ['black coffee with no sugar', 'cà phê đen không đường'],
  ['iced lemon tea with less sugar', 'trà chanh đá, ít đường'],
];

interface PastryLine { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string }
const COFFEE_PASTRIES: PastryLine[] = [
  {
    npc: ['Would you like a warm almond croissant or a blueberry muffin on the side?', 'Bạn muốn dùng kèm bánh sừng bò hạnh nhân ấm hay bánh muffin việt quất không?'],
    cue: 'I will take a {warm} almond {croissant} to go, thank you!',
    cueVi: 'Mình lấy một chiếc bánh sừng bò hạnh nhân ấm mang đi nhé, cảm ơn bạn!',
    catch: ['cold', 'bagel', 'sweet', 'muffin'],
    key: 'warm almond croissant to go',
  },
  {
    npc: ['Want a warm cinnamon roll or a banana bread to go with it?', 'Bạn muốn dùng kèm cuộn quế ấm hay bánh chuối không?'],
    cue: 'I will take a {warm} cinnamon {roll} to go, thank you!',
    cueVi: 'Mình lấy một cuộn quế ấm mang đi nhé, cảm ơn bạn!',
    catch: ['cold', 'bagel', 'sweet', 'muffin'],
    key: 'warm cinnamon roll to go',
  },
  {
    npc: ['Would you like a chocolate chip cookie or a lemon cake for your break?', 'Bạn muốn lấy bánh quy sô cô la chip hay bánh chanh để nghỉ giải lao?'],
    cue: 'I will take a {chocolate} chip {cookie} for my break, thank you!',
    cueVi: 'Mình lấy một chiếc bánh quy sô cô la chip để nghỉ giải lao, cảm ơn bạn nhé!',
    catch: ['vanilla', 'pastry', 'muffin', 'bagel'],
    key: 'chocolate chip cookie for my break',
  },
  {
    npc: ['How about a cheese scone, or a plain bagel with that?', 'Dùng kèm bánh scone phô mai hay bánh bagel trơn nhé?'],
    cue: 'I will take a {cheese} {scone} with my drink, thank you!',
    cueVi: 'Mình lấy một chiếc bánh scone phô mai dùng kèm đồ uống, cảm ơn bạn!',
    catch: ['cold', 'muffin', 'sweet', 'croissant'],
    key: 'cheese scone with my drink',
  },
];

interface SemiLine { npc: Pair; frame: string; cueVi: string; pools: string[][]; tip: string }
const COFFEE_SEMI: SemiLine[] = [
  {
    npc: ['That comes to nine dollars even. How are your vocal cords feeling before tonight’s show?', 'Tổng cộng 9 đô chẵn nhé. Dây thanh quản của bạn thế nào trước show tối nay?'],
    frame: 'Here you go! Honestly, I feel ___ and ready to ___ the stage tonight!',
    cueVi: 'Của bạn đây! Thật sự mình cảm thấy ___ và sẵn sàng ___ sân khấu tối nay!',
    pools: [['energized', 'excited', 'great', 'confident'], ['rock', 'shine', 'own', 'light up']],
    tip: 'Điền tính từ chỉ sự hào hứng ở ô 1 và động từ làm chủ sân khấu ở ô 2.',
  },
  {
    npc: ['That is eight fifty. Are you preparing for a big event this week?', 'Tổng cộng 8 đô 50 nhé. Tuần này bạn có sự kiện lớn nào cần chuẩn bị không?'],
    frame: 'Here you go! Yes, I am preparing a ___ speech and I want to ___ it clearly.',
    cueVi: 'Của bạn đây! Đúng vậy, mình đang chuẩn bị một bài phát biểu ___ và muốn trình bày thật rõ ràng.',
    pools: [['bilingual', 'big', 'short', 'warm'], ['deliver', 'present', 'share', 'polish']],
    tip: 'Ô 1 nói về loại bài phát biểu, ô 2 là động từ "trình bày" lịch sự.',
  },
  {
    npc: ['That comes to ten twenty. Do you need an umbrella for the walk to the theater?', 'Tổng cộng 10 đô 20 xu nhé. Bạn có cần ô để đi bộ tới nhà hát không?'],
    frame: 'Here you go! Thanks for asking, I have a ___ umbrella, so I will stay ___ on the way!',
    cueVi: 'Của bạn đây! Cảm ơn bạn đã hỏi, mình có một chiếc ô ___, nên trên đường đi mình sẽ giữ ___!',
    pools: [['sturdy', 'big', 'bright', 'new'], ['dry', 'warm', 'calm', 'safe']],
    tip: 'Ô 1 tả chiếc ô, ô 2 nói về trạng thái của bạn khi đi đường.',
  },
  {
    npc: ['That is nine forty. Any plans for the afternoon after your shift?', 'Tổng cộng 9 đô 40 xu nhé. Buổi chiều sau ca làm bạn có dự định gì không?'],
    frame: 'Here you go! After my shift I want to ___, and then I will ___ for a while.',
    cueVi: 'Của bạn đây! Sau ca làm mình muốn ___, rồi sau đó mình sẽ ___ một lát.',
    pools: [['rest', 'study', 'practice', 'relax'], ['read a book', 'take a walk', 'sit by the window', 'drink more tea']],
    tip: 'Nói về hai việc bạn định làm, mỗi việc một ô.',
  },
];

interface CloseLine { npc: Pair; cue: Pair; key: string }
const COFFEE_CLOSERS: CloseLine[] = [
  { npc: ['Break a leg tonight, MC Thien An!', 'Tối nay dẫn thật bùng nổ nhé, MC Thiên Ân!'], cue: ['Thanks a million, Leo! Have a wonderful morning shift!', 'Cảm ơn Leo rất nhiều! Chúc bạn ca sáng thật tuyệt vời nhé!'], key: 'Have a wonderful morning shift' },
  { npc: ['Enjoy it while it is warm, and have a great day, MC Thien An!', 'Thưởng thức khi còn nóng nhé, chúc bạn một ngày tuyệt vời, MC Thiên Ân!'], cue: ['Thanks, Leo! I will enjoy it while it is warm. Have a great day too!', 'Cảm ơn Leo! Mình sẽ thưởng thức khi còn nóng. Bạn cũng có ngày thật vui nhé!'], key: 'enjoy it while it is warm' },
  { npc: ['Stay dry out there, and good luck with your rehearsal today!', 'Ra ngoài nhớ giữ ấm nhé, chúc buổi tập hôm nay suôn sẻ!'], cue: ['Thanks, Leo! I will stay dry and enjoy my coffee before the rehearsal.', 'Cảm ơn Leo! Mình sẽ giữ ấm và thưởng thức cà phê trước giờ tập.'], key: 'stay dry and enjoy my coffee' },
  { npc: ['Take care on your way to the studio, and see you tomorrow!', 'Đi cẩn thận tới studio nhé, hẹn gặp lại ngày mai!'], cue: ['Thank you, Leo! See you tomorrow, and have a cozy morning shift!', 'Cảm ơn Leo! Hẹn gặp lại ngày mai, chúc bạn ca sáng thật ấm áp!'], key: 'See you tomorrow' },
];

const COFFEE_TEAS: Pair[] = [
  ['chamomile tea', 'trà hoa cúc'],
  ['ginger tea with one sugar', 'trà gừng một muỗng đường'],
  ['peppermint tea', 'trà bạc hà'],
  ['warm honey water', 'nước ấm pha mật ong'],
];

function coffeeTurns(day: number): TurnData[] {
  const S = 'coffee';
  const [openEn, openVi] = pickOf(COFFEE_OPENERS, S, day, 'open');
  const [drink, drinkVi] = pickOf(COFFEE_DRINKS, S, day, 'drink');
  const pastry = pickOf(COFFEE_PASTRIES, S, day, 'pastry');
  const semi = pickOf(COFFEE_SEMI, S, day, 'semi');
  const close = pickOf(COFFEE_CLOSERS, S, day, 'close');
  const [tea, teaVi] = pickOf(COFFEE_TEAS, S, day, 'tea');
  const blanks = fillFrame(semi.frame, semi.pools, S, day, 'semi');

  return [
    {
      mode: 'scripted',
      npc: openEn,
      npcVi: openVi,
      cue: `Good morning, Leo! Could I get one ${drink}, please?`,
      cueVi: `Chào buổi sáng Leo! Cho mình một ${drinkVi} nhé?`,
      key: drink,
      tip: 'Nhấn từ quan trọng trong món bạn gọi và giữ giọng lịch sự ở "please".',
    },
    {
      mode: 'catch',
      npc: pastry.npc[0],
      npcVi: pastry.npc[1],
      cue: pastry.cue,
      cueVi: pastry.cueVi,
      catch: pastry.catch,
      key: pastry.key,
      tip: 'Nghe kỹ tính từ và tên món bánh Leo vừa gợi ý để bắt đúng thẻ từ.',
    },
    {
      mode: 'semi',
      npc: semi.npc[0],
      npcVi: semi.npc[1],
      frame: semi.frame,
      cueVi: semi.cueVi,
      blanks: 2,
      blankPool: semi.pools,
      sample: blanks.filled,
      key: blanks.filled.replace('Here you go! ', ''),
      tip: semi.tip,
    },
    {
      mode: 'scripted',
      npc: `Here is your order! ${close.npc[0]}`,
      npcVi: `Đồ uống của bạn đây! ${close.npc[1]}`,
      cue: close.cue[0],
      cueVi: close.cue[1],
      key: close.key,
      tip: '"Break a leg" là lời chúc may mắn trong giới sân khấu. Đáp lại thật rạng rỡ!',
    },
    {
      mode: 'scripted',
      who: 'grandma',
      npc: `Good morning, dear! I would like a cup of ${tea}, please.`,
      npcVi: `Chào cháu! Bà muốn một tách ${teaVi}, nhé.`,
      cue: `Good morning, ma’am! One cup of ${tea} coming right up. I will keep it warm enough for you.`,
      cueVi: `Chào bà! Một tách ${teaVi} có ngay ạ. Cháu sẽ pha vừa ấm cho bà.`,
      key: tea,
      tip: 'Giọng lễ phép, nhẹ nhàng khi phục vụ người lớn tuổi.',
    },
  ];
}

// ───────────────────────── SIÊU THỊ ─────────────────────────

const MARKET_OPENERS: Pair[] = [
  ['Welcome to FreshMart! Are you looking for anything in particular today?', 'Chào mừng đến với FreshMart! Hôm nay bạn đang tìm mua món gì đặc biệt không?'],
  ['Good morning, and welcome to FreshMart! Need help finding something?', 'Chào buổi sáng, chào mừng đến FreshMart! Bạn cần tìm gì không?'],
  ['Hello, welcome in! It is a busy day, so ask me anything you need.', 'Xin chào, mời bạn vào! Hôm nay đông khách, bạn cứ hỏi tôi bất cứ điều gì nhé.'],
  ['Good evening, and welcome to FreshMart! Shopping before the show tonight?', 'Chào buổi tối, chào mừng đến FreshMart! Bạn mua sắm trước giờ show tối nay à?'],
];

interface Need { ask: Pair; answer: Pair; cue: string; cueVi: string; catch: string[]; key: string }
// Mỗi nhu cầu gồm câu hỏi (lượt 1) và câu chỉ đường (lượt 2) đã khớp với nhau.
const MARKET_NEEDS: Need[] = [
  {
    ask: ['which aisle can I find herbal throat lozenges and honey?', 'quầy nào có kẹo ngậm thảo mộc và mật ong nhỉ?'],
    answer: ['Organic honey and throat drops are right over on aisle four, next to the sparkling water.', 'Mật ong hữu cơ và kẹo ngậm ở ngay dãy số 4, cạnh nước khoáng có ga.'],
    cue: 'I will grab the {organic} honey on {aisle} four right now.',
    cueVi: 'Mình sẽ qua dãy số 4 lấy mật ong hữu cơ ngay đây.',
    catch: ['regular', 'counter', 'shelf', 'seven'],
    key: 'organic honey on aisle four',
  },
  {
    ask: ['which aisle has the ginger tea and the fresh lemons, please?', 'quầy nào có trà gừng và chanh tươi ạ?'],
    answer: ['Ginger tea is on aisle three, and the fresh lemons are in the produce section by the entrance.', 'Trà gừng ở dãy số 3, còn chanh tươi nằm ở khu rau củ gần cửa vào.'],
    cue: 'I will grab the {ginger} tea on {aisle} three first.',
    cueVi: 'Mình sẽ lấy trà gừng ở dãy số 3 trước.',
    catch: ['bottled', 'regular', 'counter', 'seven'],
    key: 'ginger tea on aisle three',
  },
  {
    ask: ['which aisle has the honey and the crackers?', 'honey và bánh quy giòn nằm ở dãy nào vậy?'],
    answer: ['Honey is on aisle six, and the crackers are on the top shelf, next to the rice.', 'Mật ong ở dãy số 6, còn bánh quy giòn nằm trên kệ cao, cạnh gạo.'],
    cue: 'I will take the {honey} from {aisle} six and the crackers from the top {shelf}.',
    cueVi: 'Mình sẽ lấy mật ong ở dãy số 6, còn bánh quy giòn trên kệ cao.',
    catch: ['organic', 'counter', 'bottom', 'eight'],
    key: 'honey from aisle six and crackers from the top shelf',
  },
  {
    ask: ['where can I find dark chocolate and oat milk?', 'mình tìm sô cô la đen và sữa yến mạch ở đâu vậy?'],
    answer: ['Dark chocolate is in aisle two, and the oat milk is in the chilled section near aisle nine.', 'Sô cô la đen ở dãy số 2, còn sữa yến mạch nằm khu lạnh gần dãy số 9.'],
    cue: 'I will take the {dark} chocolate from {aisle} two and the oat {milk} from the chilled section.',
    cueVi: 'Mình sẽ lấy sô cô la đen ở dãy số 2 và sữa yến mạch ở khu lạnh.',
    catch: ['white', 'bread', 'frozen', 'five'],
    key: 'dark chocolate from aisle two and oat milk',
  },
  {
    ask: ['which aisle has the sparkling water, please?', 'nước khoáng có ga ở dãy nào ạ?'],
    answer: ['Sparkling water is on aisle one, right beside the fresh juice.', 'Nước khoáng có ga ở dãy số 1, ngay cạnh quầy nước ép tươi.'],
    cue: 'Thanks! I will pick up the {sparkling} water on {aisle} one first.',
    cueVi: 'Cảm ơn bạn! Mình sẽ lấy nước khoáng có ga ở dãy số 1 trước.',
    catch: ['mineral', 'bottle', 'shelf', 'ten'],
    key: 'sparkling water on aisle one',
  },
];

interface Promo { npc: Pair; ok: Pair }
const MARKET_PROMOS: Promo[] = [
  { npc: ['Would you like a paper bag or a plastic one? Also, fresh lemons are buy-one-get-one this week!', 'Bạn dùng túi giấy hay túi nhựa? À, chanh tươi tuần này mua 1 tặng 1 đấy!'], ok: ['I brought my own bag, and yes, I would love the lemon deal!', 'Mình có mang túi riêng, và cho mình lấy ưu đãi chanh nhé!'] },
  { npc: ['Chamomile tea is buy-one-get-one today! Would you like a receipt, too?', 'Trà hoa cúc hôm nay mua 1 tặng 1! Bạn có cần hóa đơn không?'], ok: ['Yes, please! I will take the chamomile tea deal and a printed receipt.', 'Có chứ! Mình lấy ưu đãi trà hoa cúc và một hóa đơn in nhé.'] },
  { npc: ['Our crackers are buy-one-get-one tonight! Would you like the receipt by email?', 'Bánh quy giòn tối nay mua 1 tặng 1! Bạn muốn nhận hóa đơn qua email không?'], ok: ['Please email the receipt, and I will also take the crackers deal!', 'Làm ơn gửi hóa đơn qua email, và mình cũng lấy ưu đãi bánh quy nhé!'] },
  { npc: ['Would you like a paper bag or a plastic one? The yogurt is buy-one-get-one this week!', 'Bạn dùng túi giấy hay túi nhựa? Sữa chua tuần này mua 1 tặng 1 đấy!'], ok: ['I brought my own bag, and yes, I would love the yogurt deal!', 'Mình có mang túi riêng, và cho mình lấy ưu đãi sữa chua nhé!'] },
];
const MARKET_WRONG = [
  'No thanks, I already paid for my bread at the bakery.',
  'Could you show me where the fire exits are?',
  'No thanks, I already have enough tea at home for a whole month.',
  'Could you tell me where the nearest bus stop is?',
];

interface PayLine { npc: (t: string) => string; npcVi: (v: string) => string; cue: Pair; key: string }
const MARKET_PAY: PayLine[] = [
  {
    npc: (t) => `Your total is ${t}. Would you like to pay by card, or tap your phone?`,
    npcVi: (v) => `Tổng của bạn là ${v}. Bạn muốn quẹt thẻ hay chạm điện thoại?`,
    cue: ['I will pay by card, please. Thank you for the great service, Tom!', 'Mình sẽ thanh toán bằng thẻ nhé. Cảm ơn sự phục vụ tuyệt vời của bạn, Tom!'],
    key: 'pay by card, please',
  },
  {
    npc: (t) => `Your total is ${t}. Do you need a bag for your groceries?`,
    npcVi: (v) => `Tổng của bạn là ${v}. Bạn có cần túi đựng đồ không?`,
    cue: ['No bag needed, thank you! I will tap my phone to pay.', 'Không cần túi đâu, cảm ơn bạn! Mình sẽ chạm điện thoại để thanh toán.'],
    key: 'No bag needed, thank you',
  },
  {
    npc: (t) => `Your total is ${t}. Would you like the receipt by email or on paper?`,
    npcVi: (v) => `Tổng của bạn là ${v}. Bạn muốn nhận hóa đơn qua email hay in giấy?`,
    cue: ['Please email the receipt to me. Thank you, and have a lovely evening!', 'Làm ơn gửi hóa đơn qua email cho mình. Cảm ơn, chúc bạn buổi tối vui vẻ!'],
    key: 'Please email the receipt to me',
  },
  {
    npc: (t) => `Your total is ${t}. Would you like to tap your phone, or pay by card?`,
    npcVi: (v) => `Tổng của bạn là ${v}. Bạn muốn chạm điện thoại hay quẹt thẻ?`,
    cue: ['I will tap my phone to pay. Thank you for your help today, Tom!', 'Mình sẽ chạm điện thoại để thanh toán. Cảm ơn sự giúp đỡ hôm nay của bạn, Tom!'],
    key: 'tap my phone to pay',
  },
];
const MARKET_TOTALS: Pair[] = [
  ['twelve twenty', '12 đô 20 xu'],
  ['fourteen fifty', '14 đô 50 xu'],
  ['eighteen fifty', '18 đô 50 xu'],
  ['nine seventy-five', '9 đô 75 xu'],
];

interface KidLine { npc: Pair; cue: Pair; key: string }
const MARKET_KIDS: KidLine[] = [
  { npc: ['Mister, do you have any lollipops? I want the purple ones, not the green ones!', 'Chú ơi, có kẹo mút không ạ? Con muốn cái màu tím, không phải màu xanh lá!'], cue: ['Sure, buddy! The purple lollipops are in the front basket, right next to the cash register.', 'Được chứ nhóc! Kẹo mút màu tím ở giỏ phía trước, ngay cạnh quầy thu ngân đó.'], key: 'front basket, right next to the cash register' },
  { npc: ['Mister, where is the milk? My mom sent me to get it!', 'Chú ơi, sữa ở đâu ạ? Mẹ con bảo con mua mà!'], cue: ['Sure, buddy! The milk is in the back, on the cold shelf near the bakery.', 'Được chứ nhóc! Sữa ở phía sau, trên kệ lạnh gần quầy bánh đó.'], key: 'the milk is in the back' },
  { npc: ['Mister, can I pick the candy? I want the bright red one!', 'Chú ơi, con chọn kẹo được không? Con muốn cái màu đỏ tươi!'], cue: ['Of course, buddy! The bright red candy is on the bottom shelf, right by the checkout.', 'Dĩ nhiên rồi nhóc! Kẹo đỏ tươi ở kệ dưới cùng, ngay cạnh quầy thanh toán đó.'], key: 'bottom shelf, right by the checkout' },
  { npc: ['Mister, I dropped my toy under the bench. Can you help me find it?', 'Chú ơi, con làm rơi đồ chơi dưới ghế dài rồi. Chú giúp con tìm nhé?'], cue: ['Of course, buddy! Your toy is under the bench by the door, next to the umbrella stand.', 'Dĩ nhiên rồi nhóc! Đồ chơi của con ở dưới ghế dài cạnh cửa, ngay bên giá để ô đó.'], key: 'under the bench by the door' },
  { npc: ['Mister, is the bread fresh? I want a soft one for my sandwich!', 'Chú ơi, bánh mì còn tươi không ạ? Con muốn cái mềm để làm bánh kẹp!'], cue: ['Yes, buddy! The soft bread is on the middle shelf, next to the jam.', 'Có chứ nhóc! Bánh mì mềm ở kệ giữa, cạnh lọ mứt đó.'], key: 'soft bread on the middle shelf' },
];

function marketTurns(day: number): TurnData[] {
  const S = 'market';
  const [openEn, openVi] = pickOf(MARKET_OPENERS, S, day, 'open');
  const need = pickOf(MARKET_NEEDS, S, day, 'need');
  const promo = pickOf(MARKET_PROMOS, S, day, 'promo');
  const pay = pickOf(MARKET_PAY, S, day, 'pay');
  const [total, totalVi] = pickOf(MARKET_TOTALS, S, day, 'total');
  const kid = pickOf(MARKET_KIDS, S, day, 'kid');

  // Ba đáp án: một đúng, hai sai lấy khác nhau; vị trí đúng cũng được chọn theo ngày.
  const w1 = MARKET_WRONG[hash(`${S}|${day}|w1`) % MARKET_WRONG.length];
  let w2 = MARKET_WRONG[hash(`${S}|${day}|w2`) % MARKET_WRONG.length];
  if (w2 === w1) w2 = MARKET_WRONG[(MARKET_WRONG.indexOf(w1) + 1) % MARKET_WRONG.length];
  const options = [{ t: promo.ok[0], ok: true }, { t: w1, ok: false }, { t: w2, ok: false }];
  const rot = hash(`${S}|${day}|pos`) % 3;
  const ordered = [options[(0 - rot + 3) % 3], options[(1 - rot + 3) % 3], options[(2 - rot + 3) % 3]];

  return [
    {
      mode: 'scripted',
      npc: openEn,
      npcVi: openVi,
      cue: `Hi Tom! Excuse me, ${need.ask[0]}`,
      cueVi: `Chào Tom! Cho mình hỏi ${need.ask[1]}`,
      key: need.ask[0],
      tip: 'Đọc rõ "aisle" (/aɪl/ - âm s câm) và chú ý từ khóa cần tìm.',
    },
    {
      mode: 'catch',
      npc: need.answer[0],
      npcVi: need.answer[1],
      cue: need.cue,
      cueVi: need.cueVi,
      catch: need.catch,
      key: need.key,
      tip: 'Nghe kỹ số dãy hàng và tên sản phẩm Tom vừa chỉ.',
    },
    {
      mode: 'quiz',
      npc: promo.npc[0],
      npcVi: promo.npc[1],
      question: 'Tom vừa thông báo khuyến mãi nào?',
      options: ordered,
      cueVi: promo.ok[1],
      tip: 'Lắng nghe cụm "buy-one-get-one" và sản phẩm đi kèm để chọn đúng.',
    },
    {
      mode: 'scripted',
      npc: pay.npc(total),
      npcVi: pay.npcVi(totalVi),
      cue: pay.cue[0],
      cueVi: pay.cue[1],
      key: pay.key,
      tip: 'Nói mạch lạc như giao tiếp đời thực khi thanh toán.',
    },
    {
      mode: 'scripted',
      who: 'boy',
      npc: kid.npc[0],
      npcVi: kid.npc[1],
      cue: kid.cue[0],
      cueVi: kid.cue[1],
      key: kid.key,
      tip: 'Giọng vui vẻ, hướng dẫn rõ ràng khi nói với trẻ nhỏ.',
    },
  ];
}

/** Các cảnh hằng ngày có bộ sinh. Ngày 1 không đi qua đây. */
export const DAILY_GENERATORS: Record<string, (day: number) => TurnData[]> = {
  coffee: coffeeTurns,
  market: marketTurns,
};

export { fillFrame, hash };
