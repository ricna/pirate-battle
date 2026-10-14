import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, relative, resolve } from 'node:path';
import console from 'node:console';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const source = files(resolve(root, 'src')).filter((file) => /\.(ts|tsx|css)$/.test(file));
const contents = source.map((file) => ({
  file: relative(root, file).replaceAll('\\', '/'),
  text: readFileSync(file, 'utf8'),
}));
const assets = files(resolve(root, 'assets'));
const atlas = readFileSync(resolve(root, 'assets/spritesheet/ships_miscellaneous_sheet.xml'), 'utf8');
const frames = [
  ...atlas.matchAll(/<SubTexture name="([^"]+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g),
].map((match) => ({
  name: match[1],
  x: Number(match[2]),
  y: Number(match[3]),
  width: Number(match[4]),
  height: Number(match[5]),
}));
const ui = JSON.parse(readFileSync(resolve(root, 'assets/spritesheet/ui_sheet.json'), 'utf8'));
const defaultFiles = assets.filter(
  (file) =>
    file.includes(resolve(root, 'assets/png/default') + '/') ||
    file.includes(resolve(root, 'assets/png/default') + '\\'),
);
const pngs = defaultFiles
  .filter((file) => extname(file) === '.png')
  .map((file) => {
    const data = readFileSync(file);
    const name = relative(resolve(root, 'assets/png/default'), file)
      .replaceAll('\\', '/')
      .replace(/\.png$/, '');
    const frame = frames.find((item) => item.name === basename(file));
    return {
      name,
      width: data.readUInt32BE(16),
      height: data.readUInt32BE(20),
      category: name.split('/')[0],
      atlas: frame ?? null,
      literalReferences: contents.filter((item) => item.text.includes(name)).map((item) => item.file),
    };
  });
const sounds = assets
  .filter((file) => extname(file) === '.wav')
  .map((file) => {
    const name = basename(file, '.wav');
    const data = readFileSync(file);
    let byteRate = 0;
    let size = 0;
    for (let offset = 12; offset + 8 <= data.length;) {
      const chunk = data.toString('ascii', offset, offset + 4);
      const length = data.readUInt32LE(offset + 4);
      if (chunk === 'fmt ') byteRate = data.readUInt32LE(offset + 16);
      if (chunk === 'data') size += length;
      offset += 8 + length + (length % 2);
    }
    return {
      name,
      seconds: byteRate ? size / byteRate : null,
      literalReferences: contents.filter((item) => item.text.includes(name)).map((item) => item.file),
    };
  });
const categories = Object.fromEntries(
  [...new Set(pngs.map((item) => item.category))].map((name) => [
    name,
    pngs.filter((item) => item.category === name).length,
  ]),
);
const mismatches = pngs.filter(
  (item) => item.atlas && (item.atlas.width !== item.width || item.atlas.height !== item.height),
);
const report = {
  music: assets
    .filter((file) => extname(file) === '.mp3')
    .map((file) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      literalReferences: contents
        .filter((item) => item.text.includes(basename(file)))
        .map((item) => item.file),
    })),
  generatedAt: new Date().toISOString(),
  method:
    'Inventory, PNG dimensions, ships XML rectangles, UI JSON metadata and static literal references. References are candidates, not proof that an event occurs. Dynamic UI/frame assembly requires the documented usage review.',
  counts: {
    allAssetFiles: assets.length,
    defaultPngs: pngs.length,
    shipXmlFrames: frames.length,
    uiJsonFrames: Object.keys(ui.frames).length,
    sounds: sounds.length,
    categories,
  },
  metadata: {
    dimensionMismatches: mismatches,
    namedFoamWakeTrailFrames: frames.filter((frame) => /foam|wake|ring|trail|splash/i.test(frame.name)),
  },
  pngs,
  sounds,
  otherResources: assets
    .filter((file) => !/\.(png|wav)$/.test(file))
    .map((file) => relative(root, file).replaceAll('\\', '/')),
};
writeFileSync(resolve(root, 'reports/asset-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      counts: report.counts,
      dimensionMismatches: mismatches.length,
      namedFoamWakeTrailFrames: report.metadata.namedFoamWakeTrailFrames,
    },
    null,
    2,
  ),
);
if (mismatches.length) process.exitCode = 1;
