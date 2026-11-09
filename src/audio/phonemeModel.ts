/**
 * Mô hình nhận dạng phoneme chạy trong trình duyệt (Transformers.js + WASM).
 * Tải lười: chỉ khi người chơi mở luyện nói. Trình duyệt tự cache sau lần đầu.
 */
const MODEL_ID = 'onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

type Recognizer = (audio: Float32Array) => Promise<{ text: string }>;

let status: ModelStatus = 'idle';
let loading: Promise<Recognizer> | null = null;
const listeners = new Set<(s: ModelStatus, progress: number) => void>();
let progress = 0;

function emit(s: ModelStatus) {
  status = s;
  listeners.forEach((fn) => fn(s, progress));
}

export function onModelStatus(fn: (s: ModelStatus, progress: number) => void): () => void {
  listeners.add(fn);
  fn(status, progress);
  return () => listeners.delete(fn);
}

export function modelStatus(): ModelStatus {
  return status;
}

export function loadPhonemeModel(): Promise<Recognizer> {
  if (loading) return loading;
  emit('loading');
  loading = (async () => {
    try {
      const tf = await import('@huggingface/transformers');
      tf.env.allowLocalModels = false;
      const pipe = await tf.pipeline('automatic-speech-recognition', MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (typeof p.progress === 'number') {
            progress = Math.round(p.progress);
            listeners.forEach((fn) => fn(status, progress));
          }
        },
      } as Record<string, unknown>);
      emit('ready');
      return (audio: Float32Array) => pipe(audio) as Promise<{ text: string }>;
    } catch (err) {
      console.warn('[phonemeModel] không tải được mô hình', err);
      loading = null;
      emit('error');
      throw err;
    }
  })();
  return loading;
}

/** Trả về chuỗi phoneme (IPA espeak) cho đoạn PCM 16 kHz. */
export async function transcribePhones(audio: Float32Array): Promise<string> {
  const recognize = await loadPhonemeModel();
  const out = await recognize(audio);
  return out.text ?? '';
}
