import process from 'node:process';
import { defineConfig } from '@playwright/test';

/** Development server: React Strict Mode, test instrumentation and source-level failure routes. */
const port = Number(process.env.PIRATE_TEST_PORT ?? 5173);
const baseURL = `http://127.0.0.1:${port}`;
/** Optimized build for the smoke project; PIRATE_SMOKE_URL points it at a deployment instead. */
const previewPort = Number(process.env.PIRATE_PREVIEW_PORT ?? 4317);
const smokeURL = process.env.PIRATE_SMOKE_URL ?? `http://127.0.0.1:${previewPort}`;
const reportDirectory = process.env.PIRATE_TEST_REPORT_DIR ?? 'reports/playwright';
const continuousIntegration = Boolean(process.env.CI);
const browserFlows = [
  '**/game.spec.ts',
  '**/music.spec.ts',
  '**/network.spec.ts',
  '**/accessibility.spec.ts',
  '**/pause.spec.ts',
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: continuousIntegration,
  retries: 0,
  // Software WebGL in CI containers renders the arena more slowly than a desktop GPU.
  timeout: continuousIntegration ? 120000 : 60000,
  expect: { timeout: 8000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  reporter: [
    ['list'],
    ['html', { outputFolder: reportDirectory, open: 'never' }],
    // Machine-readable results live beside the HTML folder, which the HTML reporter replaces on each run.
    ['json', { outputFile: `${reportDirectory}.json` }],
  ],
  outputDir: process.env.PIRATE_TEST_OUTPUT_DIR ?? 'test-results',
  use: { baseURL, channel: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'mobile-layout', testMatch: '**/mobile.spec.ts' },
    { name: 'rendering', testMatch: '**/rendering.spec.ts' },
    {
      name: 'core',
      testMatch: [
        '**/core.spec.ts',
        '**/collision.spec.ts',
        '**/navigation.spec.ts',
        '**/presentation.spec.ts',
      ],
    },
    {
      name: 'desktop',
      testMatch: browserFlows,
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
    {
      name: 'mobile-landscape',
      testMatch: browserFlows,
      use: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 'production-smoke',
      testMatch: '**/smoke.spec.ts',
      use: { baseURL: smokeURL, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${port} --strictPort`,
      url: baseURL,
      reuseExistingServer: !continuousIntegration && !process.env.PIRATE_TEST_PORT,
      timeout: 60000,
    },
    ...(process.env.PIRATE_SMOKE_URL
      ? []
      : [
          {
            command: `npm run build && npm run preview -- --port ${previewPort} --strictPort`,
            url: smokeURL,
            reuseExistingServer: false,
            timeout: 180000,
          },
        ]),
  ],
});
