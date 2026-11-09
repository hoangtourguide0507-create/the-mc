/**
 * Kho bài "Bắt lỗi phát âm" dành cho người Việt.
 * Mỗi bài gồm: phiên âm IPA, cách tách âm tiết có đánh dấu trọng âm, lỗi thường gặp
 * và lý do về mặt âm vị, mẹo luyện, và một câu mẫu để nghe.
 */

export type PronGroup = 'vowel' | 'stress' | 'silent' | 'final' | 'cluster' | 'pair' | 'ending' | 'spelling';

export interface PronSyllable {
  text: string;
  stressed: boolean;
}

export interface PronMistake {
  /** Cách đọc sai thường gặp, viết theo kiểu tiếng Việt để dễ nhận ra */
  wrong: string;
  /** Vì sao người Việt hay đọc như vậy */
  why: string;
}

export interface PronDrill {
  id: string;
  word: string;
  /** Phiên âm IPA, có dấu trọng âm ˈ trước âm tiết được nhấn */
  ipa: string;
  /** Phiên âm thay thế được chấp nhận (ví dụ /ʊ/ và /uː/ trong value) */
  ipaAlt?: string;
  group: PronGroup;
  syllables: PronSyllable[];
  mistakes: PronMistake[];
  /** Phân tích từng âm, viết ngắn gọn bằng tiếng Việt */
  analysis: { part: string; note: string }[];
  tip: string;
  /** Chuỗi chữ được chấp nhận khi nhận dạng giọng nói (chữ thường) */
  accepted: string[];
  /** Từ dễ nhầm để so sánh (cặp tối thiểu) */
  pair?: string;
  sentence: { en: string; vi: string };
}

/** Mỗi nhóm lỗi gắn với một NPC đóng vai "huấn luyện viên" trong game. */
export const PRON_GROUP_META: Record<PronGroup, { label: string; coachId: string; hint: string }> = {
  vowel: { label: 'Nguyên âm căng/lỏng', coachId: 'leo', hint: 'Phân biệt /ɪ/ với /iː/, /æ/ với /ɛ/' },
  stress: { label: 'Trọng âm', coachId: 'tom', hint: 'Đặt trọng âm đúng âm tiết' },
  silent: { label: 'Chữ câm', coachId: 'victoria', hint: 'Không đọc chữ l, g câm' },
  final: { label: 'Phụ âm cuối', coachId: 'sam', hint: 'Giữ phụ âm cuối, không thêm nguyên âm' },
  cluster: { label: 'Cụm phụ âm', coachId: 'david', hint: 'Nối cụm phụ âm, không chèn "ơ"' },
  pair: { label: 'Cặp dễ nhầm', coachId: 'alex', hint: 'Hai từ gần giống nhau, nghĩa khác' },
  ending: { label: 'Đuôi -s, -es', coachId: 'ivy', hint: 'Đuôi -es đọc /ɪz/, /z/ hay /s/ tùy âm đứng trước' },
  spelling: { label: 'Chữ viết dễ đánh lừa', coachId: 'grandma', hint: 'Đừng đọc theo mặt chữ' },
};

