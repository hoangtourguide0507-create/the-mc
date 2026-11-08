import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { WorldLocation } from '../../types/game';
import { facadeTextures, FacadeKind, gableGeometry, glowMat, mat, repeatTex } from './assets';
import { GHIBLI, isGhibli, softTint } from '../artStyle';
import { Filler, gridToWorld } from './cityMap';

/* ------------------------------------------------------------------ */
/* Khối dựng cơ bản                                                    */
/* ------------------------------------------------------------------ */

/** Khối nhà có mặt tiền cửa sổ (texture) trên 4 mặt, cửa sổ sáng đèn ban đêm */
export const Volume: React.FC<{
  w: number;
  d: number;
  h: number;
  pos?: [number, number, number];
  color: string;
  kind: FacadeKind;
  variant?: number;
  roof?: string;
  night: boolean;
  floorH?: number;
  bayW?: number;
}> = ({ w, d, h, pos = [0, 0, 0], color, kind, variant = 0, roof, night, floorH = 0.5, bayW = 0.55 }) => {
  const mats = useMemo(() => {
    const { map, emissive } = facadeTextures(kind, variant);
    const floors = Math.max(1, Math.round(h / floorH));
    const mk = (bays: number) =>
      new THREE.MeshStandardMaterial({
        color: softTint(color, 0.32),
        map: repeatTex(map, bays, floors),
        emissiveMap: repeatTex(emissive, bays, floors),
        emissive: new THREE.Color('#FFFFFF'),
        emissiveIntensity: 0,
        roughness: kind === 'glass' || kind === 'office' ? 0.28 : 0.72,
        metalness: kind === 'glass' ? 0.35 : kind === 'office' ? 0.2 : 0.02,
        envMapIntensity: kind === 'glass' ? 1.4 : 0.8,
      });
    const bx = Math.max(1, Math.round(d / bayW));
    const bz = Math.max(1, Math.round(w / bayW));
    const sideX = mk(bx);
    const sideZ = mk(bz);
    const top = mat(isGhibli ? GHIBLI.roofs[Math.abs(Math.round(w * 7 + h * 13)) % GHIBLI.roofs.length] : roof || shade(color, -0.25), { rough: 0.85 });
    const bottom = mat('#1F2937');
    return [sideX, sideX, top, bottom, sideZ, sideZ] as THREE.Material[];
  }, [w, d, h, color, kind, variant, roof, floorH, bayW]);

  useEffect(() => {
    for (const m of [mats[0], mats[4]] as THREE.MeshStandardMaterial[]) m.emissiveIntensity = night ? 1.15 : 0;
  }, [night, mats]);

  return (
    <mesh position={[pos[0], pos[1] + h / 2, pos[2]]} material={mats} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
};

/** Hộp bo góc nhỏ với vật liệu dùng chung */
const RB: React.FC<{
  args: [number, number, number];
  pos: [number, number, number];
  color: string;
  r?: number;
  rough?: number;
  metal?: number;
  rot?: [number, number, number];
  shadow?: boolean;
}> = ({ args, pos, color, r = 0.04, rough = 0.6, metal = 0, rot, shadow = false }) => (
  <RoundedBox
    args={args}
    radius={Math.min(r, Math.min(...args) / 2 - 0.001)}
    smoothness={3}
    position={pos}
    rotation={rot}
    castShadow={shadow}
    receiveShadow
    material={mat(color, { rough, metal })}
  />
);

const Box: React.FC<{
  args: [number, number, number];
  pos: [number, number, number];
  material: THREE.Material;
  rot?: [number, number, number];
  shadow?: boolean;
}> = ({ args, pos, material, rot, shadow = true }) => (
  <mesh position={pos} rotation={rot} material={material} castShadow={shadow} receiveShadow>
    <boxGeometry args={args} />
  </mesh>
);

/** Vật phát sáng: dịu ban ngày, rực ban đêm (bloom bắt được) */
const Glow: React.FC<{
  args: [number, number, number];
  pos: [number, number, number];
  color: string;
  night: boolean;
  day?: number;
  nightI?: number;
  rot?: [number, number, number];
  shape?: 'box' | 'sphere' | 'cyl';
}> = ({ args, pos, color, night, day = 0.5, nightI = 2.2, rot, shape = 'box' }) => {
  const m = useMemo(() => glowMat(color, color), [color]);
  useEffect(() => {
    // Ghibli: ban ngày gần như tắt ánh neon, ban đêm đèn lồng ấm dịu hơn
    m.emissiveIntensity = isGhibli ? (night ? nightI * 0.75 : day * 0.25) : night ? nightI : day;
  }, [night, m, day, nightI]);
  return (
    <mesh position={pos} rotation={rot} material={m}>
      {shape === 'box' && <boxGeometry args={args} />}
      {shape === 'sphere' && <sphereGeometry args={[args[0], 16, 12]} />}
      {shape === 'cyl' && <cylinderGeometry args={[args[0], args[0], args[1], 16]} />}
    </mesh>
  );
};

/** Hàng bóng đèn nhỏ (marquee / dây đèn) */
const BulbRow: React.FC<{ from: [number, number, number]; to: [number, number, number]; n: number; color: string; night: boolean; r?: number }> = ({
  from,
  to,
  n,
  color,
  night,
  r = 0.028,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => glowMat(color, color), [color]);
  useEffect(() => {
    m.emissiveIntensity = night ? 3 : 0.8;
  }, [night, m]);
  useEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      o.position.set(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }, [from, to, n]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} material={m}>
      <sphereGeometry args={[r, 8, 6]} />
    </instancedMesh>
  );
};

