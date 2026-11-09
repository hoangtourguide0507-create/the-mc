/**
 * Lõi xử lý âm, không phụ thuộc trình duyệt:
 * - tách chuỗi IPA thành các phoneme;
 * - căn chỉnh phoneme nghe được với phoneme chuẩn và chấm điểm;
 * - đếm âm tiết và kiểm tra trọng âm từ đường năng lượng âm thanh.
 */

const MULTI: string[] = ['tʃ', 'dʒ', 'aɪ', 'aʊ', 'eɪ', 'oɪ', 'oʊ', 'ɔɪ', 'ɪə', 'ʊə', 'eə'];

/** Chuẩn hoá các ký hiệu hay bị viết khác nhau giữa các nguồn */
function normalizeIpa(s: string): string {
  return s
    .replace(/[ˈˌ.\s\/\[\]]/g, '')
    .replace(/g/g, 'ɡ')
    .replace(/r/g, 'ɹ')
    .replace(/ʤ/g, 'dʒ')
    .replace(/ʧ/g, 'tʃ')
    .replace(/[̃͡]/g, '');
}

/** Tách IPA thành danh sách phoneme. Dấu dài ː được gắn vào nguyên âm đứng trước. */
export function tokenizePhones(ipa: string): string[] {
  const s = normalizeIpa(ipa);
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (MULTI.includes(two)) {
      out.push(two);
      i += 2;
      continue;
    }
    const ch = s[i];
    if (ch === 'ː' || ch === 'ʰ') {
      if (out.length) out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
    i++;
  }
  return out;
}

/** Nhóm gần giống nhau: lỗi trong nhóm được tính là "gần đúng", không phải sai hẳn */
const NEAR: [string, string][] = [
  ['æ', 'ɛ'],
  ['ɪ', 'iː'],
  ['ʊ', 'uː'],
  ['ɒ', 'ɔː'],
  ['ɒ', 'ɑː'],
  ['ʌ', 'ə'],
  ['ə', 'ɪ'],
  ['ɪ', 'i'],
  ['ʊ', 'u'],
  ['ɪ', 'ɛ'],
  ['θ', 's'],
  ['ð', 'd'],
  ['ʃ', 's'],
  ['ʒ', 'dʒ'],
  ['ʒ', 'ʃ'],
  ['v', 'b'],
  ['ɹ', 'l'],
  ['tʃ', 'ʃ'],
  ['dʒ', 'ʒ'],
];

