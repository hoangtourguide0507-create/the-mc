import type { TurnData, QuizOption } from '../types/game';
import { fillFrame, hash, pickOf } from './dailyGen';

/**
 * Bộ sinh lượt thoại cho năm cảnh show. Cùng cách với dailyGen.ts: mỗi lượt có nhiều mẫu
 * đã khớp (câu NPC + câu trả lời + từ khóa); mỗi vị trí chọn mẫu theo (cảnh, ngày, tên lượt).
 * Ngày 1 vẫn dùng kịch bản gốc trong content.ts.
 */

type Pair = readonly [en: string, vi: string];

// ───────────────────────── helpers ─────────────────────────

function catchTurn(
  p: { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string },
  base: Partial<TurnData>,
): TurnData {
  return {
    mode: 'catch',
    npc: p.npc[0],
    npcVi: p.npc[1],
    cue: p.cue,
    cueVi: p.cueVi,
    catch: p.catch,
    key: p.key,
    ...base,
  } as TurnData;
}

function semiTurn(
  p: { npc: Pair; frame: string; cueVi: string; pools: string[][] },
  scene: string,
  day: number,
  name: string,
  base: Partial<TurnData>,
): TurnData {
  const f = fillFrame(p.frame, p.pools, scene, day, name);
  return {
    mode: 'semi',
    npc: p.npc[0],
    npcVi: p.npc[1],
    frame: p.frame,
    cueVi: p.cueVi,
    blanks: p.pools.length,
    blankPool: p.pools,
    sample: f.filled,
    key: f.filled,
    ...base,
  } as TurnData;
}

function quizTurn(
  p: { npc: Pair; question: string; ok: string; wrong: readonly [string, string]; cueVi: string },
  scene: string,
  day: number,
  name: string,
  base: Partial<TurnData>,
): TurnData {
  const pos = hash(`${scene}|${day}|${name}|pos`) % 3;
  const others = [...p.wrong];
  others.splice(pos, 0, p.ok);
  const options: QuizOption[] = others.map((t) => ({ t, ok: t === p.ok }));
  return {
    mode: 'quiz',
    npc: p.npc[0],
    npcVi: p.npc[1],
    question: p.question,
    options,
    cueVi: p.cueVi,
    ...base,
  } as TurnData;
}

function freeTurn(
  p: {
    npc: Pair;
    requiredKeywords: string[][];
    bonusKeywords: string[][];
    forbiddenKeywords?: string[];
    sample: string;
    minWords: number;
    key: string;
  },
  base: Partial<TurnData>,
): TurnData {
  return {
    mode: 'free',
    npc: p.npc[0],
    npcVi: p.npc[1],
    requiredKeywords: p.requiredKeywords,
    bonusKeywords: p.bonusKeywords,
    forbiddenKeywords: p.forbiddenKeywords,
    sample: p.sample,
    minWords: p.minWords,
    key: p.key,
    ...base,
  } as TurnData;
}

const pick = pickOf;

const GREET_BONUS = [['ladies and gentlemen', 'everyone'], ['applause', 'excited', 'honored', 'special']];

// ───────────────────────── BACKSTAGE (15:00, Sam & Alex) ─────────────────────────

const BS_CHECK: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Hey Thien An! Your wireless handheld mic is on channel one. Give me a quick level check!', 'Chào Thiên Ân! Micro không dây cầm tay của bạn ở kênh 1. Đọc thử vài câu để tôi chỉnh âm lượng nào!'], cue: 'Testing one, two, three! Good afternoon everyone, how does the vocal clarity sound from the booth?', cueVi: 'Thử máy 1, 2, 3! Chào buổi chiều mọi người, độ trong của giọng đọc nghe từ bàn chỉnh âm thế nào rồi?', key: 'how does the vocal clarity sound' },
  { npc: ['Hey Thien An! The monitor speakers are too loud today. Can you test the mic one more time?', 'Chào Thiên Ân! Loa monitor hôm nay hơi to. Bạn thử micro thêm lần nữa giúp tôi nhé?'], cue: 'Testing one, two! Sam, is the monitor level better now, or should I speak softer?', cueVi: 'Thử một, hai! Sam ơi, mức monitor đã ổn hơn chưa, hay mình nói nhỏ hơn nữa?', key: 'is the monitor level better now' },
  { npc: ['Rehearsal is almost ready, so let us check the handheld mic. Read a short line for me!', 'Buổi tập sắp sẵn sàng, mình kiểm tra micro cầm tay nhé. Đọc giúp tôi một câu ngắn!'], cue: 'Testing, testing, one two three! Sam, can you hear the bass clearly from the booth?', cueVi: 'Thử nghiệm, một hai ba! Sam ơi, từ bàn chỉnh âm bạn có nghe rõ phần trầm không?', key: 'can you hear the bass clearly' },
  { npc: ['The crew is ready for the sound check. Speak at normal volume and tell me how the balance feels!', 'Cả đội đã sẵn sàng kiểm tra âm thanh. Nói ở âm lượng bình thường và cho tôi biết độ cân bằng thế nào!'], cue: 'Sure, Sam! Testing one, two, three. How is the sound balance from the front row?', cueVi: 'Được thôi Sam! Thử một, hai, ba. Độ cân bằng âm thanh từ hàng ghế đầu thế nào?', key: 'the sound balance from the front row' },
];

const BS_CATCH: { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string }[] = [
  { npc: ['There is a slight echo near the front speakers, so hold the microphone closer to your chin.', 'Có chút tiếng vang ở cụm loa trước, nên bạn cầm micro sát cằm hơn nhé.'], cue: 'Got it, Sam! I will hold the {microphone} closer to avoid any {echo} on stage.', cueVi: 'Rõ rồi Sam! Mình sẽ cầm micro gần hơn để tránh tiếng vang trên sân khấu.', catch: ['spotlight', 'feedback', 'podium', 'delay'], key: 'hold the microphone closer to avoid any echo' },
  { npc: ['Much better! Just keep your voice steady, and avoid any sudden noise near the stage floor.', 'Tốt hơn nhiều rồi! Chỉ cần giữ giọng đều, và tránh mọi tiếng động đột ngột gần sàn diễn.'], cue: 'Thanks, Sam! I will keep my {voice} steady and avoid any {noise} near the stage.', cueVi: 'Cảm ơn Sam! Mình sẽ giữ giọng đều và tránh mọi tiếng ồn gần sân khấu.', catch: ['tempo', 'spotlight', 'podium', 'delay'], key: 'keep my voice steady and avoid any noise' },
  { npc: ['The low sound is too weak near the mic, so bring the handheld a little closer to your mouth.', 'Âm trầm quá yếu gần micro, nên đưa micro cầm tay gần miệng hơn một chút.'], cue: 'Understood, Sam! I will bring the {handheld} closer to my mouth.', cueVi: 'Hiểu rồi Sam! Mình sẽ đưa micro cầm tay gần miệng hơn.', catch: ['wireless', 'spotlight', 'echo', 'tempo'], key: 'bring the handheld closer to my mouth' },
  { npc: ['Watch your footing near the stage edge, and keep the cables away from your feet.', 'Cẩn thận chỗ mép sân khấu, và giữ dây cáp tránh xa chân nhé.'], cue: 'Got it, Sam! I will keep the {cables} away from my feet near the {edge}.', cueVi: 'Rõ rồi Sam! Mình sẽ giữ dây cáp tránh xa chân ở gần mép sân khấu.', catch: ['spotlight', 'delay', 'podium', 'echo'], key: 'keep the cables away from my feet' },
];

const BS_INEAR: { npc: Pair; frame: string; cueVi: string; pools: string[][] }[] = [
  { npc: ['Thien An, this is Alex on your in-ear! The VIP sponsor walks on in two minutes, so hold the stage until the crowd settles.', 'Thiên Ân, Alex nói qua in-ear đây! Nhà tài trợ VIP lên sân sau hai phút nữa, nên giữ sân khấu cho đến khi khán giả ổn định.'], frame: 'Copy that, Alex! When the ___ walks on stage, I will wait for the ___ to settle.', cueVi: 'Rõ Alex! Khi ___ bước lên sân khấu, mình sẽ đợi ___ lắng xuống.', pools: [['sponsor', 'guest', 'speaker', 'host'], ['applause', 'audience', 'crowd', 'cheers']] },
  { npc: ['Thien An, Alex here! The director wants a short pause after the opening, so give the team time to switch slides.', 'Thiên Ân, Alex đây! Đạo diễn muốn có một khoảng dừng ngắn sau phần mở màn để đội kịp chuyển slide.'], frame: 'Copy that, Alex! After the ___, I will give the team a ___ to switch slides.', cueVi: 'Rõ Alex! Sau ___, mình sẽ dành cho đội ___ để chuyển slide.', pools: [['opening', 'welcome', 'intro', 'introduction'], ['quick pause', 'short break', 'moment', 'breather']] },
  { npc: ['Thien An, Alex on in-ear! The sponsor speech is moved earlier, so bring the lights up after the first song.', 'Thiên Ân, Alex qua in-ear! Bài phát biểu của nhà tài trợ được chuyển lên sớm, nên tăng đèn sau bài hát đầu tiên.'], frame: 'Copy that, Alex! After the ___, I will ___ the lights for the sponsor.', cueVi: 'Rõ Alex! Sau ___, mình sẽ ___ đèn cho nhà tài trợ.', pools: [['first song', 'opening', 'intro', 'welcome'], ['bring up', 'raise', 'brighten', 'adjust']] },
  { npc: ['Thien An, Alex here! The camera crew needs a clear cue before the award, so signal them with a smile.', 'Thiên Ân, Alex đây! Tổ quay cần một tín hiệu rõ trước phần trao giải, nên ra hiệu cho họ bằng nụ cười.'], frame: 'Copy that, Alex! I will ___ the camera crew before the ___.', cueVi: 'Rõ Alex! Mình sẽ ___ tổ quay trước ___.', pools: [['signal', 'cue', 'warn', 'thank'], ['award', 'speech', 'toast', 'photo']] },
];

