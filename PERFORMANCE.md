# Performance evidence

## Reference environment

Windows 10 Pro; Intel Core i7-9700KF, 8 cores; approximately 32 GiB RAM; NVIDIA GeForce RTX 3060, driver 32.0.16.1714. Chromium 156.0.8078.4, headless, ANGLE / Direct3D11 on the RTX 3060. Viewport 1280×800, device scale 1. Hardware fields are delivered in `reports/hardware.json`.

The target is 60 FPS. This is a measured reference environment, not a guarantee for physical mobile devices or every balance setting.

## Reproduce

```sh
npm ci
npm run build
npx playwright install chromium --no-shell
npm run preview
```

In a second terminal:

```sh
npm run profile
```

The optimized preview defaults to port 4173. PROFILE_URL can select another origin. The script navigates through real keyboard inputs, holds all three weapon commands and follows the authored water boundary. It observes configuration/entities but never writes positions, health, score or cooldowns. Turns are biased toward the outside boundary because movement uses discrete fixed steps. Profiling keeps the real simulation clock; it does not accelerate 180 seconds.

Configuration: normal balance version arena_00-v1/balance-v2, seed 20261012, 180s session, 10s spawns, player 100 HP, sound muted, full arena visible. The first five active seconds are excluded from frame statistics to avoid initial warmup. Entity count includes the player, enemies, live cannonballs and temporary effects; static map sprites are separate.

`reports/profile.json` contains the latest complete three-minute run, raw frame intervals and five-cycle heap samples. `scripts/profile.mjs` exits unsuccessfully if its pilot dies before 180 active seconds or if an unhandled page error occurs; incomplete exploratory runs are preserved only in the personal Docs folder.

## Frame and entity results

Measured on 12 October 2026, approximately 22:05 America/Sao_Paulo (raw UTC timestamp in the report), on the final OOP/pool build:

| Metric | Result |
| --- | --- |
| Active combat | 180.000s, ended by time |
| Mean rendered FPS | 60.000 |
| p95 frame interval | 16.8ms |
| Retained frame samples | 10,499 |
| Peak simultaneous live entities | 19 |
| Score from real weapon inputs | 14 |
| Unhandled page errors | 0 |
| Logical projectile pool | 32 capacity, 15 active peak, 0 exhausted acquisitions |
| Render projectile pool | 32 capacity, 12 active peak, 0 exhausted acquisitions |
| Logical/render effect pools | 16 capacity each, 7 active peak, 0 exhausted acquisitions |

The pools remained within their preallocated budgets in this workload. Logical peaks can exceed rendered peaks because several fixed steps can execute before a frame is drawn, and collision/expiry can return entities before rendering. The domain tests separately exercise growth, hard-cap exhaustion, full-salvo reservation and lease reset. Live entity counts exclude inactive pooled objects and the 964 static map sprites.

The raw report includes the entire actual configuration snapshot, pool statistics and individual frame intervals. These measurements use the shipped 100-HP player, its acceleration/braking settings and actual keyboard navigation, without balance changes or gameplay-state assignments.

## Memory investigation

After the real-time battle, the same browser performs five start/play/leave cycles. Each plays ten active seconds through the real fixed-step rules, then abandons through the pause dialog. CDP forces garbage collection before measuring JavaScript heap. This measures retained heap, not total browser-process or GPU allocation.


| After match/cycle | Retained JS heap bytes |
| --- | --- |
| 0 | 8,516,316 |
| 1 | 8,610,540 |
| 2 | 8,766,804 |
| 3 | 8,855,484 |
| 4 | 8,946,272 |
| 5 | 9,023,680 |

The five-cycle increase was 507,364 bytes (approximately 0.48 MiB). It is reported as measured; JIT, shared asset/shader caches and browser diagnostic data are included in this heap measurement. The run alone cannot distinguish every retained byte or prove indefinite heap stability.
An additional investigation runs 25 cycles on the optimized build (`node scripts/memory.mjs`), records document/node/listener counts, and compares V8 heap summaries at cycles 5 and 25. Raw outputs are `reports/memory-followup.json` and `reports/memory-retainers.json`.

Two cleanup improvements resulted from investigation: renderer-specific GPU state is unloaded through public TextureSource APIs while decoded images remain reusable, and the MSW worker handles only /api/ traffic. Initial summaries showed retained network MessageEvent/MessagePort/stream buffers from cloning static resource traffic; the API-only filter leaves those resources to the browser while preserving all mocked REST scenarios. `npm run mocks:init` reproduces the generated worker and this filter.

During the refactor, the separate 25-cycle run measured heap 7,952,548 bytes at cycle 5 and 8,723,736 bytes at cycle 25. Documents remained 2, DOM nodes 250, and listeners finished at 219 (one transient 224 sample). Heap summaries attribute most growth to compiled code/feedback data and browser diagnostics; they do not establish a total-process leak-free guarantee. This diagnostic preceded the final source-freeze/layer-order adjustments; the retained final profile measures the final build and its separate five cycles.

Compiled JavaScript, image/audio caches, React and Pixi pools may warm over initial cycles. Constant DOM/listener counts and heap trends are documented rather than interpreting every byte increase as an entity leak. No private Pixi fields are mutated, and no gameplay-state shortcuts are introduced.

## Limits

- Only the stated desktop environment was profiled. Mobile landscape was functionally tested using Chromium emulation; physical mobile FPS, thermal behaviour and Safari audio remain unmeasured.
- Spawn interval 10s is within shipped Options limits. The most aggressive 2s configuration and 28-enemy cap were not the workload of this measurement.
- Refresh rate, browser scheduling, GPU drivers, other desktop workloads and profiling overhead affect frame intervals.
- Heap snapshots themselves can add diagnostic overhead; the independent 25-cycle investigation is not used to calculate combat FPS.
- A deterministic gameplay seed does not make an external real-time keyboard pilot frame-exact across machines. If it dies, the script reports that failure; a completed run is required for three-minute evidence.
