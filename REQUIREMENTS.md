# Requirements traceability

Each row maps a requirement of [CHALLENGE.md](CHALLENGE.md) to where it is implemented and how it is verified. Test names are Playwright titles; `game`, `network`, `accessibility`, `music` and `smoke` specs run in browsers (desktop 1280×800 and landscape mobile 844×390 at 2× with touch; smoke on the production build), while `core`, `collision`, `navigation` and `presentation` specs exercise the domain without a browser. Results: [reports/TEST-SUMMARY.md](reports/TEST-SUMMARY.md).

## 1. Stack

| Requirement | Implementation | Verification |
| --- | --- | --- |
| React for UI and menus | `src/ui/**` (screens, HUD, dialogs, touch controls) | Every browser spec drives the React UI |
| Strict TypeScript | `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`) | `npm run typecheck`, CI |
| PixiJS renders the game | `src/game/runtime/GameSession.ts`, `src/game/rendering/*`, `src/game/presentation/*Renderer.ts` | `rendering.spec`, visual baselines |
| TanStack Query for remote state | `src/ui/records/RemotePanel.tsx` (queries), `src/ui/App.tsx` (mutation) | `game.spec`, `network.spec` |
| Axios HTTP client | `src/infrastructure/network/RecordsApi.ts`, `NetworkConfig.ts` | `network.spec` (timeouts, HTTP errors) |
| MSW mocks | `src/infrastructure/network/NetworkSimulator.ts`, `NetworkScenarios.ts`, `MockFixtures.ts`, `public/mockServiceWorker.js` | `network.spec`, `smoke.spec` |
| Playwright E2E and visual regression | `tests/*.spec.ts`, `playwright.config.ts`, `tests/game.spec.ts-snapshots` | `npm run test:e2e`, CI |

## 2. Gameplay

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Forward movement and rotation | `entities/PlayerShip.ts`, `entities/Ship.ts`, `PlayerShipConfig.movement` | `movement, rotation, island collision and arena limits`; `player acceleration and braking are gradual…` |
| Front shot (1 ball); left/right broadsides (3 parallel balls) | `PlayerShipConfig.weapons`, `systems/WeaponController.ts` | `front and parallel broadsides obey independent cooldowns and expire`; `weapons defer a complete broadside…` |
| Limited health reduced by enemy fire and Chaser impact | `entities/Ship.ts`, `systems/DamageSystem.ts`, `EnemyChaser.ts` | `a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player`; `Chaser ram triggers on hull contact once…` |
| Confined to the arena, no crossing islands | `core/CollisionWorld.ts`, `core/ShipCollisionWorld.ts`, `assets/maps/arena_00.tmj` | `movement, rotation, island collision and arena limits`; `swept hull contact prevents high-speed crossing…` |
| Island collisions cost 1 health (owner rule) | `CollisionConfig.islandImpactDamage`, `GameManager` contact handling | `each separate island collision costs the player 1 health…`; `island contact dissipates speed…` |
| Keyboard and touch; simultaneous move and fire; controls shown | `input/InputController.ts`, `InputConfig.ts`, `ui/hud/TouchControls.tsx`, `ui/screens/HowToPlay.tsx` | `abandonment, repeated mounts, refresh and simultaneous touch controls`; `how to play explains the controls…` |
| Chaser pursues, rams, explodes | `entities/EnemyChaser.ts`, `entities/EnemyShip.ts` | `a Chaser ram deals its configured damage…`; `a hidden chaser reaches a player hugging a coast…` |
| Shooter approaches and fires in range | `entities/EnemyShooter.ts`, `EnemyShooterConfig.ai.range` | `both enemy behaviours appear on schedule…`; `a hidden shooter reaches…` |
| Enemies move, rotate, take damage, respect islands; both appear | `EnemyShip.follow`, `math/Navigation.ts`, `GameDefaults.Spawning.initialSequence` | `both enemy behaviours appear on schedule, approach and navigate around obstacles`; `a crowded seeded battle keeps enemies sailing…` |
| Spawns every configured interval at safe, distant points | `systems/SpawnSystem.ts`, `GameDefaults.SpawnPoints` and `Spawning` | `spawns follow the Enemy spawn time option`; spawn-distance assertion in `both enemy behaviours…` |
| Water and blocking islands | `arena_00.tmj` (five collision rectangles), `assets/TiledMapLoader.ts` | `static water stays continuous…`; projectile/coast tests |
| Projectiles: direction, speed, damage, lifetime | `entities/Projectile.ts`, `ProjectileConfig.ts` | `front and parallel broadsides…`; `projectile acceleration and deceleration remain configured…` |
| One damage per projectile; removal on hit, obstacle, expiry, leaving the arena | `systems/ProjectileSystem.ts` (swept earliest contact) | `one cannonball applies its configured damage once…`; `reused projectiles reset ownership…` |
| Weapon cooldowns | `WeaponController` | `front and parallel broadsides obey independent cooldowns…`; `pause freezes simulation and cooldowns…` |
| Destroyed enemies stop acting and colliding | `DamageSystem`, `GameManager.step` removal, `ProjectileSystem` alive checks | `one cannonball…awards exactly one point`; `Chaser ram triggers…once` |
| Session 60–180 s of active play | `OptionsConfig.Limits`, `MatchState` | `options validate, persist, and isolate new matches` |
| 1 point per kill; Chaser self-destruction scores nothing | `DamageSystem` (credited kills), `MatchState.awardKill` | `one cannonball…exactly one point`; `a Chaser ram…without scoring` |
| Ends on time or death; ending freezes everything | `MatchState.finish`, `GameManager.step`, `TerminalSequence` | `real cannon input wins on time…`; `death stops combat…`; `terminal sinking persists once…` |
| Restart restores a clean match | `App.play` (new UUID and snapshot), `GameCanvas` keyed remount | `real cannon input wins on time…restarts cleanly` |
| Health above every ship; HUD score and time | `rendering/ArenaRenderer.ts`, `ui/hud/MatchStatusHud.tsx` | Arena baseline; HUD assertions in `movement…` and `floating crew rescue…` |
| Manual pause; auto pause on blur/hidden tab; explicit resume; no accumulation | `GameSession.pause/resume`, `InputController.setActive` | `pause freezes simulation and cooldowns, focus loss requires explicit resume`; `hiding the tab pauses combat…` |
| Firing, explosion, damage-state feedback | `EffectSystem`, `PresentationSystem`, `ShipVisualConfig` damage stages and fire | `one cannonball…` (captures), `terminal sinking…`, `reduced motion removes shake/drift…` |

