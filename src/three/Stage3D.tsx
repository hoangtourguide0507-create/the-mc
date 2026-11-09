import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, Html } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { getPlayerLook, NPCS } from '../data/content';
import { NpcMood, SceneData, StageMicPhase, VisemeType } from '../types/game';
import { useGameStore } from '../core/store';
import { ClayCharacter3D } from './ClayCharacter3D';
import { isGhibli } from './artStyle';

/** Sân khấu Ghibli: phông gradient ấm theo bối cảnh (ban ngày / hoàng hôn), đèn #FFE2A8, sàn gỗ */
const GHIBLI_STAGE: Record<string, { floor: string; wall: string; neon: string; spot: string; top: string; bottom: string }> = {
  cafe: { floor: '#DDBB92', wall: '#F2DEC0', neon: '#F2B84B', spot: '#FFE2A8', top: '#FFF1D6', bottom: '#F7D9B0' },
  market: { floor: '#CFE3BC', wall: '#D9EEC8', neon: '#A8D98A', spot: '#FFE2A8', top: '#CFEFFF', bottom: '#E8F6D8' },
  backstage: { floor: '#B49678', wall: '#E9D8C6', neon: '#C9B6E4', spot: '#FFE2A8', top: '#F7C6A0', bottom: '#B9D8F0' },
  wedding: { floor: '#F2E2D6', wall: '#F8E6EC', neon: '#F7B7C8', spot: '#FFE2A8', top: '#FBE3EA', bottom: '#CFE8F6' },
  beach: { floor: '#F0D7AE', wall: '#BFE6F2', neon: '#F2B84B', spot: '#FFE2A8', top: '#9FD8EE', bottom: '#FFE7B0' },
  gala: { floor: '#9C7E68', wall: '#F3E2B8', neon: '#FFE2A8', spot: '#FFE2A8', top: '#F7C6A0', bottom: '#B9D8F0' },
  talkshow: { floor: '#BE9B80', wall: '#CFE6F0', neon: '#8FD3E8', spot: '#FFE2A8', top: '#B9D8F0', bottom: '#FFF1D6' },
  room: { floor: '#D9B48A', wall: '#F5E6CC', neon: '#F7B7C8', spot: '#FFE2A8', top: '#F5E6CC', bottom: '#FBE3EA' },
  launch: { floor: '#CDAE8A', wall: '#D9EEF5', neon: '#3E9B94', spot: '#FFE2A8', top: '#9FD8EE', bottom: '#CFEFFF' },
};

/** Sóng âm pastel (hồng nhạt, vàng, xanh ngọc) thay cho cầu vồng neon */
const HOLO_GHIBLI = ['#F7B7C8', '#F9CFA0', '#F2B84B', '#A8E0D6', '#8FD3E8', '#F7B7C8', '#F9CFA0', '#A8E0D6', '#F2B84B', '#F7B7C8', '#8FD3E8'];

