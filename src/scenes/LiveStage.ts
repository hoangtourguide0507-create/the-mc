/**
 * Sân khấu của màn diễn: khán phòng sáng nhìn từ cuối phòng lên sân khấu.
 * Có MC, khách mời, màn LED và các hàng khán giả dạng hình người đơn giản.
 * Khán giả phản ứng theo "độ nóng" (core/show.ts): vỗ tay, ngồi thẳng, hoặc cúi xem điện thoại.
 * Nền sáng, không bloom, không bóng đổ thật (dùng đĩa bóng mờ) để nhẹ máy điện thoại.
 */
import * as THREE from 'three';
import { disposeTree, type GameScene } from '../engine/Engine';
import { damp } from '../engine/smooth';
import type { StageTheme } from './StageBackdrop';

export type Speaker = 'mc' | 'guest' | 'wide';

interface Look {
  /** Màu chủ đạo trên màn LED và trang trí */
  accent: string;
  /** Màu rèm và tường */
  drape: string;
  guest: string;
  decor: (g: THREE.Group, look: Look) => void;
}

const LOOKS: Record<StageTheme, Look> = {
  lounge: { accent: '#C9A86A', drape: '#EFE6D6', guest: '#8C6F4E', decor: loungeDecor },
  conference: { accent: '#7FA3D9', drape: '#E6EBF2', guest: '#4F6788', decor: bannersDecor },
  runway: { accent: '#A9A6B8', drape: '#ECEAF0', guest: '#6E6A7C', decor: runwayDecor },
  concert: { accent: '#B79AD0', drape: '#EDE6F2', guest: '#7B6496', decor: concertDecor },
  wedding: { accent: '#E3A99A', drape: '#F6EAE2', guest: '#B9837A', decor: weddingDecor },
  gala: { accent: '#D9B15E', drape: '#F3E9D2', guest: '#8A6A2F', decor: galaDecor },
};

const ROWS = 5;
const COLS = 7;
const SEATS = ROWS * COLS;
const CONFETTI = 140;
const SUITS = ['#5E6B7A', '#8C7A6B', '#B58E84', '#6F7F6B', '#9A8FA8', '#C2A878', '#4F5560', '#A7B7C4'];
const SKINS = ['#F0D2B8', '#E3BC9A', '#C99A78', '#F4DCC8'];
const PAPER = ['#E3A99A', '#F2D38A', '#A9C8B5', '#B8B3DC', '#F4F0E6'];

interface Seat {
  x: number;
  z: number;
  phase: number;
  /** 0..1: khán giả dễ hào hứng (thấp) hay khó tính (cao) */
  hard: number;
}

