# Architecture

## Ownership and boundaries

`main.tsx` constructs one `ApplicationServices` composition root, starts its `NetworkSimulator`, then mounts React with the injected QueryClient and `ServicesProvider`. There are no exported global audio/API/storage managers. `App.tsx` owns screen selection and React state; application repositories own preferences, identity and record persistence. Gameplay and the texture library load lazily after Play.

React authors the canvas, menus, dialogs, HUD, touch controls and one persistent audio element. `GameCanvas` is a view adapter: it supplies authored elements and UI callbacks to a `GameSession`. That session owns one `GameManager`, `InputController`, `MapRenderer`, `ArenaRenderer`, animation-frame loop and ResizeObserver. React receives semantic snapshots instead of continuously changing entity collections. `ArenaRenderer` accepts only a frozen `GameReadView`, which excludes domain mutation/lifecycle commands.

| Module | Responsibility |
| --- | --- |
| game/configuration | Static authored profiles, factory registrations, validation and frozen snapshots |
| game/assets/TiledMapLoader | Validated authored-map/tileset/image loading and progress |
| game/rendering/MapRenderer | Authored tile composition at integer resolution, single cached map surface, Tiled flip transforms |
| game/runtime/GameManager | Encapsulated match aggregate coordinating entities and systems |
| game/entities | Entity/Ship inheritance, player/enemy behaviours, projectile and effect lifecycles |
| game/core, factories, systems | Collision-world interface, bounded pools, registered construction, weapons, spawning, damage and match state |
| game/math | Pure Geometry contacts/intersections and encapsulated Navigation BFS routes (nearest reachable cell when the target cell is blocked) |
| game/input/InputController | Gameplay-scoped keyboard and independent touch sources |
| game/rendering/ArenaRenderer | Ships, health, deterioration, cannonballs and effects from explicit PNGs |
| game/presentation/ShipTrailSystem, ShipTrailRenderer | Bounded stern history and pooled MeshRopes for the owner-authored ship trail |
| game/runtime/GameSession | Per-match initialization, fixed-step clock, RAF, resize/density changes, pause and disposal |
| game/runtime/TerminalSequence | Death/victory presentation timeline after combat ends (reveal and ready transitions) |
| game/runtime/SessionInstrumentation | Opt-in `?test=1` / `?profile=1` observation, manual test clock and frame/entity metrics |
| infrastructure/network | NetworkConfig (HTTP settings), NetworkScenarios (MSW scenarios as data), MockFixtures and the NetworkSimulator handlers |
| ui/navigation/ScreenRoute | URL fragments for menu screens, so refresh keeps the visible screen |
| game/audio | AudioManager coordinates SoundEffectPlayer and streamed MusicPlayer with different lifetimes |
| ui/game/GameCanvas | Authored React canvas view, UI state, retry and translation to session commands |
| ui/game/PauseMenu | Pause board from `sample_pause.png` in a native modal dialog: Resume, in-battle Options (preferences persist at once; game settings apply to the next battle) and confirmed Main Menu |
| ui/hud | MatchStatusHud and TouchControls reproduce the authored gameplay HUD |
| application/records/MatchRecord, api, network, storage | Typed REST records, Axios/Query, MSW and persistence |

## GameManager clock and input

The render loop uses `requestAnimationFrame`; elapsed wall time enters a fixed-step accumulator. GameManager runs at 1/60s independently of rendered FPS. Individual real-time frames are capped at 250ms to avoid a spiral after browser stalls. Hidden/focus-lost sessions pause, reset the accumulator and clear all input; resuming always requires a user action. Remaining time, projectile lifetime, effects, AI and cooldowns all use active simulation time.

Keyboard listeners belong to the focusable gameplay region, and ignore form/button events. An input-source map permits several keys and pointer contacts to contribute commands independently. Forward's touch gesture keeps its sailing source pressed and maps the two-dimensional drag vector to a desired world heading once it exceeds the threshold in InputConfig. Each simulation step compares that heading to the player's current angle and issues the shorter left/right turn; returning to center or releasing/canceling the pointer clears steering. The separate turn buttons remain direct rotation commands. Pointer capture, pointer cancellation, blur and pause release input. Accessible touch buttons also respond to Enter/Space while focused.