const BS_FREE: { npc: Pair; requiredKeywords: string[][]; sample: string; key: string }[] = [
  { npc: ['Great! Now give me a 15-second rehearsal welcome for the City Theater crowd, and tell them what to expect.', 'Tuyệt! Giờ chạy thử một lời chào 15 giây cho khán giả Nhà Hát Thành Phố và cho họ biết sẽ được xem gì.'], requiredKeywords: [['welcome', 'good afternoon', 'hello'], ['show', 'stage', 'theater', 'program']], sample: 'Good afternoon everyone, and welcome to the City Theater! Get ready for a show full of music, laughter and surprises!', key: 'welcome to the City Theater' },
  { npc: ['Perfect. Next, a 15-second rehearsal opening: greet the audience and introduce our special guest speaker.', 'Tốt lắm. Tiếp theo là phần mở đầu 15 giây: chào khán giả và giới thiệu diễn giả khách mời đặc biệt.'], requiredKeywords: [['welcome', 'hello', 'good afternoon'], ['guest', 'speaker', 'introduce', 'program']], sample: 'Hello everyone, and welcome to the City Theater! Please give a warm welcome to our special guest speaker!', key: 'welcome to our special guest speaker' },
  { npc: ['Nice work. Now a 15-second warm-up: thank the sponsor and invite the audience to enjoy the show.', 'Làm tốt lắm. Giờ là phần khởi động 15 giây: cảm ơn nhà tài trợ và mời khán giả thưởng thức chương trình.'], requiredKeywords: [['thank', 'thanks', 'grateful'], ['enjoy', 'show', 'program', 'evening']], sample: 'Thank you to our generous sponsor, and welcome everyone! We hope you enjoy the show this afternoon!', key: 'thank you to our generous sponsor' },
  { npc: ['Good. Last one: a 15-second welcome that tells the crowd the doors are open and the program starts soon.', 'Tốt. Câu cuối: lời chào 15 giây báo cho khán giả biết cửa đã mở và chương trình sắp bắt đầu.'], requiredKeywords: [['welcome', 'good afternoon', 'hello'], ['program', 'show', 'start', 'begin']], sample: 'Good afternoon, welcome to the City Theater! The program will start soon, so please find your seats now!', key: 'the program will start soon' },
];

function backstage(day: number): TurnData[] {
  const S = 'backstage';
  const c = pick(BS_CHECK, S, day, 'bs1');
  const k = pick(BS_CATCH, S, day, 'bs2');
  const i = pick(BS_INEAR, S, day, 'bs3');
  const f = pick(BS_FREE, S, day, 'bs4');
  return [
    { mode: 'scripted', who: 'sam', npc: c.npc[0], npcVi: c.npc[1], cue: c.cue, cueVi: c.cueVi, key: c.key, tip: 'Phát âm dứt khoát để kỹ thuật viên đo ngưỡng nén âm.' },
    catchTurn(k, { who: 'sam', tip: 'Bắt đúng hai danh từ kỹ thuật âm thanh mà Sam vừa nhắc.' }),
    semiTurn(i, S, day, 'bs3', { who: 'alex', channel: 'inear', tip: 'Phản hồi đạo diễn qua tai nghe thật gọn, rõ và chuyên nghiệp.' }),
    freeTurn(
      { npc: f.npc, requiredKeywords: f.requiredKeywords, bonusKeywords: [['seat', 'seats', 'seated'], ...GREET_BONUS, ['ladies and gentlemen', 'everyone']], sample: f.sample, minWords: 10, key: f.key },
      { who: 'alex', task: 'Chào mừng khán giả đến Nhà Hát Thành Phố và giới thiệu chương trình.', taskVi: 'Bắt buộc có lời chào (welcome / hello / good afternoon) và nhắc đến buổi diễn (show / stage / program).', tip: 'Mở đầu bằng lời chào rồi nói ngắn gọn điều khán giả sẽ được xem để lấy đủ điểm.' },
    ),
  ];
}

// ───────────────────────── WEDDING (18:30, Emma & Liam) ─────────────────────────

const WD_EMMA1: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Oh Thien An, my hands are shaking! Are all the guests seated inside the grand ballroom yet?', 'Ôi Thiên Ân ơi, tay mình run quá! Khách khứa đã ngồi ổn định trong đại sảnh chưa bạn?'], cue: 'Take a deep breath, Emma! Everyone is seated and ready to celebrate your love story tonight.', cueVi: 'Hít một hơi thật sâu nào Emma! Mọi người đã ổn định chỗ ngồi và sẵn sàng chúc mừng câu chuyện tình yêu của hai bạn tối nay.', key: 'celebrate your love story tonight' },
  { npc: ['Thien An, the bouquets just arrived! Are we still on schedule for the ceremony?', 'Thiên Ân ơi, hoa cưới vừa được giao tới! Lễ cưới còn đúng lịch không bạn?'], cue: 'Don’t worry, Emma! The bouquets are safe, and we are right on schedule for the ceremony.', cueVi: 'Đừng lo nhé Emma! Hoa đã an toàn, và buổi lễ vẫn đúng lịch trình.', key: 'right on schedule for the ceremony' },
  { npc: ['Thien An, the photographer is asking where we should stand! Could you guide us to the arch?', 'Thiên Ân ơi, nhiếp ảnh gia hỏi chúng mình nên đứng đâu! Bạn dẫn tụi mình tới cổng vòm được không?'], cue: 'Of course, Emma! Please stand together by the arch, and the photographer will capture every smile.', cueVi: 'Tất nhiên rồi Emma! Hai bạn đứng cạnh nhau bên cổng vòm nhé, nhiếp ảnh gia sẽ ghi lại mọi nụ cười.', key: 'stand together by the arch' },
  { npc: ['Thien An, the rain stopped just in time! Is it safe for us to walk outside for photos?', 'Thiên Ân ơi, mưa vừa tạnh đúng lúc! Tụi mình ra ngoài chụp ảnh có an toàn không?'], cue: 'Yes, Emma! The garden is dry now, so you can take your photos near the fountain.', cueVi: 'Được rồi Emma! Khu vườn đã khô ráo, nên hai bạn có thể chụp ảnh gần đài phun nước.', key: 'take your photos near the fountain' },
];

const WD_LIAM: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Thanks Thien An! That is our entrance song starting—go ahead and announce us to the room!', 'Cảm ơn Thiên Ân! Nhạc tiến lễ của tụi mình bắt đầu rồi—bạn ra giới thiệu tụi mình với khán phòng nhé!'], cue: 'Ladies and gentlemen, please rise and put your hands together for the newlyweds, Emma and Liam!', cueVi: 'Thưa quý vị, xin hãy đứng lên và dành tràng pháo tay cho cặp đôi tân hôn, Emma và Liam!', key: 'put your hands together for the newlyweds' },
  { npc: ['Thanks! Could you tell everyone that the first dance will be right after the cake cutting?', 'Cảm ơn bạn! Bạn báo với mọi người là điệu nhảy đầu tiên sẽ diễn ra ngay sau lễ cắt bánh được không?'], cue: 'Of course, Liam! Ladies and gentlemen, the first dance will take place right after the cake cutting.', cueVi: 'Tất nhiên rồi Liam! Thưa quý vị, điệu nhảy đầu tiên sẽ diễn ra ngay sau lễ cắt bánh.', key: 'right after the cake cutting' },
  { npc: ['Thanks, Thien An! Could you remind the guests that the speeches will start after dinner?', 'Cảm ơn Thiên Ân! Bạn nhắc quan khách rằng phần phát biểu sẽ bắt đầu sau bữa tối nhé?'], cue: 'Certainly, Liam! Ladies and gentlemen, the speeches will begin right after dinner, so please stay seated.', cueVi: 'Dạ được Liam! Thưa quý vị, phần phát biểu sẽ bắt đầu ngay sau bữa tối, xin quý vị vui lòng ngồi yên.', key: 'the speeches will begin right after dinner' },
  { npc: ['Thanks, Thien An! Could you ask the guests to save their photos for the first dance?', 'Cảm ơn Thiên Ân! Bạn nhờ quan khách giữ ảnh lại cho điệu nhảy đầu tiên nhé?'], cue: 'Of course, Liam! Ladies and gentlemen, please enjoy the moment and save your photos for the first dance.', cueVi: 'Tất nhiên rồi Liam! Thưa quý vị, xin hãy tận hưởng khoảnh khắc và giữ ảnh cho điệu nhảy đầu tiên.', key: 'save your photos for the first dance' },
];

