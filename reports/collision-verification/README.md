# Island damage verification — 14 October 2026

Source baseline: `96ae791`, with uncommitted pause-menu changes and documentation/help refinements. Gameplay rule: `arena_00-v1/balance-v6`. The existing implementation originated in `fd64d34`; no collision algorithm or balance value was changed in this recheck.

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck, lint/architecture, format check | Passed | Local npm commands |
| Optimized production build | Passed | Isolated output under `test-results/collision-verification-build` |
| Domain regressions | 29/29 passed | [HTML](domain/index.html), [JSON](domain.json) |
| Desktop/mobile regressions and production smoke | 9/9 passed | [HTML](browser/index.html), [JSON](browser.json) |
| Production smoke after rebuilding the final help text | 1/1 passed (repeat of the smoke scenario above) | [HTML](production-final/index.html), [JSON](production-final.json) |

The final optimized build reports `96ae791692c3-dirty`. Its smoke check was repeated after formatting and rebuilding the updated How To Play text. The 38 distinct selected scenarios all passed; the repeated smoke is additional confirmation of that final local build.

Island impacts cost the player 1 health. Sustained coast contact does not drain health every simulation step; departing and returning can cause another impact. Arena borders do not cause island damage. Chaser ram retains its configured damage. Island damage passes through the normal damage system, updates statistics and feedback, can end the match by death, and never awards kill credit. Defaults live in `CollisionConfig.Default.islandImpactDamage` and are validated and frozen into the match snapshot.

Domain tests exercise those rules, including lethal contact and invalid damage settings. The browser selection verifies real helm input and HUD health, arena borders, acceleration/braking, actual Chaser/Shooter damage, pause/focus handling and production record registration/refresh.

The test commands used an isolated dev server at port 5231 and an optimized preview at port 5232. To reproduce in PowerShell from the repository root:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run build -- --outDir test-results/collision-verification-build
npm run preview -- --outDir test-results/collision-verification-build --port 5232 --strictPort
```

Keep preview running and use a second terminal:

```powershell
$env:PIRATE_TEST_PORT = '5231'
$env:PIRATE_SMOKE_URL = 'http://127.0.0.1:5232'
$env:PIRATE_TEST_REPORT_DIR = 'reports/collision-verification/domain'
$env:PIRATE_TEST_OUTPUT_DIR = 'test-results/collision-verification-domain'
npm run test:e2e -- --project=core

$env:PIRATE_TEST_REPORT_DIR = 'reports/collision-verification/browser'
$env:PIRATE_TEST_OUTPUT_DIR = 'test-results/collision-verification-browser'
npm run test:e2e -- --project=desktop --project=mobile-landscape --project=production-smoke --grep 'movement, rotation|player acceleration|Chaser ram deals|pause freezes|the published build'
```

This focused verification does not supersede the full Windows/Linux results on `0a46e89`. No screenshot baselines were changed. Physical devices, new profiling and public deployment were not checked in this task.
