# Pirate Battle

[![CI](https://github.com/ricna/pirate-battle/actions/workflows/ci.yml/badge.svg)](https://github.com/ricna/pirate-battle/actions/workflows/ci.yml)

A single-player, top-down naval shooter built with React, strict TypeScript and PixiJS for the Jungle Gaming game developer challenge ([CHALLENGE.md](CHALLENGE.md)). Ranking and Match History use REST APIs mocked by MSW and consumed through Axios and TanStack Query; Playwright covers the flows end to end.

- **Live build:** _pending deployment; see [Deployment](#deployment)._ Every build reports its commit in `/version.json`, in `<meta name="build-commit">` and at the bottom of How To Play.
- **Where each requirement lives:** [REQUIREMENTS.md](REQUIREMENTS.md) maps every item of the challenge to its implementation, tests and evidence.
- **Latest verification:** [reports/TEST-SUMMARY.md](reports/TEST-SUMMARY.md), with the HTML report in `reports/playwright`. See [TESTING.md](TESTING.md) and [PERFORMANCE.md](PERFORMANCE.md).

## Setup

Requires Node.js 24 (see `.nvmrc`; tested with 24.14 and 24.21) and npm 11. No backend, account, private service or environment variable is required.

```sh
npm ci
npx playwright install chromium --no-shell
npm run dev
```

Open the printed localhost URL. MSW starts before the first API request. Service workers need HTTPS or localhost; the production build ships the same worker.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server (React Strict Mode) |
| `npm run build` | Type check, then optimized production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` in strict mode |
| `npm run lint` | Architecture convention check and ESLint |
| `npm run format` / `npm run format:check` | Prettier for source, tests, scripts and configuration |
| `npm run test:e2e` | Complete Playwright suite (domain, rendering, desktop, landscape mobile, production smoke) |
| `npm run test:smoke` | Production-build smoke test; set `PIRATE_SMOKE_URL` to test a deployment |
| `npm run test:docker` | The suite inside the CI Linux image (also used to update Linux screenshot baselines) |
| `npm run test:report` | Open the HTML report |
| `npm run test:summary` | Write `reports/TEST-SUMMARY.md` from the JSON results |
| `npm run verify` | typecheck, lint, format check, build and the complete suite, in that order |
| `npm run profile` / `npm run profile:memory` | Real-time performance and memory runs against `npm run preview` |
| `npm run mocks:init` | Regenerate the MSW worker and reapply its `/api/`-only filter |

## Environment variables

All variables are optional.

| Variable | Used by | Default and effect |
| --- | --- | --- |
| `PIRATE_TEST_PORT` | Playwright | `5173`; selects a fresh dev-server port instead of reusing a running one |
| `PIRATE_PREVIEW_PORT` | Playwright | `4317`; port of the preview server started for `production-smoke` |
| `PIRATE_SMOKE_URL` | Playwright | Unset; runs `production-smoke` against a deployed URL instead of a local preview |
| `PIRATE_TEST_REPORT_DIR` / `PIRATE_TEST_OUTPUT_DIR` | Playwright | `reports/playwright` / `test-results`; isolate a run's report and traces |
| `CI` | Playwright | Set by CI: no server reuse, `test.only` forbidden, longer timeout for software WebGL |
| `PROFILE_URL` | profile scripts | `http://127.0.0.1:4173/` |
| `PROFILE_SESSION_SECONDS` / `PROFILE_SPAWN_SECONDS` | `npm run profile` | `180` / `5` |
| `PROFILE_PILOT` / `PROFILE_OUTPUT` | `npm run profile` | `defend` (or `boundary`) / `reports/profile.json` |
| `MEMORY_CYCLES` / `MEMORY_WARMUP_CYCLES` | `npm run profile:memory` | `30` / `5` |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Forward | W / Up | Hold Forward |
| Turn | A / D or Left / Right | Hold a turn button |
| Front cannon (1 ball) | Space | Hold Front cannon |
| Left / right broadside (3 parallel balls) | Q / E | Hold Left / Right broadside |
| Pause | P / Escape | Pause button |

How To Play, one click from the main menu, presents these controls and the enemies. Movement and attacks work at the same time, and several keys and fingers can be held at once. Game keys are captured only while the arena has focus.

**Rules.** Sink enemies with your cannonballs: each one sunk by your shots earns 1 point; a Chaser that explodes against you does not. Islands block ships and cannonballs, and each collision with an island costs 1 health. Sail over survivors from sunk ships to recover 1 health each. The match ends when the timer reaches zero (VICTORY) or your health does (Defeated). Losing focus or hiding the tab pauses the battle; resuming always needs an explicit action. Mobile combat is landscape; portrait pauses it, menus still work.

## Gameplay configuration

Options (saved immediately, kept after refresh): **Game session time** 60–180 s in 10 s steps (default 120), **Enemy spawn time** 2–10 s in 0.2 s steps (default 5), Sound on/off, master Volume and Music volume. Each match freezes a validated snapshot of the configuration at Play; later edits only affect new matches.

All gameplay tuning lives in static profiles under `src/game/configuration/` (ships, weapons, projectiles, spawning, collisions, presentation, audio). [CONFIGURATION.md](CONFIGURATION.md) explains every file, unit and validation rule, and how to add an enemy type without touching the systems. Current balance: `arena_00-v1/balance-v6`, seed `20261012`; the reasoning behind the values is in [ARCHITECTURE.md](ARCHITECTURE.md#balancing-decisions).

## Ranking and Match History

The main menu's **Ranking** and **Match History** buttons open the Captain's Log, whose two tabs page through five records at a time. Ranking compares only matches with the same configuration (version, seed, session time, spawn interval and a fingerprint of the full gameplay snapshot), ordered by score, then earliest date, then ID. Other captains are fixtures. Match History lists this browser's player, newest first, with date, points, duration and result.

A completed battle is saved locally (last result plus a pending outbox entry) before it is POSTed with a stable UUID. Retries reuse that ID, so repeated clicks, refreshes or a timeout after the server committed never duplicate a record. A new battle can start while an older one is pending. Records persist in `localStorage` under `pirate.*`; this is a browser-local demo server, not a shared leaderboard.

## Network scenarios

Open **Demo network scenarios** at the bottom left of any menu screen, choose a scenario, then open Ranking/Match History or finish a battle. **Reset demo server** removes confirmed mock records and restores `success`; options, identity, the last result and pending battles are kept (clear the site's storage for a completely fresh state). Latencies are deterministic.

| Scenario | Behaviour |
| --- | --- |
| `success` | 180 ms responses; 12 ranking fixtures plus confirmed records |
| `empty` | No fixtures; confirmed records still appear |
| `multiple-pages` | 28 ranking and 16 history fixtures |
| `slow` | 1400 ms, below the 1800 ms request timeout |
| `variable-latency` | `100 + (request × 193 mod 700)` ms |
| `out-of-order` | Alternating 1300 ms / 100 ms responses |
| `timeout` | 2500 ms, beyond the timeout |
| `connection-error` | Network failure |
| `http-400` / `http-500` | HTTP 400 / HTTP 503 on every endpoint |
| `ranking-error` / `history-error` | Only that list fails (503) |
| `post-commit-timeout` | The first POST commits, then answers after 2500 ms; a same-ID retry returns the committed record |
| `outage` | Every endpoint fails (503) until another scenario is selected |

## Reproducing failures

- **Pending submission and recovery:** select `outage`, finish a battle, refresh (Results reopen with the pending notice), select `success`, then click **Retry pending battle**.
- **Idempotent retry:** select `post-commit-timeout`, finish a battle, wait for the timeout message, then retry or refresh. Match History shows one record.
- **List loading, errors and late responses:** use `slow`, `timeout`, `connection-error`, `http-400`, `http-500` or `out-of-order` and open the Captain's Log.
- **Asset loading failure:** in DevTools → Network, block `arena_00.tmj` or `ships_miscellaneous_sheet.png`, then press Play. The loading screen shows an error with **Try again**; unblock and retry.
- **Service worker unavailable:** disable service workers or use a browser that blocks them; the menus show a warning, and the game remains playable.
- **Storage unavailable:** block site data; a visible warning replaces silent loss of progress.

## Testing

`npm run test:e2e` starts the dev server (and a preview build for `production-smoke`) and runs every project serially with seeded gameplay, fixed dates and a controlled simulation clock. Tests drive the real keyboard and touch controls and never write positions, health or score. The suite writes `reports/playwright` (HTML), `reports/playwright.json`, accessibility summaries in `reports/accessibility` and traces of failures in `test-results`. Screenshot baselines exist for Windows and for the Linux CI image. Details and the mapping to the twelve required test areas are in [TESTING.md](TESTING.md).

## Performance

[PERFORMANCE.md](PERFORMANCE.md) records the optimized-build measurement: FPS, 95th-percentile frame interval and entity counts for a three-minute match, and heap behaviour across repeated start/play/leave cycles, with hardware, browser, resolution and limitations. To reproduce: `npm run build`, `npm run preview`, then `npm run profile` and `npm run profile:memory` in another terminal.

## Deployment

The build is a static site: build command `npm run build`, output directory `dist`, no server and no environment variables. `mockServiceWorker.js` must stay at the site root (Vite copies it from `public/`). On Vercel: import the repository, keep the detected Vite preset, set the output directory to `dist`, and deploy; Netlify and Cloudflare Pages work with the same settings. After deploying, confirm that `/version.json` names the delivered commit and run `PIRATE_SMOKE_URL=https://<deployment> npm run test:smoke`.

## Architecture, assets and limitations

[ARCHITECTURE.md](ARCHITECTURE.md) covers the React/PixiJS integration, fixed-step simulation, collisions, resource lifetime, persistence, the records integration, balancing decisions and known limitations. [ASSETS.md](ASSETS.md) lists asset sources and licences; [ASSET_AUDIT.md](ASSET_AUDIT.md) audits every supplied file. Physical iOS/Android devices and non-Chromium browsers have not been verified.

Contributors and coding agents start with [AGENTS.md](AGENTS.md) and the [implementation contract](IMPLEMENTATION.md).
