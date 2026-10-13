# Implementation contract — Pirate Battle

**Status:** mandatory project rules for developers and coding agents. Established on 12 October 2026 from the owner's decisions. Read this entire document before starting a new implementation or refactor.

This is the canonical implementation contract. [ARCHITECTURE.md](ARCHITECTURE.md) describes the current design; [CONFIGURATION.md](CONFIGURATION.md) explains client customization; [TESTING.md](TESTING.md) describes verification; [CHALLENGE.md](CHALLENGE.md) preserves the original assignment. This contract defines how future work must be written and reviewed. It does not certify that every existing line already meets every rule.

## 1. Instruction precedence and scope

Current explicit owner instructions take precedence over this document. Preserve the accepted architecture unless the owner changes it. Record accepted changes here so later sessions do not silently revert them. Historical diary entries describe previous stages and do not supersede this contract or current instructions.

- Work in the owner's visible project checkout. The active source repository is `PirateBattle/__GIT__PirateBattle` under the workspace `Project_JungleGaming`.
- `PirateBattle/game-developer-challenge` is a separately downloaded reference checkout. Consult it when needed; never implement, commit or move our work there.
- `PirateBattle/fork-analysis` is reference material, not the implementation target.
- The active remote is the owner's private `ricna/pirate-battle` repository. Inspect remotes before pushing; do not send this implementation to the former public fork or challenge upstream.
- Keep personal Portuguese tutorials in the sibling `PirateBattle/Docs` directory. Do not create Google Docs or move that wiki into the delivered source repository.
- Source identifiers, product UI and client-facing repository documentation remain in English. Explain work to the owner in Portuguese, using Unity/C# comparisons where useful.
- Never delete `Debug.log` unless explicitly asked. Preserve unrelated files and user-authored assets.

## 2. Start-of-session procedure

Before implementation:

1. Read all applicable `AGENTS.md` files and this contract. Check the current task and latest owner instructions.
2. Confirm the active checkout, branch, remote and `git status --short`. Read the relevant diff before editing a dirty file. An existing change is not permission to overwrite or commit it.
3. Read the relevant sections of ARCHITECTURE, CONFIGURATION, TESTING and the challenge. Inspect the actual source; documents may describe an earlier revision.
4. Identify affected entities, systems, profiles, asset references, data contracts and lifecycle ownership. Describe the next change and its purpose before writing it.
5. Preserve concurrent work. Another session was confirmed to be editing audio during the movement/rendering fixes. This is a dated handoff fact, not proof that a session is still running; inspect current changes before touching shared files.

For a tool that does not automatically load `AGENTS.md`, explicitly provide this document as startup context. Checked-in instructions make the context discoverable; they cannot force an arbitrary external AI tool to read it.

The owner initially asked to implement each step manually, then authorized autonomous implementation and documentation to meet the deadline. Follow the latest requested working mode. Do not ask again for each file while implementation is authorized. If the owner returns to manual mode, explain the purpose, location and steps before that step and let the owner perform it.

## 3. Readability and maintainability

### Accepted team convention — 13 October 2026

The owner authorized a comprehensive structural refactor and continuous OST integration. Use PascalCase for source module filenames, matching the primary class or React component; contract and pure-function modules use a descriptive PascalCase domain name. `main.tsx` and `vite-env.d.ts` are framework entry/declaration exceptions. Hooks retain React's `use` function prefix and live in PascalCase modules under `ui/hooks`.

Keep folders lowercase and group them by responsibility: `application` composes services and application workflows; `game` owns configuration, contracts, entities, systems, factories, runtime, input, math, assets, rendering and presentation; `infrastructure` owns network and storage adapters; `ui` owns screens, components, HUD, game views and hooks. Public classes/components have individual modules. Do not keep legacy re-export paths after migration.

`GameManager` coordinates domain systems per match. `GameSession` owns browser/Pixi match resources and the fixed-step/render lifecycle. `AudioManager` coordinates dedicated sound-effect and music players for the application lifetime. Managers delegate to focused classes; a manager name does not authorize unrelated responsibilities. Browser services are constructed at the application composition root and injected into React/runtime collaborators. React components and hooks remain idiomatic.

The authored MP3 plays continuously across menus, gameplay, pause, results and restarts after a user gesture, with its own persisted Music volume under the master Sound/Volume controls. Match teardown stops match effects/ambience but does not reset the application's music.

