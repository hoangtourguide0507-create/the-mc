/**
 * Hướng dẫn sử dụng: một nguồn nội dung cho cả trang "Hướng dẫn" (src/ui/guide.ts) và gợi ý tại chỗ
 * ở đầu từng mục (src/ui/screens/page.ts). Sửa ở đây là cả hai nơi cùng đổi.
 * Quy ước (tests/guide.test.mjs kiểm): mỗi mục của tab Luyện tập, Sổ tay, Nhiệm vụ có một bài hướng dẫn
 * trùng id; `target` trỏ tới tab và mục có thật; câu `short` dưới 140 ký tự.
 * Khi thêm hoặc đổi luật chấm của một tính năng, cập nhật bài tương ứng ở đây.
 */

export type GuideTab = 'home' | 'train' | 'notebook' | 'quests';

export interface GuideEntry {
  id: string;
  group: 'start' | 'stage' | 'train' | 'more';
  title: string;
  /** Một câu: hiện ở gợi ý tại chỗ và dưới tiêu đề trong trang Hướng dẫn */
  short: string;
  /** Dùng để làm gì */
  what: string;
  /** Cách làm, theo thứ tự */
  steps: string[];
  /** Máy chấm thế nào */
  scoring?: string[];
  tips?: string[];
  /** Nút "Thử ngay" mở đúng chỗ này */
  target?: { tab: GuideTab; section?: string };
  /** Từ khoá tìm kiếm thêm (không dấu cũng được) */
  keys?: string;
}

export const GUIDE_GROUPS: { id: GuideEntry['group']; label: string }[] = [
  { id: 'start', label: 'Bắt đầu' },
  { id: 'stage', label: 'Sân khấu' },
  { id: 'train', label: 'Luyện tập' },
  { id: 'more', label: 'Sổ tay và Nhiệm vụ' },
];

