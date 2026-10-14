// Runs Playwright inside the CI image (Linux fonts and software WebGL, as in the committed *-linux.png
// baselines). Usage: npm run test:docker -- [playwright arguments]
//   npm run test:docker                                         full suite, as CI runs it; refreshes reports/linux
//   npm run test:docker -- -g "visual baselines" --update-snapshots   intentional Linux baseline update
// Only the complete suite runs in delivery mode (tests/TestReports.ts) and replaces the versioned
// reports/linux evidence. A focused run keeps its report out of Git, in test-results/linux.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const version = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version;
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const playwrightArguments = process.argv.slice(2).map(quote).join(' ');
const deliveryRun = process.argv.length === 2;
const output = deliveryRun
  ? {
      report: 'reports/playwright',
      evidence: 'reports',
      summary: 'reports/TEST-SUMMARY.md',
      host: '/src/reports/linux',
    }
  : {
      report: 'playwright-report',
      evidence: 'test-results/evidence',
      summary: 'test-results/TEST-SUMMARY.md',
      host: '/src/test-results/linux',
    };

// The container installs its own Linux node_modules from the lockfile; the host checkout is only copied.
const script = [
  'set -e',
  'mkdir -p /work',
  'cd /src',
  'tar --exclude=./node_modules --exclude=./reports --exclude=./test-results --exclude=./playwright-report --exclude=./playwright-report.json --exclude=./dist -cf - . | tar -C /work -xf -',
  'cd /work',
  'npm ci --no-audit --no-fund --loglevel=error',
  'set +e',
  `npx playwright test ${playwrightArguments}`,
  'status=$?',
  `node scripts/report-summary.mjs ${output.report}.json ${output.summary}`,
  'find tests -name "*-linux.png" | while read -r file; do cp "$file" "/src/$file"; done',
  `mkdir -p ${output.host}`,
  `rm -rf ${output.host}/playwright ${output.host}/accessibility`,
  `cp -r ${output.report} ${output.host}/playwright 2>/dev/null`,
  `cp ${output.report}.json ${output.host}/playwright.json 2>/dev/null`,
  `cp ${output.summary} ${output.host}/TEST-SUMMARY.md 2>/dev/null`,
  `cp -r ${output.evidence}/accessibility ${output.host}/accessibility 2>/dev/null`,
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
    ...(deliveryRun ? ['-e', 'PIRATE_TEST_DELIVERY=1'] : []),
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
