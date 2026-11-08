/**
 * Bản đồ thành phố 28×28 ô — 3 khu phố.
 *
 *   Trung tâm (cột 0–12, hàng 0–17): Nhà MC, Cà phê, Nhà hát, Siêu thị, Công viên Ánh Sao
 *   Phố đêm  (cột 14–27, hàng 0–17): Đài truyền hình, Khách sạn Gala, Sảnh tiệc cưới, toà cao tầng
 *   Ven biển (hàng 19–27):            Đường dạo bộ, bãi cát, Bãi biển Hoàng Hôn, cầu cảng, hải đăng
 *
 * Toạ độ ô: c = cột (trục X, hướng Đông), r = hàng (trục Z, hướng Nam).
 * Camera nhìn từ Đông-Nam nên mặt tiền "front-left" = phía Nam (+Z), "front-right" = phía Đông (+X).
 */
import { WORLD_LOCS } from '../../data/content';
import { TileKind, WorldProp } from '../../types/game';

export const GRID = 28;
export const ROAD_ROWS = [4, 11, 18];
export const ROAD_COLS = [4, 13, 22];
/** Đường dọc dừng trước bãi cát */
export const ROAD_COL_END = 21;
export const SAND_ROW = 22;
export const BOARDWALK_ROW = 21;

export const DISTRICTS = [
  { id: 'center', name: 'Khu Trung Tâm', icon: '🏙️', c: 6.5, r: 8.5, color: '#FF4FD8' },
  { id: 'night', name: 'Phố Đêm', icon: '🌃', c: 20.5, r: 8.5, color: '#22D3EE' },
  { id: 'coast', name: 'Ven Biển', icon: '🌊', c: 12.5, r: 23, color: '#7CFF6B' },
] as const;

export type FillerKind = 'house' | 'shop' | 'apartment' | 'tower' | 'office';

export interface Filler {
  c: number;
  r: number;
  w: number;
  d: number;
  kind: FillerKind;
  floors: number;
  color: string;
  accent: string;
}

/** Nhà phụ không vào được — tạo cảm giác phố xá đông đúc */
export const FILLERS: Filler[] = [
  // Trung tâm — khu dân cư phía Tây
  { c: 0, r: 0, w: 2, d: 2, kind: 'house', floors: 2, color: '#F9A8D4', accent: '#9D174D' },
  { c: 0, r: 6, w: 2, d: 2, kind: 'house', floors: 2, color: '#A5F3FC', accent: '#155E75' },
  { c: 0, r: 8, w: 2, d: 2, kind: 'house', floors: 1, color: '#FDE68A', accent: '#92400E' },
  { c: 10, r: 6, w: 2, d: 2, kind: 'shop', floors: 2, color: '#FDBA74', accent: '#EA580C' },
  { c: 10, r: 8, w: 2, d: 2, kind: 'apartment', floors: 4, color: '#C4B5FD', accent: '#6D28D9' },
  // Phố đêm
  { c: 19, r: 0, w: 2, d: 3, kind: 'office', floors: 6, color: '#64748B', accent: '#22D3EE' },
  { c: 19, r: 6, w: 2, d: 2, kind: 'shop', floors: 2, color: '#FCA5A5', accent: '#DC2626' },
  { c: 19, r: 8, w: 2, d: 2, kind: 'apartment', floors: 5, color: '#93C5FD', accent: '#1D4ED8' },
  { c: 19, r: 13, w: 2, d: 2, kind: 'shop', floors: 2, color: '#F0ABFC', accent: '#A21CAF' },
  { c: 19, r: 15, w: 2, d: 2, kind: 'apartment', floors: 3, color: '#FDE68A', accent: '#B45309' },
  { c: 24, r: 0, w: 2, d: 3, kind: 'tower', floors: 10, color: '#334155', accent: '#FF4FD8' },
  { c: 26, r: 0, w: 2, d: 2, kind: 'office', floors: 7, color: '#475569', accent: '#7CFF6B' },
  { c: 24, r: 6, w: 2, d: 2, kind: 'tower', floors: 12, color: '#1E293B', accent: '#22D3EE' },
  { c: 26, r: 6, w: 2, d: 2, kind: 'office', floors: 8, color: '#3F3F46', accent: '#FBBF24' },
  { c: 24, r: 8, w: 2, d: 2, kind: 'apartment', floors: 6, color: '#A78BFA', accent: '#4C1D95' },
  { c: 26, r: 8, w: 2, d: 2, kind: 'tower', floors: 9, color: '#0F172A', accent: '#FF4FD8' },
  { c: 24, r: 13, w: 2, d: 2, kind: 'office', floors: 5, color: '#52525B', accent: '#22D3EE' },
  { c: 26, r: 13, w: 2, d: 2, kind: 'apartment', floors: 4, color: '#FDA4AF', accent: '#BE123C' },
  { c: 24, r: 15, w: 2, d: 2, kind: 'shop', floors: 2, color: '#86EFAC', accent: '#15803D' },
  { c: 26, r: 15, w: 2, d: 2, kind: 'house', floors: 2, color: '#E9D5FF', accent: '#7E22CE' },
];

