// "Hỏi AI: vì sao nói vậy?" trong thẻ từ: dựng câu hỏi gửi AI, nhớ câu trả lời đã có, và tách
// câu trả lời thành đoạn/gạch đầu dòng để hiện an toàn (không chèn HTML từ AI).
import type { ChatMessage } from './aiClient';

export interface AskContext {
  /** Từ hoặc cụm người học đang chọn */
  phrase: string;
  /** Câu gốc chứa cụm đó */
  sentence: string;
  sentenceVi?: string;
}

export interface QaTurn {
  q: string;
  a: string;
}

/** Câu hỏi bấm nhanh. `fill` là chữ điền sẵn vào ô để người học gõ tiếp. */
export const QUICK_ASKS: { label: string; q?: string; fill?: string }[] = [
  { label: 'Vì sao dùng như vậy?', q: 'Vì sao trong câu này lại dùng “{p}”? Giải thích cấu trúc ngữ pháp.' },
  { label: 'Sao không nói…?', fill: 'Sao không nói “…”?' },
  { label: 'Cách nói khác', q: 'Có những cách nói nào khác thay cho “{p}”? Khác nhau thế nào (trang trọng, thân mật)?' },
  { label: 'Dùng khi nào?', q: 'MC dùng “{p}” trong tình huống nào? Cho 2 ví dụ ngắn.' },
];

export const ASK_SYSTEM = [
  'Bạn là giáo viên tiếng Anh của một MC sự kiện người Việt (trình độ khoảng B1–B2), dẫn tiệc cưới và sự kiện song ngữ.',
  'Người học đang xem một câu tiếng Anh trong bài luyện và hỏi về một từ hoặc cụm trong câu đó.',
  'Trả lời bằng tiếng Việt, ngắn gọn (khoảng 80–160 từ), dễ đọc trên điện thoại.',
  'Cách trả lời:',
  '- Trả lời thẳng câu hỏi ngay câu đầu.',
  '- Giải thích cách dùng hoặc cấu trúc ngữ pháp trong đúng câu này; gọi tên cấu trúc bằng tiếng Việt, thêm thuật ngữ tiếng Anh trong ngoặc nếu có ích.',
  '- Nếu người học đưa ra cách nói khác: nói rõ cách đó đúng hay sai; sai thì sai ở đâu, và đưa câu đúng gần ý họ nhất.',
  '- Nếu cả hai cách đều đúng, nói rõ khác nhau ở sắc thái hay mức trang trọng.',
  '- Cho 1–2 ví dụ tiếng Anh ngắn mà MC dùng được, kèm nghĩa tiếng Việt.',
  '- Không bịa quy tắc. Chưa chắc thì nói là chưa chắc.',
  'Định dạng: đoạn ngắn và gạch đầu dòng bắt đầu bằng "- ". Câu tiếng Anh đặt trong **hai dấu sao**. Không dùng tiêu đề, bảng hay biểu tượng cảm xúc.',
].join('\n');

/** Điền cụm đang chọn vào câu hỏi mẫu */
export function fillQuestion(template: string, phrase: string): string {
  return template.replace(/\{p\}/g, phrase);
}

/** Dựng hội thoại gửi AI: bối cảnh ở lượt hỏi đầu, các lượt hỏi tiếp giữ lịch sử. */
export function buildAskMessages(ctx: AskContext, history: QaTurn[], question: string): ChatMessage[] {
  const head = [`Câu: "${ctx.sentence}"`, ctx.sentenceVi ? `Nghĩa tiếng Việt: ${ctx.sentenceVi}` : '', `Cụm đang hỏi: "${ctx.phrase}"`].filter(Boolean).join('\n');
  const msgs: ChatMessage[] = [{ role: 'system', content: ASK_SYSTEM }];
  const turns = [...history.slice(-4), { q: question, a: '' }];
  turns.forEach((t, i) => {
    msgs.push({ role: 'user', content: i === 0 ? `${head}\nCâu hỏi: ${t.q}` : t.q });
    if (t.a) msgs.push({ role: 'assistant', content: t.a });
  });
  return msgs;
}

/** Khoá nhớ câu trả lời: cùng câu, cùng cụm, cùng câu hỏi (không phân biệt hoa thường, dấu cách). */
export function askCacheKey(ctx: AskContext, question: string): string {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${n(ctx.sentence)}|${n(ctx.phrase)}|${n(question)}`;
}

const CACHE_STORE = 'mclife.ask.cache';
const CACHE_MAX = 80;

export function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_STORE) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeCache(key: string, answer: string): void {
  try {
    const all = readCache();
    delete all[key];
    all[key] = answer;
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - CACHE_MAX))) delete all[k];
    localStorage.setItem(CACHE_STORE, JSON.stringify(all));
  } catch {
    // hết chỗ hoặc bị chặn: bỏ qua, lần sau hỏi lại
  }
}

/** Một khối hiển thị: đoạn hoặc gạch đầu dòng; mỗi khối là các mảnh chữ thường/đậm. */
export interface AnswerBlock {
  kind: 'p' | 'li';
  parts: { text: string; bold: boolean }[];
}

/** Tách câu trả lời thành khối. Chỉ hiểu "- ", "* ", "• ", "1. " và **đậm**; bỏ tiêu đề #. */
export function parseAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    let line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    line = line.replace(/^#{1,6}\s+/, '');
    const li = /^([-*•]|\d+[.)])\s+/.exec(line);
    const body = li ? line.slice(li[0].length) : line;
    const parts: AnswerBlock['parts'] = [];
    body.split(/(\*\*[^*]+\*\*)/g).forEach((seg) => {
      if (!seg) return;
      const bold = /^\*\*[^*]+\*\*$/.test(seg);
      parts.push({ text: bold ? seg.slice(2, -2) : seg.replace(/\*\*/g, ''), bold });
    });
    if (parts.length) blocks.push({ kind: li ? 'li' : 'p', parts });
  }
  return blocks;
}
