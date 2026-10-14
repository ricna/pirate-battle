import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advance, open, play, selectRecordsTab, waitForAuthoredArt } from './helpers';

const WcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface AuditSummary {
  readonly screen: string;
  readonly passes: number;
  readonly violations: readonly string[];
  /** Rules axe cannot decide automatically, such as text contrast over authored artwork. */
  readonly incomplete: readonly string[];
}

async function audit(page: Page, screen: string, summaries: AuditSummary[]) {
  const results = await new AxeBuilder({ page }).withTags(WcagTags).analyze();
  const describe = (rule: (typeof results.violations)[number]) =>
    `${rule.id} (${rule.impact ?? 'n/a'}): ${rule.nodes.map((node) => node.target.join(' ')).join(', ')}`;
  summaries.push({
    screen,
    passes: results.passes.length,
    violations: results.violations.map(describe),
    incomplete: results.incomplete.map((rule) => rule.id),
  });
  expect(results.violations.map(describe), `${screen}: WCAG 2.1 AA violations`).toEqual([]);
}

test('menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const summaries: AuditSummary[] = [];
  await open(page);
  await waitForAuthoredArt(page);
  await audit(page, 'Main menu', summaries);

  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await audit(page, 'Options', summaries);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();

  await page.getByRole('button', { name: 'How To Play', exact: true }).click();
  await audit(page, 'How To Play', summaries);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();

  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await audit(page, "Captain's Log — Ranking", summaries);
  await selectRecordsTab(page, 'Match History');
  await expect(page.getByText('No records yet.', { exact: false })).toBeVisible();
  await audit(page, "Captain's Log — Match History", summaries);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();

  await play(page);
  await audit(page, 'Gameplay HUD and touch controls', summaries);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await audit(page, 'Pause dialog', summaries);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();

  await advance(page, 120);
  await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
  await expect(page.locator('.app-result')).toHaveCSS('opacity', '1');
  await audit(page, 'Result', summaries);

  expect(errors).toEqual([]);
  const report = { project: testInfo.project.name, tags: WcagTags, axe: '@axe-core/playwright', summaries };
  await mkdir('reports/accessibility', { recursive: true });
  await writeFile(
    `reports/accessibility/axe-${testInfo.project.name}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await testInfo.attach('axe-summary', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
});
