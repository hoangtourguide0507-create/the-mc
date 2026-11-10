import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, MapControls, PerformanceMonitor } from '@react-three/drei';
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { GHIBLI, GHIBLI_NIGHT_LIGHT, ghibliSky, isGhibli } from './artStyle';
import { GhibliClouds, GrassTufts } from './city/GhibliDecor';
import * as THREE from 'three';
import { isStreetTalkUnlocked } from '../core/difficulty';
import { getPlayerLook, GIG_ORDER, PASSER_LOOKS, SCHEDULE, SCENES, STREET_TALK, WM_NAMES, WORLD_LOCS } from '../data/content';
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
import { GameState } from '../types/game';
import { SFX } from '../audio/audioSystem';
import { buildCityGrid, DISTRICTS, FILLERS, findPath, GRID, GridData, gridToWorld } from './city/cityMap';
import { CityGround } from './city/Ground';
import { FillerBuilding, Landmark } from './city/Buildings';
import { CityProps } from './city/Props';
import { Car, CarAgent, makeCars, PasserAgent, stepCars, Walker, walkTiles } from './city/Agents';

/** Chiều cao nhãn trên từng địa điểm */
const LABEL_Y: Record<string, number> = {
  home: 2.9,
  cafe: 2.65,
  theater: 3.0,
  market: 1.8,
  tv: 4.4,
  hotel: 6.3,
  wedding: 2.7,
  beach: 2.6,
};

/* Lớp giao diện Ghibli cho overlay 2D (STYLE_GHIBLI mục 4): khung kem, viền clay, không blur,
   nút tối thiểu 48px. Chỉ đổi giao diện, không đổi handler. */
const BTN_PRIMARY =
  'min-h-[48px] rounded-2xl border-2 border-ghibli-clay bg-gradient-to-b from-[#B9E29C] to-[#9FD68A] px-3 text-sm font-black text-ghibli-ink shadow-[0_3px_0_#6B4E3D] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
const BTN_SUN =
  'min-h-[48px] rounded-2xl border-2 border-ghibli-clay bg-gradient-to-b from-[#FBD27A] to-[#F7C35C] px-3 text-sm font-black text-ghibli-ink shadow-[0_3px_0_#6B4E3D] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
/** Nút nhanh trên bản đồ: biểu tượng kèm nhãn nhỏ bên dưới (điện thoại) hoặc bên cạnh (iPad) */
const BTN_STACK = '!px-1.5 sm:!px-3 flex min-w-[52px] flex-col items-center justify-center gap-0 leading-none sm:flex-row sm:gap-1';
const BTN_STACK_LABEL = 'mt-0.5 whitespace-nowrap text-[10px] font-black sm:mt-0 sm:text-xs';
const BTN_CHIP =
  'min-h-[48px] rounded-2xl border-2 border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-ghibli-ink shadow-[0_3px_0_#6B4E3D] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
const TEXT_SOFT = 'text-ghibli-ink-soft';
const ACCENT_TEXT = 'text-[#9C3F22]';

interface McState extends PasserAgentLike {
  stepsWalked: number;
  lastStepSoundAt: number;
  pendingEnterScene?: string;
  pendingPasserId?: number;
}
interface PasserAgentLike {
  fc: number;
  fr: number;
  path: [number, number][];
  speed: number;
  rotY: number;
  walking: boolean;
}

