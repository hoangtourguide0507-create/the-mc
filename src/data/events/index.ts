// Danh mục các gói sự kiện. Thêm thể loại mới: import file rồi thêm vào EVENT_PACKS.
import type { NpcData, SceneData } from '../../types/game';
import type { SceneObjective } from '../objectives';
import auction from './auction';
import awards from './awards';
import banquet from './banquet';
import brand from './brand';
import customer from './customer';
import expo from './expo';
import fanmeet from './fanmeet';
import fashion from './fashion';
import launch from './launch';
import opening from './opening';
import press from './press';
import signing from './signing';
import summit from './summit';
import teambuilding from './teambuilding';
import tradwedding from './tradwedding';
import yearend from './yearend';
import openingMore from './opening.more';
import openingMore2 from './opening.more2';
import launchMore from './launch.more';
import launchMore2 from './launch.more2';
import yearendMore from './yearend.more';
import yearendMore2 from './yearend.more2';
import teambuildingMore from './teambuilding.more';
import teambuildingMore2 from './teambuilding.more2';
import fanmeetMore from './fanmeet.more';
import fanmeetMore2 from './fanmeet.more2';
import expoMore from './expo.more';
import expoMore2 from './expo.more2';
import brandMore from './brand.more';
import brandMore2 from './brand.more2';
import fashionMore from './fashion.more';
import fashionMore2 from './fashion.more2';
import banquetMore from './banquet.more';
import banquetMore2 from './banquet.more2';
import signingMore from './signing.more';
import signingMore2 from './signing.more2';
import summitMore from './summit.more';
import summitMore2 from './summit.more2';
import tradweddingMore from './tradwedding.more';
import tradweddingMore2 from './tradwedding.more2';
import customerMore from './customer.more';
import customerMore2 from './customer.more2';
import pressMore from './press.more';
import pressMore2 from './press.more2';
import auctionMore from './auction.more';
import auctionMore2 from './auction.more2';
import awardsMore from './awards.more';
import awardsMore2 from './awards.more2';
import type { EventPack, EventScript, EventTheme } from './types';

/** Xếp theo cấp mở khoá */
export const EVENT_PACKS: EventPack[] = [opening, launch, yearend, teambuilding, fanmeet, expo, brand, fashion, banquet, signing, summit, tradwedding, customer, press, auction, awards];

/** Bài bổ sung theo gói (file `<id>.more.ts`, `<id>.more2.ts`). Thêm file mới thì khai báo ở đây. */
const MORE: Record<string, EventScript[]> = {
  opening: [...openingMore, ...openingMore2],
  launch: [...launchMore, ...launchMore2],
  yearend: [...yearendMore, ...yearendMore2],
  teambuilding: [...teambuildingMore, ...teambuildingMore2],
  fanmeet: [...fanmeetMore, ...fanmeetMore2],
  expo: [...expoMore, ...expoMore2],
  brand: [...brandMore, ...brandMore2],
  fashion: [...fashionMore, ...fashionMore2],
  banquet: [...banquetMore, ...banquetMore2],
  signing: [...signingMore, ...signingMore2],
  summit: [...summitMore, ...summitMore2],
  tradwedding: [...tradweddingMore, ...tradweddingMore2],
  customer: [...customerMore, ...customerMore2],
  press: [...pressMore, ...pressMore2],
  auction: [...auctionMore, ...auctionMore2],
  awards: [...awardsMore, ...awardsMore2],
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
