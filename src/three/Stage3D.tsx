import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, Html } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getPlayerLook, NPCS } from '../data/content';
import { NpcMood, SceneData, StageMicPhase, VisemeType } from '../types/game';
import { useGameStore } from '../core/store';
import { ClayCharacter3D } from './ClayCharacter3D';

export interface Stage3DProps {
  scene: SceneData;
  npcId: string;
  speaker?: 'emma' | 'liam';
  npcMood: NpcMood;
  npcViseme: VisemeType;
  npcSpeaking: boolean;
  micPhase: StageMicPhase;
  playerViseme: VisemeType;
  channel?: 'inear';
}

const StageSceneContent: React.FC<Stage3DProps> = ({
  scene,
  npcId,
  speaker,
  npcMood,
  npcViseme,
  npcSpeaking,
  micPhase,
  playerViseme,
  channel,
}) => {
  const items = useGameStore((s) => s.state.items);
  const playerLook = getPlayerLook(items);
  const npc = NPCS[npcId] || NPCS.leo;

  const waveGroupRef = useRef<THREE.Group>(null);

  // Dynamic Camera Dolly & Focus + 3D Rainbow Waveform animation
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera;

    let targetX = 0;
    let targetY = 1.45;
    let targetZ = 4.15;

    if (npcSpeaking) {
      targetX = npc.isCouple ? (speaker === 'liam' ? -0.35 : -0.95) : -0.55;
      targetZ = 3.65;
    } else if (micPhase === 'rec' || micPhase === 'arming') {
      targetX = 0.65;
      targetZ = 3.65;
    }

    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX, dt * 3.5);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY, dt * 3.5);
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetZ, dt * 3.5);
    cam.lookAt(targetX * 0.4, 1.05, 0);

    // Animate 11 rainbow hologram bars
    if (waveGroupRef.current) {
      waveGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const base = npcSpeaking
          ? 0.35 + Math.abs(Math.sin(t * 12 + idx * 0.7)) * 0.85
          : 0.12 + Math.abs(Math.sin(t * 3 + idx * 0.5)) * 0.12;
        mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, base, dt * 15);
      });
    }
  });

  // Theme colors by scene.art
  const theme = {
    cafe: { floor: '#2E1C14', wall: '#432818', neon: '#F59E0B', spot: '#FDE68A' },
    market: { floor: '#064E3B', wall: '#065F46', neon: '#10B981', spot: '#A7F3D0' },
    backstage: { floor: '#18181B', wall: '#27272A', neon: '#A855F7', spot: '#D8B4FE' },
    wedding: { floor: '#4C1D95', wall: '#2E1065', neon: '#EC4899', spot: '#FBCFE8' },
    beach: { floor: '#B45309', wall: '#7C2D12', neon: '#06B6D4', spot: '#FDE047' },
    gala: { floor: '#311042', wall: '#1E1B4B', neon: '#EAB308', spot: '#FEF08A' },
    talkshow: { floor: '#0F172A', wall: '#1E293B', neon: '#3B82F6', spot: '#BAE6FD' },
    room: { floor: '#1E1646', wall: '#170F3A', neon: '#FF4FD8', spot: '#FBCFE8' },
    launch: { floor: '#0F172A', wall: '#1E293B', neon: '#22D3EE', spot: '#A5F3FC' },
  }[scene.art] || { floor: '#1E1646', wall: '#170F3A', neon: '#FF4FD8', spot: '#FBCFE8' };

  const rainbowColors = [
    '#FF4FD8',
    '#EC4899',
    '#A855F7',
    '#6366F1',
    '#3B82F6',
    '#22D3EE',
    '#10B981',
    '#7CFF6B',
    '#FACC15',
    '#FB923C',
    '#F43F5E',
  ];

  return (
    <group position={[0, -0.75, 0]}>
      <ambientLight intensity={0.75} color="#F8FAFC" />
      <directionalLight position={[3, 6, 4]} intensity={1.35} color={theme.spot} castShadow />
      <spotLight
        position={[-1.2, 4.2, 2.2]}
        angle={0.5}
        penumbra={0.7}
        intensity={npcSpeaking ? 3.2 : 1.5}
        color={theme.neon}
        castShadow
      />
      <spotLight
        position={[1.2, 4.2, 2.2]}
        angle={0.5}
        penumbra={0.7}
        intensity={micPhase === 'rec' ? 3.4 : 1.5}
        color={micPhase === 'rec' ? '#22D3EE' : '#FF4FD8'}
        castShadow
      />

      {/* Stage Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.9, 4.1, 0.22, 48]} />
        <meshStandardMaterial color={theme.floor} roughness={0.35} metalness={0.2} />
      </mesh>

      {/* Neon Stage Rim Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]}>
        <ringGeometry args={[3.65, 3.74, 64]} />
        <meshBasicMaterial color={theme.neon} />
      </mesh>

      {/* Stage Backdrop & Theme Set Pieces */}
      <group position={[0, 1.65, -1.9]}>
        <mesh receiveShadow>
          <boxGeometry args={[6.8, 3.4, 0.2]} />
          <meshStandardMaterial color={theme.wall} roughness={0.65} />
        </mesh>

        {/* Neon Arch / Set Frame */}
        <mesh position={[0, -0.2, 0.14]}>
          <torusGeometry args={[1.65, 0.06, 12, 48, Math.PI]} />
          <meshStandardMaterial
            color={theme.neon}
            emissive={theme.neon}
            emissiveIntensity={1.4}
          />
        </mesh>

        {/* Scene Specific 3D Props */}
        {scene.art === 'wedding' && (
          <group position={[0, 0.9, 0.2]}>
            <mesh>
              <sphereGeometry args={[0.35, 16, 16]} />
              <meshStandardMaterial color="#FBCFE8" emissive="#EC4899" emissiveIntensity={0.6} />
            </mesh>
          </group>
        )}
        {scene.art === 'beach' && (
          <mesh position={[0, 0.2, 0.11]}>
            <circleGeometry args={[1.1, 32]} />
            <meshBasicMaterial color="#FB923C" />
          </mesh>
        )}
        {scene.art === 'talkshow' && (
          <Html position={[0, 1.05, 0.18]} center distanceFactor={7}>
            <div className="rounded-lg border border-red-400 bg-red-950/90 px-3 py-0.5 text-xs font-black tracking-widest text-red-200 shadow-[0_0_16px_#EF4444]">
              🔴 ON AIR · LIVE TV
            </div>
          </Html>
        )}
      </group>

      {/* 3D Hologram Rainbow Waveform in Center of Stage */}
      <Float speed={2.5} rotationIntensity={0.05} floatIntensity={0.12}>
        <group ref={waveGroupRef} position={[0, 1.45, -0.45]}>
          {rainbowColors.map((col, idx) => (
            <mesh key={idx} position={[(idx - 5) * 0.11, 0, 0]}>
              <capsuleGeometry args={[0.028, 0.35, 8, 12]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={npcSpeaking ? 1.5 : 0.45}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* LEFT SIDE: NPC(s) in 3D */}
      {npc.isCouple && npc.coupleLooks ? (
        <group position={[-0.95, 0.11, 0.2]} rotation={[0, 0.28, 0]}>
          {/* Emma (Bride) */}
          <ClayCharacter3D
            look={npc.coupleLooks.emma}
            mood={speaker !== 'liam' ? npcMood : 'idle'}
            viseme={speaker !== 'liam' && npcSpeaking ? npcViseme : 'rest'}
            isSpeaking={speaker !== 'liam' && npcSpeaking}
            position={[-0.42, 0, 0]}
            scale={0.96}
            nameTag="Emma 👰"
            highlightRing={speaker !== 'liam'}
          />
          {/* Liam (Groom) */}
          <ClayCharacter3D
            look={npc.coupleLooks.liam}
            mood={speaker === 'liam' ? npcMood : 'idle'}
            viseme={speaker === 'liam' && npcSpeaking ? npcViseme : 'rest'}
            isSpeaking={speaker === 'liam' && npcSpeaking}
            position={[0.42, 0, 0.08]}
            scale={0.98}
            nameTag="Liam 🤵"
            highlightRing={speaker === 'liam'}
          />
        </group>
      ) : (
        <group position={[-0.9, 0.11, 0.25]} rotation={[0, 0.32, 0]}>
          <ClayCharacter3D
            look={npc.look}
            mood={npcMood}
            viseme={npcSpeaking ? npcViseme : 'rest'}
            isSpeaking={npcSpeaking}
            scale={1.04}
            nameTag={`${npc.name}${channel === 'inear' ? ' 🎧 (In-ear)' : ''}`}
            highlightRing={npcSpeaking}
          />
        </group>
      )}

      {/* RIGHT SIDE: MC Thiên Ân (Player) in 3D */}
      <group position={[0.95, 0.11, 0.25]} rotation={[0, -0.32, 0]}>
        <ClayCharacter3D
          look={playerLook}
          mood={
            micPhase === 'rec'
              ? 'listening'
              : npcMood === 'happy'
              ? 'happy'
              : 'idle'
          }
          viseme={micPhase === 'rec' ? playerViseme : 'rest'}
          isSpeaking={micPhase === 'rec'}
          scale={1.04}
          nameTag="MC Thiên Ân 🎙️"
          highlightRing={micPhase === 'rec' || micPhase === 'arming'}
        />
      </group>

      <ContactShadows
        position={[0, 0.12, 0]}
        opacity={0.55}
        scale={8}
        blur={2}
        far={3}
      />
    </group>
  );
};

export const Stage3D: React.FC<Stage3DProps> = (props) => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-[#0D0620] shadow-2xl">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.45, 4.15], fov: 36 }}
      >
        <StageSceneContent {...props} />
        {/* Neon arch, rainbow hologram bars and the spotlight cones glow; matte clay stays unaffected */}
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            intensity={props.npcSpeaking ? 0.9 : 0.6}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
