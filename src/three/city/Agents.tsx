import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { LookConfig } from '../../types/game';
import { ClayCharacter3D } from '../ClayCharacter3D';
import { mat } from './assets';
import { CAR_LANES, GRID, gridToWorld } from './cityMap';

export interface WalkerState {
  fc: number;
  fr: number;
  path: [number, number][];
  speed: number;
  rotY: number;
  walking: boolean;
}

export interface PasserAgent extends WalkerState {
  id: number;
  name: string;
  lookIdx: number;
  waitTimer: number;
  stuckTimer: number;
  talkedToday: boolean;
}

export interface CarAgent {
  id: number;
  lane: number; // chỉ số trong CAR_LANES
  pos: number;
  dir: 1 | -1;
  speed: number;
  color: string;
}

/** Nhân vật đi trên bản đồ: vị trí đọc từ ref mỗi frame, không re-render React */
export const Walker: React.FC<{
  agent: React.MutableRefObject<WalkerState> | { current: WalkerState };
  look: LookConfig;
  scale: number;
  highlight?: boolean;
  onClick?: (e: any) => void;
  bubble?: () => boolean;
}> = ({ agent, look, scale, highlight, onClick, bubble }) => {
  const g = useRef<THREE.Group>(null);
  const bubbleRef = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const [showBubble, setShowBubble] = useState(Boolean(bubble?.()));
  useFrame(({ clock }, dt) => {
    const a = agent.current;
    if (!g.current) return;
    const [x, z] = gridToWorld(a.fc, a.fr);
    g.current.position.set(x, 0.07, z);
    let diff = a.rotY - g.current.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.current.rotation.y += diff * Math.min(1, dt * 12);
    if (a.walking !== walking) setWalking(a.walking);
    if (bubble) {
      const b = bubble();
      if (b !== showBubble) setShowBubble(b);
    }
    if (bubbleRef.current) {
      bubbleRef.current.position.set(x, 1.0 + Math.sin(clock.elapsedTime * 2.4 + a.fc) * 0.04, z);
    }
  });
  return (
    <>
      <group ref={g}>
        <ClayCharacter3D look={look} scale={scale} isWalking={walking} highlightRing={highlight} />
        {onClick && (
          // Vùng chạm rộng hơn thân nhân vật cho dễ bấm trên điện thoại
          <mesh position={[0, 0.45, 0]} onClick={onClick}>
            <cylinderGeometry args={[0.32, 0.32, 0.95, 8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        )}
      </group>
      {showBubble && (
        <group ref={bubbleRef} onClick={onClick}>
          <TalkBubble />
        </group>
      )}
    </>
  );
};

/** Bong bóng thoại 3D nhỏ trên đầu người đi đường (thay cho nhãn HTML) */
const TalkBubble: React.FC = () => (
  <group scale={0.9}>
    <RoundedBox args={[0.34, 0.22, 0.08]} radius={0.06} smoothness={3} material={mat('#FFFFFF', { rough: 0.35, emissive: '#FFFFFF', ei: 0.25 })} />
    <mesh position={[-0.06, -0.13, 0]} rotation={[0, 0, 0.6]} material={mat('#FFFFFF', { rough: 0.35, emissive: '#FFFFFF', ei: 0.25 })}>
      <coneGeometry args={[0.045, 0.1, 4]} />
    </mesh>
    {[-0.09, 0, 0.09].map((x) => (
      <mesh key={x} position={[x, 0, 0.045]} material={mat('#22D3EE', { emissive: '#22D3EE', ei: 0.8 })}>
        <sphereGeometry args={[0.028, 10, 8]} />
      </mesh>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* Xe hơi                                                              */
/* ------------------------------------------------------------------ */

const CarModel: React.FC<{ color: string; night: boolean; kind: number }> = ({ color, night, kind }) => {
  const taxi = kind === 1;
  const van = kind === 2;
  const body = taxi ? '#FBBF24' : color;
  return (
    <group>
      <RoundedBox args={[0.4, 0.16, van ? 0.78 : 0.72]} radius={0.06} smoothness={3} position={[0, 0.14, 0]} castShadow material={mat(body, { rough: 0.3, metal: 0.35 })} />
      <RoundedBox
        args={[0.34, van ? 0.2 : 0.15, van ? 0.56 : 0.38]}
        radius={0.06}
        smoothness={3}
        position={[0, van ? 0.3 : 0.26, van ? -0.06 : -0.04]}
        castShadow
        material={mat(van ? body : '#F1F5F9', { rough: 0.3, metal: 0.2 })}
      />
      {/* Kính */}
      <mesh position={[0, van ? 0.33 : 0.27, van ? 0.23 : 0.155]} rotation={[-0.35, 0, 0]} material={mat('#1E293B', { rough: 0.05, metal: 0.6 })}>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
      </mesh>
      <mesh position={[0, van ? 0.33 : 0.27, van ? -0.35 : -0.24]} rotation={[0.35, 0, 0]} material={mat('#1E293B', { rough: 0.05, metal: 0.6 })}>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
      </mesh>
      {[-0.172, 0.172].map((x) => (
        <mesh key={x} position={[x, van ? 0.33 : 0.27, van ? -0.06 : -0.04]} material={mat('#1E293B', { rough: 0.05, metal: 0.6 })}>
          <boxGeometry args={[0.01, 0.09, van ? 0.45 : 0.3]} />
        </mesh>
      ))}
      {taxi && (
        <mesh position={[0, 0.36, -0.04]} material={mat('#FFFFFF', { emissive: '#FDE68A', ei: night ? 2 : 0.3 })}>
          <boxGeometry args={[0.14, 0.05, 0.08]} />
        </mesh>
      )}
      {/* Bánh xe */}
      {[-0.2, 0.2].flatMap((x) =>
        [-0.22, 0.22].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.07, z]} rotation={[0, 0, Math.PI / 2]} material={mat('#111827', { rough: 0.8 })}>
            <cylinderGeometry args={[0.07, 0.07, 0.06, 14]} />
          </mesh>
        ))
      )}
      {/* Đèn pha & đèn hậu */}
      {[-0.12, 0.12].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.15, (van ? 0.39 : 0.36) + 0.005]} material={mat('#FFFBEB', { emissive: '#FEF3C7', ei: night ? 3 : 0.3 })}>
            <boxGeometry args={[0.08, 0.04, 0.01]} />
          </mesh>
          <mesh position={[x, 0.15, -(van ? 0.39 : 0.36) - 0.005]} material={mat('#EF4444', { emissive: '#EF4444', ei: night ? 2.2 : 0.4 })}>
            <boxGeometry args={[0.08, 0.04, 0.01]} />
          </mesh>
        </group>
      ))}
      {night && (
        <mesh position={[0, 0.02, 0.75]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.34, 0.7]} />
          <meshBasicMaterial color="#FEF3C7" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

export const Car: React.FC<{ car: CarAgent; night: boolean }> = ({ car, night }) => {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const lane = CAR_LANES[car.lane];
    const off = 0.22 * car.dir;
    const [c, r] = lane.axis === 'h' ? [car.pos, lane.lane] : [lane.lane, car.pos];
    const [x, z] = gridToWorld(c, r);
    if (lane.axis === 'h') {
      g.current.position.set(x, 0, z + off);
      g.current.rotation.y = car.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      g.current.position.set(x - off, 0, z);
      g.current.rotation.y = car.dir === 1 ? 0 : Math.PI;
    }
  });
  return (
    <group ref={g}>
      <CarModel color={car.color} night={night} kind={car.id % 3} />
    </group>
  );
};