export interface GridData {
  tiles: TileKind[][];
  walkable: boolean[][];
  buildingAtTile: Map<string, string>;
  doorToLoc: Map<string, string>;
  props: WorldProp[];
}

const key = (c: number, r: number) => `${c},${r}`;
const inGrid = (c: number, r: number) => c >= 0 && c < GRID && r >= 0 && r < GRID;

function isWater(c: number, r: number) {
  if (c >= 8 && c <= 9 && r >= 25 && r <= 26) return false; // cầu cảng
  return r >= 25 || (c >= 25 && r >= 20);
}

function isRoad(c: number, r: number): 'x' | 'y' | 'cross' | null {
  if (isWater(c, r) || r >= SAND_ROW) return null;
  const h = ROAD_ROWS.includes(r);
  const v = ROAD_COLS.includes(c) && r <= ROAD_COL_END;
  if (h && v) return 'cross';
  if (h) return 'x';
  if (v) return 'y';
  return null;
}

/** Ô thuộc công viên Ánh Sao (khối cột 5–12, hàng 12–17) */
function inPark(c: number, r: number) {
  return c >= 6 && c <= 11 && r >= 13 && r <= 16;
}

export function buildCityGrid(): GridData {
  const tiles: TileKind[][] = Array.from({ length: GRID }, () => new Array<TileKind>(GRID).fill('grass'));
  const walkable: boolean[][] = Array.from({ length: GRID }, () => new Array<boolean>(GRID).fill(false));

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const road = isRoad(c, r);
      if (isWater(c, r)) tiles[r][c] = 'water';
      else if (c >= 8 && c <= 9 && r >= 25) tiles[r][c] = 'plaza';
      else if (r >= SAND_ROW) tiles[r][c] = 'sand';
      else if (road) tiles[r][c] = road === 'cross' ? 'cross' : road === 'x' ? 'road-x' : 'road-y';
      else if (r === BOARDWALK_ROW) tiles[r][c] = 'plaza';
    }
  }
  // Vỉa hè: ô đất kề đường (8 hướng)
  for (let r = 0; r < SAND_ROW; r++) {
    for (let c = 0; c < GRID; c++) {
      if (tiles[r][c] !== 'grass') continue;
      let nearRoad = false;
      for (let dr = -1; dr <= 1 && !nearRoad; dr++)
        for (let dc = -1; dc <= 1 && !nearRoad; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (inGrid(nc, nr) && isRoad(nc, nr)) nearRoad = true;
        }
      if (nearRoad) tiles[r][c] = 'walk';
    }
  }
  // Công viên: cỏ đi được + lối lát đá hình chữ thập
  for (let r = 13; r <= 16; r++)
    for (let c = 6; c <= 11; c++) tiles[r][c] = c === 8 || c === 9 || r === 14 || r === 15 ? 'plaza' : 'park';

  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      const t = tiles[r][c];
      walkable[r][c] = t !== 'grass' && t !== 'water';
    }

  const buildingAtTile = new Map<string, string>();
  const doorToLoc = new Map<string, string>();
  const block = (c: number, r: number, id: string) => {
    if (!inGrid(c, r)) return;
    walkable[r][c] = false;
    buildingAtTile.set(key(c, r), id);
  };

  for (const loc of Object.values(WORLD_LOCS)) {
    const n = loc.size ?? 3;
    for (let dc = 0; dc < n; dc++) for (let dr = 0; dr < n; dr++) block(loc.at[0] + dc, loc.at[1] + dr, loc.id);
  }
  for (const f of FILLERS) {
    for (let dc = 0; dc < f.w; dc++) for (let dr = 0; dr < f.d; dr++) block(f.c + dc, f.r + dr, `filler`);
  }

  const props = buildProps(tiles, buildingAtTile);
  for (const p of props) {
    if (p.kind === 'fountain') {
      // Đài phun nước 2×2 ở giữa công viên
      for (const c of [Math.floor(p.c), Math.ceil(p.c)])
        for (const r of [Math.floor(p.r), Math.ceil(p.r)]) walkable[r][c] = false;
    } else if (p.blocks && inGrid(p.c, p.r)) walkable[p.r][p.c] = false;
  }

  for (const loc of Object.values(WORLD_LOCS)) {
    const [dc, dr] = loc.doorTile;
    if (inGrid(dc, dr)) {
      walkable[dr][dc] = true;
      doorToLoc.set(key(dc, dr), loc.id);
    }
  }

  return { tiles, walkable, buildingAtTile, doorToLoc, props };
}

