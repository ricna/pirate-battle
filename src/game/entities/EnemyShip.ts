import type { ICollisionWorld } from '../core/CollisionWorld';
import type { AiProfile, ShipProfile } from '../configuration/types';
import { angleDifference, angleTo, distance, segmentCircle } from '../geometry';
import type { Point } from '../geometry';
import type { Action } from '../domain';
import type { GameEvent } from '../domain';
import { Ship } from './Ship';
import type { ShipReadView } from './Ship';

export interface EnemyContext {
  readonly target: Ship; readonly world: ICollisionWorld; readonly elapsed: number; readonly dt: number;
  /** Read views of every active enemy (including this one), used to keep formation spacing. */
  readonly fleet: readonly ShipReadView[];
  fire(ship: EnemyShip, action: Action): void;
  damage(ship: Ship, amount: number, credited: boolean): void;
  event(event: GameEvent): void;
}
/** Detached per-step copy of a nearby enemy, so probes do not re-read live read views. */
interface Neighbour extends Point {
  readonly hullRadius: number;
}
export interface FollowResult {
  readonly sight: boolean;
  readonly inRange: boolean;
  /** Signed heading error towards the target itself, for weapon alignment. */
  readonly aim: number;
}

/**
 * Shared enemy navigation. Each step combines:
 * 1. a goal: the target when a straight sailing line is clear, otherwise the next corner of a grid route;
 * 2. separation from nearby enemies, so groups spread instead of queueing hull to hull;
 * 3. obstacle avoidance: candidate headings fanned around the desired one, the closest clear heading wins;
 *    islands, arena edges and the hulls of nearby enemies all limit a heading's clearance;
 * 4. stuck recovery: without progress for a configured window, sail towards the most open water and replan.
 * The chosen heading is low-pass filtered, so neighbours crossing a probe do not make the helm flicker.
 * Speed eases off while turning and in front of a coast, so ships arc around corners instead of scraping them.
 */
export abstract class EnemyShip extends Ship {
  readonly #ai: AiProfile;
  #route: Point[] = [];
  #routeAt = 0;
  #avoidSide = 1;
  #progressAnchor: Point;
  #progressAt = 0;
  #recoverUntil = -Infinity;
  #heading: number;

  constructor(id: number, point: Readonly<Point>, angle: number, profile: ShipProfile) {
    super(id, point, angle, profile);
    if (!this.profile.ai) throw new Error(`Enemy ${profile.id} requires an AI profile.`);
    this.#ai = this.profile.ai;
    this.#progressAnchor = { x: point.x, y: point.y };
    this.#heading = angle;
  }

  /** Initial heading for a ship spawned at `point`: towards the target, or the first corner around an island. */
  static spawnHeading(world: ICollisionWorld, point: Readonly<Point>, target: Readonly<Point>, radius: number): number {
    const goal = world.isNavigable(point, target, radius) ? target : world.route(point, target, radius)[0] ?? target;
    return angleTo(point, goal);
  }

