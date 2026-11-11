/**
 * Nền 3D duy nhất của bản mới: sân khấu tối, đèn sang trọng, không nhân vật.
 * Bối cảnh (theme) đổi theo tình huống bài học: sảnh chờ, hội nghị, sàn diễn thời trang,
 * concert idol, tiệc cưới, gala. Đổi theme bằng cách tối đèn rồi sáng lại (dip-to-black).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { disposeTree, type EngineContext, type GameScene } from '../engine/Engine';
import { damp } from '../engine/smooth';

export type StageTheme = 'lounge' | 'conference' | 'runway' | 'concert' | 'wedding' | 'gala';

interface ThemeSpec {
  /** Màu tường LED phía sau: tâm và rìa */
  wall: [string, string];
  /** Màu các luồng đèn */
  beams: string[];
  /** Màu hạt bokeh */
  bokeh: string;
  /** Tốc độ lia đèn */
  sway: number;
  props: (g: THREE.Group) => void;
}

const GOLD = '#E8C98A';

const THEMES: Record<StageTheme, ThemeSpec> = {
  lounge: {
    wall: ['#6B4526', '#0A0708'],
    beams: [GOLD, '#F3DDB0', GOLD],
    bokeh: '#F6DDA8',
    sway: 0.25,
    props: (g) => bulbs(g, 14, GOLD, 5.2, 9),
  },
  conference: {
    wall: ['#2A52A0', '#05080F'],
    beams: ['#BBD6FF', '#FFFFFF', '#BBD6FF', GOLD],
    bokeh: '#CFE2FF',
    sway: 0.18,
    props: (g) => {
      // Bục phát biểu và hai màn hình bên
      box(g, 0.9, 1.15, 0.6, '#15171C', 2.6, 0.575, -1.5);
      strip(g, 0.9, 0.04, '#BBD6FF', 2.6, 1.17, -1.19);
      for (const x of [-7.2, 7.2]) screen(g, 3.4, 5, '#3E6FC4', x, 3.4, -6.5, x < 0 ? 0.35 : -0.35);
    },
  },
  runway: {
    wall: ['#6A6A78', '#060607'],
    beams: ['#FFFFFF', '#F4F0FF', '#FFFFFF', '#FFFFFF', '#F4F0FF'],
    bokeh: '#FFFFFF',
    sway: 0.12,
    props: (g) => {
      // Sàn catwalk chạy về phía người xem, viền đèn hai bên
      box(g, 2.4, 0.25, 16, '#8C8A88', 0, 0.125, 1);
      for (const x of [-1.24, 1.24]) strip(g, 0.05, 16, '#FFFFFF', x, 0.26, 1, true);
      screen(g, 5, 6.5, '#8E8E9C', 0, 3.6, -8.2, 0);
    },
  },
  concert: {
    wall: ['#7A22A8', '#07030C'],
    beams: ['#FF4FD8', '#7C5CFF', '#22D3EE', '#FF4FD8', '#7C5CFF', '#22D3EE'],
    bokeh: '#FF9CEB',
    sway: 0.9,
    props: (g) => {
      // Giàn truss trên cao với dãy đèn
      box(g, 18, 0.25, 0.25, '#1B1B22', 0, 7.4, -3);
      for (let i = -4; i <= 4; i++) dot(g, 0.14, i % 2 ? '#22D3EE' : '#FF4FD8', i * 2, 7.2, -3);
      for (const x of [-6.5, 6.5]) screen(g, 2.6, 5.5, '#7C5CFF', x, 3.2, -7, x < 0 ? 0.3 : -0.3);
    },
  },
  wedding: {
    wall: ['#8A4A40', '#0C0707'],
    beams: ['#FFD9C2', '#FFE8C9', '#FFD9C2'],
    bokeh: '#FFE3CF',
    sway: 0.15,
    props: (g) => {
      // Cổng hoa và rèm đèn
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.16, 12, 48, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#BFA898', roughness: 0.8 })
      );
      arch.position.set(0, 2.2, -4);
      g.add(arch);
      for (const x of [-2.6, 2.6]) box(g, 0.32, 2.2, 0.32, '#BFA898', x, 1.1, -4);
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        dot(g, 0.13, i % 3 ? '#FFD9C2' : '#FFF4E6', Math.cos(a) * 2.6, 2.2 + Math.sin(a) * 2.6, -3.8);
      }
      bulbs(g, 22, '#FFE0B8', 6, 12);
    },
  },
  gala: {
    wall: ['#7A5618', '#090705'],
    beams: [GOLD, '#FFF1CF', GOLD, '#FFB86B'],
    bokeh: '#FFE2A6',
    sway: 0.3,
    props: (g) => {
      // Đèn chùm và bàn tiệc tròn
      for (let ring = 0; ring < 3; ring++) {
        const n = 10 + ring * 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          dot(g, 0.09, '#FFE9BF', Math.cos(a) * (0.6 + ring * 0.55), 6.6 - ring * 0.5, -3 + Math.sin(a) * (0.6 + ring * 0.55));
        }
      }
      for (const [x, z] of [[-4.5, 0], [4.5, 0], [-6.5, -4], [6.5, -4]]) {
        const t = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.1, 0.08, 32),
          new THREE.MeshStandardMaterial({ color: '#1A1512', roughness: 0.4, metalness: 0.3 })
        );
        t.position.set(x, 0.8, z);
        g.add(t);
        dot(g, 0.07, '#FFD9A0', x, 0.98, z);
      }
    },
  },
};