export const PRON_DRILLS: PronDrill[] = [
  {
    id: 'pr-value',
    word: 'value',
    ipa: '/ˈvæl.juː/',
    ipaAlt: '/ˈvæl.ju/',
    group: 'vowel',
    syllables: [
      { text: 'VAL', stressed: true },
      { text: 'yoo', stressed: false },
    ],
    mistakes: [
      { wrong: 'va-lu-ê (3 âm tiết)', why: 'Tách “ue” thành hai âm và đọc /e/ ở cuối, trong khi chữ “ue” ở đây chỉ là /juː/.' },
      { wrong: 'va-lu (mất /j/)', why: 'Bỏ bán nguyên âm /j/ nên âm thứ hai thành /u/ ngay, nghe giống “va-lu” chứ không phải “va-lyu”.' },
      { wrong: 'va-LƯ (nhấn sai)', why: 'Nhấn vào âm tiết cuối vì chữ “ue” trông nổi bật. Trọng âm đúng ở VAL.' },
    ],
    analysis: [
      {
        part: 'VAL /væl/',
        note: 'Nguyên âm /æ/ nằm giữa “a” và “e” của tiếng Việt: miệng mở rộng hơn, lưỡi hạ thấp, không đọc thành “ va ” hay “ vẹt ”. Âm /l/ đứng cuối âm tiết là “l tối”: đầu lưỡi chạm vòm miệng và phần sau lưỡi hạ xuống. Tiếng Việt không có /l/ làm phụ âm cuối, nên người học hay bỏ hẳn /l/ hoặc đổi thành “u”.',
      },
      {
        part: 'yoo /juː/ (hoặc /ju/)',
        note: 'Bắt đầu bằng /j/ giống “y” trong “yes”, rồi đến nguyên âm /uː/ dài và căng. Một số từ điển Anh-Mỹ ghi /ju/ ngắn và lỏng hơn. Cả hai đều được chấp nhận; quan trọng là có /j/ và không tách thành hai âm tiết.',
      },
      {
        part: 'Trọng âm',
        note: 'Âm tiết VAL được nhấn mạnh, âm tiết yoo nhẹ và ngắn. Nói như một từ liền mạch: VAL-yoo, không phải va-LƯ.',
      },
    ],
    tip: 'Đặt tay lên cằm và giữ /l/ cuối VAL, đừng bật ra thành “u”. Sau đó nói nhanh “yoo” nhẹ, không kéo dài.',
    accepted: ['value', 'values', 'valued'],
    pair: 'valve',
    sentence: {
      en: 'The value of this painting is much higher than I expected.',
      vi: 'Giá trị của bức tranh này cao hơn nhiều so với tôi mong đợi.',
    },
  },
  {
    id: 'pr-recipe',
    word: 'recipe',
    ipa: '/ˈres.ə.pi/',
    group: 'stress',
    syllables: [
      { text: 'RE', stressed: true },
      { text: 'suh', stressed: false },
      { text: 'pee', stressed: false },
    ],
    mistakes: [
      { wrong: 'ri-sai / ri-síp', why: 'Đọc theo chữ cái và nhấn âm sau. Trọng âm nằm ở âm tiết đầu.' },
    ],
    analysis: [
      { part: 'RE /res/', note: 'Âm “e” ngắn, mở, không đọc thành “i”.' },
      { part: 'suh /ə/', note: 'Âm schwa, yếu và ngắn. Đừng đọc thành “ơ” kéo dài.' },
      { part: 'pee /piː/', note: 'Âm cuối là /iː/ dài, nhấn nhẹ hơn âm đầu.' },
    ],
    tip: 'Đọc ba âm tiết, nhấn âm đầu rồi để hai âm sau nhẹ dần.',
    accepted: ['recipe'],
    sentence: {
      en: 'Could you share the recipe for this soup?',
      vi: 'Bạn chia sẻ công thức món súp này được không?',
    },
  },
  {
    id: 'pr-pizza',
    word: 'pizza',
    ipa: '/ˈpiːt.sə/',
    group: 'spelling',
    syllables: [
      { text: 'PEET', stressed: true },
      { text: 'suh', stressed: false },
    ],
    mistakes: [
      { wrong: 'pi-da', why: 'Đọc chữ “z” thành /d/ theo quen tai, và âm /ts/ cuối không có trong tiếng Việt.' },
    ],
    analysis: [
      { part: 'PEET /piːt/', note: 'Nguyên âm /iː/ dài và căng, âm /t/ bật nhẹ ở cuối.' },
      { part: 'suh /tsə/', note: 'Âm /ts/ là một âm đơn: đầu lưỡi chạm chân răng rồi xát nhẹ. Không đọc thành /d/.' },
    ],
    tip: 'Nói “peet” rồi nối thẳng sang “tsuh”, như “pit-sa” nhưng kéo dài ở /iː/.',
    accepted: ['pizza', 'pitza'],
    sentence: {
      en: 'Let us order a large pizza for the whole team.',
      vi: 'Hãy gọi một chiếc pizza cỡ lớn cho cả đội.',
    },
  },
  {
    id: 'pr-vegetable',
    word: 'vegetable',
    ipa: '/ˈvedʒ.tə.bəl/',
    group: 'silent',
    syllables: [
      { text: 'VEJ', stressed: true },
      { text: 'tuh', stressed: false },
      { text: 'bul', stressed: false },
    ],
    mistakes: [
      { wrong: 've-gét-ta-bồ', why: 'Đọc chữ “g” thành /g/. Âm đúng là /dʒ/ và chữ “e” đầu không đọc thành “ê”.' },
    ],
    analysis: [
      { part: 'VEJ /vedʒ/', note: 'Âm /dʒ/ là một âm xát-tắc, giống “j” trong “job”. Không có /g/.' },
      { part: 'tuh /tə/', note: 'Âm schwa, rất yếu.' },
      { part: 'bul /bəl/', note: '“l” cuối là âm tiết thành phần: lưỡi chạm vòm miệng, hơi có tiếng “bơ-l”.' },
    ],
    tip: 'Đọc hai âm tiết đầu thành “vej-tuh”, âm cuối nhẹ và ngắn.',
    accepted: ['vegetable', 'vegetables'],
    sentence: {
      en: 'Please add more vegetables to my salad.',
      vi: 'Làm ơn cho thêm rau vào món salad của tôi.',
    },
  },
  {
    id: 'pr-pretty',
    word: 'pretty',
    ipa: '/ˈprɪt.i/',
    group: 'vowel',
    syllables: [
      { text: 'PRIT', stressed: true },
      { text: 'ee', stressed: false },
    ],
    mistakes: [
      { wrong: 'pờ-rét-ti', why: 'Đọc nguyên âm thành /e/ như trong “vẹt”. Âm đúng là /ɪ/: ngắn, lỏng, miệng hơi mở.' },
    ],
    analysis: [
      { part: 'PRIT /prɪt/', note: 'Nguyên âm /ɪ/ ngắn và lỏng, khác /iː/ dài trong “street”. Lưỡi cao hơn /e/ một chút.' },
      { part: 'ee /i/', note: 'Âm cuối nhẹ, gần /iː/ nhưng ngắn.' },
    ],
    tip: 'Nói “prit” thật ngắn, đừng kéo dài. Đây là nguyên âm dễ nhầm với /e/ nhất.',
    accepted: ['pretty', 'prity'],
    pair: 'pity',
    sentence: {
      en: 'That dress looks really pretty on you.',
      vi: 'Chiếc váy này trông thật xinh trên bạn.',
    },
  },
  {
    id: 'pr-unique',
    word: 'unique',
    ipa: '/juːˈniːk/',
    group: 'stress',
    syllables: [
      { text: 'yoo', stressed: false },
      { text: 'NEEK', stressed: true },
    ],
    mistakes: [
      { wrong: 'ju-ni-que', why: 'Tách thành ba âm tiết và đọc chữ “e” cuối. Từ có hai âm tiết, âm cuối là /k/.' },
      { wrong: 'YOO-nik', why: 'Nhấn âm đầu, trong khi trọng âm rơi vào âm tiết thứ hai.' },
    ],
    analysis: [
      { part: 'yoo /juː/', note: 'Bắt đầu bằng /j/, nguyên âm dài nhẹ, không nhấn.' },
      { part: 'NEEK /ˈniːk/', note: 'Trọng âm ở đây. Nguyên âm /iː/ dài và căng, kết thúc bằng /k/ không bật hơi.' },
    ],
    tip: 'Nói “yoo-NEEK”, nhấn âm thứ hai và đóng hẳn âm /k/.',
    accepted: ['unique', 'uniquely'],
    sentence: {
      en: 'Each dish on this menu has a unique flavor.',
      vi: 'Mỗi món trong thực đơn này đều có hương vị độc đáo.',
    },
  },
  {
    id: 'pr-comfortable',
    word: 'comfortable',
    ipa: '/ˈkʌmf.tə.bəl/',
    group: 'stress',
    syllables: [
      { text: 'KUMF', stressed: true },
      { text: 'tuh', stressed: false },
      { text: 'bul', stressed: false },
    ],
    mistakes: [
      { wrong: 'com-for-ta-bồ', why: 'Đọc đủ các âm tiết như đánh vần. Trong thực tế âm “o” thứ hai bị lược và trọng âm nằm ở âm đầu.' },
    ],
    analysis: [
      { part: 'KUMF /kʌmf/', note: 'Nguyên âm /ʌ/ ngắn, gần “ă” nhưng không kéo dài. Âm /f/ cuối được giữ đầy đủ.' },
      { part: 'tuh /tə/', note: 'Âm schwa yếu, gần như biến mất khi nói nhanh.' },
      { part: 'bul /bəl/', note: 'Âm cuối nhẹ, giống “bồ” nhưng không có âm “ô” rõ.' },
    ],
    tip: 'Nói ba âm tiết thành “KUMF-tuh-bul”, và hạ giọng ở hai âm sau.',
    accepted: ['comfortable', 'comfortably'],
    sentence: {
      en: 'Make yourself comfortable, the show starts in five minutes.',
      vi: 'Cứ thoải mái nhé, chương trình bắt đầu trong năm phút nữa.',
    },
  },
  {
    id: 'pr-half',
    word: 'half',
    ipa: '/hæf/',
    group: 'silent',
    syllables: [{ text: 'HAF', stressed: true }],
    mistakes: [
      { wrong: 'ha-lf', why: 'Đọc chữ “l” theo chữ viết. Trong từ này “l” không được phát âm.' },
    ],
    analysis: [
      { part: 'HAF /hæf/', note: 'Nguyên âm /æ/ theo sau là /f/ cuối. Không có /l/, dù chữ viết có “l”.' },
    ],
    tip: 'Bỏ hẳn “l” và kết thúc bằng môi răng /f/.',
    accepted: ['half'],
    sentence: {
      en: 'We finished half of the show before the break.',
      vi: 'Chúng tôi đã hoàn thành một nửa chương trình trước giờ nghỉ.',
    },
  },
  {
    id: 'pr-talk',
    word: 'talk',
    ipa: '/tɔːk/',
    group: 'silent',
    syllables: [{ text: 'TAWK', stressed: true }],
    mistakes: [
      { wrong: 'tác-l / tóc-lơ', why: 'Đọc “l” theo chữ viết. “L” trong “talk” là chữ câm.' },
    ],
    analysis: [
      { part: 'TAWK /tɔːk/', note: 'Nguyên âm /ɔː/ dài và tròn môi. Kết thúc bằng /k/ không bật hơi.' },
    ],
    tip: 'Tròn môi khi nói “aw”, kết thúc bằng “k” ngắn gọn.',
    accepted: ['talk', 'talks', 'talked'],
    sentence: {
      en: 'Let us talk about the schedule after the rehearsal.',
      vi: 'Chúng ta nói về lịch trình sau buổi diễn tập nhé.',
    },
  },
  {
    id: 'pr-ship',
    word: 'ship',
    ipa: '/ʃɪp/',
    group: 'pair',
    syllables: [{ text: 'SHIP', stressed: true }],
    mistakes: [
      { wrong: 'síp (kéo dài)', why: 'Kéo dài nguyên âm /ɪ/ thành /iː/, khiến từ thành “sheep”.' },
    ],
    analysis: [
      { part: 'SHIP /ʃɪp/', note: 'Nguyên âm /ɪ/ ngắn và lỏng. Lưỡi cao hơn /e/ nhưng không căng như /iː/.' },
    ],
    tip: 'Nói ngắn, như “shíp” trong tiếng Việt nhưng không kéo dài.',
    accepted: ['ship', 'ships'],
    pair: 'sheep',
    sentence: {
      en: 'The ship will arrive at the port tomorrow morning.',
      vi: 'Con tàu sẽ cập cảng vào sáng mai.',
    },
  },
  {
    id: 'pr-not',
    word: 'not',
    ipa: '/nɒt/',
    group: 'pair',
    syllables: [{ text: 'NOT', stressed: true }],
    mistakes: [
      { wrong: 'nốt / nâu-t', why: 'Đọc nguyên âm /oʊ/ như trong “note”, hoặc kéo dài nguyên âm.' },
    ],
    analysis: [
      { part: 'NOT /nɒt/', note: 'Nguyên âm /ɒ/ ngắn, tròn môi nhẹ. Khác với /oʊ/ là nguyên âm đôi trong “note”.' },
    ],
    tip: 'Mở miệng vừa phải, nói ngắn “nót”. Không đẩy môi thành “ô-u”.',
    accepted: ['not', 'knot'],
    pair: 'note',
    sentence: {
      en: 'I am not sure which song comes next.',
      vi: 'Tôi không chắc bài hát nào sẽ đến tiếp theo.',
    },
  },
  {
    id: 'pr-bit',
    word: 'bit',
    ipa: '/bɪt/',
    group: 'pair',
    syllables: [{ text: 'BIT', stressed: true }],
    mistakes: [
      { wrong: 'bai-t', why: 'Đọc thành nguyên âm đôi /aɪ/ như trong “bite”.' },
    ],
    analysis: [
      { part: 'BIT /bɪt/', note: 'Nguyên âm /ɪ/ ngắn, kết thúc bằng /t/ không bật hơi.' },
    ],
    tip: 'Nói “bít” ngắn gọn. Không thêm âm “ai” ở giữa.',
    accepted: ['bit'],
    pair: 'bite',
    sentence: {
      en: 'Can I have a little bit more time to prepare?',
      vi: 'Tôi có thể xin thêm chút thời gian chuẩn bị không?',
    },
  },
  {
    id: 'pr-stop',
    word: 'stop',
    ipa: '/stɒp/',
    group: 'final',
    syllables: [{ text: 'STOP', stressed: true }],
    mistakes: [
      { wrong: 'sờ-tóp-ơ', why: 'Thêm nguyên âm sau /p/. Tiếng Anh giữ phụ âm cuối không có nguyên âm đi kèm.' },
    ],
    analysis: [
      { part: 'STOP /stɒp/', note: 'Cụm /st/ đầu không chèn nguyên âm. Âm /p/ cuối đóng môi và dừng, không bật thêm “ơ”.' },
    ],
    tip: 'Đóng môi ở cuối, không mở ra thành “ơ”.',
    accepted: ['stop', 'stops', 'stopped'],
    sentence: {
      en: 'Please stop by the stage before you leave.',
      vi: 'Làm ơn ghé qua sân khấu trước khi bạn về nhé.',
    },
  },
  {
    id: 'pr-street',
    word: 'street',
    ipa: '/striːt/',
    group: 'cluster',
    syllables: [{ text: 'STREET', stressed: true }],
    mistakes: [
      { wrong: 'sờ-tờ-rít', why: 'Chèn nguyên âm giữa /s/ và /t/. Cụm /str/ đọc liền nhau.' },
    ],
    analysis: [
      { part: 'STR /str/', note: 'Ba phụ âm liền nhau: /s/, /t/, /r/. Không chèn nguyên âm, và /r/ không cuốn lưỡi như tiếng Việt.' },
      { part: 'EET /iːt/', note: 'Nguyên âm /iː/ dài và căng.' },
    ],
    tip: 'Nói “s-tr” liền một hơi, rồi kéo dài /iː/.',
    accepted: ['street', 'streets'],
    sentence: {
      en: 'The parade goes down the main street at noon.',
      vi: 'Đoàn diễu hành đi qua con phố chính vào buổi trưa.',
    },
  },
  {
    id: 'pr-watches',
    word: 'watches',
    ipa: '/ˈwɒtʃɪz/',
    group: 'ending',
    syllables: [
      { text: 'WOTCH', stressed: true },
      { text: 'iz', stressed: false },
    ],
    mistakes: [
      { wrong: 'wát-chét', why: 'Đọc đuôi -es thành /ét/. Sau âm /tʃ/, đuôi -es đọc /ɪz/.' },
    ],
    analysis: [
      { part: 'WOTCH /wɒtʃ/', note: 'Âm /tʃ/ là một âm tắc-xát, giống “ch” trong “chair”.' },
      { part: 'iz /ɪz/', note: 'Đuôi -es sau âm xát hoặc tắc-xát như /tʃ/, /ʃ/, /s/ đọc thành /ɪz/.' },
    ],
    tip: 'Thêm âm “iz” nhẹ ở cuối sau “watch”, như “wót-chiz”.',
    accepted: ['watches', 'watch', 'watchers'],
    sentence: {
      en: 'She watches the rehearsal every day after work.',
      vi: 'Cô ấy xem buổi diễn tập mỗi ngày sau giờ làm.',
    },
  },
  {
    id: 'pr-cats',
    word: 'cats',
    ipa: '/kæts/',
    group: 'ending',
    syllables: [{ text: 'KATS', stressed: true }],
    mistakes: [
      { wrong: 'két-zờ', why: 'Đọc đuôi -s thành /z/ vì chữ viết. Sau /t/ vô thanh, đuôi -s đọc /s/.' },
    ],
    analysis: [
      { part: 'KATS /kæts/', note: 'Âm /s/ cuối là vô thanh, không rung dây thanh âm. Khi đuôi -s theo sau âm vô thanh như /t/, /k/, /p/, phải đọc /s/.' },
    ],
    tip: 'Thổi nhẹ ở cuối “cats” như “xì”, không rung cổ.',
    accepted: ['cats', 'cat'],
    sentence: {
      en: 'Two cats were sleeping under the table.',
      vi: 'Hai chú mèo đang ngủ dưới bàn.',
    },
  },
];

