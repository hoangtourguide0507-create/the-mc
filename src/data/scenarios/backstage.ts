import { fill, grab, improv, pick, say, type Scenario } from './helpers';

// Hậu trường nhà hát: Sam (âm thanh) và Alex (đạo diễn, hay nói qua in-ear). B1. 4 lượt mỗi bộ.
const INEAR = { who: 'alex', channel: 'inear' } as const;
const ALEX = { who: 'alex' } as const;
const SAM = { who: 'sam' } as const;

export const BACKSTAGE_SCENARIOS: Scenario[] = [
  {
    id: 'backstage-mic-failure',
    title: 'Micro mất tiếng',
    turns: [
      say(
        ['Thien An, I am getting no signal from your mic. Can you check if it is switched on?', 'Thiên Ân, mình không nhận được tín hiệu từ mic của bạn. Bạn xem nó bật chưa?'],
        ['It is switched on, Sam, but the battery light is flashing red.', 'Bật rồi Sam, nhưng đèn pin đang nháy đỏ.'],
        'Mô tả sự cố bằng thì hiện tại tiếp diễn: "is flashing".',
        SAM,
      ),
      grab(
        ['That means the battery is dying. I will bring you a spare mic and fresh batteries in one minute.', 'Vậy là pin sắp hết. Một phút nữa mình mang mic dự phòng và pin mới ra.'],
        ['Thanks, Sam. I will wait for the {spare} mic and the fresh {batteries}.', 'Cảm ơn Sam. Mình chờ mic dự phòng và pin mới.'],
        ['wireless', 'cables', 'broken', 'speakers'],
        'Bắt tính từ chỉ đồ dự phòng và danh từ chỉ pin.',
        SAM,
      ),
      pick(
        ['Alex on in-ear. If the mic dies during the show, do not tap it. Just walk to the lectern and use the wired one.', 'Alex nói qua in-ear. Nếu mic tắt giữa show, đừng gõ vào nó. Cứ bước tới bục và dùng mic có dây.'],
        'Nếu mic tắt giữa show, bạn phải làm gì?',
        ['Understood. I will walk to the lectern and use the wired mic.', 'Rõ. Mình sẽ bước tới bục và dùng mic có dây.'],
        ['Understood. I will tap the mic three times.', 'Understood. I will wait backstage until it works.'],
        'Nghe mệnh lệnh phủ định "do not tap it" rồi mệnh lệnh chính.',
        { ...INEAR, reflex: 15 },
      ),
      improv(
        ['Good. Now imagine the mic just died on stage. Give me one calm sentence to the audience while you change mics.', 'Tốt. Giờ giả sử mic vừa tắt trên sân khấu. Nói một câu thật bình tĩnh với khán giả trong lúc đổi mic.'],
        ['Xin khán giả chờ một chút và giữ không khí vui vẻ.', 'Bắt buộc có lời xin chờ (moment / second / bear with) và giữ tích cực (thank / patience / right back).'],
        [['moment', 'second', 'bear with', 'minute'], ['thank', 'patience', 'right back', 'appreciate']],
        [['ladies and gentlemen', 'everyone'], ['please', 'kindly', 'shortly']],
        'Ladies and gentlemen, please bear with me for just a moment. Thank you for your patience!',
        'Không xin lỗi dài dòng. Một câu ngắn, mỉm cười, rồi tiếp tục.',
        ALEX,
      ),
    ],
  },
  {
    id: 'backstage-schedule-change',
    title: 'Đổi thứ tự chương trình',
    turns: [
      say(
        ['Thien An, change of plan. The dance group is stuck in traffic, so we need to move them.', 'Thiên Ân, đổi kế hoạch. Nhóm nhảy đang kẹt xe nên phải dời tiết mục của họ.'],
        ['No problem, Alex. Where do you want to move them in the running order?', 'Không sao Alex. Anh muốn dời họ tới đâu trong thứ tự chương trình?'],
        '"Running order" là thứ tự các tiết mục. Từ quan trọng của nghề MC.',
        ALEX,
      ),
      grab(
        ['Put the singer first, then the award speech, and the dance group last, right before the finale.', 'Cho ca sĩ lên trước, rồi bài phát biểu trao giải, và nhóm nhảy cuối cùng, ngay trước màn kết.'],
        ['Copy. The {singer} goes first, and the dance group goes {last}.', 'Rõ. Ca sĩ lên đầu, nhóm nhảy lên cuối.'],
        ['speaker', 'second', 'band', 'next'],
        'Bắt tiết mục lên đầu và vị trí mới của nhóm nhảy.',
        ALEX,
      ),
      fill(
        ['Exactly. How will you introduce the singer without making it sound like a last-minute change?', 'Chính xác. Bạn sẽ giới thiệu ca sĩ thế nào để không lộ là đổi phút chót?'],
        ['To ___ our evening, please welcome a truly ___ voice!', 'Để ___ buổi tối của chúng ta, xin chào đón một giọng ca thật sự ___!'],
        [['open', 'begin', 'start', 'kick off'], ['special', 'beautiful', 'amazing', 'powerful']],
        'Giới thiệu như thể đây là kế hoạch từ đầu. Không nhắc tới thay đổi.',
        ALEX,
      ),
      pick(
        ['Sam here. With the new order, I need thirty seconds to reset the stage after the singer. Can you fill that time?', 'Sam đây. Với thứ tự mới, mình cần ba mươi giây để dọn sân khấu sau ca sĩ. Bạn lấp khoảng đó được không?'],
        'Sam cần bạn làm gì?',
        ['Sure, I will talk to the audience for thirty seconds while you reset.', 'Được, mình sẽ trò chuyện với khán giả ba mươi giây trong lúc bạn dọn.'],
        ['Sure, I will help you carry the speakers.', 'Sure, I will sing for thirty minutes.'],
        '"Fill the time" là nói lấp thời gian trống trên sân khấu.',
        SAM,
      ),
    ],
  },
  {
    id: 'backstage-name-check',
    title: 'Kiểm tra cách đọc tên khách mời',
    turns: [
      say(
        ['Before we start, let us check the guest names. Mistakes with names are the worst kind.', 'Trước khi bắt đầu, mình rà tên khách mời nhé. Đọc sai tên là lỗi tệ nhất.'],
        ['I agree. Could you help me with the pronunciation of the chairwoman\'s name?', 'Mình đồng ý. Anh giúp mình cách phát âm tên bà chủ tịch được không?'],
        '"Pronunciation" có trọng âm ở -A-: pro-nun-ci-A-tion.',
        ALEX,
      ),
      grab(
        ['It is Victoria Ashworth. Stress the first part: ASH-worth. And her title is Chairwoman, not President.', 'Là Victoria Ashworth. Nhấn âm đầu: ASH-worth. Và chức danh là Chairwoman, không phải President.'],
        ['Got it. {Chairwoman} Victoria {Ashworth}. Is that right?', 'Rõ. Chủ tịch Victoria Ashworth. Vậy đúng chưa?'],
        ['President', 'Ashford', 'Director', 'Ashley'],
        'Bắt đúng chức danh và họ. Đây là hai thứ MC không được phép sai.',
        ALEX,
      ),
      pick(
        ['Perfect. One more thing: the sponsor is "Greenleaf Energy". Say the full name every time, never just "Greenleaf".', 'Chuẩn. Một việc nữa: nhà tài trợ là "Greenleaf Energy". Lần nào cũng đọc đủ tên, đừng chỉ nói "Greenleaf".'],
        'Bạn phải gọi tên nhà tài trợ thế nào?',
        ['Greenleaf Energy, the full name, every time.', 'Greenleaf Energy, đủ tên, lần nào cũng vậy.'],
        ['Just Greenleaf, to save time.', 'Green Energy, because it is shorter.'],
        'Nghe "full name every time" và "never just".',
        ALEX,
      ),
      improv(
        ['Now practice. Welcome Chairwoman Victoria Ashworth to the stage in one warm sentence.', 'Giờ tập thử. Mời Chủ tịch Victoria Ashworth lên sân khấu bằng một câu ấm áp.'],
        ['Mời Chủ tịch lên sân khấu, đọc đúng chức danh và tên.', 'Bắt buộc có chức danh và tên (chairwoman / Victoria / Ashworth) và lời mời (welcome / stage / applause).'],
        [['chairwoman', 'victoria', 'ashworth'], ['welcome', 'stage', 'applause', 'join me']],
        [['ladies and gentlemen', 'honor', 'pleasure'], ['warm', 'big', 'round']],
        'Ladies and gentlemen, please join me in giving a warm welcome to Chairwoman Victoria Ashworth!',
        'Ngắt nhẹ trước tên, rồi lên giọng ở họ để khán giả vỗ tay.',
        ALEX,
      ),
    ],
  },
  {
    id: 'backstage-lighting-cues',
    title: 'Khớp tín hiệu ánh sáng',
    turns: [
      say(
        ['Thien An, let us run the lighting cues. Where will you stand for the opening?', 'Thiên Ân, mình chạy thử tín hiệu ánh sáng nhé. Mở màn bạn đứng ở đâu?'],
        ['I will stand at center stage, just behind the white tape mark.', 'Mình sẽ đứng giữa sân khấu, ngay sau vạch băng dính trắng.'],
        '"Center stage" là chính giữa sân khấu. "Mark" là điểm đánh dấu vị trí đứng.',
        SAM,
      ),
      grab(
        ['Good. The spotlight comes on when you say "good evening", and the house lights go down at the same time.', 'Tốt. Đèn rọi bật khi bạn nói "good evening", và đèn khán phòng tắt cùng lúc đó.'],
        ['So the {spotlight} comes on, and the {house} lights go down.', 'Vậy là đèn rọi bật, còn đèn khán phòng tắt.'],
        ['music', 'stage', 'curtain', 'blue'],
        'Bắt tên hai loại đèn. "House lights" là đèn phía khán giả.',
        SAM,
      ),
      pick(
        ['Alex on in-ear. If I say "stretch", keep talking. If I say "wrap", finish your sentence and move on.', 'Alex qua in-ear. Nếu mình nói "stretch", bạn nói tiếp. Nếu mình nói "wrap", bạn nói hết câu rồi chuyển tiết mục.'],
        'Khi nghe "wrap", bạn làm gì?',
        ['I finish my sentence and move on to the next part.', 'Mình nói hết câu rồi chuyển sang phần tiếp theo.'],
        ['I keep talking until you say stop.', 'I leave the stage immediately.'],
        '"Stretch" là kéo dài, "wrap" là kết thúc. Hai lệnh in-ear phổ biến nhất.',
        { ...INEAR, reflex: 15 },
      ),
      fill(
        ['Last check. If the lights fail completely, what do you tell the audience?', 'Kiểm tra cuối. Nếu đèn tắt hẳn, bạn nói gì với khán giả?'],
        ['Please stay in your ___. Our team will have the lights back ___.', 'Xin quý vị ngồi yên tại ___. Đội kỹ thuật sẽ bật đèn lại ___.'],
        [['seats', 'places', 'chairs'], ['shortly', 'in a moment', 'very soon', 'right away']],
        'An toàn trước hết: yêu cầu khán giả ngồi yên, nói bằng giọng chắc chắn.',
        ALEX,
      ),
    ],
  },
  {
    id: 'backstage-timing',
    title: 'Cắt ngắn kịch bản',
    turns: [
      pick(
        ['Bad news. We are starting fifteen minutes late, so I need you to cut three minutes from your opening.', 'Tin không vui. Mình bắt đầu trễ mười lăm phút, nên cần bạn cắt ba phút ở phần mở màn.'],
        'Alex yêu cầu gì?',
        ['Okay, I will cut three minutes from my opening.', 'Được, mình sẽ cắt ba phút ở phần mở màn.'],
        ['Okay, I will start fifteen minutes earlier.', 'Okay, I will add three more minutes.'],
        'Hai con số, hai nghĩa: trễ 15 phút, cắt 3 phút.',
        ALEX,
      ),
      say(
        ['Which part can you drop without hurting the show?', 'Phần nào bạn bỏ được mà không ảnh hưởng tới show?'],
        ['I can skip the long story and go straight to the sponsor thanks.', 'Mình có thể bỏ câu chuyện dài và vào thẳng phần cảm ơn nhà tài trợ.'],
        '"Go straight to" là đi thẳng vào. "Skip" là bỏ qua.',
        ALEX,
      ),
      grab(
        ['Agreed. But keep the safety announcement and the welcome for the guest of honor. Those are essential.', 'Đồng ý. Nhưng giữ thông báo an toàn và lời chào khách danh dự. Hai phần đó bắt buộc.'],
        ['Understood. I will keep the {safety} announcement and the welcome for the guest of {honor}.', 'Rõ. Mình giữ thông báo an toàn và lời chào khách danh dự.'],
        ['weather', 'sponsor', 'parking', 'house'],
        'Bắt hai phần Alex nói là bắt buộc giữ.',
        ALEX,
      ),
      improv(
        ['Good. Give me the new short opening: welcome everyone and thank the sponsor in one breath.', 'Tốt. Cho mình nghe phần mở màn rút gọn: chào mọi người và cảm ơn nhà tài trợ trong một hơi.'],
        ['Chào khán giả và cảm ơn nhà tài trợ thật ngắn gọn.', 'Bắt buộc có lời chào (welcome / good evening) và lời cảm ơn nhà tài trợ (thank / sponsor / support).'],
        [['welcome', 'good evening'], ['thank', 'sponsor', 'support', 'grateful']],
        [['ladies and gentlemen', 'everyone'], ['tonight', 'wonderful', 'possible']],
        'Good evening and welcome, everyone! A big thank you to our sponsor for making tonight possible.',
        'Ngắn không có nghĩa là vội. Vẫn ngắt nghỉ sau lời chào.',
        ALEX,
      ),
    ],
  },
  {
    id: 'backstage-nervous-speaker',
    title: 'Trấn an diễn giả hồi hộp',
    turns: [
      say(
        ['Thien An, I have never spoken in front of five hundred people. My hands are shaking.', 'Thiên Ân, tôi chưa bao giờ nói trước năm trăm người. Tay tôi đang run.'],
        ['That is completely normal, David. Take a slow, deep breath with me.', 'Chuyện đó hoàn toàn bình thường, David. Hít một hơi thật sâu, thật chậm cùng tôi nào.'],
        'Giọng trầm, chậm. "Completely normal" giúp người nghe yên tâm.',
        { who: 'david' },
      ),
      fill(
        ['Thank you. What should I do if I forget my words in the middle?', 'Cảm ơn bạn. Nếu giữa chừng tôi quên lời thì nên làm gì?'],
        ['Just ___, look at your notes, and ___. Nobody will notice.', 'Cứ ___, nhìn vào ghi chú, rồi ___. Sẽ không ai để ý đâu.'],
        [['pause', 'stop', 'smile', 'breathe'], ['continue', 'carry on', 'keep going', 'start again']],
        '"Nobody will notice" là câu trấn an rất hiệu quả.',
        { who: 'david' },
      ),
      grab(
        ['That helps. And when I finish, where do I go? Alex said something about the left side and a blue door.', 'Nghe vậy đỡ hẳn. Còn khi nói xong tôi đi đâu? Alex có nói gì đó về phía bên trái và một cánh cửa xanh dương.'],
        ['When you finish, walk off to the {left} and go through the {blue} door. I will be waiting there.', 'Khi xong, anh đi ra bên trái và qua cánh cửa xanh dương. Tôi sẽ chờ ở đó.'],
        ['right', 'red', 'back', 'green'],
        'Bắt hướng đi và màu cửa, rồi nhắc lại rõ ràng để David yên tâm.',
        { who: 'david' },
      ),
      pick(
        ['Alex on in-ear. Is David ready? We go live in two minutes, and I need a yes or a no.', 'Alex qua in-ear. David sẵn sàng chưa? Hai phút nữa lên sóng, mình cần câu trả lời có hoặc không.'],
        'Alex cần gì ngay lúc này?',
        ['Yes, he is ready. We are good to go in two minutes.', 'Rồi, anh ấy sẵn sàng. Hai phút nữa bắt đầu được.'],
        ['He is the CEO of a technology company.', 'Maybe, I will tell you after the show.'],
        'Đạo diễn cần câu trả lời dứt khoát: yes hoặc no.',
        { ...INEAR, reflex: 15 },
      ),
    ],
  },
  {
    id: 'backstage-walkthrough',
    title: 'Đi vị trí sân khấu',
    turns: [
      say(
        ['Let us do the stage walkthrough. You enter from stage left when the music starts.', 'Mình đi vị trí sân khấu nhé. Bạn vào từ cánh gà trái khi nhạc nổi lên.'],
        ['Okay. I enter from stage left when the music starts. How many steps to the center?', 'Được. Mình vào từ cánh gà trái khi nhạc nổi. Tới giữa sân khấu là mấy bước?'],
        '"Stage left" là bên trái của người đứng trên sân khấu nhìn xuống khán giả.',
        ALEX,
      ),
      grab(
        ['About eight steps. Stop at the yellow cross, then turn to face camera two.', 'Khoảng tám bước. Dừng ở dấu chéo vàng, rồi quay mặt về máy quay số hai.'],
        ['Eight steps, stop at the {yellow} cross, and face camera {two}.', 'Tám bước, dừng ở dấu chéo vàng, và hướng về máy quay số hai.'],
        ['red', 'one', 'white', 'three'],
        'Bắt màu của dấu vị trí và số máy quay.',
        ALEX,
      ),
      pick(
        ['Careful: there is a cable across the floor near the stairs. It is taped down, but watch your step in those shoes.', 'Cẩn thận: có sợi cáp nằm ngang sàn gần cầu thang. Đã dán băng dính, nhưng đi giày đó thì nhìn đường nhé.'],
        'Sam cảnh báo điều gì?',
        ['Thanks for the warning. I will watch my step near the stairs.', 'Cảm ơn đã nhắc. Mình sẽ cẩn thận bước gần cầu thang.'],
        ['Thanks, I will buy new shoes after the show.', 'Thanks, I will take the cable home.'],
        '"Watch your step" là coi chừng bước chân.',
        SAM,
      ),
      fill(
        ['One last thing. At the end, how do you close the show?', 'Một việc cuối. Kết show bạn nói thế nào?'],
        ['Thank you all for ___ us tonight. Have a ___ evening!', 'Cảm ơn tất cả quý vị đã ___ cùng chúng tôi tối nay. Chúc quý vị một buổi tối ___!'],
        [['joining', 'being with', 'spending time with'], ['wonderful', 'safe', 'lovely', 'great']],
        'Sau "thank you for" dùng động từ thêm -ing: for joining.',
        ALEX,
      ),
    ],
  },
];
