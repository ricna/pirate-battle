import type { LoadedMap } from '../tiledMap';
import { circleRect, Navigation, segmentRect } from '../geometry';
import type { Point } from '../geometry';
import type { GameConfig } from '../configuration/types';

export interface ICollisionWorld {
  readonly width: number; readonly height: number;
  isFree(point: Readonly<Point>, radius: number): boolean;
  move(point: Readonly<Point>, radius: number, angle: number, travel: number): Point;
  isVisible(from: Readonly<Point>, to: Readonly<Point>, padding: number): boolean;
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
  route(from: Readonly<Point>, to: Readonly<Point>, radius: number): Point[] {
    let navigation = this.#navigation.get(radius);
    if (!navigation) { navigation = new Navigation(this.#map.width, this.#map.height, this.#map.tileWidth, radius,
      this.#map.colliders, this.#config.rules.navigationInflation); this.#navigation.set(radius, navigation); }
    return navigation.route(from, to);
  }
}
