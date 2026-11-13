/**
 * Hậu trường: logic hội thoại mở với AI (không đụng mạng, không đụng DOM).
 * - Dựng lời nhắc cho AI: nhập vai + sửa lỗi câu của người học, trả về JSON.
 * - Đọc câu trả lời của AI một cách chịu lỗi.
 * - Cắt bớt lịch sử để tiết kiệm token của gói miễn phí.
 * - AI giả (mock) cho test và cho chạy thử khi chưa có khoá.
 */
import type { Persona } from '../data/backstage';

export type Speaker = 'npc' | 'me';

export interface Correction {
  /** Câu người học nói (máy nghe được) */
  original: string;
  /** Câu đã sửa, tự nhiên như người bản xứ */
  fixed: string;
  /** Giải thích ngắn bằng tiếng Việt */
  noteVi: string;
}

export interface ChatTurn {
  who: Speaker;
  text: string;
  /** Chỉ có ở lượt của người học khi AI thấy lỗi */
  correction?: Correction | null;
}

export interface AiReply {
  reply: string;
  correction: Correction | null;
  goalMet: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Số lượt nói tối đa của người học trong một buổi */
export const MAX_MY_TURNS = 10;
/** Số lượt gần nhất gửi kèm cho AI (mỗi lượt là một câu NPC hoặc một câu người học) */
export const HISTORY_WINDOW = 12;
/** Giới hạn độ dài câu người học gửi lên (ký tự) */
const MAX_INPUT_CHARS = 400;

export function systemPrompt(p: Persona): string {
  return [
    `You are role-playing ${p.role}`,
    `Situation: ${p.setting}`,
    `You are talking to Thien An, a Vietnamese event MC who is practising spoken English (around CEFR ${p.cefr}).`,
    `Thien An's goal in this conversation: ${p.goal}`,
    '',
    'How to play your character:',
    '- Speak natural, spoken English, like a real person on the phone or backstage. Use contractions.',
    '- Keep each reply short: 1 to 3 sentences, at most 45 words. Usually end with a question so Thien An has to answer.',
    '- Do not explain the goal and do not teach inside your reply. Stay in character. Never switch to Vietnamese.',
    `- Around the 3rd or 4th exchange, bring up this complication: ${p.twist}`,
    "- If Thien An's answer is vague, ask a follow-up question like a real client would.",
    '- When the goal has clearly been reached, or after about 10 exchanges, wrap up the conversation politely in character.',
    '',
    "You are also a quiet English tutor. Look only at Thien An's latest message.",
    '- The message comes from speech recognition: ignore punctuation, capital letters and obvious recognition slips of a single word.',
    '- Correct grammar mistakes, wrong word choice, or phrasing a native speaker would find unnatural or impolite for this situation.',
    '- If the message is fine, correction must be null. Do not correct style preferences.',
    '- noteVi explains the main fix in Vietnamese, at most 20 words.',
    '',
    'Answer with JSON only, no other text:',
    '{"reply": "<your in-character reply>", "correction": null or {"fixed": "<corrected sentence>", "noteVi": "<short Vietnamese explanation>"}, "goalMet": true or false}',
  ].join('\n');
}

/** Lời nhắc gửi cho AI: vai, lịch sử gần nhất, câu mới của người học */
export function buildMessages(p: Persona, history: ChatTurn[], userText: string): ChatMessage[] {
  const recent = history.slice(-HISTORY_WINDOW);
  const msgs: ChatMessage[] = [{ role: 'system', content: systemPrompt(p) }];
  // Câu mở đầu luôn có, kể cả khi bị cắt khỏi cửa sổ, để AI nhớ bối cảnh
  if (history.length > recent.length && history[0]?.who === 'npc') {
    msgs.push({ role: 'assistant', content: JSON.stringify({ reply: history[0].text, correction: null, goalMet: false }) });
  }
  for (const t of recent) {
    if (t.who === 'npc') msgs.push({ role: 'assistant', content: JSON.stringify({ reply: t.text, correction: null, goalMet: false }) });
    else msgs.push({ role: 'user', content: t.text });
  }
  msgs.push({ role: 'user', content: cleanInput(userText) });
  return msgs;
}

export function cleanInput(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Đọc JSON của AI. Chịu được rào ``` , chữ thừa trước/sau, và trường thiếu. */
export function parseAiReply(raw: string, userText: string): AiReply {
  const text = (raw ?? '').trim();
  let obj: unknown = null;
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  obj = tryParse(text);
  if (!obj) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) obj = tryParse(text.slice(start, end + 1));
  }
  if (!obj || typeof obj !== 'object') {
    // AI không trả JSON: coi cả đoạn là lời thoại, không có sửa lỗi
    const reply = text.replace(/^```[a-z]*|```$/g, '').trim();
    return { reply: reply || 'Sorry, could you say that again?', correction: null, goalMet: false };
  }
  const o = obj as Record<string, unknown>;
  const reply = typeof o.reply === 'string' && o.reply.trim() ? o.reply.trim() : 'Sorry, could you say that again?';
  let correction: Correction | null = null;
  const c = o.correction as Record<string, unknown> | null | undefined;
  if (c && typeof c === 'object' && typeof c.fixed === 'string' && c.fixed.trim()) {
    const fixed = c.fixed.trim();
    // Bỏ "sửa" chỉ khác dấu câu / hoa thường: đó là lỗi của máy nghe, không phải của người học
    if (norm(fixed) !== norm(userText)) {
      correction = { original: cleanInput(userText), fixed, noteVi: typeof c.noteVi === 'string' ? c.noteVi.trim() : '' };
    }
  }
  return { reply, correction, goalMet: o.goalMet === true };
}

export function myTurnCount(history: ChatTurn[]): number {
  return history.filter((t) => t.who === 'me').length;
}

export function isFinished(history: ChatTurn[], goalMet: boolean): boolean {
  return goalMet || myTurnCount(history) >= MAX_MY_TURNS;
}

export interface Summary {
  myTurns: number;
  corrected: number;
  /** Tỉ lệ câu không cần sửa, 0..100 */
  cleanPct: number;
  corrections: Correction[];
  goalMet: boolean;
  xp: number;
}

/** XP: 2 cho mỗi câu nói, thêm 1 nếu câu không cần sửa, thêm 10 nếu đạt mục tiêu */
export function summarize(history: ChatTurn[], goalMet: boolean): Summary {
  const mine = history.filter((t) => t.who === 'me');
  const corrections = mine.map((t) => t.correction).filter((c): c is Correction => !!c);
  const clean = mine.length - corrections.length;
  return {
    myTurns: mine.length,
    corrected: corrections.length,
    cleanPct: mine.length ? Math.round((clean / mine.length) * 100) : 0,
    corrections,
    goalMet,
    xp: mine.length * 2 + clean + (goalMet ? 10 : 0),
  };
}

/* ---------- AI giả: dùng cho test và chạy thử khi chưa có khoá ---------- */

const MOCK_FIXES: [RegExp, string, string][] = [
  [/\bI am agree\b/i, 'I agree', 'Agree là động từ, không đi với "am".'],
  [/\bdiscuss about\b/i, 'discuss', '"Discuss" không cần "about".'],
  [/\bhe have\b/i, 'he has', 'Ngôi thứ ba số ít dùng "has".'],
  [/\bshe have\b/i, 'she has', 'Ngôi thứ ba số ít dùng "has".'],
  [/\bmore better\b/i, 'better', '"Better" đã là so sánh hơn.'],
];

export function mockReply(p: Persona, history: ChatTurn[], userText: string): AiReply {
  let fixed = userText;
  let noteVi = '';
  for (const [re, to, note] of MOCK_FIXES) {
    if (re.test(fixed)) {
      fixed = fixed.replace(re, to);
      noteVi ||= note;
    }
  }
  const n = myTurnCount(history) + 1;
  const replies = [
    'Okay, that sounds good. And what happens right after that?',
    'Right. How long do you think that part will take?',
    `Oh, one more thing. ${p.twist.replace(/^\w+ (suddenly )?(says|mentions|asks)( that)? /i, '')}`,
    'Hmm, I see. So what would you suggest we do?',
    'That makes sense. Is there anything you need from me?',
  ];
  const goalMet = n >= 6;
  const reply = goalMet ? "Perfect, I think we're all set. Thank you so much, see you on the day!" : replies[(n - 1) % replies.length];
  return { reply, correction: fixed !== userText ? { original: userText, fixed, noteVi } : null, goalMet };
}