/** Mái hiên sọc */
const Awning: React.FC<{ w: number; pos: [number, number, number]; a: string; b: string; depth?: number }> = ({ w, pos, a, b, depth = 0.42 }) => {
  const n = Math.max(4, Math.round(w / 0.16));
  const sw = w / n;
  return (
    <group position={pos} rotation={[0.42, 0, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + sw * (i + 0.5), 0, depth / 2]} material={mat(i % 2 ? a : b, { rough: 0.8 })} castShadow>
          <boxGeometry args={[sw, 0.025, depth]} />
        </mesh>
      ))}
      {/* Viền rủ */}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={`v${i}`} position={[-w / 2 + sw * (i + 0.5), -0.05, depth]} material={mat(i % 2 ? a : b, { rough: 0.8 })}>
          <boxGeometry args={[sw, 0.1, 0.02]} />
        </mesh>
      ))}
    </group>
  );
};

const Door: React.FC<{ pos: [number, number, number]; w?: number; h?: number; color?: string; night: boolean }> = ({
  pos,
  w = 0.42,
  h = 0.62,
  color = '#7C4A2D',
  night,
}) => (
  <group position={pos}>
    <RB args={[w + 0.1, h + 0.06, 0.06]} pos={[0, h / 2, 0]} color="#E5E7EB" r={0.02} />
    <RB args={[w, h, 0.07]} pos={[0, h / 2 - 0.02, 0.01]} color={color} r={0.02} rough={0.5} />
    <Glow args={[0.03, 0.03, 0.03]} pos={[w * 0.32, h * 0.48, 0.06]} color="#FBBF24" night={night} shape="sphere" />
  </group>
);

/** Cây trồng chậu */
const Planter: React.FC<{ pos: [number, number, number]; color?: string }> = ({ pos, color = '#22C55E' }) => (
  <group position={pos}>
    <mesh position={[0, 0.09, 0]} material={mat('#E7E5E4', { rough: 0.8 })} castShadow>
      <cylinderGeometry args={[0.09, 0.07, 0.18, 12]} />
    </mesh>
    <mesh position={[0, 0.27, 0]} material={mat(color, { rough: 0.75 })} castShadow>
      <icosahedronGeometry args={[0.13, 1]} />
    </mesh>
  </group>
);

/** Cục nóng điều hoà / két nước trên mái */
const RoofJunk: React.FC<{ pos: [number, number, number]; tank?: boolean }> = ({ pos, tank }) => (
  <group position={pos}>
    {tank ? (
      <>
        <mesh position={[0, 0.25, 0]} material={mat('#94A3B8', { rough: 0.4, metal: 0.4 })} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.26, 16]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={mat('#475569')}>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 6]} />
        </mesh>
      </>
    ) : (
      <RB args={[0.24, 0.14, 0.18]} pos={[0, 0.07, 0]} color="#CBD5E1" r={0.02} metal={0.3} rough={0.4} />
    )}
  </group>
);

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

/* ------------------------------------------------------------------ */
/* Địa điểm chính (3×3 ô, mặt tiền hướng +Z)                            */
/* ------------------------------------------------------------------ */

type LP = { loc: WorldLocation; night: boolean; t?: number };

