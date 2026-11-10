import { fill, grab, improv, pick, say, type Scenario } from './helpers';

// Talkshow truyền hình trực tiếp với CEO David Tran (B2). 4 lượt mỗi bộ.
const DAVID = { who: 'david' } as const;
const INEAR = { who: 'alex', channel: 'inear' } as const;

export const INTERVIEW_SCENARIOS: Scenario[] = [
  {
    id: 'interview-vague-answer',
    title: 'Khách trả lời vòng vo',
    turns: [
      say(
        ['Well, success is a journey, you know. It is about many things, in many ways.', 'À thì, thành công là một hành trình, bạn biết đấy. Nó liên quan tới nhiều thứ, theo nhiều cách.'],
        ['That is interesting, David. Could you give us one specific example?', 'Thú vị đấy David. Anh có thể cho chúng tôi một ví dụ cụ thể không?'],
        'Khi khách trả lời chung chung, xin "one specific example".',
        DAVID,
      ),
      grab(
        ['Sure. In our first year, we lost our biggest client, and I had to cut my own salary to keep the team.', 'Được. Năm đầu tiên, chúng tôi mất khách hàng lớn nhất, và tôi phải cắt lương của chính mình để giữ đội ngũ.'],
        ['So you lost your biggest {client}, and you cut your own {salary} to keep the team.', 'Vậy là anh mất khách hàng lớn nhất, và cắt lương của chính mình để giữ đội ngũ.'],
        ['office', 'budget', 'investor', 'holiday'],
        'Nhắc lại ý chính của khách là kỹ thuật "active listening".',
        DAVID,
      ),
      pick(
        ['In-ear: great moment. Follow up on the feeling, not the numbers. Ask how it felt.', 'In-ear: khoảnh khắc hay đấy. Hỏi tiếp về cảm xúc, đừng hỏi con số. Hỏi lúc đó anh ấy cảm thấy thế nào.'],
        'Câu hỏi tiếp theo nào đúng ý đạo diễn?',
        ['How did you feel when you made that decision?', 'Anh cảm thấy thế nào khi đưa ra quyết định đó?'],
        ['How much was your salary exactly?', 'How many clients do you have today?'],
        '"How did you feel ...?" hỏi về cảm xúc. Câu hỏi mở tạo ra câu trả lời sâu.',
        { ...INEAR, reflex: 15 },
      ),
      improv(
        ['Honestly, I was terrified. But the team stayed, and that changed everything.', 'Thật lòng thì tôi rất sợ. Nhưng đội ngũ ở lại, và điều đó thay đổi tất cả.'],
        ['Cảm ơn sự chân thành của khách và tóm lại bài học cho khán giả.', 'Bắt buộc có lời cảm ơn (thank / honest / sharing) và nêu bài học (team / people / lesson / courage).'],
        [['thank', 'honest', 'sharing'], ['team', 'people', 'lesson', 'courage']],
        [['david'], ['powerful', 'inspiring', 'viewers']],
        'Thank you for sharing that so honestly, David. It is a powerful lesson about putting your team first.',
        'Tóm ý của khách thành một bài học ngắn cho người xem.',
        DAVID,
      ),
    ],
  },
  {
    id: 'interview-sensitive-question',
    title: 'Câu hỏi nhạy cảm',
    turns: [
      pick(
        ['In-ear: his company announced layoffs this morning. Ask about it, but be respectful and give him space.', 'In-ear: sáng nay công ty anh ấy vừa thông báo cắt giảm nhân sự. Hãy hỏi, nhưng tôn trọng và để anh ấy có không gian trả lời.'],
        'Câu hỏi nào vừa thẳng thắn vừa tôn trọng?',
        ['David, this morning brought difficult news for your company. Would you like to tell us what happened?', 'David, sáng nay có tin không vui với công ty anh. Anh có muốn chia sẻ chuyện gì đã xảy ra không?'],
        ['Why did you fire so many people today?', 'Let us not talk about anything serious tonight.'],
        '"Would you like to tell us ...?" mở cửa cho khách mà không dồn ép.',
        { ...INEAR, reflex: 15 },
      ),
      grab(
        ['It was the hardest decision of my career. We let go of forty people, and every one of them will receive six months of support.', 'Đó là quyết định khó nhất trong sự nghiệp của tôi. Chúng tôi phải chia tay bốn mươi người, và từng người sẽ nhận sáu tháng hỗ trợ.'],
        ['You let go of {forty} people, and each will receive six {months} of support.', 'Anh phải chia tay bốn mươi người, và mỗi người sẽ nhận sáu tháng hỗ trợ.'],
        ['fourteen', 'weeks', 'four', 'years'],
        'Phân biệt "forty" (40) và "fourteen" (14). "Let go of" là cách nói nhẹ của "sa thải".',
        DAVID,
      ),
      say(
        ['I know some viewers are angry with me tonight, and I understand why.', 'Tôi biết tối nay có khán giả giận tôi, và tôi hiểu vì sao.'],
        ['I appreciate your honesty. What would you say to those employees directly?', 'Tôi trân trọng sự thẳng thắn của anh. Anh muốn nói gì trực tiếp với những nhân viên đó?'],
        '"I appreciate your honesty" ghi nhận khách trước khi hỏi tiếp.',
        DAVID,
      ),
      fill(
        ['I would say: thank you, I am sorry, and my door is always open.', 'Tôi sẽ nói: cảm ơn, tôi xin lỗi, và cánh cửa của tôi luôn rộng mở.'],
        ['That was a very ___ answer, David. Let us take a short ___ and continue.', 'Đó là một câu trả lời rất ___, David. Chúng ta nghỉ ___ ngắn rồi tiếp tục.'],
        [['honest', 'human', 'moving', 'sincere'], ['break', 'pause']],
        'Sau một khoảnh khắc nặng, chuyển sang quảng cáo để cả hai lấy lại nhịp.',
        DAVID,
      ),
    ],
  },
  {
    id: 'interview-audience-question',
    title: 'Câu hỏi từ khán giả',
    turns: [
      say(
        ['I am happy to take questions from the audience, if we have time.', 'Tôi sẵn lòng nhận câu hỏi từ khán giả, nếu còn thời gian.'],
        ['Wonderful. We have a question from a student in the third row.', 'Tuyệt vời. Chúng ta có câu hỏi từ một bạn sinh viên ở hàng thứ ba.'],
        '"In the third row" là ở hàng ghế thứ ba.',
        DAVID,
      ),
      pick(
        ['In-ear: the student\'s question is too long. Summarize it in one sentence: she wants to know how to find a mentor.', 'In-ear: câu hỏi của bạn sinh viên dài quá. Tóm lại trong một câu: bạn ấy muốn biết cách tìm người cố vấn.'],
        'Câu tóm tắt nào đúng?',
        ['So the question is: how can a young person find a good mentor?', 'Vậy câu hỏi là: người trẻ làm sao tìm được một người cố vấn tốt?'],
        ['So the question is: how old were you at university?', 'Sorry, we do not have time for long questions.'],
        '"So the question is: ..." là mẫu câu tóm tắt câu hỏi của khán giả.',
        { ...INEAR, reflex: 15 },
      ),
      grab(
        ['Do not wait for a mentor to find you. Offer to help someone you admire, and ask one good question each time you meet.', 'Đừng chờ người cố vấn tìm tới mình. Hãy đề nghị giúp đỡ người bạn ngưỡng mộ, và mỗi lần gặp hãy hỏi một câu hỏi hay.'],
        ['So, offer to {help} someone you {admire}, and ask one good question each time.', 'Vậy là, hãy đề nghị giúp người mình ngưỡng mộ, và mỗi lần hỏi một câu hỏi hay.'],
        ['pay', 'follow', 'call', 'know'],
        'Bắt hai động từ chính trong lời khuyên.',
        DAVID,
      ),
      improv(
        ['That is my best advice. I hope it helps her.', 'Đó là lời khuyên tốt nhất của tôi. Hy vọng nó giúp được bạn ấy.'],
        ['Cảm ơn bạn sinh viên và David, rồi dẫn sang phần tiếp theo.', 'Bắt buộc có lời cảm ơn (thank / question / advice) và chuyển tiếp (next / move on / now / let us).'],
        [['thank', 'question', 'advice'], ['next', 'move on', 'now', 'let us']],
        [['david', 'student'], ['practical', 'wonderful', 'great']],
        'Thank you for that great question, and thank you, David, for such practical advice. Now, let us move on.',
        'Cảm ơn cả người hỏi lẫn người trả lời, rồi mới chuyển phần.',
        DAVID,
      ),
    ],
  },
  {
    id: 'interview-product-launch',
    title: 'Khách quảng cáo quá đà',
    turns: [
      say(
        ['Before we continue, let me tell your viewers about our new app. It is available today, and it costs only...', 'Trước khi tiếp tục, để tôi giới thiệu với khán giả ứng dụng mới của chúng tôi. Nó ra mắt hôm nay, và chỉ có giá...'],
        ['It sounds exciting, David. What problem were you trying to solve when you built it?', 'Nghe hấp dẫn đấy David. Khi tạo ra nó, anh muốn giải quyết vấn đề gì?'],
        'Ngắt quảng cáo khéo: khen ngắn rồi hỏi về câu chuyện phía sau.',
        DAVID,
      ),
      grab(
        ['My mother lives alone in the countryside. I wanted a simple way for her to see a doctor without traveling.', 'Mẹ tôi sống một mình ở quê. Tôi muốn có một cách đơn giản để bà gặp bác sĩ mà không phải đi xa.'],
        ['So it began with your {mother}, who needed to see a {doctor} without traveling.', 'Vậy là nó bắt đầu từ mẹ anh, người cần gặp bác sĩ mà không phải đi xa.'],
        ['father', 'lawyer', 'sister', 'teacher'],
        'Bắt người truyền cảm hứng và người bà ấy cần gặp.',
        DAVID,
      ),
      pick(
        ['In-ear: we cannot mention prices on air. If he starts again, steer him back to the story.', 'In-ear: không được nhắc giá trên sóng. Nếu anh ấy lại bắt đầu, lái về câu chuyện.'],
        'Nếu David lại nói về giá, bạn nói gì?',
        ['Viewers can find the details online. Tell me more about your mother\'s reaction.', 'Khán giả có thể xem chi tiết trên mạng. Kể thêm cho tôi về phản ứng của mẹ anh đi.'],
        ['Yes, please tell us the exact price and the discount.', 'Stop talking, David. That is against the rules.'],
        '"Steer back" là lái câu chuyện trở lại. Không bao giờ quở trách khách trên sóng.',
        { ...INEAR, reflex: 15 },
      ),
      fill(
        ['She cried the first time she used it. That was better than any award.', 'Lần đầu dùng bà đã khóc. Điều đó quý hơn bất kỳ giải thưởng nào.'],
        ['What a ___ story. It shows that great ideas often start at ___.', 'Thật là một câu chuyện ___. Nó cho thấy ý tưởng lớn thường bắt đầu từ ___.'],
        [['touching', 'beautiful', 'moving', 'wonderful'], ['home', 'the heart']],
        '"What a ... story" là câu cảm thán. Rút ra ý nghĩa cho người xem.',
        DAVID,
      ),
    ],
  },
  {
    id: 'interview-technical-break',
    title: 'Mất tín hiệu hình',
    turns: [
      pick(
        ['In-ear: we lost the main camera. Stay on camera two, keep talking, and do not look confused.', 'In-ear: mất máy quay chính rồi. Ở lại máy số hai, nói tiếp, và đừng tỏ ra bối rối.'],
        'Bạn làm gì ngay lúc này?',
        ['I turn to camera two and continue the conversation calmly.', 'Mình quay sang máy số hai và tiếp tục cuộc trò chuyện một cách bình tĩnh.'],
        ['I stop and ask the crew what is wrong.', 'I tell viewers the camera is broken.'],
        'Khán giả không cần biết sự cố. Chỉ cần đổi hướng nhìn.',
        { ...INEAR, reflex: 12 },
      ),
      say(
        ['Is something wrong, Thien An? You turned your chair.', 'Có chuyện gì à Thiên Ân? Bạn vừa xoay ghế.'],
        ['Everything is fine, David. I just wanted a better view of our guest!', 'Mọi thứ ổn cả, David. Tôi chỉ muốn nhìn khách mời rõ hơn thôi!'],
        'Một câu đùa nhẹ che đi sự cố và làm khách thoải mái.',
        DAVID,
      ),
      grab(
        ['Ha! Well, as I was saying, the three things I look for in a new employee are honesty, curiosity, and humor.', 'Ha! À, như tôi đang nói, ba điều tôi tìm ở nhân viên mới là trung thực, tò mò, và hài hước.'],
        ['Honesty, {curiosity}, and {humor}. Which of the three matters most?', 'Trung thực, tò mò, và hài hước. Trong ba điều đó, điều nào quan trọng nhất?'],
        ['experience', 'money', 'speed', 'confidence'],
        'Bắt hai phẩm chất còn lại, rồi hỏi tiếp một câu so sánh.',
        DAVID,
      ),
      improv(
        ['In-ear: camera is back. Go to a break in ten seconds.', 'In-ear: máy quay trở lại rồi. Mười giây nữa vào quảng cáo.'],
        ['Báo khán giả sẽ trở lại sau quảng cáo và giữ họ ở lại.', 'Bắt buộc có thông báo nghỉ (break / moment / back) và giữ chân khán giả (stay / do not go / more / after).'],
        [['break', 'moment', 'back'], ['stay', 'do not go', 'more', 'after']],
        [['david', 'viewers'], ['right back', 'coming up']],
        'We will be right back with more from David after this short break. Stay with us!',
        '"Stay with us" là câu giữ chân khán giả trước quảng cáo.',
        INEAR,
      ),
    ],
  },
  {
    id: 'interview-rapid-fire',
    title: 'Hỏi nhanh đáp gọn',
    turns: [
      say(
        ['I hear you have a quick-fire round for me. Should I be nervous?', 'Nghe nói bạn có phần hỏi nhanh cho tôi. Tôi có nên lo không?'],
        ['Not at all! I will ask five short questions, and you answer in one word.', 'Không hề! Tôi sẽ hỏi năm câu ngắn, và anh trả lời bằng một từ.'],
        'Giải thích luật chơi thật ngắn: số câu hỏi và cách trả lời.',
        DAVID,
      ),
      fill(
        ['One word? That is hard for a CEO. All right, go ahead!', 'Một từ thôi à? Khó cho một CEO đấy. Được rồi, bắt đầu đi!'],
        ['First question: ___ or tea? And second: early ___ or night owl?', 'Câu đầu: ___ hay trà? Và câu hai: người dậy ___ hay cú đêm?'],
        [['coffee', 'juice', 'water'], ['bird', 'riser']],
        '"Early bird" là người dậy sớm, "night owl" là cú đêm.',
        DAVID,
      ),
      grab(
        ['Coffee, definitely. And early bird: I wake up at five and read for an hour before work.', 'Cà phê, chắc chắn rồi. Và dậy sớm: tôi dậy lúc năm giờ và đọc sách một tiếng trước khi đi làm.'],
        ['You wake up at {five} and {read} for an hour? That is impressive!', 'Anh dậy lúc năm giờ và đọc sách một tiếng à? Ấn tượng thật!'],
        ['six', 'run', 'four', 'write'],
        'Bắt giờ dậy và thói quen buổi sáng.',
        DAVID,
      ),
      pick(
        ['In-ear: thirty seconds left. One final question, then wrap. Make it the best one.', 'In-ear: còn ba mươi giây. Một câu hỏi cuối rồi kết. Chọn câu hay nhất.'],
        'Câu hỏi cuối nào hay nhất cho ba mươi giây?',
        ['Last one: what is the best advice you have ever received?', 'Câu cuối: lời khuyên hay nhất anh từng nhận được là gì?'],
        ['Last one: can you explain your whole business plan in detail?', 'Last one: could you list all your employees by name?'],
        'Câu hỏi cuối phải ngắn và gợi được một câu trả lời đáng nhớ.',
        { ...INEAR, reflex: 15 },
      ),
    ],
  },
  {
    id: 'interview-opening-intro',
    title: 'Mở màn và giới thiệu khách',
    turns: [
      pick(
        ['In-ear: live in ten seconds. Greet the viewers first, then say the show name, then introduce David. In that order.', 'In-ear: mười giây nữa lên sóng. Chào khán giả trước, rồi nêu tên chương trình, rồi giới thiệu David. Đúng thứ tự đó.'],
        'Thứ tự mở màn đúng là gì?',
        ['Greet the viewers, say the show name, then introduce David.', 'Chào khán giả, nêu tên chương trình, rồi giới thiệu David.'],
        ['Introduce David, greet the viewers, then say the show name.', 'Say the show name, introduce David, then greet the viewers.'],
        'Nghe các từ chỉ thứ tự: "first", "then", "then".',
        { ...INEAR, reflex: 15 },
      ),
      improv(
        ['In-ear: three, two, one. You are live!', 'In-ear: ba, hai, một. Lên sóng!'],
        ['Chào khán giả, nêu tên chương trình và giới thiệu khách mời David Tran.', 'Bắt buộc có lời chào (good evening / welcome) và giới thiệu khách (David / Tran / guest / CEO).'],
        [['good evening', 'welcome'], ['david', 'tran', 'guest', 'ceo']],
        [['english stage tonight', 'viewers'], ['technology', 'special', 'delighted']],
        'Good evening and welcome to English Stage Tonight! My guest this evening is technology CEO David Tran.',
        'Mỉm cười trước khi nói từ đầu tiên. Nhấn mạnh tên chương trình và tên khách.',
        INEAR,
      ),
      say(
        ['Thank you, Thien An. I have been looking forward to this conversation all week.', 'Cảm ơn Thiên Ân. Tôi đã mong chờ cuộc trò chuyện này cả tuần.'],
        ['So have I, David. Let us start at the beginning: where did you grow up?', 'Tôi cũng vậy, David. Chúng ta bắt đầu từ đầu nhé: anh lớn lên ở đâu?'],
        '"So have I" là cách nói "tôi cũng vậy" với thì hiện tại hoàn thành.',
        DAVID,
      ),
      grab(
        ['I grew up in a small fishing village. My father repaired boats, and I learned to fix engines before I could read.', 'Tôi lớn lên ở một làng chài nhỏ. Bố tôi sửa thuyền, và tôi biết sửa động cơ trước cả khi biết đọc.'],
        ['A small {fishing} village! And you learned to fix {engines} before you could read?', 'Một làng chài nhỏ! Và anh biết sửa động cơ trước cả khi biết đọc à?'],
        ['farming', 'computers', 'mountain', 'bicycles'],
        'Bắt loại làng và thứ David học sửa đầu tiên.',
        DAVID,
      ),
    ],
  },
];
