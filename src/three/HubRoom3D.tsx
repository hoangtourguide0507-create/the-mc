import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getPlayerLook } from '../data/content';
import { getPeriodMeta } from '../core/clock';
import { useGameStore } from '../core/store';
import { ClayCharacter3D } from './ClayCharacter3D';

const StudioRoomScene: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const setBookOpen = useGameStore((s) => s.setBookOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const openWorldWithTarget = useGameStore((s) => s.openWorldWithTarget);

  const periodMeta = getPeriodMeta(state.clock);
  const playerLook = getPlayerLook(state.items);

  const moodText =
    state.energy >= 70
      ? '⚡ Năng lượng tràn trề!'
      : state.energy >= 40
      ? '😊 Tinh thần ổn áp'
      : state.energy >= 20
      ? '😮‍💨 Hơi đuối sức rồi...'
      : '🪫 Hết pin! Cần nạp năng lượng!';

  const charMood =
    state.energy >= 70
      ? 'happy'
      : state.energy < 25
      ? 'confused'
      : 'idle';

  const spotRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    if (spotRef.current) {
      spotRef.current.position.x = Math.sin(clock.elapsedTime * 0.7) * 1.2;
    }
  });

  return (
    <group position={[0, -0.85, 0]}>
      {/* Dynamic Lighting matching Time of Day */}
      <ambientLight intensity={periodMeta.ambientIntensity * 0.85} color="#EDE9FE" />
      <directionalLight
        position={[4, 6, 4]}
        intensity={periodMeta.sunIntensity}
        color={periodMeta.sunColor}
        castShadow
      />
      <spotLight
        ref={spotRef}
        position={[0, 4.2, 2.2]}
        angle={0.55}
        penumbra={0.8}
        intensity={2.2}
        color="#FF4FD8"
        castShadow
      />
      <pointLight position={[-2.4, 2.2, -1.2]} intensity={1.4} color="#22D3EE" />

      {/* Studio Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.4, 3.6, 0.18, 48]} />
        <meshStandardMaterial color="#1E1646" roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Glowing Center Stage Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0.2]} receiveShadow>
        <circleGeometry args={[1.45, 36]} />
        <meshStandardMaterial color="#311B6B" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.105, 0.2]}>
        <ringGeometry args={[1.42, 1.48, 48]} />
        <meshBasicMaterial color="#FF4FD8" />
      </mesh>

      {/* Back Curved Studio Wall */}
      <mesh position={[0, 1.65, -2.1]} receiveShadow>
        <boxGeometry args={[5.8, 3.3, 0.22]} />
        <meshStandardMaterial color="#170F3A" roughness={0.7} />
      </mesh>

      {/* Window Looking Out to City Sky (Real-Time Period Color) */}
      <group position={[-1.55, 1.85, -1.95]}>
        <mesh>
          <boxGeometry args={[1.55, 1.35, 0.08]} />
          <meshBasicMaterial color={periodMeta.skyBottom} />
        </mesh>
        {/* Window Frame */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[1.65, 1.45, 0.04]} />
          <meshStandardMaterial color="#312E81" roughness={0.4} />
        </mesh>
        <Html position={[0, -0.52, 0.06]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {periodMeta.icon} {periodMeta.label}
          </div>
        </Html>
      </group>

      {/* Neon On-Air Wall Sign */}
      <Float speed={2} rotationIntensity={0.04} floatIntensity={0.08}>
        <group position={[0.1, 2.45, -1.92]}>
          <mesh>
            <boxGeometry args={[1.7, 0.46, 0.08]} />
            <meshStandardMaterial
              color="#1E1B4B"
              emissive="#FF4FD8"
              emissiveIntensity={0.45}
            />
          </mesh>
          <Html position={[0, 0, 0.06]} center zIndexRange={[20, 0]}>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-lg border border-pink-400/60 bg-[#120A30]/90 px-3 py-1 font-display text-xs font-extrabold tracking-wider text-pink-300 shadow-[0_0_15px_#FF4FD8]">
              🎙️ MC THIÊN ÂN STUDIO
            </div>
          </Html>
        </group>
      </Float>

      {/* Left Prop: Interactive Phrasebook Desk */}
      <group
        position={[-1.75, 0.45, 0.1]}
        rotation={[0, 0.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setBookOpen(true);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.72, 0.55]} />
          <meshStandardMaterial color="#4C1D95" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.46, 0.08, 0.34]} />
          <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.35} />
        </mesh>
        <Html position={[0, 0.75, 0]} center zIndexRange={[20, 0]}>
          <button
            onClick={() => setBookOpen(true)}
            className=" whitespace-nowrap rounded-full border border-cyan-400/50 bg-[#120A30]/85 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200 shadow-lg transition hover:scale-105"
          >
            📖 Sổ Tay {state.weak.length > 0 ? `(${state.weak.length} từ yếu)` : ''}
          </button>
        </Html>
      </group>

      {/* Right Prop: Interactive Upgrade Showcase Stand */}
      <group
        position={[1.75, 0.55, 0.05]}
        rotation={[0, -0.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setShopOpen(true);
        }}
      >
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.48, 0.9, 24]} />
          <meshStandardMaterial color="#311042" roughness={0.3} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <octahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial
            color={state.items.goldmic ? '#FBBF24' : '#FF4FD8'}
            emissive={state.items.goldmic ? '#F59E0B' : '#FF4FD8'}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <Html position={[0, 0.98, 0]} center zIndexRange={[20, 0]}>
          <button
            onClick={() => setShopOpen(true)}
            className="whitespace-nowrap rounded-full border border-amber-400/50 bg-[#120A30]/85 px-2.5 py-0.5 text-[10px] font-bold text-amber-200 shadow-lg transition hover:scale-105"
          >
            🛍️ Cửa Hàng & Trang Bị
          </button>
        </Html>
      </group>

      {/* Center: 3D MC Thiên Ân Character */}
      <ClayCharacter3D
        look={playerLook}
        mood={charMood}
        position={[0, 0.1, 0.25]}
        scale={1.08}
        highlightRing
        onClick={() => openWorldWithTarget('home')}
      />

      {/* Mood Speech Bubble above MC */}
      <Html position={[0, 2.18, 0.25]} center zIndexRange={[20, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-2xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white shadow-xl backdrop-blur-md">
          {moodText}
        </div>
      </Html>

      <ContactShadows
        position={[0, 0.11, 0]}
        opacity={0.5}
        scale={7}
        blur={2.2}
        far={3}
      />
    </group>
  );
};

/** Lùi camera khi khung hẹp (iPhone dọc) để thấy đủ cả phòng, không cắt nhãn */
const FitRoomCamera: React.FC = () => {
  const { camera, size, controls } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const need = 4.6 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * Math.min(aspect, 1.5));
    const z = Math.max(3.85, need);
    camera.position.set(0, 1.35 * (z / 3.85), z);
    camera.lookAt(0, 0, 0);
    (controls as any)?.target?.set(0, 0, 0);
    (controls as any)?.update?.();
  }, [camera, size.width, size.height, controls]);
  return null;
};

export const HubRoom3D: React.FC = () => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#1D1147] to-[#0E0725] shadow-2xl">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.35, 3.85], fov: 38 }}
      >
        <StudioRoomScene />
        <FitRoomCamera />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-Math.PI / 5}
          maxAzimuthAngle={Math.PI / 5}
        />
      </Canvas>
    </div>
  );
};