const Home: React.FC<LP> = ({ loc, night }) => (
  <group>
    <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#CBD5E1" r={0.03} />
    {/* Sân cỏ + lối đi */}
    <RB args={[2.7, 0.04, 0.7]} pos={[0, 0.11, 1.05]} color="#4ADE80" r={0.02} rough={0.9} />
    <RB args={[0.5, 0.05, 0.7]} pos={[0, 0.115, 1.05]} color="#E7E5E4" r={0.02} />
    <Volume w={2.3} d={1.9} h={0.95} pos={[-0.05, 0.1, -0.3]} color="#F8FAFC" kind="apt" variant={1} night={night} />
    <Volume w={2.55} d={2.05} h={0.9} pos={[0.08, 1.05, -0.25]} color={loc.color} kind="apt" variant={2} roof="#E2E8F0" night={night} />
    {/* Kính lớn tầng trệt */}
    <Glow args={[1.0, 0.62, 0.03]} pos={[-0.55, 0.47, 0.67]} color="#BAE6FD" night={night} day={0.15} nightI={1.4} />
    <Door pos={[0.45, 0.1, 0.66]} night={night} color="#1E1B4B" />
    {/* Mái che cửa */}
    <RB args={[0.8, 0.06, 0.45]} pos={[0.45, 0.85, 0.85]} color="#E2E8F0" r={0.02} />
    {/* Ban công + lan can kính */}
    <RB args={[1.4, 0.06, 0.4]} pos={[-0.3, 1.08, 0.97]} color="#E2E8F0" r={0.02} />
    <mesh position={[-0.3, 1.22, 1.16]} material={mat('#BAE6FD', { rough: 0.05, opacity: 0.45 })}>
      <boxGeometry args={[1.4, 0.24, 0.02]} />
    </mesh>
    <Planter pos={[-0.85, 1.11, 0.95]} color="#F472B6" />
    {/* Mái: lan can + pin mặt trời + vườn */}
    <RB args={[2.6, 0.1, 0.08]} pos={[0.08, 2.0, 0.78]} color="#E2E8F0" r={0.02} />
    {[-0.55, 0.05].map((x) => (
      <mesh key={x} position={[x, 2.08, -0.55]} rotation={[-0.45, 0, 0]} material={mat('#1E3A8A', { rough: 0.2, metal: 0.6 })} castShadow>
        <boxGeometry args={[0.5, 0.03, 0.62]} />
      </mesh>
    ))}
    <Planter pos={[0.8, 1.95, -0.6]} />
    <Planter pos={[0.95, 1.95, 0.2]} color="#16A34A" />
    {/* Biển neon: micro hồng */}
    <group position={[-0.95, 2.15, 0.6]}>
      <Glow args={[0.12, 0, 0]} pos={[0, 0.32, 0]} color={loc.neonColor} night={night} shape="sphere" nightI={2.8} day={0.9} />
      <Glow args={[0.035, 0.3, 0]} pos={[0, 0.12, 0]} color={loc.neonColor} night={night} shape="cyl" nightI={2.8} day={0.9} />
    </group>
    {/* Hàng rào + hộp thư */}
    {[-1.2, -0.9, 0.9, 1.2].map((x) => (
      <RB key={x} args={[0.06, 0.22, 0.06]} pos={[x, 0.22, 1.38]} color="#F8FAFC" r={0.015} />
    ))}
    <RB args={[0.36, 0.05, 0.04]} pos={[-1.05, 0.28, 1.38]} color="#F8FAFC" r={0.015} />
    <RB args={[0.36, 0.05, 0.04]} pos={[1.05, 0.28, 1.38]} color="#F8FAFC" r={0.015} />
    <RB args={[0.12, 0.12, 0.16]} pos={[0.55, 0.36, 1.38]} color="#EF4444" r={0.03} />
  </group>
);

const Cafe: React.FC<LP> = ({ loc, night }) => (
  <group>
    <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#D6D3D1" r={0.03} />
    <Volume w={2.6} d={2.0} h={1.6} pos={[0, 0.1, -0.35]} color="#C2703D" kind="apt" variant={3} roof="#7C2D12" night={night} />
    {/* Mặt kính tầng trệt */}
    <Glow args={[1.7, 0.55, 0.03]} pos={[-0.25, 0.42, 0.67]} color="#FDE68A" night={night} day={0.2} nightI={1.3} />
    <Door pos={[0.85, 0.1, 0.66]} night={night} color="#3F2A1D" />
    <Awning w={2.5} pos={[0, 0.88, 0.66]} a="#FFFBEB" b={loc.roofColor} />
    {/* Biển hiệu */}
    <Glow args={[1.4, 0.2, 0.06]} pos={[0, 1.05, 0.68]} color={loc.neonColor} night={night} day={0.6} />
    {/* Cốc cà phê khổng lồ trên mái */}
    <group position={[0.55, 1.72, -0.5]}>
      <mesh position={[0, 0.25, 0]} material={mat('#FFFBEB', { rough: 0.35 })} castShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.5, 24]} />
      </mesh>
      <mesh position={[0, 0.51, 0]} material={mat('#78350F', { rough: 0.3 })}>
        <cylinderGeometry args={[0.24, 0.24, 0.02, 24]} />
      </mesh>
      <mesh position={[0.27, 0.27, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#FFFBEB', { rough: 0.35 })}>
        <torusGeometry args={[0.1, 0.035, 10, 20]} />
      </mesh>
      <Glow args={[0.27, 0.04, 0]} pos={[0, 0.12, 0]} color={loc.neonColor} night={night} shape="cyl" />
    </group>
    <RoofJunk pos={[-0.7, 1.7, -0.8]} />
    {/* Bàn ngoài trời + dù */}
    {[-0.85, 0.05].map((x, i) => (
      <group key={x} position={[x, 0.1, 1.05]}>
        <mesh position={[0, 0.2, 0]} material={mat('#F5F5F4')} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.03, 16]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={mat('#44403C')}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
        </mesh>
        <mesh position={[0, 0.42, 0]} material={mat('#57534E')}>
          <cylinderGeometry args={[0.012, 0.012, 0.45, 6]} />
        </mesh>
        <mesh position={[0, 0.66, 0]} material={mat(i ? '#FBBF24' : '#F97316', { rough: 0.8 })} castShadow>
          <coneGeometry args={[0.32, 0.14, 8]} />
        </mesh>
        {[-0.24, 0.24].map((cx) => (
          <RB key={cx} args={[0.12, 0.14, 0.12]} pos={[cx, 0.07, 0]} color="#A16207" r={0.02} />
        ))}
      </group>
    ))}
    {/* Bảng phấn */}
    <RB args={[0.22, 0.32, 0.04]} pos={[1.15, 0.3, 1.05]} rot={[-0.25, 0, 0]} color="#1C1917" r={0.015} />
  </group>
);