export class LiveStage implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);

  private bg = new THREE.Color('#F3EEE5');
  private hemi = new THREE.HemisphereLight('#ffffff', '#E6D9C4', 2.1);
  private sun = new THREE.DirectionalLight('#FFF4E2', 1.5);
  private decor = new THREE.Group();
  private led: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private drapes: THREE.MeshLambertMaterial;
  private guestMat = new THREE.MeshLambertMaterial({ color: '#B9837A' });
  private mc: THREE.Group;
  private guest: THREE.Group;
  private pool: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;

  private bodies: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private phones: THREE.InstancedMesh;
  private seats: Seat[] = [];
  private dummy = new THREE.Object3D();

  private confetti: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private confVel = new Float32Array(CONFETTI * 3);
  private confLife = 0;

  private theme: StageTheme = 'wedding';
  private title = '';
  private mode: 'light' | 'dark' = 'light';
  private heat = 0.5;
  private heatTarget = 0.5;
  private cheerE = 0;
  private ovation = 0;
  private murmurE = 0;
  private shake = 0;
  private alarmE = 0;
  private focus: Speaker = 'wide';
  private talking: Speaker | null = null;
  private look = new THREE.Vector3(0, 2.1, -6);
  private dolly = 0;
  private offsetY = 0.1;
  private camZ = 15;
  private renderer: THREE.WebGLRenderer | null = null;
  private motion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1;

  constructor(mode: 'light' | 'dark' = 'light') {
    this.mode = mode;
    this.scene.background = this.bg;
    this.scene.fog = new THREE.Fog(this.bg, 24, 52);
    this.sun.position.set(3, 9, 8);
    this.scene.add(this.hemi, this.sun);

    // Sàn và thảm lối đi giữa
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), new THREE.MeshLambertMaterial({ color: '#E9E0D0' }));
    floor.rotation.x = -Math.PI / 2;
    const aisle = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 14), new THREE.MeshLambertMaterial({ color: '#DCCDB6' }));
    aisle.rotation.x = -Math.PI / 2;
    aisle.position.set(0, 0.01, 1);
    this.scene.add(floor, aisle);

    // Tường sau và rèm xếp nếp
    this.drapes = new THREE.MeshLambertMaterial({ color: '#F6EAE2' });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), this.drapes);
    wall.position.set(0, 8, -10);
    this.scene.add(wall);
    const fold = new THREE.CylinderGeometry(0.42, 0.42, 12, 10, 1, true);
    for (let i = -11; i <= 11; i++) {
      if (Math.abs(i) < 6) continue; // chừa chỗ cho màn LED
      const m = new THREE.Mesh(fold, this.drapes);
      m.position.set(i * 0.86, 6, -9.6);
      this.scene.add(m);
    }

    // Bục sân khấu, bậc thềm và viền
    const deckMat = new THREE.MeshLambertMaterial({ color: '#FBF7EF' });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 4.4), deckMat);
    deck.position.set(0, 0.3, -6.4);
    const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.8), deckMat);
    step.position.set(0, 0.15, -3.9);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(12.04, 0.08, 0.06), new THREE.MeshLambertMaterial({ color: '#C9A86A' }));
    trim.position.set(0, 0.56, -4.19);
    this.scene.add(deck, step, trim);

    // Màn LED: chữ tên sự kiện vẽ bằng canvas
    this.led = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), new THREE.MeshBasicMaterial({ fog: false }));
    this.led.position.set(0, 3.5, -9.4);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 4.5), new THREE.MeshLambertMaterial({ color: '#D8C7A8' }));
    frame.position.set(0, 3.5, -9.45);
    this.scene.add(frame, this.led);

    // Hai người trên sân khấu
    this.mc = person(new THREE.MeshLambertMaterial({ color: '#3A342C' }), '#E3BC9A', true);
    this.mc.position.set(-2.1, 0.6, -6);
    this.guest = person(this.guestMat, '#F0D2B8', false);
    this.guest.position.set(2.1, 0.6, -6);
    this.scene.add(this.mc, this.guest, blob(-2.1, 0.61, -6, 0.55), blob(2.1, 0.61, -6, 0.55));

    // Vệt đèn dưới chân người đang nói
    this.pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 40),
      new THREE.MeshBasicMaterial({ color: '#FFF3D6', transparent: true, opacity: 0, depthWrite: false })
    );
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.set(0, 0.615, -6);
    this.scene.add(this.pool, this.decor);

    // Khán giả: thân, đầu và màn hình điện thoại là ba InstancedMesh
    const lam = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    this.bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 10), lam, SEATS);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 14, 10), lam, SEATS);
    this.phones = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.16, 0.26),
      new THREE.MeshBasicMaterial({ color: '#CFE4FF', side: THREE.DoubleSide }),
      SEATS
    );
    const c = new THREE.Color();
    for (let r = 0; r < ROWS; r++) {
      for (let k = 0; k < COLS; k++) {
        const i = r * COLS + k;
        const side = k - (COLS - 1) / 2;
        // Chừa lối đi giữa, các hàng so le và cao dần về phía sau để không che nhau
        const x = side * 1.15 + Math.sign(side) * 0.45 + (r % 2 ? 0.28 : -0.28) * (side === 0 ? 0 : 1);
        this.seats.push({ x: side === 0 ? (r % 2 ? 0.95 : -0.95) : x, z: -1.6 + r * 1.35, phase: rand(i) * 6.28, hard: rand(i + 77) });
        this.bodies.setColorAt(i, c.set(SUITS[Math.floor(rand(i + 5) * SUITS.length)]));
        this.heads.setColorAt(i, c.set(SKINS[Math.floor(rand(i + 9) * SKINS.length)]));
        this.scene.add(blob(this.seats[i].x, 0.012, this.seats[i].z, 0.42));
      }
    }
    this.bodies.frustumCulled = this.heads.frustumCulled = this.phones.frustumCulled = false;
    this.scene.add(this.bodies, this.heads, this.phones);

    // Pháo giấy
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(CONFETTI * 3).fill(-99);
    const col = new Float32Array(CONFETTI * 3);
    for (let i = 0; i < CONFETTI; i++) c.set(PAPER[i % PAPER.length]).toArray(col, i * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.confetti = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));
    this.confetti.frustumCulled = false;
    this.scene.add(this.confetti);

    this.applyMode();
    this.setShow('wedding', '');
  }

  /** Đặt bối cảnh và tên sự kiện trên màn LED. Gọi khi vào một bài. */
  setShow(theme: StageTheme, title: string): void {
    this.theme = theme;
    this.title = title;
    const look = LOOKS[theme];
    this.guestMat.color.set(look.guest);
    this.drapes.color.set(this.mode === 'light' ? look.drape : '#3A3A42');
    this.led.material.map?.dispose();
    this.led.material.map = ledTexture(look.accent, title);
    this.led.material.needsUpdate = true;
    for (const child of [...this.decor.children]) {
      this.decor.remove(child);
      disposeTree(child);
    }
    look.decor(this.decor, look);
    this.reset();
  }

  /** Về trạng thái đầu show: khán phòng ở mức giữa, không vỗ tay, không pháo giấy. */
  reset(): void {
    this.heat = this.heatTarget = 0.5;
    this.cheerE = this.ovation = this.murmurE = this.shake = this.alarmE = 0;
    this.confLife = 0;
    this.focus = 'wide';
    this.talking = null;
  }

  setMode(mode: 'light' | 'dark'): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.applyMode();
    this.setShowKeep();
  }

  /** Độ nóng khán phòng, 0..1 */
  setHeat(v: number): void {
    this.heatTarget = Math.max(0, Math.min(1, v));
  }

  /** Khán giả vỗ tay. level 3 có pháo giấy; `ovation` = đứng dậy (cuối show). */
  cheer(level: 1 | 2 | 3, ovation = false): void {
    this.cheerE = Math.max(this.cheerE, level === 3 ? 1 : level === 2 ? 0.6 : 0.3);
    if (ovation) this.ovation = 1;
    if (level === 3 && this.motion) this.burst();
  }

  /** Khán phòng xì xào khi MC hụt một lượt */
  murmur(): void {
    this.murmurE = 1;
    this.shake = Math.max(this.shake, 0.5 * this.motion);
  }

  /** Sự cố bất ngờ: rung máy quay và ánh đèn ngả đỏ trong chốc lát */
  alarm(): void {
    this.alarmE = 1;
    this.shake = Math.max(this.shake, 1 * this.motion);
  }

  /** Máy quay hướng về người đang nói */
  setFocus(who: Speaker): void {
    this.focus = who;
  }

  /** Người đang nói nhún nhẹ theo lời (null = không ai nói) */
  setTalking(who: Speaker | null): void {
    this.talking = who;
  }

  enter(ctx: { renderer: THREE.WebGLRenderer; width: number; height: number }): void {
    this.renderer = ctx.renderer;
    ctx.renderer.toneMapping = THREE.NoToneMapping;
    this.resize(ctx.width, ctx.height);
  }

  resize(w: number, h: number): void {
    const portrait = h > w;
    this.camera.fov = portrait ? 58 : 40;
    // Nửa dưới màn hình là thẻ nhắc lời: dịch khung hình lên để sân khấu nằm ở nửa trên
    this.offsetY = portrait ? 0.1 : 0.12;
    this.camZ = portrait ? 15 : 10.5;
    this.camera.setViewOffset(w, h, 0, Math.round(h * this.offsetY), w, h);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, t: number): void {
    this.heat = damp(this.heat, this.heatTarget, 2.5, dt);
    this.cheerE = Math.max(0, this.cheerE - dt * 0.55);
    this.ovation = Math.max(0, this.ovation - dt * 0.12);
    this.murmurE = Math.max(0, this.murmurE - dt * 0.9);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.alarmE = Math.max(0, this.alarmE - dt * 0.5);
    this.hemi.color.setRGB(1, 1 - this.alarmE * 0.22, 1 - this.alarmE * 0.28);
    const m = this.motion;

    // Khán giả
    const d = this.dummy;
    for (let i = 0; i < SEATS; i++) {
      const s = this.seats[i];
      // Người "khó tính" chỉ hào hứng khi khán phòng thật nóng, và là người nguội trước
      const joins = this.heat + this.cheerE * 0.5 > s.hard * 0.8 ? 1 : 0.25;
      const clap = this.cheerE * joins * Math.abs(Math.sin(t * 11 + s.phase)) * 0.1 * m;
      const stand = this.ovation > 0.02 ? Math.min(1, this.ovation * 3) * 0.42 * joins : 0;
      const bored = Math.max(0, Math.min(1, (0.42 + s.hard * 0.22 - this.heat) * 4));
      const sway = Math.sin(t * 0.8 + s.phase) * 0.03 * m * this.heat;
      const lean = bored * 0.5 + this.murmurE * 0.12 * Math.sin(t * 6 + s.phase) * m;
      const y = 0.55 + clap + stand - bored * 0.16;

      d.position.set(s.x + sway, y, s.z);
      d.rotation.set(-lean * 0.6, 0, sway * 2 + this.murmurE * 0.18 * Math.sin(s.phase * 3) * m);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      this.bodies.setMatrixAt(i, d.matrix);

      d.position.set(s.x + sway * 1.6, y + 0.62 - bored * 0.1, s.z - lean * 0.3);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this.heads.setMatrixAt(i, d.matrix);

      // Điện thoại chỉ hiện khi người đó đã chán hẳn
      const phone = bored > 0.75 ? 1.5 : 0;
      // Giơ ngang vai, quay về phía máy quay để nhìn từ cuối phòng vẫn thấy màn hình sáng
      d.position.set(s.x + 0.3, y + 0.42, s.z + 0.05);
      d.rotation.set(-0.25, 0, 0.15);
      d.scale.setScalar(phone);
      d.updateMatrix();
      this.phones.setMatrixAt(i, d.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    this.phones.instanceMatrix.needsUpdate = true;

    // Người trên sân khấu
    const bob = (who: Speaker) => (this.talking === who ? Math.abs(Math.sin(t * 9)) * 0.05 * m : 0);
    this.mc.position.y = 0.6 + bob('mc');
    this.guest.position.y = 0.6 + bob('guest');
    this.mc.rotation.y = damp(this.mc.rotation.y, this.focus === 'guest' ? 0.7 : 0.15, 4, dt);
    this.guest.rotation.y = damp(this.guest.rotation.y, this.focus === 'mc' ? -0.7 : -0.15, 4, dt);

    // Vệt đèn theo người nói
    const px = this.focus === 'mc' ? -2.1 : this.focus === 'guest' ? 2.1 : 0;
    this.pool.position.x = damp(this.pool.position.x, px, 5, dt);
    this.pool.material.opacity = damp(this.pool.material.opacity, this.focus === 'wide' ? 0 : this.mode === 'light' ? 0.75 : 0.25, 4, dt);

    // Pháo giấy
    if (this.confLife > 0) {
      this.confLife -= dt;
      const p = this.confetti.geometry.attributes.position as THREE.BufferAttribute;
      const a = p.array as Float32Array;
      for (let i = 0; i < CONFETTI; i++) {
        const j = i * 3;
        this.confVel[j + 1] -= 3.2 * dt;
        a[j] += (this.confVel[j] + Math.sin(t * 5 + i) * 0.5) * dt;
        a[j + 1] = Math.max(0.05, a[j + 1] + this.confVel[j + 1] * dt);
        a[j + 2] += this.confVel[j + 2] * dt;
      }
      p.needsUpdate = true;
      this.confetti.material.opacity = Math.min(1, this.confLife * 1.5);
    } else this.confetti.material.opacity = 0;

    // Máy quay: lia nhẹ về người nói, tiến gần hơn khi khán phòng nóng, rung khi hụt
    const tx = this.focus === 'mc' ? -1.1 : this.focus === 'guest' ? 1.1 : 0;
    this.look.x = damp(this.look.x, tx, 2.2, dt);
    this.dolly = damp(this.dolly, this.focus === 'wide' ? 0 : 1, 1.8, dt);
    const sh = this.shake * 0.08;
    this.camera.position.set(
      this.look.x * 0.35 + Math.sin(t * 0.25) * 0.25 * m + Math.sin(t * 47) * sh,
      3.6 + Math.cos(t * 53) * sh,
      this.camZ - this.dolly * 1.1
    );
    this.camera.lookAt(this.look.x, 1.7, -6);
  }

  dispose(): void {
    disposeTree(this.scene);
    this.led.material.map?.dispose();
  }

  private setShowKeep(): void {
    const keep = [this.heat, this.heatTarget] as const;
    this.setShow(this.theme, this.title);
    [this.heat, this.heatTarget] = keep;
  }

  private applyMode(): void {
    const light = this.mode === 'light';
    this.bg.set(light ? '#F3EEE5' : '#1B1C21');
    (this.scene.fog as THREE.Fog).color.copy(this.bg);
    this.hemi.intensity = light ? 2.1 : 0.75;
    this.sun.intensity = light ? 1.5 : 0.9;
    if (this.renderer) this.renderer.toneMapping = THREE.NoToneMapping;
  }

  private burst(): void {
    const p = this.confetti.geometry.attributes.position as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    for (let i = 0; i < CONFETTI; i++) {
      const j = i * 3;
      const side = i % 2 ? 1 : -1;
      a[j] = side * 5.2;
      a[j + 1] = 1;
      a[j + 2] = -4.6;
      this.confVel[j] = -side * (1.5 + Math.random() * 3.5);
      this.confVel[j + 1] = 5 + Math.random() * 3.5;
      this.confVel[j + 2] = (Math.random() - 0.6) * 2.5;
    }
    p.needsUpdate = true;
    this.confLife = 3;
  }
}

/* ---------- Dựng hình ---------- */

/** Số giả ngẫu nhiên ổn định theo chỉ số: cùng một ghế luôn cùng một người */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
}

