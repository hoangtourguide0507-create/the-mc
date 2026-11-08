import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, MapControls } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  getPlayerLook,
  PASSER_LOOKS,
  SCHEDULE,
  SCENES,
  STREET_TALK,
  WM_NAMES,
  WORLD_LOCS,
  WORLD_PROPS,
} from '../data/content';
import {
  blockReason,
  clamp,
  fmtTime,
  getPeriod,
  getPeriodMeta,
  getWaitTargetMinute,
  sceneStatus,
  travelMinutes,
} from '../core/clock';
import { useGameStore } from '../core/store';
import { TileKind, WorldLocation } from '../types/game';
import { SFX } from '../audio/audioSystem';
import { ClayCharacter3D } from './ClayCharacter3D';

const GRID_SIZE = 14;

export interface GridData {
  tiles: TileKind[][];
  walkable: boolean[][];
  buildingAtTile: Map<string, string>;
  doorToLoc: Map<string, string>;
}

export function buildCityGrid(): GridData {
  const tiles: TileKind[][] = Array.from({ length: GRID_SIZE }, () =>
    new Array<TileKind>(GRID_SIZE).fill('grass')
  );
  const walkable: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    new Array<boolean>(GRID_SIZE).fill(false)
  );

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isRoadH = r === 3 || r === 8;
      const isRoadV = (c === 3 || c === 9) && r <= 12;

      if (isRoadH && isRoadV) {
        tiles[r][c] = 'cross';
        walkable[r][c] = true;
      } else if (isRoadH && c <= 12) {
        tiles[r][c] = 'road-x';
        walkable[r][c] = true;
      } else if (isRoadV) {
        tiles[r][c] = 'road-y';
        walkable[r][c] = true;
      } else if (c >= 10 && c <= 12 && r >= 9 && r <= 12) {
        tiles[r][c] = 'sand';
        walkable[r][c] = true;
      } else if (c >= 4 && c <= 6 && r >= 10 && r <= 12) {
        tiles[r][c] = 'plaza';
        walkable[r][c] = true;
      } else if (r === 13 || (c === 13 && r >= 9)) {
        tiles[r][c] = 'water';
        walkable[r][c] = false;
      }
    }
  }

  const buildingAtTile = new Map<string, string>();
  const doorToLoc = new Map<string, string>();

  // Mark 2x2 buildings as unwalkable
  for (const loc of Object.values(WORLD_LOCS)) {
    const [bc, br] = loc.at;
    for (let dc = 0; dc < 2; dc++) {
      for (let dr = 0; dr < 2; dr++) {
        const tc = bc + dc;
        const tr = br + dr;
        if (tc >= 0 && tc < GRID_SIZE && tr >= 0 && tr < GRID_SIZE) {
          walkable[tr][tc] = false;
          buildingAtTile.set(`${tc},${tr}`, loc.id);
        }
      }
    }
  }

  // Mark fixed props as unwalkable
  for (const prop of WORLD_PROPS) {
    if (prop.c >= 0 && prop.c < GRID_SIZE && prop.r >= 0 && prop.r < GRID_SIZE) {
      walkable[prop.r][prop.c] = false;
    }
  }

  // Force door tiles walkable
  for (const loc of Object.values(WORLD_LOCS)) {
    const [dc, dr] = loc.doorTile;
    if (dc >= 0 && dc < GRID_SIZE && dr >= 0 && dr < GRID_SIZE) {
      walkable[dr][dc] = true;
      doorToLoc.set(`${dc},${dr}`, loc.id);
    }
  }

  return { tiles, walkable, buildingAtTile, doorToLoc };
}

export function gridToWorld(c: number, r: number): [number, number] {
  // Center the 14x14 grid at (0, 0) in 3D X-Z space
  return [c - 6.5, r - 6.5];
}

export function findBfsPath(
  grid: GridData,
  start: [number, number],
  goal: [number, number],
  avoidSet?: Set<string>
): [number, number][] {
  const [sc, sr] = [Math.round(start[0]), Math.round(start[1])];
  let [gc, gr] = [Math.round(goal[0]), Math.round(goal[1])];

  // If goal is not walkable, snap to nearest walkable tile by Euclidean distance
  if (gc < 0 || gc >= GRID_SIZE || gr < 0 || gr >= GRID_SIZE || !grid.walkable[gr][gc]) {
    let bestDist = Infinity;
    let bestTile: [number, number] = [sc, sr];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid.walkable[r][c]) {
          const d = Math.hypot(c - gc, r - gr);
          if (d < bestDist) {
            bestDist = d;
            bestTile = [c, r];
          }
        }
      }
    }
    [gc, gr] = bestTile;
  }

  if (sc === gc && sr === gr) return [];

  const queue: [number, number][] = [[sc, sr]];
  const parent = new Map<string, string>();
  const visited = new Set<string>([`${sc},${sr}`]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [cc, cr] = queue.shift()!;
    if (cc === gc && cr === gr) {
      const path: [number, number][] = [];
      let curKey = `${gc},${gr}`;
      while (curKey !== `${sc},${sr}`) {
        const [pc, pr] = curKey.split(',').map(Number);
        path.unshift([pc, pr]);
        curKey = parent.get(curKey)!;
      }
      return path;
    }

    for (const [dc, dr] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      const nKey = `${nc},${nr}`;
      if (
        nc >= 0 &&
        nc < GRID_SIZE &&
        nr >= 0 &&
        nr < GRID_SIZE &&
        grid.walkable[nr][nc] &&
        !visited.has(nKey) &&
        (!avoidSet || !avoidSet.has(nKey) || (nc === gc && nr === gr))
      ) {
        visited.add(nKey);
        parent.set(nKey, `${cc},${cr}`);
        queue.push([nc, nr]);
      }
    }
  }

  return [];
}