/** Lấy bài theo nhóm lỗi, dùng để gắn với NPC. */
export function coachFor(drill: PronDrill): string {
  return PRON_GROUP_META[drill.group].coachId;
}

/** Số lần gần nhất không được lặp lại. */
export const PRON_RECENT_WINDOW = 5;

/** Kết quả đã lưu cho từng bài: số lần thử và số lần đạt. */
export interface PronProgress {
  tries: number;
  ok: number;
}

/**
 * Chọn bài ngẫu nhiên có trọng số:
 * - Bài chưa thử: trọng số 3.
 * - Bài đạt dưới 60%: trọng số 2 (cần luyện thêm).
 * - Bài đã thành thạo: trọng số 1.
 * Không chọn lại các bài trong `recent` nếu còn lựa chọn khác.
 */
export function pickPronDrill(
  progress: Record<string, PronProgress>,
  recent: string[],
  rng: () => number = Math.random,
  pool: PronDrill[] = availableDrills(progress)
): PronDrill {
  const fresh = pool.filter((d) => !recent.includes(d.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  const weights = candidates.map((d) => {
    const p = progress[d.id];
    if (!p || p.tries === 0) return 3;
    return p.ok / p.tries < 0.6 ? 2 : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/**
 * Lộ trình luyện phát âm: nhóm lỗi từ dễ đến khó với người Việt. Nhóm sau chỉ mở khi
 * mọi bài của nhóm trước đã được thử và đạt tỉ lệ đúng từ 60% trở lên.
 */
export const PRON_LADDER: PronGroup[] = ['ending', 'silent', 'final', 'vowel', 'pair', 'cluster', 'stress', 'spelling'];
export const PRON_MASTERY = 0.6;

/** Một nhóm được coi là đạt khi mọi bài của nhóm đã có lượt thử và đều đạt ngưỡng. */
export function groupMastered(progress: Record<string, PronProgress>, group: PronGroup): boolean {
  const drills = PRON_DRILLS.filter((d) => d.group === group);
  return drills.every((d) => {
    const p = progress[d.id];
    return !!p && p.tries > 0 && p.ok / p.tries >= PRON_MASTERY;
  });
}

/** Các nhóm đang mở: luôn có nhóm đầu tiên, và mỗi nhóm đã đạt thì mở thêm nhóm kế tiếp. */
export function unlockedGroups(progress: Record<string, PronProgress>): PronGroup[] {
  const open: PronGroup[] = [PRON_LADDER[0]];
  for (let i = 0; i < PRON_LADDER.length - 1; i++) {
    if (!groupMastered(progress, PRON_LADDER[i])) break;
    open.push(PRON_LADDER[i + 1]);
  }
  return open;
}

/** Bài đang mở khoá theo lộ trình. */
export function availableDrills(progress: Record<string, PronProgress>): PronDrill[] {
  const open = new Set(unlockedGroups(progress));
  return PRON_DRILLS.filter((d) => open.has(d.group));
}