const Theater: React.FC<LP> = ({ loc, night }) => (
  <group>
    <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#E7E5E4" r={0.03} />
    <Volume w={2.6} d={2.0} h={1.9} pos={[0, 0.1, -0.4]} color={loc.color} kind="house" variant={4} roof={loc.roofColor} night={night} floorH={0.62} />
    {/* Bậc thềm */}
    {[0, 1, 2].map((i) => (
      <RB key={i} args={[2.2 - i * 0.12, 0.06, 0.55 - i * 0.12]} pos={[0, 0.13 + i * 0.06, 0.95 - i * 0.06]} color="#F5F5F4" r={0.015} />
    ))}
    {/* Hàng cột */}
    {[-0.9, -0.45, 0, 0.45, 0.9].map((x) => (
      <group key={x} position={[x, 0.3, 0.88]}>
        <mesh position={[0, 0.55, 0]} material={mat('#FAFAF9', { rough: 0.45 })} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.1, 14]} />
        </mesh>
        <RB args={[0.2, 0.06, 0.2]} pos={[0, 1.12, 0]} color="#FAFAF9" r={0.015} />
      </group>
    ))}
    {/* Diềm + trán tường tam giác */}
    <RB args={[2.3, 0.14, 0.4]} pos={[0, 1.5, 0.82]} color="#F5F5F4" r={0.02} />
    <mesh position={[0, 1.57, 0.82]} geometry={gableGeometry(2.3, 0.42, 0.4)} material={mat('#F5F5F4', { rough: 0.5 })} castShadow />
    <Glow args={[0.13, 0, 0]} pos={[0, 1.72, 1.03]} color="#FBBF24" night={night} shape="sphere" nightI={2.5} />
    {/* Bảng đèn marquee */}
    <Glow args={[1.3, 0.22, 0.08]} pos={[0, 1.1, 1.12]} color={loc.neonColor} night={night} day={0.7} />
    <BulbRow from={[-0.68, 1.24, 1.17]} to={[0.68, 1.24, 1.17]} n={12} color="#FEF3C7" night={night} />
    <BulbRow from={[-0.68, 0.96, 1.17]} to={[0.68, 0.96, 1.17]} n={12} color="#FEF3C7" night={night} />
    <Door pos={[0, 0.28, 0.6]} w={0.6} h={0.7} color="#7F1D1D" night={night} />
    {/* Mái vòm vàng */}
    <mesh position={[0, 2.0, -0.55]} material={mat('#FBBF24', { rough: 0.25, metal: 0.7 })} castShadow>
      <sphereGeometry args={[0.55, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    <mesh position={[0, 2.62, -0.55]} material={mat('#FBBF24', { rough: 0.25, metal: 0.7 })}>
      <cylinderGeometry args={[0.02, 0.04, 0.25, 8]} />
    </mesh>
    {/* Poster hai bên */}
    {[-1.15, 1.15].map((x, i) => (
      <Glow key={x} args={[0.32, 0.5, 0.03]} pos={[x, 0.62, 0.62]} color={i ? '#22D3EE' : '#FF4FD8'} night={night} day={0.5} nightI={1.6} />
    ))}
  </group>
);

const Market: React.FC<LP> = ({ loc, night }) => (
  <group>
    <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#D6D3D1" r={0.03} />
    <Volume w={2.75} d={2.1} h={1.15} pos={[0, 0.1, -0.35]} color="#F1F5F9" kind="shop" variant={5} roof="#94A3B8" night={night} floorH={0.6} />
    {/* Mặt kính + dải biển */}
    <Glow args={[2.4, 0.5, 0.03]} pos={[0, 0.4, 0.72]} color="#D1FAE5" night={night} day={0.25} nightI={1.3} />
    <RB shadow args={[2.8, 0.26, 0.1]} pos={[0, 1.0, 0.72]} color={loc.roofColor} r={0.03} />
    <Glow args={[1.6, 0.14, 0.04]} pos={[0, 1.0, 0.78]} color={loc.neonColor} night={night} day={0.8} />
    {/* Cửa trượt */}
    <RB args={[0.6, 0.6, 0.05]} pos={[0, 0.41, 0.76]} color="#94A3B8" r={0.02} metal={0.4} rough={0.3} />
    {/* Sạp hoa quả */}
    {[-0.95, -0.45, 0.5, 1.0].map((x, i) => (
      <group key={x} position={[x, 0.1, 1.05]}>
        <RB args={[0.4, 0.2, 0.3]} pos={[0, 0.1, 0]} color="#A16207" r={0.02} />
        {Array.from({ length: 6 }, (_, j) => (
          <mesh
            key={j}
            position={[-0.13 + (j % 3) * 0.13, 0.24, -0.06 + Math.floor(j / 3) * 0.12]}
            material={mat(['#EF4444', '#F59E0B', '#84CC16', '#A855F7'][i], { rough: 0.45 })}
          >
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
        ))}
      </group>
    ))}
    {/* Máy lạnh trên mái */}
    <RoofJunk pos={[-0.8, 1.25, -0.6]} />
    <RoofJunk pos={[-0.4, 1.25, -0.6]} />
    <RoofJunk pos={[0.7, 1.25, -0.9]} tank />
    {/* Xe đẩy */}
    <group position={[1.25, 0.1, 0.75]}>
      <RB args={[0.18, 0.13, 0.24]} pos={[0, 0.15, 0]} color="#CBD5E1" r={0.02} metal={0.5} rough={0.3} />
      <RB args={[0.18, 0.13, 0.24]} pos={[0, 0.15, 0.08]} color="#CBD5E1" r={0.02} metal={0.5} rough={0.3} />
    </group>
  </group>
);

const TvStation: React.FC<LP> = ({ loc, night }) => {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (screen.current) {
      screen.current.emissive.setHSL((t * 0.06) % 1, 0.75, 0.55);
      screen.current.emissiveIntensity = night ? 1.8 : 0.9;
    }
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(t * 4) > 0.3 ? 4 : 0.2;
  });
  return (
    <group>
      <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#CBD5E1" r={0.03} />
      <Volume w={2.6} d={2.1} h={1.35} pos={[0, 0.1, -0.3]} color="#E2E8F0" kind="office" variant={6} roof="#64748B" night={night} />
      <Volume w={1.3} d={1.2} h={1.6} pos={[-0.55, 1.45, -0.65]} color={loc.color} kind="glass" variant={1} roof="#334155" night={night} />
      {/* Màn hình LED lớn */}
      <RB args={[1.5, 0.82, 0.08]} pos={[0.35, 0.95, 0.8]} color="#0F172A" r={0.03} />
      <mesh position={[0.35, 0.95, 0.85]}>
        <boxGeometry args={[1.38, 0.7, 0.01]} />
        <meshStandardMaterial ref={screen} color="#111827" emissive="#22D3EE" emissiveIntensity={1} roughness={0.2} />
      </mesh>
      <Door pos={[-0.7, 0.1, 0.76]} w={0.5} color="#1E3A8A" night={night} />
      <RB args={[0.9, 0.05, 0.4]} pos={[-0.7, 0.82, 0.95]} color="#E2E8F0" r={0.02} />
      {/* Cột ăng-ten + đèn nháy */}
      <mesh position={[-0.55, 3.55, -0.65]} material={mat('#E2E8F0', { metal: 0.6, rough: 0.3 })} castShadow>
        <cylinderGeometry args={[0.025, 0.06, 1.0, 8]} />
      </mesh>
      {[0.2, 0.45, 0.7].map((y) => (
        <mesh key={y} position={[-0.55, 3.05 + y, -0.65]} material={mat('#EF4444')}>
          <torusGeometry args={[0.07 - y * 0.05, 0.012, 6, 16]} />
        </mesh>
      ))}
      <mesh position={[-0.55, 4.08, -0.65]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial ref={beacon} color="#EF4444" emissive="#EF4444" emissiveIntensity={2} />
      </mesh>
      {/* Chảo vệ tinh */}
      <group position={[0.7, 1.5, -0.5]} rotation={[-0.6, 0.6, 0]}>
        <mesh material={mat('#F8FAFC', { rough: 0.35 })} castShadow>
          <sphereGeometry args={[0.32, 24, 12, 0, Math.PI * 2, 0, 0.9]} />
        </mesh>
        <mesh position={[0, -0.12, 0]} material={mat('#94A3B8')}>
          <cylinderGeometry args={[0.03, 0.05, 0.3, 8]} />
        </mesh>
      </group>
      <Glow args={[0.9, 0.16, 0.05]} pos={[-0.55, 2.85, 0.0]} color={loc.neonColor} night={night} day={0.7} />
    </group>
  );
};

