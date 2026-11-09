import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TileKind } from '../../types/game';
import { GRID, GridData, gridToWorld, ROAD_COLS, ROAD_ROWS } from './cityMap';
import { GHIBLI, GHIBLI_NIGHT_LIGHT } from '../artStyle';

/* Texture mặt đất vẽ bằng canvas (1 ô = 1 texture) */
const groundTex = new Map<string, THREE.CanvasTexture>();
function tileTexture(kind: string): THREE.CanvasTexture {
  const hit = groundTex.get(kind);
  if (hit) return hit;
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  let seed = kind.length * 991;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const noise = (n: number, a: number, size = 2) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
      g.fillRect(rnd() * S, rnd() * S, size, size);
    }
  };
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, S, S);
  if (kind === 'road') {
    noise(900, 0.05, 2);
  } else if (kind === 'walk') {
    // Gạch lát 2×2 viên ấm
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(70, 50, 35, 0.14)';
    g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * (S / 2), 0);
      g.lineTo(i * (S / 2), S);
      g.moveTo(0, i * (S / 2));
      g.lineTo(S, i * (S / 2));
      g.stroke();
    }
    noise(250, 0.035);
  } else if (kind === 'plaza') {
    // Đá lát so le kiểu thị trấn cổ
    g.strokeStyle = 'rgba(70, 50, 35, 0.12)';
    g.lineWidth = 2.5;
    for (let row = 0; row < 4; row++) {
      const y = row * (S / 4);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(S, y);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const x = ((k + (row % 2) * 0.5) * S) / 3;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + S / 4);
        g.stroke();
      }
    }
    noise(200, 0.035);
  } else if (kind === 'grass') {
    for (let i = 0; i < 560; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(20, 60, 15, 0.09)' : 'rgba(255, 250, 210, 0.13)';
      const x = rnd() * S;
      const y = rnd() * S;
      g.fillRect(x, y, 2, 4 + rnd() * 3);
    }
  } else if (kind === 'sand') {
    noise(700, 0.06, 2);
    g.strokeStyle = 'rgba(160, 110, 40, 0.10)';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      const y = 16 + i * 30 + rnd() * 6;
      g.moveTo(0, y);
      g.bezierCurveTo(S * 0.3, y - 6, S * 0.6, y + 6, S, y);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  groundTex.set(kind, t);
  return t;
}

function waterNormal(): THREE.CanvasTexture {
  const hit = groundTex.get('waterN');
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const a = (x / S) * Math.PI * 2;
      const b = (y / S) * Math.PI * 2;
      const nx = Math.sin(a * 3 + Math.cos(b * 2) * 1.5) * 0.5 + Math.sin(a * 7 + b * 5) * 0.2;
      const ny = Math.cos(b * 4 + Math.sin(a * 2) * 1.2) * 0.5 + Math.cos(b * 9 - a * 3) * 0.2;
      const i = (y * S + x) * 4;
      img.data[i] = 128 + nx * 90;
      img.data[i + 1] = 128 + ny * 90;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  groundTex.set('waterN', t);
  return t;
}

/** Vân nước caustics vẽ tay kiểu Ghibli */
function waterCaustics(): THREE.CanvasTexture {
  const hit = groundTex.get('waterCaustics');
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  g.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const y = (i * 15) % S;
    const x = (i * 47) % S;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 24, y - 8, x + 48, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 4);
  groundTex.set('waterCaustics', t);
  return t;
}

interface TileSpec {
  top: number;
  tex: string;
  colors: string[];
  rough: number;
}

const SPEC: Record<Exclude<TileKind, 'water'>, TileSpec> = {
  grass: { top: 0.06, tex: 'grass', colors: GHIBLI.grass, rough: 1 },
  park: { top: 0.06, tex: 'grass', colors: GHIBLI.park, rough: 1 },
  walk: { top: 0.07, tex: 'plaza', colors: GHIBLI.walk, rough: 1 },
  plaza: { top: 0.07, tex: 'plaza', colors: GHIBLI.plaza, rough: 1 },
  sand: { top: 0.03, tex: 'sand', colors: GHIBLI.sand, rough: 1 },
  'road-x': { top: 0.0, tex: 'walk', colors: [GHIBLI.road], rough: 1 },
  'road-y': { top: 0.0, tex: 'walk', colors: [GHIBLI.road], rough: 1 },
  cross: { top: 0.0, tex: 'walk', colors: ['#726B63'], rough: 1 },
};

