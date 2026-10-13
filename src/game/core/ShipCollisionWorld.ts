import { CollisionWorld } from './CollisionWorld';
import type { LoadedMap } from '../assets/TiledMapLoader';
import type { GameConfig } from '../contracts/GameConfig';
import { segmentCircle } from '../math/Geometry';
import type { Point } from '../math/Geometry';

export interface CollisionBody extends Point {
  readonly id: number;
  readonly radius: number;
  readonly hullRadius: number;
  readonly angle: number;
  readonly speed: number;
  readonly alive: boolean;
}

export const ContactKind = { Hull: 'hull', Island: 'island', Boundary: 'boundary' } as const;
export type ContactKind = typeof ContactKind[keyof typeof ContactKind];

export interface CollisionContact {
  readonly kind: ContactKind;
  readonly sourceId: number;
  readonly targetId: number | null;
  readonly point: Point;
  readonly speed: number;
}

/** Sweeps registered live hulls against each other; static map/navigation remains in CollisionWorld. */
export class ShipCollisionWorld extends CollisionWorld {
  readonly #config: GameConfig;
  #bodies: readonly CollisionBody[] = [];
  readonly #contacts = new Map<string, CollisionContact>();

  constructor(map: LoadedMap, config: GameConfig) {
    super(map, config);
    this.#config = config;
  }

  setBodies(bodies: readonly CollisionBody[]): void {
    this.#bodies = Object.freeze([...bodies]);
  }

  drainContacts(): readonly CollisionContact[] {
    const contacts = [...this.#contacts.values()];
    this.#contacts.clear();
    return contacts;
  }

  #contact(body: CollisionBody, kind: ContactKind, targetId: number | null, point: Point, speed: number): void {
    const key = kind === ContactKind.Hull && targetId !== null
      ? `${kind}:${Math.min(body.id, targetId)}:${Math.max(body.id, targetId)}`
      : `${kind}:${body.id}:${targetId}`;
    const previous = this.#contacts.get(key);
    if (!previous || speed > previous.speed) {
      this.#contacts.set(key, { kind, sourceId: body.id, targetId, point, speed });
    }
  }

  override move(point: Readonly<Point>, radius: number, angle: number, travel: number): Point {
    const body = this.#bodies.find((candidate) => candidate === point);
    if (!body) return super.move(point, radius, angle, travel);
    const boundedTravel = Math.min(travel, this.width + this.height);
    const steps = Math.max(1, Math.ceil(boundedTravel / (radius * this.#config.rules.movementStepRadiusRatio)));
    let current: Point = point;
    for (let step = 0; step < steps; step++) {
      const distance = boundedTravel / steps;
      const requested = { x: current.x + Math.sin(angle) * distance, y: current.y - Math.cos(angle) * distance };
      const next = super.move(current, radius, angle, distance);
      if (Math.hypot(next.x - requested.x, next.y - requested.y) > this.#config.rules.geometryTolerance) {
        const island = this.obstacleHit(current, requested, radius);
        const fraction = island === Infinity ? 1 : island;
        this.#contact(body, island === Infinity ? ContactKind.Boundary : ContactKind.Island, null,
          { x: current.x + (requested.x - current.x) * fraction, y: current.y + (requested.y - current.y) * fraction }, body.speed);
      }
      current = this.#sweepHulls(current, next, body);
    }
    return current;
  }

  #sweepHulls(start: Point, destination: Point, body: CollisionBody): Point {
    let current = start;
    let target = destination;
    for (let attempt = 0; attempt < this.#config.collision.slideIterations; attempt++) {
      let first = Infinity;
      let obstacle: CollisionBody | null = null;
      for (const candidate of this.#bodies) {
        if (candidate.id === body.id || !candidate.alive) continue;
        const dx = current.x - candidate.x;
        const dy = current.y - candidate.y;
        // Permit departure/tangential movement when starting on the contact boundary.
        if (dx * (target.x - current.x) + dy * (target.y - current.y) >= 0) continue;
        const hit = segmentCircle(current, target, candidate, body.hullRadius + candidate.hullRadius + this.contactTolerance);
        if (hit !== null && hit < first) { first = hit; obstacle = candidate; }
      }
      if (!obstacle) return this.isFree(target, body.radius) ? target : current;
      const hit = { x: current.x + (target.x - current.x) * first,
        y: current.y + (target.y - current.y) * first };
      const distance = Math.hypot(hit.x - obstacle.x, hit.y - obstacle.y);
      if (!distance) throw new Error('Ship hulls must start from distinct safe positions.');
      const nx = (hit.x - obstacle.x) / distance;
      const ny = (hit.y - obstacle.y) / distance;
      const speed = Math.max(0,
        -(Math.sin(body.angle) * body.speed - Math.sin(obstacle.angle) * obstacle.speed) * nx
        + (Math.cos(body.angle) * body.speed - Math.cos(obstacle.angle) * obstacle.speed) * ny);
      this.#contact(body, ContactKind.Hull, obstacle.id,
        { x: hit.x - nx * body.hullRadius, y: hit.y - ny * body.hullRadius }, speed);
      const remainingX = target.x - hit.x;
      const remainingY = target.y - hit.y;
      const inward = Math.min(0, remainingX * nx + remainingY * ny);
      current = hit;
      target = { x: hit.x + remainingX - inward * nx, y: hit.y + remainingY - inward * ny };
    }
    return current;
  }
}