- Use descriptive English names tied to domain responsibilities. Prefer `WeaponController`, `ShipProfile` and `applyDamage` to generic managers, abbreviated variables or vague utility bags.
- Give each module/class one cohesive responsibility. Split responsibilities when their reasons to change differ; avoid both a giant GameManager and gratuitous layers with no purpose.
- Write readable, formatted code with clear control flow. Do not compress several fields, unrelated statements or entire methods onto one line in new or rewritten code. Existing compact code is not the readability target.
- Keep functions focused. Use guard clauses and named helpers when they clarify intent. Document the reason for a non-obvious algorithm, invariant, unit or resource lifetime, rather than narrating every statement.
- Keep data definitions separate from algorithms. A reviewer must find a ship's speed, sprite and weapons without searching through movement, rendering or AI code.
- Keep imports/dependencies intentional. Do not introduce libraries, frameworks, inheritance layers or dependency-injection containers merely to imitate .NET.
- Preserve strict TypeScript and existing lint rules. Handle indexed/optional values explicitly. Use `unknown` plus validation at untrusted boundaries; avoid `any`, unsafe assertions and suppression comments that hide a broken contract.
- A non-null assertion needs an established local invariant. Validate once at the boundary and express that invariant in the type where practical.
- Remove obsolete code/imports when replacing behavior. Do not leave competing implementations or commented-out alternatives.
- Improve touched code within the task's scope. Document important existing debt instead of rewriting unrelated systems during an urgent fix.

## 4. OOP and encapsulation

The gameplay core follows the owner's C#/.NET mental model: classes, private state, explicit contracts, inheritance for true entity specialization, composition for services, and factories for construction. The browser still executes JavaScript compiled from TypeScript; this is not a .NET runtime.

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

## 5. SOLID as concrete review criteria

| Principle | Required application in this project |
| --- | --- |
| Single responsibility | Entity state, weapons, spawn, damage, effects, collision, rendering, audio, network and UI have distinct owners. GameManager orchestrates them. |
| Open/closed | Add a normal enemy subtype through a profile, subclass and factory registration. Do not scatter enemy-ID branches throughout GameManager or renderer. A genuinely new capability may require an explicit contract extension. |
| Liskov substitution | Any registered EnemyShip obeys the same update, movement, life and cleanup contracts. It must not weaken invariants or surprise callers with incompatible behavior. |
| Interface segregation | Keep contracts small and role-specific, following ICollisionWorld, IShipFactory, IProjectileEmitter and read views. Avoid a service exposing all internals to every consumer. |
| Dependency inversion | Domain behavior uses injected contracts/context commands. Do not import React, Pixi, Axios, browser storage or Web Audio into entity behavior to perform infrastructure work. |

Use manual constructor/context injection at the composition root. Add abstractions to support real responsibilities and variation, not a ceremonial interface for every helper.

## 6. Configuration is the authored source of defaults

Static configuration classes are our equivalent of authored ScriptableObject data. They contain recipes/defaults, not active runtime instances. Constructors/factories turn profiles into instances with independent state.

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

## 7. Factories and adding new content

Use `ShipFactory` and `ProjectileFactory` for their existing construction/activation responsibilities. `FactoryConfig` owns constructor mappings; it is not a service locator or a bag of live objects.

To add an enemy:

1. Define a unique profile ID and an explicit static configuration class, including movement, health, AI/weapon data and visual references.
2. Implement an EnemyShip subclass that follows the update/context contract and base invariants.
3. Register its profile and constructor in FactoryConfig. Validate duplicate/missing registrations.
4. Add its intended spawn weights/initial-sequence participation in GameDefaults; validate safe spawn positions for its radius.
5. Extend contracts only when the feature genuinely needs a new capability. Keep renderer selection data-driven through the visual profile.
6. Test the distinguishing behavior and registry path, including a custom type absent from built-in enemy-ID branches. Update CONFIGURATION and relevant architecture documentation.

For a new weapon/projectile, author a profile and mount, then use the existing emission, cooldown, collision and pooling contracts. Do not add independent projectile allocation/removal inside an enemy method.

## 8. Pooling contract

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

## 9. GameManager, input, collision and AI

