# Client configuration guide

## Where to edit

Game defaults are authored TypeScript data in static configuration classes. The classes and their data are frozen at runtime; changes are made in source. They are the equivalent of source-controlled ScriptableObject profiles; they are not Unity assets or .NET assemblies. No Inspector, external server or environment variable is required. Edit the files, run the checks, and rebuild the static application.

| File under `src/game/configuration/` | Editable defaults |
| --- | --- |
| `PlayerShipConfig.ts` | Player health, circle radius, movement, weapon mounts and visual profile |
| `EnemyChaserConfig.ts` | Chaser health, movement, navigation and ram damage |
| `EnemyShooterConfig.ts` | Shooter health, movement, navigation, range, aim cone and weapon cooldown |
| `ProjectileConfig.ts` | Front/broadside/enemy projectile damage, speed, acceleration, drag, TTL, radius and sprite dimensions |
| `ShipVisualConfig.ts` | Each ship's explicit intact/damaged/heavily damaged sprites, hull dimensions, fire and health indicator assets |
| `GameDefaults.ts` | Simulation clock, seed, spawn points/weights/cap, pool capacities, effects, warnings and runtime budgets |
| `FactoryConfig.ts` | Enemy profile → concrete subclass registrations |
| `InputConfig.ts` | Keyboard bindings, pause keys and touch command labels/icons |
| `CameraConfig.ts` | Display-only compact viewport thresholds, visible map area fraction and minimum ship scale; see [MOBILE.md](MOBILE.md) |
| `AudioConfig.ts` | UI cues, gameplay-event sound variants, pitch ranges, repeat cooldowns, voice priorities/budget and mix gains |
| `CrewConfig.ts` | Rescue trigger radius, health per survivor and independent seed salt |
| `CollisionConfig.ts` | Hull separation, slide iteration budget, impact threshold, repeat cooldown and island impact damage per allegiance |
| `PresentationConfig.ts` | Crew/debris/projectile-trail profiles, the owner-authored ship trail, guaranteed crew capacity, cosmetic pools, recoil/tint/shake, floating labels, water animation and terminal/result durations |
| `AssetConfig.ts` | Shared default atlas sources and explicitly registered standalone authored textures |