interface PasserAgent {
  id: number;
  name: string;
  lookIdx: number;
  fc: number;
  fr: number;
  path: [number, number][];
  speed: number;
  waitTimer: number;
  stuckTimer: number;
  rotY: number;
  talkedToday: boolean;
}

interface CarAgent {
  id: number;
  axis: 'h' | 'v';
  lane: number;
  pos: number;
  dir: 1 | -1;
  speed: number;
  color: string;
}

const Building3D: React.FC<{
  loc: WorldLocation;
  isNight: boolean;
  hasActiveShow: boolean;
  statusLabel: string;
  onSelect: (locId: string) => void;
}> = ({ loc, isNight, hasActiveShow, onSelect }) => {
  const [bc, br] = loc.at;
  // Center of 2x2 building is (bc + 0.5, br + 0.5)
  const [wx, wz] = gridToWorld(bc + 0.5, br + 0.5);
  const height = loc.id === 'hotel' || loc.id === 'tv' ? 2.15 : loc.id === 'beach' ? 1.15 : 1.65;

  return (
    <group
      position={[wx, 0, wz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(loc.id);
      }}
    >
      {/* Building Base Plinth */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.88, 0.16, 1.88]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* Main Sculpted Clay Building Body */}
      <mesh position={[0, height / 2 + 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.68, height, 1.68]} />
        <meshStandardMaterial color={loc.color} roughness={0.48} metalness={0.08} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, height + 0.28, 0]} castShadow>
        <boxGeometry args={[1.78, 0.24, 1.78]} />
        <meshStandardMaterial color={loc.roofColor} roughness={0.4} />
      </mesh>

      {/* Emissive Windows (.win) that glow warmly at Evening/Night */}
      {[-0.42, 0.42].map((ox, i) =>
        [0.65, height > 1.6 ? 1.35 : -1].map((oy, j) =>
          oy > 0 ? (
            <group key={`${i}-${j}`}>
              <mesh position={[ox, oy, 0.85]}>
                <boxGeometry args={[0.38, 0.34, 0.03]} />
                <meshStandardMaterial
                  color={isNight ? '#FEF08A' : '#BAE6FD'}
                  emissive={isNight ? '#F59E0B' : '#0284C7'}
                  emissiveIntensity={isNight ? 1.35 : 0.2}
                />
              </mesh>
              <mesh position={[0.85, oy, ox]}>
                <boxGeometry args={[0.03, 0.34, 0.38]} />
                <meshStandardMaterial
                  color={isNight ? '#FEF08A' : '#BAE6FD'}
                  emissive={isNight ? '#F59E0B' : '#0284C7'}
                  emissiveIntensity={isNight ? 1.35 : 0.2}
                />
              </mesh>
            </group>
          ) : null
        )
      )}

      {/* Neon Sign (.sign) on Rooftop */}
      <group position={[0, height + 0.52, 0.45]}>
        <mesh>
          <boxGeometry args={[1.25, 0.28, 0.12]} />
          <meshStandardMaterial
            color={loc.neonColor}
            emissive={loc.neonColor}
            emissiveIntensity={isNight ? 1.6 : 0.55}
          />
        </mesh>
      </group>

      {/* Door Canopy on front-left (+Z) or front-right (+X) */}
      <group
        position={
          loc.doorFace === 'front-left' ? [0.35, 0.38, 0.88] : [0.88, 0.38, 0.35]
        }
      >
        <mesh>
          <boxGeometry
            args={loc.doorFace === 'front-left' ? [0.48, 0.62, 0.08] : [0.08, 0.62, 0.48]}
          />
          <meshStandardMaterial
            color="#FDE047"
            emissive="#F59E0B"
            emissiveIntensity={isNight ? 0.9 : 0.3}
          />
        </mesh>
      </group>

      {/* Floating 3D Spatial Label + Active Show "!" Marker */}
      <Html position={[0, height + 0.95, 0]} center distanceFactor={13}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(loc.id);
          }}
          className="group relative flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-[#120A30]/90 px-3 py-1 text-xs font-extrabold text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-pink-400"
        >
          <span>{loc.icon}</span>
          <span>{loc.name}</span>
          {hasActiveShow && (
            <span className="ml-1 inline-flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-amber-400 text-[11px] font-black text-slate-950 shadow-[0_0_12px_#FF4FD8]">
              !
            </span>
          )}
        </button>
      </Html>
    </group>
  );
};

// Camera follow tuning (world units = tiles)
const FOLLOW_DEAD_ZONE = 1.6; // MC may roam this far from the view centre before the camera moves
const FOLLOW_SMOOTH = 6; // k = 1 - e^(-6·dt): exponential smoothing rate

/**
 * Keeps the camera centred on MC Thiên Ân while follow is on.
 * Inside the dead zone the camera stays still; outside it, the target and the
 * camera are shifted together (no rotation change) so the view glides after MC.
 */
const CameraFollowRig: React.FC<{
  controlsRef: React.MutableRefObject<any>;
  followRef: React.MutableRefObject<boolean>;
  mcWorld: [number, number];
}> = ({ controlsRef, followRef, mcWorld }) => {
  const mcPosRef = useRef(mcWorld);
  mcPosRef.current = mcWorld;

  useFrame((state, dt) => {
    const controls = controlsRef.current;
    if (!controls || !followRef.current) return;

    const [mx, mz] = mcPosRef.current;
    const dx = mx - controls.target.x;
    const dz = mz - controls.target.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= FOLLOW_DEAD_ZONE) return;

    const ux = dx / dist;
    const uz = dz / dist;
    const k = 1 - Math.exp(-FOLLOW_SMOOTH * Math.min(dt, 0.05));
    const step = (dist - FOLLOW_DEAD_ZONE) * k;

    controls.target.x += ux * step;
    controls.target.z += uz * step;
    state.camera.position.x += ux * step;
    state.camera.position.z += uz * step;
  });

  return null;
};