const Hotel: React.FC<LP> = ({ loc, night }) => {
  const floors = 7;
  return (
    <group>
      <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#E7E5E4" r={0.03} />
      <Volume w={2.75} d={2.3} h={0.85} pos={[0, 0.1, -0.2]} color="#FEF3C7" kind="shop" variant={7} roof="#D6D3D1" night={night} floorH={0.85} />
      <Volume w={1.9} d={1.7} h={floors * 0.5} pos={[0, 0.95, -0.4]} color="#FDE68A" kind="apt" variant={8} roof="#A16207" night={night} />
      {/* Ban công từng tầng */}
      {Array.from({ length: floors }, (_, i) => (
        <RB key={i} args={[1.95, 0.04, 0.16]} pos={[0, 1.05 + i * 0.5, 0.5]} color="#FFFBEB" r={0.01} shadow={false} />
      ))}
      {/* Viền vàng podium */}
      <RB args={[2.8, 0.08, 2.35]} pos={[0, 0.97, -0.2]} color="#D4A017" r={0.02} metal={0.6} rough={0.3} />
      {/* Vương miện + chóp */}
      <RB shadow args={[1.6, 0.25, 1.4]} pos={[0, 0.95 + floors * 0.5 + 0.12, -0.4]} color="#D4A017" r={0.04} metal={0.7} rough={0.25} />
      <RB shadow args={[1.0, 0.3, 0.9]} pos={[0, 0.95 + floors * 0.5 + 0.38, -0.4]} color="#D4A017" r={0.04} metal={0.7} rough={0.25} />
      <mesh position={[0, 0.95 + floors * 0.5 + 0.9, -0.4]} material={mat('#FBBF24', { metal: 0.8, rough: 0.2 })} castShadow>
        <coneGeometry args={[0.12, 0.75, 12]} />
      </mesh>
      <Glow args={[0.07, 0, 0]} pos={[0, 0.95 + floors * 0.5 + 1.3, -0.4]} color="#FDE047" night={night} shape="sphere" nightI={4} day={1} />
      <Glow args={[1.4, 0.18, 0.05]} pos={[0, 0.95 + floors * 0.5 - 0.15, 0.48]} color={loc.neonColor} night={night} day={0.6} />
      {/* Sảnh: mái che vàng + thảm đỏ */}
      <RB args={[1.1, 0.07, 0.75]} pos={[0, 0.78, 1.15]} color="#D4A017" r={0.02} metal={0.6} rough={0.3} />
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.44, 1.45]} material={mat('#D4A017', { metal: 0.7, rough: 0.25 })}>
          <cylinderGeometry args={[0.025, 0.025, 0.68, 8]} />
        </mesh>
      ))}
      <RB args={[0.5, 0.015, 0.9]} pos={[0, 0.11, 1.05]} color="#B91C1C" r={0.005} shadow={false} />
      <Door pos={[0, 0.1, 0.94]} w={0.55} h={0.6} color="#78350F" night={night} />
      <BulbRow from={[-0.52, 0.74, 1.52]} to={[0.52, 0.74, 1.52]} n={8} color="#FEF3C7" night={night} r={0.022} />
      {/* Cờ + cây cọ chậu */}
      {[-1.25, 1.25].map((x, i) => (
        <group key={x} position={[x, 0.1, 1.2]}>
          <mesh position={[0, 0.55, 0]} material={mat('#E5E7EB', { metal: 0.6, rough: 0.3 })}>
            <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
          </mesh>
          <mesh position={[0.12, 0.98, 0]} material={mat(i ? '#22D3EE' : '#FF4FD8', { rough: 0.7 })}>
            <boxGeometry args={[0.22, 0.14, 0.01]} />
          </mesh>
        </group>
      ))}
      <Planter pos={[-0.75, 0.1, 1.35]} />
      <Planter pos={[0.75, 0.1, 1.35]} />
    </group>
  );
};

