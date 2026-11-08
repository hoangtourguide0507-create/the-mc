import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { LookConfig, NpcMood, VisemeType } from '../types/game';
import { GlbCharacter3D } from './GlbCharacter3D';

export interface ClayCharacter3DProps {
  look: LookConfig;
  mood?: NpcMood;
  viseme?: VisemeType;
  isWalking?: boolean;
  isSpeaking?: boolean;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  nameTag?: string;
  highlightRing?: boolean;
  onClick?: (e: any) => void;
}

/**
 * Làm mượt theo hàm mũ, không phụ thuộc FPS và KHÔNG BAO GIỜ vượt đích.
 * (Bản cũ dùng lerp(a, b, dt*k): khi khung hình giật làm dt*k > 2 thì giá trị
 *  dao động phóng đại tới vô cực → mắt/miệng bị kéo dài vô hạn, thân nhân vật biến mất.)
 */
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

/* Hình khối dùng chung cho mọi nhân vật */
const GEO = {
  head: new THREE.SphereGeometry(0.36, 40, 32),
  ear: new THREE.SphereGeometry(0.07, 16, 12),
  sclera: new THREE.SphereGeometry(0.066, 24, 18),
  iris: new THREE.SphereGeometry(0.046, 20, 16),
  pupil: new THREE.SphereGeometry(0.024, 14, 10),
  glint: new THREE.SphereGeometry(0.014, 10, 8),
  brow: new THREE.CapsuleGeometry(0.019, 0.085, 6, 10),
  nose: new THREE.SphereGeometry(0.038, 16, 12),
  smile: new THREE.TorusGeometry(0.055, 0.014, 8, 20, Math.PI),
  mouth: new THREE.SphereGeometry(0.05, 20, 14),
  teeth: new THREE.BoxGeometry(0.06, 0.016, 0.01),
  blush: new THREE.CircleGeometry(0.06, 20),
  neck: new THREE.CylinderGeometry(0.075, 0.09, 0.12, 16),
  leg: new THREE.CapsuleGeometry(0.078, 0.17, 8, 16),
  arm: new THREE.CapsuleGeometry(0.066, 0.2, 8, 16),
  hand: new THREE.SphereGeometry(0.074, 18, 14),
  torso: new THREE.CapsuleGeometry(0.235, 0.26, 12, 24),
  dress: new THREE.CylinderGeometry(0.2, 0.42, 0.72, 32, 1, true),
  dressTop: new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  lapel: new THREE.BoxGeometry(0.08, 0.26, 0.02),
  shirt: new THREE.CylinderGeometry(0.0, 0.11, 0.24, 3, 1),
  bow: new THREE.ConeGeometry(0.045, 0.07, 4),
  tie: new THREE.ConeGeometry(0.035, 0.2, 4),
  button: new THREE.SphereGeometry(0.014, 8, 6),
  hairCap: new THREE.SphereGeometry(0.385, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.56),
  hairBlob: new THREE.SphereGeometry(0.16, 20, 14),
  curl: new THREE.SphereGeometry(0.085, 14, 10),
  bun: new THREE.SphereGeometry(0.15, 22, 16),
  longBack: new THREE.CapsuleGeometry(0.25, 0.34, 12, 20),
  lock: new THREE.CapsuleGeometry(0.07, 0.36, 8, 12),
  beanie: new THREE.SphereGeometry(0.4, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
  beanieRim: new THREE.TorusGeometry(0.37, 0.05, 10, 32),
  pompom: new THREE.SphereGeometry(0.07, 12, 10),
  lash: new THREE.TorusGeometry(0.06, 0.009, 6, 14, Math.PI * 0.7),
  earring: new THREE.SphereGeometry(0.022, 10, 8),
  ring: new THREE.RingGeometry(0.42, 0.54, 40),
  shadow: new THREE.CircleGeometry(0.4, 28),
  glassRim: new THREE.TorusGeometry(0.075, 0.011, 8, 24),
  hood: new THREE.TorusGeometry(0.2, 0.07, 10, 24),
};

export const ClayCharacter3D: React.FC<ClayCharacter3DProps> = ({
  look,
  mood = 'idle',
  viseme = 'rest',
  isWalking = false,
  isSpeaking = false,
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  nameTag,
  highlightRing = false,
  onClick,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const smileRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const blinkRef = useRef(false);

  // Chớp mắt tự nhiên (1,8–5,2 s; 20% chớp đôi) — dùng ref, không re-render
  useEffect(() => {
    let timer: number;
    let mounted = true;
    const blinkOnce = (after?: () => void) => {
      blinkRef.current = true;
      window.setTimeout(() => {
        blinkRef.current = false;
        if (after) window.setTimeout(after, 110);
      }, 120);
    };
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!mounted) return;
        if (Math.random() < 0.85) blinkOnce(Math.random() < 0.2 ? () => mounted && blinkOnce() : undefined);
        schedule();
      }, 1800 + Math.random() * 3400);
    };
    schedule();
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const lookKey = JSON.stringify(look);
  const M = useMemo(() => {
    const skin = look.skin || '#FAD2B8';
    const cloth = look.cloth || '#1E2952';
    const glossy = look.outfit === 'velvet' || look.outfit === 'gown' || look.outfit === 'bride';
    const clay = (color: string, rough = 0.62, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
      new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.18, clearcoatRoughness: 0.55, ...extra });
    return {
      skin: clay(skin, 0.55, { sheen: 0.6, sheenColor: new THREE.Color('#FFB4A2'), sheenRoughness: 0.6 }),
      hair: clay(look.hair || '#231829', 0.5, { clearcoat: 0.45, clearcoatRoughness: 0.35 }),
      cloth: clay(cloth, glossy ? 0.38 : 0.7, glossy ? { sheen: 1, sheenColor: new THREE.Color(shade(cloth, 0.25)), sheenRoughness: 0.35 } : {}),
      pants: clay(look.outfit === 'tux' || look.outfit === 'suit' ? shade(cloth, -0.08) : shade(cloth, -0.22), 0.7),
      shoe: clay(look.outfit === 'hoodie' || look.outfit === 'crew' ? '#F8FAFC' : '#1F1B2E', 0.35, { clearcoat: 0.8 }),
      accent: clay(look.accent || '#38BDF8', 0.35, { metalness: 0.1 }),
      lapel: clay(shade(cloth, 0.1), 0.3, { clearcoat: 0.7, clearcoatRoughness: 0.2 }),
      white: clay('#F8FAFC', 0.55),
      sclera: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 }),
      iris: new THREE.MeshStandardMaterial({ color: look.eye || '#3B2A4F', roughness: 0.15 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#0B0614' }),
      glint: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
      lip: clay(look.lip || '#C2416B', 0.4),
      mouth: new THREE.MeshStandardMaterial({ color: '#5A1830', roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: '#FBBF24', roughness: 0.18, metalness: 0.9, emissive: '#78350F', emissiveIntensity: 0.2 }),
      silver: new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.22, metalness: 0.85 }),
      blush: new THREE.MeshBasicMaterial({ color: '#FB7185', transparent: true, opacity: 0.32, depthWrite: false }),
      ring: new THREE.MeshBasicMaterial({ color: '#22D3EE', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({ color: '#090518', transparent: true, opacity: 0.35, depthWrite: false }),
      hat: clay(look.hat || '#7C3AED', 0.85),
      beard: clay(look.beard || look.hair || '#231829', 0.75),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  useEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const root = rootRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!root || !body || !head) return;

    let diff = rotationY - root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.y += diff * (1 - Math.exp(-10 * dt));

    const la = leftArmRef.current;
    const ra = rightArmRef.current;
    const ll = leftLegRef.current;
    const rl = rightLegRef.current;

    if (isWalking) {
      const w = t * 12;
      body.position.y = Math.abs(Math.sin(w)) * 0.07;
      body.rotation.z = Math.sin(w) * 0.04;
      body.rotation.x = 0.06;
      head.rotation.z = -Math.sin(w) * 0.03;
      head.rotation.x = damp(head.rotation.x, 0.02, 10, dt);
      if (ll && rl) {
        ll.rotation.x = Math.sin(w) * 0.6;
        rl.rotation.x = -Math.sin(w) * 0.6;
      }
      if (la && ra) {
        la.rotation.x = -Math.sin(w) * 0.5;
        la.rotation.z = damp(la.rotation.z, 0.12, 10, dt);
        ra.rotation.x = look.propArt ? -0.5 + Math.sin(w) * 0.12 : Math.sin(w) * 0.5;
        ra.rotation.z = damp(ra.rotation.z, -0.12, 10, dt);
      }
    } else {
      let bodyY = Math.sin(t * 2.2) * 0.012;
      let headZ = Math.sin(t * 1.2) * 0.035;
      let headX = Math.cos(t * 1.7) * 0.025;
      let laZ = 0.16;
      let laX = 0;
      if (mood === 'happy') {
        bodyY = Math.abs(Math.sin(t * 7)) * 0.1;
        headZ = Math.sin(t * 6) * 0.1;
        laZ = 0.9 + Math.sin(t * 10) * 0.25;
        laX = -0.3;
      } else if (mood === 'listening') {
        headZ = 0.2;
        headX = -0.06;
        laZ = 0.42;
        laX = -0.6;
      } else if (mood === 'confused') {
        headZ = -0.22;
        headX = 0.08;
        laZ = 0.3;
        laX = -1.4;
      }
      if (isSpeaking) {
        headX += Math.sin(t * 11) * 0.035;
        headZ += Math.cos(t * 8) * 0.025;
      }
      body.position.y = damp(body.position.y, bodyY, 12, dt);
      body.rotation.z = damp(body.rotation.z, 0, 10, dt);
      body.rotation.x = damp(body.rotation.x, 0, 10, dt);
      head.rotation.z = damp(head.rotation.z, headZ, 9, dt);
      head.rotation.x = damp(head.rotation.x, headX, 9, dt);
      if (ll && rl) {
        ll.rotation.x = damp(ll.rotation.x, 0, 12, dt);
        rl.rotation.x = damp(rl.rotation.x, 0, 12, dt);
      }
      if (la && ra) {
        la.rotation.z = damp(la.rotation.z, laZ, 9, dt);
        la.rotation.x = damp(la.rotation.x, laX, 9, dt);
        const rX = look.propArt ? (isSpeaking ? -0.85 + Math.sin(t * 9) * 0.1 : -0.6) : isSpeaking ? -0.25 + Math.sin(t * 5) * 0.15 : 0;
        ra.rotation.x = damp(ra.rotation.x, rX, 9, dt);
        ra.rotation.z = damp(ra.rotation.z, -0.16, 9, dt);
      }
    }

    // Chớp mắt / nheo mắt khi vui
    const eyeY = blinkRef.current ? 0.08 : mood === 'happy' ? 0.4 : 1;
    for (const e of [leftEyeRef.current, rightEyeRef.current]) if (e) e.scale.y = damp(e.scale.y, eyeY, 30, dt);

    // Lông mày theo cảm xúc
    if (leftBrowRef.current && rightBrowRef.current) {
      const lb = mood === 'confused' ? 0.35 : mood === 'happy' ? 0.15 : 0.06;
      const rb = mood === 'confused' ? -0.38 : mood === 'happy' ? -0.15 : -0.06;
      const by = mood === 'confused' ? 0.165 : mood === 'happy' ? 0.165 : 0.15;
      leftBrowRef.current.rotation.z = damp(leftBrowRef.current.rotation.z, Math.PI / 2 + lb, 12, dt);
      rightBrowRef.current.rotation.z = damp(rightBrowRef.current.rotation.z, Math.PI / 2 + rb, 12, dt);
      leftBrowRef.current.position.y = damp(leftBrowRef.current.position.y, by, 12, dt);
      rightBrowRef.current.position.y = damp(rightBrowRef.current.position.y, mood === 'confused' ? 0.14 : by, 12, dt);
    }

    // 5 khẩu hình (a, e, o, m, rest)
    if (mouthRef.current && smileRef.current) {
      let sx = 0.9;
      let sy = 0.05;
      if (viseme === 'a') {
        sx = 1.15;
        sy = 1.25;
      } else if (viseme === 'e') {
        sx = 1.45;
        sy = 0.6;
      } else if (viseme === 'o') {
        sx = 0.8;
        sy = 1.25;
      } else if (viseme === 'm') {
        sx = 1.0;
        sy = 0.05;
      } else if (mood === 'happy') {
        sx = 1.3;
        sy = 0.7;
      }
      const m = mouthRef.current;
      m.scale.x = damp(m.scale.x, sx, 26, dt);
      m.scale.y = damp(m.scale.y, sy, 26, dt);
      // Nụ cười hiện khi miệng khép
      const closed = m.scale.y < 0.25;
      smileRef.current.visible = closed;
      m.visible = !closed;
    }
  });

  const isLongDress = look.outfit === 'gown' || look.outfit === 'bride' || look.outfit === 'velvet';
  const acc = look.acc || [];
  const has = (a: string) => acc.includes(a as never);
  const formal = look.outfit === 'tux' || look.outfit === 'suit' || look.outfit === 'jacket';

  if (look.glbUrl) {
    return (
      <group ref={rootRef} position={position} scale={scale} onClick={onClick}>
        {highlightRing && <mesh geometry={GEO.ring} material={M.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} />}
        <Suspense fallback={null}>
          <GlbCharacter3D url={look.glbUrl} viseme={viseme} blinking={false} isWalking={isWalking} />
        </Suspense>
        {nameTag && <NameTag y={1.45} text={nameTag} />}
        {/* refs bắt buộc cho useFrame */}
        <group ref={bodyRef}>
          <group ref={headRef} />
        </group>
      </group>
    );
  }

  return (
    <group ref={rootRef} position={position} scale={scale} onClick={onClick}>
      {highlightRing && <mesh geometry={GEO.ring} material={M.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} />}
      <mesh geometry={GEO.shadow} material={M.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} />

      <group ref={bodyRef}>
        {/* CHÂN + GIÀY */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? leftLegRef : rightLegRef} position={[s * 0.115, 0.3, 0]}>
            <mesh geometry={GEO.leg} material={isLongDress ? M.skin : M.pants} position={[0, -0.13, 0]} />
            <RoundedBox args={[0.15, 0.08, 0.23]} radius={0.035} smoothness={3} position={[0, -0.255, 0.035]} material={M.shoe} />
          </group>
        ))}

        {/* THÂN / TRANG PHỤC */}
        <group position={[0, 0.63, 0]}>
          {isLongDress ? (
            <>
              <mesh geometry={GEO.dress} material={M.cloth} position={[0, -0.16, 0]} castShadow />
              <mesh geometry={GEO.dressTop} material={M.cloth} position={[0, 0.2, 0]} scale={[1, 0.9, 0.85]} />
              <mesh geometry={GEO.torso} material={M.cloth} position={[0, 0.08, 0]} scale={[0.82, 0.7, 0.72]} />
              {look.outfit === 'bride' && (
                <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.white}>
                  <torusGeometry args={[0.19, 0.022, 8, 28]} />
                </mesh>
              )}
            </>
          ) : (
            <mesh geometry={GEO.torso} material={M.cloth} scale={[1, 1, 0.84]} castShadow />
          )}

          {/* Áo vest / tux: sơ mi chữ V, ve áo, nơ hoặc cà vạt, cúc */}
          {formal && (
            <group position={[0, 0.06, 0.2]}>
              <mesh geometry={GEO.shirt} material={M.white} position={[0, 0.06, -0.005]} rotation={[0, 0, Math.PI]} scale={[1, 1, 0.25]} />
              <mesh geometry={GEO.lapel} material={M.lapel} position={[-0.07, 0.02, 0.005]} rotation={[0.12, 0, -0.32]} scale={[0.8, 1, 1]} />
              <mesh geometry={GEO.lapel} material={M.lapel} position={[0.07, 0.02, 0.005]} rotation={[0.12, 0, 0.32]} scale={[0.8, 1, 1]} />
              {look.outfit === 'tux' ? (
                <group position={[0, 0.15, 0.025]}>
                  <mesh geometry={GEO.bow} material={M.accent} position={[-0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
                  <mesh geometry={GEO.bow} material={M.accent} position={[0.035, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
                  <mesh geometry={GEO.button} material={M.accent} scale={1.4} />
                </group>
              ) : (
                <mesh geometry={GEO.tie} material={M.accent} position={[0, 0.04, 0.02]} rotation={[Math.PI, 0, 0]} />
              )}
              {[-0.06, -0.14].map((y) => (
                <mesh key={y} geometry={GEO.button} material={M.gold} position={[0.0, y, 0.03]} />
              ))}
            </group>
          )}
          {look.outfit === 'apron' && (
            <group position={[0, -0.04, 0.2]}>
              <RoundedBox args={[0.3, 0.4, 0.04]} radius={0.02} smoothness={2} material={M.accent} />
              <RoundedBox args={[0.14, 0.08, 0.02]} radius={0.01} smoothness={2} position={[0, -0.06, 0.025]} material={M.white} />
            </group>
          )}
          {look.outfit === 'hoodie' && (
            <>
              <mesh geometry={GEO.hood} material={M.cloth} position={[0, 0.2, -0.1]} rotation={[1.2, 0, 0]} />
              <RoundedBox args={[0.26, 0.1, 0.03]} radius={0.015} smoothness={2} position={[0, -0.12, 0.2]} material={M.pants} />
              {[-0.04, 0.04].map((x) => (
                <mesh key={x} position={[x, 0.08, 0.21]} material={M.white}>
                  <cylinderGeometry args={[0.008, 0.008, 0.14, 6]} />
                </mesh>
              ))}
            </>
          )}
          {(look.outfit === 'blouse' || look.outfit === 'crew') && (
            <mesh position={[0, 0.22, 0.03]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={look.outfit === 'blouse' ? M.white : M.accent}>
              <torusGeometry args={[0.12, 0.025, 8, 24]} />
            </mesh>
          )}
          {has('pearls') && (
            <mesh position={[0, 0.2, 0.05]} rotation={[Math.PI / 2 - 0.3, 0, 0]}>
              <torusGeometry args={[0.15, 0.022, 10, 28]} />
              <meshStandardMaterial color="#FFFBEB" roughness={0.12} metalness={0.3} />
            </mesh>
          )}
          {(has('headset') || has('intercom')) && (
            <RoundedBox args={[0.1, 0.14, 0.05]} radius={0.015} smoothness={2} position={[0.17, -0.12, -0.12]} material={M.silver} />
          )}
        </group>

        {/* CỔ */}
        <mesh geometry={GEO.neck} material={M.skin} position={[0, 0.92, 0]} />

        {/* TAY + ĐẠO CỤ */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? leftArmRef : rightArmRef} position={[s * 0.29, 0.8, 0]}>
            <mesh geometry={GEO.arm} material={M.cloth} position={[s * 0.035, -0.15, 0]} />
            {formal && (
              <mesh position={[s * 0.045, -0.27, 0]} material={M.white}>
                <cylinderGeometry args={[0.064, 0.064, 0.03, 14]} />
              </mesh>
            )}
            <mesh geometry={GEO.hand} material={M.skin} position={[s * 0.045, -0.32, 0]} />
            {s > 0 && look.propArt && <HandProp kind={look.propArt} M={M} />}
          </group>
        ))}

        {/* ĐẦU */}
        <group ref={headRef} position={[0, 1.27, 0]}>
          <mesh geometry={GEO.head} material={M.skin} scale={[1, 0.95, 0.94]} castShadow />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={GEO.ear} material={M.skin} position={[s * 0.345, -0.03, -0.01]} scale={[0.7, 1, 1]} />
          ))}
          {has('earrings') &&
            [-1, 1].map((s) => <mesh key={`er${s}`} geometry={GEO.earring} material={M.gold} position={[s * 0.35, -0.11, 0.01]} />)}
          {has('inear') && (
            <mesh geometry={GEO.earring} position={[0.355, -0.03, 0.03]} scale={1.6}>
              <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={1.4} />
            </mesh>
          )}

          {/* Má hồng */}
          {[-1, 1].map((s) => (
            <mesh key={`b${s}`} geometry={GEO.blush} material={M.blush} position={[s * 0.2, -0.075, 0.3]} rotation={[0, s * 0.42, 0]} />
          ))}

          {/* MẮT: lòng trắng + tròng + con ngươi + ánh sáng */}
          {[-1, 1].map((s) => (
            <group key={`e${s}`} ref={s < 0 ? leftEyeRef : rightEyeRef} position={[s * 0.125, 0.02, 0.29]}>
              <mesh geometry={GEO.sclera} material={M.sclera} scale={[1, 1.12, 0.6]} />
              <mesh geometry={GEO.iris} material={M.iris} position={[0, -0.004, 0.028]} scale={[1, 1.1, 0.5]} />
              <mesh geometry={GEO.pupil} material={M.pupil} position={[0, -0.004, 0.043]} scale={[1, 1.1, 0.4]} />
              <mesh geometry={GEO.glint} material={M.glint} position={[0.018, 0.022, 0.05]} />
              {look.lashes && <mesh geometry={GEO.lash} material={M.pupil} position={[0, 0.012, 0.03]} rotation={[0, 0, Math.PI * 0.15]} />}
            </group>
          ))}

          {/* LÔNG MÀY */}
          <mesh ref={leftBrowRef} geometry={GEO.brow} material={M.hair} position={[-0.125, 0.15, 0.32]} rotation={[0, 0, Math.PI / 2 + 0.06]} />
          <mesh ref={rightBrowRef} geometry={GEO.brow} material={M.hair} position={[0.125, 0.15, 0.32]} rotation={[0, 0, Math.PI / 2 - 0.06]} />

          {/* MŨI */}
          <mesh geometry={GEO.nose} material={M.skin} position={[0, -0.04, 0.335]} scale={[1, 0.85, 0.9]} />

          {/* MIỆNG: nụ cười khi khép + khoang miệng khi nói */}
          <group position={[0, -0.135, 0.31]}>
            <mesh ref={smileRef} geometry={GEO.smile} material={M.lip} rotation={[0, 0, Math.PI]} position={[0, 0.03, 0]} />
            <group ref={mouthRef} scale={[0.9, 0.05, 1]}>
              <mesh geometry={GEO.mouth} material={M.mouth} scale={[1, 1, 0.45]} />
              <mesh geometry={GEO.teeth} material={M.white} position={[0, 0.03, 0.018]} />
            </group>
          </group>

          {has('beard') && <mesh geometry={GEO.head} material={M.beard} position={[0, -0.17, 0.1]} scale={[0.62, 0.42, 0.62]} />}

          {has('glasses') && (
            <group position={[0, 0.02, 0.345]}>
              {[-0.125, 0.125].map((x) => (
                <mesh key={x} geometry={GEO.glassRim} material={M.gold} position={[x, 0, 0]} />
              ))}
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.gold}>
                <cylinderGeometry args={[0.009, 0.009, 0.08, 6]} />
              </mesh>
            </group>
          )}

          {(has('headset') || has('phones')) && (
            <group>
              <mesh position={[0, 0.05, 0]} material={M.silver}>
                <torusGeometry args={[0.395, 0.022, 10, 32, Math.PI]} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.375, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={M.accent}>
                  <cylinderGeometry args={[0.08, 0.08, 0.06, 18]} />
                </mesh>
              ))}
              {has('headset') && (
                <mesh position={[0.3, -0.16, 0.18]} rotation={[0.2, -0.6, 0.9]} material={M.silver}>
                  <cylinderGeometry args={[0.01, 0.01, 0.25, 6]} />
                </mesh>
              )}
            </group>
          )}

          <Hair look={look} M={M} />

          {mood === 'listening' && (
            <mesh position={[0.45, 0.2, 0]} rotation={[0, 0.4, 0]}>
              <torusGeometry args={[0.12, 0.015, 8, 24]} />
              <meshBasicMaterial color="#22D3EE" transparent opacity={0.8} />
            </mesh>
          )}
          {mood === 'happy' && (
            <Html position={[0, 0.58, 0]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none select-none animate-bounce text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">✨🌟✨</div>
            </Html>
          )}
          {mood === 'confused' && (
            <Html position={[0.3, 0.5, 0]} center zIndexRange={[20, 0]}>
              <div className="pointer-events-none select-none animate-pulse text-xl font-bold text-cyan-300 drop-shadow">💧❓</div>
            </Html>
          )}
          {nameTag && <NameTag y={0.64} text={nameTag} />}
        </group>
      </group>
    </group>
  );
};

