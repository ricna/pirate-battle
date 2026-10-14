# Playwright summary

Generated from `reports/playwright.json` by `scripts/report-summary.mjs`. The HTML report is `reports/playwright/index.html`.

| Field | Value |
| --- | --- |
| Result | **151/151 passed** |
| Started | 2026-10-14T19:50:38.211Z |
| Duration | 27.7 minutes |
| Source commit | `7c4f055c877a` |
| Playwright | 1.64.0 |
| Runner | Linux 6.18.40.1-microsoft-standard-WSL2 (linux), Node v24.21.0 |

| Project | Passed | Failed | Flaky | Skipped |
| --- | ---: | ---: | ---: | ---: |
| mobile-layout | 22 | 0 | 0 | 0 |
| rendering | 2 | 0 | 0 | 0 |
| core | 34 | 0 | 0 | 0 |
| desktop | 46 | 0 | 0 | 0 |
| mobile-landscape | 46 | 0 | 0 | 0 |
| production-smoke | 1 | 0 | 0 | 0 |

| Project | Spec | Test | Status | Seconds |
| --- | --- | --- | --- | ---: |
| mobile-layout | mobile.spec.ts | menu screens fit without scrolling at 568x320 | passed | 9.8 |
| mobile-layout | mobile.spec.ts | menu screens fit without scrolling at 844x390 | passed | 5.2 |
| mobile-layout | mobile.spec.ts | menu screens fit without scrolling at 320x568 | passed | 4.9 |
| mobile-layout | mobile.spec.ts | pause options and battle results fit on a short landscape phone and after portrait rotation | passed | 27.4 |
| mobile-layout | mobile.spec.ts | camera follows the player, clamps all four shores and retains the desktop overview | passed | 0.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 568x320 | passed | 21.9 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 667x375 | passed | 21.5 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 844x390 | passed | 23.9 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 932x430 | passed | 31.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 320x568 | passed | 31.3 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 390x844 | passed | 26.8 |
| mobile-layout | mobile.spec.ts | full screen is required: the first gesture enters it and a gesture after a browser exit returns | passed | 5.9 |
| mobile-layout | mobile.spec.ts | Alt+Enter keeps a window until the player chooses full screen again, pausing a battle | passed | 7.6 |
| mobile-layout | mobile.spec.ts | unsupported full screen never blocks play and Alt+Enter explains the home-screen route | passed | 7.4 |
| mobile-layout | mobile.spec.ts | a refused full-screen request is explained once and offers another attempt | passed | 3.2 |
| mobile-layout | mobile.spec.ts | Quit closes a tab that the page may close | passed | 4.7 |
| mobile-layout | mobile.spec.ts | Quit leaves full screen before closing and explains a tab the browser keeps open | passed | 4.4 |
| mobile-layout | mobile.spec.ts | dragging Forward steers in the directions of the rotated layout | passed | 7.6 |
| mobile-layout | mobile.spec.ts | native Keyboard Lock keeps a short Escape press in fullscreen while pause and dialogs work | passed | 8.5 |
| mobile-layout | mobile.spec.ts | unavailable or denied Keyboard Lock never prevents fullscreen entry or exit | passed | 6.7 |
| mobile-layout | mobile.spec.ts | Alt+Enter still works while the lazy game engine prepares | passed | 7.2 |
| mobile-layout | mobile.spec.ts | a late keyboard capture never blocks Alt+Enter exit and is released after any fullscreen exit | passed | 5.2 |
| rendering | rendering.spec.ts | a runtime devicePixelRatio change re-renders the canvas at the new density | passed | 9.1 |
| rendering | rendering.spec.ts | static water stays continuous at fractional viewport and DPI scales | passed | 68.3 |
| core | collision.spec.ts | swept hull contact prevents high-speed crossing and permits departure | passed | 0.0 |
| core | collision.spec.ts | opposing enemy hulls remain separated throughout motion | passed | 0.2 |
| core | collision.spec.ts | Chaser ram triggers on hull contact once without a credited kill | passed | 0.0 |
| core | collision.spec.ts | island contact dissipates speed and does not spam impacts while held | passed | 0.2 |
| core | collision.spec.ts | each separate island collision costs the player 1 health, never scores and can sink the ship | passed | 0.1 |
| core | collision.spec.ts | island impact damage must be a non-negative integer per allegiance | passed | 0.0 |
| core | collision.spec.ts | ship hull radius must exceed half of the sprite width | passed | 0.0 |
| core | core.spec.ts | configuration snapshots reject invalid profiles and identify edited balance | passed | 0.1 |
| core | core.spec.ts | pool grows within its cap, rejects foreign/double returns and resets leases | passed | 0.0 |
| core | core.spec.ts | reused projectiles reset ownership, damage, velocity, age and activation ID | passed | 0.0 |
| core | core.spec.ts | weapons defer a complete broadside when capacity is insufficient without consuming cooldown | passed | 0.0 |
| core | core.spec.ts | custom enemy registration selects its subclass without editing GameManager or rendering | passed | 0.1 |
| core | core.spec.ts | read ports cannot mutate private state; acceleration, braking, pause and disposal obey the lifecycle | passed | 0.1 |
| core | core.spec.ts | projectile acceleration and deceleration remain configured across different leases | passed | 0.0 |
| core | navigation.spec.ts | a route to a target inside a blocked navigation cell ends at the nearest reachable water | passed | 0.0 |
| core | navigation.spec.ts | a hidden chaser reaches a player hugging a coast instead of sailing away | passed | 0.1 |
| core | navigation.spec.ts | a hidden shooter reaches a player hugging a coast instead of sailing away | passed | 0.1 |
| core | navigation.spec.ts | a crowded seeded battle keeps enemies sailing instead of pinned to coasts or each other | passed | 15.0 |
| core | presentation.spec.ts | sinking emits 2–5 crew once, exercises six variants, remains on water and expires | passed | 1.0 |
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
| core | spawning.spec.ts | the opening fleet sails at once and every 1 sunk enemies call in one immediate extra enemy | passed | 5.9 |
| core | spawning.spec.ts | the opening fleet sails at once and every 2 sunk enemies call in one immediate extra enemy | passed | 5.8 |
| core | spawning.spec.ts | spawns pick among the farthest safe points and never reuse a recent point | passed | 0.1 |
| core | spawning.spec.ts | spawn balance settings are validated | passed | 0.0 |
| desktop | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 21.7 |
| mobile-landscape | accessibility.spec.ts | menus, records, gameplay HUD, pause dialog and results pass automated WCAG 2.1 AA checks | passed | 12.9 |
| desktop | game.spec.ts | options validate, persist, and isolate new matches | passed | 22.4 |
| desktop | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 4.4 |
| desktop | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 5.5 |
| desktop | game.spec.ts | movement, rotation, island collision and arena limits | passed | 8.1 |
| desktop | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 8.2 |
| desktop | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 7.7 |
| desktop | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 8.0 |
| desktop | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 22.9 |
| desktop | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 6.3 |
| desktop | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 16.8 |
| desktop | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 39.0 |
| desktop | game.spec.ts | spawns follow the Enemy spawn time option | passed | 9.1 |
| desktop | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 13.4 |
| desktop | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 266.9 |
| desktop | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 5.0 |
| desktop | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 24.1 |
| desktop | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 4.8 |
| desktop | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 5.3 |
| desktop | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 4.2 |
| desktop | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 11.0 |
| desktop | game.spec.ts | dragging Forward steers toward the touch delta while sailing | passed | 8.8 |
| desktop | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 2.2 |
| desktop | game.spec.ts | demo server reset confirmation is shown briefly | passed | 6.5 |
| desktop | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 13.6 |
| desktop | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 9.3 |
| desktop | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 8.8 |
| desktop | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 8.6 |
| desktop | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 3.4 |
| desktop | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 39.9 |
| mobile-landscape | game.spec.ts | options validate, persist, and isolate new matches | passed | 11.0 |
| mobile-landscape | game.spec.ts | invalid persisted options are rejected with a visible warning and defaults | passed | 2.0 |
| mobile-landscape | game.spec.ts | authored map loading failure is visible and retry succeeds | passed | 2.7 |
| mobile-landscape | game.spec.ts | movement, rotation, island collision and arena limits | passed | 4.7 |
| mobile-landscape | game.spec.ts | the authored ship trail follows the sailing player and fades after it stops | passed | 4.5 |
| mobile-landscape | game.spec.ts | player acceleration and braking are gradual and stop without held input | passed | 4.0 |
| mobile-landscape | game.spec.ts | front and parallel broadsides obey independent cooldowns and expire | passed | 4.0 |
| mobile-landscape | game.spec.ts | one cannonball applies its configured damage once; one destroyed enemy awards exactly one point | passed | 13.1 |
| mobile-landscape | game.spec.ts | missing ship atlas fails visibly and can be loaded on retry | passed | 3.1 |
| mobile-landscape | game.spec.ts | failed lazy engine module has an accessible error and reload recovery | passed | 4.4 |
| mobile-landscape | game.spec.ts | both enemy behaviours appear on schedule, approach and navigate around obstacles | passed | 25.4 |
| mobile-landscape | game.spec.ts | spawns follow the Enemy spawn time option | passed | 4.7 |
| mobile-landscape | game.spec.ts | a Chaser ram deals its configured damage without scoring; Shooter cannonballs hurt the player | passed | 10.8 |
| mobile-landscape | game.spec.ts | real cannon input wins on time, fades survival text before results and restarts cleanly | passed | 241.3 |
| mobile-landscape | game.spec.ts | death stops combat; the result stays displayed and persisted after refresh | passed | 4.5 |
| mobile-landscape | game.spec.ts | terminal sinking persists once before revealing results and keeps crew visible | passed | 26.1 |
| mobile-landscape | game.spec.ts | reduced-motion preference preserves input, feedback and pause cleanup | passed | 4.3 |
| mobile-landscape | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 5.7 |
| mobile-landscape | game.spec.ts | hiding the tab pauses combat and showing it again still requires Resume | passed | 5.2 |
| mobile-landscape | game.spec.ts | abandonment, repeated mounts, refresh and simultaneous touch controls | passed | 10.5 |
| mobile-landscape | game.spec.ts | dragging Forward steers toward the touch delta while sailing | passed | 8.4 |
| mobile-landscape | game.spec.ts | how to play explains the controls and only returns to the main menu | passed | 2.0 |
| mobile-landscape | game.spec.ts | demo server reset confirmation is shown briefly | passed | 5.9 |
| mobile-landscape | game.spec.ts | ranking and history handle pages, empty lists, loading and errors | passed | 9.3 |
| mobile-landscape | game.spec.ts | pending outage submission survives refresh and updates both tabs | passed | 6.1 |
| mobile-landscape | game.spec.ts | post-commit timeout retries idempotently and late requests do not replace current data | passed | 7.9 |
| mobile-landscape | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 7.2 |
| mobile-landscape | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 3.0 |
| mobile-landscape | game.spec.ts | floating crew rescue heals once per person with green feedback and freezes on pause | passed | 25.2 |
| desktop | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 7.3 |
| desktop | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 3.8 |
| desktop | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 5.8 |
| desktop | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 2.3 |
| mobile-landscape | music.spec.ts | one authored soundtrack survives navigation, pause and repeated match teardown | passed | 7.3 |
| mobile-landscape | music.spec.ts | music volume persists, migrates legacy options and respects master mute and volume | passed | 3.0 |
| mobile-landscape | music.spec.ts | leaving results or restarting restores the music before the death cue finishes | passed | 5.7 |
| mobile-landscape | music.spec.ts | a soundtrack load failure is visible and a later gesture retries the authored MP3 | passed | 2.0 |
| desktop | network.spec.ts | timeout: lists report an accessible error and recover | passed | 6.9 |
| desktop | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 3.9 |
| desktop | network.spec.ts | http-400: lists report an accessible error and recover | passed | 3.9 |
| desktop | network.spec.ts | http-500: lists report an accessible error and recover | passed | 3.7 |
| desktop | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 5.4 |
| desktop | network.spec.ts | variable latency resolves both lists deterministically | passed | 2.8 |
| desktop | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 3.4 |
| desktop | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 9.1 |
| desktop | network.spec.ts | a restarted mock service worker is re-activated, so lists and registration keep working | passed | 5.5 |
| mobile-landscape | network.spec.ts | timeout: lists report an accessible error and recover | passed | 6.9 |
| mobile-landscape | network.spec.ts | connection-error: lists report an accessible error and recover | passed | 3.8 |
| mobile-landscape | network.spec.ts | http-400: lists report an accessible error and recover | passed | 3.8 |
| mobile-landscape | network.spec.ts | http-500: lists report an accessible error and recover | passed | 3.8 |
| mobile-landscape | network.spec.ts | slow responses show loading, and background refreshes keep cached rows visible | passed | 5.6 |
| mobile-landscape | network.spec.ts | variable latency resolves both lists deterministically | passed | 2.9 |
| mobile-landscape | network.spec.ts | an out-of-order ranking response is cancelled and never replaces the newer view | passed | 3.5 |
| mobile-landscape | network.spec.ts | a pending battle never blocks a new match, and repeated retries register it once | passed | 9.7 |
| mobile-landscape | network.spec.ts | a restarted mock service worker is re-activated, so lists and registration keep working | passed | 4.2 |
| desktop | pause.spec.ts | pause board offers Resume, Options and Main Menu like the reference | passed | 3.7 |
| desktop | pause.spec.ts | options opened from pause save immediately without changing the running battle | passed | 5.0 |
| desktop | pause.spec.ts | leaving from pause asks for confirmation and Stay here returns to the pause board | passed | 3.5 |
| mobile-landscape | pause.spec.ts | pause board offers Resume, Options and Main Menu like the reference | passed | 3.9 |
| mobile-landscape | pause.spec.ts | options opened from pause save immediately without changing the running battle | passed | 5.7 |
| mobile-landscape | pause.spec.ts | leaving from pause asks for confirmation and Stay here returns to the pause board | passed | 4.2 |
| production-smoke | smoke.spec.ts | the published build serves its commit, mocks Ranking and History, and registers a battle | passed | 3.6 |