/** Dải gradient dọc làm phông (texture canvas nhỏ, tạo một lần cho mỗi bối cảnh) */
function gradientTexture(top: string, bottom: string) {
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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

    // Lùi camera theo tỉ lệ khung: khung hẹp (điện thoại dọc) cần đứng xa hơn để thấy đủ 2 nhân vật
    const aspect = state.size.width / Math.max(1, state.size.height);
    const fit = 3.9 / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * Math.min(aspect, 1.6));
    const baseZ = Math.max(4.15, fit);
    const focusZ = baseZ * 0.86;

    let targetX = 0;
    const targetY = 1.35 + (baseZ - 4.15) * 0.12;
    let targetZ = baseZ;

    if (npcSpeaking) {
      targetX = (npc.isCouple ? (speaker === 'liam' ? -0.35 : -0.95) : -0.55) * Math.min(1, aspect);
      targetZ = focusZ;
    } else if (micPhase === 'rec' || micPhase === 'arming') {
      targetX = 0.65 * Math.min(1, aspect);
      targetZ = focusZ;
    }

    const k = 1 - Math.exp(-3.5 * Math.min(dt, 0.1));
    cam.position.x += (targetX - cam.position.x) * k;
    cam.position.y += (targetY - cam.position.y) * k;
    cam.position.z += (targetZ - cam.position.z) * k;
    cam.lookAt(targetX * 0.4, 0.95, 0);

    // Animate 11 rainbow hologram bars
    if (waveGroupRef.current) {
      waveGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const base = npcSpeaking
          ? 0.35 + Math.abs(Math.sin(t * 12 + idx * 0.7)) * 0.85
          : 0.12 + Math.abs(Math.sin(t * 3 + idx * 0.5)) * 0.12;
        mesh.scale.y += (base - mesh.scale.y) * (1 - Math.exp(-15 * Math.min(dt, 0.1)));
      });
    }
  });

  const ghibliTheme = GHIBLI_STAGE[scene.art] ?? GHIBLI_STAGE.room;
  const backdropTex = useMemo(
    () => (isGhibli ? gradientTexture(ghibliTheme.top, ghibliTheme.bottom) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ghibliTheme.top, ghibliTheme.bottom]
  );

  // Theme colors by scene.art
  const theme = isGhibli ? ghibliTheme : {
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

  const rainbowColors = isGhibli ? HOLO_GHIBLI : [
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
      <ambientLight intensity={isGhibli ? 1.5 : 0.75} color={isGhibli ? '#FFF6E6' : '#F8FAFC'} />
      <directionalLight position={[3, 6, 4]} intensity={isGhibli ? 1.8 : 1.35} color={theme.spot} castShadow />
      <spotLight
        position={[-1.2, 4.2, 2.2]}
        angle={0.5}
        penumbra={0.7}
        intensity={npcSpeaking ? 3.2 : 1.5}
        color={isGhibli ? theme.spot : theme.neon}
        castShadow
      />
      <spotLight
        position={[1.2, 4.2, 2.2]}
        angle={0.5}
        penumbra={0.7}
        intensity={micPhase === 'rec' ? 3.4 : 1.5}
        color={isGhibli ? (micPhase === 'rec' ? '#FFF1C9' : '#FFE2A8') : micPhase === 'rec' ? '#22D3EE' : '#FF4FD8'}
        castShadow
      />

      {/* Stage Deck (Ghibli: nằm ngang để phông gradient hiện phía sau; neon giữ như cũ) */}
      <mesh rotation={isGhibli ? undefined : [-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.9, 4.1, 0.22, 48]} />
        <meshStandardMaterial color={theme.floor} roughness={0.35} metalness={isGhibli ? 0 : 0.2} />
      </mesh>

      {/* Neon Stage Rim Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]}>
        <ringGeometry args={[3.65, 3.74, 64]} />
        <meshBasicMaterial color={theme.neon} />
      </mesh>

      {/* Stage Backdrop & Theme Set Pieces */}
      <group position={[0, 1.65, -1.9]}>
        <mesh receiveShadow>
          <boxGeometry args={[8.4, 4.6, 0.2]} />
          {isGhibli && backdropTex ? (
            <meshStandardMaterial color="#FFFFFF" map={backdropTex} roughness={0.9} />
          ) : (
            <meshStandardMaterial color={theme.wall} roughness={0.65} />
          )}
        </mesh>

        {/* Neon Arch / Set Frame (Ghibli: vòng pastel dịu) */}
        <mesh position={[0, -0.2, 0.14]}>
          <torusGeometry args={[1.65, 0.06, 12, 48, Math.PI]} />
          <meshStandardMaterial
            color={theme.neon}
            emissive={theme.neon}
            emissiveIntensity={isGhibli ? 0.5 : 1.4}
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
          <Html position={[0, 1.05, 0.18]} center zIndexRange={[20, 0]}>
            <div className="whitespace-nowrap rounded-lg border-2 border-ghibli-clay bg-ghibli-cream px-3 py-0.5 text-xs font-black tracking-widest text-[#9C3F22] shadow-[0_2px_0_#6B4E3D]">
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
                emissiveIntensity={isGhibli ? (npcSpeaking ? 0.9 : 0.35) : npcSpeaking ? 1.5 : 0.45}
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
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl shadow-2xl ${
        isGhibli ? 'border-2 border-ghibli-clay bg-[#F5E6CC]' : 'border border-white/15 bg-[#0D0620]'
      }`}
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: false, stencil: false }}
        camera={{ position: [0, 1.45, 4.15], fov: 36 }}
      >
        <StageSceneContent {...props} />
        {/* Neon arch, rainbow hologram bars and the spotlight cones glow; matte clay stays unaffected */}
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={isGhibli ? 1 : 0.85}
            luminanceSmoothing={0.2}
            intensity={isGhibli ? (props.npcSpeaking ? 0.3 : 0.15) : props.npcSpeaking ? 0.9 : 0.6}
          />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
