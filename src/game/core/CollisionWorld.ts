import type { LoadedMap } from '../assets/TiledMapLoader';
import { circleRect, segmentRect } from '../math/Geometry';
import { Navigation } from '../math/Navigation';
import type { Point } from '../math/Geometry';
import type { GameConfig } from '../contracts/GameConfig';

export interface ICollisionWorld {
  readonly width: number; readonly height: number;
  readonly contactTolerance: number;
  areTouching(a: Readonly<Point>, aRadius: number, b: Readonly<Point>, bRadius: number): boolean;
  isFree(point: Readonly<Point>, radius: number): boolean;
  move(point: Readonly<Point>, radius: number, angle: number, travel: number): Point;
  isVisible(from: Readonly<Point>, to: Readonly<Point>, padding: number): boolean;
  /** Straight sailing line with the same coast clearance used to build navigation routes. */
  isNavigable(from: Readonly<Point>, to: Readonly<Point>, radius: number): boolean;
  /** Free distance (up to `maximum`) a circle can sail along `angle` before an island or arena edge. */
  clearance(from: Readonly<Point>, radius: number, angle: number, maximum: number): number;
  route(from: Readonly<Point>, to: Readonly<Point>, radius: number): Point[];
  obstacleHit(from: Readonly<Point>, to: Readonly<Point>, radius: number): number;
}
export class CollisionWorld implements ICollisionWorld {
  readonly #map: LoadedMap; readonly #config: GameConfig; readonly #navigation = new Map<number, Navigation>();
  readonly #width: number; readonly #height: number;
  constructor(map: LoadedMap, config: GameConfig) {
    this.#map = { ...map, colliders: map.colliders.map((collider) => Object.freeze({ ...collider })) };
    this.#config = config; this.#width = map.width * map.tileWidth; this.#height = map.height * map.tileHeight;
  }
  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get contactTolerance(): number { return this.#config.collision.separation; }
  areTouching(a: Readonly<Point>, aRadius: number, b: Readonly<Point>, bRadius: number): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= aRadius + bRadius + this.contactTolerance + this.#config.rules.geometryTolerance;
  }
  isFree(p: Readonly<Point>, radius: number): boolean {
    return p.x >= radius && p.y >= radius && p.x <= this.width - radius && p.y <= this.height - radius
      && !this.#map.colliders.some((rect) => circleRect(p, radius, rect));
  }
  move(p: Readonly<Point>, radius: number, angle: number, travel: number): Point {
    // Subdivide configured high speeds so a ship cannot jump over an island.
    const boundedTravel = Math.min(travel, this.width + this.height);
    const steps = Math.max(1, Math.ceil(boundedTravel / (radius * this.#config.rules.movementStepRadiusRatio)));
    let current: Point = p;
    for (let step = 0; step < steps; step++) current = this.#moveSegment(current, radius, angle, boundedTravel / steps);
    return current;
  }
  #moveSegment(p: Readonly<Point>, radius: number, angle: number, travel: number): Point {
    const next = { x: Math.max(radius, Math.min(this.width - radius, p.x + Math.sin(angle) * travel)),
      y: Math.max(radius, Math.min(this.height - radius, p.y - Math.cos(angle) * travel)) };
    if (this.isFree(next, radius)) return next;
    const result = { x: p.x, y: p.y };
    if (this.isFree({ x: next.x, y: result.y }, radius)) result.x = next.x;
    if (this.isFree({ x: result.x, y: next.y }, radius)) result.y = next.y;
    return result;
  }
  isVisible(a: Readonly<Point>, b: Readonly<Point>, padding: number): boolean { return this.obstacleHit(a, b, padding) === Infinity; }
  obstacleHit(a: Readonly<Point>, b: Readonly<Point>, radius: number): number {
    let first = Infinity;
    for (const rect of this.#map.colliders) { const t = segmentRect(a, b, rect, radius, this.#config.rules.geometryTolerance);
      if (t !== null && t < first) first = t; }
    return first;
  }
  isNavigable(a: Readonly<Point>, b: Readonly<Point>, radius: number): boolean {
    return this.isVisible(a, b, radius + this.#navigationClearance);
  }
  clearance(from: Readonly<Point>, radius: number, angle: number, maximum: number): number {
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    let free = Math.min(maximum, this.#boundaryDistance(from.x, dx, radius, this.width),
      this.#boundaryDistance(from.y, dy, radius, this.height));
    for (const rect of this.#map.colliders) {
      const nearestX = Math.max(rect.x, Math.min(from.x, rect.x + rect.width));
      const nearestY = Math.max(rect.y, Math.min(from.y, rect.y + rect.height));
      const awayX = from.x - nearestX;
      const awayY = from.y - nearestY;
      // A swept segment starting inside the padded rectangle reports an immediate hit in every direction.
      // A hull resting on that coast may still sail along or away from it; only inward probes are blocked.
      const contact = radius + this.#config.collision.separation;
      if (Math.abs(awayX) <= contact && Math.abs(awayY) <= contact) {
        if (awayX * dx + awayY * dy < 0) return 0;
        continue;
      }
      const end = { x: from.x + dx * free, y: from.y + dy * free };
      const hit = segmentRect(from, end, rect, radius, this.#config.rules.geometryTolerance);
      if (hit !== null) free *= hit;
    }
    return free;
  }
  #boundaryDistance(position: number, direction: number, radius: number, extent: number): number {
    if (direction > this.#config.rules.geometryTolerance) return Math.max(0, (extent - radius - position) / direction);
    if (direction < -this.#config.rules.geometryTolerance) return Math.max(0, (radius - position) / direction);
    return Infinity;
  }
  get #navigationClearance(): number {
    return this.#map.tileWidth * this.#config.rules.navigationInflation;
  }
  /** Grid route reduced to its corners: each waypoint is the farthest one still reachable in a straight line. */
  route(from: Readonly<Point>, to: Readonly<Point>, radius: number): Point[] {
    let navigation = this.#navigation.get(radius);
    if (!navigation) { navigation = new Navigation(this.#map.width, this.#map.height, this.#map.tileWidth, radius,
      this.#map.colliders, this.#config.rules.navigationInflation); this.#navigation.set(radius, navigation); }
    const cells = navigation.route(from, to);
    const corners: Point[] = [];
    let anchor: Readonly<Point> = from;
    let index = 0;
    while (index < cells.length) {
      let farthest = index;
      for (let candidate = cells.length - 1; candidate > index; candidate--) {
        if (this.isNavigable(anchor, cells[candidate]!, radius)) {
          farthest = candidate;
          break;
        }
      }
      anchor = cells[farthest]!;
      corners.push(anchor);
      index = farthest + 1;
    }
    return corners;
  }
}
