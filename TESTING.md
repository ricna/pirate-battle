# Verification

## Time-expiry victory — 13 October 2026

The visible working checkout passed typecheck, lint/architecture (107 source files), Prettier and production build. The full fresh-origin run at port 5198 finished with **77/79 passed in 11.4 minutes**, reported at `reports/victory-playwright`. Both desktop and landscape mobile victory scenarios passed: real cannon/helm input survives 60 seconds, the record is saved immediately with `reason: time`, the HUD shows 00:00, the amber/black-outline message stays opaque through terminal second 2, reaches 50% opacity at second 3, and Results opens at second 4. Combat and the persisted record remain unchanged during the window; results/history show VICTORY, the music mix remains normal, and restart restores initial state. `reports/victory-message-*` and `reports/victory-fade-*` retain inspected captures.

Two unrelated checks failed during the complete run: desktop abandonment/repeated mounts reached the 60-second test limit; the mobile menu baseline captured incomplete authored artwork. Both passed when run separately without source or baseline changes. The desktop diagnostic used CLI `--timeout 120000` and passed in 18.4 seconds (report: `reports/victory-startup-recheck-playwright`); its preceding 60-second diagnostic spent about 50 seconds opening the initial page, as recorded in the trace. The mobile menu/arena/result baseline passed with the normal limit (report: `reports/victory-visual-recheck-playwright`). The configured suite limit and screenshot baselines remain unchanged. These are Chromium desktop/mobile emulation results for a checkout with concurrent changes, not a clean 79/79 single run, physical-device testing or a new performance profile.

## Commands and environment

Node 24.14.1, npm 11.12.1, TypeScript strict, Windows 10 Pro. Install with `npm ci`, then run `npm run typecheck`, `npm run lint`, `npm run build`. Playwright 1.64 uses full Chromium, installed with `npx playwright install chromium --no-shell`.

Run `npm run test:e2e`. Open the delivered HTML report with `npm run test:report` or `npx playwright show-report reports/playwright`. The projects are desktop 1280×800 at 1× and mobile landscape 844×390 at 2× with touch. Tests execute serially for stable focus and deterministic clocks.

## Coverage

| Specification area | E2E evidence |
| --- | --- |
| Options | Game/Audio headers, volume sliders and side steppers, Sound toggle, keyboard adjustment, limits disable the out-of-range step, documented ranges, restore defaults, immediate save, refresh persistence, configuration snapshot |
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


The final optimized profile completed 180 real active seconds with music/effects enabled, 17 credited kills, no unhandled application errors, approximately 60 FPS and P95 16.8 ms, followed by five lifecycle cycles. PERFORMANCE.md and reports/profile.json contain the exact revision, workload, pool/audio statistics and heap samples; the incomplete boundary-pilot attempt is preserved separately.

## Player-death cue and crossfade verification — 13 October 2026

The final isolated run passed **71/71 tests** in 7.2 minutes on port 5194, including desktop/mobile visual baselines (unchanged), terminal feedback, natural death-cue completion, early Main Menu/Play Again, music preferences, failures/retry and persistence. Typecheck, lint/architecture check, Prettier format check and production build passed. Concurrent Options work was preserved. The final report is `reports/game-over-playwright/index.html`; its test artifacts use `reports/game-over-test-results` to avoid another run cleaning the shared default folder.

To reproduce that isolation in PowerShell, set `PIRATE_TEST_PORT=5194`, `PIRATE_TEST_OUTPUT_DIR=reports/game-over-test-results` and `PIRATE_TEST_REPORT_DIR=reports/game-over-playwright` before `npm run test:e2e`. Unset these optional variables to keep the existing default report/output locations.

The terminal regression observes actual player death, one playback of the extra WAV, OST volume reduced from 0.1 to 0.008, unchanged combat/statistics/record while presentation advances, no result before 3 seconds, and the same arena beneath the 1-second result/banner crossfade. Teardown leaves the death cue playing; its real Web Audio completion restores the music. The added music scenario leaves/restarts before the cue finishes and verifies immediate mix restoration. `reports/terminal-feedback-*` and `reports/game-over-crossfade-*` retain captures.

