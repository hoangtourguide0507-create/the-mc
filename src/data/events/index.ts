// Danh mục các gói sự kiện. Thêm thể loại mới: import file rồi thêm vào EVENT_PACKS.
import type { NpcData, SceneData } from '../../types/game';
import type { SceneObjective } from '../objectives';
import auction from './auction';
import awards from './awards';
import customer from './customer';
import fanmeet from './fanmeet';
import fashion from './fashion';
import launch from './launch';
import opening from './opening';
import press from './press';
import signing from './signing';
import summit from './summit';
import teambuilding from './teambuilding';
import yearend from './yearend';
import openingMore from './opening.more';
import launchMore from './launch.more';
import yearendMore from './yearend.more';
import teambuildingMore from './teambuilding.more';
import fanmeetMore from './fanmeet.more';
import fashionMore from './fashion.more';
import signingMore from './signing.more';
import summitMore from './summit.more';
import customerMore from './customer.more';
import pressMore from './press.more';
import auctionMore from './auction.more';
import awardsMore from './awards.more';
import type { EventPack, EventScript, EventTheme } from './types';

/** Xếp theo cấp mở khoá */
export const EVENT_PACKS: EventPack[] = [opening, launch, yearend, teambuilding, fanmeet, fashion, signing, summit, customer, press, auction, awards];

/** Bài bổ sung theo gói (file `<id>.more.ts`). Thêm file mới thì khai báo ở đây. */
const MORE: Record<string, EventScript[]> = {
  opening: openingMore,
  launch: launchMore,
  yearend: yearendMore,
  teambuilding: teambuildingMore,
  fanmeet: fanmeetMore,
  fashion: fashionMore,
  signing: signingMore,
  summit: summitMore,
  customer: customerMore,
  press: pressMore,
  auction: auctionMore,
  awards: awardsMore,
};

export const EVENT_SCENES: Record<string, SceneData> = {};
export const EVENT_NPCS: Record<string, NpcData> = {};
export const EVENT_OBJECTIVES: Record<string, SceneObjective> = {};
export const EVENT_CHUNKS: Record<string, EventPack['chunks']> = {};
export const EVENT_UI: Record<string, { kind: string; theme: EventTheme }> = {};
/** Bài bổ sung theo id tình huống, và cụm mang về theo id bài */
export const EVENT_SCRIPTS: Record<string, EventScript[]> = {};
export const EVENT_SCRIPT_CHUNKS: Record<string, EventPack['chunks']> = {};

for (const p of EVENT_PACKS) {
  EVENT_SCENES[p.scene.id] = p.scene;
  Object.assign(EVENT_NPCS, p.npcs);
  EVENT_OBJECTIVES[p.scene.id] = p.objective;
  EVENT_CHUNKS[p.scene.id] = p.chunks;
  EVENT_UI[p.scene.id] = p.ui;
  EVENT_SCRIPTS[p.scene.id] = MORE[p.scene.id] ?? [];
  for (const sc of EVENT_SCRIPTS[p.scene.id]) EVENT_SCRIPT_CHUNKS[sc.id] = sc.chunks;
}