function nearPair(a: string, b: string): boolean {
  return NEAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export type AlignOp =
  | { kind: 'match'; target: string }
  | { kind: 'near'; target: string; heard: string }
  | { kind: 'missing'; target: string }
  | { kind: 'wrong'; target: string; heard: string }
  | { kind: 'extra'; heard: string };

/**
 * Căn chỉnh hai chuỗi phoneme bằng Needleman–Wunsch.
 * Chi phí: khớp = 0, gần đúng = 0.4, thay khác = 1, thiếu/thừa = 1.
 */
export function alignPhones(target: string[], heard: string[]): AlignOp[] {
  const n = target.length;
  const m = heard.length;
  const subCost = (a: string, b: string) => (a === b ? 0 : nearPair(a, b) ? 0.4 : 1);
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + subCost(target[i - 1], heard[j - 1]),
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1
      );
    }
  }
  const ops: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + subCost(target[i - 1], heard[j - 1])) {
      const t = target[i - 1];
      const h = heard[j - 1];
      if (t === h) ops.push({ kind: 'match', target: t });
      else if (nearPair(t, h)) ops.push({ kind: 'near', target: t, heard: h });
      else ops.push({ kind: 'wrong', target: t, heard: h });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ kind: 'missing', target: target[i - 1] });
      i--;
    } else {
      ops.push({ kind: 'extra', heard: heard[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}

export interface PhoneScore {
  /** Điểm 0–1: khớp = 1, gần đúng = 0.5, còn lại = 0, trừ phần thừa */
  score: number;
  ops: AlignOp[];
}

export function scorePhones(target: string[], heard: string[]): PhoneScore {
  const ops = alignPhones(target, heard);
  let credit = 0;
  for (const op of ops) {
    if (op.kind === 'match') credit += 1;
    else if (op.kind === 'near') credit += 0.5;
  }
  const extras = ops.filter((o) => o.kind === 'extra').length;
  const base = target.length || 1;
  const score = Math.max(0, (credit - 0.5 * extras) / base);
  return { score: Math.min(1, score), ops };
}

/** Điểm tốt nhất khi so với phiên âm chuẩn (có thể có nhiều biến thể) */
export function bestScore(targets: string[][], heard: string[]): PhoneScore {
  let best: PhoneScore = { score: -1, ops: [] };
  for (const t of targets) {
    const r = scorePhones(t, heard);
    if (r.score > best.score) best = r;
  }
  return best;
}

export interface StressReport {
  /** Số đỉnh năng lượng (ước lượng số âm tiết) */
  nuclei: number;
  /** Số âm tiết theo từ điển */
  expected: number;
  /** null: chưa đủ dữ liệu để kết luận */
  stressOk: boolean | null;
  /** Thông điệp ngắn cho người chơi */
  message: string;
}

/**
 * Đếm đỉnh năng lượng (mỗi đỉnh ≈ một âm tiết) và kiểm tra đỉnh to nhất
 * có trùng với âm tiết được nhấn không. `samples` là PCM mono 16 kHz.
 */
export function checkStress(samples: Float32Array, syllables: { stressed: boolean }[], sampleRate = 16000): StressReport {
  const expected = syllables.length;
  const frame = Math.round(0.025 * sampleRate);
  const hop = Math.round(0.01 * sampleRate);
  const rms: number[] = [];
  for (let start = 0; start + frame <= samples.length; start += hop) {
    let sum = 0;
    for (let k = 0; k < frame; k++) sum += samples[start + k] * samples[start + k];
    rms.push(Math.sqrt(sum / frame));
  }
  // Làm mượt 5 khung (50 ms)
  const sm = rms.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let k = i - 2; k <= i + 2; k++) {
      if (k >= 0 && k < rms.length) {
        s += rms[k];
        c++;
      }
    }
    return s / c;
  });
  const peakMax = Math.max(0, ...sm);
  if (peakMax < 1e-3) {
    return { nuclei: 0, expected, stressOk: null, message: 'Chưa nghe rõ giọng. Hãy nói to và gần micro hơn.' };
  }
  const threshold = peakMax * 0.12;
  const minGap = 12; // khoảng 120 ms giữa hai âm tiết
  const peaks: number[] = [];
  const half = Math.floor(minGap / 2);
  for (let i = 0; i < sm.length; i++) {
    if (sm[i] < threshold) continue;
    // Cực đại cục bộ trong cửa sổ ±half khung (xử lý cả đoạn phẳng)
    // Bên trái phải thấp hơn hẳn, bên phải không được cao hơn: chọn điểm đầu của đoạn phẳng
    let isMax = true;
    for (let k = Math.max(0, i - half); k < i; k++) {
      if (sm[k] >= sm[i]) {
        isMax = false;
        break;
      }
    }
    for (let k = i + 1; isMax && k <= Math.min(sm.length - 1, i + half); k++) {
      if (sm[k] > sm[i]) isMax = false;
    }
    if (!isMax) continue;
    if (peaks.length && i - peaks[peaks.length - 1] < minGap) continue;
    peaks.push(i);
  }
  const nuclei = peaks.length;
  if (expected <= 1) {
    return { nuclei, expected, stressOk: null, message: 'Từ một âm tiết, không có trọng âm để so sánh.' };
  }
  if (nuclei !== expected) {
    return {
      nuclei,
      expected,
      stressOk: null,
      message: `Hệ thống đếm được ${nuclei} âm tiết, từ này có ${expected}. Hãy đọc chậm và rõ từng âm tiết.`,
    };
  }
  const loudest = peaks.reduce((best, idx, k) => (sm[idx] > sm[peaks[best]] ? k : best), 0);
  const stressIdx = syllables.findIndex((s) => s.stressed);
  const ok = loudest === stressIdx;
  return {
    nuclei,
    expected,
    stressOk: ok,
    message: ok
      ? 'Trọng âm đúng: âm tiết được nhấn to nhất.'
      : `Trọng âm chưa đúng: âm tiết ${loudest + 1} to nhất, nhưng từ nhấn âm tiết ${stressIdx + 1}.`,
  };
}

/**
 * Đạt khi điểm ≥ 0.9 và không thiếu hoặc đọc sai phoneme nào.
 * Ngưỡng này nghiêm hơn điểm trung bình để "va-lu" (mất /l/) không được tính là đúng.
 */
export function phoneVerdict(res: PhoneScore): boolean {
  if (res.score < 0.9) return false;
  return !res.ops.some((o) => o.kind === 'missing' || o.kind === 'wrong');
}
