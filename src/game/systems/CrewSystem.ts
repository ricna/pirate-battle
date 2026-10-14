import { ObjectPool } from '../core/ObjectPool';
import type { EntityIdSequence } from '../core/EntityIdSequence';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { GameConfig } from '../contracts/GameConfig';
import { FeedbackKind } from '../contracts/FeedbackEvent';
import type { FeedbackEvent } from '../contracts/FeedbackEvent';
import { ParticleKind } from '../configuration/PresentationConfig';
import { Crew } from '../entities/Crew';
import type { CrewReadView } from '../entities/Crew';
import type { PlayerShip } from '../entities/PlayerShip';
import { CosmeticRandom } from '../presentation/CosmeticRandom';
import { segmentCircle } from '../math/Geometry';
import type { Point } from '../math/Geometry';

export interface CrewEmission {
  readonly shipId: number;
  readonly count: number;
  readonly at: number;
  readonly sprites: readonly string[];
}

export interface CrewSystemReadView {
  readonly particles: readonly CrewReadView[];
  readonly emissions: readonly CrewEmission[];
  statistics(): ReturnType<ObjectPool<Crew>['statistics']>;
}

/** Authoritative survivors. Their random stream is independent of other visual effects. */
export class CrewSystem {
  readonly #config: GameConfig;
  readonly #world: ICollisionWorld;
  readonly #ids: EntityIdSequence;
  readonly #random: CosmeticRandom;
  readonly #pool: ObjectPool<Crew>;
  readonly #sunkIds = new Set<number>();
  readonly #readView: CrewSystemReadView;
  #active: Crew[] = [];
  #particles: readonly CrewReadView[] = Object.freeze([]);
  #emissions: readonly CrewEmission[] = Object.freeze([]);
  #time = 0;
  #disposed = false;

  constructor(config: GameConfig, world: ICollisionWorld, ids: EntityIdSequence) {
    this.#config = config;
    this.#world = world;
    this.#ids = ids;
    this.#random = new CosmeticRandom(config.seed ^ config.crew.seedSalt, config.random);
    this.#pool = new ObjectPool(
      config.presentation.crewPool,
      () => new Crew(config.crew.radius),
      (crew) => crew.reset(),
    );
    this.#readView = ((owner: CrewSystem) =>
      Object.freeze({
        get particles() {
          return owner.#particles;
        },
        get emissions() {
          return owner.#emissions;
        },
        statistics: () => owner.#pool.statistics(),
      }))(this);
  }

  get readView(): CrewSystemReadView {
    return this.#readView;
  }

  accept(event: FeedbackEvent): void {
    if (this.#disposed || event.kind !== FeedbackKind.Sunk || this.#sunkIds.has(event.shipId)) return;
    const settings = this.#config.presentation;
    const profile = settings.profiles[ParticleKind.Crew];
    if (!this.#world.isFree(event.point, profile.waterRadius))
      throw new Error('Crew emission requires validated water clearance.');
    const count = Math.floor(this.#random.between(settings.crew.minimum, settings.crew.maximum + 1));
    if (this.#pool.available < count)
      throw new Error('Crew pool must reserve every survivor in a sinking group.');
    this.#sunkIds.add(event.shipId);
    const sprites: string[] = [];
    for (let index = 0; index < count; index++) {
      const sprite = profile.sprites[Math.floor(this.#random.next() * profile.sprites.length)];
      if (!sprite) throw new Error('Crew requires an explicit authored sprite.');
      const crew = this.#pool.acquire();
      if (!crew) throw new Error('Configured crew capacity cannot satisfy the required survivor count.');
      const angle = (index / count) * Math.PI * 2 + this.#random.between(0, Math.PI / count);
      crew.activate({
        id: this.#ids.next(),
        kind: ParticleKind.Crew,
        profile,
        sprite,
        point: event.point,
        sourceShipId: event.shipId,
        angle,
        vx: Math.sin(angle) * settings.crew.scatterSpeed,
        vy: -Math.cos(angle) * settings.crew.scatterSpeed,
        phase: this.#random.between(0, Math.PI * 2),
        driftSpeed: settings.crew.driftSpeed,
      });
      sprites.push(sprite);
      this.#active.push(crew);
    }
    this.#emissions = Object.freeze(
      [
        ...this.#emissions,
        Object.freeze({ shipId: event.shipId, count, at: this.#time, sprites: Object.freeze(sprites) }),
      ].slice(-settings.eventHistoryCapacity),
    );
    this.#publish();
  }

  update(dt: number): void {
    if (this.#disposed) return;
    this.#time += dt;
    this.#active = this.#active.filter((crew) => {
      crew.update(dt, this.#world);
      if (!crew.expired) return true;
      this.#pool.release(crew);
      return false;
    });
    this.#emissions = Object.freeze(
      this.#emissions.filter(
        (emission) =>
          this.#time - emission.at < this.#config.presentation.profiles[ParticleKind.Crew].lifetime,
      ),
    );
    this.#publish();
  }

  rescue(player: PlayerShip, start: Point, emit: (event: FeedbackEvent) => void): void {
    if (this.#disposed || !player.alive || player.health >= player.maxHealth) return;
    this.#active = this.#active.filter((crew) => {
      const contact = segmentCircle(
        { x: start.x - crew.previous.x, y: start.y - crew.previous.y },
        { x: player.x - crew.x, y: player.y - crew.y },
        { x: 0, y: 0 },
        player.hullRadius + crew.radius,
      );
      if (contact === null) return true;
      const amount = player.restoreHealth(this.#config.crew.healthPerRescue);
      if (amount === 0) return true;
      emit({ kind: FeedbackKind.Rescue, crewId: crew.id, point: { x: crew.x, y: crew.y }, amount });
      this.#pool.release(crew);
      return false;
    });
    this.#publish();
  }

  #publish(): void {
    this.#particles = Object.freeze(
      this.#active.map((crew) => Object.freeze({ ...crew.view, radius: crew.radius })),
    );
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#active = [];
    this.#pool.dispose((crew) => crew.reset());
    this.#sunkIds.clear();
    this.#emissions = Object.freeze([]);
    this.#publish();
  }
}