function repOk(sceneId: string, st: GameState) {
  const sc = SCENES[sceneId];
  if (!sc?.minRep) return true;
  return st.rep && st.rep.n > 0 && st.rep.avg >= sc.minRep;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makePassers(grid: GridData, day: number, avoid: [number, number]): PasserAgent[] {
  const rnd = seeded(day * 7919 + 17);
  const tiles = walkTiles(grid.walkable, new Set(grid.doorToLoc.keys()));
  const out: PasserAgent[] = [];
  const COUNT = 10;
  let guard = 0;
  while (out.length < COUNT && guard++ < 2000) {
    const [c, r] = tiles[Math.floor(rnd() * tiles.length)];
    if (Math.hypot(c - avoid[0], r - avoid[1]) < 3) continue;
    if (out.some((p) => Math.hypot(c - p.fc, r - p.fr) < 4.5)) continue;
    const i = out.length;
    out.push({
      id: i,
      name: WM_NAMES[i % WM_NAMES.length],
      lookIdx: i % PASSER_LOOKS.length,
      fc: c,
      fr: r,
      path: [],
      speed: 1.1 + rnd() * 0.45,
      rotY: rnd() * Math.PI * 2,
      walking: false,
      waitTimer: 0.5 + rnd() * 3,
      stuckTimer: 0,
      talkedToday: false,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */

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
  const worldTarget = useGameStore((s) => s.worldTarget);
  const clearWorldTarget = useGameStore((s) => s.clearWorldTarget);

  const grid = useMemo(() => buildCityGrid(), []);
  const periodMeta = getPeriodMeta(state.clock);
  const night = periodMeta.isNight;
  const playerLook = useMemo(() => getPlayerLook(state.items), [state.items]);
  // Bầu trời: Ghibli theo buổi (ngày xanh nhạt, hoàng hôn, đêm xanh tím); neon giữ màu cũ
  const sky = ghibliSky(periodMeta.id) ?? { top: periodMeta.skyTop, bottom: periodMeta.skyBottom, fog: periodMeta.skyBottom };
  const initialDoor = WORLD_LOCS[state.loc]?.doorTile || WORLD_LOCS.home.doorTile;

  const mcRef = useRef<McState>({
    fc: initialDoor[0],
    fr: initialDoor[1],
    path: [],
    speed: 3.6,
    rotY: 0,
    walking: false,
    stepsWalked: 0,
    lastStepSoundAt: 0,
  });

  const [mcTile, setMcTile] = useState<[number, number]>([initialDoor[0], initialDoor[1]]);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);
  const [activeDoorLocId, setActiveDoorLocId] = useState<string | null>(state.loc);
  const [floatingMinutes, setFloatingMinutes] = useState<number | null>(null);
  // Độ phân giải tự hạ khi máy không kịp 60 khung/giây
  const [dpr, setDpr] = useState(2);
  const [showMap, setShowMap] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  const [followOn, setFollowOn] = useState(true);
  const followRef = useRef(true);
  const controlsRef = useRef<any>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const setFollow = (on: boolean) => {
    followRef.current = on;
    setFollowOn(on);
  };

  const passersRef = useRef<PasserAgent[]>([]);
  const [passerGen, setPasserGen] = useState(0);
  useEffect(() => {
    passersRef.current = makePassers(grid, state.day, [mcRef.current.fc, mcRef.current.fr]);
    setPasserGen((g) => g + 1);
  }, [grid, state.day]);
  const carsRef = useRef<CarAgent[]>(makeCars());

  const commandWalkTo = (targetTile: [number, number], opts?: { enterSceneId?: string; passerId?: number }) => {
    const m = mcRef.current;
    const startTile: [number, number] = m.walking && m.path.length > 0 ? m.path[0] : [Math.round(m.fc), Math.round(m.fr)];
    const newPath = findPath(grid, startTile, targetTile);

    if (newPath.length === 0 && Math.hypot(m.fc - targetTile[0], m.fr - targetTile[1]) < 0.25) {
      const doorLoc = grid.doorToLoc.get(`${Math.round(targetTile[0])},${Math.round(targetTile[1])}`);
      if (doorLoc) {
        setLocation(doorLoc);
        setActiveDoorLocId(doorLoc);
        if (opts?.enterSceneId && !blockReason(opts.enterSceneId, useGameStore.getState().state)) {
          startScene(opts.enterSceneId, 'world');
        }
      }
      if (opts?.passerId !== undefined) triggerPasserConversation(opts.passerId);
      return;
    }

    const fullPath = m.walking && m.path.length > 0 ? [m.path[0], ...newPath] : newPath;
    m.path = fullPath;
    m.speed = Math.max(3.4, fullPath.length / 5);
    if (!m.walking) m.stepsWalked = 0;
    m.walking = fullPath.length > 0;
    m.pendingEnterScene = opts?.enterSceneId;
    m.pendingPasserId = opts?.passerId;
    setActiveDoorLocId(null);
    if (fullPath.length > 0) setWaypoint(fullPath[fullPath.length - 1]);
    setFollow(true);
  };

  useEffect(() => {
    if (worldTarget) {
      const loc = WORLD_LOCS[worldTarget.locId];
      if (loc) commandWalkTo(loc.doorTile, { enterSceneId: worldTarget.enterSceneId });
      clearWorldTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (bLoc && WORLD_LOCS[bLoc]) {
      handleSelectBuilding(bLoc);
      return;
    }
    commandWalkTo([c, r]);
  };

  const handleSelectPasser = (passer: PasserAgent) => {
    SFX.play('tap');
    passer.path = [];
    passer.walking = false;
    passer.waitTimer = 8;
    const pc = Math.round(passer.fc);
    const pr = Math.round(passer.fr);
    let adj: [number, number] = [pc, pr];
    let bestD = Infinity;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = pc + dc;
      const nr = pr + dr;
      if (nc >= 0 && nc < GRID && nr >= 0 && nr < GRID && grid.walkable[nr][nc]) {
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
    // Quay mặt vào nhau
    const m = mcRef.current;
    m.rotY = Math.atan2(passer.fc - m.fc, passer.fr - m.fr);
    passer.rotY = Math.atan2(m.fc - passer.fc, m.fr - passer.fr);

    if (passer.talkedToday) {
      SFX.play('chat');
      toast(`💬 ${passer.name}: "Have a lovely day, MC Thiên Ân!"`, 'info');
      return;
    }
    const curPeriod = getPeriod(useGameStore.getState().state.clock);
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
    const playerLv = useGameStore.getState().state.charisma.lv;
    // Chỉ lấy tình huống thuộc tầng đã mở theo cấp Charisma (A2 -> B1 -> B2)
    const unlocked = STREET_TALK.filter((it) => isStreetTalkUnlocked(it.level, playerLv));
    // Chọn ngẫu nhiên trong các tình huống phù hợp (đúng địa điểm, đúng buổi, chưa làm hôm nay)
    const pickRandom = (list: typeof STREET_TALK) => list[Math.floor(Math.random() * list.length)];
    const unused = unlocked.filter((it) => !used[it.id]);
    const matchLoc = unused.filter((it) => it.loc === closestLoc && it.when.includes(curPeriod));
    const matchGen = unused.filter((it) => it.loc === null && it.when.includes(curPeriod));
    const chosen =
      (matchLoc.length ? pickRandom(matchLoc) : null) ||
      (matchGen.length ? pickRandom(matchGen) : null) ||
      (unused.length ? pickRandom(unused) : null) ||
      (unlocked.length ? unlocked[0] : null) ||
      STREET_TALK[0];
    passer.talkedToday = true;
    openStreetTalk(passer.name, passer.lookIdx, chosen);
  };

  const onArrive = (tile: [number, number], steps: number, enterSceneId?: string, passerId?: number) => {
    if (steps > 0) {
      const mins = travelMinutes(steps);
      advanceClock(mins);
      setFloatingMinutes(mins);
      window.setTimeout(() => setFloatingMinutes(null), 1400);
    }
    const doorLoc = grid.doorToLoc.get(`${tile[0]},${tile[1]}`);
    if (doorLoc) {
      setLocation(doorLoc);
      setActiveDoorLocId(doorLoc);
      if (enterSceneId && !blockReason(enterSceneId, useGameStore.getState().state)) startScene(enterSceneId, 'world');
    }
    if (passerId !== undefined) triggerPasserConversation(passerId);
  };

  const district = useMemo(() => {
    const [c, r] = mcTile;
    if (r >= 19) return DISTRICTS[2];
    return c >= 13 ? DISTRICTS[1] : DISTRICTS[0];
  }, [mcTile]);

  const locationBannerText = useMemo(() => {
    const atDoorId = grid.doorToLoc.get(`${mcTile[0]},${mcTile[1]}`);
    if (atDoorId && WORLD_LOCS[atDoorId]) return `Trước cửa ${WORLD_LOCS[atDoorId].name}`;
    let best = WORLD_LOCS.home;
    let bestDist = Infinity;
    for (const loc of Object.values(WORLD_LOCS)) {
      const d = Math.hypot(loc.doorTile[0] - mcTile[0], loc.doorTile[1] - mcTile[1]);
      if (d < bestDist) {
        bestDist = d;
        best = loc;
      }
    }
    return bestDist <= 3 ? `Gần ${best.name}` : `Trên phố · gần ${best.name}`;
  }, [mcTile, grid]);

  const nextShowInfo = useMemo(() => {
    const ids = [...GIG_ORDER].sort((a, b) => (SCHEDULE[a]?.start ?? 0) - (SCHEDULE[b]?.start ?? 0));
    for (const id of ids) {
      const sc = SCENES[id];
      if (state.charisma.lv < sc.reqLv || !repOk(id, state)) continue;
      const st = sceneStatus(id, state.clock, state.doneToday);
      if (st.state === 'open' || st.state === 'late' || st.state === 'early') {
        const locEntry = Object.values(WORLD_LOCS).find((l) => l.scenes.includes(id));
        return { scene: sc, status: st, locId: locEntry?.id || 'theater', startMin: SCHEDULE[id]?.start || 900 };
      }
    }
    return null;
  }, [state]);

  const activeShowAt = (locId: string) =>
    WORLD_LOCS[locId].scenes.some((sId) => {
      const st = sceneStatus(sId, state.clock, state.doneToday);
      return (st.state === 'open' || st.state === 'late') && !blockReason(sId, state);
    });

  const lockedAt = (locId: string) =>
    WORLD_LOCS[locId].scenes.length > 0 &&
    WORLD_LOCS[locId].scenes.every((sId) => state.charisma.lv < SCENES[sId].reqLv || !repOk(sId, state));

  const topOffset = 'calc(max(0.5rem, env(safe-area-inset-top)) + 74px)';

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${isGhibli ? 'bg-[#BFE3F2]' : 'bg-[#0E0725]'}`}
      onPointerDown={(e) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const s = dragStartRef.current;
        if (s && followRef.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 9) setFollow(false);
      }}
      onPointerUp={() => (dragStartRef.current = null)}
      onPointerCancel={() => (dragStartRef.current = null)}
      onPointerLeave={() => (dragStartRef.current = null)}
    >
      <Canvas
        shadows="soft"
        dpr={Math.min(dpr, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 20, 20], fov: 32, near: 0.5, far: 160 }}
      >
        <CitySim
          grid={grid}
          mcRef={mcRef}
          passersRef={passersRef}
          carsRef={carsRef}
          onMcTile={(t) => setMcTile(t)}
          onArrive={(tile, steps, sceneId, passerId) => {
            setWaypoint(null);
            onArrive(tile, steps, sceneId, passerId);
          }}
        />

        <QaExpose />
        <PerformanceMonitor
          bounds={() => [45, 58]}
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1.5, d - 0.4))}
          onIncline={() => setDpr((d) => Math.min(2, d + 0.2))}
          onFallback={() => setDpr(1.5)}
        />
        <SkyDome top={sky.top} bottom={sky.bottom} />
        <fog attach="fog" args={[sky.fog, isGhibli ? 48 : 38, isGhibli ? 120 : 95]} />
        {isGhibli && <GhibliClouds night={night} />}
        <SceneLights meta={periodMeta} controlsRef={controlsRef} />
        <Environment resolution={64} frames={1} environmentIntensity={isGhibli ? (night ? 0.15 : 0.3) : night ? 0.3 : 0.6}>
          <Lightformer form="rect" intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#FFFFFF" />
          <Lightformer form="rect" intensity={1.4} position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} color={isGhibli ? '#FFE7B0' : '#FF4FD8'} />
          <Lightformer form="rect" intensity={1.4} position={[10, 3, 0]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color={isGhibli ? '#CFEFFF' : '#22D3EE'} />
          <Lightformer form="rect" intensity={1} position={[0, 3, 10]} scale={[10, 4, 1]} color="#FDE68A" />
        </Environment>

        <CityGround grid={grid} night={night} onTile={handleSelectTile} />
        {isGhibli && <GrassTufts grid={grid} />}
        {Object.values(WORLD_LOCS).map((loc) => (
          <Landmark key={loc.id} loc={loc} night={night} onSelect={handleSelectBuilding} />
        ))}
        {FILLERS.map((f, i) => (
          <FillerBuilding key={i} f={f} idx={i} night={night} />
        ))}
        <CityProps props={grid.props} night={night} />

        <group key={passerGen}>
          {passersRef.current.map((p) => (
            <Walker
              key={p.id}
              agent={{ current: p }}
              look={PASSER_LOOKS[p.lookIdx]}
              scale={0.5}
              bubble={() => !p.talkedToday}
              onClick={(e: any) => {
                e.stopPropagation();
                handleSelectPasser(p);
              }}
            />
          ))}
        </group>
        {carsRef.current.map((car) => (
          <Car key={car.id} car={car} night={night} />
        ))}
        <Walker agent={mcRef} look={playerLook} scale={0.58} highlight />

        {waypoint && <WaypointMarker tile={waypoint} />}
        {floatingMinutes !== null && <FloatingMinutes mcRef={mcRef} minutes={floatingMinutes} />}

        {Object.values(WORLD_LOCS).map((loc) => {
          const n = loc.size ?? 3;
          const [x, z] = gridToWorld(loc.at[0] + (n - 1) / 2, loc.at[1] + (n - 1) / 2);
          const hot = activeShowAt(loc.id);
          const locked = lockedAt(loc.id);
          return (
            <Html key={loc.id} position={[x, LABEL_Y[loc.id] ?? 3, z]} center zIndexRange={[12, 0]}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBuilding(loc.id);
                }}
                className="flex min-h-[48px] min-w-[48px] items-center justify-center px-1 py-1 transition active:scale-95"
              >
                <span
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-xs font-extrabold shadow-[0_2px_0_#6B4E3D] ${
                    hot ? 'border-ghibli-clay bg-[#FBD27A] text-ghibli-ink' : 'border-ghibli-clay bg-ghibli-cream text-ghibli-ink'
                  }`}
                >
                  <span>{loc.icon}</span>
                  <span>{loc.name}</span>
                  {locked && <span>🔒</span>}
                  {hot && <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ghibli-coral text-xs font-black text-white">!</span>}
                </span>
              </button>
            </Html>
          );
        })}

        <CameraRig controlsRef={controlsRef} followRef={followRef} mcRef={mcRef} />
        <MapControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.09}
          enableRotate
          enableZoom
          minDistance={8}
          maxDistance={44}
          maxPolarAngle={Math.PI / 2.6}
          minPolarAngle={Math.PI / 6}
          screenSpacePanning={false}
        />

        {isGhibli ? (
          <EffectComposer multisampling={dpr >= 1.6 ? 4 : 2}>
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
            <HueSaturation saturation={0.14} hue={0} />
            <BrightnessContrast brightness={0.01} contrast={0.02} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={dpr >= 1.6 ? 4 : 2}>
            <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={night ? 0.5 : 0.2} radius={0.5} />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
            <Vignette eskil={false} offset={0.3} darkness={night ? 0.3 : 0.12} />
          </EffectComposer>
        )}
      </Canvas>

      {/* Thanh trên: đồng hồ, khu phố, nút nhanh */}
      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-start justify-between gap-2 px-3 sm:px-6" style={{ top: topOffset }}>
        <div className="ghibli-panel pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-1.5">
          <span className="text-lg">{periodMeta.icon}</span>
          <div className="min-w-0">
            <div className="font-display text-sm font-black leading-snug text-ghibli-ink">
              {fmtTime(state.clock)} · {periodMeta.label}
              <span className={TEXT_SOFT}> · Ngày {state.day}</span>
            </div>
            <div className={`line-clamp-2 text-xs font-semibold leading-tight ${ACCENT_TEXT}`}>
              {district.icon} {district.name} · {locationBannerText}
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
          <div className="flex gap-1">
            <button onClick={() => handleSelectBuilding('home')} className={`${BTN_CHIP} ${BTN_STACK}`}>
              <span>🏠</span>
              <span className={BTN_STACK_LABEL}>Về nhà</span>
            </button>
            <button onClick={() => goTo('hub')} className={`${BTN_CHIP} ${BTN_STACK}`}>
              <span>🎙️</span>
              <span className={BTN_STACK_LABEL}>Phòng MC</span>
            </button>
            <button
              onClick={() => setShowMap((v) => !v)}
              aria-label="Bản đồ nhỏ"
              className={`${showMap ? BTN_SUN : BTN_CHIP} ${BTN_STACK}`}
            >
              <span>🗺️</span>
              <span className={BTN_STACK_LABEL}>Bản đồ</span>
            </button>
          </div>
          {showMap && <MiniMap grid={grid} mc={mcTile} onPick={handleSelectBuilding} hotAt={activeShowAt} />}
        </div>
      </div>

      {!followOn && (
        <button
          onClick={() => setFollow(true)}
          aria-label="Định tâm về MC"
          className="ghibli-panel pointer-events-auto absolute right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-2xl transition active:scale-95"
          style={{ bottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 60px)' }}
        >
          🎯
        </button>
      )}

      {/* Đáy màn hình: thẻ cửa địa điểm + show kế tiếp, xếp chồng không đè nhau */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-3 sm:items-end sm:px-6"
        style={{ paddingBottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 48px)' }}
      >
        {activeDoorLocId && WORLD_LOCS[activeDoorLocId] && (
          <DoorCard
            locId={activeDoorLocId}
            state={state}
            onClose={() => setActiveDoorLocId(null)}
            onEnterHub={() => goTo('hub')}
            onSleep={() => sleepDay({ forced: false })}
            onWait={(m) => waitUntilMinute(m)}
            onStart={(id) => startScene(id, 'world')}
          />
        )}
        {nextShowInfo ? (
          <button
            onClick={() => handleSelectBuilding(nextShowInfo.locId)}
            className="ghibli-panel pointer-events-auto flex min-h-[48px] w-full max-w-md items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm font-extrabold text-ghibli-ink transition active:scale-[0.98]"
          >
            <span className="text-lg">{nextShowInfo.scene.icon}</span>
            <div className="min-w-0 flex-1">
              <div className={`text-xs uppercase tracking-wider ${ACCENT_TEXT}`}>Show kế tiếp · {fmtTime(nextShowInfo.startMin)}</div>
              <div className="line-clamp-2 font-display text-sm font-black leading-tight text-ghibli-ink">
                {nextShowInfo.scene.title} · {nextShowInfo.status.label}
              </div>
            </div>
            <span className="rounded-full border-2 border-ghibli-clay bg-[#FBD27A] px-2.5 py-1 text-xs font-black text-ghibli-ink">Đi tới ➔</span>
          </button>
        ) : (
          <div className={`ghibli-panel pointer-events-auto w-full max-w-md rounded-2xl px-4 py-2 text-center text-sm font-bold ${TEXT_SOFT}`}>
            🌙 Hết show phù hợp hôm nay — luyện cà phê/siêu thị, trò chuyện người đi đường hoặc về nhà nghỉ.
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Thẻ cửa địa điểm                                                     */
/* ------------------------------------------------------------------ */

const DoorCard: React.FC<{
  locId: string;
  state: GameState;
  onClose: () => void;
  onEnterHub: () => void;
  onSleep: () => void;
  onWait: (m: number) => void;
  onStart: (sceneId: string) => void;
}> = ({ locId, state, onClose, onEnterHub, onSleep, onWait, onStart }) => {
  const loc = WORLD_LOCS[locId];
  return (
    <div className="ghibli-panel pointer-events-auto w-full max-w-md rounded-3xl p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ghibli-track text-2xl">{loc.icon}</span>
          <div>
            <h3 className="font-display text-base font-black text-ghibli-ink">{loc.name}</h3>
            <p className={`text-xs ${TEXT_SOFT}`}>Đang đứng trước cửa</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ghibli-clay bg-ghibli-cream text-base font-bold text-ghibli-ink transition active:scale-95"
        >
          ✕
        </button>
      </div>

      {locId === 'home' ? (
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onEnterHub} className={BTN_PRIMARY}>
            🚪 Vào Phòng MC
          </button>
          <button disabled={state.clock < 1080 && state.energy >= 30} onClick={onSleep} className={BTN_SUN}>
            🛌 Đi Ngủ (18:00+)
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {loc.scenes.map((sceneId) => {
            const sc = SCENES[sceneId];
            const st = sceneStatus(sceneId, state.clock, state.doneToday);
            const reason = blockReason(sceneId, state);
            const waitMin = getWaitTargetMinute(sceneId, state.clock);
            return (
              <div key={sceneId} className="rounded-2xl border-2 border-ghibli-clay/40 bg-ghibli-track/50 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{sc.icon}</span>
                      <span className="truncate font-display text-sm font-extrabold text-ghibli-ink">{sc.title}</span>
                    </div>
                    <div className={`mt-0.5 text-xs font-semibold ${ACCENT_TEXT}`}>{st.label}</div>
                  </div>
                  <span className="shrink-0 rounded-full border-2 border-ghibli-clay bg-ghibli-cream px-2 py-0.5 text-xs font-bold text-ghibli-ink">
                    Lv.{sc.reqLv}
                    {sc.minRep ? ` · ⭐${sc.minRep.toFixed(1)}` : ''}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 font-bold text-ghibli-ink">
                    {sc.reward.cash ? <span className="text-[#8A5A00]">+${sc.reward.cash}</span> : null}
                    {sc.reward.energy ? <span className="text-[#3F7A2E]">+{sc.reward.energy} ⚡</span> : null}
                    <span className="text-[#5B3F8C]">+{sc.reward.charisma} Cha</span>
                    {sc.energy > 0 && <span className="text-[#A4472A]">−{sc.energy} ⚡</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {waitMin !== null && (st.state === 'early' || st.state === 'closed') && (
                      <button onClick={() => onWait(waitMin)} className={BTN_SUN}>
                        ⏩ {fmtTime(waitMin)}
                      </button>
                    )}
                    <button disabled={Boolean(reason)} onClick={() => onStart(sceneId)} className={BTN_PRIMARY}>
                      {st.state === 'done' ? 'Đã dẫn ✓' : '🎙️ Vào'}
                    </button>
                  </div>
                </div>
                {reason && <p className="mt-1.5 text-xs font-semibold text-[#A4472A]">⚠️ {reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Bản đồ nhỏ                                                           */
/* ------------------------------------------------------------------ */

const MINI_COLORS: Record<string, string> = isGhibli
  ? {
      grass: '#A8D98A',
      park: '#B3DD92',
      walk: '#F3E7CF',
      plaza: '#EBDAB8',
      sand: '#F5E4B8',
      water: '#8FD3E8',
      'road-x': '#8E8576',
      'road-y': '#8E8576',
      cross: '#8E8576',
    }
  : {
      grass: '#3E9B4C',
      park: '#55B863',
      walk: '#A8A29E',
      plaza: '#D6C7AE',
      sand: '#F2D48F',
      water: '#1E88C8',
      'road-x': '#2B2F3A',
      'road-y': '#2B2F3A',
      cross: '#2B2F3A',
    };

const MiniMap: React.FC<{ grid: GridData; mc: [number, number]; onPick: (id: string) => void; hotAt: (id: string) => boolean }> = ({
  grid,
  mc,
  onPick,
  hotAt,
}) => {
  const tiles = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        const b = grid.buildingAtTile.get(`${c},${r}`);
        const fill = b ? (b === 'filler' ? (isGhibli ? '#C9B8A6' : '#6B5B95') : WORLD_LOCS[b]?.color || '#888') : MINI_COLORS[grid.tiles[r][c]];
        out.push(<rect key={`${c},${r}`} x={c} y={r} width={1.02} height={1.02} fill={fill} />);
      }
    return out;
  }, [grid]);
  return (
    <div className="ghibli-panel overflow-hidden rounded-2xl p-1.5">
      <svg viewBox={`0 0 ${GRID} ${GRID}`} className="h-32 w-32 sm:h-36 sm:w-36" style={{ transform: 'rotate(45deg) scale(0.72)' }}>
        {tiles}
        {Object.values(WORLD_LOCS).map((loc) => (
          <g key={loc.id} onClick={() => onPick(loc.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={loc.at[0] + 1.5}
              cy={loc.at[1] + 1.5}
              r={hotAt(loc.id) ? 2.1 : 1.6}
              fill={hotAt(loc.id) ? '#E0643E' : '#FFF8EC'}
              stroke="#6B4E3D"
              strokeWidth={0.3}
            />
            <text x={loc.at[0] + 1.5} y={loc.at[1] + 1.5} fontSize={1.9} textAnchor="middle" dominantBaseline="central" transform={`rotate(-45 ${loc.at[0] + 1.5} ${loc.at[1] + 1.5})`}>
              {loc.icon}
            </text>
          </g>
        ))}
        <circle cx={mc[0] + 0.5} cy={mc[1] + 0.5} r={1.1} fill={isGhibli ? '#3E9B94' : '#22D3EE'} stroke="#fff" strokeWidth={0.35}>
          <animate attributeName="r" values="0.9;1.4;0.9" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Thành phần trong Canvas                                              */
/* ------------------------------------------------------------------ */

const SkyDome: React.FC<{ top: string; bottom: string }> = ({ top, bottom }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = smoothstep(-0.04, 0.42, vP.y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    mat.uniforms.top.value.set(top);
    mat.uniforms.bottom.value.set(bottom);
  }, [top, bottom, mat]);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[120, 32, 16]} />
    </mesh>
  );
};

const QaExpose: React.FC = () => {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if ((window as any).__mc) (window as any).__three = { get };
  }, [get]);
  return null;
};

const SceneLights: React.FC<{ meta: ReturnType<typeof getPeriodMeta>; controlsRef: React.MutableRefObject<any> }> = ({ meta, controlsRef }) => {
  const sun = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    if (sun.current) scene.add(sun.current.target);
  }, [scene]);
  useFrame(() => {
    const c = controlsRef.current;
    const l = sun.current;
    if (!c || !l) return;
    const t = c.target as THREE.Vector3;
    l.position.set(t.x + 11, 13, t.z + 6);
    l.target.position.set(t.x, 0, t.z);
  });
  const night = meta.isNight;
  return (
    <>
      {isGhibli ? (
        // Ghibli: nắng ấm vàng kem, bóng mát tông xanh nhạt; chiều tối ấm hơn; đêm xanh tím
        <hemisphereLight
          args={
            night
              ? [GHIBLI_NIGHT_LIGHT.hemiSky, GHIBLI_NIGHT_LIGHT.hemiGround, 0.38]
              : meta.id === 'evening'
              ? ['#B9A6D6', '#B8806A', 0.7]
              : [GHIBLI.hemiSky, GHIBLI.hemiGround, 0.95]
          }
        />
      ) : (
        <hemisphereLight args={[night ? '#3B3F8F' : meta.skyTop, night ? '#120A30' : '#6B5040', night ? 0.38 : 0.55]} />
      )}
      <ambientLight intensity={meta.ambientIntensity * (night ? 0.2 : isGhibli ? 0.25 : 0.35)} />
      <directionalLight
        ref={sun}
        intensity={meta.sunIntensity * (night ? 0.9 : isGhibli ? 1.6 : 1.45)}
        color={isGhibli && !night && meta.id !== 'evening' ? GHIBLI.sun : meta.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />
    </>
  );
};

const FOLLOW_DEAD_ZONE = 1.3;
const FOLLOW_SMOOTH = 6;
const HALF = GRID / 2;

const CameraRig: React.FC<{
  controlsRef: React.MutableRefObject<any>;
  followRef: React.MutableRefObject<boolean>;
  mcRef: React.MutableRefObject<McState>;
}> = ({ controlsRef, followRef, mcRef }) => {
  const { camera, size } = useThree();
  const placed = useRef(false);
  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const [mx, mz] = gridToWorld(mcRef.current.fc, mcRef.current.fr);
    if (!placed.current) {
      // Khoảng cách ban đầu theo tỉ lệ màn hình: điện thoại dọc lùi xa hơn để thấy rộng
      const aspect = size.width / Math.max(1, size.height);
      const dist = clamp(10 / (0.57 * aspect), 19, 36);
      const dir = new THREE.Vector3(1, 1.25, 1).normalize();
      controls.target.set(mx, 0, mz);
      camera.position.set(mx + dir.x * dist, dir.y * dist, mz + dir.z * dist);
      controls.update();
      placed.current = true;
    }
    if (followRef.current) {
      const dx = mx - controls.target.x;
      const dz = mz - controls.target.z;
      const dist = Math.hypot(dx, dz);
      if (dist > FOLLOW_DEAD_ZONE) {
        const k = 1 - Math.exp(-FOLLOW_SMOOTH * Math.min(dt, 0.05));
        const step = (dist - FOLLOW_DEAD_ZONE) * k;
        const ux = dx / dist;
        const uz = dz / dist;
        controls.target.x += ux * step;
        controls.target.z += uz * step;
        camera.position.x += ux * step;
        camera.position.z += uz * step;
      }
    }
    // Không cho kéo camera ra khỏi sa bàn
    const tx = clamp(controls.target.x, -HALF, HALF);
    const tz = clamp(controls.target.z, -HALF, HALF + 2);
    if (tx !== controls.target.x || tz !== controls.target.z) {
      camera.position.x += tx - controls.target.x;
      camera.position.z += tz - controls.target.z;
      controls.target.x = tx;
      controls.target.z = tz;
    }
  });
  return null;
};

const WaypointMarker: React.FC<{ tile: [number, number] }> = ({ tile }) => {
  const ref = useRef<THREE.Group>(null);
  const [x, z] = gridToWorld(tile[0], tile[1]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.12;
    ref.current.scale.set(s, 1, s);
  });
  return (
    <group ref={ref} position={[x, 0.09, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.34, 32]} />
        <meshBasicMaterial color={isGhibli ? '#E0643E' : '#FF4FD8'} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.22, 12]} />
        <meshStandardMaterial color={isGhibli ? '#E0643E' : '#FF4FD8'} emissive={isGhibli ? '#E0643E' : '#FF4FD8'} emissiveIntensity={isGhibli ? 0.5 : 1.4} />
      </mesh>
    </group>
  );
};

const FloatingMinutes: React.FC<{ mcRef: React.MutableRefObject<McState>; minutes: number }> = ({ mcRef, minutes }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const [x, z] = gridToWorld(mcRef.current.fc, mcRef.current.fr);
    ref.current.position.set(x, 1.25, z);
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[14, 0]}>
        <div className="whitespace-nowrap rounded-full border-2 border-ghibli-clay bg-[#FBD27A] px-2.5 py-0.5 text-xs font-black text-ghibli-ink shadow-[0_2px_0_#6B4E3D]">+{minutes}′ 🕒</div>
      </Html>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Vòng mô phỏng: MC, người đi đường, xe                                */
/* ------------------------------------------------------------------ */

const CitySim: React.FC<{
  grid: GridData;
  mcRef: React.MutableRefObject<McState>;
  passersRef: React.MutableRefObject<PasserAgent[]>;
  carsRef: React.MutableRefObject<CarAgent[]>;
  onMcTile: (t: [number, number]) => void;
  onArrive: (tile: [number, number], steps: number, enterSceneId?: string, passerId?: number) => void;
}> = ({ grid, mcRef, passersRef, carsRef, onMcTile, onArrive }) => {
  const lastTile = useRef('');
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mcRef.current;

    if (m.walking && m.path.length > 0) {
      const [tc, tr] = m.path[0];
      const dx = tc - m.fc;
      const dy = tr - m.fr;
      const dist = Math.hypot(dx, dy);
      const stepDist = m.speed * dt;
      if (dist > 0.001) m.rotY = Math.atan2(dx, dy);
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
          const steps = m.stepsWalked;
          const sceneId = m.pendingEnterScene;
          const passerId = m.pendingPasserId;
          m.stepsWalked = 0;
          m.pendingEnterScene = undefined;
          m.pendingPasserId = undefined;
          onArrive([Math.round(m.fc), Math.round(m.fr)], steps, sceneId, passerId);
        }
      } else {
        m.fc += (dx / dist) * stepDist;
        m.fr += (dy / dist) * stepDist;
      }
    }
    const tk = `${Math.round(m.fc)},${Math.round(m.fr)}`;
    if (tk !== lastTile.current) {
      lastTile.current = tk;
      onMcTile([Math.round(m.fc), Math.round(m.fr)]);
    }

    // Người đi đường
    const passers = passersRef.current;
    for (const p of passers) {
      if (p.path.length === 0) {
        p.walking = false;
        p.waitTimer -= dt;
        if (p.waitTimer <= 0) {
          for (let attempt = 0; attempt < 5; attempt++) {
            const tc = clamp(Math.round(p.fc + (Math.random() * 12 - 6)), 0, GRID - 1);
            const tr = clamp(Math.round(p.fr + (Math.random() * 12 - 6)), 0, GRID - 1);
            if (!grid.walkable[tr][tc] || grid.doorToLoc.has(`${tc},${tr}`) || Math.hypot(tc - m.fc, tr - m.fr) < 2) continue;
            const occupied = new Set<string>();
            for (const o of passers) if (o.id !== p.id) occupied.add(`${Math.round(o.fc)},${Math.round(o.fr)}`);
            const path = findPath(grid, [p.fc, p.fr], [tc, tr], occupied);
            if (path.length > 0) {
              p.path = path;
              break;
            }
          }
          p.waitTimer = 1.5 + Math.random() * 3;
        }
      } else {
        const [tc, tr] = p.path[0];
        const blocked =
          Math.hypot(tc - m.fc, tr - m.fr) < 0.9 || passers.some((o) => o.id !== p.id && Math.hypot(tc - o.fc, tr - o.fr) < 0.85);
        if (blocked) {
          p.walking = false;
          p.stuckTimer += dt;
          if (p.stuckTimer > 0.8) {
            p.path = [];
            p.stuckTimer = 0;
            p.waitTimer = 0.6;
          }
        } else {
          p.walking = true;
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

    stepCars(carsRef.current, dt, m);
  });
  return null;
};
