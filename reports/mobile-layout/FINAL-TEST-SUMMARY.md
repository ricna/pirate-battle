# Playwright summary

Generated from `reports/mobile-layout/final-playwright.json` by `npm run test:summary`. The HTML report is [final-playwright/index.html](final-playwright/index.html).

| Field | Value |
| --- | --- |
| Result | **16/16 passed** |
| Started | 2026-10-14T10:07:54.593Z |
| Duration | 4.6 minutes |
| Source commit | `c7615c3787ef` (with uncommitted source/test changes) |
| Playwright | 1.64.0 |
| Runner | Windows_NT 10.0.19045 (win32), Node v24.14.1 |

| Project | Passed | Failed | Flaky | Skipped |
| --- | ---: | ---: | ---: | ---: |
| mobile-layout | 9 | 0 | 0 | 0 |
| desktop | 3 | 0 | 0 | 0 |
| mobile-landscape | 3 | 0 | 0 | 0 |
| production-smoke | 1 | 0 | 0 | 0 |

| Project | Spec | Test | Status | Seconds |
| --- | --- | --- | --- | ---: |
| mobile-layout | mobile.spec.ts | camera follows the player, clamps all four shores and retains the desktop overview | passed | 0.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 568x320 | passed | 12.9 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 667x375 | passed | 12.4 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 844x390 | passed | 15.1 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 932x430 | passed | 13.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 320x568 | passed | 11.0 |
| mobile-layout | mobile.spec.ts | compact menus and HUD remain usable at 390x844 | passed | 12.5 |
| mobile-layout | mobile.spec.ts | fullscreen is explicit, survives Play and exits with synchronized controls | passed | 7.3 |
| mobile-layout | mobile.spec.ts | unsupported fullscreen explains the home-screen route and leaves menus usable | passed | 9.3 |
| desktop | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 8.1 |
| desktop | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 10.3 |
| desktop | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 6.9 |
| mobile-landscape | game.spec.ts | pause freezes simulation and cooldowns, focus loss requires explicit resume | passed | 14.5 |
| mobile-landscape | game.spec.ts | versioned menu, arena and result visual baselines; layout fits supported screens | passed | 17.3 |
| mobile-landscape | game.spec.ts | authored loading bar follows engine, map and texture completion | passed | 12.3 |
| production-smoke | smoke.spec.ts | the published build serves its commit, mocks Ranking and History, and registers a battle | passed | 8.1 |
