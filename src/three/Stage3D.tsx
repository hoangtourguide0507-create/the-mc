import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, Html, RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { getPlayerLook, NPCS } from '../data/content';
import { NpcMood, SceneData, StageMicPhase, VisemeType } from '../types/game';
import { useGameStore } from '../core/store';
import { ClayCharacter3D } from './ClayCharacter3D';

/** Bảng màu bối cảnh sân khấu Ghibli: phông màu nước ấm áp, sàn tự nhiên, ánh đèn vàng kem */
const GHIBLI_STAGE: Record<
  string,
  { floor: string; floorTrim: string; wall: string; accent: string; spot: string; top: string; bottom: string }
> = {
  cafe: {
    floor: '#C89B6E',
    floorTrim: '#8A5E3B',
    wall: '#F2DEC0',
    accent: '#E5A93C',
    spot: '#FFE4AD',
    top: '#FFF3DA',
    bottom: '#F4D3A2',
  },
  market: {
    floor: '#D5DFC3',
    floorTrim: '#7A9A65',
    wall: '#E2F0D3',
    accent: '#7FBF6A',
    spot: '#FFF0C2',
    top: '#D8F3FA',
    bottom: '#EBF7DC',
  },
  backstage: {
    floor: '#AE8868',
    floorTrim: '#6E4F3A',
    wall: '#EAD8C3',
    accent: '#D97B66',
    spot: '#FFE0A3',
    top: '#F7C9A6',
    bottom: '#D9C8E8',
  },
  wedding: {
    floor: '#F3E5D8',
    floorTrim: '#D6A2A8',
    wall: '#F9EAEF',
    accent: '#F2A2B8',
    spot: '#FFE8BA',
    top: '#FDE6EE',
    bottom: '#D8ECF8',
  },
  beach: {
    floor: '#EED4A7',
    floorTrim: '#C79B5E',
    wall: '#BFE6F2',
    accent: '#F2B84B',
    spot: '#FFE7B0',
    top: '#9FD8EE',
    bottom: '#FFE7B0',
  },
  gala: {
    floor: '#9E7B60',
    floorTrim: '#D9A74A',
    wall: '#F5E4BE',
    accent: '#F2B84B',
    spot: '#FFE4A8',
    top: '#3B4A7A',
    bottom: '#F3C794',
  },
  talkshow: {
    floor: '#B89374',
    floorTrim: '#5B7C99',
    wall: '#D4E8F2',
    accent: '#6BC2D4',
    spot: '#FFE6B5',
    top: '#344973',
    bottom: '#9ECAE3',
  },
  room: {
    floor: '#D9B48A',
    floorTrim: '#8A6A4E',
    wall: '#F5E6CC',
    accent: '#F7B7C8',
    spot: '#FFE2A8',
    top: '#F5E6CC',
    bottom: '#FBE3EA',
  },
  launch: {
    floor: '#CDAE8A',
    floorTrim: '#3E9B94',
    wall: '#D9EEF5',
    accent: '#3E9B94',
    spot: '#FFE2A8',
    top: '#9FD8EE',
    bottom: '#CFEFFF',
  },
};

/** Sóng âm pastel Ghibli (hồng đào, vàng nắng, xanh ngọc) */
const HOLO_GHIBLI = [
  '#F7B7C8',
  '#F9CFA0',
  '#F2B84B',
  '#A8E0D6',
  '#8FD3E8',
  '#F7B7C8',
  '#F9CFA0',
  '#A8E0D6',
  '#F2B84B',
  '#F7B7C8',
  '#8FD3E8',
];

const texCache = new Map<string, THREE.CanvasTexture>();