- Run gameplay on the configured fixed step, independently of render FPS. Use the capped accumulator for real-time frames. HUD updates remain low-frequency snapshots, not one React state update per entity per simulation step.
- Use active simulation time for match duration, cooldowns, navigation, projectile TTL and effects. Pause freezes these and momentum. Clear input and accumulated wall time on pause/resume; resume requires a user action.
- Preserve simultaneous movement and firing, independent weapon cooldowns, multiple keyboard/pointer input sources and pointer capture/cancellation. Release inputs on blur, hidden tab and teardown.
- Mobile combat is landscape. Portrait pauses combat; menu navigation remains usable. Resize changes display scale, not world coordinates, speed or collision geometry.
- Ship motion applies acceleration/braking and maximum-speed limits from its own profile. Use bounded movement substeps/collision handling for fast configured ships; do not rely on frame rate to prevent tunneling.
- Use authored island colliders and arena bounds. Projectile collision is swept and resolves the earliest contact against the applicable obstacles/ships.
- Mark death immediately; exclude dead entities from subsequent damage/actions. Score each credited kill once. Chaser ram self-destruction does not grant a player kill point. Player death ends active scoring/combat.
- AI is local game behavior, not a remote generative service. Use configured turning, range, sight and route/repath parameters. Preserve obstacle-aware navigation and radius clearance.
- Spawns use explicitly authored points, configured safe distance/separation and active caps. Validate positions before combat; skip an unsafe interval rather than spawn inside an island/player.
- Keep gameplay randomness seeded and reproducible. Audio variation must not consume or alter the gameplay PRNG sequence.
- Ship-to-ship collision is now an explicit owner requirement: player/enemy and enemy/enemy hulls must not pass through one another. Resolve contact without bypassing encapsulation or trapping ships inside islands. Preserve the existing Chaser ram damage/self-destruction and no-score rule.
- Significant island/ship contacts need bounded contextual impact feedback. Sustained contact must not generate sound/effects every frame. Keep contact thresholds, cooldowns and presentation settings configurable.
- Different scoring rules, arbitrary map shapes or new controls remain behavior changes requiring an explicit scope and validation.

## 10. Authored assets, Tiled and no fallback generation

- The owner's Tiled map and supplied visual/audio assets are the authored source of truth. Do not repaint, redesign islands or move colliders to hide a code defect.
- Preserve the documented finite orthogonal map, external tileset and named layer contracts. Individual collider names are optional; collision layer name/type/geometry are functional contracts.
- Use the supplied reference compositions and editable atlas/PNG pieces for UI. A screenshot of a menu is a reference, not a replacement for working controls.
- Respect atlas metadata, logical versus retina sizes, nine-slice borders, label rectangles and health-fill regions. Never guess a collider or fill region from a visually convenient screenshot.
- Missing required images, profile/constructor registrations, map references, shapes or settings must fail visibly with useful diagnostics. Do not create fallback objects, UI controls, scene elements, materials, shaders, effects or assets.
- React-authored UI and Pixi instances rendering explicitly referenced authored textures are part of the authorized design. They are not permission to generate emergency content when required references are absent.
- Compose the authored static tile layers at the configured positive integer resolution, then scale one cached map surface. Preserve Tiled flips and layer order. This prevents cracks between fractional-scale tile quads.
- A RenderTexture used to cache existing authored map content is a rendering resource, not a newly authored substitute asset. Keep ownership/disposal explicit.
- If this contract is applied to future Unity work, required UI/content must be authored in scenes/prefabs and wired through serialized references. Do not generate fallback GameObjects/components/UI in runtime or Editor code. Instantiation of explicitly referenced prefabs is allowed for intentionally prefab-driven systems. Asset/prefab generation requires an explicit request.

## 11. React, Pixi and lifecycle ownership

