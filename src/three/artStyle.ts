/**
 * Phong cách đồ hoạ: 'ghibli' (mặc định, anime mềm mại kiểu tranh màu nước) hoặc 'neon' (bản cũ để so sánh).
 *
 * So sánh: thêm ?style=neon vào link (được nhớ trong localStorage). Quay lại: ?style=ghibli.
 */
import * as THREE from 'three';

export type ArtStyle = 'neon' | 'ghibli';
const DEFAULT_STYLE: ArtStyle = 'ghibli';
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
    // Ánh sáng mặt trời: 2 mảng (sáng / tối) với vùng chuyển mềm, bọc nhẹ ra mặt sau.
    // Khớp theo khoảng trắng bất kỳ: bản build three.js không có dòng trống giữa hai lệnh.
    .replace(
      /float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s*vec3 irradiance = dotNL \* directLight\.color;/,
      'float dotNLraw = dot( geometryNormal, directLight.direction );\n\tfloat dotNL = mix( 0.16, 1.0, smoothstep( -0.08, 0.32, dotNLraw ) );\n\tvec3 irradiance = dotNL * directLight.color;'
    )
    // Giảm mạnh phản xạ bóng loáng (tranh vẽ tay không có highlight kim loại)
    // (kiểm tra bên dưới cảnh báo nếu bản three.js đổi chuỗi gốc)
    .replace(
      'reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );',
      'reflectedLight.directSpecular += 0.18 * irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );'
    );
  const patched = THREE.ShaderChunk.lights_physical_pars_fragment;
  if (!patched.includes('dotNLraw') || !patched.includes('0.18 * irradiance')) {
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

/** Bảng màu 3D ban ngày (STYLE_GHIBLI.md mục 3) */
export const GHIBLI = {
  skyTop: '#9FD8EE',
  skyBottom: '#FFF1D6',
  fog: '#F6EBD2',
  sun: '#FFE7B0',
  hemiSky: '#CFEFFF',
  hemiGround: '#B8A07A',
  grass: ['#A8D98A', '#9ED382', '#B2DE93'],
  park: ['#B3DD92', '#A9D78B'],
  walk: ['#F3E7CF', '#EEDFC3'],
  plaza: ['#EBDAB8', '#E4D1AB'],
  sand: ['#F5E4B8', '#F1DCA6', '#F7EBC8'],
  road: '#8E8576',
  water: '#8FD3E8',
  roofs: ['#C8643B', '#3D8A8A', '#56709A', '#B5523A', '#7A5C99'],
  leaves: ['#8CC770', '#9BD27F', '#7DB86A', '#A8D98A'],
  /** Đèn đường, cửa sổ đêm: vàng ấm, không neon */
  lamp: '#FFD58A',
  /** Sàn gỗ và tường studio (phòng hub) */
  wood: '#C89A6B',
  wallCream: '#F5E6CC',
};

/** Trời theo buổi cho bản đồ thành phố và cửa sổ phòng hub (STYLE_GHIBLI.md mục 3) */
export const GHIBLI_SKY: Record<string, { top: string; bottom: string; fog: string }> = {
  morning: { top: GHIBLI.skyTop, bottom: GHIBLI.skyBottom, fog: GHIBLI.fog },
  afternoon: { top: GHIBLI.skyTop, bottom: GHIBLI.skyBottom, fog: GHIBLI.fog },
  evening: { top: '#8E9BD6', bottom: '#F7C6A0', fog: '#E9BFA6' },
  night: { top: '#2E3F6B', bottom: '#5A5C8F', fog: '#3A4A74' },
};

/** Ánh sáng ban đêm: xanh tím dịu, đèn ấm */
export const GHIBLI_NIGHT_LIGHT = {
  hemiSky: '#3B4A7A',
  hemiGround: '#2A2F4F',
  water: '#3A5680',
};

/** Trời theo buổi trong chế độ Ghibli; trả về undefined ở chế độ neon */
export function ghibliSky(periodId: string) {
  if (!isGhibli) return undefined;
  return GHIBLI_SKY[periodId] ?? GHIBLI_SKY.morning;
}