const BEAM_SLOTS = 6;

export class StageBackdrop implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  private wall: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private floorGlow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private beams: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>[] = [];
  private spots: THREE.SpotLight[] = [];
  private bokeh: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private props = new THREE.Group();
  private beamTex = beamTexture();
  private dotTex = dotTexture();

  private theme: StageTheme = 'lounge';
  private pending: StageTheme | null = null;
  /** 0 = tối hẳn, 1 = sáng đủ */
  private light = 0;
  private sway = 0.25;
  private portrait = true;

  constructor(theme: StageTheme = 'lounge') {
    this.scene.background = new THREE.Color('#050406');
    this.scene.fog = new THREE.Fog('#050406', 16, 46);
    this.scene.add(new THREE.AmbientLight('#2A2430', 0.9));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 60),
      new THREE.MeshStandardMaterial({ color: '#0B0A0D', roughness: 0.28, metalness: 0.65 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(64, 30), new THREE.MeshBasicMaterial({ fog: false }));
    this.wall.position.set(0, 9, -10);
    this.scene.add(this.wall);

    this.floorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 16),
      new THREE.MeshBasicMaterial({ map: this.dotTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.set(0, 0.02, -3);
    this.scene.add(this.floorGlow);

    // Luồng đèn: nón rỗng, đỉnh ở giàn đèn, mờ dần về phía sàn
    const cone = new THREE.ConeGeometry(2.1, 11, 32, 1, true);
    cone.translate(0, -5.5, 0);
    for (let i = 0; i < BEAM_SLOTS; i++) {
      const m = new THREE.Mesh(
        cone,
        new THREE.MeshBasicMaterial({
          map: this.beamTex, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
        })
      );
      m.position.set((i - (BEAM_SLOTS - 1) / 2) * 3.1, 10.2, -5.5);
      this.beams.push(m);
      this.scene.add(m);
    }
    for (let i = 0; i < 3; i++) {
      const s = new THREE.SpotLight('#ffffff', 0, 30, 0.5, 0.7, 1.2);
      s.position.set((i - 1) * 6, 10, 1);
      s.target.position.set((i - 1) * 2.5, 0, -3);
      this.spots.push(s);
      this.scene.add(s, s.target);
    }

    // Hạt bokeh trôi chậm
    const N = 140;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 11;
      pos[i * 3 + 2] = -9 + Math.random() * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.bokeh = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: this.dotTex, size: 0.42, transparent: true, opacity: 0.55, sizeAttenuation: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.scene.add(this.bokeh, this.props);

    this.applyTheme(theme);
  }

  get currentTheme(): StageTheme {
    return this.pending ?? this.theme;
  }

  /** Đổi bối cảnh: đèn tối dần, thay đạo cụ, rồi sáng lại. */
  setTheme(theme: StageTheme): void {
    if (theme === this.currentTheme) return;
    this.pending = theme;
  }

  enter(ctx: EngineContext): void {
    this.renderer = ctx.renderer;
    if (!this.composer) {
      const c = new EffectComposer(ctx.renderer);
      c.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(ctx.width / 2, ctx.height / 2), 0.75, 0.85, 0.55);
      c.addPass(this.bloom);
      c.addPass(new OutputPass());
      this.composer = c;
    }
    this.resize(ctx.width, ctx.height);
  }

  resize(w: number, h: number): void {
    this.portrait = h > w;
    // Màn dọc: lùi máy và mở góc để vẫn thấy đủ bề ngang sân khấu
    this.camera.fov = this.portrait ? 62 : 44;
    if (this.portrait) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, -Math.round(w * 0.2), 0, w, h);
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.composer.setSize(w, h);
    }
  }

  update(dt: number, t: number): void {
    // Chuyển theme: tối xuống, đổi, sáng lên
    const target = this.pending ? 0 : 1;
    this.light = damp(this.light, target, this.pending ? 7 : 2.4, dt);
    if (this.pending && this.light < 0.03) {
      this.applyTheme(this.pending);
      this.pending = null;
    }
    const spec = THEMES[this.theme];
    this.sway = damp(this.sway, spec.sway, 2, dt);

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      if (!b.visible) continue;
      b.rotation.z = Math.sin(t * this.sway + i * 1.7) * 0.42;
      b.rotation.x = 0.12 + Math.cos(t * this.sway * 0.7 + i) * 0.14;
      b.material.opacity = (0.13 + 0.05 * Math.sin(t * 0.8 + i * 2.1)) * this.light;
    }
    for (const s of this.spots) s.intensity = 110 * this.light;
    this.wall.material.opacity = 1;
    this.wall.material.color.setScalar(this.light);
    this.floorGlow.material.opacity = 0.35 * this.light;
    this.bokeh.material.opacity = 0.55 * this.light;
    this.props.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && m.userData.glow) m.color.copy(m.userData.glow as THREE.Color).multiplyScalar(this.light);
    });

    const p = this.bokeh.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * (0.12 + (i % 7) * 0.02);
      if (y > 11) y = 0;
      p.setY(i, y);
    }
    p.needsUpdate = true;

    // Máy quay trôi rất chậm, không gây chóng mặt khi đọc bài
    const z = this.portrait ? 15 : 13;
    this.camera.position.set(Math.sin(t * 0.07) * 1.6, 3.1 + Math.sin(t * 0.11) * 0.25, z);
    this.camera.lookAt(0, 3.4, -4);
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer?.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeTree(this.scene);
    this.beamTex.dispose();
    this.dotTex.dispose();
    this.wall.material.map?.dispose();
    this.composer?.dispose();
  }

  private applyTheme(theme: StageTheme): void {
    this.theme = theme;
    const spec = THEMES[theme];
    this.wall.material.map?.dispose();
    this.wall.material.map = wallTexture(spec.wall[0], spec.wall[1]);
    this.wall.material.needsUpdate = true;
    this.floorGlow.material.color.set(spec.wall[0]).multiplyScalar(2.2);
    this.bokeh.material.color.set(spec.bokeh);
    this.beams.forEach((b, i) => {
      b.visible = i < spec.beams.length;
      if (b.visible) {
        b.material.color.set(spec.beams[i]);
        // Dàn đều các luồng đèn đang bật quanh tâm sân khấu
        b.position.x = (i - (spec.beams.length - 1) / 2) * (17 / Math.max(3, spec.beams.length));
      }
    });
    this.spots.forEach((s, i) => s.color.set(spec.beams[i % spec.beams.length]));
    for (const c of [...this.props.children]) {
      this.props.remove(c);
      disposeTree(c);
    }
    spec.props(this.props);
  }
}

