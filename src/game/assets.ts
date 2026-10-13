import { Assets, Texture } from 'pixi.js';
import type { GameConfig } from './config';
const files = import.meta.glob('../../assets/png/default/{ships,ship_parts,effects,ui/hud}/*.png',
  { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export type TextureName = string;
export type GameTextures = Readonly<Record<TextureName, Texture>>;
export function requiredTexture(textures: GameTextures, name: TextureName): Texture {
  const texture = textures[name]; if (!texture) throw new Error(`Required texture ${name} was not loaded.`); return texture;
}
export function configuredTextureNames(config: GameConfig): readonly string[] {
  const names = new Set<string>();
  for (const profile of [config.player, ...Object.values(config.enemies)]) {
    const visual = profile.visual; names.add(visual.healthFrame);
    for (const stage of [...visual.damageStages, ...visual.healthFills]) names.add(stage.sprite);
    for (const fire of visual.fireSprites) names.add(fire);
    for (const weapon of profile.weapons) names.add(weapon.projectile.sprite);
  }
  for (const effect of Object.values(config.effects)) for (const sprite of effect.sprites) names.add(sprite);
  return Object.freeze([...names]);
}
export async function loadGameTextures(config: GameConfig, progress: (fraction: number) => void): Promise<GameTextures> {
  const pairs = configuredTextureNames(config).map((name) => {
    const url = files[`../../assets/png/default/${name}.png`];
    if (!url) throw new Error(`Required authored texture ${name} is missing.`);
    return [name, url] as const;
  });
  await Assets.load<Texture>(pairs.map(([, url]) => url), progress);
  return Object.freeze(Object.fromEntries(pairs.map(([name, url]) => [name, Assets.get<Texture>(url)])));
}