export const CityWorld3D: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const advanceClock = useGameStore((s) => s.advanceClock);
  const setLocation = useGameStore((s) => s.setLocation);
  const startScene = useGameStore((s) => s.startScene);
  const goTo = useGameStore((s) => s.goTo);
  const sleepDay = useGameStore((s) => s.sleepDay);
  const waitUntilMinute = useGameStore((s) => s.waitUntilMinute);
  const toast = useGameStore((s) => s.toast);
  const openStreetTalk = useGameStore((s) => s.openStreetTalk);
  const streetTalkDoneIds = useGameStore((s) => s.streetTalkDoneIds);
  const worldTarget = useGameStore((s) => s.worldTarget);
  const clearWorldTarget = useGameStore((s) => s.clearWorldTarget);

  const grid = useMemo(() => buildCityGrid(), []);
  const periodMeta = getPeriodMeta(state.clock);
  const playerLook = useMemo(() => getPlayerLook(state.items), [state.items]);

  // Initial MC position at current loc door tile (defaults to home door [6, 8])
  const initialDoor = WORLD_LOCS[state.loc]?.doorTile || WORLD_LOCS.home.doorTile;

  const mcRef = useRef<{
    fc: number;
    fr: number;
    path: [number, number][];
    speed: number;
    stepsWalked: number;
    rotY: number;
    walking: boolean;
    lastStepSoundAt: number;
    pendingEnterScene?: string;
    pendingPasserId?: number;
  }>({
    fc: initialDoor[0],
    fr: initialDoor[1],
    path: [],
    speed: 3.6,
    stepsWalked: 0,
    rotY: 0,
    walking: false,
    lastStepSoundAt: 0,
  });

  const [mcRenderPos, setMcRenderPos] = useState<[number, number]>(initialDoor);
  const [mcWalking, setMcWalking] = useState(false);
  const [mcRotY, setMcRotY] = useState(0);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);
  const [activeDoorLocId, setActiveDoorLocId] = useState<string | null>(state.loc);
  const [floatingMinutes, setFloatingMinutes] = useState<number | null>(null);

  // Camera follow state: ref is read inside useFrame, state drives the 🎯 button
  const [followOn, setFollowOn] = useState(true);
  const followRef = useRef(true);
  const controlsRef = useRef<any>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const mcWorld = gridToWorld(mcRenderPos[0], mcRenderPos[1]);
  const setFollow = (on: boolean) => {
    followRef.current = on;
    setFollowOn(on);
  };

  // Initialize 6 wandering passersby
  const passersRef = useRef<PasserAgent[]>([]);
  const [, setPasserTick] = useState(0);

  useEffect(() => {
    const walkTiles: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid.walkable[r][c] && !grid.doorToLoc.has(`${c},${r}`)) {
          walkTiles.push([c, r]);
        }
      }
    }

    const chosen: PasserAgent[] = [];
    for (let i = 0; i < 6; i++) {
      const candidate =
        walkTiles.find(
          ([c, r]) =>
            Math.hypot(c - mcRef.current.fc, r - mcRef.current.fr) >= 4 &&
            chosen.every((p) => Math.hypot(c - p.fc, r - p.fr) >= 3)
        ) || walkTiles[(i * 7) % walkTiles.length];

      chosen.push({
        id: i,
        name: WM_NAMES[i % WM_NAMES.length],
        lookIdx: i % PASSER_LOOKS.length,
        fc: candidate[0],
        fr: candidate[1],
        path: [],
        speed: 1.15 + Math.random() * 0.4,
        waitTimer: 1 + Math.random() * 2.5,
        stuckTimer: 0,
        rotY: 0,
        talkedToday: false,
      });
    }
    passersRef.current = chosen;
  }, [grid, state.day]);

  // Initialize 4 lane cars (r=3, r=8, c=3, c=9)
  const carsRef = useRef<CarAgent[]>([
    { id: 0, axis: 'h', lane: 3, pos: 1, dir: 1, speed: 1.6, color: '#EF4444' },
    { id: 1, axis: 'h', lane: 8, pos: 11, dir: -1, speed: 1.45, color: '#F59E0B' },
    { id: 2, axis: 'v', lane: 3, pos: 2, dir: 1, speed: 1.75, color: '#3B82F6' },
    { id: 3, axis: 'v', lane: 9, pos: 10, dir: -1, speed: 1.55, color: '#EC4899' },
  ]);

  const commandWalkTo = (
    targetTile: [number, number],
    opts?: { enterSceneId?: string; passerId?: number }
  ) => {
    const m = mcRef.current;
    const startTile: [number, number] =
      m.walking && m.path.length > 0 ? m.path[0] : [Math.round(m.fc), Math.round(m.fr)];
    const newPath = findBfsPath(grid, startTile, targetTile);

    if (newPath.length === 0 && Math.hypot(m.fc - targetTile[0], m.fr - targetTile[1]) < 0.25) {
      // Already at destination
      const doorLoc = grid.doorToLoc.get(`${Math.round(targetTile[0])},${Math.round(targetTile[1])}`);
      if (doorLoc) {
        setLocation(doorLoc);
        setActiveDoorLocId(doorLoc);
        if (opts?.enterSceneId && !blockReason(opts.enterSceneId, useGameStore.getState().state)) {
          startScene(opts.enterSceneId, 'world');
        }
      }
      return;
    }

    const fullPath = m.walking && m.path.length > 0 ? [m.path[0], ...newPath] : newPath;
    m.path = fullPath;
    m.speed = Math.max(3.6, fullPath.length / 4.5);
    if (!m.walking) {
      m.stepsWalked = 0;
    }
    m.walking = fullPath.length > 0;
    m.pendingEnterScene = opts?.enterSceneId;
    m.pendingPasserId = opts?.passerId;
    setActiveDoorLocId(null);
    if (fullPath.length > 0) {
      setWaypoint(fullPath[fullPath.length - 1]);
    }
  };

  // Handle auto walk target when entering World from Hub poster/daily cards
  useEffect(() => {
    if (worldTarget) {
      const loc = WORLD_LOCS[worldTarget.locId];
      if (loc) {
        commandWalkTo(loc.doorTile, { enterSceneId: worldTarget.enterSceneId });
      }
      clearWorldTarget();
    }
  }, [worldTarget]);

  const handleSelectBuilding = (locId: string) => {
    SFX.play('tap');
    const loc = WORLD_LOCS[locId];
    if (!loc) return;
    commandWalkTo(loc.doorTile);
  };

  const handleSelectTile = (c: number, r: number) => {
    SFX.play('tap');
    const bLoc = grid.buildingAtTile.get(`${c},${r}`);
    if (bLoc) {
      handleSelectBuilding(bLoc);
      return;
    }
    commandWalkTo([c, r]);
  };

  const handleSelectPasser = (passer: PasserAgent) => {
    SFX.play('tap');
    passer.path = [];
    passer.waitTimer = 6;
    const pc = Math.round(passer.fc);
    const pr = Math.round(passer.fr);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let adj: [number, number] = [pc, pr];
    let bestD = Infinity;
    for (const [dc, dr] of dirs) {
      const nc = pc + dc;
      const nr = pr + dr;
      if (nc >= 0 && nc < GRID_SIZE && nr >= 0 && nr < GRID_SIZE && grid.walkable[nr][nc]) {
        const d = Math.hypot(nc - mcRef.current.fc, nr - mcRef.current.fr);
        if (d < bestD) {
          bestD = d;
          adj = [nc, nr];
        }
      }
    }
    commandWalkTo(adj, { passerId: passer.id });
  };

  const triggerPasserConversation = (passerId: number) => {
    const passer = passersRef.current.find((p) => p.id === passerId);
    if (!passer) return;

    if (passer.talkedToday) {
      SFX.play('chat');
      toast(`💬 ${passer.name}: "Have a lovely day, MC Thiên Ân!"`, 'info');
      return;
    }

    const curPeriod = getPeriod(useGameStore.getState().state.clock);
    // Find closest building
    let closestLoc = 'cafe';
    let minD = Infinity;
    for (const loc of Object.values(WORLD_LOCS)) {
      const d = Math.hypot(loc.doorTile[0] - passer.fc, loc.doorTile[1] - passer.fr);
      if (d < minD) {
        minD = d;
        closestLoc = loc.id;
      }
    }

    const used = useGameStore.getState().streetTalkDoneIds;
    const matchLoc = STREET_TALK.find(
      (item) =>
        !used[item.id] &&
        item.loc === closestLoc &&
        item.when.includes(curPeriod)
    );
    const matchGen = STREET_TALK.find(
      (item) =>
        !used[item.id] &&
        item.loc === null &&
        item.when.includes(curPeriod)
    );
    const chosenItem = matchLoc || matchGen || STREET_TALK[0];

    passer.talkedToday = true;
    openStreetTalk(passer.name, passer.lookIdx, chosenItem);
  };

  // Closest location label for top bar ("Trước cửa X" / "Gần X" / "Trên phố · gần X")
  const locationBannerText = useMemo(() => {
    const [mcC, mcR] = [Math.round(mcRenderPos[0]), Math.round(mcRenderPos[1])];
    const atDoorId = grid.doorToLoc.get(`${mcC},${mcR}`);
    if (atDoorId && WORLD_LOCS[atDoorId]) {
      return `Trước cửa ${WORLD_LOCS[atDoorId].name}`;
    }
    let bestLoc = WORLD_LOCS.home;
    let bestDist = Infinity;
    for (const loc of Object.values(WORLD_LOCS)) {
      const d = Math.hypot(loc.doorTile[0] - mcRenderPos[0], loc.doorTile[1] - mcRenderPos[1]);
      if (d < bestDist) {
        bestDist = d;
        bestLoc = loc;
      }
    }
    if (bestDist <= 3) return `Gần ${bestLoc.name}`;
    return `Trên phố · gần ${bestLoc.name}`;
  }, [mcRenderPos, grid]);

  // Next available show today for bottom quick-action bar
  const nextShowInfo = useMemo(() => {
    const showIds = ['backstage', 'beach', 'wedding', 'gala', 'interview'];
    for (const id of showIds) {
      const st = sceneStatus(id, state.clock, state.doneToday);
      if (st.state === 'open' || st.state === 'late' || st.state === 'early') {
        const locEntry = Object.values(WORLD_LOCS).find((l) => l.scenes.includes(id));
        return {
          scene: SCENES[id],
          status: st,
          locId: locEntry?.id || 'theater',
          startMin: SCHEDULE[id]?.start || 900,
        };
      }
    }
    return null;
  }, [state.clock, state.doneToday]);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#0E0725]"
      // Dragging more than 9px away from the start point hands the camera to the player
      onPointerDown={(e) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const s = dragStartRef.current;
        if (s && followRef.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 9) {
          setFollow(false);
        }
      }}
      onPointerUp={() => {
        dragStartRef.current = null;
      }}
      onPointerCancel={() => {
        dragStartRef.current = null;
      }}
      onPointerLeave={() => {
        dragStartRef.current = null;
      }}
    >
      {/* 3D Isometric Diorama Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [9.5, 11.5, 9.5], fov: 28 }}
      >
        <CitySimulationLoop
          grid={grid}
          mcRef={mcRef}
          passersRef={passersRef}
          carsRef={carsRef}
          setMcRenderPos={setMcRenderPos}
          setMcWalking={setMcWalking}
          setMcRotY={setMcRotY}
          setWaypoint={setWaypoint}
          setPasserTick={setPasserTick}
          onArrive={(tile, steps, enterSceneId, passerId) => {
            if (steps > 0) {
              const mins = travelMinutes(steps);
              advanceClock(mins);
              setFloatingMinutes(mins);
              window.setTimeout(() => setFloatingMinutes(null), 1300);
            }
            const doorLoc = grid.doorToLoc.get(`${tile[0]},${tile[1]}`);
            if (doorLoc) {
              setLocation(doorLoc);
              setActiveDoorLocId(doorLoc);
              if (
                enterSceneId &&
                !blockReason(enterSceneId, useGameStore.getState().state)
              ) {
                startScene(enterSceneId, 'world');
              }
            }
            if (passerId !== undefined) {
              triggerPasserConversation(passerId);
            }
          }}
        />

        {/* Real-Time Day/Night Sky & Lighting */}
        <color attach="background" args={[periodMeta.skyTop]} />
        <ambientLight intensity={periodMeta.ambientIntensity} color="#F8FAFC" />
        <directionalLight
          position={[8, 14, 6]}
          intensity={periodMeta.sunIntensity}
          color={periodMeta.sunColor}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {/* 14x14 Tiles */}
        <group>
          {grid.tiles.map((row, r) =>
            row.map((kind, c) => {
              const [wx, wz] = gridToWorld(c, r);
              const isDoor = grid.doorToLoc.has(`${c},${r}`);
              const tileColor =
                kind === 'road-x' || kind === 'road-y' || kind === 'cross'
                  ? '#1E293B'
                  : kind === 'sand'
                  ? '#FDE68A'
                  : kind === 'plaza'
                  ? '#CBD5E1'
                  : kind === 'water'
                  ? '#0284C7'
                  : (c + r) % 2 === 0
                  ? '#15803D'
                  : '#166534';

              return (
                <group
                  key={`${c}-${r}`}
                  position={[wx, kind === 'water' ? -0.06 : 0, wz]}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTile(c, r);
                  }}
                >
                  <mesh receiveShadow>
                    <boxGeometry args={[0.98, 0.12, 0.98]} />
                    <meshStandardMaterial
                      color={tileColor}
                      roughness={kind === 'water' ? 0.15 : 0.75}
                      metalness={kind === 'water' ? 0.35 : 0.05}
                    />
                  </mesh>

                  {/* Road Crosswalk / Lane markings */}
                  {kind === 'road-x' && (
                    <mesh position={[0, 0.065, 0]}>
                      <boxGeometry args={[0.38, 0.01, 0.06]} />
                      <meshBasicMaterial color="#94A3B8" />
                    </mesh>
                  )}
                  {kind === 'road-y' && (
                    <mesh position={[0, 0.065, 0]}>
                      <boxGeometry args={[0.06, 0.01, 0.38]} />
                      <meshBasicMaterial color="#94A3B8" />
                    </mesh>
                  )}

                  {/* Glowing Door Mat Indicator */}
                  {isDoor && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
                      <ringGeometry args={[0.25, 0.38, 24]} />
                      <meshBasicMaterial color="#22D3EE" transparent opacity={0.75} />
                    </mesh>
                  )}
                </group>
              );
            })
          )}
        </group>

        {/* 3D Waypoint Marker when walking */}
        {waypoint && (
          <group position={[gridToWorld(waypoint[0], waypoint[1])[0], 0.12, gridToWorld(waypoint[0], waypoint[1])[1]]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.36, 24]} />
              <meshBasicMaterial color="#FF4FD8" side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* 8 Isometric 3D Buildings */}
        {Object.values(WORLD_LOCS).map((loc) => {
          const activeShow = loc.scenes.some((sId) => {
            const st = sceneStatus(sId, state.clock, state.doneToday);
            return st.state === 'open' || st.state === 'late';
          });
          return (
            <Building3D
              key={loc.id}
              loc={loc}
              isNight={periodMeta.isNight}
              hasActiveShow={activeShow}
              statusLabel=""
              onSelect={handleSelectBuilding}
            />
          );
        })}

        {/* 3D City Props (Trees, Palms, Street Lamps, Benches, Fountain) */}
        {WORLD_PROPS.map((prop, idx) => {
          const [wx, wz] = gridToWorld(prop.c, prop.r);
          return (
            <group key={idx} position={[wx, 0.06, wz]}>
              {prop.kind === 'tree' && (
                <group>
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[0.07, 0.09, 0.4, 8]} />
                    <meshStandardMaterial color="#78350F" />
                  </mesh>
                  <mesh position={[0, 0.55, 0]} castShadow>
                    <sphereGeometry args={[0.32, 14, 14]} />
                    <meshStandardMaterial color="#22C55E" roughness={0.6} />
                  </mesh>
                </group>
              )}
              {prop.kind === 'palm' && (
                <group>
                  <mesh position={[0, 0.32, 0]} castShadow>
                    <cylinderGeometry args={[0.05, 0.08, 0.64, 8]} />
                    <meshStandardMaterial color="#92400E" />
                  </mesh>
                  <mesh position={[0, 0.66, 0]} castShadow>
                    <coneGeometry args={[0.38, 0.25, 7]} />
                    <meshStandardMaterial color="#4ADE80" />
                  </mesh>
                </group>
              )}
              {prop.kind === 'lamp' && (
                <group>
                  <mesh position={[0, 0.38, 0]}>
                    <cylinderGeometry args={[0.03, 0.04, 0.76, 8]} />
                    <meshStandardMaterial color="#475569" metalness={0.6} />
                  </mesh>
                  <mesh position={[0, 0.78, 0]}>
                    <sphereGeometry args={[0.09, 12, 12]} />
                    <meshStandardMaterial
                      color="#FEF08A"
                      emissive="#FBBF24"
                      emissiveIntensity={periodMeta.isNight ? 2 : 0.2}
                    />
                  </mesh>
                  {periodMeta.isNight && (
                    <pointLight
                      position={[0, 0.85, 0]}
                      intensity={0.65}
                      distance={3.2}
                      color="#FDE047"
                    />
                  )}
                </group>
              )}
              {prop.kind === 'bush' && (
                <mesh position={[0, 0.16, 0]} castShadow>
                  <sphereGeometry args={[0.2, 12, 12]} />
                  <meshStandardMaterial color="#16A34A" />
                </mesh>
              )}
              {prop.kind === 'fountain' && (
                <group>
                  <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.42, 0.45, 0.28, 20]} />
                    <meshStandardMaterial color="#E2E8F0" />
                  </mesh>
                  <mesh position={[0, 0.32, 0]}>
                    <sphereGeometry args={[0.18, 16, 16]} />
                    <meshStandardMaterial
                      color="#38BDF8"
                      emissive="#0284C7"
                      emissiveIntensity={0.5}
                    />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        {/* 6 Wandering 3D Passersby */}
        {passersRef.current.map((p) => {
          const [wx, wz] = gridToWorld(p.fc, p.fr);
          return (
            <group key={p.id}>
              <ClayCharacter3D
                look={PASSER_LOOKS[p.lookIdx]}
                position={[wx, 0.06, wz]}
                rotationY={p.rotY}
                scale={0.55}
                isWalking={p.path.length > 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectPasser(p);
                }}
              />
              {!p.talkedToday && (
                <Html position={[wx, 1.05, wz]} center distanceFactor={14}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPasser(p);
                    }}
                    className="whitespace-nowrap rounded-full border border-cyan-300/60 bg-cyan-950/90 px-2 py-0.5 text-[10px] font-extrabold text-cyan-200 shadow-md transition hover:scale-110"
                  >
                    💬 Hi! ({p.name})
                  </button>
                </Html>
              )}
            </group>
          );
        })}

        {/* 4 Animated 3D Cars */}
        {carsRef.current.map((car) => {
          const c = car.axis === 'h' ? car.pos : car.lane;
          const r = car.axis === 'h' ? car.lane : car.pos;
          const [wx, wz] = gridToWorld(c, r);
          const rotY =
            car.axis === 'h'
              ? car.dir === 1
                ? Math.PI / 2
                : -Math.PI / 2
              : car.dir === 1
              ? 0
              : Math.PI;
          return (
            <group key={car.id} position={[wx, 0.16, wz]} rotation={[0, rotY, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.42, 0.22, 0.72]} />
                <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.16, -0.04]}>
                <boxGeometry args={[0.36, 0.16, 0.4]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.2} />
              </mesh>
              {periodMeta.isNight && (
                <mesh position={[0, 0, 0.37]}>
                  <boxGeometry args={[0.32, 0.06, 0.02]} />
                  <meshBasicMaterial color="#FEF08A" />
                </mesh>
              )}
            </group>
          );
        })}

        {/* MC Thiên Ân 3D Character on Map */}
        <group>
          <ClayCharacter3D
            look={playerLook}
            position={[
              gridToWorld(mcRenderPos[0], mcRenderPos[1])[0],
              0.06,
              gridToWorld(mcRenderPos[0], mcRenderPos[1])[1],
            ]}
            rotationY={mcRotY}
            scale={0.62}
            isWalking={mcWalking}
            highlightRing
          />
          {floatingMinutes !== null && (
            <Html
              position={[
                gridToWorld(mcRenderPos[0], mcRenderPos[1])[0],
                1.35,
                gridToWorld(mcRenderPos[0], mcRenderPos[1])[1],
              ]}
              center
            >
              <div className="animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-950 shadow-lg">
                +{floatingMinutes}′ 🕒
              </div>
            </Html>
          )}
        </group>

        <CameraFollowRig controlsRef={controlsRef} followRef={followRef} mcWorld={mcWorld} />

        <MapControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          enableRotate={true}
          enableZoom={true}
          minDistance={7}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.35}
          minPolarAngle={Math.PI / 5}
        />

        {/* Threshold bloom: only emissive windows, neon signs and lamps exceed the threshold and glow */}
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.9}
            luminanceSmoothing={0.15}
            intensity={periodMeta.isNight ? 1.1 : 0.35}
            mipmapBlur
          />
          {/* Light depth-of-field: softens the far edges so the city reads as a miniature diorama */}
          <DepthOfField focusDistance={0.0175} focalLength={0.08} bokehScale={1.2} height={480} />
        </EffectComposer>
      </Canvas>

      {/* Top World Bar: Clock, Period, Location Status & Go Home Button */}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[#120A30]/85 px-3.5 py-2 shadow-xl backdrop-blur-md">
          <span className="text-lg">{periodMeta.icon}</span>
          <div>
            <div className="font-display text-sm font-black text-white">
              {fmtTime(state.clock)} · {periodMeta.label} · Ngày {state.day}
            </div>
            <div className="text-[11px] font-semibold text-cyan-300">
              📍 {locationBannerText}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => handleSelectBuilding('home')}
            className="flex items-center gap-1.5 rounded-2xl border border-pink-400/40 bg-[#120A30]/85 px-3.5 py-2 text-xs font-extrabold text-pink-200 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-pink-500/20"
          >
            <span>🏠</span>
            <span>Về Nhà</span>
          </button>
          <button
            onClick={() => goTo('hub')}
            className="flex items-center gap-1.5 rounded-2xl border border-cyan-400/40 bg-[#120A30]/85 px-3.5 py-2 text-xs font-extrabold text-cyan-200 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-cyan-500/20"
          >
            <span>🎙️</span>
            <span>Phòng MC</span>
          </button>
        </div>
      </div>

      {/* Door Entry Card (locCard / actRow) when standing at a building door */}
      {activeDoorLocId && WORLD_LOCS[activeDoorLocId] && (
        <div className="pointer-events-auto absolute bottom-20 left-1/2 z-30 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border border-white/20 bg-[#120A30]/92 p-4 shadow-[0_0_40px_rgba(18,10,48,0.95)] backdrop-blur-xl sm:left-auto sm:right-6 sm:translate-x-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                {WORLD_LOCS[activeDoorLocId].icon}
              </span>
              <div>
                <h3 className="font-display text-base font-black text-white">
                  {WORLD_LOCS[activeDoorLocId].name}
                </h3>
                <p className="text-xs text-slate-300">Đang đứng trước cửa</p>
              </div>
            </div>
            <button
              onClick={() => setActiveDoorLocId(null)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          {activeDoorLocId === 'home' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => goTo('hub')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-black text-white shadow-lg transition hover:scale-[1.02]"
              >
                🚪 Vào Phòng MC
              </button>
              <button
                disabled={state.clock < 1080 && state.energy >= 30}
                onClick={() => sleepDay({ forced: false })}
                className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/20 py-3 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-40"
              >
                🛌 Đi Ngủ (18:00+)
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {WORLD_LOCS[activeDoorLocId].scenes.map((sceneId) => {
                const sc = SCENES[sceneId];
                const st = sceneStatus(sceneId, state.clock, state.doneToday);
                const reason = blockReason(sceneId, state);
                const waitMin = getWaitTargetMinute(sceneId, state.clock);

                return (
                  <div
                    key={sceneId}
                    className="rounded-2xl border border-white/15 bg-white/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{sc.icon}</span>
                          <span className="font-display text-sm font-extrabold text-white">
                            {sc.title}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-cyan-300">
                          {st.label}
                        </div>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        {sc.level} · Lv.{sc.reqLv}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        {sc.reward.cash && (
                          <span className="text-amber-300">+${sc.reward.cash}</span>
                        )}
                        {sc.reward.energy && (
                          <span className="text-emerald-300">+{sc.reward.energy} ⚡</span>
                        )}
                        <span className="text-purple-300">+{sc.reward.charisma} Cha</span>
                        {sc.energy > 0 && (
                          <span className="text-rose-300">−{sc.energy} ⚡</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {waitMin !== null && (st.state === 'early' || st.state === 'closed') && (
                          <button
                            onClick={() => waitUntilMinute(waitMin)}
                            className="rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-extrabold text-amber-200 transition hover:bg-amber-500/30"
                          >
                            ⏩ Chờ đến {fmtTime(waitMin)}
                          </button>
                        )}
                        <button
                          disabled={Boolean(reason)}
                          onClick={() => startScene(sceneId, 'world')}
                          className="rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 px-4 py-1.5 text-xs font-black text-white shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {st.state === 'done' ? 'Đã dẫn ✓' : '🎙️ Vào Sân Khấu'}
                        </button>
                      </div>
                    </div>
                    {reason && (
                      <p className="mt-1.5 text-[11px] font-semibold text-rose-300">
                        ⚠️ {reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 🎯 Re-centre button: only shown after the player has dragged the map away from MC */}
      {!followOn && (
        <button
          onClick={() => setFollow(true)}
          aria-label="Định tâm về MC"
          // drei's passer labels use very high z-indexes; keep the re-centre button above them
          style={{ zIndex: 2147483000 }}
          className="pointer-events-auto absolute right-4 top-44 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/50 bg-[#120A30]/90 text-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] backdrop-blur-md transition hover:scale-110"
        >
          🎯
        </button>
      )}

      {/* Bottom Bar: "Show kế" Quick Walk Button */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
        {nextShowInfo ? (
          <button
            onClick={() => handleSelectBuilding(nextShowInfo.locId)}
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-pink-400/50 bg-[#120A30]/90 px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_0_25px_rgba(255,79,216,0.35)] backdrop-blur-md transition hover:scale-105"
          >
            <span className="text-base">{nextShowInfo.scene.icon}</span>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-pink-300">
                Show kế tiếp · {fmtTime(nextShowInfo.startMin)}
              </div>
              <div className="font-display text-xs font-black text-white">
                {nextShowInfo.scene.title} ({nextShowInfo.status.label})
              </div>
            </div>
            <span className="rounded-full bg-pink-500/25 px-2.5 py-1 text-[11px] font-black text-pink-200">
              Đi tới ➔
            </span>
          </button>
        ) : (
          <div className="pointer-events-auto rounded-full border border-white/15 bg-[#120A30]/85 px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur-md">
            🌙 Đã hết lịch show hôm nay — hãy về nhà nghỉ ngơi để sang ngày mới!
          </div>
        )}
      </div>
    </div>
  );
};

// Frame loop updating MC walking interpolation, Passersby AI, and Cars
const CitySimulationLoop: React.FC<{
  grid: GridData;
  mcRef: React.MutableRefObject<any>;
  passersRef: React.MutableRefObject<PasserAgent[]>;
  carsRef: React.MutableRefObject<CarAgent[]>;
  setMcRenderPos: (p: [number, number]) => void;
  setMcWalking: (w: boolean) => void;
  setMcRotY: (r: number) => void;
  setWaypoint: (w: [number, number] | null) => void;
  setPasserTick: React.Dispatch<React.SetStateAction<number>>;
  onArrive: (
    tile: [number, number],
    steps: number,
    enterSceneId?: string,
    passerId?: number
  ) => void;
}> = ({
  grid,
  mcRef,
  passersRef,
  carsRef,
  setMcRenderPos,
  setMcWalking,
  setMcRotY,
  setWaypoint,
  setPasserTick,
  onArrive,
}) => {
  const accumRef = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mcRef.current;

    // 1. Update MC Walking Interpolation
    if (m.walking && m.path.length > 0) {
      const [tc, tr] = m.path[0];
      const dx = tc - m.fc;
      const dy = tr - m.fr;
      const dist = Math.hypot(dx, dy);
      const stepDist = m.speed * dt;

      if (dist > 0.001) {
        m.rotY = Math.atan2(dx, dy);
      }

      const now = performance.now();
      if (now - m.lastStepSoundAt >= 320) {
        SFX.play('step');
        m.lastStepSoundAt = now;
      }

      if (stepDist >= dist) {
        m.fc = tc;
        m.fr = tr;
        m.path.shift();
        m.stepsWalked += 1;

        if (m.path.length === 0) {
          m.walking = false;
          setMcWalking(false);
          setWaypoint(null);
          setMcRenderPos([m.fc, m.fr]);
          setMcRotY(m.rotY);
          onArrive(
            [Math.round(m.fc), Math.round(m.fr)],
            m.stepsWalked,
            m.pendingEnterScene,
            m.pendingPasserId
          );
          m.stepsWalked = 0;
          m.pendingEnterScene = undefined;
          m.pendingPasserId = undefined;
        }
      } else {
        m.fc += (dx / dist) * stepDist;
        m.fr += (dy / dist) * stepDist;
      }

      setMcRenderPos([m.fc, m.fr]);
      setMcWalking(m.walking);
      setMcRotY(m.rotY);
    }

    // 2. Update 6 Wandering Passersby AI
    for (const p of passersRef.current) {
      if (p.path.length === 0) {
        p.waitTimer -= dt;
        if (p.waitTimer <= 0) {
          // Pick random walkable target within 5 tiles, not a door
          for (let attempt = 0; attempt < 4; attempt++) {
            const tc = clamp(Math.round(p.fc + (Math.random() * 10 - 5)), 0, 13);
            const tr = clamp(Math.round(p.fr + (Math.random() * 10 - 5)), 0, 13);
            if (
              grid.walkable[tr][tc] &&
              !grid.doorToLoc.has(`${tc},${tr}`) &&
              Math.hypot(tc - m.fc, tr - m.fr) >= 2
            ) {
              const occupied = new Set<string>();
              passersRef.current.forEach((other) => {
                if (other.id !== p.id) {
                  occupied.add(`${Math.round(other.fc)},${Math.round(other.fr)}`);
                }
              });
              const path = findBfsPath(grid, [p.fc, p.fr], [tc, tr], occupied);
              if (path.length > 0) {
                p.path = path;
                break;
              }
            }
          }
          p.waitTimer = 1.5 + Math.random() * 2.5;
        }
      } else {
        const [tc, tr] = p.path[0];
        // Check if someone is blocking ahead (< 0.95 tile)
        const blocked =
          Math.hypot(tc - m.fc, tr - m.fr) < 0.95 ||
          passersRef.current.some(
            (o) => o.id !== p.id && Math.hypot(tc - o.fc, tr - o.fr) < 0.9
          );

        if (blocked) {
          p.stuckTimer += dt;
          if (p.stuckTimer > 0.8) {
            p.path = [];
            p.stuckTimer = 0;
            p.waitTimer = 0.6;
          }
        } else {
          p.stuckTimer = 0;
          const dx = tc - p.fc;
          const dy = tr - p.fr;
          const dist = Math.hypot(dx, dy);
          const step = p.speed * dt;
          if (dist > 0.001) p.rotY = Math.atan2(dx, dy);
          if (step >= dist) {
            p.fc = tc;
            p.fr = tr;
            p.path.shift();
          } else {
            p.fc += (dx / dist) * step;
            p.fr += (dy / dist) * step;
          }
        }
      }
    }

    // 3. Update 4 Cars (stop if MC is right in front < 1.1 tiles in lane)
    for (const car of carsRef.current) {
      const carC = car.axis === 'h' ? car.pos : car.lane;
      const carR = car.axis === 'h' ? car.lane : car.pos;
      const sameLane =
        car.axis === 'h'
          ? Math.abs(m.fr - car.lane) < 0.65
          : Math.abs(m.fc - car.lane) < 0.65;
      const distAhead =
        car.axis === 'h' ? (m.fc - carC) * car.dir : (m.fr - carR) * car.dir;

      if (sameLane && distAhead > 0 && distAhead < 1.15) {
        // Yield to MC
        continue;
      }

      car.pos += car.dir * car.speed * dt;
      if (car.pos > 12.2) {
        car.pos = 0.2;
      } else if (car.pos < 0.2) {
        car.pos = 12.2;
      }
    }

    accumRef.current += dt;
    if (accumRef.current >= 0.05) {
      accumRef.current = 0;
      setPasserTick((t) => (t + 1) % 10000);
    }
  });

  return null;
};