/** Hạt giống ngẫu nhiên cố định — bản đồ giống nhau ở mọi lần mở */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildProps(tiles: TileKind[][], buildingAtTile: Map<string, string>): WorldProp[] {
  const out: WorldProp[] = [];
  const rand = rng(20261108);
  const taken = new Set<string>();
  const add = (p: WorldProp) => {
    out.push(p);
    taken.add(key(p.c, p.r));
  };
  const free = (c: number, r: number) => inGrid(c, r) && !buildingAtTile.has(key(c, r)) && !taken.has(key(c, r));

  // Cây trên ô cỏ trống trong các khối nhà
  for (let r = 0; r < SAND_ROW; r++)
    for (let c = 0; c < GRID; c++) {
      if (tiles[r][c] !== 'grass' || !free(c, r)) continue;
      const x = rand();
      if (r === 20) add({ kind: 'palm', c, r, blocks: true });
      else if (x < 0.55) add({ kind: 'tree', c, r, blocks: true, color: rand() < 0.3 ? '#F472B6' : undefined });
      else if (x < 0.85) add({ kind: 'bush', c, r, blocks: true, color: rand() < 0.4 ? '#FB7185' : undefined });
      else add({ kind: 'flower', c, r, blocks: true });
    }

  // Đèn đường dọc vỉa hè (không chặn lối đi)
  for (let r = 0; r < SAND_ROW; r++)
    for (let c = 0; c < GRID; c++) {
      if (tiles[r][c] !== 'walk') continue;
      const onCorner = ROAD_ROWS.some((rr) => Math.abs(rr - r) === 1) && ROAD_COLS.some((cc) => Math.abs(cc - c) === 1);
      if (onCorner || (c + r * 3) % 7 === 0) out.push({ kind: 'lamp', c, r });
    }
  // Đèn dọc đường dạo bộ ven biển
  for (let c = 1; c < 25; c += 3) out.push({ kind: 'lamp', c, r: BOARDWALK_ROW });

  // Công viên Ánh Sao
  add({ kind: 'fountain', c: 8.5, r: 14.5 });
  for (const [c, r] of [[6, 13], [11, 13], [6, 16], [11, 16], [7, 16], [10, 13]] as const)
    add({ kind: rand() < 0.5 ? 'tree' : 'flower', c, r, blocks: true, color: '#F472B6' });
  for (const [c, r, dir] of [[7, 14, 'v'], [10, 15, 'v'], [8, 13, 'u'], [9, 16, 'u']] as const)
    out.push({ kind: 'bench', c, r, dir });

  // Bãi cát: dù, ghế, chòi kem
  for (let c = 1; c < 24; c += 2) {
    if (c >= 15 && c <= 20) continue; // chừa khu Bãi biển Hoàng Hôn
    if (c === 9) continue; // lối ra cầu cảng
    const r = c % 4 === 1 ? 23 : 24;
    out.push({ kind: 'umbrella', c, r, color: ['#FF4FD8', '#22D3EE', '#FBBF24', '#7CFF6B'][(c >> 1) % 4] });
  }
  add({ kind: 'kiosk', c: 5, r: 22, blocks: true });
  add({ kind: 'kiosk', c: 12, r: 22, blocks: true });
  add({ kind: 'lighthouse', c: 24, r: 20, blocks: true });
  out.push({ kind: 'boat', c: 4, r: 26 });
  out.push({ kind: 'boat', c: 15, r: 26.4 });
  out.push({ kind: 'boat', c: 26, r: 23 });

  // Trụ nước cứu hoả rải rác
  for (const [c, r] of [[3, 7], [12, 9], [14, 14], [21, 6], [23, 15]] as const) out.push({ kind: 'hydrant', c, r });

  return out;
}

