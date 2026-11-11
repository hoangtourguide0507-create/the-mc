/**
 * Engine three.js thuần: MỘT canvas + MỘT WebGLRenderer dùng chung cho mọi cảnh
 * (phòng MC, thành phố, sân khấu). Mỗi cảnh là một GameScene được nạp lười theo tên.
 */
import * as THREE from 'three';

export interface EngineContext {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** Kích thước vùng vẽ tính bằng CSS px */
  width: number;
  height: number;
}

export interface GameScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Gọi khi cảnh trở thành cảnh đang hiển thị */
  enter?(ctx: EngineContext): void;
  /** dt đã được kẹp ≤ 0.1s để khung hình giật không làm hoạt cảnh nhảy vọt */
  update(dt: number, elapsed: number): void;
  resize?(width: number, height: number): void;
  /** Tự vẽ (ví dụ qua EffectComposer). Bỏ trống thì engine vẽ thẳng scene + camera. */
  render?(renderer: THREE.WebGLRenderer): void;
  leave?(): void;
  dispose(): void;
}

export type SceneFactory = (ctx: EngineContext) => GameScene | Promise<GameScene>;

const MAX_DT = 0.1;

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  private factories = new Map<string, SceneFactory>();
  private scenes = new Map<string, GameScene>();
  private active: GameScene | null = null;
  private activeName: string | null = null;
  private showToken = 0;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private running = false;
  private width = 1;
  private height = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  get context(): EngineContext {
    return { renderer: this.renderer, canvas: this.canvas, width: this.width, height: this.height };
  }

  get currentName(): string | null {
    return this.activeName;
  }

  register(name: string, factory: SceneFactory): void {
    this.factories.set(name, factory);
  }

  /** Nạp trước một cảnh (không hiển thị) để lúc chuyển cảnh không phải chờ. */
  async preload(name: string): Promise<GameScene> {
    const hit = this.scenes.get(name);
    if (hit) return hit;
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`[engine] Chưa đăng ký cảnh "${name}"`);
    const scene = await factory(this.context);
    // Hai lời gọi preload song song: giữ bản đầu, huỷ bản thừa
    const raced = this.scenes.get(name);
    if (raced) {
      scene.dispose();
      return raced;
    }
    this.scenes.set(name, scene);
    return scene;
  }

  /** Chuyển cảnh. Lời gọi sau cùng thắng nếu nhiều lời gọi chồng nhau. */
  async show(name: string): Promise<void> {
    const token = ++this.showToken;
    const next = await this.preload(name);
    if (token !== this.showToken || next === this.active) return;
    this.active?.leave?.();
    this.active = next;
    this.activeName = name;
    next.resize?.(this.width, this.height);
    this.applyAspect(next);
    next.enter?.(this.context);
  }

  /** Giải phóng một cảnh không còn dùng (trả bộ nhớ GPU trên iPhone). */
  unload(name: string): void {
    const scene = this.scenes.get(name);
    if (!scene || scene === this.active) return;
    scene.dispose();
    this.scenes.delete(name);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    for (const s of this.scenes.values()) s.dispose();
    this.scenes.clear();
    this.active = null;
    this.renderer.dispose();
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(MAX_DT, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.elapsed += dt;
    const s = this.active;
    if (!s) return;
    s.update(dt, this.elapsed);
    if (s.render) s.render(this.renderer);
    else this.renderer.render(s.scene, s.camera);
  };

  private resize = (): void => {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.width = w;
    this.height = h;
    // Giới hạn DPR: màn Retina 3x tốn gấp 2,25 lần điểm ảnh so với 2x mà khó thấy khác biệt
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    if (this.active) {
      this.applyAspect(this.active);
      this.active.resize?.(w, h);
    }
  };

  private applyAspect(s: GameScene): void {
    s.camera.aspect = this.width / this.height;
    s.camera.updateProjectionMatrix();
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.stop();
    else this.start();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.stop();
  };

  private onContextRestored = (): void => {
    this.start();
  };
}

/** Giải phóng geometry, material và texture của cả một cây đối tượng. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m as unknown as Record<string, unknown>)) {
        if (v instanceof THREE.Texture) v.dispose();
      }
      m.dispose();
    }
  });
}