export const GUIDE: GuideEntry[] = [
  /* ---------- Bắt đầu ---------- */
  {
    id: 'start',
    group: 'start',
    title: 'Bắt đầu trong 10 phút',
    short: 'Game luyện nói tiếng Anh qua công việc của MC: dẫn sự kiện, xử lý tình huống, làm việc với khách.',
    what: 'MC Life là nơi bạn tập nói tiếng Anh bằng chính công việc của MC. Mỗi bài là một sự kiện thật: tiệc cưới, ra mắt sản phẩm, hội nghị, họp báo. Bạn nghe nhân vật nói, rồi tự nói câu của MC; máy nghe và chấm sao.',
    steps: [
      'Ở tab Sân khấu, chọn một poster sự kiện, rồi bấm "Tập" ở một bài trong danh sách bên dưới.',
      'Cho phép trình duyệt dùng micro khi được hỏi.',
      'Nghe nhân vật nói, bấm nút mic, nói câu của bạn, rồi bấm dừng. Máy chấm từ 0 đến 3 sao.',
      'Gặp từ lạ thì chạm vào từ đó để xem nghĩa và ghi vào sổ.',
      'Tập xong một lần thì nút "Diễn" của bài đó mở ra: diễn thật mới tính danh tiếng.',
      'Mỗi ngày mở tab Luyện tập, mục Khởi động để ôn các cụm đã học, và tab Sổ tay để ôn từ đến hạn.',
    ],
    tips: [
      'Một buổi học cân bằng: Khởi động, một bài Sân khấu (Tập rồi Diễn), một cuộc Trò chuyện, một bài Nói dài.',
      'Mọi chữ tiếng Anh trên màn hình đều chạm được để nghe và ghi chú.',
    ],
    target: { tab: 'home' },
    keys: 'bat dau huong dan nguoi moi lam quen',
  },
  {
    id: 'mic',
    group: 'start',
    title: 'Micro, nói và gõ',
    short: 'Bấm mic để nói, bấm lại để dừng. Không dùng được mic thì bấm "Gõ" để gõ câu trả lời.',
    what: 'Game dùng tính năng nhận giọng nói của trình duyệt để nghe bạn. Máy chuyển lời bạn thành chữ, rồi so với câu cần nói hoặc các ý cần có.',
    steps: [
      'Lần đầu bấm mic, trình duyệt sẽ hỏi quyền dùng micro: chọn Cho phép.',
      'Nói rõ, tốc độ vừa phải, ở nơi yên tĩnh. Đeo tai nghe có mic giúp máy nghe chính xác hơn.',
      'Nói xong thì bấm dừng, hoặc ngừng nói một chút để máy tự dừng (trừ mục Nói dài: phải bấm dừng).',
      'Máy hiện dòng "Máy nghe được" để bạn biết máy đã nghe ra những gì.',
      'Mic không dùng được, hoặc đang ở nơi không tiện nói: bấm "Gõ" để gõ câu trả lời. Gõ thì không đo được tốc độ và phát âm.',
    ],
    tips: [
      'Trên iPhone, hãy dùng Safari. Nếu mic không phản hồi, tải lại trang rồi thử lại.',
      'Máy hay nghe nhầm tên riêng. Nếu chỉ sai tên riêng, đừng lo: phần chấm thường bỏ qua tên.',
    ],
    keys: 'micro mic quyen safari iphone go ban phim nhan giong',
  },
  {
    id: 'wordpick',
    group: 'start',
    title: 'Chạm từ để ghi chú',
    short: 'Chạm một từ để xem phiên âm, nghĩa và nghe. Nhấn giữ rồi kéo để chọn cả cụm.',
    what: 'Từ nào bạn thấy lạ hoặc khó đọc, ghi ngay vào sổ để ôn sau, kèm câu gốc và giọng nhân vật đã nói câu đó.',
    steps: [
      'Chạm một từ trong câu nhân vật, thẻ nhắc lời, câu mẫu hoặc Sổ tay: thẻ từ hiện lên với phiên âm, nghĩa, nút Nghe và Chậm.',
      'Muốn ghi cả cụm (ví dụ "join me in welcoming"): nhấn giữ từ đầu, chờ rung nhẹ, rồi kéo sang từ cuối. Hoặc chạm một từ rồi bấm "← thêm" hoặc "thêm →".',
      'Chọn nhãn "Từ mới" (học nghĩa và cách dùng) hoặc "Luyện phát âm", hoặc cả hai.',
      'Có thể gõ ghi chú riêng: nghĩa theo cách hiểu của bạn, mẹo nhớ.',
      'Từ đã ghi được gạch chân ở mọi câu khác, để bạn thấy mình gặp lại nó.',
    ],
    tips: [
      'Nếu bạn đọc sai một từ từ 2 lần, máy sẽ hỏi có muốn thêm từ đó vào sổ không.',
      'Cuối mỗi bài có danh sách các từ bạn vừa ghi để ôn nhanh 30 giây.',
    ],
    target: { tab: 'notebook' },
    keys: 'ghi chu tu moi so tu cham phien am nghia cum',
  },

  /* ---------- Sân khấu ---------- */
  {
    id: 'home',
    group: 'stage',
    title: 'Sân khấu: chọn sự kiện và bài',
    short: 'Vuốt hàng poster để chọn sự kiện, rồi chọn một bài bên dưới. Mỗi sự kiện có nhiều bài khác nhau.',
    what: 'Đây là phần chính của game: 144 bài thuộc 16 loại sự kiện, từ tiệc cưới, khai trương, ra mắt sản phẩm tới họp báo, đấu giá từ thiện, lễ trao giải.',
    steps: [
      'Dùng hàng nút lọc (Cưới, Thương hiệu và triển lãm, Hội nghị và nghi thức…) để thu gọn danh sách.',
      'Vuốt ngang hàng poster, chạm một poster để xem các bài của sự kiện đó.',
      'Mỗi bài có hai nút: "Tập" và "Diễn". Bắt đầu bằng Tập.',
      'Thẻ thang nghề ở đầu màn hình cho biết cấp hiện tại, danh hiệu và tiến độ lên cấp.',
    ],
    tips: ['Nút "Nền tối" hoặc "Nền sáng" ở góc trên đổi màu giao diện cho dịu mắt.'],
    target: { tab: 'home' },
    keys: 'poster su kien bai hoc chon bai',
  },
  {
    id: 'lesson',
    group: 'stage',
    title: 'Các kiểu lượt trong một bài',
    short: 'Mỗi bài gồm nhiều lượt: đọc theo thẻ, bắt từ, điền ô, nghe hiểu và ứng biến. Nhãn ở đầu thẻ cho biết kiểu lượt.',
    what: 'Một bài là một đoạn sự kiện: nhân vật nói với bạn, bạn đáp lại như một MC. Các lượt đi từ dễ (đọc theo câu có sẵn) tới khó (tự nghĩ câu).',
    steps: [
      'Đọc theo thẻ nhắc: đọc to câu tiếng Anh trên thẻ.',
      'Bắt từ rồi nói: nghe nhân vật, bắt được từ quan trọng rồi nói câu có từ đó.',
      'Điền ô rồi nói: câu có chỗ trống, bạn tự điền và nói cả câu.',
      'Phản xạ nghe hiểu: nghe rồi chọn hoặc nói đáp án đúng.',
      'Ứng biến tự do: không có câu mẫu, bạn tự nghĩ câu. Máy chấm theo ý.',
      'Lời nhân vật ẩn chữ để bạn luyện nghe. Bấm "Hiện chữ" nếu cần đọc; giữ ẩn chữ thì được gấp đôi XP nghe. "Nghe lại" và "Nghe chậm" phát lại lời nhân vật.',
      'Bấm "Chạm để nói" để nói. Hàng nút dưới cùng: "Mẫu" và "Chậm" phát câu mẫu, "Gõ" để gõ thay vì nói, "Bỏ qua" sang lượt sau, "Tiếp" khi đã xong lượt.',
      'Ở lượt đọc thẻ, bấm "Thử không nhìn thẻ" để tự nói từ trí nhớ trước khi xem câu.',
    ],
    scoring: [
      'Lượt đọc theo thẻ chấm cộng dồn: từ đã đúng ở một lần đọc thì giữ là đúng. Phần còn sai được tách thành một cụm ngắn để bạn đọc riêng, không phải đọc lại cả câu.',
      'Lượt điền ô và ứng biến chấm từng lần.',
      'Lần thứ hai chơi một bài, lượt đọc thẻ thành "tự nói" với gợi ý tiếng Việt. Từ lần thứ ba, không còn gợi ý: bạn phải nhớ và tự nói.',
    ],
    tips: ['Muốn rời bài giữa chừng, bấm "Rời" hai lần.'],
    keys: 'luot doc the bat tu dien o ung bien nghe hieu tu noi',
  },
  {
    id: 'perform',
    group: 'stage',
    title: 'Tập và Diễn',
    short: 'Tập để luyện thoải mái, có gợi ý. Diễn là lên sân khấu thật: mỗi lượt một lần nói, và mới tính danh tiếng.',
    what: 'Hai cách chơi cùng một bài, giống như tổng duyệt và đêm diễn thật.',
    steps: [
      'Tập: nói lại bao nhiêu lần cũng được, có gợi ý, có câu mẫu, được bỏ qua lượt. Có 1 sự cố bất ngờ.',
      'Diễn mở sau khi bạn đã Tập bài đó ít nhất một lần.',
      'Diễn: mỗi lượt chỉ nói một lần (được thêm một lần nếu 0 sao), không gợi ý, không câu mẫu, không bỏ qua. Có 2 sự cố bất ngờ.',
    ],
    scoring: ['Chỉ Diễn mới làm thay đổi danh tiếng. Danh tiếng là trung bình số sao các buổi Diễn gần đây, và cần để mở các sự kiện lớn.'],
    keys: 'tap dien danh tieng tong duyet',
  },
  {
    id: 'show',
    group: 'stage',
    title: 'Khán giả, chuỗi và sự cố',
    short: 'Thanh khán giả lên khi bạn nói tốt. Nói tốt liên tiếp thì điểm nhân lên. Sự cố bất ngờ phải xử lý trong 10 giây.',
    what: 'Trong bài, sân khấu 3D có khán giả phản ứng theo cách bạn dẫn, để mỗi bài giống một buổi diễn thật.',
    steps: [
      'Thanh khán giả: lên khi bạn được nhiều sao, xuống khi nói kém.',
      'Chuỗi: các lượt đạt liên tiếp làm điểm diễn nhân lên. Một lượt kém làm đứt chuỗi.',
      'Sự cố bất ngờ (micro mất tiếng, khách quan trọng đến trễ, phù rể chưa tìm thấy nhẫn…): hiện giữa bài, bạn có 10 giây và một lần nói để xử lý.',
    ],
    scoring: ['Sự cố chấm theo ý: nói đúng việc cần làm (xin lỗi, trấn an, báo việc tiếp theo) là đạt, không cần đúng từng chữ.'],
    keys: 'khan gia chuoi su co bat ngo diem dien',
  },

  /* ---------- Luyện tập ---------- */
  {
    id: 'warmup',
    group: 'train',
    title: 'Khởi động',
    short: 'Ôn các cụm mang về từ những bài đã học, theo lịch giãn dần. Nên làm đầu mỗi buổi.',
    what: 'Mỗi bài cho bạn 2 "cụm mang về", những cụm MC dùng nhiều nhất. Khởi động bắt bạn nói lại chúng trong một tình huống mới, đúng lúc sắp quên.',
    steps: ['Đọc tình huống, tự nói một câu có cụm cần ôn.', 'Bí quá thì bấm xem trước cụm, nhưng lần đó sẽ tính là chưa thuộc.'],
    scoring: ['Chỉ lần nói đầu tiên quyết định lịch ôn. Đúng thì cụm được giãn ra lâu hơn mới hỏi lại, sai thì hỏi lại sớm.'],
    tips: ['Khi sổ từ của bạn có mục đến hạn, đầu mục Khởi động sẽ nhắc bạn sang Sổ tay để ôn.'],
    target: { tab: 'train', section: 'warmup' },
    keys: 'on tap cum mang ve lap lai ngat quang',
  },
  {
    id: 'pron',
    group: 'train',
    title: 'Phát âm',
    short: 'Luyện từng âm tiếng Anh người Việt hay sai, theo 8 nhóm. Máy nghe từng âm bạn phát ra.',
    what: 'Bài phát âm soạn riêng cho các lỗi quen thuộc của người Việt: âm cuối, /θ/ và /ð/, nguyên âm dài và ngắn, trọng âm.',
    steps: [
      'Chọn một bài trong nhóm đang mở, nghe mẫu.',
      'Bấm thu âm và đọc từ trong 2,5 giây.',
      'Xem kết quả từng âm: âm nào thiếu hoặc nghe thành âm khác.',
      'Trò chơi nghe phân biệt cặp từ (ship và sheep…) không cần mic.',
    ],
    scoring: [
      'Máy so âm bạn phát ra với phiên âm chuẩn và kiểm tra trọng âm. Bài đạt được +5 XP.',
      'Nhóm sau mở khi mọi bài của nhóm trước đạt 60%.',
    ],
    tips: ['Lần đầu chấm phải tải mô hình nhận âm, có thể mất một lúc.'],
    target: { tab: 'train', section: 'pron' },
    keys: 'phat am am cuoi trong am ipa',
  },
  {
    id: 'rhythm',
    group: 'train',
    title: 'Nhịp',
    short: 'Luyện ngắt nghỉ: đọc một đoạn lời dẫn và ngắt đúng số nhịp để khán giả kịp theo.',
    what: 'MC nói hay không chỉ vì đúng từ, mà vì biết dừng đúng chỗ, đặc biệt trước tên người và con số.',
    steps: ['Chọn bài bằng nút số, nghe mẫu.', 'Bấm thu và đọc đoạn lời dẫn (tối đa 12 giây), ngắt ở các dấu ngắt.'],
    scoring: ['Máy đếm số quãng lặng trong bài đọc. Hiện máy mới đếm số lần ngắt, chưa kiểm tra bạn ngắt có đúng chỗ không.'],
    target: { tab: 'train', section: 'rhythm' },
    keys: 'nhip ngat nghi dung quang lang',
  },
  {
    id: 'quick',
    group: 'train',
    title: 'Phản xạ nhanh',
    short: 'Một người hỏi bạn một câu ngắn, bạn đáp ngay. Tập phản xạ cho những câu hỏi bất chợt.',
    what: 'Luyện trả lời nhanh các câu giao tiếp thường gặp, như khi khách hỏi đường hay bắt chuyện.',
    steps: ['Nghe câu hỏi.', 'Chọn đáp án đúng, hoặc nói câu trả lời.'],
    scoring: [
      'Nói đạt từ 2 sao là qua. Sau 3 lần chưa đạt, máy hiện câu mẫu.',
      'Câu hỏi mở dần theo cấp: A2 từ cấp 1, B1 từ cấp 3, B2 từ cấp 5.',
    ],
    target: { tab: 'train', section: 'quick' },
    keys: 'phan xa nhanh cau hoi ngan',
  },
  {
    id: 'talk',
    group: 'train',
    title: 'Trò chuyện',
    short: 'Nói chuyện 5 lượt với khách hàng, khán giả, ê-kíp. Không có câu để đọc: bạn tự nghĩ câu, trả lời mơ hồ sẽ bị hỏi vặn.',
    what: '30 cuộc trò chuyện rẽ nhánh, từ B1 tới C1: hỏi đáp với khán giả, phóng viên moi tin, khách VIP đến muộn, báo giá với khách hàng, phối hợp với kỹ thuật và ban nhạc.',
    steps: [
      'Dùng hàng lọc để chọn theo chức năng (Hỏi đáp, Hậu trường, Khách hàng…).',
      'Đọc mục tiêu và việc cần làm ở mỗi lượt.',
      'Nghe nhân vật, tự nghĩ và nói câu trả lời. Nhân vật sẽ phản ứng theo đúng ý bạn nói.',
    ],
    scoring: [
      'Trả lời cụ thể, đúng ý: được 2 điểm và đi tiếp.',
      'Trả lời chung chung ("okay", "maybe"): nhân vật hỏi vặn lại. Trả lời đúng sau đó được 1 điểm.',
      'Máy không hiểu ý: nhân vật hỏi lại và hiện gợi ý. Sau 3 lần, cuộc trò chuyện tự đi tiếp.',
    ],
    tips: ['Đừng chỉ nói "Yes" hay "Okay". Nói kèm con số, thời gian, lý do hoặc việc bạn sẽ làm.'],
    target: { tab: 'train', section: 'talk' },
    keys: 'tro chuyen hoi thoai khach hang hau truong',
  },
  {
    id: 'long',
    group: 'train',
    title: 'Nói dài',
    short: 'Tự nói một mạch 60–90 giây theo dàn ý 6 ý, như lời mở màn hay bế mạc thật. Máy chấm ý, độ dài và tốc độ.',
    what: '12 bài độc thoại của MC: mở màn tiệc cưới, giới thiệu diễn giả, bế mạc, nâng ly, báo chậm chương trình, công bố giải, mở phiên đấu giá…',
    steps: [
      'Đọc tình huống và dàn ý 6 ý. Bí từ thì bấm "Xem cụm gợi ý".',
      'Muốn khó hơn, bật "Ẩn dàn ý trong lúc nói" (+10 XP).',
      'Bấm "Bắt đầu nói" và nói liên tục. Ý nào bạn nói tới sẽ sáng lên.',
      'Nói xong thì bấm "Dừng và chấm". Nếu mic tự ngắt giữa chừng, bấm "Nói tiếp".',
      'Xem kết quả: ý còn thiếu kèm câu mẫu, nghe được từng ý hoặc cả bài.',
    ],
    scoring: [
      '3 sao: đủ 6 ý và từ 90 từ trở lên. 2 sao: từ 4 ý. 1 sao: từ 2 ý.',
      'Tốc độ dễ nghe trên sân khấu là 100–165 từ mỗi phút. Máy còn đếm lời dẫn ("First of all", "Finally") và tiếng đệm ("um", "uh").',
    ],
    tips: ['Mỗi ý nói khoảng hai câu. Thay tiếng đệm bằng một quãng lặng ngắn.'],
    target: { tab: 'train', section: 'long' },
    keys: 'noi dai doc thoai mo man be mac toc do',
  },
  {
    id: 'interp',
    group: 'train',
    title: 'Dịch',
    short: 'Câu tiếng Việt của người phát biểu hiện vài giây rồi ẩn, bạn nói lại bằng tiếng Anh. Dịch đủ ý là đạt.',
    what: 'Việc thật của MC song ngữ: dịch nối tiếp cho bố cô dâu, giám đốc, chủ tịch, người phát ngôn. 8 bộ, mỗi bộ 5 câu.',
    steps: [
      'Đọc câu tiếng Việt. Câu tự ẩn sau vài giây, hoặc bấm "Nhớ rồi" để ẩn sớm.',
      'Bấm mic và nói bản dịch tiếng Anh.',
      'Xem ý nào đã đủ, ý nào còn thiếu, và một cách dịch tự nhiên.',
    ],
    scoring: [
      'Chấm theo ý, không theo từng chữ: nhiều cách dịch khác nhau đều được.',
      'Bấm "Xem lại câu gốc" thì câu đó tối đa 2 sao.',
    ],
    tips: ['Nghe để bắt ý chính và con số, đừng cố nhớ từng chữ.'],
    target: { tab: 'train', section: 'interp' },
    keys: 'dich noi tiep song ngu viet anh phien dich',
  },
  {
    id: 'register',
    group: 'train',
    title: 'Văn phong',
    short: 'Nói lại một câu suồng sã cho đúng tông sân khấu. Đủ ý mà còn từ sai tông thì chưa đạt.',
    what: 'Cùng một ý, nói với bạn bè khác với nói trước 300 khách. Ví dụ "Hey guys, sit down" thành "Ladies and gentlemen, please take your seats". Có một bộ làm ngược lại, cho team building.',
    steps: [
      'Đọc câu nguồn (sai tông). Câu tự ẩn sau vài giây.',
      'Nói lại ý đó cho đúng tông của sự kiện.',
      'Xem các ý đã đủ và từ sai tông còn sót.',
    ],
    scoring: ['Đủ ý mà còn từ sai tông (như "guys", "boss") thì câu tối đa 1 sao. Máy chỉ rõ từ cần bỏ.'],
    tips: ['Lời trang trọng thường dùng "please", "may I", "we kindly ask" và gọi đúng chức danh.'],
    target: { tab: 'train', section: 'register' },
    keys: 'van phong trang trong than mat tong giong',
  },
  {
    id: 'cando',
    group: 'train',
    title: 'Năng lực',
    short: 'Xem danh sách việc bạn đã làm được bằng tiếng Anh, và làm bài kiểm tra 6 câu mỗi tuần.',
    what: 'Đo tiến bộ thật: không phải số bài đã chơi, mà là những việc MC bạn đã làm được, theo các bậc A2, B1, B2.',
    steps: [
      'Xem danh sách "Tôi làm được" và mục nào còn thiếu.',
      'Mỗi tuần làm bài kiểm tra 6 câu: máy chọn từ các bài bạn đã gặp, bạn tự nói lại câu của MC.',
    ],
    scoring: ['Bài kiểm tra chấm theo các từ mang ý của câu mẫu. Kết quả trung bình được ghi lại theo tuần.'],
    target: { tab: 'train', section: 'cando' },
    keys: 'nang luc kiem tra tuan cefr tien bo',
  },

  /* ---------- Sổ tay và Nhiệm vụ ---------- */
  {
    id: 'notebook',
    group: 'more',
    title: 'Sổ tay',
    short: 'Ôn từ bạn tự ghi, từ bạn hay đọc sai và các cụm đã mở. Mục đến hạn hiện lên đầu.',
    what: 'Nơi ôn tập cá nhân. Sổ tay có ba phần: "Từ của tôi" (từ bạn chạm để ghi), "Cần luyện" (từ máy thấy bạn hay đọc sai) và "Tất cả" (toàn bộ câu mẫu của các bài, lọc theo loại sự kiện).',
    steps: [
      'Từ của tôi: từ có nhãn "Từ mới" thì bấm "Tự đặt một câu MC có từ này" và nói. Từ có nhãn "Phát âm" thì bấm "Đọc từ", hoặc "Chấm từng âm".',
      'Bấm "Chưa thuộc" để đưa từ về đầu lịch ôn, "Đổi nhãn" để sửa nhãn, "Xoá" để bỏ.',
      'Bấm "Xuất danh sách" để tải file dùng được với Excel hoặc Anki.',
    ],
    scoring: [
      'Ôn đạt thì từ lên hộp cao hơn và giãn ngày ôn: 1, 2, 4, 8, 16 ngày. Chưa thuộc thì về hộp 1, mai ôn lại.',
      'Câu tự đặt phải có từ đó và đủ dài thành một câu trọn vẹn.',
    ],
    target: { tab: 'notebook' },
    keys: 'so tay tu cua toi can luyen xuat csv anki on tu',
  },
  {
    id: 'quests',
    group: 'more',
    title: 'Nhiệm vụ và thang nghề',
    short: 'Leo 10 cấp từ Tân binh tới Ngôi sao MC. Mỗi chương nhiệm vụ cho biết việc cần làm tiếp.',
    what: 'Thang nghề cho bạn mục tiêu dài hạn. Mỗi cấp mở thêm sự kiện lớn và câu hỏi khó hơn.',
    steps: [
      'Xem cấp hiện tại, danh hiệu và điểm còn thiếu để lên cấp.',
      'Làm các mục tiêu trong chương nhiệm vụ đang mở; mục đã xong được đánh dấu.',
    ],
    scoring: [
      'XP từ mọi hoạt động (bài học, Trò chuyện, Nói dài, Dịch, Phát âm…) dồn vào điểm lên cấp.',
      'Danh tiếng chỉ đổi khi Diễn. Sự kiện lớn cần cả cấp và danh tiếng tối thiểu.',
    ],
    target: { tab: 'quests' },
    keys: 'nhiem vu thang nghe cap danh tieng xp',
  },
  {
    id: 'save',
    group: 'more',
    title: 'Tiến độ được lưu ở đâu',
    short: 'Tiến độ lưu trên trình duyệt của máy bạn đang dùng. Đổi máy hoặc xoá dữ liệu trang web sẽ không còn tiến độ.',
    what: 'Game không có tài khoản: mọi tiến độ, sổ từ và sao đều nằm trong trình duyệt của máy này.',
    steps: [
      'Học trên một máy và một trình duyệt cố định để giữ tiến độ.',
      'Trên iPhone, nếu thêm game ra Màn hình chính, hãy luôn mở từ biểu tượng đó.',
      'Xuất sổ từ (Sổ tay, "Xuất danh sách") định kỳ nếu muốn giữ một bản sao.',
    ],
    keys: 'luu tien do du lieu doi may mat',
  },
];

