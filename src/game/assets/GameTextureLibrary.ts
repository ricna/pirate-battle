import type { GameConfig } from '../contracts/GameConfig';
import { Assets, Rectangle, Texture } from 'pixi.js';

import shipXml from '../../../assets/spritesheet/ships_miscellaneous_sheet.xml?raw';
import uiMetadata from '../../../assets/spritesheet/ui_sheet.json';
import { AssetConfig } from '../configuration/AssetConfig';

interface FrameReference {
  readonly url: string;
  readonly frame: readonly [number, number, number, number] | null;
}
export class GameTextureLibrary {
  readonly #frames = new Map<string, Texture>();

  #reference(name: string): FrameReference {
    const standalone = AssetConfig.Standalone[name as keyof typeof AssetConfig.Standalone];
    if (standalone) return { url: standalone, frame: null };
    if (name.startsWith('ui/')) {
      const key = name.split('/').at(-1)!;
      const item = uiMetadata.frames[key as keyof typeof uiMetadata.frames];
      if (!item) throw new Error(`Required UI atlas frame ${name} is missing.`);
      return { url: AssetConfig.UiAtlas, frame: [item.frame.x, item.frame.y, item.frame.w, item.frame.h] };
    }
    const filename = name.split('/').at(-1)! + '.png';
    const entries = [
      ...shipXml.matchAll(/<SubTexture name="([^"]+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g),
    ];
    const frame = entries.find((entry) => entry[1] === filename);
    if (!frame)
      throw new Error(
        `Required ship atlas frame ${name} is missing; register authored standalone additions explicitly.`,
      );
    return {
      url: AssetConfig.ShipsAtlas,
      frame: [Number(frame[2]), Number(frame[3]), Number(frame[4]), Number(frame[5])],
    };
  }

  #loaded(name: string, reference: FrameReference): Texture {
    const base = Assets.get<Texture>(reference.url);
    if (!base) throw new Error(`Required texture source ${name} was not loaded.`);
    if (!reference.frame) return base;
    const cached = this.#frames.get(name);
    if (cached) return cached;
    const [x, y, width, height] = reference.frame;
    if (width <= 0 || height <= 0 || x + width > base.width || y + height > base.height)
      throw new Error(`Invalid atlas rectangle for ${name}.`);
    const frame = new Texture({ source: base.source, frame: new Rectangle(x, y, width, height) });
    this.#frames.set(name, frame);
    return frame;
  }
  async load(config: GameConfig, progress: (fraction: number) => void): Promise<GameTextures> {
    const pairs = configuredTextureNames(config).map((name) => [name, this.#reference(name)] as const);
    await Assets.load<Texture>([...new Set(pairs.map(([, reference]) => reference.url))], progress);
    return Object.freeze(
      Object.fromEntries(pairs.map(([name, reference]) => [name, this.#loaded(name, reference)])),
    );
  }
}
export type TextureName = string;
export type GameTextures = Readonly<Record<TextureName, Texture>>;
export function requiredTexture(textures: GameTextures, name: TextureName): Texture {
  const texture = textures[name];
  if (!texture) throw new Error(`Required texture ${name} was not loaded.`);
  return texture;
}
export function configuredTextureNames(config: GameConfig): readonly string[] {
  const names = new Set<string>();
  for (const profile of [config.player, ...Object.values(config.enemies)]) {
    const visual = profile.visual;
    names.add(visual.healthFrame);
    names.add(visual.wreckSprite);
    for (const stage of [...visual.damageStages, ...visual.healthFills]) names.add(stage.sprite);
    for (const fire of visual.fireSprites) names.add(fire);
    for (const weapon of profile.weapons) names.add(weapon.projectile.sprite);
  }
  for (const effect of Object.values(config.effects)) for (const sprite of effect.sprites) names.add(sprite);
  for (const profile of Object.values(config.presentation.profiles))
    for (const sprite of profile.sprites) names.add(sprite);
  names.add(config.presentation.crew.foamSprite);
  names.add(config.presentation.water.sprite);
  names.add(config.presentation.shipTrail.sprite);
  return Object.freeze([...names]);
}