Network and mock-server settings are infrastructure data, not gameplay balance: `src/infrastructure/network/NetworkConfig.ts` (API base URL, Axios timeout, query retries, page size) and `NetworkScenarios.ts` (each MSW scenario's deterministic latency, failing endpoints, fixture counts and post-commit delay). Startup fails if the slow scenario stops finishing before the timeout or the timeout scenarios stop exceeding it.

`GameConfigFactory.create()` gathers the registered profiles, validates them, clones their data and recursively freezes the match snapshot. `GameManager` also isolates an externally supplied configuration. Objects passed to ships cannot remain mutable aliases to their original profiles.

## Example: change player movement

Edit `PlayerShipConfig.Default.movement`:

```ts
movement: {
  initialSpeed: 0,
  maxSpeed: 320,
  acceleration: 900,
  deceleration: 1200,
  turnSpeed: 2.6,
},
```

Positions/radii are logical pixels; speed is pixels/second; acceleration and deceleration are pixels/second²; turn speed is radians/second. Holding Forward increases speed by `acceleration * dt` up to `maxSpeed`. Releasing it reduces speed by `deceleration * dt` down to zero. Ships continue coasting while braking and can turn during that time. Pause freezes speed along with the rest of the simulation; after Resume, cleared inputs cause normal braking.

With initial speed zero, 900 acceleration and a 320 maximum, full throttle takes approximately 0.36 seconds to reach maximum speed. Change enemy movement in its own profile; the player does not share those values. Ship acceleration/deceleration/turn speed must be positive. Initial speed must be non-negative and at most the maximum.

Projectile speed uses `clamp(speed + (acceleration - deceleration) * dt, 0, maxSpeed)` during flight. Existing cannonballs start at their maximum speed with both acceleration and deceleration zero. For an accelerating shot, lower `initialSpeed` and increase acceleration. For a slowing shot, set deceleration greater than acceleration. These values are reset from the selected projectile profile on every pooled activation.

## Weapons and sprites

Player mounts independently configure angle offset, muzzle distance, barrel offsets, cooldown, sound event and projectile profile. Port/starboard use ±π/2 angle offsets and `[-22, 0, 22]` longitudinal offsets, producing three parallel balls. Changing one mount's projectile does not alter the others. IDs identify input commands and must be unique per ship.

Replace explicit sprite paths such as `ships/ship_1` in the selected visual profile. These are asset-relative names without `.png` under `assets/png/default/`. All configured stages, health textures, projectile sprites and effects are collected and loaded before Play. Missing files fail visibly; no replacement texture or ship is generated. Ship sprites must exist as frames of the shared ship atlas XML; any other authored image must be registered explicitly in `AssetConfig.Standalone`.

Damage/health stages are listed in descending minimum-health ratios with a final zero threshold. Selection uses `health / maxHealth > minimumHealthRatio`; at the exact threshold the next stage applies. Hull dimensions, orientation offset and health-indicator layout are profile data, so new enemy types do not require a renderer switch. Health metadata must match a supplied frame entry in `assets/spritesheet/ui_sheet.json`.

## Factory extension example

To add a different enemy behaviour:

1. Create a static configuration class whose `Default` satisfies `ShipProfile`, with a unique ID and explicit assets.
2. Implement a subclass of `EnemyShip` and override `update(context: EnemyContext)`. Reuse protected `follow`, `steer`, `sail` and `cruise` methods or implement a different movement policy. Use context commands for firing/damage.
3. Register `{ profile: NewEnemyConfig.Default, constructor: NewEnemy }` in `FactoryConfig.Enemies`.
4. Add its ID and positive spawn weight to `GameDefaults.Spawning.weights`. Optionally include it in `initialSequence`.
5. Check that every authored spawn accommodates its radius; run the checks below.

GameManager, projectile collision/scoring and ArenaRenderer do not branch on enemy kind. `ShipFactory` uses the registration, the new subclass supplies behaviour, and its profile supplies rendering. The core tests demonstrate a third registered subclass without changing these systems.

The initial sequence guarantees the first successful enemy types; subsequent spawns use normalized positive weights. Player distance and existing-ship separation filter authored points. If all points are unsafe or the active cap is reached, that interval is skipped. No synthetic spawn position is created.

`GameDefaults.Spawning.hullSeparation` is the minimum distance between a spawn point and an existing enemy, as a multiple of that enemy's hull radius plus the largest registered enemy hull radius (the profile is rolled after the point). It must be at least 1, so a new hull never starts inside another. `safeDistance` must be at least the player hull radius plus the largest enemy hull radius. A new enemy faces the target when a straight sailing line is clear, otherwise the first corner of its route, so it does not start by turning into an island.

## Enemy navigation

Every enemy profile has an `ai` block. `EnemyShip.follow` uses it each fixed step:

1. **Goal.** When a straight line to the target keeps the navigation coast clearance (`rules.navigationInflation` tiles beyond the ship radius), the target is the goal. Otherwise the ship follows a grid route reduced to its corners. Routes are recomputed every `routeInterval` seconds and when the last corner is reached. A corner is dropped within `waypointArrival` pixels, or earlier once the next corner is directly reachable. A target hugging a coast can sit in a cell that is blocked for the inflated enemy radius; the route then ends at the nearest reachable cell, never at an empty route.
2. **Separation.** Other enemies closer than `separationDistance` pixels push the desired heading away, scaled by `separationWeight` and by how close they are.
3. **Avoidance.** A probe of up to `lookAhead` pixels (never past the goal) measures free water along a heading against islands, arena edges and nearby enemy hulls. When the desired heading is blocked, candidates fanned out every `avoidanceStep` radians are tried on alternating sides, starting with the side used last; the closest fully clear heading wins, otherwise the most open one.
4. **Stuck recovery.** If a moving ship travels less than `stuckDistance` pixels in `stuckSeconds`, it sails towards the most open water for `recoverySeconds`, tries the other avoidance side and then replans.
5. **Helm and speed.** The steered heading follows the chosen heading at `headingResponse` per second (aiming at the target while holding is direct), limited by the profile `turnSpeed`. Speed falls linearly to `turningSpeedRatio × maxSpeed` as the heading error reaches `movementCone`, and also near a coast ahead, so ships arc around corners instead of pivoting or scraping. A ship facing a coast directly stops until it has turned away.

A Shooter holds position and keeps aiming while it sees the target within `range`; it fires when the aim error is below `firingCone`. A Chaser never stops and never avoids its target, so ramming still applies `ramDamage`.

| Field | Unit | Default (both enemies) |
| --- | --- | --- |
| `routeInterval` | seconds | 0.75 |
| `waypointArrival` | pixels | 40 |
| `movementCone` | radians | 1.2 |
| `lookAhead` | pixels | 150 |
| `avoidanceStep` | radians, at most π | 0.3 |
| `turningSpeedRatio` | fraction in (0, 1] | 0.3 |
| `separationDistance` | pixels | 170 |
| `separationWeight` | non-negative factor | 1.2 |
| `stuckSeconds` / `stuckDistance` | seconds / pixels | 1 / 20 |
| `recoverySeconds` | seconds | 0.9 |
| `headingResponse` | 1/second | 6 |

All of them are validated before a match. Navigation is deterministic and consumes no gameplay randomness.

## Pool sizing and exhaustion

`GameDefaults.Pools` configures logical and Pixi pools independently for projectiles and effects:

```ts
projectiles: { initialCapacity: 32, growthSize: 16, maxCapacity: 192 },
effects: { initialCapacity: 16, growthSize: 16, maxCapacity: 256 },
```

Capacity grows in bounded blocks when needed, then released instances remain available. Maximums must accommodate at least the largest single salvo. If capacity cannot hold an entire salvo, the weapon defers it and retains its previous cooldown, allowing a later attempt when capacity returns. No partial broadside is emitted. Visual effects reaching their separate cap are omitted; damage and scoring still occur. Required asset errors always fail rather than using substitutes.

A practical upper estimate for steady simultaneous cannonballs is the sum of `barrels * ceil(lifetime / cooldown)` across all simultaneously firing mounts and active shooters, plus headroom for same-step overlap. Higher spawn pressure, TTL or faster weapons may require a larger maximum. The default 192 supports the default front/broadside mounts and 28-shooter budget. Initial capacity 32 avoids paying the entire upper-budget allocation at startup.

Each activation receives a new match-wide ID and resets profile, owner, position, heading, speed and age. Return clears them. Pixi sprites are hidden and reset, then receive their configured texture and dimensions on reuse. Double/foreign returns throw. Disposing a match releases all entities and destroys its pooled sprites while preserving shared cached base textures.

Opt-in `?test=1` / `?profile=1` observations include logical and renderer pool statistics: capacity, active, available, peak and exhaustion counts. Clock advancement exists only in test mode. Neither interface exposes commands that write life, position or score.

## Options, snapshots and delivery

Options controls bounded session duration, spawn interval, sound, master volume and music volume. They override those default settings for new matches and persist locally. They do not overwrite static ship/projectile profiles. Already-saved Options retain their saved values when the shipped defaults change; use Options to change them or remove only `pirate.options` from browser storage when intentionally testing new defaults.

Gameplay profiles, pools and rules are frozen for each match. Audio mute/volume are application-level settings. Input bindings and the audio mix table are authored application configuration. Source editing during development may trigger Vite's reload; do not treat a hot reload as an in-game balance editor.

Every completed match stores its full gameplay snapshot. Configuration identity includes version, seed, duration, spawn interval and an FNV-1a fingerprint of that serialized snapshot, so changing speeds or weapons separates ranking groups automatically. Bump `GameDefaults.Version` for a release with changed rules/map geometry. The fingerprint is a grouping aid, not a cryptographic integrity/security guarantee.

```sh
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Publish the new `dist` together with the matching source revision. Re-run optimized profiling after changing movement, spawn pressure, pool limits, projectile TTL or rendering budgets. Source configuration is compile-time authored data; shipped values cannot be edited through a remote customer admin panel.

## Shipped movement feel and static-map rendering

For standalone gameplay art, `AssetConfig.Standalone` maps a logical key to its explicit file URL. `PresentationConfig` selects that key and sets logical display dimensions/lifetime. The owner's Krita-exported `assets/authored/Splash.png` now supplies `authored/water_splash`; its 64×64 source is displayed at the configured 45×45 size for 0.45 seconds. To replace the image without changing the effect's identity, change the mapped URL, preserve the key, and reload the page to discard the application texture cache. Network confirms loading; a breakpoint in `PresentationRenderer.draw()` confirms the particle key, `texture.source.label`, frame and actual sprite assignment. Atlas textures share a source URL, so inspect their frame rectangle too. Missing required references fail instead of selecting substitute art.

Player defaults now use acceleration 230 pixels/s² and braking 115 pixels/s², giving approximately one second to maximum speed and two seconds to stop in unobstructed water. Full-speed braking distance is approximately 230 logical pixels. Test in free water, since obstacles can stop travel before braking finishes. Enemy profiles retain their independent settings.

GameDefaults.Runtime.staticMapResolution is a positive integer (default 1). Authored tile layers are composed once at that resolution into an owned render surface before fitting the whole arena, preventing one-pixel gaps at fractional display scales. This changes rendering only; the Tiled map and its collisions remain authored inputs.


## Application options and continuous soundtrack

Application preferences live in `src/application/configuration/OptionsConfig.ts`, with the typed contract in `Options.ts` and persistence/migration in `OptionsRepository.ts`. Gameplay tuning remains in the game configuration profiles. Defaults: session 120 s, spawn 5 s, Sound On, master Volume 50%, Music volume 100%. Steps are 10 s, 0.2 s and 10% for both volume controls; all volumes are validated in [0, 1]. Existing saved options without `musicVolume` receive only its authored default; existing time, spawn, sound and master volume survive. Invalid stored settings produce a warning. A valid change or Restore saves the complete new schema immediately.

`AudioConfig.Music` explicitly selects the authored MP3 through a bundler-visible URL, identifies it as `pirate-adventure` and sets its mix gain to 0.2. Replace this URL to select another authored track; a missing file must be fixed rather than substituted. Vite includes the MP3 in the production build.

The effective music gain is `masterVolume * musicVolume * AudioConfig.Music.gain`, or silence when Sound is Off. Music streams through one React-authored audio element with loop enabled. It starts on a pointer or keyboard gesture and continues across menus, combat, combat pause, results and repeated matches. Mute or Music volume 0 pauses playback without rewinding; reenabling resumes the same track. Refresh creates a new application lifetime, so a new gesture is required. Browsers may suspend background media independently.

Sound effects remain decoded/cached Web Audio buffers with the configured bounded voice budget. The music element is a separate streaming channel and cannot be evicted by combat effects. Music/audio failures are published to React and shown visibly; a later gesture can retry the authored asset.

### Player-death mix and transitions

`AudioConfig.Cues.GameOver` explicitly selects `extra/576054__istudeny__pirat-battle` (the owner's approximately 14-second WAV). It plays at its authored rate, once per death, with terminal priority. The original `game_over.wav` remains as unused source audio. The recursive WAV manifest supports that registered subdirectory; missing assets still report a load error.

`AudioConfig.DeathMusicGain = 0.08` multiplies the effective OST volume temporarily. The music keeps playing, and persisted master/music options are unchanged. Natural completion of the death cue restores the mix, including after arena teardown; Main Menu/Play Again stop remaining match effects and restore it immediately. A revision guard prevents a retired cue from restoring a later mix. Mute and zero volume continue to apply.

`PresentationConfig.Default.terminalSeconds = 3` is the death destruction window before result reveal. `terminalFadeInSeconds = 1` fades **Game Over** in during this window. `resultFadeSeconds = 1` fades the result screen in and the death text out together; the arena remains alive until their combined 4-second window finishes. Only death ducks the OST.

Time expiry uses `PresentationConfig.Default.victory.seconds = 4` and `victory.fadeOutSeconds = 2`: **You survived! Congratulations!** stays fully visible for the first 2 seconds and fades over the final 2 seconds before Results opens. The session clock drives both opacity and navigation, suspending them in hidden tabs. Durations must be positive and the fade must fit inside the total window; both are frozen in each match snapshot. The stored reason remains `time`, presented as **VICTORY** in Results and Match History. Combat and final-record persistence end immediately for either outcome.


### Crew rescue

`CrewConfig.Default` supplies `radius = 14` logical world pixels, `healthPerRescue = 1` and a dedicated `seedSalt`. Radius and healing must be positive; healing and seed salt must be integers. The trigger must fit inside the crew profile's 16-pixel water clearance. Each survivor is collected by the player's swept hull (`hullRadius + radius`), never by enemies/cannonballs. Restore only missing health; a full-health player leaves crew available. A dead ship cannot heal.

PresentationConfig retains the six authored sprites, motion, 10-second lifetime, foam and guaranteed pool budget; CrewSystem owns authoritative motion. `presentation.rescue` supplies green `color = 0x68ef83`, `offsetY = -28` and `combineSeconds = 0.35` seconds between rescues in the same label. Each additional rescue updates that label and restarts its lifetime; a longer gap starts a new +1. Labels reuse the existing text font/rise/fade/lifetime and bounded pool, with no score reward/pulse. Reduced motion changes decoration without changing rescue geometry.

Balance version `arena_00-v1/balance-v5` introduced rescue-enabled ranking snapshots. Existing Options/completed records remain readable. Survivors and unfinished battles are never persisted; new matches receive frozen crew settings.

### Island collision damage

`CollisionConfig.Default.islandImpactDamage = { player: 1, enemy: 0 }` is the hull damage of each significant island collision, per allegiance. A collision is significant under the same rule as its impact sound and splash: the hull meets the coast at `minimumImpactSpeed` (20 pixels/s) or more, at most once per `impactCooldown` (0.65 s) for the same ship and contact. Pressing against a coast after the hull has stopped therefore costs nothing more; leaving and hitting it again costs another point. Arena borders never cause damage. The damage passes through `DamageSystem` (statistics, damage label, hit flash, low-health warning) with no kill credit, so a player at 1 health can sink against an island. Values must be non-negative integers. Raising the enemy value would let enemies lose health on coasts without awarding points.

Balance version `arena_00-v1/balance-v6` separates ranking snapshots with island damage from earlier ones.

### Ship trail

`PresentationConfig.Default.shipTrail` stretches the owner's `assets/authored/shipt-trail.png` (registered as `authored/ship_trail`) along each moving ship's recent stern path:

| Field | Unit | Default | Meaning |
| --- | --- | --- | --- |
| `sampleSeconds` | seconds | 0.05 | Interval between stern samples while moving |
| `lifetime` | seconds | 0.9 | Age at which a sample leaves the trail; must exceed `sampleSeconds` |
| `minimumSpeedRatio` | fraction of max speed, [0, 1) | 0.15 | Slower ships add no samples, so the trail fades out |
| `sternRatio` | fraction of the visual length | 0.4 | Stern distance behind the hull centre |
| `width` | logical pixels | 26 | Trail thickness |
| `alpha` | (0, 1] | 0.9 | Opacity at full speed; scaled by speed and by the newest sample's age |
| `ropePoints` | integer ≥ 2 | 16 | Vertices of each rendered rope; the path is resampled evenly by length |
| `pool` | capacities | 8 / 8 / 64 | Logical trails and rendered ropes; the maximum must cover the enemy cap plus the player |

The texture is stretched once along the path (strong end at the stern, faded end at the tail), so it never repeats or bleeds. Trails advance on the presentation clock: pause freezes them, they fade after a ship stops or sinks, and match disposal releases every rope. They are cosmetic and never change movement, collision or score. Replacing the image keeps the `authored/ship_trail` key and changes only its URL in `AssetConfig.Standalone`.
