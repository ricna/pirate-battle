import { Application, Container, Sprite, TilingSprite } from 'pixi.js';
import type { GameTextures } from './assets';
import type { Simulation } from './simulation';

export class ArenaRenderer {
  private world = new Container();
  private ship: Sprite;
  private health = new Container();
  private fill: Sprite;

  constructor(private app: Application, private simulation: Simulation, textures: GameTextures) {
    const { arena } = simulation.config;
    const water = new TilingSprite({ texture: textures.water, width: arena.width, height: arena.height });
    this.world.addChild(water);
    for (const island of arena.islands) {
      island.tiles.forEach((row, rowIndex) => row.forEach((number, columnIndex) => {
        const texture = textures.tiles.get(number);
        if (!texture) throw new Error(`Required island texture ${number} is missing.`);
        const tile = new Sprite(texture);
        tile.position.set(island.x + columnIndex * island.size, island.y + rowIndex * island.size);
        tile.width = tile.height = island.size;
        this.world.addChild(tile);
      }));
    }
    this.ship = new Sprite(textures.ship);
    this.ship.anchor.set(0.5);
    this.ship.scale.set(0.7);
    this.world.addChild(this.ship);
    const frame = new Sprite(textures.healthFrame);
    frame.anchor.set(0.5);
    frame.width = 78;
    frame.height = 15;
    this.fill = new Sprite(textures.healthFill);
    this.fill.anchor.set(0, 0.5);
    this.fill.position.set(-31, 0);
    this.fill.height = 7;
    this.health.addChild(frame, this.fill);
    this.world.addChild(this.health);
    app.stage.addChild(this.world);
    this.draw();
  }

  draw() {
    const { arena, player: config } = this.simulation.config;
    const scale = Math.min(this.app.screen.width / arena.width, this.app.screen.height / arena.height);
    this.world.scale.set(scale);
    this.world.position.set((this.app.screen.width - arena.width * scale) / 2, (this.app.screen.height - arena.height * scale) / 2);
    const player = this.simulation.player;
    this.ship.position.set(player.x, player.y);
    this.ship.rotation = player.angle;
    this.health.position.set(player.x, player.y - 53);
    this.fill.width = 62 * player.health / config.health;
  }
}
