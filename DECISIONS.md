# Product and design decisions — Pirate Battle

Accepted product, gameplay and presentation decisions, in the order they were made. Each entry records what was decided and the constraints an implementation must preserve. Engineering rules live in [IMPLEMENTATION.md](IMPLEMENTATION.md); the product brief is [CHALLENGE.md](CHALLENGE.md) and its traceability matrix is [REQUIREMENTS.md](REQUIREMENTS.md).

- "Owner" is the product owner of this repository.
- A later entry may supersede part of an earlier one; the superseding entry says so explicitly.
- A new or changed decision gets its own entry, together with the matching code, configuration, tests and documentation.

| ID | Decision | Accepted |
| --- | --- | --- |
| D01 | [Gameplay presentation scope (B01–B11)](#d01--gameplay-presentation-scope-b01b11) | 12 October 2026 |
| D02 | [Continuous soundtrack](#d02--continuous-soundtrack) | 13 October 2026 |
| D03 | [Main menu composition](#d03--main-menu-composition) | 13 October 2026 |
| D04 | [Ship wake removal](#d04--ship-wake-removal) | 13 October 2026 |
| D05 | [Owner-authored water splash](#d05--owner-authored-water-splash) | 13 October 2026 |
| D06 | [Gameplay HUD composition](#d06--gameplay-hud-composition) | 13 October 2026 |
| D07 | [Options composition](#d07--options-composition) | 13 October 2026 |
| D08 | [Player-death presentation](#d08--player-death-presentation) | 13 October 2026 |
| D09 | [Time-expiry victory](#d09--time-expiry-victory) | 13 October 2026 |
| D10 | [Asset loading presentation](#d10--asset-loading-presentation) | 13 October 2026 |
| D11 | [Crew rescue](#d11--crew-rescue) | 13 October 2026 |
| D12 | [Pause composition](#d12--pause-composition) | 14 October 2026 |
| D13 | [Mobile camera and responsive layout](#d13--mobile-camera-and-responsive-layout) | 14 October 2026 |
| D14 | [Island collision damage](#d14--island-collision-damage) | 14 October 2026 |
| D15 | [Ship hull radius](#d15--ship-hull-radius) | 14 October 2026 |
| D16 | [Ship trail](#d16--ship-trail) | 14 October 2026 |
| D17 | [Screen routes and result persistence](#d17--screen-routes-and-result-persistence) | 14 October 2026 |
| D18 | [Fullscreen keyboard controls](#d18--fullscreen-keyboard-controls) | 14 October 2026 |
| D19 | [Compact result and no-scroll screens](#d19--compact-result-and-no-scroll-screens) | 14 October 2026 |

## D01 — Gameplay presentation scope (B01–B11)

_Accepted 12 October 2026._

The owner explicitly requested review and implementation of the consolidated gameplay brief on 12 October 2026. Its durable requirements are:

- All code is original to this project; third-party code enters only as declared dependencies. Supplied Jungle Gaming assets and `sample_*` compositions are the primary art references.
- B01: perceptible configured acceleration/braking, bounded rotation, pause/reset and collision that does not accumulate artificial acceleration into a wall.
- B02/B03: muzzle flash, limited visual recoil, meaningful cooldown feedback, hull damage flash/debris/damage indication and contextual hull/water/coast impacts. Use the four authored wood variants, fire and explosion frames. Camera shake/recoil affect presentation only, with reduced-motion handling and stable HUD/input/world coordinates.
- B04: every destroyed ship, including player and Chaser ram, emits exactly one group of 2–5 crew using the six supplied variants. They disperse briefly, remain floating with small drift/bob and visible foam, then fade after a configured duration. Keep them on valid water, freeze on pause and clear on abandonment/restart. Crew now have non-blocking rescue triggers and restore player health, as requested on 13 October 2026 (see Crew rescue below). They are never weapon targets or kill-score rewards. Capacity must support the required count instead of silently reducing it.
- Foam/ring/wake/trail images were not confirmed as separate supplied frames by the earlier brief. Audit the actual metadata. If complementary art is necessary, the brief authorizes authoring and saving explicit project assets in this implementation stage, documenting provenance and loading them through validated references. Do not synthesize runtime fallback graphics or crop arbitrary pieces of reference screenshots.
- B05: one visible `+1`, HUD response and score sound per actual credited kill, never for crew/debris/ram.
- B06: freeze combat and persist/enqueue the final record immediately and once; allow a bounded terminal presentation window for explosion/sinking/crew before the result screen. Preserve terminal audio across that transition. Distinguish defeat/completion, use authored UI and report real statistics; do not invent accuracy without defined counters. Refresh must not replay terminal events.
- B07: audit all 27 supplied WAVs and give each useful cue/variant an explicit event and reproducible scenario. Loading a sound does not demonstrate use. Sailing responds to actual speed. Bound/prioritize voices and preserve unlock, mute, volume and failure handling.
- B08/B09: animate the supplied deep-water texture while keeping Tiled coast/props/colliders stable; add short bounded ship wakes following position history and projectile trails behind their velocity. Configure appearance/lifetimes, avoid atlas bleed/gaps and preserve gameplay range/damage. Pause/reduced motion and cleanup apply to all decoration.
- B10: centralize sprite/atlas/profile references. Shared ship/parts/crew/effect and HUD atlases are preferred for Pixi; individual PNGs remain valid for React. Repeated water may explicitly use its standalone tile to avoid bleed. Default/retina preserve logical sizes. Do not load duplicate representations unnecessarily. Full ships versus authored part assembly is a presentation choice, not a blocker for the required effects.
- B11: preserve simultaneous keyboard/touch, focus, pause and pressed controls; show weapon readiness, low health and remaining-time warnings. Rotation remains A/D, not strafing. Joystick and free mouse aiming are not accepted requirements.
- Audit all supplied PNGs/XML/JSON/WAVs by category, frame and usage. Use useful categories/variants; document legitimate omissions such as duplicate resolution or irrelevant composition. Do not fill the arena with every asset just to claim coverage.
- Use typed one-shot presentation events with meaningful identity/position/weapon/damage/cause/credit data. Consumers must not reapply damage or score. Presentation RNG is independent from gameplay RNG; cosmetic resources have bounded budgets and session ownership.
- Verify actual combat feedback, death/crew and result on desktop/mobile; 2–5 crew per destruction, pause/terminal/restart behavior, all sound mappings and reduced motion. Profile the final build with effects enabled for a three-minute session and five lifecycle cycles. Save stable captures and compare crew/foam composition with the samples; automated tests do not replace visual/auditory review.

B01–B09 are required presentation work; B10–B11 are lower-priority required polish in the accepted brief. Architecture improvements alone do not complete that scope. Track implementation/evidence per item rather than marking the whole brief complete on the strength of an earlier gameplay test run.

## D02 — Continuous soundtrack

_Accepted 13 October 2026._

The authored MP3 plays continuously across menus, gameplay, pause, results and restarts after a user gesture, with its own persisted Music volume under the master Sound/Volume controls. Match teardown stops match effects/ambience but does not reset the application's music.

## D03 — Main menu composition

_Accepted 13 October 2026._

The owner required the main menu to match `assets/sample_menu.png` exactly, with these accepted additions resolving brief requirements the sample does not show:

- A **How To Play** button in the bottom row opens a screen with the game explanation and controls; its only action returns to the main menu. This satisfies the brief's control instructions in the main menu.
- **Ranking** and **Match History** open the Captain's Log screen with both tabs, reproducing `sample_ranking.png` and `sample_history.png`. Ranking shows rank, captain (star for the leader), points and UTC play date; history shows UTC date, points, mm:ss duration and result. Ranking highlights this player's records; history highlights the last completed battle. Fixture data, not the sample's example names, fills the rows.
- The MSW scenario selector and reset stay available in a collapsed panel in the bottom-left corner. The Jungle Gaming logo sits in the bottom-right corner as in the samples. The menu no longer shows a last-result link or a credit footer; the last result is still persisted.
- Reproduce reference compositions with measured values in reference pixels (`--sample-px`), authored PNG/SVG pieces and real controls. Verify a change against the reference image at 1800×1000 before accepting it; do not crop the samples.

## D04 — Ship wake removal

_Accepted 13 October 2026._

The owner requested complete removal of the existing ship wake before implementing a replacement. Remove the old stamped wake emitter, configuration, asset registration and the former `authored/wake.svg` image; do not merely hide it or set its opacity to zero. Preserve projectile trails, crew foam, splashes, water motion and other feedback. Preserve the owner's `assets/authored/shipt-trail.png` unchanged and do not wire a replacement in this removal task. The two continuous wakes discussed in B08/B09 remain pending future implementation with original code and explicitly authored art.

## D05 — Owner-authored water splash

_Accepted 13 October 2026._

The owner replaced the water splash art with a PNG manually authored in Krita. `assets/authored/Splash.png` is the runtime texture; `Splash.kra` is its editable source. Keep the logical `authored/water_splash` key and select the PNG through `AssetConfig.Standalone`. The previous SVG is retained as unused source art. Preserve the effect's configured dimensions, duration and impact triggers unless separately requested. Validate both texture loading and an actual impact render; a preload or a static filename reference alone does not demonstrate use.

## D06 — Gameplay HUD composition

_Accepted 13 October 2026._

The owner required the gameplay screen to match `assets/sample.png` exactly, including the mobile buttons and the HUD in general:

- The arena fills the viewport; there is no frame, header bar, footer or button captions. The map keeps its uniform contain fit and the deep-water tiling sprite extends under any letterbox area, as the owner chose on 13 October 2026 after comparing it with letterbox bands. Known trade-off: on screens whose proportion differs from the map, the ship stops at the authored map bounds while water continues beyond them.
- The HUD is a React overlay (`src/ui/hud/MatchStatusHud.tsx`, `TouchControls.tsx`, `GameHud.css`) using the retina HUD pieces at positions/sizes measured by template-matching them against the reference: heart and health frame with `current / max` at the top left; score, `mm:ss` clock and pause at the top right; turn-left/forward/turn-right at the bottom left; left broadside/front cannon/right broadside at the bottom right; the Jungle Gaming wordmark above the weapon cluster.
- Lengths use `--hud-px`, one reference pixel. It is exact at 1800×1000 and keeps at least 0.72 of the reference on small screens so touch buttons stay about 55 CSS pixels, unless the top row would not fit.
- The health fill follows the atlas `fill_rect`/`clip_axis` and the player's authored fill stages. Weapon readiness darkens the button face clockwise while reloading; a ready weapon looks exactly like the reference. Keyboard controls remain documented in How To Play.

## D07 — Options composition

_Accepted 13 October 2026._

The owner required the Options screen to match `assets/sample_options.png`, keeping sound settings and the restore action:

- The board reproduces the reference measurements in `--options-px` reference pixels: title, Game session time and Enemy spawn time rows with authored round minus/plus buttons, then MAIN MENU. Sound (Off/On) and Volume follow the two required rows in the same style; Restore default options is a text action below MAIN MENU. Tall screens fit the whole board; short landscape phones keep at least 0.75 of the reference and scroll.
- Steppers produce only valid values: the step sizes live in `OptionsConfig.Steps`, and each documented limit disables the button that would leave the range. Every press is saved immediately; there is no Save button. Ranges remain available to assistive technology as each setting's description.

The owner subsequently refined this composition on 13 October 2026: group the settings under **Game** and **Audio** headers. Sound uses an accessible On/Off toggle. Game session time, Enemy spawn time, master Volume and Music volume each show the value above a slider, with the existing minus/plus buttons on its sides. Sliders reuse the authored HUD health frame, amber fill and round control art, following the atlas fill rectangle. Keyboard, pointer and touch changes retain the existing limits and steps (10 seconds, 0.2 seconds and 10%) with immediate persistence.

## D08 — Player-death presentation

_Accepted 13 October 2026._

On player death, play the owner's `assets/sounds/extra/576054__istudeny__pirat-battle.wav` once, replacing the original `game_over.wav` cue. Drastically lower the persistent OST (8% of the configured music mix), without rewriting saved volumes or restarting the track. Preserve the approximately 14-second cue through result reveal; restore the mix when it finishes or the player starts another battle/returns to the menu.

Freeze combat and persist/enqueue the completed record immediately. Show destruction for 3 seconds while **Game Over** fades in, then fade the result screen in over 1 second while Game Over fades out. Keep the arena alive beneath that crossfade and dispose it when the transition completes. Time expiry uses the victory presentation below, keeps its distinct completion cue and does not duck the soundtrack.

## D09 — Time-expiry victory

_Accepted 13 October 2026._

Surviving the session displays **VICTORY** in Match History and the result screen, while retaining the serialized `time` end reason. Show **You survived! Congratulations!** over the frozen arena in the UI's amber yellow with a black outline. The message lasts 4 seconds total: fully opaque for 2 seconds, then fading out over the final 2 seconds before Results opens. Drive the fade and reveal from the session's terminal clock, including hidden-tab suspension. Combat and final-record persistence end immediately; death retains its separate presentation and soundtrack ducking.

## D10 — Asset loading presentation

_Accepted 13 October 2026._

The owner requires an authored progress bar whenever game assets are loading, including the map and the lazy game module. Use the same player-health frame and green fill, respecting the atlas fill rectangle, with a prominent Setting Sail heading and readable stage/percentage text. The map/texture bar follows actual loader completion callbacks; it is not a download-byte estimate. Module preparation is indeterminate and must not invent a percentage. Retry resets the visible progress, required asset failures remain visible, and reduced motion disables the preparation pulse.


## D11 — Crew rescue

_Accepted 13 October 2026._

The owner requested a collider on each floating crew member: sailing over a survivor rescues that person, removes it once and restores 1 player health, with green **+1** feedback, accumulating into **+2**, **+3** and so on for rescues within 0.35 seconds of the previous rescue. Rescue is a gameplay rule, superseding B04's original cosmetic-only restriction. Preserve the player's maximum health; when full, leave survivors available until their existing lifetime expires. Dead players cannot heal or revive. Crew triggers never block hulls, take weapon damage or award kill score.

GameManager owns CrewSystem and its bounded pool. Rescue sweeps relative motion between player hull and crew trigger. Fixed-step survivor motion and a dedicated seeded stream are independent of cosmetic events and reduced-motion preferences; accessibility suppresses visual bob/foam and label travel only. Pause freezes rescue and lifetime. Terminal presentation may float/fade survivors without healing. Restart/abandonment clears the pool. Presentation consumes readonly survivors and semantic Rescue feedback; rapid rescues combine in one label within an authored 0.35-second interval. Preserve the six supplied crew variants and foam art. CrewConfig authors collider radius and health per rescue; balance-v5 includes the rule in the frozen snapshot and ranking identity.

## D12 — Pause composition

_Accepted 14 October 2026._

The owner required the pause menu to match `assets/sample_pause.png`, stating that Options during a battle is essential:

- `PauseMenu` (`src/ui/game/PauseMenu.tsx`, `PauseMenu.css`) reproduces the reference board in `--sample-px` reference pixels: **PAUSED**, "Ready when you are." and the RESUME, OPTIONS and MAIN MENU buttons at the main menu's Play/Options size. Compact screens use the same responsive board sizes as the main menu.
- OPTIONS opens the regular `OptionsScreen` inside the paused battle with a **Back** action and a note. Every change is persisted immediately; Sound, Volume and Music volume apply at once, while session and spawn time apply to the next battle because the running match keeps its frozen configuration snapshot ([IMPLEMENTATION.md §4](IMPLEMENTATION.md#4-configuration-and-magic-values)).
- MAIN MENU asks for confirmation before abandoning (Stay here / Leave battle). Escape steps back one level: Options or the confirmation return to the pause board, and the pause board resumes. The native modal dialog contains and restores focus. Its accessible name stays **Battle paused** while the visible title reads PAUSED.

## D13 — Mobile camera and responsive layout

_Accepted 14 October 2026._

The owner requested explicit browser fullscreen, larger ships on phones, an explorable map approximately four viewport areas in size, and compact aligned UI. This supersedes the whole-map contain fit and reference-pixel scaling on compact screens in D03, D06 and D07. Desktop retains the reference overview/composition; compact screens use a bounded player-following camera, readable fixed-size HUD controls, safe-area insets and responsive menu boards. Preserve the authored map geometry and all simulation rules. Fullscreen is a user-gesture browser request with synchronized entry/exit controls and visible failure/unsupported guidance; it must not be simulated with CSS. Combat remains landscape with explicit Resume after portrait or fullscreen changes. See [MOBILE.md](MOBILE.md) for display tuning, ownership and verification.

## D14 — Island collision damage

_Accepted 14 October 2026._

The owner requested that every island collision cost 1 health. `CollisionConfig.Default.islandImpactDamage` authors the damage per allegiance (player 1, enemy 0) and is validated as non-negative integers. A collision is the existing significant island contact (at least `minimumImpactSpeed`, once per `impactCooldown` per contact key), so sustained pressure against a coast does not drain health every frame; arena borders never damage. Damage passes through `DamageSystem` without kill credit and can sink the player. This is a rule change: balance version `balance-v6`.

## D15 — Ship hull radius

_Accepted 14 October 2026._

The owner kept circular ship colliders but reduced every ship's `hullRadius` from 66 to 40, because a circle enclosing the whole 67 × 113 sprite left a ship-width gap between side-by-side hulls. Validation now requires `hullRadius` to exceed half of the visual width instead of the sprite diagonal; slight bow overlap in head-on contact is accepted. Per-pixel sprite collision and polygon/capsule hulls were discussed and not adopted. The coast/cannonball `radius` and the authored rectangular island colliders are unchanged. This is a rule change: balance version `balance-v7`.

## D16 — Ship trail

_Accepted 14 October 2026._

The owner requested the continuous ship trail with the owner-authored `assets/authored/shipt-trail.png`, completing the replacement left pending by D04. `ShipTrailSystem` (presentation clock, bounded stern history, fades after stopping) and `ShipTrailRenderer` (pooled `MeshRope`, texture stretched once with its strong end at the stern) implement it. Settings live in `PresentationConfig.shipTrail`; the logical and visual capacities are the same validated pool and must cover every live ship. Keep the image unchanged and the `authored/ship_trail` key stable.

## D17 — Screen routes and result persistence

_Accepted 14 October 2026._

Menu screens are reflected in the URL fragment by `ScreenRoute` with `history.replaceState`; refresh reopens the visible screen, and `#result` reopens Results from the persisted last completed battle. Combat never has a fragment, so refresh still abandons an unfinished battle. Results state the end reason explicitly; Match History keeps the owner's VICTORY/Defeated labels with the reason available to assistive technology. Captain's Log tabs follow the WAI-ARIA tabs pattern.

## D18 — Fullscreen keyboard controls

_Accepted 14 October 2026._

The owner requested Alt+Enter to toggle fullscreen and, where possible, to keep a short Esc from leaving fullscreen. Use the same authored control command for keyboard and pointer, including pause/error handling; ignore held-key repeats and support numeric keypad Enter. Keep the control available during lazy preparation and required-module errors. Application display listeners belong to ServicesProvider and the injected FullscreenDisplay, with bindings in DisplayInputConfig. Request only Escape through optional browser Keyboard Lock after fullscreen entry. Release capture on exit/teardown and after a late grant to an exited screen. Unsupported/denied capture preserves ordinary browser fullscreen behavior, and the browser's long-Esc escape hatch must remain intact.

## D19 — Compact result and no-scroll screens

_Accepted 14 October 2026._

The owner requested a cleaner Battle result and required every menu screen to fit on phones without scrolling, including short landscape. The result groups the score, outcome, duration and end reason beside centered statistic cards, with registration feedback and 44-pixel actions below. Main Menu, Options, Captain's Log, How To Play, Pause and Battle result must keep their boards and actions inside the available viewport. How To Play divides its content into three selectable topics; records continue to use their existing pagination. Preserve the authored panel/button art, visible information and keyboard access. On compact screens, the full-screen command may use its symbol while retaining its accessible name and Alt+Enter shortcut. This supersedes the short-screen scrolling allowance in D07 and the earlier mobile notes.
