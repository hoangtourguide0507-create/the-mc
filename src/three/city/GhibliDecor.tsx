import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GHIBLI } from '../artStyle';
import { GRID, GridData, gridToWorld } from './cityMap';

/** Mây bông lớn trôi chậm quanh sa bàn — dấu ấn bầu trời Ghibli */
export const GhibliClouds: React.FC<{ night: boolean }> = ({ night }) => {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: new THREE.Color('#FFF6EA'),
        emissiveIntensity: 0.35,
        roughness: 1,
        fog: false,
      }),
    []
  );
  material.color.set(night ? '#4A4E7A' : '#FFFFFF');
  material.emissiveIntensity = night ? 0.05 : 0.35;

  const clouds = useMemo(() => {
    let seed = 99;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const out: { pos: [number, number, number]; puffs: { p: [number, number, number]; s: number }[]; speed: number }[] = [];
    // 14 đám mây thấp dưới mép sa bàn (thành phố như nổi trên biển mây) + 6 đám cao
    for (let i = 0; i < 20; i++) {
      const low = i < 14;
      const a = (i / (low ? 14 : 6)) * Math.PI * 2 + rnd() * 0.4;
      const r = low ? 19 + rnd() * 14 : 24 + rnd() * 10;
      const puffs: { p: [number, number, number]; s: number }[] = [];
      const n = 6 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1) - 0.5;
        puffs.push({ p: [t * 7 + (rnd() - 0.5), Math.sin((t + 0.5) * Math.PI) * 1.6 + rnd() * 0.6, (rnd() - 0.5) * 2], s: 1.4 + Math.sin((t + 0.5) * Math.PI) * 1.4 + rnd() * 0.5 });
      }
      out.push({ pos: [Math.cos(a) * r, low ? -2.5 - rnd() * 5 : 3 + rnd() * 4, Math.sin(a) * r], puffs, speed: 0.15 + rnd() * 0.2 });
    }
    return { geo, out };
  }, []);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={group}>
      {clouds.out.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, Math.atan2(c.pos[0], c.pos[2]) + Math.PI / 2, 0]}>
          {c.puffs.map((p, k) => (
            <mesh key={k} geometry={clouds.geo} material={material} position={p.p} scale={[p.s, p.s * 0.78, p.s * 0.85]} />
          ))}
        </group>
      ))}
    </group>
  );
};

/** Bụi cỏ mọc trên ô cỏ / công viên (1 draw call), lay nhẹ theo gió */
export const GrassTufts: React.FC<{ grid: GridData }> = ({ grid }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    // Một bụi = 5 lá cỏ hình nón mảnh xoè ra
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.ConeGeometry(0.022, 0.16 + (i % 3) * 0.04, 4);
      g.translate(0, 0.09, 0);
      g.rotateZ((i - 2) * 0.22);
      g.rotateY((i / 5) * Math.PI * 2);
      parts.push(g.toNonIndexed());
    }
    const merged = new THREE.BufferGeometry();
    const pos: number[] = [];
    const nrm: number[] = [];
    for (const p of parts) {
      pos.push(...(p.getAttribute('position').array as Float32Array));
      nrm.push(...(p.getAttribute('normal').array as Float32Array));
    }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    return merged;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1 }), []);

  const items = useMemo(() => {
    let seed = 1234;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const out: { x: number; z: number; s: number; ry: number; c: string }[] = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        const t = grid.tiles[r][c];
        if (t !== 'grass' && t !== 'park') continue;
        const [x, z] = gridToWorld(c, r);
        const n = t === 'park' ? 4 : 3;
        for (let k = 0; k < n; k++)
          out.push({
            x: x + (rnd() - 0.5) * 0.85,
            z: z + (rnd() - 0.5) * 0.85,
            s: 0.8 + rnd() * 0.7,
            ry: rnd() * Math.PI,
            c: ['#6FA845', '#86BF57', '#5E9A3C', '#9CCB62'][Math.floor(rnd() * 4)],
          });
      }
    return out;
  }, [grid]);

  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, 0.06, it.z);
      o.rotation.set(0, it.ry, 0);
      o.scale.setScalar(it.s);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      inst.setColorAt(i, col.set(it.c));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [items]);

  return <instancedMesh ref={ref} args={[geo, material, items.length]} receiveShadow />;
};

export const GHIBLI_LIGHT = GHIBLI;