export function makeCars(): CarAgent[] {
  const colors = ['#EF4444', '#3B82F6', '#F8FAFC', '#10B981', '#8B5CF6', '#EC4899', '#0EA5E9', '#F97316'];
  const cars: CarAgent[] = [];
  CAR_LANES.forEach((lane, li) => {
    for (let k = 0; k < 2; k++) {
      const id = cars.length;
      cars.push({
        id,
        lane: li,
        pos: lane.min + ((k * 0.5 + li * 0.17) % 1) * (lane.max - lane.min),
        dir: k % 2 === 0 ? 1 : -1,
        speed: 1.5 + ((id * 37) % 10) / 12,
        color: colors[id % colors.length],
      });
    }
  });
  return cars;
}

/** Cập nhật xe: chạy vòng theo làn, dừng nhường MC đang băng qua */
export function stepCars(cars: CarAgent[], dt: number, mc: { fc: number; fr: number }) {
  for (const car of cars) {
    const lane = CAR_LANES[car.lane];
    const across = lane.axis === 'h' ? mc.fr : mc.fc;
    const along = lane.axis === 'h' ? mc.fc : mc.fr;
    const ahead = (along - car.pos) * car.dir;
    if (Math.abs(across - lane.lane) < 0.6 && ahead > 0 && ahead < 1.3) continue;
    // Giữ khoảng cách với xe phía trước cùng làn, cùng chiều
    let blocked = false;
    for (const o of cars) {
      if (o === car || o.lane !== car.lane || o.dir !== car.dir) continue;
      const gap = (o.pos - car.pos) * car.dir;
      if (gap > 0 && gap < 1.0) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    car.pos += car.dir * car.speed * dt;
    if (car.pos > lane.max) car.pos = lane.min;
    else if (car.pos < lane.min) car.pos = lane.max;
  }
}

export function walkTiles(walkable: boolean[][], exclude: Set<string>): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (walkable[r][c] && !exclude.has(`${c},${r}`)) out.push([c, r]);
  return out;
}

