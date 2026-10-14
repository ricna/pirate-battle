// Writes reports/TEST-SUMMARY.md from Playwright's JSON reporter output (reports/playwright.json).
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import process from 'node:process';
import console from 'node:console';

const input = process.argv[2] ?? 'reports/playwright.json';
const output = process.argv[3] ?? 'reports/TEST-SUMMARY.md';
const report = JSON.parse(await readFile(input, 'utf8'));

function* tests(suite, titles = []) {
  const path = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) yield { file: spec.file, title: [...path, spec.title], test };
  for (const child of suite.suites ?? []) yield* tests(child, path);
}

const rows = [];
const projects = new Map();
for (const suite of report.suites ?? [])
  for (const { file, title, test } of tests(suite)) {
    const results = test.results ?? [];
    const last = results.at(-1);
    const status = test.status === 'expected' ? 'passed' : test.status;
    const durationMs = results.reduce((sum, result) => sum + (result.duration ?? 0), 0);
    rows.push({ project: test.projectName, file, title: title.slice(1).join(' › '), status, durationMs });
    const totals = projects.get(test.projectName) ?? { passed: 0, failed: 0, flaky: 0, skipped: 0 };
    if (status === 'passed') totals.passed++;
    else if (status === 'flaky') totals.flaky++;
    else if (status === 'skipped') totals.skipped++;
    else totals.failed++;
    projects.set(test.projectName, totals);
    if (last?.error) console.error(`${test.projectName} › ${title.join(' › ')}: ${last.error.message}`);
  }

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable';
  }
};
const dirty = git(['status', '--porcelain', '--untracked-files=no', '--', 'src', 'tests', 'public']);
const stats = report.stats ?? {};
const total = rows.length;
const passed = rows.filter((row) => row.status === 'passed').length;
const minutes = ((stats.duration ?? 0) / 60000).toFixed(1);
const lines = [
  '# Playwright summary',
  '',
  `Generated from \`${input}\` by \`npm run test:summary\`. The HTML report is \`reports/playwright/index.html\`.`,
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Result | **${passed}/${total} passed**${stats.unexpected ? `, ${stats.unexpected} failed` : ''}${stats.flaky ? `, ${stats.flaky} flaky` : ''} |`,
  `| Started | ${stats.startTime ?? 'unknown'} |`,
  `| Duration | ${minutes} minutes |`,
  `| Source commit | \`${git(['rev-parse', '--short=12', 'HEAD'])}\`${dirty && dirty !== 'unavailable' ? ' (with uncommitted source/test changes)' : ''} |`,
  `| Playwright | ${report.config?.version ?? 'unknown'} |`,
  `| Runner | ${os.type()} ${os.release()} (${process.platform}), Node ${process.version} |`,
  '',
  '| Project | Passed | Failed | Flaky | Skipped |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...[...projects].map(
    ([project, totals]) =>
      `| ${project} | ${totals.passed} | ${totals.failed} | ${totals.flaky} | ${totals.skipped} |`,
  ),
  '',
  '| Project | Spec | Test | Status | Seconds |',
  '| --- | --- | --- | --- | ---: |',
  ...rows.map(
    (row) =>
      `| ${row.project} | ${row.file} | ${row.title.replaceAll('|', '\\|')} | ${row.status} | ${(row.durationMs / 1000).toFixed(1)} |`,
  ),
  '',
];
await writeFile(output, lines.join('\n'));
console.log(`${output}: ${passed}/${total} passed in ${minutes} minutes.`);
if (passed !== total) process.exitCode = 1;