React receives a semantic snapshot approximately 4Hz. Loading, pause and end transitions publish immediately. Position, speed, health, projectiles and AI paths live in private entity/system fields; GameManager coordinates them through commands. React does not render every simulation step.

## Arena and resource loading

The player's finite orthogonal Tiled map is the source of truth: 32×18 tiles, 64 logical pixels, four visual layers and five rectangular collision objects. Required references are registered as bundler-visible URLs. Relative JSON references resolve against original logical asset paths, so hashed production URLs and inlined tilesets remain valid. Missing files, unsupported geometry, invalid GIDs, dimensions and out-of-arena rectangles fail visibly with a retry action.

Desktop uniformly fits the complete 2048×1152 arena into the canvas. Compact screens use `WorldCamera` to show approximately a quarter of its area and follow the player with bounded edges; `CameraConfig` owns display-only tuning. `GameSession` applies the camera every draw and after resize, while HUD/input stay in screen space. `#root` is the size container of every screen; a touch device in portrait turns it a quarter so the landscape layout, HUD and canvas keep their size, and `GameSession` pauses only for a portrait arena. `FullscreenDisplay`, injected by `ApplicationServices` and attached by `ServicesProvider`, makes full screen required from the first gesture and implements Alt+Enter and Quit; `DisplayGuidance` renders its notices. See [MOBILE.md](MOBILE.md) for the rotated layout, compact UI and display ownership. Resize and rotation change display scale, never simulation coordinates or balance. Device resolution is capped at 2×; a later devicePixelRatio change (browser zoom or moving the window to another monitor) is detected through the resolution media query and the window resize event, and the renderer is resized at the new density. Tiles support horizontal, vertical and diagonal Tiled flips. Cropped tile textures are reused by GID while composing the authored static layers once into an owned RenderTexture at integer resolution. Fitting one map sprite prevents cracks between independently scaled tile quads at fractional viewport/DPI sizes. Temporary tile sprites are destroyed after composition; the cached surface and frame textures are destroyed with the match. Base image textures remain intentionally cached across matches. No generated island, UI or substitute asset is used after a loading error.

## Object-oriented gameplay model

`Entity` encapsulates ID/position. Abstract `Ship` adds health, angle, speed, a frozen profile and protected steering/movement. `PlayerShip` interprets input. Abstract `EnemyShip` owns navigation state; `EnemyChaser` and `EnemyShooter` override the update contract. Projectile and Effect inherit Entity and have explicit pooled activation/reset lifecycles. Private state uses JavaScript `#` fields; read ports are frozen getter facades without gameplay mutation methods.

Movement integrates configured acceleration or braking per fixed step and clamps to each profile's maximum. Cooldowns belong to per-ship WeaponControllers, independently keyed by mount. Enemy behaviour uses an EnemyContext for required collision, target, firing and damage commands. GameManager and rendering do not branch on enemy IDs. FactoryConfig registers each explicit profile with its subclass; new types extend that registration and spawn weights. CollisionWorld implements ICollisionWorld, ShipFactory implements IShipFactory, and ProjectileSystem implements IProjectileEmitter.

GameConfigFactory validates authored settings, clones profiles and freezes each match snapshot. Static classes separate PlayerShip, EnemyChaser, EnemyShooter, projectiles, visuals, input, audio and game defaults. Factories contain construction logic; FactoryConfig contains authored mappings. All gameplay tuning and runtime budgets reside in configuration classes; mathematical identities and algorithmic constants remain in algorithms. React components continue using their framework's function/hook lifecycle.

ObjectPool<T> preallocates a configured initial capacity, grows in blocks up to its maximum and rejects double/foreign returns. Weapons reserve capacity for the complete salvo before emitting; exhaustion postpones the salvo without consuming cooldown. The separate effect budget drops visual events at its cap without changing damage/scoring. Logical and rendering pools are disposed with the match. See CONFIGURATION.md for client-facing editing, units, extension and budget sizing.

## Collision and AI

Ships use configurable circle colliders. Movement clamps at arena borders and checks circle/rectangle overlap against island objects. Axis sliding keeps navigation usable along edges. Fixed-step movement is small relative to ship radii; projectile movement uses swept segments because cannonballs move much faster.

