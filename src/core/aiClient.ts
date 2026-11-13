/**
 * Gọi AI cho chế độ Hậu trường qua Groq (gói miễn phí, không cần thẻ).
 * Khoá API chỉ lưu trên máy người học (localStorage), không bao giờ nằm trong mã nguồn.
 */
import type { ChatMessage } from './backstage';

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';
const KEY_STORE = 'mclife.groq.key';

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
  constructor(public kind: AiErrorKind, message: string) {
    super(message);
  }
}

/** Câu báo lỗi tiếng Việt cho người học */
export function errorMessageVi(kind: AiErrorKind): string {
  switch (kind) {
    case 'no-key':
      return 'Chưa có khoá Groq. Dán khoá vào ô bên dưới để bắt đầu.';
    case 'bad-key':
      return 'Khoá Groq không đúng hoặc đã bị xoá. Kiểm tra lại khoá trên console.groq.com.';
    case 'rate-limit':
      return 'Đã chạm giới hạn miễn phí của Groq. Chờ một phút rồi thử lại; nếu hết hạn mức ngày thì mai dùng tiếp.';
    case 'network':
      return 'Không kết nối được tới Groq. Kiểm tra mạng rồi thử lại.';
    default:
      return 'Groq đang lỗi. Thử lại sau ít phút.';
  }
}

export function classifyStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return 'bad-key';
  if (status === 429) return 'rate-limit';
  return 'server';
}

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export async function chatCompletion(key: string, messages: ChatMessage[], fetcher: FetchLike = fetch as unknown as FetchLike): Promise<string> {
  if (!key) throw new AiError('no-key', errorMessageVi('no-key'));
  let res;
  try {
    res = await fetcher(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });
  } catch {
    throw new AiError('network', errorMessageVi('network'));
  }
  if (!res.ok) {
    const kind = classifyStatus(res.status);
    throw new AiError(kind, errorMessageVi(kind));
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new AiError('server', errorMessageVi('server'));
  return content;
}