export function gridToWorld(c: number, r: number): [number, number] {
  return [c - (GRID - 1) / 2, r - (GRID - 1) / 2];
}

export function worldToGrid(x: number, z: number): [number, number] {
  return [Math.round(x + (GRID - 1) / 2), Math.round(z + (GRID - 1) / 2)];
}

/** Tìm đường BFS 4 hướng; ô đích không đi được thì chọn ô đi được gần nhất. */
export function findPath(
  grid: GridData,
  start: [number, number],
  goal: [number, number],
  avoid?: Set<string>
): [number, number][] {
  const sc = Math.round(start[0]);
  const sr = Math.round(start[1]);
  let gc = Math.round(goal[0]);
  let gr = Math.round(goal[1]);

  if (!inGrid(gc, gr) || !grid.walkable[gr][gc]) {
    let best = Infinity;
    let bt: [number, number] = [sc, sr];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (grid.walkable[r][c]) {
          const d = Math.hypot(c - gc, r - gr);
          if (d < best) {
            best = d;
            bt = [c, r];
          }
        }
    [gc, gr] = bt;
  }
  if (sc === gc && sr === gr) return [];

  const startK = sr * GRID + sc;
  const goalK = gr * GRID + gc;
  const parent = new Int32Array(GRID * GRID).fill(-1);
  parent[startK] = startK;
  const queue = new Int32Array(GRID * GRID);
  let head = 0;
  let tail = 0;
  queue[tail++] = startK;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === goalK) break;
    const cc = cur % GRID;
    const cr = (cur - cc) / GRID;
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!inGrid(nc, nr) || !grid.walkable[nr][nc]) continue;
      const nk = nr * GRID + nc;
      if (parent[nk] !== -1) continue;
      if (avoid && nk !== goalK && avoid.has(key(nc, nr))) continue;
      parent[nk] = cur;
      queue[tail++] = nk;
    }
  }
  if (parent[goalK] === -1) return [];
  const path: [number, number][] = [];
  let k = goalK;
  while (k !== startK) {
    path.unshift([k % GRID, Math.floor(k / GRID)]);
    k = parent[k];
  }
  return path;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Làn xe: đường ngang (hàng) và đường dọc (cột) */
export const CAR_LANES: { axis: 'h' | 'v'; lane: number; min: number; max: number }[] = [
  ...ROAD_ROWS.map((r) => ({ axis: 'h' as const, lane: r, min: -0.5, max: GRID - 0.5 })),
  ...ROAD_COLS.map((c) => ({ axis: 'v' as const, lane: c, min: -0.5, max: ROAD_COL_END + 0.4 })),
];
