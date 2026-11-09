/**
 * Ghi một đoạn giọng ngắn và đổi về PCM mono 16 kHz (định dạng mô hình cần).
 * Dùng MediaRecorder + decodeAudioData + OfflineAudioContext, không cần thư viện.
 */
const TARGET_RATE = 16000;

export interface ClipHandle {
  /** Dừng sớm; promise vẫn trả kết quả */
  stop: () => void;
  /** PCM 16 kHz, hoặc null nếu không có quyền micro hoặc không ghi được */
  done: Promise<Float32Array | null>;
}

export function recordClip(maxMs = 2500): ClipHandle {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let timer: number | undefined;

  const done = (async (): Promise<Float32Array | null> => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }
    const chunks: Blob[] = [];
    const releaseMic = () => stream?.getTracks().forEach((t) => t.stop());
    let stopped: Promise<void>;
    try {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      // onerror cũng phải resolve, nếu không promise sẽ treo mãi khi ghi lỗi
      stopped = new Promise<void>((resolve) => {
        if (!recorder) return resolve();
        recorder.onstop = () => resolve();
        recorder.onerror = () => resolve();
      });
      recorder.start();
    } catch {
      releaseMic();
      return null;
    }
    timer = window.setTimeout(() => recorder?.state === 'recording' && recorder.stop(), maxMs);
    await stopped;
    window.clearTimeout(timer);
    releaseMic();
    if (!chunks.length) return null;
    return decodeTo16k(new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }));
  })();

  return {
    stop: () => {
      if (recorder && recorder.state === 'recording') recorder.stop();
    },
    done,
  };
}

async function decodeTo16k(blob: Blob): Promise<Float32Array | null> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.ceil((buf.duration * TARGET_RATE) || 1);
    const offline = new OfflineAudioContext(1, length, TARGET_RATE);
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } catch {
    return null;
  } finally {
    ctx.close().catch(() => undefined);
  }
}