- React owns canvas markup, menus, forms, dialogs, HUD and touch controls. CSS owns presentation/layout. Pixi owns the arena and in-world entity indicators attached to that canvas. Do not implement required React menu screens entirely in Pixi.
- UI renders semantic state and sends input/application commands. It must not directly mutate ship instances, advance combat rules through network callbacks or duplicate GameManager state as mutable React entity lists.
- Domain entities/systems must not depend on browser rendering APIs. Renderer reads domain views and manages its own Pixi state; moving a sprite does not move the domain entity.
- Each match owns GameManager, input controller, renderers, animation loop, observers/listeners and match resources. Application-level decoded textures/audio caches have intentionally different lifetimes.
- Async initialization must tolerate React Strict Mode, unmount during loading, retry and restart. Serialize setup as necessary, cancel requests and check disposal after awaits. Clean up failed/abandoned partial setup.
- Cleanup cancels RAF, disconnects observers, removes listeners, clears input, stops match loops, releases pools and destroys match-owned containers/subtextures/map surfaces/application resources.
- Destroy owned texture frames/render surfaces without destroying shared base image sources. Release retiring GPU-context resources through supported Pixi APIs while preserving intentional decoded-image caches.
- Never remove React's owned canvas behind its lifecycle. A retry gets a fresh React-authored canvas; abandonment does not submit a completed result.
- Preserve stable render layers for ships/projectiles/effects as pools grow. Do not let creation order change intended draw order.
- Use semantic buttons/forms, labels, visible loading/error/retry states, accessible HUD values, dialog focus containment and focus restoration. Verify touch cancellation, orientation and keyboard use.

## 12. Audio

- Use authored WAV effects, the explicit MP3 soundtrack and AudioConfig cue/event mappings. Domain logic emits semantic events; it does not play files through Web Audio directly.
- Unlock audio through a user gesture. Cache decoded buffers and keep a bounded voice budget. Coalesce/rate-limit repeated events using authored parameters.
- Keep any variation lists, pitch ranges, gains and cooldowns in configuration. Audio variation is independent of deterministic gameplay randomness.
- Respect persisted mute/volume. Stop ocean/sailing loops on pause, leaving combat and teardown; disconnect finished sources and prevent overlapping loop duplication on restart.
- Surface decode/load failures without replacing missing audio with synthesized sounds. Existing audio-load failure behavior is nonfatal and visible; required visual/configuration failures still block the battle.
- Do not claim browser/device audio compatibility without testing it. Preserve concurrent audio changes until their scope/ownership is clear.

## 13. Network, persistence and records

- Preserve Axios HTTP contracts, TanStack Query query/mutation lifecycle and MSW mock scenarios. Do not replace requests with ad hoc UI-local fake lists to bypass errors.
- Query keys include the resource identity, relevant player/configuration, page and scenario revision. Propagate AbortSignal, limit retries and prevent stale responses from replacing the current view.
- API failure does not pause or prevent independent combat. Lists need loading, empty, error, retry and pagination states.
- On completion, persist the last result and outbox entry before POST. Use a stable match UUID, serialized submission and idempotent same-ID retries, including timeout after server commit.
- Preserve pending submissions across refresh when storage works. Do not submit abandoned/incomplete battles or generate a new ID on retry. Another match may start while an old submission remains pending.
- Validate persisted/external data. Surface storage parse/quota/unavailability failures; do not pretend persistence succeeded. Document any schema/default compatibility change.
- Preserve ranking identity based on the gameplay snapshot and deterministic tie ordering. Keep UTC dates and player history ordering consistent.
- Keep MSW request handling restricted to `/api/`; static images/audio/modules must not pass through unnecessary response cloning. Regenerate the worker with `npm run mocks:init`, which reapplies the filter.
- The mock server is browser/origin-local, not a production shared leaderboard. Do not describe client fingerprints, local fixtures or localStorage as server security.

## 14. Verification and performance

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
- Use the configured test reporters (`npm run test:e2e`) for delivered `reports/playwright`. A CLI reporter override may write another output directory; verify the report really belongs to the claimed run.
- Profile an optimized build after changes to movement, spawn pressure, pool limits, TTL, allocation/rendering or audio budgets. Record revision/configuration, environment, workload, frame metrics, entity/pool peaks and memory across restarts.
- Distinguish live objects, intentional caches, JIT warmup and retained match resources. A rising heap alone is not proof of a leak; passing a short run is not proof of zero leaks.
- Do not reuse old performance measurements as evidence for a changed build. Emulation is not physical-device testing; report browser/device limitations and any checks not run.
- For documentation-only changes, verify paths/links, consistency and diff integrity instead of rerunning the whole game suite without a reason.

## 15. Documentation and handoff

Update documentation as part of implementation, not after the next developer discovers missing context:

