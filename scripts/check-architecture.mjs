import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import ts from 'typescript';

const errors = [];
let count = 0;
const frameworkFiles = new Set(['main.tsx', 'vite-env.d.ts']);

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!/^[a-z]+$/.test(entry.name)) errors.push(`${filename}: folders must use lowercase names.`);
      await inspect(filename);
      continue;
    }
    if (!/\.(ts|tsx|css)$/.test(entry.name)) continue;
    count++;
    if (!frameworkFiles.has(entry.name) && !/^[A-Z][A-Za-z0-9]*\.(ts|tsx|css)$/.test(entry.name)) {
      errors.push(`${filename}: source modules must use PascalCase names.`);
    }
    if (entry.name.endsWith('.css')) continue;
    const source = ts.createSourceFile(filename, await readFile(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    const exported = (node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const primary = source.statements.filter((node) => exported(node) &&
      (ts.isClassDeclaration(node) || entry.name.endsWith('.tsx') && ts.isFunctionDeclaration(node)));
    if (primary.length > 1) errors.push(`${filename}: public classes/components require individual modules.`);
    if (primary[0]?.name && `${primary[0].name.text}${path.extname(filename)}` !== entry.name) {
      errors.push(`${filename}: filename must match its exported class/component ${primary[0].name.text}.`);
    }
    // Domain implementation must remain independent of browser rendering, React, networking and persistence.
    if (/src[\\/]game[\\/](entities|systems|core|math)[\\/]/.test(filename)) {
      for (const node of source.statements) {
        if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) continue;
        const module = node.moduleSpecifier.text;
        if (/^(react|pixi\.js|axios|msw)(\/|$)|infrastructure|ui\//.test(module)) {
          errors.push(`${filename}: domain code cannot import runtime infrastructure ${module}.`);
        }
      }
    }
  }
}

await inspect('src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Architecture convention passed for ${count} source files.`);