Production preview at port 5195 also passed on 1280×800 desktop and 844×390 landscape mobile emulation. `reports/game-over-production-verification.json` records HTTP 200 for the hashed death WAV, one death playback, simultaneous partial result/banner opacity with one canvas during the fade, music time advancing at volume 0.008 through teardown, and volume 0.1 restored on Main Menu, with no application page errors. `reports/game-over-production-*` contains the corresponding rendered captures. The bundled WAV's SHA-256 equals the unchanged source. These checks establish playback/lifecycle behavior in Chromium, not subjective listening or physical-device compatibility; no new performance profile is claimed for this presentation change.

The first complete run had 67 passes and two failures: a concurrent test run removed a trace file during browser cleanup, and a result baseline was captured during the new opacity animation. Output/report directories were isolated and the result baseline now waits for full opacity. The final run passed without changing any baselines or adding retries.

## Options sliders verification — 13 October 2026

The initial sections, volume sliders and Sound toggle passed 69/69 tests in 5.2 minutes on a fresh Vite origin (port 5184). Typecheck, lint/architecture, Prettier and production build passed at that stage. Mouse dragging, touch tapping, reload persistence and restore were checked in desktop and emulated landscape mobile.

## Game sliders and asset loading verification — 13 October 2026

The final working checkout passed **12/12 focused tests in 2.5 minutes**, using a fresh Vite origin at port 5192. The configured report is `reports/options-loading-focused`. These scenarios cover Options limits/persistence, legacy music preferences, keyboard slider/Sound-switch adjustment, engine/map/texture failure and recovery, and a gated loading scenario: indeterminate engine preparation, map progress, texture completion and disabled combat controls until ready. The arena loader follows completion callbacks, not downloaded bytes; one delayed atlas does not prevent other textures from advancing progress.

Typecheck and production build passed. The global lint attempt found a concurrent `CrewSystem.ts` no-this-alias violation; the global formatting attempt reported concurrent GameSession/GameCanvas edits. A full 76-test run was attempted, but concurrent source changes and a survival-to-time failure invalidated it; it was interrupted and the focused scenarios were rerun. No baseline was updated for this task. These results describe the visible working checkout with parallel gameplay changes, rather than a certification of unrelated work.

Captures in `reports/options-sliders-*`, `reports/loading-arena-*` and `reports/loading-engine-*` show four authored numeric sliders and the authored player-health loading bar in desktop and emulated mobile landscape. Both new Game sliders were also adjusted with Home/ArrowRight and persisted after refresh. Reduced motion disables the indeterminate preparation pulse. No physical-device testing or deployment is claimed.


## Crew rescue coverage — 13 October 2026

`presentation.spec.ts` now exercises one heal per survivor, removal/reuse of the bounded logical pool, full-health preservation, dead-player exclusion, swept hull pickup, validated rescue profiles and stable pickup motion under reduced motion. Rapid rescues reuse one green label within 0.35 seconds, renew its age and accumulate +1/+2/+3; a longer interval starts a new label, with no score pulse.

The browser rescue pilot uses real keyboard steering and the existing simulation clock, with no state writes or entity injection. It checks the recovered health against green label totals and incoming damage, the visible HUD, pause and abandonment/restart on desktop 1800×1000 and emulated touch landscape 844×390 at 2×. Captures are `reports/crew-rescue/rescue-desktop.png` and `rescue-mobile-landscape.png`. Reports are kept under `reports/crew-rescue`, separately from concurrent verification. Physical devices and subjective audio listening are not covered.


The final rescue/grouping checkout completed **79 passed, 1 failed** across 80 scenarios in the configured full run (`PIRATE_TEST_PORT=5188`, HTML report `reports/crew-rescue/full-playwright`). All crew rescue/grouping, combat, lifecycle and mobile scenarios passed. The failure was the desktop menu screenshot: the captured frame lacked authored image art. The unchanged visual scenario passed on a fresh origin (`5189`, `reports/crew-rescue/visual-recheck`), including menu/arena/result. No baselines were changed. The original readiness failure remains recorded; the full run is not relabeled as 80/80.

Typecheck, lint/architecture (107 source files), Prettier and optimized build passed. The existing Vite chunk-size advisory remains. PERFORMANCE.md and `reports/crew-rescue/profile.json` describe the three-minute performance run and five lifecycle heap samples. Changes remain in the visible checkout; this task did not commit, push or deploy them, and concurrent UI/audio changes were preserved.
