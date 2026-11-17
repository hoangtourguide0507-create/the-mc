// Bắt các lỗi ngữ pháp hay gặp của người Việt khi nói tiếng Anh, trong câu đã được nhận dạng.
// Đây không phải bộ phân tích ngữ pháp đầy đủ: mỗi luật là một mẫu sai điển hình, viết chặt để
// không báo nhầm câu đúng. tests/grammar.test.mjs chạy mọi luật trên toàn bộ câu mẫu tiếng Anh của
// game và đòi không có lỗi nào bị báo nhầm.
//
// Hai loại:
// - 'grammar': sai ngữ pháp. Lượt có sao thì tối đa 2 sao (`capForGrammar`).
// - 'style': đúng nhưng suồng sã so với sân khấu (gonna, wanna…). Chỉ ghi chú, không trừ sao.

export interface GrammarIssue {
  /** Đoạn câu bị sai, như máy nghe được */
  wrong: string;
  /** Cách sửa */
  fix: string;
  kind?: 'grammar' | 'style';
  /** Giải thích ngắn bằng tiếng Việt */
  why?: string;
}

interface Rule {
  re: RegExp;
  fix: (m: RegExpExecArray) => string;
  why: string;
  kind?: 'grammar' | 'style';
}

const BE_ADJ =
  'happy|glad|ready|sure|sorry|excited|proud|honored|honoured|delighted|pleased|grateful|thankful|here|late|busy|tired|nervous|free|available|afraid|able|interested|right|wrong|fine|okay|good|sad|surprised|confident|responsible|aware|correct|welcome';
const SUBJ_BE: Record<string, string> = { i: 'am', you: 'are', we: 'are', they: 'are', he: 'is', she: 'is', it: 'is' };
const PAST_TO_BASE: Record<string, string> = {
  went: 'go', came: 'come', saw: 'see', took: 'take', gave: 'give', made: 'make', had: 'have', did: 'do',
  said: 'say', told: 'tell', got: 'get', met: 'meet', left: 'leave', thought: 'think', bought: 'buy',
  brought: 'bring', began: 'begin', spoke: 'speak', wrote: 'write', ate: 'eat', sent: 'send', knew: 'know',
  found: 'find', forgot: 'forget', arrived: 'arrive', wanted: 'want', started: 'start', finished: 'finish',
  invited: 'invite', asked: 'ask', called: 'call', liked: 'like', loved: 'love', needed: 'need',
};
const PAST_TO_PART: Record<string, string> = {
  went: 'gone', came: 'come', saw: 'seen', took: 'taken', gave: 'given', ate: 'eaten', began: 'begun',
  wrote: 'written', spoke: 'spoken', did: 'done', knew: 'known', forgot: 'forgotten', drove: 'driven', chose: 'chosen',
};
const ING_TO_BASE: Record<string, string> = {
  being: 'be', having: 'have', doing: 'do', making: 'make', going: 'go', getting: 'get', welcoming: 'welcome',
  introducing: 'introduce', inviting: 'invite', announcing: 'announce', thanking: 'thank', giving: 'give',
  taking: 'take', seeing: 'see', meeting: 'meet', starting: 'start', beginning: 'begin', sharing: 'share',
  celebrating: 'celebrate', speaking: 'speak', presenting: 'present', telling: 'tell', asking: 'ask',
};
const THIRD: Record<string, string> = {
  go: 'goes', do: 'does', have: 'has', want: 'wants', need: 'needs', like: 'likes', love: 'loves', know: 'knows',
  work: 'works', live: 'lives', speak: 'speaks', say: 'says', come: 'comes', make: 'makes', think: 'thinks',
  look: 'looks', seem: 'seems', play: 'plays', sing: 'sings', agree: 'agrees',
};
const UNCOUNT = 'information|advice|equipment|furniture|luggage|baggage|feedback|news|homework|knowledge|evidence|money|traffic';
const COMPARATIVE = 'better|worse|easier|bigger|faster|cheaper|happier|larger|smaller|higher|lower|older|younger|stronger|longer|shorter|nicer|busier|earlier|later';

