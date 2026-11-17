/**
 * Đổi văn phong: cùng một ý, nói lại cho đúng tông của sân khấu.
 * Năm bộ "nâng tông" (câu thân mật → lời trang trọng của MC) và một bộ "hạ tông"
 * (câu quá trang trọng → lời thân thiện cho team building).
 * Dùng chung kiểu dữ liệu và màn với Dịch nối tiếp; `vi` là câu nguồn bằng tiếng Anh.
 * Quy ước (tests/longturn.test.mjs kiểm): bản mẫu `say` trúng mọi ý và không chứa từ trong `avoid`;
 * chính câu nguồn không được đạt quá 1 sao.
 */
import type { InterpSegment, InterpSet } from '../core/longturn';

type IdeaDef = [label: string, need: string[][]];
const seg = (src: string, say: string, avoid: string[], ...ideas: IdeaDef[]): InterpSegment => ({ vi: src, say, avoid, ideas: ideas.map(([label, need]) => ({ label, need })) });

const POLITE = ['please', 'kindly', 'may i', 'may we', 'could you', 'would you', 'we ask', 'we invite'];
const THANK = ['thank', 'grateful', 'gratitude', 'appreciate', 'appreciation'];
const HONOR = ['pleasure', 'honor', 'honour', 'honored', 'honoured', 'privilege', 'delighted'];

