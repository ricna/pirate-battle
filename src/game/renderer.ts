import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { GameTextures } from './assets';
import { requiredTexture } from './assets';
import type { Ship, Simulation } from './simulation';
import { SpritePool } from './rendering/SpritePool';
import metadata from '../../assets/spritesheet/ui_sheet.json';
import { PresentationRenderer } from './presentation/PresentationRenderer';

interface ShipView { root: Container; ship: Sprite; frame: Sprite; fill: Sprite; fire: Sprite; health: number; ownedFill?: Texture }
export class ArenaRenderer {
  readonly #layer = new Container(); readonly #simulation: Simulation; readonly #textures: GameTextures;
  readonly #shipLayer = new Container(); readonly #projectileLayer = new Container(); readonly #effectLayer = new Container();
  readonly #ships = new Map<number, ShipView>();
  readonly #bullets = new Map<number, Sprite>(); readonly #effects = new Map<number, Sprite>();
  readonly #bulletPool: SpritePool; readonly #effectPool: SpritePool;
  readonly #presentation: PresentationRenderer;
  readonly #waterFeedbackLayer = new Container(); readonly #scoreLayer = new Container();
  #disposed = false;
  constructor(world: Container, simulation: Simulation, textures: GameTextures) {
    this.#simulation = simulation; this.#textures = textures;
    this.#layer.label = 'combat-entities'; world.addChild(this.#layer);
    this.#layer.addChild(this.#waterFeedbackLayer, this.#shipLayer, this.#projectileLayer, this.#effectLayer, this.#scoreLayer);
    this.#presentation = new PresentationRenderer(this.#waterFeedbackLayer, this.#scoreLayer, simulation.presentation, textures, simulation.config.presentation);
    const projectile = simulation.config.player.weapons[0]?.projectile;
    if (!projectile) throw new Error('The player requires a projectile profile for the rendering pool.');
    this.#bulletPool = new SpritePool(this.#projectileLayer, simulation.config.pools.projectiles, this.#texture(projectile.sprite));
    const effect = simulation.config.effects.explosion.sprites[0]!;
    this.#effectPool = new SpritePool(this.#effectLayer, simulation.config.pools.effects, this.#texture(effect));
    this.draw();
  }
  #texture(name: string): Texture { return requiredTexture(this.#textures, name); }
  #sprite(name: string): Sprite { const sprite = new Sprite(this.#texture(name)); sprite.anchor.set(0.5); return sprite; }
  #selectedSprite(stages: readonly { minimumHealthRatio: number; sprite: string }[], ratio: number): string {
    const stage = stages.find((s) => ratio > s.minimumHealthRatio) ?? stages.at(-1);
    if (!stage) throw new Error('Ship rendering requires authored damage/health stages.'); return stage.sprite;
  }
  #shipView(ship: Ship): ShipView {
    const visual = ship.profile.visual; const root = new Container();
    const sprite = this.#sprite(visual.damageStages[0]!.sprite); sprite.width = visual.width; sprite.height = visual.height;
    const frame = this.#sprite(visual.healthFrame); const fill = this.#sprite(visual.healthFills[0]!.sprite);
    const meta = metadata.frames[visual.healthMetadata]; const scale = visual.healthScale;
    frame.anchor.set(0); frame.scale.set(scale); frame.position.set(-meta.sourceSize.w * scale / 2, visual.healthOffsetY);
    fill.anchor.set(0); fill.position.copyFrom(frame.position); fill.scale.set(scale);
    const fire = this.#sprite(visual.fireSprites[0]!); fire.width = visual.fireWidth; fire.height = visual.fireHeight; fire.visible = false;
    root.addChild(sprite, fire, frame, fill); this.#shipLayer.addChild(root);
    const view = { root, ship: sprite, frame, fill, fire, health: -1 }; this.#ships.set(ship.id, view); return view;
  }
  draw(): void {
    if (this.#disposed) return;
    const sim = this.#simulation; const live = [sim.player, ...sim.enemies].filter((s) => s.alive);
    const ids = new Set(live.map((s) => s.id));
    for (const [id, view] of this.#ships) if (!ids.has(id)) {
      view.root.destroy({ children: true }); view.ownedFill?.destroy(false); this.#ships.delete(id);
    }
    for (const ship of live) {
      const view = this.#ships.get(ship.id) ?? this.#shipView(ship); const visual = ship.profile.visual;
      const ratio = ship.health / ship.maxHealth;
      view.ship.texture = this.#texture(this.#selectedSprite(visual.damageStages, ratio));
      view.ship.width = visual.width; view.ship.height = visual.height;
      view.root.position.set(ship.x, ship.y); view.ship.rotation = ship.angle + visual.angleOffset;
      const feedback = sim.presentation.shipFeedback(ship.id);
      const settings = sim.config.presentation;
      view.ship.tint = feedback && sim.presentation.time - feedback.damageAt < settings.damage.flashSeconds
        ? settings.damage.flashTint : 0xffffff;
      const recoil = feedback && !sim.presentation.reducedMotion
        ? Math.max(0, 1 - (sim.presentation.time - feedback.shotAt) / settings.recoil.duration) * settings.recoil.distance : 0;
      view.ship.position.set(feedback ? -Math.sin(feedback.shotAngle) * recoil : 0, feedback ? Math.cos(feedback.shotAngle) * recoil : 0);
      view.fire.visible = ratio <= visual.fireThreshold;
      view.fire.texture = this.#texture(visual.fireSprites[Math.floor(sim.presentation.time * visual.fireFramesPerSecond) % visual.fireSprites.length]!);
      if (view.health !== ship.health) {
        const fillTexture = this.#texture(this.#selectedSprite(visual.healthFills, ratio));
        const rect = metadata.frames[visual.healthMetadata].ui.layout.fill_rect;
        const cropped = new Texture({ source: fillTexture.source,
          frame: new Rectangle(fillTexture.frame.x, fillTexture.frame.y, rect.x + rect.w * ratio, fillTexture.height) });
        view.fill.texture = cropped; view.ownedFill?.destroy(false); view.ownedFill = cropped; view.health = ship.health;
      }
    }
    const bulletIds = new Set(sim.projectiles.map((p) => p.id));
    for (const [id, sprite] of this.#bullets) if (!bulletIds.has(id)) { this.#bulletPool.release(sprite); this.#bullets.delete(id); }
    for (const bullet of sim.projectiles) {
      let sprite = this.#bullets.get(bullet.id);
      if (!sprite) { sprite = this.#bulletPool.acquire(this.#texture(bullet.profile.sprite)); this.#bullets.set(bullet.id, sprite); }
      sprite.width = bullet.profile.width; sprite.height = bullet.profile.height; sprite.position.set(bullet.x, bullet.y);
    }
    const effectIds = new Set(sim.effects.map((e) => e.id));
    for (const [id, sprite] of this.#effects) if (!effectIds.has(id)) { this.#effectPool.release(sprite); this.#effects.delete(id); }
    for (const effect of sim.effects) {
      const profile = effect.profile;
      const frame = Math.min(profile.sprites.length - 1, Math.floor(effect.age / effect.duration * profile.sprites.length));
      const texture = this.#texture(profile.sprites[frame]!); let sprite = this.#effects.get(effect.id);
      if (!sprite) { sprite = this.#effectPool.acquire(texture); this.#effects.set(effect.id, sprite); }
      sprite.texture = texture; sprite.position.set(effect.x, effect.y);
      sprite.width = sprite.height = profile.size; sprite.alpha = 1 - effect.age / effect.duration * profile.fade;
      sprite.rotation = effect.angle;
    }
    this.#presentation.draw();
  }
  poolStatistics() { return { projectiles: this.#bulletPool.statistics(), effects: this.#effectPool.statistics(), presentation: this.#presentation.statistics() }; }
  destroy(): void {
    if (this.#disposed) return; this.#disposed = true;
    this.#bulletPool.dispose(); this.#effectPool.dispose();
    this.#presentation.destroy();
    this.#layer.destroy({ children: true }); for (const view of this.#ships.values()) view.ownedFill?.destroy(false);
    this.#ships.clear(); this.#bullets.clear(); this.#effects.clear();
  }
}
