import { Container, MeshRope, Point as PixiPoint } from 'pixi.js';
import { ObjectPool } from '../core/ObjectPool';
import { requiredTexture } from '../assets/GameTextureLibrary';
import type { GameTextures } from '../assets/GameTextureLibrary';
import type { PresentationProfile } from '../configuration/PresentationConfig';
import type { Point } from '../math/Geometry';
import type { PresentationReadView } from './PresentationSystem';

interface TrailRope {
  readonly rope: MeshRope;
  /** Fixed vertex path; the rope geometry is reused and only these coordinates change. */
  readonly points: readonly PixiPoint[];
}

/** Shorter paths are hidden: their rope normals would be degenerate. */
const MinimumPathLength = 1;

/**
 * Renders each ship trail as a pooled MeshRope stretched once along its stern path, so the owner's texture
 * keeps its strong end at the stern and its faded end at the tail without repeating or bleeding.
 */
export class ShipTrailRenderer {
  readonly #layer = new Container();
  readonly #presentation: PresentationReadView;
  readonly #pool: ObjectPool<TrailRope>;
  readonly #active = new Map<number, TrailRope>();
  #disposed = false;

  constructor(
    parent: Container,
    presentation: PresentationReadView,
    textures: GameTextures,
    settings: PresentationProfile['shipTrail'],
  ) {
    this.#presentation = presentation;
    this.#layer.label = 'ship-trails';
    parent.addChild(this.#layer);
    const texture = requiredTexture(textures, settings.sprite);
    this.#pool = new ObjectPool<TrailRope>(
      settings.pool,
      () => {
        const points = Array.from({ length: settings.ropePoints }, () => new PixiPoint());
        const rope = new MeshRope({ texture, points, width: settings.width, textureScale: 0 });
        rope.visible = false;
        this.#layer.addChild(rope);
        return { rope, points };
      },
      (view) => {
        view.rope.visible = false;
        view.rope.alpha = 1;
        for (const point of view.points) point.set(0, 0);
      },
    );
  }

  draw(): void {
    if (this.#disposed) return;
    const trails = this.#presentation.shipTrails;
    const ids = new Set(trails.map((trail) => trail.shipId));
    for (const [id, view] of this.#active)
      if (!ids.has(id)) {
        this.#pool.release(view);
        this.#active.delete(id);
      }
    for (const trail of trails) {
      let view = this.#active.get(trail.shipId);
      if (!view) {
        view = this.#pool.acquire() ?? undefined;
        if (!view) throw new Error('Ship-trail rendering capacity must match its logical budget.');
        this.#active.set(trail.shipId, view);
      }
      view.rope.visible = resample(trail.points, view.points);
      view.rope.alpha = trail.alpha;
    }
  }

  statistics() {
    return this.#pool.statistics();
  }

  destroy(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#pool.dispose((view) => {
      const geometry = view.rope.geometry;
      // The shared authored texture belongs to the application cache; only the rope's own geometry goes.
      view.rope.destroy();
      geometry.destroy(true);
    });
    this.#layer.destroy({ children: true });
    this.#active.clear();
  }
}

/** Places `target` evenly along the polyline `path` by arc length; returns false for a degenerate path. */
function resample(path: readonly Point[], target: readonly PixiPoint[]): boolean {
  const lengths = [0];
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]!;
    const to = path[index]!;
    lengths.push(lengths[index - 1]! + Math.hypot(to.x - from.x, to.y - from.y));
  }
  const total = lengths.at(-1)!;
  if (total < MinimumPathLength) return false;
  let segment = 1;
  for (let index = 0; index < target.length; index++) {
    const distance = (total * index) / (target.length - 1);
    while (segment < path.length - 1 && lengths[segment]! < distance) segment++;
    const from = path[segment - 1]!;
    const to = path[segment]!;
    const span = lengths[segment]! - lengths[segment - 1]!;
    const fraction = span > 0 ? (distance - lengths[segment - 1]!) / span : 0;
    target[index]!.set(from.x + (to.x - from.x) * fraction, from.y + (to.y - from.y) * fraction);
  }
  return true;
}