/** Phông màu nước có mây mờ và họa tiết dịu vẽ bằng canvas */
function backdropTexture(top: string, bottom: string, art: string) {
  const key = `bg:${top}:${bottom}:${art}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);

  // Vầng sáng màu nước dịu ở trung tâm
  const glow = g.createRadialGradient(256, 150, 20, 256, 150, 220);
  glow.addColorStop(0, 'rgba(255, 250, 235, 0.42)');
  glow.addColorStop(1, 'rgba(255, 250, 235, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 512, 256);

  // Vẽ mây bồng bềnh cho cảnh ngoài trời hoặc bokeh ấm cho cảnh đêm
  if (art === 'beach' || art === 'wedding' || art === 'market') {
    g.fillStyle = 'rgba(255, 252, 245, 0.55)';
    const clouds = [
      [90, 75, 42],
      [125, 68, 52],
      [165, 78, 38],
      [360, 62, 46],
      [400, 56, 55],
      [438, 68, 38],
    ];
    for (const [cx, cy, r] of clouds) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
  } else if (art === 'gala' || art === 'talkshow') {
    // Ánh đèn thành phố / sao đêm dịu
    for (let i = 0; i < 36; i++) {
      const x = ((i * 97) % 480) + 16;
      const y = ((i * 53) % 180) + 20;
      const r = 1.5 + (i % 3) * 1.2;
      g.fillStyle = i % 2 === 0 ? 'rgba(255, 235, 180, 0.65)' : 'rgba(255, 255, 255, 0.45)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Mặt sàn ván gỗ / gạch ấm vẽ bằng canvas */
function floorTexture(baseHex: string, plank = true) {
  const key = `fl:${baseHex}:${plank}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 256, 256);

  if (plank) {
    g.strokeStyle = 'rgba(85, 52, 30, 0.16)';
    g.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
      const offset = (y / 32) % 2 === 0 ? 64 : 160;
      g.beginPath();
      g.moveTo(offset, y);
      g.lineTo(offset, y + 32);
      g.stroke();
    }
  } else {
    g.strokeStyle = 'rgba(90, 75, 60, 0.12)';
    g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 42) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
  }

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  texCache.set(key, t);
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

/* ------------------------------------------------------------------ */
/* Đạo cụ 3D riêng biệt cho từng bối cảnh (Ghibli Set Pieces)          */
/* ------------------------------------------------------------------ */

const CafeSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* Quầy gỗ Cafe ấm áp */}
    <RoundedBox args={[3.4, 0.85, 0.55]} radius={0.05} smoothness={3} position={[0, 0.42, -0.35]} castShadow receiveShadow>
      <meshStandardMaterial color="#9C6B43" roughness={0.65} />
    </RoundedBox>
    <RoundedBox args={[3.55, 0.08, 0.65]} radius={0.03} smoothness={2} position={[0, 0.86, -0.35]} castShadow>
      <meshStandardMaterial color="#EED6B3" roughness={0.45} />
    </RoundedBox>
    {/* Máy pha Espresso cổ điển */}
    <RoundedBox args={[0.52, 0.48, 0.36]} radius={0.04} smoothness={3} position={[-0.85, 1.12, -0.32]} castShadow>
      <meshStandardMaterial color="#C85A3B" roughness={0.35} metalness={0.2} />
    </RoundedBox>
    <mesh position={[-0.85, 1.38, -0.32]}>
      <cylinderGeometry args={[0.2, 0.22, 0.06, 16]} />
      <meshStandardMaterial color="#D4A359" roughness={0.3} metalness={0.6} />
    </mesh>
    {/* Tủ kính bánh ngọt */}
    <RoundedBox args={[0.75, 0.42, 0.38]} radius={0.03} smoothness={2} position={[0.75, 1.08, -0.32]}>
      <meshStandardMaterial color="#CFEFFF" transparent opacity={0.45} roughness={0.15} />
    </RoundedBox>
    {[-0.18, 0.18].map((dx, i) => (
      <mesh key={i} position={[0.75 + dx, 0.98, -0.32]}>
        <cylinderGeometry args={[0.09, 0.09, 0.08, 14]} />
        <meshStandardMaterial color={i === 0 ? '#F4A2B8' : '#F2B84B'} roughness={0.6} />
      </mesh>
    ))}
    {/* Kệ gỗ treo tường & lọ cà phê */}
    <RoundedBox args={[2.6, 0.06, 0.28]} radius={0.02} position={[0, 1.85, -0.45]} castShadow>
      <meshStandardMaterial color="#7C5132" roughness={0.7} />
    </RoundedBox>
    {[-0.9, -0.5, 0.5, 0.9].map((x, i) => (
      <mesh key={i} position={[x, 1.98, -0.45]} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.2, 12]} />
        <meshStandardMaterial color={['#FFF8EC', '#E0643E', '#7FBF6A', '#F2B84B'][i]} roughness={0.5} />
      </mesh>
    ))}
    {/* Mái hiên sọc Ghibli phía trên */}
    <group position={[0, 2.55, -0.15]} rotation={[0.32, 0, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i - 4) * 0.48, 0, 0]} castShadow>
          <boxGeometry args={[0.47, 0.05, 0.65]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#FFF8EC' : '#C8643B'} roughness={0.8} />
        </mesh>
      ))}
    </group>
    {/* Chậu cây xanh hai bên */}
    {[-2.35, 2.35].map((x) => (
      <group key={x} position={[x, 0, -0.15]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.44, 14]} />
          <meshStandardMaterial color="#C87A52" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <icosahedronGeometry args={[0.32, 1]} />
          <meshStandardMaterial color="#7FBF6A" roughness={0.85} />
        </mesh>
      </group>
    ))}
  </group>
);

const MarketSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* 2 Quầy sạp gỗ trưng bày rau củ quả */}
    {[-1.55, 1.55].map((x, side) => (
      <group key={x} position={[x, 0, -0.25]} rotation={[0, side === 0 ? 0.18 : -0.18, 0]}>
        <RoundedBox args={[1.45, 0.68, 0.62]} radius={0.04} smoothness={2} position={[0, 0.34, 0]} castShadow>
          <meshStandardMaterial color="#B5835A" roughness={0.75} />
        </RoundedBox>
        {/* Khay nông sản nghiêng */}
        <group position={[0, 0.76, 0]} rotation={[0.22, 0, 0]}>
          <RoundedBox args={[1.4, 0.1, 0.58]} radius={0.02} position={[0, 0, 0]}>
            <meshStandardMaterial color="#8A5E3B" roughness={0.8} />
          </RoundedBox>
          {[-0.42, 0, 0.42].map((bx, i) => (
            <group key={i} position={[bx, 0.08, 0]}>
              {[-0.1, 0.1].map((bz, j) => (
                <mesh key={j} position={[0, 0.04, bz]} castShadow>
                  <sphereGeometry args={[0.1, 12, 10]} />
                  <meshStandardMaterial
                    color={side === 0 ? ['#E0643E', '#F2B84B', '#7FBF6A'][i] : ['#F4A261', '#9B72AA', '#E76F51'][i]}
                    roughness={0.5}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </group>
    ))}
    {/* Kệ siêu thị trung tâm phía sau */}
    <RoundedBox args={[2.1, 1.9, 0.32]} radius={0.04} position={[0, 0.95, -0.48]} castShadow>
      <meshStandardMaterial color="#FFF8EC" roughness={0.6} />
    </RoundedBox>
    {[0.55, 1.05, 1.55].map((y, row) => (
      <group key={y} position={[0, y, -0.3]}>
        <boxGeometry args={[1.95, 0.04, 0.28]} />
        {[-0.65, -0.22, 0.22, 0.65].map((bx, col) => (
          <RoundedBox key={col} args={[0.26, 0.28, 0.16]} radius={0.03} position={[bx, 0.16, 0]} castShadow>
            <meshStandardMaterial
              color={['#7FBF6A', '#F2B84B', '#E0643E', '#8FD3E8'][(row + col) % 4]}
              roughness={0.55}
            />
          </RoundedBox>
        ))}
      </group>
    ))}
    {/* Mái hiên xanh lá Fresh Mart */}
    <group position={[0, 2.5, -0.15]} rotation={[0.28, 0, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i - 4) * 0.5, 0, 0]}>
          <boxGeometry args={[0.49, 0.05, 0.6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#7FBF6A' : '#FFF8EC'} roughness={0.75} />
        </mesh>
      ))}
    </group>
  </group>
);

const BackstageSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* Rèm nhung đỏ sân khấu hai bên */}
    {[-2.5, 2.5].map((x) => (
      <group key={x} position={[x, 1.45, -0.2]}>
        {[-0.22, 0, 0.22].map((dx, i) => (
          <mesh key={i} position={[dx, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 2.9, 16]} />
            <meshStandardMaterial color="#A8383B" roughness={0.75} />
          </mesh>
        ))}
      </group>
    ))}
    {/* Bàn trang điểm & Gương đèn tròn ấm */}
    <group position={[-1.45, 0, -0.35]} rotation={[0, 0.2, 0]}>
      <RoundedBox args={[1.2, 0.72, 0.48]} radius={0.04} position={[0, 0.36, 0]} castShadow>
        <meshStandardMaterial color="#7C5132" roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[0.96, 1.05, 0.06]} radius={0.04} position={[0, 1.25, -0.16]} castShadow>
        <meshStandardMaterial color="#B5835A" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 1.25, -0.12]}>
        <planeGeometry args={[0.8, 0.88]} />
        <meshStandardMaterial color="#D8F3FA" roughness={0.12} metalness={0.6} />
      </mesh>
      {/* Hàng bóng đèn gương ấm */}
      {[-0.36, -0.18, 0, 0.18, 0.36].map((bx) =>
        [0.78, 1.72].map((by) => (
          <mesh key={`${bx}-${by}`} position={[bx, by, -0.1]}>
            <sphereGeometry args={[0.038, 10, 8]} />
            <meshStandardMaterial color="#FFF3C4" emissive="#FFD58A" emissiveIntensity={1.6} />
          </mesh>
        ))
      )}
    </group>
    {/* Giá treo trang phục diễn & Thùng thiết bị (Flight Case) */}
    <group position={[1.55, 0, -0.3]} rotation={[0, -0.22, 0]}>
      <mesh position={[-0.45, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshStandardMaterial color="#C89B6E" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.45, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshStandardMaterial color="#C89B6E" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.48, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.95, 8]} />
        <meshStandardMaterial color="#C89B6E" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Váy & Áo vest treo */}
      {[-0.2, 0.18].map((gx, i) => (
        <mesh key={i} position={[gx, 1.0, 0]} castShadow>
          <coneGeometry args={[0.18, 0.72, 12]} />
          <meshStandardMaterial color={i === 0 ? '#F2A2B8' : '#56709A'} roughness={0.65} />
        </mesh>
      ))}
    </group>
  </group>
);

const WeddingSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* Cổng vòm hoa hồng lớn ở trung tâm */}
    <group position={[0, 0, -0.25]}>
      <mesh position={[0, 1.35, 0]} castShadow>
        <torusGeometry args={[1.55, 0.09, 14, 48, Math.PI]} />
        <meshStandardMaterial color="#FFF8EC" roughness={0.45} />
      </mesh>
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 0.68, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 1.36, 14]} />
          <meshStandardMaterial color="#FFF8EC" roughness={0.45} />
        </mesh>
      ))}
      {/* Cụm hoa hồng & lá xanh đính dọc cổng vòm */}
      {Array.from({ length: 15 }, (_, i) => {
        const a = (i / 14) * Math.PI;
        const r = 1.55;
        return (
          <group key={i} position={[Math.cos(a) * r, 1.35 + Math.sin(a) * r, 0.08]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.15, 1]} />
              <meshStandardMaterial
                color={['#F4A2B8', '#FFF8EC', '#F7C6A0', '#E87A90'][i % 4]}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[0.06, -0.05, -0.03]}>
              <icosahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial color="#7FBF6A" roughness={0.75} />
            </mesh>
          </group>
        );
      })}
    </group>
    {/* Trụ hoa & nến lãng mạn hai bên */}
    {[-2.25, 2.25].map((x) => (
      <group key={x} position={[x, 0, 0.05]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 1.1, 16]} />
          <meshStandardMaterial color="#FFF8EC" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.22, 0]} castShadow>
          <icosahedronGeometry args={[0.26, 1]} />
          <meshStandardMaterial color="#F4A2B8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshStandardMaterial color="#FFF3C4" emissive="#FFD58A" emissiveIntensity={1.5} />
        </mesh>
      </group>
    ))}
  </group>
);

const BeachSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* Mặt trời hoàng hôn ấm áp phía chân trời */}
    <mesh position={[0, 1.55, -0.48]}>
      <circleGeometry args={[1.25, 40]} />
      <meshStandardMaterial color="#FFD58A" emissive="#F2B84B" emissiveIntensity={0.65} />
    </mesh>
    {/* Dải biển xanh lấp lánh dưới chân trời */}
    <mesh position={[0, 0.42, -0.46]}>
      <planeGeometry args={[8.2, 0.85]} />
      <meshStandardMaterial color="#6BC2D4" roughness={0.25} />
    </mesh>
    {/* 2 Cây dừa nghiêng bóng */}
    {[-2.35, 2.35].map((x, idx) => (
      <group key={x} position={[x, 0, -0.15]} rotation={[0, 0, idx === 0 ? -0.14 : 0.14]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.13, 1.9, 10]} />
          <meshStandardMaterial color="#A0703A" roughness={0.85} />
        </mesh>
        {Array.from({ length: 6 }, (_, k) => (
          <mesh
            key={k}
            position={[0, 1.88, 0]}
            rotation={[0.35, (k / 6) * Math.PI * 2, -0.38]}
            castShadow
          >
            <coneGeometry args={[0.18, 0.85, 5]} />
            <meshStandardMaterial color="#7FBF6A" roughness={0.7} />
          </mesh>
        ))}
      </group>
    ))}
    {/* Ván Surfboard & Đuốc Tiki */}
    <mesh position={[-1.65, 0.72, -0.25]} rotation={[0.15, 0.2, -0.18]} castShadow>
      <capsuleGeometry args={[0.14, 0.95, 8, 16]} />
      <meshStandardMaterial color="#E0643E" roughness={0.4} />
    </mesh>
    <mesh position={[1.65, 0.68, -0.25]} rotation={[0.15, -0.2, 0.18]} castShadow>
      <capsuleGeometry args={[0.13, 0.88, 8, 16]} />
      <meshStandardMaterial color="#3E9B94" roughness={0.4} />
    </mesh>
  </group>
);

const GalaSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* 4 Cột cẩm thạch trắng kem & Rèm lụa vàng */}
    {[-2.4, -1.35, 1.35, 2.4].map((x) => (
      <group key={x} position={[x, 0, -0.32]}>
        <mesh position={[0, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 2.7, 18]} />
          <meshStandardMaterial color="#FFF8EC" roughness={0.35} />
        </mesh>
        <RoundedBox args={[0.36, 0.14, 0.36]} radius={0.03} position={[0, 0.07, 0]}>
          <meshStandardMaterial color="#D9A74A" roughness={0.35} metalness={0.45} />
        </RoundedBox>
        <RoundedBox args={[0.36, 0.14, 0.36]} radius={0.03} position={[0, 2.68, 0]}>
          <meshStandardMaterial color="#D9A74A" roughness={0.35} metalness={0.45} />
        </RoundedBox>
      </group>
    ))}
    {/* Đèn chùm pha lê ấm phía trên trung tâm */}
    <group position={[0, 2.55, 0.1]}>
      <mesh>
        <torusGeometry args={[0.55, 0.035, 10, 32]} />
        <meshStandardMaterial color="#D9A74A" metalness={0.65} roughness={0.25} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color="#FFF8EC" emissive="#FFD58A" emissiveIntensity={1.8} />
          </mesh>
        );
      })}
    </group>
    {/* Ngôi sao Gala vàng ấm ở tâm phông */}
    <mesh position={[0, 1.55, -0.38]}>
      <octahedronGeometry args={[0.38, 0]} />
      <meshStandardMaterial color="#F2B84B" emissive="#F2B84B" emissiveIntensity={0.55} roughness={0.25} metalness={0.6} />
    </mesh>
  </group>
);

const TalkshowSetPiece: React.FC = () => (
  <group position={[0, -1.5, 0.25]}>
    {/* Khung cửa sổ Panorama nhìn ra đường chân trời thành phố đêm */}
    <RoundedBox args={[4.2, 1.85, 0.08]} radius={0.04} position={[0, 1.45, -0.44]}>
      <meshStandardMaterial color="#2E3F6B" roughness={0.2} />
    </RoundedBox>
    {/* Silhouette các toà nhà phát sáng cửa sổ ấm phía xa */}
    {[-1.5, -0.95, -0.4, 0.2, 0.8, 1.45].map((bx, i) => {
      const h = 0.55 + (i % 3) * 0.28;
      return (
        <group key={i} position={[bx, 0.55 + h / 2, -0.38]}>
          <mesh>
            <boxGeometry args={[0.42, h, 0.04]} />
            <meshStandardMaterial color="#3B4A7A" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.06, 0.025]}>
            <planeGeometry args={[0.24, h * 0.6]} />
            <meshStandardMaterial color="#FFD58A" emissive="#FFD58A" emissiveIntensity={1.1} />
          </mesh>
        </group>
      );
    })}
    {/* Bàn Talkshow gỗ cong ấm áp phía sau nhân vật */}
    <RoundedBox args={[1.65, 0.52, 0.48]} radius={0.08} smoothness={3} position={[0, 0.28, -0.15]} castShadow>
      <meshStandardMaterial color="#A0744B" roughness={0.5} />
    </RoundedBox>
    {/* Cốc sứ & Micro để bàn */}
    <mesh position={[-0.35, 0.6, -0.12]} castShadow>
      <cylinderGeometry args={[0.055, 0.048, 0.12, 14]} />
      <meshStandardMaterial color="#FFF8EC" roughness={0.3} />
    </mesh>
    <Html position={[0, 2.55, -0.25]} center zIndexRange={[20, 0]}>
      <div className="whitespace-nowrap rounded-full border-2 border-ghibli-clay bg-ghibli-cream px-3.5 py-0.5 text-xs font-black tracking-widest text-[#9C3F22] shadow-[0_2px_0_#6B4E3D]">
        🔴 ON AIR · CHANNEL 9 LIVE
      </div>
    </Html>
  </group>
);