const BASE_Y = -0.3;

const TileLayer: React.FC<{ kind: Exclude<TileKind, 'water'>; cells: [number, number][] }> = ({ kind, cells }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spec = SPEC[kind];
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tileTexture(spec.tex),
        roughness: spec.rough,
        color: '#FFFFFF',
      }),
    [spec]
  );
  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const h = spec.top - BASE_Y;
    cells.forEach(([c, r], i) => {
      const [x, z] = gridToWorld(c, r);
      o.position.set(x, BASE_Y + h / 2, z);
      o.scale.set(1, h, 1);
      o.rotation.y =
        kind === 'road-y'
          ? Math.PI / 2
          : ((c * 7 + r * 3) % 4) * (Math.PI / 2) * (spec.tex === 'grass' || spec.tex === 'sand' ? 1 : 0);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      col.set(spec.colors[(c * 13 + r * 7) % spec.colors.length]);
      inst.setColorAt(i, col);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [cells, kind, spec]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} material={material} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
};

/** Vạch kẻ đường: nét đứt giữa đường + vạch qua đường cạnh ngã tư */
const RoadMarkings: React.FC<{ grid: GridData }> = ({ grid }) => {
  const dashRef = useRef<THREE.InstancedMesh>(null);
  const zebraRef = useRef<THREE.InstancedMesh>(null);
  const { dashes, zebras } = useMemo(() => {
    const dashes: [number, number, number][] = [];
    const zebras: [number, number, number][] = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        const t = grid.tiles[r][c];
        if (t !== 'road-x' && t !== 'road-y') continue;
        const [x, z] = gridToWorld(c, r);
        const nextToCross =
          t === 'road-x'
            ? grid.tiles[r][c - 1] === 'cross' || grid.tiles[r][c + 1] === 'cross'
            : grid.tiles[r - 1]?.[c] === 'cross' || grid.tiles[r + 1]?.[c] === 'cross';
        if (nextToCross) {
          for (let k = -2; k <= 2; k++) {
            if (t === 'road-x') zebras.push([x, z + k * 0.18, 0]);
            else zebras.push([x + k * 0.18, z, Math.PI / 2]);
          }
        } else {
          dashes.push([x, z, t === 'road-x' ? 0 : Math.PI / 2]);
        }
      }
    return { dashes, zebras };
  }, [grid]);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    if (dashRef.current) {
      dashes.forEach(([x, z, ry], i) => {
        o.position.set(x, 0.006, z);
        o.rotation.set(0, ry, 0);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        dashRef.current!.setMatrixAt(i, o.matrix);
      });
      dashRef.current.instanceMatrix.needsUpdate = true;
    }
    if (zebraRef.current) {
      zebras.forEach(([x, z, ry], i) => {
        o.position.set(x, 0.006, z);
        o.rotation.set(0, ry, 0);
        o.updateMatrix();
        zebraRef.current!.setMatrixAt(i, o.matrix);
      });
      zebraRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [dashes, zebras]);

  return (
    <>
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]} receiveShadow>
        <boxGeometry args={[0.42, 0.01, 0.05]} />
        <meshStandardMaterial color="#EFE6D2" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={zebraRef} args={[undefined, undefined, zebras.length]} receiveShadow>
        <boxGeometry args={[0.7, 0.01, 0.09]} />
        <meshStandardMaterial color="#F7F2E7" roughness={0.65} />
      </instancedMesh>
    </>
  );
};

