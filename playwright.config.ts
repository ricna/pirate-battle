import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 60000,
  expect: { timeout: 8000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  outputDir: 'test-results',
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'rendering', testMatch: '**/rendering.spec.ts' },
    { name: 'core', testMatch: '**/core.spec.ts' },
    { name: 'desktop', testMatch: '**/game.spec.ts', use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'mobile-landscape', testMatch: '**/game.spec.ts', use: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
