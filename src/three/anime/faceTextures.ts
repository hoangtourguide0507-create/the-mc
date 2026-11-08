/**
 * Texture khuôn mặt anime vẽ bằng canvas — dán lên đầu nhân vật như decal.
 * Mắt / lông mày / miệng / má hồng đổi bằng cách thay texture (giống game anime 3D).
 * Toàn bộ là thiết kế gốc, không sao chép nhân vật có sẵn.
 */
import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

function tone(hex: string, dl: number, ds = 0) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s + ds)), Math.max(0, Math.min(1, hsl.l + dl)));
  return `#${c.getHexString()}`;
}

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, mirror = false) {
  const k = `${key}|${mirror ? 'M' : ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  if (mirror) {
    g.translate(w, 0);
    g.scale(-1, 1);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(k, t);
  return t;
}

/* ------------------------------------------------------------------ */
/* MẮT                                                                  */
/* ------------------------------------------------------------------ */

export type EyeState = 'open' | 'closed' | 'happy' | 'wide';
export const EYE_W = 220;
export const EYE_H = 256;

/** Đường viền trên/dưới của mắt (khoé trong bên trái canvas, khoé ngoài bên phải) */
function eyePath(g: CanvasRenderingContext2D, wide: boolean) {
  const top = wide ? 40 : 52;
  g.beginPath();
  g.moveTo(30, 128);
  g.bezierCurveTo(46, top + 18, 92, top - 6, 128, top);
  g.bezierCurveTo(162, top + 6, 186, 74, 196, 96);
  g.bezierCurveTo(198, 168, 170, 230, 116, 234);
  g.bezierCurveTo(66, 236, 36, 196, 30, 128);
  g.closePath();
}

export function eyeTexture(iris: string, lash: string, state: EyeState, lashes: boolean, mirror: boolean) {
  return make(`eye:${iris}:${lash}:${state}:${lashes}`, EYE_W, EYE_H, (g) => {
    if (state === 'closed' || state === 'happy') {
      g.strokeStyle = lash;
      g.lineWidth = 15;
      g.beginPath();
      if (state === 'closed') {
        // Mắt nhắm thư thái: đường cong võng xuống + vài sợi mi
        g.moveTo(34, 146);
        g.quadraticCurveTo(116, 196, 196, 140);
      } else {
        // Mắt cười ^ ^
        g.moveTo(36, 178);
        g.quadraticCurveTo(116, 74, 194, 172);
      }
      g.stroke();
      g.lineWidth = 7;
      if (state === 'closed') {
        g.beginPath();
        g.moveTo(186, 146);
        g.lineTo(210, 132);
        g.stroke();
      }
      return;
    }
    const wide = state === 'wide';
    // Lòng trắng
    g.save();
    eyePath(g, wide);
    g.fillStyle = '#FFFFFF';
    g.fill();
    g.clip();
    // Bóng mí trên đổ xuống lòng trắng
    const sh = g.createLinearGradient(0, 40, 0, 120);
    sh.addColorStop(0, 'rgba(120,110,170,0.55)');
    sh.addColorStop(1, 'rgba(120,110,170,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, EYE_W, 130);
    // Tròng: gradient tối trên → sáng dưới
    const cx = 118;
    const cy = wide ? 146 : 152;
    const rx = wide ? 52 : 62;
    const ry = wide ? 72 : 84;
    const ig = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    ig.addColorStop(0, tone(iris, -0.32));
    ig.addColorStop(0.45, iris);
    ig.addColorStop(0.85, tone(iris, 0.22, 0.1));
    ig.addColorStop(1, tone(iris, 0.3, 0.1));
    g.fillStyle = ig;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // Vành tròng đậm
    g.strokeStyle = tone(iris, -0.4);
    g.lineWidth = 5;
    g.stroke();
    // Vầng sáng nửa dưới tròng
    const glow = g.createRadialGradient(cx, cy + ry * 0.55, 4, cx, cy + ry * 0.55, rx);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.ellipse(cx, cy + ry * 0.35, rx * 0.8, ry * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    // Con ngươi
    g.fillStyle = tone(iris, -0.5);
    g.beginPath();
    g.ellipse(cx, cy - 12, rx * 0.42, ry * 0.46, 0, 0, Math.PI * 2);
    g.fill();
    // Bóng mí trên phủ lên tròng (chỉ trong tròng)
    const sh2 = g.createLinearGradient(0, cy - ry, 0, cy - ry * 0.25);
    sh2.addColorStop(0, 'rgba(10,5,25,0.55)');
    sh2.addColorStop(1, 'rgba(10,5,25,0)');
    g.fillStyle = sh2;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // Đốm sáng: lớn trên-trái, nhỏ dưới-phải, lấp lánh
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.ellipse(cx - 26, cy - 40, 21, 27, -0.3, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cx + 28, cy + 38, 9, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(cx + 14, cy - 50, 6, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.restore();

    // Mi trên dày, đuôi mắt vểnh
    const top = wide ? 40 : 52;
    g.strokeStyle = lash;
    g.fillStyle = lash;
    g.lineWidth = lashes ? 20 : 15;
    g.beginPath();
    g.moveTo(26, 132);
    g.bezierCurveTo(44, top + 16, 92, top - 8, 128, top - 2);
    g.bezierCurveTo(164, top + 4, 190, 72, 202, 94);
    g.stroke();
    // Đuôi mi
    g.beginPath();
    g.moveTo(186, 78);
    g.lineTo(lashes ? 226 : 216, lashes ? 54 : 64);
    g.lineTo(204, 104);
    g.closePath();
    g.fill();
    if (lashes) {
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(172, 66);
      g.lineTo(196, 36);
      g.moveTo(150, 54);
      g.lineTo(166, 26);
      g.stroke();
    }
    // Mi dưới mảnh ở đuôi mắt
    g.lineWidth = 5;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(136, 232);
    g.quadraticCurveTo(184, 222, 196, 176);
    g.stroke();
    g.globalAlpha = 1;
  }, mirror);
}

/* ------------------------------------------------------------------ */
/* LÔNG MÀY                                                             */
/* ------------------------------------------------------------------ */

export type BrowState = 'neutral' | 'up' | 'worried';

export function browTexture(color: string, state: BrowState, mirror: boolean) {
  return make(`brow:${color}:${state}`, 200, 64, (g) => {
    g.fillStyle = color;
    // Nét mày thuôn: đầu mày dày bên trái (phía mũi), đuôi mảnh bên phải
    const lift = state === 'up' ? -10 : 0;
    const innerY = state === 'worried' ? 18 : 40 + lift;
    const outerY = state === 'worried' ? 44 : 34 + lift;
    g.beginPath();
    g.moveTo(16, innerY + 9);
    g.quadraticCurveTo(100, (innerY + outerY) / 2 - 22, 186, outerY + 2);
    g.quadraticCurveTo(100, (innerY + outerY) / 2 - 10, 18, innerY - 4);
    g.closePath();
    g.fill();
  }, mirror);
}

/* ------------------------------------------------------------------ */
/* MIỆNG                                                                */
/* ------------------------------------------------------------------ */

export type MouthState = 'rest' | 'm' | 'a' | 'e' | 'o' | 'smile';
export const MOUTH_W = 156;
export const MOUTH_H = 120;

export function mouthTexture(state: MouthState, lipLine: string) {
  return make(`mouth:${state}:${lipLine}`, MOUTH_W, MOUTH_H, (g) => {
    const inside = '#7A1F2E';
    const tongue = '#EE7F92';
    g.strokeStyle = lipLine;
    g.lineWidth = 6;
    if (state === 'rest') {
      g.beginPath();
      g.moveTo(58, 52);
      g.quadraticCurveTo(78, 70, 98, 52);
      g.stroke();
      return;
    }
    if (state === 'm') {
      g.beginPath();
      g.moveTo(62, 60);
      g.lineTo(94, 60);
      g.stroke();
      return;
    }
    const mouth = new Path2D();
    if (state === 'a' || state === 'smile') {
      const w = state === 'smile' ? 34 : 24;
      mouth.moveTo(78 - w, 46);
      mouth.quadraticCurveTo(78, state === 'smile' ? 54 : 42, 78 + w, 46);
      mouth.bezierCurveTo(78 + w, 84, 78 + w * 0.5, 100, 78, 100);
      mouth.bezierCurveTo(78 - w * 0.5, 100, 78 - w, 84, 78 - w, 46);
    } else if (state === 'e') {
      mouth.moveTo(44, 52);
      mouth.quadraticCurveTo(78, 46, 112, 52);
      mouth.bezierCurveTo(110, 74, 96, 80, 78, 80);
      mouth.bezierCurveTo(60, 80, 46, 74, 44, 52);
    } else {
      mouth.ellipse(78, 64, 14, 19, 0, 0, Math.PI * 2);
    }
    mouth.closePath();
    g.fillStyle = inside;
    g.fill(mouth);
    g.save();
    g.clip(mouth);
    g.fillStyle = tongue;
    g.beginPath();
    g.ellipse(78, state === 'e' ? 84 : 98, 24, 15, 0, 0, Math.PI * 2);
    g.fill();
    if (state !== 'o') {
      g.fillStyle = '#FFFFFF';
      g.fillRect(30, 40, 100, 9);
    }
    g.restore();
    g.lineWidth = 4;
    g.stroke(mouth);
  });
}

/* ------------------------------------------------------------------ */
/* MÁ HỒNG + MŨI                                                         */
/* ------------------------------------------------------------------ */

export function blushTexture() {
  return make('blush', 160, 100, (g) => {
    const rg = g.createRadialGradient(80, 50, 4, 80, 50, 70);
    rg.addColorStop(0, 'rgba(255,120,140,0.7)');
    rg.addColorStop(1, 'rgba(255,120,140,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(80, 50, 76, 44, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(220,70,100,0.75)';
    g.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(52 + i * 22, 64);
      g.lineTo(66 + i * 22, 38);
      g.stroke();
    }
  });
}

export function noseTexture(skin: string) {
  return make(`nose:${skin}`, 32, 32, (g) => {
    g.strokeStyle = tone(skin, -0.25, 0.1);
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(17, 10);
    g.lineTo(13, 22);
    g.stroke();
  });
}

export { tone };
