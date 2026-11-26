/**
 * Gọi AI để giải thích cách dùng từ và ngữ pháp: Google Gemini (khoá "AIza…") hoặc Groq (khoá "gsk_…"),
 * cả hai đều có gói miễn phí. Nhận ra nhà cung cấp theo dạng khoá người học dán vào.
 * Chỉ dùng chữ, không tạo giọng (bản Hậu trường cũ chậm vì tạo giọng ngay trên máy).
 * Khoá API chỉ lưu trên máy người học (localStorage), không bao giờ nằm trong mã nguồn.
 * Hai bên hay đổi hoặc ngừng mô hình, nên thử lần lượt nhiều mô hình (`GEMINI_MODELS`, `GROQ_MODELS`).
 */
export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Thứ tự ưu tiên. Mô hình bị ngừng (404, 400 báo mô hình) thì tự chuyển sang cái sau. */
export const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];
export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Tên "-latest" luôn trỏ tới bản Flash mới nhất, nên ít bị ngừng; tên cố định để dự phòng. */
export const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
const KEY_STORE = 'mclife.ai.key';
/** Khoá Groq của bản Hậu trường cũ: vẫn đọc để khỏi phải dán lại */
const OLD_KEY_STORE = 'mclife.groq.key';

export type AiProvider = 'gemini' | 'groq';

/**
 * Nhà cung cấp theo dạng khoá. Gemini: khoá cũ "AIza…", khoá mới "AQ.…" (AI Studio chỉ còn cấp
 * dạng này từ 2026; gửi qua header x-goog-api-key, không gửi kiểu Bearer). Groq: "gsk_…".
 */
export function providerOf(key: string): AiProvider | null {
  const k = key.trim();
  if (/^AIza[0-9A-Za-z_-]{30,}$/.test(k) || /^AQ\.[0-9A-Za-z_.-]{20,}$/.test(k)) return 'gemini';
  if (/^gsk_[A-Za-z0-9]{20,}$/.test(k)) return 'groq';
  return null;
}

export const PROVIDER_NAME: Record<AiProvider, string> = { gemini: 'Gemini', groq: 'Groq' };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) || localStorage.getItem(OLD_KEY_STORE) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
    localStorage.removeItem(OLD_KEY_STORE);
  } catch {
    // trình duyệt chặn lưu trữ: khoá chỉ dùng trong phiên này
  }
}

/** Khoá đúng dạng Gemini hoặc Groq */
export function looksLikeKey(key: string): boolean {
  return providerOf(key) !== null;
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

export function errorMessageVi(kind: AiErrorKind, provider: AiProvider = 'groq'): string {
  const name = PROVIDER_NAME[provider];
  switch (kind) {
    case 'no-key':
      return 'Chưa có khoá AI. Dán khoá Gemini hoặc Groq vào ô bên dưới để bắt đầu.';
    case 'bad-key':
      return `Khoá ${name} không đúng hoặc đã bị xoá. Kiểm tra lại khoá trên ${provider === 'gemini' ? 'aistudio.google.com/apikey' : 'console.groq.com/keys'}.`;
    case 'rate-limit':
      return `Đã chạm giới hạn miễn phí của ${name}. Chờ một phút rồi hỏi lại; nếu hết hạn mức ngày thì mai dùng tiếp.`;
    case 'network':
      return `Không kết nối được tới ${name}. Kiểm tra mạng rồi thử lại.`;
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
export async function chatText(key: string, messages: ChatMessage[], fetcher: FetchLike = fetch as unknown as FetchLike, models?: string[]): Promise<AiAnswer> {
  if (!key) throw new AiError('no-key', errorMessageVi('no-key'));
  if (providerOf(key) === 'gemini') return chatGemini(key, messages, fetcher, models ?? GEMINI_MODELS);
  return chatGroq(key, messages, fetcher, models ?? GROQ_MODELS);
}

async function chatGroq(key: string, messages: ChatMessage[], fetcher: FetchLike, models: string[]): Promise<AiAnswer> {
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

/** Lỗi khoá của Gemini trả về 400 kèm lời báo "API key not valid", không phải 401. */
function geminiKind(status: number, data: any): AiErrorKind {
  const msg = String(data?.error?.message ?? '') + ' ' + JSON.stringify(data?.error?.details ?? '');
  if (status === 400 && /API[_ ]KEY|api key/i.test(msg)) return 'bad-key';
  return classifyStatus(status);
}

/**
 * Gemini: lời dặn hệ thống đi riêng (`systemInstruction`), vai trợ lý là "model". Thử kèm tắt
 * suy nghĩ dài (nhanh hơn) trước, bị từ chối tuỳ chọn thì thử lại không kèm; 404 thì sang mô hình sau.
 */
async function chatGemini(key: string, messages: ChatMessage[], fetcher: FetchLike, models: string[]): Promise<AiAnswer> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  let lastKind: AiErrorKind = 'server';
  for (const model of models) {
    for (const extra of [true, false]) {
      const generationConfig: Record<string, unknown> = { temperature: 0.3, maxOutputTokens: 1500 };
      if (extra) generationConfig.thinkingConfig = { thinkingBudget: 0 };
      const body = { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig };
      let res;
      try {
        res = await fetcher(`${GEMINI_URL}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
        });
      } catch {
        throw new AiError('network', errorMessageVi('network', 'gemini'));
      }
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
        const text = stripThinking(parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join(''));
        if (text) return { text, model };
        lastKind = 'server';
        continue;
      }
      const kind = geminiKind(res.status, data);
      if (kind === 'bad-key' || kind === 'rate-limit') throw new AiError(kind, errorMessageVi(kind, 'gemini'));
      lastKind = kind;
      if (!(res.status === 400 && extra)) break;
    }
  }
  throw new AiError(lastKind, errorMessageVi(lastKind, 'gemini'));
}
