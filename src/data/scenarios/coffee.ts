import { fill, grab, pick, say, type Scenario } from './helpers';

// Quán cà phê của Leo (A2). 5 lượt mỗi bộ. Người chơi là khách quen.
export const COFFEE_SCENARIOS: Scenario[] = [
  {
    id: 'coffee-wrong-order',
    title: 'Nhận nhầm món',
    turns: [
      say(
        ['Here you go, Thien An! One hot cappuccino with extra foam.', 'Của bạn đây, Thiên Ân! Một cappuccino nóng, thêm bọt sữa.'],
        ['Sorry, Leo, I think there is a mistake. I ordered an iced latte.', 'Xin lỗi Leo, hình như có nhầm lẫn. Mình gọi latte đá mà.'],
        'Mở đầu bằng "Sorry" và "I think" để góp ý nhẹ nhàng, không trách móc.',
      ),
      grab(
        ['Oh no, my mistake! Was that an iced latte with oat milk or almond milk?', 'Ôi, lỗi của mình! Bạn gọi latte đá với sữa yến mạch hay sữa hạnh nhân nhỉ?'],
        ['It was an {iced} latte with {oat} milk, please.', 'Latte đá với sữa yến mạch nhé.'],
        ['hot', 'soy', 'almond', 'coconut'],
        'Leo nêu hai loại sữa. Bắt đúng loại bạn đã gọi.',
      ),
      pick(
        ['I will remake it right away. It takes about three minutes. Can you wait, or are you in a hurry?', 'Mình làm lại ngay. Mất khoảng ba phút. Bạn chờ được không, hay đang vội?'],
        'Leo hỏi gì? Chọn câu trả lời phù hợp.',
        ['No problem, I can wait three minutes. Thank you for fixing it.', 'Không sao, mình chờ ba phút được. Cảm ơn bạn đã làm lại.'],
        ['Yes, I would like three cappuccinos, please.', 'It is on the third floor, next to the lift.'],
        'Nghe cụm "Can you wait" và "three minutes".',
      ),
      fill(
        ['Here is your iced oat latte. And this cookie is on the house, to say sorry!', 'Latte yến mạch đá của bạn đây. Bánh quy này quán tặng để xin lỗi nhé!'],
        ['That is so ___ of you, Leo! The latte looks ___.', 'Bạn thật ___ quá, Leo! Ly latte trông ___.'],
        [['kind', 'nice', 'sweet', 'thoughtful'], ['perfect', 'great', 'delicious', 'amazing']],
        '"On the house" nghĩa là quán mời, không tính tiền. Hãy cảm ơn thật ấm áp.',
      ),
      say(
        ['Excuse me, is this cappuccino yours? It has been sitting here for a while.', 'Xin lỗi, ly cappuccino này của cậu à? Nó nằm đây một lúc rồi.'],
        ['No, it is not mine, but thank you for asking. Leo made it by mistake.', 'Không, không phải của mình, nhưng cảm ơn anh đã hỏi. Leo pha nhầm đấy.'],
        'Câu phủ định ngắn "it is not mine" đọc rõ chữ "not".',
        { who: 'tom' },
      ),
    ],
  },
  {
    id: 'coffee-sold-out',
    title: 'Hết món quen',
    turns: [
      say(
        ['Morning! Bad news, I am afraid. We have just run out of oat milk.', 'Chào buổi sáng! Có tin không vui rồi. Quán vừa hết sữa yến mạch.'],
        ['Oh, that is a pity. What else do you recommend instead?', 'Ồ, tiếc quá. Vậy bạn gợi ý món gì thay thế?'],
        '"What do you recommend?" là câu hỏi xin gợi ý rất tự nhiên.',
      ),
      grab(
        ['You could try our coconut cold brew. It is smooth, lightly sweet, and very popular this week.', 'Bạn thử cold brew dừa nhé. Vị êm, ngọt nhẹ, và tuần này bán rất chạy.'],
        ['Sounds good! I will try the {coconut} cold brew. Is it very {sweet}?', 'Nghe được đấy! Mình thử cold brew dừa. Nó có ngọt lắm không?'],
        ['caramel', 'vanilla', 'bitter', 'strong'],
        'Bắt tên hương vị và tính từ chỉ vị ngọt mà Leo vừa nói.',
      ),
      pick(
        ['Not too sweet. I can make it with less sugar if you like. Small, medium, or large?', 'Không ngọt lắm đâu. Mình có thể giảm đường nếu bạn muốn. Cỡ nhỏ, vừa hay lớn?'],
        'Leo cần bạn chọn gì?',
        ['A medium one with less sugar, please.', 'Cho mình cỡ vừa, ít đường nhé.'],
        ['I usually wake up at six in the morning.', 'Two tickets for tonight, please.'],
        'Leo hỏi về cỡ ly: small, medium, large.',
      ),
      fill(
        ['Good choice. That will be five fifty. Anything to eat with that?', 'Chọn chuẩn đấy. Hết năm đô rưỡi. Bạn có ăn kèm gì không?'],
        ['Yes, I would like a ___ ___, please.', 'Có, cho mình một ___ ___.'],
        [['warm', 'fresh', 'small', 'toasted'], ['bagel', 'croissant', 'sandwich', 'muffin']],
        'Tính từ đứng trước danh từ: a warm bagel.',
      ),
      say(
        ['Excuse me, young man. Do you know if they still have chamomile tea?', 'Xin lỗi cháu. Cháu có biết quán còn trà hoa cúc không?'],
        ['I am not sure, ma\'am, but let me ask Leo for you.', 'Cháu không chắc ạ, nhưng để cháu hỏi Leo giúp bà.'],
        '"Let me ask ... for you" là cách đề nghị giúp đỡ lịch sự.',
        { who: 'grandma' },
      ),
    ],
  },
  {
    id: 'coffee-loyalty',
    title: 'Thẻ tích điểm và món mới',
    turns: [
      pick(
        ['Hey Thien An! You have nine stamps on your card. One more and your next drink is free!', 'Chào Thiên Ân! Thẻ của bạn có chín dấu rồi. Thêm một dấu nữa là ly kế tiếp miễn phí!'],
        'Leo vừa báo tin gì?',
        ['Great! So after today, my next drink will be free.', 'Tuyệt! Vậy sau hôm nay, ly kế tiếp của mình sẽ miễn phí.'],
        ['Sorry, I lost nine dollars yesterday.', 'I do not need a stamp for my letter.'],
        'Nghe "one more" và "free".',
      ),
      say(
        ['Exactly! By the way, we have a new seasonal drink: the pumpkin spice latte.', 'Chính xác! À, quán có món mới theo mùa: latte bí đỏ gia vị.'],
        ['I have never tried that before. What does it taste like?', 'Mình chưa thử món đó bao giờ. Vị của nó thế nào?'],
        '"I have never tried" dùng thì hiện tại hoàn thành để nói về trải nghiệm.',
      ),
      grab(
        ['It tastes warm and creamy, with a little cinnamon on top. Perfect for a rainy morning.', 'Vị ấm và béo, có chút quế rắc bên trên. Hợp nhất cho buổi sáng mưa.'],
        ['A {creamy} latte with {cinnamon} sounds lovely. I will take one!', 'Latte béo với quế nghe hấp dẫn đấy. Cho mình một ly!'],
        ['spicy', 'chocolate', 'salty', 'ginger'],
        'Bắt tính từ chỉ độ béo và tên gia vị Leo nhắc tới.',
      ),
      fill(
        ['Coming up! Are you drinking it here or taking it away?', 'Có ngay! Bạn uống tại đây hay mang đi?'],
        ['I will ___ it ___, thanks. I have a rehearsal soon.', 'Mình sẽ ___ ___, cảm ơn. Mình sắp có buổi tập.'],
        [['take', 'have', 'drink'], ['away', 'to go', 'here']],
        '"Take away" (Anh) và "to go" (Mỹ) đều là mang đi.',
      ),
      say(
        ['Mister, what is that orange drink? Can I smell it?', 'Chú ơi, ly màu cam đó là gì vậy? Cháu ngửi thử được không?'],
        ['It is a pumpkin spice latte. Sure, but be careful, it is hot!', 'Đây là latte bí đỏ gia vị. Được chứ, nhưng cẩn thận nhé, nóng đấy!'],
        'Nói chậm, vui vẻ với trẻ nhỏ. Nhấn chữ "careful".',
        { who: 'boy' },
      ),
    ],
  },
  {
    id: 'coffee-old-friend',
    title: 'Gặp người quen',
    turns: [
      say(
        ['Thien An? Is that you? We worked together at the beach wedding last month!', 'Thiên Ân? Phải bạn không? Tháng trước mình làm chung đám cưới bãi biển đó!'],
        ['Ivy! What a nice surprise! How have you been?', 'Ivy! Bất ngờ quá! Dạo này bạn thế nào?'],
        '"How have you been?" dùng khi lâu ngày gặp lại, khác với "How are you?".',
        { who: 'ivy' },
      ),
      grab(
        ['Busy but happy! I am planning a garden wedding in June, and I still need a bilingual MC.', 'Bận mà vui! Mình đang lên kế hoạch một đám cưới sân vườn vào tháng Sáu, và vẫn cần MC song ngữ.'],
        ['A {garden} wedding in {June}? I would love to hear more about it.', 'Đám cưới sân vườn vào tháng Sáu à? Mình rất muốn nghe thêm.'],
        ['beach', 'July', 'church', 'May'],
        'Bắt loại đám cưới và tháng tổ chức.',
        { who: 'ivy' },
      ),
      pick(
        ['Are you free on the fourteenth? It is a Saturday evening.', 'Ngày mười bốn bạn rảnh không? Hôm đó là tối thứ Bảy.'],
        'Ivy hỏi gì? Chọn câu đáp hợp lý.',
        ['Let me check my calendar, but I think Saturday evening works.', 'Để mình xem lịch, nhưng mình nghĩ tối thứ Bảy được.'],
        ['Yes, the coffee here is free on Saturdays.', 'I have fourteen brothers and sisters.'],
        '"Are you free on ...?" là hỏi bạn có rảnh không, không phải hỏi về giá.',
        { who: 'ivy' },
      ),
      fill(
        ['Wonderful! Can I get your number, so I can send you the details?', 'Tuyệt quá! Cho mình xin số điện thoại để gửi chi tiết nhé?'],
        ['Of course! I will ___ you my ___ right now.', 'Tất nhiên! Mình sẽ ___ cho bạn ___ ngay bây giờ.'],
        [['send', 'text', 'give'], ['number', 'contact', 'business card']],
        'Dùng "Of course!" để nhận lời một cách nhiệt tình.',
        { who: 'ivy' },
      ),
      say(
        ['One flat white for Ivy, and your usual for Thien An. You two know each other?', 'Một flat white cho Ivy, và món quen cho Thiên Ân. Hai bạn quen nhau à?'],
        ['Yes, we are old colleagues. It is a small world!', 'Ừ, tụi mình là đồng nghiệp cũ. Trái đất tròn thật!'],
        '"It is a small world" là thành ngữ khi tình cờ gặp người quen.',
      ),
    ],
  },
  {
    id: 'coffee-work-table',
    title: 'Xin chỗ ngồi làm việc',
    turns: [
      say(
        ['Good morning! Table for one, or are you waiting for someone?', 'Chào buổi sáng! Bạn ngồi một mình hay đang chờ ai?'],
        ['Just me today. Is there a quiet table where I can work on my script?', 'Hôm nay chỉ mình thôi. Có bàn nào yên tĩnh để mình làm kịch bản không?'],
        '"Is there a ...?" để hỏi có sẵn thứ gì đó không.',
      ),
      grab(
        ['Sure. The corner table by the window is quiet, and there is a power outlet under the seat.', 'Có chứ. Bàn góc cạnh cửa sổ yên tĩnh, và có ổ điện dưới ghế.'],
        ['Perfect, I will take the {corner} table by the {window}.', 'Tuyệt, mình ngồi bàn góc cạnh cửa sổ.'],
        ['round', 'door', 'big', 'counter'],
        'Bắt vị trí bàn: loại bàn và nó ở cạnh cái gì.',
      ),
      pick(
        ['The wifi password is on your receipt. It only works for two hours, then you need a new code.', 'Mật khẩu wifi in trên hóa đơn. Nó chỉ dùng được hai tiếng, sau đó bạn cần mã mới.'],
        'Mật khẩu wifi dùng được bao lâu?',
        ['Two hours is fine. I will ask you for a new code if I stay longer.', 'Hai tiếng là đủ. Nếu ngồi lâu hơn mình sẽ xin mã mới.'],
        ['The password is two, zero, zero, zero.', 'I will pay for the wifi in two hours.'],
        'Nghe "only works for two hours".',
      ),
      fill(
        ['No problem. What are you working on today? Another big event?', 'Không vấn đề gì. Hôm nay bạn làm gì thế? Lại sự kiện lớn à?'],
        ['Yes, I am ___ my script for a ___ this weekend.', 'Ừ, mình đang ___ kịch bản cho một ___ cuối tuần này.'],
        [['writing', 'practicing', 'editing', 'finishing'], ['wedding', 'gala dinner', 'talk show', 'company party']],
        'Thì hiện tại tiếp diễn "I am writing" cho việc đang làm.',
      ),
      say(
        ['Excuse me, is anyone sitting here? Every other table is full.', 'Xin lỗi, chỗ này có ai ngồi chưa? Các bàn khác kín hết rồi.'],
        ['No, please have a seat. I can move my bag for you.', 'Chưa đâu, mời bác ngồi. Để cháu dời túi cho bác.'],
        '"Please have a seat" lịch sự hơn "sit down".',
        { who: 'grandpa' },
      ),
    ],
  },
  {
    id: 'coffee-crew-order',
    title: 'Đặt đồ cho cả ê-kíp',
    turns: [
      say(
        ['Wow, you look busy today! What can I get for you?', 'Chà, hôm nay trông bạn bận ghê! Mình lấy gì cho bạn đây?'],
        ['I need to order drinks for my whole crew. Six drinks to go, please.', 'Mình cần đặt nước cho cả ê-kíp. Sáu ly mang đi nhé.'],
        'Nói rõ số lượng "six drinks" và "to go".',
      ),
      fill(
        ['Six drinks, no problem. What would you like?', 'Sáu ly, không thành vấn đề. Bạn lấy những gì?'],
        ['Three ___ and three ___, please.', 'Ba ___ và ba ___ nhé.'],
        [['iced americanos', 'black coffees', 'cappuccinos', 'cold brews'], ['green teas', 'hot chocolates', 'lattes', 'orange juices']],
        'Danh từ số nhiều thêm "s": three lattes.',
      ),
      grab(
        ['Got it. Do you need a carrier tray? And should I write the names on the cups?', 'Rõ rồi. Bạn có cần khay xách không? Và mình có nên ghi tên lên ly không?'],
        ['Yes, a carrier {tray} would help. No need to write the {names}.', 'Có, cho mình khay xách. Không cần ghi tên đâu.'],
        ['bag', 'box', 'prices', 'numbers'],
        'Leo hỏi hai việc. Bắt hai danh từ chính.',
      ),
      pick(
        ['That is twenty-seven dollars in total. It will be ready in ten minutes.', 'Tổng cộng hai mươi bảy đô. Mười phút nữa sẽ xong.'],
        'Khi nào đồ uống xong?',
        ['Ten minutes is fine. I will wait by the door.', 'Mười phút là ổn. Mình chờ ở gần cửa.'],
        ['Twenty-seven minutes is too long for me.', 'I only have ten dollars with me.'],
        'Phân biệt số tiền (twenty-seven dollars) và thời gian (ten minutes).',
      ),
      say(
        ['Are all those coffees for you, young man? You must be very tired!', 'Ngần ấy cà phê là của cháu hết à? Chắc cháu mệt lắm!'],
        ['No, ma\'am, they are for my team. We have a long rehearsal today.', 'Dạ không, của cả nhóm cháu ạ. Hôm nay tụi cháu tập dài.'],
        'Trả lời vui vẻ, nhấn "for my team".',
        { who: 'grandma' },
      ),
    ],
  },
  {
    id: 'coffee-spill',
    title: 'Lỡ làm đổ nước',
    turns: [
      say(
        ['Careful! Oh no, your coffee is all over the table.', 'Cẩn thận! Ôi không, cà phê đổ hết ra bàn rồi.'],
        ['I am so sorry, Leo! I knocked it over with my elbow.', 'Mình xin lỗi nhiều, Leo! Mình lỡ huých khuỷu tay làm đổ.'],
        '"I am so sorry" mạnh hơn "sorry". "Knock over" là làm đổ.',
      ),
      grab(
        ['Do not worry, it happens every day. I will bring a cloth and some napkins.', 'Đừng lo, ngày nào cũng có chuyện này. Mình mang khăn lau và ít giấy ăn ra.'],
        ['Thank you. Could I have some extra {napkins} and a {cloth}, please?', 'Cảm ơn bạn. Cho mình xin thêm giấy ăn và một cái khăn lau nhé?'],
        ['towels', 'cups', 'spoon', 'plate'],
        'Bắt hai món Leo nói sẽ mang ra.',
      ),
      pick(
        ['Is your laptop okay? Did any coffee get on your script?', 'Laptop của bạn ổn chứ? Cà phê có dính vào kịch bản không?'],
        'Leo lo lắng điều gì?',
        ['The laptop is fine, but my script is a little wet.', 'Laptop không sao, nhưng kịch bản của mình hơi ướt.'],
        ['Yes, I bought this laptop last year.', 'No, I do not drink coffee at night.'],
        'Leo hỏi về "laptop" và "script".',
      ),
      fill(
        ['I can print a new copy for you in the back office. And let me make you another coffee.', 'Mình in bản mới cho bạn ở phòng phía sau được. Và để mình pha cho bạn ly khác.'],
        ['You are a ___, Leo! Please let me ___ for the second coffee.', 'Bạn đúng là ___, Leo! Để mình ___ ly thứ hai nhé.'],
        [['lifesaver', 'hero', 'star', 'good friend'], ['pay', 'pay extra']],
        '"You are a lifesaver" dùng khi ai đó cứu nguy cho mình.',
      ),
      say(
        ['Mister, you spilled it! My mum says I must clean up when I spill.', 'Chú làm đổ rồi kìa! Mẹ cháu bảo làm đổ thì phải tự lau.'],
        ['Your mum is right. Look, I am cleaning it up now!', 'Mẹ cháu nói đúng đấy. Nhìn này, chú đang lau đây!'],
        '"Clean up" là dọn sạch. Giọng vui, không ngại ngùng.',
        { who: 'girl' },
      ),
    ],
  },
  {
    id: 'coffee-sore-throat',
    title: 'Đau họng trước show',
    turns: [
      say(
        ['Morning, Thien An. You sound a bit rough today. Are you okay?', 'Chào Thiên Ân. Hôm nay giọng bạn hơi khàn. Bạn ổn chứ?'],
        ['Not really. I have a sore throat, and I am hosting a show tonight.', 'Không ổn lắm. Mình bị đau họng, mà tối nay lại dẫn show.'],
        '"I have a sore throat" là mẫu câu nói về triệu chứng: I have a + bệnh.',
      ),
      grab(
        ['Then no coffee for you. I suggest hot ginger tea with honey and lemon.', 'Vậy thì không cà phê nhé. Mình gợi ý trà gừng nóng với mật ong và chanh.'],
        ['Good idea. A hot {ginger} tea with {honey}, please.', 'Ý hay đấy. Cho mình trà gừng nóng với mật ong.'],
        ['green', 'milk', 'mint', 'sugar'],
        'Bắt loại trà và thứ pha kèm.',
      ),
      fill(
        ['Here you go. Drink it slowly. What time is your show?', 'Của bạn đây. Uống từ từ nhé. Mấy giờ show bắt đầu?'],
        ['It starts at ___, so I should ___ my voice until then.', 'Show bắt đầu lúc ___, nên mình phải ___ giọng tới lúc đó.'],
        [['seven', 'six thirty', 'eight', 'half past seven'], ['rest', 'save', 'protect']],
        '"Should" + động từ nguyên mẫu để nói điều nên làm.',
      ),
      pick(
        ['Good plan. And try not to whisper. Whispering is actually worse for your voice than speaking softly.', 'Kế hoạch hay. Và cố đừng thì thầm. Thì thầm thật ra hại giọng hơn nói nhỏ.'],
        'Leo khuyên điều gì?',
        ['Really? I did not know that. I will speak softly, not whisper.', 'Thật à? Mình không biết đấy. Mình sẽ nói nhỏ chứ không thì thầm.'],
        ['Okay, I will whisper all day to save my voice.', 'Yes, I will sing loudly before the show.'],
        'Nghe "try not to whisper".',
      ),
      say(
        ['Poor dear, you have a cold? When I was young, we drank warm salt water.', 'Tội cháu, bị cảm à? Hồi bà còn trẻ, mọi người hay uống nước muối ấm.'],
        ['Thank you for the advice, ma\'am. I will try that this afternoon.', 'Cảm ơn lời khuyên của bà ạ. Chiều nay cháu sẽ thử.'],
        '"Thank you for the advice" để cảm ơn một lời khuyên.',
        { who: 'grandma' },
      ),
    ],
  },
];
