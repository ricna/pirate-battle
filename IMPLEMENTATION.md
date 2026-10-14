# Engineering standards — Pirate Battle

Mandatory rules for every change to this repository, by developers and coding agents alike. [AGENTS.md](AGENTS.md) explains the workflow and where to find things; this document defines how code must be written and reviewed. Product and design decisions are recorded in [DECISIONS.md](DECISIONS.md), the current design in [ARCHITECTURE.md](ARCHITECTURE.md) and client-editable values in [CONFIGURATION.md](CONFIGURATION.md).

These are review criteria. Existing code that predates a rule is debt to fix when it is touched, not a precedent to repeat. A rule changes only through an explicit decision recorded in this document.

## 1. Readability and maintainability

- Use descriptive English names tied to domain responsibilities. Prefer `WeaponController`, `ShipProfile` and `applyDamage` to generic managers, abbreviated variables or vague utility bags.
- Give each module/class one cohesive responsibility. Split responsibilities when their reasons to change differ; avoid both a giant GameManager and gratuitous layers with no purpose.
- Write readable, formatted code with clear control flow. Do not compress several fields, unrelated statements or entire methods onto one line in new or rewritten code. Existing compact code is not the readability target.
- Keep functions focused. Use guard clauses and named helpers when they clarify intent. Document the reason for a non-obvious algorithm, invariant, unit or resource lifetime, rather than narrating every statement.
- Keep data definitions separate from algorithms. A reviewer must find a ship's speed, sprite and weapons without searching through movement, rendering or AI code.
- Keep imports/dependencies intentional. Do not introduce libraries, frameworks, inheritance layers or dependency-injection containers without a concrete need in this codebase.
- Preserve strict TypeScript and existing lint rules. Handle indexed/optional values explicitly. Use `unknown` plus validation at untrusted boundaries; avoid `any`, unsafe assertions and suppression comments that hide a broken contract.
- A non-null assertion needs an established local invariant. Validate once at the boundary and express that invariant in the type where practical.
- Remove obsolete code/imports when replacing behavior. Do not leave competing implementations or commented-out alternatives.
- Improve touched code within the task's scope. Document important existing debt instead of rewriting unrelated systems during an urgent fix.

### Module and directory conventions

Use PascalCase for source module filenames, matching the primary class or React component; contract and pure-function modules use a descriptive PascalCase domain name. `main.tsx` and `vite-env.d.ts` are framework entry/declaration exceptions. Hooks retain React's `use` function prefix and live in PascalCase modules under `ui/hooks`.

Keep folders lowercase and group them by responsibility: `application` composes services and application workflows; `game` owns configuration, contracts, entities, systems, factories, runtime, input, math, assets, rendering and presentation; `infrastructure` owns network, storage and browser adapters; `ui` owns screens, components, HUD, game views and hooks. Public classes/components have individual modules. Do not keep legacy re-export paths after migration.

`GameManager` coordinates domain systems per match. `GameSession` owns browser/Pixi match resources and the fixed-step/render lifecycle. `AudioManager` coordinates dedicated sound-effect and music players for the application lifetime. Managers delegate to focused classes; a manager name does not authorize unrelated responsibilities. Browser services are constructed at the application composition root and injected into React/runtime collaborators. React components and hooks remain idiomatic.

