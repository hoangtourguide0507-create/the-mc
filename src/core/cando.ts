// Đo tiến bộ bằng năng lực ("tôi làm được") thay vì sao, và bài kiểm tra tuần không có hỗ trợ.
import { SCENE_OBJECTIVES } from '../data/objectives';
import { masteredChunks, type ChunkCard } from './chunks';

export interface LearnState {
  /** Số lần đã hoàn thành từng kịch bản (khóa: id tình huống, hoặc "<cảnh>:base" / "<cảnh>:gen"). */
  exposure: Record<string, number>;
  /** Số lượt đã tự nói đạt từ 2 sao khi không có thẻ, theo cảnh. */
  unsupported: Record<string, number>;
  /** Hộp ôn của các cụm mang về. */
  chunks: Record<string, ChunkCard>;
  /** Số lần đạt từng bài nhịp ngắt nghỉ. */
  rhythm: Record<string, number>;
  weekly: { lastDay: number; history: { day: number; score: number }[] };
}

export const EMPTY_LEARN: LearnState = {
  exposure: {},
  unsupported: {},
  chunks: {},
  rhythm: {},
  weekly: { lastDay: 0, history: [] },
};

/** Số lượt tự nói đạt yêu cầu cần có để coi là làm được mục tiêu của một cảnh. */
export const CAN_DO_NEED = 5;
export const CHUNKS_NEED = 20;
export const RHYTHM_NEED = 6;
export const WEEKLY_PASS = 70;

export interface CanDo {
  id: string;
  /** Câu "tôi có thể…" bằng tiếng Việt. */
  label: string;
  have: number;
  need: number;
  done: boolean;
  /** Cách lấy bằng chứng, để người học biết phải làm gì tiếp. */
  how: string;
}

export function canDoList(learn: LearnState): CanDo[] {
  const mk = (id: string, label: string, have: number, need: number, how: string): CanDo => ({
    id,
    label,
    have: Math.min(have, need),
    need,
    done: have >= need,
    how,
  });
  const scenes = Object.entries(SCENE_OBJECTIVES).map(([sceneId, obj]) =>
    mk(
      `scene:${sceneId}`,
      `[${obj.cefr}] ${obj.canVi}`,
      learn.unsupported[sceneId] ?? 0,
      CAN_DO_NEED,
      'Tự nói đạt từ 2 sao ở lượt không có thẻ nhắc trong cảnh này'
    )
  );
  const rhythmOk = Object.values(learn.rhythm).filter((n) => n > 0).length;
  const best = learn.weekly.history.reduce((m, h) => Math.max(m, h.score), 0);
  return [
    ...scenes,
    mk('chunks', 'Dùng lại được các cụm đã học trong ngữ cảnh mới', masteredChunks(learn.chunks), CHUNKS_NEED, 'Nói đúng một cụm ở ba buổi Khởi động cách quãng'),
    mk('rhythm', 'Đọc lời dẫn với ngắt nghỉ đúng chỗ', rhythmOk, RHYTHM_NEED, 'Đạt các bài Nhịp ngắt nghỉ'),
    mk('weekly', `Qua bài kiểm tra tuần không hỗ trợ (từ ${WEEKLY_PASS}%)`, best >= WEEKLY_PASS ? 1 : 0, 1, 'Làm bài kiểm tra tuần'),
  ];
}

/** Bài kiểm tra tuần mở sau mỗi 7 ngày chơi, và cần đã gặp ít nhất một kịch bản. */
export function weeklyDue(learn: LearnState, day: number): boolean {
  return day - learn.weekly.lastDay >= 7 && Object.keys(learn.exposure).length > 0;
}

/** Chọn `n` phần tử theo ngày (cùng ngày luôn ra cùng bộ), không lặp. */
export function pickForDay<T>(pool: T[], day: number, n: number): T[] {
  const items = [...pool];
  let seed = (Math.floor(day) * 2654435761) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, Math.min(n, items.length));
}

/** So với lần kiểm tra trước: chênh lệch điểm, hoặc null nếu chưa có lần trước. */
export function weeklyTrend(learn: LearnState): number | null {
  const h = learn.weekly.history;
  return h.length >= 2 ? h[h.length - 1].score - h[h.length - 2].score : null;
}
