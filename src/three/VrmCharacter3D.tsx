/**
 * Nhân vật mô hình VRM (tạo bằng VRoid Studio) — dùng khi look.vrmUrl có giá trị.
 * - Khẩu hình: a→aa, e→ee, o→oh, m→ngậm; chớp mắt tự nhiên; cảm xúc happy / surprised / relaxed
 * - Hạ tay khỏi tư thế chữ T, thở nhẹ, gật đầu khi nói, vung tay chân khi đi
 * File .vrm đặt trong public/vrm/ (ví dụ public/vrm/mc.vrm → vrmUrl: 'vrm/mc.vrm').
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { NpcMood, VisemeType } from '../types/game';

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

const VISEME_KEYS = ['aa', 'ee', 'oh', 'ih', 'ou'] as const;

export const VrmCharacter3D: React.FC<{
  url: string;
  mood: NpcMood;
  viseme: VisemeType;
  isWalking: boolean;
  isSpeaking: boolean;
  rotationY: number;
}> = ({ url, mood, viseme, isWalking, isSpeaking, rotationY }) => {
  const full = useMemo(() => (url.startsWith('http') || url.startsWith('/') ? url : `${import.meta.env.BASE_URL}${url}`), [url]);
  const gltf = useLoader(GLTFLoader, full, (loader) => {
    (loader as GLTFLoader).register((parser) => new VRMLoaderPlugin(parser));
  });
  const vrm = gltf.userData.vrm as VRM;
  const group = useRef<THREE.Group>(null);
  const blink = useRef({ next: 2, t: 0 });

  useEffect(() => {
    if (!vrm) return;
    VRMUtils.rotateVRM0(vrm); // VRM 0.x quay mặt về +Z như VRM 1.0
    vrm.scene.traverse((o) => {
      o.frustumCulled = false;
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [vrm]);

  useFrame((state, rawDt) => {
    if (!vrm) return;
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const h = vrm.humanoid;
    const bone = (n: Parameters<typeof h.getNormalizedBoneNode>[0]) => h.getNormalizedBoneNode(n);

    if (group.current) {
      let d = rotationY - group.current.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      group.current.rotation.y += d * (1 - Math.exp(-10 * dt));
    }

    const lUA = bone('leftUpperArm');
    const rUA = bone('rightUpperArm');
    const lLA = bone('leftLowerArm');
    const rLA = bone('rightLowerArm');
    const lUL = bone('leftUpperLeg');
    const rUL = bone('rightUpperLeg');
    const lLL = bone('leftLowerLeg');
    const rLL = bone('rightLowerLeg');
    const spine = bone('spine');
    const head = bone('head');
    const hips = bone('hips');

    const walk = isWalking ? Math.sin(t * 9) : 0;
    const wave = mood === 'happy' && !isWalking;
    if (lUA) {
      lUA.rotation.z = damp(lUA.rotation.z, wave ? -0.2 + Math.sin(t * 10) * 0.25 : -1.15, 10, dt);
      lUA.rotation.x = damp(lUA.rotation.x, isWalking ? walk * 0.5 : 0, 10, dt);
    }
    if (rUA) {
      rUA.rotation.z = damp(rUA.rotation.z, 1.15, 10, dt);
      rUA.rotation.x = damp(rUA.rotation.x, isWalking ? -walk * 0.5 : isSpeaking ? -0.3 + Math.sin(t * 5) * 0.12 : 0, 10, dt);
    }
    if (lLA) lLA.rotation.z = damp(lLA.rotation.z, wave ? -1.2 : -0.15, 10, dt);
    if (rLA) rLA.rotation.z = damp(rLA.rotation.z, 0.15, 10, dt);
    if (lUL) lUL.rotation.x = damp(lUL.rotation.x, -walk * 0.55, 14, dt);
    if (rUL) rUL.rotation.x = damp(rUL.rotation.x, walk * 0.55, 14, dt);
    if (lLL) lLL.rotation.x = damp(lLL.rotation.x, isWalking ? Math.max(0, walk) * 0.6 : 0, 14, dt);
    if (rLL) rLL.rotation.x = damp(rLL.rotation.x, isWalking ? Math.max(0, -walk) * 0.6 : 0, 14, dt);
    if (hips) hips.position.y = isWalking ? Math.abs(walk) * 0.02 : 0;
    if (spine) spine.rotation.x = Math.sin(t * 2.2) * 0.015;
    if (head) {
      const tiltZ = mood === 'listening' ? 0.18 : mood === 'confused' ? -0.18 : Math.sin(t * 1.2) * 0.03;
      head.rotation.z = damp(head.rotation.z, tiltZ, 8, dt);
      head.rotation.x = damp(head.rotation.x, isSpeaking ? Math.sin(t * 11) * 0.05 : 0, 8, dt);
    }

    const em = vrm.expressionManager;
    if (em) {
      // Chớp mắt
      const b = blink.current;
      b.t += dt;
      let blinkV = 0;
      if (b.t > b.next) {
        const p = (b.t - b.next) / 0.16;
        blinkV = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) {
          b.t = 0;
          b.next = 1.8 + Math.random() * 3.4;
        }
      }
      em.setValue('blink', mood === 'happy' ? 0 : blinkV);
      em.setValue('happy', mood === 'happy' ? 1 : 0);
      em.setValue('surprised', mood === 'confused' ? 0.7 : 0);
      em.setValue('relaxed', mood === 'listening' ? 0.5 : 0);
      const target: Record<string, number> = { aa: 0, ee: 0, oh: 0, ih: 0, ou: 0 };
      if (viseme === 'a') target.aa = 1;
      else if (viseme === 'e') target.ee = 0.9;
      else if (viseme === 'o') target.oh = 1;
      for (const k of VISEME_KEYS) {
        const cur = em.getValue(k) ?? 0;
        em.setValue(k, damp(cur, target[k], 24, dt));
      }
    }
    vrm.update(dt);
  });

  return (
    <group ref={group}>
      <primitive object={vrm.scene} />
    </group>
  );
};
