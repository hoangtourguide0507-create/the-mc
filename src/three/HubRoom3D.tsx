import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { getPlayerLook } from '../data/content';
import { getPeriodMeta } from '../core/clock';
import { useGameStore } from '../core/storeReact';
import { ClayCharacter3D } from './ClayCharacter3D';
import { GHIBLI, ghibliSky } from './artStyle';

/* Chip nhãn 2D nổi trong phòng 3D: Cozy Modern Tactile */
const LABEL_CHIP =
  'rounded-2xl border border-[#D4B896] bg-[#FFFDF9]/95 px-3 py-1.5 text-xs font-extrabold text-ghibli-ink shadow-[0_3px_0_rgba(138,104,74,0.22),0_6px_14px_rgba(59,42,34,0.12)]';
const LABEL_HIT =
  'flex min-h-[48px] min-w-[48px] items-center justify-center px-1 transition hover:scale-105 active:scale-95';

let woodFloorTex: THREE.CanvasTexture | null = null;
function getWoodFloorTexture() {
  if (woodFloorTex) return woodFloorTex;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = GHIBLI.wood;
  g.fillRect(0, 0, 256, 256);

  // Ván sàn gỗ ấm áp kiểu Ghibli
  const tones = ['#C89A6B', '#BF9062', '#D1A476', '#B8895B'];
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    g.fillStyle = tones[row % tones.length];
    g.fillRect(0, y, 256, 31);
    g.strokeStyle = 'rgba(78, 48, 26, 0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    const joint = (row * 73) % 220 + 18;
    g.moveTo(joint, y);
    g.lineTo(joint, y + 32);
    g.stroke();
  }
  woodFloorTex = new THREE.CanvasTexture(cv);
  woodFloorTex.colorSpace = THREE.SRGBColorSpace;
  woodFloorTex.wrapS = woodFloorTex.wrapT = THREE.RepeatWrapping;
  woodFloorTex.repeat.set(2.5, 2.5);
  return woodFloorTex;
}

const skyWinCache = new Map<string, THREE.CanvasTexture>();
function getWindowSkyTexture(top: string, bottom: string, isNight: boolean) {
  const key = `${top}|${bottom}|${isNight}`;
  const hit = skyWinCache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);

  if (isNight) {
    // Sao đêm và trăng khuyết dịu ngoài cửa sổ
    g.fillStyle = '#FFF8D6';
    for (let i = 0; i < 24; i++) {
      const x = (i * 67 + 19) % 240;
      const y = (i * 43 + 15) % 160;
      g.beginPath();
      g.arc(x, y, (i % 2) + 1.2, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(195, 58, 22, 0, Math.PI * 2);
    g.fillStyle = '#FFE7B0';
    g.fill();
  } else {
    // Mây bông trắng kem trôi ngoài cửa sổ
    g.fillStyle = 'rgba(255, 252, 244, 0.85)';
    for (const [cx, cy, r] of [
      [65, 130, 28],
      [95, 122, 35],
      [128, 132, 25],
      [185, 85, 24],
      [210, 80, 30],
    ]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Bóng cây xanh / mái nhà thị trấn phía dưới cửa sổ
  g.fillStyle = isNight ? '#243052' : '#7DB86A';
  for (const [cx, cy, r] of [
    [30, 252, 42],
    [85, 256, 48],
    [155, 254, 40],
    [220, 250, 46],
  ]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  skyWinCache.set(key, t);
  return t;
}

/** Hạt bụi nắng lơ lửng trong phòng thu */
const RoomDustMotes: React.FC<{ night: boolean }> = ({ night }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 18;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 53) % 44) / 10 - 2.2,
        y: 0.4 + ((i * 37) % 22) / 10,
        z: ((i * 29) % 24) / 10 - 1.2,
        sp: 0.3 + (i % 4) * 0.12,
        ph: i * 1.3,
      })),
    []
  );

  useFrame(({ clock }) => {
    const inst = ref.current;
    if (!inst) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      dummy.position.set(
        s.x + Math.sin(t * s.sp + s.ph) * 0.14,
        0.35 + ((s.y + t * 0.08) % 2.2),
        s.z + Math.cos(t * s.sp + s.ph) * 0.12
      );
      dummy.scale.setScalar(0.6 + Math.sin(t * 1.8 + s.ph) * 0.25);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 8, 6]} />
      <meshBasicMaterial color={night ? '#CFEFFF' : '#FFF3C4'} transparent opacity={night ? 0.35 : 0.6} />
    </instancedMesh>
  );
};