const WD_GRANDPA: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Young MC, I have waited all evening for a proper toast. Could you tell us how these two first met?', 'Cháu MC ơi, ông đợi cả buổi tối để nghe lời chúc đàng hoàng. Cháu kể cho ông nghe hai đứa gặp nhau thế nào được không?'], cue: 'Certainly, sir! Emma and Liam first met in a small bookshop, and their love story has been beautiful ever since.', cueVi: 'Dạ được ạ! Emma và Liam gặp nhau ở một hiệu sách nhỏ, và câu chuyện tình yêu của hai bạn từ đó đẹp mãi ạ.', key: 'first met in a small bookshop' },
  { npc: ['Young MC, I want to hear something sweet about the groom. Is he always this funny?', 'Cháu MC ơi, ông muốn nghe điều gì ngọt ngào về chú rể. Anh ấy lúc nào cũng hài hước vậy à?'], cue: 'Yes, sir! Liam always makes everyone laugh, and Emma says that is the first thing she loved about him.', cueVi: 'Dạ vâng ạ! Liam lúc nào cũng làm mọi người cười, và Emma nói đó là điều đầu tiên cô ấy yêu ở anh ấy.', key: 'that is the first thing she loved about him' },
  { npc: ['Young MC, tell me about the bride’s family. Did they travel far to be here?', 'Cháu MC ơi, kể ông nghe về gia đình cô dâu. Họ có đi xa để đến dự không?'], cue: 'Yes, sir! Emma’s family traveled from the countryside, and they are very proud to see her today.', cueVi: 'Dạ vâng ạ! Gia đình Emma đi từ vùng quê lên, và họ rất tự hào khi thấy bạn ấy hôm nay.', key: 'traveled from the countryside' },
  { npc: ['Young MC, what is the couple’s favorite memory together? I would love to hear it tonight.', 'Cháu MC ơi, kỷ niệm nào là đẹp nhất của đôi trẻ? Tối nay ông rất muốn nghe đấy.'], cue: 'Sir, Emma and Liam love the seaside, where they shared their first sunset together.', cueVi: 'Thưa ông, Emma và Liam rất yêu biển, nơi hai bạn cùng ngắm hoàng hôn đầu tiên bên nhau.', key: 'their first sunset together' },
];

const WD_GRANDMA: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Sweetheart, the cake looks lovely, but I cannot quite see it from here. Where is it displayed?', 'Cháu ơi, cái bánh trông đẹp quá, nhưng bà không thấy rõ từ đây. Bánh đặt ở đâu vậy cháu?'], cue: 'Of course, ma’am! The wedding cake is right beside the big window, next to the photo wall.', cueVi: 'Dạ tất nhiên ạ! Bánh cưới đặt ngay cạnh cửa sổ lớn, bên cạnh tường ảnh ạ.', key: 'beside the big window' },
  { npc: ['Sweetheart, is there a quiet room where I can rest my knees for a little while?', 'Cháu ơi, có phòng nào yên tĩnh để bà nghỉ chân một lát không?'], cue: 'Of course, ma’am! The lounge is just down the hall, past the photo wall, with comfortable chairs.', cueVi: 'Dạ tất nhiên ạ! Phòng nghỉ ở ngay cuối hành lang, qua tường ảnh, có ghế rất êm ạ.', key: 'lounge is just down the hall' },
  { npc: ['Sweetheart, could you tell me where the restrooms are? I need a little help finding them.', 'Cháu ơi, nhà vệ sinh ở đâu vậy? Bà cần người chỉ giúp.'], cue: 'Certainly, ma’am! The restrooms are on the left, just past the coat check near the entrance.', cueVi: 'Dạ được ạ! Nhà vệ sinh ở bên trái, ngay sau quầy gửi áo gần cổng vào ạ.', key: 'on the left, just past the coat check' },
  { npc: ['Sweetheart, is the dessert table near the window? I would like a small slice of cake.', 'Cháu ơi, bàn tráng miệng có ở gần cửa sổ không? Bà muốn một miếng bánh nhỏ.'], cue: 'Yes, ma’am! The dessert table is by the window, and I will bring you a slice right away.', cueVi: 'Dạ có ạ! Bàn tráng miệng ở cạnh cửa sổ, cháu sẽ mang một miếng cho bà ngay ạ.', key: 'the dessert table is by the window' },
];

const WD_BOY: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Mister MC, I am the ring bearer! When do I walk down the aisle?', 'Chú MC ơi, con là bé cầm nhẫn đấy! Khi nào con đi qua lối đi vậy ạ?'], cue: 'Great question! You walk down right after the flower girl, so get ready and smile for the guests!', cueVi: 'Câu hỏi hay đấy! Con sẽ đi ngay sau bé rải hoa, nên chuẩn bị sẵn sàng và cười thật tươi với quan khách nhé!', key: 'right after the flower girl' },
  { npc: ['Mister MC, when do I get to hold the rings? I am ready!', 'Chú MC ơi, khi nào con được cầm nhẫn ạ? Con sẵn sàng rồi!'], cue: 'Soon, buddy! You will walk up with the rings right before the vows, so keep your hands steady!', cueVi: 'Sắp rồi nhóc! Con sẽ bước lên cầm nhẫn ngay trước lời thề, nên giữ tay thật vững nhé!', key: 'right before the vows' },
  { npc: ['Mister MC, can I sit near the front? I want to see the couple up close!', 'Chú MC ơi, con ngồi gần phía trước được không? Con muốn nhìn cô dâu chú rể thật gần!'], cue: 'Sure, buddy! The seats in the front row, on the left, are saved for the ring bearer.', cueVi: 'Được chứ nhóc! Hàng ghế đầu bên trái được giữ cho bé cầm nhẫn đó.', key: 'front row, on the left' },
  { npc: ['Mister MC, I dropped my bow tie! Can you help me fix it?', 'Chú MC ơi, con làm rơi nơ rồi! Chú giúp con chỉnh lại được không?'], cue: 'No problem, buddy! Stand still for a moment, and I will fix your bow tie before the ceremony.', cueVi: 'Không sao đâu nhóc! Đứng yên một lát, chú sẽ chỉnh nơ trước khi lễ bắt đầu.', key: 'fix your bow tie before the ceremony' },
];

const WD_GIRL: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Can I throw the flower petals now? I practiced all week!', 'Con rải hoa được chưa ạ? Con tập cả tuần rồi đó!'], cue: 'Yes, sweetheart! Go ahead and throw your petals along the aisle, you look amazing!', cueVi: 'Được rồi cháu! Con cứ rải cánh hoa dọc lối đi nhé, con trông tuyệt lắm!', key: 'throw your petals along the aisle' },
  { npc: ['Can I give my little bouquet to the bride? I made it myself!', 'Con tặng bó hoa nhỏ cho cô dâu được không ạ? Con tự làm đó!'], cue: 'Yes, sweetheart! Give the bouquet to Emma at the front, and tell her congratulations!', cueVi: 'Được rồi cháu! Con trao bó hoa cho Emma ở phía trước, và chúc mừng cô ấy nhé!', key: 'give the bouquet to Emma at the front' },
  { npc: ['Can I stand next to the flower stand? I want to see the petals up close!', 'Con đứng cạnh giá hoa được không ạ? Con muốn nhìn cánh hoa thật gần!'], cue: 'Of course, sweetheart! Stand right beside the flower stand, and smile for the photographers!', cueVi: 'Tất nhiên rồi cháu! Đứng ngay cạnh giá hoa và cười với các nhiếp ảnh gia nhé!', key: 'stand right beside the flower stand' },
  { npc: ['Can I sing a little song for the couple? My teacher said I sing well!', 'Con hát một bài nhỏ tặng cô dâu chú rể được không ạ? Cô giáo con nói con hát hay lắm!'], cue: 'What a lovely idea, sweetheart! Sing your song right after the first toast, and everyone will cheer for you!', cueVi: 'Ý hay quá cháu! Hát ngay sau lời chúc đầu tiên nhé, mọi người sẽ cổ vũ con!', key: 'sing your song right after the first toast' },
];

const WD_TOAST: { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string }[] = [
  { npc: ['In-ear cue: The champagne glasses are poured! Invite the guests to raise a toast to eternal love and endless laughter.', 'Nhắc bài qua In-ear: Rượu sâm-panh đã rót xong! Mời quan khách nâng ly chúc tình yêu vĩnh cửu và tiếng cười bất tận.'], cue: 'Everyone, please raise your glasses to {eternal} love and endless {laughter} for our happy couple!', cueVi: 'Mọi người ơi, xin hãy nâng ly chúc tình yêu vĩnh cửu và tiếng cười bất tận của cặp đôi hạnh phúc!', catch: ['temporary', 'silence', 'wealth', 'patience'], key: 'raise your glasses to eternal love and endless laughter' },
  { npc: ['In-ear cue: The toast is coming up! Ask the guests to lift their glasses to health and happiness together.', 'Nhắc bài qua In-ear: Sắp đến lời chúc rồi! Mời quan khách cùng nâng ly chúc sức khỏe và hạnh phúc.'], cue: 'Everyone, please lift your glasses to {health} and {happiness} for our beautiful couple!', cueVi: 'Mọi người ơi, xin hãy nâng ly chúc sức khỏe và hạnh phúc cho cặp đôi xinh đẹp của chúng ta!', catch: ['temporary', 'silence', 'patience', 'sorrow'], key: 'lift your glasses to health and happiness' },
  { npc: ['In-ear cue: Time for the toast! Ask the guests to cheer for a lifetime of joy and friendship.', 'Nhắc bài qua In-ear: Đến lúc chúc rượu! Mời quan khách cổ vũ cho một đời hạnh phúc và tình bạn.'], cue: 'Everyone, please raise your glasses to a {lifetime} of {joy} for our wonderful couple!', cueVi: 'Mọi người ơi, xin hãy nâng ly chúc cả một đời hạnh phúc cho cặp đôi tuyệt vời của chúng ta!', catch: ['temporary', 'silence', 'patience', 'sorrow'], key: 'raise your glasses to a lifetime of joy' },
  { npc: ['In-ear cue: Glasses are ready! Invite the guests to toast to kindness and a bright future.', 'Nhắc bài qua In-ear: Ly đã sẵn sàng! Mời quan khách chúc sự tử tế và một tương lai tươi sáng.'], cue: 'Everyone, please raise your glasses to {kindness} and a {bright} future for our beautiful couple!', cueVi: 'Mọi người ơi, xin hãy nâng ly chúc sự tử tế và một tương lai tươi sáng cho cặp đôi xinh đẹp!', catch: ['temporary', 'silence', 'patience', 'sorrow'], key: 'toast to kindness and a bright future' },
];

