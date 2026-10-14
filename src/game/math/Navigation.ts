import type { MapCollider } from '../assets/TiledMapLoader';
import { circleRect, distance } from './Geometry';
import type { Point } from './Geometry';

// Four-neighbour BFS on the authored map grid, with ship-radius obstacle inflation.
export class Navigation {
  readonly #blocked: boolean[];
  readonly #columns: number;
  readonly #rows: number;
  readonly #tile: number;
  constructor(
    columns: number,
    rows: number,
    tile: number,
    radius: number,
    obstacles: readonly MapCollider[],
    inflation: number,
  ) {
    this.#columns = columns;
    this.#rows = rows;
    this.#tile = tile;
    this.#blocked = Array.from({ length: columns * rows }, (_, i) =>
      obstacles.some((r) => circleRect(this.#center(i), radius + tile * inflation, r)),
    );
  }
  #center(i: number) {
    return {
      x: ((i % this.#columns) + 0.5) * this.#tile,
      y: (Math.floor(i / this.#columns) + 0.5) * this.#tile,
    };
  }
  #cell(p: Point) {
    return (
      Math.min(this.#rows - 1, Math.max(0, Math.floor(p.y / this.#tile))) * this.#columns +
      Math.min(this.#columns - 1, Math.max(0, Math.floor(p.x / this.#tile)))
    );
  }
  /**
   * Returns cell centres towards `to`. A target hugging a coast can occupy a cell that is blocked
   * for this ship's inflated radius; the route then ends at the reachable cell nearest the target
   * instead of returning nothing, so a follower never loses its destination.
   */
  route(from: Point, to: Point): Point[] {
    const start = this.#cell(from);
    const end = this.#cell(to);
    const parents = new Int32Array(this.#columns * this.#rows).fill(-1);
    const queue = [start];
    parents[start] = start;
    let closest = start;
    let closestDistance = distance(this.#center(start), to);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const cell = queue[cursor]!;
      if (cell === end) {
        closest = end;
        break;
      }
      const cellDistance = distance(this.#center(cell), to);
      if (cellDistance < closestDistance) {
        closest = cell;
        closestDistance = cellDistance;
      }
      const x = cell % this.#columns;
      const y = Math.floor(cell / this.#columns);
      const neighbours = [
        x > 0 ? cell - 1 : -1,
        x + 1 < this.#columns ? cell + 1 : -1,
        y > 0 ? cell - this.#columns : -1,
        y + 1 < this.#rows ? cell + this.#columns : -1,
      ];
      for (const next of neighbours)
        if (next >= 0 && parents[next] === -1 && !this.#blocked[next]) {
          parents[next] = cell;
          queue.push(next);
        }
    }
    const path: Point[] = [];
    for (let i = closest; i !== start; i = parents[i]!) path.unshift(this.#center(i));
    return path;
  }
}