function person(suit: THREE.Material, skin: string, withMic: boolean): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.95, 4, 12), suit);
  body.position.y = 0.82;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.82;
  g.add(body, head);
  if (withMic) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), new THREE.MeshLambertMaterial({ color: '#2B2620' }));
    stick.position.set(0.3, 1.36, 0.3);
    stick.rotation.z = -0.3;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshLambertMaterial({ color: '#C9A86A' }));
    ball.position.set(0.35, 1.55, 0.3);
    g.add(stick, ball);
  }
  return g;
}

/** Đĩa bóng mờ thay cho bóng đổ thật */
let blobGeo: THREE.CircleGeometry | null = null;
let blobMat: THREE.MeshBasicMaterial | null = null;
function blob(x: number, y: number, z: number, r: number): THREE.Mesh {
  blobGeo ??= new THREE.CircleGeometry(1, 20);
  blobMat ??= new THREE.MeshBasicMaterial({ color: '#5B4A36', transparent: true, opacity: 0.13, depthWrite: false });
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.scale.setScalar(r);
  return m;
}

function ball(g: THREE.Group, r: number, color: string, x: number, y: number, z: number): void {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  g.add(m);
}

/** Tiệc cưới: cổng hoa sau lưng, hai bình hoa, dây đèn */
function weddingDecor(g: THREE.Group, look: Look): void {
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.1, 10, 48, Math.PI), new THREE.MeshLambertMaterial({ color: '#D9C6A5' }));
  arch.position.set(0, 2.9, -8.1);
  g.add(arch);
  for (const x of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 10), new THREE.MeshLambertMaterial({ color: '#D9C6A5' }));
    post.position.set(x, 1.75, -8.1);
    g.add(post);
  }
  const petals = [look.accent, '#F6E3DA', '#FBF4EA', '#C7D6BC'];
  for (let i = 0; i < 38; i++) {
    const a = (i / 37) * Math.PI;
    const j = rand(i + 3) - 0.5;
    ball(g, 0.2 + rand(i) * 0.14, petals[i % petals.length], Math.cos(a) * (1.8 + j * 0.3), 2.9 + Math.sin(a) * (1.8 + j * 0.3), -8 + j * 0.3);
  }
  for (const x of [-5, 5]) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1, 12), new THREE.MeshLambertMaterial({ color: '#FBF7EF' }));
    vase.position.set(x, 1.1, -5);
    g.add(vase);
    for (let i = 0; i < 9; i++) ball(g, 0.2, petals[i % petals.length], x + (rand(i + x) - 0.5) * 0.7, 1.8 + rand(i * 3 + x) * 0.5, -5 + (rand(i * 7) - 0.5) * 0.6);
  }
  bulbsDecor(g, look);
}