const StudioRoomScene: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const setBookOpen = useGameStore((s) => s.setBookOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const openWorldWithTarget = useGameStore((s) => s.openWorldWithTarget);

  const periodMeta = getPeriodMeta(state.clock);
  const playerLook = getPlayerLook(state.items);
  const sky = ghibliSky(periodMeta.id);

  const floorTex = useMemo(() => getWoodFloorTexture(), []);
  const winTex = useMemo(
    () => getWindowSkyTexture(sky.top, sky.bottom, periodMeta.isNight),
    [sky.top, sky.bottom, periodMeta.isNight]
  );

  const moodText =
    state.energy >= 70
      ? '⚡ Năng lượng tràn trề!'
      : state.energy >= 40
      ? '😊 Tinh thần ổn áp'
      : state.energy >= 20
      ? '😮‍💨 Hơi đuối sức rồi...'
      : '🪫 Hết pin! Cần nạp năng lượng!';

  const charMood = state.energy >= 70 ? 'happy' : state.energy < 25 ? 'confused' : 'idle';
  const lift = periodMeta.isNight ? 1.25 : 1.7;

  const spotRef = useRef<THREE.SpotLight>(null);
  const trophyRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (spotRef.current) {
      spotRef.current.position.x = Math.sin(clock.elapsedTime * 0.7) * 1.1;
    }
    if (trophyRef.current) {
      trophyRef.current.rotation.y = clock.elapsedTime * 0.9;
    }
  });

  return (
    <group position={[0, -0.85, 0]}>
      {/* Ánh sáng phòng thu theo buổi trong ngày */}
      <ambientLight intensity={periodMeta.ambientIntensity * 0.85 * lift} color="#FFF6E6" />
      <hemisphereLight args={['#FFF8EC', '#C89A6B', periodMeta.isNight ? 0.35 : 0.6]} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={periodMeta.sunIntensity * (periodMeta.isNight ? 1.2 : 1.55)}
        color={periodMeta.sunColor}
        castShadow
      />
      <spotLight
        ref={spotRef}
        position={[0, 4.2, 2.2]}
        angle={0.55}
        penumbra={0.8}
        intensity={2.2}
        color="#FFE2A8"
        castShadow
      />
      <pointLight position={[-1.7, 1.5, 0.3]} intensity={periodMeta.isNight ? 1.6 : 0.8} color="#FFD58A" />

      {/* Sàn gỗ Studio + Viền gỗ sồi ấm */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.45, 3.65, 0.18, 56]} />
        <meshStandardMaterial map={floorTex} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.095, 0]}>
        <ringGeometry args={[3.32, 3.45, 56]} />
        <meshStandardMaterial color="#8A5E3B" roughness={0.65} />
      </mesh>

      {/* Thảm dệt tròn Ghibli ở tâm phòng */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0.2]} receiveShadow>
        <circleGeometry args={[1.48, 48]} />
        <meshStandardMaterial color="#EED2A8" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.104, 0.2]}>
        <ringGeometry args={[1.28, 1.38, 48]} />
        <meshStandardMaterial color="#C8643B" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.106, 0.2]}>
        <ringGeometry args={[1.42, 1.48, 48]} />
        <meshBasicMaterial color="#F2B84B" />
      </mesh>

      {/* Tường hậu Studio màu kem ấm + Chân tường ốp gỗ (Wainscoting) */}
      <group position={[0, 1.65, -2.1]}>
        <mesh receiveShadow>
          <boxGeometry args={[5.9, 3.35, 0.22]} />
          <meshStandardMaterial color={GHIBLI.wallCream} roughness={0.8} />
        </mesh>
        {/* Lamri gỗ chân tường */}
        <mesh position={[0, -1.2, 0.03]} receiveShadow>
          <boxGeometry args={[5.92, 0.85, 0.24]} />
          <meshStandardMaterial color="#B58459" roughness={0.65} />
        </mesh>
        {/* Phào chỉ gỗ ngang */}
        <mesh position={[0, -0.76, 0.05]}>
          <boxGeometry args={[5.95, 0.07, 0.26]} />
          <meshStandardMaterial color="#7C5132" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.64, 0.05]}>
          <boxGeometry args={[5.95, 0.09, 0.26]} />
          <meshStandardMaterial color="#7C5132" roughness={0.6} />
        </mesh>

        {/* Tấm tiêu âm gỗ & Bảng ghim lịch diễn ở góc phải tường */}
        <group position={[1.55, 0.25, 0.12]}>
          <RoundedBox args={[1.15, 0.85, 0.04]} radius={0.02} position={[0, 0, 0]}>
            <meshStandardMaterial color="#C89A6B" roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[1.0, 0.7]} />
            <meshStandardMaterial color="#E6C79C" roughness={0.9} />
          </mesh>
          {/* Giấy note ghim trên bảng */}
          {[
            [-0.28, 0.14, '#FFF8EC'],
            [0.02, 0.16, '#FBD27A'],
            [0.3, 0.1, '#BFE6F2'],
            [-0.15, -0.15, '#F7B7C8'],
            [0.2, -0.14, '#A8D98A'],
          ].map(([nx, ny, col], idx) => (
            <mesh key={idx} position={[nx as number, ny as number, 0.032]} rotation={[0, 0, (idx - 2) * 0.06]}>
              <planeGeometry args={[0.22, 0.22]} />
              <meshStandardMaterial color={col as string} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Cửa sổ lớn nhìn ra bầu trời thị trấn + Rèm vải + Vệt nắng chiếu xiên */}
      <group position={[-1.55, 1.85, -1.94]}>
        {/* Khung gỗ ngoài */}
        <RoundedBox args={[1.72, 1.52, 0.08]} radius={0.03} position={[0, 0, -0.04]}>
          <meshStandardMaterial color="#7C5132" roughness={0.55} />
        </RoundedBox>
        {/* Mặt kính bầu trời theo buổi */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.54, 1.34]} />
          <meshBasicMaterial map={winTex} />
        </mesh>
        {/* Đố cửa sổ chữ thập bằng gỗ */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.56, 0.045, 0.03]} />
          <meshStandardMaterial color="#7C5132" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.045, 1.36, 0.03]} />
          <meshStandardMaterial color="#7C5132" roughness={0.55} />
        </mesh>
        {/* Bậu cửa sổ + Chậu cây nhỏ trên bậu */}
        <RoundedBox args={[1.84, 0.08, 0.22]} radius={0.02} position={[0, -0.76, 0.06]} castShadow>
          <meshStandardMaterial color="#8A5E3B" roughness={0.55} />
        </RoundedBox>
        {/* Rèm vải kem mềm hai bên */}
        {[-0.78, 0.78].map((rx) => (
          <mesh key={rx} position={[rx, 0.02, 0.06]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 1.46, 12]} />
            <meshStandardMaterial color="#FCE8CC" roughness={0.85} />
          </mesh>
        ))}
        {/* Vệt nắng / ánh trăng chiếu xiên vào phòng (Volumetric Light Shaft) */}
        <mesh position={[0.45, -0.65, 0.85]} rotation={[0.55, 0.25, -0.35]}>
          <planeGeometry args={[1.45, 2.2]} />
          <meshBasicMaterial
            color={periodMeta.isNight ? '#BFE6F2' : '#FFE7B0'}
            transparent
            opacity={periodMeta.isNight ? 0.07 : 0.13}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <Html position={[0, -0.52, 0.08]} center zIndexRange={[20, 0]}>
          <div className={`pointer-events-none whitespace-nowrap ${LABEL_CHIP} py-0.5`}>
            {periodMeta.icon} {periodMeta.label}
          </div>
        </Html>
      </group>

      {/* Biển gỗ MC THIÊN ÂN STUDIO treo tường */}
      <Float speed={2} rotationIntensity={0.03} floatIntensity={0.06}>
        <group position={[0.1, 2.48, -1.92]}>
          <RoundedBox args={[1.76, 0.48, 0.08]} radius={0.04}>
            <meshStandardMaterial color="#FFF8EC" emissive="#F2B84B" emissiveIntensity={0.22} roughness={0.5} />
          </RoundedBox>
          <Html position={[0, 0, 0.06]} center zIndexRange={[20, 0]}>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-lg border-2 border-ghibli-clay bg-ghibli-cream px-3 py-1 font-display text-sm font-extrabold tracking-wider text-ghibli-ink shadow-[0_2px_0_#6B4E3D]">
              🎙️ MC THIÊN ÂN STUDIO
            </div>
          </Html>
        </group>
      </Float>

      {/* Chậu cây Monstera góc trái sau + Chân micro thu âm góc phải sau */}
      <group position={[-2.45, 0.1, -1.25]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.42, 14]} />
          <meshStandardMaterial color="#C8643B" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color="#7FBF6A" roughness={0.8} />
        </mesh>
        <mesh position={[0.14, 0.82, 0.06]} castShadow>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial color="#8CC770" roughness={0.8} />
        </mesh>
      </group>

      {/* Đạo cụ Trái: Bàn gỗ Sổ Tay + Đèn bàn ấm + Chồng sách */}
      <group
        position={[-1.75, 0.45, 0.1]}
        rotation={[0, 0.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setBookOpen(true);
        }}
      >
        {/* Mặt bàn & thân bàn có ngăn kéo */}
        <RoundedBox args={[1.02, 0.08, 0.64]} radius={0.025} position={[0, 0.34, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#8A5E3B" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.92, 0.68, 0.54]} radius={0.03} position={[0, -0.02, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#A0744B" roughness={0.55} />
        </RoundedBox>
        {/* Tay nắm ngăn kéo bằng đồng */}
        {[-0.22, 0.22].map((dx) => (
          <mesh key={dx} position={[dx, 0.14, 0.28]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#F2B84B" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        {/* Cuốn Sổ Tay mở sẵn trên bàn */}
        <group position={[0.08, 0.41, 0.04]} rotation={[0.12, 0, 0]}>
          <RoundedBox args={[0.48, 0.05, 0.34]} radius={0.015}>
            <meshStandardMaterial color="#3E9B94" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.44, 0.02, 0.3]} />
            <meshStandardMaterial color="#FFF8EC" roughness={0.8} />
          </mesh>
        </group>
        {/* Chồng sách tiếng Anh góc bàn */}
        <group position={[-0.32, 0.41, -0.1]}>
          <RoundedBox args={[0.24, 0.055, 0.3]} radius={0.01} position={[0, 0, 0]}>
            <meshStandardMaterial color="#E0643E" roughness={0.65} />
          </RoundedBox>
          <RoundedBox args={[0.22, 0.05, 0.28]} radius={0.01} position={[0.01, 0.055, 0]} rotation={[0, 0.15, 0]}>
            <meshStandardMaterial color="#F2B84B" roughness={0.65} />
          </RoundedBox>
        </group>
        {/* Đèn bàn cổ điển toả sáng ấm */}
        <group position={[-0.3, 0.38, 0.14]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
            <meshStandardMaterial color="#D9A74A" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.28, 8]} />
            <meshStandardMaterial color="#D9A74A" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.13, 0.12, 16]} />
            <meshStandardMaterial color="#7FBF6A" emissive="#FFD58A" emissiveIntensity={0.45} roughness={0.4} />
          </mesh>
        </group>

        <Html position={[0, 0.78, 0]} center zIndexRange={[20, 0]}>
          <button onClick={() => setBookOpen(true)} className={LABEL_HIT}>
            <span className={`whitespace-nowrap ${LABEL_CHIP}`}>
              📖 Sổ Tay {state.weak.length > 0 ? `(${state.weak.length} từ yếu)` : ''}
            </span>
          </button>
        </Html>
      </group>

      {/* Đạo cụ Phải: Kệ trưng bày Trang Bị & Cúp Ngôi Sao */}
      <group
        position={[1.75, 0.55, 0.05]}
        rotation={[0, -0.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setShopOpen(true);
        }}
      >
        {/* Bục gỗ tròn 2 tầng */}
        <mesh castShadow receiveShadow position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.46, 0.52, 0.82, 28]} />
          <meshStandardMaterial color="#8A5E3B" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.48, 0.06, 28]} />
          <meshStandardMaterial color="#EED2A8" roughness={0.4} />
        </mesh>

        {/* Vật phẩm chính trên bục: Micro Vàng nếu đã sở hữu, hoặc Tinh thể Cúp MC */}
        <mesh ref={trophyRef} position={[0, 0.62, 0]} castShadow>
          <octahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial
            color={state.items.goldmic ? '#FBBF24' : '#F2B84B'}
            emissive={state.items.goldmic ? '#F59E0B' : '#F2B84B'}
            emissiveIntensity={0.55}
            metalness={0.7}
            roughness={0.22}
          />
        </mesh>
        {/* Huy hiệu vật phẩm đã mua xếp quanh mặt bục */}
        {state.items.goldmic && (
          <mesh position={[-0.24, 0.5, 0.16]} rotation={[0, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.025, 0.02, 0.2, 10]} />
            <meshStandardMaterial color="#FBBF24" metalness={0.85} roughness={0.2} />
          </mesh>
        )}
        {state.items.gown && (
          <mesh position={[0.24, 0.5, 0.16]} castShadow>
            <coneGeometry args={[0.09, 0.2, 12]} />
            <meshStandardMaterial color="#F4A2B8" roughness={0.5} />
          </mesh>
        )}
        {state.items.inear && (
          <mesh position={[0, 0.45, 0.28]}>
            <torusGeometry args={[0.07, 0.018, 8, 20, Math.PI]} />
            <meshStandardMaterial color="#3E9B94" emissive="#3E9B94" emissiveIntensity={0.6} />
          </mesh>
        )}

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

      {/* Hạt bụi nắng bay chậm trong phòng */}
      <RoomDustMotes night={periodMeta.isNight} />

      {/* Trung tâm: Nhân vật 3D MC Thiên Ân */}
      <ClayCharacter3D
        look={playerLook}
        mood={charMood}
        position={[0, 0.1, 0.25]}
        scale={1.08}
        highlightRing
        onClick={() => openWorldWithTarget('home')}
      />

      {/* Bong bóng trạng thái năng lượng phía trên MC */}
      <Html position={[0, 2.18, 0.25]} center zIndexRange={[20, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-[#D4B896] bg-[#FFFDF9] px-3.5 py-1 text-xs font-extrabold text-ghibli-ink shadow-[0_3px_0_rgba(138,104,74,0.2),0_6px_14px_rgba(59,42,34,0.1)]">
          {moodText}
        </div>
      </Html>

      <ContactShadows position={[0, 0.11, 0]} opacity={0.48} scale={7} blur={0.4} far={3} color="#4A3525" />
    </group>
  );
};

/** Lùi camera và nâng tâm nhìn xuống nhẹ để phòng 3D nằm cân đối ở nửa trên màn hình tràn viền */
const FitRoomCamera: React.FC = () => {
  const { camera, size, controls } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const need = 4.9 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * Math.min(aspect, 1.35));
    const z = Math.max(4.1, need);
    const lookY = aspect < 0.85 ? -0.32 : -0.15;
    camera.position.set(0, 1.45 * (z / 4.1), z);
    camera.lookAt(0, lookY, 0);
    (controls as any)?.target?.set(0, lookY, 0);
    (controls as any)?.update?.();
  }, [camera, size.width, size.height, controls]);
  return null;
};

export const HubRoom3D: React.FC = () => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#BCE4F2] via-[#E8F1DC] to-[#F3E2C3]">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.45, 4.1], fov: 38 }}
        gl={{ toneMapping: THREE.NeutralToneMapping }}
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
