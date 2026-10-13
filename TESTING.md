# Verification

## Commands and environment

Node 24.14.1, npm 11.12.1, TypeScript strict, Windows 10 Pro. Install with `npm ci`, then run `npm run typecheck`, `npm run lint`, `npm run build`. Playwright 1.64 uses full Chromium, installed with `npx playwright install chromium --no-shell`.

Run `npm run test:e2e`. Open the delivered HTML report with `npm run test:report` or `npx playwright show-report reports/playwright`. The projects are desktop 1280×800 at 1× and mobile landscape 844×390 at 2× with touch. Tests execute serially for stable focus and deterministic clocks.

## Coverage

| Specification area | E2E evidence |
| --- | --- |
| Options | Range errors, save, refresh persistence, configuration snapshot |
| Assets | Failed map/image responses, failed lazy engine module, accessible errors and retry/reload recovery |
| Navigation | Forward movement, bounded rotation, central island contact, bottom/right arena limits |
| Weapons | Front projectile, independent broadsides, three parallel vectors, cooldown and TTL |
| Enemies | First/second spawn kinds and interval, safe spawn distance, movement, obstacle clearance and enemy fire |
| Scoring and time | Single cannonball damage, exactly one point per destroyed ship, real keyboard pilot surviving a 60s session |
| Death and restart | Damage leads to death, game unmounts, result stable after end/refresh, new match restores initial entities |
| Pause | Time and projectiles freeze, inputs cleared on Resume, window blur requires explicit action |
| Abandonment and touch | Repeated mounts/cleanup, actual two-finger Chromium touch input, pointer cancellation, unfinished refresh never saves |
| Queries | Paginated ranking/history, empty, error, recovery and API failure without blocking Play |
| Persistent submission | Outage, pending queue after refresh, recovery, consistent confirmed history/ranking state |
| Idempotency and stale data | POST commit before timeout, same-ID recovery after refresh, old query response cannot replace current scenario |
| Visual/layout | Versioned menu, stable arena and result baselines, arena fits desktop/mobile viewport |

## Domain and architecture coverage

The core project runs pure TypeScript without a browser or Pixi renderer. It reads the authored map collision geometry. Tests cover frozen source defaults and snapshots, invalid profiles, changed-balance identity, actual configured movement changes, bounded pool growth and double/foreign returns, complete projectile reset with fresh IDs, complete-salvo capacity reservation without consuming cooldown, custom third-enemy registration, runtime read-port immutability, acceleration/braking, high-speed ship obstacle protection, pause and idempotent disposal. The projectile case separately verifies configured acceleration and drag across reused leases.

## Instrumentation and reproducibility

`?test=1` disables real-time simulation advancement and exposes observation plus bounded fixed-step clock advancement. Rules, actual keyboard/pointer inputs, collision, projectiles and renderers remain unchanged. Tests do not inject entities, teleport, change life/score or bypass weapons. The aiming helper uses the same keyboard controls as a player. Fixed Date values stabilize persisted result screenshots; each context starts with clean storage.

`?profile=1` exposes observation/metrics while keeping real-time advancement. It cannot advance the clock. See PERFORMANCE.md for the separate optimized-build run.

Screenshot baselines in `tests/game.spec.ts-snapshots` were captured on Windows with the pinned Chromium version. Platform font/rendering differences may require review and intentional baseline generation on another OS: `npm run test:e2e -- --update-snapshots`. Do not update to conceal behaviour regressions.

## Reports and repaired failures

Final verification on 12 October 2026: **42/42 passed** (7 domain/architecture tests, 1 renderer regression across 20 viewport/DPI combinations, and 34 desktop/mobile E2E cases) in approximately 1.8 minutes, including all six visual baselines. Type checking, lint and production build also passed. No unhandled application page errors were observed; every E2E case asserts this.

The final run's report is delivered in `reports/playwright`. Initial failure traces are retained in `reports/failures`; open any with `npx playwright show-trace <path>`. They document repaired pilot observation-after-end, test routing/touch/scenario selection problems, a frame-step boundary issue subsequently clamped in gameplay, and one test interrupted by a development reload. They are historical evidence, not the final pass/fail status.

Playwright emits a console warning about conflicting NO_COLOR/FORCE_COLOR variables in this host; this is runner formatting, not a game failure. The first optional headless-shell download failed due to this network's certificate chain. The full Chromium download succeeded; `--no-shell` installs exactly the browser used without bypassing TLS verification.

Physical mobile devices and non-Chromium engines were not covered. Desktop/mobile emulation validates viewport, density and multi-touch logic, but does not establish Safari audio or real-device GPU performance.

## Reported visual/movement regressions

The new rendering project reads actual WebGL pixels after a zero-time render through the test clock. It checks continuous water across five viewport sizes and four DPI factors (1, 1.25, 1.5, 2), waits for the ResizeObserver's canvas dimensions, and attaches a wide screenshot. The pre-fix canvas at width 1319 exposed one background pixel [18,55,68] between independently scaled tile quads. Static map composition eliminates that crack. Two E2E cases verify a gradual one-second player ramp and two-second braking, with a numerical tolerance at the precise stopping-time boundary.

Use npm run test:e2e with the configured reporters to write reports/playwright. A CLI --reporter override selects Playwright's default output folder instead; the verified final report has been copied into the delivered reports/playwright directory.