const WD_FREE: { npc: Pair; sample: string; requiredKeywords: string[][]; key: string }[] = [
  { npc: ['Thank you all! Thien An, could you invite our guests to enjoy the wedding banquet and join us on the dance floor later?', 'Cảm ơn mọi người! Thiên Ân ơi, bạn mời quan khách thưởng thức tiệc cưới và lát nữa cùng ra sàn nhảy nhé?'], sample: 'Wishing Emma and Liam a lifetime of happiness! Please enjoy the delicious wedding dinner, and join us on the dance floor later tonight!', requiredKeywords: [['enjoy', 'dinner', 'banquet', 'meal', 'feast'], ['dance', 'dancing', 'music', 'floor', 'celebrate']], key: 'enjoy the wedding dinner and join us on the dance floor' },
  { npc: ['Thank you all! Thien An, could you invite everyone to the buffet, and to the dance floor after the cake?', 'Cảm ơn mọi người! Thiên Ân, mời mọi người dùng buffet, rồi ra sàn nhảy sau lễ cắt bánh nhé.'], sample: 'Thank you all for being here! Please enjoy the buffet, and join us on the dance floor after the cake!', requiredKeywords: [['enjoy', 'buffet', 'dinner', 'food', 'meal'], ['dance', 'dancing', 'music', 'floor', 'celebrate']], key: 'enjoy the buffet and join us on the dance floor' },
  { npc: ['What a lovely evening! Thien An, please ask the guests to enjoy the dinner and to stay for the music afterwards.', 'Một buổi tối tuyệt đẹp! Thiên Ân, mời quan khách thưởng thức bữa tối và ở lại nghe nhạc sau đó nhé.'], sample: 'Thank you so much for coming! Please enjoy the dinner, and stay for the music and dancing afterwards!', requiredKeywords: [['enjoy', 'dinner', 'meal', 'feast'], ['music', 'dance', 'dancing', 'celebrate']], key: 'enjoy the dinner and stay for the music' },
  { npc: ['Thank you! Thien An, invite everyone to the feast, and to celebrate with us on the dance floor.', 'Cảm ơn! Thiên Ân, mời mọi người dùng tiệc và cùng chúng tôi ăn mừng trên sàn nhảy.'], sample: 'Thank you, everyone! Please enjoy the feast, and celebrate with us on the dance floor!', requiredKeywords: [['enjoy', 'feast', 'dinner', 'meal'], ['dance', 'dancing', 'music', 'floor', 'celebrate']], key: 'enjoy the feast and celebrate with us' },
];

function wedding(day: number): TurnData[] {
  const S = 'wedding';
  const e1 = pick(WD_EMMA1, S, day, 'wd1');
  const l2 = pick(WD_LIAM, S, day, 'wd2');
  const g3 = pick(WD_GRANDPA, S, day, 'wd3');
  const g4 = pick(WD_GRANDMA, S, day, 'wd4');
  const b5 = pick(WD_BOY, S, day, 'wd5');
  const r6 = pick(WD_GIRL, S, day, 'wd6');
  const t7 = pick(WD_TOAST, S, day, 'wd7');
  const f8 = pick(WD_FREE, S, day, 'wd8');
  return [
    { mode: 'scripted', who: 'couple', speaker: 'emma', npc: e1.npc[0], npcVi: e1.npc[1], cue: e1.cue, cueVi: e1.cueVi, key: e1.key, tip: 'Trấn an cô dâu bằng tông giọng ấm, chậm rãi.' },
    { mode: 'scripted', who: 'couple', speaker: 'liam', npc: l2.npc[0], npcVi: l2.npc[1], cue: l2.cue, cueVi: l2.cueVi, key: l2.key, tip: 'Nhấn cụm "right after" để khán giả nhớ thứ tự chương trình.' },
    { mode: 'scripted', who: 'grandpa', npc: g3.npc[0], npcVi: g3.npc[1], cue: g3.cue, cueVi: g3.cueVi, key: g3.key, tip: 'Kể bằng giọng ấm, chậm, dành cho người lớn tuổi.' },
    { mode: 'scripted', who: 'grandma', npc: g4.npc[0], npcVi: g4.npc[1], cue: g4.cue, cueVi: g4.cueVi, key: g4.key, tip: 'Chỉ dẫn rõ ràng, giọng lễ phép với bà.' },
    { mode: 'scripted', who: 'boy', npc: b5.npc[0], npcVi: b5.npc[1], cue: b5.cue, cueVi: b5.cueVi, key: b5.key, tip: 'Giọng khích lệ, vui vẻ khi nói với trẻ nhỏ.' },
    { mode: 'scripted', who: 'girl', npc: r6.npc[0], npcVi: r6.npc[1], cue: r6.cue, cueVi: r6.cueVi, key: r6.key, tip: 'Khen bé bằng giọng ấm, nhịp chậm rãi.' },
    catchTurn(t7, { who: 'alex', channel: 'inear', tip: 'Nghe kỹ chỉ thị qua In-ear để bắt đúng 2 từ khóa lời chúc.' }),
    freeTurn(
      { npc: f8.npc, requiredKeywords: f8.requiredKeywords, bonusKeywords: [['emma', 'liam', 'couple', 'newlyweds'], ['love', 'happiness', 'wonderful', 'night']], sample: f8.sample, minWords: 10, key: f8.key },
      { who: 'couple', speaker: 'emma', task: 'Gửi lời chúc tới Emma & Liam và mời quan khách thưởng thức bữa tiệc, rồi ra sàn nhảy.', taskVi: 'Bắt buộc nhắc đến bữa tiệc (dinner / banquet / buffet / meal) và sàn nhảy/âm nhạc (dance / floor / music / celebrate).', tip: 'Nói tự nhiên, kết nối lời chúc cặp đôi với lời mời dùng tiệc và nhảy múa.' },
    ),
  ];
}

// ───────────────────────── BEACH (17:30, Ivy) ─────────────────────────

const BE_OPEN: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Thien An! The ocean breeze is picking up fast, and the sun will dip below the horizon in ten minutes!', 'Thiên Ân ơi! Gió biển đang mạnh lên nhanh lắm, mặt trời sẽ lặn xuống đường chân trời trong 10 phút nữa!'], cue: 'No worries, Ivy! I will gather the guests by the floral arch right away so we catch the golden hour.', cueVi: 'Đừng lo nhé Ivy! Mình sẽ mời khách tập trung quanh cổng hoa ngay để kịp khoảnh khắc hoàng hôn vàng.', key: 'gather the guests by the floral arch' },
  { npc: ['Thien An! A jellyfish just washed up near the shore, and some guests look nervous. What should we do?', 'Thiên Ân ơi! Vừa có con sứa dạt vào gần bờ, mấy khách đang lo lắng. Mình nên làm gì đây?'], cue: 'Please stay calm, Ivy! The lifeguard is already checking the shoreline, so the ceremony will go on.', cueVi: 'Ivy ơi, bình tĩnh nhé! Cứu hộ viên đang kiểm tra bờ biển rồi, nên buổi lễ vẫn tiếp tục.', key: 'the lifeguard is already checking the shoreline' },
  { npc: ['Thien An! The band is ready, but the sand is getting windy. Can we move the guests to the terrace?', 'Thiên Ân ơi! Ban nhạc đã sẵn sàng, nhưng gió trên cát đang lớn. Mình chuyển khách lên sân thượng được không?'], cue: 'Good idea, Ivy! I will guide the guests to the terrace, where the view is still beautiful.', cueVi: 'Ý hay đấy Ivy! Mình sẽ dẫn khách lên sân thượng, nơi cảnh vẫn rất đẹp.', key: 'guide the guests to the terrace' },
  { npc: ['Thien An! The photographer wants the couple by the water, but the tide is coming in fast!', 'Thiên Ân ơi! Nhiếp ảnh gia muốn chụp cặp đôi bên mép nước, nhưng thủy triều đang lên nhanh!'], cue: 'Thanks, Ivy! Let us move the couple to the wooden deck, where the photos will look just as lovely.', cueVi: 'Cảm ơn Ivy! Mình chuyển cặp đôi lên sân gỗ, nơi ảnh vẫn đẹp không kém đâu.', key: 'move the couple to the wooden deck' },
];