/** Dây đèn treo ngang phía trên sân khấu */
function bulbsDecor(g: THREE.Group, look: Look): void {
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: i % 4 ? '#FFF1CF' : look.accent, fog: false }));
    m.position.set((u - 0.5) * 18, 7.4 - Math.sin(u * Math.PI) * 0.9, -7);
    g.add(m);
  }
}

/** Hội nghị, thời trang: hai băng-rôn đứng và bục phát biểu */
function bannersDecor(g: THREE.Group, look: Look): void {
  for (const x of [-5.4, 5.4]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.6), new THREE.MeshLambertMaterial({ color: look.accent }));
    b.position.set(x, 2.5, -7.6);
    g.add(b);
  }
  const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: '#D8C7A8' }));
  lectern.position.set(-3.4, 1.15, -5.6);
  g.add(lectern);
  for (const x of [-7.4, 7.4]) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: look.accent, fog: false }));
    scr.position.set(x, 3.2, -8.8);
    scr.rotation.y = x < 0 ? 0.35 : -0.35;
    g.add(scr);
  }
  bulbsDecor(g, look);
}

function slab(g: THREE.Group, w: number, h: number, d: number, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** Khởi động, tổng duyệt: hai chậu cây và dây đèn, không khí thân mật */
function loungeDecor(g: THREE.Group, look: Look): void {
  for (const x of [-5.2, 5.2]) {
    slab(g, 0.6, 0.6, 0.6, '#D8C7A8', x, 0.9, -5.2);
    for (let i = 0; i < 7; i++) ball(g, 0.3, i % 2 ? '#A9C2A0' : '#8FB08A', x + (rand(i + x) - 0.5) * 0.7, 1.5 + rand(i * 5 + x) * 0.9, -5.2 + (rand(i * 9) - 0.5) * 0.5);
  }
  bulbsDecor(g, look);
}

/** Thời trang, thương hiệu: sàn catwalk chạy xuống giữa khán phòng, hai băng-rôn */
function runwayDecor(g: THREE.Group, look: Look): void {
  slab(g, 2.2, 0.5, 7.5, '#FBF7EF', 0, 0.25, -0.6);
  for (const x of [-1.12, 1.12]) slab(g, 0.05, 0.04, 7.5, look.accent, x, 0.51, -0.6);
  for (const x of [-5.4, 5.4]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.6), new THREE.MeshLambertMaterial({ color: look.accent }));
    b.position.set(x, 2.5, -7.6);
    g.add(b);
  }
  bulbsDecor(g, look);
}