| Document | Update when |
| --- | --- |
| `IMPLEMENTATION.md` | The owner accepts a new durable engineering rule or changes one |
| `AGENTS.md` | Required startup reading, scope or workflow routing changes |
| `ARCHITECTURE.md` | Ownership, dependency, lifecycle or extension contracts change |
| `CONFIGURATION.md` | Client-editable fields, units, validation, defaults or extension steps change |
| `TESTING.md` / `PERFORMANCE.md` | Coverage, reproducible checks, measured evidence or limits change |
| `README.md` | Run/delivery commands, visible behavior or current supported scope change |
| Sibling `Docs` wiki | Portuguese explanation, decisions, tutorial steps and session diary change |

Keep one canonical contract in the repository; the personal wiki links to it. Relative repository links keep the contract usable in another developer's clone. Do not make successful builds depend on the external personal Docs folder.

Tutorial steps must explain prerequisites, purpose, relevant files, how to execute, expected behavior and how to investigate failure. Record why a design choice exists, especially when it differs from Unity conventions.

End a substantial session with what changed, validation actually run, known limits, uncommitted/concurrent work and the next required step. Distinguish implemented, verified, measured, committed, pushed and deployed states.

## 16. Git and delivery

- Review changes before staging. Use explicit file paths or reviewed hunks; never stage all dirty files blindly when another session is active.
- Keep commits cohesive by responsibility. Do not commit someone else's incomplete audio/UI changes together with a movement fix. Coordinate shared-file changes and preserve their working tree edits.
- Confirm the staged diff matches the commit description. Do not reset, stash, clean or overwrite unrelated work to make a commit look tidy.
- Commit/push according to the current owner authorization and the private destination. Publishing a build, granting access and submitting the challenge are distinct actions; do not imply they happened because a local build or commit succeeded.
- A delivered deployment must match the delivered source revision and include required assets/service worker. Check the built output and actual hosted behavior before claiming publication.
- Do not include credentials, tokens or personal backup/session directories in delivered source. Do not change global Git authentication to solve a project-local issue.

## 17. Definition of done

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
- Relevant client documentation and the Portuguese learning/handoff context are updated.
- The final diff/commit contains only reviewed authorized work. Unrelated concurrent edits are preserved.
- Reported tests/performance/publication claims refer to the exact revision tested or clearly labeled historical evidence.

These are review criteria, not a claim of perfection. If a requirement is not met, fix it within scope or record the concrete remaining limitation; do not silently weaken the contract.

## 18. Dated handoff baseline — 12 October 2026

This section records the last known state when this contract was created. Recheck current source and reports in every later session.

- Gameplay already uses Entity/Ship subclasses, private state, read facades, static profiles, factories, bounded logical/visual pools and split systems.
- The current map is the owner's `arena_00`, 32×18 tiles at 64 logical pixels, with the named visual layers and five authored rectangular colliders.
- Balance v3 changed player acceleration to 230 and braking to 115, with maximum speed 230: about 1 second to full speed and 2 seconds to stop in free water. Profile values remain the authority.
- The static-map RenderTexture correction removes a one-pixel seam observed at fractional viewport scales. The regression checks 20 viewport/DPI combinations.
- The latest completed movement/map verification reported 42 passing tests, plus typecheck, lint and production build. This is dated evidence, not a promise about future edits.
- The retained real-time performance report belongs to balance v2. Reprofile the final changed build; do not label its previous 60 FPS result as a v3 measurement.
- Another conversation was confirmed to be editing audio. Preserve its changes and review current diffs before committing shared files.
- Hosting was prepared but had not been published. Recheck delivery status before stating otherwise.
- The owner subsequently requested the gameplay brief below and ship/ship plus island impact handling. These are required pending work, not capabilities certified by the preceding 42-test result.

## 19. Accepted gameplay presentation scope

The owner explicitly requested review and implementation of the consolidated gameplay brief on 12 October 2026. Its local source is `../fork-analysis/BRIEF-IMPLEMENTACAO-GAMEPLAY.md`; preserve it as reference material. The durable requirements are summarized here so another developer's clone has the accepted context:

