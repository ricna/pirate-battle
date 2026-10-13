# Verification

## Commands and environment

Node 24.14.1, npm 11.12.1, TypeScript strict, Windows 10 Pro. Install with `npm ci`, then run `npm run typecheck`, `npm run lint`, `npm run build`. Playwright 1.64 uses full Chromium, installed with `npx playwright install chromium --no-shell`.

Run `npm run test:e2e`. Open the delivered HTML report with `npm run test:report` or `npx playwright show-report reports/playwright`. The projects are desktop 1280×800 at 1× and mobile landscape 844×390 at 2× with touch. Tests execute serially for stable focus and deterministic clocks.

## Coverage

| Specification area | E2E evidence |
| --- | --- |
| Options | Limits disable the out-of-range step, documented ranges, restore defaults, immediate save, refresh persistence, configuration snapshot |
| Assets | Failed map/image responses, failed lazy engine module, accessible errors and retry/reload recovery |
| Navigation | Forward movement, bounded rotation, central island contact, bottom/right arena limits |
| Weapons | Front projectile, independent broadsides, three parallel vectors, cooldown and TTL |
| Enemies | First/second spawn kinds and interval, safe spawn distance, movement, obstacle clearance and enemy fire; domain navigation tests below |
| Scoring and time | Single cannonball damage, exactly one point per destroyed ship, real keyboard pilot surviving a 60s session |
| Death and restart | Damage leads to death, game unmounts, result stable after end/refresh, new match restores initial entities |
| Pause | Time and projectiles freeze, inputs cleared on Resume, window blur requires explicit action |
| Abandonment and touch | Repeated mounts/cleanup, actual two-finger Chromium touch input, pointer cancellation, unfinished refresh never saves |
| Queries | Paginated ranking/history, empty, error, recovery and API failure without blocking Play |
| Persistent submission | Outage, pending queue after refresh, recovery, consistent confirmed history/ranking state |
| Idempotency and stale data | POST commit before timeout, same-ID recovery after refresh, old query response cannot replace current scenario |
| Visual/layout | Versioned menu, stable arena and result baselines, arena fits desktop/mobile viewport |

## Domain and architecture coverage

The core project runs pure TypeScript without a browser or Pixi renderer. It reads the authored map collision geometry. Tests cover frozen source defaults and snapshots, invalid profiles, changed-balance identity, actual configured movement changes, bounded pool growth and double/foreign returns, complete projectile reset with fresh IDs, complete-salvo capacity reservation without consuming cooldown, custom third-enemy registration, runtime read-port immutability, acceleration/braking, high-speed ship obstacle protection, pause and idempotent disposal. The projectile case separately verifies configured acceleration and drag across reused leases. `collision.spec.ts` covers swept hull contact and departure, separated enemy hulls, a single uncredited Chaser ram and bounded island-contact impacts. `navigation.spec.ts` verifies that a route towards a target inside a blocked navigation cell ends at the nearest reachable water through straight, clear corners; that a hidden Chaser and a hidden Shooter both reach a player hugging a coast (previously they sailed north and pinned themselves to the arena edge); and that a seeded 90-second battle at the 28-enemy cap keeps fewer than 15% of two-second enemy samples without progress, excluding Shooters holding inside their range.

## Instrumentation and reproducibility

`?test=1` disables real-time simulation advancement and exposes observation plus bounded fixed-step clock advancement. Rules, actual keyboard/pointer inputs, collision, projectiles and renderers remain unchanged. Tests do not inject entities, teleport, change life/score or bypass weapons. The aiming helper uses the same keyboard controls as a player. Fixed Date values stabilize persisted result screenshots; each context starts with clean storage.

`?profile=1` exposes observation/metrics while keeping real-time advancement. It cannot advance the clock. See PERFORMANCE.md for the separate optimized-build run.

Screenshot baselines in `tests/game.spec.ts-snapshots` were captured on Windows with the pinned Chromium version. Platform font/rendering differences may require review and intentional baseline generation on another OS: `npm run test:e2e -- --update-snapshots`. Do not update to conceal behaviour regressions.

## Reports and repaired failures

Final verification on 13 October 2026, after enemy navigation, hull collision, combat presentation, the sample-matched HUD/Options screens and the asset audit were committed: **63/63 passed** in 3.9 minutes on a fresh Vite server (20 domain/architecture tests, the renderer regression and 42 desktop/mobile E2E cases, including all visual baselines). Type checking, lint and production build passed. The Options label mismatch described below is resolved: the screen uses the sample's `Enemy spawn time`. This run produced the delivered `reports/playwright` and the `reports/combat-feedback-*` / `reports/terminal-feedback-*` captures.

The 12 October baseline for comparison: **42/42 passed** (7 domain/architecture tests, 1 renderer regression across 20 viewport/DPI combinations, and 34 desktop/mobile E2E cases) in approximately 1.8 minutes, including all six visual baselines. Type checking, lint and production build also passed. No unhandled application page errors were observed; every E2E case asserts this.