export const REGISTER_SETS: InterpSet[] = [
  {
    id: 'reg-room',
    kind: 'Nâng tông',
    cefr: 'B1',
    fn: 'announce',
    title: 'Điều khiển khán phòng',
    brief: 'Đây là cách bạn sẽ nói với bạn bè. Hãy nói lại ý đó bằng lời trang trọng của MC trước 300 khách.',
    segments: [
      seg('Hey guys, sit down, we’re starting.', 'Ladies and gentlemen, please take your seats. We are about to begin.', ['guys', 'hey', 'sit down'], ['Xưng hô trang trọng', [['ladies and gentlemen', 'distinguished guests', 'dear guests', 'honored guests']]], ['Mời ngồi lịch sự', [POLITE, ['seat', 'seats', 'seated']]], ['Báo sắp bắt đầu', [['begin', 'start', 'commence']]]),
      seg('Be quiet, everybody!', 'May I have your attention, please?', ['quiet', 'shut up', 'everybody'], ['Xin sự chú ý', [['attention']]], ['Lời lịch sự', [POLITE]]),
      seg('Turn off your phones.', 'We kindly ask you to switch your phones to silent mode.', ['turn off your phones'], ['Lời đề nghị lịch sự', [POLITE]], ['Điện thoại im lặng', [['phones', 'phone', 'devices'], ['silent', 'mute', 'off']]]),
      seg('Don’t take pictures.', 'We kindly ask you to refrain from taking photos during the ceremony.', ['do not take pictures', "don't take"], ['Lời đề nghị lịch sự', [POLITE]], ['Không chụp ảnh', [['refrain', 'avoid', 'not to take', 'no photography', 'without'], ['photos', 'pictures', 'photography', 'photographs']]]),
      seg('Come back in ten minutes.', 'We will resume in ten minutes. Please be back in your seats by then.', ['come back in'], ['Báo sẽ tiếp tục', [['resume', 'continue', 'return', 'be back', 'start again']]], ['Mười phút', [['ten minutes', '10 minutes']]], ['Lời lịch sự', [POLITE]]),
    ],
  },
  {
    id: 'reg-people',
    kind: 'Nâng tông',
    cefr: 'B2',
    fn: 'intro',
    title: 'Giới thiệu và mời người',
    brief: 'Câu nguồn là lời nói suồng sã. Hãy nói lại cho xứng với người được giới thiệu.',
    segments: [
      seg('Now here’s our boss, Mr. Tran.', 'It is my great pleasure to introduce our chairman, Mister Tran.', ['boss', 'here is our', "here's our"], ['Bày tỏ vinh hạnh', [HONOR]], ['Giới thiệu chủ tịch Tran', [['introduce', 'welcome', 'invite', 'present'], ['chairman', 'tran', 'president', 'director']]]),
      seg('Give it up for the band!', 'Please join me in a warm round of applause for the band.', ['give it up'], ['Lời mời lịch sự', [['please', 'let us', 'join me', 'kindly']]], ['Tràng pháo tay cho ban nhạc', [['applause', 'hand', 'welcome', 'thanking'], ['band', 'musicians', 'orchestra']]]),
      seg('Mrs. Lee, come up here.', 'Mrs. Lee, may I invite you to join us on stage?', ['come up here', 'get up here'], ['Lời mời lịch sự', [['may i', 'would you', 'could you', 'please', 'kindly', 'invite']]], ['Lên sân khấu', [['stage', 'join us', 'join me', 'podium']]]),
      seg('Thanks to the sponsors for the money.', 'We would like to express our sincere gratitude to our sponsors for their generous support.', ['money', 'cash'], ['Lời cảm ơn trang trọng', [THANK]], ['Nhà tài trợ', [['sponsors', 'sponsor', 'partners']]], ['Sự hỗ trợ hào phóng', [['support', 'generosity', 'generous', 'contribution', 'contributions']]]),
      seg('He’s a big deal in the car business.', 'He is one of the most respected leaders in the automotive industry.', ['big deal', 'big shot', 'car business'], ['Đánh giá trang trọng', [['respected', 'leading', 'renowned', 'distinguished', 'well known', 'prominent', 'leader', 'leaders', 'expert', 'pioneer']]], ['Ngành ô tô', [['automotive', 'car industry', 'automobile', 'motor industry']]]),
    ],
  },
  {
    id: 'reg-trouble',
    kind: 'Nâng tông',
    cefr: 'B2',
    fn: 'trouble',
    title: 'Xin lỗi và báo sự cố',
    brief: 'Khi có sự cố, lời thật thà quá dễ gây lo lắng. Hãy nói lại cho bình tĩnh và lịch sự.',
    segments: [
      seg('Sorry, the screen’s broken.', 'We apologize for the inconvenience. We are experiencing a small technical issue.', ['broken', 'dead', 'screwed'], ['Xin lỗi', [['apologize', 'apologise', 'apologies', 'sorry']]], ['Sự cố kỹ thuật nhỏ', [['technical'], ['issue', 'difficulty', 'difficulties', 'problem', 'delay']]]),
      seg('Wait a bit.', 'Thank you for your patience. We will continue in just a moment.', ['wait a bit', 'hang on', 'hold on'], ['Cảm ơn sự kiên nhẫn', [['patience', 'bear with', 'understanding']]], ['Sẽ tiếp tục ngay', [['moment', 'shortly', 'minutes', 'soon', 'momentarily']]]),
      seg('The food is late.', 'Dinner will be served shortly. Thank you for your understanding.', ['food is late', 'late'], ['Bữa tối sắp được phục vụ', [['dinner', 'meal', 'first course', 'food'], ['served', 'ready', 'shortly', 'few minutes', 'moment']]], ['Cảm ơn sự thông cảm', [['understanding', 'patience', 'apologize', 'apologise', 'apologies']]]),
      seg('Whoever owns the white Toyota, move it now.', 'Would the owner of the white Toyota kindly move their vehicle? Thank you.', ['whoever', 'move it now'], ['Gọi chủ xe', [['owner', 'driver']]], ['Lời đề nghị lịch sự', [['kindly', 'please', 'would', 'could']]], ['Dời xe', [['move', 'remove', 'relocate'], ['vehicle', 'car', 'toyota']]]),
      seg('We’re out of time, so no more questions.', 'I am afraid that is all the time we have for questions today.', ['no more questions'], ['Lời tiếc nuối', [['afraid', 'unfortunately', 'regret', 'sorry']]], ['Hết thời gian cho câu hỏi', [['time'], ['questions', 'q and a']]]),
    ],
  },
  {
    id: 'reg-close',
    kind: 'Nâng tông',
    cefr: 'B1',
    fn: 'close',
    title: 'Cảm ơn và bế mạc',
    brief: 'Lời chào về kiểu bạn bè. Hãy nói lại thành lời bế mạc của một đêm tiệc sang trọng.',
    segments: [
      seg('Thanks for coming, guys.', 'Thank you all for joining us this evening.', ['guys', 'thanks for coming'], ['Lời cảm ơn', [THANK]], ['Vì đã tham dự', [['joining', 'being here', 'presence', 'attending', 'being with us', 'coming']]]),
      seg('That’s it for tonight.', 'This brings us to the end of tonight’s program.', ['that is it', "that's it"], ['Báo kết thúc', [['end', 'close', 'conclusion', 'conclude', 'concludes']]], ['Chương trình tối nay', [['program', 'evening', 'event', 'ceremony', 'celebration', 'tonight']]]),
      seg('Get home safe.', 'We wish you a safe journey home.', ['get home safe'], ['Lời chúc', [['wish', 'hope', 'have a']]], ['Về nhà an toàn', [['safe', 'safely'], ['journey', 'trip', 'travel', 'travels', 'drive', 'home']]]),
      seg('Hope you liked it.', 'We hope you have enjoyed the evening.', ['liked it', 'like it'], ['Bày tỏ hy vọng', [['hope', 'trust']]], ['Khách đã có buổi tối vui', [['enjoyed', 'enjoy', 'pleasant', 'wonderful', 'memorable']]]),
      seg('See you guys next year.', 'We look forward to welcoming you again next year.', ['guys', 'see you'], ['Mong gặp lại', [['look forward', 'hope to welcome', 'hope to see', 'until we meet']]], ['Năm sau', [['next year', 'again']]]),
    ],
  },
  {
    id: 'reg-protocol',
    kind: 'Nâng tông',
    cefr: 'C1',
    fn: 'intro',
    title: 'Nghi thức và lễ ký kết',
    brief: 'Sự kiện có quan chức và lãnh đạo cấp cao. Hãy nâng câu nói lên mức nghi thức.',
    segments: [
      seg('The minister is here, everybody stand up.', 'Ladies and gentlemen, please rise to welcome Her Excellency, the Minister.', ['everybody', 'stand up'], ['Mời đứng dậy trang trọng', [['please', 'kindly'], ['rise', 'stand']]], ['Chào đón bà Bộ trưởng', [['welcome', 'greet', 'honor', 'honour'], ['minister', 'excellency']]]),
      seg('Now the two bosses will sign the paper.', 'We now invite the two leaders to sign the memorandum of understanding.', ['bosses', 'paper'], ['Lời mời trang trọng', [['invite', 'request', 'ask', 'call upon']]], ['Hai nhà lãnh đạo', [['leaders', 'representatives', 'chairmen', 'parties', 'signatories']]], ['Ký biên bản ghi nhớ', [['sign', 'signing'], ['memorandum', 'agreement', 'contract']]]),
      seg('Thanks to the government people for helping.', 'We extend our deepest appreciation to the representatives of the government for their support.', ['government people', 'helping'], ['Lời cảm ơn trang trọng', [THANK]], ['Đại diện chính phủ', [['government', 'ministry', 'authorities'], ['representatives', 'officials', 'leaders', 'delegation']]], ['Sự hỗ trợ', [['support', 'assistance', 'cooperation', 'guidance']]]),
      seg('Let’s all drink to the two companies.', 'May I propose a toast to the lasting partnership between our two companies.', ['drink to', 'let us all drink'], ['Đề nghị nâng ly', [['propose', 'raise'], ['toast', 'glass', 'glasses']]], ['Quan hệ đối tác hai công ty', [['partnership', 'cooperation', 'friendship', 'success', 'collaboration'], ['companies', 'organizations', 'organisations', 'sides', 'parties']]]),
      seg('The big guy from the bank wants to say something.', 'I now have the honor of inviting the Chief Executive of the bank to deliver his remarks.', ['big guy', 'say something'], ['Bày tỏ vinh hạnh', [HONOR]], ['Mời lãnh đạo ngân hàng', [['inviting', 'invite', 'welcome', 'welcoming', 'introduce', 'introducing'], ['chief executive', 'ceo', 'chairman', 'president', 'director', 'bank']]], ['Phát biểu', [['remarks', 'address', 'speech', 'deliver', 'a few words']]]),
    ],
  },
  {
    id: 'reg-down',
    kind: 'Hạ tông',
    cefr: 'B2',
    fn: 'announce',
    title: 'Team building: nói cho gần gũi',
    brief: 'Ngược lại: câu nguồn quá trang trọng cho một buổi team building ngoài trời. Hãy nói lại cho vui và gần gũi.',
    segments: [
      seg('It is my great honor to commence the team building activities.', 'All right, team, let’s get this party started!', ['honor', 'honour', 'commence', 'activities'], ['Gọi cả đội thân mật', [['team', 'everyone', 'guys', 'friends', 'folks']]], ['Bắt đầu thôi', [['let us', 'ready', 'here we go', 'time to'], ['start', 'started', 'begin', 'fun', 'party']]]),
      seg('Participants are requested to form groups of five.', 'Find four friends and make a team of five!', ['participants', 'requested', 'form groups'], ['Nhóm năm người', [['five']]], ['Lời rủ thân mật', [['find', 'make', 'get', 'grab', 'join'], ['team', 'teams', 'group', 'groups', 'friends', 'people']]]),
      seg('We kindly request all participants to proceed to the lawn.', 'Okay everyone, let’s head to the lawn!', ['kindly', 'request', 'proceed', 'participants'], ['Gọi mọi người', [['everyone', 'team', 'guys', 'friends', 'folks']]], ['Ra bãi cỏ', [['head', 'let us', 'move', 'run', 'come', 'follow'], ['lawn', 'grass', 'garden', 'field']]]),
      seg('We extend our congratulations to the winning team.', 'Give it up for our winners! You were amazing!', ['extend', 'congratulations to the winning team'], ['Người thắng', [['winners', 'winning team', 'champions', 'red team', 'blue team']]], ['Lời hô hào thân mật', [['give it up', 'big hand', 'make some noise', 'well done', 'amazing', 'awesome', 'great job', 'you rock']]]),
      seg('Refreshments are available at the rear of the venue.', 'Drinks and snacks are at the back, so help yourselves!', ['refreshments', 'rear', 'venue', 'available'], ['Đồ uống và đồ ăn nhẹ', [['drinks', 'snacks', 'food', 'water', 'fruit']]], ['Ở phía sau', [['back', 'behind', 'over there']]], ['Mời tự nhiên', [['help yourself', 'help yourselves', 'grab', 'enjoy', 'go get', 'dig in']]]),
    ],
  },
];

export const REGISTER_BY_ID: Record<string, InterpSet> = Object.fromEntries(REGISTER_SETS.map((s) => [s.id, s]));
