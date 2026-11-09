/**
 * Nhân vật anime chibi (thiết kế gốc).
 * - Mặt: decal vẽ tay (mắt / mày / miệng / má) dán lên đầu, đổi texture theo khẩu hình & cảm xúc.
 * - Tóc: các lọn cong vuốt nhọn gộp 1 lưới theo kiểu tóc + vệt bóng trên đỉnh.
 * - Thân: lathe thon, tô màu mảng (cel / toon) + viền đậm.
 * - lod="low" (bản đồ): bỏ viền & chi tiết nhỏ cho nhẹ máy.
 * - look.vrmUrl: dùng mô hình VRM thật (VRoid Studio) thay cho bản dựng bằng code.
 */
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { LookConfig, NpcMood, VisemeType } from '../types/game';
import { GlbCharacter3D } from './GlbCharacter3D';
import { isGhibli } from './artStyle';
// Thư viện VRM tách gói riêng: chỉ tải khi có nhân vật dùng mô hình VRM
const VrmCharacter3D = React.lazy(() => import('./VrmCharacter3D').then((m) => ({ default: m.VrmCharacter3D })));
import { hairGeometry, halo } from './anime/hair';
import {
  blushTexture,
  browTexture,
  BrowState,
  eyeTexture,
  EyeState,
  mouthTexture,
  MouthState,
  noseTexture,
  tone,
} from './anime/faceTextures';

export interface ClayCharacter3DProps {
  look: LookConfig;
  mood?: NpcMood;
  viseme?: VisemeType;
  isWalking?: boolean;
  isSpeaking?: boolean;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  nameTag?: string;
  highlightRing?: boolean;
  onClick?: (e: any) => void;
  /** 'low' cho nhân vật nhỏ trên bản đồ: bỏ viền & chi tiết */
  lod?: 'high' | 'low';
}

