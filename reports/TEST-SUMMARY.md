# Playwright summary

Generated from `reports/playwright.json` by `npm run test:summary`. The HTML report is `reports/playwright/index.html`.

| Field | Value |
| --- | --- |
| Result | **125/125 passed** |
| Started | 2026-10-14T10:33:48.330Z |
| Duration | 8.6 minutes |
| Source commit | `06dce183ab17` |
| Playwright | 1.64.0 |
| Runner | Windows_NT 10.0.19045 (win32), Node v24.14.1 |

| Project | Passed | Failed | Flaky | Skipped |
| --- | ---: | ---: | ---: | ---: |
| mobile-layout | 9 | 0 | 0 | 0 |
| rendering | 2 | 0 | 0 | 0 |
| core | 29 | 0 | 0 | 0 |
| desktop | 42 | 0 | 0 | 0 |
| mobile-landscape | 42 | 0 | 0 | 0 |
| production-smoke | 1 | 0 | 0 | 0 |

| Project | Spec | Test | Status | Seconds |
| --- | --- | --- | --- | ---: |
| mobile-layout | mobile.spec.ts | camera follows the player, clamps all four shores and retains the desktop overview | passed | 0.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 568x320 | passed | 7.6 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 667x375 | passed | 11.3 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 844x390 | passed | 16.6 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 932x430 | passed | 6.3 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 320x568 | passed | 5.3 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 390x844 | passed | 5.7 |
| mobile-layout | mobile.spec.ts | fullscreen is explicit, survives Play and exits with synchronized controls | passed | 2.4 |
| mobile-layout | mobile.spec.ts | unsupported fullscreen explains the home-screen route and leaves menus usable | passed | 2.4 |
| rendering | rendering.spec.ts | a runtime devicePixelRatio change re-renders the canvas at the new density | passed | 3.7 |
| rendering | rendering.spec.ts | static water stays continuous at fractional viewport and DPI scales | passed | 13.1 |
| core | collision.spec.ts | swept hull contact prevents high-speed crossing and permits departure | passed | 0.0 |
| core | collision.spec.ts | opposing enemy hulls remain separated throughout motion | passed | 0.1 |
| core | collision.spec.ts | Chaser ram triggers on hull contact once without a credited kill | passed | 0.0 |
| core | collision.spec.ts | island contact dissipates speed and does not spam impacts while held | passed | 0.0 |
| core | collision.spec.ts | each separate island collision costs the player 1 health, never scores and can sink the ship | passed | 0.0 |
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
| core | navigation.spec.ts | a hidden shooter reaches a player hugging a coast instead of sailing away | passed | 0.0 |
| core | navigation.spec.ts | a crowded seeded battle keeps enemies sailing instead of pinned to coasts or each other | passed | 5.8 |
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
| desktop | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 10.5 |
| mobile-landscape | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 10.4 |
| desktop | game.spec.ts | options validate, persist, and isolate new matches | passed | 9.9 |
| desktop | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 2.6 |
| desktop | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 3.1 |
| desktop | game.spec.ts | movement, rotation, island collision and arena limits | passed | 2.5 |
| desktop | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 2.6 |
| desktop | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 2.7 |
| desktop | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 2.7 |
| desktop | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 3.0 |
| desktop | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 2.7 |
| desktop | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 3.9 |
| desktop | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 2.5 |
| desktop | game.spec.ts | spawns follow the Enemy spawn time option | passed | 3.7 |
| desktop | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 2.7 |
| desktop | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 18.3 |
| desktop | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 3.8 |
| desktop | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 17.8 |
| desktop | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 2.5 |
| desktop | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 2.6 |
| desktop | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 2.8 |
| desktop | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 4.4 |
| desktop | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 1.8 |
| desktop | game.spec.ts | demo server reset confirmation is shown briefly | passed | 6.1 |
| desktop | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 8.4 |
| desktop | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 5.1 |
| desktop | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 7.2 |
| desktop | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 5.3 |
| desktop | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 2.6 |
| desktop | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 5.5 |
| mobile-landscape | game.spec.ts | options validate, persist, and isolate new matches | passed | 9.6 |
| mobile-landscape | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 2.5 |
| mobile-landscape | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 2.7 |
| mobile-landscape | game.spec.ts | movement, rotation, island collision and arena limits | passed | 2.7 |
| mobile-landscape | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 2.8 |
| mobile-landscape | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 2.4 |
| mobile-landscape | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 2.4 |
| mobile-landscape | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 3.1 |
| mobile-landscape | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 3.0 |
| mobile-landscape | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 4.1 |
| mobile-landscape | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 2.5 |
| mobile-landscape | game.spec.ts | spawns follow the Enemy spawn time option | passed | 3.6 |
| mobile-landscape | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 2.5 |
| mobile-landscape | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 17.8 |
| mobile-landscape | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 3.8 |
| mobile-landscape | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 17.9 |
| mobile-landscape | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 2.5 |
| mobile-landscape | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 2.7 |
| mobile-landscape | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 2.7 |
| mobile-landscape | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 4.4 |
| mobile-landscape | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 2.0 |
| mobile-landscape | game.spec.ts | demo server reset confirmation is shown briefly | passed | 6.3 |
| mobile-landscape | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 9.1 |
| mobile-landscape | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 5.5 |
| mobile-landscape | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 7.5 |
| mobile-landscape | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 4.9 |
| mobile-landscape | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 2.8 |
| mobile-landscape | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 5.0 |
| desktop | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 4.1 |
| desktop | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 3.2 |
| desktop | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 2.8 |
| desktop | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 2.2 |
| mobile-landscape | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 4.1 |
| mobile-landscape | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 3.4 |
| mobile-landscape | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 3.3 |
| mobile-landscape | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 2.2 |
| desktop | network.spec.ts | timeout: lists report an accessible error and recover | passed | 6.9 |
| desktop | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 3.7 |
| desktop | network.spec.ts | http-400: lists report an accessible error and recover | passed | 3.8 |
| desktop | network.spec.ts | http-500: lists report an accessible error and recover | passed | 3.8 |
| desktop | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 5.4 |
| desktop | network.spec.ts | variable latency resolves both lists deterministically | passed | 2.9 |
| desktop | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 3.7 |
| desktop | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 7.2 |
| desktop | network.spec.ts | a restarted mock service worker is re-activated, so lists and registration keep working | passed | 3.4 |
| mobile-landscape | network.spec.ts | timeout: lists report an accessible error and recover | passed | 6.9 |
| mobile-landscape | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 3.5 |
| mobile-landscape | network.spec.ts | http-400: lists report an accessible error and recover | passed | 3.9 |
| mobile-landscape | network.spec.ts | http-500: lists report an accessible error and recover | passed | 3.8 |
| mobile-landscape | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 5.6 |
| mobile-landscape | network.spec.ts | variable latency resolves both lists deterministically | passed | 3.0 |
| mobile-landscape | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 3.9 |
| mobile-landscape | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 7.0 |
| mobile-landscape | network.spec.ts | a restarted mock service worker is re-activated, so lists and registration keep working | passed | 3.2 |
| production-smoke | smoke.spec.ts | the published build serves its commit, mocks Ranking and History, and registers a battle | passed | 3.5 |
