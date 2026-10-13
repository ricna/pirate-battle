# Pirate Battle

A single-player naval shooter built with React, strict TypeScript and PixiJS for the Jungle Gaming Frontend Game Developer challenge.

Deployment target (publication pending): [Pirate Battle](https://pirate-battle-ricna.flowylime10.chatgpt.site)

Private source repository: [ricna/pirate-battle](https://github.com/ricna/pirate-battle). The original specification is preserved in [CHALLENGE.md](CHALLENGE.md).

## Run from a clean checkout

Use Node.js 24 LTS (tested with 24.14.1) and npm 11. No private API, account or backend is required.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. MSW starts before the UI makes API requests. Service workers require HTTPS or localhost. The production build also includes the mock worker.

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
npx playwright install chromium --no-shell
npm run test:e2e
npm run test:report
```

The Playwright projects use the complete Chromium browser (`channel: chromium`), so a separate headless shell is unnecessary. HTML reports are written to `reports/playwright`. See [TESTING.md](TESTING.md) for coverage, baselines and traces.

There are no required environment variables. `PROFILE_URL` optionally selects a preview origin for the profiling script; its default is `http://127.0.0.1:4173/`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Forward | W / Up | Hold Forward |
| Turn | A / D or Left / Right | Hold the corresponding turn button |
| Front cannon | Space | Hold Front cannon |
| Left broadside | Q | Hold Left broadside |
| Right broadside | E | Hold Right broadside |
| Pause | P / Escape | Pause button |

The main menu's **How To Play** screen presents these controls with the enemy briefing.

Movement and attacks work simultaneously. Each broadside emits three parallel cannonballs. Resume is always explicit after manual pause, focus loss or hiding the tab. Inputs and accumulated frame time are cleared when paused. Islands block ships and projectiles. Each enemy destroyed by player cannonballs awards one point; a Chaser's ram explosion does not.

Combat supports **landscape** on mobile. Rotating to portrait pauses the battle. Menus remain usable in portrait. The arena fills the screen as in `assets/sample.png`; the complete map stays visible and scales uniformly. The animated deep water continues to the screen edges when the screen proportion differs from the map; the arena bounds remain those of the authored map. The HUD floats over it: health at the top left, score/clock/pause at the top right, movement buttons at the bottom left and weapon buttons at the bottom right. Gameplay coordinates do not change with screen size. Touch buttons support independent pointer capture for multiple fingers.

## Options and balance

Options persist after refresh: session time **60–180 seconds** in 10-second steps, enemy spawn interval **2–10 seconds** in 0.2-second steps, sound on/off, master volume and independent music volume in 10% steps. The screen uses the authored `assets/sample_options.png` board with **Game** and **Audio** headers. Sound uses an On/Off toggle; each numeric setting displays its value above an authored HUD-bar slider with minus/plus buttons at its sides. Every adjustment is saved immediately, so there is no separate Save action. Restore default options resets and saves all preferences. Defaults are 120 seconds, 5 seconds, sound enabled, master volume 50% and music volume 100%. The spawn minimum limits pressure and entity growth; the maximum ensures both enemy types appear even in the shortest session.

Static classes under `src/game/configuration/` author ship, projectile, visual, factory, pool and runtime defaults. Each match receives a validated, recursively frozen snapshot. Version `arena_00-v1/balance-v4` includes acceleration/braking; seed `20261012` keeps spawning deterministic. See [CONFIGURATION.md](CONFIGURATION.md) for the client guide, editable files, units, examples and new-enemy registration. Increment the version when changing rules or map geometry.

Player: 100 HP, radius 34, maximum speed 230 pixels/s, acceleration 230 pixels/s² (about 1s to maximum), braking 115 pixels/s² (about 2s to stop), turn 2.6 radians/s. Chaser: 40 HP, speed 125, ram damage 25. Shooter: 65 HP, speed 100, range 580, damage 12, cooldown 2.2s. Player front cannon: damage 25, cooldown 0.35s. Each broadside ball: damage 22, cooldown 1.1s. Player bullets travel at 780 pixels/s; enemy bullets at 340; lifetime is 1.6s. Enemy turn rate is 2.1 radians/s. Active enemies are capped at 28.

The first two spawns guarantee a Chaser and a Shooter; later spawns use a seeded 50/50 distribution. Eight explicit water spawn points must pass obstacle validation and remain at least 440 pixels from the player. Occupied or unsafe points are skipped. No substitute map or generated asset is used when loading fails.

The arena is authored in Tiled at `assets/maps/arena_00.tmj`, with 32×18 cells of 64 pixels. Its `collisions` object layer contains five unrotated rectangles. Tile and object layer names are part of the loader contract; individual collider names are optional. The external tileset and PNG are included and resolved both in development and the hashed production build.

## Ranking and Match History

Axios performs real HTTP requests intercepted by MSW. TanStack Query manages the paginated queries, cancellation, retries, cache and completed-match mutation. Lists contain five records per page.

Both lists appear in the **Captain's Log**. Ranking shows rank, captain, points and play date; Match History shows date, points, duration (mm:ss) and result (Time up / Defeated). Dates are UTC. Your ranking records and your last completed battle are highlighted.

A completed match contains a stable UUID, player identity, UTC date, score, active duration, end reason and configuration snapshot. Ranking compares matches with the same map/balance version, seed, session duration, spawn interval and complete gameplay snapshot fingerprint. Ordering is score descending, then date ascending, then ID ascending. Other captains are fixtures. History shows this browser's player, newest first.

Options, identity, last completed result, pending submissions and confirmed mock records persist in localStorage under `pirate.*` keys. Incomplete battles are abandoned on refresh or leaving combat. Completed results enter the persistent outbox before the POST. Retries recover the existing match ID, including a timeout after the server committed; they never duplicate ranking/history entries. Another battle can start while an older result is pending.

This is a browser-local demo server, as requested by the challenge. Records are isolated by browser and origin; this is not a shared worldwide leaderboard. API failures do not interrupt gameplay.

## Reproduce network scenarios

The checked-in MSW worker is generated by MSW and then restricted to `/api/` requests. Static images, audio and scripts are fetched normally, reducing network-clone overhead. To regenerate consistently, run `npm run mocks:init`; its configuration script reapplies the documented filter and fails if the generated worker format changed.

Open **Demo network scenarios** in the bottom-left corner of any menu screen. Select a scenario and open **Ranking** or **Match History**, or finish a battle.

| Scenario | Reproducible behaviour |
| --- | --- |
| success | 180ms normal requests, ranking fixtures plus confirmed records |
| empty | No fixtures; any already-confirmed records remain visible |
| multiple-pages | 28 ranking fixtures and 16 history fixtures |
| slow | 1400ms requests, below the 1800ms Axios timeout |
| variable-latency | Request-count sequence: 100 + (count × 193 mod 700) ms |
| out-of-order | Alternating 1300ms / 100ms responses |
| timeout | 2500ms response, exceeding Axios timeout |
| connection-error | Network failure |
| http-400 | HTTP 400 |
| http-500 | HTTP 503 service failure |
| ranking-error / history-error | Only that GET endpoint fails with 503 |
| post-commit-timeout | First POST commits, then delays 2500ms; same-ID retry returns the committed record |
| outage | All API operations fail with 503; recover pending results after selecting success |

Scenario changes reset the deterministic request counter and use a new query revision. Obsolete queries are cancelled; old responses cannot overwrite the current view. Query retries are limited to one; POST retries require an explicit action after failure or a page reload. New pending matches are attempted in order.

**Reset demo server** removes confirmed mock records and restores success. Options, player identity, last result and pending submissions are deliberately preserved, as stated in the UI. A pending retry can register a record again after reset. For complete isolation, clear this origin's site storage. Each E2E test starts with a new browser context.

To demonstrate recovery: choose outage, finish a battle, refresh, select success and click Retry pending battle. To demonstrate idempotency: choose post-commit-timeout, finish, wait for timeout, then retry or refresh. History must show only one record.

## Audio and assets

Game initialization displays **Setting Sail** with the authored player-health frame and green fill. Engine preparation is indeterminate; map and texture loading report completion progress from their loaders. Retry resets progress and preserves visible errors.

Player death plays the owner's additional pirate-battle WAV and lowers the OST to 8% of its configured mix. Destruction remains visible for 3 seconds as **Game Over** fades in; then results fade in over 1 second while Game Over fades out. The death sound survives the transition, and music recovers when it finishes or when leaving/restarting. The match is saved immediately, before these animations. Time expiry keeps its separate completion cue.

Menus use the supplied title, panel and button states. The main menu reproduces `assets/sample_menu.png`: Play and Options, the ship emblem, then Ranking, Match History and How To Play. Ranking and Match History open the Captain's Log tabs; How To Play explains the game and controls and only returns to the main menu. Pixi uses the supplied ship deterioration states, cannonballs, fire, explosions and health indicators. The player's Tiled map is retained. Web Audio reuses supplied WAV buffers for ocean/sailing loops, weapons, damage, score, pause and completion. The first user gesture unlocks audio; initial sounds may wait for decoding. Options provide mute/volume. Sound loading failures are nonfatal and visible when returning to menus.

See [ASSETS.md](ASSETS.md) for attribution and asset ownership. No generated visual or audio replacement is used.

## Architecture, performance and publication

[ARCHITECTURE.md](ARCHITECTURE.md) explains React/Pixi ownership, the fixed-step simulation, swept projectile collisions, obstacle-aware enemy routes, low-frequency HUD updates, cleanup and persistent idempotent submissions.

Before implementing or refactoring, read [AGENTS.md](AGENTS.md) and the complete [implementation contract](IMPLEMENTATION.md). It records the owner's required OOP/SOLID, readability, configuration, factory, pooling, asset, verification and collaboration standards for future developers and coding sessions.

[PERFORMANCE.md](PERFORMANCE.md) and `reports/profile.json` record real-time optimized-build profiling, frame intervals, entity counts and five-cycle memory checks. To reproduce, run `npm run build`, `npm run preview` and, in another terminal, `npm run profile`. The script uses actual keyboard inputs, 180s sessions and 10s spawn intervals; it does not modify combat state.

Source code is maintained in the private repository. Hosting is a separate delivery step; no public deployment has been published. `.openai/hosting.json` identifies the site and `dist` output. The build is portable to Vercel, Netlify or Cloudflare Pages: build command `npm run build`, output directory `dist`, root path `/`, no server/environment variables. Keep `mockServiceWorker.js` at the site root. The uploaded build must come from the same pushed source commit as the delivered repository.

## Known limitations

- Chromium desktop and mobile landscape emulation are the reference browsers. Physical iOS/Android audio, performance and browser-specific behaviour still require device verification.
- Collision circles and rectangular islands prioritize predictable navigation over exact silhouette physics; ship hulls are circles (`hullRadius`), so hull contact is approximate around bows and sterns.
- The Tiled loader supports this finite orthogonal map, external image tilesets and rectangular collision objects; unsupported shapes or missing required references fail visibly.
- Enemy routes come from a four-neighbour grid reduced to straight corners, plus local steering; enemies have no shared plan, so a dense crowd at the 28-enemy cap can still queue briefly around the player.
- LocalStorage availability/quota can prevent recovery across refresh; a visible warning is provided.
- Test/profiling instrumentation is opt-in (`?test=1` / `?profile=1`). Test mode can observe and advance time, never assign entity positions, life or score. No server trust/security is implied by a local mock leaderboard.


## Team structure and audio lifecycle

Source files use PascalCase matching their primary class/component. Responsibility folders are lowercase. Start at `src/main.tsx`, which constructs `ApplicationServices`, starts `NetworkSimulator` and injects services through `ServicesProvider`. React screens live under `src/ui/screens`; shared controls, HUD, hooks and the canvas view have separate folders.

`GameSession` owns each match's browser/Pixi lifecycle; `GameManager` coordinates its encapsulated entities and systems. Renderers receive a frozen `GameReadView`. `AudioManager` composes `SoundEffectPlayer` and `MusicPlayer`. The authored Pirate Adventure OST loops continuously after the first click/touch/key, including during menus, paused combat, results and restarts. Options includes an independent Music volume control; Sound and master Volume affect both channels. Refresh requires another user gesture.

`src/application` owns preferences and record repositories; `src/infrastructure` supplies browser storage, Axios and the origin-local MSW server. Dependencies are supplied through the composition root, not exported global managers. [ARCHITECTURE.md](ARCHITECTURE.md) documents the ownership map and extension workflow.

Use `npm run format` to format source, `npm run format:check` to check it, and `npm run architecture:check` for filenames, class/component ownership and domain dependency boundaries. `npm run lint` includes the architecture check. `.editorconfig` requires UTF-8 and consistent indentation. `PIRATE_TEST_PORT` optionally selects an isolated fresh Vite origin for E2E checks.
