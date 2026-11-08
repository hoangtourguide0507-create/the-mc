import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);

  const [blinking, setBlinking] = useState(false);

  // Automatic natural Blink loop (1.8s - 5.2s, 85% chance, 20% double blink)
  useEffect(() => {
    let timer: number;
    let mounted = true;

    const scheduleBlink = () => {
      const delay = 1800 + Math.random() * 3400;
      timer = window.setTimeout(() => {
        if (!mounted) return;
        if (Math.random() < 0.85) {
          setBlinking(true);
          window.setTimeout(() => {
            if (!mounted) return;
            setBlinking(false);
            if (Math.random() < 0.2) {
              window.setTimeout(() => {
                if (!mounted) return;
                setBlinking(true);
                window.setTimeout(() => {
                  if (mounted) setBlinking(false);
                }, 110);
              }, 110);
            }
          }, 120);
        }
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const materials = useMemo(() => {
    const skinMat = new THREE.MeshStandardMaterial({
      color: look.skin || '#FAD2B8',
      roughness: 0.48,
      metalness: 0.04,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: look.hair || '#231829',
      roughness: 0.55,
      metalness: 0.08,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: look.cloth || '#1E2952',
      roughness: look.outfit === 'velvet' || look.outfit === 'gown' ? 0.32 : 0.5,
      metalness: look.outfit === 'velvet' ? 0.18 : 0.06,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: look.accent || '#38BDF8',
      roughness: 0.3,
      metalness: 0.25,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: look.eye || '#1E1B4B',
      roughness: 0.15,
      metalness: 0.1,
    });
    const lipMat = new THREE.MeshStandardMaterial({
      color: look.lip || '#E15B7E',
      roughness: 0.35,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      roughness: 0.18,
      metalness: 0.88,
      emissive: '#78350F',
      emissiveIntensity: 0.25,
    });
    const silverMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      roughness: 0.22,
      metalness: 0.8,
    });
    const blushMat = new THREE.MeshBasicMaterial({
      color: '#FB7185',
      transparent: true,
      opacity: 0.38,
    });
    return {
      skinMat,
      hairMat,
      clothMat,
      accentMat,
      eyeMat,
      lipMat,
      goldMat,
      silverMat,
      blushMat,
    };
  }, [look]);

  // Animation loop: Smoothly interpolate rotation, walk cycle, mood gestures, and 5 mouth visemes
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    if (rootRef.current) {
      // Smoothly interpolate Y rotation
      let diff = rotationY - rootRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rootRef.current.rotation.y += diff * Math.min(1, dt * 10);
    }

    if (bodyRef.current && headRef.current) {
      if (isWalking) {
        const walkSpeed = 13;
        bodyRef.current.position.y = Math.abs(Math.sin(t * walkSpeed)) * 0.09;
        bodyRef.current.rotation.z = Math.sin(t * walkSpeed) * 0.05;
        headRef.current.rotation.z = -Math.sin(t * walkSpeed) * 0.04;
        headRef.current.rotation.x = 0.04;

        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * 0.55;
          rightLegRef.current.rotation.x = -Math.sin(t * walkSpeed) * 0.55;
        }
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = -Math.sin(t * walkSpeed) * 0.45;
          rightArmRef.current.rotation.x = look.propArt
            ? -0.45 + Math.sin(t * walkSpeed) * 0.15
            : Math.sin(t * walkSpeed) * 0.45;
        }
      } else {
        // Mood & Idle animations
        const breathe = Math.sin(t * 2.4) * 0.025;
        let targetBodyY = breathe;
        let targetHeadZ = Math.sin(t * 1.3) * 0.03;
        let targetHeadX = Math.cos(t * 1.8) * 0.02;
        let targetLeftArmZ = 0.18;
        let targetLeftArmX = 0;

        if (mood === 'happy') {
          targetBodyY = Math.abs(Math.sin(t * 7.5)) * 0.16;
          targetHeadZ = Math.sin(t * 6) * 0.1;
          targetLeftArmZ = 0.65 + Math.sin(t * 10) * 0.2;
          targetLeftArmX = -0.4;
        } else if (mood === 'listening') {
          targetHeadZ = 0.21; // 12 deg tilt
          targetHeadX = -0.05;
          targetLeftArmZ = 0.45;
          targetLeftArmX = -0.55;
        } else if (mood === 'confused') {
          targetHeadZ = -0.22;
          targetHeadX = 0.08;
        }

        if (isSpeaking) {
          targetHeadX += Math.sin(t * 11) * 0.04;
          targetHeadZ += Math.cos(t * 8) * 0.03;
        }

        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetBodyY, dt * 8);
        bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, 0, dt * 8);
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, targetHeadZ, dt * 8);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetHeadX, dt * 8);

        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, dt * 10);
          rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, dt * 10);
        }
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetLeftArmZ, dt * 8);
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLeftArmX, dt * 8);
          const rightTargetX = look.propArt ? (isSpeaking ? -0.75 + Math.sin(t * 9) * 0.1 : -0.55) : 0;
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rightTargetX, dt * 8);
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.18, dt * 8);
        }
      }
    }

    // Eye blink & happy eye squint
    if (leftEyeRef.current && rightEyeRef.current) {
      const targetScaleY = blinking ? 0.08 : mood === 'happy' ? 0.35 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, targetScaleY, dt * 22);
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, targetScaleY, dt * 22);
    }

    // Eyebrows mood
    if (leftBrowRef.current && rightBrowRef.current) {
      const lbRot = mood === 'confused' ? 0.32 : mood === 'happy' ? 0.12 : 0.04;
      const rbRot = mood === 'confused' ? -0.35 : mood === 'happy' ? -0.12 : -0.04;
      const lbY = mood === 'confused' ? 0.19 : mood === 'happy' ? 0.18 : 0.15;
      leftBrowRef.current.rotation.z = THREE.MathUtils.lerp(leftBrowRef.current.rotation.z, lbRot, dt * 10);
      rightBrowRef.current.rotation.z = THREE.MathUtils.lerp(rightBrowRef.current.rotation.z, rbRot, dt * 10);
      leftBrowRef.current.position.y = THREE.MathUtils.lerp(leftBrowRef.current.position.y, lbY, dt * 10);
    }

    // 5 Visemes morphing on mouth mesh (a, e, o, m, rest)
    if (mouthRef.current) {
      let sx = 1;
      let sy = 0.35;
      if (viseme === 'a') {
        sx = 1.25;
        sy = 1.45;
      } else if (viseme === 'e') {
        sx = 1.45;
        sy = 0.75;
      } else if (viseme === 'o') {
        sx = 0.82;
        sy = 1.5;
      } else if (viseme === 'm') {
        sx = 1.15;
        sy = 0.18;
      } else if (mood === 'happy') {
        sx = 1.35;
        sy = 0.65;
      }
      mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, sx, dt * 20);
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, sy, dt * 20);
    }
  });

  const isLongDress = look.outfit === 'gown' || look.outfit === 'bride' || look.outfit === 'velvet';
  const hasGlasses = look.acc?.includes('glasses');
  const hasHeadset = look.acc?.includes('headset');
  // Optional external model: when look.glbUrl is set, the .glb replaces the procedural body.
  // All hooks above run first, so this early return is safe.
  if (look.glbUrl) {
    return (
      <group ref={rootRef} position={position} scale={scale} onClick={onClick}>
        {highlightRing && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.42, 0.54, 32]} />
            <meshBasicMaterial color="#22D3EE" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
        )}
        <Suspense fallback={null}>
          <GlbCharacter3D
            url={look.glbUrl}
            viseme={viseme}
            blinking={blinking}
            isWalking={isWalking}
          />
        </Suspense>
        {nameTag && (
          <Html position={[0, 1.45, 0]} center distanceFactor={10}>
            <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/25 bg-[#120A30]/85 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
              {nameTag}
            </div>
          </Html>
        )}
      </group>
    );
  }

  const hasInear = look.acc?.includes('inear');
  const hasPearls = look.acc?.includes('pearls');
  const hasPhones = look.acc?.includes('phones');
  const hasBeard = look.acc?.includes('beard');

  return (
    <group ref={rootRef} position={position} scale={scale} onClick={onClick}>
      {/* Active Speaker Highlight Ring on Floor */}
      {highlightRing && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.54, 32]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Soft Ground Contact Shadow Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#090518" transparent opacity={0.42} />
      </mesh>

      <group ref={bodyRef}>
        {/* LEGS */}
        <group ref={leftLegRef} position={[-0.12, 0.28, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow material={materials.skinMat}>
            <capsuleGeometry args={[0.075, 0.16, 8, 16]} />
          </mesh>
          <mesh position={[0, -0.25, 0.03]} castShadow material={materials.hairMat}>
            <boxGeometry args={[0.14, 0.09, 0.2]} />
          </mesh>
        </group>

        <group ref={rightLegRef} position={[0.12, 0.28, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow material={materials.skinMat}>
            <capsuleGeometry args={[0.075, 0.16, 8, 16]} />
          </mesh>
          <mesh position={[0, -0.25, 0.03]} castShadow material={materials.hairMat}>
            <boxGeometry args={[0.14, 0.09, 0.2]} />
          </mesh>
        </group>

        {/* TORSO / OUTFIT */}
        <group position={[0, 0.62, 0]}>
          {isLongDress ? (
            // Sculpted Gown / Bridal / Velvet Dress
            <mesh position={[0, -0.12, 0]} castShadow receiveShadow material={materials.clothMat}>
              <coneGeometry args={[0.38, 0.78, 24]} />
            </mesh>
          ) : (
            // Stylized Clay Torso
            <mesh position={[0, 0, 0]} castShadow receiveShadow material={materials.clothMat}>
              <capsuleGeometry args={[0.24, 0.28, 12, 24]} />
            </mesh>
          )}

          {/* Outfit Collar / Lapel / Tie / Apron Accent */}
          {look.outfit === 'apron' ? (
            <mesh position={[0, -0.04, 0.21]} material={materials.accentMat}>
              <boxGeometry args={[0.3, 0.38, 0.06]} />
            </mesh>
          ) : (
            <mesh position={[0, 0.15, 0.19]} material={materials.accentMat}>
              <octahedronGeometry args={[0.085, 1]} />
            </mesh>
          )}

          {/* Pearl Necklace */}
          {hasPearls && (
            <mesh position={[0, 0.22, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.19, 0.025, 10, 24]} />
              <meshStandardMaterial color="#FFFBEB" roughness={0.15} metalness={0.3} />
            </mesh>
          )}
        </group>

        {/* LEFT ARM */}
        <group ref={leftArmRef} position={[-0.29, 0.76, 0]}>
          <mesh position={[-0.04, -0.14, 0]} castShadow material={materials.clothMat}>
            <capsuleGeometry args={[0.068, 0.2, 8, 16]} />
          </mesh>
          <mesh position={[-0.05, -0.28, 0]} material={materials.skinMat}>
            <sphereGeometry args={[0.072, 16, 16]} />
          </mesh>
        </group>

        {/* RIGHT ARM + HAND PROP */}
        <group ref={rightArmRef} position={[0.29, 0.76, 0]}>
          <mesh position={[0.04, -0.14, 0]} castShadow material={materials.clothMat}>
            <capsuleGeometry args={[0.068, 0.2, 8, 16]} />
          </mesh>
          <mesh position={[0.05, -0.28, 0]} material={materials.skinMat}>
            <sphereGeometry args={[0.072, 16, 16]} />
          </mesh>

          {/* 3D Hand Props */}
          {look.propArt && (
            <group position={[0.06, -0.3, 0.14]} rotation={[Math.PI / 3, 0, 0]}>
              {(look.propArt === 'mic' || look.propArt === 'goldmic') && (
                <group>
                  <mesh material={look.propArt === 'goldmic' ? materials.goldMat : materials.silverMat}>
                    <cylinderGeometry args={[0.025, 0.02, 0.22, 12]} />
                  </mesh>
                  <mesh
                    position={[0, 0.13, 0]}
                    material={look.propArt === 'goldmic' ? materials.goldMat : materials.silverMat}
                  >
                    <sphereGeometry args={[0.052, 16, 16]} />
                  </mesh>
                </group>
              )}
              {look.propArt === 'cup' && (
                <group>
                  <mesh position={[0, 0.05, 0]}>
                    <cylinderGeometry args={[0.065, 0.05, 0.16, 16]} />
                    <meshStandardMaterial color="#FEF3C7" roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0.14, 0]}>
                    <cylinderGeometry args={[0.07, 0.07, 0.03, 16]} />
                    <meshStandardMaterial color="#78350F" />
                  </mesh>
                </group>
              )}
              {(look.propArt === 'tablet' || look.propArt === 'clipboard') && (
                <mesh position={[0, 0.06, 0]} rotation={[-0.4, 0, 0]}>
                  <boxGeometry args={[0.2, 0.26, 0.025]} />
                  <meshStandardMaterial
                    color={look.propArt === 'tablet' ? '#0EA5E9' : '#B45309'}
                    emissive={look.propArt === 'tablet' ? '#0284C7' : '#000000'}
                    emissiveIntensity={0.4}
                  />
                </mesh>
              )}
              {look.propArt === 'bouquet' && (
                <group position={[0, 0.08, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.11, 14, 14]} />
                    <meshStandardMaterial color="#F43F5E" roughness={0.5} />
                  </mesh>
                  <mesh position={[0.05, 0.04, 0.04]}>
                    <sphereGeometry args={[0.07, 12, 12]} />
                    <meshStandardMaterial color="#FDA4AF" roughness={0.5} />
                  </mesh>
                </group>
              )}
            </group>
          )}
        </group>

        {/* CHIBI CLAY HEAD */}
        <group ref={headRef} position={[0, 1.24, 0]}>
          <mesh castShadow receiveShadow material={materials.skinMat}>
            <sphereGeometry args={[0.36, 32, 32]} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.35, -0.02, 0]} material={materials.skinMat}>
            <sphereGeometry args={[0.075, 14, 14]} />
          </mesh>
          <mesh position={[0.35, -0.02, 0]} material={materials.skinMat}>
            <sphereGeometry args={[0.075, 14, 14]} />
          </mesh>

          {/* In-ear Monitor (glowing cyan earpiece) */}
          {hasInear && (
            <mesh position={[0.36, -0.02, 0.03]}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshStandardMaterial
                color="#22D3EE"
                emissive="#22D3EE"
                emissiveIntensity={1.2}
              />
            </mesh>
          )}

          {/* Soft Rosy Blush Cheeks */}
          <mesh position={[-0.19, -0.06, 0.31]} rotation={[0, -0.35, 0]} material={materials.blushMat}>
            <circleGeometry args={[0.065, 16]} />
          </mesh>
          <mesh position={[0.19, -0.06, 0.31]} rotation={[0, 0.35, 0]} material={materials.blushMat}>
            <circleGeometry args={[0.065, 16]} />
          </mesh>

          {/* LEFT EYE + CATCHLIGHT */}
          <group ref={leftEyeRef} position={[-0.13, 0.03, 0.33]}>
            <mesh material={materials.eyeMat}>
              <sphereGeometry args={[0.052, 16, 16]} />
            </mesh>
            <mesh position={[0.018, 0.02, 0.045]}>
              <sphereGeometry args={[0.016, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          {/* RIGHT EYE + CATCHLIGHT */}
          <group ref={rightEyeRef} position={[0.13, 0.03, 0.33]}>
            <mesh material={materials.eyeMat}>
              <sphereGeometry args={[0.052, 16, 16]} />
            </mesh>
            <mesh position={[0.018, 0.02, 0.045]}>
              <sphereGeometry args={[0.016, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          {/* EYEBROWS */}
          <mesh ref={leftBrowRef} position={[-0.13, 0.15, 0.33]} rotation={[0, 0, 0.05]} material={materials.hairMat}>
            <capsuleGeometry args={[0.016, 0.075, 6, 8]} />
          </mesh>
          <mesh ref={rightBrowRef} position={[0.13, 0.15, 0.33]} rotation={[0, 0, -0.05]} material={materials.hairMat}>
            <capsuleGeometry args={[0.016, 0.075, 6, 8]} />
          </mesh>

          {/* CUTE CLAY NOSE */}
          <mesh position={[0, -0.02, 0.36]} material={materials.skinMat}>
            <sphereGeometry args={[0.036, 12, 12]} />
          </mesh>

          {/* MORPHING 3D MOUTH (5 Visemes: a, e, o, m, rest) */}
          <mesh ref={mouthRef} position={[0, -0.13, 0.34]} material={materials.lipMat}>
            <sphereGeometry args={[0.048, 16, 16]} />
          </mesh>

          {/* BEARD */}
          {hasBeard && (
            <mesh position={[0, -0.16, 0.22]} material={materials.hairMat}>
              <sphereGeometry args={[0.23, 18, 18]} />
            </mesh>
          )}

          {/* GLASSES */}
          {hasGlasses && (
            <group position={[0, 0.03, 0.36]}>
              <mesh position={[-0.13, 0, 0]}>
                <torusGeometry args={[0.075, 0.012, 8, 24]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0.13, 0, 0]}>
                <torusGeometry args={[0.075, 0.012, 8, 24]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, 0.06, 8]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* HEADSET / HEADPHONES */}
          {(hasHeadset || hasPhones) && (
            <group>
              <mesh rotation={[0, 0, 0]} position={[0, 0.04, 0]}>
                <torusGeometry args={[0.38, 0.022, 10, 28, Math.PI]} />
                <meshStandardMaterial color="#38BDF8" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0.37, -0.02, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
                <meshStandardMaterial color="#0284C7" />
              </mesh>
            </group>
          )}

          {/* HAIR STYLES */}
          <group>
            {/* Top Hair Cap */}
            <mesh position={[0, 0.08, -0.02]} castShadow material={materials.hairMat}>
              <sphereGeometry args={[0.375, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            </mesh>
            {/* Front Swoop / Bangs */}
            <mesh position={[0.06, 0.22, 0.27]} rotation={[0.3, 0.2, -0.25]} castShadow material={materials.hairMat}>
              <capsuleGeometry args={[0.09, 0.22, 10, 16]} />
            </mesh>
            {look.hairStyle === 'updo' && (
              <mesh position={[0, 0.42, -0.08]} castShadow material={materials.hairMat}>
                <sphereGeometry args={[0.16, 18, 18]} />
              </mesh>
            )}
            {(look.hairStyle === 'long' || look.hairStyle === 'veil') && (
              <mesh position={[0, -0.12, -0.22]} castShadow material={materials.hairMat}>
                <capsuleGeometry args={[0.26, 0.32, 12, 18]} />
              </mesh>
            )}
            {look.hairStyle === 'veil' && (
              <group>
                {/* Bridal Tiara Crown */}
                <mesh position={[0, 0.39, 0.12]} rotation={[-0.2, 0, 0]} material={materials.goldMat}>
                  <torusGeometry args={[0.14, 0.022, 8, 20, Math.PI]} />
                </mesh>
                {/* Translucent Bridal Veil */}
                <mesh position={[0, -0.05, -0.28]} rotation={[0.15, 0, 0]}>
                  <coneGeometry args={[0.38, 0.85, 18]} />
                  <meshStandardMaterial color="#FFFFFF" transparent opacity={0.55} roughness={0.3} />
                </mesh>
              </group>
            )}
            {look.hairStyle === 'beanie' && (
              <mesh position={[0, 0.22, -0.02]}>
                <sphereGeometry args={[0.39, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial color={look.hat || '#7C3AED'} roughness={0.75} />
              </mesh>
            )}
          </group>

          {/* 3D MOOD VFX OVER HEAD */}
          {mood === 'listening' && (
            <group position={[0.42, 0.18, 0]}>
              <mesh rotation={[0, 0.4, 0]}>
                <torusGeometry args={[0.12, 0.015, 8, 24]} />
                <meshBasicMaterial color="#22D3EE" transparent opacity={0.8} />
              </mesh>
            </group>
          )}

          {mood === 'happy' && (
            <Html position={[0, 0.56, 0]} center distanceFactor={8}>
              <div className="pointer-events-none select-none animate-bounce text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
                ✨🌟✨
              </div>
            </Html>
          )}

          {mood === 'confused' && (
            <Html position={[0.28, 0.48, 0]} center distanceFactor={8}>
              <div className="pointer-events-none select-none animate-pulse text-xl font-bold text-cyan-300 drop-shadow">
                💧❓
              </div>
            </Html>
          )}

          {nameTag && (
            <Html position={[0, 0.62, 0]} center distanceFactor={10}>
              <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/25 bg-[#120A30]/85 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
                {nameTag}
              </div>
            </Html>
          )}
        </group>
      </group>
    </group>
  );
};
