import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getPlayerLook } from '../data/content';
import { getPeriodMeta } from '../core/clock';
import { useGameStore } from '../core/store';
import { ClayCharacter3D } from './ClayCharacter3D';
import { GHIBLI, ghibliSky, isGhibli } from './artStyle';

/* Chip nhãn 2D trong phòng: kem + viền clay, không blur; vùng chạm tối thiểu 48px (STYLE_GHIBLI mục 4) */
const LABEL_CHIP = 'rounded-full border-2 border-ghibli-clay bg-ghibli-cream px-3 py-1 text-xs font-bold text-ghibli-ink shadow-[0_2px_0_#6B4E3D]';
const LABEL_HIT = 'flex min-h-[48px] min-w-[48px] items-center justify-center px-1 transition hover:scale-105 active:scale-95';

const StudioRoomScene: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const setBookOpen = useGameStore((s) => s.setBookOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const openWorldWithTarget = useGameStore((s) => s.openWorldWithTarget);

  const periodMeta = getPeriodMeta(state.clock);
  const playerLook = getPlayerLook(state.items);
  // Cửa sổ theo buổi: ghibli dùng màu trời mới; neon giữ màu cũ
  const windowColor = ghibliSky(periodMeta.id)?.top ?? periodMeta.skyBottom;

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

  const lift = isGhibli ? (periodMeta.isNight ? 1.2 : 1.7) : 1;

  const spotRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    if (spotRef.current) {
      spotRef.current.position.x = Math.sin(clock.elapsedTime * 0.7) * 1.2;
    }
  });

  return (
    <group position={[0, -0.85, 0]}>
      {/* Dynamic Lighting matching Time of Day */}
      {/* Ghibli: nâng ánh sáng để tường kem hiện đúng màu; ban đêm giữ tối hơn */}
      <ambientLight intensity={periodMeta.ambientIntensity * 0.85 * lift} color={isGhibli ? '#FFF6E6' : '#EDE9FE'} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={periodMeta.sunIntensity * (isGhibli ? (periodMeta.isNight ? 1.2 : 1.5) : 1)}
        color={periodMeta.sunColor}
        castShadow
      />
      <spotLight
        ref={spotRef}
        position={[0, 4.2, 2.2]}
        angle={0.55}
        penumbra={0.8}
        intensity={2.2}
        color={isGhibli ? '#FFE2A8' : '#FF4FD8'}
        castShadow
      />
      <pointLight position={[-2.4, 2.2, -1.2]} intensity={1.4} color={isGhibli ? '#CFEFFF' : '#22D3EE'} />

      {/* Studio Floor (Ghibli: nằm ngang để tường kem phía sau hiện ra; neon giữ như cũ) */}
      <mesh rotation={isGhibli ? undefined : [-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.4, 3.6, 0.18, 48]} />
        <meshStandardMaterial color={isGhibli ? GHIBLI.wood : '#1E1646'} roughness={0.35} metalness={isGhibli ? 0 : 0.15} />
      </mesh>

      {/* Glowing Center Stage Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0.2]} receiveShadow>
        <circleGeometry args={[1.45, 36]} />
        <meshStandardMaterial color={isGhibli ? '#E8C9A0' : '#311B6B'} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.105, 0.2]}>
        <ringGeometry args={[1.42, 1.48, 48]} />
        <meshBasicMaterial color={isGhibli ? '#F2B84B' : '#FF4FD8'} />
      </mesh>

      {/* Back Curved Studio Wall */}
      <mesh position={[0, 1.65, -2.1]} receiveShadow>
        <boxGeometry args={[5.8, 3.3, 0.22]} />
        <meshStandardMaterial color={isGhibli ? GHIBLI.wallCream : '#170F3A'} roughness={0.7} />
      </mesh>

      {/* Window Looking Out to City Sky (Real-Time Period Color) */}
      <group position={[-1.55, 1.85, -1.95]}>
        <mesh>
          <boxGeometry args={[1.55, 1.35, 0.08]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
        {/* Window Frame: nằm sau kính để viền bao quanh, không che mất bầu trời */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[1.65, 1.45, 0.04]} />
          <meshStandardMaterial color={isGhibli ? '#8A6A4E' : '#312E81'} roughness={0.4} />
        </mesh>
        <Html position={[0, -0.52, 0.06]} center zIndexRange={[20, 0]}>
          <div className={`pointer-events-none whitespace-nowrap ${LABEL_CHIP} py-0.5`}>
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
              color={isGhibli ? '#FFF8EC' : '#1E1B4B'}
              emissive={isGhibli ? '#F2B84B' : '#FF4FD8'}
              emissiveIntensity={isGhibli ? 0.25 : 0.45}
            />
          </mesh>
          <Html position={[0, 0, 0.06]} center zIndexRange={[20, 0]}>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-lg border-2 border-ghibli-clay bg-ghibli-cream px-3 py-1 font-display text-sm font-extrabold tracking-wider text-ghibli-ink shadow-[0_2px_0_#6B4E3D]">
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
          <meshStandardMaterial color={isGhibli ? '#A0785A' : '#4C1D95'} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.46, 0.08, 0.34]} />
          <meshStandardMaterial color={isGhibli ? '#8FD3E8' : '#22D3EE'} emissive={isGhibli ? '#8FD3E8' : '#22D3EE'} emissiveIntensity={0.35} />
        </mesh>
        <Html position={[0, 0.75, 0]} center zIndexRange={[20, 0]}>
          <button onClick={() => setBookOpen(true)} className={LABEL_HIT}>
            <span className={`whitespace-nowrap ${LABEL_CHIP}`}>📖 Sổ Tay {state.weak.length > 0 ? `(${state.weak.length} từ yếu)` : ''}</span>
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
          <meshStandardMaterial color={isGhibli ? '#8A6A4E' : '#311042'} roughness={0.3} metalness={isGhibli ? 0 : 0.3} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <octahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial
            color={state.items.goldmic ? '#FBBF24' : isGhibli ? '#F7B7C8' : '#FF4FD8'}
            emissive={state.items.goldmic ? '#F59E0B' : isGhibli ? '#F7B7C8' : '#FF4FD8'}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Nhãn neo ở góc phải của điểm (không căn giữa) để không tràn mép phải khung 390px */}
        <Html position={[0, 0.98, 0]} zIndexRange={[20, 0]}>
          <button onClick={() => setShopOpen(true)} className={`${LABEL_HIT} w-max -translate-x-full -translate-y-1/2`}>
            <span className={`whitespace-nowrap text-center leading-tight ${LABEL_CHIP}`}>
              🛍️ Cửa Hàng
              <br />& Trang Bị
            </span>
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
        <div className="pointer-events-none whitespace-nowrap rounded-2xl border-2 border-ghibli-clay bg-ghibli-cream px-3 py-1 text-sm font-bold text-ghibli-ink shadow-[0_2px_0_#6B4E3D]">
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
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl shadow-2xl ${
        isGhibli ? 'border-2 border-ghibli-clay bg-gradient-to-b from-[#BFE3F2] to-[#F5E6CC]' : 'border border-white/15 bg-gradient-to-b from-[#1D1147] to-[#0E0725]'
      }`}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.35, 3.85], fov: 38 }}
        gl={isGhibli ? { toneMapping: THREE.NeutralToneMapping } : undefined}
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