The final run's report is delivered in `reports/playwright`. Initial failure traces are retained in `reports/failures`; open any with `npx playwright show-trace <path>`. They document repaired pilot observation-after-end, test routing/touch/scenario selection problems, a frame-step boundary issue subsequently clamped in gameplay, and one test interrupted by a development reload. They are historical evidence, not the final pass/fail status.

Playwright emits a console warning about conflicting NO_COLOR/FORCE_COLOR variables in this host; this is runner formatting, not a game failure. The first optional headless-shell download failed due to this network's certificate chain. The full Chromium download succeeded; `--no-shell` installs exactly the browser used without bypassing TLS verification.

Physical mobile devices and non-Chromium engines were not covered. Desktop/mobile emulation validates viewport, density and multi-touch logic, but does not establish Safari audio or real-device GPU performance.

## Reported visual/movement regressions

Krita splash replacement (13 October 2026): real cannon input produced an island impact using `authored/water_splash`. The loaded Pixi texture's source label points to `assets/authored/Splash.png`, dimensions are 64×64, and Network recorded HTTP 200 without requesting the superseded SVG. See `reports/splash-krita-verified.png`. The production PNG checksum matches the authored source. Typecheck, lint and production build passed. The complete suite on a fresh server at port 5178 finished with **59 passed / 4 failed** in 4.9 minutes; the same unrelated case-sensitive Options label mismatch affects two cases on both desktop and mobile. No visual baselines were changed for this asset replacement.

The completed ship-wake removal verification ran all 63 tests: **59 passed, 4 failed** in 4.9 minutes. All four failures are the Options label mismatch described below (two cases in both desktop and landscape mobile); movement, cosmetic regression, crew, terminal presentation, pause/restart and visual baseline checks passed. The report is `reports/playwright`.

Ship wake removal (13 October 2026): the presentation regression advances actual forward/cannon input and verifies that no ship-wake particles are emitted while projectile trails remain. A browser capture, `reports/ship-wake-removed.png`, shows the moving player without the previous stamped wake; observed speed was 172.5 after 0.75 seconds with no particles when not firing. This task does not modify or register the owner's PNG; concurrent owner edits to that file are preserved. Typecheck, lint and production build passed. A fresh Vite server on port 5178 was used for browser verification because the existing 5173 server served stale audio code (`audio.playUi is not a function`). The full suite also exposes an unrelated case-sensitive Options label mismatch: tests seek `Enemy spawn time`, while the concurrently edited screen uses `Enemy Spawn Time`. Those unrelated screen/test edits are preserved.

The new rendering project reads actual WebGL pixels after a zero-time render through the test clock. It checks continuous water across five viewport sizes and four DPI factors (1, 1.25, 1.5, 2), waits for the ResizeObserver's canvas dimensions, and attaches a wide screenshot. The pre-fix canvas at width 1319 exposed one background pixel [18,55,68] between independently scaled tile quads. Static map composition eliminates that crack. Two E2E cases verify a gradual one-second player ramp and two-second braking, with a numerical tolerance at the precise stopping-time boundary.

Use npm run test:e2e with the configured reporters to write reports/playwright. A CLI --reporter override selects Playwright's default output folder instead; the verified final report has been copied into the delivered reports/playwright directory.


## Refactor and continuous OST verification - 13 October 2026

Runtime source revision: `ae203b2` (preceded by structural migration `43dfeab`). The final fresh Vite run used `PIRATE_TEST_PORT=5186` and the configured reporters: **69 passed** in 3.4 minutes. No visual baselines were updated. Typecheck, Prettier format check, lint/architecture check and production build passed. The architecture check covered 100 source files. Vite still reports its existing large-chunk advisory; it is not a build failure.

The complete suite includes domain registration/pooling/read-view/collision cases, 20 viewport/DPI rendering combinations, desktop and landscape mobile keyboard/touch behavior, pause/focus, terminal feedback, asset/module failures, persistence, ranking/history and idempotent submission. The renderer's frozen GameReadView explicitly excludes step/pause/resume/disposal commands.

`music.spec.ts` adds three scenarios in each browser project: one authored audio element survives menu navigation, combat pause and three abandonment/restart cycles, with a real wrap at the end of the MP3; Music volume persists, preserves legacy option fields and combines with master mute/volume; media loading failure is visible and a later gesture retries the explicit asset. Playback and media time are observed; these checks do not claim subjective listening or physical-device compatibility.

The optimized production preview was also captured at 1800x1000 and 844x390. `reports/options-music-desktop.png` and `reports/options-music-mobile-landscape.png` show the authored Options composition with the new control; the mobile board intentionally scrolls. `reports/music-verification.json` records one element, the hashed production MP3 URL, loop=true, advancing time and effective volume 0.1 in both contexts. MP3 duration reported by Chromium was 194.29875 seconds.

Earlier exploratory runs exposed incorrect moved asset lookup paths and text encoding, which were corrected before the final run. Tests were rerun against a fresh origin after code changes stopped; no failed result was hidden by changing screenshot baselines or enabling retries.
