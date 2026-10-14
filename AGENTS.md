# AGENTS.md — Pirate Battle

Operating guide for AI coding agents and developers. Read it before changing anything; it routes to the detailed rules instead of repeating them.

## Project

Single-player, top-down naval shooter built for Jungle Gaming. React 19 with strict TypeScript renders menus and HUD, PixiJS 8 renders the arena, and a fixed-step domain model owns the rules. Ranking and Match History use REST contracts mocked by MSW and consumed through Axios and TanStack Query. Playwright covers domain rules, rendering, desktop and landscape-mobile flows, visual baselines and a production smoke test.

- Remote: `origin` is `github.com/ricna/pirate-battle` (private). Push only to `origin`.
- Runtime: Node.js 24 (`.nvmrc`) and npm 11. Install with `npm ci` and `npx playwright install chromium --no-shell`.

## Instruction precedence

1. The current task's explicit instructions.
2. This file.
3. [IMPLEMENTATION.md](IMPLEMENTATION.md) (engineering standards) and [DECISIONS.md](DECISIONS.md) (accepted product decisions).

A task that changes a durable rule or decision records it in the owning document within the same change. The state of the working tree never grants permission to rewrite unrelated code.

## Repository map

| Path | Contents |
| --- | --- |
| `src/game/` | Domain model and match runtime: `configuration` (authored profiles), `contracts` (readonly types, domain symbols, ports), `core` (Entity, pools, collision worlds), `entities`, `systems`, `factories`, `runtime` (GameManager, GameSession), `input`, `math`, `assets`, `rendering`, `presentation`, `audio` |
| `src/application/` | Composition root (`ApplicationServices`), options and match-record repositories |
| `src/infrastructure/` | Adapters: `network` (Axios API, MSW scenarios), `storage` (localStorage), `browser` (fullscreen) |
| `src/ui/` | React: `App.tsx`, `screens`, `components`, `hud`, `game` (canvas and pause), `records`, `hooks`, `navigation`, `assets`, `development` |
| `tests/` | Playwright specs, `helpers.ts`, `TestReports.ts` (report and evidence paths), versioned screenshot baselines |
| `scripts/` | Architecture and documentation checks, report summary and delivery, Docker runner, profiling, asset audit, MSW worker setup |
| `assets/` | Supplied and authored art, the Tiled map and sounds. They are the source of truth and are never regenerated. |
| `public/` | Static files served as-is, including `mockServiceWorker.js` |
| `reports/` | Versioned delivery evidence, changed only by `npm run test:deliver` and the profiling scripts |

## Where to find what

| You need | Look in |
| --- | --- |
| How code must be written: readability, OOP, SOLID, configuration, pools, lifecycle | [IMPLEMENTATION.md](IMPLEMENTATION.md) |
| Why a feature looks or behaves the way it does | [DECISIONS.md](DECISIONS.md) |
| Ownership, data flow, lifecycle and the module map | [ARCHITECTURE.md](ARCHITECTURE.md) |
| A tunable value: speed, damage, spawn, pools, audio mix | `src/game/configuration/`, explained in [CONFIGURATION.md](CONFIGURATION.md) |
| Domain symbols, readonly contracts and ports | `src/game/contracts/` |
| REST contracts, mock scenarios and timeouts | `src/infrastructure/network/` |
| Asset inventory, provenance and licences | [ASSET_AUDIT.md](ASSET_AUDIT.md), [ASSETS.md](ASSETS.md) |
| Mobile camera, fullscreen and compact layout | [MOBILE.md](MOBILE.md) |
| Test coverage, commands and reports | [TESTING.md](TESTING.md) |
| Performance method and measurements | [PERFORMANCE.md](PERFORMANCE.md) |
| The product brief and its traceability | [CHALLENGE.md](CHALLENGE.md), [REQUIREMENTS.md](REQUIREMENTS.md) |

## Engineering rules

A summary of [IMPLEMENTATION.md](IMPLEMENTATION.md); the referenced sections are binding.

- **Readability (§1).** Descriptive English names tied to the domain. One cohesive responsibility per module. Guard clauses and named helpers instead of dense expressions. Comments explain why, not what. Remove replaced code; no commented-out alternatives.
- **Modules and folders (§1).** Lowercase responsibility folders. PascalCase modules named after their exported class or component, one public class or component per module, no re-export shims. `npm run lint` enforces this.
- **Encapsulation (§2).** Mutable state lives in `#private` fields and changes only through named commands. Collaborators receive readonly views or frozen DTOs. Inheritance only for true specialization (`Entity → Ship → EnemyShip → …`); composition for systems.
- **SOLID (§3).** Add behaviour through profiles, subclasses and factory registration, not type branches. Keep contracts small and role-specific. Domain code depends on injected contracts, never on React, Pixi, Axios, MSW or storage.
- **No magic values (§4).** Every tunable number, asset name, identifier and threshold lives in an authored, validated configuration profile with explicit units. Only mathematical identities stay inline.
- **Construction and pools (§5, §6).** Registered factories; bounded, prewarmed pools with tracked ownership and a complete reset on release.
- **No workarounds (§8, §12).** Missing references fail visibly; never generate fallback assets, objects or UI. No `any`, unsafe casts or lint suppressions that hide a broken contract. Tests never assign health, score or positions or inject fake state. Fix causes, not symptoms.
- **Lifecycle (§9).** Every match-owned listener, loop, texture and pool is disposed. Asynchronous setup tolerates React Strict Mode, retry and unmount.

