// Lễ ký kết: MC dẫn lễ ký biên bản ghi nhớ hợp tác giữa doanh nghiệp Việt Nam và đối tác nước ngoài,
// giới thiệu đại biểu theo nghi thức, mời hai bên lên bàn ký, trao đổi văn bản, mời phát biểu và nâng ly.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Lễ ký kết', theme: 'conference' },
  objective: {
    cefr: 'B1',
    can: 'Host a formal signing ceremony: introduce delegates in protocol order, invite signatories, and close with a toast.',
    canVi: 'Dẫn lễ ký kết trang trọng: giới thiệu đại biểu theo thứ tự nghi thức, mời các bên ký và kết thúc bằng lời chúc mừng.',
  },
  npcs: {
    claire: npc('claire', 'Claire', 'Protocol Officer', { lang: 'en-GB', gender: 'f', pitch: 1.0, rate: 0.98 }),
  },
  chunks: [
    [
      'We look forward to',
      'Chúng tôi mong chờ',
      'Cuối buổi họp khách hàng, bạn nói về kế hoạch tiếp theo với đối tác.',
      'We look forward to hearing your feedback on the new menu next week.',
    ],
    [
      'raise your glass to',
      'Xin nâng ly chúc mừng',
      'Trong tiệc sinh nhật, bạn mời mọi người chúc mừng chủ nhân buổi tiệc.',
      'Before the dessert, please raise your glass to the happy couple in this room.',
    ],
  ],
  scene: eventScene({
    id: 'signing',
    kind: 'Lễ ký kết',
    level: 'Intermediate',
    reqLv: 4,
    minRep: 1.2,
    title: 'The Signing Ceremony',
    sub: 'Dẫn lễ ký biên bản ghi nhớ hợp tác giữa doanh nghiệp Việt Nam và đối tác nước ngoài cùng nhân viên nghi lễ Claire',
    npc: 'claire',
    charisma: 45,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, the delegations are seated and the media are ready. Please welcome everyone and explain why we are gathering today.',
        npcVi: 'Thiên Ân, các đoàn đại biểu đã vào chỗ và báo chí đã sẵn sàng. Bạn hãy chào mừng mọi người và nói rõ lý do chúng ta có mặt hôm nay.',
        cue: 'Good morning, distinguished guests. Today we are honored to witness the signing of a memorandum of understanding between two partners.',
        cueVi: 'Kính thưa quý vị đại biểu, hôm nay chúng ta vinh dự chứng kiến lễ ký biên bản ghi nhớ hợp tác giữa hai đối tác.',
        key: 'memorandum of understanding',
        tip: 'Đọc chậm lời chào và dừng một nhịp trước khi nhắc tới biên bản ghi nhớ.',
      },
      {
        mode: 'catch',
        npc: 'Please introduce the delegation from our partner company first, then the board of our own company, following the protocol order.',
        npcVi: 'Bạn hãy giới thiệu đoàn đại biểu của công ty đối tác trước, sau đó là ban lãnh đạo của công ty mình, theo đúng thứ tự nghi thức.',
        cue: 'Allow me to introduce the {delegation} from our partner company, followed by the {board} of our own company.',
        cueVi: 'Xin phép được giới thiệu đoàn đại biểu của công ty đối tác, tiếp theo là ban lãnh đạo của công ty chúng tôi.',
        catch: ['audience', 'sponsor', 'interpreter', 'banquet'],
        key: 'delegation from our partner company',
        tip: 'Nghe đúng hai danh từ chỉ nhóm người được giới thiệu: đoàn đại biểu và ban lãnh đạo.',
      },
      {
        mode: 'scripted',
        npc: 'This memorandum opens the way to shared research, new technology and training for our staff. Please explain why this partnership matters.',
        npcVi: 'Biên bản ghi nhớ này mở đường cho nghiên cứu chung, công nghệ mới và đào tạo cho đội ngũ nhân viên. Bạn hãy nói vì sao hợp tác này quan trọng.',
        cue: 'This memorandum marks a new chapter for both companies, opening the way to shared research, innovation and long-term growth.',
        cueVi: 'Biên bản ghi nhớ này mở ra một chương mới cho cả hai công ty, mở đường cho nghiên cứu chung, đổi mới và tăng trưởng lâu dài.',
        key: 'a new chapter for both companies',
        tip: 'Nói về ý nghĩa theo ba ý: lợi ích cho cả hai bên, đổi mới, và tăng trưởng.',
      },
      {
        mode: 'semi',
        npc: 'Now invite both signing parties to the table. Remind the audience that each side will sign two copies and keep one.',
        npcVi: 'Giờ hãy mời hai bên ký kết lên bàn ký. Nhắc khán giả rằng mỗi bên sẽ ký hai bản và giữ một bản.',
        frame: 'Now I kindly invite the signatories to come to the ___ and sign the ___.',
        cueVi: 'Giờ xin trân trọng mời các bên ký kết đến ___ và ký ___.',
        blanks: 2,
        blankPool: [
          ['signing table', 'table', 'stage'],
          ['memorandum', 'documents', 'agreement'],
        ],
        sample: 'Now I kindly invite the signatories to come to the signing table and sign the memorandum.',
        key: 'come to the signing table',
        tip: 'Điền cụm chỉ địa điểm (bàn ký) và danh từ chỉ văn bản (biên bản).',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Once the documents are signed, let both parties exchange them and pose together for a photo. Hold the speeches until after that.',
        npcVi: 'Khi văn bản đã ký xong, hãy mời hai bên trao đổi văn bản và chụp ảnh chung. Các bài phát biểu hãy để sau đó.',
        question: 'Claire vừa dặn MC điều gì sau khi ký văn bản?',
        options: [
          { t: 'Please welcome our director to the stage to share a few words.', ok: false },
          { t: 'The ceremony is now over, so please leave the hall in an orderly way.', ok: false },
          { t: 'Let us now exchange the documents and take a commemorative photo together.', ok: true },
        ],
        cueVi: 'Bây giờ xin mời hai bên trao đổi văn bản và cùng chụp ảnh lưu niệm.',
        tip: 'Nghe kỹ cụm "hold the speeches until after that": việc đầu tiên là trao đổi văn bản và chụp ảnh.',
      },
      {
        mode: 'scripted',
        npc: 'Please invite our chairman to say a few words about this partnership. Keep the speech to about three minutes.',
        npcVi: 'Hãy mời chủ tịch công ty lên phát biểu vài lời về hợp tác này. Giữ bài phát biểu khoảng ba phút.',
        cue: 'Please welcome our chairman, who would like to share a few words. We look forward to a long and fruitful partnership.',
        cueVi: 'Xin mời chủ tịch công ty chúng ta lên phát biểu vài lời. Chúng tôi mong chờ một quan hệ hợp tác lâu dài và thành công.',
        key: 'share a few words',
        tip: 'Giới thiệu bằng chức danh thay vì tên, rồi nêu ngắn gọn mục đích bài phát biểu.',
      },
      {
        mode: 'free',
        npc: 'Excellent. Finally, please invite everyone to raise a glass to this partnership, and thank our guests for coming.',
        npcVi: 'Tuyệt vời. Cuối cùng, bạn hãy mời mọi người nâng ly chúc mừng hợp tác này và cảm ơn khách mời đã đến.',
        task: 'Mời khách nâng ly chúc mừng thành công của hợp tác và cảm ơn khách đã có mặt.',
        taskVi: 'Bắt buộc có lời mời nâng ly (raise your glass / toast / cheers) và lời cảm ơn (thank / thanks).',
        requiredKeywords: [
          ['raise your glass', 'toast', 'cheers'],
          ['thank', 'thanks', 'grateful'],
        ],
        bonusKeywords: [
          ['success', 'partnership', 'cooperation'],
          ['today', 'joining', 'morning'],
        ],
        sample: 'Thank you all for joining us today. Please raise your glass to the success of this partnership!',
        minWords: 15,
        key: 'raise your glasses to the success',
        tip: 'Kết lễ ký kết bằng lời mời nâng ly cụ thể, ngắn gọn và trang trọng.',
      },
    ],
  }),
};

export default pack;
