// Runs Playwright inside the CI image (Linux fonts and software WebGL, as in the committed *-linux.png
// baselines). Usage: npm run test:docker -- [playwright arguments]
//   npm run test:docker                                         full suite, as CI runs it
//   npm run test:docker -- -g "visual baselines" --update-snapshots   intentional Linux baseline update
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const version = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version;
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const playwrightArguments = process.argv.slice(2).map(quote).join(' ');

// The container installs its own Linux node_modules from the lockfile; the host checkout is only copied.
const script = [
  'set -e',
  'mkdir -p /work',
  'cd /src',
  'tar --exclude=./node_modules --exclude=./reports --exclude=./test-results --exclude=./dist -cf - . | tar -C /work -xf -',
  'cd /work',
  'npm ci --no-audit --no-fund --loglevel=error',
  'set +e',
  `npx playwright test ${playwrightArguments}`,
  'status=$?',
  'node scripts/report-summary.mjs reports/playwright.json reports/TEST-SUMMARY.md',
  'find tests -name "*-linux.png" | while read -r file; do cp "$file" "/src/$file"; done',
  'mkdir -p /src/reports/linux',
  'rm -rf /src/reports/linux/playwright /src/reports/linux/accessibility',
  'cp -r reports/playwright /src/reports/linux/playwright 2>/dev/null',
  'cp reports/playwright.json reports/TEST-SUMMARY.md /src/reports/linux/ 2>/dev/null',
  'cp -r reports/accessibility /src/reports/linux/accessibility 2>/dev/null',
  'exit $status',
].join('\n');

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '-e',
    'CI=true',
    '-e',
    `GITHUB_SHA=${commit}`,
    '-v',
    `${process.cwd()}:/src`,
    image,
    'bash',
    '-c',
    script,
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
