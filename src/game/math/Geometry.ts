import type { MapCollider } from '../assets/TiledMapLoader';
import { GameDefaults } from '../configuration/GameDefaults';
export interface Point {
  readonly x: number;
  readonly y: number;
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (a: Point, b: Point) => Math.atan2(b.x - a.x, a.y - b.y);
export const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function circleRect(p: Point, radius: number, r: MapCollider) {
  return (
    Math.hypot(
      p.x - Math.max(r.x, Math.min(p.x, r.x + r.width)),
      p.y - Math.max(r.y, Math.min(p.y, r.y + r.height)),
    ) < radius
  );
}
// Slab intersection returns the earliest fraction along a segment; padding sweeps a circle.
export function segmentRect(
  a: Point,
  b: Point,
  r: MapCollider,
  padding: number,
  tolerance = GameDefaults.Rules.geometryTolerance,
): number | null {
  let enter = 0;
  let exit = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, r.x - padding, r.x + r.width + padding],
    [a.y, b.y - a.y, r.y - padding, r.y + r.height + padding],
  ] as [number, number, number, number][]) {
    if (Math.abs(delta) < tolerance) {
      if (start < min || start > max) return null;
    } else {
      const t1 = (min - start) / delta;
      const t2 = (max - start) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
    if (enter > exit) return null;
  }
  return enter;
}
export function segmentCircle(a: Point, b: Point, center: Point, radius: number): number | null {
  const x = a.x - center.x;
  const y = a.y - center.y;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const length = dx * dx + dy * dy;
  if (!length) return null;
  const dot = x * dx + y * dy;
  const determinant = dot * dot - length * c;
  if (determinant < 0) return null;
  const t = (-dot - Math.sqrt(determinant)) / length;
  return t >= 0 && t <= 1 ? t : null;
}
