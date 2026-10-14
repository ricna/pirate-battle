import { VisualParticle } from '../presentation/VisualParticle';
import type { ParticleActivation, ParticleReadView } from '../presentation/VisualParticle';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { Point } from '../math/Geometry';

export interface CrewReadView extends ParticleReadView {
  readonly radius: number;
}

/** A survivor uses the existing floating motion, with an independent rescue trigger. */
export class Crew extends VisualParticle {
  readonly #radius: number;
  #previous: Point = Object.freeze({ x: 0, y: 0 });

  constructor(radius: number) {
    super();
    this.#radius = radius;
  }

  get radius(): number {
    return this.#radius;
  }

  get previous(): Point {
    return this.#previous;
  }

  override activate(activation: ParticleActivation): void {
    super.activate(activation);
    this.#previous = Object.freeze({ ...activation.point });
  }

  override update(dt: number, world: ICollisionWorld): void {
    this.#previous = Object.freeze({ x: this.x, y: this.y });
    // Accessibility changes bob/foam rendering, never the location of a gameplay pickup.
    super.update(dt, world);
  }

  override reset(): void {
    super.reset();
    this.#previous = Object.freeze({ x: 0, y: 0 });
  }
}