- Implement original code. Other submissions may inform observed behavior/presentation but must not supply copied classes, functions, components, shaders, generators or systems. Supplied Jungle Gaming assets and `sample_*` compositions are the primary art references.
- B01: perceptible configured acceleration/braking, bounded rotation, pause/reset and collision that does not accumulate artificial acceleration into a wall.
- B02/B03: muzzle flash, limited visual recoil, meaningful cooldown feedback, hull damage flash/debris/damage indication and contextual hull/water/coast impacts. Use the four authored wood variants, fire and explosion frames. Camera shake/recoil affect presentation only, with reduced-motion handling and stable HUD/input/world coordinates.
- B04: every destroyed ship, including player and Chaser ram, emits exactly one group of 2–5 crew using the six supplied variants. They disperse briefly, remain floating with small drift/bob and visible foam, then fade after a configured duration. Keep them on valid water, freeze on pause and clear on abandonment/restart. Crew are cosmetic, never colliders/targets/pickups/points. Capacity must support the required count instead of silently reducing it.
- Foam/ring/wake/trail images were not confirmed as separate supplied frames by the earlier brief. Audit the actual metadata. If complementary art is necessary, the brief authorizes authoring and saving explicit project assets in this implementation stage, documenting provenance and loading them through validated references. Do not synthesize runtime fallback graphics or crop arbitrary pieces of reference screenshots.
- B05: one visible `+1`, HUD response and score sound per actual credited kill, never for crew/debris/ram.
- B06: freeze combat and persist/enqueue the final record immediately and once; allow a bounded terminal presentation window for explosion/sinking/crew before the result screen. Preserve terminal audio across that transition. Distinguish defeat/completion, use authored UI and report real statistics; do not invent accuracy without defined counters. Refresh must not replay terminal events.
- B07: audit all 27 supplied WAVs and give each useful cue/variant an explicit event and reproducible scenario. Loading a sound does not demonstrate use. Sailing responds to actual speed. Bound/prioritize voices and preserve unlock, mute, volume and failure handling.
- B08/B09: animate the supplied deep-water texture while keeping Tiled coast/props/colliders stable; add short bounded ship wakes following position history and projectile trails behind their velocity. Configure appearance/lifetimes, avoid atlas bleed/gaps and preserve gameplay range/damage. Pause/reduced motion and cleanup apply to all decoration.
- B10: centralize sprite/atlas/profile references. Shared ship/parts/crew/effect and HUD atlases are preferred for Pixi; individual PNGs remain valid for React. Repeated water may explicitly use its standalone tile to avoid bleed. Default/retina preserve logical sizes. Do not load duplicate representations unnecessarily. Full ships versus authored part assembly is a presentation choice, not a blocker for the required effects.
- B11: preserve simultaneous keyboard/touch, focus, pause and pressed controls; show weapon readiness, low health and remaining-time warnings. Rotation remains A/D, not strafing. Joystick and free mouse aiming are not accepted requirements.
- Audit all supplied PNGs/XML/JSON/WAVs by category, frame and usage. Use useful categories/variants; document legitimate omissions such as duplicate resolution or irrelevant composition. Do not fill the arena with every asset just to claim coverage.
- Use typed one-shot presentation events with meaningful identity/position/weapon/damage/cause/credit data. Consumers must not reapply damage or score. Presentation RNG is independent from gameplay RNG; cosmetic resources have bounded budgets and session ownership.
- Verify actual combat feedback, death/crew and result on desktop/mobile; 2–5 crew per destruction, pause/terminal/restart behavior, all sound mappings and reduced motion. Profile the final build with effects enabled for a three-minute session and five lifecycle cycles. Save stable captures and compare crew/foam composition with the samples; automated tests do not replace visual/auditory review.

B01–B09 are required presentation work; B10–B11 are lower-priority required polish in the accepted brief. Architecture improvements alone do not complete that scope. Track implementation/evidence per item rather than marking the whole brief complete on the strength of an earlier gameplay test run.

## 20. Accepted menu composition — 13 October 2026

The owner required the main menu to match `assets/sample_menu.png` exactly, with these accepted additions resolving the challenge requirements the sample does not show:

- A **How To Play** button in the bottom row opens a screen with the game explanation and controls; its only action returns to the main menu. This satisfies the challenge's control instructions in the main menu.
- **Ranking** and **Match History** open the Captain's Log screen with both tabs, reproducing `sample_ranking.png` and `sample_history.png`. Ranking shows rank, captain (star for the leader), points and UTC play date; history shows UTC date, points, mm:ss duration and result. Ranking highlights this player's records; history highlights the last completed battle. Fixture data, not the sample's example names, fills the rows.
- The MSW scenario selector and reset stay available in a collapsed panel in the bottom-left corner. The Jungle Gaming logo sits in the bottom-right corner as in the samples. The menu no longer shows a last-result link or a credit footer; the last result is still persisted.
- Reproduce reference compositions with measured values in reference pixels (`--sample-px`), authored PNG/SVG pieces and real controls. Verify a change against the reference image at 1800×1000 before accepting it; do not crop the samples.