Each projectile checks the earliest contact fraction with expanded obstacle rectangles and enemy/player circles. A contact removes the projectile after one damage application. Dead ships are marked immediately and excluded from subsequent damage, shooting and collision. Player death prevents further projectile scoring in the same step. Bullets are also removed by TTL or leaving the arena. Each player weapon has an independent cooldown; side weapons generate three parallel, longitudinally separated balls.

Chasers seek and ram, causing damage and self-destruction without score. Shooters approach, hold position and orient toward the player and shoot only with clear line of sight and within range. `EnemyShip.follow` is a deterministic steering pipeline configured by each profile's `ai` block (see CONFIGURATION.md, Enemy navigation): the goal is the target when `ICollisionWorld.isNavigable` reports a clear line with coast clearance, otherwise the next corner of `ICollisionWorld.route` — a four-neighbour BFS on the authored grid, string-pulled to its corners and ending at the nearest reachable cell when the target's cell is blocked. Separation from nearby enemies bends the desired heading; `ICollisionWorld.clearance` probes plus enemy-hull sweeps select the closest clear heading; a progress window triggers a short open-water recovery and replan. The helm follows a low-pass-filtered heading at bounded turn speed, and the protected `Ship.cruise` command eases speed towards a turn- and coast-dependent target. `EnemyContext.fleet` supplies the enemies' read views; per-step neighbour data is detached so probes never mutate or retain ships. Spawn spacing uses hull radii, and new ships face their first route corner.

Island collisions damage hulls. `ShipCollisionWorld` records the strongest blocked-movement contact per ship and coast in each step; `GameManager` keeps the existing significance filter (`minimumImpactSpeed`, then one event per `impactCooldown` for that contact key), which already drives the impact sound and splash. Each significant island contact then applies `config.collision.islandImpactDamage[allegiance]` from the frozen match snapshot through `DamageSystem` with no kill credit: 1 for the player and 0 for enemies by default, authored in `CollisionConfig.Default`. A hull resting against a coast stops generating significant contacts, so health is lost once per collision rather than once per frame. Island damage that sinks the player ends the match by death in the same step. Boundary contacts never apply island damage, and the Chaser retains its independent configured ram damage.

Spawn candidates are explicit authored water positions. Each is validated against the map before combat. At spawn time candidates must be sufficiently far from the player and nearby enemies. If no candidate is safe, that interval is skipped. The first two successful spawns guarantee both types; subsequent distribution is seeded. The active enemy cap is 28.

## Rendering, UI and audio

Entity-ID maps retain ship sprites while alive. Projectile and effect entities use bounded pools, and their Pixi sprites use matching separate pools. Returned sprites remain attached and hidden; activation resets texture and transform. Ship views are destroyed on removal, while all match-owned pooled sprites are destroyed on disposal. Fixed ship/projectile/effect containers preserve draw order when pools expand. Health indicators use the supplied frame and fill PNGs. The atlas's logical fill rectangle determines left-origin clipping; the transparent source margins and border alignment remain intact. Fill subtextures are replaced only when health changes and explicitly destroyed. Deterioration selects supplied ship variants and animated fire sprites. Explosion frames and effect alpha follow simulation time, therefore freeze on pause.

Ship trails use the owner's `assets/authored/shipt-trail.png`. `ShipTrailSystem` (owned by `PresentationSystem`, advanced on the presentation clock) samples each moving ship's stern every `shipTrail.sampleSeconds` while its speed is at least `minimumSpeedRatio` of its maximum, and expires samples after `lifetime`; a live ship's current stern always leads the path. `ShipTrailRenderer` draws each trail as a pooled Pixi `MeshRope` with a fixed vertex count: the stern path is resampled evenly by arc length, and the texture is stretched once along it with its strong end at the stern. Ropes live in their own layer below debris, crew and ships. Alpha follows speed and the age of the newest sample, so a trail fades after its ship stops or sinks. Pause freezes trails, the logical and visual pools share one validated capacity covering every live ship, and disposal destroys each rope and its geometry while keeping the cached texture.

React buttons are semantic HTML controls decorated with provided PNG states. Menu panels use the supplied 9-slice border metadata.