const Water: React.FC<{ night: boolean }> = ({ night }) => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const normal = useMemo(() => waterNormal(), []);
  const caustics = useMemo(() => waterCaustics(), []);
  useFrame((_, dt) => {
    normal.offset.x += dt * 0.012;
    normal.offset.y += dt * 0.007;
    caustics.offset.x -= dt * 0.008;
    caustics.offset.y += dt * 0.005;
  });
  const half = GRID / 2;
  return (
    <group>
      {/* Mặt nước biển màu ngọc bích Ghibli có gợn sóng và caustics */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, half / 2 + 2]} receiveShadow>
        <planeGeometry args={[GRID, half + 4]} />
        <meshStandardMaterial
          ref={matRef}
          color={night ? GHIBLI_NIGHT_LIGHT.water : GHIBLI.water}
          map={caustics}
          roughness={0.16}
          metalness={0.18}
          normalMap={normal}
          normalScale={new THREE.Vector2(0.42, 0.42)}
          envMapIntensity={1.2}
        />
      </mesh>
      {/* Đáy biển nhìn qua mép sa bàn */}
      <mesh position={[0, -0.22, half / 2 + 2]}>
        <boxGeometry args={[GRID, 0.2, half + 4]} />
        <meshStandardMaterial color={night ? '#1E3454' : '#3E8CA8'} roughness={0.95} />
      </mesh>
    </group>
  );
};

/** Bọt sóng dọc mép cát */
const Foam: React.FC<{ grid: GridData }> = ({ grid }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        if (grid.tiles[r][c] !== 'water') continue;
        const [x, z] = gridToWorld(c, r);
        if (grid.tiles[r - 1]?.[c] && grid.tiles[r - 1][c] !== 'water') out.push([x, z - 0.42, 0]);
        if (grid.tiles[r][c - 1] && grid.tiles[r][c - 1] !== 'water') out.push([x - 0.42, z, Math.PI / 2]);
      }
    return out;
  }, [grid]);
  useFrame(({ clock }) => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    cells.forEach(([x, z, ry], i) => {
      const s = 1 + Math.sin(clock.elapsedTime * 1.6 + x * 0.7 + z * 0.5) * 0.28;
      o.position.set(x, -0.085, z);
      o.rotation.set(0, ry, 0);
      o.scale.set(1, 1, s);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
      <boxGeometry args={[1, 0.02, 0.16]} />
      <meshStandardMaterial color="#FFFDF9" roughness={0.5} transparent opacity={0.88} />
    </instancedMesh>
  );
};

export const CityGround: React.FC<{ grid: GridData; night: boolean; onTile: (c: number, r: number) => void }> = ({
  grid,
  night,
  onTile,
}) => {
  const layers = useMemo(() => {
    const m = new Map<Exclude<TileKind, 'water'>, [number, number][]>();
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        const t = grid.tiles[r][c];
        if (t === 'water') continue;
        if (!m.has(t)) m.set(t, []);
        m.get(t)!.push([c, r]);
      }
    return [...m.entries()];
  }, [grid]);

  return (
    <group>
      {/* Bệ sa bàn gỗ óc chó nhiều tầng kiểu mô hình thu nhỏ Ghibli */}
      <mesh position={[0, BASE_Y - 0.35, 0]} receiveShadow>
        <boxGeometry args={[GRID + 0.65, 0.7, GRID + 0.65]} />
        <meshStandardMaterial color="#6B4F3A" roughness={0.85} />
      </mesh>
      <mesh position={[0, BASE_Y - 0.68, 0]}>
        <boxGeometry args={[GRID + 1.05, 0.14, GRID + 1.05]} />
        <meshStandardMaterial color="#523A28" roughness={0.8} />
      </mesh>
      {/* Viền chỉ đồng/gỗ sáng quanh mép trên sa bàn */}
      <mesh position={[0, BASE_Y - 0.02, 0]}>
        <boxGeometry args={[GRID + 0.78, 0.07, GRID + 0.78]} />
        <meshStandardMaterial color="#9C7654" roughness={0.75} />
      </mesh>
      {layers.map(([kind, cells]) => (
        <TileLayer key={kind} kind={kind} cells={cells} />
      ))}
      <RoadMarkings grid={grid} />
      <Water night={night} />
      <Foam grid={grid} />
      {/* Mặt phẳng nhận chạm (vô hình) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
        onClick={(e) => {
          e.stopPropagation();
          const c = Math.round(e.point.x + (GRID - 1) / 2);
          const r = Math.round(e.point.z + (GRID - 1) / 2);
          if (c >= 0 && c < GRID && r >= 0 && r < GRID) onTile(c, r);
        }}
      >
        <planeGeometry args={[GRID, GRID]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
};

export { ROAD_COLS, ROAD_ROWS };
