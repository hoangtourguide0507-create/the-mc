import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WorldProp } from '../../types/game';
import { mat } from './assets';
import { gridToWorld } from './cityMap';
import { GHIBLI, isGhibli } from '../artStyle';

type Xf = { p: [number, number, number]; s?: [number, number, number]; ry?: number; color?: string };

/** Một phần (thân / tán lá...) vẽ bằng instancing cho nhiều đạo cụ cùng loại */
const Part: React.FC<{
  items: Xf[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  shadow?: boolean;
}> = ({ items, geometry, material, shadow = true }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(0, it.ry ?? 0, 0);
      o.scale.set(...(it.s ?? [1, 1, 1]));
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      if (it.color) {
        col.set(it.color);
        inst.setColorAt(i, col);
      }
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow />;
};

const G = {
  trunk: new THREE.CylinderGeometry(0.055, 0.08, 0.5, 8),
  blob: new THREE.IcosahedronGeometry(0.3, 2),
  bush: new THREE.IcosahedronGeometry(0.22, 2),
  flower: new THREE.IcosahedronGeometry(0.05, 0),
  palmTrunk: new THREE.CylinderGeometry(0.045, 0.075, 1.05, 8),
  leaf: (() => {
    const g = new THREE.SphereGeometry(0.5, 10, 6);
    g.scale(0.62, 0.06, 0.16);
    g.translate(0.3, 0, 0);
    return g;
  })(),
  pole: new THREE.CylinderGeometry(0.022, 0.03, 0.9, 8),
  arm: new THREE.BoxGeometry(0.2, 0.025, 0.025),
  lampHead: new THREE.SphereGeometry(0.06, 12, 10),
  bench: new THREE.BoxGeometry(0.42, 0.04, 0.14),
  benchLeg: new THREE.BoxGeometry(0.04, 0.12, 0.12),
  hydrant: new THREE.CylinderGeometry(0.05, 0.06, 0.2, 10),
};

const M = {
  trunk: mat('#7C4A2D', { rough: 0.9 }),
  leaves: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.8 }),
  bush: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85 }),
  flower: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }),
  palmTrunk: mat('#A0703A', { rough: 0.85 }),
  palmLeaf: mat('#3FBF5F', { rough: 0.7 }),
  pole: mat('#334155', { rough: 0.4, metal: 0.6 }),
  bench: mat('#B45309', { rough: 0.8 }),
  benchLeg: mat('#1F2937', { rough: 0.5, metal: 0.5 }),
  hydrant: mat('#EF4444', { rough: 0.45 }),
};

let poolTex: THREE.CanvasTexture | null = null;
function lightPoolTexture() {
  if (poolTex) return poolTex;
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,200,120,1)');
  grd.addColorStop(0.45, 'rgba(255,170,80,0.45)');
  grd.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  poolTex = new THREE.CanvasTexture(cv);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

/** Vũng sáng ấm dưới cột đèn ban đêm (decal cộng sáng, thay cho đèn điểm tốn kém) */
const LightPools: React.FC<{ items: Xf[] }> = ({ items }) => {
  const m = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: lightPoolTexture(),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const g = useMemo(() => {
    const pg = new THREE.PlaneGeometry(1.9, 1.9);
    pg.rotateX(-Math.PI / 2);
    return pg;
  }, []);
  const pools = useMemo(() => items.map((it) => ({ p: [it.p[0], 0.085, it.p[2]] as [number, number, number] })), [items]);
  return <Part items={pools} geometry={g} material={m} shadow={false} />;
};

const LampGlow: React.FC<{ items: Xf[]; night: boolean }> = ({ items, night }) => {
  const m = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFF3C4', emissive: new THREE.Color('#FFC86B'), emissiveIntensity: 0.3 }),
    []
  );
  useEffect(() => {
    m.emissiveIntensity = night ? 4 : 0.25;
  }, [night, m]);
  return <Part items={items} geometry={G.lampHead} material={m} shadow={false} />;
};