const cap = (s: string) => s;
const SUBJECT_START = /^(i|you|we|they|he|she|it|this|that|everybody|everyone|someone|somebody|nobody|each|people|children|guests|ladies)\s/i;
const PREV_SKIP = /\b(will|would|can|could|should|must|may|might|did|does|do|to|let|make|makes|made|help|helps|watch|see|saw|hear|heard|why|not|are|is|am|were|was|been|be|feel|felt|look|seem|keep|keeps|kept|find|found|leave|left|thank|meet|wish|want|have|has|get|got|call|called|consider|how|where|when|what)\s+$/i;
const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/* Không báo "to + V-ing" khi "to" là giới từ: look forward to, used to, committed to… */
const TO_PREP = /(?:back|forward|used|accustomed|committed|dedicated|devoted|addition|respect|regard|regards|prior|object|objection|contribute|contributes|key|comes|close|closer|thanks|due|according|opposed|related|similar|thanks|welcome|toast|cheers|attention|access|approach|answer|response|introduction|reply|solution|commitment|dedication|devotion|tribute)\s+to\s+$/i;

const RULES: Rule[] = [
  /* ---------- Động từ "to be" ---------- */
  {
    // I very happy / we so excited / it here → thiếu am, are, is
    re: /\b(i|you|we|they|he|she)\s+((?:very|so|really|truly|extremely|all)\s+)?(happy|glad|ready|sure|sorry|excited|proud|honored|honoured|delighted|pleased|grateful|thankful|late|busy|tired|nervous|afraid|interested|confident|responsible|surprised)\b/gi,
    fix: (m) => join(m[1], SUBJ_BE[m[1].toLowerCase()], m[2]?.trim(), m[3]),
    why: 'Trước tính từ cần động từ "to be" (am, is, are).',
  },
  {
    // it my pleasure / it a great honor / it an honor
    re: /\b(it|this|that)\s+(a|an|my|our|your|the|such\s+an?)\s+(great\s+|real\s+|big\s+)?(pleasure|honou?r|privilege|moment|day|night|evening|surprise)\b/gi,
    fix: (m) => join(m[1], 'is', m[2], m[3]?.trim(), m[4]),
    why: 'Thiếu "is": "It is my pleasure…".',
  },
  {
    // I am agree / we are disagree / I am not agree
    re: /\b(i\s+am|i'm|we\s+are|we're|they\s+are|you\s+are|he\s+is|she\s+is)\s+(not\s+)?(agree|disagree)\b/gi,
    fix: (m) => {
      const subj = m[1].split(/\s+|'/)[0];
      const third = /^(he|she)$/i.test(subj);
      return m[2] ? join(subj, third ? "doesn't" : "don't", m[3]) : join(subj, third ? `${m[3]}s` : m[3]);
    },
    why: '"Agree" là động từ, không đi với "am/are".',
  },
  {
    // will be begin / will be start
    re: /\b(will|can|could|should|must|would|may|might)\s+be\s+(begin|start|finish|continue|come|arrive|announce)\b/gi,
    fix: (m) => join(m[1], m[2]),
    why: 'Sau "will" dùng động từ nguyên mẫu, bỏ "be".',
  },
  {
    // will is / can are
    re: /\b(will|can|could|should|must|would|may|might)\s+(is|are|am)\b/gi,
    fix: (m) => join(m[1], 'be'),
    why: 'Sau "will, can, should…" dùng "be".',
  },
  {
    // the show is begin / guests are arrive
    re: /\b(is|are|am)\s+(begin|start|finish|arrive|come)\b/gi,
    fix: (m) => `${m[2]}s / ${m[1]} ${m[2] === 'begin' ? 'beginning' : m[2] === 'come' ? 'coming' : m[2] === 'arrive' ? 'arriving' : `${m[2]}ing`}`,
    why: 'Không đi "is" cùng động từ nguyên mẫu: dùng "starts" hoặc "is starting".',
  },
  {
    // everybody are / everyone have / people is
    re: /\b(everybody|everyone|someone|somebody|nobody|each\s+of\s+you)\s+(are|have|were)\b/gi,
    fix: (m) => join(m[1], m[2] === 'are' ? 'is' : m[2] === 'were' ? 'was' : 'has'),
    why: '"Everyone" đi với động từ số ít: is, has.',
  },
  {
    re: /\b(people|children|guests|ladies\s+and\s+gentlemen)\s+(is|was|has)\b/gi,
    fix: (m) => join(m[1], m[2] === 'is' ? 'are' : m[2] === 'was' ? 'were' : 'have'),
    why: 'Danh từ số nhiều đi với "are, were, have".',
  },
  {
    re: /\bthere\s+is\s+(many|two|three|four|five|six|several|lots\s+of|a\s+lot\s+of\s+(?:people|guests))\b/gi,
    fix: (m) => join('there are', m[1]),
    why: 'Số nhiều thì dùng "there are".',
  },

  /* ---------- Động từ sau "to", "will", "did" ---------- */
  {
    // to being / to welcoming (trừ khi "to" là giới từ)
    re: /\bto\s+(being|having|doing|making|going|getting|welcoming|introducing|inviting|announcing|thanking|giving|taking|seeing|meeting|starting|beginning|sharing|celebrating|speaking|presenting|telling|asking)\b/gi,
    fix: (m) => join('to', ING_TO_BASE[m[1].toLowerCase()]),
    why: 'Sau "to" dùng động từ nguyên mẫu: "to be", "to welcome".',
  },
  {
    re: /\b(can|could|should|must|will|would|may|might)\s+to\s+([a-z]+)\b/gi,
    fix: (m) => join(m[1], m[2]),
    why: 'Sau "can, will, should…" không có "to".',
  },
  {
    re: /\b(let'?s|let\s+us|let\s+me)\s+to\s+([a-z]+)\b/gi,
    fix: (m) => join(m[1], m[2]),
    why: 'Sau "let\'s" không có "to".',
  },
  {
    re: /\bmake\s+(me|him|her|us|them|you|everyone)\s+to\s+([a-z]+)\b/gi,
    fix: (m) => join('make', m[1], m[2]),
    why: '"Make someone do", không có "to".',
  },
  {
    // did went / didn't came / will went / can saw
    re: /\b(did|didn't|did\s+not|does|doesn't|do|don't|will|won't|can|can't|could|should|must|would|may|might)\s+(went|came|saw|took|gave|made|had|said|told|got|met|left|thought|bought|brought|began|spoke|wrote|ate|sent|knew|found|forgot|arrived|wanted|started|finished|invited|asked|called|liked|loved|needed)\b/gi,
    fix: (m) => join(m[1], PAST_TO_BASE[m[2].toLowerCase()]),
    why: 'Sau "did, will, can…" dùng động từ nguyên mẫu.',
  },
  {
    // have went / has came
    re: /\b(have|has|had|i've|we've|you've|they've)\s+(went|came|saw|took|gave|ate|began|wrote|spoke|did|knew|forgot|drove|chose)\b/gi,
    fix: (m) => join(m[1], PAST_TO_PART[m[2].toLowerCase()]),
    why: 'Sau "have" dùng quá khứ phân từ: "have gone", "has come".',
  },

  /* ---------- Chia động từ ngôi thứ ba ---------- */
  {
    re: /\b(he|she|it)\s+(don't|do\s+not)\b/gi,
    fix: (m) => join(m[1], "doesn't"),
    why: '"He, she, it" đi với "doesn\'t".',
  },
  {
    // he have / she go / he want (không báo sau will, can, did, to, let…)
    re: /\b(he|she)\s+(go|do|have|want|need|like|love|know|work|live|speak|say|come|make|think|look|seem|play|sing|agree)\b/gi,
    fix: (m) => join(m[1], THIRD[m[2].toLowerCase()]),
    why: '"He, she" ở hiện tại đơn thì động từ thêm -s: "he has", "she goes".',
  },

  /* ---------- So sánh ---------- */
  {
    re: new RegExp(`\\bmore\\s+(${COMPARATIVE})\\b`, 'gi'),
    fix: (m) => m[1],
    why: 'Từ đã có -er thì bỏ "more".',
  },
  {
    // chỉ bắt khi có "than", vì "more good news" (thêm tin tốt) là câu đúng
    re: /\bmore\s+(easy|big|fast|cheap|happy|large|small|high|low|old|young|strong|long|short|nice|busy|early|good|bad)\s+than\b/gi,
    fix: (m) => ({ easy: 'easier', big: 'bigger', fast: 'faster', cheap: 'cheaper', happy: 'happier', large: 'larger', small: 'smaller', high: 'higher', low: 'lower', old: 'older', young: 'younger', strong: 'stronger', long: 'longer', short: 'shorter', nice: 'nicer', busy: 'busier', early: 'earlier', good: 'better', bad: 'worse' })[m[1].toLowerCase()] ?? m[1],
    why: 'Tính từ ngắn so sánh bằng -er: "easier", không phải "more easy".',
  },
  {
    re: /\b(the\s+)?most\s+(best|worst|biggest|happiest|easiest|greatest|largest)\b/gi,
    fix: (m) => join('the', m[2]),
    why: 'Từ đã có -est thì bỏ "most".',
  },

  /* ---------- Danh từ, mạo từ ---------- */
  {
    re: new RegExp(`\\b(informations|advices|equipments|furnitures|luggages|baggages|feedbacks|homeworks|knowledges|evidences)\\b`, 'gi'),
    fix: (m) => m[1].replace(/s$/i, ''),
    why: 'Danh từ không đếm được, không thêm -s.',
  },
  {
    re: new RegExp(`\\bmany\\s+(${UNCOUNT})\\b`, 'gi'),
    fix: (m) => join('a lot of', m[1]),
    why: 'Danh từ không đếm được thì dùng "much" hoặc "a lot of", không dùng "many".',
  },
  {
    re: /\bone\s+of\s+(the|our|my|your|their)\s+(guest|speaker|winner|friend|sponsor|partner|reason|member|artist|leader|customer|client)\b/gi,
    fix: (m) => join('one of', m[1], m[2].endsWith('s') ? m[2] : `${m[2]}s`),
    why: 'Sau "one of the" dùng danh từ số nhiều.',
  },
  {
    // a + nguyên âm (chữ thường, trừ một vài từ đọc như phụ âm)
    re: /\ba\s+((?!one\b|once\b|eu|uni|use|usu|ur)[aeiou][a-z]+)\b/g,
    fix: (m) => join('an', m[1]),
    why: 'Trước âm nguyên âm dùng "an": "an honor", "an amazing night".',
  },
  {
    // a hour, a honor: chữ h câm nên dùng "an"
    re: /\ba\s+(hours?|honou?r(?:ed|able)?|honest(?:ly)?|heirs?)\b/gi,
    fix: (m) => join('an', m[1]),
    why: 'Chữ "h" câm (hour, honor, honest) nên dùng "an".',
  },
  {
    // an + phụ âm (chữ thường; chữ viết tắt như "an MC" là đúng nên không xét)
    re: /\ban\s+((?!h(?:our|onou?r|onest|eir))[b-df-hj-np-tv-z][a-z]{3,})\b/g,
    fix: (m) => join('a', m[1]),
    why: 'Trước âm phụ âm dùng "a".',
  },

  /* ---------- Cụm từ và giới từ ---------- */
  { re: /\bdiscuss\s+about\b/gi, fix: () => 'discuss', why: '"Discuss" không đi với "about".' },
  { re: /\bmention\s+about\b/gi, fix: () => 'mention', why: '"Mention" không đi với "about".' },
  { re: /\bemphasi[sz]e\s+on\b/gi, fix: () => 'emphasize', why: '"Emphasize" không đi với "on".' },
  { re: /\bexplain\s+(me|us|him|her|them)\b/gi, fix: (m) => join('explain it to', m[1]), why: '"Explain something to someone".' },
  { re: /\bsay\s+(me|him|her|us)\b/gi, fix: (m) => join('tell', m[1]), why: '"Tell someone", không phải "say someone".' },
  { re: /\blisten\s+(music|the\s+music|me|him|her|us|them)\b/gi, fix: (m) => join('listen to', m[1]), why: '"Listen to".' },
  { re: /\bwait\s+(me|him|her|us|them)\b/gi, fix: (m) => join('wait for', m[1]), why: '"Wait for someone".' },
  { re: /\bdepend(s|ed)?\s+of\b/gi, fix: (m) => join(`depend${m[1] ?? ''}`, 'on'), why: '"Depend on".' },
  { re: /\bmarr(y|ied)\s+with\b/gi, fix: (m) => `marr${m[1]}`, why: '"Marry someone", không có "with".' },
  { re: /\barrive(s|d)?\s+to\s+(?=(?:the|a|an|my|our|your|this|that|home)\b)/gi, fix: (m) => join(`arrive${m[1] ?? ''}`, 'at / in'), why: '"Arrive at" (nơi nhỏ) hoặc "arrive in" (thành phố).' },
  { re: /\bjoin(s|ed)?\s+with\s+(us|me|them)\b/gi, fix: (m) => join(`join${m[1] ?? ''}`, m[2]), why: '"Join us", không có "with".' },
  { re: /\bgo(es)?\s+to\s+home\b/gi, fix: (m) => `go${m[1] ?? ''} home`, why: '"Go home", không có "to".' },
  { re: /\bthank\s+for\b/gi, fix: () => 'thank you for', why: '"Thank you for" hoặc "Thanks for".' },
  { re: /\bcongratulation\b(?!s)/gi, fix: () => 'congratulations', why: 'Lời chúc mừng luôn có -s: "Congratulations".' },
  { re: /\bon\s+behalf\s+(my|our|the|your|his|her)\b/gi, fix: (m) => join('on behalf of', m[1]), why: '"On behalf of".' },
  { re: /\bladies\s+and\s+gentleman\b/gi, fix: () => 'ladies and gentlemen', why: '"Gentlemen" số nhiều.' },
  { re: /\bsince\s+(two|three|four|five|six|seven|eight|nine|ten|many|several|\d+)\s+(years|months|weeks|days|hours)\b/gi, fix: (m) => join('for', m[1], m[2]), why: 'Khoảng thời gian dùng "for"; "since" đi với mốc thời gian.' },
  { re: /\baccording\s+to\s+me\b/gi, fix: () => 'in my opinion', why: 'Nói ý mình: "In my opinion".' },
  { re: /\bi\s+very\s+(like|love|want|enjoy|appreciate|hope|thank)\b/gi, fix: (m) => join('I really', m[1]), why: '"Very" không đứng trước động từ: dùng "really".' },
  { re: /\balthough\b[^.?!]*?,?\s+but\b/gi, fix: () => 'although … (bỏ "but")', why: 'Đã có "although" thì không dùng thêm "but".' },
  { re: /\bbecause\b[^.?!]*?,\s*so\b/gi, fix: () => 'because … (bỏ "so")', why: 'Đã có "because" thì không dùng thêm "so".' },

  /* ---------- Văn phong (không trừ sao) ---------- */
  { re: /\bgonna\b/gi, fix: () => 'going to', why: 'Khẩu ngữ. Trên sân khấu trang trọng nên nói "going to".', kind: 'style' },
  { re: /\bwanna\b/gi, fix: () => 'want to', why: 'Khẩu ngữ. Nên nói "want to" hoặc "would like to".', kind: 'style' },
  { re: /\bgotta\b/gi, fix: () => 'have to', why: 'Khẩu ngữ. Nên nói "have to".', kind: 'style' },
  { re: /\bkinda\b/gi, fix: () => 'kind of', why: 'Khẩu ngữ. Nên nói "kind of" hoặc "a little".', kind: 'style' },
];

/** Trả về các lỗi tìm thấy trong câu nói (đã nhận dạng). Mỗi đoạn sai chỉ báo một lần. */
export function findGrammarIssues(text: string): GrammarIssue[] {
  const src = (text || '').replace(/[’‘]/g, "'");
  const out: GrammarIssue[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(src))) {
      if (m[0].length === 0) {
        rule.re.lastIndex += 1;
        continue;
      }
      // "to" là giới từ (look forward to seeing…) thì "to + V-ing" là đúng
      if (/^to\s/i.test(m[0]) && TO_PREP.test(src.slice(0, m.index + 3))) continue;
      // Câu bắt đầu bằng chủ ngữ mà ngay trước là trợ động từ, động từ sai khiến hoặc "to be"
      // (Does everyone have…, Are you ready, make it a great night, let her go…) thì không phải lỗi
      if (SUBJECT_START.test(m[0]) && PREV_SKIP.test(src.slice(0, m.index))) continue;
      const wrong = m[0].replace(/\s+/g, ' ').trim();
      const key = wrong.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ wrong, fix: cap(rule.fix(m)), why: rule.why, kind: rule.kind ?? 'grammar' });
    }
  }
  return out;
}

/** Chỉ các lỗi ngữ pháp thật (bỏ ghi chú văn phong). */
export function grammarErrors(issues: GrammarIssue[] | undefined): GrammarIssue[] {
  return (issues ?? []).filter((i) => (i.kind ?? 'grammar') === 'grammar');
}

/** Có lỗi ngữ pháp rõ ràng thì tối đa 2 sao. */
export function capForGrammar<T extends number>(stars: T, issues: GrammarIssue[] | undefined): T {
  return (grammarErrors(issues).length > 0 && stars > 2 ? 2 : stars) as T;
}

/* Giữ hằng để các nơi khác dùng chung danh sách tính từ "to be" nếu cần */
export const BE_ADJECTIVES = BE_ADJ.split('|');
