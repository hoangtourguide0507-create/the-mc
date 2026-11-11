/**
 * Cảnh tạm của giai đoạn 1: trời Ghibli theo buổi + sa bàn tròn + khối đánh dấu.
 * Dùng để kiểm tra engine, chuyển cảnh và vá shader; sẽ được thay bằng cảnh thật.
 */
import * as THREE from 'three';
import { disposeTree, type GameScene } from '../engine/Engine';
import { damp } from '../engine/smooth';
import { GHIBLI, ghibliSky } from '../three/artStyle';

export class PlaceholderScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  private marker: THREE.Mesh;
  private bob = 0;

  constructor(accent: string, periodId = 'morning') {
    const sky = ghibliSky(periodId);
    this.scene.background = gradientTexture(sky.top, sky.bottom);
    this.scene.fog = new THREE.Fog(sky.fog, 30, 90);

    this.scene.add(new THREE.HemisphereLight(GHIBLI.hemiSky, GHIBLI.hemiGround, 1.1));
    const sun = new THREE.DirectionalLight(GHIBLI.sun, 2.2);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -12;
    sun.shadow.camera.right = sun.shadow.camera.top = 12;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10.6, 0.8, 48),
      new THREE.MeshStandardMaterial({ color: GHIBLI.grass[0], roughness: 1 })
    );
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.marker = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.8, flatShading: true })
    );
    this.marker.position.y = 2;
    this.marker.castShadow = true;
    this.scene.add(this.marker);

    this.camera.position.set(0, 7, 16);
    this.camera.lookAt(0, 1.5, 0);
  }

  enter(): void {
    this.bob = 1.2; // nảy nhẹ khi vào cảnh
  }

  update(dt: number, elapsed: number): void {
    this.bob = damp(this.bob, 0, 4, dt);
    this.marker.rotation.y += dt * 0.6;
    this.marker.position.y = 2 + Math.sin(elapsed * 1.5) * 0.15 + this.bob;
  }

  dispose(): void {
    disposeTree(this.scene);
    (this.scene.background as THREE.Texture | null)?.dispose?.();
  }
}

function gradientTexture(top: string, bottom: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
