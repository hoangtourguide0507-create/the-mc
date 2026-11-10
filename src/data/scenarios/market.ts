import { fill, grab, pick, say, type Scenario } from './helpers';

// Siêu thị FreshMart, nhân viên Tom (A2). 5 lượt mỗi bộ.
export const MARKET_SCENARIOS: Scenario[] = [
  {
    id: 'market-return',
    title: 'Đổi trả hàng',
    turns: [
      say(
        ['Hi there! How can I help you today?', 'Chào bạn! Mình giúp gì được cho bạn?'],
        ['Hello! I would like to return this bottle of honey. The lid is broken.', 'Chào bạn! Mình muốn trả lại hũ mật ong này. Nắp bị vỡ rồi.'],
        '"I would like to return ..." là mẫu câu trả hàng lịch sự.',
      ),
      pick(
        ['I am sorry about that. Do you have the receipt with you?', 'Rất tiếc về chuyện đó. Bạn có mang hóa đơn không?'],
        'Tom cần bạn đưa gì?',
        ['Yes, here is my receipt. I bought it yesterday.', 'Có, hóa đơn của mình đây. Mình mua hôm qua.'],
        ['Yes, here is my recipe for honey cake.', 'No, I do not want to receive anything.'],
        '"Receipt" (hóa đơn) phát âm /rɪˈsiːt/, chữ p câm. Đừng nhầm với "recipe".',
      ),
      grab(
        ['Thank you. Would you like a refund, or would you prefer to exchange it for a new one?', 'Cảm ơn bạn. Bạn muốn hoàn tiền, hay muốn đổi hũ mới?'],
        ['I would prefer to {exchange} it for a {new} one, please.', 'Mình muốn đổi hũ mới nhé.'],
        ['refund', 'old', 'sell', 'big'],
        'Tom đưa hai lựa chọn. Bắt động từ và tính từ của lựa chọn đổi hàng.',
      ),
      fill(
        ['No problem. Please wait here, and I will bring a new bottle from the shelf.', 'Không vấn đề gì. Bạn chờ ở đây, mình lấy hũ mới trên kệ.'],
        ['Thank you, that is very ___. I will ___ right here.', 'Cảm ơn bạn, bạn thật ___. Mình sẽ ___ ngay đây.'],
        [['helpful', 'kind', 'quick', 'nice'], ['wait', 'stay', 'stand']],
        'Khen nhân viên bằng tính từ: helpful, kind.',
      ),
      say(
        ['Excuse me, dear. Is this the line for returns? My eyes are not so good.', 'Xin lỗi cháu. Đây có phải hàng chờ đổi trả không? Mắt bà kém lắm.'],
        ['Yes, ma\'am, this is the returns counter. You can go after me.', 'Dạ đúng, đây là quầy đổi trả. Bà vào sau cháu ạ.'],
        '"Returns counter" là quầy đổi trả hàng.',
        { who: 'grandma' },
      ),
    ],
  },
  {
    id: 'market-self-checkout',
    title: 'Máy tự thanh toán báo lỗi',
    turns: [
      say(
        ['I heard the machine beeping. Is everything all right over here?', 'Mình nghe máy kêu bíp. Bên này ổn cả chứ?'],
        ['Not really. The machine will not scan my bananas.', 'Không ổn lắm. Máy không chịu quét nải chuối của mình.'],
        '"Will not" ở đây nghĩa là máy không chịu hoạt động.',
      ),
      grab(
        ['Fruit has no barcode. You need to press the fruit button, then put it on the scale.', 'Trái cây không có mã vạch. Bạn phải bấm nút trái cây, rồi đặt lên cân.'],
        ['I see. So I press the {fruit} button and put the bananas on the {scale}.', 'Ra vậy. Mình bấm nút trái cây rồi đặt chuối lên cân.'],
        ['help', 'bag', 'green', 'floor'],
        'Bắt tên nút cần bấm và nơi đặt chuối.',
      ),
      pick(
        ['That is it! Now, do you have a member card? You get five percent off today.', 'Đúng rồi! Giờ bạn có thẻ thành viên không? Hôm nay được giảm năm phần trăm.'],
        'Thẻ thành viên được ưu đãi gì hôm nay?',
        ['Yes, here is my card. Five percent off sounds great.', 'Có, thẻ của mình đây. Giảm năm phần trăm thì tuyệt.'],
        ['No, I do not want to pay five dollars for a card.', 'Yes, I will take five bananas, please.'],
        'Nghe "five percent off": giảm 5%, không phải 5 đô.',
      ),
      fill(
        ['All done. Your total is twelve dollars. Cash or card?', 'Xong rồi. Tổng cộng mười hai đô. Tiền mặt hay thẻ?'],
        ['I will pay by ___. Could I have a ___, please?', 'Mình trả bằng ___. Cho mình xin ___ nhé?'],
        [['card', 'cash', 'phone'], ['receipt', 'paper bag', 'small bag']],
        '"Pay by card" nhưng "pay in cash". Cả hai đều được chấp nhận ở đây.',
      ),
      say(
        ['Mister, can I press the button for you? I like pressing buttons!', 'Chú ơi, cháu bấm nút giúp chú được không? Cháu thích bấm nút lắm!'],
        ['Sure! Press the big green one that says "Finish".', 'Được chứ! Cháu bấm nút xanh to có chữ "Finish" nhé.'],
        'Câu mệnh lệnh ngắn: "Press the big green one".',
        { who: 'boy' },
      ),
    ],
  },
  {
    id: 'market-recipe-help',
    title: 'Hỏi nguyên liệu nấu ăn',
    turns: [
      say(
        ['Good afternoon! You look a little lost. Can I help you find something?', 'Chào buổi chiều! Trông bạn hơi lúng túng. Mình giúp bạn tìm gì nhé?'],
        ['Yes, please. I want to cook chicken soup, but I do not know what I need.', 'Vâng, nhờ bạn. Mình muốn nấu súp gà nhưng không biết cần những gì.'],
        'Nối hai ý bằng "but" và hạ giọng ở cuối câu.',
      ),
      grab(
        ['Easy! You need chicken, carrots, onions, and fresh ginger. The vegetables are in aisle two.', 'Dễ thôi! Bạn cần gà, cà rốt, hành tây và gừng tươi. Rau củ ở dãy số hai.'],
        ['So I need {carrots}, onions, and fresh {ginger}. Got it!', 'Vậy mình cần cà rốt, hành tây và gừng tươi. Rõ rồi!'],
        ['potatoes', 'garlic', 'tomatoes', 'pepper'],
        'Bắt hai nguyên liệu trong danh sách Tom đọc.',
      ),
      pick(
        ['The chicken is at the meat counter at the back. Do you want a whole chicken or just the breast?', 'Gà ở quầy thịt phía cuối. Bạn muốn nguyên con hay chỉ ức gà?'],
        'Tom hỏi bạn chọn gì?',
        ['Just the breast, please. I am only cooking for one.', 'Chỉ ức gà thôi. Mình nấu cho một người.'],
        ['The back of the store is too far for me.', 'Yes, I would like the whole supermarket.'],
        '"Whole chicken" là gà nguyên con, "breast" là ức gà.',
      ),
      fill(
        ['Good choice. How much do you need? We sell it by weight.', 'Chọn hợp lý đấy. Bạn cần bao nhiêu? Bên mình bán theo cân.'],
        ['About ___ grams, please. And could you ___ it for me?', 'Khoảng ___ gam nhé. Và bạn ___ giúp mình được không?'],
        [['five hundred', 'three hundred', 'four hundred'], ['cut', 'slice', 'wrap', 'weigh']],
        'Nói số lượng: "five hundred grams". Nhờ việc: "Could you ... it for me?".',
      ),
      say(
        ['Chicken soup? I have made it for fifty years. Do not forget a pinch of salt!', 'Súp gà à? Bà nấu món đó năm mươi năm rồi. Đừng quên một nhúm muối nhé!'],
        ['Thank you, ma\'am! A pinch of salt. I will remember that.', 'Cảm ơn bà! Một nhúm muối. Cháu sẽ nhớ ạ.'],
        '"A pinch of salt" là một nhúm muối.',
        { who: 'grandma' },
      ),
    ],
  },
  {
    id: 'market-price-check',
    title: 'Giá trên kệ khác giá tính tiền',
    turns: [
      say(
        ['That will be eighteen dollars and forty cents, please.', 'Của bạn hết mười tám đô bốn mươi xu.'],
        ['Excuse me, I think the price is wrong. The sign said the tea was on sale.', 'Xin lỗi, mình nghĩ giá bị sai. Bảng ghi trà đang giảm giá mà.'],
        '"On sale" là đang giảm giá. Góp ý bằng "I think ..." cho nhẹ nhàng.',
      ),
      pick(
        ['Let me check. Which tea was it, and what price did the sign show?', 'Để mình kiểm tra. Loại trà nào, và bảng ghi giá bao nhiêu?'],
        'Tom cần biết hai thông tin gì?',
        ['The green tea. The sign said three dollars, not five.', 'Trà xanh. Bảng ghi ba đô, không phải năm.'],
        ['I usually drink tea at three in the afternoon.', 'The sign is next to the front door.'],
        'Tom hỏi "which tea" và "what price".',
      ),
      grab(
        ['You are right, the sale price is three dollars. I will fix it and take two dollars off your total.', 'Bạn nói đúng, giá khuyến mãi là ba đô. Mình sửa lại và trừ hai đô vào tổng.'],
        ['Thanks for checking. So you will take {two} dollars off my {total}?', 'Cảm ơn bạn đã kiểm tra. Vậy bạn trừ hai đô vào tổng của mình nhé?'],
        ['three', 'five', 'card', 'bag'],
        'Bắt số tiền được trừ và từ chỉ tổng hóa đơn.',
      ),
      fill(
        ['Exactly. Your new total is sixteen forty. Sorry for the trouble!', 'Chính xác. Tổng mới là mười sáu đô bốn mươi. Xin lỗi vì sự phiền phức!'],
        ['No ___ at all. Thank you for being so ___.', 'Không ___ gì đâu. Cảm ơn bạn vì đã rất ___.'],
        [['problem', 'trouble', 'worries'], ['honest', 'helpful', 'quick', 'patient']],
        '"No problem at all" để đáp lại lời xin lỗi.',
      ),
      say(
        ['Young man, is the green tea really three dollars? I will buy two boxes then!', 'Này cậu, trà xanh giá ba đô thật à? Vậy tôi mua hai hộp!'],
        ['Yes, sir, it is on sale today. It is in aisle five.', 'Vâng thưa bác, hôm nay đang giảm giá. Ở dãy số năm ạ.'],
        'Chỉ đường trong siêu thị: "It is in aisle five". Chữ s trong "aisle" câm.',
        { who: 'grandpa' },
      ),
    ],
  },
  {
    id: 'market-lost-child',
    title: 'Em bé đi lạc',
    turns: [
      say(
        ['Mister, I cannot find my mum. She was next to the apples.', 'Chú ơi, cháu không tìm thấy mẹ. Mẹ cháu vừa ở chỗ táo mà.'],
        ['Do not worry, I will help you. What is your name?', 'Đừng lo, chú sẽ giúp cháu. Cháu tên gì?'],
        'Nói chậm và dịu để trấn an. "Do not worry" đọc rõ từng từ.',
        { who: 'girl' },
      ),
      grab(
        ['My name is Mia. My mum has a red jacket and a yellow bag.', 'Cháu tên Mia. Mẹ cháu mặc áo khoác đỏ và mang túi vàng.'],
        ['Okay, Mia. We will look for a {red} jacket and a {yellow} bag.', 'Được rồi Mia. Mình sẽ tìm áo khoác đỏ và túi vàng nhé.'],
        ['blue', 'green', 'black', 'pink'],
        'Bắt hai màu sắc bé vừa tả.',
        { who: 'girl' },
      ),
      say(
        ['Hi, is everything okay? Is this little girl with you?', 'Chào bạn, có chuyện gì không? Bé gái này đi cùng bạn à?'],
        ['No, she is lost. Could you make an announcement for her mother?', 'Không, bé bị lạc. Bạn phát loa tìm mẹ bé giúp được không?'],
        '"Make an announcement" là phát thông báo. Đây cũng là việc của MC!',
      ),
      pick(
        ['Of course. I need her name and what her mother is wearing.', 'Tất nhiên. Mình cần tên bé và mẹ bé mặc gì.'],
        'Tom cần biết gì để phát loa?',
        ['Her name is Mia, and her mother is wearing a red jacket.', 'Bé tên Mia, và mẹ bé mặc áo khoác đỏ.'],
        ['She is wearing small shoes and she is five.', 'My name is Thien An and I am wearing a suit.'],
        'Tom hỏi tên bé ("her name") và trang phục của mẹ ("her mother").',
      ),
      fill(
        ['Thank you. I will announce it now. Can you stay with her at the service desk?', 'Cảm ơn bạn. Mình phát loa ngay. Bạn ở lại với bé tại quầy dịch vụ được không?'],
        ['Sure, I will ___ with Mia until her mother ___.', 'Được, mình sẽ ___ với Mia cho tới khi mẹ bé ___.'],
        [['stay', 'wait', 'sit'], ['comes', 'arrives', 'gets here']],
        'Sau "until" dùng thì hiện tại đơn: until her mother comes.',
      ),
    ],
  },
  {
    id: 'market-closing-time',
    title: 'Sắp đóng cửa',
    turns: [
      pick(
        ['Attention shoppers: the store will close in fifteen minutes. Please bring your items to the checkout.', 'Quý khách chú ý: cửa hàng sẽ đóng cửa sau mười lăm phút nữa. Xin mang hàng ra quầy thanh toán.'],
        'Thông báo vừa nói gì?',
        ['I should hurry. The store closes in fifteen minutes.', 'Mình phải nhanh lên. Cửa hàng đóng cửa sau mười lăm phút.'],
        ['Good, the store opens in fifteen minutes.', 'I have fifty minutes to finish shopping.'],
        'Phân biệt "fifteen" (15) và "fifty" (50): trọng âm rơi vào -TEEN.',
      ),
      say(
        ['Hi! We are closing soon. Is there anything I can help you find quickly?', 'Chào bạn! Bên mình sắp đóng cửa. Bạn cần tìm gì gấp không?'],
        ['Yes, please! Where can I find bottled water and throat lozenges?', 'Có ạ! Nước đóng chai và kẹo ngậm ho ở đâu vậy?'],
        '"Where can I find ...?" là câu hỏi vị trí thông dụng nhất trong cửa hàng.',
      ),
      grab(
        ['Water is in aisle seven, on the bottom shelf. Lozenges are at the pharmacy counter near the exit.', 'Nước ở dãy bảy, kệ dưới cùng. Kẹo ngậm ở quầy thuốc gần lối ra.'],
        ['Water in aisle {seven}, and lozenges at the {pharmacy} counter. Thanks!', 'Nước ở dãy bảy, kẹo ngậm ở quầy thuốc. Cảm ơn bạn!'],
        ['eleven', 'bakery', 'four', 'service'],
        'Bắt số dãy và tên quầy.',
      ),
      fill(
        ['You are welcome. The express lane is still open if you have fewer than ten items.', 'Không có gì. Quầy nhanh vẫn mở nếu bạn có ít hơn mười món.'],
        ['Great, I only have ___ items. I will use the ___ lane.', 'Tuyệt, mình chỉ có ___ món. Mình sẽ dùng quầy ___.'],
        [['two', 'three', 'four', 'five'], ['express', 'fast', 'quick']],
        '"Express lane" là quầy tính tiền nhanh cho ít món.',
      ),
      say(
        ['Slow down, young man! The store will not run away.', 'Từ từ thôi cậu trẻ! Cửa hàng có chạy mất đâu.'],
        ['Sorry, sir! I am in a hurry because I have a show tonight.', 'Xin lỗi bác! Cháu đang vội vì tối nay có show.'],
        '"I am in a hurry" là mình đang vội. Dùng "because" để nêu lý do.',
        { who: 'grandpa' },
      ),
    ],
  },
  {
    id: 'market-gift',
    title: 'Chọn quà cảm ơn',
    turns: [
      say(
        ['Hello again! Shopping for something special today?', 'Chào bạn lần nữa! Hôm nay mua gì đặc biệt à?'],
        ['Yes, I am looking for a thank-you gift for my sound engineer.', 'Ừ, mình đang tìm quà cảm ơn cho anh kỹ thuật âm thanh.'],
        '"I am looking for ..." là mẫu câu khi đi mua sắm.',
      ),
      pick(
        ['Nice idea! What does he like? Something sweet, or something to drink?', 'Ý hay đấy! Anh ấy thích gì? Đồ ngọt, hay đồ uống?'],
        'Tom hỏi gì?',
        ['He loves coffee, so maybe something to drink.', 'Anh ấy mê cà phê, nên có lẽ là đồ uống.'],
        ['I like sweet things, especially ice cream.', 'He is tall and he wears glasses.'],
        '"What does he like?" hỏi sở thích, không phải ngoại hình ("What does he look like?").',
      ),
      grab(
        ['Then I recommend this gift box. It has dark roast coffee, a mug, and some chocolate cookies.', 'Vậy mình gợi ý hộp quà này. Có cà phê rang đậm, một cái cốc, và ít bánh quy sô-cô-la.'],
        ['A gift box with {coffee}, a {mug}, and cookies sounds perfect.', 'Hộp quà có cà phê, cốc và bánh quy thì quá hợp.'],
        ['tea', 'spoon', 'candle', 'plate'],
        'Bắt hai món trong hộp quà.',
      ),
      fill(
        ['It is twenty-five dollars. Would you like me to gift-wrap it?', 'Giá hai mươi lăm đô. Bạn có muốn mình gói quà không?'],
        ['Yes, please. Could you add a ___ ___ as well?', 'Có, nhờ bạn. Bạn thêm một ___ ___ nữa được không?'],
        [['small', 'nice', 'simple'], ['card', 'ribbon', 'bow']],
        '"As well" đặt cuối câu, nghĩa là "nữa, thêm vào đó".',
      ),
      say(
        ['Is that a present? Is it for me? It is my birthday next week!', 'Quà hả chú? Cho cháu hả? Tuần sau sinh nhật cháu đó!'],
        ['Not this one, sorry! But happy early birthday to you!', 'Cái này thì không, xin lỗi cháu! Nhưng chúc mừng sinh nhật sớm nhé!'],
        '"Happy early birthday" là chúc mừng sinh nhật sớm.',
        { who: 'boy' },
      ),
    ],
  },
  {
    id: 'market-allergy',
    title: 'Hỏi thành phần món ăn',
    turns: [
      say(
        ['Would you like to try a free sample? It is our new energy bar.', 'Bạn có muốn thử mẫu miễn phí không? Đây là thanh năng lượng mới của bên mình.'],
        ['Thank you, but first, could you tell me what is in it?', 'Cảm ơn bạn, nhưng trước hết cho mình hỏi trong đó có gì?'],
        '"What is in it?" là cách hỏi thành phần đơn giản nhất.',
      ),
      grab(
        ['Sure. It has oats, honey, dried mango, and peanuts. No added sugar.', 'Được chứ. Có yến mạch, mật ong, xoài sấy và đậu phộng. Không thêm đường.'],
        ['Oh, it has {peanuts}? I cannot eat those. But I do like dried {mango}.', 'Ồ, có đậu phộng à? Mình không ăn được. Nhưng mình thích xoài sấy.'],
        ['almonds', 'apple', 'milk', 'banana'],
        'Bắt loại hạt và loại trái cây sấy trong danh sách.',
      ),
      pick(
        ['No problem. We also have a nut-free bar with coconut. It is on the second shelf, in the blue box.', 'Không sao. Bên mình còn loại không có hạt, vị dừa. Ở kệ thứ hai, trong hộp xanh dương.'],
        'Thanh không hạt nằm ở đâu?',
        ['On the second shelf, in the blue box. I will try that one.', 'Ở kệ thứ hai, trong hộp xanh dương. Mình sẽ thử loại đó.'],
        ['In the second aisle, next to the blue door.', 'On the top shelf, in the red box.'],
        'Nghe kỹ "second shelf" và "blue box".',
      ),
      fill(
        ['Here, try a piece. What do you think?', 'Đây, bạn thử một miếng. Bạn thấy sao?'],
        ['It is really ___! I will take ___ bars, please.', 'Thật sự ___! Cho mình lấy ___ thanh nhé.'],
        [['tasty', 'good', 'delicious', 'nice'], ['three', 'two', 'four', 'five']],
        'Khen món ăn: tasty, delicious.',
      ),
      say(
        ['Are those bars good for old teeth, dear? I cannot chew hard things.', 'Mấy thanh đó có hợp với răng người già không cháu? Bà không nhai được đồ cứng.'],
        ['They are quite soft, ma\'am. I think you will like them.', 'Chúng khá mềm bà ạ. Cháu nghĩ bà sẽ thích.'],
        '"Quite soft" là khá mềm. "Quite" đứng trước tính từ.',
        { who: 'grandma' },
      ),
    ],
  },
];
