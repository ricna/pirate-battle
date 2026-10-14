// Runs the complete Playwright suite in delivery mode and rewrites reports/TEST-SUMMARY.md.
// Delivery mode (PIRATE_TEST_DELIVERY=1, see tests/TestReports.ts) writes the versioned HTML/JSON report in
// reports/playwright(.json) and the evidence captures in reports/. Everyday runs (`npm run test:e2e`) write
// Git-ignored output instead, so only this command changes the delivered evidence.
// Usage: npm run test:deliver   (no arguments: a delivered report always covers the complete suite)
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

if (process.argv.length > 2) {
  console.error(
    'test:deliver always runs the complete suite. Use `npm run test:e2e -- <arguments>` for a focused run.',
  );
  process.exit(1);
}
if (process.env.PIRATE_TEST_REPORT_DIR) {
  console.error('test:deliver writes reports/playwright; unset PIRATE_TEST_REPORT_DIR to deliver a report.');
  process.exit(1);
}

const environment = { ...process.env, PIRATE_TEST_DELIVERY: '1' };
const runNode = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: environment });
  if (result.error) throw result.error;
  return result.status ?? 1;
};

const suiteStatus = runNode(['node_modules/@playwright/test/cli.js', 'test']);
// The summary lists failures too, so it is written whatever the suite's result.
const summaryStatus = runNode(['scripts/report-summary.mjs']);
process.exitCode = suiteStatus || summaryStatus;
