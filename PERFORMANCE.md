# Performance

The target is 60 FPS during combat on the reference environment below, measured on the optimized production build. Raw data: `reports/profile.json` (three-minute match and five lifecycle cycles) and `reports/memory-followup.json` / `reports/memory-retainers.json` (longer heap trend).

## Reference environment

Windows 10 Pro; Intel Core i7-9700KF (8 cores); 32 GiB RAM; NVIDIA GeForce RTX 3060 (driver 32.0.16.1714; also in `reports/hardware.json`). Chromium 156.0.8078.4 (Playwright 1.64, headless, ANGLE/Direct3D 11). Viewport 1280×800 at device scale 1. No other browser test ran during the measurement.

## Three-minute match

Measured on 14 October 2026 on commit `896afad` (clean checkout; the build reported the same commit), balance `arena_00-v1/balance-v9`, seed 20261012, **180 s session with the shipped 5 s spawn interval**, sound and music on, through the real-time fixed-step simulation. Under balance-v9 the opening fleet and reinforcements outlast the scripted pilot, so the measurement covers the 133.5 s it survived.

| Metric | Result |
| --- | --- |
| Active combat | 133.5 s of the 180 s session, ended by the pilot's death |
| Mean frame rate | **59.84 FPS** |
| Frame interval p50 / **p95** / p99 / max | 16.7 / **16.8** / 16.8 / 349.9 ms |
| Frames measured after warm-up | 7,697 |
| Peak simultaneous entities (ships, cannonballs, effects, particles, labels) | 108 |
| Credited kills by the keyboard pilot | 46 |
| Pool exhaustion (projectiles, effects, particles, crew, labels, ship trails) | none; projectile peak 11 of 32, effect peak 7 of 16, particle peak 73 of 96, crew peak 23 of 32, ship-trail peak 8 |
| Audio | 27 decoded cues, effect voices peaked at the 16-voice budget, soundtrack playing throughout |
| Unhandled page errors | 0 |

One frame, about 16 s into combat, took 349.9 ms; its neighbours took 16.7 ms and every other frame stayed under 20 ms. The cause of that single stall was not investigated. Apart from it, the 60 FPS target held for the whole measurement, including the busiest moments (up to 108 live entities and the full voice budget).

## Memory across start/play/leave cycles

Each cycle presses Play, runs 10 s of the real rules through the test clock, pauses and leaves the battle; garbage collection is forced before every sample.

**Five cycles after the three-minute match** (`reports/profile.json`): retained JS heap 9.18 MB before the cycles and 9.77 MB after the fifth (+0.59 MB).

**Thirty cycles** (`npm run profile:memory`, `reports/memory-followup.json`):

| After cycle | 5 | 10 | 15 | 20 | 25 | 30 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Retained JS heap (MB) | 8.61 | 9.15 | 9.30 | 9.45 | 9.56 | 9.64 |

- DOM nodes (352), event listeners (243) and documents (4) are identical in every cycle after warm-up: no listener, canvas or DOM subtree survives a match.
- Growth per five cycles falls from 547 KB to 146, 150, 105 and 79 KB; the least-squares trend after warm-up is about 35 KB per cycle and flattening.
- The heap-snapshot diff between cycles 5 and 30 (`reports/memory-retainers.json`) attributes most of the growth to V8 compiled code (InstructionStream, Code, FeedbackVector, TrustedByteArray), the DevTools network-resource buffer used by the measuring CDP session, and Performance Timeline entries (resource timing, paint and layout-shift records). No ship, sprite, texture, pool, React component or Pixi display object appears among the growing retainers.
- One small library-level retention was identified: each match creates its own Pixi renderer, whose graphics shader gets a unique generated name, and Pixi's global `GlProgram` cache keeps that shader source as a key after the program is destroyed (about 4 KB per match). Reusing one renderer across matches would remove it, at the cost of the per-match resource ownership described in ARCHITECTURE.md; at this size it is documented rather than worked around.

Conclusion: no continuous growth of application resources was found. The remaining slope is JIT code, browser diagnostic buffers and the small per-renderer shader key above, and it flattens over time.

## Reproduce

```sh
npm ci
npx playwright install chromium --no-shell
npm run build
npm run preview          # http://127.0.0.1:4173
npm run profile          # in a second terminal; 180 s session, 5 s spawns, writes reports/profile.json
npm run profile:memory   # 30 cycles, writes reports/memory-followup.json and reports/memory-retainers.json
```

`PROFILE_URL`, `PROFILE_SESSION_SECONDS`, `PROFILE_SPAWN_SECONDS`, `PROFILE_PILOT` and `MEMORY_CYCLES` adjust the runs. The pilot uses the real keyboard on the real-time fixed-step simulation, with the same policy as the gameplay regression: it keeps sailing with the nearest enemy abeam, holds the front cannon and both broadsides, and steers to survivors whenever no enemy is within 350 px. It never writes positions, health, score or cooldowns. The first five active seconds are excluded from frame statistics. Reinforcements can outlast a scripted pilot, so the end reason and active time are reported rather than required; the script fails only when no frame was measured or the page throws.

## Limits

- One desktop machine and Chromium only; physical mobile devices, thermal throttling and other browsers are not measured.
- Headless Chromium paces frames itself; a visible window follows the display's refresh rate.
- The pilot defends from its spawn point; navigation-heavy play, the 2 s spawn interval and the 28-enemy cap were not the workload of this measurement.
- JavaScript heap figures exclude GPU and media memory; a short series cannot prove the absence of every leak.