## 21. Ship wake removal — 13 October 2026

The owner requested complete removal of the existing ship wake before implementing a replacement. Remove the old stamped wake emitter, configuration, asset registration and `assets/authored/wake.svg`; do not merely hide it or set its opacity to zero. Preserve projectile trails, crew foam, splashes, water motion and other feedback. Preserve the owner's `assets/authored/shipt-trail.png` unchanged and do not wire a replacement in this removal task. The two continuous wakes discussed in B08/B09 remain pending future implementation with original code and explicitly authored art.

## 22. Owner-authored splash — 13 October 2026

The owner replaced the water splash art with a PNG manually authored in Krita. `assets/authored/Splash.png` is the runtime texture; `Splash.kra` is its editable source. Keep the logical `authored/water_splash` key and select the PNG through `AssetConfig.Standalone`. The previous SVG is retained as unused source art. Preserve the effect's configured dimensions, duration and impact triggers unless separately requested. Validate both texture loading and an actual impact render; a preload or a static filename reference alone does not demonstrate use.

## 23. Accepted gameplay HUD composition — 13 October 2026

The owner required the gameplay screen to match `assets/sample.png` exactly, including the mobile buttons and the HUD in general:

- The arena fills the viewport; there is no frame, header bar, footer or button captions. The map keeps its uniform contain fit and the deep-water tiling sprite extends under any letterbox area, as the owner chose on 13 October 2026 after comparing it with letterbox bands. Known trade-off: on screens whose proportion differs from the map, the ship stops at the authored map bounds while water continues beyond them.
- The HUD is a React overlay (`src/ui/hud/GameHud.tsx`, `GameHud.css`) using the retina HUD pieces at positions/sizes measured by template-matching them against the reference: heart and health frame with `current / max` at the top left; score, `mm:ss` clock and pause at the top right; turn-left/forward/turn-right at the bottom left; left broadside/front cannon/right broadside at the bottom right; the Jungle Gaming wordmark above the weapon cluster.
- Lengths use `--hud-px`, one reference pixel. It is exact at 1800×1000 and keeps at least 0.72 of the reference on small screens so touch buttons stay about 55 CSS pixels, unless the top row would not fit.
- The health fill follows the atlas `fill_rect`/`clip_axis` and the player's authored fill stages. Weapon readiness darkens the button face clockwise while reloading; a ready weapon looks exactly like the reference. Keyboard controls remain documented in How To Play.

## 24. Accepted Options composition — 13 October 2026

The owner required the Options screen to match `assets/sample_options.png`, keeping sound settings and the restore action:

- The board reproduces the reference measurements in `--options-px` reference pixels: title, Game session time and Enemy spawn time rows with authored round minus/plus buttons, then MAIN MENU. Sound (Off/On) and Volume follow the two required rows in the same style; Restore default options is a text action below MAIN MENU. Tall screens fit the whole board; short landscape phones keep at least 0.75 of the reference and scroll.
- Steppers produce only valid values: the step sizes live in `OptionsConfig.Steps`, and each documented limit disables the button that would leave the range. Every press is saved immediately; there is no Save button. Ranges remain available to assistive technology as each setting's description.

## 25. Accepted player-death presentation — 13 October 2026

On player death, play the owner's `assets/sounds/extra/576054__istudeny__pirat-battle.wav` once, replacing the original `game_over.wav` cue. Drastically lower the persistent OST (8% of the configured music mix), without rewriting saved volumes or restarting the track. Preserve the approximately 14-second cue through result reveal; restore the mix when it finishes or the player starts another battle/returns to the menu.

Freeze combat and persist/enqueue the completed record immediately. Show destruction for 3 seconds while **Game Over** fades in, then fade the result screen in over 1 second while Game Over fades out. Keep the arena alive beneath that crossfade and dispose it when the transition completes. Time expiry keeps its distinct Battle Complete text/cue and does not duck the soundtrack.

For navigation in the owner's local environment, the personal wiki entry is [Implementation context](../Docs/13-contexto-de-implementacao.md). This optional link is outside the clone; all mandatory rules are contained in this document and the repository's AGENTS.md.