const Wedding: React.FC<LP> = ({ loc, night }) => (
  <group>
    <RB args={[2.9, 0.1, 2.9]} pos={[0, 0.05, 0]} color="#F5F5F4" r={0.03} />
    <Volume w={2.3} d={1.8} h={1.25} pos={[0, 0.1, -0.35]} color="#FFFFFF" kind="house" variant={9} roof="#FBCFE8" night={night} floorH={0.62} />
    {/* Mái chóp hồng */}
    <mesh position={[0, 1.35 + 0.42, -0.35]} rotation={[0, Math.PI / 4, 0]} material={mat(loc.roofColor, { rough: 0.5 })} castShadow>
      <coneGeometry args={[1.55, 0.85, 4]} />
    </mesh>
    {/* Hai tháp tròn */}
    {[-1.15, 1.15].map((x) => (
      <group key={x} position={[x, 0.1, 0.55]}>
        <mesh position={[0, 0.8, 0]} material={mat('#FFFFFF', { rough: 0.5 })} castShadow>
          <cylinderGeometry args={[0.28, 0.3, 1.6, 20]} />
        </mesh>
        <mesh position={[0, 1.85, 0]} material={mat(loc.roofColor, { rough: 0.45 })} castShadow>
          <coneGeometry args={[0.36, 0.55, 20]} />
        </mesh>
        <Glow args={[0.05, 0, 0]} pos={[0, 2.16, 0]} color="#FBBF24" night={night} shape="sphere" nightI={3} />
        <Glow args={[0.14, 0.24, 0.02]} pos={[0, 0.95, 0.29]} color="#FDE68A" night={night} day={0.15} nightI={1.4} />
      </group>
    ))}
    {/* Cổng vòm hoa */}
    <group position={[0, 0.1, 0.95]}>
      <mesh position={[0, 0.5, 0]} material={mat('#FFFFFF', { rough: 0.4 })} castShadow>
        <torusGeometry args={[0.45, 0.05, 12, 32, Math.PI]} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]} material={mat('#FFFFFF', { rough: 0.4 })}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => {
        const a = (i / 10) * Math.PI;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.45, 0.5 + Math.sin(a) * 0.45, 0.04]} material={mat(i % 2 ? '#F9A8D4' : '#FFFFFF', { rough: 0.6 })}>
            <icosahedronGeometry args={[0.075, 1]} />
          </mesh>
        );
      })}
    </group>
    <Door pos={[0, 0.1, 0.56]} w={0.55} h={0.68} color="#FBCFE8" night={night} />
    <Glow args={[1.2, 0.16, 0.05]} pos={[0, 1.22, 0.56]} color={loc.neonColor} night={night} day={0.6} />
    {/* Dây đèn */}
    <BulbRow from={[-1.15, 1.45, 0.82]} to={[1.15, 1.45, 0.82]} n={14} color="#FEF9C3" night={night} r={0.022} />
    {/* Bụi hoa */}
    {[-0.75, 0.75].map((x) => (
      <Planter key={x} pos={[x, 0.1, 1.25]} color="#F472B6" />
    ))}
  </group>
);