## 3. Screens and configuration

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Main menu: Play, Options, control instructions, Ranking and Match History | `ui/screens/MainMenu.tsx` (How To Play and Captain's Log buttons, following `assets/sample_menu.png`) | Menu baseline; `how to play explains the controls…`; `ranking and history handle pages…` |
| Options: session and spawn time, validation, saving, persistence | `ui/screens/OptionsScreen.tsx`, `OptionsConfig`, `OptionsRepository` | `options validate, persist, and isolate new matches`; `invalid persisted options are rejected…` |
| Match: Pixi arena, HUD, controls, pause | `ui/game/GameCanvas.tsx`, `GameSession` | Arena baseline, pause tests |
| Result: score, time played, end reason, record status, Play Again, Main Menu | `ui/screens/ResultScreen.tsx` | `death stops combat; the result stays displayed…`; result baseline |
| Ranking: rank, captain, points, pagination | `ui/records/RemotePanel.tsx` | `ranking and history handle pages…` (score order, paging) |
| Match History: date, points, duration, end reason, pagination | `RemotePanel.tsx` (`Result` column plus end reason for assistive technology) | `real cannon input wins on time…` (VICTORY, Time expired); paging tests |
| Typed, centralized gameplay configuration | `game/contracts/GameConfig.ts`, `game/configuration/*`, `GameConfigFactory.validate` | `configuration snapshots reject invalid profiles…`; validation tests |
| Snapshot at match start | `App.play` → `GameConfigFactory.create`; `GameManager` clones and freezes | `options validate, persist, and isolate new matches` |
| Refresh or leaving ends the match; abandoned matches are not recorded | `ScreenRoute` (no combat fragment), `GameCanvas` abandon path | `abandonment, repeated mounts, refresh…` |
| Local persistence of options and last result | `OptionsRepository`, `MatchRepository` | Options and result-after-refresh tests |
| English UI, identifiers and documentation | Whole repository | Review |

## 4. PixiJS and architecture

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Rules, rendering, input and UI state separated | `game/{entities,systems,core,math}` (domain), `game/rendering`, `game/input`, `ui/*`; `scripts/check-architecture.mjs` forbids browser/network imports in the domain | `npm run lint`; `read ports cannot mutate private state…` |
| Time-based, frame-rate-independent simulation | Fixed 1/60 s step with capped accumulator in `GameSession` | Test clock; `PERFORMANCE.md` |
| UI sync without per-frame React renders | `GameSession` publishes snapshots every `runtime.hudIntervalMs` | `ARCHITECTURE.md` |
| Texture loading, reuse and failure handling before combat | `assets/GameTextureLibrary.ts` (cached), `TiledMapLoader`, `AssetLoadingIndicator` | Asset failure/retry tests; `authored loading bar…` |
| Canvas fits screen and density; input and bounds preserved | `GameSession` resize and resolution, `MapRenderer.resize` | `static water stays continuous at fractional viewport and DPI scales`; `a runtime devicePixelRatio change…`; layout assertions in the visual test |
| Listeners, ticker, timers, entities and resources released | `GameSession.#destroyResources`, `GameManager.dispose`, renderer `destroy` | `abandonment, repeated mounts…`; memory runs in `PERFORMANCE.md` |
| Correct with React Strict Mode | `main.tsx` (`StrictMode`), serialized init in `GameCanvas` | All browser specs run on the dev server with Strict Mode |
| Decisions documented | [ARCHITECTURE.md](ARCHITECTURE.md) | — |

## 5. Ranking and Match History

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Typed contracts; paginated ranking by score; register and list history | `application/records/MatchRecord.ts`, `RecordsApi`, MSW handlers | `ranking and history handle pages…` |
| Record fields: match and player IDs, date, score, duration, end reason, configuration | `MatchRecord` | Validated by `isMatch` on POST and in storage |
| Same-configuration ranking, deterministic tie-break | `GameConfigIdentity.key`, handler sort (score, date, ID) | Ranking order assertion |
| Loading, empty, error, background refresh, cache, invalidation, retries | `RemotePanel`, `ApplicationServices` QueryClient, `NetworkConfig.QueryRetries` | `slow responses show loading, and background refreshes keep cached rows visible`; failure-scenario tests |
| Both tabs refresh after registration and when shown again | Mutation `onSuccess` invalidation; `refetchOnMount: 'always'` | `pending outage submission survives refresh and updates both tabs` |
| Late responses never overwrite newer data | Keys with scenario revision, AbortSignal cancellation | `an out-of-order ranking response is cancelled…`; `post-commit timeout…late requests…` |
| One record per match; retries and repeated clicks recover it | Stable UUID, idempotent POST, serial outbox in `App.tsx` | `a pending battle never blocks a new match, and repeated retries register it once`; `post-commit timeout retries idempotently…` |
| Pending records survive failures and refresh; manual retry | `MatchRepository.pending`, pending banner, Results retry | `pending outage submission survives refresh…` |
| New match allowed while pending; API failures never block play | `App.tsx`, `GameSession` independent of network | `a pending battle never blocks a new match…`; `ranking and history…` ends by playing during an error |

## 6. MSW

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Handlers, contracts and fixtures shared by development, tests and demo | One `NetworkSimulator` used by dev, preview and deployments | Browser specs and `smoke.spec` |
| Confirmed records visible in later queries, consistent across tabs | `pirate.server` storage, shared handlers | `pending outage submission…` |
| Success, empty, multiple pages | `NetworkScenarios` | `ranking and history handle pages, empty lists…` |
| Slowness, variable latency, out-of-order | `NetworkScenarios` | `slow responses…`; `variable latency…`; `an out-of-order ranking response…` |
| Timeout, connection failure, 4xx/5xx | `NetworkScenarios` | `timeout`, `connection-error`, `http-400`, `http-500` tests |
| Ranking-only or history-only failure | `ranking-error`, `history-error` | `ranking and history handle pages…` |
| Timeout after registration without duplication | `post-commit-timeout` | `post-commit timeout retries idempotently…` |
| Outage at match end, registration after recovery | `outage` | `pending outage submission…` |
| Scenario selection and reset | `ui/development/DemoNetworkTools.tsx` | `demo server reset confirmation is shown briefly`; every scenario test |
| Controlled randomness and latency | Deterministic latency functions; seeded gameplay | All scenario tests |
| Mocks work in the published build | `public/mockServiceWorker.js` (API-only filter) | `the published build serves its commit, mocks Ranking and History, and registers a battle` |
| Local persistence of confirmed and pending records | `LocalStorageStore` | Refresh tests |

## 7. Interface, assets and accessibility

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Supplied assets as the visual base; licences for additions | `assets/`, [ASSETS.md](ASSETS.md), [ASSET_AUDIT.md](ASSET_AUDIT.md) | Baselines and captures in `reports/` |
| Desktop and mobile, usable touch, no clipping, supported orientation | Responsive HUD (`GameHud.css`), landscape combat, portrait pause | Visual test layout assertions in both projects; touch test |
| Visible asset-loading progress | `AssetLoadingIndicator`, `GameSession` progress | `authored loading bar follows engine, map and texture completion` |
| Keyboard navigation, visible focus, dialog focus, labels, contrast, accessible errors | Native `<dialog>`, focus management in `App`, ARIA tabs in `CaptainsLog`, labelled controls, `role="alert"` errors | `menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks` (summary in `reports/accessibility`); `ranking and history…` (arrow-key tabs) |
| Semantic score, time and state without per-frame announcements | `MatchStatusHud` text values, one status region in `GameCanvas` | Accessibility audit; HUD assertions |
| Game keys captured only during gameplay | `InputController` listens on the focused arena only | `abandonment…`, menu keyboard flows |

axe reports text contrast over authored artwork as "needs review" rather than pass/fail; those labels use the supplied panels and outlined text.

## 8. Playwright

| Required area | Tests |
| --- | --- |
| 1. Options navigation, validation, persistence | `options validate, persist, and isolate new matches`; `invalid persisted options…`; `music volume persists…` |
| 2. Asset loading, failures, retry | `authored map loading failure…`; `missing ship atlas…`; `failed lazy engine module…`; `authored loading bar…` |
| 3. Start, movement, rotation, arena limits, island collision | `movement, rotation, island collision and arena limits`; `player acceleration and braking…` |
| 4. Front/side fire, damage, cooldown, scoring without duplication | `front and parallel broadsides…`; `one cannonball applies its configured damage once…` |
| 5. Chaser and Shooter behaviour, spawn interval | `both enemy behaviours…`; `spawns follow the Enemy spawn time option`; `a Chaser ram deals its configured damage…` |
| 6. End by time and death, simulation stop, clean restart | `real cannon input wins on time…`; `death stops combat…`; `terminal sinking persists once…` |
| 7. Pause, focus loss, resume without timer advance | `pause freezes simulation and cooldowns…`; `hiding the tab pauses combat…` |
| 8. Result display and persistence after refresh | `death stops combat; the result stays displayed and persisted after refresh` |
| 9. Abandonment, repeated navigation, touch | `abandonment, repeated mounts, refresh and simultaneous touch controls`; `one authored soundtrack survives navigation…` |
| 10. Ranking/history queries and paging with loading, empty, error | `ranking and history handle pages…`; `slow responses…`; failure-scenario tests |
| 11. Registration, both tabs updated, pending recovery after refresh | `pending outage submission survives refresh and updates both tabs` |
| 12. Resend after timeout without duplicates; late responses | `post-commit timeout retries idempotently…`; `an out-of-order ranking response…`; `a pending battle…repeated retries…` |
| Chromium desktop and mobile | `desktop` and `mobile-landscape` projects |
| Visual regression of menu, stable arena, result with versioned baselines | `versioned menu, arena and result visual baselines…` (`*-win32.png`, `*-linux.png`) |
| Seeds and controlled simulation time | Seed 20261012, `?test=1` clock, `page.clock.setFixedTime` |
| Isolated tests, HTML report, failure traces | New context per test; `reports/playwright`; `trace: 'retain-on-failure'` |

## 9. Performance and delivery

| Requirement | Implementation | Verification |
| --- | --- | --- |
| 60 FPS target, FPS, p95 frame time, entities over 3 minutes | `scripts/profile.mjs` | [PERFORMANCE.md](PERFORMANCE.md), `reports/profile.json` |
| Memory after five start/play/leave cycles | `scripts/profile.mjs` (5 cycles), `scripts/memory.mjs` (30 cycles, trend) | PERFORMANCE.md, `reports/memory-followup.json` |
| Repository with source, lockfile, assets, mocks, fixtures, tests | This repository | `npm ci` from a clean checkout, CI |
| Public deployment matching the delivered code | Static build, commit in `/version.json` | Pending: see README, Deployment |
| README and ARCHITECTURE contents | [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) | — |
| Test and profiling reports | `reports/` | — |
