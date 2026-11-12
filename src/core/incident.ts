/**
 * Sự cố bất ngờ: chọn sự cố cho một show và chấm câu ứng biến.
 * Chấm theo ý: mỗi nhóm từ khoá là một ý cần có, khớp bất kỳ biến thể nào trong nhóm là đạt.
 */
import { containsTokenSequence, normalizeText } from './evaluator';

export type IncidentGroup = 'any' | 'wedding' | 'formal' | 'brand' | 'party';

export interface Incident {
  id: string;
  group: IncidentGroup;
  /** Chuyện gì vừa xảy ra (tiếng Việt, một câu) */
  alert: string;
  /** Việc MC cần làm (tiếng Việt) */
  task: string;
  /** Câu mẫu tiếng Anh, phải đạt 3 sao với chính bộ chấm này */
  sample: string;
  /** Các ý cần có; mỗi ý là danh sách biến thể */
  need: string[][];
}

export const INCIDENT_SECONDS = 10;
const MIN_WORDS = 5;

export interface IncidentResult {
  stars: 0 | 1 | 2 | 3;
  matched: string[];
  missing: string[];
  transcript: string;
}

export function evaluateIncident(inc: Incident, candidates: string[]): IncidentResult {
  let best: IncidentResult = { stars: 0, matched: [], missing: inc.need.map((g) => g[0]), transcript: candidates[0] || '' };
  for (const cand of candidates) {
    const tokens = normalizeText(cand);
    if (tokens.length === 0) continue;
    const matched: string[] = [];
    const missing: string[] = [];
    for (const group of inc.need) {
      const hit = group.some((v) => containsTokenSequence(tokens, normalizeText(v)));
      (hit ? matched : missing).push(group[0]);
    }
    const ratio = inc.need.length ? matched.length / inc.need.length : 0;
    let stars: 0 | 1 | 2 | 3 = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : matched.length > 0 ? 1 : 0;
    // Đủ ý nhưng cụt lủn thì chưa phải một câu dẫn: tối đa 2 sao
    if (stars === 3 && tokens.length < MIN_WORDS) stars = 2;
    if (stars > best.stars || (stars === best.stars && matched.length > best.matched.length)) best = { stars, matched, missing, transcript: cand };
  }
  return best;
}

/** Nhóm sự cố của một bối cảnh sân khấu */
export function incidentGroupOf(theme: string): IncidentGroup {
  if (theme === 'wedding') return 'wedding';
  if (theme === 'conference') return 'formal';
  if (theme === 'runway') return 'brand';
  if (theme === 'concert' || theme === 'gala') return 'party';
  return 'any';
}

/**
 * Chọn `count` sự cố và vị trí chen vào. Sự cố xảy ra SAU lượt có chỉ số trả về,
 * không bao giờ sau lượt cuối, và hai sự cố không liền nhau khi show đủ dài.
 * `rng` trả số trong [0,1) để test được.
 */
export function planIncidents(pool: Incident[], group: IncidentGroup, turnCount: number, count: number, rng: () => number): Map<number, Incident> {
  const out = new Map<number, Incident>();
  const slots: number[] = [];
  for (let i = 0; i < turnCount - 1; i++) slots.push(i);
  const fit = pool.filter((x) => x.group === group || x.group === 'any');
  const own = fit.filter((x) => x.group === group);
  const used = new Set<string>();
  const n = Math.min(count, slots.length, fit.length);
  for (let k = 0; k < n; k++) {
    const free = slots.filter((i) => !out.has(i) && (slots.length < 4 || (!out.has(i - 1) && !out.has(i + 1))));
    if (free.length === 0) break;
    const at = free[Math.floor(rng() * free.length)];
    // Ưu tiên sự cố đúng thể loại, hết thì lấy loại chung
    const prefer = own.filter((x) => !used.has(x.id));
    const rest = fit.filter((x) => !used.has(x.id));
    const from = prefer.length > 0 && rng() < 0.7 ? prefer : rest;
    const pick = from[Math.floor(rng() * from.length)];
    used.add(pick.id);
    out.set(at, pick);
  }
  return out;
}
