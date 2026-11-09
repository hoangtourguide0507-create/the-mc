// Báo cáo tiến độ theo mục tiêu CEFR: cảnh nào đã đạt (sao tốt nhất đạt ngưỡng).
import { OBJECTIVE_PASS_STARS, SCENE_OBJECTIVES, type Cefr } from '../data/objectives';

export interface CefrProgress {
  met: number;
  total: number;
}

export function objectiveReport(bestStars: Record<string, number>): Record<Cefr, CefrProgress> {
  const out: Record<Cefr, CefrProgress> = {
    A2: { met: 0, total: 0 },
    B1: { met: 0, total: 0 },
    B2: { met: 0, total: 0 },
  };
  for (const [sceneId, obj] of Object.entries(SCENE_OBJECTIVES)) {
    out[obj.cefr].total += 1;
    if ((bestStars[sceneId] ?? 0) >= OBJECTIVE_PASS_STARS) out[obj.cefr].met += 1;
  }
  return out;
}

export function objectiveMetBy(avgStars: number): boolean {
  return avgStars >= OBJECTIVE_PASS_STARS;
}
