/**
 * Trò chuyện rẽ nhánh: 6 cuộc nói chuyện hậu trường bám việc thật của MC.
 * Mỗi lượt: nhân vật hỏi (ask), người học tự trả lời, máy dò ý theo `need` để chọn câu đáp (react).
 * Quy ước viết (tests/talk.test.mjs kiểm):
 * - mọi câu mẫu `say` phải được nhận đúng ý của chính nó; câu lạc đề không trúng ý nào
 * - ý cụ thể hơn khai báo trước; câu trả lời mơ hồ (`stay`) khai báo sau cùng
 * - nhân vật phải có giọng trong tools/voices.kokoro.json (câu thoại được render ở phase `talk`)
 */
import type { Talk, TalkReply } from '../core/talk';

/** Ý cụ thể: hội thoại đi tiếp */
const r = (label: string, need: string[][], say: string, react: string): TalkReply => ({ label, need, say, react });
/** Hỏi lại cho rõ: nhân vật giải thích, chưa đi tiếp */
const ask = (label: string, need: string[][], say: string, react: string): TalkReply => ({ label, need, say, react, stay: true });
/** Trả lời mơ hồ: nhân vật hỏi vặn, chưa đi tiếp */
const vague = (words: string[], react: string): TalkReply => ({ label: 'Trả lời còn chung chung', need: [words], react, stay: true });

const OK = ['yes', 'yeah', 'okay', 'ok', 'sure', 'fine', 'all right', 'alright'];
const CALM = ['no problem', 'do not worry', "don't worry", 'not a problem', ...OK];
const ANY = ['any', 'anything', 'anywhere', 'either', 'whatever', 'up to you', 'you decide', 'your choice', 'do not mind', "don't mind", ...OK];
const HELLO = ['hello', 'hi', 'good morning', 'good evening', ...OK];

