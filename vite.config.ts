import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Commit identity of this build. Hosting/CI variables come first (Vercel, Cloudflare Pages, Netlify,
 * GitHub Actions); a local build reads Git and marks uncommitted tracked changes as `-dirty`.
 */
function buildCommit(): string {
  const hosted =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.COMMIT_REF ??
    process.env.GITHUB_SHA;
  if (hosted) return hosted.slice(0, 12);
  try {
    const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
    const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      encoding: 'utf8',
    }).trim();
    return changes ? `${commit}-dirty` : commit;
  } catch {
    return 'unversioned';
  }
}

/** Publishes the commit as a meta tag and `/version.json` so a deployment can be matched to its source. */
function buildInformation(commit: string): Plugin {
  return {
    name: 'pirate-build-information',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'build-commit', content: commit }, injectTo: 'head' },
    ],
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ commit }, null, 2)}\n`,
      });
    },
  };
}

const commit = buildCommit();

export default defineConfig({
  plugins: [react(), buildInformation(commit)],
  define: { __BUILD_COMMIT__: JSON.stringify(commit) },
  server: {
    // Pre-transform the entry and the lazy arena module so the first E2E navigation is not a cold compile.
    warmup: { clientFiles: ['./src/main.tsx', './src/ui/game/GameCanvas.tsx'] },
  },
  build: {
    rolldownOptions: {
      output: {
        // Stable vendor groups load in parallel with the application chunk; Pixi stays in the lazy arena chunk.
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'records', test: /[\\/]node_modules[\\/](@tanstack|axios)[\\/]/ },
            {
              name: 'mocks',
              test: /[\\/]node_modules[\\/](msw|@mswjs|@msw|@open-draft|tldts|tldts-core|tough-cookie|rettime|cookie|outvariant|until-async|is-node-process)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
