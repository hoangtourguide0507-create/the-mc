/**
 * Dịch nối tiếp Việt → Anh: việc thật của MC song ngữ. Mỗi bộ là 5 câu của một người phát biểu;
 * câu tiếng Việt hiện vài giây rồi ẩn, người học nói lại bằng tiếng Anh.
 * Quy ước viết (tests/longturn.test.mjs kiểm):
 * - bản dịch mẫu `say` phải trúng mọi ý của câu; mỗi câu có 2-3 ý
 * - chấm theo ý nên chấp nhận nhiều cách dịch: nhóm từ khoá nên có các từ đồng nghĩa hay gặp
 * - bản dịch mẫu đọc bằng giọng coach (phase `interpret` trong tools/voice-lines.mjs)
 */
import type { InterpSegment, InterpSet } from '../core/longturn';

type IdeaDef = [label: string, need: string[][]];
const seg = (vi: string, say: string, ...ideas: IdeaDef[]): InterpSegment => ({ vi, say, ideas: ideas.map(([label, need]) => ({ label, need })) });

const THANK = ['thank', 'thanks', 'grateful', 'appreciate', 'gratitude'];
const FAMILY = ['family', 'families'];

export const INTERP_SETS: InterpSet[] = [
  {
    id: 'mc-wedding',
    fn: 'open',
    kind: 'Tiệc cưới',
    cefr: 'B1',
    title: 'Tự dịch lời dẫn tiệc cưới',
    brief: 'Bạn dẫn song ngữ: vừa nói xong câu tiếng Việt, bạn nói lại ngay bằng tiếng Anh cho khách nước ngoài.',
    segments: [
      seg('Kính thưa quý vị, xin trân trọng chào mừng quý vị đến với lễ thành hôn của hai bạn Emma và Liam.', 'Ladies and gentlemen, a warm welcome to the wedding of Emma and Liam.', ['Chào mừng', [['welcome']]], ['Lễ cưới của Emma và Liam', [['wedding', 'marriage'], ['emma', 'liam']]]),
      seg('Xin quý vị vui lòng ổn định chỗ ngồi, chương trình sẽ bắt đầu trong ít phút nữa.', 'Please take your seats. The program will begin in a few minutes.', ['Mời ngồi vào chỗ', [['seat', 'seats', 'seated', 'sit']]], ['Sắp bắt đầu', [['begin', 'start'], ['minutes', 'moments', 'shortly', 'soon']]]),
      seg('Thay mặt hai gia đình, xin cảm ơn quý vị đã dành thời gian quý báu đến chung vui.', 'On behalf of both families, thank you for taking the time to celebrate with us.', ['Thay mặt hai gia đình', [['behalf'], FAMILY]], ['Cảm ơn đã đến chung vui', [THANK, ['time', 'coming', 'joining', 'celebrate', 'join', 'here']]]),
      seg('Xin mời quý vị cùng hướng mắt về phía cửa chính để chào đón cô dâu và chú rể.', 'Please turn your eyes to the main door and welcome the bride and groom.', ['Hướng về cửa chính', [['door', 'doors', 'entrance'], ['turn', 'look', 'eyes', 'attention']]], ['Chào đón cô dâu chú rể', [['welcome', 'welcoming', 'applause'], ['bride', 'groom', 'couple', 'newlyweds']]]),
      seg('Kính chúc quý vị một buổi tối thật vui vẻ và ngon miệng.', 'We wish you a wonderful evening. Please enjoy your meal.', ['Chúc buổi tối vui', [['evening', 'night'], ['wonderful', 'lovely', 'great', 'pleasant', 'enjoy', 'happy', 'good']]], ['Chúc ngon miệng', [['enjoy'], ['meal', 'dinner', 'food']]]),
    ],
  },
  {
    id: 'father-bride',
    fn: 'thanks',
    kind: 'Tiệc cưới',
    cefr: 'B1',
    title: 'Bố cô dâu phát biểu',
    brief: 'Bố cô dâu nói từng câu ngắn bằng tiếng Việt và dừng lại chờ bạn dịch cho khách nước ngoài.',
    segments: [
      seg('Hôm nay là ngày hạnh phúc nhất của gia đình chúng tôi.', 'Today is the happiest day for our family.', ['Hôm nay', [['today']]], ['Ngày hạnh phúc nhất của gia đình', [['happiest', 'happy', 'joyful'], FAMILY]]),
      seg('Tôi xin cảm ơn họ hàng, bạn bè gần xa đã đến dự.', 'I would like to thank our relatives and friends, near and far, for coming.', ['Cảm ơn', [THANK]], ['Họ hàng và bạn bè', [['relatives', 'family'], ['friends']]], ['Đã đến dự', [['coming', 'joining', 'being here', 'came', 'here', 'join']]]),
      seg('Con gái tôi từ nhỏ đã rất ngoan và chăm học.', 'My daughter has always been a kind child and a hard-working student.', ['Con gái tôi', [['daughter']]], ['Ngoan và chăm học', [['kind', 'good', 'sweet', 'well behaved'], ['hard', 'studied', 'student', 'studying', 'study', 'school']]]),
      seg('Tôi mong hai con luôn yêu thương và nhường nhịn nhau.', 'I hope the two of you will always love and be patient with each other.', ['Mong hai con', [['hope', 'wish'], ['you', 'they', 'them', 'couple', 'children']]], ['Yêu thương, nhường nhịn nhau', [['love'], ['each other', 'one another'], ['patient', 'respect', 'understanding', 'kind', 'give', 'listen', 'forgive']]]),
      seg('Xin mời mọi người nâng ly chúc mừng hạnh phúc của hai con.', 'Please raise your glasses to the happiness of the couple.', ['Mời nâng ly', [['raise', 'lift'], ['glass', 'glasses']]], ['Chúc mừng hạnh phúc hai con', [['happiness', 'toast', 'celebrate', 'cheers'], ['couple', 'them', 'bride', 'children', 'newlyweds', 'two']]]),
    ],
  },
  {
    id: 'yearend-director',
    fn: 'close',
    kind: 'Tiệc tất niên',
    cefr: 'B1',
    title: 'Giám đốc phát biểu tất niên',
    brief: 'Giám đốc người Việt phát biểu ở tiệc tất niên có các đối tác nước ngoài. Bạn dịch từng câu.',
    segments: [
      seg('Năm vừa qua là một năm nhiều thử thách nhưng cũng rất thành công.', 'The past year was full of challenges, but it was also very successful.', ['Năm qua nhiều thử thách', [['year'], ['challenge', 'challenges', 'challenging', 'difficult', 'tough', 'hard']]], ['Nhưng thành công', [['success', 'successful', 'succeeded', 'achieved']]]),
      seg('Doanh thu của công ty đã tăng hai mươi phần trăm so với năm trước.', 'The company’s revenue grew by twenty percent compared with last year.', ['Doanh thu tăng', [['revenue', 'sales', 'income'], ['grew', 'increased', 'rose', 'up', 'growth', 'increase']]], ['Hai mươi phần trăm', [['twenty percent', '20 percent']]], ['So với năm trước', [['last year', 'previous year', 'year before']]]),
      seg('Thành quả này là nhờ sự nỗ lực của toàn thể nhân viên.', 'This result is thanks to the hard work of every member of our staff.', ['Thành quả này', [['result', 'success', 'achievement', 'this']]], ['Nhờ nỗ lực của nhân viên', [['hard work', 'effort', 'efforts', 'dedication'], ['staff', 'team', 'employees', 'everyone', 'colleagues']]]),
      seg('Tôi cũng xin cảm ơn các đối tác đã luôn tin tưởng và đồng hành cùng chúng tôi.', 'I would also like to thank our partners for their trust and for standing with us.', ['Cảm ơn đối tác', [THANK, ['partners', 'partner']]], ['Tin tưởng và đồng hành', [['trust', 'trusted', 'support', 'supported', 'faith', 'confidence']]]),
      seg('Chúc mọi người một năm mới dồi dào sức khoẻ và thành công.', 'I wish everyone a new year full of health and success.', ['Chúc năm mới', [['wish', 'happy'], ['new year']]], ['Sức khoẻ và thành công', [['health', 'healthy'], ['success', 'successful', 'prosperity', 'prosperous']]]),
    ],
  },
  {
    id: 'chairman-open',
    fn: 'open',
    kind: 'Hội nghị',
    cefr: 'B2',
    title: 'Chủ tịch khai mạc hội nghị',
    brief: 'Chủ tịch tập đoàn khai mạc hội nghị khách hàng. Ông nói trang trọng, bạn dịch nối tiếp từng câu.',
    segments: [
      seg('Thay mặt ban lãnh đạo, tôi xin gửi lời chào trân trọng đến toàn thể quý khách hàng và đối tác.', 'On behalf of the management, I would like to extend my warmest greetings to all our customers and partners.', ['Thay mặt ban lãnh đạo', [['behalf'], ['management', 'board', 'leadership', 'directors', 'company']]], ['Chào khách hàng và đối tác', [['greetings', 'welcome', 'greet'], ['customers', 'clients', 'partners']]]),
      seg('Hội nghị năm nay có sự tham dự của hơn ba trăm đại biểu đến từ mười quốc gia.', 'This year’s conference brings together more than three hundred delegates from ten countries.', ['Hơn ba trăm đại biểu', [['three hundred', '300'], ['delegates', 'guests', 'participants', 'attendees', 'people']]], ['Mười quốc gia', [['ten countries', '10 countries', 'ten nations']]]),
      seg('Chủ đề của chúng ta là phát triển bền vững trong thời kỳ chuyển đổi số.', 'Our theme is sustainable growth in the age of digital transformation.', ['Chủ đề', [['theme', 'topic', 'focus']]], ['Phát triển bền vững', [['sustainable', 'sustainability'], ['growth', 'development']]], ['Chuyển đổi số', [['digital']]]),
      seg('Chúng tôi cam kết luôn đặt lợi ích của khách hàng lên hàng đầu.', 'We are committed to always putting our customers’ interests first.', ['Cam kết', [['committed', 'commit', 'commitment', 'promise']]], ['Lợi ích khách hàng lên hàng đầu', [['customers', 'customer', 'clients', 'client'], ['first', 'priority', 'heart', 'center', 'centre']]]),
      seg('Tôi xin tuyên bố khai mạc hội nghị và chúc hội nghị thành công tốt đẹp.', 'I now declare the conference open, and I wish us all a very successful event.', ['Tuyên bố khai mạc', [['declare', 'officially', 'open', 'opening'], ['conference', 'event', 'summit', 'meeting']]], ['Chúc thành công', [['success', 'successful', 'fruitful', 'productive']]]),
    ],
  },
  {
    id: 'launch-ceo',
    fn: 'intro',
    kind: 'Ra mắt sản phẩm',
    cefr: 'B2',
    title: 'CEO giới thiệu sản phẩm mới',
    brief: 'CEO người Việt giới thiệu mẫu đồng hồ thông minh trước báo chí quốc tế. Bạn dịch từng ý.',
    segments: [
      seg('Sản phẩm này là kết quả của ba năm nghiên cứu và phát triển.', 'This product is the result of three years of research and development.', ['Kết quả của ba năm', [['three years', '3 years']]], ['Nghiên cứu và phát triển', [['research'], ['development', 'developing', 'design', 'work']]]),
      seg('Pin có thể dùng liên tục bảy ngày chỉ với một lần sạc.', 'The battery lasts seven days on a single charge.', ['Pin dùng bảy ngày', [['battery'], ['seven days', '7 days', 'a week', 'one week']]], ['Một lần sạc', [['charge', 'charging']]]),
      seg('Chúng tôi thiết kế nó cho những người bận rộn nhưng vẫn quan tâm đến sức khoẻ.', 'We designed it for busy people who still care about their health.', ['Thiết kế cho người bận rộn', [['designed', 'made', 'built', 'created', 'design'], ['busy']]], ['Vẫn quan tâm sức khoẻ', [['health', 'healthy', 'wellbeing', 'well being']]]),
      seg('Sản phẩm sẽ có mặt tại các cửa hàng trên toàn quốc từ tháng sau.', 'It will be available in stores nationwide from next month.', ['Có mặt tại cửa hàng toàn quốc', [['available', 'sale', 'sold', 'shelves', 'arrive'], ['stores', 'shops', 'nationwide', 'country']]], ['Từ tháng sau', [['next month']]]),
      seg('Xin mời quý vị trải nghiệm trực tiếp tại khu trưng bày phía sau hội trường.', 'You are invited to try it yourselves at the display area at the back of the hall.', ['Mời trải nghiệm trực tiếp', [['try', 'experience', 'test', 'hands on'], ['invite', 'invited', 'please', 'welcome', 'can', 'may']]], ['Khu trưng bày phía sau hội trường', [['display', 'demo', 'showcase', 'exhibition', 'area', 'booth'], ['back', 'behind', 'rear']]]),
    ],
  },
  {
    id: 'trad-elder',
    fn: 'social',
    kind: 'Lễ cưới truyền thống',
    cefr: 'B2',
    title: 'Đại diện họ nhà trai phát biểu',
    brief: 'Trong lễ ăn hỏi, bác trưởng đoàn nhà trai thưa chuyện với nhà gái. Bạn dịch cho gia đình chú rể người nước ngoài.',
    segments: [
      seg('Hôm nay ngày lành tháng tốt, gia đình chúng tôi mang lễ vật sang thưa chuyện với hai bác.', 'Today is a lucky day, and our family has brought gifts to speak with you both.', ['Ngày lành tháng tốt', [['today'], ['lucky', 'good day', 'auspicious', 'beautiful day', 'special day', 'happy day']]], ['Mang lễ vật sang thưa chuyện', [['gifts', 'offerings', 'presents'], ['brought', 'bring', 'come', 'came', 'carry']]]),
      seg('Chúng tôi xin phép được đón cháu Emma về làm dâu con trong gia đình.', 'We ask for your permission to welcome Emma into our family as our daughter-in-law.', ['Xin phép', [['permission', 'ask', 'allow', 'blessing', 'may we']]], ['Đón Emma về làm dâu', [['emma'], ['family', 'daughter in law', 'daughter', 'wife']]]),
      seg('Hai cháu đã tìm hiểu nhau ba năm và rất thương yêu nhau.', 'The two of them have known each other for three years, and they love each other very much.', ['Quen nhau ba năm', [['three years', '3 years']]], ['Rất thương yêu nhau', [['love'], ['each other', 'one another', 'deeply', 'very much']]]),
      seg('Gia đình chúng tôi xin hứa sẽ thương yêu cháu như con gái ruột.', 'Our family promises to love her like our own daughter.', ['Gia đình xin hứa', [['promise', 'promises', 'word', 'will']]], ['Thương như con gái ruột', [['love', 'care', 'treat', 'cherish'], ['own daughter', 'our daughter', 'own child', 'daughter']]]),
      seg('Kính mong hai bác nhận lễ và chấp thuận cho hai cháu nên duyên vợ chồng.', 'We kindly ask you to accept these gifts and to give your blessing to their marriage.', ['Mong nhận lễ', [['accept', 'receive'], ['gifts', 'offerings', 'presents', 'these']]], ['Chấp thuận cho nên duyên', [['blessing', 'approve', 'allow', 'agree', 'permission', 'consent'], ['marriage', 'marry', 'married', 'husband', 'wedding', 'union', 'couple']]]),
    ],
  },
  {
    id: 'gala-charity',
    fn: 'thanks',
    kind: 'Gala',
    cefr: 'B2',
    title: 'Trưởng ban tổ chức kêu gọi gây quỹ',
    brief: 'Trưởng ban tổ chức đêm gala gây quỹ nói trước các nhà hảo tâm nước ngoài. Bạn dịch từng câu.',
    segments: [
      seg('Mỗi năm có hàng nghìn trẻ em vùng cao phải nghỉ học vì thiếu sách vở.', 'Every year, thousands of children in the mountains have to leave school because they lack books.', ['Hàng nghìn trẻ em vùng cao', [['thousands'], ['children', 'kids', 'students'], ['mountain', 'mountains', 'highlands', 'remote', 'rural']]], ['Nghỉ học vì thiếu sách', [['school'], ['books', 'supplies', 'materials']]]),
      seg('Quỹ của chúng tôi đã xây được mười hai thư viện trong năm năm qua.', 'Our fund has built twelve libraries over the past five years.', ['Xây mười hai thư viện', [['twelve', '12'], ['libraries', 'library']]], ['Trong năm năm qua', [['five years', '5 years']]]),
      seg('Toàn bộ số tiền quyên góp tối nay sẽ được dùng để mua sách cho các em.', 'All the money raised tonight will be used to buy books for the children.', ['Toàn bộ tiền quyên góp tối nay', [['all', 'every', 'entire', 'hundred percent'], ['money', 'donations', 'dollar', 'funds', 'raised', 'proceeds']]], ['Mua sách cho các em', [['books'], ['children', 'kids', 'students', 'them']]]),
      seg('Chỉ với hai mươi đô la, quý vị đã tặng một em nhỏ đủ sách cho cả năm học.', 'With just twenty dollars, you can give one child enough books for a whole school year.', ['Chỉ hai mươi đô la', [['twenty dollars', '20 dollars']]], ['Đủ sách cho một em cả năm học', [['books'], ['year', 'school year'], ['child', 'student', 'kid']]]),
      seg('Xin chân thành cảm ơn tấm lòng vàng của quý vị.', 'Thank you from the bottom of our hearts for your generosity.', ['Chân thành cảm ơn', [THANK]], ['Tấm lòng vàng', [['generosity', 'generous', 'kindness', 'kind hearts', 'heart', 'hearts', 'support']]]),
    ],
  },
  {
    id: 'press-joint',
    fn: 'qa',
    kind: 'Họp báo',
    cefr: 'C1',
    title: 'Phát ngôn tại họp báo ký kết',
    brief: 'Đại diện phía Việt Nam trả lời báo chí quốc tế sau lễ ký kết hợp tác. Câu dài, nhiều thông tin: bạn dịch đủ ý, không cần đúng từng chữ.',
    segments: [
      seg('Thoả thuận hôm nay đánh dấu một bước tiến quan trọng trong quan hệ hợp tác giữa hai bên.', 'Today’s agreement marks an important step forward in the cooperation between the two sides.', ['Thoả thuận hôm nay', [['agreement', 'deal', 'signing']]], ['Bước tiến quan trọng', [['step', 'milestone', 'progress'], ['important', 'major', 'significant', 'big', 'key']]], ['Hợp tác giữa hai bên', [['cooperation', 'partnership', 'relationship', 'collaboration']]]),
      seg('Trong ba năm tới, hai bên sẽ đầu tư năm mươi triệu đô la vào năng lượng sạch.', 'Over the next three years, the two sides will invest fifty million dollars in clean energy.', ['Trong ba năm tới', [['three years', '3 years']]], ['Đầu tư năm mươi triệu đô la', [['invest', 'investment', 'investing'], ['fifty million', '50 million']]], ['Năng lượng sạch', [['clean energy', 'renewable', 'green energy']]]),
      seg('Dự án dự kiến tạo ra khoảng hai nghìn việc làm cho người dân địa phương.', 'The project is expected to create about two thousand jobs for local people.', ['Dự kiến tạo việc làm', [['create', 'creating', 'bring', 'generate'], ['jobs', 'employment']]], ['Khoảng hai nghìn', [['two thousand', '2000', '2 thousand']]], ['Cho người địa phương', [['local']]]),
      seg('Về tiến độ, chúng tôi sẽ công bố lộ trình chi tiết vào quý một năm sau.', 'As for the timeline, we will announce a detailed roadmap in the first quarter of next year.', ['Công bố lộ trình chi tiết', [['announce', 'publish', 'share', 'release'], ['roadmap', 'plan', 'timeline', 'schedule']]], ['Quý một năm sau', [['first quarter', 'q1', 'quarter one'], ['next year']]]),
      seg('Hiện tại chúng tôi chưa thể tiết lộ thêm chi tiết về các điều khoản tài chính.', 'At this stage, we are not able to disclose further details about the financial terms.', ['Chưa thể tiết lộ thêm', [['cannot', 'not able', 'unable', 'not in a position', 'not yet', 'not ready', 'can not'], ['disclose', 'share', 'reveal', 'comment', 'give', 'say', 'details']]], ['Điều khoản tài chính', [['financial', 'finance', 'financials', 'money'], ['terms', 'details', 'conditions', 'side', 'figures']]]),
    ],
  },
];

export const INTERP_BY_ID: Record<string, InterpSet> = Object.fromEntries(INTERP_SETS.map((s) => [s.id, s]));
