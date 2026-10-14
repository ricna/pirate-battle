// Validates the repository documentation: relative links and their anchors, repository paths written as
// inline code, and `npm run` commands. CHALLENGE.md is the verbatim assignment and generated reports are
// evidence, so neither is checked. Usage: npm run docs:check
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';

const VerbatimDocuments = new Set(['CHALLENGE.md']);
const RepositoryRoots = ['src', 'tests', 'scripts', 'assets', 'public', 'reports', '.github'];
// Generated, Git-ignored output that documentation may name before it exists.
const GeneratedRoots = ['playwright-report', 'test-results', 'dist', 'node_modules'];
const CodeExtensions = /\.(ts|tsx|mjs|cjs|js|css|json|ya?ml)$/;

const documents = readdirSync('.').filter((name) => name.endsWith('.md') && !VerbatimDocuments.has(name));
const trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
const basenames = new Set(trackedFiles.map((file) => path.posix.basename(file)));
const scripts = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts));
const errors = [];

/** GitHub heading anchor: lowercase, punctuation removed, spaces as hyphens. */
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

const headingCache = new Map();
function anchorsOf(file) {
  if (!headingCache.has(file)) {
    const anchors = new Set();
    let fenced = false;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (line.startsWith('```')) fenced = !fenced;
      const heading = !fenced && line.match(/^#{1,6}\s+(.*)$/);
      if (heading) anchors.add(slug(heading[1].replace(/`/g, '')));
    }
    headingCache.set(file, anchors);
  }
  return headingCache.get(file);
}

function checkLink(document, lineNumber, target) {
  if (/^(https?:|mailto:)/.test(target)) return;
  const [file, anchor] = target.split('#');
  const resolved = file
    ? path.posix.normalize(path.posix.join(path.posix.dirname(document), file))
    : document;
  if (resolved.startsWith('..')) {
    errors.push(`${document}:${lineNumber}: link leaves the repository: ${target}`);
    return;
  }
  if (!existsSync(resolved)) {
    errors.push(`${document}:${lineNumber}: missing link target ${target}`);
    return;
  }
  if (anchor && resolved.endsWith('.md') && !anchorsOf(resolved).has(anchor))
    errors.push(`${document}:${lineNumber}: missing anchor #${anchor} in ${resolved}`);
}

function checkCodeSpan(document, lineNumber, span) {
  // Globs, placeholders, shell fragments and URL paths such as `/version.json` are not repository paths.
  if (/[*<>{}$\s]/.test(span) || span.startsWith('/')) return;
  const candidate = span.replace(/\/$/, '').replace(/:\d+$/, '');
  const root = candidate.split('/')[0];
  if (GeneratedRoots.some((generated) => root === generated || root.startsWith(`${generated}.`))) return;
  if (RepositoryRoots.includes(root)) {
    if (!existsSync(candidate)) errors.push(`${document}:${lineNumber}: missing repository path \`${span}\``);
    return;
  }
  if (CodeExtensions.test(candidate) && !basenames.has(path.posix.basename(candidate)))
    errors.push(`${document}:${lineNumber}: no repository file named \`${span}\``);
}

for (const document of documents) {
  let fenced = false;
  readFileSync(document, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      const lineNumber = index + 1;
      if (line.startsWith('```')) fenced = !fenced;
      for (const [, command] of line.matchAll(/npm run ([\w:-]+)/g))
        if (!scripts.has(command))
          errors.push(`${document}:${lineNumber}: unknown script \`npm run ${command}\``);
      if (fenced) return;
      const withoutCode = line.replace(/`[^`]*`/g, '');
      for (const [, target] of withoutCode.matchAll(/\]\(([^)\s]+)\)/g))
        checkLink(document, lineNumber, target);
      for (const [, span] of line.matchAll(/`([^`]+)`/g)) checkCodeSpan(document, lineNumber, span);
    });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Documentation check passed for ${documents.length} documents.`);
