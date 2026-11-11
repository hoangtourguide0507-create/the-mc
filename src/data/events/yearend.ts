// Tiệc tất niên: MC dẫn tiệc cuối năm của một công ty đa quốc gia, từ chào mừng, điểm lại năm,
// mời tổng giám đốc nâng ly, bốc thăm trúng thưởng, vinh danh đến lời chúc năm mới.
import { eventScene, npc, type EventPack } from './types';

const pack: EventPack = {
  ui: { kind: 'Tiệc tất niên', theme: 'gala' },
  objective: {
    cefr: 'B1',
    can: 'Host a year-end party: welcome staff, review the year, introduce the CEO, run a lucky draw, honor a colleague and close with New Year wishes.',
    canVi: 'Dẫn tiệc tất niên: chào mừng nhân viên, điểm lại năm, giới thiệu tổng giám đốc, dẫn bốc thăm, vinh danh đồng nghiệp và chúc năm mới.',
  },
  npcs: {
    ben: npc('ben', 'Ben', 'HR Manager', { lang: 'en-US', gender: 'm', pitch: 1.0, rate: 1.02 }),
  },
  chunks: [
    [
      'Thank you for your hard work',
      'Cảm ơn sự chăm chỉ của bạn',
      'Bạn cảm ơn đồng nghiệp đã hoàn thành báo cáo gấp trong tuần này.',
      'Thank you for your hard work on the report, and I will share it with the team tomorrow.',
    ],
    [
      'let us raise our glasses',
      'hãy cùng nâng ly',
      'Trong buổi lễ khai trương văn phòng mới, bạn mời khách cùng nâng ly.',
      'At the office opening next week, let us raise our glasses to a bright future.',
    ],
  ],
  scene: eventScene({
    id: 'yearend',
    kind: 'Tiệc tất niên',
    level: 'Beginner+',
    reqLv: 2,
    title: 'The Year-End Party',
    sub: 'Dẫn tiệc tất niên của công ty đa quốc gia cùng HR Manager Ben',
    npc: 'ben',
    charisma: 30,
    turns: [
      {
        mode: 'scripted',
        npc: 'Good evening, Thien An. Our guests are seated, so please welcome everyone and open our year-end party.',
        npcVi: 'Chào buổi tối, Thiên Ân. Khách mời đã ngồi vào chỗ, bạn hãy chào đón mọi người và mở đầu tiệc tất niên nhé.',
        cue: 'Good evening, everyone, and welcome to our year-end party. Tonight we celebrate the year we have shared together.',
        cueVi: 'Chào buổi tối quý vị, và chào mừng đến với tiệc tất niên của chúng ta. Tối nay, chúng ta cùng ăn mừng một năm đã đi qua bên nhau.',
        key: 'welcome to our year-end party',
        tip: 'Mỉm cười và dừng một nhịp trước chữ "year-end" để khán giả biết tiệc đã bắt đầu.',
      },
      {
        mode: 'catch',
        npc: 'Before dinner, let us look back: this year our team closed three big projects and welcomed forty new colleagues.',
        npcVi: 'Trước bữa tối, hãy cùng nhìn lại: năm nay đội của chúng ta hoàn thành ba dự án lớn và chào đón bốn mươi đồng nghiệp mới.',
        cue: 'Before dinner, let us look back: this year our team closed three big {projects} and welcomed forty new {colleagues}.',
        cueVi: 'Trước bữa tối, hãy cùng nhìn lại: năm nay đội của chúng ta đã hoàn thành ba dự án lớn và chào đón bốn mươi đồng nghiệp mới.',
        catch: ['budget', 'holiday', 'trophy', 'office'],
        key: 'closed three big projects',
        tip: 'Nghe hai danh từ: số dự án đã hoàn thành và số đồng nghiệp mới. Đó là hai con số khán giả muốn nhớ.',
      },
      {
        mode: 'semi',
        npc: 'Now bring our CEO to the stage. She will share a short speech, then lead a toast to a successful new year.',
        npcVi: 'Bây giờ hãy mời tổng giám đốc lên sân khấu. Bà sẽ có một bài phát biểu ngắn, rồi dẫn mọi người nâng ly chúc một năm mới thành công.',
        frame: 'Ladies and gentlemen, let us welcome our CEO, who will ___ a short speech and then ___ a toast to the new year.',
        cueVi: 'Thưa quý vị, xin mời chào đón tổng giám đốc của chúng ta, người sẽ ___ một bài phát biểu ngắn và sau đó ___ ly chúc mừng năm mới.',
        blanks: 2,
        blankPool: [
          ['deliver', 'give', 'share'],
          ['propose', 'lead', 'raise'],
        ],
        sample: 'Ladies and gentlemen, let us welcome our CEO, who will deliver a short speech and then propose a toast to the new year.',
        key: 'deliver a short speech',
        tip: 'Điền động từ chỉ việc phát biểu, rồi động từ chỉ việc dẫn dắt lời chúc.',
      },
      {
        mode: 'quiz',
        reflex: 15,
        npc: 'For the lucky draw, keep the envelopes closed until I hand you the list of winners.',
        npcVi: 'Với phần bốc thăm trúng thưởng, bạn giữ các phong bì đóng kín cho đến khi tôi đưa danh sách người trúng thưởng.',
        question: 'Ben vừa dặn điều gì về phần bốc thăm trúng thưởng?',
        options: [
          { t: 'Our lucky draw winners will be announced in just a moment, so please keep your tickets ready.', ok: true },
          { t: 'Please open all the envelopes now, so everyone can see the prizes.', ok: false },
          { t: 'Tonight there is no lucky draw, so please move straight to dinner.', ok: false },
        ],
        cueVi: 'Người trúng thưởng sẽ được công bố trong giây lát, xin quý vị giữ sẵn vé của mình.',
        tip: 'Nghe kỹ "until" và "keep ... closed": phải chờ, chưa mở phong bì.',
      },
      {
        mode: 'scripted',
        npc: 'Next, please honor our Employee of the Year, Daniel. Invite him to the stage and congratulate him warmly.',
        npcVi: 'Tiếp theo, hãy vinh danh nhân viên xuất sắc của năm, Daniel. Mời anh lên sân khấu và chúc mừng anh thật nồng nhiệt.',
        cue: 'Our Employee of the Year is Daniel. Thank you for your hard work, and congratulations on a well-deserved award!',
        cueVi: 'Người được vinh danh là nhân viên xuất sắc của năm, Daniel. Cảm ơn sự chăm chỉ của bạn, và chúc mừng phần thưởng xứng đáng này!',
        key: 'thank you for your hard work',
        tip: 'Đặt tên người được vinh danh ở giữa câu, rồi nói lời cảm ơn để khán giả vỗ tay đúng lúc.',
      },
      {
        mode: 'scripted',
        npc: 'Dinner is ready in the main hall. Please invite everyone to enjoy the meal and toast with their colleagues.',
        npcVi: 'Bữa tối đã sẵn sàng ở sảnh chính. Bạn hãy mời mọi người thưởng thức bữa ăn và cùng nâng ly với đồng nghiệp.',
        cue: 'Dinner is now served in the main hall, so please enjoy the meal. Let us raise our glasses to a bright new year!',
        cueVi: 'Bữa tối đã được dọn ở sảnh chính, xin mời quý vị thưởng thức bữa ăn. Chúng ta hãy cùng nâng ly chúc một năm mới rực rỡ!',
        key: 'let us raise our glasses',
        tip: 'Mời khách dùng bữa bằng một câu ngắn, rồi nâng ly cùng khán giả.',
      },
      {
        mode: 'free',
        npc: 'Wonderful evening! Please close the party, thank everyone for a great year, and wish them a happy new year.',
        npcVi: 'Buổi tối thật tuyệt! Bạn hãy kết thúc tiệc, cảm ơn mọi người vì một năm tuyệt vời và chúc họ một năm mới hạnh phúc.',
        task: 'Kết thúc tiệc tất niên: cảm ơn mọi người và chúc năm mới.',
        taskVi: 'Bắt buộc có lời cảm ơn (thank / thanks / grateful) và lời chúc năm mới (new year / wish).',
        requiredKeywords: [
          ['thank', 'thanks', 'grateful'],
          ['new year', 'wish', 'happy new year'],
        ],
        bonusKeywords: [
          ['team', 'colleagues', 'together'],
          ['enjoy', 'celebrate', 'dinner', 'night'],
        ],
        sample: 'Thank you all for a wonderful year together. I wish you a happy new year, and please enjoy the rest of the night!',
        minWords: 15,
        key: 'happy new year',
        tip: 'Kết bằng lời cảm ơn, một lời chúc cụ thể và một câu mời khán giả tận hưởng đêm nay.',
      },
    ],
  }),
};

export default pack;
