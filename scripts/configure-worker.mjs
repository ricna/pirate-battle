import { readFileSync, writeFileSync } from 'node:fs';
const filename = 'public/mockServiceWorker.js';
const source = readFileSync(filename, 'utf8').replace(/\r\n/g, '\n');
const marker = "addEventListener('fetch', function (event) {\n";
const filter = "  // Project customization: mock REST only; do not clone static asset traffic.\n  if (!new URL(event.request.url).pathname.startsWith('/api/')) return\n\n";
if (!source.includes(marker)) throw new Error('MSW worker format changed. Review the API-only filter before publishing.');
if (!source.includes('Project customization: mock REST only')) writeFileSync(filename, source.replace(marker, marker + filter));
