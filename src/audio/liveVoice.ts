/**
 * Giọng Kokoro chạy ngay trong trình duyệt, cho câu thoại mới do AI viết (chế độ Hậu trường).
 * Cùng bộ giọng với clip Kokoro render sẵn của NPC, nên mỗi vai vẫn giữ một giọng.
 * - Máy có WebGPU (iPhone iOS 26+, Chrome máy tính): chạy trên GPU, nhanh hơn nhiều; tải lần đầu ~165 MB (fp16) hoặc ~330 MB (fp32).
 * - GPU ra âm câm hoặc quá chậm ở câu thử thì tự về WASM.
 * - Không có WebGPU: chạy WASM trên CPU, mô hình q8 ~90 MB, chậm (vài giây cho mỗi câu).
 * - Trình duyệt tự cache mô hình cho các lần sau.
 * - Đọc từng câu: câu đầu phát ngay khi tạo xong, các câu sau tạo trong lúc câu trước đang phát.
 * - Chưa tải xong thì không đọc bằng giọng trình duyệt (để không trộn giọng trong một vai).
 */
import { ClipAudio, SFX } from './audioSystem';
import kokoroConfig from '../../tools/voices.kokoro.json';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

export type LiveVoiceStatus = 'idle' | 'loading' | 'ready' | 'error';

interface KokoroLike {
  generate(text: string, opts: { voice: string; speed?: number }): Promise<{ audio: Float32Array; sampling_rate?: number }>;
}

/** Âm thanh có tiếng thật không (không câm, không NaN) */
export function audible(samples: ArrayLike<number>): boolean {
  if (!samples || samples.length === 0) return false;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    if (!Number.isFinite(x)) return false;
    sum += x * x;
  }
  return Math.sqrt(sum / samples.length) > 0.005;
}


export type Backend = { device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'fp16' | 'q8' };

let status: LiveVoiceStatus = 'idle';
let progress = 0;
let lastError = '';
let backend: Backend | null = null;
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

/** Lỗi gần nhất khi tải giọng (để hiện cho người học và gửi lại khi báo lỗi) */
export function liveVoiceError(): string {
  return lastError;
}

export function liveVoiceBackend(): Backend | null {
  return backend;
}

/** Chọn WebGPU nếu máy có, ngược lại WASM */
export async function pickBackend(): Promise<Backend> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    // GPU hỗ trợ số thực 16-bit (chip Apple) thì dùng bản fp16, nhẹ bằng nửa bản fp32
    if (adapter) return { device: 'webgpu', dtype: adapter.features?.has('shader-f16') ? 'fp16' : 'fp32' };
  } catch {
    // không có GPU dùng được
  }
  return { device: 'wasm', dtype: 'q8' };
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

/** Tải mô hình với một cấu hình cụ thể (dùng cho chẩn đoán) */
export async function loadKokoro(b: Backend, onProgress?: (pct: number) => void): Promise<KokoroLike> {
  const tf = await import('@huggingface/transformers');
  tf.env.allowLocalModels = false;
  const { KokoroTTS } = await import('kokoro-js');
  // Tiến độ tính theo tổng byte của mọi file, không theo từng file
  const files = new Map<string, { loaded: number; total: number }>();
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: b.dtype,
    device: b.device,
    progress_callback: (p: { file?: string; loaded?: number; total?: number }) => {
      if (!p.file || typeof p.total !== 'number' || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let l = 0;
      let t = 0;
      files.forEach((f) => { l += f.loaded; t += f.total; });
      onProgress?.(Math.min(99, Math.round((l / t) * 100)));
    },
  } as never);
  return tts as unknown as KokoroLike;
}

/** GPU không nhúc nhích quá lâu (kẹt khi khởi động trên một số iPhone) thì bỏ, chuyển sang CPU */
export const GPU_STALL_MS = 40000;
let fellBack = false;

/** Giai đoạn đang chạy, để màn hình nói đúng chuyện gì đang xảy ra */
export function liveVoicePhase(): 'download' | 'start' | 'fallback' {
  if (fellBack && progress < 99) return 'fallback';
  return progress >= 99 ? 'start' : 'download';
}

/** Chạy một việc; nếu quá `ms` kể từ lần gọi tick() gần nhất mà chưa xong thì báo lỗi */
export function withStallGuard<T>(run: (tick: () => void) => Promise<T>, ms: number, message: string): Promise<T> {
  let last = Date.now();
  return new Promise<T>((resolve, reject) => {
    const timer = setInterval(() => {
      if (Date.now() - last > ms) {
        clearInterval(timer);
        reject(new Error(message));
      }
    }, Math.min(1000, ms));
    run(() => { last = Date.now(); }).then(
      (v) => { clearInterval(timer); resolve(v); },
      (e) => { clearInterval(timer); reject(e); }
    );
  });
}

