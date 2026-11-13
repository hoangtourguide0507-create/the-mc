/**
 * Giọng Kokoro chạy ngay trong trình duyệt, cho câu thoại mới do AI viết (chế độ Hậu trường).
 * Cùng bộ giọng với clip Kokoro render sẵn của NPC, nên mỗi vai vẫn giữ một giọng.
 * - Tải lười lần đầu (~90 MB, mô hình q8), trình duyệt tự cache cho các lần sau.
 * - Đọc từng câu: câu đầu phát ngay khi tạo xong, các câu sau tạo trong lúc câu trước đang phát.
 * - Chưa tải xong thì không đọc bằng giọng trình duyệt (để không trộn giọng trong một vai).
 */
import { ClipAudio } from './audioSystem';
import kokoroConfig from '../../tools/voices.kokoro.json';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

export type LiveVoiceStatus = 'idle' | 'loading' | 'ready' | 'error';

interface KokoroLike {
  generate(text: string, opts: { voice: string; speed?: number }): Promise<{ toBlob(): Blob }>;
}

let status: LiveVoiceStatus = 'idle';
let progress = 0;
let loading: Promise<KokoroLike> | null = null;
const listeners = new Set<(s: LiveVoiceStatus, progress: number) => void>();
let playToken = 0;

function emit(s: LiveVoiceStatus) {
  status = s;
  listeners.forEach((fn) => fn(s, progress));
}

export function onLiveVoiceStatus(fn: (s: LiveVoiceStatus, progress: number) => void): () => void {
  listeners.add(fn);
  fn(status, progress);
  return () => listeners.delete(fn);
}

export function liveVoiceStatus(): LiveVoiceStatus {
  return status;
}

/** Giọng Kokoro của một vai. Giọng trộn ("a:0.5+b:0.5") lấy thành phần đầu, vì bản trình duyệt không trộn giọng. */
export function voiceFor(role: string): { voice: string; speed: number } {
  const roles = (kokoroConfig as { roles: Record<string, { voice: string; speed?: number }> }).roles;
  const r = roles[role];
  if (!r) return { voice: 'bf_emma', speed: 1 };
  return { voice: r.voice.split('+')[0].split(':')[0], speed: r.speed ?? 1 };
}

/** Tách đoạn thành câu để phát dần */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    const s = raw.trim();
    if (!s) continue;
    // Gộp mẩu quá ngắn ("Oh!", "Right.") vào câu sau cho giọng liền mạch
    if (out.length && out[out.length - 1].split(' ').length < 3) out[out.length - 1] += ' ' + s;
    else out.push(s);
  }
  return out;
}

export function loadLiveVoice(): Promise<KokoroLike> {
  if (loading) return loading;
  emit('loading');
  loading = (async () => {
    try {
      const tf = await import('@huggingface/transformers');
      tf.env.allowLocalModels = false;
      const { KokoroTTS } = await import('kokoro-js');
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { progress?: number }) => {
          if (typeof p.progress === 'number') {
            progress = Math.round(p.progress);
            listeners.forEach((fn) => fn(status, progress));
          }
        },
      } as never);
      emit('ready');
      return tts as unknown as KokoroLike;
    } catch (err) {
      console.warn('[liveVoice] không tải được Kokoro', err);
      loading = null;
      emit('error');
      throw err;
    }
  })();
  return loading;
}

export function stopLiveVoice(): void {
  playToken++;
  ClipAudio.stop();
}

/** Đọc một câu thoại bằng giọng của vai. Trả về false nếu bị dừng hoặc lỗi. */
export async function speakLive(text: string, role: string, onStart?: () => void): Promise<boolean> {
  const mine = ++playToken;
  let tts: KokoroLike;
  try {
    tts = await loadLiveVoice();
  } catch {
    return false;
  }
  const { voice, speed } = voiceFor(role);
  const sentences = splitSentences(text);
  const make = (s: string) =>
    tts
      .generate(s, { voice, speed })
      .then((a) => URL.createObjectURL(a.toBlob()))
      .catch(() => null);
  let next: Promise<string | null> = make(sentences[0]);
  for (let i = 0; i < sentences.length; i++) {
    const url = await next;
    if (mine !== playToken) {
      if (url) URL.revokeObjectURL(url);
      return false;
    }
    next = i + 1 < sentences.length ? make(sentences[i + 1]) : Promise.resolve(null);
    if (!url) continue;
    if (i === 0) onStart?.();
    const end = await ClipAudio.play(url, 1);
    URL.revokeObjectURL(url);
    if (end === 'stopped' || mine !== playToken) return false;
  }
  return true;
}
