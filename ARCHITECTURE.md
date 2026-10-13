# Architecture

## Ownership and boundaries

`main.tsx` starts MSW, then mounts React with a shared TanStack Query provider. `App.tsx` owns screens, persisted options, the current recursively frozen match configuration, the last result and the pending submission queue. Gameplay is loaded lazily, reducing work before Play.

React authors the canvas, menus, forms, dialogs, semantic HUD and touch buttons. Pixi owns rendering resources attached to that canvas. A match owns one `Simulation`, `InputController`, `MapRenderer`, `ArenaRenderer`, animation-frame loop and ResizeObserver. React never mirrors the continuously changing entity collections.

| Module | Responsibility |
| --- | --- |
| game/configuration | Static authored profiles, factory registrations, validation and frozen snapshots |
| game/tiledMap | Validated authored-map/tileset/image loading and progress |
| game/mapRenderer | Authored tile composition at integer resolution, single cached map surface, Tiled flip transforms |
| game/simulation | Encapsulated match aggregate coordinating entities and systems |
| game/entities | Entity/Ship inheritance, player/enemy behaviours, projectile and effect lifecycles |
| game/core, factories, systems | Collision-world interface, bounded pools, registered construction, weapons, spawning, damage and match state |
| game/geometry | Circle/rectangle contacts, swept projectile intersections and BFS routes |
| game/input | Gameplay-scoped keyboard and independent touch sources |
| game/renderer | Ships, health, deterioration, cannonballs and effects from explicit PNGs |
| game/audio | Cached Web Audio buffers, bounded voices, loop and lifecycle control |
| ui/GameCanvas | Initialization, resize, fixed-step accumulator, pause events and low-frequency snapshots |
| data/contracts, api, network, storage | Typed REST records, Axios/Query, MSW and persistence |

## Simulation clock and input

The render loop uses `requestAnimationFrame`; elapsed wall time enters a fixed-step accumulator. Simulation runs at 1/60s independently of rendered FPS. Individual real-time frames are capped at 250ms to avoid a spiral after browser stalls. Hidden/focus-lost sessions pause, reset the accumulator and clear all input; resuming always requires a user action. Remaining time, projectile lifetime, effects, AI and cooldowns all use active simulation time.

Keyboard listeners belong to the focusable gameplay region, and ignore form/button events. An input-source map permits several keys and pointer contacts to contribute commands independently. Pointer capture, pointer cancellation, blur and pause release input. Accessible touch buttons also respond to Enter/Space while focused.

React receives a semantic snapshot approximately 4Hz. Loading, pause and end transitions publish immediately. Position, speed, health, projectiles and AI paths live in private entity/system fields; Simulation coordinates them through commands. React does not render every simulation step.

## Arena and resource loading

The player's finite orthogonal Tiled map is the source of truth: 32×18 tiles, 64 logical pixels, four visual layers and five rectangular collision objects. Required references are registered as bundler-visible URLs. Relative JSON references resolve against original logical asset paths, so hashed production URLs and inlined tilesets remain valid. Missing files, unsupported geometry, invalid GIDs, dimensions and out-of-arena rectangles fail visibly with a retry action.

The complete 2048×1152 arena is uniformly fitted into the available canvas. Resize changes display scale, never simulation coordinates or balance. Device resolution is capped at 2×. Tiles support horizontal, vertical and diagonal Tiled flips. Cropped tile textures are reused by GID while composing the authored static layers once into an owned RenderTexture at integer resolution. Fitting one map sprite prevents cracks between independently scaled tile quads at fractional viewport/DPI sizes. Temporary tile sprites are destroyed after composition; the cached surface and frame textures are destroyed with the match. Base image textures remain intentionally cached across matches. No generated island, UI or substitute asset is used after a loading error.

## Object-oriented gameplay model

`Entity` encapsulates ID/position. Abstract `Ship` adds health, angle, speed, a frozen profile and protected steering/movement. `PlayerShip` interprets input. Abstract `EnemyShip` owns navigation state; `EnemyChaser` and `EnemyShooter` override the update contract. Projectile and Effect inherit Entity and have explicit pooled activation/reset lifecycles. Private state uses JavaScript `#` fields; read ports are frozen getter facades without gameplay mutation methods.

