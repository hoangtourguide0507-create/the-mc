import { EVENT_SCRIPTS } from '../events';
import { BACKSTAGE_SCENARIOS } from './backstage';
import { BEACH_SCENARIOS } from './beach';
import { COFFEE_SCENARIOS } from './coffee';
import { GALA_SCENARIOS } from './gala';
import type { Scenario } from './helpers';
import { INTERVIEW_SCENARIOS } from './interview';
import { MARKET_SCENARIOS } from './market';
import { WEDDING_SCENARIOS } from './wedding';

export type { Scenario } from './helpers';

/** Các bộ tình huống theo cảnh. Thứ tự trong mảng là thứ tự xoay vòng theo ngày. */
export const SCENARIOS: Record<string, Scenario[]> = {
  coffee: COFFEE_SCENARIOS,
  market: MARKET_SCENARIOS,
  backstage: BACKSTAGE_SCENARIOS,
  wedding: WEDDING_SCENARIOS,
  beach: BEACH_SCENARIOS,
  gala: GALA_SCENARIOS,
  interview: INTERVIEW_SCENARIOS,
  // Bài bổ sung của các gói sự kiện (src/data/events/<id>.more.ts)
  ...Object.fromEntries(Object.entries(EVENT_SCRIPTS).map(([id, list]) => [id, list.map(({ id: sid, title, turns }) => ({ id: sid, title, turns }))])),
};