const BE_CATCH: { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string }[] = [
  { npc: ['Please remind everyone to silence their phones and keep the center aisle clear for the photographer!', 'Nhờ bạn nhắc mọi người chuyển điện thoại sang chế độ im lặng và giữ lối đi giữa thông thoáng cho nhiếp ảnh gia nhé!'], cue: 'Kindly {silence} your mobile phones and keep the center aisle {clear} for our photographer.', cueVi: 'Xin vui lòng tắt chuông điện thoại và giữ lối đi chính thông thoáng cho nhiếp ảnh gia.', catch: ['charge', 'crowded', 'open', 'camera'], key: 'silence your mobile phones and keep the center aisle clear' },
  { npc: ['Could you ask the guests to stay on the sand and keep the path to the arch clear?', 'Nhờ bạn mời khách ở yên trên bãi cát và giữ lối đi tới cổng vòm thông thoáng nhé?'], cue: 'Kindly {stay} on the {sand} and keep the path to the arch {clear}.', cueVi: 'Xin quý khách vui lòng ở yên trên bãi cát và giữ lối đi tới cổng vòm thông thoáng.', catch: ['swim', 'waves', 'crowded', 'camera'], key: 'stay on the sand and keep the path to the arch clear' },
  { npc: ['Please ask the guests to put their drinks on the tables and keep the walkway free for the staff!', 'Nhờ bạn mời khách đặt đồ uống lên bàn và giữ lối đi trống cho nhân viên nhé!'], cue: 'Kindly keep your {drinks} on the {tables} and keep the {walkway} free for our staff.', cueVi: 'Xin quý khách vui lòng đặt đồ uống lên bàn và giữ lối đi trống cho nhân viên.', catch: ['sand', 'waves', 'crowded', 'camera'], key: 'keep your drinks on the tables' },
  { npc: ['Remind the guests to wear hats in the sun, and to drink water while they wait by the sea!', 'Nhắc khách đội mũ khi ra nắng, và uống nước khi chờ bên biển nhé!'], cue: 'Kindly {wear} your {hats} in the sun, and {drink} water while you wait by the sea.', cueVi: 'Xin quý khách đội mũ khi ra nắng và uống nước trong lúc chờ bên biển nhé.', catch: ['swim', 'waves', 'crowded', 'camera'], key: 'wear your hats and drink water' },
];

const BE_SEMI: { npc: Pair; frame: string; cueVi: string; pools: string[][] }[] = [
  { npc: ['The acoustic guitarist is ready. Lead us into the exchange of vows as the waves roll in!', 'Nghệ sĩ guitar đã sẵn sàng. Dẫn chúng tôi vào nghi thức trao lời thề khi sóng vỗ về nhé!'], frame: 'Beneath this breathtaking ___, let us witness the sacred ___ between two soulmates.', cueVi: 'Dưới ___ tuyệt đẹp này, hãy cùng chứng kiến ___ thiêng liêng giữa hai tâm hồn đồng điệu.', pools: [['sunset', 'sky', 'ocean view', 'twilight'], ['vows', 'promise', 'promises', 'moment']] },
  { npc: ['The string quartet is tuned and ready. Introduce the couple’s first dance as the last light touches the water!', 'Nhóm nhạc dây đã lên dây xong. Giới thiệu điệu nhảy đầu tiên khi ánh sáng cuối cùng chạm mặt nước!'], frame: 'As the ___ meets the sea, let us celebrate the ___ of two hearts becoming one.', cueVi: 'Khi ___ chạm vào biển, hãy cùng chúc mừng ___ của hai trái tim hóa thành một.', pools: [['sun', 'sunset', 'golden light', 'last light'], ['journey', 'love', 'promise', 'dream']] },
  { npc: ['The sky is turning pink and the guests are gathering. Describe the view for the photographers!', 'Bầu trời đang chuyển hồng và khách đang tụ lại. Mô tả khung cảnh cho các nhiếp ảnh gia nhé!'], frame: 'Look at the ___ over the waves, a perfect ___ for this wedding.', cueVi: 'Nhìn ___ trên những con sóng kia, một ___ hoàn hảo cho đám cưới này.', pools: [['pink sky', 'golden horizon', 'sunset glow', 'soft light'], ['backdrop', 'memory', 'setting', 'moment']] },
  { npc: ['Everyone is ready for the vows. Set the mood for the guests before the couple walks down the sand.', 'Mọi người đã sẵn sàng cho lời thề. Tạo không khí cho khách trước khi cô dâu chú rể bước xuống cát.'], frame: 'Friends, the ___ is glowing, and the couple is ready to share their ___.', cueVi: 'Thưa mọi người, ___ đang rực sáng, và cặp đôi đã sẵn sàng chia sẻ ___ của họ.', pools: [['evening', 'sea breeze', 'shoreline', 'sand'], ['dreams', 'vows', 'promise', 'future']] },
];

const BE_CLOSE: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['That was magical! Now invite everyone up to the beachside deck for sunset cocktails!', 'Khoảnh khắc vừa rồi kỳ diệu thật sự! Giờ mời mọi người lên sân gỗ ven biển thưởng thức cocktail hoàng hôn nhé!'], cue: 'What a magical moment by the sea! Please join us on the wooden deck for refreshing sunset cocktails!', cueVi: 'Thật là một khoảnh khắc kỳ diệu bên bờ biển! Xin mời quý vị cùng lên sân gỗ thưởng thức cocktail hoàng hôn mát lành!', key: 'join us on the wooden deck for refreshing sunset cocktails' },
  { npc: ['Lovely! Now guide the guests to the beach bar for welcome drinks while the couple takes photos.', 'Tuyệt! Giờ dẫn khách tới quầy bar bãi biển uống chào mừng trong lúc cô dâu chú rể chụp ảnh.'], cue: 'What a beautiful moment! Please follow me to the beach bar for cool drinks while the couple takes their photos.', cueVi: 'Thật là một khoảnh khắc đẹp! Xin mời quý vị theo tôi ra quầy bar bãi biển thưởng thức đồ uống mát lạnh.', key: 'follow me to the beach bar for cool drinks' },
  { npc: ['Beautiful! Next, ask the guests to gather near the sand dance floor for the first song.', 'Đẹp lắm! Tiếp theo mời khách tụ lại gần sàn nhảy trên cát cho bài hát đầu tiên.'], cue: 'Wonderful! Please gather near the sand dance floor, because the first song is about to begin.', cueVi: 'Tuyệt vời! Xin quý vị tập trung gần sàn nhảy trên cát, vì bài hát đầu tiên sắp bắt đầu.', key: 'gather near the sand dance floor' },
  { npc: ['Gorgeous! Now, invite the guests to enjoy the seafood buffet by the palm trees.', 'Tuyệt đẹp! Giờ mời khách thưởng thức tiệc hải sản bên hàng cọ.'], cue: 'Thank you all! Please enjoy the seafood buffet by the palm trees, and relax after the ceremony.', cueVi: 'Cảm ơn quý vị! Xin mời quý vị thưởng thức tiệc hải sản bên hàng cọ và thư giãn sau lễ cưới.', key: 'enjoy the seafood buffet by the palm trees' },
];

const BE_GIRL: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Can I help carry the petals? I made a basket all by myself!', 'Con giúp mọi người mang cánh hoa được không ạ? Con tự làm cái giỏ đó!'], cue: 'What a lovely basket! Yes, sweetheart, you can carry the petals to the sand near the arch.', cueVi: 'Cái giỏ đẹp quá! Được rồi cháu, con mang cánh hoa ra cát gần cổng vòm nhé.', key: 'carry the petals' },
  { npc: ['Can I hold the umbrella for the photographer? It is very windy!', 'Con giữ ô cho chú nhiếp ảnh được không ạ? Gió to quá!'], cue: 'Good idea, sweetheart! Hold the umbrella steady and stand next to the photographer, you are doing great!', cueVi: 'Ý hay đấy cháu! Giữ ô thật vững và đứng cạnh chú nhiếp ảnh nhé, con làm tốt lắm!', key: 'hold the umbrella steady' },
  { npc: ['Can I hand out the seashells to the guests? I collected them this morning!', 'Con phát vỏ sò cho khách được không ạ? Sáng nay con nhặt đó!'], cue: 'What a kind idea! Yes, sweetheart, give one shell to each guest and say thank you.', cueVi: 'Ý tốt quá! Được rồi cháu, mỗi khách một vỏ sò và nhớ nói cảm ơn nhé.', key: 'give one shell to each guest' },
  { npc: ['Can I wave the paper fans for the guests? It is getting hot near the arch!', 'Con quạt cho khách bằng quạt giấy được không ạ? Gần cổng vòm nóng quá!'], cue: 'Yes, sweetheart! Wave your fan gently, and share it with the people sitting in the back.', cueVi: 'Được rồi cháu! Quạt nhẹ nhàng thôi, và chia cho những người ngồi phía sau nhé.', key: 'share it with the people sitting in the back' },
];

function beach(day: number): TurnData[] {
  const S = 'beach';
  const o1 = pick(BE_OPEN, S, day, 'be1');
  const c2 = pick(BE_CATCH, S, day, 'be2');
  const s3 = pick(BE_SEMI, S, day, 'be3');
  const cl4 = pick(BE_CLOSE, S, day, 'be4');
  const g5 = pick(BE_GIRL, S, day, 'be5');
  return [
    { mode: 'scripted', who: 'ivy', npc: o1.npc[0], npcVi: o1.npc[1], cue: o1.cue, cueVi: o1.cueVi, key: o1.key, tip: 'Giữ nhịp bình tĩnh và rõ ràng để điều phối đám đông ngoài bãi biển.' },
    catchTurn(c2, { who: 'ivy', tip: 'Hai từ khóa là hành động và vị trí, cộng với tính từ cuối cùng trong chỉ dẫn.' }),
    semiTurn(s3, S, day, 'be3', { who: 'ivy', tip: 'Ngân nhẹ cụm đầu để tạo chất thơ cho lễ cưới bãi biển.' }),
    { mode: 'scripted', who: 'ivy', npc: cl4.npc[0], npcVi: cl4.npc[1], cue: cl4.cue, cueVi: cl4.cueVi, key: cl4.key, tip: 'Truyền tải năng lượng vui tươi, sảng khoái ở cuối buổi lễ.' },
    { mode: 'scripted', who: 'girl', npc: g5.npc[0], npcVi: g5.npc[1], cue: g5.cue, cueVi: g5.cueVi, key: g5.key, tip: 'Khen bé bằng giọng ấm, nhịp chậm rãi.' },
  ];
}