`MainMenu` composes the board shown in `assets/sample_menu.png`. `MainMenu.css` expresses every measurement in pixels of that 1800×1000 reference, multiplied by the `--sample-px` custom property from `App.css`, so the board keeps its proportions on desktop and mobile; small text has a legibility minimum. The board uses retina panel, title and ship art (`MenuArt`) because it is drawn above logical size; static imports make a missing file fail the build. `CaptainsLog` composes the Ranking/Match History board of `assets/sample_ranking.png` and `assets/sample_history.png` (same panel and measurement method in `CaptainsLog.css`, with a `--board-px` unit that also fits portrait screens); `RemotePanel` renders its semantic table, highlights this player's ranking records and the last completed battle in history, and pages with the round authored buttons, `HowToPlay` holds the briefing and control reference, and `DemoNetworkTools` docks the MSW scenario controls in the bottom-left corner. `App.tsx` remains the owner of the active screen and of the handlers these components receive. Native modal dialogs provide focus containment, Escape handling and focus restoration. Main screen transitions focus the heading; Resume returns focus to gameplay. Score, time, health and state remain available outside the canvas.

Web Audio unlocks on a user gesture and decodes only cues registered by `AudioConfig`. It keeps one AudioContext, a 16-voice budget, per-cue cooldowns and priority-aware voice replacement so warning/sinking/terminal cues can be heard during dense combat. Repeated cannon, hull-hit, water-impact and explosion cues alternate authored WAVs and apply small configured playback-rate variation independently of gameplay randomness. UI hover is mouse-only. Ocean and speed-sensitive sailing loops stop on pause, match end, abandonment and teardown. Finished sources disconnect; decode failures remain nonfatal and visible.

## Lifecycle and Strict Mode

Player death uses the explicitly selected extra WAV and a temporary `MusicPlayer` mix multiplier. `AudioManager` restores the OST when that source ends, guarded by a mix revision, or when remaining match sounds are stopped. Ducking does not change Options or the soundtrack position. The cue survives completed-session disposal.

`TerminalSequence` owns the post-combat timeline; `GameSession` advances it with the same clock as gameplay and translates its reveal/ready transitions into callbacks. `SessionInstrumentation` owns the opt-in observation API: `?test=1` replaces real-time advancement with bounded clock steps, `?profile=1` records frame intervals; neither exposes a command that writes combat state.

`GameSession` publishes `onComplete` immediately. For death, it publishes `onResultReveal` after the configured 3-second destruction window and `onResultReady` after the additional 1-second crossfade. `App` keeps the same GameCanvas mounted under the result screen during that fade, then disposes it. For time expiry, the session publishes `onTerminalElapsed` during the 4-second victory window; React derives the survival message's opacity from that clock, fading only during the final 2 seconds. Reveal and readiness occur together after the victory message has disappeared. React/CSS own text styling and result opacity; presentation-only simulation keeps explosion/sinking/crew active while combat stays frozen. Detached instrumentation exposes terminal elapsed time and reveal state. Hidden tabs suspend the terminal simulation clock and victory opacity together.

Initialization is serialized through a view-owned promise queue. Each attempt creates a `GameSession`; it checks disposal after Pixi initialization and asset loading. Map fetches abort on cleanup. An abandoned initialization destroys partial resources after the pending operation settles. Retry receives a fresh React-authored canvas. GameSession owns and cancels both render and deferred focus frames; resume returns keyboard focus after React closes the modal.

Cleanup cancels animation frames, disconnects ResizeObserver, removes keyboard/window/document listeners, clears input, stops match effects/ambience, destroys owned renderer resources and unloads retiring GPU sources without removing React's canvas. Application texture/audio caches survive between matches. The persistent soundtrack also survives match cleanup; its element belongs to ServicesProvider. Restart creates a new match UUID and GameManager. Abandonment never calls the completion callback.

## REST contracts and consistency

`MatchRecord` contains id, playerId, playerName, ISO UTC date, integer score, active duration, time/death reason and full GameConfig. GET `/api/ranking?config=...&page=...` returns ranked matches; GET `/api/history?playerId=...&page=...` returns personal records; POST `/api/history` registers a completed match. Pages contain items, page, totalPages and total. Each page has at most five items.

Ranking compares configuration identity (map/balance version, seed, duration, spawn interval and fingerprint of the entire serialized gameplay snapshot); ties resolve by date ascending and ID ascending. History sorts date descending, then ID. Fixtures use fixed UTC dates and deterministic scores. Gameplay seed and latency sequences are controlled separately.