  protected get ai(): AiProfile { return this.#ai; }

  protected follow(context: EnemyContext, stopInRange: boolean): FollowResult {
    const { target, world, dt, elapsed } = context;
    const sight = world.isVisible(this, target, this.radius);
    const inRange = sight && distance(this, target) <= this.#ai.range;
    const holding = stopInRange && inRange;
    const goal = world.isNavigable(this, target, this.radius) ? target : this.#waypoint(context);
    const goalDistance = distance(this, goal);

    this.#trackProgress(elapsed, holding);
    const recovering = elapsed < this.#recoverUntil;
    const origin: Point = { x: this.x, y: this.y };
    const neighbours = this.#neighbours(context, origin);
    let desired: number;
    if (holding) desired = angleTo(origin, target);
    else if (recovering) desired = this.#openWaterHeading(world, origin, neighbours);
    else desired = this.#avoidObstacles(world, origin, neighbours, this.#blendSeparation(angleTo(origin, goal), origin, neighbours), goalDistance);
    // Aiming answers the target directly; navigation headings are smoothed against momentary probe changes.
    const response = holding ? 1 : Math.min(1, this.#ai.headingResponse * dt);
    this.#heading += angleDifference(desired, this.#heading) * response;
    const turn = angleDifference(this.#heading, this.angle);
    this.steer(turn, dt);

    const probe = recovering ? this.#ai.lookAhead : Math.min(this.#ai.lookAhead, goalDistance);
    const speed = holding ? 0 : this.#cruiseSpeed(turn, this.#clearance(world, origin, neighbours, this.angle, probe), probe);
    this.cruise(speed, dt, world);
    return { sight, inRange, aim: angleDifference(angleTo(this, target), this.angle) };
  }

  #waypoint(context: EnemyContext): Point {
    const { target, world, elapsed } = context;
    if (elapsed >= this.#routeAt) this.#plan(context);
    // Drop reached corners, and skip ahead whenever drift has already opened a direct line to the next one.
    while (this.#route.length && (distance(this, this.#route[0]!) < this.#ai.waypointArrival
      || (this.#route.length > 1 && world.isNavigable(this, this.#route[1]!, this.radius)))) {
      this.#route.shift();
      if (!this.#route.length) this.#plan(context);
    }
    return this.#route[0] ?? target;
  }

  #plan(context: EnemyContext): void {
    this.#route = context.world.route(this, context.target, this.radius);
    this.#routeAt = context.elapsed + this.#ai.routeInterval;
  }

  /**
   * Enemies close enough to push this heading apart or to cross a probe. The pursued target is never
   * avoided, so a Chaser still rams it.
   */
  #neighbours(context: EnemyContext, origin: Point): Neighbour[] {
    const reach = Math.max(this.#ai.separationDistance, this.#ai.lookAhead + this.hullRadius);
    const neighbours: Neighbour[] = [];
    for (const other of context.fleet) {
      if (other.id === this.id || other.id === context.target.id || !other.alive) continue;
      const neighbour = { x: other.x, y: other.y, hullRadius: other.hullRadius };
      if (distance(origin, neighbour) < reach + neighbour.hullRadius) neighbours.push(neighbour);
    }
    return neighbours;
  }

  #blendSeparation(heading: number, origin: Point, neighbours: readonly Neighbour[]): number {
    let x = Math.sin(heading);
    let y = -Math.cos(heading);
    for (const other of neighbours) {
      const gap = distance(origin, other);
      // Coincident centres have no defined direction; the hull solver separates them instead.
      if (gap >= this.#ai.separationDistance || !gap) continue;
      const weight = this.#ai.separationWeight * (1 - gap / this.#ai.separationDistance);
      x += (origin.x - other.x) / gap * weight;
      y += (origin.y - other.y) / gap * weight;
    }
    return Math.atan2(x, -y);
  }

  #clearance(world: ICollisionWorld, origin: Point, neighbours: readonly Neighbour[], heading: number, probe: number): number {
    let free = world.clearance(origin, this.radius, heading, probe);
    const dx = Math.sin(heading);
    const dy = -Math.cos(heading);
    for (const other of neighbours) {
      // Sailing along or away from a touching hull is free, matching the hull solver's departure rule.
      if ((origin.x - other.x) * dx + (origin.y - other.y) * dy >= 0) continue;
      const end = { x: origin.x + dx * free, y: origin.y + dy * free };
      const hit = segmentCircle(origin, end, other, this.hullRadius + other.hullRadius);
      if (hit !== null) free *= hit;
    }
    return free;
  }

  /** Closest clear heading to `desired`, alternating sides starting with the side used last. */
  #avoidObstacles(world: ICollisionWorld, origin: Point, neighbours: readonly Neighbour[], desired: number, goalDistance: number): number {
    const probe = Math.min(this.#ai.lookAhead, goalDistance);
    if (this.#clearance(world, origin, neighbours, desired, probe) >= probe) return desired;
    let best = desired;
    let bestClearance = -Infinity;
    const steps = Math.floor(Math.PI / this.#ai.avoidanceStep);
    for (let step = 1; step <= steps; step++) {
      for (const side of [this.#avoidSide, -this.#avoidSide]) {
        const heading = desired + side * step * this.#ai.avoidanceStep;
        const clearance = this.#clearance(world, origin, neighbours, heading, probe);
        if (clearance >= probe) {
          this.#avoidSide = side;
          return heading;
        }
        if (clearance > bestClearance) {
          best = heading;
          bestClearance = clearance;
        }
      }
    }
    return best;
  }

  /** Most open heading around the current one, nudged away from crowding enemies. */
  #openWaterHeading(world: ICollisionWorld, origin: Point, neighbours: readonly Neighbour[]): number {
    let best = this.angle;
    let bestClearance = -Infinity;
    const steps = Math.floor(Math.PI / this.#ai.avoidanceStep);
    for (let step = 0; step <= steps; step++) {
      for (const side of [this.#avoidSide, -this.#avoidSide]) {
        const heading = this.angle + side * step * this.#ai.avoidanceStep;
        const clearance = this.#clearance(world, origin, neighbours, heading, this.#ai.lookAhead);
        if (clearance > bestClearance) {
          best = heading;
          bestClearance = clearance;
        }
      }
    }
    return this.#blendSeparation(best, origin, neighbours);
  }

  #cruiseSpeed(turn: number, clearanceAhead: number, probe: number): number {
    const ai = this.#ai;
    const turning = Math.min(1, Math.abs(turn) / ai.movementCone);
    const turnRatio = 1 - (1 - ai.turningSpeedRatio) * turning;
    // A ship facing a nearby coast keeps only steerage way while it turns away.
    const coastRatio = probe > 0 ? Math.max(ai.turningSpeedRatio, Math.min(1, clearanceAhead / probe)) : 1;
    const ratio = clearanceAhead > 0 ? Math.min(turnRatio, coastRatio) : 0;
    return this.profile.movement.maxSpeed * ratio;
  }

  #trackProgress(elapsed: number, holding: boolean): void {
    if (holding) {
      this.#progressAnchor = { x: this.x, y: this.y };
      this.#progressAt = elapsed;
      return;
    }
    if (elapsed - this.#progressAt < this.#ai.stuckSeconds) return;
    if (elapsed >= this.#recoverUntil && distance(this, this.#progressAnchor) < this.#ai.stuckDistance) {
      this.#recoverUntil = elapsed + this.#ai.recoverySeconds;
      this.#avoidSide = -this.#avoidSide;
      this.#routeAt = this.#recoverUntil;
    }
    this.#progressAnchor = { x: this.x, y: this.y };
    this.#progressAt = elapsed;
  }

  abstract update(context: EnemyContext): void;
}
