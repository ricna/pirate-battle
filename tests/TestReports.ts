import process from 'node:process';

/**
 * Where a Playwright run writes its report and the evidence the tests capture.
 *
 * Everyday runs (`npm run test:e2e`, focused `-g`/`--project` runs, agents verifying a change) write only
 * Git-ignored output, so a partial run can never replace the delivered evidence. `npm run test:deliver`
 * sets `PIRATE_TEST_DELIVERY=1` and runs the complete suite into the versioned `reports/` folder that the
 * challenge requires. See TESTING.md, "Reports and traces".
 */
const deliveryFlag = process.env.PIRATE_TEST_DELIVERY;
if (deliveryFlag !== undefined && deliveryFlag !== '1')
  throw new Error(`PIRATE_TEST_DELIVERY must be unset or "1"; received "${deliveryFlag}".`);

export const deliveryRun = deliveryFlag === '1';

/** HTML report folder. The HTML reporter replaces it on every run; the JSON results sit beside it. */
export const reportDirectory =
  process.env.PIRATE_TEST_REPORT_DIR ?? (deliveryRun ? 'reports/playwright' : 'playwright-report');
export const reportJsonFile = `${reportDirectory}.json`;

/** Per-test artifacts and failure traces. Playwright cleans this folder at the start of each run. */
export const outputDirectory = process.env.PIRATE_TEST_OUTPUT_DIR ?? 'test-results';

/** Screenshots and audit summaries that tests save as evidence. */
export const evidenceDirectory = deliveryRun ? 'reports' : `${outputDirectory}/evidence`;

export const evidencePath = (relativePath: string) => `${evidenceDirectory}/${relativePath}`;
