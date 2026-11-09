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
  material.emissiveIntensity = night ? 0.06 : 0.36;

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
        puffs.push({
          p: [t * 7 + (rnd() - 0.5), Math.sin((t + 0.5) * Math.PI) * 1.6 + rnd() * 0.6, (rnd() - 0.5) * 2],
          s: 1.4 + Math.sin((t + 0.5) * Math.PI) * 1.4 + rnd() * 0.5,
        });
      }
      out.push({ pos: [Math.cos(a) * r, low ? -2.5 - rnd() * 5 : 3 + rnd() * 4, Math.sin(a) * r], puffs, speed: 0.15 + rnd() * 0.2 });
    }
    return { geo, out };
  }, []);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.0045;
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

/** Bụi cỏ mọc trên ô cỏ / công viên (1 draw call), rì rào theo làn gió bằng Vertex Shader (0 tốn CPU) */
export const GrassTufts: React.FC<{ grid: GridData }> = ({ grid }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const timeUniform = useMemo(() => ({ value: 0 }), []);

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

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.95 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeUniform;
      shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'float heightMask = clamp(position.y * 5.0, 0.0, 1.0);',
          'vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);',
          'float wave = sin(uTime * 2.2 + instPos.x * 0.65 + instPos.z * 0.45) * 0.055;',
          'transformed.x += wave * heightMask;',
          'transformed.z += cos(uTime * 1.8 + instPos.z * 0.55) * 0.035 * heightMask;',
        ].join('\n')
      );
    };
    m.customProgramCacheKey = () => 'ghibli-grass-wind';
    return m;
  }, [timeUniform]);

  useFrame(({ clock }) => {
    timeUniform.value = clock.elapsedTime;
  });

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
        const n = t === 'park' ? 5 : 3;
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

/**
 * Hạt môi trường Ghibli theo buổi (1 Draw Call):
 * - Ngày / Hoàng hôn: Cánh hoa anh đào hồng phấn & lá xanh bay lơ lửng theo chiều gió.
 * - Ban đêm: Đom đóm vàng ấm lập loè quanh công viên và khu vườn.
 */
export const GhibliAtmosphere: React.FC<{ night: boolean }> = ({ night }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 48;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    let seed = 4321;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: count }, (_, i) => ({
      x: (rnd() - 0.5) * 24,
      y: 0.4 + rnd() * 3.8,
      z: (rnd() - 0.5) * 24,
      speed: 0.45 + rnd() * 0.55,
      phase: rnd() * Math.PI * 2,
      dayColor: ['#F7B7C8', '#FFD8E4', '#A8D98A', '#FFF3C4'][i % 4],
      nightColor: i % 3 === 0 ? '#FFE7B0' : '#FFD58A',
    }));
  }, []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    []
  );

  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const col = new THREE.Color();
    particles.forEach((p, i) => {
      inst.setColorAt(i, col.set(night ? p.nightColor : p.dayColor));
    });
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [night, particles]);

  useFrame(({ clock }) => {
    const inst = ref.current;
    if (!inst) return;
    const t = clock.elapsedTime;
    particles.forEach((p, i) => {
      if (night) {
        // Đom đóm bay lượn chậm và nhấp nháy nhẹ
        const x = p.x + Math.sin(t * p.speed + p.phase) * 0.7;
        const y = 0.35 + Math.abs(Math.sin(t * p.speed * 0.7 + p.phase)) * 1.9;
        const z = p.z + Math.cos(t * p.speed * 0.8 + p.phase) * 0.7;
        const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3.2 + p.phase));
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(pulse * 0.9);
      } else {
        // Cánh hoa & lá trôi theo gió mùa hè
        const driftX = ((p.x + 13 + t * p.speed * 0.85) % 26) - 13;
        const driftY = 3.8 - ((p.y + t * p.speed * 0.38) % 3.5);
        const driftZ = p.z + Math.sin(t * 1.2 + p.phase) * 0.65;
        dummy.position.set(driftX, driftY, driftZ);
        dummy.rotation.set(t * 1.4 + p.phase, t * 1.1, Math.sin(t + p.phase) * 0.6);
        dummy.scale.set(1.1, 0.35, 0.85);
      }
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, mat, count]}>
      <dodecahedronGeometry args={[0.042, 0]} />
    </instancedMesh>
  );
};

/** Đàn chim hải âu trắng lượn vòng chậm trên bầu trời ban ngày */
export const GhibliBirds: React.FC<{ night: boolean }> = ({ night }) => {
  const groupRef = useRef<THREE.Group>(null);
  const wingGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.08, 0.28, 3);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  const birdMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFDF7' }), []);

  useFrame(({ clock }) => {
    if (!groupRef.current || night) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.14;
    groupRef.current.position.y = 7.2 + Math.sin(t * 0.5) * 0.4;
  });

  if (night) return null;

  return (
    <group ref={groupRef} position={[2, 7.2, 4]}>
      {[
        [0, 0, 0],
        [-0.6, 0.18, -0.45],
        [0.55, 0.12, -0.5],
        [-1.1, 0.32, -0.95],
      ].map(([bx, by, bz], i) => (
        <group key={i} position={[bx, by, bz]}>
          <mesh geometry={wingGeo} material={birdMat} position={[-0.1, 0, 0]} rotation={[0, 0, 0.25]} />
          <mesh geometry={wingGeo} material={birdMat} position={[0.1, 0, 0]} rotation={[0, Math.PI, 0.25]} />
        </group>
      ))}
    </group>
  );
};

export const GHIBLI_LIGHT = GHIBLI;