export function loadLiveVoice(): Promise<KokoroLike> {
  if (loading) return loading;
  lastError = '';
  fellBack = false;
  progress = 0;
  emit('loading');
  loading = (async () => {
    let tick = () => {};
    const onProgress = (pct: number) => {
      if (pct !== progress) tick();
      progress = pct;
      listeners.forEach((fn) => fn(status, progress));
    };
    try {
      backend = await pickBackend();
      let tts: KokoroLike;
      if (backend.device === 'webgpu') {
        const gpu = backend;
        try {
          tts = await withStallGuard(async (t) => {
            tick = t;
            const m = await loadKokoro(gpu, onProgress);
            t();
            // Thử một câu: GPU phải ra tiếng thật, không thì về CPU
            const warm = await m.generate('Hello there.', voiceFor('coach'));
            if (!audible(warm.audio)) throw new Error('GPU tạo ra âm thanh câm');
            return m;
          }, GPU_STALL_MS, 'GPU khởi động quá lâu');
        } catch (gpuErr) {
          console.warn('[liveVoice] WebGPU lỗi, chuyển sang WASM', gpuErr);
          tick = () => {};
          backend = { device: 'wasm', dtype: 'q8' };
          fellBack = true;
          progress = 0;
          listeners.forEach((fn) => fn(status, progress));
          tts = await loadKokoro(backend, onProgress);
        }
      } else {
        tts = await loadKokoro(backend, onProgress);
      }
      emit('ready');
      return tts;
    } catch (err) {
      console.warn('[liveVoice] không tải được Kokoro', err);
      lastError = String((err as Error)?.message ?? err).slice(0, 200);
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

/** WAV 16-bit PCM mono. Bản của thư viện là WAV số thực 32-bit, thẻ <audio> trên iPhone không phát ra tiếng. */
export function encodeWav16(samples: ArrayLike<number>, rate: number): ArrayBuffer {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (off: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(off + i, t.charCodeAt(i)); };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, samples[i] || 0));
    v.setInt16(44 + i * 2, Math.round(x * 32767), true);
  }
  return buf;
}

/** Dòng chẩn đoán gần nhất (hiện trên màn Hậu trường để báo lỗi cho dễ) */
let diag = '';
export function liveVoiceDiag(): string {
  return diag;
}
function setDiag(t: string) {
  diag = t;
  listeners.forEach((fn) => fn(status, progress));
}

/** Phát thẳng mẫu âm qua Web Audio, dùng khi thẻ <audio> từ chối phát */
function playViaWebAudio(samples: Float32Array, rate: number, alive: () => boolean): Promise<boolean> {
  const ctx = SFX.ctx;
  if (!ctx) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      void ctx.resume();
      const buffer = ctx.createBuffer(1, samples.length, rate);
      buffer.getChannelData(0).set(samples);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      const timer = setInterval(() => { if (!alive()) { try { src.stop(); } catch { /* đã dừng */ } } }, 150);
      src.onended = () => { clearInterval(timer); resolve(alive()); };
      src.start();
    } catch {
      resolve(false);
    }
  });
}

interface Clip { samples: Float32Array; rate: number; ms: number }

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
  const make = async (s: string): Promise<Clip | null> => {
    const t0 = performance.now();
    try {
      let a = await tts.generate(s, { voice, speed });
      if (!audible(a.audio) && backend?.device === 'webgpu') {
        // GPU ra âm câm ở câu này: tải bản CPU và tạo lại
        backend = { device: 'wasm', dtype: 'q8' };
        tts = await loadKokoro(backend);
        loading = Promise.resolve(tts);
        a = await tts.generate(s, { voice, speed });
      }
      return { samples: a.audio, rate: a.sampling_rate ?? 24000, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      setDiag(`tạo giọng lỗi: ${String((e as Error)?.message ?? e).slice(0, 80)}`);
      return null;
    }
  };
  let next: Promise<Clip | null> = make(sentences[0]);
  let any = false;
  for (let i = 0; i < sentences.length; i++) {
    const clip = await next;
    if (mine !== playToken) return false;
    next = i + 1 < sentences.length ? make(sentences[i + 1]) : Promise.resolve(null);
    if (!clip) continue;
    if (!any) onStart?.();
    any = true;
    const tag = `${backend?.device ?? '?'} ${backend?.dtype ?? ''} · tạo ${(clip.ms / 1000).toFixed(1)}s · ${audible(clip.samples) ? 'có tiếng' : 'ÂM CÂM'}`;
    const url = URL.createObjectURL(new Blob([encodeWav16(clip.samples, clip.rate)], { type: 'audio/wav' }));
    let end = await ClipAudio.play(url, 1);
    URL.revokeObjectURL(url);
    if (end === 'stopped' || mine !== playToken) return false;
    if (end === 'error') {
      const ok = await playViaWebAudio(clip.samples, clip.rate, () => mine === playToken);
      setDiag(`${tag} · phát: ${ok ? 'Web Audio (tắt chế độ im lặng nếu không nghe)' : 'LỖI'}`);
      if (!ok) return false;
    } else setDiag(`${tag} · phát: xong`);
  }
  return any;
}

// Chẩn đoán: mở game với ?qa=1 để gọi giọng từ console (window.__liveVoice)
if (typeof window !== 'undefined' && /[?&]qa=1\b/.test(window.location.search)) {
  (window as unknown as Record<string, unknown>).__liveVoice = { loadLiveVoice, loadKokoro, pickBackend, speakLive, voiceFor, liveVoiceStatus, liveVoiceError, liveVoiceBackend };
}
