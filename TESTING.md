# Testing

## Final verification

| Check | Environment | Result |
| --- | --- | --- |
| `npm run typecheck`, `npm run lint` (architecture check + ESLint), `npm run format:check`, `npm run build` | Windows 10, Node 24.14.1 | All pass; no chunk-size warning |
| `npm run test:e2e` | Windows 10, Chromium 1248 (Playwright 1.64.0), RTX 3060 | **125/125 passed** in 8.6 minutes on commit `0a46e89` from a clean checkout, 14 October 2026 ([summary](reports/TEST-SUMMARY.md), `reports/playwright/index.html`) |
| `npm run test:docker` | `mcr.microsoft.com/playwright:v1.64.0-noble` (the CI image), Node 24.21.0, software WebGL | **125/125 passed** in 19.9 minutes on the same commit ([summary](reports/linux/TEST-SUMMARY.md), `reports/linux/playwright.json`) |
| GitHub Actions ([ci.yml](.github/workflows/ci.yml)) | Same container on GitHub-hosted Ubuntu | **125/125 passed** in 13.0 minutes on `96ae791` (run 38571565099), after typecheck, lint, format check and build |

The 125 cases are: 29 domain (`core`), 2 rendering, 9 mobile layout, 42 desktop, 42 landscape mobile and 1 production smoke. No retries are configured and no test was skipped. axe found zero WCAG 2.1 AA violations on all eight audited screens in both browser projects, on both platforms.

An earlier Linux run exposed a real defect: during a slow, minutes-long match the browser restarted the MSW service worker, which forgot the page, and the battle POST reached the static host (HTTP 404). Commit `0a46e89` adds the recovery described in ARCHITECTURE.md and a test that restarts the worker on purpose.

## Running the suite

```sh
npm ci
npx playwright install chromium --no-shell
npm run test:e2e        # everything below; writes reports/playwright and reports/playwright.json
npm run test:summary    # reports/TEST-SUMMARY.md from the JSON results
npm run test:report     # opens the HTML report
npm run test:docker     # the same suite inside the CI Linux image
```

`npm run test:e2e` starts the Vite dev server (React Strict Mode) and, for `production-smoke`, builds and serves the optimized bundle. Tests run serially with one worker so focus, audio and clocks stay deterministic. Set `PIRATE_TEST_PORT` to avoid reusing a server that is already running, and `PIRATE_SMOKE_URL` to run the smoke test against a deployment.

| Project | Environment | Specs |
| --- | --- | --- |
| `core` | Node, no browser | `core`, `collision`, `navigation`, `presentation`: configuration validation, pools, factories, collisions, island damage, navigation, crew rescue, ship trail, presentation rules |
| `rendering` | Chromium, 1482×962 and others, DPR 1–2 | Seamless water at fractional viewport/DPI scales; runtime devicePixelRatio change |
| `mobile-layout` | Chromium at phone and tablet sizes, portrait and landscape | `mobile`: player-following camera bounds, compact menus and HUD without overflow, explicit fullscreen and its unsupported fallback |
| `desktop` | Chromium 1280×800 at 1× | `game`, `music`, `network`, `accessibility` |
| `mobile-landscape` | Chromium 844×390 at 2×, touch, mobile | Same browser flows as desktop |
| `production-smoke` | Optimized `vite preview` build (or `PIRATE_SMOKE_URL`) | Commit identity, service worker, mocked lists, registration and refresh |

## Coverage

[REQUIREMENTS.md](REQUIREMENTS.md) maps each challenge requirement, and each of the twelve required test areas, to named tests. In summary:

| Area | What the tests prove |
| --- | --- |
| Options | Documented ranges, disabled out-of-range steps, immediate saving, persistence after refresh (the Options screen itself is restored), invalid stored values rejected with a warning, snapshot isolation between matches |
| Assets | Failed map, atlas and lazy engine module are reported accessibly and recover on retry; the loading bar follows engine, map and texture completion |
| Movement and collisions | Gradual acceleration/braking, bounded rotation, arena borders, island blocking, 1 health per island collision (once per collision, not per frame), swept hull contact |
| Weapons and scoring | One front ball, three parallel broadside balls, independent cooldowns, lifetime expiry, one damage application per ball, exactly one point per credited kill |
| Enemies and spawning | Chaser first and Shooter second at the configured interval (default and Options value), safe spawn distance, obstacle-aware routes, Chaser ram damage without score, Shooter fire damage |
| Match end | Real keyboard pilot survives a 60 s session (VICTORY message, fade, result), death result, combat frozen during terminal presentation, record saved once, clean restart |
| Pause | Manual pause, window blur and hidden tab pause; timer, cooldowns and momentum frozen; resume requires an action and clears held input |
| Results | Score, time played, end reason, record status; the result stays visible after refresh |
| Lifecycle and touch | Repeated mount/abandon cycles, refresh abandons combat, two simultaneous touch points with pointer cancellation, reduced motion |
| Ranking and Match History | Paging, score order, empty lists, loading, visible background refresh, ARIA tab keyboard navigation, every MSW scenario (timeout, connection, HTTP 400/503, list-specific failures, slow, variable latency, out-of-order cancellation) |
| Submission | Outage then recovery after refresh, both tabs updated, idempotent same-ID retry after a post-commit timeout, repeated synchronous retry clicks registering once, a new match while a record is pending, lists and registration recovering after the browser restarts the mock service worker |
| Accessibility | axe WCAG 2.1 AA scans of the main menu, Options, How To Play, both Captain's Log tabs, the gameplay HUD, the pause dialog and Results with zero violations (`reports/accessibility/axe-*.json`). Text over authored artwork is reported by axe as "needs review"; it uses the supplied outlined text and panels. |
| Audio | One persistent soundtrack across navigation and teardown, music volume/mute persistence, death cue ducking and restoration, visible load failure and retry |
| Rendering | Continuous water at fractional scales and density changes without moving the simulation |
| Visual regression | Menu, stable arena and result baselines on desktop and landscape mobile, with every HUD element inside the viewport |

## Instrumentation and reproducibility

`?test=1` replaces real-time advancement with bounded fixed-step clock steps and exposes read-only observations. Tests press the real keyboard and touch controls and never inject entities, teleport ships or write health, score or cooldowns. Gameplay uses seed 20261012; `page.clock.setFixedTime` fixes dates; MSW latencies are deterministic functions of the request count. Each test starts in a new browser context with empty storage. Hidden-tab tests override `document.hidden` and dispatch `visibilitychange`; the density test overrides devicePixelRatio through CDP and delivers the browser's resize notification.

## Screenshot baselines

`tests/game.spec.ts-snapshots` holds `*-win32.png` (Windows, Chromium with ANGLE/Direct3D 11) and `*-linux.png` (the `mcr.microsoft.com/playwright:v1.64.0-noble` image, software WebGL). Before each capture the test waits for every authored image, CSS background and font to decode. Update baselines only for an intentional visual change, on both platforms:

```sh
npx playwright test -g "visual baselines" --update-snapshots             # Windows baselines
npm run test:docker -- -g "visual baselines" --update-snapshots          # Linux baselines
```

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, lint, format check, build and the complete suite inside the same Playwright image, then uploads the HTML/JSON reports, the text summary, accessibility summaries and failure traces as the `playwright-report` artifact.

## Reports and traces

- `reports/playwright/index.html`: HTML report of the final run; `reports/playwright.json`: machine-readable results; `reports/TEST-SUMMARY.md`: per-test status.
- `reports/linux/`: JSON results and summary of the Linux container run.
- `reports/accessibility/`: axe summaries per browser project.
- Captures written by the tests: `combat-feedback-*`, `terminal-feedback-*`, `game-over-crossfade-*`, `victory-message-*`, `victory-fade-*`, `loading-arena-*`, `ship-trail-*`, `crew-rescue/rescue-*`.
- Traces: `trace: 'retain-on-failure'` keeps a trace for every failing test in `test-results/` (uploaded by CI). `reports/failures/` keeps one historical trace from development as an example; open it with `npx playwright show-trace <file>`.

Earlier dated verification logs were superseded by this run and remain available in the Git history.

## Not covered

Physical iOS/Android devices, Safari/WebKit and Firefox, real GPU performance on mobile hardware, and subjective audio quality.