// ───────────────────────── GALA (19:00, Victoria & Alex) ─────────────────────────

const GA_OPEN: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Thien An, our keynote video screen just froze! We need you to keep the VIP donors engaged for three minutes.', 'Thiên Ân, màn hình video chính vừa đứng hình! Chúng tôi cần bạn giữ sự hào hứng cho các nhà tài trợ VIP trong 3 phút.'], cue: 'Leave it to me, Madam Victoria. I will engage the audience with a quick interactive story right away.', cueVi: 'Cứ giao cho tôi, thưa bà Victoria. Tôi sẽ kết nối khán giả bằng một câu chuyện tương tác ngắn ngay lập tức.', key: 'engage the audience with a quick interactive story' },
  { npc: ['Thien An, our guest of honor is stuck in traffic and will arrive in about ten minutes. Please keep the guests happy until then!', 'Thiên Ân, khách danh dự đang kẹt xe và sẽ tới trong khoảng 10 phút nữa. Hãy giữ quan khách vui vẻ đến lúc đó nhé!'], cue: 'Leave it to me, Madam Victoria. I will invite the guests to enjoy a short tasting of our signature dessert right away.', cueVi: 'Cứ giao cho tôi, thưa bà Victoria. Tôi sẽ mời quan khách thưởng thức món tráng miệng đặc biệt của chúng ta ngay bây giờ.', key: 'short tasting of our signature dessert' },
  { npc: ['Thien An, the sound system just dropped out for a moment. Can you keep the donors comfortable while we fix it?', 'Thiên Ân, hệ thống âm thanh vừa mất tiếng một lúc. Bạn giữ cho các nhà tài trợ thoải mái trong lúc chúng tôi sửa nhé?'], cue: 'Of course, Madam Victoria. I will share a short story about our charity work while the team reconnects.', cueVi: 'Tất nhiên rồi, thưa bà Victoria. Tôi sẽ kể một câu chuyện ngắn về công việc từ thiện trong lúc đội kỹ thuật kết nối lại.', key: 'share a short story about our charity work' },
  { npc: ['Thien An, the chandelier lights are too bright for the speech. Can you calm the room before the chairwoman arrives?', 'Thiên Ân, đèn chùm quá chói cho bài phát biểu. Bạn làm dịu không khí trước khi bà chủ tịch tới nhé?'], cue: 'Certainly, Madam Victoria. I will ask the guests to take their seats and enjoy the music for a moment.', cueVi: 'Dạ được, thưa bà Victoria. Tôi sẽ mời quan khách về chỗ và thưởng thức âm nhạc một lát.', key: 'enjoy the music for a moment' },
];

const GA_QUIZ: { npc: Pair; question: string; ok: string; wrong: [string, string]; cueVi: string }[] = [
  { npc: ['Urgent in-ear update: Do NOT mention the technical glitch! Instead, spotlight the Charity Auction catalog on their tables!', 'Khẩn cấp qua In-ear: ĐỪNG nhắc đến lỗi kỹ thuật! Thay vào đó hãy hướng sự chú ý vào cuốn Ấn phẩm Đấu giá Từ thiện trên bàn tiệc!'], question: 'Bạn phải nói gì với khán phòng ngay lúc này (Phản xạ 15s)?', ok: 'While we prepare our next visual showcase, we invite you to preview the exclusive Charity Auction catalog on your tables!', wrong: ['We apologize because our main LED projector just crashed backstage, please wait five minutes.', 'Let us take an unscheduled twenty-minute intermission while the crew fixes the cables.'], cueVi: 'Trong lúc chuẩn bị phần trình chiếu tiếp theo, xin mời quý vị khám phá ấn phẩm Đấu giá Từ thiện đặc biệt ngay trên bàn tiệc!' },
  { npc: ['Urgent in-ear update: The guest of honor is still on the highway! Do NOT give a time. Keep the guests seated and calm.', 'Khẩn cấp qua In-ear: Khách danh dự vẫn đang trên đường cao tốc! ĐỪNG nêu thời gian cụ thể. Giữ khách ngồi yên và thoải mái.'], question: 'Bạn nên nói gì với khán phòng ngay lúc này (Phản xạ 15s)?', ok: 'Our distinguished guest is on the way, so please enjoy the dessert buffet while we wait for them!', wrong: ['Our guest of honor is stuck on the highway, so the event is cancelled and you may leave now.', 'We will start the speeches without the guest, and we apologize for the rush.'], cueVi: 'Vị khách danh dự đang trên đường tới, xin mời quý vị thưởng thức món tráng miệng trong lúc chờ đợi nhé!' },
  { npc: ['Urgent in-ear update: The lights are flickering again! Do NOT mention electricity. Calm the room and keep the mood.', 'Khẩn cấp qua In-ear: Đèn lại chớp chớp! ĐỪNG nhắc đến điện. Giữ bình tĩnh và giữ không khí.'], question: 'Bạn nên nói gì với khán phòng ngay lúc này (Phản xạ 15s)?', ok: 'Please stay seated, everyone, as we adjust the lighting for a more beautiful evening together!', wrong: ['The electricity is broken, so please go outside and wait for the bus.', 'Our lighting engineer has quit, so the rest of the show is cancelled.'], cueVi: 'Xin quý vị cứ ngồi yên, chúng tôi đang chỉnh lại ánh sáng để buổi tối thêm đẹp nhé!' },
  { npc: ['Urgent in-ear update: The donation tablet is offline! Do NOT say the system failed. Invite donors to pledge at their tables.', 'Khẩn cấp qua In-ear: Máy quyên góp đang ngoại tuyến! ĐỪNG nói hệ thống hỏng. Mời nhà tài trợ cam kết ngay tại bàn.'], question: 'Bạn nên nói gì với khán phòng ngay lúc này (Phản xạ 15s)?', ok: 'Please take a pledge card from your table, and our team will collect your generous support shortly!', wrong: ['The donation system crashed, so please come back another night.', 'The charity is closed for today, so please leave your money at home.'], cueVi: 'Xin mời quý vị lấy phiếu cam kết trên bàn, đội ngũ sẽ thu nhận sự ủng hộ của quý vị ngay thôi!' },
];

const GA_SEMI: { npc: Pair; frame: string; cueVi: string; pools: string[][] }[] = [
  { npc: ['Brilliant recovery! Every table is looking at the auction items now. Can you highlight how 100% of proceeds support children’s education?', 'Cứu nguy xuất sắc! Mọi bàn đang xem vật phẩm đấu giá. Bạn nhấn mạnh rằng 100% số tiền thu được hỗ trợ giáo dục trẻ em nhé!'], frame: 'Every single contribution tonight goes directly toward empowering ___ and transforming ___ across the country.', cueVi: 'Mỗi đóng góp tối nay đều hướng trực tiếp tới việc chắp cánh cho ___ và thay đổi ___ trên khắp cả nước.', pools: [['education', 'children', 'students', 'young minds'], ['lives', 'futures', 'communities', 'dreams']] },
  { npc: ['Wonderful! While we wait, tell the donors how tonight’s auction will help our community.', 'Tuyệt vời! Trong lúc chờ, bạn hãy cho các nhà hảo tâm biết buổi đấu giá tối nay sẽ giúp cộng đồng ra sao.'], frame: 'While we wait, every bid tonight helps build a ___ for children and a ___ for communities.', cueVi: 'Trong lúc chờ đợi, mỗi lượt đấu giá tối nay giúp xây một ___ cho trẻ em và một ___ cho cộng đồng.', pools: [['library', 'school', 'clinic', 'playground'], ['future', 'home', 'start', 'dream']] },
  { npc: ['Lovely! Now tell the donors how their pledges will help hospitals in the countryside.', 'Dễ thương quá! Giờ hãy cho các nhà tài trợ biết các cam kết sẽ giúp bệnh viện ở vùng quê thế nào.'], frame: 'Every pledge tonight will bring ___ to remote ___ and new hope to families.', cueVi: 'Mỗi cam kết tối nay sẽ mang ___ tới những ___ xa xôi và niềm hy vọng mới cho các gia đình.', pools: [['medicine', 'care', 'doctors', 'supplies'], ['villages', 'clinics', 'towns', 'schools']] },
  { npc: ['Excellent! Please explain how tonight’s gifts will help young artists find their voice.', 'Xuất sắc! Hãy giải thích món quà tối nay sẽ giúp các nghệ sĩ trẻ tìm thấy tiếng nói của mình thế nào.'], frame: 'Your generosity tonight will open ___ for young artists and give them a ___ to shine.', cueVi: 'Sự hào phóng của quý vị tối nay sẽ mở ra ___ cho các nghệ sĩ trẻ và cho họ ___ để tỏa sáng.', pools: [['doors', 'studios', 'stages', 'classrooms'], ['chance', 'spotlight', 'home', 'voice']] },
];