/** Hạt bụi nắng / cánh hoa bay nhẹ trên sân khấu (1 InstancedMesh) */
const StageParticles: React.FC<{ color: string; count?: number }> = ({ color, count = 24 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 73) % 60) / 10 - 3,
        y: 0.4 + ((i * 41) % 28) / 10,
        z: ((i * 29) % 30) / 10 - 1.5,
        sp: 0.4 + (i % 5) * 0.15,
        ph: i * 1.1,
      })),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const inst = ref.current;
    if (!inst) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      const y = 0.3 + ((s.y + t * s.sp * 0.22) % 2.8);
      const x = s.x + Math.sin(t * s.sp + s.ph) * 0.22;
      const z = s.z + Math.cos(t * s.sp * 0.8 + s.ph) * 0.15;
      const sc = 0.65 + Math.sin(t * 2 + s.ph) * 0.25;
      dummy.position.set(x, y, z);
      dummy.rotation.set(t * 0.5 + s.ph, t * 0.3, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.028, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.75} />
    </instancedMesh>
  );
};

/* ------------------------------------------------------------------ */

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

  // Dynamic Camera Dolly & Focus + 3D Ghibli Waveform animation
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

    // Animate 11 pastel sound bars
    if (waveGroupRef.current) {
      waveGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const active = npcSpeaking || micPhase === 'rec';
        const base = active
          ? 0.35 + Math.abs(Math.sin(t * 12 + idx * 0.7)) * 0.85
          : 0.12 + Math.abs(Math.sin(t * 3 + idx * 0.5)) * 0.12;
        mesh.scale.y += (base - mesh.scale.y) * (1 - Math.exp(-15 * Math.min(dt, 0.1)));
      });
    }
  });

  const theme = GHIBLI_STAGE[scene.art] ?? GHIBLI_STAGE.room;
  const backdropTex = useMemo(
    () => backdropTexture(theme.top, theme.bottom, scene.art),
    [theme.top, theme.bottom, scene.art]
  );
  const floorTex = useMemo(
    () => floorTexture(theme.floor, scene.art !== 'market' && scene.art !== 'wedding'),
    [theme.floor, scene.art]
  );

  const particleColor =
    scene.art === 'wedding'
      ? '#F7B7C8'
      : scene.art === 'market'
      ? '#A8D98A'
      : '#FFE7B0';

  return (
    <group position={[0, -0.75, 0]}>
      <ambientLight intensity={1.45} color="#FFF6E6" />
      <hemisphereLight args={['#FFF8EC', '#C89B6E', 0.55]} />
      <directionalLight position={[3, 6, 4]} intensity={1.75} color={theme.spot} castShadow />
      <spotLight
        position={[-1.2, 4.2, 2.2]}
        angle={0.52}
        penumbra={0.75}
        intensity={npcSpeaking ? 3.2 : 1.5}
        color={theme.spot}
        castShadow
      />
      <spotLight
        position={[1.2, 4.2, 2.2]}
        angle={0.52}
        penumbra={0.75}
        intensity={micPhase === 'rec' ? 3.4 : 1.5}
        color={micPhase === 'rec' ? '#FFF1C9' : '#FFE2A8'}
        castShadow
      />

      {/* Luồng sáng Volumetric dịu chiếu xuống nhân vật đang nói */}
      <mesh position={[-0.9, 1.85, 0.25]} visible={npcSpeaking}>
        <coneGeometry args={[0.95, 3.4, 24, 1, true]} />
        <meshBasicMaterial
          color="#FFE7B0"
          transparent
          opacity={0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0.95, 1.85, 0.25]} visible={micPhase === 'rec' || micPhase === 'arming'}>
        <coneGeometry args={[0.95, 3.4, 24, 1, true]} />
        <meshBasicMaterial
          color="#FFE7B0"
          transparent
          opacity={0.11}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sàn sân khấu gỗ/đá có viền bo ấm áp */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.9, 4.1, 0.22, 56]} />
        <meshStandardMaterial map={floorTex} roughness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.114, 0]}>
        <ringGeometry args={[3.62, 3.78, 64]} />
        <meshStandardMaterial color={theme.floorTrim} roughness={0.6} />
      </mesh>
      {/* Thảm tròn trung tâm sân khấu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.113, 0.15]} receiveShadow>
        <circleGeometry args={[2.15, 48]} />
        <meshStandardMaterial color="#FFF8EC" roughness={0.85} transparent opacity={0.38} />
      </mesh>

      {/* Phông nền Màu nước & Set Piece riêng cho từng bối cảnh */}
      <group position={[0, 1.65, -1.9]}>
        <mesh receiveShadow>
          <boxGeometry args={[8.6, 4.7, 0.18]} />
          <meshStandardMaterial color="#FFFFFF" map={backdropTex} roughness={0.92} />
        </mesh>
        {/* Khung gỗ bo viền phông */}
        <mesh position={[0, 2.32, 0.08]}>
          <boxGeometry args={[8.65, 0.12, 0.22]} />
          <meshStandardMaterial color={theme.floorTrim} roughness={0.7} />
        </mesh>

        {/* Vòng cung trang trí dịu */}
        <mesh position={[0, -0.2, 0.12]}>
          <torusGeometry args={[1.68, 0.055, 12, 48, Math.PI]} />
          <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>

        {/* Đạo cụ riêng theo từng sân khấu */}
        {scene.art === 'cafe' && <CafeSetPiece />}
        {scene.art === 'market' && <MarketSetPiece />}
        {scene.art === 'backstage' && <BackstageSetPiece />}
        {scene.art === 'wedding' && <WeddingSetPiece />}
        {scene.art === 'beach' && <BeachSetPiece />}
        {scene.art === 'gala' && <GalaSetPiece />}
        {scene.art === 'talkshow' && <TalkshowSetPiece />}
      </group>

      {/* Hạt bụi nắng / cánh hoa bay lơ lửng */}
      <StageParticles color={particleColor} />

      {/* Sóng âm Pastel Ghibli ở giữa sân khấu */}
      <Float speed={2.4} rotationIntensity={0.04} floatIntensity={0.1}>
        <group ref={waveGroupRef} position={[0, 1.45, -0.45]}>
          {HOLO_GHIBLI.map((col, idx) => (
            <mesh key={idx} position={[(idx - 5) * 0.11, 0, 0]}>
              <capsuleGeometry args={[0.028, 0.35, 8, 12]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={npcSpeaking || micPhase === 'rec' ? 0.85 : 0.32}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* BÊN TRÁI: NPC(s) 3D */}
      {npc.isCouple && npc.coupleLooks ? (
        <group position={[-0.95, 0.11, 0.2]} rotation={[0, 0.28, 0]}>
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

      {/* BÊN PHẢI: MC Thiên Ân (Người chơi) */}
      <group position={[0.95, 0.11, 0.25]} rotation={[0, -0.32, 0]}>
        <ClayCharacter3D
          look={playerLook}
          mood={micPhase === 'rec' ? 'listening' : npcMood === 'happy' ? 'happy' : 'idle'}
          viseme={micPhase === 'rec' ? playerViseme : 'rest'}
          isSpeaking={micPhase === 'rec'}
          scale={1.04}
          nameTag="MC Thiên Ân 🎙️"
          highlightRing={micPhase === 'rec' || micPhase === 'arming'}
        />
      </group>

      <ContactShadows position={[0, 0.12, 0]} opacity={0.5} scale={8} blur={2.1} far={3} color="#4A3525" />
    </group>
  );
};

export const Stage3D: React.FC<Stage3DProps> = (props) => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-[#DFC9AE] bg-[#F5E6CC] shadow-[0_4px_0_rgba(138,104,74,0.15),0_12px_28px_rgba(59,42,34,0.12)]">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: false, stencil: false }}
        camera={{ position: [0, 1.45, 4.15], fov: 36 }}
      >
        <StageSceneContent {...props} />
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={1.05}
            luminanceSmoothing={0.25}
            intensity={props.npcSpeaking || props.micPhase === 'rec' ? 0.28 : 0.14}
          />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette eskil={false} offset={0.42} darkness={0.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
