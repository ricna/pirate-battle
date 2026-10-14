# Playwright summary

Generated from `reports/mobile-layout/full-playwright.json` by `npm run test:summary`. The full HTML report and traces remain local in `full-playwright/`; the final recheck is in `final-playwright/index.html`.

| Field | Value |
| --- | --- |
| Result | **120/123 passed**, 3 failed |
| Started | 2026-10-14T09:44:57.079Z |
| Duration | 22.8 minutes |
| Source commit | `c9f32a531c85` (with uncommitted source/test changes) |
| Playwright | 1.64.0 |
| Runner | Windows_NT 10.0.19045 (win32), Node v24.14.1 |

| Project | Passed | Failed | Flaky | Skipped |
| --- | ---: | ---: | ---: | ---: |
| mobile-layout | 9 | 0 | 0 | 0 |
| rendering | 2 | 0 | 0 | 0 |
| core | 29 | 0 | 0 | 0 |
| desktop | 40 | 1 | 0 | 0 |
| mobile-landscape | 39 | 2 | 0 | 0 |
| production-smoke | 1 | 0 | 0 | 0 |

| Project | Spec | Test | Status | Seconds |
| --- | --- | --- | --- | ---: |
| mobile-layout | mobile.spec.ts | camera follows the player, clamps all four shores and retains the desktop overview | passed | 0.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 568x320 | passed | 10.4 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 667x375 | passed | 9.4 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 844x390 | passed | 9.9 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 932x430 | passed | 10.4 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 320x568 | passed | 8.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 390x844 | passed | 7.6 |
| mobile-layout | mobile.spec.ts | fullscreen is explicit, survives Play and exits with synchronized controls | passed | 4.7 |
| mobile-layout | mobile.spec.ts | unsupported fullscreen explains the home-screen route and leaves menus usable | passed | 5.3 |
| rendering | rendering.spec.ts | a runtime devicePixelRatio change re-renders the canvas at the new density | passed | 6.1 |
| rendering | rendering.spec.ts | static water stays continuous at fractional viewport and DPI scales | passed | 21.4 |
| core | collision.spec.ts | swept hull contact prevents high-speed crossing and permits departure | passed | 0.0 |
| core | collision.spec.ts | opposing enemy hulls remain separated throughout motion | passed | 0.1 |
| core | collision.spec.ts | Chaser ram triggers on hull contact once without a credited kill | passed | 0.0 |
| core | collision.spec.ts | island contact dissipates speed and does not spam impacts while held | passed | 0.0 |
| core | collision.spec.ts | each separate island collision costs the player 1 health, never scores and can sink the ship | passed | 0.1 |
| core | collision.spec.ts | island impact damage must be a non-negative integer per allegiance | passed | 0.0 |
| core | core.spec.ts | configuration snapshots reject invalid profiles and identify edited balance | passed | 0.0 |
| core | core.spec.ts | pool grows within its cap, rejects foreign/double returns and resets leases | passed | 0.0 |
| core | core.spec.ts | reused projectiles reset ownership, damage, velocity, age and activation ID | passed | 0.0 |
| core | core.spec.ts | weapons defer a complete broadside when capacity is insufficient without consuming cooldown | passed | 0.0 |
| core | core.spec.ts | custom enemy registration selects its subclass without editing GameManager or rendering | passed | 0.0 |
| core | core.spec.ts | read ports cannot mutate private state; acceleration, braking, pause and disposal obey the lifecycle | passed | 0.0 |
| core | core.spec.ts | projectile acceleration and deceleration remain configured across different leases | passed | 0.0 |
| core | navigation.spec.ts | a route to a target inside a blocked navigation cell ends at the nearest reachable water | passed | 0.0 |
| core | navigation.spec.ts | a hidden chaser reaches a player hugging a coast instead of sailing away | passed | 0.1 |
| core | navigation.spec.ts | a hidden shooter reaches a player hugging a coast instead of sailing away | passed | 0.1 |
| core | navigation.spec.ts | a crowded seeded battle keeps enemies sailing instead of pinned to coasts or each other | passed | 6.3 |
| core | presentation.spec.ts | sinking emits 2–5 crew once, exercises six variants, remains on water and expires | passed | 0.3 |
| core | presentation.spec.ts | cosmetic events never modify combat, read ports omit commands and pause freezes all presentation | passed | 0.0 |
| core | presentation.spec.ts | reduced motion removes shake/drift, keeps damage/score signals and prevents duplicate rewards | passed | 0.0 |
| core | presentation.spec.ts | configuration rejects budgets that would silently omit required survivors | passed | 0.0 |
| core | presentation.spec.ts | victory timing rejects a fade longer than its terminal window | passed | 0.0 |
| core | presentation.spec.ts | audio catalog maps supplied WAVs and the owner-selected death cue without substitutes | passed | 0.0 |
| core | presentation.spec.ts | each survivor heals once, leaves the pool, and combines rapid rescues into a green label without score | passed | 0.0 |
| core | presentation.spec.ts | rescue detects a moving hull crossing crew and clamps healing to maximum health | passed | 0.0 |
| core | presentation.spec.ts | rescue profiles are validated and presentation settings never move pickup locations | passed | 0.0 |
| core | presentation.spec.ts | rapid rescue feedback updates the same label, restarts its lifetime and splits after the interval | passed | 0.0 |
| core | presentation.spec.ts | the authored ship trail follows the stern, stays bounded, freezes on pause and fades after stopping | passed | 0.0 |
| core | presentation.spec.ts | ship trail settings are validated and cover every live ship | passed | 0.0 |
| desktop | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 17.6 |
| mobile-landscape | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 20.8 |
| desktop | game.spec.ts | options validate, persist, and isolate new matches | passed | 11.2 |
| desktop | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 3.4 |
| desktop | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 3.5 |
| desktop | game.spec.ts | movement, rotation, island collision and arena limits | passed | 3.8 |
| desktop | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 3.4 |
| desktop | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 4.8 |
| desktop | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 3.6 |
| desktop | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 4.5 |
| desktop | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 4.8 |
| desktop | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 6.1 |
| desktop | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 5.6 |
| desktop | game.spec.ts | spawns follow the Enemy spawn time option | passed | 6.6 |
| desktop | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 5.8 |
| desktop | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 27.7 |
| desktop | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 14.0 |
| desktop | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 30.1 |
| desktop | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 9.4 |
| desktop | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 17.1 |
| desktop | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 25.0 |
| desktop | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 45.8 |
| desktop | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 7.0 |
| desktop | game.spec.ts | demo server reset confirmation is shown briefly | passed | 12.3 |
| desktop | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 55.7 |
| desktop | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 32.5 |
| desktop | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 48.5 |
| desktop | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 33.0 |
| desktop | game.spec.ts | authored loading bar follows engine, map and texture completion | unexpected | 17.0 |
| desktop | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 12.1 |
| mobile-landscape | game.spec.ts | options validate, persist, and isolate new matches | passed | 15.4 |
| mobile-landscape | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 4.0 |
| mobile-landscape | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 4.6 |
| mobile-landscape | game.spec.ts | movement, rotation, island collision and arena limits | passed | 6.2 |
| mobile-landscape | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 8.0 |
| mobile-landscape | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 6.0 |
| mobile-landscape | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 5.6 |
| mobile-landscape | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 7.0 |
| mobile-landscape | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 8.1 |
| mobile-landscape | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 9.3 |
| mobile-landscape | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 4.6 |
| mobile-landscape | game.spec.ts | spawns follow the Enemy spawn time option | passed | 10.2 |
| mobile-landscape | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 9.1 |
| mobile-landscape | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 35.1 |
| mobile-landscape | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 38.5 |
| mobile-landscape | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 51.6 |
| mobile-landscape | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 26.8 |
| mobile-landscape | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | unexpected | 71.6 |
| mobile-landscape | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 10.1 |
| mobile-landscape | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 10.2 |
| mobile-landscape | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 3.8 |
| mobile-landscape | game.spec.ts | demo server reset confirmation is shown briefly | passed | 9.0 |
| mobile-landscape | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 14.1 |
| mobile-landscape | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 12.7 |
| mobile-landscape | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 14.8 |
| mobile-landscape | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | unexpected | 16.1 |
| mobile-landscape | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 16.2 |
| mobile-landscape | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 18.4 |
| desktop | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 8.5 |
| desktop | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 5.7 |
| desktop | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 7.5 |
| desktop | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 5.4 |
| mobile-landscape | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 17.0 |
| mobile-landscape | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 9.2 |
| mobile-landscape | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 10.8 |
| mobile-landscape | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 6.4 |
| desktop | network.spec.ts | timeout: lists report an accessible error and recover | passed | 7.7 |
| desktop | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 4.7 |
| desktop | network.spec.ts | http-400: lists report an accessible error and recover | passed | 4.3 |
| desktop | network.spec.ts | http-500: lists report an accessible error and recover | passed | 5.2 |
| desktop | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 6.2 |
| desktop | network.spec.ts | variable latency resolves both lists deterministically | passed | 5.9 |
| desktop | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 5.8 |
| desktop | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 9.0 |
| mobile-landscape | network.spec.ts | timeout: lists report an accessible error and recover | passed | 9.7 |
| mobile-landscape | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 5.8 |
| mobile-landscape | network.spec.ts | http-400: lists report an accessible error and recover | passed | 6.5 |
| mobile-landscape | network.spec.ts | http-500: lists report an accessible error and recover | passed | 6.7 |
| mobile-landscape | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 9.2 |
| mobile-landscape | network.spec.ts | variable latency resolves both lists deterministically | passed | 5.9 |
| mobile-landscape | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 6.4 |
| mobile-landscape | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 17.3 |
| production-smoke | smoke.spec.ts | the published build serves its commit, mocks Ranking and History, and registers a battle | passed | 12.6 |
