/**
 * Tóc anime: các lọn tóc cong, vuốt nhọn (mái, tóc mai, tóc sau, sợi "ahoge"),
 * gộp thành MỘT lưới cho mỗi kiểu tóc để giữ ít draw call.
 * Toạ độ theo đầu: tâm (0,0,0), bán kính đầu 0.36, mặt hướng +Z.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HairStyle } from '../../types/game';

/** Một lọn tóc: rủ theo -Y, cong ra trước (+Z) theo `bend`, lệch ngang theo `sweep` */
function strand(len: number, width: number, thick: number, bend: number, sweep = 0, seg = 10, rad = 8) {
  const p0 = new THREE.Vector3(0, 0, 0);
  const p1 = new THREE.Vector3(sweep * 0.3, -len * 0.45, bend * 0.95);
  const p2 = new THREE.Vector3(sweep, -len, bend);
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const pos: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const c = curve.getPoint(t);
    const T = curve.getTangent(t).normalize();
    let S = new THREE.Vector3().crossVectors(T, up);
    if (S.lengthSq() < 1e-6) S = new THREE.Vector3(1, 0, 0);
    S.normalize();
    const N = new THREE.Vector3().crossVectors(S, T).normalize();
    // Phồng nhẹ ở gốc rồi vuốt nhọn về đuôi
    const taper = t < 0.2 ? 0.85 + t * 0.75 : Math.pow(1 - (t - 0.2) / 0.8, 0.9);
    const a = (width / 2) * taper;
    const b = (thick / 2) * taper;
    for (let j = 0; j < rad; j++) {
      const ang = (j / rad) * Math.PI * 2;
      const v = c.clone().addScaledVector(S, Math.cos(ang) * a).addScaledVector(N, Math.sin(ang) * b);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < rad; j++) {
      const a = i * rad + j;
      const b = i * rad + ((j + 1) % rad);
      const c = (i + 1) * rad + j;
      const d = (i + 1) * rad + ((j + 1) % rad);
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

interface Lock {
  az: number; // góc quanh đầu (0 = trước mặt, + về phía +X)
  el: number; // độ cao gốc trên đầu (rad)
  len: number;
  w: number;
  th?: number;
  bend: number;
  sweep?: number;
  tilt?: number; // nghiêng thêm ra ngoài
  flip?: boolean; // dựng ngược (ahoge, tóc dựng)
}

const R = 0.38;

function place(l: Lock) {
  const g = strand(l.len, l.w, l.th ?? l.w * 0.45, l.bend, l.sweep ?? 0);
  const m = new THREE.Matrix4();
  const rot = new THREE.Euler((l.flip ? Math.PI : 0) - (l.tilt ?? 0), l.az, 0, 'YXZ');
  m.makeRotationFromEuler(rot);
  const p = new THREE.Vector3(Math.sin(l.az) * R * Math.cos(l.el), R * Math.sin(l.el), Math.cos(l.az) * R * Math.cos(l.el));
  m.setPosition(p);
  g.applyMatrix4(m);
  return g;
}

/** Vỏ tóc phủ sọ: sau đầu + 2 bên + đỉnh, chừa khoảng mặt */
function shell() {
  const back = new THREE.SphereGeometry(0.385, 40, 24, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.62);
  const crown = new THREE.SphereGeometry(0.39, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.27);
  back.translate(0, 0.03, -0.01);
  crown.translate(0, 0.03, 0);
  return [back.toNonIndexed(), crown.toNonIndexed()];
}

function range(n: number, from: number, to: number) {
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));
}

function bangs(n: number, spread: number, len: number, sweep = 0, w = 0.13): Lock[] {
  return range(n, -spread, spread).map((az, i) => ({
    az,
    el: 0.78 - Math.abs(az) * 0.15,
    len: len * (1 - Math.abs(az) * 0.25) * (i % 2 ? 0.9 : 1),
    w,
    th: 0.05,
    bend: 0.16,
    sweep,
    tilt: 0.05,
  }));
}

function backLocks(n: number, len: number, w = 0.17, bend = 0.06): Lock[] {
  return range(n, Math.PI * 0.62, Math.PI * 1.38).map((az, i) => ({
    az,
    el: 0.42 + (i % 2) * 0.12,
    len: len * (i % 2 ? 0.9 : 1),
    w,
    th: 0.07,
    bend,
    tilt: 0.12,
  }));
}

function sideLocks(len: number, w = 0.12): Lock[] {
  return [-1, 1].map((s) => ({ az: s * 1.18, el: 0.42, len, w, th: 0.05, bend: 0.07, tilt: 0.06 }));
}

const ahoge: Lock = { az: 0.2, el: 1.45, len: 0.2, w: 0.06, th: 0.03, bend: 0.12, flip: true, tilt: -0.35 };

const RECIPES: Record<HairStyle, () => Lock[]> = {
  swoop: () => [...bangs(6, 0.72, 0.27, 0.07), ...sideLocks(0.32), ...backLocks(7, 0.3), ahoge],
  side: () => [...bangs(5, 0.7, 0.25, -0.06, 0.14), ...sideLocks(0.3), ...backLocks(7, 0.28)],
  crew: () => [
    ...bangs(5, 0.6, 0.15, 0.03, 0.12),
    ...backLocks(7, 0.2),
    ...range(5, -0.9, 0.9).map((az) => ({ az, el: 1.15, len: 0.16, w: 0.11, th: 0.05, bend: 0.1, flip: true, tilt: -0.5 })),
  ],
  curly: () => [...bangs(5, 0.66, 0.18, 0, 0.14), ...backLocks(7, 0.22, 0.2, 0.08)],
  long: () => [...bangs(7, 0.78, 0.28), ...sideLocks(0.62, 0.13), ...backLocks(9, 0.85, 0.19, 0.04)],
  updo: () => [...bangs(6, 0.72, 0.25, 0.04), ...sideLocks(0.36, 0.07), ...backLocks(7, 0.22)],
  veil: () => [...bangs(7, 0.78, 0.26), ...sideLocks(0.58, 0.12), ...backLocks(9, 0.75, 0.19, 0.04)],
  beanie: () => [...bangs(5, 0.7, 0.2, 0.02), ...sideLocks(0.3), ...backLocks(7, 0.26)],
};

const hairCache = new Map<string, THREE.BufferGeometry>();

/** Lưới tóc gộp cho một kiểu tóc (dùng chung giữa các nhân vật cùng kiểu) */
export function hairGeometry(style: HairStyle) {
  const hit = hairCache.get(style);
  if (hit) return hit;
  const parts: THREE.BufferGeometry[] = [];
  if (style !== 'beanie') parts.push(...shell());
  for (const l of RECIPES[style]()) parts.push(place(l).toNonIndexed());
  for (const p of parts) {
    p.deleteAttribute('uv');
  }
  const merged = mergeGeometries(parts.map((p) => {
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', p.getAttribute('position'));
    q.setAttribute('normal', p.getAttribute('normal'));
    return q;
  }));
  merged.computeBoundingSphere();
  hairCache.set(style, merged);
  return merged;
}

/** Vệt bóng "vầng hào quang" trên đỉnh tóc kiểu anime */
export const halo = new THREE.TorusGeometry(0.33, 0.022, 6, 40, Math.PI * 1.1);