Axios supplies a timeout and propagates each query's AbortSignal. Query keys include resource, player/configuration, page and scenario revision. Unmounted or obsolete requests are cancelled; even a late response belongs to its old key. Query retries are limited to one. Successful mutations invalidate both resources, and tabs refetch on mounting/refresh. API state never owns or pauses the combat simulation.

The UI states are explicit: `Loading records…` before the first response, a visible `Updating records…` status with dimmed cached rows during background refetches, an accessible alert with Retry on failure, an empty-list message, and pagination that keeps the previous page (`keepPreviousData`) until the next arrives. `NetworkConfig` owns the base URL, the 1800 ms timeout, query retries and page size. `NetworkScenarios` describes every MSW scenario as data (deterministic latency by request count, failing endpoints, fixture counts, post-commit delay); the handlers apply that data instead of branching on scenario names. An unknown ranking configuration key is rejected with HTTP 400.

Browsers stop idle service workers; a restarted MSW worker forgets its registered pages and would let `/api/` requests reach the static host (a 404 for the POST, or `index.html` for a GET). Every mocked response therefore carries an `x-pirate-mock` header. An Axios interceptor installed by `NetworkSimulator.withRecovery` treats an `/api/` response without it as a lost registration: it re-announces the page to the active worker with the worker's own `MOCK_ACTIVATE` message, waits for `MOCKING_ENABLED`, and retries the request once. A second unmarked response becomes a visible error. `RecordsApi` validates every page and saved record before TanStack Query or the UI sees it.

## Persistence and outbox

localStorage keys `pirate.options`, `pirate.player`, `pirate.last`, `pirate.pending`, `pirate.server` and `pirate.scenario` store separately validated values. Parse/quota/unavailability failures produce a warning. Active match entities are never persisted: refresh abandons incomplete combat.

Menu screens are reflected in the URL fragment through `ScreenRoute` (`#options`, `#how-to-play`, `#ranking`, `#history`, `#result`) with `history.replaceState`, so refresh reopens the visible screen without adding history entries. `#result` reopens Results from `pirate.last`; if no completed battle is stored, the main menu opens instead. Combat has no fragment, so reloading during a battle abandons it and returns to the menu.

Completion stores the last result and pending record before sending HTTP. Each new record is attempted once per page session; the mutation queue is serial. Failed records remain pending and can retry explicitly or after refresh. New battles remain available. On success the matching pending ID is removed and both tabs invalidated. A stable UUID and server lookup make POST idempotent even when the first response timed out after committing. The reset operation advances a server generation so a delayed pre-reset POST cannot silently restore cleared records.

Confirmed and pending records survive refresh on the same origin. MSW state is local to that browser, not a remote multi-user database. Reset server intentionally preserves the player's local result and outbox; the UI explains this. The generated service worker includes a small, reproducible API-only fetch filter: static images/modules/audio are left to the browser, avoiding unnecessary MSW response cloning and retained network message/stream buffers. `npm run mocks:init` reapplies this filter after regeneration; API handlers and failure scenarios remain unchanged.

## Verification

Playwright runs isolated desktop and landscape mobile Chromium contexts, real keyboard/multiple-touch inputs, deterministic dates, seeded gameplay and controlled simulation time. The opt-in observation/clock API cannot assign combat state. Visual baselines cover the menu, a stable arena and the result screen for Windows and for Linux (the CI container). A production-smoke project exercises the optimized build and its service worker; axe audits every screen against WCAG 2.1 AA. Optimized real-time profiling measures frame intervals and entity peaks, followed by start/play/leave heap checks; raw reports accompany the source. See TESTING, PERFORMANCE and REQUIREMENTS.

## Build identity and delivery

`vite.config.ts` resolves the build's commit (Vercel, Cloudflare Pages, Netlify or GitHub Actions variables, otherwise local Git, marked `-dirty` with uncommitted tracked changes) and publishes it as `<meta name="build-commit">`, `/version.json` and a label on How To Play, so a deployment can be matched to its source. React, the records stack (TanStack Query, Axios) and MSW are split into stable vendor chunks loaded in parallel with the application chunk; Pixi and the game engine stay in the lazily loaded arena chunk.

