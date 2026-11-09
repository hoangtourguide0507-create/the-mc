/**
 * Tài nguyên dùng chung cho bản đồ: texture mặt tiền vẽ bằng canvas, cache vật liệu & hình khối.
 * Mọi thứ tạo một lần rồi tái sử dụng để giữ số draw call / bộ nhớ thấp trên iPhone.
 */
import * as THREE from 'three';
import { softTint } from '../artStyle';

export type FacadeKind = 'apt' | 'glass' | 'house' | 'office' | 'shop';

const texCache = new Map<string, { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture }>();

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Texture 4×4 ô (4 gian × 4 tầng). Tường vẽ trắng kem để nhân với màu vật liệu,
 * kính vẽ xanh dịu; texture phát sáng chỉ có các ô cửa đang bật đèn vàng ấm Ghibli.
 */
export function facadeTextures(kind: FacadeKind, variant = 0) {
  const k = `${kind}:${variant}`;
  const hit = texCache.get(k);
  if (hit) return hit;

  const S = 512;
  const cell = S / 4;
  const c1 = document.createElement('canvas');
  const c2 = document.createElement('canvas');
  c1.width = c1.height = c2.width = c2.height = S;
  const a = c1.getContext('2d')!;
  const e = c2.getContext('2d')!;
  const rnd = rand(1000 + variant * 77 + kind.length * 13);

  a.fillStyle = '#FFFFFF';
  a.fillRect(0, 0, S, S);
  e.fillStyle = '#000000';
  e.fillRect(0, 0, S, S);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x0 = col * cell;
      const y0 = row * cell;
      const lit = rnd() < (kind === 'glass' || kind === 'office' ? 0.62 : 0.52);
      const warm = rnd() < 0.7 ? '#FFD58A' : '#FFE4B5';

      if (kind === 'glass' || kind === 'office') {
        const pad = kind === 'glass' ? 6 : 14;
        const gx = x0 + pad;
        const gy = y0 + (kind === 'glass' ? 10 : 22);
        const gw = cell - pad * 2;
        const gh = cell - (kind === 'glass' ? 20 : 40);
        const grd = a.createLinearGradient(gx, gy, gx + gw, gy + gh);
        grd.addColorStop(0, '#A8C4DE');
        grd.addColorStop(0.55, '#6C8BB2');
        grd.addColorStop(1, '#4C658C');
        a.fillStyle = grd;
        a.fillRect(gx, gy, gw, gh);
        a.fillStyle = 'rgba(255,252,240,0.38)';
        a.fillRect(gx + gw * 0.12, gy + 4, gw * 0.08, gh - 8);
        a.fillStyle = '#F2ECE1';
        a.fillRect(gx + gw / 2 - 2, gy, 4, gh);
        if (lit) {
          e.fillStyle = warm;
          e.fillRect(gx, gy, gw, gh);
          e.fillStyle = '#000';
          e.fillRect(gx + gw / 2 - 2, gy, 4, gh);
        }
      } else {
        // Cửa sổ có khung gỗ/đá ấm, bậu cửa và rèm vải kem
        const ww = kind === 'house' ? cell * 0.5 : cell * 0.56;
        const wh = kind === 'house' ? cell * 0.52 : cell * 0.58;
        const wx = x0 + (cell - ww) / 2;
        const wy = y0 + cell * 0.18;
        a.fillStyle = '#E4DDD3';
        roundRect(a, wx - 7, wy - 7, ww + 14, wh + 14, 8);
        a.fill();
        const grd = a.createLinearGradient(wx, wy, wx, wy + wh);
        grd.addColorStop(0, '#B2CCE6');
        grd.addColorStop(1, '#55719A');
        a.fillStyle = grd;
        roundRect(a, wx, wy, ww, wh, 5);
        a.fill();
        // Rèm cửa kem ấm
        if (rnd() < 0.55) {
          a.fillStyle = 'rgba(255,246,232,0.78)';
          a.fillRect(wx, wy, ww * 0.28, wh);
          a.fillRect(wx + ww * 0.72, wy, ww * 0.28, wh);
        }
        // Đố chữ thập
        a.fillStyle = '#F4EFE6';
        a.fillRect(wx + ww / 2 - 3, wy, 6, wh);
        a.fillRect(wx, wy + wh * 0.45, ww, 5);
        // Bậu cửa
        a.fillStyle = '#C4B7A6';
        a.fillRect(wx - 10, wy + wh + 6, ww + 20, 9);
        if (kind === 'shop' && row === 3) {
          a.fillStyle = 'rgba(60,40,20,0.08)';
          a.fillRect(x0, y0, cell, cell);
        }
        if (lit) {
          e.fillStyle = warm;
          roundRect(e, wx, wy, ww, wh, 5);
          e.fill();
          e.fillStyle = '#000';
          e.fillRect(wx + ww / 2 - 3, wy, 6, wh);
        }
      }
      // Gờ sàn giữa các tầng
      a.fillStyle = 'rgba(60,40,20,0.10)';
      a.fillRect(x0, y0 + cell - 6, cell, 6);
    }
  }

  const make = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const out = { map: make(c1, true), emissive: make(c2, true) };
  texCache.set(k, out);
  return out;
}

/** Bản sao texture với số gian/tầng riêng (chia sẻ ảnh gốc) */
export function repeatTex(t: THREE.Texture, bays: number, floors: number) {
  const c = t.clone();
  c.repeat.set(bays / 4, floors / 4);
  c.needsUpdate = true;
  return c;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();

/** Vật liệu dùng chung theo màu + tham số (không chỉnh sửa từng cái riêng!) */
export function mat(
  color: string,
  opts: { rough?: number; metal?: number; emissive?: string; ei?: number; opacity?: number } = {}
) {
  const k = `${color}|${opts.rough ?? 0.6}|${opts.metal ?? 0}|${opts.emissive ?? ''}|${opts.ei ?? 0}|${opts.opacity ?? 1}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: softTint(color, 0.2),
      roughness: opts.rough ?? 0.6,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ? new THREE.Color(softTint(opts.emissive, 0.3)) : new THREE.Color('#000000'),
      emissiveIntensity: opts.ei ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    });
    matCache.set(k, m);
  }
  return m;
}

/** Vật liệu phát sáng có cường độ đổi theo ngày/đêm — mỗi building giữ bản riêng */
export function glowMat(color: string, emissive: string) {
  return new THREE.MeshStandardMaterial({
    color: softTint(color, 0.15),
    emissive: new THREE.Color(softTint(emissive, 0.3)),
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function geo<T extends THREE.BufferGeometry>(k: string, make: () => T): T {
  let g = geoCache.get(k);
  if (!g) {
    g = make();
    geoCache.set(k, g);
  }
  return g as T;
}

/** Lăng trụ tam giác (mái dốc) dài theo trục X */
export function gableGeometry(w: number, h: number, d: number) {
  return geo(`gable:${w}:${h}:${d}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(0, h);
    shape.lineTo(d / 2, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}