const BeachClub: React.FC<LP> = ({ loc, night }) => {
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!flames.current) return;
    flames.current.children.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(clock.elapsedTime * 9 + i * 2) * 0.18;
    });
  });
  return (
    <group>
      {/* Sàn gỗ trên cọc */}
      {[-1.1, 0, 1.1].flatMap((x) => [-1.1, 0, 1.1].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.15, z]} material={mat('#78350F', { rough: 0.85 })}>
          <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
        </mesh>
      )))}
      <RB args={[2.85, 0.1, 2.85]} pos={[0, 0.33, 0]} color="#B45309" r={0.03} rough={0.85} />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-1.26 + i * 0.315, 0.385, 0]} material={mat(i % 2 ? '#C2410C' : '#B45309', { rough: 0.9 })} receiveShadow>
          <boxGeometry args={[0.3, 0.01, 2.8]} />
        </mesh>
      ))}
      {/* Chòi mái lá */}
      {[-0.75, 0.75].flatMap((x) => [-0.75, 0.75].map((z) => (
        <mesh key={`p${x}${z}`} position={[x, 0.95, z]} material={mat('#92400E', { rough: 0.8 })} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.15, 8]} />
        </mesh>
      )))}
      <mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]} material={mat('#D6B26B', { rough: 0.95 })} castShadow>
        <coneGeometry args={[1.45, 0.75, 4]} />
      </mesh>
      <mesh position={[0, 1.44, 0]} rotation={[0, Math.PI / 4, 0]} material={mat('#B8913F', { rough: 0.95 })}>
        <cylinderGeometry args={[1.45, 1.5, 0.07, 4]} />
      </mesh>
      {/* Quầy bar */}
      <RB shadow args={[1.2, 0.4, 0.35]} pos={[-0.1, 0.6, -0.35]} color="#FDE68A" r={0.04} />
      <Glow args={[1.1, 0.06, 0.02]} pos={[-0.1, 0.72, -0.17]} color={loc.neonColor} night={night} day={0.8} />
      {/* Ván lướt sóng */}
      {['#FF4FD8', '#22D3EE', '#FBBF24'].map((c, i) => (
        <mesh key={c} position={[-1.0 + i * 0.22, 0.75, 1.25]} rotation={[0.25, 0, 0]} material={mat(c, { rough: 0.35 })} castShadow>
          <capsuleGeometry args={[0.08, 0.55, 6, 12]} />
        </mesh>
      ))}
      {/* Đuốc tiki */}
      <group ref={flames}>
        {[[1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0.38, z]}>
            <mesh position={[0, 0.35, 0]} material={mat('#78350F')}>
              <cylinderGeometry args={[0.025, 0.03, 0.7, 6]} />
            </mesh>
            <Glow args={[0.07, 0, 0]} pos={[0, 0.76, 0]} color="#FB923C" night={night} shape="sphere" nightI={4} day={1.6} />
          </group>
        ))}
      </group>
      <BulbRow from={[-0.75, 1.4, 0.8]} to={[0.75, 1.4, 0.8]} n={10} color="#FEF08A" night={night} r={0.025} />
    </group>
  );
};

const LANDMARKS: Record<string, React.FC<LP>> = {
  home: Home,
  cafe: Cafe,
  theater: Theater,
  market: Market,
  tv: TvStation,
  hotel: Hotel,
  wedding: Wedding,
  beach: BeachClub,
};