export const GUIDE_BY_ID: Record<string, GuideEntry> = Object.fromEntries(GUIDE.map((e) => [e.id, e]));

/** Bỏ dấu tiếng Việt để tìm kiếm không cần gõ dấu. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Tìm bài hướng dẫn theo từ khoá; mọi từ trong câu tìm đều phải có mặt.
 * Bỏ dấu dễ làm trùng nhầm ("vặn" và "văn" đều thành "van"), nên bài khớp ở tiêu đề hoặc từ khoá
 * đứng trước, và cả cụm tìm phải xuất hiện liền nhau mới được xếp lên đầu.
 */
export function searchGuide(query: string): GuideEntry[] {
  const q = fold(query).trim().replace(/\s+/g, ' ');
  const words = q.split(' ').filter(Boolean);
  if (words.length === 0) return GUIDE;
  const scored: { e: GuideEntry; rank: number }[] = [];
  for (const e of GUIDE) {
    const head = fold(`${e.title} ${e.keys ?? ''}`);
    const hay = fold([e.title, e.short, e.what, ...e.steps, ...(e.scoring ?? []), ...(e.tips ?? []), e.keys ?? ''].join(' '));
    if (!words.every((w) => hay.includes(w))) continue;
    const rank = head.includes(q) ? 0 : words.every((w) => head.includes(w)) ? 1 : hay.includes(q) ? 2 : 3;
    scored.push({ e, rank });
  }
  return scored.sort((a, b) => a.rank - b.rank).map((x) => x.e);
}

/** Bài khớp thẳng tiêu đề hoặc từ khoá: trang Hướng dẫn mở sẵn những bài này khi tìm. */
export function isStrongMatch(e: GuideEntry, query: string): boolean {
  const q = fold(query).trim().replace(/\s+/g, ' ');
  return q !== '' && fold(`${e.title} ${e.keys ?? ''}`).includes(q);
}