Movement integrates configured acceleration or braking per fixed step and clamps to each profile's maximum. Cooldowns belong to per-ship WeaponControllers, independently keyed by mount. Enemy behaviour uses an EnemyContext for required collision, target, firing and damage commands. Simulation and rendering do not branch on enemy IDs. FactoryConfig registers each explicit profile with its subclass; new types extend that registration and spawn weights. CollisionWorld implements ICollisionWorld, ShipFactory implements IShipFactory, and ProjectileSystem implements IProjectileEmitter.

GameConfigFactory validates authored settings, clones profiles and freezes each match snapshot. Static classes separate PlayerShip, EnemyChaser, EnemyShooter, projectiles, visuals, input, audio and game defaults. Factories contain construction logic; FactoryConfig contains authored mappings. All gameplay tuning and runtime budgets reside in configuration classes; mathematical identities and algorithmic constants remain in algorithms. React components continue using their framework's function/hook lifecycle.

ObjectPool<T> preallocates a configured initial capacity, grows in blocks up to its maximum and rejects double/foreign returns. Weapons reserve capacity for the complete salvo before emitting; exhaustion postpones the salvo without consuming cooldown. The separate effect budget drops visual events at its cap without changing damage/scoring. Logical and rendering pools are disposed with the match. See CONFIGURATION.md for client-facing editing, units, extension and budget sizing.

## Collision and AI

Ships use configurable circle colliders. Movement clamps at arena borders and checks circle/rectangle overlap against island objects. Axis sliding keeps navigation usable along edges. Fixed-step movement is small relative to ship radii; projectile movement uses swept segments because cannonballs move much faster.

Each projectile checks the earliest contact fraction with expanded obstacle rectangles and enemy/player circles. A contact removes the projectile after one damage application. Dead ships are marked immediately and excluded from subsequent damage, shooting and collision. Player death prevents further projectile scoring in the same step. Bullets are also removed by TTL or leaving the arena. Each player weapon has an independent cooldown; side weapons generate three parallel, longitudinally separated balls.

Chasers seek and ram, causing damage and self-destruction without score. Shooters approach, orient toward the player and shoot only with clear line of sight and within range. Direct routes use obstacle checks inflated by ship radius. Blocked routes use deterministic four-neighbour BFS on the authored grid, recomputed every 0.75s. Ships turn at bounded angular speed and advance when reasonably aligned. They do not collide with each other; spawn separation limits initial overlaps.

Spawn candidates are explicit authored water positions. Each is validated against the map before combat. At spawn time candidates must be sufficiently far from the player and nearby enemies. If no candidate is safe, that interval is skipped. The first two successful spawns guarantee both types; subsequent distribution is seeded. The active enemy cap is 28.

## Rendering, UI and audio

Entity-ID maps retain ship sprites while alive. Projectile and effect entities use bounded pools, and their Pixi sprites use matching separate pools. Returned sprites remain attached and hidden; activation resets texture and transform. Ship views are destroyed on removal, while all match-owned pooled sprites are destroyed on disposal. Fixed ship/projectile/effect containers preserve draw order when pools expand. Health indicators use the supplied frame and fill PNGs. The atlas's logical fill rectangle determines left-origin clipping; the transparent source margins and border alignment remain intact. Fill subtextures are replaced only when health changes and explicitly destroyed. Deterioration selects supplied ship variants and animated fire sprites. Explosion frames and effect alpha follow simulation time, therefore freeze on pause.

React buttons are semantic HTML controls decorated with provided PNG states. Menu panels use the supplied 9-slice border metadata.

`MainMenu` composes the board shown in `assets/sample_menu.png`. `MainMenu.css` expresses every measurement in pixels of that 1800×1000 reference, multiplied by the `--sample-px` custom property from `App.css`, so the board keeps its proportions on desktop and mobile; small text has a legibility minimum. The board uses retina panel, title and ship art (`MenuArt`) because it is drawn above logical size; static imports make a missing file fail the build. `CaptainsLog` composes the Ranking/Match History board of `assets/sample_ranking.png` and `assets/sample_history.png` (same panel and measurement method in `CaptainsLog.css`, with a `--board-px` unit that also fits portrait screens); `RemotePanel` renders its semantic table, highlights this player's ranking records and the last completed battle in history, and pages with the round authored buttons, `HowToPlay` holds the briefing and control reference, and `DemoNetworkTools` docks the MSW scenario controls in the bottom-left corner. `App.tsx` remains the owner of the active screen and of the handlers these components receive. Native modal dialogs provide focus containment, Escape handling and focus restoration. Main screen transitions focus the heading; Resume returns focus to gameplay. Score, time, health and state remain available outside the canvas.

