const files = import.meta.glob('../../../assets/png/default/ui/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export function uiAsset(name: string) {
  const url = files[`../../assets/png/default/ui/${name}.png`]; if (!url) throw new Error(`Required UI asset ${name} is missing.`); return url;
}
const retinaFiles = import.meta.glob('../../../assets/png/retina/ui/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** Retina PNG for UI drawn above its logical size, addressed like the atlas sprite names (`ui/hud/icon_heart`). */
export function retinaAsset(sprite: string) {
  const url = retinaFiles[`../../assets/png/retina/${sprite}.png`];
  if (!url) throw new Error(`Required retina UI asset ${sprite} is missing.`);
  return url;
}
