/**
 * Trò chuyện, đợt 2 (phần 1/3): khán giả và khách mời nói chuyện trực tiếp với MC.
 * Cùng quy ước với talks.ts (tests/talk.test.mjs kiểm).
 */
import type { Talk, TalkNode, TalkReply } from '../core/talk';

export const r = (label: string, need: string[][], say: string, react: string): TalkReply => ({ label, need, say, react });
export const vague = (words: string[], react: string): TalkReply => ({ label: 'Trả lời còn chung chung', need: [words], react, stay: true });
export const n = (ask: string, askVi: string, task: string, nudge: string, ...replies: TalkReply[]): TalkNode => ({ ask, askVi, task, nudge, replies });

export const OK = ['yes', 'yeah', 'okay', 'ok', 'sure', 'fine', 'all right', 'alright'];
export const UNSURE = ['maybe', 'not sure', 'i think', 'depends', 'i guess', 'perhaps', 'no problem', ...OK];
export const SORRY = ['sorry', 'apologize', 'apologise', 'apologies', 'afraid', 'unfortunately'];

export const TALKS_MORE_1: Talk[] = [
  {
    id: 'qa-audience',
    npcId: 'ben',
    name: 'Ben',
    kind: 'Hội nghị',
    fn: 'qa',
    roleVi: 'Một khán giả cầm micro trong phần hỏi đáp',
    goalVi: 'Điều phối phần hỏi đáp: giữ câu hỏi ngắn, đúng chủ đề, đúng giờ.',
    cefr: 'B2',
    nodes: [
      n(
        'Hi, thanks for the microphone. Before my question, can I just say a few things about my own company first?',
        'Chào, cảm ơn vì cái micro. Trước khi hỏi, tôi nói vài điều về công ty của tôi trước được không?',
        'Từ chối khéo: thời gian có hạn, mời anh đi thẳng vào câu hỏi.',
        'Sorry, so can I talk about my company, or not?',
        r('Thời gian có hạn, mời hỏi luôn', [['time', 'short', 'limited', 'tight', 'minutes'], ['question', 'ask']], 'Thank you, but our time is limited, so could you go straight to your question, please?', 'Fair enough. Straight to the question, then.'),
        r('Mời chia sẻ sau, ở giờ giải lao', [['break', 'after the session', 'afterwards', 'later', 'networking', 'coffee']], 'We would love to hear about it during the coffee break. For now, your question, please.', 'The coffee break. Good idea, I will find you there.'),
        vague(UNSURE, 'So is that a yes? I have three slides on my phone.')
      ),
      n(
        'Right. My question is for the speaker, but actually I have three questions. Is that all right?',
        'Được. Câu hỏi của tôi dành cho diễn giả, nhưng thật ra tôi có ba câu. Vậy có được không?',
        'Giới hạn mỗi người một câu để người khác cũng được hỏi.',
        'Sorry, how many questions can I ask?',
        r('Chỉ một câu thôi', [['one question', 'just one', 'only one', 'one each', 'single question']], 'Just one question, please, so that everyone gets a chance.', 'One question. Okay, I will choose my best one.'),
        r('Hỏi câu quan trọng nhất, còn lại hỏi riêng', [['most important', 'best', 'first one', 'main'], ['rest', 'others', 'other two', 'after', 'later', 'privately']], 'Please ask your most important one now, and the others after the session.', 'My most important one. Let me think for a second.'),
        vague(UNSURE, 'All three, then? They are quite long.')
      ),
      n(
        'Okay, here it is. Why is your product so expensive compared to others? Honestly, I think the price is a joke.',
        'Được rồi, đây. Tại sao sản phẩm của các anh đắt thế so với hãng khác? Nói thật, tôi thấy giá đó như trò đùa.',
        'Giữ bình tĩnh: cảm ơn câu hỏi, diễn đạt lại lịch sự rồi chuyển cho diễn giả.',
        'Sorry, will anyone answer my question about the price?',
        r('Cảm ơn và chuyển câu hỏi cho diễn giả', [['thank', 'thanks', 'good question', 'fair question', 'honest'], ['speaker', 'elena', 'her', 'him', 'panel', 'pass', 'hand', 'over to']], 'Thank you for your honest question. Let me pass it to our speaker: how do you explain the price?', 'Thanks. I am curious to hear the answer.'),
        r('Diễn đạt lại câu hỏi cho lịch sự', [['so your question', 'in other words', 'you are asking', 'you would like to know', 'the question is'], ['price', 'pricing', 'cost', 'value']], 'So your question is about pricing and value. Elena, would you like to answer that?', 'Yes, pricing and value. That is a nicer way to put it.'),
        vague(UNSURE, 'Is somebody going to answer, or should I repeat it?')
      ),
      n(
        'Hmm. That answer did not really convince me. Can I respond to that? I have a lot more to say.',
        'Hừm. Câu trả lời đó chưa thuyết phục tôi lắm. Tôi đáp lại được không? Tôi còn nhiều điều muốn nói.',
        'Ngăn tranh luận kéo dài: cảm ơn, mời anh trao đổi tiếp sau, rồi chuyển sang người khác.',
        'Sorry, can I keep going or not?',
        r('Mời trao đổi tiếp sau phiên, giờ chuyển người khác', [['after', 'later', 'break', 'offline', 'privately', 'directly'], ['next', 'other', 'another', 'move on', 'continue', 'speaker', 'discuss', 'talk']], 'I am sure the speaker will be happy to continue this with you after the session. Let us move on to the next question.', 'All right. I will catch her after the session.'),
        r('Hết giờ cho câu này', [['time', 'minutes'], ['move on', 'next', 'one more', 'last']], 'Thank you, but we only have time for one more question, so I have to move on.', 'Understood. Time flies in these sessions.'),
        vague(UNSURE, 'So I can go on? It will only take ten minutes.')
      ),
      n(
        'Fine. One last thing: where can I send my feedback about this session?',
        'Được thôi. Điều cuối: tôi gửi góp ý về phiên này ở đâu?',
        'Chỉ cách gửi góp ý: mã QR, ứng dụng, quầy đăng ký, hoặc email.',
        'Sorry, where did you say I can send it?',
        r('Quét mã QR hoặc dùng ứng dụng', [['qr', 'code', 'app', 'scan', 'screen', 'form', 'survey', 'online']], 'You can scan the QR code on the screen and fill in the short form.', 'The QR code. Got it, thank you.'),
        r('Tới quầy đăng ký hoặc gửi email', [['desk', 'registration', 'email', 'team', 'staff', 'organizer', 'organiser']], 'Please leave it at the registration desk, or send an email to the organizers.', 'The registration desk. I will stop by on my way out.'),
        vague(UNSURE, 'But where, exactly? I do want to write something.')
      ),
    ],
    end: 'Thanks for keeping things moving. You are good at this.',
    endVi: 'Cảm ơn vì đã giữ cho mọi thứ trôi chảy. Bạn làm việc này giỏi đấy.',
  },
  {
    id: 'press-reporter',
    npcId: 'nadia',
    name: 'Nadia',
    kind: 'Họp báo',
    fn: 'qa',
    roleVi: 'Phóng viên chặn MC lại trước giờ họp báo để moi tin',
    goalVi: 'Từ chối tiết lộ thông tin một cách lịch sự và chuyên nghiệp.',
    cefr: 'C1',
    nodes: [
      n(
        'Excuse me, you are the host, right? I am Nadia from City News. Off the record, how much is the deal worth?',
        'Xin lỗi, anh là người dẫn đúng không? Tôi là Nadia từ City News. Nói riêng thôi, thương vụ này trị giá bao nhiêu?',
        'Từ chối: bạn không được phép tiết lộ, con số sẽ được công bố trong họp báo.',
        'Sorry, so can you give me a number?',
        r('Không thể tiết lộ, chờ công bố chính thức', [['cannot', 'can not', 'not able', 'unable', 'not in a position', 'not allowed', "can't"], ['share', 'say', 'comment', 'disclose', 'tell', 'reveal', 'confirm']], 'I am afraid I am not in a position to share that. The figures will be announced during the press conference.', 'I had to try. During the conference, then.'),
        r('Việc đó để người phát ngôn trả lời', [['spokesperson', 'spokesman', 'speakers', 'communications', 'pr team', 'press team', 'press officer']], 'That is a question for the spokesperson, and you will be able to ask it in a few minutes.', 'The spokesperson. Fine, I will save it.'),
        vague([...UNSURE, 'secret', 'big', 'a lot'], 'Come on, just a rough number. Tens of millions? Hundreds?')
      ),
      n(
        'All right. But I heard the CEO is leaving after this deal. Can you confirm that?',
        'Được rồi. Nhưng tôi nghe nói CEO sẽ rời đi sau thương vụ này. Anh xác nhận được không?',
        'Không xác nhận tin đồn; nói rõ bạn chỉ là MC và hướng cô ấy tới nguồn chính thức.',
        'Sorry, is the CEO leaving, yes or no?',
        r('Không bình luận về tin đồn', [['rumor', 'rumors', 'rumour', 'rumours', 'speculation', 'speculate']], 'I do not comment on rumors, and it would not be right for me to speculate.', 'Not a rumor denied, I notice. Interesting.'),
        r('Tôi chỉ là MC, hãy hỏi nguồn chính thức', [['host', 'mc', 'master of ceremonies', 'not the right person', 'only here to'], ['ask', 'official', 'company', 'statement', 'team', 'person']], 'I am only the host today, so I am not the right person to ask. The company will make any official statement itself.', 'Only the host. Of course you are.'),
        vague([...UNSURE, 'no idea', 'do not know', "don't know"], 'You must know something. You have been in the rehearsal all morning.')
      ),
      n(
        'Fair enough. Will I at least get to ask a question today? Last time nobody picked me.',
        'Thôi được. Ít nhất hôm nay tôi có được hỏi một câu không? Lần trước không ai gọi tới tôi.',
        'Không hứa chắc, nhưng nói cách làm: giơ tay sớm, bạn sẽ cố gọi đủ các bên.',
        'Sorry, so will you pick me or not?',
        r('Sẽ cố gắng, hãy giơ tay sớm', [['try', 'do my best', 'cannot promise', 'can not promise', "can't promise"], ['hand', 'raise', 'early', 'front', 'see you', 'fair', 'everyone']], 'I cannot promise, but if you raise your hand early, I will do my best to call on you.', 'Raise my hand early. I can do that.'),
        r('Có mười lăm phút hỏi đáp, mỗi người một câu', [['fifteen', '15', 'minutes'], ['one question', 'each', 'q and a', 'questions']], 'We have fifteen minutes for questions, one question each, so your chances are good.', 'Fifteen minutes. That is tight for forty journalists.'),
        vague(UNSURE, 'That does not sound like a promise.')
      ),
      n(
        'One more favour. Could I have five minutes alone with the chairman right after the event?',
        'Thêm một việc nhờ nữa. Tôi xin năm phút riêng với ngài chủ tịch ngay sau sự kiện được không?',
        'Giải thích việc đó không do bạn quyết; hướng cô ấy tới bộ phận truyền thông.',
        'Sorry, who should I ask about the interview?',
        r('Việc đó do bộ phận truyền thông sắp xếp', [['pr', 'press', 'communications', 'media team', 'press officer', 'assistant', 'office'], ['ask', 'arrange', 'arranged', 'speak', 'talk', 'contact', 'request', 'handle', 'decide', 'point']], 'Interviews are arranged by the communications team. I can point you to the press officer.', 'The press officer. Yes, please point me to her.'),
        r('Tôi không quyết được, nhưng sẽ chuyển lời', [['pass', 'forward', 'mention', 'let them know', 'tell them'], ['request', 'message', 'it', 'name', 'card']], 'That is not my decision, but I am happy to pass on your request.', 'Thank you. Here is my card.'),
        vague(UNSURE, 'Is that a yes from you, or do I need someone else?')
      ),
      n(
        'Thank you. Last question, I promise: where should the press sit, and can we film?',
        'Cảm ơn. Câu cuối, tôi hứa: báo chí ngồi ở đâu, và chúng tôi quay phim được không?',
        'Chỉ khu vực báo chí và nói rõ quy định quay phim, chụp ảnh.',
        'Sorry, where do we sit, and is filming allowed?',
        r('Không dùng đèn flash, bục máy quay ở cuối phòng', [['flash', 'platform', 'tripod', 'tripods', 'riser']], 'Cameras go on the platform at the back, and please do not use flash.', 'No flash. My photographer will complain, but fine.'),
        r('Khu báo chí ở hàng đầu, được quay phim', [['front', 'rows', 'row', 'reserved', 'press area', 'left', 'right', 'back'], ['film', 'filming', 'record', 'camera', 'cameras', 'photos', 'allowed', 'welcome']], 'The first two rows are reserved for the press, and filming is allowed during the whole event.', 'Front rows and cameras allowed. Perfect.'),
        vague(UNSURE, 'Okay where? And what about the cameras?')
      ),
    ],
    end: 'You are very professional. Annoyingly professional. See you inside.',
    endVi: 'Anh rất chuyên nghiệp. Chuyên nghiệp đến phát bực. Hẹn gặp bên trong.',
  },
  {
    id: 'guest-help',
    npcId: 'sophie',
    name: 'Sophie',
    kind: 'Tiệc cưới',
    fn: 'trouble',
    roleVi: 'Một vị khách nước ngoài tìm MC nhờ giúp giữa tiệc cưới',
    goalVi: 'Chỉ dẫn rõ ràng, lịch sự cho khách về chỗ ngồi, món ăn và giờ giấc.',
    cefr: 'B1',
    nodes: [
      n(
        'Excuse me, sorry to bother you. I cannot find my table. My name is Sophie Martin.',
        'Xin lỗi, phiền bạn chút. Tôi không tìm thấy bàn của mình. Tôi tên là Sophie Martin.',
        'Trấn an khách và chỉ cách tìm bàn: xem sơ đồ, hoặc bạn nhờ người dẫn.',
        'Sorry, where should I look for my table?',
        r('Xem sơ đồ chỗ ngồi ở cửa', [['chart', 'plan', 'list', 'board', 'map'], ['door', 'entrance', 'there', 'over', 'near', 'by', 'check', 'look']], 'No problem at all. The seating chart is by the entrance, so let us check your name there.', 'Oh, I walked right past it. Thank you.'),
        r('Nhờ nhân viên dẫn tới bàn', [['staff', 'colleague', 'someone', 'usher', 'waiter', 'team'], ['take', 'show', 'guide', 'help', 'walk', 'bring']], 'Do not worry. One of our staff will show you to your table right away.', 'That is very kind of you.'),
        vague(UNSURE, 'Thank you, but where do I go?')
      ),
      n(
        'Thank you. Also, I am vegetarian, and I forgot to tell the couple. Is that a problem?',
        'Cảm ơn. À, tôi ăn chay mà quên báo với cô dâu chú rể. Có sao không?',
        'Nói bạn sẽ báo bếp hoặc nhân viên phục vụ để chuẩn bị món chay.',
        'Sorry, so can I get a vegetarian meal?',
        r('Tôi sẽ báo bếp chuẩn bị món chay', [['kitchen', 'chef', 'waiter', 'staff', 'catering', 'manager'], ['tell', 'inform', 'ask', 'let', 'speak', 'talk', 'arrange', 'prepare']], 'Not at all. I will tell the kitchen now, and they will prepare a vegetarian meal for you.', 'Oh, wonderful. I was a bit worried.'),
        r('Khách sạn luôn có sẵn món chay', [['vegetarian option', 'vegetarian menu', 'vegetarian dish', 'vegetarian dishes', 'always have', 'available']], 'That is fine. The hotel always has a vegetarian option available.', 'They always have one? What a relief.'),
        vague(UNSURE, 'So should I tell someone, or will you?')
      ),
      n(
        'Lovely. And what time do the speeches start? I would like to call my daughter before that.',
        'Tuyệt. Mấy giờ thì bắt đầu phần phát biểu? Tôi muốn gọi cho con gái trước lúc đó.',
        'Nói một giờ cụ thể hoặc còn bao nhiêu phút nữa.',
        'Sorry, what time did you say?',
        r('Còn khoảng bao nhiêu phút nữa', [['minutes', 'minute', 'half an hour', 'an hour'], ['in', 'about', 'around', 'after', 'have', 'start', 'begin']], 'The speeches will start in about twenty minutes, so you have time for a quick call.', 'Twenty minutes. Plenty of time.'),
        r('Vào một giờ cụ thể', [["o'clock", 'seven', 'eight', 'half past', 'thirty', 'pm', 'p m']], 'They start at half past seven, right after the first course.', 'Half past seven. I will set an alarm.'),
        vague([...UNSURE, 'soon', 'later', 'shortly'], 'Soon as in five minutes, or soon as in an hour?')
      ),
      n(
        'Perfect. One more thing: is it all right if I take photos during the ceremony and post them online?',
        'Tốt quá. Thêm một việc: tôi chụp ảnh trong lễ và đăng lên mạng có được không?',
        'Nói rõ mong muốn của cô dâu chú rể: được chụp, nhưng đăng sau hoặc không dùng flash.',
        'Sorry, are photos okay or not?',
        r('Được chụp, nhưng xin đăng sau buổi lễ', [['post', 'share', 'upload', 'online'], ['after', 'later', 'tomorrow', 'wait', 'until']], 'You are welcome to take photos, but the couple kindly ask guests to post them after the ceremony.', 'After the ceremony. Of course, that makes sense.'),
        r('Được chụp, không dùng đèn flash', [['flash']], 'Photos are fine, but please do not use flash during the ceremony.', 'No flash. My phone is terrible in the dark, but all right.'),
        vague(UNSURE, 'Fine to post them too? I do not want to upset anyone.')
      ),
      n(
        'Understood. Last question: I have an early flight. When is a polite time to leave?',
        'Tôi hiểu rồi. Câu cuối: tôi có chuyến bay sớm. Lúc nào thì về là lịch sự?',
        'Gợi ý một thời điểm phù hợp: sau khi cắt bánh, hoặc sau điệu nhảy đầu tiên.',
        'Sorry, after which part can I leave?',
        r('Sau khi cắt bánh', [['cake']], 'After the cake cutting is a good moment. Nobody will mind at all.', 'After the cake. I would not miss the cake anyway.'),
        r('Sau điệu nhảy đầu tiên', [['dance']], 'I would suggest leaving after the first dance, around nine.', 'After the first dance. Lovely, I want to see that.'),
        r('Sau bữa tối và các bài phát biểu', [['dinner', 'speeches', 'main course', 'toast']], 'Any time after dinner and the speeches is perfectly polite.', 'After the speeches. Good, thank you.'),
        vague([...UNSURE, 'any time', 'anytime', 'whenever', 'up to you'], 'I would hate to be rude. Is there a best moment?')
      ),
    ],
    end: 'You have been so helpful. The couple are lucky to have you.',
    endVi: 'Bạn giúp tôi nhiều quá. Cô dâu chú rể thật may khi có bạn.',
  },
  {
    id: 'vip-late',
    npcId: 'robert',
    name: 'Robert',
    kind: 'Gala',
    fn: 'trouble',
    roleVi: 'Vị khách VIP đến muộn và muốn lên phát biểu ngay',
    goalVi: 'Giữ đúng chương trình mà vẫn tôn trọng khách VIP.',
    cefr: 'B2',
    nodes: [
      n(
        'There you are. I am Robert Hale, the main sponsor. My car was late. I need to give my speech right now.',
        'Anh đây rồi. Tôi là Robert Hale, nhà tài trợ chính. Xe tôi đến muộn. Tôi cần phát biểu ngay bây giờ.',
        'Chào đón ông, rồi giải thích đang có tiết mục trên sân khấu nên chưa thể ngay.',
        'Sorry, so can I go on stage now?',
        r('Chào đón, nhưng đang có tiết mục biểu diễn', [['welcome', 'glad', 'pleasure', 'honor', 'honour', 'good to see'], ['performance', 'performing', 'on stage', 'band', 'singer', 'middle', 'right now', 'at the moment']], 'Welcome, Mister Hale, we are so glad you are here. There is a performance on stage at the moment, so we cannot stop it.', 'A performance. How long is it?'),
        r('Mời ông lên ngay sau tiết mục này', [['after', 'as soon as', 'once', 'when'], ['performance', 'song', 'finishes', 'ends', 'over', 'act']], 'You will go on right after this performance. It ends in four minutes.', 'Four minutes. I suppose I can wait four minutes.'),
        vague([...UNSURE, ...SORRY], 'Sorry does not help me. When do I speak?')
      ),
      n(
        'Fine. But I have a plane to catch, so I want to speak for fifteen minutes and then leave.',
        'Được. Nhưng tôi còn phải ra sân bay, nên tôi muốn nói mười lăm phút rồi đi.',
        'Thương lượng thời lượng: chương trình chỉ dành năm phút cho bài phát biểu.',
        'Sorry, how long can I speak, then?',
        r('Chương trình dành năm phút', [['five', '5', 'three', 'four'], ['minutes', 'minute']], 'I understand. The program allows five minutes for your speech, and that keeps dinner on time.', 'Five minutes. I can do five, if I skip the jokes.'),
        r('Đề nghị nói ngắn vì bữa tối sắp phục vụ', [['dinner', 'food', 'kitchen', 'served', 'schedule', 'running late', 'behind'], ['short', 'shorter', 'brief', 'keep']], 'Dinner is about to be served, so could we keep it short? The guests will listen better.', 'True. Nobody listens when they are hungry.'),
        vague(UNSURE, 'So fifteen minutes is fine? Good.')
      ),
      n(
        'Agreed. How will you introduce me? Please do not get my title wrong like the last host did.',
        'Đồng ý. Anh sẽ giới thiệu tôi thế nào? Xin đừng đọc sai chức danh của tôi như người dẫn lần trước.',
        'Xác nhận lại tên và chức danh với ông trước khi lên sân khấu.',
        'Sorry, what will you call me on stage?',
        r('Xin xác nhận lại chức danh', [['confirm', 'check', 'correct', 'make sure', 'is it', 'should i say', 'how would you like'], ['title', 'name', 'chairman', 'ceo', 'founder', 'president', 'introduced']], 'Let me confirm: Mister Robert Hale, chairman of Hale Group. Is that correct?', 'Chairman of Hale Group. Correct, thank you for asking.'),
        r('Đọc lời giới thiệu đã chuẩn bị cho ông nghe', [['prepared', 'written', 'script', 'card', 'read'], ['introduction', 'intro', 'it', 'you', 'line']], 'I have prepared a short introduction. May I read it to you now?', 'Go on, read it. Yes, that is fine.'),
        vague(UNSURE, 'Do you actually know my title?')
      ),
      n(
        'Good. One request: I do not want any questions from the audience afterwards. Can you make sure of that?',
        'Tốt. Một yêu cầu: sau đó tôi không muốn khán giả hỏi gì cả. Anh đảm bảo được chứ?',
        'Cam kết: không có phần hỏi đáp, bạn sẽ cảm ơn ông và chuyển phần ngay.',
        'Sorry, will there be questions or not?',
        r('Không có hỏi đáp, tôi sẽ chuyển phần ngay', [['no questions', 'no q and a', 'without questions', 'not take questions', 'no question'], ['move', 'thank', 'straight', 'next', 'directly', 'after', 'promise', 'guarantee']], 'Of course. There will be no questions. I will thank you and move straight to dinner.', 'Straight to dinner. Excellent.'),
        r('Tôi sẽ mời một tràng pháo tay rồi tiễn ông', [['applause', 'hand', 'clap'], ['walk', 'escort', 'exit', 'leave', 'off stage', 'then', 'and']], 'I will ask for a round of applause, and then walk you off stage myself.', 'A round of applause and off I go. I like it.'),
        vague(UNSURE, 'I need more than that. What exactly will you do?')
      ),
      n(
        'Perfect. And after my speech, how do I get out without walking through three hundred people?',
        'Tuyệt. Và sau bài phát biểu, tôi ra ngoài bằng cách nào mà không phải đi xuyên qua ba trăm người?',
        'Chỉ lối ra riêng hoặc nói sẽ có người đưa ông ra xe.',
        'Sorry, which way do I leave?',
        r('Có lối ra bên cánh gà', [['side door', 'backstage', 'back door', 'side exit', 'behind the stage', 'private exit', 'stage door']], 'There is a side door behind the stage. It takes you straight to the car park.', 'A side door. Now you are talking.'),
        r('Nhân viên sẽ đưa ông ra xe', [['staff', 'colleague', 'someone', 'team', 'assistant', 'security'], ['take', 'walk', 'escort', 'bring', 'guide', 'car', 'driver']], 'One of our team will escort you to your car as soon as you finish.', 'An escort to the car. Very good.'),
        vague(UNSURE, 'Which door? I am not walking through the crowd.')
      ),
    ],
    end: 'You run a tight ship. I will tell the organizers to book you again.',
    endVi: 'Anh điều hành rất chặt chẽ. Tôi sẽ bảo ban tổ chức mời anh lần nữa.',
  },
  {
    id: 'uncle-mic',
    npcId: 'henry',
    name: 'Henry',
    kind: 'Tiệc cưới',
    fn: 'trouble',
    roleVi: 'Ông chú vui tính của chú rể muốn mượn micro giữa tiệc',
    goalVi: 'Từ chối khéo mà không làm mất vui, và đưa ra một lựa chọn khác.',
    cefr: 'B2',
    nodes: [
      n(
        'Hey, MC! I am Henry, the groom’s uncle. Give me the microphone, I want to sing a song for the couple right now!',
        'Này MC! Tôi là Henry, chú của chú rể. Đưa micro đây, tôi muốn hát tặng cô dâu chú rể ngay bây giờ!',
        'Từ chối nhẹ nhàng: bây giờ chưa tới lúc, vì sắp cắt bánh hoặc có phát biểu.',
        'Sorry, can I have the microphone or not?',
        r('Chưa phải lúc, sắp cắt bánh', [['cake', 'speech', 'speeches', 'toast', 'program', 'schedule', 'first dance'], ['now', 'about to', 'next', 'coming', 'first', 'right', 'wait']], 'That is a lovely idea, Henry, but the cake cutting is next, so now is not the right moment.', 'The cake! All right, cake first, music later.'),
        r('Xin để lúc tiệc nhảy', [['later', 'after dinner', 'party', 'dance floor', 'karaoke', 'band'], ['sing', 'song', 'then', 'time', 'when', 'you']], 'How about later, when the band plays? I will call you up to sing then.', 'With the band? Even better!'),
        vague([...UNSURE, ...SORRY], 'Come on, just one song! Is that a yes?')
      ),
      n(
        'But I prepared this song for weeks! It is only twelve minutes long.',
        'Nhưng tôi tập bài này mấy tuần rồi! Nó chỉ dài mười hai phút thôi.',
        'Đề nghị rút ngắn: một đoạn, hoặc hai phút.',
        'Sorry, how long can my song be?',
        r('Xin hát một đoạn ngắn thôi', [['verse', 'chorus', 'part', 'short version', 'shorter', 'one song', 'piece']], 'Twelve minutes is a little long. Could you sing just one verse and the chorus?', 'One verse and the chorus. I can live with that.'),
        r('Giới hạn khoảng hai phút', [['two minutes', 'three minutes', 'couple of minutes', '2 minutes', '3 minutes']], 'Could we keep it to about two minutes? Then everyone will want more.', 'Two minutes! You drive a hard bargain.'),
        vague(UNSURE, 'So all twelve minutes? Wonderful!')
      ),
      n(
        'Okay, okay. But I also have some very funny stories about the groom when he was a teenager.',
        'Được, được. Nhưng tôi còn mấy chuyện rất buồn cười về chú rể hồi nó còn là thiếu niên.',
        'Nhắc khéo: chỉ kể chuyện vui vẻ, không làm chú rể hay gia đình ngượng.',
        'Sorry, can I tell my stories?',
        r('Chỉ kể chuyện không làm ai ngượng', [['embarrass', 'embarrassing', 'awkward', 'uncomfortable', 'blush', 'kind', 'nice', 'sweet'], ['groom', 'liam', 'him', 'bride', 'family', 'grandparents', 'story', 'stories', 'one']], 'One story is fine, as long as it does not embarrass the groom in front of his new family.', 'Nothing embarrassing. That rules out most of them.'),
        r('Xin hỏi ý chú rể trước', [['ask', 'check', 'approve', 'okay with', 'agree'], ['groom', 'liam', 'him', 'couple', 'bride']], 'Let me check with the groom first. If he agrees, you can tell one.', 'Ask him? He will say no! But fine.'),
        vague(UNSURE, 'Great, I have about nine of them.')
      ),
      n(
        'Fair. So when exactly will you call me? I do not want to miss it at the bar.',
        'Hợp lý. Vậy chính xác khi nào anh gọi tôi? Tôi không muốn lỡ mất vì đang ở quầy bar.',
        'Hẹn một thời điểm cụ thể và nói bạn sẽ ra hiệu trước.',
        'Sorry, when will you call my name?',
        r('Sau điệu nhảy đầu tiên, tôi sẽ ra hiệu', [['after', 'right after', 'following'], ['dance', 'dinner', 'cake', 'dessert', 'speeches']], 'Right after the first dance. I will give you a sign five minutes before.', 'After the first dance. I will be ready.'),
        r('Vào một giờ cụ thể', [["o'clock", 'nine', 'half past', 'ten', 'thirty']], 'At around nine o’clock. Please stay close to the stage from then.', 'Nine o’clock. I will set my watch.'),
        vague([...UNSURE, 'later', 'soon'], 'Later when? I need a time, young man.')
      ),
      n(
        'Deal. Last thing: will you introduce me properly? I want a big entrance.',
        'Chốt. Điều cuối: anh sẽ giới thiệu tôi cho đàng hoàng chứ? Tôi muốn bước ra thật hoành tráng.',
        'Hứa một lời giới thiệu vui và hỏi ông muốn được gọi là gì.',
        'Sorry, how will you introduce me?',
        r('Sẽ giới thiệu thật hoành tráng', [['introduce', 'introduction', 'announce', 'welcome'], ['big', 'special', 'grand', 'star', 'applause', 'legend', 'famous', 'one and only', 'best']], 'Of course. I will introduce you as the one and only Uncle Henry, with a big round of applause.', 'The one and only! I like you.'),
        r('Hỏi ông muốn được gọi thế nào', [['how would you like', 'what should i', 'what would you like', 'how should i', 'what name'], ['introduce', 'introduced', 'call', 'say', 'announce']], 'With pleasure. How would you like to be introduced?', 'Call me Henry the Voice. Everybody does.'),
        vague(UNSURE, 'I want fireworks, not “okay”. What will you say?')
      ),
    ],
    end: 'You are a good sport. See you on stage, MC!',
    endVi: 'Anh dễ chịu thật. Hẹn gặp trên sân khấu nhé, MC!',
  },
  {
    id: 'fan-on-stage',
    npcId: 'luna',
    name: 'Luna',
    kind: 'Giao lưu thần tượng',
    fn: 'qa',
    roleVi: 'Một fan được chọn lên sân khấu, vừa mừng vừa run',
    goalVi: 'Trấn an fan, giữ đúng luật giao lưu và giữ nhịp chương trình.',
    cefr: 'B1',
    nodes: [
      n(
        'Oh my god, I cannot believe I am on stage! I am shaking. What do I do?',
        'Trời ơi, không tin nổi là mình đang trên sân khấu! Mình run quá. Mình phải làm gì?',
        'Trấn an bạn fan và nói việc đầu tiên: hít thở, rồi giới thiệu tên.',
        'Sorry, what should I do first?',
        r('Hít thở và giới thiệu tên', [['breath', 'breathe', 'relax', 'calm', 'easy'], ['name', 'introduce', 'tell us', 'where', 'say hello', 'hello']], 'Take a deep breath, you are doing great. Just tell us your name and where you are from.', 'Okay. Deep breath. I am Luna, from Da Nang!'),
        r('Mời đứng cạnh MC và vẫy tay chào', [['stand', 'next to me', 'beside me', 'here', 'wave'], ['wave', 'smile', 'crowd', 'audience', 'everyone', 'me', 'camera']], 'Come and stand next to me, and wave to everyone. They are all cheering for you.', 'They are cheering for me? Oh wow.'),
        vague([...UNSURE, 'do not worry', "don't worry"], 'I am still shaking! What do I say?')
      ),
      n(
        'Can I hug him? Please, please, please! I have waited four years for this.',
        'Mình ôm anh ấy được không? Làm ơn đi mà! Mình chờ bốn năm rồi.',
        'Nói luật một cách dễ thương: không ôm, nhưng được bắt tay hoặc đập tay.',
        'Sorry, so can I hug him or not?',
        r('Không ôm, nhưng được đập tay hoặc bắt tay', [['high five', 'handshake', 'shake hands', 'shake his hand', 'fist bump', 'wave']], 'I am sorry, hugs are not allowed today, but you can give him a high five.', 'A high five! I will never wash this hand again.'),
        r('Không ôm, nhưng được chụp ảnh chung', [['photo', 'picture', 'selfie']], 'No hugs, I am afraid, but you can take a photo together.', 'A photo together! Yes, yes, yes!'),
        vague([...UNSURE, ...SORRY, 'rules', 'not allowed'], 'Not even a tiny one? What can I do, then?')
      ),
      n(
        'Okay! I get to ask him one question. But I have so many. Which kind of question is okay?',
        'Được ạ! Mình được hỏi anh ấy một câu. Nhưng mình có nhiều quá. Hỏi loại câu nào thì được?',
        'Hướng dẫn: hỏi về âm nhạc, công việc; tránh chuyện đời tư.',
        'Sorry, what am I allowed to ask about?',
        r('Hỏi về âm nhạc và công việc', [['music', 'song', 'songs', 'album', 'work', 'tour', 'concert', 'acting', 'movie', 'film']], 'Anything about his music or his new album is perfect.', 'His new album! I know exactly what to ask.'),
        r('Tránh hỏi chuyện đời tư', [['private', 'personal', 'dating', 'girlfriend', 'family', 'love life']], 'Please avoid questions about his private life. Everything else is fine.', 'No private questions. Of course, I respect that.'),
        vague([...UNSURE, 'anything', 'any'], 'Anything? Even about his girlfriend?')
      ),
      n(
        'I asked it! He answered me! Can I ask one more? Just one more, please?',
        'Mình hỏi rồi! Anh ấy trả lời mình! Mình hỏi thêm một câu nữa được không? Một câu nữa thôi mà?',
        'Từ chối dịu dàng: các fan khác cũng đang chờ tới lượt.',
        'Sorry, can I ask another question?',
        r('Các fan khác cũng đang chờ', [['other fans', 'others', 'everyone', 'next fan', 'more fans', 'waiting', 'turn', 'fair']], 'I wish you could, but other fans are waiting for their turn too.', 'You are right. That would not be fair to them.'),
        r('Hết thời gian cho lượt này', [['time', 'minute', 'minutes', 'schedule'], ['out of', 'no more', 'run', 'up', 'left', 'short', 'limited']], 'I am afraid we are out of time for this round, but you were wonderful.', 'Out of time already? It felt like ten seconds.'),
        vague([...UNSURE, ...SORRY], 'Please? I will be quick, I promise!')
      ),
      n(
        'Thank you so much. Um, where do I go now? I do not want to leave!',
        'Cảm ơn nhiều lắm. Ừm, giờ mình đi đâu ạ? Mình không muốn xuống đâu!',
        'Chỉ đường xuống sân khấu và mời khán giả vỗ tay cho bạn.',
        'Sorry, which way do I go?',
        r('Xuống cầu thang bên trái, có nhân viên đón', [['stairs', 'steps', 'left', 'right', 'this way', 'staff', 'side'], ['go', 'walk', 'follow', 'take', 'down', 'help', 'guide', 'will']], 'Please take the stairs on your left, and our staff will guide you back to your seat.', 'Stairs on the left. Okay, I am going. Bye!'),
        r('Mời khán giả vỗ tay cho bạn', [['applause', 'hand', 'clap', 'cheer']], 'Everyone, a big round of applause for Luna! Thank you for joining us on stage.', 'They are clapping for me! Best day ever!'),
        vague(UNSURE, 'Do I just walk off? Which side?')
      ),
    ],
    end: 'Thank you for being so kind to me. I will remember this forever!',
    endVi: 'Cảm ơn vì đã dịu dàng với mình. Mình sẽ nhớ mãi ngày hôm nay!',
  },
  {
    id: 'sound-check',
    npcId: 'kevin',
    name: 'Kevin',
    kind: 'Sự kiện thương hiệu',
    fn: 'backstage',
    roleVi: 'Kỹ thuật viên âm thanh thử micro với MC trước giờ mở cửa',
    goalVi: 'Chốt loại micro, âm lượng, nhạc nền và cách ra hiệu khi có lỗi.',
    cefr: 'B1',
    nodes: [
      n(
        'Morning. I am Kevin, on sound. Which microphone do you want tonight: handheld, or a headset?',
        'Chào. Tôi là Kevin, phụ trách âm thanh. Tối nay anh muốn dùng micro nào: cầm tay hay đeo đầu?',
        'Chọn một loại micro và nói lý do ngắn.',
        'Sorry, handheld or headset?',
        r('Micro cầm tay', [['handheld', 'hand held', 'in my hand', 'hold']], 'A handheld, please. I need to pass it to guests during the games.', 'Handheld it is. I will give you a spare too.'),
        r('Micro đeo đầu', [['headset', 'head set', 'lapel', 'clip']], 'A headset, please, so my hands are free for the cue cards.', 'Headset. Let me fit it properly, then.'),
        vague([...UNSURE, 'any', 'either', 'whatever', 'up to you'], 'I need to set it up now, mate. Which one?')
      ),
      n(
        'Right, say something so I can set the level. How does it sound to you in the monitor?',
        'Rồi, anh nói gì đó để tôi chỉnh mức. Anh nghe trong loa kiểm tra thấy thế nào?',
        'Thử micro và nhận xét: to quá, nhỏ quá, có tiếng vang, hay ổn rồi.',
        'Sorry, is it too loud, too quiet, or fine?',
        r('Cần to hơn', [['louder', 'too quiet', 'too low', 'turn it up', 'more volume', 'cannot hear', "can't hear", 'bit more']], 'Testing, one, two. It is a bit too quiet. Could you turn it up, please?', 'Up a little. How is that?'),
        r('Bị vang hoặc to quá', [['echo', 'too loud', 'feedback', 'turn it down', 'less', 'lower', 'reverb']], 'Testing, one, two. There is a little echo. Could you turn it down a bit?', 'Too much echo. Taking some out now.'),
        r('Nghe ổn rồi', [['sounds good', 'sounds great', 'sounds fine', 'perfect', 'clear', 'just right']], 'Testing, one, two. That sounds perfect, very clear.', 'Clear as a bell. Good.'),
        vague(UNSURE, 'Fine as in good, or fine as in you cannot tell?')
      ),
      n(
        'Next: walk-in music when you come on stage. Do you want it loud and fast, or something soft?',
        'Tiếp: nhạc lúc anh bước ra sân khấu. Anh muốn to và nhanh, hay nhẹ nhàng?',
        'Chọn kiểu nhạc và dặn khi nào thì hạ nhạc xuống.',
        'Sorry, fast music or soft music?',
        r('Nhạc sôi động, hạ xuống khi tôi bắt đầu nói', [['fast', 'upbeat', 'energetic', 'loud', 'big', 'exciting'], ['fade', 'down', 'lower', 'when i', 'start speaking', 'stop', 'then', 'music']], 'Something upbeat, please, and fade it down when I start speaking.', 'Upbeat, fade on your first word. Easy.'),
        r('Nhạc nhẹ nhàng', [['soft', 'gentle', 'quiet', 'slow', 'calm', 'elegant', 'piano']], 'Something soft and elegant, please. It is a luxury brand.', 'Soft and elegant. I have just the track.'),
        vague([...UNSURE, 'any', 'either', 'up to you'], 'I have two hundred tracks. Give me a direction.')
      ),
      n(
        'Good. Now, if your microphone dies in the middle of the show, how will you tell me?',
        'Tốt. Giờ nếu micro của anh chết giữa chương trình, anh báo tôi bằng cách nào?',
        'Thống nhất một tín hiệu: giơ micro lên, chỉ vào micro, hoặc lấy micro dự phòng.',
        'Sorry, what is your signal if the mic stops working?',
        r('Giơ micro lên hoặc chỉ vào nó', [['raise', 'lift', 'hold up', 'point', 'tap', 'wave', 'signal', 'sign'], ['microphone', 'mic', 'hand', 'it', 'you']], 'I will raise the microphone above my head, so you can see it from the desk.', 'Mic in the air. I will see that.'),
        r('Dùng ngay micro dự phòng trên bục', [['spare', 'backup', 'second', 'other'], ['microphone', 'mic', 'one', 'podium', 'take', 'switch', 'use']], 'I will switch to the spare microphone on the podium and keep talking.', 'Spare on the podium. I will keep it live for you.'),
        vague(UNSURE, 'I cannot read minds, mate. What is the signal?')
      ),
      n(
        'Last one. The client video is three minutes long. Do you speak before it, after it, or both?',
        'Câu cuối. Video của khách hàng dài ba phút. Anh nói trước video, sau video, hay cả hai?',
        'Nói rõ thứ tự và câu ra hiệu để Kevin bấm phát video.',
        'Sorry, what is my cue to play the video?',
        r('Tôi giới thiệu, câu ra hiệu là "let’s watch"', [['cue', 'when i say', 'after i say', 'my line', 'my words', 'the words'], ['watch', 'video', 'screen', 'roll', 'play', 'take a look']], 'I will introduce it first. Your cue is when I say, let us watch.', 'Cue is “let us watch”. Got it.'),
        r('Tôi nói cả trước và sau video', [['before and after', 'both', 'before it and after', 'then again']], 'Both. I will introduce it, and then I will come back after it ends.', 'Before and after. I will bring your mic back up at the end.'),
        vague(UNSURE, 'I still need a cue line. What will you say?')
      ),
    ],
    end: 'Nice and clear. You are easy to work with. Break a leg tonight.',
    endVi: 'Rõ ràng gọn gàng. Làm việc với anh dễ chịu thật. Chúc tối nay diễn tốt.',
  },
  {
    id: 'photographer',
    npcId: 'ryan',
    name: 'Ryan',
    kind: 'Tiệc cưới',
    fn: 'backstage',
    roleVi: 'Nhiếp ảnh gia cưới bàn với MC về các khoảnh khắc phải chụp',
    goalVi: 'Phối hợp để nhiếp ảnh gia không lỡ khoảnh khắc nào.',
    cefr: 'B1',
    nodes: [
      n(
        'Hi, I am Ryan, the photographer. I need to know the big moments tonight. What is the first one?',
        'Chào, tôi là Ryan, nhiếp ảnh gia. Tôi cần biết các khoảnh khắc lớn tối nay. Cái đầu tiên là gì?',
        'Nói khoảnh khắc đầu tiên và giờ dự kiến.',
        'Sorry, what happens first, and when?',
        r('Cô dâu chú rể tiến vào', [['entrance', 'walk in', 'enter', 'arrive', 'come in'], ['couple', 'bride', 'groom', 'they', 'six', 'seven', 'at', 'grand']], 'The first big moment is the couple’s grand entrance, at half past six.', 'Grand entrance, half past six. I will be at the door.'),
        r('Lễ rót rượu hoặc cắt bánh', [['champagne', 'cake', 'toast', 'tower']], 'First is the champagne tower, right after the welcome speech.', 'Champagne tower. I love that shot.'),
        vague([...UNSURE, 'many', 'a lot'], 'I need the order, please. What comes first?')
      ),
      n(
        'Great. During the entrance, where should I stand so I am not in your way?',
        'Tuyệt. Lúc cô dâu chú rể vào, tôi nên đứng đâu để không vướng anh?',
        'Chỉ một vị trí: cuối lối đi, cạnh sân khấu, hoặc phía trước bên trái.',
        'Sorry, where exactly should I stand?',
        r('Cuối lối đi, đối diện cửa', [['aisle', 'end of', 'facing', 'opposite', 'in front of the door']], 'Please stand at the end of the aisle, facing the door. I will be on the stage.', 'End of the aisle, facing the door. Good angle.'),
        r('Cạnh sân khấu', [['next to the stage', 'side of the stage', 'beside the stage', 'by the stage', 'near the stage', 'stage left', 'stage right']], 'Next to the stage on the left is best. I will stay on the right.', 'Stage left for me. Understood.'),
        vague([...UNSURE, 'anywhere', 'up to you'], 'I will block somebody if I guess. Where do you want me?')
      ),
      n(
        'Now, the family photos. They always take forever. How shall we organize them?',
        'Giờ tới ảnh gia đình. Lúc nào cũng kéo dài vô tận. Mình tổ chức thế nào đây?',
        'Đề xuất: bạn gọi từng nhóm theo danh sách, hoặc theo số bàn.',
        'Sorry, how do we call the families up?',
        r('Tôi gọi từng nhóm theo danh sách', [['list', 'names', 'name', 'one group', 'group by group', 'call'], ['group', 'groups', 'family', 'families', 'each', 'by']], 'I will call each family group by name from the list, one at a time.', 'From the list, one group at a time. That will save twenty minutes.'),
        r('Gọi theo số bàn', [['table'], ['number', 'numbers', 'by', 'each', 'one']], 'Let us do it table by table. I will announce the table numbers.', 'Table by table. Simple, I like it.'),
        vague(UNSURE, 'We need a system, or we will be there till midnight.')
      ),
      n(
        'Good plan. For the first dance, can you help me with the lights? It is too dark for photos right now.',
        'Kế hoạch hay. Điệu nhảy đầu tiên, anh giúp tôi vụ đèn được không? Giờ tối quá, không chụp được.',
        'Nói bạn sẽ nhờ kỹ thuật tăng đèn, hoặc xin đèn rọi cho cô dâu chú rể.',
        'Sorry, what can we do about the lights?',
        r('Nhờ kỹ thuật bật đèn rọi', [['spotlight', 'spot light', 'follow spot']], 'I will ask the technician for a spotlight on the couple.', 'A spotlight. That is all I need.'),
        r('Nhờ tăng đèn sân nhảy lên', [['technician', 'lighting', 'lights', 'light'], ['brighter', 'turn up', 'raise', 'more', 'up', 'ask', 'tell']], 'I will tell the lighting team to turn the lights up a little for the first minute.', 'A little brighter for a minute. Perfect.'),
        vague(UNSURE, 'So who talks to the lighting guy, you or me?')
      ),
      n(
        'Last thing. If I miss a shot, like the ring or the kiss, can we do it again?',
        'Điều cuối. Nếu tôi lỡ một khoảnh khắc, như trao nhẫn hay nụ hôn, mình làm lại được không?',
        'Đồng ý có điều kiện: bạn sẽ mời cô dâu chú rể làm lại một cách vui vẻ, hoặc chỉ làm lại sau lễ.',
        'Sorry, can we repeat a moment for the camera?',
        r('Tôi sẽ mời họ làm lại một cách vui vẻ', [['again', 'repeat', 'one more', 'once more'], ['ask', 'invite', 'couple', 'them', 'kiss', 'audience', 'guests', 'fun', 'joke']], 'Sure. Give me a sign, and I will ask the couple to kiss again for the cameras.', 'A second kiss. Nobody ever complains about that.'),
        r('Chỉ làm lại sau buổi lễ', [['after the ceremony', 'afterwards', 'later', 'at the end', 'private']], 'Not during the ceremony, but we can repeat it afterwards, just for you.', 'Afterwards works. I will make a note.'),
        vague(UNSURE, 'How will you know I missed it?')
      ),
    ],
    end: 'Brilliant. With you calling the moments, my job is easy.',
    endVi: 'Tuyệt vời. Có anh hô từng khoảnh khắc thì việc của tôi nhẹ hẳn.',
  },
];