/** Giải trí: giàn đèn màu trên cao và hai màn hình bên */
function concertDecor(g: THREE.Group, look: Look): void {
  slab(g, 16, 0.22, 0.22, '#CFC6D8', 0, 7.6, -5.5);
  const colors = [look.accent, '#F2B8C6', '#A9D3DC', '#F4E3A6'];
  for (let i = -5; i <= 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: colors[(i + 5) % colors.length], fog: false }));
    m.position.set(i * 1.5, 7.3, -5.5);
    g.add(m);
  }
  for (const x of [-6.6, 6.6]) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ color: look.accent, fog: false }));
    scr.position.set(x, 3.4, -8.6);
    scr.rotation.y = x < 0 ? 0.3 : -0.3;
    g.add(scr);
  }
}

/** Gala, tiệc: đèn chùm giữa trần và bàn tiệc tròn hai bên */
function galaDecor(g: THREE.Group, look: Look): void {
  for (let ring = 0; ring < 3; ring++) {
    const n = 10 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: ring % 2 ? look.accent : '#FFF1CF', fog: false }));
      m.position.set(Math.cos(a) * (0.5 + ring * 0.5), 7.6 - ring * 0.45, -4 + Math.sin(a) * (0.5 + ring * 0.5));
      g.add(m);
    }
  }
  for (const x of [-5.6, 5.6]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 28), new THREE.MeshLambertMaterial({ color: '#FBF7EF' }));
    top.position.set(x, 0.95, -2.6);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.9, 12), new THREE.MeshLambertMaterial({ color: '#D8C7A8' }));
    leg.position.set(x, 0.45, -2.6);
    g.add(top, leg);
    ball(g, 0.16, look.accent, x, 1.15, -2.6);
  }
  bulbsDecor(g, look);
}

/** Màn LED: nền chuyển màu phấn và tên sự kiện */
function ledTexture(accent: string, title: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 480;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1024, 480);
  g.addColorStop(0, '#FBF6EC');
  g.addColorStop(1, `#${new THREE.Color(accent).lerp(new THREE.Color('#FBF6EC'), 0.45).getHexString()}`);
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 480);
  x.strokeStyle = accent;
  x.lineWidth = 3;
  x.strokeRect(28, 28, 968, 424);
  x.fillStyle = '#4A3F33';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let size = 64;
  x.font = `italic 700 ${size}px "Playfair Display", Georgia, serif`;
  while (size > 40 && x.measureText(title).width > 880) {
    size -= 6;
    x.font = `italic 700 ${size}px "Playfair Display", Georgia, serif`;
  }
  x.fillText(title, 512, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
