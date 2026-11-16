/**
 * Nói dài: mỗi bài là một lượt độc thoại 60-90 giây của MC, có dàn ý 6 ý.
 * Quy ước viết (tests/longturn.test.mjs kiểm):
 * - mỗi câu mẫu `say` phải được nhận đúng ý của chính nó; ghép cả bài mẫu thì đủ mọi ý và đạt 3 sao
 * - bài mẫu dài 110-190 từ (nói 60-90 giây ở tốc độ sân khấu)
 * - `key` là cụm then chốt nằm trong câu mẫu, hiện ra khi người học xin gợi ý
 * - câu mẫu đọc bằng giọng coach (phase `longturn` trong tools/voice-lines.mjs)
 */
import type { Idea, LongTask } from '../core/longturn';

const i = (label: string, need: string[][], key: string, say: string): Idea => ({ label, need, key, say });

const GREET = ['good evening', 'good morning', 'good afternoon', 'welcome', 'hello'];
const THANK = ['thank', 'thanks', 'grateful', 'appreciate', 'gratitude'];
const APPLAUSE = ['applause', 'welcome', 'welcoming', 'hand', 'clap', 'cheer'];

export const LONG_TASKS: LongTask[] = [
  {
    id: 'wedding-open',
    kind: 'Tiệc cưới',
    cefr: 'B1',
    title: 'Mở màn tiệc cưới',
    brief: 'Khách đã ngồi vào bàn, đèn dịu xuống. Bạn bước ra mở màn tiệc cưới của Emma và Liam cho khách nước ngoài, rồi mời cô dâu chú rể tiến vào.',
    tip: 'Câu cuối là câu to nhất: tên cô dâu chú rể đặt ở cuối để cả phòng vỗ tay đúng lúc.',
    ideas: [
      i('Chào khách', [GREET, ['ladies', 'gentlemen', 'everyone', 'guests', 'family', 'friends']], 'Good evening, ladies and gentlemen', 'Good evening, ladies and gentlemen, family and friends. A very warm welcome to all of you tonight.'),
      i('Tự giới thiệu là MC', [['my name', 'i am', 'this is'], ['host', 'mc', 'master of ceremonies']], 'I will be your host', 'My name is Thien An, and I will be your host for this evening. It is an honor to share this night with you. I will guide you through every part of the celebration.'),
      i('Nêu lý do có mặt: đám cưới của hai người', [['wedding', 'marriage', 'celebrate', 'celebration', 'love'], ['emma', 'liam', 'couple', 'bride', 'groom']], 'to celebrate the wedding of', 'We are here to celebrate the wedding of Emma and Liam. Today, two families become one. And tonight, we celebrate that love together.'),
      i('Cảm ơn khách đã đến', [THANK, ['coming', 'joining', 'being here', 'travelled', 'traveled', 'came', 'presence', 'join']], 'Thank you for joining us', 'On behalf of both families, thank you for joining us. Some of you have travelled a very long way to be here.'),
      i('Nhắc việc nhỏ: điện thoại, chỗ ngồi', [['phone', 'phones', 'seat', 'seats', 'seated'], ['silent', 'quiet', 'turn', 'switch', 'take', 'find', 'remain', 'stay']], 'please take your seats', 'Before we begin, please take your seats and switch your phones to silent. Our photographer will capture every moment for you. Dinner will be served right after the ceremony.'),
      i('Mời đón cô dâu chú rể', [['please', 'let us', 'join me', 'stand', 'rise', 'put your hands'], ['welcome', 'welcoming', 'entrance', 'applause', 'bride and groom', 'newlyweds']], 'join me in welcoming', 'And now, the moment we have all been waiting for. Please rise and join me in welcoming the bride and groom, Emma and Liam!'),
    ],
  },
  {
    id: 'speaker-intro',
    kind: 'Hội nghị',
    cefr: 'B2',
    title: 'Giới thiệu diễn giả chính',
    brief: 'Sau giờ giải lao ở một hội nghị khách hàng, bạn giới thiệu diễn giả chính: bà Elena Park, tổng giám đốc, 20 năm trong ngành, sẽ nói về tương lai của bán lẻ.',
    tip: 'Tiểu sử nói ngắn, tên diễn giả nói sau cùng. Đừng đọc chức danh hai lần.',
    ideas: [
      i('Kéo sự chú ý về sân khấu', [['welcome back', 'attention', 'seats', 'seated', 'settle', 'ladies and gentlemen']], 'Welcome back, everyone', 'Welcome back, everyone. I hope you enjoyed the break, so please take your seats as we continue. We have a very special session ahead of us.'),
      i('Báo phần tiếp theo: bài phát biểu chính', [['keynote', 'speech', 'talk', 'presentation', 'address', 'session'], ['next', 'now', 'time', 'highlight', 'coming', 'main']], 'the keynote speech', 'It is now time for the highlight of our program, the keynote speech of the day. Many of you told me this is the reason you came today.'),
      i('Nêu chủ đề', [['topic', 'talk about', 'speak about', 'share', 'vision', 'subject', 'theme'], ['retail', 'future']], 'share her vision on', 'Our speaker will share her vision on the future of retail, a topic that touches every business in this room. You will hear what is changing, and what we can do about it.'),
      i('Kinh nghiệm của diễn giả', [['years', 'experience', 'career', 'decades'], ['industry', 'retail', 'business', 'field', 'worked', 'spent', 'leading', 'led']], 'twenty years in this industry', 'She has spent twenty years in this industry, and she has led teams in five different countries. She started her career on the shop floor, so she knows this business from the ground up.'),
      i('Thành tựu nổi bật', [['award', 'awards', 'grew', 'built', 'founded', 'doubled', 'achievement', 'named', 'recognized', 'success', 'transformed']], 'Under her leadership', 'Under her leadership, the company doubled its stores and was named retailer of the year. Today, she is one of the most respected voices in our field.'),
      i('Mời khán giả chào đón, nói tên sau cùng', [['please', 'let us', 'join me', 'put your hands'], APPLAUSE, ['elena', 'park', 'ceo', 'chief executive', 'speaker']], 'Please join me in welcoming', 'So without further ado, please join me in welcoming our chief executive officer, Elena Park!'),
    ],
  },
  {
    id: 'closing',
    kind: 'Hội nghị',
    cefr: 'B1',
    title: 'Bế mạc chương trình',
    brief: 'Phiên cuối của hội nghị vừa xong. Bạn nói lời bế mạc: cảm ơn, nhắc điểm đáng nhớ, báo tiệc tối lúc 7 giờ ở sảnh tầng hai, rồi chào tạm biệt.',
    tip: 'Hạ giọng dần. Thông tin giờ và địa điểm nói chậm, nhắc lại một lần.',
    ideas: [
      i('Báo chương trình đã tới hồi kết', [['end', 'close', 'closing', 'conclusion', 'conclude', 'final', 'wrap']], 'come to the end', 'Ladies and gentlemen, we have now come to the end of our program for today. What a day it has been.'),
      i('Cảm ơn diễn giả', [THANK, ['speaker', 'speakers', 'panel', 'panelists', 'presenters']], 'a big thank you to our wonderful speakers', 'First of all, a big thank you to our wonderful speakers for sharing their ideas and their time. We learned so much from each of you.'),
      i('Cảm ơn nhà tài trợ và ban tổ chức', [THANK, ['sponsor', 'sponsors', 'partner', 'partners', 'team', 'organizers', 'organisers', 'staff', 'crew']], 'grateful to our sponsors', 'We are also grateful to our sponsors, and to the team behind the scenes who made today possible. Thank you for your hard work since early this morning.'),
      i('Nhắc một điểm đáng nhớ của ngày hôm nay', [['today', 'learned', 'heard', 'remember', 'highlight', 'message', 'takeaway', 'idea', 'ideas'], ['we', 'you', 'us']], 'If there is one thing to remember', 'If there is one thing to remember from today, it is this: we grow faster when we work together. I hope you take that idea back to your own teams.'),
      i('Báo việc tiếp theo: tiệc tối, giờ và địa điểm', [['dinner', 'reception', 'party', 'banquet', 'drinks'], ['seven', '7', 'floor', 'hall', 'lobby', 'ballroom', 'at', 'tonight']], 'Dinner will be served at seven', 'Please remember that dinner will be served at seven o’clock in the hall on the second floor. That is seven o’clock, second floor.'),
      i('Chào tạm biệt và chúc khách', [['good night', 'goodbye', 'safe', 'see you', 'take care', 'have a', 'farewell', 'until next']], 'a safe trip home', 'Thank you once again for being with us. Have a wonderful evening, and a safe trip home. Goodbye!'),
    ],
  },
  {
    id: 'toast',
    kind: 'Tiệc cưới',
    cefr: 'B1',
    title: 'Dẫn phần nâng ly',
    brief: 'Bánh cưới đã cắt xong. Bạn dẫn phần nâng ly chúc mừng Emma và Liam: mời chú ý, nói vài lời về cặp đôi, mời cả phòng đứng dậy và nâng ly.',
    tip: 'Dừng một nhịp sau “please stand” để mọi người kịp cầm ly rồi mới hô lời chúc.',
    ideas: [
      i('Xin sự chú ý của cả phòng', [['attention', 'moment', 'ladies and gentlemen', 'everyone', 'may i']], 'May I have your attention', 'Ladies and gentlemen, may I have your attention for a moment, please. Thank you so much.'),
      i('Báo đã tới phần nâng ly', [['toast', 'raise', 'glass', 'glasses', 'champagne']], 'It is time for the toast', 'The cake has been cut, the glasses are full, and it is time for the toast. This is my favorite moment of every wedding.'),
      i('Nói vài lời về cặp đôi', [['emma', 'liam', 'couple', 'they', 'bride', 'groom', 'newlyweds'], ['love', 'together', 'met', 'story', 'happy', 'journey', 'years', 'beautiful']], 'Their love story', 'Emma and Liam met eight years ago, and their love story has brought all of us together tonight. They have supported each other through every challenge, and today they begin a new chapter.'),
      i('Mời khách đứng dậy', [['stand', 'rise', 'feet', 'get up']], 'please stand', 'So I would like to ask everyone to please stand. Take your time, and make sure the person next to you has a glass.'),
      i('Mời nâng ly', [['raise', 'lift', 'hold up'], ['glass', 'glasses', 'champagne', 'drink', 'drinks']], 'raise your glasses', 'Please raise your glasses high, whatever you are drinking tonight. Now, please repeat after me.'),
      i('Hô lời chúc', [['to emma', 'to the couple', 'to the bride', 'to the newlyweds', 'to love', 'cheers', 'to liam', 'happiness', 'wish']], 'To Emma and Liam', 'We wish them a lifetime of love and happiness. To Emma and Liam! Cheers! Please enjoy your drinks, and the dance floor will open in a moment.'),
    ],
  },
  {
    id: 'launch-open',
    kind: 'Ra mắt sản phẩm',
    cefr: 'B2',
    title: 'Mở màn buổi ra mắt sản phẩm',
    brief: 'Bạn mở màn buổi ra mắt đồng hồ thông minh Aura One trước báo chí và đối tác: chào, nói vì sao tối nay đặc biệt, cảm ơn, báo chương trình, rồi mời CEO lên.',
    tip: 'Tên sản phẩm luôn có một nhịp ngắt phía trước. Đừng tiết lộ giá.',
    ideas: [
      i('Chào báo chí và đối tác', [GREET, ['press', 'media', 'partners', 'guests', 'ladies', 'friends', 'everyone']], 'members of the press', 'Good evening, ladies and gentlemen, members of the press, and our valued partners. Welcome! Thank you for being here with us.'),
      i('Nói vì sao tối nay đặc biệt', [['tonight', 'today', 'this evening'], ['special', 'launch', 'reveal', 'unveil', 'introduce', 'first time', 'new', 'excited', 'proud']], 'Tonight is a special night', 'Tonight is a special night, because after three years of work, we will finally unveil Aura One. You are the first people in the world to see it.'),
      i('Cảm ơn những người đã góp sức', [THANK, ['team', 'partners', 'engineers', 'designers', 'support', 'everyone', 'who']], 'thank the team', 'Before we start, I would like to thank the team of engineers and designers who made this possible. Many of them are in this room tonight.'),
      i('Báo trình tự chương trình', [['first', 'then', 'after', 'followed', 'next', 'program', 'agenda', 'begin with', 'start with'], ['speech', 'video', 'demo', 'reveal', 'presentation', 'questions', 'experience', 'try']], 'First, you will hear from', 'First, you will hear from our chief executive. Then comes the reveal, and after that you can try the watch yourself.'),
      i('Nhắc việc nhỏ: chụp ảnh, hashtag, điện thoại', [['photo', 'photos', 'pictures', 'hashtag', 'phones', 'share', 'post', 'film', 'record']], 'feel free to take photos', 'Please feel free to take photos during the reveal, and share them with our hashtag, Aura One. We would love to see this moment through your eyes.'),
      i('Mời CEO lên sân khấu', [['please', 'let us', 'join me', 'put your hands'], APPLAUSE, ['ceo', 'chief executive', 'elena', 'park', 'founder', 'director']], 'please join me in welcoming', 'And now, please join me in welcoming the woman behind this vision, our chief executive officer, Elena Park!'),
    ],
  },
  {
    id: 'delay',
    kind: 'Gala',
    cefr: 'B2',
    title: 'Thông báo chậm chương trình',
    brief: 'Màn hình LED hỏng ngay trước tiết mục chính của gala. Kỹ thuật cần khoảng 10 phút. Bạn ra thông báo để khán phòng yên tâm và không bỏ về.',
    tip: 'Giọng bình tĩnh, câu ngắn. Nói rõ con số phút, đừng nói “a little while”.',
    ideas: [
      i('Xin sự chú ý', [['attention', 'ladies and gentlemen', 'everyone', 'may i']], 'May I have your attention', 'Ladies and gentlemen, may I have your attention, please. Thank you.'),
      i('Xin lỗi vì gián đoạn', [['sorry', 'apologize', 'apologise', 'apologies', 'apology', 'regret']], 'We apologize for this short delay', 'We apologize for this short delay in tonight’s program. We know you have been looking forward to the next performance.'),
      i('Nêu lý do ngắn gọn', [['technical', 'screen', 'sound', 'issue', 'problem', 'equipment', 'system', 'fixing', 'working on']], 'a small technical issue', 'Our team is fixing a small technical issue with the main screen, and everything else is perfectly fine. There is no reason to worry.'),
      i('Nói rõ phải chờ bao lâu', [['minutes', 'minute', 'moments', 'shortly'], ['ten', '10', 'five', 'few', 'about', 'around', 'in']], 'in about ten minutes', 'We expect to continue in about ten minutes. That is ten minutes from now. I will come back to this stage as soon as we are ready.'),
      i('Gợi ý việc làm trong lúc chờ', [['meantime', 'meanwhile', 'while', 'until then'], ['drink', 'drinks', 'bar', 'seat', 'seats', 'seated', 'enjoy', 'music', 'refreshments', 'relax']], 'In the meantime', 'In the meantime, the bar is open, so please enjoy a drink and the music, and stay close to your seats.'),
      i('Cảm ơn sự kiên nhẫn và hứa hẹn', [THANK, ['patience', 'understanding', 'waiting', 'wait']], 'Thank you for your patience', 'Thank you for your patience and understanding. I promise the next performance is worth the wait. We will see you again in ten minutes.'),
    ],
  },
  {
    id: 'award',
    kind: 'Lễ trao giải',
    cefr: 'B2',
    title: 'Công bố một giải thưởng',
    brief: 'Bạn công bố giải “Nhân viên của năm” ở tiệc tất niên: giới thiệu giải, nói ý nghĩa, tạo hồi hộp, xướng tên Daniel Tran, mời anh lên nhận giải.',
    tip: 'Quãng lặng trước tên người thắng dài ít nhất hai giây. Đừng nói tên rồi mới nói “the winner is”.',
    ideas: [
      i('Giới thiệu hạng mục giải', [['award', 'prize', 'category', 'title'], ['next', 'now', 'final', 'employee', 'year', 'our', 'this']], 'our next award', 'We now come to our next award of the evening, Employee of the Year. This is the award that everyone has been waiting for.'),
      i('Nói ý nghĩa của giải', [['award', 'prize', 'it', 'this'], ['goes to', 'given', 'honors', 'honours', 'recognizes', 'recognises', 'celebrates', 'for someone', 'for a person', 'for the person']], 'This award recognizes', 'This award recognizes one person who went far beyond their job to help the whole team. It is chosen by the votes of all of you, the colleagues.'),
      i('Nêu việc người thắng đã làm', [['worked', 'helped', 'led', 'built', 'solved', 'trained', 'supported', 'delivered', 'never', 'always', 'year']], 'This year, our winner', 'This year, our winner trained twelve new colleagues and never once said, that is not my job. Customers ask for this person by name.'),
      i('Tạo hồi hộp trước khi xướng tên', [['winner is', 'goes to', 'award goes', 'drum roll', 'envelope', 'ready']], 'And the winner is', 'I have the envelope in my hand. Are you ready? Finally, the moment has come. And the winner is…'),
      i('Xướng tên và chúc mừng', [['daniel', 'tran'], ['congratulations', 'congratulate', 'well done', 'winner', 'applause', 'proud']], 'Congratulations, Daniel', 'Daniel Tran! Congratulations, Daniel, we are so proud of you. You truly deserve this.'),
      i('Mời lên sân khấu nhận giải', [['stage', 'come up', 'come forward', 'join me', 'join us'], ['please', 'receive', 'accept', 'collect', 'award', 'trophy']], 'Please come up to the stage', 'Please come up to the stage to receive your award, and let us give him a big round of applause. Daniel, tonight the stage is yours.'),
    ],
  },
  {
    id: 'housekeeping',
    kind: 'Sự kiện quốc tế',
    cefr: 'B1',
    title: 'Thông báo đầu giờ cho hội nghị',
    brief: 'Trước phiên khai mạc một diễn đàn quốc tế, bạn đọc các thông báo: lối thoát hiểm, điện thoại, tai nghe phiên dịch kênh 2, giờ giải lao 10 giờ 30, và phần hỏi đáp.',
    tip: 'Mỗi thông báo một câu, mỗi câu một nhịp ngắt. Con số nói chậm.',
    ideas: [
      i('Chào và báo sắp bắt đầu', [GREET, ['begin', 'start', 'moments', 'shortly', 'minutes', 'about to']], 'We will begin in just a few moments', 'Good morning, ladies and gentlemen, and welcome. We will begin in just a few moments. Before we start, I have a few short announcements.'),
      i('Lối thoát hiểm', [['exit', 'exits', 'emergency'], ['back', 'side', 'sides', 'behind', 'left', 'right', 'doors', 'located', 'are']], 'the emergency exits are', 'For your safety, please note that the emergency exits are at the back and on both sides of the hall. Our staff will guide you if needed.'),
      i('Điện thoại để im lặng', [['phone', 'phones', 'devices', 'mobile'], ['silent', 'off', 'quiet', 'mute']], 'switch your phones to silent', 'Please switch your phones to silent, so that our speakers have your full attention. You are welcome to take photos, but please do not use flash.'),
      i('Tai nghe phiên dịch và kênh', [['headset', 'headsets', 'headphones', 'interpretation', 'translation', 'interpreting'], ['channel', 'available', 'english', 'two', '2', 'desk', 'find', 'seat']], 'English is on channel two', 'Interpretation headsets are on your seats, and English is on channel two. If your headset does not work, please raise your hand.'),
      i('Giờ giải lao', [['break', 'coffee', 'tea'], ['ten thirty', '10 30', 'half past', 'will be', 'served', 'lobby']], 'a coffee break at ten thirty', 'There will be a coffee break at ten thirty in the lobby, right outside this room. Lunch will follow at twelve o’clock.'),
      i('Cách đặt câu hỏi', [['question', 'questions', 'q and a'], ['raise', 'hand', 'microphone', 'end', 'after', 'app', 'write', 'session', 'time']], 'time for questions at the end', 'There will be time for questions at the end of each session, so please raise your hand and wait for the microphone. Thank you, and enjoy the forum.'),
    ],
  },
  {
    id: 'sponsor-thanks',
    kind: 'Gala',
    cefr: 'B1',
    title: 'Cảm ơn nhà tài trợ',
    brief: 'Giữa đêm gala gây quỹ học bổng, bạn dành một phút cảm ơn nhà tài trợ chính Greenleaf Energy và mời đại diện, ông David Hale, đứng lên nhận tràng pháo tay.',
    tip: 'Tên nhà tài trợ đọc hai lần, lần nào cũng tách bằng một nhịp ngắt.',
    ideas: [
      i('Chuyển sang phần cảm ơn', [['moment', 'pause', 'before we', 'now', 'like to', 'at this time'], THANK], 'I would like to take a moment', 'Before we continue, I would like to take a moment to say thank you. An evening like this takes many generous people.'),
      i('Nêu tên nhà tài trợ chính', [['greenleaf'], ['sponsor', 'partner', 'supporter', 'support']], 'our main sponsor, Greenleaf Energy', 'Tonight would not be possible without our main sponsor, Greenleaf Energy. Greenleaf Energy has supported this gala for five years in a row.'),
      i('Nói họ đã giúp gì', [['support', 'generosity', 'donation', 'help', 'gift', 'contribution', 'funded', 'because of'], ['scholarship', 'scholarships', 'students', 'children', 'school', 'education', 'young']], 'Thanks to their generosity', 'Thanks to their generosity, forty students will receive a full scholarship next year. That covers their school fees, their books, and their meals.'),
      i('Nói ý nghĩa với cộng đồng', [['means', 'change', 'future', 'difference', 'lives', 'dream', 'dreams', 'opportunity', 'chance']], 'a real difference', 'That is forty young people with a real chance to change their future, and that makes a real difference. Some of those students are here with us tonight.'),
      i('Mời đại diện đứng lên', [['david', 'hale', 'representative', 'director'], ['stand', 'rise', 'with us', 'here', 'join', 'please']], 'please stand so we can thank you', 'Mister David Hale from Greenleaf Energy is with us tonight. Mister Hale, please stand so we can thank you. We are honored to have you here.'),
      i('Mời cả phòng vỗ tay', [['applause', 'hand', 'clap', 'cheer', 'put your hands']], 'a big round of applause', 'Ladies and gentlemen, a big round of applause for Greenleaf Energy! Thank you. And now, let us continue with our program.'),
    ],
  },
  {
    id: 'tea-ceremony',
    kind: 'Lễ cưới truyền thống',
    cefr: 'B2',
    title: 'Giải thích lễ gia tiên cho khách nước ngoài',
    brief: 'Trong lễ cưới truyền thống, nhà trai có nhiều khách nước ngoài. Trước lễ gia tiên, bạn giải thích bằng tiếng Anh: lễ này là gì, sẽ diễn ra thế nào, và khách nên làm gì.',
    tip: 'Giải thích bằng từ đơn giản. Đừng dịch từng chữ “gia tiên”, hãy tả việc sẽ xảy ra.',
    ideas: [
      i('Chào khách nước ngoài', [GREET, ['guests', 'friends', 'family', 'abroad', 'overseas', 'international', 'everyone']], 'a special welcome to our guests from abroad', 'Good morning, everyone, and a special welcome to our guests from abroad. Thank you for travelling so far to be with us today.'),
      i('Báo sắp có nghi lễ gì', [['ceremony', 'ritual', 'tradition'], ['ancestor', 'ancestors', 'altar', 'family', 'traditional', 'vietnamese', 'tea']], 'a traditional Vietnamese ceremony', 'In a moment, you will see a traditional Vietnamese ceremony at the family altar. It is the most important part of a Vietnamese wedding.'),
      i('Giải thích ý nghĩa', [['respect', 'honor', 'honour', 'thank', 'blessing', 'blessings', 'permission', 'remember'], ['ancestors', 'grandparents', 'parents', 'family', 'families']], 'to show respect to their ancestors', 'The bride and groom will light incense to show respect to their ancestors and to ask for their blessing. In our culture, a marriage joins two families, not only two people.'),
      i('Nói việc sẽ diễn ra: mời trà, trao quà', [['tea', 'gifts', 'jewelry', 'jewellery', 'envelopes', 'envelope'], ['offer', 'serve', 'give', 'receive', 'parents', 'present', 'pour']], 'offer tea to their parents', 'After that, they will offer tea to their parents, and the parents will give them gifts and advice. You may see some happy tears at this point.'),
      i('Dặn khách nên làm gì', [['please', 'feel free', 'welcome to', 'may', 'can'], ['photos', 'pictures', 'quiet', 'stand', 'seated', 'watch', 'silent', 'phones']], 'feel free to take photos', 'Please feel free to take photos, but we kindly ask you to stay quiet during the ceremony. There is no need to stand.'),
      i('Mời bắt đầu nghi lễ', [['begin', 'start', 'invite', 'now'], ['ceremony', 'bride', 'groom', 'families', 'couple', 'altar']], 'let us begin the ceremony', 'It only takes about fifteen minutes. So now, let us begin the ceremony, and I invite both families to come forward.'),
    ],
  },
  {
    id: 'qa-open',
    kind: 'Họp báo',
    cefr: 'B2',
    title: 'Mở phần hỏi đáp ở họp báo',
    brief: 'Hai lãnh đạo vừa công bố xong hợp tác. Bạn mở phần hỏi đáp với báo chí: cảm ơn, nêu luật (mỗi người một câu, xưng tên và cơ quan), thời lượng 15 phút, rồi mời câu hỏi đầu.',
    tip: 'Nêu luật trước khi mời câu hỏi. Giọng lịch sự nhưng dứt khoát.',
    ideas: [
      i('Cảm ơn hai lãnh đạo vừa phát biểu', [THANK, ['speakers', 'both', 'leaders', 'announcement', 'remarks', 'presentation', 'mr', 'ms', 'mister']], 'Thank you both for that announcement', 'Thank you both for that announcement, and for sharing the story behind this partnership. I am sure our guests from the media have many questions.'),
      i('Mở phần hỏi đáp', [['questions', 'question', 'q and a', 'floor'], ['open', 'now', 'take', 'time', 'move', 'media', 'press']], 'take questions from the media', 'We will now open the floor and take questions from the media. Our two speakers will answer together.'),
      i('Luật: mỗi người một câu hỏi', [['one question', 'single question', 'one each', 'only one', 'limit']], 'one question each', 'To give everyone a chance, please ask only one question each. If time allows, we will come back to you for a second one.'),
      i('Luật: xưng tên và cơ quan báo chí', [['name', 'yourself', 'introduce'], ['outlet', 'organization', 'organisation', 'newspaper', 'media', 'company', 'publication', 'channel', 'state', 'tell', 'share', 'give']], 'state your name and your media outlet', 'Before your question, please state your name and your media outlet. This helps our speakers and our interpreters.'),
      i('Cách xin hỏi và thời lượng', [['raise', 'hand', 'microphone', 'mic'], ['minutes', 'fifteen', '15', 'wait', 'bring', 'time', 'colleague']], 'raise your hand and wait for the microphone', 'Please raise your hand and wait for the microphone. We have about fifteen minutes in total. I will let you know when we have time for one last question.'),
      i('Mời câu hỏi đầu tiên', [['first question', 'who would like', 'go ahead', 'start with', 'begin with', 'lady', 'gentleman', 'front row']], 'Who would like to begin?', 'So, who would like to begin? Yes, the lady in the front row, please go ahead. Then we will take the next question from the back of the room.'),
    ],
  },
  {
    id: 'auction-open',
    kind: 'Đấu giá từ thiện',
    cefr: 'B2',
    title: 'Mở phiên đấu giá từ thiện',
    brief: 'Bạn mở phiên đấu giá gây quỹ xây thư viện cho trẻ em vùng cao: nói mục đích, cách trả giá bằng bảng số, giới thiệu vật phẩm đầu tiên là một bức tranh sơn mài, giá khởi điểm 500 đô la.',
    tip: 'Con số giá nói rõ từng chữ. Lời kêu gọi nói bằng giọng ấm, không thúc ép.',
    ideas: [
      i('Chào và báo phần đấu giá', [['auction', 'bidding'], ['welcome', 'time', 'now', 'begin', 'start', 'tonight', 'moment']], 'our charity auction', 'Ladies and gentlemen, welcome to the most exciting part of the night, our charity auction. I hope you are feeling generous tonight.'),
      i('Nói tiền sẽ dùng làm gì', [['library', 'libraries', 'books', 'children', 'school', 'schools', 'students'], ['build', 'fund', 'help', 'support', 'go to', 'raise', 'give', 'for']], 'will help build a library', 'Every dollar you give tonight will help build a library for children in the mountains. Many of those children have never owned a book of their own.'),
      i('Hướng dẫn cách trả giá', [['paddle', 'paddles', 'number', 'hand'], ['raise', 'lift', 'hold', 'bid', 'up']], 'raise your paddle high', 'Bidding is simple. When you want to bid, raise your paddle high so that I can see your number. Our volunteers will then come to your table.'),
      i('Giới thiệu vật phẩm đầu tiên', [['first item', 'first lot', 'item number one', 'lot number one', 'first piece', 'painting', 'lacquer'], ['painting', 'lacquer', 'artist', 'handmade', 'beautiful', 'made', 'by', 'is']], 'Our first item is', 'Our first item is a beautiful lacquer painting, made by hand by a local artist over three months. You can see it on the screen and here on stage.'),
      i('Nêu giá khởi điểm', [['five hundred', '500'], ['start', 'starting', 'open', 'opening', 'begin', 'bid', 'at', 'dollars']], 'start the bidding at five hundred dollars', 'We will start the bidding at five hundred dollars. Five hundred. It is worth much more than that.'),
      i('Kêu gọi trả giá', [['who will', 'do i have', 'do i see', 'do i hear', 'anyone', 'generous', 'generosity', 'paddles up', 'heart', 'give me']], 'Who will give me five hundred?', 'Who will give me five hundred dollars for the children? Please be generous tonight. Do I see a paddle?'),
    ],
  },
];

export const LONG_BY_ID: Record<string, LongTask> = Object.fromEntries(LONG_TASKS.map((t) => [t.id, t]));
