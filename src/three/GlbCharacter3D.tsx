import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { VisemeType } from '../types/game';

/**
 * Morph-target (BlendShape) names the optional .glb model may use for each mouth viseme.
 * Blender exports vary, so the lists are tried in order and every match is driven.
 * Adjust these to match the names inside your model.
 */
export const VISEME_MORPH_NAMES: Record<Exclude<VisemeType, 'rest'>, string[]> = {
  a: ['viseme_aa', 'jawOpen', 'mouthOpen', 'A'],
  e: ['viseme_E', 'mouthSmile', 'E'],
  o: ['viseme_O', 'mouthFunnel', 'O'],
  m: ['viseme_PP', 'mouthClose', 'M'],
};

/** Morph names used for blinking. Any that exist on the model get driven together. */
export const BLINK_MORPH_NAMES = ['eyesClosed', 'blink', 'eyeBlinkLeft', 'eyeBlinkRight'];

/** Target standing height in world units, matching the procedural clay character's scale. */
const TARGET_HEIGHT = 1.25;

export interface GlbCharacter3DProps {
  url: string;
  viseme: VisemeType;
  blinking: boolean;
  isWalking: boolean;
}

/**
 * Renders an external .glb character. Used only when LookConfig.glbUrl is set,
 * so the procedural clay character remains the default and needs no asset files.
 */
export const GlbCharacter3D: React.FC<GlbCharacter3DProps> = ({
  url,
  viseme,
  blinking,
  isWalking,
}) => {
  const gltf = useGLTF(url);
  const bodyRef = useRef<THREE.Group>(null);
  const weightsRef = useRef<Record<string, number>>({});

  // Clone so several characters can share one cached file, then normalise height and feet to y = 0
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) obj.castShadow = true;
    });
    const raw = new THREE.Box3().setFromObject(clone);
    const size = raw.getSize(new THREE.Vector3());
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    clone.scale.setScalar(s);
    const scaled = new THREE.Box3().setFromObject(clone);
    clone.position.y -= scaled.min.y;
    return clone;
  }, [gltf.scene]);

  // Index every morph target by name so each frame can write weights directly
  const morphTargets = useMemo(() => {
    const map = new Map<string, { mesh: THREE.Mesh; index: number }[]>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        const list = map.get(name) ?? [];
        list.push({ mesh, index });
        map.set(name, list);
      }
    });
    return map;
  }, [scene]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 18); // same smoothing speed as the procedural mouth

    const targets: Record<string, number> = {};
    for (const key of ['a', 'e', 'o', 'm'] as const) {
      for (const name of VISEME_MORPH_NAMES[key]) {
        targets[name] = viseme === key ? 1 : 0;
      }
    }
    for (const name of BLINK_MORPH_NAMES) targets[name] = blinking ? 1 : 0;

    for (const [name, target] of Object.entries(targets)) {
      const cur = weightsRef.current[name] ?? 0;
      const next = cur + (target - cur) * k;
      weightsRef.current[name] = next;
      morphTargets.get(name)?.forEach(({ mesh, index }) => {
        if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = next;
      });
    }

    if (bodyRef.current) {
      bodyRef.current.position.y = isWalking ? Math.abs(Math.sin(t * 13)) * 0.09 : 0;
    }
  });

  return (
    <group ref={bodyRef}>
      <primitive object={scene} />
    </group>
  );
};