Web Audio unlocks on a user gesture, caches supplied decoded WAVs, limits simultaneous sources to 16 and coalesces repeated events within a step. Ambient/sailing loops stop while paused or outside combat. Finished sources disconnect. Audio decode failures are nonfatal; buffers and a single audio context remain cached rather than recreated each match.

## Lifecycle and Strict Mode

Initialization is serialized through a component-owned promise queue. Async setup checks disposal after Pixi initialization and asset loading. Map fetches are aborted on cleanup. An abandoned initialization destroys its resources as soon as the pending operation resolves. Retry receives a fresh React-authored canvas.

Cleanup cancels animation frames, disconnects ResizeObserver, removes keyboard/window/document listeners, clears input, stops audio, destroys entity containers and owned subtextures, destroys map frames without destroying shared image sources, unloads cached sources from the retiring GPU context using the public TextureSource.unload API, and destroys the Pixi Application without removing React's canvas. Decoded images remain cached; renderer-specific GPU data is reuploaded on the next match. Restart mounts a new match with a new UUID and reset simulation. Abandonment never calls the completion callback.

## REST contracts and consistency

`MatchRecord` contains id, playerId, playerName, ISO UTC date, integer score, active duration, time/death reason and full GameConfig. GET `/api/ranking?config=...&page=...` returns ranked matches; GET `/api/history?playerId=...&page=...` returns personal records; POST `/api/history` registers a completed match. Pages contain items, page, totalPages and total. Each page has at most five items.

Ranking compares configuration identity (map/balance version, seed, duration, spawn interval and fingerprint of the entire serialized gameplay snapshot); ties resolve by date ascending and ID ascending. History sorts date descending, then ID. Fixtures use fixed UTC dates and deterministic scores. Gameplay seed and latency sequences are controlled separately.

Axios supplies a timeout and propagates each query's AbortSignal. Query keys include resource, player/configuration, page and scenario revision. Unmounted or obsolete requests are cancelled; even a late response belongs to its old key. Query retries are limited to one. Successful mutations invalidate both resources, and tabs refetch on mounting/refresh. API state never owns or pauses the combat simulation.

## Persistence and outbox

localStorage keys `pirate.options`, `pirate.player`, `pirate.last`, `pirate.pending`, `pirate.server` and `pirate.scenario` store separately validated values. Parse/quota/unavailability failures produce a warning. Active match entities are never persisted: refresh abandons incomplete combat.

Completion stores the last result and pending record before sending HTTP. Each new record is attempted once per page session; the mutation queue is serial. Failed records remain pending and can retry explicitly or after refresh. New battles remain available. On success the matching pending ID is removed and both tabs invalidated. A stable UUID and server lookup make POST idempotent even when the first response timed out after committing. The reset operation advances a server generation so a delayed pre-reset POST cannot silently restore cleared records.

Confirmed and pending records survive refresh on the same origin. MSW state is local to that browser, not a remote multi-user database. Reset server intentionally preserves the player's local result and outbox; the UI explains this. The generated service worker includes a small, reproducible API-only fetch filter: static images/modules/audio are left to the browser, avoiding unnecessary MSW response cloning and retained network message/stream buffers. `npm run mocks:init` reapplies this filter after regeneration; API handlers and failure scenarios remain unchanged.

## Verification and limits

Playwright runs isolated desktop and landscape mobile Chromium contexts, real keyboard/multiple-touch inputs, deterministic dates, seeded gameplay and controlled simulation time. The opt-in observation/clock API cannot assign combat state. Visual baselines cover menu, stable arena and result. Optimized real-time profiling measures frame intervals and entity peaks, followed by five start/play/leave heap checks; raw reports accompany the source.

See README, TESTING and PERFORMANCE for commands, results and supported scope. Portrait combat, arbitrary Tiled shapes, exact hull silhouettes, enemy ship-to-ship physics, physical-device validation and a shared production leaderboard are outside this submission's documented scope.