/** Làm mượt mũ: không phụ thuộc FPS, không bao giờ vượt đích */
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/* Dải tô màu mảng (3 tông) cho vật liệu toon */
function ramp(levels: number[]) {
  const data = new Uint8Array(levels.flatMap((v) => [v, v, v, 255]));
  const t = new THREE.DataTexture(data, levels.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
/** Quần áo / đồ vật: 3 mảng sáng-trung-tối rõ ràng */
const RAMP = ramp([135, 200, 255]);
/** Da: bóng rất nhẹ (mặt anime gần như phẳng màu) */
const SKIN_RAMP = ramp([215, 240, 255]);
/** Tóc: 2 mảng + vùng sáng */
const HAIR_RAMP = ramp([150, 215, 255, 255]);

/** Viền nét vẽ: vỏ lộn ngược (mặt sau) phồng ra theo pháp tuyến */
const hullCache = new Map<number, THREE.MeshBasicMaterial>();
function hullMat(thickness: number) {
  const k = Math.round(thickness * 10000);
  let m = hullCache.get(k);
  if (!m) {
    // Ghibli: viền nét nâu ấm thay vì đen (STYLE_GHIBLI mục 7)
    m = new THREE.MeshBasicMaterial({ color: isGhibli ? '#6B4E3D' : '#2B1C24', side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n  transformed += normalize( normal ) * ${thickness.toFixed(4)};`
      );
    };
    m.customProgramCacheKey = () => `hull${k}`;
    hullCache.set(k, m);
  }
  return m;
}
const noRaycast = () => null;

const toon = (color: string, extra: Partial<THREE.MeshToonMaterialParameters> = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...extra });

/* ------------------------------------------------------------------ */
/* Hình khối dùng chung                                                 */
/* ------------------------------------------------------------------ */

function lathe(points: [number, number][], seg = 28) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

const HEAD_R = 0.36;
const HEAD_SCALE: [number, number, number] = [1.0, 0.95, 0.95];

/** Mảnh mặt cầu ôm đầu để dán decal (az: trái/phải, el: lên/xuống, w/h: kích thước góc) */
function facePatch(az: number, el: number, w: number, h: number) {
  return new THREE.SphereGeometry(HEAD_R + 0.003, 16, 12, Math.PI / 2 + az - w / 2, w, Math.PI / 2 - el - h / 2, h);
}

const GEO = {
  head: new THREE.SphereGeometry(HEAD_R, 48, 36),
  ear: new THREE.SphereGeometry(0.06, 16, 12),
  neck: new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16),
  torso: lathe([
    [0.0, -0.21],
    [0.165, -0.21],
    [0.18, -0.13],
    [0.155, 0.0],
    [0.175, 0.12],
    [0.16, 0.19],
    [0.08, 0.235],
    [0.0, 0.24],
  ]),
  skirt: lathe([
    [0.15, 0.12],
    [0.2, 0.0],
    [0.3, -0.22],
    [0.4, -0.5],
    [0.0, -0.5],
  ], 36),
  shortSkirt: lathe([
    [0.155, 0.02],
    [0.22, -0.08],
    [0.27, -0.2],
    [0.0, -0.2],
  ], 32),
  leg: new THREE.CapsuleGeometry(0.058, 0.17, 8, 14),
  arm: new THREE.CapsuleGeometry(0.048, 0.2, 8, 14),
  hand: new THREE.SphereGeometry(0.052, 16, 12),
  lapel: new THREE.BoxGeometry(0.06, 0.2, 0.015),
  shirt: new THREE.CylinderGeometry(0.0, 0.085, 0.2, 3, 1),
  bow: new THREE.ConeGeometry(0.035, 0.06, 4),
  tie: new THREE.ConeGeometry(0.028, 0.17, 4),
  button: new THREE.SphereGeometry(0.012, 8, 6),
  collar: new THREE.TorusGeometry(0.1, 0.022, 8, 24),
  hood: new THREE.TorusGeometry(0.15, 0.055, 10, 24),
  bun: new THREE.SphereGeometry(0.13, 22, 16),
  curl: new THREE.SphereGeometry(0.075, 14, 10),
  beanie: new THREE.SphereGeometry(0.405, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
  beanieRim: new THREE.TorusGeometry(0.385, 0.045, 10, 36),
  pompom: new THREE.SphereGeometry(0.065, 12, 10),
  earring: new THREE.SphereGeometry(0.02, 10, 8),
  ring: new THREE.RingGeometry(0.42, 0.54, 40),
  shadow: new THREE.CircleGeometry(0.36, 28),
  glassRim: new THREE.TorusGeometry(0.07, 0.009, 8, 24),
  // Decal mặt
  eyeR: facePatch(0.38, -0.1, 0.46, 0.535),
  eyeL: facePatch(-0.38, -0.1, 0.46, 0.535),
  browR: facePatch(0.37, 0.29, 0.38, 0.12),
  browL: facePatch(-0.37, 0.29, 0.38, 0.12),
  mouth: facePatch(0, -0.52, 0.22, 0.17),
  blushR: facePatch(0.66, -0.36, 0.34, 0.21),
  blushL: facePatch(-0.66, -0.36, 0.34, 0.21),
  nose: facePatch(0, -0.31, 0.05, 0.05),
};

const decalMat = (map: THREE.Texture) =>
  new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

/* ------------------------------------------------------------------ */

/* Hình tạm (thân capsule + đầu cầu) hiện khi VRM chưa nạp xong hoặc nạp lỗi. Dùng geometry dùng chung, rẻ GPU. */
const PH_BODY_GEO = new THREE.CapsuleGeometry(0.2, 0.55, 4, 8);
const PH_HEAD_GEO = new THREE.SphereGeometry(0.17, 12, 10);
const VrmPlaceholder: React.FC<{ look: LookConfig }> = ({ look }) => (
  <group>
    <mesh geometry={PH_BODY_GEO} position={[0, 0.5, 0]}>
      <meshStandardMaterial color={look.cloth || '#64748B'} roughness={0.6} />
    </mesh>
    <mesh geometry={PH_HEAD_GEO} position={[0, 1.3, 0]}>
      <meshStandardMaterial color={look.skin || '#FCE3D3'} roughness={0.6} />
    </mesh>
  </group>
);

export const ClayCharacter3D: React.FC<ClayCharacter3DProps> = (props) => {
  if (props.look.vrmUrl) {
    const placeholder = <VrmPlaceholder look={props.look} />;
    return (
      <group position={props.position} scale={props.scale ?? 1} onClick={props.onClick}>
        {props.highlightRing && <RingMarker />}
        <Suspense fallback={placeholder}>
          <VrmCharacter3D
            url={props.look.vrmUrl}
            mood={props.mood ?? 'idle'}
            viseme={props.viseme ?? 'rest'}
            isWalking={!!props.isWalking}
            isSpeaking={!!props.isSpeaking}
            rotationY={props.rotationY ?? 0}
            placeholder={placeholder}
          />
        </Suspense>
        {props.nameTag && <NameTag y={1.7} text={props.nameTag} />}
      </group>
    );
  }
  return <AnimeChibi {...props} />;
};

const RingMarker: React.FC = () => (
  <mesh geometry={GEO.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
    <meshBasicMaterial color={isGhibli ? '#F2B84B' : '#22D3EE'} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
);

const AnimeChibi: React.FC<ClayCharacter3DProps> = ({
  look,
  mood = 'idle',
  viseme = 'rest',
  isWalking = false,
  isSpeaking = false,
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  nameTag,
  highlightRing = false,
  onClick,
  lod = 'high',
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const blinkRef = useRef(false);
  const faceState = useRef({ eye: '', brow: '', mouth: '' });

  useEffect(() => {
    let timer: number;
    let mounted = true;
    const blinkOnce = (after?: () => void) => {
      blinkRef.current = true;
      window.setTimeout(() => {
        blinkRef.current = false;
        if (after) window.setTimeout(after, 110);
      }, 120);
    };
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!mounted) return;
        if (Math.random() < 0.85) blinkOnce(Math.random() < 0.2 ? () => mounted && blinkOnce() : undefined);
        schedule();
      }, 1800 + Math.random() * 3400);
    };
    schedule();
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const hi = lod === 'high';
  const lookKey = JSON.stringify(look);
  const M = useMemo(() => {
    const skin = look.skin || '#FCE3D3';
    const hair = look.hair || '#2A1E2F';
    const cloth = look.cloth || '#1E2952';
    const lash = tone(hair, -0.18);
    const iris = look.eye && look.eye !== '#2A1E3F' && look.eye !== '#1E1B4B' ? look.eye : irisFromHair(hair);
    return {
      skin: toon(skin, { gradientMap: SKIN_RAMP }),
      hair: toon(hair, { gradientMap: HAIR_RAMP }),
      hairShine: new THREE.MeshBasicMaterial({ color: tone(hair, 0.28, -0.05), transparent: true, opacity: 0.85 }),
      cloth: toon(cloth),
      clothDark: toon(tone(cloth, -0.08)),
      lapel: toon(tone(cloth, 0.12, -0.05)),
      pants: toon(look.outfit === 'tux' || look.outfit === 'suit' ? tone(cloth, -0.06) : tone(cloth, -0.25)),
      shoe: toon(look.outfit === 'hoodie' || look.outfit === 'crew' ? '#F8FAFC' : '#2A2236'),
      accent: toon(look.accent || '#38BDF8'),
      white: toon('#FBFBFF'),
      gold: new THREE.MeshStandardMaterial({ color: '#F6C453', roughness: 0.25, metalness: 0.85 }),
      silver: new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.25, metalness: 0.8 }),
      hat: toon(look.hat || '#7C3AED'),
      eyeR: decalMat(eyeTexture(iris, lash, 'open', !!look.lashes, false)),
      eyeL: decalMat(eyeTexture(iris, lash, 'open', !!look.lashes, true)),
      browR: decalMat(browTexture(lash, 'neutral', false)),
      browL: decalMat(browTexture(lash, 'neutral', true)),
      mouth: decalMat(mouthTexture('rest', tone(skin, -0.45, 0.2))),
      blush: decalMat(blushTexture()),
      nose: decalMat(noseTexture(skin)),
      iris,
      lash,
      lipLine: tone(skin, -0.45, 0.2),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  useEffect(
    () => () => {
      Object.values(M).forEach((m) => (m as any)?.dispose?.());
    },
    [M]
  );

  const hairGeo = useMemo(() => hairGeometry(look.hairStyle), [look.hairStyle]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const root = rootRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!root || !body || !head) return;

    let diff = rotationY - root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.y += diff * (1 - Math.exp(-10 * dt));

    const la = leftArmRef.current;
    const ra = rightArmRef.current;
    const ll = leftLegRef.current;
    const rl = rightLegRef.current;

    if (isWalking) {
      const w = t * 12;
      body.position.y = Math.abs(Math.sin(w)) * 0.06;
      body.rotation.z = Math.sin(w) * 0.035;
      body.rotation.x = 0.05;
      head.rotation.z = -Math.sin(w) * 0.03;
      head.rotation.x = damp(head.rotation.x, 0.02, 10, dt);
      if (ll && rl) {
        ll.rotation.x = Math.sin(w) * 0.6;
        rl.rotation.x = -Math.sin(w) * 0.6;
      }
      if (la && ra) {
        la.rotation.x = -Math.sin(w) * 0.55;
        la.rotation.z = damp(la.rotation.z, 0.1, 10, dt);
        ra.rotation.x = look.propArt ? -0.5 + Math.sin(w) * 0.12 : Math.sin(w) * 0.55;
        ra.rotation.z = damp(ra.rotation.z, -0.1, 10, dt);
      }
    } else {
      let bodyY = Math.sin(t * 2.2) * 0.01;
      let headZ = Math.sin(t * 1.2) * 0.04;
      let headX = Math.cos(t * 1.7) * 0.025;
      let laZ = 0.14;
      let laX = 0;
      if (mood === 'happy') {
        bodyY = Math.abs(Math.sin(t * 7)) * 0.08;
        headZ = Math.sin(t * 6) * 0.1;
        laZ = 0.9 + Math.sin(t * 10) * 0.25;
        laX = -0.3;
      } else if (mood === 'listening') {
        headZ = 0.2;
        headX = -0.06;
        laZ = 0.4;
        laX = -0.6;
      } else if (mood === 'confused') {
        headZ = -0.2;
        headX = 0.08;
        laZ = 0.3;
        laX = -1.4;
      }
      if (isSpeaking) {
        headX += Math.sin(t * 11) * 0.03;
        headZ += Math.cos(t * 8) * 0.025;
      }
      body.position.y = damp(body.position.y, bodyY, 12, dt);
      body.rotation.z = damp(body.rotation.z, 0, 10, dt);
      body.rotation.x = damp(body.rotation.x, 0, 10, dt);
      head.rotation.z = damp(head.rotation.z, headZ, 9, dt);
      head.rotation.x = damp(head.rotation.x, headX, 9, dt);
      if (ll && rl) {
        ll.rotation.x = damp(ll.rotation.x, 0, 12, dt);
        rl.rotation.x = damp(rl.rotation.x, 0, 12, dt);
      }
      if (la && ra) {
        la.rotation.z = damp(la.rotation.z, laZ, 9, dt);
        la.rotation.x = damp(la.rotation.x, laX, 9, dt);
        const rX = look.propArt ? (isSpeaking ? -0.85 + Math.sin(t * 9) * 0.1 : -0.6) : isSpeaking ? -0.25 + Math.sin(t * 5) * 0.15 : 0;
        ra.rotation.x = damp(ra.rotation.x, rX, 9, dt);
        ra.rotation.z = damp(ra.rotation.z, -0.14, 9, dt);
      }
    }

    // Biểu cảm: đổi texture mắt / mày / miệng khi trạng thái thay đổi
    const eye: EyeState = blinkRef.current ? 'closed' : mood === 'happy' ? 'happy' : mood === 'confused' ? 'wide' : 'open';
    const brow: BrowState = mood === 'confused' ? 'worried' : mood === 'happy' || mood === 'listening' ? 'up' : 'neutral';
    const mouth: MouthState =
      viseme === 'a' || viseme === 'e' || viseme === 'o' || viseme === 'm' ? viseme : mood === 'happy' ? 'smile' : 'rest';
    const fs = faceState.current;
    if (fs.eye !== eye) {
      fs.eye = eye;
      M.eyeR.map = eyeTexture(M.iris, M.lash, eye, !!look.lashes, false);
      M.eyeL.map = eyeTexture(M.iris, M.lash, eye, !!look.lashes, true);
    }
    if (fs.brow !== brow) {
      fs.brow = brow;
      M.browR.map = browTexture(M.lash, brow, false);
      M.browL.map = browTexture(M.lash, brow, true);
    }
    if (fs.mouth !== mouth) {
      fs.mouth = mouth;
      M.mouth.map = mouthTexture(mouth, M.lipLine);
    }
  });

  const isLongDress = look.outfit === 'gown' || look.outfit === 'bride' || look.outfit === 'velvet';
  const isSkirt = look.outfit === 'blouse';
  const acc = look.acc || [];
  const has = (a: string) => acc.includes(a as never);
  const formal = look.outfit === 'tux' || look.outfit === 'suit' || look.outfit === 'jacket';
  // Viền nét vẽ đều tính theo điểm ảnh màn hình (không phụ thuộc khoảng cách camera)
  const Ol = ({ g, t = 0.011 }: { g: THREE.BufferGeometry; t?: number }) =>
    hi ? <mesh geometry={g} material={hullMat(t)} raycast={noRaycast} /> : null;

  return (
    <group ref={rootRef} position={position} scale={scale} onClick={onClick}>
      {highlightRing && <RingMarker />}
      <mesh geometry={GEO.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <meshBasicMaterial color={isGhibli ? '#6B5A4E' : '#090518'} transparent opacity={isGhibli ? 0.2 : 0.3} depthWrite={false} />
      </mesh>

      <group ref={bodyRef}>
        {/* CHÂN + GIÀY */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? leftLegRef : rightLegRef} position={[s * 0.085, 0.3, 0]}>
            <mesh geometry={GEO.leg} material={isLongDress || isSkirt ? M.skin : M.pants} position={[0, -0.12, 0]}>
              <Ol g={GEO.leg} />
            </mesh>
            <RoundedBox args={[0.12, 0.075, 0.19]} radius={0.034} smoothness={3} position={[0, -0.25, 0.03]} material={M.shoe} />
          </group>
        ))}

        {/* THÂN */}
        <group position={[0, 0.64, 0]}>
          <mesh geometry={GEO.torso} material={M.cloth} scale={[1, 1, 0.8]} castShadow>
            <Ol g={GEO.torso} t={0.012} />
          </mesh>
          {isLongDress && (
            <mesh geometry={GEO.skirt} material={M.cloth} position={[0, -0.1, 0]} castShadow>
              <Ol g={GEO.skirt} t={0.012} />
            </mesh>
          )}
          {isSkirt && (
            <mesh geometry={GEO.shortSkirt} material={M.clothDark} position={[0, -0.17, 0]}>
              <Ol g={GEO.shortSkirt} t={0.01} />
            </mesh>
          )}
          {look.outfit === 'bride' && (
            <mesh geometry={GEO.collar} material={M.white} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.6, 1.3, 1]} />
          )}

          {formal && hi && (
            <group position={[0, 0.05, 0.135]}>
              <mesh geometry={GEO.shirt} material={M.white} position={[0, 0.06, -0.004]} rotation={[0, 0, Math.PI]} scale={[1, 1, 0.25]} />
              <mesh geometry={GEO.lapel} material={M.lapel} position={[-0.055, 0.03, 0.006]} rotation={[0.1, 0, -0.34]} />
              <mesh geometry={GEO.lapel} material={M.lapel} position={[0.055, 0.03, 0.006]} rotation={[0.1, 0, 0.34]} />
              {look.outfit === 'tux' ? (
                <group position={[0, 0.14, 0.02]}>
                  <mesh geometry={GEO.bow} material={M.accent} position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
                  <mesh geometry={GEO.bow} material={M.accent} position={[0.03, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
                  <mesh geometry={GEO.button} material={M.accent} scale={1.4} />
                </group>
              ) : (
                <mesh geometry={GEO.tie} material={M.accent} position={[0, 0.04, 0.016]} rotation={[Math.PI, 0, 0]} />
              )}
              {[-0.06, -0.13].map((y) => (
                <mesh key={y} geometry={GEO.button} material={M.gold} position={[0, y, 0.022]} />
              ))}
            </group>
          )}
          {look.outfit === 'apron' && (
            <RoundedBox args={[0.24, 0.34, 0.03]} radius={0.015} smoothness={2} position={[0, -0.05, 0.14]} material={M.accent} />
          )}
          {look.outfit === 'hoodie' && hi && (
            <mesh geometry={GEO.hood} material={M.cloth} position={[0, 0.19, -0.08]} rotation={[1.2, 0, 0]} />
          )}
          {(look.outfit === 'blouse' || look.outfit === 'crew' || look.outfit === 'hoodie') && (
            <mesh geometry={GEO.collar} material={look.outfit === 'blouse' ? M.white : M.accent} position={[0, 0.2, 0.02]} rotation={[Math.PI / 2 - 0.3, 0, 0]} />
          )}
          {has('pearls') && hi && (
            <mesh geometry={GEO.collar} position={[0, 0.18, 0.03]} rotation={[Math.PI / 2 - 0.3, 0, 0]} scale={[1.1, 1.1, 0.8]}>
              <meshStandardMaterial color="#FFFBEB" roughness={0.12} metalness={0.3} />
            </mesh>
          )}
        </group>

        <mesh geometry={GEO.neck} material={M.skin} position={[0, 0.91, 0]} />

        {/* TAY */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? leftArmRef : rightArmRef} position={[s * 0.2, 0.82, 0]}>
            <mesh geometry={GEO.arm} material={M.cloth} position={[s * 0.03, -0.14, 0]}>
              <Ol g={GEO.arm} />
            </mesh>
            <mesh geometry={GEO.hand} material={M.skin} position={[s * 0.04, -0.29, 0]}>
              <Ol g={GEO.hand} t={0.008} />
            </mesh>
            {s > 0 && look.propArt && <HandProp kind={look.propArt} M={M} />}
          </group>
        ))}

        {/* ĐẦU */}
        <group ref={headRef} position={[0, 1.26, 0]}>
          <mesh geometry={GEO.head} material={M.skin} scale={HEAD_SCALE} castShadow>
            <Ol g={GEO.head} t={0.012} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={GEO.ear} material={M.skin} position={[s * 0.35, -0.04, -0.02]} scale={[0.6, 1, 0.9]} />
          ))}
          {has('earrings') && [-1, 1].map((s) => <mesh key={`er${s}`} geometry={GEO.earring} material={M.gold} position={[s * 0.355, -0.11, 0]} />)}
          {has('inear') && (
            <mesh geometry={GEO.earring} position={[0.36, -0.04, 0.03]} scale={1.6}>
              <meshStandardMaterial
                color={isGhibli ? '#3E9B94' : '#22D3EE'}
                emissive={isGhibli ? '#3E9B94' : '#22D3EE'}
                emissiveIntensity={1.4}
              />
            </mesh>
          )}

          {/* Decal khuôn mặt */}
          <group scale={HEAD_SCALE}>
            <mesh geometry={GEO.eyeR} material={M.eyeR} renderOrder={2} />
            <mesh geometry={GEO.eyeL} material={M.eyeL} renderOrder={2} />
            <mesh geometry={GEO.browR} material={M.browR} renderOrder={3} />
            <mesh geometry={GEO.browL} material={M.browL} renderOrder={3} />
            <mesh geometry={GEO.mouth} material={M.mouth} renderOrder={2} />
            <mesh geometry={GEO.blushR} material={M.blush} renderOrder={1} />
            <mesh geometry={GEO.blushL} material={M.blush} renderOrder={1} />
            <mesh geometry={GEO.nose} material={M.nose} renderOrder={2} />
          </group>

          {/* TÓC */}
          {look.hairStyle === 'beanie' ? (
            <group>
              <mesh geometry={hairGeo} material={M.hair}>
                <Ol g={hairGeo} t={0.01} />
              </mesh>
              <mesh geometry={GEO.beanie} material={M.hat} position={[0, 0.1, -0.01]} castShadow>
                <Ol g={GEO.beanie} t={0.012} />
              </mesh>
              <mesh geometry={GEO.beanieRim} material={M.hat} position={[0, 0.11, -0.01]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={GEO.pompom} material={M.white} position={[0, 0.52, -0.02]} />
            </group>
          ) : (
            <group>
              <mesh geometry={hairGeo} material={M.hair} castShadow>
                <Ol g={hairGeo} t={0.01} />
              </mesh>
              {hi && <mesh geometry={halo} material={M.hairShine} position={[0, 0.17, -0.02]} rotation={[Math.PI / 2 - 0.25, 0, Math.PI * 0.95]} />}
              {look.hairStyle === 'updo' && (
                <mesh geometry={GEO.bun} material={M.hair} position={[0, 0.4, -0.16]}>
                  <Ol g={GEO.bun} t={0.01} />
                </mesh>
              )}
              {look.hairStyle === 'curly' &&
                Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  return <mesh key={i} geometry={GEO.curl} material={M.hair} position={[Math.cos(a) * 0.3, 0.2 + (i % 3) * 0.05, Math.sin(a) * 0.26 - 0.05]} />;
                })}
              {look.hairStyle === 'veil' && (
                <group>
                  <mesh position={[0, 0.36, 0.12]} rotation={[-0.25, 0, 0]} material={M.gold}>
                    <torusGeometry args={[0.13, 0.02, 8, 22, Math.PI]} />
                  </mesh>
                  <mesh position={[0, -0.1, -0.3]} rotation={[0.12, 0, 0]}>
                    <coneGeometry args={[0.42, 1.0, 24, 1, true]} />
                    <meshStandardMaterial color="#FFFFFF" transparent opacity={0.45} roughness={0.3} side={THREE.DoubleSide} depthWrite={false} />
                  </mesh>
                </group>
              )}
            </group>
          )}

          {has('glasses') && hi && (
            <group position={[0, -0.04, 0.35]}>
              {[-0.13, 0.13].map((x) => (
                <mesh key={x} geometry={GEO.glassRim} material={M.gold} position={[x, 0, 0]} scale={[1.05, 0.85, 1]} />
              ))}
            </group>
          )}
          {(has('headset') || has('phones')) && (
            <group>
              <mesh position={[0, 0.06, 0]} material={M.silver}>
                <torusGeometry args={[0.405, 0.02, 10, 32, Math.PI]} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.385, -0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={M.accent}>
                  <cylinderGeometry args={[0.075, 0.075, 0.06, 18]} />
                </mesh>
              ))}
            </group>
          )}

          {mood === 'happy' && hi && (
            <Html position={[0, 0.6, 0]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none select-none text-xl">✨</div>
            </Html>
          )}
          {mood === 'confused' && hi && (
            <Html position={[0.3, 0.52, 0]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none select-none text-xl font-bold text-ghibli-ink">❓</div>
            </Html>
          )}
          {nameTag && <NameTag y={0.66} text={nameTag} />}
        </group>
      </group>
    </group>
  );
};

/** Màu mắt hài hoà theo màu tóc khi NPC chưa đặt màu mắt riêng */
function irisFromHair(hair: string) {
  const c = new THREE.Color(hair);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l < 0.18) return '#5B4BB0'; // tóc đen → mắt tím xanh
  c.setHSL(hsl.h, Math.min(1, hsl.s + 0.25), 0.42);
  return `#${c.getHexString()}`;
}

const NameTag: React.FC<{ y: number; text: string }> = ({ y, text }) => (
  <Html position={[0, y, 0]} center zIndexRange={[20, 0]}>
    <div
      className={
        isGhibli
          ? 'pointer-events-none whitespace-nowrap rounded-full border-2 border-ghibli-clay bg-ghibli-cream px-2.5 py-0.5 text-xs font-bold text-ghibli-ink shadow-[0_2px_0_#6B4E3D]'
          : 'pointer-events-none whitespace-nowrap rounded-full border border-white/25 bg-ghibli-cream/95 px-2.5 py-0.5 text-xs font-bold text-ghibli-ink shadow-lg'
      }
    >
      {text}
    </div>
  </Html>
);

type Mats = Record<string, any>;

const HandProp: React.FC<{ kind: NonNullable<LookConfig['propArt']>; M: Mats }> = ({ kind, M }) => (
  <group position={[0.05, -0.31, 0.11]} rotation={[Math.PI / 3, 0, 0]}>
    {(kind === 'mic' || kind === 'goldmic') && (
      <group>
        <mesh material={kind === 'goldmic' ? M.gold : M.silver}>
          <cylinderGeometry args={[0.022, 0.017, 0.21, 14]} />
        </mesh>
        <mesh position={[0, 0.13, 0]} material={kind === 'goldmic' ? M.gold : M.silver}>
          <sphereGeometry args={[0.048, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.09, 0]} material={M.accent}>
          <cylinderGeometry args={[0.026, 0.026, 0.02, 14]} />
        </mesh>
      </group>
    )}
    {kind === 'cup' && (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.055, 0.042, 0.14, 18]} />
          <meshToonMaterial color="#FEF3C7" gradientMap={RAMP} />
        </mesh>
        <mesh position={[0, 0.125, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.025, 18]} />
          <meshToonMaterial color="#78350F" gradientMap={RAMP} />
        </mesh>
      </group>
    )}
    {(kind === 'tablet' || kind === 'clipboard') && (
      <RoundedBox args={[0.17, 0.23, 0.02]} radius={0.01} smoothness={2} position={[0, 0.05, 0]} rotation={[-0.4, 0, 0]}>
        <meshToonMaterial color={kind === 'tablet' ? '#0EA5E9' : '#B45309'} gradientMap={RAMP} />
      </RoundedBox>
    )}
    {kind === 'bouquet' && (
      <group position={[0, 0.07, 0]}>
        {(
          [
            [0, 0, 0, '#F43F5E'],
            [0.05, 0.035, 0.025, '#FDA4AF'],
            [-0.045, 0.03, 0.035, '#FFFFFF'],
            [0.02, 0.05, -0.035, '#FB7185'],
          ] as const
        ).map(([x, y, z, c], i) => (
          <mesh key={i} position={[x, y, z]}>
            <icosahedronGeometry args={[0.06, 1]} />
            <meshToonMaterial color={c} gradientMap={RAMP} />
          </mesh>
        ))}
        <mesh position={[0, -0.09, 0]}>
          <coneGeometry args={[0.05, 0.14, 10]} />
          <meshToonMaterial color="#15803D" gradientMap={RAMP} />
        </mesh>
      </group>
    )}
  </group>
);

export { GlbCharacter3D };
