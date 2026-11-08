/**
 * Phong cách đồ hoạ: 'neon' (mặc định hiện tại) hoặc 'ghibli' (anime mềm mại kiểu tranh màu nước).
 *
 * Bật thử: thêm ?style=ghibli vào link (được nhớ trong localStorage). Tắt: ?style=neon.
 * Khi đã duyệt, chỉ cần đổi DEFAULT_STYLE thành 'ghibli'.
 */
import * as THREE from 'three';

export type ArtStyle = 'neon' | 'ghibli';
const DEFAULT_STYLE: ArtStyle = 'neon';
const KEY = 'mclife.style';

export const ART_STYLE: ArtStyle = (() => {
  if (typeof window === 'undefined') return DEFAULT_STYLE;
  const q = new URLSearchParams(window.location.search).get('style');
  if (q === 'ghibli' || q === 'neon') {
    try {
      window.localStorage.setItem(KEY, q);
    } catch {
      /* chế độ riêng tư: bỏ qua */
    }
    return q;
  }
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'ghibli' || saved === 'neon') return saved;
  } catch {
    /* bỏ qua */
  }
  return DEFAULT_STYLE;
})();

export const isGhibli = ART_STYLE === 'ghibli';

/* ------------------------------------------------------------------ */
/* Tô bóng kiểu anime mềm: mảng sáng/tối chuyển mượt, gần như không bóng loáng */
/* ------------------------------------------------------------------ */

let installed = false;
export function installGhibliShading() {
  if (installed || !isGhibli) return;
  installed = true;
  const chunk = THREE.ShaderChunk.lights_physical_pars_fragment;
  THREE.ShaderChunk.lights_physical_pars_fragment = chunk
    // Ánh sáng mặt trời: 2 mảng (sáng / tối) với vùng chuyển mềm, bọc nhẹ ra mặt sau
    .replace(
      'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\n\tvec3 irradiance = dotNL * directLight.color;',
      'float dotNLraw = dot( geometryNormal, directLight.direction );\n\tfloat dotNL = mix( 0.16, 1.0, smoothstep( -0.08, 0.32, dotNLraw ) );\n\tvec3 irradiance = dotNL * directLight.color;'
    )
    // Giảm mạnh phản xạ bóng loáng (tranh vẽ tay không có highlight kim loại)
    // (kiểm tra bên dưới cảnh báo nếu bản three.js đổi chuỗi gốc)
    .replace(
      'reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );',
      'reflectedLight.directSpecular += 0.18 * irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );'
    );
  if (THREE.ShaderChunk.lights_physical_pars_fragment === chunk || !THREE.ShaderChunk.lights_physical_pars_fragment.includes('dotNLraw')) {
    console.warn('[artStyle] Không vá được shader Ghibli — kiểm tra phiên bản three.js');
  }
}

/* ------------------------------------------------------------------ */
/* Bảng màu Ghibli: ấm, dịu, bớt neon                                   */
/* ------------------------------------------------------------------ */

const CREAM = new THREE.Color('#F4E9D4');
const tintCache = new Map<string, string>();

/** Làm dịu màu: giảm bão hoà, kéo nhẹ về tông kem ấm */
export function softTint(hex: string, amount = 0.28): string {
  if (!isGhibli) return hex;
  const k = `${hex}|${amount}`;
  const hit = tintCache.get(k);
  if (hit) return hit;
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.72, Math.min(0.9, hsl.l * 0.92 + 0.05));
  c.lerp(CREAM, amount);
  const out = `#${c.getHexString()}`;
  tintCache.set(k, out);
  return out;
}

export const GHIBLI = {
  skyTop: '#3F8FDB',
  skyBottom: '#A9D6EE',
  sun: '#FFE6BF',
  hemiSky: '#A9D2F2',
  hemiGround: '#6E8F4C',
  grass: ['#6DB33F', '#64A93A', '#78BE48'],
  park: ['#7CC24E', '#74BA47'],
  walk: ['#D8C8AA', '#D1C0A1'],
  plaza: ['#E4D2AE', '#DDCAA5'],
  sand: ['#F2E0B2', '#EFDBA8', '#F4E4BA'],
  road: '#7A736B',
  water: '#3C9FCB',
  roofs: ['#C8643B', '#3D8A8A', '#56709A', '#B5523A', '#7A5C99'],
  leaves: ['#4E9A3A', '#62AE43', '#3F8A33', '#74BC4C'],
};
