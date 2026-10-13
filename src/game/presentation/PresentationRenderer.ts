import { Container, Sprite, Text } from 'pixi.js';
import { ObjectPool } from '../core/ObjectPool';
import { SpritePool } from '../rendering/SpritePool';
import { requiredTexture } from '../assets';
import type { GameTextures } from '../assets';
import type { PresentationProfile } from '../configuration/PresentationConfig';
import { ParticleKind } from '../configuration/PresentationConfig';
import type { PresentationReadView } from './PresentationSystem';

interface CrewVisual { readonly root: Container; readonly crew: Sprite; readonly foam: Sprite }

/** Renders authored textures/labels through bounded reusable views; owns every allocated display object. */
export class PresentationRenderer {
  readonly #layer = new Container();
  readonly #labelLayer = new Container();
  readonly #particleLayer = new Container();
  readonly #crewLayer = new Container();
  readonly #settings: PresentationProfile;
  readonly #textures: GameTextures;
  readonly #presentation: PresentationReadView;
  readonly #sprites: SpritePool;
  readonly #crewPool: ObjectPool<CrewVisual>;
  readonly #textPool: ObjectPool<Text>;
  readonly #active = new Map<number, Sprite>();
  readonly #crews = new Map<number, CrewVisual>();
  readonly #labels = new Map<number, Text>();
  #disposed = false;

  constructor(underShips: Container, aboveShips: Container, presentation: PresentationReadView, textures: GameTextures, settings: PresentationProfile) {
    this.#settings = settings;
    this.#textures = textures;
    this.#presentation = presentation;
    this.#layer.label = 'authored-particles';
    this.#labelLayer.label = 'score-feedback';
    underShips.addChild(this.#layer);
    this.#layer.addChild(this.#particleLayer, this.#crewLayer);
    aboveShips.addChild(this.#labelLayer);
    this.#sprites = new SpritePool(this.#particleLayer, settings.particles, requiredTexture(textures, settings.profiles[ParticleKind.Debris].sprites[0]!));
    this.#crewPool = new ObjectPool(settings.crewPool, () => {
      const root = new Container();
      const crew = new Sprite(requiredTexture(textures, settings.profiles[ParticleKind.Crew].sprites[0]!));
      const foam = new Sprite(requiredTexture(textures, settings.crew.foamSprite));
      crew.anchor.set(0.5); foam.anchor.set(0.5);
      root.addChild(foam, crew);
      root.visible = false;
      this.#crewLayer.addChild(root);
      return { root, crew, foam };
    }, (view) => {
      view.root.visible = false; view.root.position.set(0); view.root.alpha = 1;
      view.root.rotation = 0; view.root.scale.set(1); view.crew.rotation = 0;
      view.crew.position.set(0); view.crew.tint = 0xffffff; view.foam.scale.set(1);
    });
    this.#textPool = new ObjectPool({ initialCapacity: settings.score.maxCount, growthSize: settings.score.maxCount, maxCapacity: settings.score.maxCount }, () => {
      const text = new Text({ text: '', style: { fontFamily: settings.score.fontFamily,
        fontSize: settings.score.fontSize, fontWeight: 'bold', fill: settings.score.color } });
      text.anchor.set(0.5); text.visible = false;
      this.#labelLayer.addChild(text);
      return text;
    }, (text) => { text.visible = false; text.alpha = 1; text.position.set(0); text.scale.set(1); });
  }

  draw(): void {
    if (this.#disposed) return;
    const particles = this.#presentation.particles;
    const ids = new Set(particles.map((particle) => particle.id));
    for (const [id, sprite] of this.#active) if (!ids.has(id)) { this.#sprites.release(sprite); this.#active.delete(id); }
    for (const [id, crew] of this.#crews) if (!ids.has(id)) { this.#crewPool.release(crew); this.#crews.delete(id); }
    for (const particle of particles) {
      if (particle.kind === ParticleKind.Crew) {
        let view = this.#crews.get(particle.id);
        if (!view) {
          view = this.#crewPool.acquire() ?? undefined;
          if (!view) throw new Error('Crew rendering capacity must match its logical pool.');
          this.#crews.set(particle.id, view);
        }
        view.root.visible = true; view.root.alpha = particle.alpha;
        view.root.position.set(particle.x, particle.y);
        view.crew.texture = requiredTexture(this.#textures, particle.sprite);
        view.crew.width = particle.profile.width; view.crew.height = particle.profile.height;
        view.crew.rotation = particle.angle;
        view.crew.y = this.#presentation.reducedMotion ? 0 : particle.bob;
        const pulse = this.#presentation.reducedMotion ? 1
          : 1 + Math.sin(particle.age * Math.PI * 2 * particle.profile.bobFrequency + particle.id) * this.#settings.crew.foamPulse;
        view.foam.width = particle.profile.width * this.#settings.crew.foamScale * pulse;
        view.foam.height = view.foam.width * view.foam.texture.height / view.foam.texture.width;
      } else {
        const texture = requiredTexture(this.#textures, particle.sprite);
        let sprite = this.#active.get(particle.id);
        if (!sprite) { sprite = this.#sprites.acquire(texture); this.#active.set(particle.id, sprite); }
        sprite.texture = texture;
        sprite.width = particle.profile.width; sprite.height = particle.profile.height;
        sprite.position.set(particle.x, particle.y); sprite.rotation = particle.angle; sprite.alpha = particle.alpha;
      }
    }
    const labels = this.#presentation.labels;
    const labelIds = new Set(labels.map((label) => label.id));
    for (const [id, text] of this.#labels) if (!labelIds.has(id)) { this.#textPool.release(text); this.#labels.delete(id); }
    for (const label of labels) {
      let text = this.#labels.get(label.id);
      if (!text) {
        text = this.#textPool.acquire() ?? undefined;
        if (!text) throw new Error('Floating-score rendering capacity must match its logical budget.');
        this.#labels.set(label.id, text);
      }
      text.text = label.text; text.style.fill = label.color;
      text.visible = true; text.position.set(label.x, label.y); text.alpha = label.alpha;
    }
  }

  statistics() { return { particles: this.#sprites.statistics(), crew: this.#crewPool.statistics(), labels: this.#textPool.statistics() }; }
  destroy(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#sprites.dispose(); this.#crewPool.dispose((view) => view.root.destroy({ children: true }));
    this.#textPool.dispose((text) => text.destroy());
    this.#layer.destroy({ children: true }); this.#labelLayer.destroy({ children: true });
    this.#active.clear(); this.#crews.clear(); this.#labels.clear();
  }
}