const Fountain: React.FC<{ p: [number, number, number] }> = ({ p }) => {
  const water = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!water.current) return;
    const t = clock.elapsedTime;
    water.current.children.forEach((j, i) => {
      j.scale.y = 1 + Math.sin(t * 2.6 + i * 1.3) * 0.08;
    });
  });
  const stone = mat('#EDE7DD', { rough: 0.55 });
  const pool = mat('#3BB4E6', { rough: 0.06, metal: 0.15 });
  const spray = mat('#E8F8FF', { rough: 0.05, opacity: 0.6 });
  return (
    <group position={p}>
      {/* Bồn ngoài: vành tròn + mặt nước thấp hơn vành */}
      <mesh position={[0, 0.1, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[0.98, 1.02, 0.12, 48]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={stone} castShadow>
        <torusGeometry args={[0.93, 0.07, 12, 48]} />
      </mesh>
      <mesh position={[0, 0.175, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
        <circleGeometry args={[0.9, 48]} />
      </mesh>
      {/* Trụ + đĩa tầng trên */}
      <mesh position={[0, 0.38, 0]} material={stone} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 0.42, 20]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={stone} castShadow>
        <cylinderGeometry args={[0.36, 0.12, 0.08, 32]} />
      </mesh>
      <mesh position={[0, 0.645, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
        <circleGeometry args={[0.32, 32]} />
      </mesh>
      <group ref={water}>
        {/* Cột nước giữa + vòm nước rơi xuống bồn */}
        <mesh position={[0, 0.82, 0]} material={spray}>
          <cylinderGeometry args={[0.025, 0.05, 0.36, 12]} />
        </mesh>
        <mesh position={[0, 0.98, 0]} material={spray}>
          <sphereGeometry args={[0.07, 14, 10]} />
        </mesh>
        <mesh position={[0, 0.62, 0]} material={spray}>
          <cylinderGeometry args={[0.36, 0.5, 0.42, 32, 1, true, 0, Math.PI * 2]} />
        </mesh>
      </group>
    </group>
  );
};

const Lighthouse: React.FC<{ p: [number, number, number]; night: boolean }> = ({ p, night }) => {
  const beam = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (beam.current) beam.current.rotation.y += dt * 0.9;
  });
  return (
    <group position={p}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.25 + i * 0.4, 0]} material={mat(i % 2 ? '#EF4444' : '#F8FAFC', { rough: 0.5 })} castShadow>
          <cylinderGeometry args={[0.24 - i * 0.03, 0.27 - i * 0.03, 0.4, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 1.78, 0]} material={mat('#FEF3C7', { emissive: '#FDE047', ei: night ? 3 : 0.6 })}>
        <cylinderGeometry args={[0.15, 0.15, 0.22, 16]} />
      </mesh>
      <mesh position={[0, 1.98, 0]} material={mat('#1F2937', { rough: 0.4 })} castShadow>
        <coneGeometry args={[0.22, 0.22, 16]} />
      </mesh>
      {night && (
        <group ref={beam} position={[0, 1.78, 0]}>
          <mesh position={[1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.35, 3.2, 16, 1, true]} />
            <meshBasicMaterial color="#FEF9C3" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const Boat: React.FC<{ p: [number, number, number]; i: number; color: string }> = ({ p, i, color }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + i * 2;
    ref.current.position.y = p[1] + Math.sin(t * 1.4) * 0.03;
    ref.current.rotation.z = Math.sin(t * 1.1) * 0.06;
    ref.current.rotation.x = Math.cos(t * 0.9) * 0.04;
  });
  return (
    <group ref={ref} position={p} rotation={[0, i * 1.3, 0]}>
      <mesh position={[0, 0.04, 0]} scale={[0.32, 0.12, 0.7]} material={mat(color, { rough: 0.45 })} castShadow>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.3, 0.68, 1]} material={mat('#F5DEB3', { rough: 0.8 })}>
        <circleGeometry args={[1, 18]} />
      </mesh>
      <mesh position={[0, 0.45, 0.05]} material={mat('#E5E7EB')}>
        <cylinderGeometry args={[0.012, 0.012, 0.85, 6]} />
      </mesh>
      <mesh position={[0, 0.48, -0.08]} rotation={[0, Math.PI / 2, 0]} material={mat('#FFFFFF', { rough: 0.7 })} castShadow>
        <coneGeometry args={[0.24, 0.7, 3]} />
      </mesh>
    </group>
  );
};

