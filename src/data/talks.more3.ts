/**
 * Trò chuyện, đợt 2 (phần 3/3): khách hàng, nhà tài trợ, đồng nghiệp và giao tiếp xã giao.
 * Cùng quy ước với talks.ts (tests/talk.test.mjs kiểm).
 */
import type { Talk } from '../core/talk';
import { n, r, vague, UNSURE, SORRY } from './talks.more1';

const EITHER = [...UNSURE, 'any', 'either', 'whatever', 'up to you', 'you decide'];

export const TALKS_MORE_3: Talk[] = [
  {
    id: 'client-debrief',
    npcId: 'claire',
    name: 'Claire',
    kind: 'Làm việc với khách hàng',
    fn: 'client',
    roleVi: 'Khách hàng gọi lại sau hội nghị để nhận xét',
    goalVi: 'Nhận góp ý một cách chuyên nghiệp: cảm ơn, nhận lỗi, đề xuất cải thiện.',
    cefr: 'B2',
    nodes: [
      n(
        'Hello, it is Claire. I wanted to give you some feedback on yesterday’s conference. Is this a good time?',
        'Xin chào, Claire đây. Tôi muốn góp ý với anh về hội nghị hôm qua. Giờ có tiện không?',
        'Nhận lời và tỏ ra sẵn sàng lắng nghe.',
        'Sorry, do you have a few minutes for feedback?',
        r('Sẵn sàng nghe góp ý', [['feedback', 'hear', 'listen', 'thoughts', 'comments', 'love to', 'happy to', 'glad', 'appreciate'], ['please', 'go ahead', 'time', 'your', 'it', 'you', 'now']], 'Of course, Claire. I would love to hear your feedback, so please go ahead.', 'Thank you. Not everyone asks for it.'),
        r('Xin gọi lại sau mười phút', [['call you back', 'call back', 'ten minutes', 'five minutes', 'half an hour', 'this afternoon']], 'I am just leaving a rehearsal. May I call you back in ten minutes?', 'Ten minutes is fine. Talk soon. Right, here we go.'),
        vague(UNSURE, 'Good. Shall I start with the good news or the bad?')
      ),
      n(
        'First, the good part. The opening was excellent. The CEO said she had never seen the room so quiet.',
        'Trước hết là phần tốt. Màn mở đầu rất xuất sắc. CEO nói bà chưa bao giờ thấy khán phòng im lặng đến vậy.',
        'Đón nhận lời khen khiêm tốn và ghi công cho ê-kíp.',
        'Sorry, did you hear what the CEO said?',
        r('Cảm ơn và ghi công cho ê-kíp', [['thank', 'thanks', 'kind', 'glad', 'pleased', 'happy'], ['team', 'crew', 'your', 'everyone', 'technicians', 'together', 'rehearsal', 'hear', 'that']], 'Thank you, that is very kind. Your team’s rehearsal made that opening possible.', 'Modest, too. I will pass that on to the team.'),
        vague([...UNSURE, 'i know', 'of course'], 'You can say thank you, you know.')
      ),
      n(
        'Now the difficult part. You pronounced our chairman’s name wrong. Twice. He noticed.',
        'Giờ tới phần khó nói. Anh đọc sai tên chủ tịch của chúng tôi. Hai lần. Ông ấy có để ý.',
        'Nhận lỗi rõ ràng, không bao biện, và xin lỗi.',
        'Sorry, what do you say about the chairman’s name?',
        r('Nhận lỗi và xin lỗi, không bao biện', [['sorry', 'apologize', 'apologise', 'apologies', 'apology'], ['mistake', 'my fault', 'responsibility', 'should have', 'no excuse', 'wrong', 'error', 'name']], 'I am very sorry. That was my mistake, and there is no excuse for it.', 'Thank you for not making excuses.'),
        r('Đề nghị gửi lời xin lỗi tới ông ấy', [['write', 'send', 'call', 'email', 'personally', 'note', 'message'], ['him', 'chairman', 'apology', 'apologize', 'apologise']], 'I would like to send the chairman a personal note of apology, if you think that is appropriate.', 'A personal note. Yes, he would appreciate that.'),
        vague([...UNSURE, 'difficult name', 'hard to say', 'nobody told me'], 'That sounds a little like an excuse.')
      ),
      n(
        'I appreciate that. How will you make sure it does not happen again?',
        'Tôi ghi nhận điều đó. Anh sẽ làm gì để chuyện này không lặp lại?',
        'Nêu một cách làm cụ thể: ghi âm cách đọc, kiểm tra tên với từng người trước giờ diễn.',
        'Sorry, what will you change next time?',
        r('Ghi âm hoặc viết phiên âm vào kịch bản', [['record', 'recording', 'phonetic', 'phonetically', 'spell'], ['script', 'cards', 'card', 'phone', 'pronunciation', 'name', 'names', 'it']], 'I will ask for a voice recording of each name and write it phonetically on my cards.', 'A recording and phonetic notes. Very thorough.'),
        r('Kiểm tra cách đọc tên với từng người', [['check', 'confirm', 'ask', 'verify', 'practise', 'practice', 'rehearse'], ['name', 'names', 'pronunciation', 'each', 'every', 'speaker', 'person', 'before']], 'From now on, I will confirm every name with the person, or their assistant, before the show.', 'Confirm every name in person. Simple and effective.'),
        vague([...UNSURE, 'be careful', 'careful', 'try harder', 'do better'], 'Careful how? I need something concrete for my report.')
      ),
      n(
        'Good. Overall, we were happy. We have another event in June. Would you be interested?',
        'Tốt. Nhìn chung, chúng tôi hài lòng. Tháng Sáu chúng tôi có một sự kiện nữa. Anh có quan tâm không?',
        'Nhận lời nhiệt tình và hỏi ngày hoặc đề nghị giữ lịch.',
        'Sorry, are you available in June?',
        r('Rất sẵn lòng, xin hỏi ngày cụ thể', [['love to', 'delighted', 'honored', 'honoured', 'happy to', 'pleasure', 'definitely', 'absolutely', 'interested'], ['date', 'when', 'which day', 'june', 'details', 'calendar', 'schedule']], 'I would be delighted. Which date in June are you looking at?', 'The eighteenth. I will send you the details.'),
        r('Xin giữ lịch ngay', [['hold', 'block', 'reserve', 'keep', 'pencil', 'save'], ['date', 'day', 'calendar', 'june', 'it']], 'Yes, please. Tell me the date and I will hold it for you today.', 'Hold the eighteenth of June, then.'),
        vague(UNSURE, 'You do not sound very excited.')
      ),
    ],
    end: 'Wonderful. It is a pleasure working with someone who listens. Speak soon.',
    endVi: 'Tuyệt vời. Làm việc với người biết lắng nghe thật dễ chịu. Liên lạc sau nhé.',
  },
  {
    id: 'agency-call',
    npcId: 'tina',
    name: 'Tina',
    kind: 'Sự kiện thương hiệu',
    fn: 'client',
    roleVi: 'Điều phối viên công ty sự kiện gọi để chốt lịch và yêu cầu',
    goalVi: 'Trả lời nhanh, rõ về lịch trống, trang phục, tổng duyệt và hồ sơ.',
    cefr: 'B1',
    nodes: [
      n(
        'Hi, this is Tina from Spark Events. Are you free on Saturday the twentieth, in the evening?',
        'Chào, tôi là Tina từ Spark Events. Tối thứ Bảy ngày hai mươi anh có rảnh không?',
        'Trả lời rõ là rảnh hay bận, và hỏi giờ cụ thể.',
        'Sorry, are you available on the twentieth?',
        r('Rảnh, xin hỏi giờ và địa điểm', [['free', 'available', 'open', 'can do'], ['what time', 'where', 'which venue', 'how long', 'time', 'venue', 'start']], 'Yes, I am available that evening. What time does it start, and where?', 'Six to nine, at the Riverside Hotel.'),
        r('Bận buổi chiều, rảnh từ sáu giờ', [['until', 'from', 'after'], ['five', 'six', 'seven', "o'clock", 'afternoon', 'wedding', 'another event']], 'I have a wedding until five, but I am free from six o’clock.', 'From six works. We start at half past six.'),
        vague(UNSURE, 'Is that a yes for the twentieth? I need to confirm today.')
      ),
      n(
        'Great. It is a cosmetics brand event. Do you have experience with beauty brands?',
        'Tuyệt. Đây là sự kiện của một thương hiệu mỹ phẩm. Anh có kinh nghiệm với các thương hiệu làm đẹp không?',
        'Nêu kinh nghiệm liên quan, hoặc nói thật là chưa nhưng sẽ chuẩn bị kỹ.',
        'Sorry, have you hosted beauty events before?',
        r('Đã dẫn sự kiện thương hiệu tương tự', [['hosted', 'worked', 'done', 'experience'], ['brand', 'brands', 'beauty', 'cosmetics', 'fashion', 'launch', 'launches', 'skincare', 'similar']], 'Yes, I have hosted several beauty and fashion launches in the last two years.', 'Several launches. That is what the client wants to hear.'),
        r('Chưa, nhưng sẽ nghiên cứu kỹ thương hiệu', [['not yet', 'first time', 'new to', 'have not', "haven't"], ['study', 'research', 'learn', 'prepare', 'read', 'brand', 'but']], 'Not yet, to be honest, but I will study the brand carefully before the event.', 'Honest. I appreciate that, and I will send you the brand book.'),
        vague(UNSURE, 'The client will ask me. What exactly have you done?')
      ),
      n(
        'Good. The dress code is “all white”. Is that a problem for you?',
        'Tốt. Quy định trang phục là “toàn màu trắng”. Có vấn đề gì với anh không?',
        'Xác nhận bạn có trang phục phù hợp, hoặc hỏi thêm chi tiết.',
        'Sorry, can you wear all white?',
        r('Có sẵn vest trắng', [['white'], ['suit', 'outfit', 'jacket', 'have', 'wear', 'own', 'dress', 'shirt']], 'Not at all. I have a white suit that will fit the theme perfectly.', 'A white suit. Lovely, send me a photo later.'),
        r('Hỏi thêm: trang trọng hay thoải mái', [['formal', 'casual', 'smart casual', 'black tie', 'how formal'], ['or', 'is it', 'should', 'dress', 'look']], 'That is fine. Should it be formal, or smart casual?', 'Smart casual, but elegant.'),
        vague(UNSURE, 'So you do have something white?')
      ),
      n(
        'Perfect. The rehearsal is at two o’clock the same day. Can you make that?',
        'Hoàn hảo. Tổng duyệt lúc hai giờ cùng ngày. Anh tới được không?',
        'Xác nhận, hoặc nói bạn bận và đề nghị giờ khác.',
        'Sorry, can you come to the rehearsal at two?',
        r('Bận lúc đó, đề nghị giờ khác', [['four', 'five', 'half past', 'later', 'earlier', 'morning', 'another time', 'different time', 'instead'], ['could', 'can', 'would', 'possible', 'how about', 'rehearse', 'come', 'be there', 'make']], 'I am at a wedding until five. Could we rehearse at half past five instead?', 'Half past five is tight, but we can do a quick run.'),
        r('Tới được lúc hai giờ', [['two', 'rehearsal', 'be there', 'make it', 'come'], ['will', 'can', 'works', 'fine', 'problem', 'early', 'there']], 'Two o’clock works for me. I will be there fifteen minutes early.', 'Fifteen minutes early. A professional.'),
        vague(UNSURE, 'I am writing the call sheet now. Two o’clock, yes or no?')
      ),
      n(
        'Last thing. Can you send me your profile and a short video today?',
        'Điều cuối. Hôm nay anh gửi tôi hồ sơ và một video ngắn được không?',
        'Nhận lời và nói khi nào gửi, gửi qua đâu.',
        'Sorry, when can you send your profile?',
        r('Gửi qua email trong hôm nay', [['send', 'email', 'share', 'forward'], ['today', 'tonight', 'hour', 'afternoon', 'right away', 'now', 'minutes', 'by']], 'Of course. I will email my profile and a two-minute video within the hour.', 'Within the hour. Great, the client is waiting.'),
        r('Hỏi địa chỉ email để gửi', [['which email', 'what email', 'email address', 'your address', 'where should i send', 'where shall i send']], 'Certainly. Which email address should I send them to?', 'tina at spark events dot com. Thank you!'),
        vague(UNSURE, 'Today, please. When exactly?')
      ),
    ],
    end: 'Fantastic. I will confirm with the client and call you back tonight.',
    endVi: 'Tuyệt. Tôi sẽ xác nhận với khách hàng rồi gọi lại anh tối nay.',
  },
  {
    id: 'sponsor-rep',
    npcId: 'david',
    name: 'David',
    kind: 'Gala',
    fn: 'client',
    roleVi: 'Đại diện nhà tài trợ đòi được nhắc tên nhiều hơn trong chương trình',
    goalVi: 'Bảo vệ nhịp chương trình mà vẫn làm nhà tài trợ hài lòng.',
    cefr: 'C1',
    nodes: [
      n(
        'Evening. David, from Greenleaf. We paid for the main sponsorship, so I expect our name in every single link tonight.',
        'Chào buổi tối. Tôi là David, bên Greenleaf. Chúng tôi là nhà tài trợ chính, nên tôi muốn tên công ty có trong mọi lời dẫn tối nay.',
        'Ghi nhận mong muốn, rồi giải thích nhắc quá nhiều sẽ phản tác dụng; đề xuất các thời điểm đắt giá.',
        'Sorry, how many times will you mention us?',
        r('Đề xuất ba lần ở các thời điểm đắt giá', [['three', 'four', 'key', 'best', 'strongest', 'important'], ['moments', 'times', 'mentions', 'points', 'opening', 'closing', 'award']], 'I understand. I suggest three strong mentions: in the opening, before the main award, and in the closing.', 'Three strong ones. Tell me more about the award one.'),
        r('Giải thích nhắc quá nhiều sẽ phản tác dụng', [['too many', 'too often', 'every link', 'every time', 'repeat', 'repeating', 'overdo'], ['audience', 'guests', 'people', 'stop', 'ignore', 'tired', 'less', 'lose', 'effect']], 'With respect, if I repeat the name in every link, the audience will stop hearing it.', 'Hmm. I had not thought of it that way.'),
        vague(UNSURE, 'Every link, then. Good.')
      ),
      n(
        'All right. But I want our slogan read out, too. “Greenleaf: power for a better tomorrow.”',
        'Được rồi. Nhưng tôi muốn khẩu hiệu cũng được đọc lên. “Greenleaf: năng lượng cho một ngày mai tốt đẹp hơn.”',
        'Đồng ý đọc khẩu hiệu một lần ở chỗ phù hợp.',
        'Sorry, will you read our slogan?',
        r('Đọc khẩu hiệu một lần, ở phần mở đầu', [['once', 'one time', 'single'], ['slogan', 'opening', 'welcome', 'start', 'it', 'read', 'tagline']], 'Certainly. I will read the slogan once, in the opening, right after your company name.', 'Once, in the opening. With feeling, please.'),
        r('Đề nghị chiếu khẩu hiệu lên màn hình', [['screen', 'slide', 'logo', 'visual', 'display']], 'I will read it in the opening, and may I suggest we also show it on the screen behind me?', 'On screen as well? Even better.'),
        vague(UNSURE, 'How many times, and where?')
      ),
      n(
        'Good. I would also like two minutes on stage to say a few words. It is not in the program, I know.',
        'Tốt. Tôi cũng muốn có hai phút trên sân khấu để nói vài lời. Tôi biết việc này không có trong chương trình.',
        'Không tự quyết: nói bạn cần hỏi ban tổ chức, và đề xuất một chỗ khả thi.',
        'Sorry, can I have two minutes on stage?',
        r('Phải hỏi ban tổ chức trước', [['organizer', 'organizers', 'organiser', 'organisers', 'client', 'director', 'committee', 'producer'], ['check', 'ask', 'approve', 'confirm', 'decision', 'speak', 'talk']], 'That is not my decision, but let me check with the organizers right now.', 'Fair. Tell them it is only two minutes.'),
        r('Đề xuất nói trước khi trao giải chính', [['before', 'after', 'during'], ['award', 'dinner', 'main', 'toast', 'dessert', 'scholarship'], ['could', 'suggest', 'slot', 'moment', 'best', 'would']], 'If they agree, the best moment would be just before the main award, when everyone is listening.', 'Before the main award. Yes, that is the spot I want.'),
        vague(UNSURE, 'So I can just walk up when I am ready?')
      ),
      n(
        'Thank you. One complaint: our logo on the stage banner is smaller than the hotel’s. Can you fix that?',
        'Cảm ơn. Một điều phàn nàn: logo của chúng tôi trên băng rôn sân khấu nhỏ hơn logo khách sạn. Anh sửa được không?',
        'Nói thật là không thuộc phần việc của bạn, nhưng bạn sẽ báo và bù bằng lời nhắc trên sân khấu.',
        'Sorry, what can you do about the logo?',
        r('Không thuộc phần việc của tôi, nhưng sẽ báo ngay', [['not', 'cannot', 'can not', "can't", 'unable'], ['change', 'fix', 'my', 'banner', 'printed', 'tonight'], ['tell', 'raise', 'report', 'inform', 'pass', 'let', 'speak']], 'I cannot change the banner tonight, but I will raise it with the production team immediately.', 'At least somebody will tell them.'),
        r('Bù lại bằng lời cảm ơn riêng trên sân khấu', [['special', 'extra', 'personal', 'dedicated'], ['thank', 'thanks', 'mention', 'applause', 'moment']], 'What I can do is give Greenleaf a special thank-you moment, with a round of applause.', 'A special thank-you with applause. That helps.'),
        vague([...UNSURE, ...SORRY], 'Sorry is nice, but what will you do?')
      ),
      n(
        'I can accept that. Lastly, how do you pronounce our company name? The last host said “Green Life”.',
        'Tôi chấp nhận. Cuối cùng, anh phát âm tên công ty chúng tôi thế nào? Người dẫn lần trước nói thành “Green Life”.',
        'Đọc đúng tên công ty và xác nhận lại.',
        'Sorry, how will you say our name?',
        r('Đọc đúng "Greenleaf" và hỏi lại', [['greenleaf', 'green leaf'], ['correct', 'right', 'is that', 'energy', 'one word', 'like']], 'Greenleaf Energy. Green, leaf, as one word. Is that correct?', 'Correct. Thank you for checking.'),
        vague([...UNSURE, 'green life'], 'Say it for me, so I can relax.')
      ),
    ],
    end: 'You negotiated better than my lawyers. We have a deal. Enjoy the evening.',
    endVi: 'Anh thương lượng giỏi hơn cả luật sư của tôi. Chốt vậy nhé. Chúc buổi tối vui vẻ.',
  },
  {
    id: 'small-talk',
    npcId: 'hannah',
    name: 'Hannah',
    kind: 'Tiệc tất niên',
    fn: 'social',
    roleVi: 'Một vị khách nước ngoài bắt chuyện với MC ở quầy đồ uống',
    goalVi: 'Giữ cuộc nói chuyện xã giao tự nhiên: trả lời rồi hỏi lại.',
    cefr: 'B1',
    nodes: [
      n(
        'Hi! You were the host tonight, right? You were great. I am Hannah, from the London office.',
        'Chào! Bạn là người dẫn tối nay đúng không? Bạn dẫn hay lắm. Mình là Hannah, từ văn phòng London.',
        'Cảm ơn, tự giới thiệu và hỏi lại cô ấy một câu.',
        'Sorry, what is your name again?',
        r('Cảm ơn, giới thiệu tên và hỏi lại', [['thank', 'thanks', 'kind'], ['i am', 'my name', 'call me', 'nice to meet', 'pleasure to meet', 'good to meet']], 'Thank you, that is very kind. I am Thien An. Nice to meet you, Hannah. Is this your first time in Vietnam?', 'It is! I arrived two days ago.'),
        vague([...UNSURE, 'hello', 'hi'], 'And you are? I never caught your name on stage.')
      ),
      n(
        'I am only here for a week. What should I absolutely see or eat before I leave?',
        'Mình chỉ ở đây một tuần. Trước khi về, mình nhất định nên xem hoặc ăn gì?',
        'Gợi ý một món ăn hoặc một nơi nên đến, kèm lý do ngắn.',
        'Sorry, what do you recommend?',
        r('Gợi ý một món ăn', [['pho', 'banh mi', 'coffee', 'spring rolls', 'street food', 'seafood'], ['try', 'must', 'should', 'recommend', 'have to', 'taste', 'eat', 'best']], 'You must try pho for breakfast, at a small street restaurant, not in the hotel.', 'Pho for breakfast? I am doing that tomorrow.'),
        r('Gợi ý một nơi nên đến', [['visit', 'go to', 'see', 'walk', 'museum', 'market', 'river', 'old town', 'hoi an', 'beach', 'district']], 'You should visit the old market early in the morning. It is the real city.', 'An early market. I love that kind of thing.'),
        vague([...UNSURE, 'many things', 'everything', 'a lot'], 'Everything is a lot for one week! One thing?')
      ),
      n(
        'Thanks for the tip! So, how did you become an MC? Did you study it?',
        'Cảm ơn lời khuyên nhé! Vậy bạn trở thành MC như thế nào? Bạn có học ngành này không?',
        'Kể ngắn gọn con đường nghề của bạn.',
        'Sorry, how did you start in this job?',
        r('Bắt đầu từ thời sinh viên hoặc một lần tình cờ', [['started', 'began', 'first', 'student', 'university', 'friend', 'by accident', 'by chance', 'years ago', 'used to'], ['wedding', 'event', 'hosting', 'host', 'mc', 'stage', 'tour guide', 'job', 'when']], 'I started by accident. A friend asked me to host her wedding, and I never stopped.', 'By accident! The best careers start that way.'),
        r('Tự học và luyện tập nhiều', [['learned', 'learnt', 'taught myself', 'practice', 'practise', 'practised', 'practiced', 'training', 'course'], ['myself', 'job', 'stage', 'lot', 'every', 'english', 'by']], 'I never studied it. I learned on the job, and I practise my English every day.', 'Every day? No wonder your English is so good.'),
        vague([...UNSURE, 'long story', 'no'], 'Come on, there must be a story.')
      ),
      n(
        'That is so interesting. And what is the hardest part of your job?',
        'Thú vị quá. Thế phần khó nhất trong nghề của bạn là gì?',
        'Nêu một khó khăn thật: chương trình thay đổi phút chót, tên riêng, hay giữ năng lượng.',
        'Sorry, what is the most difficult thing?',
        r('Thay đổi phút chót', [['last minute', 'changes', 'change', 'unexpected', 'surprise', 'surprises', 'goes wrong', 'go wrong']], 'The last-minute changes. The program is never the same as the one I rehearsed.', 'Ha! Just like my job, then.'),
        r('Đọc đúng tên và giữ năng lượng', [['names', 'pronounce', 'pronunciation', 'energy', 'tired', 'voice', 'hours', 'smile']], 'Getting every name right, and keeping my energy up for five hours.', 'Five hours of smiling. I could never.'),
        vague([...UNSURE, 'nothing', 'easy', 'everything'], 'It cannot all be easy. What is hard?')
      ),
      n(
        'I can imagine. Well, I should find my colleagues. It was lovely talking to you.',
        'Mình hình dung được. Thôi, mình nên đi tìm đồng nghiệp. Nói chuyện với bạn vui lắm.',
        'Kết thúc lịch sự: đáp lại lời chào và chúc cô ấy.',
        'Sorry, I said it was lovely talking to you!',
        r('Đáp lại và chúc chuyến đi vui', [['lovely', 'nice', 'great', 'pleasure', 'enjoyed'], ['talking', 'meeting', 'meet', 'chat', 'you too', 'enjoy', 'trip', 'stay', 'evening', 'vietnam']], 'It was lovely talking to you too, Hannah. Enjoy the rest of your stay in Vietnam.', 'I will. And I will tell London about you!'),
        vague([...UNSURE, 'bye', 'goodbye', 'see you'], 'Oh. Well, bye then!')
      ),
    ],
    end: 'Take care, and thank you for the pho tip!',
    endVi: 'Giữ sức khoẻ nhé, và cảm ơn vì gợi ý món phở!',
  },
  {
    id: 'safety-officer',
    npcId: 'sam',
    name: 'Sam',
    kind: 'Sự kiện quốc tế',
    fn: 'trouble',
    roleVi: 'Trưởng an ninh địa điểm dặn MC các tình huống khẩn cấp',
    goalVi: 'Nắm rõ việc phải thông báo khi có sự cố và ai ra lệnh.',
    cefr: 'B2',
    nodes: [
      n(
        'Hello. Sam, head of security. Before doors open, do you know where the emergency exits are?',
        'Xin chào. Tôi là Sam, trưởng an ninh. Trước khi mở cửa, anh có biết các lối thoát hiểm ở đâu không?',
        'Nói các lối thoát bạn biết, hoặc nhờ ông chỉ.',
        'Sorry, can you tell me where the exits are?',
        r('Nêu vị trí các lối thoát', [['exit', 'exits', 'doors'], ['back', 'side', 'sides', 'left', 'right', 'behind', 'both', 'two', 'four', 'rear']], 'Yes. There are two exits at the back and one on each side of the hall.', 'Correct. Four exits. Good.'),
        r('Nhờ ông chỉ lại cho chắc', [['show me', 'walk me', 'point', 'remind me', 'could you show', 'can you show', 'not sure where']], 'I saw two at the back, but could you show me all of them, to be sure?', 'Happy to. Two at the back, one each side. Four in total.'),
        vague(UNSURE, 'Tell me where they are. I need to hear it from you.')
      ),
      n(
        'Good. In your opening, I need you to mention them. What will you say?',
        'Tốt. Trong phần mở đầu, tôi cần anh nhắc tới chúng. Anh sẽ nói gì?',
        'Nói câu thông báo an toàn ngắn gọn của bạn.',
        'Sorry, what is your safety line?',
        r('Câu thông báo an toàn', [['safety', 'emergency', 'event of', 'in case'], ['exit', 'exits', 'nearest', 'note', 'located']], 'For your safety, please note the emergency exits at the back and on both sides of the hall.', 'Short and clear. That is all I need.'),
        vague(UNSURE, 'I need the actual sentence, word for word.')
      ),
      n(
        'Now, if there is a real emergency, who tells you to make an announcement?',
        'Giờ nếu có tình huống khẩn cấp thật, ai sẽ báo anh thông báo?',
        'Xác nhận: chỉ thông báo khi có lệnh từ an ninh, qua tai nghe hoặc trực tiếp.',
        'Sorry, whose instruction do you wait for?',
        r('Chỉ làm theo lệnh của an ninh', [['you', 'security', 'your team', 'safety officer'], ['instruction', 'instructions', 'tell', 'signal', 'radio', 'earpiece', 'only', 'wait', 'word', 'say']], 'Only you or your team. I will wait for your instruction on the earpiece.', 'Only from me. Not from the client, not from the hotel.'),
        vague([...UNSURE, 'client', 'organizer', 'anyone'], 'No. Think again. Who is in charge of safety here?')
      ),
      n(
        'Right. And what do you say to the audience if I tell you to evacuate?',
        'Đúng. Và anh nói gì với khán giả nếu tôi bảo sơ tán?',
        'Nói câu thông báo sơ tán: bình tĩnh, để lại đồ, đi về lối thoát gần nhất.',
        'Sorry, what are your evacuation words?',
        r('Bình tĩnh, đi ra lối thoát gần nhất', [['calm', 'calmly', 'slowly'], ['exit', 'exits', 'leave', 'walk']], 'Ladies and gentlemen, please stay calm, leave your belongings, and walk to the nearest exit.', 'Calm, belongings, nearest exit. Perfect.'),
        vague([...UNSURE, 'run', 'hurry', 'fire'], 'Never say “run” or “fire”. Try again.')
      ),
      n(
        'Excellent. Last point: a guest feels unwell during the show. What do you do?',
        'Rất tốt. Điểm cuối: một vị khách thấy không khoẻ giữa chương trình. Anh làm gì?',
        'Nói bạn sẽ báo an ninh hoặc y tế kín đáo và giữ khán phòng bình tĩnh.',
        'Sorry, a guest is ill. What is your action?',
        r('Báo đội y tế kín đáo, không làm ồn', [['medical', 'medic', 'first aid', 'doctor', 'security', 'your team', 'you'], ['call', 'alert', 'tell', 'signal', 'inform', 'quietly', 'radio', 'contact']], 'I will alert your team quietly on the radio, and keep the program going so the room stays calm.', 'Quietly, and keep going. Exactly right.'),
        r('Tạm dừng chương trình nếu nghiêm trọng', [['pause', 'stop', 'break', 'hold'], ['program', 'show', 'serious', 'music', 'short', 'moment']], 'If it looks serious, I will pause the show for a short break and ask the band to play.', 'A short break with music. Good judgement.'),
        vague([...UNSURE, 'help', 'panic'], 'Help how? Walk me through it.')
      ),
    ],
    end: 'Good. I can relax a little, knowing you are on the microphone.',
    endVi: 'Tốt. Biết anh cầm micro thì tôi yên tâm hơn một chút.',
  },
  {
    id: 'co-host',
    npcId: 'jay',
    name: 'Jay',
    kind: 'Tiệc tất niên',
    fn: 'backstage',
    roleVi: 'Bạn dẫn nói tiếng Anh chia phần với bạn trước tiệc tất niên',
    goalVi: 'Chia lời dẫn rõ ràng và thống nhất cách tung hứng trên sân khấu.',
    cefr: 'B1',
    nodes: [
      n(
        'Hey partner! I am Jay. So we are hosting together tonight. Who opens the show, you or me?',
        'Chào bạn dẫn! Mình là Jay. Vậy tối nay mình dẫn chung. Ai mở màn, bạn hay mình?',
        'Đề xuất: bạn mở bằng tiếng Việt, Jay tiếp bằng tiếng Anh (hoặc ngược lại).',
        'Sorry, who says the first line?',
        r('Tôi mở bằng tiếng Việt, bạn tiếp bằng tiếng Anh', [['i open', 'i start', 'i will open', 'i will start', 'i go first', 'i begin', 'i will begin'], ['vietnamese', 'english', 'then you', 'you follow', 'and you']], 'I will open in Vietnamese, and then you follow in English.', 'You in Vietnamese, me in English. Easy.'),
        r('Bạn mở, tôi tiếp', [['you open', 'you start', 'you go first', 'you begin'], ['i follow', 'then me', 'then i', 'and i', 'english', 'vietnamese']], 'You open in English, and then I follow in Vietnamese.', 'Me first? Okay, I will bring the energy.'),
        vague([...EITHER, 'together', 'both'], 'Somebody has to say the first word!')
      ),
      n(
        'Cool. For the lucky draw, I get super excited. Do you want to read the numbers, or shall I?',
        'Ổn. Tới phần bốc thăm trúng thưởng thì mình hay phấn khích lắm. Bạn muốn đọc số, hay để mình?',
        'Chia vai: một người bốc và đọc số, người kia gọi tên và chúc mừng.',
        'Sorry, who reads the numbers?',
        r('Bạn đọc số, tôi nhắc lại bằng tiếng Việt', [['you read', 'you draw', 'you pick', 'you call'], ['i repeat', 'i translate', 'i say', 'vietnamese', 'i will', 'and i']], 'You read the numbers in English, and I repeat them in Vietnamese.', 'I read, you repeat. Nobody misses their number.'),
        r('Tôi đọc số, bạn chúc mừng người thắng', [['i read', 'i draw', 'i pick', 'i call', 'i will read'], ['you congratulate', 'you welcome', 'you interview', 'you bring', 'winner', 'winners', 'and you']], 'I will read the numbers, and you congratulate the winners on stage.', 'I get the winners. I love that part.'),
        vague(EITHER, 'If we both shout numbers, it will be chaos.')
      ),
      n(
        'Nice. Sometimes I forget my lines. If I freeze, what will you do?',
        'Hay. Thỉnh thoảng mình quên lời. Nếu mình đứng hình, bạn sẽ làm gì?',
        'Trấn an: bạn sẽ đỡ lời tự nhiên và hai người có một tín hiệu.',
        'Sorry, how will you help me if I forget?',
        r('Thống nhất một tín hiệu', [['signal', 'sign', 'look at me', 'touch', 'tap', 'code word'], ['me', 'my', 'arm', 'shoulder', 'if', 'when', 'give']], 'Just look at me and touch your ear. That is our signal, and I will take over.', 'Touch my ear. Secret agent style!'),
        r('Tôi sẽ đỡ lời và nói tiếp', [['jump in', 'step in', 'take over', 'continue', 'cover', 'pick up', 'finish'], ['line', 'for you', 'sentence', 'smile', 'naturally', 'your', 'it', 'and']], 'Do not worry. I will jump in with a smile and continue the line for you.', 'You are a lifesaver. I will do the same for you.'),
        vague(EITHER, 'That does not calm me down. What is the plan?')
      ),
      n(
        'Great. And jokes. I like to tease my co-host a little. Is that okay with you?',
        'Tuyệt. Còn chuyện đùa. Mình hay trêu bạn dẫn một chút. Bạn thấy ổn không?',
        'Đặt giới hạn thân thiện: đùa nhẹ thì được, không đùa về ngoại hình hay tiếng Anh của bạn.',
        'Sorry, can I joke about you on stage?',
        r('Đùa nhẹ thì được, có giới hạn', [['fine', 'okay', 'welcome', 'sure', 'go ahead', 'happy'], ['but', 'as long as', 'except', 'just not', 'only', 'not about']], 'A little teasing is fine, but please, no jokes about my accent.', 'No accent jokes. Promise. Your English is better than mine anyway.'),
        r('Xin nghe trước câu đùa', [['tell me', 'show me', 'hear', 'run', 'check'], ['first', 'before', 'now', 'jokes', 'them', 'in advance']], 'Tell me the jokes first, so I can have an answer ready.', 'Smart. Then you can tease me back.'),
        vague(EITHER, 'So anything goes? Even your haircut?')
      ),
      n(
        'Deal. Last thing: how do we end the night? Together, or one of us?',
        'Chốt. Điều cuối: mình kết thúc đêm nay thế nào? Cùng nhau, hay một người?',
        'Đề xuất cách kết: cùng chào, hoặc mỗi người một ngôn ngữ.',
        'Sorry, who says good night?',
        r('Cùng nhau chúc ngủ ngon', [['together', 'both', 'same time', 'at once'], ['good night', 'goodbye', 'say', 'thank', 'wave', 'we']], 'We say good night together, on three, and wave.', 'On three. One, two, three, good night!'),
        r('Mỗi người một ngôn ngữ', [['you in english', 'i in vietnamese', 'each language', 'you say it in english', 'i say it in vietnamese', 'me in vietnamese'], ['and', 'then', 'first', 'last']], 'You say it in English first, and then I say it in Vietnamese.', 'English, then Vietnamese. Classy ending.'),
        vague(EITHER, 'We need a plan, or we will both talk at once.')
      ),
    ],
    end: 'We are going to be a great team. See you on stage, partner!',
    endVi: 'Mình sẽ là một cặp ăn ý đấy. Hẹn gặp trên sân khấu nhé, bạn dẫn!',
  },
  {
    id: 'mother-customs',
    npcId: 'grace',
    name: 'Grace',
    kind: 'Lễ cưới truyền thống',
    fn: 'social',
    roleVi: 'Mẹ chú rể người nước ngoài hỏi MC về phong tục trước lễ gia tiên',
    goalVi: 'Giải thích phong tục bằng lời đơn giản, giúp bà yên tâm.',
    cefr: 'B1',
    nodes: [
      n(
        'Excuse me, are you the host? I am Grace, Liam’s mother. I am so nervous. I do not know what to do in the ceremony.',
        'Xin lỗi, bạn là người dẫn phải không? Tôi là Grace, mẹ của Liam. Tôi hồi hộp quá. Tôi không biết phải làm gì trong buổi lễ.',
        'Trấn an bà và nói bạn sẽ hướng dẫn từng bước.',
        'Sorry, will somebody tell me what to do?',
        r('Trấn an, sẽ hướng dẫn từng bước', [['worry', 'relax', 'fine', 'easy', 'simple', 'nervous'], ['guide', 'tell', 'explain', 'help', 'show', 'step', 'i will', 'with you']], 'Please do not worry, Grace. I will guide you step by step, in English, during the whole ceremony.', 'Step by step. Oh, thank goodness.'),
        vague(['maybe', 'not sure', 'i think', 'hello', 'hi'], 'I really am nervous. What happens first?')
      ),
      n(
        'Thank you. What happens at the family altar? I saw candles and incense.',
        'Cảm ơn. Ở bàn thờ gia tiên thì diễn ra chuyện gì? Tôi thấy có nến và nhang.',
        'Giải thích đơn giản: cô dâu chú rể thắp nhang để tỏ lòng kính trọng tổ tiên.',
        'Sorry, what does the altar ceremony mean?',
        r('Thắp nhang để kính trọng tổ tiên', [['incense', 'candles', 'bow', 'pray'], ['respect', 'ancestors', 'grandparents', 'family', 'honor', 'honour', 'thank', 'blessing']], 'The couple will light incense and bow, to show respect to the ancestors of the family.', 'To show respect. That is beautiful.'),
        vague([...UNSURE, 'tradition', 'custom', 'ceremony'], 'A tradition, yes, but what does it mean?')
      ),
      n(
        'I see. And the tea. Do I drink it? Do I say something?',
        'Tôi hiểu. Còn trà thì sao? Tôi có uống không? Tôi có nói gì không?',
        'Hướng dẫn: nhận chén trà, nhấp một ngụm, rồi nói lời chúc hoặc trao quà.',
        'Sorry, what do I do with the tea?',
        r('Nhận trà, nhấp một ngụm, nói lời chúc', [['sip', 'drink', 'take', 'accept', 'receive'], ['tea', 'cup', 'it'], ['wish', 'words', 'blessing', 'say', 'gift', 'advice', 'then', 'smile']], 'They will offer you a cup of tea. Take a small sip, and then say a few kind words to them.', 'A sip and a few kind words. I can do that.'),
        vague(UNSURE, 'Drink it all? Say what? Please be specific.')
      ),
      n(
        'Good. I brought a gift, a necklace from my mother. When do I give it?',
        'Tốt. Tôi có mang quà, một sợi dây chuyền của mẹ tôi. Khi nào thì tôi trao?',
        'Nói thời điểm trao quà: ngay sau khi uống trà, và bạn sẽ mời bà.',
        'Sorry, when should I give my gift?',
        r('Ngay sau chén trà, tôi sẽ mời bà', [['after', 'right after', 'once', 'when'], ['tea', 'sip', 'cup', 'i call', 'i invite', 'i will', 'your name', 'drink']], 'Right after the tea. I will invite you by name, and you can put the necklace on her yourself.', 'Put it on her myself? I might cry.'),
        vague([...UNSURE, 'later', 'any time', 'anytime', 'soon'], 'I do not want to do it at the wrong moment. When?')
      ),
      n(
        'Lovely. One last worry: what should I absolutely not do? I do not want to offend anyone.',
        'Hay quá. Còn một nỗi lo cuối: tôi tuyệt đối không nên làm gì? Tôi không muốn làm phật lòng ai.',
        'Cho một hai lời khuyên: đừng quay lưng về bàn thờ, nhận đồ bằng hai tay.',
        'Sorry, is there anything I should avoid?',
        r('Nhận đồ bằng hai tay', [['both hands', 'two hands']], 'Just one small thing: receive the tea with both hands. It shows respect.', 'Both hands. I will remember.'),
        r('Đừng quay lưng về phía bàn thờ', [['back to', 'turn your back', 'facing', 'face the'], ['altar', 'ancestors', 'elders', 'it']], 'Try not to turn your back to the altar. Apart from that, just smile.', 'Do not turn my back to the altar. Got it.'),
        vague([...UNSURE, 'nothing', 'do not worry', "don't worry"], 'There must be something. Every culture has one.')
      ),
    ],
    end: 'You have made me feel so welcome. Thank you, dear.',
    endVi: 'Bạn làm tôi thấy được chào đón quá. Cảm ơn bạn nhé.',
  },
  {
    id: 'winner-backstage',
    npcId: 'isabelle',
    name: 'Isabelle',
    kind: 'Lễ trao giải',
    fn: 'intro',
    roleVi: 'Người sắp nhận giải, đang rất run, hỏi MC ở cánh gà',
    goalVi: 'Dặn người nhận giải việc phải làm trên sân khấu và giúp cô bình tĩnh.',
    cefr: 'B2',
    nodes: [
      n(
        'Hi. I think I am getting an award tonight. I have never been on a stage. Where do I walk?',
        'Chào. Hình như tối nay tôi được nhận giải. Tôi chưa bao giờ lên sân khấu. Tôi đi lối nào?',
        'Chỉ đường đi: lên cầu thang nào, đứng ở đâu.',
        'Sorry, which way do I come on stage?',
        r('Lên cầu thang bên trái, tới chỗ đánh dấu', [['stairs', 'steps', 'left', 'right'], ['walk', 'come', 'go', 'up', 'mark', 'centre', 'center', 'me', 'podium', 'take']], 'Come up the stairs on the left, and walk to the mark in the centre, next to me.', 'Stairs on the left, to the mark. Okay.'),
        vague([...UNSURE, 'easy', 'do not worry', "don't worry", 'follow'], 'I really need directions. Left or right?')
      ),
      n(
        'Okay. And when I get there, what happens? Who gives me the trophy?',
        'Được. Rồi khi tôi tới đó thì sao? Ai trao cúp cho tôi?',
        'Tả trình tự: ai trao giải, bắt tay, rồi chụp ảnh.',
        'Sorry, what is the order on stage?',
        r('Chủ tịch trao giải, bắt tay, chụp ảnh', [['chairman', 'ceo', 'president', 'director', 'presenter', 'sponsor'], ['trophy', 'award', 'hand', 'give', 'present'], ['photo', 'picture', 'shake', 'camera', 'then', 'smile']], 'The chairman will hand you the trophy. Shake his hand, and then turn to the camera for a photo.', 'Trophy, handshake, photo. Three things.'),
        vague(UNSURE, 'Who is on stage with me? What do I do first?')
      ),
      n(
        'Do I have to give a speech? Please say no.',
        'Tôi có phải phát biểu không? Làm ơn nói là không đi.',
        'Nói thật: có ba mươi giây, và gợi ý nên nói gì.',
        'Sorry, do I need to speak?',
        r('Chỉ ba mươi giây, cảm ơn vài người', [['thirty seconds', 'half a minute', 'few words', 'short', 'brief', 'one minute'], ['thank', 'thanks', 'team', 'family', 'say', 'just', 'only']], 'Only thirty seconds. Just thank your team and your family, and you are done.', 'Thirty seconds. Thank my team. I can manage that.'),
        vague([...UNSURE, 'no', 'optional'], 'Is that a yes or a no? I need to prepare!')
      ),
      n(
        'What if I forget everything? My mind goes blank when I am nervous.',
        'Nếu tôi quên hết thì sao? Lúc hồi hộp đầu óc tôi trống rỗng.',
        'Trấn an: bạn sẽ đứng ngay bên cạnh và hỏi cô một câu dễ nếu cô bí.',
        'Sorry, what if I cannot speak?',
        r('Tôi đứng ngay cạnh và sẽ hỏi một câu dễ', [['next to you', 'beside you', 'right there', 'with you', 'help you'], ['question', 'ask', 'stage', 'whole', 'if', 'time', 'simple', 'easy', 'will']], 'I will be right there next to you. If you go blank, I will ask you one easy question.', 'An easy question. Like what?'),
        r('Viết ba từ khoá lên tay hoặc thẻ', [['write', 'card', 'note', 'notes', 'three words', 'keywords'], ['hand', 'card', 'pocket', 'words', 'names', 'down']], 'Write three words on a small card: team, family, thank you. That is your whole speech.', 'Team, family, thank you. On a card. Yes.'),
        vague([...UNSURE, 'relax', 'calm down'], 'Telling me to relax does not help!')
      ),
      n(
        'Thank you. Last question: how will I know when it is my turn?',
        'Cảm ơn. Câu cuối: làm sao tôi biết lúc nào tới lượt mình?',
        'Nói tín hiệu: khi bạn xướng tên cô, hoặc nhân viên sân khấu ra hiệu.',
        'Sorry, what is my cue to walk out?',
        r('Khi tôi xướng tên và nhạc nổi lên', [['your name', 'call you', 'announce', 'say your'], ['music', 'walk', 'then', 'when', 'applause', 'hear', 'cue']], 'When I say your name and the music starts, that is your cue to walk.', 'My name, then music. I will listen for it.'),
        r('Nhân viên sân khấu sẽ ra hiệu', [['stage manager', 'zoe', 'staff', 'assistant', 'crew'], ['signal', 'tell', 'tap', 'send', 'show', 'will', 'cue']], 'The stage manager will stand with you and tell you exactly when to go.', 'Someone will stand with me? That helps a lot.'),
        vague(UNSURE, 'I will be shaking behind the curtain. What is the cue?')
      ),
    ],
    end: 'I feel so much better now. Thank you. See you out there.',
    endVi: 'Giờ tôi thấy đỡ hơn nhiều rồi. Cảm ơn anh. Hẹn gặp ngoài sân khấu.',
  },
];
