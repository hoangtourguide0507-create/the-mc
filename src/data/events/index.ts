// Danh mục các gói sự kiện. Thêm thể loại mới: import file rồi thêm vào EVENT_PACKS.
import type { NpcData, SceneData } from '../../types/game';
import type { SceneObjective } from '../objectives';
import awards from './awards';
import fanmeet from './fanmeet';
import fashion from './fashion';
import launch from './launch';
import press from './press';
import summit from './summit';
import type { EventPack, EventTheme } from './types';

/** Xếp theo cấp mở khoá */
export const EVENT_PACKS: EventPack[] = [launch, fanmeet, fashion, summit, press, awards];

export const EVENT_SCENES: Record<string, SceneData> = {};
export const EVENT_NPCS: Record<string, NpcData> = {};
export const EVENT_OBJECTIVES: Record<string, SceneObjective> = {};
export const EVENT_CHUNKS: Record<string, EventPack['chunks']> = {};
export const EVENT_UI: Record<string, { kind: string; theme: EventTheme }> = {};

for (const p of EVENT_PACKS) {
  EVENT_SCENES[p.scene.id] = p.scene;
  Object.assign(EVENT_NPCS, p.npcs);
  EVENT_OBJECTIVES[p.scene.id] = p.objective;
  EVENT_CHUNKS[p.scene.id] = p.chunks;
  EVENT_UI[p.scene.id] = p.ui;
}