## Balancing decisions

Values come from the authored profiles (balance `arena_00-v1/balance-v7`, seed 20261012). The intent is a readable three-minute arcade fight in which positioning matters more than reflexes.

| Decision | Values | Reasoning |
| --- | --- | --- |
| Player survives several mistakes | 100 HP; Chaser ram 25; Shooter ball 12; island collision 1 | Four rams, about eight Shooter hits, or many careless coast collisions sink the ship. Island damage punishes reckless steering without making the narrow channels unusable. |
| Two weapon roles | Front cannon 25 damage / 0.35 s; each broadside ball 22 damage, 3 balls / 1.1 s | The bow cannon is the precise sustained weapon. A full broadside (66) sinks a Chaser (40) or a Shooter (65) at once, rewarding turning alongside an enemy over facing it. |
| Enemies need different answers | Chaser 40 HP at 125 px/s; Shooter 65 HP at 100 px/s, range 580, cooldown 2.2 s | The Chaser is fragile but closes in and must be sunk before contact; the slower, tougher Shooter holds at range, so the player must approach or outmanoeuvre it. |
| Readable enemy fire | Player balls 780 px/s; enemy balls 340 px/s; lifetime 1.6 s | Enemy balls are slow enough to dodge, yet reach about 600 px from the hull (58 px muzzle offset plus 544 px of flight), covering the 580 px holding range. |
| Gradual sailing | Player 230 px/s, acceleration 230 px/s², braking 115 px/s², turn 2.6 rad/s | About 1 s to full speed and 2 s to stop gives momentum without sluggish controls; enemies turn more slowly (2.1 rad/s), so out-turning them is a skill. |
| Spawn pressure | Default 5 s (Options 2–10 s), first Chaser then Shooter, then seeded 50/50, cap 28, at least 440 px from the player | Both behaviours appear early in every session. The minimum interval bounds pressure and entity counts; the maximum still produces both types in a 60 s session. Spawns never start within ramming reach. |
| Recovery | Each rescued survivor restores 1 HP (2–5 per sinking) | Sinking enemies sustains an aggressive player; healing never exceeds the maximum and never scores. |
| Close ship contact | Hull radius 40 for every ship (sprite 67 × 113) | Side-by-side hulls stop 13 px apart instead of a full ship width; head-on bows overlap at most 33 px, a smaller visual error than the previous empty gap. Rams and rescues require a correspondingly closer approach. |

## Known limitations

- Chromium desktop and landscape mobile emulation are the reference browsers; physical iOS/Android audio, performance and browser-specific behaviour are not verified.
- Hulls are circles and islands are rectangles, which favours predictable navigation over exact silhouettes; contact near bows and sterns is approximate. The 40-pixel ship-to-ship circle is narrower than the 113-pixel hull length, so bows may overlap slightly in head-on contact.
- The Tiled loader supports this finite orthogonal map, external image tilesets and rectangular collision objects; other shapes fail visibly.
- Enemies share no plan; a dense crowd at the 28-enemy cap can queue briefly around the player.
- Touch devices in portrait show the landscape layout rotated a quarter; native browser surfaces such as `<select>` pickers are not rotated, and physical-device rotation, scrolling and full screen remain unverified. A portrait desktop window pauses combat.
- The mock leaderboard is local to each browser and origin; it is not a shared or trusted server.
- localStorage availability and quota limit recovery across refresh; failures are reported, not hidden.


## Team module convention and composition

All source modules use PascalCase matching the primary class or public React component. Types and pure functions live in descriptive PascalCase modules. Folders use lowercase responsibility names. Framework entry/declaration files `main.tsx` and `vite-env.d.ts` are exceptions. Hooks use React's `use` function prefix in PascalCase files. There are no legacy re-export modules; imports identify the actual owner. Prettier and `.editorconfig` standardize source formatting and UTF-8; the architecture check enforces filenames, individual public classes/components and domain dependency restrictions.

