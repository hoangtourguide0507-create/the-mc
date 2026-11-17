/**
 * Trò chuyện, đợt 2 (phần 2/3): phối hợp hậu trường và làm việc với khách hàng.
 * Cùng quy ước với talks.ts (tests/talk.test.mjs kiểm).
 */
import type { Talk } from '../core/talk';
import { n, r, vague, UNSURE, SORRY } from './talks.more1';

const EITHER = [...UNSURE, 'any', 'either', 'whatever', 'up to you', 'you decide'];

export const TALKS_MORE_2: Talk[] = [
  {
    id: 'band-leader',
    npcId: 'marcus',
    name: 'Marcus',
    kind: 'Gala',
    fn: 'backstage',
    roleVi: 'Trưởng ban nhạc chốt tín hiệu âm nhạc với MC trước đêm gala',
    goalVi: 'Thống nhất nhạc mở màn, nhạc khi trao giải và tín hiệu dừng.',
    cefr: 'B2',
    nodes: [
      n(
        'Hey, I am Marcus, I lead the band. We open the night, right? How long do you want us to play before you come on?',
        'Chào, tôi là Marcus, trưởng ban nhạc. Bọn tôi mở màn đúng không? Anh muốn bọn tôi chơi bao lâu trước khi anh ra?',
        'Nói một thời lượng cụ thể cho nhạc mở màn.',
        'Sorry, how many minutes or songs do you want?',
        r('Một bài, khoảng ba phút', [['one song', 'a song', 'single song', 'three minutes', 'two minutes', 'four minutes', 'couple of minutes']], 'Just one song, about three minutes, and then I will walk on as you finish.', 'One song, three minutes. We will make it count.'),
        r('Hai bài trong lúc khách vào chỗ', [['two songs', 'three songs', 'ten minutes', 'five minutes', 'while'], ['guests', 'seats', 'seated', 'sit', 'arrive', 'find', 'take', 'songs', 'minutes']], 'Two songs, please, while the guests find their seats.', 'Two songs while they sit down. Easy.'),
        vague([...EITHER, 'not long', 'short'], 'I need a number for the set list. How long?')
      ),
      n(
        'Cool. When each award winner walks up, do you want music, and what kind?',
        'Ổn. Mỗi khi người thắng giải bước lên, anh có muốn có nhạc không, và nhạc kiểu gì?',
        'Xin một đoạn nhạc ngắn, tươi vui, và nói khi nào thì dừng.',
        'Sorry, music for the winners: yes or no, and what style?',
        r('Một đoạn ngắn sôi động, dừng khi họ tới bục', [['short', 'few seconds', 'ten seconds', 'sting', 'fanfare', 'burst'], ['upbeat', 'happy', 'lively', 'exciting', 'stop', 'until', 'reach', 'when', 'podium', 'stage']], 'Yes, a short, upbeat fanfare, and stop when they reach the podium.', 'Short fanfare, cut at the podium. Got it.'),
        r('Không cần nhạc, chỉ cần pháo tay', [['no music', 'without music', 'silence', 'only applause', 'just applause', 'no need']], 'No music for the walk-ups, thank you. The applause will be enough.', 'No walk-up music. Less work for us.'),
        vague(EITHER, 'Yes to music, but what style? Rock? Jazz? A drum roll?')
      ),
      n(
        'Got it. Now, sometimes speeches run long. How do you want to signal us to start playing softly?',
        'Hiểu rồi. Đôi khi bài phát biểu kéo dài. Anh muốn ra hiệu thế nào để bọn tôi bắt đầu chơi nhẹ?',
        'Thống nhất một tín hiệu: gật đầu, giơ tay, hoặc một câu nói cụ thể.',
        'Sorry, what signal will you give the band?',
        r('Tôi sẽ gật đầu hoặc giơ tay', [['nod', 'raise', 'hand', 'point', 'wave', 'look at you', 'eye contact', 'touch'], ['you', 'my', 'head', 'hand', 'ear', 'band', 'a']], 'I will look at you and raise my left hand. That means, start playing softly.', 'Left hand up means soft music. Clear.'),
        r('Tôi sẽ nói một câu làm ám hiệu', [['when i say', 'cue line', 'the words', 'phrase', 'sentence'], ['thank you', 'applause', 'music', 'band', 'say', 'is']], 'When I say, what a wonderful speech, that is your cue.', '“What a wonderful speech.” Ha, I like it.'),
        vague(EITHER, 'We cannot guess, man. What is the signal?')
      ),
      n(
        'Nice. The client asked for a surprise birthday song for the chairman. Do you know when that happens?',
        'Hay. Khách hàng muốn một bài chúc mừng sinh nhật bất ngờ cho ngài chủ tịch. Anh biết lúc nào làm không?',
        'Nói thời điểm và cách giữ bí mật tới phút chót.',
        'Sorry, when do we play the birthday song?',
        r('Sau món chính, khi bánh được mang ra', [['after', 'when', 'as soon as', 'once'], ['main course', 'dinner', 'cake', 'dessert', 'candles', 'lights']], 'Right after the main course, when the cake comes out. Please start as soon as you see the candles.', 'Candles are our cue. Sneaky. I love it.'),
        r('Cuối chương trình, tôi sẽ ra hiệu', [['end', 'final', 'last', 'closing', 'before we finish'], ['signal', 'cue', 'sign', 'tell', 'program', 'night', 'award', 'evening']], 'At the very end, after the last award. I will give you the signal.', 'After the last award. We will be ready.'),
        vague(EITHER, 'A surprise needs a time. When exactly?')
      ),
      n(
        'Last one. At the end, do you want a big finish from us, or do you say goodbye first?',
        'Câu cuối. Lúc kết, anh muốn bọn tôi chơi một màn kết thật lớn, hay anh chào tạm biệt trước?',
        'Nói thứ tự: bạn chào trước rồi nhạc nổi lên, hoặc nhạc trước.',
        'Sorry, who goes first at the end, you or the band?',
        r('Tôi chào trước, rồi ban nhạc chơi', [['i will say', 'my goodbye', 'i close', 'i finish', 'i thank', 'i speak', 'my closing'], ['then', 'after', 'and you', 'before', 'you play', 'music', 'first']], 'I will say goodbye first, and then you play as the guests leave.', 'You talk, then we play them out. Classic.'),
        r('Ban nhạc chơi dưới lời chào của tôi', [['under', 'underneath', 'while i', 'behind me', 'during my', 'as i speak']], 'Please start softly under my closing words, and go big when I say good night.', 'Soft under you, big on “good night”. Nice touch.'),
        vague(EITHER, 'Tell me the order and I will make it sound great.')
      ),
    ],
    end: 'Sweet. You know what you want. See you at sound check.',
    endVi: 'Ngon. Anh biết mình muốn gì. Hẹn gặp lúc thử âm thanh.',
  },
  {
    id: 'interpreter-brief',
    npcId: 'priya',
    name: 'Priya',
    kind: 'Sự kiện quốc tế',
    fn: 'backstage',
    roleVi: 'Phiên dịch viên cabin trao đổi với MC trước diễn đàn quốc tế',
    goalVi: 'Giúp phiên dịch viên dịch chính xác: tốc độ, tên riêng, kịch bản, đoạn ứng biến.',
    cefr: 'C1',
    nodes: [
      n(
        'Hello, I am Priya, one of the interpreters. Could I have a copy of your script before we start?',
        'Xin chào, tôi là Priya, một trong các phiên dịch viên. Tôi xin một bản kịch bản của anh trước khi bắt đầu được không?',
        'Đồng ý gửi kịch bản và nói rõ bằng cách nào.',
        'Sorry, how can I get your script?',
        r('Gửi bản in hoặc qua email ngay', [['email', 'send', 'printed', 'print', 'copy', 'paper', 'airdrop', 'share'], ['you', 'it', 'now', 'right away', 'script', 'here', 'one']], 'Of course. Here is a printed copy, and I will email you the file right away.', 'A printed copy and the file. That is ideal.'),
        r('Kịch bản có vài chỗ sẽ ứng biến', [['improvise', 'improvised', 'ad lib', 'not scripted', 'unscripted', 'off script', 'spontaneous']], 'Certainly. Please note that the welcome and the transitions are scripted, but a few parts will be improvised.', 'Good to know which parts. Thank you for warning me.'),
        vague(UNSURE, 'Lovely. Do you have it with you?')
      ),
      n(
        'Thank you. How fast do you usually speak? Some hosts are impossible to follow.',
        'Cảm ơn. Bình thường anh nói nhanh cỡ nào? Có những người dẫn không tài nào dịch kịp.',
        'Cam kết nói chậm, câu ngắn, có ngắt nghỉ để phiên dịch kịp.',
        'Sorry, will you slow down for us?',
        r('Nói chậm, ngắt sau mỗi ý', [['slow', 'slowly', 'slower', 'steady', 'pace'], ['pause', 'pauses', 'short sentences', 'between', 'after each', 'clear', 'clearly', 'keep']], 'I will keep a steady pace, use short sentences, and pause after each idea.', 'Short sentences and pauses. You are an interpreter’s dream.'),
        r('Nhờ cô ra hiệu nếu tôi nói nhanh', [['signal', 'sign', 'wave', 'let me know', 'tell me', 'warn me'], ['fast', 'quick', 'quickly', 'speed', 'if']], 'Please give me a signal from the booth if I speak too fast.', 'I will raise my hand at the window. Deal.'),
        vague(UNSURE, 'Hosts always say that. What will you do differently?')
      ),
      n(
        'There are many names today. How do you say the minister’s name, and what is her exact title?',
        'Hôm nay có nhiều tên riêng. Anh đọc tên bà bộ trưởng thế nào, và chức danh chính xác của bà là gì?',
        'Cho cô ấy tên và chức danh, hoặc đưa danh sách tên có phiên âm.',
        'Sorry, could you give me the names and titles?',
        r('Đưa danh sách tên và chức danh', [['list', 'sheet', 'document', 'page'], ['names', 'titles', 'speakers', 'guests', 'pronunciation', 'with']], 'I have a list of all the names and titles, with pronunciation notes. Let me give you a copy.', 'Pronunciation notes too? Wonderful.'),
        r('Đọc rõ tên và chức danh', [['minister', 'her name is', 'she is the', 'pronounced'], ['of', 'for', 'is', 'deputy', 'trade', 'tourism', 'culture']], 'Her name is pronounced Tran Thu Ha, and she is the Deputy Minister of Tourism.', 'Deputy Minister of Tourism. Noted, thank you.'),
        vague(UNSURE, 'I would rather not guess a minister’s title.')
      ),
      n(
        'Helpful. Do you plan to tell any jokes or use wordplay? Those are very hard to translate.',
        'Hữu ích lắm. Anh có định kể chuyện đùa hay chơi chữ không? Mấy thứ đó rất khó dịch.',
        'Nói bạn sẽ tránh chơi chữ, hoặc báo trước câu đùa cho cô ấy.',
        'Sorry, any jokes I should know about?',
        r('Tránh chơi chữ, dùng lời đơn giản', [['avoid', 'no wordplay', 'no puns', 'no jokes', 'skip', 'without', 'not use', 'leave out'], ['wordplay', 'puns', 'jokes', 'idioms', 'slang', 'simple', 'plain', 'them']], 'I will avoid wordplay and idioms, and keep the language simple.', 'No wordplay. Thank you, truly.'),
        r('Có một câu đùa, tôi sẽ báo trước', [['one joke', 'a joke', 'small joke', 'short joke'], ['tell you', 'explain', 'show you', 'in advance', 'now', 'beforehand', 'warn', 'written', 'script']], 'There is one short joke in the opening. Let me explain it to you now.', 'One joke, explained in advance. I can prepare an equivalent.'),
        vague(UNSURE, 'Maybe is what worries me. Any jokes, or none?')
      ),
      n(
        'Last question. If a speaker suddenly switches to Vietnamese, what should we do on the English channel?',
        'Câu cuối. Nếu diễn giả đột ngột chuyển sang tiếng Việt, chúng tôi nên làm gì ở kênh tiếng Anh?',
        'Thống nhất: phiên dịch tiếp tục dịch, và bạn sẽ nhắc khán giả đeo tai nghe.',
        'Sorry, what is the plan if the language changes?',
        r('Tôi sẽ nhắc khán giả dùng tai nghe', [['headset', 'headsets', 'headphones', 'channel'], ['remind', 'announce', 'tell', 'ask', 'audience', 'guests', 'put on', 'use']], 'Please keep interpreting, and I will remind the audience to put on their headsets.', 'You remind them, we keep going. Perfect teamwork.'),
        r('Tôi sẽ tóm tắt bằng tiếng Anh sau đó', [['summarize', 'summarise', 'summary', 'recap', 'repeat'], ['english', 'afterwards', 'after', 'key points', 'briefly', 'main']], 'If the booth needs a moment, I will give a short summary in English afterwards.', 'A summary as backup. Very considerate.'),
        vague(UNSURE, 'We should agree on this now, not in the moment.')
      ),
    ],
    end: 'That was the best briefing I have had all year. Thank you.',
    endVi: 'Đó là buổi trao đổi tốt nhất tôi có được cả năm nay. Cảm ơn anh.',
  },
  {
    id: 'speaker-names',
    npcId: 'okafor',
    name: 'Dr. Okafor',
    kind: 'Hội nghị',
    fn: 'intro',
    roleVi: 'Diễn giả chính kiểm tra lời giới thiệu với MC ở cánh gà',
    goalVi: 'Đọc đúng tên, chức danh và nắm ý ông muốn nhấn mạnh.',
    cefr: 'B2',
    nodes: [
      n(
        'Good afternoon. I am Doctor Okafor. Before you introduce me, can you say my name for me? People often get it wrong.',
        'Chào buổi chiều. Tôi là tiến sĩ Okafor. Trước khi giới thiệu tôi, anh đọc thử tên tôi được không? Người ta hay đọc sai lắm.',
        'Đọc thử tên và hỏi lại xem đã đúng chưa.',
        'Sorry, how will you say my name on stage?',
        r('Đọc tên và hỏi đã đúng chưa', [['okafor'], ['correct', 'right', 'is that', 'did i', 'am i', 'how', 'pronounce']], 'Doctor Okafor. Did I say that correctly?', 'Perfect. First time anyone got it right today.'),
        r('Nhờ ông đọc mẫu để lặp lại', [['could you say', 'can you say', 'would you say', 'please say', 'say it for me', 'how do you pronounce', 'how do you say'], ['name', 'it', 'once', 'slowly']], 'Could you say it once for me, slowly? I want to get it exactly right.', 'O-ka-for. Stress on the second part.'),
        vague(UNSURE, 'I would feel better if I heard you say it.')
      ),
      n(
        'Good. And my title: I am a professor, but I prefer “Doctor” on stage. Which will you use?',
        'Tốt. Còn chức danh: tôi là giáo sư, nhưng trên sân khấu tôi thích được gọi là “Doctor”. Anh sẽ dùng cách nào?',
        'Xác nhận sẽ dùng đúng cách ông muốn.',
        'Sorry, Professor or Doctor?',
        r('Sẽ gọi là Doctor như ông muốn', [['doctor', 'dr'], ['use', 'say', 'call', 'introduce', 'as you prefer', 'you prefer', 'will', 'then']], 'I will introduce you as Doctor Okafor, as you prefer.', 'Thank you. Doctor it is.'),
        vague([...UNSURE, 'professor', 'both', 'either'], 'I did say I prefer one of them. Which one?')
      ),
      n(
        'Now, your introduction. What will you say about me? Please keep it short.',
        'Giờ tới lời giới thiệu. Anh sẽ nói gì về tôi? Xin nói ngắn thôi.',
        'Tóm tắt lời giới thiệu: lĩnh vực nghiên cứu, số năm kinh nghiệm hoặc cuốn sách của ông.',
        'Sorry, what are the main points of your introduction?',
        r('Nêu lĩnh vực và kinh nghiệm', [['years', 'experience', 'research', 'expert', 'studied', 'career', 'leading'], ['in', 'on', 'of', 'climate', 'energy', 'health', 'field']], 'I will mention your twenty years of research in clean energy, and then your name.', 'Twenty years, clean energy, my name. Short and correct.'),
        r('Nêu cuốn sách và giải thưởng', [['book', 'author', 'award', 'prize', 'bestseller', 'published']], 'I will say you are the author of an award-winning book, and that we are honored to have you.', 'The book. My publisher will be delighted.'),
        vague([...UNSURE, 'short', 'brief', 'not much'], 'Short is good, but what are the actual points?')
      ),
      n(
        'Fine. One thing I would like you to add: my talk has a live demonstration. Can you prepare the audience for that?',
        'Được. Có một điều tôi muốn anh thêm: bài nói của tôi có phần trình diễn trực tiếp. Anh chuẩn bị tinh thần cho khán giả giúp tôi được không?',
        'Nhận lời và nói bạn sẽ báo cho khán giả thế nào.',
        'Sorry, will you mention the demonstration?',
        r('Sẽ nhắc khán giả cất điện thoại', [['phones', 'phone', 'devices'], ['away', 'down', 'silent', 'put', 'off']], 'Of course. I will ask everyone to put their phones away for the demonstration.', 'Phones away. Bold, but I approve.'),
        r('Sẽ báo khán giả có phần trình diễn trực tiếp', [['demonstration', 'demo', 'experiment', 'live'], ['tell', 'mention', 'announce', 'audience', 'let', 'say', 'prepare', 'ask', 'will']], 'Certainly. I will tell the audience there is a live demonstration, so they should watch the screen closely.', 'Watch the screen closely. Exactly right.'),
        vague(UNSURE, 'How will you put it, exactly?')
      ),
      n(
        'Thank you. Last thing: I have exactly twenty minutes. How will you warn me when my time is almost up?',
        'Cảm ơn. Điều cuối: tôi có đúng hai mươi phút. Anh sẽ báo tôi thế nào khi sắp hết giờ?',
        'Thống nhất cách báo giờ: bảng giơ, đồng hồ đếm ngược, hoặc bạn đứng dậy.',
        'Sorry, how will I know my time is nearly over?',
        r('Giơ bảng báo còn hai phút', [['card', 'sign', 'board', 'hold up', 'show you'], ['minutes', 'minute', 'two', 'five', 'left', 'time']], 'I will hold up a card in the front row when you have two minutes left.', 'A card at two minutes. I will look for it.'),
        r('Có đồng hồ đếm ngược dưới sân khấu', [['clock', 'timer', 'countdown', 'screen', 'monitor']], 'There is a countdown timer on the floor in front of the stage. It turns red at one minute.', 'A countdown timer. Even better than a card.'),
        vague(UNSURE, 'I do lose track of time. What is the warning?')
      ),
    ],
    end: 'You are thorough. I feel in very good hands.',
    endVi: 'Anh thật chu đáo. Tôi thấy rất yên tâm.',
  },
  {
    id: 'client-change',
    npcId: 'olivia',
    name: 'Olivia',
    kind: 'Ra mắt sản phẩm',
    fn: 'client',
    roleVi: 'Giám đốc marketing đòi đổi chương trình một giờ trước buổi ra mắt',
    goalVi: 'Nhận phần đổi được, từ chối khéo phần rủi ro, và đề xuất phương án.',
    cefr: 'C1',
    nodes: [
      n(
        'There you are. Change of plan: the CEO wants to speak first now, before your welcome. Can you do that?',
        'Anh đây rồi. Đổi kế hoạch: CEO giờ muốn phát biểu đầu tiên, trước lời chào của anh. Làm được không?',
        'Nêu rủi ro ngắn gọn và đề xuất: bạn chào thật ngắn rồi mời CEO ngay.',
        'Sorry, so who opens the show, you or the CEO?',
        r('Đề xuất chào thật ngắn rồi mời CEO', [['short', 'brief', 'thirty seconds', 'thirty second', 'one minute', 'quick', 'just'], ['welcome', 'introduction', 'introduce', 'opening', 'then', 'her', 'ceo']], 'We can do that, but may I suggest a thirty-second welcome first? Then I introduce her properly.', 'Thirty seconds, then her. Yes, she needs an introduction.'),
        r('Nêu rủi ro: khán giả chưa ổn định', [['audience', 'guests', 'room', 'people'], ['settled', 'seated', 'ready', 'quiet', 'attention', 'still', 'not']], 'It is possible, but the audience will not be settled yet, and she may lose the first minute.', 'Hmm. She will hate talking over noise. Good point.'),
        vague(UNSURE, 'Just “okay”? No concerns at all?')
      ),
      n(
        'Next. We want to add a second product video, six minutes long, right after the reveal.',
        'Tiếp. Chúng tôi muốn thêm video sản phẩm thứ hai, dài sáu phút, ngay sau màn ra mắt.',
        'Phản biện lịch sự: sáu phút quá dài sau cao trào; đề nghị cắt ngắn hoặc dời chỗ.',
        'Sorry, can we add the six-minute video or not?',
        r('Đề nghị rút ngắn video', [['shorter', 'cut', 'trim', 'short version', 'two minutes', 'ninety seconds', 'one minute', 'edit']], 'Six minutes is long after the big moment. Could we use a ninety-second cut instead?', 'A ninety-second cut. Our editor can do that.'),
        r('Đề nghị dời video ra khu trải nghiệm', [['experience', 'lobby', 'loop', 'demo area', 'screens', 'later', 'after the show', 'different moment', 'move']], 'I would move it to the experience area and play it on a loop, so the energy stays high.', 'On a loop outside. Actually, that is smart.'),
        vague(UNSURE, 'So you will just add six minutes? We are already tight.')
      ),
      n(
        'Okay. Also, legal says you must read this disclaimer, word for word. It is one full page.',
        'Được. Ngoài ra, bên pháp lý nói anh phải đọc nguyên văn bản miễn trừ trách nhiệm này. Nó dài nguyên một trang.',
        'Đề xuất cách thay thế: chiếu lên màn hình, hoặc đọc bản tóm tắt đã được duyệt.',
        'Sorry, will you read the whole page?',
        r('Chiếu lên màn hình thay vì đọc', [['screen', 'slide', 'display', 'show it', 'printed', 'handout']], 'Could we show it on the screen instead, and I say one sentence pointing to it?', 'On screen with one sentence. I will ask legal.'),
        r('Xin một bản tóm tắt được pháp lý duyệt', [['summary', 'shorter version', 'short version', 'two sentences', 'approved', 'key points']], 'Would legal approve a two-sentence summary? A full page will lose the room.', 'A two-sentence version. Let me call them now.'),
        vague(UNSURE, 'A full page, read aloud. You are fine with that?')
      ),
      n(
        'Fine. Last change: please do not mention the price tonight. But journalists will ask. What will you say?',
        'Được. Thay đổi cuối: tối nay xin đừng nhắc tới giá. Nhưng nhà báo sẽ hỏi. Anh sẽ nói gì?',
        'Chuẩn bị một câu trả lời khéo: giá sẽ công bố sau, hoặc chuyển cho đội truyền thông.',
        'Sorry, what is your line if someone asks about the price?',
        r('Giá sẽ được công bố vào một dịp sau', [['announced', 'announce', 'shared', 'revealed', 'released'], ['later', 'soon', 'next week', 'next month', 'date', 'coming', 'separately', 'shortly']], 'I will say that pricing will be announced next week, and tonight is about the product itself.', '“Tonight is about the product.” Yes, use exactly that.'),
        r('Chuyển câu hỏi cho đội truyền thông', [['pr', 'communications', 'press team', 'media team', 'spokesperson', 'you'], ['ask', 'refer', 'direct', 'send', 'pass', 'point', 'contact', 'speak']], 'I will direct any pricing questions to your communications team after the show.', 'Send them to us. Fine, we will be ready.'),
        vague(UNSURE, 'I need to hear the actual sentence.')
      ),
      n(
        'Good. So, can you repeat the final running order back to me, so we are both clear?',
        'Tốt. Vậy anh nhắc lại thứ tự cuối cùng cho tôi nghe, để hai bên cùng rõ nhé?',
        'Tóm tắt thứ tự cuối: chào ngắn, CEO, ra mắt, trải nghiệm.',
        'Sorry, what is the order now?',
        r('Nhắc lại đầy đủ thứ tự', [['first', 'welcome', 'start', 'open'], ['then', 'after', 'next', 'followed'], ['ceo', 'reveal', 'video', 'experience', 'speech']], 'First, my short welcome. Then the CEO’s speech, then the reveal, and after that the experience area opens.', 'Welcome, CEO, reveal, experience. We are aligned.'),
        r('Đề nghị gửi bản cập nhật cho cả ê-kíp', [['send', 'email', 'share', 'print', 'update'], ['running order', 'schedule', 'crew', 'team', 'everyone', 'new version', 'updated']], 'Let me write it down and send the updated running order to the whole crew right now.', 'Send it to everyone. Especially the sound guy.'),
        vague(UNSURE, 'Clear is not the same as correct. Say it back to me.')
      ),
    ],
    end: 'You pushed back twice, and you were right both times. Thank you.',
    endVi: 'Anh phản biện hai lần và đúng cả hai. Cảm ơn anh.',
  },
  {
    id: 'stage-manager',
    npcId: 'zoe',
    name: 'Zoe',
    kind: 'Lễ trao giải',
    fn: 'backstage',
    roleVi: 'Đạo diễn sân khấu chạy thử các tình huống xấu với MC trước lễ trao giải',
    goalVi: 'Có sẵn phương án cho từng sự cố: người thắng vắng mặt, sai phong bì, quá giờ.',
    cefr: 'B2',
    nodes: [
      n(
        'Okay, quick what-ifs. A winner is not in the room when you call their name. What do you do?',
        'Rồi, chạy nhanh các tình huống. Người thắng không có mặt khi anh xướng tên. Anh làm gì?',
        'Nêu phương án: đồng nghiệp nhận thay, hoặc bạn nhận thay và chuyển tiếp.',
        'Sorry, the winner is missing. What is your move?',
        r('Tôi nhận thay và chuyển tiếp', [['i will accept', 'i accept', 'keep it', 'hold it', 'i will receive', 'deliver'], ['behalf', 'for them', 'later', 'make sure', 'move on', 'safe', 'and']], 'I will accept it on their behalf, promise to deliver it, and move on quickly.', 'Accept and move on. No dead air. Good.'),
        r('Mời đồng nghiệp lên nhận thay', [['colleague', 'team', 'someone', 'manager', 'representative', 'behalf'], ['accept', 'receive', 'collect', 'come up', 'on behalf', 'instead', 'invite', 'ask']], 'I will ask a colleague to accept the award on their behalf.', 'A colleague accepts. Good, I will have a name ready for each category.'),
        vague([...UNSURE, 'wait', 'call again'], 'Waiting is dead air. What do you say?')
      ),
      n(
        'Next what-if. I hand you the wrong envelope, and you only notice after you open it.',
        'Tình huống tiếp. Tôi đưa anh nhầm phong bì, và anh chỉ nhận ra sau khi mở.',
        'Giữ bình tĩnh: không đọc tên, xin một chút thời gian, và nói một câu nhẹ nhàng với khán giả.',
        'Sorry, wrong envelope in your hand. What now?',
        r('Không đọc, xin khán giả chờ một chút', [['moment', 'second', 'bear with', 'one minute', 'hold on', 'pause'], ['check', 'right', 'correct', 'envelope', 'please', 'audience', 'everyone', 'sure']], 'I will not read it. I will say, please bear with me one moment, and wait for the correct envelope.', 'Do not read it, buy time. Exactly.'),
        r('Nói một câu đùa nhẹ để giữ không khí', [['joke', 'smile', 'laugh', 'suspense', 'funny', 'humor', 'humour']], 'I will smile and say, a little extra suspense tonight, while you bring me the right one.', '“Extra suspense.” I am stealing that line.'),
        vague([...UNSURE, ...SORRY], 'Sorry to whom? What do you actually say on the mic?')
      ),
      n(
        'Good. What-if three: a winner starts a ten-minute thank-you speech. We have thirty seconds per person.',
        'Tốt. Tình huống ba: người thắng bắt đầu bài cảm ơn mười phút. Mỗi người chỉ có ba mươi giây.',
        'Nêu cách cắt lịch sự: tiến lại gần, vỗ tay dẫn, hoặc ra hiệu cho nhạc.',
        'Sorry, the speech is too long. How do you stop it?',
        r('Tiến lại gần và dẫn vỗ tay', [['step', 'walk', 'move', 'closer', 'stand next', 'approach'], ['applause', 'clap', 'thank', 'them', 'forward', 'podium', 'and']], 'I will step closer, start the applause at the next pause, and thank them warmly.', 'Step in and lead the applause. Works every time.'),
        r('Ra hiệu cho ban nhạc chơi nhẹ', [['music', 'band'], ['signal', 'cue', 'play', 'start', 'softly', 'ask']], 'I will signal the band to start playing softly. Everyone understands that.', 'Play-off music. The Oscars method.'),
        vague(UNSURE, 'They will not stop on their own. What is your technique?')
      ),
      n(
        'Nice. What-if four: we are running fifteen minutes late before the final award.',
        'Hay. Tình huống bốn: mình đang trễ mười lăm phút trước giải cuối.',
        'Đề xuất chỗ cắt: bỏ một tiết mục, gộp hai giải, hoặc rút ngắn lời dẫn.',
        'Sorry, where do we save fifteen minutes?',
        r('Rút ngắn lời dẫn của tôi', [['my', 'i will'], ['shorter', 'shorten', 'cut', 'skip', 'trim', 'reduce'], ['introductions', 'intros', 'links', 'lines', 'script', 'jokes', 'stories', 'part']], 'I will cut my introductions to one sentence each. That saves about five minutes.', 'One sentence each. That is five minutes back.'),
        r('Gộp hai hạng mục hoặc bỏ một tiết mục', [['combine', 'merge', 'together', 'drop', 'remove', 'skip the', 'cancel'], ['awards', 'categories', 'performance', 'video', 'act', 'two', 'dance']], 'We could present two awards together, and drop the second dance performance.', 'Merge two awards, drop the dance. I will warn the dancers.'),
        vague([...UNSURE, 'faster', 'hurry', 'quick'], 'Faster how? Tell me what you cut.')
      ),
      n(
        'Last one. The fire alarm goes off. It is probably false, but we do not know.',
        'Câu cuối. Chuông báo cháy kêu. Có thể là báo giả, nhưng mình chưa biết.',
        'Nói bạn sẽ thông báo gì: bình tĩnh, hướng dẫn lối thoát, theo chỉ dẫn nhân viên.',
        'Sorry, the alarm is ringing. What do you announce?',
        r('Mời khán giả bình tĩnh đi ra lối thoát gần nhất', [['calm', 'calmly', 'slowly', 'quietly'], ['exit', 'exits', 'leave', 'walk', 'outside', 'follow']], 'Ladies and gentlemen, please stay calm and walk to the nearest exit. Our staff will guide you.', 'Calm, nearest exit, follow staff. Textbook.'),
        r('Chờ xác nhận từ an ninh rồi mới thông báo', [['security', 'safety officer', 'venue', 'you'], ['confirm', 'check', 'wait', 'instruction', 'instructions', 'tell me', 'first']], 'I will ask everyone to remain seated for one moment while security confirms, and then follow your instruction.', 'Hold for confirmation. Fine, but only for ten seconds.'),
        vague([...UNSURE, 'panic', 'run'], 'I need the words you will say into the microphone.')
      ),
    ],
    end: 'You have an answer for everything. That is why I like working with you.',
    endVi: 'Tình huống nào anh cũng có đáp án. Vì vậy tôi thích làm việc với anh.',
  },
  {
    id: 'caterer',
    npcId: 'chloe',
    name: 'Chloe',
    kind: 'Tiệc cưới',
    fn: 'backstage',
    roleVi: 'Quản lý tiệc của nhà hàng khớp giờ lên món với chương trình',
    goalVi: 'Khớp chương trình với bếp để món nóng không nguội, phát biểu không bị ồn.',
    cefr: 'B1',
    nodes: [
      n(
        'Hi, I am Chloe, the banquet manager. What time do you want the first course on the tables?',
        'Chào, tôi là Chloe, quản lý tiệc. Anh muốn món đầu tiên lên bàn lúc mấy giờ?',
        'Nói một giờ hoặc một mốc trong chương trình.',
        'Sorry, when should we serve the first course?',
        r('Ngay sau lời chào mừng', [['after', 'once', 'as soon as', 'when'], ['welcome', 'entrance', 'speech', 'toast', 'ceremony', 'couple', 'i finish']], 'Right after the couple’s entrance and my welcome, please. That is about seven o’clock.', 'After the entrance, around seven. The kitchen will be ready.'),
        r('Vào một giờ cụ thể', [["o'clock", 'seven', 'half past', 'quarter', 'thirty', 'fifteen']], 'At a quarter past seven, please.', 'Quarter past seven. Noted.'),
        vague([...EITHER, 'soon', 'early', 'later'], 'The chef needs a time. When exactly?')
      ),
      n(
        'Okay. During the speeches, should my waiters keep serving, or stop?',
        'Được. Trong lúc phát biểu, nhân viên của tôi nên tiếp tục phục vụ hay dừng lại?',
        'Xin dừng phục vụ khi có phát biểu, để phòng yên tĩnh.',
        'Sorry, serve or stop during the speeches?',
        r('Xin dừng phục vụ khi có phát biểu', [['stop', 'pause', 'hold', 'wait', 'no service', 'not serve'], ['speeches', 'speech', 'speaking', 'serving', 'service', 'until', 'during', 'please']], 'Please stop serving during the speeches, so the room is quiet.', 'Service stops for speeches. I will brief the team.'),
        r('Chỉ rót nước, không dọn đĩa', [['drinks', 'water', 'wine', 'pour'], ['only', 'just', 'no plates', 'not clear', 'quietly']], 'Only drinks, please, and no clearing of plates while someone is speaking.', 'Drinks only, no plates. Quiet as mice.'),
        vague(EITHER, 'Clinking plates during a speech is your problem, not mine. Which is it?')
      ),
      n(
        'Got it. The main course is hot, so I need ten minutes of warning. How will you tell me?',
        'Hiểu rồi. Món chính là món nóng, nên tôi cần báo trước mười phút. Anh sẽ báo tôi bằng cách nào?',
        'Thống nhất cách báo: bạn tới gặp trực tiếp, nhắn tin, hoặc qua bộ đàm.',
        'Sorry, how do I get my ten-minute warning?',
        r('Nhắn tin hoặc gọi bộ đàm', [['text', 'message', 'radio', 'walkie', 'call', 'phone']], 'I will send you a message ten minutes before the speeches end.', 'A message at ten minutes. My phone is always on.'),
        r('Tôi sẽ tới báo trực tiếp', [['come', 'find you', 'walk over', 'tell you', 'in person', 'myself', 'signal', 'sign'], ['you', 'kitchen', 'door', 'directly', 'myself', 'personally']], 'I will come and tell you in person at the kitchen door.', 'In person at the kitchen door. Works for me.'),
        vague(EITHER, 'I cannot read your mind from the kitchen. How?')
      ),
      n(
        'Good. The cake: do we bring it out before dessert, or is it the dessert?',
        'Tốt. Bánh cưới: bọn tôi mang ra trước món tráng miệng, hay bánh chính là tráng miệng?',
        'Nói rõ thứ tự và khi nào cắt bánh.',
        'Sorry, when does the cake come out?',
        r('Cắt bánh trước, rồi phục vụ làm tráng miệng', [['cut', 'cutting'], ['first', 'before', 'then', 'after', 'serve', 'dessert']], 'The couple will cut the cake first, and then you can serve it as dessert.', 'Cut first, then we slice it in the kitchen. Easy.'),
        r('Mang bánh ra sau món chính', [['after the main', 'after dinner', 'after the meal', 'once the main']], 'Please bring it out right after the main course, with the lights down.', 'After the main, lights down. Dramatic. I like it.'),
        vague(EITHER, 'Two hundred slices take time. I need the order.')
      ),
      n(
        'Last thing. Some guests have allergies. Do you announce anything about the food?',
        'Điều cuối. Một số khách bị dị ứng. Anh có thông báo gì về đồ ăn không?',
        'Nhận lời thông báo: khách có dị ứng hãy báo nhân viên phục vụ.',
        'Sorry, will you say something about allergies?',
        r('Sẽ nhắc khách báo nhân viên nếu dị ứng', [['allergy', 'allergies', 'allergic', 'dietary'], ['tell', 'inform', 'let', 'speak', 'ask', 'announce', 'waiter', 'staff', 'please']], 'Yes. I will ask anyone with an allergy to tell their waiter before the first course.', 'Tell the waiter first. Thank you, that protects everyone.'),
        r('Xin danh sách món có đậu phộng, hải sản', [['which dishes', 'list', 'contain', 'contains'], ['nuts', 'peanuts', 'seafood', 'shellfish', 'dishes', 'menu', 'allergens']], 'Could you give me a list of dishes that contain nuts or seafood? I will announce them.', 'I will write it on a card for you.'),
        vague(EITHER, 'It only takes one sentence. Will you say it?')
      ),
    ],
    end: 'Perfect. If every MC planned like this, my job would be easy.',
    endVi: 'Hoàn hảo. MC nào cũng lên kế hoạch thế này thì việc của tôi nhẹ hẳn.',
  },
  {
    id: 'fee-quote',
    npcId: 'arthur',
    name: 'Arthur',
    kind: 'Làm việc với khách hàng',
    fn: 'client',
    roleVi: 'Trưởng phòng sự kiện của một tập đoàn gọi để hỏi giá và mặc cả',
    goalVi: 'Báo giá rõ ràng, giữ giá trị của mình và thương lượng điều kiện.',
    cefr: 'C1',
    nodes: [
      n(
        'Good morning. Arthur Blake, from Northwind Group. We need a bilingual host for our annual conference. What is your fee?',
        'Chào buổi sáng. Tôi là Arthur Blake, tập đoàn Northwind. Chúng tôi cần người dẫn song ngữ cho hội nghị thường niên. Phí của anh là bao nhiêu?',
        'Chưa báo giá vội: hỏi thông tin trước (ngày, thời lượng, số khách), hoặc nói phí tuỳ quy mô.',
        'Sorry, could you give me a rough number?',
        r('Hỏi ngày, thời lượng và số khách trước', [['date', 'when', 'how long', 'how many', 'duration', 'hours', 'guests', 'attendees', 'details', 'where']], 'Thank you for calling. Before I quote, may I ask the date, the duration, and how many guests you expect?', 'Sensible. The twelfth of March, a full day, four hundred guests.'),
        r('Phí tuỳ theo quy mô, sẽ gửi báo giá', [['depends', 'based on', 'according to'], ['size', 'scope', 'length', 'hours', 'event', 'program', 'quote', 'proposal']], 'My fee depends on the scope of the event. I can send you a written quote this afternoon.', 'A written quote today. Good, I like things in writing.'),
        vague([...UNSURE, 'cheap', 'expensive', 'negotiable'], 'I am asking four hosts today. I need something concrete.')
      ),
      n(
        'It is a full day, four hundred guests, in Da Nang. So what would that cost us?',
        'Cả ngày, bốn trăm khách, ở Đà Nẵng. Vậy chi phí sẽ là bao nhiêu?',
        'Báo một mức giá rõ ràng và nói nó bao gồm những gì.',
        'Sorry, what is the figure, and what does it include?',
        r('Báo giá và nêu những gì đã bao gồm', [['dollars', 'million', 'usd', 'dong', 'hundred', 'thousand'], ['include', 'includes', 'including', 'covers', 'plus', 'with']], 'For a full day, my fee is eight hundred dollars. That includes the script, one rehearsal, and both languages.', 'Eight hundred, with script and rehearsal. I see.'),
        vague([...UNSURE, 'not much', 'reasonable', 'fair price'], 'Reasonable is not a number.')
      ),
      n(
        'Hmm. That is above our budget. Another host offered to do it for half. Can you match that?',
        'Hừm. Mức đó vượt ngân sách của chúng tôi. Một người dẫn khác chào giá chỉ bằng một nửa. Anh có theo mức đó được không?',
        'Giữ giá một cách lịch sự: nêu giá trị của bạn, hoặc đề nghị giảm phạm vi thay vì giảm giá.',
        'Sorry, can you lower your fee?',
        r('Giữ giá, nêu giá trị mang lại', [['experience', 'bilingual', 'both languages', 'quality', 'script', 'value', 'years', 'professional'], ['fee', 'price', 'rate', 'reflects', 'why', 'so', 'because', 'cannot', 'keep', 'stays']], 'I understand. My fee reflects ten years of bilingual experience, and you will not need a separate interpreter on stage.', 'No separate interpreter. That does change the sum.'),
        r('Đề nghị giảm phạm vi thay vì giảm giá', [['half day', 'morning only', 'without', 'remove', 'reduce', 'fewer', 'instead', 'drop the'], ['rehearsal', 'script', 'scope', 'hours', 'session', 'fee', 'price', 'day']], 'I cannot match that, but I could reduce the fee if you only need me for the morning session.', 'Morning only at a lower fee. Let me think about that.'),
        vague([...UNSURE, ...SORRY, 'no'], 'Is that a no? Then help me justify it to my director.')
      ),
      n(
        'All right. And travel? You are in Ho Chi Minh City, and the event is in Da Nang.',
        'Thôi được. Còn chi phí đi lại? Anh ở TP.HCM, sự kiện ở Đà Nẵng.',
        'Nói rõ: vé máy bay và một đêm khách sạn do khách hàng chi trả.',
        'Sorry, who pays for flights and the hotel?',
        r('Khách hàng chi vé máy bay và khách sạn', [['flight', 'flights', 'airfare', 'ticket', 'travel'], ['hotel', 'accommodation', 'night', 'client', 'you', 'your', 'covered', 'separately', 'cover']], 'Flights and one hotel night are covered by the client, and they are not included in my fee.', 'Flights and one night. That is standard, fine.'),
        vague([...UNSURE, 'included', 'free'], 'I need to budget for it. Who pays what?')
      ),
      n(
        'Understood. If we agree, what do you need from us to confirm the booking?',
        'Tôi hiểu. Nếu hai bên đồng ý, anh cần gì từ phía chúng tôi để xác nhận?',
        'Nêu điều kiện xác nhận: hợp đồng, đặt cọc, và thời hạn.',
        'Sorry, what are your booking terms?',
        r('Hợp đồng và đặt cọc năm mươi phần trăm', [['deposit', 'advance', 'fifty percent', 'half', 'thirty percent'], ['contract', 'agreement', 'confirm', 'sign', 'signed', 'booking', 'date', 'and', 'to']], 'A signed contract and a fifty percent deposit confirm the date. The rest is due after the event.', 'Contract and fifty percent. Our finance team can do that.'),
        r('Giữ ngày trong vòng một tuần', [['hold', 'keep', 'reserve', 'pencil'], ['date', 'week', 'days', 'until', 'for you']], 'I can hold the date for one week while you decide.', 'One week. You will hear from me before Friday.'),
        vague(UNSURE, 'I mean paperwork. What do you need?')
      ),
    ],
    end: 'You are not the cheapest, but you are the clearest. I will send the contract.',
    endVi: 'Anh không rẻ nhất, nhưng rõ ràng nhất. Tôi sẽ gửi hợp đồng.',
  },
  {
    id: 'groom-meeting',
    npcId: 'couple',
    speaker: 'liam',
    name: 'Liam',
    kind: 'Tiệc cưới',
    fn: 'client',
    roleVi: 'Chú rể người nước ngoài gặp MC lần đầu để tìm hiểu',
    goalVi: 'Giới thiệu phong cách dẫn của bạn và hiểu mong muốn của cặp đôi.',
    cefr: 'B1',
    nodes: [
      n(
        'Hi, nice to meet you. I am Liam. So, tell me, how long have you been a wedding MC?',
        'Chào, rất vui được gặp. Tôi là Liam. Bạn kể tôi nghe, bạn làm MC đám cưới bao lâu rồi?',
        'Nói số năm kinh nghiệm và loại đám cưới bạn hay dẫn.',
        'Sorry, how many years have you done this?',
        r('Nêu số năm và loại đám cưới', [['years', 'year', 'since'], ['wedding', 'weddings', 'mc', 'host', 'hosting', 'events', 'bilingual', 'couples']], 'Nice to meet you too. I have been hosting weddings for eight years, mostly bilingual ones.', 'Eight years, bilingual. That is exactly what we need.'),
        vague([...UNSURE, 'long time', 'a while', 'many'], 'A while? Roughly how many years?')
      ),
      n(
        'Great. My family does not speak Vietnamese, and Emma’s family does not speak English. How do you handle that?',
        'Tuyệt. Gia đình tôi không nói tiếng Việt, còn gia đình Emma không nói tiếng Anh. Bạn xử lý thế nào?',
        'Giải thích cách dẫn song ngữ: nói tiếng Việt trước rồi tiếng Anh, giữ cho ngắn.',
        'Sorry, how will both families understand?',
        r('Nói cả hai thứ tiếng, từng phần ngắn', [['both languages', 'two languages', 'vietnamese', 'english'], ['then', 'first', 'and', 'each', 'short', 'after', 'followed']], 'I say each part in Vietnamese first, and then in English, and I keep both versions short.', 'Both languages, short versions. My mum will be so happy.'),
        r('Dịch cả các bài phát biểu', [['translate', 'interpret', 'translation'], ['speeches', 'speech', 'toast', 'toasts', 'parents', 'father']], 'I also translate the speeches, so nobody misses a word from the parents.', 'You translate the speeches too? Brilliant.'),
        vague(UNSURE, 'But how does it work in practice?')
      ),
      n(
        'Perfect. Now, your style. Are you more funny, or more formal? We do not want anything embarrassing.',
        'Hoàn hảo. Giờ nói về phong cách. Bạn thiên về hài hước hay trang trọng? Bọn tôi không muốn điều gì gây ngượng.',
        'Mô tả phong cách của bạn và hỏi lại họ thích kiểu nào.',
        'Sorry, how would you describe your style?',
        r('Ấm áp, lịch sự, hài hước nhẹ', [['warm', 'elegant', 'gentle', 'light', 'friendly', 'natural', 'relaxed', 'classy'], ['humor', 'humour', 'funny', 'jokes', 'formal', 'style', 'and', 'but']], 'My style is warm and elegant, with a little light humor. I never make jokes about the couple.', 'Warm and elegant. That sounds like us.'),
        r('Hỏi lại họ thích phong cách nào', [['what do you prefer', 'what would you like', 'which do you prefer', 'what style', 'how would you like', 'up to you both'], ['you', 'prefer', 'like', 'style', 'evening', 'feel']], 'I can do both. What style would you and Emma like for the evening?', 'Good question. Relaxed, but not silly.'),
        vague([...UNSURE, 'both', 'normal', 'mixed'], 'Both? Give me a feeling for it.')
      ),
      n(
        'Nice. What about games? I have seen wedding games that go on forever.',
        'Hay. Còn trò chơi thì sao? Tôi từng thấy những trò chơi đám cưới kéo dài lê thê.',
        'Đề xuất: một trò ngắn, hoặc không chơi nếu họ không thích.',
        'Sorry, do you recommend games or not?',
        r('Chỉ một trò ngắn, khoảng năm phút', [['one game', 'a short game', 'one short', 'single game', 'five minutes', 'ten minutes', 'quick game']], 'I suggest one short game, five minutes at most, just to warm up the room.', 'One game, five minutes. I can live with that.'),
        r('Không cần trò chơi, thay bằng câu chuyện của hai bạn', [['no games', 'skip', 'without games', 'not necessary', 'instead'], ['story', 'video', 'games', 'photos', 'speeches', 'music', 'them']], 'We can skip the games and tell your love story instead. Guests enjoy that more.', 'Our story instead of games. Emma will love that.'),
        vague([...UNSURE, 'up to you', 'any'], 'I am asking for your advice. What works best?')
      ),
      n(
        'Sounds good. What do you need from us before the wedding day?',
        'Nghe ổn đấy. Trước ngày cưới bạn cần gì từ bọn tôi?',
        'Nêu những thứ cần: câu chuyện tình yêu, danh sách tên, và một buổi gặp hoặc tổng duyệt.',
        'Sorry, what should we send you?',
        r('Câu chuyện và danh sách tên người phát biểu', [['story', 'how you met', 'names', 'list', 'speakers', 'photos', 'information', 'details'], ['your', 'of', 'who', 'family', 'send', 'need', 'please', 'and']], 'I need your love story, and the names of everyone who will speak, with how to pronounce them.', 'Our story and the names. I will send them this week.'),
        r('Một buổi tổng duyệt trước ngày cưới', [['rehearsal', 'run through', 'meeting', 'meet again', 'call'], ['before', 'day', 'week', 'venue', 'one', 'short', 'need', 'would']], 'I would like one short rehearsal at the venue, the day before the wedding.', 'A rehearsal the day before. We will be there.'),
        vague([...UNSURE, 'nothing', 'not much'], 'Nothing at all? There must be something.')
      ),
    ],
    end: 'I have a really good feeling about this. Let me talk to Emma, and we will call you tomorrow.',
    endVi: 'Tôi có cảm giác rất tốt về chuyện này. Để tôi nói với Emma, mai bọn tôi gọi bạn nhé.',
  },
];