const GA_FREE: { npc: Pair; sample: string; requiredKeywords: string[][]; key: string }[] = [
  { npc: ['In-ear: The screen is back online! Wrap up smoothly and invite Chairwoman Victoria to the podium!', 'In-ear: Màn hình hoạt động lại rồi! Kết thúc thật mượt và mời Chủ tịch Victoria lên bục phát biểu!'], sample: 'Thank you all for your incredible generosity tonight! Now, please join me in welcoming Chairwoman Victoria to the podium!', requiredKeywords: [['victoria', 'chairwoman'], ['welcome', 'invite', 'stage', 'podium', 'applause']], key: 'welcoming Chairwoman Victoria to the podium' },
  { npc: ['In-ear: The guest of honor has just entered the hall! Thank everyone for their patience, then invite Chairwoman Victoria to the podium.', 'In-ear: Khách danh dự vừa vào sảnh! Cảm ơn mọi người đã kiên nhẫn, rồi mời Chủ tịch Victoria lên bục.'], sample: 'Thank you all for your patience! Please join me in welcoming Chairwoman Victoria to the podium!', requiredKeywords: [['victoria', 'chairwoman'], ['welcome', 'invite', 'stage', 'podium', 'applause']], key: 'thank you all for your patience' },
  { npc: ['In-ear: The lights are steady again! Thank the donors, then invite Chairwoman Victoria to the stage.', 'In-ear: Đèn đã ổn định lại! Cảm ơn các nhà hảo tâm, rồi mời Chủ tịch Victoria lên sân khấu.'], sample: 'Thank you all for your kindness tonight! Please welcome Chairwoman Victoria to the stage!', requiredKeywords: [['victoria', 'chairwoman'], ['welcome', 'invite', 'stage', 'podium', 'applause']], key: 'please welcome Chairwoman Victoria to the stage' },
  { npc: ['In-ear: The program is back on track! Thank the guests, then invite Madam Victoria to the podium.', 'In-ear: Chương trình đã trở lại đúng lịch! Cảm ơn quan khách, rồi mời bà Victoria lên bục.'], sample: 'Thank you, everyone, for your generosity! Please invite Madam Victoria to the podium for her speech.', requiredKeywords: [['victoria', 'chairwoman', 'madam'], ['welcome', 'invite', 'stage', 'podium', 'applause']], key: 'invite Madam Victoria to the podium' },
];

const GA_GRANDPA: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Young lady, is there a seat left near the front? I have been waiting so long for this dessert.', 'Cháu ơi, còn chỗ nào gần phía trước không? Ông chờ món tráng miệng này lâu lắm rồi.'], cue: 'Yes, sir! There is a seat in the front row, on your right. Enjoy the dessert, sir!', cueVi: 'Dạ có ạ! Còn một chỗ ở hàng ghế đầu, bên tay phải ông. Chúc ông thưởng thức món tráng miệng ạ!', key: 'front row, on your right' },
  { npc: ['Young lady, is the donation table near the entrance? I would like to contribute before the speeches.', 'Cháu ơi, bàn quyên góp có ở gần cổng không? Ông muốn đóng góp trước khi có phát biểu.'], cue: 'Yes, sir! The donation table is just past the entrance, on your left. Thank you for your generosity!', cueVi: 'Dạ có ạ! Bàn quyên góp ở ngay sau cổng, bên tay trái ông. Cảm ơn sự hào phóng của ông ạ!', key: 'just past the entrance' },
  { npc: ['Young lady, where can I find a glass of water? The room is warm tonight.', 'Cháu ơi, ở đâu có ly nước? Phòng hôm nay nóng quá.'], cue: 'Of course, sir! The water station is by the bar, just to the right of the main entrance.', cueVi: 'Dạ được ạ! Quầy nước ở cạnh quầy bar, ngay bên phải cổng chính ạ.', key: 'water station is by the bar' },
  { npc: ['Young lady, is the restroom far from here? My knees are not as young as they used to be.', 'Cháu ơi, nhà vệ sinh có xa không? Đầu gối ông không còn khỏe như xưa.'], cue: 'Not at all, sir! The restroom is just down the corridor, past the photo corner.', cueVi: 'Không xa đâu ạ! Nhà vệ sinh ở cuối hành lang, qua góc chụp ảnh ạ.', key: 'just down the corridor' },
];

function gala(day: number): TurnData[] {
  const S = 'gala';
  const o1 = pick(GA_OPEN, S, day, 'ga1');
  const q2 = pick(GA_QUIZ, S, day, 'ga2');
  const s3 = pick(GA_SEMI, S, day, 'ga3');
  const f4 = pick(GA_FREE, S, day, 'ga4');
  const g5 = pick(GA_GRANDPA, S, day, 'ga5');
  return [
    { mode: 'scripted', who: 'victoria', npc: o1.npc[0], npcVi: o1.npc[1], cue: o1.cue, cueVi: o1.cueVi, key: o1.key, tip: 'Phong thái đĩnh đạc, tự tin tuyệt đối trước sự cố sân khấu.' },
    quizTurn(q2, S, day, 'ga2', { who: 'alex', channel: 'inear', reflex: 15, tip: 'Quy tắc vàng của MC Gala: biến thời gian chờ kỹ thuật thành phần giới thiệu tự nhiên.' }),
    semiTurn(s3, S, day, 'ga3', { who: 'victoria', tip: 'Nhấn giọng ở cụm đầu để chạm tới trái tim các nhà hảo tâm.' }),
    freeTurn(
      { npc: f4.npc, requiredKeywords: f4.requiredKeywords, bonusKeywords: [['generosity', 'support', 'kindness', 'thank', 'patience'], ['honor', 'pleasure', 'distinguished']], forbiddenKeywords: ['glitch', 'broken', 'crashed', 'error'], sample: f4.sample, minWords: 10, key: f4.key },
      { who: 'alex', channel: 'inear', task: 'Cảm ơn quý vị và trân trọng mời Chủ tịch Victoria lên bục.', taskVi: 'Bắt buộc nhắc tới Victoria và lời mời/cảm ơn (welcome / invite / podium / applause). Không nhắc đến lỗi kỹ thuật.', tip: 'Tuyệt đối không dùng các từ cấm như "glitch", "broken", "error"!' },
    ),
    { mode: 'scripted', who: 'grandpa', npc: g5.npc[0], npcVi: g5.npc[1], cue: g5.cue, cueVi: g5.cueVi, key: g5.key, tip: 'Trả lời kính trọng và chỉ chỗ ngồi rõ ràng cho người lớn tuổi.' },
  ];
}

// ───────────────────────── INTERVIEW (20:00, David) ─────────────────────────

const IV_OPEN: { npc: Pair; cue: string; cueVi: string; key: string }[] = [
  { npc: ['Good evening, Thien An! It is a pleasure to join you live on English Stage Tonight.', 'Chào buổi tối, Thiên Ân! Rất hân hạnh được trò chuyện trực tiếp cùng bạn trên chương trình tối nay.'], cue: 'Welcome to the show, Mr. Tran! Our viewers are eager to hear how artificial intelligence is reshaping education.', cueVi: 'Chào mừng ông đến với chương trình, ông Trần! Khán giả đang rất háo hức muốn nghe trí tuệ nhân tạo đang định hình lại giáo dục như thế nào.', key: 'artificial intelligence is reshaping education' },
  { npc: ['Good evening, Thien An! Thank you for giving me a few minutes before the broadcast starts.', 'Chào buổi tối, Thiên Ân! Cảm ơn bạn đã dành cho tôi vài phút trước khi chương trình phát sóng.'], cue: 'Welcome to the show, Mr. Tran! Our viewers are curious how green startups are changing the market today.', cueVi: 'Chào mừng ông đến với chương trình, ông Trần! Khán giả rất tò mò các startup xanh đang thay đổi thị trường như thế nào.', key: 'how green startups are changing the market today' },
  { npc: ['Good evening, Thien An! I have been looking forward to this conversation about young leaders.', 'Chào buổi tối, Thiên Ân! Tôi rất mong chờ cuộc trò chuyện về các nhà lãnh đạo trẻ.'], cue: 'Welcome to the show, Mr. Tran! Our viewers want to know what makes a young leader truly inspiring.', cueVi: 'Chào mừng ông đến với chương trình, ông Trần! Khán giả muốn biết điều gì khiến một nhà lãnh đạo trẻ thật sự truyền cảm hứng.', key: 'what makes a young leader truly inspiring' },
  { npc: ['Good evening, Thien An! Our company just launched a new learning app, so I am excited to talk about it.', 'Chào buổi tối, Thiên Ân! Công ty chúng tôi vừa ra mắt một ứng dụng học tập mới, nên tôi rất hào hứng để nói về nó.'], cue: 'Welcome to the show, Mr. Tran! Let us begin with your new learning app and how it helps students.', cueVi: 'Chào mừng ông đến với chương trình, ông Trần! Chúng ta bắt đầu với ứng dụng học tập mới và cách nó giúp học sinh.', key: 'your new learning app and how it helps students' },
];

