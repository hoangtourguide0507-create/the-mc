/**
 * Trò chuyện rẽ nhánh: hội thoại nhiều lượt viết sẵn, giọng NPC thu sẵn.
 * Người học tự nghĩ câu trả lời; máy dò ý (theo nhóm từ khoá) để chọn nhánh:
 * - trúng một ý cụ thể  → nhân vật phản ứng theo ý đó rồi hỏi tiếp
 * - trả lời mơ hồ        → nhân vật hỏi vặn lại, chưa đi tiếp
 * - không rõ ý           → nhân vật hỏi lại, hiện gợi ý
 * Hàm ở đây đều thuần (không DOM, không âm thanh). Test: npm run test:talk
 */
import { containsTokenSequence, normalizeText } from './evaluator';

export interface TalkReply {
  /** Ý của câu trả lời, tiếng Việt (hiện sau khi máy nhận ra, và trong gợi ý) */
  label: string;
  /** Các nhóm từ khoá: mỗi nhóm phải có ít nhất một biến thể xuất hiện */
  need: string[][];
  /** Câu mẫu tự nhiên cho ý này (không có ở các câu trả lời mơ hồ) */
  say?: string;
  /** Câu nhân vật đáp lại riêng cho ý này */
  react: string;
  /** true: nhân vật hỏi vặn / giải thích thêm, hội thoại chưa đi tiếp */
  stay?: boolean;
}

export interface TalkNode {
  ask: string;
  askVi: string;
  /** Việc người học cần làm ở lượt này (tiếng Việt) */
  task: string;
  /** Câu nhân vật hỏi lại khi không hiểu ý */
  nudge: string;
  replies: TalkReply[];
}

export interface Talk {
  id: string;
  npcId: string;
  speaker?: 'emma' | 'liam';
  name: string;
  kind: string;
  roleVi: string;
  goalVi: string;
  cefr: 'B1' | 'B2';
  nodes: TalkNode[];
  end: string;
  endVi: string;
}

/** Câu có ý cụ thể phải dài tối thiểu chừng này từ, để "yes" không qua được */
export const MIN_WORDS = 3;
/** Số lần nói tối đa ở một lượt; hết thì nhân vật tự đi tiếp */
export const MAX_TRIES = 3;
export const POINTS_FIRST = 2;
export const POINTS_LATER = 1;

function hits(tokens: string[], need: string[][]): boolean {
  return need.every((group) => group.some((v) => containsTokenSequence(tokens, normalizeText(v))));
}

export interface Match {
  index: number;
  reply: TalkReply;
  transcript: string;
}

/** Dò ý: ưu tiên ý cụ thể (theo thứ tự khai báo), sau đó mới tới câu mơ hồ */
export function matchReply(node: TalkNode, candidates: string[]): Match | null {
  const toks = candidates.map((c) => ({ c, t: normalizeText(c) })).filter((x) => x.t.length > 0);
  for (const pass of [false, true]) {
    for (let i = 0; i < node.replies.length; i++) {
      const r = node.replies[i];
      if (!!r.stay !== pass) continue;
      for (const { c, t } of toks) {
        if (!pass && t.length < MIN_WORDS) continue;
        if (hits(t, r.need)) return { index: i, reply: r, transcript: c };
      }
    }
  }
  return null;
}

export interface TalkState {
  node: number;
  tries: number;
  points: number;
  done: boolean;
}

export const newTalk = (): TalkState => ({ node: 0, tries: 0, points: 0, done: false });

export type Outcome = 'advance' | 'press' | 'nudge' | 'forced';

export interface Step {
  state: TalkState;
  outcome: Outcome;
  /** Ý máy nhận ra (nếu có) */
  match: Match | null;
  /** Các câu nhân vật sẽ nói, theo thứ tự */
  npc: string[];
  gained: number;
  /** Từ lần hỏi lại thứ hai: hiện câu mẫu cho người học */
  reveal: boolean;
}

export function firstSample(node: TalkNode): TalkReply {
  return node.replies.find((r) => !r.stay && r.say) ?? node.replies[0];
}

export function step(talk: Talk, s: TalkState, candidates: string[]): Step {
  const node = talk.nodes[s.node];
  const m = matchReply(node, candidates);
  const nextAsk = (i: number) => (i < talk.nodes.length ? talk.nodes[i].ask : talk.end);
  const go = (react: string, gained: number, outcome: Outcome): Step => {
    const n = s.node + 1;
    return {
      state: { node: n, tries: 0, points: s.points + gained, done: n >= talk.nodes.length },
      outcome,
      match: m,
      npc: [react, nextAsk(n)],
      gained,
      reveal: false,
    };
  };
  if (m && !m.reply.stay) return go(m.reply.react, s.tries === 0 ? POINTS_FIRST : POINTS_LATER, 'advance');
  const tries = s.tries + 1;
  if (tries >= MAX_TRIES) return go(firstSample(node).react, 0, 'forced');
  return {
    state: { ...s, tries },
    outcome: m ? 'press' : 'nudge',
    match: m,
    npc: [m ? m.reply.react : node.nudge],
    gained: 0,
    reveal: tries >= 2,
  };
}

export function maxPoints(talk: Talk): number {
  return talk.nodes.length * POINTS_FIRST;
}

export function starsFor(points: number, max: number): 0 | 1 | 2 | 3 {
  if (max <= 0 || points <= 0) return 0;
  const r = points / max;
  return r >= 0.85 ? 3 : r >= 0.6 ? 2 : 1;
}

/** XP: mỗi điểm 2 XP, thêm 6 nếu đạt 3 sao */
export function xpFor(points: number, max: number): number {
  return points * 2 + (starsFor(points, max) === 3 ? 6 : 0);
}
