/** Làm mượt không phụ thuộc tốc độ khung hình: a += (b-a)(1-e^{-k·dt}). Không dùng lerp(a,b,dt*k). */
export function damp(a: number, b: number, k: number, dt: number): number {
  return a + (b - a) * (1 - Math.exp(-k * dt));
}

export function dampVec3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  k: number,
  dt: number
): void {
  const t = 1 - Math.exp(-k * dt);
  a.x += (b.x - a.x) * t;
  a.y += (b.y - a.y) * t;
  a.z += (b.z - a.z) * t;
}