export const Landmark: React.FC<{ loc: WorldLocation; night: boolean; onSelect: (id: string) => void }> = ({ loc, night, onSelect }) => {
  const n = loc.size ?? 3;
  const [wx, wz] = gridToWorld(loc.at[0] + (n - 1) / 2, loc.at[1] + (n - 1) / 2);
  const Comp = LANDMARKS[loc.id] || Home;
  const rotY = loc.doorFace === 'front-right' ? Math.PI / 2 : 0;
  return (
    <group
      position={[wx, 0, wz]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(loc.id);
      }}
    >
      <Comp loc={loc} night={night} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Nhà phụ                                                             */
/* ------------------------------------------------------------------ */

export const FillerBuilding: React.FC<{ f: Filler; night: boolean; idx: number }> = ({ f, night, idx }) => {
  const [wx, wz] = gridToWorld(f.c + (f.w - 1) / 2, f.r + (f.d - 1) / 2);
  const W = f.w - 0.22;
  const D = f.d - 0.22;
  const v = idx % 4;
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(clock.elapsedTime * 3 + idx) > 0.4 ? 4 : 0.15;
  });

  const base = <RB args={[f.w - 0.06, 0.08, f.d - 0.06]} pos={[0, 0.04, 0]} color="#CBD5E1" r={0.02} />;

  if (f.kind === 'house') {
    const H = f.floors * 0.5;
    return (
      <group position={[wx, 0, wz]}>
        {base}
        <Volume w={W - 0.2} d={D - 0.3} h={H} pos={[0, 0.08, -0.05]} color={f.color} kind="house" variant={v} night={night} />
        <mesh position={[0, 0.08 + H, -0.05]} geometry={gableGeometry(W - 0.05, 0.55, D - 0.1)} material={mat(isGhibli ? GHIBLI.roofs[idx % GHIBLI.roofs.length] : f.accent, { rough: 0.7 })} castShadow />
        <RB args={[0.16, 0.4, 0.16]} pos={[W * 0.25, 0.08 + H + 0.35, -0.25]} color="#78716C" r={0.02} />
        <Door pos={[0, 0.08, (D - 0.3) / 2 - 0.05 + 0.01]} w={0.3} h={0.42} color={f.accent} night={night} />
        <Planter pos={[-0.45, 0.08, D / 2 - 0.05]} color="#4ADE80" />
      </group>
    );
  }
  if (f.kind === 'shop') {
    const H = f.floors * 0.5;
    return (
      <group position={[wx, 0, wz]}>
        {base}
        <Volume w={W} d={D} h={H} pos={[0, 0.08, 0]} color={f.color} kind="apt" variant={v} night={night} />
        <Glow args={[W - 0.2, 0.36, 0.02]} pos={[0, 0.3, D / 2 + 0.01]} color="#FEF3C7" night={night} day={0.18} nightI={1.3} />
        <Awning w={W - 0.1} pos={[0, 0.6, D / 2]} a="#FFFFFF" b={f.accent} depth={0.32} />
        <Glow args={[W * 0.6, 0.1, 0.04]} pos={[0, 0.72, D / 2 + 0.03]} color={f.accent} night={night} day={0.6} />
        <RoofJunk pos={[W * 0.2, 0.08 + H, -0.2]} />
      </group>
    );
  }
  if (f.kind === 'apartment') {
    const H = f.floors * 0.5;
    return (
      <group position={[wx, 0, wz]}>
        {base}
        <Volume w={W} d={D} h={H} pos={[0, 0.08, 0]} color={f.color} kind="apt" variant={v} night={night} />
        {Array.from({ length: f.floors - 1 }, (_, i) => (
          <group key={i}>
            <RB args={[W * 0.42, 0.04, 0.2]} pos={[-W * 0.22, 0.58 + i * 0.5, D / 2 + 0.09]} color="#F8FAFC" r={0.01} shadow={false} />
            <mesh position={[-W * 0.22, 0.68 + i * 0.5, D / 2 + 0.19]} material={mat(f.accent, { rough: 0.5 })}>
              <boxGeometry args={[W * 0.42, 0.14, 0.015]} />
            </mesh>
          </group>
        ))}
        <RoofJunk pos={[W * 0.2, 0.08 + H, -0.15]} tank />
        <RoofJunk pos={[-W * 0.2, 0.08 + H, 0.15]} />
        <RB args={[W + 0.04, 0.08, D + 0.04]} pos={[0, 0.12 + H, 0]} color={shade(f.color, -0.15)} r={0.02} />
      </group>
    );
  }
  // office / tower
  const H = f.floors * 0.42;
  const kind: FacadeKind = f.kind === 'tower' ? 'glass' : 'office';
  return (
    <group position={[wx, 0, wz]}>
      {base}
      <Volume w={W} d={D} h={H} pos={[0, 0.08, 0]} color={f.color} kind={kind} variant={v} night={night} floorH={0.42} />
      {f.kind === 'tower' && (
        <>
          <Volume w={W * 0.7} d={D * 0.7} h={0.6} pos={[0, 0.08 + H, 0]} color={f.color} kind="glass" variant={v + 1} night={night} floorH={0.3} />
          <Glow args={[0.05, H, 0.05]} pos={[W / 2 + 0.01, 0.08 + H / 2, D / 2 + 0.01]} color={f.accent} night={night} day={0.4} nightI={3} />
          <Glow args={[0.05, H, 0.05]} pos={[-W / 2 - 0.01, 0.08 + H / 2, D / 2 + 0.01]} color={f.accent} night={night} day={0.4} nightI={3} />
          <mesh position={[0, 0.08 + H + 0.95, 0]} material={mat('#E2E8F0', { metal: 0.7, rough: 0.25 })}>
            <cylinderGeometry args={[0.015, 0.03, 0.7, 6]} />
          </mesh>
          <mesh position={[0, 0.08 + H + 1.32, 0]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial ref={beacon} color="#EF4444" emissive="#EF4444" emissiveIntensity={2} />
          </mesh>
        </>
      )}
      {f.kind === 'office' && (
        <>
          <RB args={[W * 0.5, 0.3, D * 0.4]} pos={[W * 0.15, 0.08 + H + 0.15, -D * 0.15]} color="#94A3B8" r={0.03} />
          <Glow args={[W * 0.7, 0.14, 0.04]} pos={[0, 0.08 + H - 0.2, D / 2 + 0.02]} color={f.accent} night={night} day={0.6} nightI={2.4} />
        </>
      )}
      <RB args={[W * 0.5, 0.06, 0.3]} pos={[0, 0.58, D / 2 + 0.12]} color="#E2E8F0" r={0.02} />
    </group>
  );
};