export const TALKS: Talk[] = [
  {
    id: 'bride-call',
    npcId: 'couple',
    speaker: 'emma',
    name: 'Emma',
    kind: 'Tiệc cưới',
    roleVi: 'Cô dâu gọi cho MC ba ngày trước tiệc cưới',
    goalVi: 'Chốt thứ tự chương trình và xử lý một thay đổi phút chót.',
    cefr: 'B1',
    nodes: [
      {
        ask: "Hi Thien An, it's Emma! Sorry to call so late. Have you got a few minutes to go through Saturday's program with me?",
        askVi: 'Chào Thiên Ân, Emma đây! Xin lỗi gọi muộn thế này. Bạn có vài phút để cùng mình xem lại chương trình thứ Bảy không?',
        task: 'Nhận lời và mời Emma bắt đầu.',
        nudge: 'Sorry, the line is a bit bad. Is now a good time to talk about Saturday?',
        replies: [
          r('Sẵn sàng, mời bắt đầu', [['of course', 'sure', 'no problem', 'happy to', 'absolutely', 'certainly', 'yes'], ['go ahead', 'start', 'begin', 'go through', 'ready', 'tell me', 'listening']], "Of course, Emma. I'm ready, so please go ahead.", 'Oh, thank you. You are a lifesaver.'),
          r('Xin một phút lấy ghi chú', [['minute', 'moment', 'second', 'notes']], 'Sure. Give me one minute to get my notes.', 'No rush at all, take your time. Right, here we go.'),
          vague(HELLO, 'Lovely. So, shall we start from the top?'),
        ],
      },
      {
        ask: 'So, first of all, what happens when the doors open? Do we walk in straight away, or do you say something first?',
        askVi: 'Trước hết, khi cửa mở thì sao? Tụi mình bước vào ngay, hay bạn nói gì đó trước?',
        task: 'Nói rõ thứ tự: bạn chào khách trước, rồi mới mời cô dâu chú rể vào (hoặc ngược lại).',
        nudge: 'Sorry, I am a bit lost. Who comes first, you or us?',
        replies: [
          r('MC chào khách trước, rồi rước dâu', [['welcome', 'greet', 'introduce', 'announce', 'say a few words', 'speak'], ['then', 'after', 'before', 'first', 'once']], "I'll welcome the guests first, and then I'll announce your grand entrance.", 'Perfect. That gives me a moment to breathe.'),
          r('Cô dâu chú rể vào ngay', [['straight away', 'right away', 'immediately', 'directly', 'walk in']], "You'll walk in straight away, as soon as the music starts.", 'Oh! Straight in. Okay, I will need to be ready at the door, then.'),
          vague(['i think', 'maybe', 'not sure', ...OK], 'Mm, but which one is it? You first, or us first?'),
        ],
      },
      {
        ask: "And the first toast. Liam's father wants to give it, but he is very nervous. How long should he speak?",
        askVi: 'Còn phần nâng ly đầu tiên. Bố của Liam muốn phát biểu nhưng ông rất hồi hộp. Ông nên nói bao lâu?',
        task: 'Đề xuất một thời lượng ngắn, hoặc nói bạn sẽ hỗ trợ ông.',
        nudge: 'Sorry, how many minutes did you say?',
        replies: [
          r('Một đến hai phút', [['minute', 'minutes'], ['one', 'two', 'a couple', 'couple']], 'Two minutes is perfect. Short and warm is always best.', 'Two minutes. He will be so relieved.'),
          r('Tôi sẽ đứng cạnh hỗ trợ ông', [['help', 'support', 'introduce', 'next to', 'with him', 'beside', 'guide']], "Don't worry. I'll introduce him and stand next to him.", 'Would you? That would calm him down so much.'),
          vague(['not long', 'not too long', 'short', 'brief', 'depends', 'up to him', ...ANY], 'Yes, but he wants a number. One minute? Five?'),
        ],
      },
      {
        ask: "Oh, one more thing. Liam's grandmother wants to say a few words too, but she only speaks Vietnamese, and she is very shy. What can we do?",
        askVi: 'À, còn một chuyện. Bà của Liam cũng muốn nói vài lời, nhưng bà chỉ nói tiếng Việt và rất nhút nhát. Mình làm sao đây?',
        task: 'Đề xuất cách giải quyết: bạn dịch cho bà, hoặc để bà nói ngắn tại bàn.',
        nudge: 'Sorry, so how would that work with the language?',
        replies: [
          r('Bà nói tiếng Việt, tôi dịch', [['translate', 'translation', 'interpret', 'in english', 'into english']], "No problem. She can speak in Vietnamese, and I'll translate into English.", 'Oh, that is so kind. She will love that.'),
          r('Bà ngồi tại bàn, nói vài lời', [['table', 'seat', 'sit', 'few words', 'one sentence', 'bring her the microphone']], "She can stay at her table and say just a few words. I'll bring her the microphone.", 'At her table, yes. She would be far more comfortable there.'),
          vague(CALM, "That's sweet, but how, exactly? She doesn't speak any English."),
        ],
      },
      {
        ask: 'Right. And the first dance. When should we do it, before dinner or after?',
        askVi: 'Rồi. Còn điệu nhảy đầu tiên. Nên làm lúc nào, trước hay sau bữa tối?',
        task: 'Chọn một thời điểm và nêu lý do ngắn.',
        nudge: 'Sorry, before dinner or after dinner?',
        replies: [
          r('Sau bữa tối', [['after']], 'I suggest after dinner, when everyone is relaxed and ready to dance.', 'After dinner. Yes, and then the party can start straight away.'),
          r('Trước bữa tối', [['before']], 'I suggest before dinner, while everyone is still fresh.', 'Before dinner. Good idea, my dress will still look perfect.'),
          vague(['depends', 'both', ...ANY], 'I honestly cannot decide. What would you do, as the MC?'),
        ],
      },
    ],
    end: 'That is everything I needed. Thank you so much, Thien An. See you on Saturday!',
    endVi: 'Vậy là đủ những gì mình cần. Cảm ơn Thiên Ân nhiều. Hẹn gặp thứ Bảy nhé!',
  },
  {
    id: 'venue-walk',
    npcId: 'victoria',
    name: 'Victoria',
    kind: 'Tiệc cưới',
    roleVi: 'Điều phối viên khách sạn đi duyệt sảnh tiệc cùng MC',
    goalVi: 'Chốt vị trí đứng, micro, và tín hiệu khi cô dâu vào.',
    cefr: 'B2',
    nodes: [
      {
        ask: "Good morning, you must be the MC. I'm Victoria. We have about ten minutes, so shall we start with the stage?",
        askVi: 'Chào buổi sáng, chắc bạn là MC. Tôi là Victoria. Chúng ta có khoảng mười phút, mình bắt đầu từ sân khấu nhé?',
        task: 'Chào, tự giới thiệu mình là MC, và đồng ý bắt đầu.',
        nudge: 'Sorry, are you the MC for tonight?',
        replies: [
          r('Chào và tự giới thiệu', [['i am', "i'm", 'my name', 'this is'], ['mc', 'thien an', 'host', 'master of ceremonies']], "Good morning, Victoria. I'm Thien An, the MC for tonight. Yes, let's start with the stage.", 'Lovely to meet you. This way, please.'),
          r('Hỏi giờ mở cửa trước', [['what time', 'when', 'how long', 'how much time']], 'Good morning. Before we start, what time do the doors open?', 'Doors open at six sharp. Now, the stage.'),
          vague(HELLO, 'And you are? Sorry, I have met six people this morning.'),
        ],
      },
      {
        ask: 'Here we are. The stage is eight metres wide, with stairs on the left only. Where would you like to stand?',
        askVi: 'Tới rồi. Sân khấu rộng tám mét, chỉ có cầu thang bên trái. Bạn muốn đứng ở đâu?',
        task: 'Chọn vị trí đứng (trái, phải hoặc giữa) và nói lý do.',
        nudge: 'Sorry, left, right or centre?',
        replies: [
          r('Bên trái, gần cầu thang', [['left']], "I'll stand on the left, near the stairs, so I can welcome speakers on stage.", 'Sensible. The stairs are a little steep, so mind your step.'),
          r('Ở giữa sân khấu', [['centre', 'center', 'middle']], "I'll stand in the centre, so everyone can see me.", 'Centre stage. Then we will move the flowers a little.'),
          r('Bên phải, cạnh bục', [['right side', 'on the right', 'podium', 'lectern']], "I'd prefer the right side, next to the podium.", 'The right side. Fine, but remember the stairs are on the other side.'),
          vague(ANY, 'I do need an answer for the lighting team. Left, right or centre?'),
        ],
      },
      {
        ask: 'Now, microphones. We have two wireless handhelds and one headset. Which do you need?',
        askVi: 'Giờ tới micro. Chúng tôi có hai micro không dây cầm tay và một micro đeo tai. Bạn cần loại nào?',
        task: 'Chọn loại micro. Điểm cộng: xin thêm một micro dự phòng.',
        nudge: 'Sorry, handheld or headset?',
        replies: [
          r('Micro cầm tay và một cái dự phòng', [['handheld', 'hand held', 'wireless'], ['spare', 'backup', 'back up', 'second', 'extra', 'another', 'both']], 'A wireless handheld, please, and a spare one at the side of the stage.', 'A spare. Good, you have clearly done this before.'),
          r('Micro cầm tay', [['handheld', 'hand held', 'wireless']], "I'll take a wireless handheld, please.", 'One handheld. Noted.'),
          r('Micro đeo tai', [['headset', 'head set']], "I'd like the headset, so my hands are free.", 'The headset. I will have the sound engineer fit it at five.'),
          vague(ANY, 'The sound team needs to know now, I am afraid. Which one?'),
        ],
      },
      {
        ask: 'Ah. One problem. The battery in the main handheld is weak, and the spare is in another ballroom. What would you like us to do?',
        askVi: 'À, có một vấn đề. Pin của micro chính đang yếu, còn micro dự phòng ở sảnh khác. Bạn muốn chúng tôi làm gì?',
        task: 'Yêu cầu lịch sự: thay pin, hoặc mang micro dự phòng sang trước giờ mở cửa.',
        nudge: 'Sorry, what do you need from us, exactly?',
        replies: [
          r('Nhờ thay pin trước giờ mở cửa', [['battery', 'batteries', 'charge']], 'Could you please change the battery before the doors open?', 'Of course. I will have it done by five thirty.'),
          r('Nhờ mang micro dự phòng sang', [['bring', 'get', 'fetch', 'move', 'spare', 'other one', 'another']], 'Could someone bring the spare microphone here before we start?', 'I will send someone for it right now.'),
          vague(CALM, "It will be a problem at nine o'clock, I promise you. What shall we do about it?"),
        ],
      },
      {
        ask: 'Last thing. The bride enters through the main doors at seven. What signal do you want from me?',
        askVi: 'Việc cuối. Cô dâu vào qua cửa chính lúc bảy giờ. Bạn muốn tôi ra tín hiệu thế nào?',
        task: 'Đề nghị một tín hiệu cụ thể: giơ tay, gật đầu, hoặc báo qua bộ đàm.',
        nudge: 'Sorry, how will you know she is ready?',
        replies: [
          r('Giơ tay hoặc gật đầu', [['raise', 'wave', 'nod', 'thumbs', 'hand']], "Please raise your hand when the bride is ready, and I'll start the announcement.", 'A raised hand by the doors. Simple. I like it.'),
          r('Báo qua bộ đàm hoặc tin nhắn', [['message', 'text', 'call', 'radio', 'phone', 'earpiece', 'tell me']], 'Could you tell me on the radio when she is ready?', 'By radio, then. I will make sure you have an earpiece.'),
          vague(ANY, 'I would rather we agree on it now. A hand signal, or the radio?'),
        ],
      },
    ],
    end: 'Excellent. That is everything. See you at five for the sound check.',
    endVi: 'Tuyệt. Vậy là xong. Hẹn bạn lúc năm giờ để thử âm thanh.',
  },
  {
    id: 'brand-brief',
    npcId: 'maya',
    name: 'Maya',
    kind: 'Thương hiệu và triển lãm',
    roleVi: 'Giám đốc thương hiệu giao brief cho MC qua video call',
    goalVi: 'Nắm thông điệp, đề xuất hoạt động, và có phương án khi khách mời đến trễ.',
    cefr: 'B1',
    nodes: [
      {
        ask: "Hey Thien An, great to finally meet you! So, let me tell you a bit about Glow Day and what we're hoping for. Sound good?",
        askVi: 'Chào Thiên Ân, rất vui cuối cùng cũng gặp bạn! Để mình kể một chút về Glow Day và điều tụi mình mong muốn nhé. Được không?',
        task: 'Tỏ ra sẵn sàng nghe, hoặc hỏi ngay về khán giả.',
        nudge: 'Sorry, you broke up a little. Can I start the brief?',
        replies: [
          r('Hỏi trước về khán giả', [['who', 'audience', 'how many']], 'Sounds good. First, who is the audience?', 'Good question. Mostly young women, twenty to thirty, around three hundred people.'),
          r('Sẵn sàng nghe', [['sounds good', 'sounds great', 'go ahead', 'listening', 'tell me', 'ready', 'please']], 'Sounds great, Maya. Please go ahead.', 'Awesome.'),
          vague(HELLO, 'Great! So, are you ready for the brief?'),
        ],
      },
      {
        ask: 'Okay. Our key message is: healthy skin, every day. Simple, right? How would you say that to the crowd?',
        askVi: 'Được rồi. Thông điệp chính là: làn da khoẻ, mỗi ngày. Đơn giản đúng không? Bạn sẽ nói câu đó với khán giả thế nào?',
        task: 'Nói một câu dẫn có đủ thông điệp "healthy skin, every day".',
        nudge: 'Sorry, how would you say our message on stage?',
        replies: [
          r('Câu dẫn có đủ thông điệp', [['healthy skin'], ['every day', 'everyday', 'each day', 'daily']], 'Today is all about healthy skin, every day, for every one of you!', 'Yes! That is exactly the energy.'),
          ask('Xin nhắc lại thông điệp', [['again', 'repeat', 'once more', 'what was']], 'Sorry, could you say the key message again?', 'Sure. Healthy skin, every day. That is it. Now you try.'),
          vague(['nice', 'good', 'great', 'simple', 'easy', ...OK], 'Glad you like it. So how would you say it on stage?'),
        ],
      },
      {
        ask: 'Love it. Now, we want the crowd involved. Any ideas for a quick game or activity?',
        askVi: 'Thích quá. Giờ tụi mình muốn khán giả cùng tham gia. Bạn có ý tưởng trò chơi hay hoạt động nhanh nào không?',
        task: 'Đề xuất một hoạt động cụ thể: đố vui, thử thách chụp ảnh... Điểm cộng: có quà.',
        nudge: 'Sorry, what kind of activity?',
        replies: [
          r('Đố vui có quà', [['quiz', 'questions', 'trivia'], ['prize', 'prizes', 'gift', 'gifts', 'sample', 'samples']], 'How about a quick quiz about skincare, with free samples as prizes?', 'A quiz with prizes. Easy and fun. I love it.'),
          r('Đố vui', [['quiz', 'questions', 'trivia']], 'We could do a short quiz about skincare.', 'A quiz. Nice. We can add some prizes too.'),
          r('Thử thách chụp ảnh', [['photo', 'selfie', 'challenge', 'dance', 'video', 'contest', 'competition']], 'We could run a selfie challenge at the photo wall.', 'A selfie challenge! Great for social media.'),
          vague(['i think', 'maybe', 'not sure', 'game', 'activity', 'something', ...OK], 'Sure, but what kind? Give me one idea.'),
        ],
      },
      {
        ask: 'Okay, heads up. Our brand ambassador might be thirty minutes late. How would you fill the time?',
        askVi: 'Báo trước nhé. Đại sứ thương hiệu có thể đến trễ ba mươi phút. Bạn sẽ lấp khoảng thời gian đó thế nào?',
        task: 'Nêu việc bạn sẽ làm: thêm trò chơi, phỏng vấn chuyên gia, giới thiệu sản phẩm...',
        nudge: 'Sorry, thirty minutes is long. What is the plan?',
        replies: [
          r('Phỏng vấn chuyên gia, giới thiệu sản phẩm', [['interview', 'introduce', 'product', 'products', 'expert', 'story', 'video']], 'I can interview a skincare expert and introduce the products first.', 'Smart. That actually helps the sales team too.'),
          r('Thêm trò chơi với khán giả', [['game', 'games', 'quiz', 'activity', 'activities', 'challenge']], "No problem. I'll run an extra game with the audience until she arrives.", 'Perfect. Keep them busy and happy.'),
          vague(['wait', ...CALM], 'I love the confidence. But what will you actually do for thirty minutes?'),
        ],
      },
      {
        ask: 'Great. Last one. How do you want to close the show?',
        askVi: 'Tuyệt. Câu cuối. Bạn muốn kết chương trình thế nào?',
        task: 'Nêu cách kết: cảm ơn và mời khách ghé gian hàng, hoặc chụp ảnh chung.',
        nudge: 'Sorry, how should the show end?',
        replies: [
          r('Cảm ơn và mời ghé gian hàng', [['thank', 'thanks'], ['booth', 'visit', 'try', 'shop', 'store', 'counter']], "I'll thank everyone and invite them to visit the booth and try the products.", 'Thank you plus a call to action. Textbook.'),
          r('Chụp ảnh chung', [['photo', 'picture', 'selfie']], "Let's finish with a big group photo on stage.", 'A group photo. The marketing team will thank you.'),
          vague(['thank', 'thanks', 'goodbye', 'bye', 'simple', 'short', ...OK], 'And then? What should people do after the show?'),
        ],
      },
    ],
    end: 'That is a wrap. You are going to be great. See you next week!',
    endVi: 'Vậy là xong. Bạn sẽ làm rất tốt. Hẹn tuần sau nhé!',
  },
  {
    id: 'opening-rehearsal',
    npcId: 'grace',
    name: 'Grace',
    kind: 'Thương hiệu và triển lãm',
    roleVi: 'Quản lý cửa hàng tổng duyệt lễ khai trương',
    goalVi: 'Chốt phần cắt băng, đổi thứ tự vì đội lân, và phần bốc thăm.',
    cefr: 'B1',
    nodes: [
      {
        ask: "Thanks for coming tonight. I'm a bit nervous about tomorrow, honestly. Can we walk through the ribbon cutting first?",
        askVi: 'Cảm ơn bạn tối nay đã đến. Thật lòng là mình hơi lo cho ngày mai. Mình xem phần cắt băng trước được không?',
        task: 'Trấn an Grace và đồng ý bắt đầu.',
        nudge: 'Sorry, can we start with the ribbon cutting?',
        replies: [
          r('Trấn an và đồng ý', [['do not worry', "don't worry", 'no need to worry', 'relax', 'everything will', 'be fine']], "Don't worry, Grace. Everything will be fine. Let's walk through it together.", 'Thank you. I feel better already.'),
          r('Đồng ý bắt đầu', [['of course', 'sure', 'yes', 'certainly', 'happy to', 'no problem'], ['walk through', 'go through', 'start', 'begin', 'ribbon']], "Of course. Let's start with the ribbon cutting.", 'Great. Let us do it.'),
          vague(HELLO, 'Great. So, the ribbon cutting. Ready?'),
        ],
      },
      {
        ask: 'So, we have three VIPs cutting the ribbon. Where should they stand?',
        askVi: 'Mình có ba khách VIP cắt băng. Họ nên đứng ở đâu?',
        task: 'Chỉ một vị trí cụ thể: trước cửa, sau dải băng, hoặc trên sân khấu.',
        nudge: 'Sorry, where exactly?',
        replies: [
          r('Xếp hàng trước cửa, sau dải băng', [['front', 'door', 'entrance', 'behind the ribbon', 'in a line']], 'They should stand in a line behind the ribbon, in front of the entrance.', 'In front of the entrance. The photos will look great.'),
          r('Trên sân khấu', [['stage']], 'They can stand on the stage, facing the guests.', 'On stage. Okay, then we move the ribbon up there.'),
          vague(['together', 'there', 'here', ...ANY], 'Hmm, I need something clearer for the photographer. Where exactly?'),
        ],
      },
      {
        ask: 'Okay. And what will you say right before they cut?',
        askVi: 'Được. Vậy ngay trước khi họ cắt, bạn sẽ nói gì?',
        task: 'Nêu câu dẫn: đếm ngược, hoặc mời khách vỗ tay.',
        nudge: 'Sorry, what is your line before the cut?',
        replies: [
          r('Đếm ngược ba, hai, một', [['count', 'countdown', 'three two one', '3 2 1', 'three']], "I'll count down: three, two, one, and then they cut the ribbon.", 'A countdown. Everyone loves a countdown.'),
          r('Mời khách vỗ tay', [['applause', 'clap', 'hands together']], "I'll ask everyone to give a big round of applause.", 'Applause, yes. Loud and happy.'),
          vague(['something', 'few words', 'congratulations', 'not sure', ...OK], 'Sure, but what exactly? Give me the line.'),
        ],
      },
      {
        ask: 'Oh no, I forgot. The lion dance team can only perform before nine. But the ribbon cutting is at nine. What do we do?',
        askVi: 'Ôi, mình quên mất. Đội múa lân chỉ diễn được trước chín giờ. Mà cắt băng lại đúng chín giờ. Giờ làm sao?',
        task: 'Đề xuất thứ tự mới: múa lân trước, hoặc dời giờ cắt băng.',
        nudge: 'Sorry, so what comes first now?',
        replies: [
          r('Múa lân mở màn, rồi cắt băng', [['lion', 'dance'], ['first', 'before', 'earlier', 'start', 'open', 'eight']], "Let's put the lion dance first, and cut the ribbon right after it.", 'Lion dance first. That actually makes a great opening.'),
          r('Dời giờ cắt băng', [['move', 'change', 'later', 'delay', 'push', 'nine fifteen', 'fifteen']], 'We can move the ribbon cutting to nine fifteen.', 'Nine fifteen. I will tell the VIPs tonight.'),
          vague(['easy', ...CALM], 'I wish I had your calm. But what is the new order?'),
        ],
      },
      {
        ask: 'Phew. Last thing, the lucky draw. How many winners should we have?',
        askVi: 'Phù. Việc cuối, phần bốc thăm may mắn. Mình nên có bao nhiêu người trúng?',
        task: 'Đưa ra một con số, hoặc hỏi lại về ngân sách quà.',
        nudge: 'Sorry, how many winners?',
        replies: [
          ask('Hỏi lại về số quà', [['budget', 'how many prizes', 'how many gifts', 'how much']], 'It depends on the budget. How many prizes do you have?', 'We have three gift sets. So, how many winners?'),
          r('Một con số cụ thể', [['one', 'two', 'three', 'four', 'five', 'six', 'ten']], 'Three winners is enough. One big prize and two small ones.', 'Good. That fits the budget, thank goodness.'),
          vague(['some', 'few', 'many', ...ANY], 'I am asking you because I cannot decide! Give me a number.'),
        ],
      },
    ],
    end: 'Okay. I think we are ready. Thank you, Thien An. See you at eight tomorrow!',
    endVi: 'Được rồi. Mình nghĩ là sẵn sàng rồi. Cảm ơn Thiên Ân. Hẹn tám giờ sáng mai!',
  },
  {
    id: 'family-elder',
    npcId: 'robert',
    name: 'Robert',
    kind: 'Cưới',
    roleVi: 'Bố chú rể (người nước ngoài) hỏi về lễ cưới truyền thống',
    goalVi: 'Giải thích phong tục thật đơn giản và dặn ông cần làm gì.',
    cefr: 'B1',
    nodes: [
      {
        ask: 'Thien An, thank you for meeting me. I will be honest, I have no idea what happens tomorrow. Can you help an old man out?',
        askVi: 'Thiên Ân, cảm ơn bạn đã gặp tôi. Thật lòng tôi không biết ngày mai sẽ diễn ra thế nào. Bạn giúp ông già này nhé?',
        task: 'Nhận lời và nói bạn sẽ giải thích cho ông.',
        nudge: 'Sorry, my hearing is not great. Will you help me?',
        replies: [
          r('Nhận lời giải thích', [['help', 'explain', 'tell you', 'show you', 'guide', 'walk you']], "Of course, Robert. I'm happy to explain everything.", 'Thank you. That is a weight off my shoulders.'),
          vague(['of course', 'my pleasure', ...HELLO, ...CALM], 'Wonderful. So you will explain it to me, step by step?'),
        ],
      },
      {
        ask: 'So, tomorrow morning. What is the first thing my family does?',
        askVi: 'Vậy sáng mai, việc đầu tiên gia đình tôi làm là gì?',
        task: 'Nói việc đầu tiên: nhà trai mang mâm quả đến nhà cô dâu.',
        nudge: 'Sorry, what do we do first?',
        replies: [
          r('Mang mâm quả đến nhà gái', [['gift', 'gifts', 'tray', 'trays', 'present', 'presents'], ['bride', 'house', 'home', 'family']], "First, your family brings the trays of gifts to the bride's house.", 'Trays of gifts to her house. All right, I can do that.'),
          ask('Cùng nhau đến nhà gái', [['go', 'arrive', 'come', 'walk', 'visit'], ['bride', 'house', 'home']], "First, you all go to the bride's house together.", 'To her house, together. And do we bring anything?'),
          vague(['ceremony', 'wedding', 'tradition', 'simple', 'easy', ...OK], 'Right, but what do we actually do first?'),
        ],
      },
      {
        ask: 'I see. And then there is something about an altar? I do not want to do the wrong thing.',
        askVi: 'Tôi hiểu. Rồi còn chuyện bàn thờ gì đó phải không? Tôi không muốn làm sai.',
        task: 'Giải thích nghi lễ trước bàn thờ, hoặc dặn ông chỉ cần đứng yên quan sát.',
        nudge: 'Sorry, what happens at the altar?',
        replies: [
          r('Thắp hương, cúi lạy tổ tiên', [['ancestor', 'ancestors', 'incense', 'bow', 'respect', 'pray']], 'The couple light incense and bow to the ancestors to show respect.', 'To the ancestors. That is beautiful, actually.'),
          r('Ông chỉ cần đứng yên quan sát', [['stand', 'watch', 'quiet', 'quietly', 'follow', 'behind them']], "You just stand quietly behind them and watch. I'll tell you when to move.", 'Stand quietly and watch. That, I can manage.'),
          vague(['easy', 'simple', ...CALM], 'I am trying not to worry! But what is the altar for?'),
        ],
      },
      {
        ask: 'One more question. I would like to say a few words to her parents. Can I speak in English?',
        askVi: 'Một câu nữa. Tôi muốn nói vài lời với bố mẹ cô dâu. Tôi nói tiếng Anh được không?',
        task: 'Trả lời được, và nói cách làm: bạn dịch, hoặc khuyên ông nói ngắn, chậm.',
        nudge: 'Sorry, can I use English or not?',
        replies: [
          r('Được, tôi sẽ dịch', [['translate', 'translation', 'interpret', 'in vietnamese', 'into vietnamese']], "Yes, of course. Speak in English, and I'll translate into Vietnamese.", 'You would translate for me? Wonderful.'),
          r('Được, nhưng nói ngắn và chậm', [['short', 'brief', 'few sentences', 'one minute', 'slowly', 'simple']], 'Yes, but please keep it short and speak slowly.', 'Short and slow. My wife says that about all my speeches.'),
          vague(['of course', 'you can', ...CALM], 'Good. But they do not speak English. How will they understand me?'),
        ],
      },
      {
        ask: 'Last one, I promise. Is there anything I should not do tomorrow?',
        askVi: 'Câu cuối, tôi hứa. Ngày mai có điều gì tôi không nên làm không?',
        task: 'Dặn một điều cụ thể: đừng đến muộn, trang phục, cởi giày...',
        nudge: 'Sorry, what should I avoid?',
        replies: [
          r('Đừng đến muộn', [['late', 'on time', 'early']], "Please don't be late. The ceremony must start at the lucky hour.", 'The lucky hour. I will set three alarms.'),
          r('Lưu ý trang phục, cởi giày', [['wear', 'black', 'white', 'shoes', 'clothes', 'dress']], "Please don't wear black, and take off your shoes inside the house.", 'No black, no shoes. Got it.'),
          vague(['nothing', 'relax', 'smile', 'no', ...CALM], 'Come on, there must be something. I do not want to embarrass my son.'),
        ],
      },
    ],
    end: 'You have been a great help, Thien An. I will see you bright and early!',
    endVi: 'Bạn giúp tôi nhiều lắm, Thiên Ân. Hẹn gặp bạn sáng sớm mai!',
  },
  {
    id: 'keynote-green-room',
    npcId: 'okafor',
    name: 'Dr. Okafor',
    kind: 'Hội nghị và nghi thức',
    roleVi: 'Diễn giả chính gặp MC ở phòng chờ hội nghị quốc tế',
    goalVi: 'Chốt cách giới thiệu, báo giờ, và rút ngắn phần hỏi đáp.',
    cefr: 'B2',
    nodes: [
      {
        ask: 'Ah, you must be our master of ceremonies. Pleased to meet you. Shall we make sure you get my name right before we go on?',
        askVi: 'À, chắc bạn là người dẫn chương trình. Rất vui được gặp. Chúng ta kiểm tra cách bạn đọc tên tôi trước khi lên sân khấu nhé?',
        task: 'Chào lại và hỏi cách đọc tên ông, hoặc thử đọc tên.',
        nudge: 'Sorry, would you like to check my name?',
        replies: [
          r('Hỏi cách đọc tên', [['pronounce', 'pronunciation', 'say your name', 'how do you say', 'how do i say']], 'Pleased to meet you, Doctor. How do I pronounce your name correctly?', 'Oh-KAH-for. The stress is on the second syllable.'),
          r('Thử đọc tên', [['okafor']], 'Pleased to meet you. Is it Doctor Okafor?', 'Very good. Most people get it wrong.'),
          vague(['of course', 'pleased', 'nice to meet', ...HELLO], 'So, how would you say it? Have a go.'),
        ],
      },
      {
        ask: 'Good. And how will you introduce me? I would prefer something short.',
        askVi: 'Tốt. Vậy bạn sẽ giới thiệu tôi thế nào? Tôi thích ngắn gọn.',
        task: 'Nói câu giới thiệu ngắn có chức danh, hoặc hỏi ông muốn nhắc điều gì.',
        nudge: 'Sorry, what will you actually say?',
        replies: [
          r('Câu giới thiệu có chức danh', [['economist', 'professor', 'doctor', 'keynote', 'speaker', 'expert'], ['welcome', 'introduce', 'join me', 'stage']], "I'll say: please welcome our keynote speaker, the economist Doctor Okafor.", 'Short and accurate. Thank you.'),
          r('Hỏi ông muốn nhắc điều gì', [['would you like', 'do you want', 'should i mention', 'mention', 'include', 'prefer']], 'What would you like me to mention, your title or your new book?', 'Just the title. Leave the book out, please.'),
          vague(['short', 'brief', 'simple', ...CALM], 'Indeed. So what will the words be?'),
        ],
      },
      {
        ask: 'Fine. Now, my talk is twenty minutes. How will you tell me when time is nearly up?',
        askVi: 'Được. Bài nói của tôi dài hai mươi phút. Bạn sẽ báo tôi thế nào khi sắp hết giờ?',
        task: 'Nêu cách báo giờ cụ thể: giơ bảng, ra hiệu tay, đồng hồ trên màn hình.',
        nudge: 'Sorry, how will I know the time?',
        replies: [
          r('Giơ bảng hoặc ra hiệu', [['sign', 'card', 'signal', 'hand', 'raise', 'wave', 'timer', 'clock', 'screen']], "I'll show you a sign from the front row when you have two minutes left.", 'A sign at two minutes. That works.'),
          vague(['tell you', 'let you know', 'remind', ...CALM], 'Yes, but how? I cannot hear you while I am speaking.'),
        ],
      },
      {
        ask: 'One complication. I have a flight tonight, so I must leave straight after my talk. The Q and A has to be five minutes, not fifteen.',
        askVi: 'Có một rắc rối. Tối nay tôi có chuyến bay nên phải đi ngay sau bài nói. Phần hỏi đáp chỉ được năm phút, không phải mười lăm.',
        task: 'Đồng ý và nêu cách xử lý: chỉ nhận hai ba câu hỏi, hoặc báo trước cho khán giả.',
        nudge: 'Sorry, how will you handle the Q and A?',
        replies: [
          r('Chỉ nhận hai, ba câu hỏi', [['one', 'two', 'three', 'few'], ['question', 'questions']], "Understood. We'll take only two questions, and then I'll thank you.", 'Two questions. Much appreciated.'),
          r('Báo trước cho khán giả', [['announce', 'tell', 'inform', 'explain'], ['audience', 'guests', 'everyone', 'them', 'people']], "No problem. I'll tell the audience that we only have time for a short Q and A.", 'Good. Better they hear it from you than from me.'),
          vague(['understood', 'i see', 'i understand', ...CALM], 'Thank you. So how will you manage the questions?'),
        ],
      },
      {
        ask: 'And when I finish, what happens? I do not want to stand there awkwardly.',
        askVi: 'Và khi tôi nói xong thì sao? Tôi không muốn đứng đó lúng túng.',
        task: 'Nêu việc bạn sẽ làm: cảm ơn, mời vỗ tay, tiễn ông xuống; hoặc tặng quà, chụp ảnh.',
        nudge: 'Sorry, what happens after I finish?',
        replies: [
          r('Cảm ơn, mời vỗ tay, tiễn xuống', [['thank', 'thanks'], ['applause', 'clap', 'walk', 'off the stage', 'leave']], "I'll thank you, ask for a round of applause, and walk you off the stage.", 'Splendid. Then I can run for my taxi.'),
          r('Tặng quà, chụp một tấm ảnh', [['gift', 'photo', 'picture', 'flowers', 'present']], "We'll give you a small gift and take one quick photo.", 'One quick photo. I can live with that.'),
          vague(['help you', 'thank', 'thanks', ...CALM], 'I always worry. What exactly will you do?'),
        ],
      },
    ],
    end: 'Well then, I believe we are ready. After you.',
    endVi: 'Vậy thì tôi tin là chúng ta đã sẵn sàng. Mời bạn đi trước.',
  },
];

export function talkById(id: string): Talk | undefined {
  return TALKS.find((t) => t.id === id);
}
