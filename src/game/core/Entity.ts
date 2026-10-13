import type { Point } from '../math/Geometry';

export abstract class Entity implements Point {
  #id: number; #x: number; #y: number;
  protected constructor(id: number, position: Readonly<Point>) { this.#id = id; this.#x = position.x; this.#y = position.y; }
  get id(): number { return this.#id; }
  get x(): number { return this.#x; }
  get y(): number { return this.#y; }
  protected setPosition(position: Readonly<Point>): void { this.#x = position.x; this.#y = position.y; }
  protected resetIdentity(id: number, position: Readonly<Point>): void { this.#id = id; this.setPosition(position); }
}