```text
src/
  application/
    ApplicationServices.ts       composition root and lazy shared texture library
    ServicesContext.ts           required React injection context
    configuration/               Options, OptionsConfig, OptionsRepository
    records/                     MatchRecord, MatchRepository, PlayerIdentityRepository
  game/
    contracts/                   readonly configuration, domain symbols, events, render/audio ports
    configuration/               authored gameplay/audio/visual profiles and GameConfigFactory
    core/                        Entity, EntityIdSequence, CollisionWorld, ShipCollisionWorld, ObjectPool, Immutable
    entities/                    Ship hierarchy, Projectile, Effect, Crew
    factories/                   registered ShipFactory and ProjectileFactory
    systems/                     weapons, spawning, damage, projectiles, effects, crew, match state/statistics
    runtime/                     GameManager, GameSession, TerminalSequence, SessionInstrumentation
    input/                       InputController
    math/                        pure Geometry functions and Navigation
    assets/                      TiledMapLoader and application-owned GameTextureLibrary
    rendering/                   MapRenderer, ArenaRenderer, SpritePool, WorldCamera
    presentation/                bounded cosmetic particles, feedback, ship trail and their renderers
    audio/                       AudioManager, SoundEffectPlayer, MusicPlayer
  infrastructure/
    browser/                     FullscreenDisplay (required full screen, Alt+Enter, Quit) and DisplayConfig
    network/                     RecordsApi, NetworkConfig, NetworkScenarios, MockFixtures, NetworkSimulator
    storage/                     LocalStorageStore adapter with private warning state
  ui/
    App.tsx                      application screen/state coordinator
    screens/                     MainMenu, OptionsScreen, HowToPlay, CaptainsLog, ResultScreen
    components/                  Button, Dialog, setting controls, DisplayGuidance, ControlsHelp,
                                 AssetLoadingIndicator, GameLoadBoundary, ServicesProvider
    hud/                         MatchStatusHud, TouchControls and LayoutAxes
    game/                        GameCanvas and PauseMenu
    records/                     RemotePanel and ResultScore
    assets/                      authored MenuArt and UiAssets lookup
    hooks/                       UseApplicationServices and UseTransientNotice
    development/                 demo network controls
    navigation/                  ScreenRoute (URL fragments that survive refresh)
```

A manager is an owner/coordinator, not a place to collect unrelated responsibilities. GameManager delegates rules to domain systems. GameSession delegates rendering, input, asset loading and audio, holding their match lifetime. ApplicationServices is the only application service composition root and is created explicitly in main. React consumers receive that instance through useApplicationServices; missing provider wiring throws visibly.

AudioManager delegates effects to SoundEffectPlayer and persistent music to MusicPlayer. ServicesProvider authors the audio element and attaches it to the music player. Captured pointer/keyboard gestures unlock playback; later gestures can retry a media failure. Options changes immediately configure both players. The music channel streams one explicit MP3 at `masterVolume * musicVolume * authoredGain` and never competes with the effect voice budget. Music keeps position through menu transitions, combat pause, results, abandonment and restart; mute pauses it and reenabling resumes it. IMatchAudio exposes only match sound commands/observations so GameSession cannot control application music ownership. Provider disposal removes gesture listeners and detaches its audio element.

Extend a ship through its profile, subclass and factory registration. Extend gameplay through a focused domain system and explicit command/read contracts. Add a screen in ui/screens and supply actions from App. Add a persistent preference in Options/OptionsConfig/OptionsRepository, including migration and validation. Register authored assets in their configuration manifests; never hide a missing reference with generated content.


## Crew rescue

GameManager owns CrewSystem independently of PresentationSystem. DamageSystem's one-shot Sunk events reach both: CrewSystem reserves the complete 2–5 survivor group; presentation emits wreck/debris. Crew specializes existing renderer-independent floating kinematics with a circular trigger. A dedicated seeded stream fixes count/trajectory independently of cosmetic events. Both systems share match-wide activation IDs.

Before combat damage in each active step, survivor and player motion advance; CrewSystem sweeps their relative segments against the combined hull/trigger radius. Each contact calls Ship.restoreHealth, returns that person to its pool and emits Rescue once. Full-health players leave survivors in the water; dead players cannot revive. Terminal simulation advances lifetime without rescue. Presentation reads frozen survivor DTOs and renders green labels through the existing text pool; rapid rescues combine in one label within an authored 0.35-second interval. Score stays unchanged. Reduced motion does not change pickup positions. Disposal clears logical crew and all match-owned visual resources.
