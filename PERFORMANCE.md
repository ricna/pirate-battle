# Performance evidence

The historical tables below retain the earlier balance-v2 baseline. Its raw report is preserved in `reports/profile-before-refactor.json`. The final refactor measurement is recorded separately below; workloads differ, so these are not a before/after speedup comparison.


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

The optimized preview defaults to port 4173. PROFILE_URL can select another origin. The current default pilot aims at the nearest observed enemy through real keyboard inputs while holding all three weapons. `PROFILE_PILOT=boundary` selects the earlier authored-boundary pilot. It observes configuration/entities but never writes positions, health, score or cooldowns. Turns are biased toward the outside boundary because movement uses discrete fixed steps. Profiling keeps the real simulation clock; it does not accelerate 180 seconds.

Configuration: normal balance version arena_00-v1/balance-v2, seed 20261012, 180s session, 10s spawns, player 100 HP, sound muted, full arena visible. The first five active seconds are excluded from frame statistics to avoid initial warmup. Entity count includes the player, enemies, live cannonballs and temporary effects; static map sprites are separate.

`reports/profile.json` contains the latest refactor run, raw frame intervals and five-cycle heap samples. `scripts/profile.mjs` exits unsuccessfully if its pilot dies before 180 active seconds or if an unhandled page error occurs; incomplete exploratory runs are preserved only in the personal Docs folder.

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


## Final structural refactor and persistent OST - 13 October 2026

Source revision `1cee43d9ebda0a3c6eaa7672cd9d51ef8af78a25` contains runtime implementation `ae203b2` plus its documentation/evidence commit. Build: optimized Vite preview, `arena_00-v1/balance-v4`, seed 20261012; Chromium 156.0.8078.4, Windows, RTX 3060 / ANGLE Direct3D11, 1280x800 at 1x. The 180-second session uses 10-second spawns, all three weapons held, nearest-enemy aiming through actual keyboard inputs at the authored spawn, normal fixed-step real time, Sound On, master Volume 50% and Music volume 100%. No health, score, position or clock writes were used.

| Metric | Measured result |
| --- | --- |
| Active gameplay | 180 s, ended by time |
| Mean FPS | 60.00 |
| P95 frame interval | 16.80 ms |
| Frame samples after warmup | 10500 |
| Peak entities including cosmetics | 78 |
| Peak effect voices / authored limit | 16 / 16 |
| Cached effect buffers | 27 |
| Persistent music at match end | Playing, gain 0.1, position 183.91 s |
| Unhandled application errors | 0 |
| Score from actual credited kills | 17 |

Five post-match start/play/leave cycles ran through the actual test clock and UI lifecycle, with GC before each retained-heap sample. Samples in MiB (initial then cycles 1-5): 8.974, 8.987, 9.140, 9.208, 9.344, 9.395. Growth over this short series was 0.422 MiB. That includes application caches/browser warmup and is not proof of a leak or zero leaks. JS heap figures do not account for all native media/GPU memory. `reports/profile.json` preserves full configuration, frame intervals, pool statistics, audio counts and heap bytes.

The earlier boundary-navigation attempt died at 65.22 active seconds under the final balance. Its report is preserved as `reports/profile-boundary-pilot.json`; it does not establish three-minute survival, and it is not used as the completed performance run. It exercised movement/sailing audio and also completed its five cleanup cycles. The pre-refactor baseline is preserved separately in `reports/profile-before-refactor.json`; its workload and audio state differ.

This is one desktop Chromium workload. It does not measure physical mobile hardware, every browser, all spawn-pressure settings or subjective audio quality. Gameplay balance was unchanged by the structural/audio refactor; the profiling pilot selects actual inputs only.


## Crew rescue working-build measurement — 13 October 2026

`reports/crew-rescue/profile.json` records the optimized balance-v5 working checkout with rescue, rapid green label grouping and concurrent UI/terminal changes, based on `d35fcfe` (uncommitted changes, not a release revision). Chromium 156.0.8078.4 used ANGLE/Direct3D11 on the RTX 3060 at 1280×800, 1×. A separate regression browser ran concurrently for part of the measurement; these figures describe the working machine and are not an isolated comparison with historical profiles.

The real keyboard defense pilot completed 180 active seconds, 17 credited kills, 10,469 measured frames, **59.26 FPS** mean, **16.8 ms P95**, and a 75-entity peak. No page errors or logical/visual pool exhaustion occurred; logical survivor peak was 10. Sound and music were enabled. The exact frozen configuration, pool/audio counters, raw intervals and gameplay bundle SHA-256 accompany the report.

After five real start/play/abandon cycles and forced GC, heap samples were 9,535,116 / 9,594,324 / 9,728,388 / 9,805,844 / 9,936,256 / 9,993,028 bytes: a 457,912-byte increase. Domain disposal tests confirm all crew slots return and pool capacity reaches zero; browser restart tests confirm no survivors/labels carry over. The aggregate heap continues to grow modestly, so this short run cannot distinguish application caches/JIT/MSW retention from a small leak or certify zero leaks. Longer heap-retainer analysis remains a measurement limitation.

To reproduce, build and start preview, then set `PROFILE_URL` to that preview origin and run `node reports/crew-rescue/Profile.mjs`. This task-local pilot adapts the existing profile script to the Sound toggle and writes evidence separately, preserving historical/concurrent reports. The defense pilot stresses effects and survivor lifetime; keyboard pickup regressions separately verify actual healing and +2 grouping on desktop/mobile. Physical-device FPS is not measured.