`npm run lint` runs `scripts/check-architecture.mjs`, which enforces lowercase folders, PascalCase module names that match their exported class/component, one public class/component per module and the domain import restrictions in section 2. [ARCHITECTURE.md](ARCHITECTURE.md#team-module-convention-and-composition) maps every folder.

## 2. Object model and encapsulation

The gameplay core uses a class-based domain model: classes, private state, explicit contracts, inheritance for true entity specialization, composition for services, and factories for construction.

### State and access

- Use JavaScript `#private` fields for mutable entity/system implementation state. Use getters for necessary observations and named commands for changes. Prefer `readonly #dependency` for references that never change.
- Do not expose mutable health, position, speed, cooldowns, routes, active collections or pool ownership. Public setters and public mutable fields must not bypass invariants.
- Public commands express permitted domain operations, such as damage or update. Expose only the commands a collaborator actually needs; renderers and UI must receive read views instead of those mutation-capable instances.
- Use `protected` operations for intentional subclass extension, such as steering and sailing. A subclass must not reach into a base class's representation.
- Use readonly types for profiles, observations and read ports. TypeScript `readonly` alone is not runtime immutability: recursively freeze authored configuration and match snapshots using the existing Immutable helpers.
- Prefer frozen getter facades for live read views and detached DTOs for snapshots. Do not return an internal array/Map/Set whose contents a caller can mutate. Shared Pixi textures are renderer resources, not domain state to expose to React.
- Required dependencies belong in constructors or narrow context contracts. Avoid hidden global lookups and static mutable gameplay state.

### Inheritance and composition

Preserve the current hierarchy:

```text
Entity
├── Ship
│   ├── PlayerShip
│   └── EnemyShip
│       ├── EnemyChaser
│       └── EnemyShooter
├── Projectile
└── Effect
```

`Entity` owns identity/position. `Ship` owns common health and movement invariants. `EnemyShip` owns shared navigation behavior. Concrete ships specialize their update behavior. A ship has a weapon controller; it does not inherit from one. GameManager coordinates systems instead of implementing every rule itself.

React components retain functional components and hooks. Pure geometry functions and serialized data interfaces remain appropriate. Do not convert every function, DTO, component or hook into a class to claim “100% OOP.” Complete encapsulation means controlled state ownership, not mandatory inheritance everywhere.

## 3. SOLID review criteria

| Principle | Required application in this project |
| --- | --- |
| Single responsibility | Entity state, weapons, spawn, damage, effects, collision, rendering, audio, network and UI have distinct owners. GameManager orchestrates them. |
| Open/closed | Add a normal enemy subtype through a profile, subclass and factory registration. Do not scatter enemy-ID branches throughout GameManager or renderer. A genuinely new capability may require an explicit contract extension. |
| Liskov substitution | Any registered EnemyShip obeys the same update, movement, life and cleanup contracts. It must not weaken invariants or surprise callers with incompatible behavior. |
| Interface segregation | Keep contracts small and role-specific, following ICollisionWorld, IShipFactory, IProjectileEmitter and read views. Avoid a service exposing all internals to every consumer. |
| Dependency inversion | Domain behavior uses injected contracts/context commands. Do not import React, Pixi, Axios, browser storage or Web Audio into entity behavior to perform infrastructure work. |

Use manual constructor/context injection at the composition root. Add abstractions to support real responsibilities and variation, not a ceremonial interface for every helper.

## 4. Configuration and magic values

Static configuration classes are authored data. They contain recipes/defaults, not active runtime instances. Constructors/factories turn profiles into instances with independent state.

| Location under `src/game/configuration/` | Owner of the data |
| --- | --- |
| `PlayerShipConfig.ts` | Player health, collider, movement and weapon mounts |
| `EnemyChaserConfig.ts` | Chaser movement, health, ram/AI data and loadout |
| `EnemyShooterConfig.ts` | Shooter movement, health, range, firing/navigation parameters |
| `ProjectileConfig.ts` | Projectile identity, damage, initial/max speed, acceleration, braking, radius, TTL, sprite and dimensions |
| `ShipVisualConfig.ts` | Ship PNG selection, damage stages, dimensions/orientation, health metadata and fire frames |
| `FactoryConfig.ts` | Explicit profile-to-constructor registrations |
| `GameDefaults.ts` | map/balance version, seed, spawn points/weights/caps, pools, effects, rules and runtime budgets |
| `InputConfig.ts` | Authored keyboard/touch bindings |
| `AudioConfig.ts` | Cue/event mappings, loops, voice budget, mix and audio variation parameters |
| `../contracts/GameConfig.ts` | Readonly configuration contracts |
| `GameConfigFactory.ts` | Validation, cloning and freezing a new match snapshot |

### No magic numbers or scattered strings

- Every tunable gameplay value belongs to an appropriate profile/configuration class: acceleration, braking, maximum speed, turn rate, health, damage, ranges, cooldowns, barrel offsets, TTL, AI intervals, spawn limits, capacities, thresholds and runtime budgets.
- Entity types, actions, allegiances, status, end reasons and game events use named domain symbols in `game/contracts/GameDomain.ts`, not repeated arbitrary string comparisons.
- Asset names belong to authored visual/audio profiles or explicit asset manifests. Never derive a required ship sprite from an enemy number or select a substitute on error.
- Shared API paths, persistence keys and other infrastructure identifiers should have an authoritative definition in their owning data module. Do not put network/UI constants in a ship profile simply to centralize everything.
- UI copy belongs to UI modules; shared messages/constants should have a clear owner. A new localization system is not automatically required. Algorithm code must not depend on duplicated presentation strings.
- Mathematical identities, zero initialization, array indexes, boolean branches and algorithmic identities such as `Math.PI` may remain inline when their meaning is inherent. Do not invent configurable “zero” or “one.” A tunable tolerance, budget or design threshold is not a mathematical identity.
- Defaults must not be embedded in constructors, AI methods, renderers or fallback expressions. If an authored required setting is absent/invalid, report it instead of silently choosing a new default.

### Validation, units and snapshots

- Validate finite numbers, positivity/non-negativity, integer capacities, ranges, unique IDs, registered references, asset names and compatible thresholds at boundaries. Reject an invalid profile before the battle starts.
- Distances/dimensions use logical world pixels; speed uses pixels/second; acceleration/braking uses pixels/second²; angles use radians; turn speed uses radians/second; gameplay durations use seconds. Label milliseconds explicitly where a UI/runtime interface uses them.
- Ship acceleration/braking and projectile parameters are independent per profile. A change to one ship must not silently change another's movement.
- Each new match receives a cloned, recursively frozen GameConfig. Editing source data must not mutate an existing match snapshot.
- Options override only the documented public settings: session duration, spawn interval, sound, master volume and music volume. They do not overwrite authored speed/damage/sprite profiles. Persisted Options may take precedence over newly shipped defaults.
- Input/audio application settings are authored separately; do not misrepresent them as mutable per-entity combat state or assume every audio setting is already serialized in GameConfig.
- Adding a gameplay setting also requires its typed contract, validation, snapshot serialization, configuration identity and client instructions to be considered together.
- Completed records preserve the gameplay snapshot. Change `GameDefaults.Version` for released map/rule/balance changes. The full snapshot fingerprint separates ranking configurations; it is not cryptographic security.
- Source configuration edits require recompilation for a shipped build. A remote admin editor is a separate feature, not provided by static classes or Vite hot reload.

## 5. Factories and extension

Use `ShipFactory` and `ProjectileFactory` for their existing construction/activation responsibilities. `FactoryConfig` owns constructor mappings; it is not a service locator or a bag of live objects.

To add an enemy:

1. Define a unique profile ID and an explicit static configuration class, including movement, health, AI/weapon data and visual references.
2. Implement an EnemyShip subclass that follows the update/context contract and base invariants.
3. Register its profile and constructor in FactoryConfig. Validate duplicate/missing registrations.
4. Add its intended spawn weights/initial-sequence participation in GameDefaults; validate safe spawn positions for its radius.
5. Extend contracts only when the feature genuinely needs a new capability. Keep renderer selection data-driven through the visual profile.
6. Test the distinguishing behavior and registry path, including a custom type absent from built-in enemy-ID branches. Update CONFIGURATION and relevant architecture documentation.

For a new weapon/projectile, author a profile and mount, then use the existing emission, cooldown, collision and pooling contracts. Do not add independent projectile allocation/removal inside an enemy method.

## 6. Pooling

- Projectiles and transient effects use bounded logical pools. Their Pixi sprites use separate bounded visual pools. Avoid allocation/destruction of a new Sprite for every shot.
- `initialCapacity`, `growthSize` and `maxCapacity` are authored, validated configuration values. Prewarm the initial allocation and grow in configured blocks only up to the maximum.
- Acquire/release tracks ownership. A double return, foreign return or factory that supplies the same instance twice is a programming error, not a condition to ignore.
- Each logical activation receives a fresh match-wide identity and fully initializes profile, owner/allegiance, position, direction, speed, damage and age/TTL. Return clears references and previous activation state.
- Each visual activation restores its authored texture, size and transform. Return hides it and resets position, rotation, scale, alpha and tint. Future pooled features must reset every additional mutable property they introduce.
- Return projectiles on impact, expiration, out-of-bounds and match disposal. A projectile applies damage at most once and resolves its earliest collision.
- Reserve capacity for the entire salvo before firing. If the pool cannot hold all barrels, defer the complete salvo without consuming cooldown. Never produce a partial broadside accidentally.
- Effect exhaustion may omit that cosmetic effect within its documented budget. It must not alter damage or scoring. This is intentional bounded cosmetic degradation, not permission to generate substitute assets.
- Visual pools must support the logical concurrency they render. Capacity mismatch fails loudly; do not silently allocate an untracked emergency sprite.
- Expose read-only statistics: capacity, active, available, peak and exhaustion. Size budgets from firing rate, barrel count, TTL and active enemy cap, then measure the actual build.
- Dispose all match-owned logical/visual objects at teardown. Pooled inactive objects do not justify retaining an abandoned match.

## 7. Simulation, input, collision and AI

- Run gameplay on the configured fixed step, independently of render FPS. Use the capped accumulator for real-time frames. HUD updates remain low-frequency snapshots, not one React state update per entity per simulation step.
- Use active simulation time for match duration, cooldowns, navigation, projectile TTL and effects. Pause freezes these and momentum. Clear input and accumulated wall time on pause/resume; resume requires a user action.
- Preserve simultaneous movement and firing, independent weapon cooldowns, multiple keyboard/pointer input sources and pointer capture/cancellation. Release inputs on blur, hidden tab and teardown.
- Combat is landscape. Touch devices in portrait show the rotated landscape layout and keep playing; only a portrait arena, such as a narrow desktop window, pauses combat. Resize and rotation change display scale, not world coordinates, speed or collision geometry.
- Ship motion applies acceleration/braking and maximum-speed limits from its own profile. Use bounded movement substeps/collision handling for fast configured ships; do not rely on frame rate to prevent tunneling.
- Use authored island colliders and arena bounds. Projectile collision is swept and resolves the earliest contact against the applicable obstacles/ships.
- Mark death immediately; exclude dead entities from subsequent damage/actions. Score each credited kill once. Chaser ram self-destruction does not grant a player kill point. Player death ends active scoring/combat.
- AI is local game behavior, not a remote generative service. Use configured turning, range, sight and route/repath parameters. Preserve obstacle-aware navigation and radius clearance.
- Spawns use explicitly authored points, configured safe distance/separation and active caps. Validate positions before combat; skip an unsafe interval rather than spawn inside an island/player.
- Keep gameplay randomness seeded and reproducible. Audio variation must not consume or alter the gameplay PRNG sequence.
- Ship-to-ship collision is required: player/enemy and enemy/enemy hulls must not pass through one another. Resolve contact without bypassing encapsulation or trapping ships inside islands. Preserve the existing Chaser ram damage/self-destruction and no-score rule.
- Significant island/ship contacts need bounded contextual impact feedback. Sustained contact must not generate sound/effects every frame. Keep contact thresholds, cooldowns and presentation settings configurable.
- Different scoring rules, arbitrary map shapes or new controls remain behavior changes requiring an explicit scope and validation.

## 8. Authored assets and missing references

- The Tiled map and supplied visual/audio assets are the authored source of truth. Do not repaint, redesign islands or move colliders to hide a code defect.
- Preserve the documented finite orthogonal map, external tileset and named layer contracts. Individual collider names are optional; collision layer name/type/geometry are functional contracts.
- Use the supplied reference compositions and editable atlas/PNG pieces for UI. A screenshot of a menu is a reference, not a replacement for working controls.
- Respect atlas metadata, logical versus retina sizes, nine-slice borders, label rectangles and health-fill regions. Never guess a collider or fill region from a visually convenient screenshot.
- Missing required images, profile/constructor registrations, map references, shapes or settings must fail visibly with useful diagnostics. Do not create fallback objects, UI controls, scene elements, materials, shaders, effects or assets.
- React-authored UI and Pixi instances rendering explicitly referenced authored textures are part of the authorized design. They are not permission to generate emergency content when required references are absent.
- Compose the authored static tile layers at the configured positive integer resolution, then scale one cached map surface. Preserve Tiled flips and layer order. This prevents cracks between fractional-scale tile quads.
- A RenderTexture used to cache existing authored map content is a rendering resource, not a newly authored substitute asset. Keep ownership/disposal explicit.

## 9. React, Pixi and lifecycle

- React owns canvas markup, menus, forms, dialogs, HUD and touch controls. CSS owns presentation/layout. Pixi owns the arena and in-world entity indicators attached to that canvas. Do not implement required React menu screens entirely in Pixi.
- UI renders semantic state and sends input/application commands. It must not directly mutate ship instances, advance combat rules through network callbacks or duplicate GameManager state as mutable React entity lists.
- Domain entities/systems must not depend on browser rendering APIs. Renderer reads domain views and manages its own Pixi state; moving a sprite does not move the domain entity.
- Each match owns GameManager, input controller, renderers, animation loop, observers/listeners and match resources. Application-level decoded textures/audio caches have intentionally different lifetimes.
- Async initialization must tolerate React Strict Mode, unmount during loading, retry and restart. Serialize setup as necessary, cancel requests and check disposal after awaits. Clean up failed/abandoned partial setup.
- Cleanup cancels RAF, disconnects observers, removes listeners, clears input, stops match loops, releases pools and destroys match-owned containers/subtextures/map surfaces/application resources.
- Destroy owned texture frames/render surfaces without destroying shared base image sources. Release retiring GPU-context resources through supported Pixi APIs while preserving intentional decoded-image caches.
- Never remove React's owned canvas behind its lifecycle. A retry gets a fresh React-authored canvas; abandonment does not submit a completed result.
- Preserve stable render layers for ships/projectiles/effects as pools grow. Do not let creation order change intended draw order.
- `#root` is the size container of every screen. Size layout with container units and `@container app` queries, never viewport units or media queries, so the rotated portrait layout and its top-layer dialogs keep their landscape sizes. Read safe-area insets through the `--safe-*` properties. Convert pointer movements into layout axes (`LayoutAxes`) before deriving a direction from them.
- Use semantic buttons/forms, labels, visible loading/error/retry states, accessible HUD values, dialog focus containment and focus restoration. Verify touch cancellation, orientation and keyboard use.

## 10. Audio

- Use authored WAV effects, the explicit MP3 soundtrack and AudioConfig cue/event mappings. Domain logic emits semantic events; it does not play files through Web Audio directly.
- Unlock audio through a user gesture. Cache decoded buffers and keep a bounded voice budget. Coalesce/rate-limit repeated events using authored parameters.
- Keep any variation lists, pitch ranges, gains and cooldowns in configuration. Audio variation is independent of deterministic gameplay randomness.
- Respect persisted mute/volume. Stop ocean/sailing loops on pause, leaving combat and teardown; disconnect finished sources and prevent overlapping loop duplication on restart.
- Surface decode/load failures without replacing missing audio with synthesized sounds. Existing audio-load failure behavior is nonfatal and visible; required visual/configuration failures still block the battle.
- Do not claim browser/device audio compatibility without testing it.

## 11. Network, persistence and records

- Preserve Axios HTTP contracts, TanStack Query query/mutation lifecycle and MSW mock scenarios. Do not replace requests with ad hoc UI-local fake lists to bypass errors.
- Query keys include the resource identity, relevant player/configuration, page and scenario revision. Propagate AbortSignal, limit retries and prevent stale responses from replacing the current view.
- API failure does not pause or prevent independent combat. Lists need loading, empty, error, retry and pagination states.
- On completion, persist the last result and outbox entry before POST. Use a stable match UUID, serialized submission and idempotent same-ID retries, including timeout after server commit.
- Preserve pending submissions across refresh when storage works. Do not submit abandoned/incomplete battles or generate a new ID on retry. Another match may start while an old submission remains pending.
- Validate persisted/external data. Surface storage parse/quota/unavailability failures; do not pretend persistence succeeded. Document any schema/default compatibility change.
- Preserve ranking identity based on the gameplay snapshot and deterministic tie ordering. Keep UTC dates and player history ordering consistent.
- Keep MSW request handling restricted to `/api/`; static images/audio/modules must not pass through unnecessary response cloning. Regenerate the worker with `npm run mocks:init`, which reapplies the filter.
- The mock server is browser/origin-local, not a production shared leaderboard. Do not describe client fingerprints, local fixtures or localStorage as server security.

## 12. Verification and performance

Choose verification based on the behavior changed. For gameplay/configuration/lifecycle work, run the relevant domain and browser regressions; before delivery run the required complete checks:

```sh
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

- Tests verify observable invariants, extension paths and actual behavior. Do not add tests that only mirror implementation expressions or test every reversible copy/documentation change.
- A regression fix should have a focused reproduction when the failure is meaningful: pool reset/ownership, salvo exhaustion, read-view encapsulation, invalid profiles, custom enemy registration, swept collision, input/pause, persistence/idempotency and fractional rendering are examples.
- Test desktop and landscape mobile input/layout. Check multiple pointers, keyboard, resize/DPI and failure recovery for affected features.
- Keep tests isolated and deterministic, using seeded gameplay, controlled dates and bounded test-clock advancement. Observe DTOs; never add test hooks that assign health, score, positions or inject fake combat state.
- `?test=1` may advance the existing simulation clock within its configured limit. `?profile=1` observes real-time behavior and must not bypass gameplay or advance time artificially.
- Inspect actual rendered output when changing visuals. Use supplied references/metadata and save useful evidence. Do not update screenshot baselines just to conceal a regression.
- Everyday and focused runs (`npm run test:e2e`, `npx playwright test …`) write only Git-ignored output. Only `npm run test:deliver` (complete suite, no arguments) writes the delivered `reports/playwright`, `reports/playwright.json`, `reports/TEST-SUMMARY.md` and evidence captures; see [Delivered reports](#delivered-reports) below. A `PIRATE_TEST_REPORT_DIR` or CLI reporter override may write another output directory; verify the report really belongs to the claimed run.
- Profile an optimized build after changes to movement, spawn pressure, pool limits, TTL, allocation/rendering or audio budgets. Record revision/configuration, environment, workload, frame metrics, entity/pool peaks and memory across restarts.
- Distinguish live objects, intentional caches, JIT warmup and retained match resources. A rising heap alone is not proof of a leak; passing a short run is not proof of zero leaks.
- Do not reuse old performance measurements as evidence for a changed build. Emulation is not physical-device testing; report browser/device limitations and any checks not run.
- For documentation-only changes, verify paths/links, consistency and diff integrity instead of rerunning the whole game suite without a reason.

### Test infrastructure

- `.gitattributes` keeps LF checkouts; Prettier covers `src`, `tests`, `scripts` and root configuration files.
- Screenshot baselines exist for Windows (`*-win32.png`) and Linux (`*-linux.png`). Linux baselines are produced only by `npm run test:docker`, which runs the pinned `mcr.microsoft.com/playwright:v<version>-noble` image used by CI. Update a baseline only for an intentional visual change and say so in the commit. Refresh the Linux baselines once per batch of visual changes, before pushing, not after every adjustment.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, build and the complete suite (`npm run test:deliver`) inside that image and uploads the reports.
- The `production-smoke` project runs against the optimized preview build or `PIRATE_SMOKE_URL`. `accessibility.spec.ts` audits every screen with axe (WCAG 2.1 AA).
- MSW scenarios are data (`NetworkScenarios`) validated against `NetworkConfig.RequestTimeoutMs`; every scenario has a browser test.
- Every mocked response carries `NetworkConfig.MockHeader`. Keep `NetworkSimulator.withRecovery`: an unmarked `/api/` response means the browser restarted the worker, so the page re-announces itself (`MOCK_ACTIVATE`) and retries once. Never call MSW `stop()`/`start()` for this; the worker unregisters itself when its last client closes. `RecordsApi` validates every response.
- Builds publish their commit (`meta[name=build-commit]`, `/version.json`, How To Play). Delivered reports and profiles must name the exact revision they measured.
- A deployment must serve the delivered revision with every asset and the MSW worker. Confirm `/version.json` and run `npm run test:smoke` with `PIRATE_SMOKE_URL` against it before calling it published.

### Delivered reports

The product brief requires the HTML report and test evidence in the repository, so `reports/` is versioned, but only a deliberate delivery run may change it. Playwright's HTML reporter replaces its whole folder on every run, so an everyday run writing there would replace the complete report with a partial one.

- `tests/TestReports.ts` owns the report, output and evidence paths for `playwright.config.ts` and the specs. Without `PIRATE_TEST_DELIVERY=1`, a run writes only Git-ignored output: `playwright-report/`, `playwright-report.json` and `test-results/`, with evidence under `test-results/evidence/`.
- Specs save screenshots and audit files through `evidencePath()`. Never hard-code a `reports/` path in a test.
- `npm run test:deliver` (`scripts/deliver-test-report.mjs`) enables delivery mode, refuses arguments so a delivered report always covers the complete suite, and rewrites `reports/TEST-SUMMARY.md` even when a test fails. `npm run test:docker` refreshes `reports/linux` only without arguments; a focused container run copies its report to `test-results/linux`.
- Deliver evidence after committing the code it measures. Confirm the summary names that commit without uncommitted source/test changes, then commit `reports/` on its own. Never commit a report from an everyday run.

## 13. Definition of done

An implementation is ready when all applicable items are true:

- The requested behavior works and preserves the documented gameplay/data contracts.
- State stays encapsulated; collaborators receive only necessary read/command capabilities.
- Tunable values and asset selections have explicit authored profiles, validation, units and ownership.
- Factories/registrations support the intended variation without scattered type branches.
- Pooled objects fully reset; growth/exhaustion and disposal obey the configured policies.
- Required references fail clearly; no generated substitute content hides a missing asset or setting.
- React/Pixi/domain/network/audio boundaries and resource lifetimes remain coherent.
- Affected desktop/mobile, failure, pause/restart and persistence scenarios have appropriate evidence.
- Required checks pass, or a remaining failure is reported plainly with its cause and scope.
- Affected documentation is updated in the same change (see the documentation map in [AGENTS.md](AGENTS.md#documentation-map)).
- The final diff/commit contains only reviewed authorized work. Unrelated concurrent edits are preserved.
- Reported tests/performance/publication claims refer to the exact revision tested or clearly labeled historical evidence.

These are review criteria, not a claim of perfection. If a requirement is not met, fix it within scope or record the concrete remaining limitation; do not silently weaken the contract.