const Kiosk: React.FC<{ p: [number, number, number] }> = ({ p }) => (
  <group position={p}>
    <mesh position={[0, 0.22, 0]} material={mat('#FDE68A', { rough: 0.6 })} castShadow>
      <boxGeometry args={[0.66, 0.42, 0.5]} />
    </mesh>
    <mesh position={[0, 0.62, 0]} rotation={[0, Math.PI / 4, 0]} material={mat('#FF4FD8', { rough: 0.6 })} castShadow>
      <coneGeometry args={[0.6, 0.32, 4]} />
    </mesh>
    {[-0.25, 0.25].map((x) => (
      <mesh key={x} position={[x, 0.43, 0.24]} material={mat('#78350F')}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
      </mesh>
    ))}
    <mesh position={[0.12, 0.5, 0.26]} material={mat('#F472B6', { rough: 0.4 })}>
      <sphereGeometry args={[0.06, 10, 8]} />
    </mesh>
    <mesh position={[0.12, 0.42, 0.26]} rotation={[Math.PI, 0, 0]} material={mat('#D97706', { rough: 0.7 })}>
      <coneGeometry args={[0.05, 0.12, 8]} />
    </mesh>
  </group>
);

export const CityProps: React.FC<{ props: WorldProp[]; night: boolean }> = ({ props, night }) => {
  const parts = useMemo(() => {
    const trunk: Xf[] = [];
    const leaves: Xf[] = [];
    const bush: Xf[] = [];
    const flower: Xf[] = [];
    const palmTrunk: Xf[] = [];
    const palmLeaf: Xf[] = [];
    const pole: Xf[] = [];
    const arm: Xf[] = [];
    const head: Xf[] = [];
    const bench: Xf[] = [];
    const benchLeg: Xf[] = [];
    const hydrant: Xf[] = [];
    const umbrella: { p: [number, number, number]; color: string }[] = [];
    const singles: React.ReactNode[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const greens = isGhibli ? GHIBLI.leaves : ['#3FA34D', '#4CB860', '#2F9447', '#5BC46B'];

    props.forEach((pr, idx) => {
      const [x, z] = gridToWorld(pr.c, pr.r);
      const y = 0.07;
      switch (pr.kind) {
        case 'tree': {
          const s = 0.85 + rnd() * 0.35;
          trunk.push({ p: [x, y + 0.25 * s, z], s: [s, s, s] });
          const c = isGhibli && pr.color ? (idx % 3 === 0 ? '#F2B8C6' : greens[idx % greens.length]) : pr.color || greens[idx % greens.length];
          leaves.push({ p: [x, y + 0.62 * s, z], s: [s * 1.05, s * 0.95, s * 1.05], ry: rnd() * 6, color: c });
          leaves.push({ p: [x + 0.12 * s, y + 0.86 * s, z - 0.05 * s], s: [s * 0.78, s * 0.72, s * 0.78], ry: rnd() * 6, color: c });
          leaves.push({ p: [x - 0.1 * s, y + 0.8 * s, z + 0.1 * s], s: [s * 0.62, s * 0.6, s * 0.62], ry: rnd() * 6, color: c });
          break;
        }
        case 'bush': {
          const c = pr.color || greens[(idx + 1) % greens.length];
          bush.push({ p: [x - 0.12, y + 0.12, z], s: [1, 0.8, 1], color: c });
          bush.push({ p: [x + 0.14, y + 0.1, z + 0.08], s: [0.8, 0.7, 0.8], color: c });
          if (pr.color) for (let k = 0; k < 5; k++) flower.push({ p: [x - 0.2 + rnd() * 0.4, y + 0.24, z - 0.15 + rnd() * 0.3], color: '#FFF1F2' });
          break;
        }
        case 'flower': {
          bush.push({ p: [x, y + 0.06, z], s: [1.6, 0.35, 1.6], color: '#3F9E4E' });
          const cols = ['#F472B6', '#FBBF24', '#A78BFA', '#FB7185', '#FFFFFF'];
          for (let k = 0; k < 10; k++)
            flower.push({ p: [x - 0.3 + rnd() * 0.6, y + 0.13, z - 0.3 + rnd() * 0.6], color: cols[k % cols.length] });
          break;
        }
        case 'palm': {
          const lean = (rnd() - 0.5) * 0.2;
          palmTrunk.push({ p: [x + lean, y + 0.52, z], s: [1, 1, 1] });
          for (let k = 0; k < 7; k++) palmLeaf.push({ p: [x + lean * 2, y + 1.04, z], ry: (k / 7) * Math.PI * 2 + rnd() * 0.3, s: [1, 1, 1] });
          break;
        }
        case 'lamp': {
          // Đặt ở mép ô vỉa hè sát lòng đường để không vướng lối đi
          pole.push({ p: [x + 0.36, y + 0.45, z + 0.36] });
          arm.push({ p: [x + 0.28, y + 0.88, z + 0.36] });
          head.push({ p: [x + 0.2, y + 0.85, z + 0.36], s: [1, 0.8, 1] });
          break;
        }
        case 'bench': {
          const ry = pr.dir === 'v' ? Math.PI / 2 : 0;
          bench.push({ p: [x, y + 0.13, z], ry });
          bench.push({ p: [x + (ry ? 0.06 : 0), y + 0.24, z + (ry ? 0 : -0.06)], ry, s: [1, 2.6, 0.3] });
          benchLeg.push({ p: [x + (ry ? 0 : -0.16), y + 0.06, z + (ry ? -0.16 : 0)], ry });
          benchLeg.push({ p: [x + (ry ? 0 : 0.16), y + 0.06, z + (ry ? 0.16 : 0)], ry });
          break;
        }
        case 'hydrant':
          hydrant.push({ p: [x - 0.36, y + 0.1, z - 0.36] });
          break;
        case 'umbrella':
          umbrella.push({ p: [x, 0.03, z], color: pr.color || '#FF4FD8' });
          break;
        case 'fountain':
          singles.push(<Fountain key={`f${idx}`} p={[x, y, z]} />);
          break;
        case 'lighthouse':
          singles.push(<Lighthouse key={`l${idx}`} p={[x, y, z]} night={night} />);
          break;
        case 'kiosk':
          singles.push(<Kiosk key={`k${idx}`} p={[x, 0.03, z]} />);
          break;
        case 'boat':
          singles.push(<Boat key={`b${idx}`} p={[x, -0.08, z]} i={idx} color={['#EF4444', '#3B82F6', '#F8FAFC'][idx % 3]} />);
          break;
      }
    });
    return { trunk, leaves, bush, flower, palmTrunk, palmLeaf, pole, arm, head, bench, benchLeg, hydrant, umbrella, singles };
  }, [props, night]);

  return (
    <group>
      <Part items={parts.trunk} geometry={G.trunk} material={M.trunk} />
      <Part items={parts.leaves} geometry={G.blob} material={M.leaves} />
      <Part items={parts.bush} geometry={G.bush} material={M.bush} />
      <Part items={parts.flower} geometry={G.flower} material={M.flower} shadow={false} />
      <Part items={parts.palmTrunk} geometry={G.palmTrunk} material={M.palmTrunk} />
      <PalmLeaves items={parts.palmLeaf} />
      <Part items={parts.pole} geometry={G.pole} material={M.pole} />
      <Part items={parts.arm} geometry={G.arm} material={M.pole} shadow={false} />
      <LampGlow items={parts.head} night={night} />
      {night && <LightPools items={parts.head} />}
      <Part items={parts.bench} geometry={G.bench} material={M.bench} />
      <Part items={parts.benchLeg} geometry={G.benchLeg} material={M.benchLeg} />
      <Part items={parts.hydrant} geometry={G.hydrant} material={M.hydrant} />
      {parts.umbrella.map((u, i) => (
        <group key={i} position={u.p}>
          <mesh position={[0, 0.38, 0]} material={mat('#F8FAFC')}>
            <cylinderGeometry args={[0.012, 0.012, 0.76, 6]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={mat(u.color, { rough: 0.7 })} castShadow>
            <coneGeometry args={[0.42, 0.18, 10]} />
          </mesh>
          <mesh position={[0.3, 0.05, 0.1]} rotation={[0, 0.4, -0.12]} material={mat('#FFFFFF', { rough: 0.7 })} castShadow>
            <boxGeometry args={[0.2, 0.04, 0.46]} />
          </mesh>
        </group>
      ))}
      {parts.singles}
    </group>
  );
};

/** Lá cọ: rủ xuống & đung đưa nhẹ */
const PalmLeaves: React.FC<{ items: Xf[] }> = ({ items }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    const t = clock.elapsedTime;
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(0, (it.ry ?? 0) + Math.sin(t * 0.8 + i) * 0.05, -0.45 + Math.sin(t * 1.3 + i * 0.7) * 0.06, 'YXZ');
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[G.leaf, M.palmLeaf, items.length]} castShadow />;
};