/* ---------- Đạo cụ dựng bằng khối cơ bản ---------- */

function box(g: THREE.Group, w: number, h: number, d: number, color: string, x: number, y: number, z: number): void {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 })
  );
  m.position.set(x, y, z);
  g.add(m);
}

function glowMat(color: string): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, fog: false });
  m.userData.glow = new THREE.Color(color);
  return m;
}

/** Dải đèn phát sáng; `alongZ` để chạy dọc theo trục z */
function strip(g: THREE.Group, w: number, len: number, color: string, x: number, y: number, z: number, alongZ = false): void {
  const m = new THREE.Mesh(alongZ ? new THREE.BoxGeometry(w, 0.03, len) : new THREE.BoxGeometry(w, len, 0.02), glowMat(color));
  m.position.set(x, y, z);
  g.add(m);
}

function dot(g: THREE.Group, r: number, color: string, x: number, y: number, z: number): void {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(color));
  m.position.set(x, y, z);
  g.add(m);
}

function screen(g: THREE.Group, w: number, h: number, color: string, x: number, y: number, z: number, ry: number): void {
  const mat = glowMat('#ffffff');
  mat.map = wallTexture(color, '#000000');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
}

/** Dây đèn treo thả từ trần */
function bulbs(g: THREE.Group, n: number, color: string, yMin: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * spread * 2;
    const y = yMin + ((i * 37) % 10) * 0.28;
    dot(g, 0.085, color, x, y, -6 + ((i * 13) % 5) * 0.8);
  }
}

/* ---------- Texture vẽ bằng canvas ---------- */

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tường LED: quầng sáng ở tâm, tối dần ra rìa, có các sọc dọc mảnh như tấm LED */
function wallTexture(center: string, edge: string): THREE.CanvasTexture {
  return canvasTex(512, 256, (c) => {
    const g = c.createRadialGradient(256, 170, 10, 256, 170, 210);
    g.addColorStop(0, center);
    g.addColorStop(1, edge);
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 256);
    c.globalAlpha = 0.08;
    c.fillStyle = '#000';
    for (let x = 0; x < 512; x += 16) c.fillRect(x, 0, 2, 256);
  });
}

/** Luồng đèn: sáng ở đỉnh (v = 1), tắt dần về đáy */
function beamTexture(): THREE.CanvasTexture {
  return canvasTex(8, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 128);
  });
}

function dotTexture(): THREE.CanvasTexture {
  return canvasTex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
}
