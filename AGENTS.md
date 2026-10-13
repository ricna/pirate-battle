# Pirate Battle — required implementation context

Before implementing or refactoring, read [IMPLEMENTATION.md](IMPLEMENTATION.md) in full. It is the canonical contract established with the owner for code quality, readability, OOP, SOLID, configuration, factories, pools, authored assets, lifecycle, tests and handoff. Read the relevant [ARCHITECTURE.md](ARCHITECTURE.md), [CONFIGURATION.md](CONFIGURATION.md), [TESTING.md](TESTING.md) and [CHALLENGE.md](CHALLENGE.md) sections for the task.

Current explicit owner instructions take precedence. Keep accepted durable rule changes in IMPLEMENTATION.md. Do not infer permission to rewrite unrelated code from an existing dirty working tree.

- This directory is the active source checkout. The sibling `game-developer-challenge` is reference-only; never implement there. The destination remote is the owner's private `ricna/pirate-battle`, not the former public fork/upstream.
- Work in the owner's visible workspace. Never delete `Debug.log` unless asked. Preserve user-authored assets and concurrent edits.
- Keep gameplay state in encapsulated classes with `#private` fields, controlled commands and readonly/frozen views. Use inheritance for entity specialization and composition/injected small contracts for systems. React remains idiomatic functional components/hooks.
- Use PascalCase source filenames matching their primary class/component, lowercase responsibility folders, and one public class/component per module. `main.tsx` and `vite-env.d.ts` are framework exceptions. Follow `npm run format:check` and `npm run architecture:check`; do not restore legacy module paths or global service singletons.
- `ApplicationServices` constructs application services and `ServicesProvider` injects them. `GameSession` owns browser/Pixi resources; `GameManager` owns the domain match. Renderers consume `GameReadView`. Match audio uses `IMatchAudio` and cannot stop the application's persistent OST.
- Author tunable values and asset selections in static configuration profiles. Validate, clone and recursively freeze match snapshots. Use registered factories and bounded logical/visual pools; do not scatter type branches, magic tuning numbers or asset strings through algorithms.
- Missing required references fail visibly. Never generate fallback objects, UI controls, scene elements, materials, shaders, effects or assets. Instantiating/rendering explicitly referenced authored content through the intended systems is allowed. Unity UI/content must be authored in scenes/prefabs and wired through serialized references; prefab/asset generation requires an explicit request.
- Read `git status` and relevant diffs before editing/staging. Another session was confirmed to edit audio on 12 October 2026; verify current ownership and preserve unrelated changes. Stage explicit reviewed paths/hunks and make cohesive commits.
- Keep code, UI and delivered documentation in English; explain to the owner in Portuguese. Personal tutorials/diary remain in sibling `../Docs`, outside this repo; do not use Google Docs.
- Follow the latest working mode/authorization. Explain purpose and results, update relevant documentation, and run checks appropriate to the change. Do not claim tests, profiling, pushes or deployment that did not occur.

The personal wiki is optional local learning material; the complete mandatory implementation contract is checked in here so other developers do not need the owner's external Docs folder.