const NameTag: React.FC<{ y: number; text: string }> = ({ y, text }) => (
  <Html position={[0, y, 0]} center zIndexRange={[20, 0]}>
    <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/25 bg-[#120A30]/85 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
      {text}
    </div>
  </Html>
);

type Mats = Record<string, THREE.Material>;

const Hair: React.FC<{ look: LookConfig; M: Mats }> = ({ look, M }) => {
  const st = look.hairStyle;
  if (st === 'beanie') {
    return (
      <group>
        <mesh geometry={GEO.hairCap} material={M.hair} position={[0, 0.03, -0.03]} scale={[1, 0.9, 1]} />
        <mesh geometry={GEO.beanie} material={M.hat} position={[0, 0.12, -0.01]} />
        <mesh geometry={GEO.beanieRim} material={M.hat} position={[0, 0.13, -0.01]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={GEO.pompom} material={M.white} position={[0, 0.53, -0.02]} />
      </group>
    );
  }
  return (
    <group>
      {/* Mũ tóc cơ bản */}
      <mesh geometry={GEO.hairCap} material={M.hair} position={[0, 0.06, -0.025]} />
      {st === 'swoop' && (
        <>
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[0.06, 0.3, 0.2]} scale={[1.5, 0.85, 1]} rotation={[0.4, 0, -0.35]} />
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[-0.12, 0.3, 0.16]} scale={[1.1, 0.7, 0.9]} rotation={[0.3, 0, 0.3]} />
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[0.2, 0.18, 0.2]} scale={[0.8, 0.8, 0.8]} />
        </>
      )}
      {st === 'side' && (
        <>
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[-0.08, 0.26, 0.22]} scale={[1.6, 0.6, 0.9]} rotation={[0.5, 0, 0.18]} />
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[0.22, 0.14, 0.18]} scale={[0.7, 0.9, 0.8]} />
        </>
      )}
      {st === 'crew' && <mesh geometry={GEO.hairBlob} material={M.hair} position={[0, 0.28, 0.2]} scale={[1.6, 0.45, 0.8]} rotation={[0.6, 0, 0]} />}
      {st === 'curly' &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const ring = i % 2 ? 0.27 : 0.17;
          return (
            <mesh
              key={i}
              geometry={GEO.curl}
              material={M.hair}
              position={[Math.cos(a) * ring, 0.3 + (i % 3) * 0.03, Math.sin(a) * ring * 0.9 - 0.02]}
              scale={1.05 + (i % 3) * 0.1}
            />
          );
        })}
      {st === 'updo' && (
        <>
          <mesh geometry={GEO.bun} material={M.hair} position={[0, 0.42, -0.12]} />
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[0.05, 0.26, 0.22]} scale={[1.4, 0.6, 0.8]} rotation={[0.5, 0, -0.2]} />
        </>
      )}
      {(st === 'long' || st === 'veil') && (
        <>
          <mesh geometry={GEO.longBack} material={M.hair} position={[0, -0.15, -0.2]} scale={[1.05, 1, 0.8]} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={GEO.lock} material={M.hair} position={[s * 0.3, -0.12, 0.08]} rotation={[0.1, 0, s * 0.08]} />
          ))}
          <mesh geometry={GEO.hairBlob} material={M.hair} position={[0, 0.27, 0.21]} scale={[1.7, 0.55, 0.8]} rotation={[0.55, 0, 0]} />
        </>
      )}
      {st === 'veil' && (
        <group>
          <mesh position={[0, 0.38, 0.12]} rotation={[-0.25, 0, 0]} material={M.gold}>
            <torusGeometry args={[0.14, 0.022, 8, 22, Math.PI]} />
          </mesh>
          <mesh position={[0, -0.08, -0.28]} rotation={[0.12, 0, 0]}>
            <coneGeometry args={[0.4, 0.95, 24, 1, true]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.45} roughness={0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const HandProp: React.FC<{ kind: NonNullable<LookConfig['propArt']>; M: Mats }> = ({ kind, M }) => (
  <group position={[0.07, -0.34, 0.13]} rotation={[Math.PI / 3, 0, 0]}>
    {(kind === 'mic' || kind === 'goldmic') && (
      <group>
        <mesh material={kind === 'goldmic' ? M.gold : M.silver}>
          <cylinderGeometry args={[0.026, 0.02, 0.24, 14]} />
        </mesh>
        <mesh position={[0, 0.15, 0]} material={kind === 'goldmic' ? M.gold : M.silver}>
          <sphereGeometry args={[0.055, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={M.accent}>
          <cylinderGeometry args={[0.03, 0.03, 0.025, 14]} />
        </mesh>
      </group>
    )}
    {kind === 'cup' && (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.065, 0.05, 0.16, 18]} />
          <meshStandardMaterial color="#FEF3C7" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.03, 18]} />
          <meshStandardMaterial color="#78350F" />
        </mesh>
      </group>
    )}
    {(kind === 'tablet' || kind === 'clipboard') && (
      <RoundedBox args={[0.2, 0.27, 0.025]} radius={0.012} smoothness={2} position={[0, 0.06, 0]} rotation={[-0.4, 0, 0]}>
        <meshStandardMaterial
          color={kind === 'tablet' ? '#0EA5E9' : '#B45309'}
          emissive={kind === 'tablet' ? '#0284C7' : '#000000'}
          emissiveIntensity={0.4}
        />
      </RoundedBox>
    )}
    {kind === 'bouquet' && (
      <group position={[0, 0.08, 0]}>
        {[
          [0, 0, 0, '#F43F5E'],
          [0.06, 0.04, 0.03, '#FDA4AF'],
          [-0.05, 0.03, 0.04, '#FFFFFF'],
          [0.02, 0.06, -0.04, '#FB7185'],
        ].map(([x, y, z, c], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]}>
            <icosahedronGeometry args={[0.07, 1]} />
            <meshStandardMaterial color={c as string} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0]}>
          <coneGeometry args={[0.06, 0.16, 10]} />
          <meshStandardMaterial color="#15803D" />
        </mesh>
      </group>
    )}
  </group>
);
