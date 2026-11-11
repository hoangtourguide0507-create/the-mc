// Lễ cưới truyền thống: MC song ngữ dẫn lễ gia tiên tại nhà gái, có gia đình chú rể người nước ngoài.
// MC giải thích ý nghĩa từng nghi thức, mời hai gia đình vào vị trí và giữ không khí trang nghiêm mà ấm áp.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Lễ cưới truyền thống', theme: 'wedding' },
  objective: {
    cefr: 'B2',
    can: 'Guide a traditional Vietnamese family ceremony for foreign guests, explaining each ritual with warm, formal English.',
    canVi: 'Dẫn lễ gia tiên truyền thống Việt Nam cho khách nước ngoài, giải thích từng nghi thức bằng tiếng Anh trang trọng, ấm áp.',
  },
  npcs: {
    sophie: npc('sophie', 'Sophie', 'Wedding Planner', { lang: 'en-GB', gender: 'f', pitch: 1.0, rate: 0.98 }),
    robert: npc('robert', 'Robert', "Groom's Father", { lang: 'en-US', gender: 'm', pitch: 0.94, rate: 0.98 }),
  },
  chunks: [
    [
      'as a sign of respect',
      'như một dấu hiệu kính trọng',
      'Ở lễ tốt nghiệp, bạn mời cả hội trường đứng dậy để tỏ lòng tôn kính.',
      'We all stand for a minute of silence as a sign of respect for our departed colleague.',
    ],
    [
      'please take your seats',
      'xin mời quý vị vào chỗ',
      'Ở buổi hòa nhạc, bạn mời khán giả vào chỗ trước khi nhạc bắt đầu.',
      'Ladies and gentlemen, please take your seats, because the concert will begin in five minutes.',
    ],
  ],
  scene: eventScene({
    id: 'tradwedding',
    kind: 'Lễ cưới truyền thống',
    level: 'Advanced',
    reqLv: 5,
    minRep: 1.6,
    title: 'The Family Altar',
    sub: 'Dẫn lễ gia tiên song ngữ tại nhà gái, giải thích nghi thức cho gia đình chú rể người nước ngoài',
    npc: 'sophie',
    charisma: 55,
    turns: [
      {
        mode: 'scripted',
        npc: 'Thien An, our guests have taken their seats and both families are ready. Please welcome everyone and explain the first ritual, lighting incense at the ancestor altar.',
        npcVi: 'Thiên Ân, khách mời đã vào chỗ và hai gia đình đã sẵn sàng. Bạn hãy chào mừng mọi người và giải thích nghi thức đầu tiên, thắp hương trên bàn thờ tổ tiên.',
        cue: 'Good afternoon, everyone, and welcome. First, both families light incense at the ancestral altar to invite our ancestors to witness this day.',
        cueVi: 'Chào buổi chiều quý vị và chào mừng đến với lễ cưới truyền thống. Trước hết, hai gia đình cùng thắp hương trên bàn thờ tổ tiên để mời tổ tiên chứng giám ngày hôm nay.',
        key: 'both families light incense',
        tip: 'Giải thích ngắn gọn rằng thắp hương là mời tổ tiên về chứng kiến, rồi nói chậm cụm "ancestral altar" để khách nước ngoài theo kịp.',
      },
      {
        mode: 'catch',
        who: 'robert',
        npc: 'Thien An, my wife says the betel leaves and areca nut are a symbol of love and loyalty. Could you tell us why they matter so much?',
        npcVi: 'Thiên Ân, vợ tôi nói trầu cau là biểu tượng của tình yêu và lòng chung thủy. Bạn có thể cho chúng tôi biết vì sao điều đó quan trọng đến vậy không?',
        cue: 'Of course. Trau cau, betel leaves and areca nut, is a {symbol} of {loyalty}, and it represents the bond between two families.',
        cueVi: 'Tất nhiên rồi. Trầu cau, tức là lá trầu và quả cau, là biểu tượng của lòng chung thủy, và chúng đại diện cho sự gắn kết giữa hai gia đình.',
        catch: ['ceremony', 'flower', 'gift', 'dinner'],
        key: 'a symbol of loyalty',
        tip: 'Ông Robert vừa nhắc đến hai danh từ quan trọng nhất của câu trả lời: "symbol" và "loyalty". Hãy đọc lại đúng hai từ đó.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'Small change: please do not start the tea ceremony yet. The groom is still changing into his traditional clothes, so ask everyone to wait a little longer.',
        npcVi: 'Thay đổi nhỏ: bạn đừng bắt đầu lễ dâng trà vội. Chú rể vẫn đang thay trang phục truyền thống, nên bạn hãy đề nghị mọi người chờ thêm một chút.',
        question: 'Sophie vừa dặn điều gì về lễ dâng trà?',
        options: [
          { t: 'The tea ceremony starts right now, so please bring the tea to the altar immediately.', ok: false },
          { t: 'Ladies and gentlemen, please be patient, because the tea ceremony will begin in a few minutes.', ok: true },
          { t: 'The families are ready, so let us begin the tea ceremony and the photos together.', ok: false },
        ],
        cueVi: 'Thưa quý vị, xin hãy kiên nhẫn, vì lễ dâng trà sẽ bắt đầu sau vài phút nữa.',
        tip: 'Nghe kỹ "do not start ... yet" và "wait a little longer": MC phải giữ khán giả chờ, chưa bắt đầu.',
      },
      {
        mode: 'semi',
        npc: 'Now the tea ceremony. Ask the couple to serve tea to both sets of parents, and briefly explain why this gesture matters to our guests.',
        npcVi: 'Giờ đến lễ dâng trà. Bạn hãy mời cô dâu chú rể dâng trà lên cả hai bên bố mẹ, và giải thích ngắn gọn vì sao cử chỉ này quan trọng với khách mời.',
        frame: 'Ladies and gentlemen, the bride and groom will ___ tea to their ___ as a sign of respect.',
        cueVi: 'Thưa quý vị, cô dâu và chú rể sẽ ___ trà lên ___ của mình như một dấu hiệu kính trọng.',
        blanks: 2,
        blankPool: [
          ['offer', 'serve', 'present'],
          ['parents', 'elders', 'grandparents'],
        ],
        sample: 'Ladies and gentlemen, the bride and groom will offer tea to their parents as a sign of respect.',
        key: 'as a sign of respect',
        tip: 'Điền động từ "offer" và danh từ "parents", rồi nói chậm cụm "as a sign of respect" với giọng trang trọng.',
      },
      {
        mode: 'scripted',
        who: 'robert',
        npc: 'Thien An, what does the fruit tray on the table mean? My son wants to understand every ritual, and honestly, so do I.',
        npcVi: 'Thiên Ân, mâm quả trên bàn có ý nghĩa gì vậy? Con trai tôi muốn hiểu mọi nghi thức, và thật lòng mà nói, tôi cũng vậy.',
        cue: 'Ladies and gentlemen, the mam qua, or gift trays, are offered by the family of the groom and carry wishes for prosperity and many happy years.',
        cueVi: 'Thưa quý vị, mâm quả do nhà trai mang đến, gửi gắm lời chúc thịnh vượng và trăm năm hạnh phúc.',
        key: 'the fruit tray carries wishes',
        tip: 'Trả lời ông Robert bằng giọng kể chuyện. Nói rõ "mam qua" là mâm quả để khách nước ngoài hiểu ngay.',
      },
      {
        mode: 'scripted',
        npc: 'Next, please invite both families to take their places at the altar for the family photograph. Keep the mood warm but calm, because this is a serious moment.',
        npcVi: 'Tiếp theo, bạn hãy mời hai gia đình vào vị trí trước bàn thờ để chụp ảnh gia đình. Giữ không khí ấm áp nhưng bình tĩnh, vì đây là khoảnh khắc trang trọng.',
        cue: 'Dear guests, please take your seats, and may I invite both families to stand in front of the altar for the family photograph.',
        cueVi: 'Kính thưa quý khách, xin mời quý vị an toạ, và xin mời hai gia đình đứng trước bàn thờ để chụp ảnh lưu niệm.',
        key: 'please take your seats',
        tip: 'Gọi hai gia đình bằng "dear families" rồi nói chậm cụm "please take your seats" để mọi người cùng di chuyển.',
      },
      {
        mode: 'free',
        npc: 'Beautiful ceremony! Please close this part of the program, thank both families, and tell our guests the reception begins in the garden.',
        npcVi: 'Lễ cưới thật đẹp! Bạn hãy kết thúc phần lễ, cảm ơn hai gia đình và cho khách mời biết tiệc chiêu đãi bắt đầu ở khu vườn.',
        task: 'Kết thúc phần lễ gia tiên: cảm ơn hai gia đình và mời khách sang tiệc chiêu đãi.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks) và nhắc đến tiệc chiêu đãi (reception / feast / banquet).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['reception', 'feast', 'banquet'],
        ],
        bonusKeywords: [
          ['families', 'parents', 'guests'],
          ['today', 'this afternoon', 'joining'],
        ],
        sample: 'Thank you to both families for joining us today. Please join us in the garden for the reception and enjoy a traditional feast.',
        minWords: 15,
        key: 'thank you both families',
        tip: 'Kết bằng lời cảm ơn cụ thể gửi hai gia đình, rồi chỉ rõ tiệc chiêu đãi ở đâu.',
      },
    ],
  }),
};

export default pack;