const IV_QUIZ: { npc: Pair; question: string; ok: string; wrong: [string, string]; cueVi: string }[] = [
  { npc: ['Control room in-ear: We only have ninety seconds left before commercial break! Pivot to a concise question about young talent!', 'Phòng máy nhắc qua In-ear: Chỉ còn 90 giây trước khi cắt quảng cáo! Hãy chuyển nhanh sang câu hỏi ngắn gọn về nhân tài trẻ!'], question: 'Bạn chuyển hướng câu hỏi thế nào khi chỉ còn 90 giây (Phản xạ 15s)?', ok: 'Before we head to a quick break, what is your number one piece of advice for young professionals today?', wrong: ['Before our break, could you walk us through the full twenty-year financial history of your corporation?', 'Before our break, could you tell us your startup\'s biggest mistake and how much money it cost you?'], cueVi: 'Trước khi đến với ít phút giải lao, lời khuyên số một của ông dành cho những người trẻ hôm nay là gì?' },
  { npc: ['Control room in-ear: The sponsor break starts in two minutes! Ask one short question that lets Mr. Tran wrap up his main idea.', 'Phòng máy nhắc qua In-ear: Còn hai phút nữa là đến giờ nghỉ quảng cáo! Hãy hỏi một câu ngắn để ông Trần tóm tắt ý chính.'], question: 'Bạn nên hỏi gì để ông Trần kết lại ý chính (Phản xạ 15s)?', ok: 'Before our break, could you sum up the main idea of your startup journey in one sentence?', wrong: ['Before our break, could you list every contract your company has signed in the last ten years?', 'Before our break, could you tell us which competitor you think will fail next year?'], cueVi: 'Trước giờ nghỉ, ông có thể tóm tắt ý chính về hành trình khởi nghiệp của mình trong một câu không?' },
  { npc: ['Control room in-ear: The camera needs a reset in one minute! Ask a question that brings the guest back to the main topic.', 'Phòng máy nhắc qua In-ear: Máy quay cần reset trong một phút! Hãy hỏi một câu đưa khách mời về chủ đề chính.'], question: 'Bạn nên hỏi gì để đưa khách mời về chủ đề chính (Phản xạ 15s)?', ok: 'Before we reset the camera, could you tell our viewers what the most important lesson of your career has been?', wrong: ['Before we reset the camera, could you describe your childhood in every detail, year by year?', 'Before we reset the camera, could you give us your personal opinion on the next election?'], cueVi: 'Trước khi chỉnh lại máy quay, ông có thể cho khán giả biết bài học quan trọng nhất trong sự nghiệp là gì không?' },
  { npc: ['Control room in-ear: Twenty seconds to the next segment! Ask for one practical tip that our audience can use this week.', 'Phòng máy nhắc qua In-ear: Còn hai mươi giây đến phân đoạn tiếp theo! Hãy hỏi một mẹo thực tế mà khán giả dùng được trong tuần này.'], question: 'Bạn nên hỏi gì để có một mẹo thực tế cho khán giả (Phản xạ 15s)?', ok: 'Before the next segment, could you share one practical tip our viewers can use this week?', wrong: ['Before the next segment, could you list every product your company has sold since its founding?', 'Before the next segment, could you tell us which of your products was your personal favorite?'], cueVi: 'Trước phân đoạn tiếp theo, ông có thể chia sẻ một mẹo thực tế mà khán giả dùng được trong tuần này không?' },
];

const IV_CATCH: { npc: Pair; cue: string; cueVi: string; catch: string[]; key: string }[] = [
  { npc: ['My advice is simple: stay relentlessly curious, embrace lifelong learning, and never fear making mistakes.', 'Lời khuyên của tôi rất đơn giản: luôn tò mò không ngừng, đón nhận việc học suốt đời và đừng bao giờ sợ mắc sai lầm.'], cue: 'Stay relentlessly {curious} and embrace {lifelong} learning—what an inspiring message for our audience!', cueVi: 'Luôn tò mò không ngừng và đón nhận việc học suốt đời—thật là một thông điệp truyền cảm hứng cho khán giả!', catch: ['cautious', 'instant', 'temporary', 'nervous'], key: 'relentlessly curious and embrace lifelong learning' },
  { npc: ['A startup succeeds when it stays focused on customers, listens closely, and keeps improving every single day.', 'Một startup thành công khi luôn tập trung vào khách hàng, lắng nghe kỹ và không ngừng cải tiến mỗi ngày.'], cue: 'So a startup must stay {focused} on customers and keep {improving} every single day, thank you, Mr. Tran!', cueVi: 'Vậy một startup phải luôn tập trung vào khách hàng và không ngừng cải tiến mỗi ngày. Cảm ơn ông Trần!', catch: ['distracted', 'ignoring', 'sleeping', 'quitting'], key: 'stays focused on customers and keeps improving' },
  { npc: ['Green business works best when it saves energy, reduces waste, and keeps its promises to the community.', 'Kinh doanh xanh hiệu quả nhất khi tiết kiệm năng lượng, giảm rác thải và giữ lời hứa với cộng đồng.'], cue: 'So green business must {save} energy and {reduce} waste every single day, what an inspiring idea!', cueVi: 'Vậy kinh doanh xanh phải tiết kiệm năng lượng và giảm rác thải mỗi ngày—thật là một ý tưởng truyền cảm hứng!', catch: ['destroy', 'ignore', 'forget', 'pollute'], key: 'save energy and reduce waste' },
  { npc: ['Good leaders listen first, share credit generously, and invite honest feedback from the whole team.', 'Lãnh đạo giỏi lắng nghe trước, chia sẻ công lao một cách rộng rãi và mời góp ý thật lòng từ cả đội.'], cue: 'So good leaders must {listen} first and {share} credit generously with their team, thank you!', cueVi: 'Vậy lãnh đạo giỏi phải lắng nghe trước và chia sẻ công lao rộng rãi với cả đội. Cảm ơn ông!', catch: ['ignore', 'shout', 'hide', 'blame'], key: 'listen first and share credit generously' },
];

const IV_FREE: { npc: Pair; sample: string; key: string }[] = [
  { npc: ['Thank you for having me, Thien An! This was one of the most enjoyable interviews I have done all year.', 'Cảm ơn vì đã mời tôi, Thiên Ân! Đây là một trong những buổi phỏng vấn thú vị nhất của tôi trong cả năm.'], sample: 'Thank you so much for your inspiring insights, Mr. Tran! And thank you to all our viewers for watching—have a wonderful night!', key: 'thank you to all our viewers for watching' },
  { npc: ['Thank you, Thien An! Tonight we talked about a lot of important ideas, and I hope the audience enjoyed them.', 'Cảm ơn bạn, Thiên Ân! Tối nay chúng ta nói về nhiều ý tưởng quan trọng, và tôi hy vọng khán giả thích chúng.'], sample: 'Thank you for the wonderful conversation, Thien An! Goodnight to our audience, and stay tuned for next week!', key: 'goodnight to our audience' },
  { npc: ['It was a real pleasure to be here, Thien An. Thank you for such a warm and thoughtful evening.', 'Thật sự rất vui khi được có mặt ở đây, Thiên Ân. Cảm ơn bạn vì một buổi tối ấm áp và chu đáo.'], sample: 'It was a real pleasure, Mr. Tran! Thank you, and goodnight to all our viewers watching at home!', key: 'goodnight to all our viewers' },
  { npc: ['Thank you, Thien An. I believe our conversation will help many young people think differently about their future.', 'Cảm ơn Thiên Ân. Tôi tin cuộc trò chuyện này sẽ giúp nhiều bạn trẻ nghĩ khác về tương lai.'], sample: 'Thank you, Mr. Tran, for sharing your story! Goodnight to our viewers, and see you next time!', key: 'see you next time' },
];

function interview(day: number): TurnData[] {
  const S = 'interview';
  const o1 = pick(IV_OPEN, S, day, 'iv1');
  const q2 = pick(IV_QUIZ, S, day, 'iv2');
  const c3 = pick(IV_CATCH, S, day, 'iv3');
  const f4 = pick(IV_FREE, S, day, 'iv4');
  return [
    { mode: 'scripted', who: 'david', npc: o1.npc[0], npcVi: o1.npc[1], cue: o1.cue, cueVi: o1.cueVi, key: o1.key, tip: 'Phát âm chuẩn xác các cụm từ khóa của chủ đề.' },
    quizTurn(q2, S, day, 'iv2', { who: 'alex', channel: 'inear', reflex: 15, tip: 'Dùng cụm chuyển ý chuyên nghiệp để giới hạn độ dài câu trả lời của khách mời.' }),
    catchTurn(c3, { who: 'david', tip: 'Kỹ thuật Active Listening: nhắc lại đúng hai động từ then chốt mà khách mời vừa nói.' }),
    freeTurn(
      { npc: f4.npc, requiredKeywords: [['thank', 'thanks', 'pleasure', 'grateful'], ['viewers', 'audience', 'watching', 'goodnight', 'night', 'next time']], bonusKeywords: [['david', 'tran', 'inspiring', 'insightful'], ['wonderful', 'evening', 'stay tuned']], sample: f4.sample, minWords: 11, key: f4.key },
      { who: 'david', task: 'Cảm ơn CEO David Tran và chào tạm biệt khán giả truyền hình.', taskVi: 'Bắt buộc cảm ơn khách mời (thank / David / Tran) và chào kết chương trình (viewers / audience / goodnight / next time).', tip: 'Nhìn thẳng vào ống kính máy quay chính khi chào khán giả!' },
    ),
  ];
}

export const SHOW_GENERATORS: Record<string, (day: number) => TurnData[]> = {
  backstage,
  wedding,
  beach,
  gala,
  interview,
};
