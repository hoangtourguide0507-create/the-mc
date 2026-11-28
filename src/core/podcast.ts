/**
 * Podcast du lịch (tab Luyện tập): nghe một tập 2–3 phút của hai người dẫn, rồi trả lời câu hỏi nghe hiểu.
 * Chấm: đúng ngay lần đầu được 2 điểm; sai thì nghe lại đoạn có đáp án và chọn lại, đúng được 1 điểm;
 * sai lần hai thì lộ đáp án, 0 điểm. Hiện lời thoại trước khi trả lời xong thì tối đa 2 sao.
 * Nội dung ở src/data/podcasts*.ts, màn ở src/ui/screens/training/podcast.ts. Test: npm run test:podcast.
 */

/** Hai người dẫn: Nora (giọng Anh), Owen (giọng Mỹ). Tên cũng là vai giọng trong tools/voices.kokoro.json. */
export type PodHost = 'nora' | 'owen';
export type PodLevel = 'B1' | 'B1+' | 'B2';

export const POD_HOSTS: Record<PodHost, { name: string; accentVi: string }> = {
  nora: { name: 'Nora', accentVi: 'giọng Anh' },
  owen: { name: 'Owen', accentVi: 'giọng Mỹ' },
};

export interface PodLine {
  who: PodHost;
  en: string;
  vi: string;
}

export interface PodQuestion {
  /** Câu hỏi tiếng Anh (người học đọc), kèm bản dịch */
  q: string;
  qVi: string;
  options: string[];
  /** Chỉ số đáp án đúng trong options */
  answer: number;
  /** Cụm chữ nằm trong câu thoại chứa đáp án: dùng để tìm đoạn "nghe lại" (test kiểm phải có trong lời thoại) */
  find: string;
  /** Giải thích tiếng Việt, hiện sau khi trả lời */
  whyVi: string;
}

export interface PodEpisode {
  id: string;
  /** Tên địa danh tiếng Anh, như người dẫn gọi */
  place: string;
  placeVi: string;
  /** Tỉnh hoặc thành phố, tiếng Việt */
  region: string;
  level: PodLevel;
  /** Câu mời nghe: chuyện ít người biết của tập này */
  hookVi: string;
  lines: PodLine[];
  questions: PodQuestion[];
}

/* ---------- Đo độ dài ---------- */

export const POD_WPM = 140;

const words = (s: string) => s.match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g) ?? [];

export function wordCount(ep: PodEpisode): number {
  return ep.lines.reduce((n, l) => n + words(l.en).length, 0);
}

/** Thời lượng ước tính (giây) ở tốc độ nói của podcast */
export function estSeconds(ep: PodEpisode, wpm = POD_WPM): number {
  return Math.round((wordCount(ep) / wpm) * 60);
}

export function durationLabel(ep: PodEpisode): string {
  const s = estSeconds(ep);
  const m = Math.max(1, Math.round(s / 60));
  return `~${m} phút`;
}

/* ---------- Đoạn chứa đáp án ---------- */

export function normPod(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim();
}

/** Các câu thoại chứa cụm `find` của câu hỏi (theo thứ tự trong tập) */
export function evidenceLines(ep: PodEpisode, q: PodQuestion): number[] {
  const key = ` ${normPod(q.find)} `;
  const out: number[] = [];
  ep.lines.forEach((l, i) => {
    if (` ${normPod(l.en)} `.includes(key)) out.push(i);
  });
  return out;
}

/** Đoạn nghe lại: câu chứa đáp án, thêm một câu trước để có ngữ cảnh */
export function replaySpan(ep: PodEpisode, q: PodQuestion): number[] {
  const ev = evidenceLines(ep, q);
  if (ev.length === 0) return [];
  const first = ev[0];
  const start = Math.max(0, first - 1);
  const end = ev[ev.length - 1];
  const span: number[] = [];
  for (let i = start; i <= end && span.length < 4; i++) span.push(i);
  return span;
}

/* ---------- Trả lời câu hỏi ---------- */

export const POD_FIRST = 2;
export const POD_SECOND = 1;

/** Kết quả từng câu: 2 đúng ngay, 1 đúng sau khi nghe lại, 0 sai, null chưa làm */
export type PodResult = 0 | 1 | 2 | null;

export interface PodQuiz {
  qi: number;
  /** Số lần đã chọn sai ở câu hiện tại */
  misses: number;
  points: number;
  results: PodResult[];
  /** Các lựa chọn đã thử ở câu hiện tại */
  tried: number[];
  done: boolean;
}

export function newQuiz(ep: PodEpisode): PodQuiz {
  return { qi: 0, misses: 0, points: 0, results: ep.questions.map(() => null), tried: [], done: ep.questions.length === 0 };
}

export interface PodAnswer {
  correct: boolean;
  gained: number;
  /** Sai lần đầu: cho nghe lại đoạn có đáp án và chọn lại */
  retry: boolean;
  /** Sai lần hai: hiện đáp án đúng */
  reveal: boolean;
  /** Câu hiện tại đã xong (đúng, hoặc lộ đáp án) */
  settled: boolean;
  state: PodQuiz;
}

export function answerPod(ep: PodEpisode, st: PodQuiz, choice: number): PodAnswer {
  const q = ep.questions[st.qi];
  if (st.done || !q || choice < 0 || choice >= q.options.length || st.tried.includes(choice)) {
    return { correct: false, gained: 0, retry: false, reveal: false, settled: false, state: st };
  }
  const correct = choice === q.answer;
  const results = st.results.slice();
  const tried = [...st.tried, choice];
  if (correct) {
    const gained = st.misses === 0 ? POD_FIRST : POD_SECOND;
    results[st.qi] = gained as PodResult;
    return { correct, gained, retry: false, reveal: false, settled: true, state: { ...st, results, tried, points: st.points + gained } };
  }
  if (st.misses === 0) {
    return { correct, gained: 0, retry: true, reveal: false, settled: false, state: { ...st, misses: 1, tried } };
  }
  results[st.qi] = 0;
  return { correct, gained: 0, retry: false, reveal: true, settled: true, state: { ...st, misses: 2, results, tried } };
}

/** Sang câu kế sau khi câu hiện tại đã xong */
export function nextQuestion(ep: PodEpisode, st: PodQuiz): PodQuiz {
  if (st.results[st.qi] == null) return st;
  const qi = st.qi + 1;
  return { ...st, qi, misses: 0, tried: [], done: qi >= ep.questions.length };
}

export const podMax = (ep: PodEpisode) => ep.questions.length * POD_FIRST;

/** 3 sao từ 90% điểm, 2 sao từ 60%, 1 sao từ 30%. Đã xem lời thoại khi đang làm: tối đa 2 sao. */
export function podStars(points: number, max: number, peeked = false): number {
  if (max <= 0) return 0;
  const r = points / max;
  const s = r >= 0.9 ? 3 : r >= 0.6 ? 2 : r >= 0.3 ? 1 : 0;
  return peeked ? Math.min(2, s) : s;
}

/** XP: 3 cho mỗi điểm, thêm 10 khi đạt 3 sao */
export function podXp(points: number, max: number, peeked = false): number {
  return points * 3 + (podStars(points, max, peeked) === 3 ? 10 : 0);
}

/** Thứ tự bậc để sắp xếp và lọc */
export const POD_LEVELS: PodLevel[] = ['B1', 'B1+', 'B2'];