## Workflow

1. **Orient.** Run `git status --short`. Uncommitted changes you did not make belong to someone else: do not edit, stage, revert or reformat them unless the task requires it. Read the sections of the documents that concern the task, then the actual source, because documents can lag behind code. Identify the entities, systems, profiles, assets, data contracts and lifecycle owners the change touches.
2. **Change.** Make the smallest cohesive change that fully solves the task. Update tests and the owning documents in the same change.
3. **Verify** at the level the change requires (next section).
4. **Commit** when asked. Stage explicit paths, review `git diff --cached`, keep one responsibility per commit and use Conventional Commit messages (`feat(ui): …`, `fix(collision): …`, `test(reports): …`, `docs: …`). Do not push unless asked. Never reset, stash or clean work you did not create, and never commit credentials, tokens, local session data or personal backups.

Use one agent per working tree. Agents working in parallel use separate `git worktree` checkouts, never the same directory.

## Verification

| Change | Required checks |
| --- | --- |
| Documentation only | `npm run docs:check` |
| TypeScript, CSS or configuration | `npm run typecheck`, `npm run lint`, `npm run format:check` |
| Behaviour or UI | The checks above plus the affected specs: `npx playwright test tests/<spec>.spec.ts --project=<project> -g "<test>"` |
| Intentional visual change | The checks above plus `--update-snapshots` for the affected Windows baselines |
| Before committing a feature or a cross-cutting change | `npm run verify` once (typecheck, lint, format, build, complete suite) |
| Delivery evidence, only when requested | `npm run test:deliver`, then commit `reports/` on its own |

Keep verification proportional and cheap:

- Run commands in the foreground with an adequate timeout. Do not start a long command in the background and poll it; every poll is a full model request.
- Prefer focused runs and terse output (`--reporter=line`, `-g`, `--project`). Read failure details, not passing output.
- Run the complete suite once per feature, not after every edit, and never repeat a passing run without a code change.
- `npm run test:docker` runs the suite in the Linux CI image and takes tens of minutes. Use it only to refresh the Linux baselines once per batch of intentional visual changes before a push, or when explicitly asked.
- Everyday runs write Git-ignored output (`playwright-report/`, `test-results/`). Never commit it or redirect it into `reports/`.
- Read the parts of files and diffs you need instead of whole files, and view screenshots only when the task is visual.

## Definition of done

Meet the checklist in [IMPLEMENTATION.md §13](IMPLEMENTATION.md#13-definition-of-done). Report exactly what was verified and what was not; never claim a test, measurement, push or deployment that did not happen.

## Documentation map

| Document | Purpose | Update when |
| --- | --- | --- |
| [AGENTS.md](AGENTS.md) | Entry point: map, workflow, verification policy | Workflow, structure or verification policy changes |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Engineering standards | An engineering rule is adopted or changed |
| [DECISIONS.md](DECISIONS.md) | Accepted product and design decisions | A product decision is made or superseded |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Current design, ownership, lifecycle and module map | Ownership, dependencies, lifecycle or modules change |
| [CONFIGURATION.md](CONFIGURATION.md) | Client-editable values, units, validation and extension steps | Configuration fields or extension steps change |
| [TESTING.md](TESTING.md), [PERFORMANCE.md](PERFORMANCE.md) | Coverage, commands, evidence and limits | Coverage, checks or measured results change |
| [MOBILE.md](MOBILE.md) | Mobile camera, fullscreen and compact layout | Mobile behaviour changes |
| [README.md](README.md) | Setup, commands, environment, controls and delivery | Commands, visible behaviour or scope change |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Brief requirement to implementation and evidence | A requirement's implementation or evidence moves |
| [ASSETS.md](ASSETS.md), [ASSET_AUDIT.md](ASSET_AUDIT.md) | Asset provenance and usage audit | Assets are added, removed or remapped |
| [CHALLENGE.md](CHALLENGE.md) | The client's original product brief, verbatim | Never |

Links are relative so the documentation works in any clone. `npm run docs:check` validates links, anchors, repository paths and `npm run` commands in every document.
