/**
 * Gọi AI qua Groq (gói miễn phí, không cần thẻ) để giải thích cách dùng từ và ngữ pháp.
 * Chỉ dùng chữ, không tạo giọng (bản Hậu trường cũ chậm vì tạo giọng ngay trên máy).
 * Khoá API chỉ lưu trên máy người học (localStorage), không bao giờ nằm trong mã nguồn.
 * Groq hay ngừng mô hình cũ, nên thử lần lượt nhiều mô hình (`GROQ_MODELS`).
 */
export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Thứ tự ưu tiên. Mô hình bị ngừng (404, 400 báo mô hình) thì tự chuyển sang cái sau. */
export const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];
const KEY_STORE = 'mclife.groq.key';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch {
    // trình duyệt chặn lưu trữ: khoá chỉ dùng trong phiên này
  }
}

/** Khoá Groq bắt đầu bằng "gsk_" */
export function looksLikeKey(key: string): boolean {
  return /^gsk_[A-Za-z0-9]{20,}$/.test(key.trim());
}

export type AiErrorKind = 'no-key' | 'bad-key' | 'rate-limit' | 'network' | 'server';

export class AiError extends Error {
  constructor(
    public kind: AiErrorKind,
    message: string
  ) {
    super(message);
  }
}

export function errorMessageVi(kind: AiErrorKind): string {
  switch (kind) {
    case 'no-key':
      return 'Chưa có khoá Groq. Dán khoá vào ô bên dưới để bắt đầu.';
    case 'bad-key':
      return 'Khoá Groq không đúng hoặc đã bị xoá. Kiểm tra lại khoá trên console.groq.com.';
    case 'rate-limit':
      return 'Đã chạm giới hạn miễn phí của Groq. Chờ một phút rồi hỏi lại; nếu hết hạn mức ngày thì mai dùng tiếp.';
    case 'network':
      return 'Không kết nối được tới Groq. Kiểm tra mạng rồi thử lại.';
    default:
      return 'AI đang lỗi. Thử lại sau ít phút.';
  }
}

export function classifyStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return 'bad-key';
  if (status === 429) return 'rate-limit';
  return 'server';
}

/** Bỏ phần suy nghĩ nháp mà vài mô hình (Qwen) trả kèm. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '').trim();
}

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface AiAnswer {
  text: string;
  model: string;
}

/**
 * Gửi hội thoại, nhận câu trả lời dạng chữ. Mỗi mô hình thử hai lần: kèm tuỳ chọn suy luận ngắn
 * (nhanh hơn với gpt-oss), rồi không kèm (phòng khi mô hình không nhận tuỳ chọn đó).
 */
export async function chatText(key: string, messages: ChatMessage[], fetcher: FetchLike = fetch as unknown as FetchLike, models = GROQ_MODELS): Promise<AiAnswer> {
  if (!key) throw new AiError('no-key', errorMessageVi('no-key'));
  let lastKind: AiErrorKind = 'server';
  for (const model of models) {
    for (const extra of [true, false]) {
      const body: Record<string, unknown> = { model, messages, temperature: 0.3, max_completion_tokens: 1500 };
      if (extra) Object.assign(body, { reasoning_effort: 'low', include_reasoning: false });
      let res;
      try {
        res = await fetcher(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
        });
      } catch {
        throw new AiError('network', errorMessageVi('network'));
      }
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const content = data?.choices?.[0]?.message?.content;
        const text = typeof content === 'string' ? stripThinking(content) : '';
        if (text) return { text, model };
        lastKind = 'server';
        continue;
      }
      const kind = classifyStatus(res.status);
      // Khoá sai hoặc hết lượt: đổi mô hình cũng không giúp gì
      if (kind === 'bad-key' || kind === 'rate-limit') throw new AiError(kind, errorMessageVi(kind));
      lastKind = kind;
      // 400 có thể do tuỳ chọn suy luận: thử lại cùng mô hình không kèm; lỗi khác thì sang mô hình sau
      if (!(res.status === 400 && extra)) break;
    }
  }
  throw new AiError(lastKind, errorMessageVi(lastKind));
}
