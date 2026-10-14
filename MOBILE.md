# Mobile display

Phones use a player-following camera instead of shrinking the complete arena. At 844×390 the canvas shows approximately one quarter of the authored map area, so the 2048×1152 map is explored by sailing. The camera clamps to each shore. Desktop keeps the reference overview. Rendering never changes world coordinates, speed, collision, spawn positions or ranking identity.

`src/game/configuration/CameraConfig.ts` owns display-only tuning: compact mode at width ≤1024 or height ≤600 CSS pixels, a 0.25 visible-area fraction and a minimum scale of 0.75 CSS pixels per world pixel. The minimum keeps the 113-pixel player hull at least 84.75 CSS pixels long on small landscape screens. Narrower phones may show less than a quarter of the map to preserve readability. `WorldCamera` owns the transform; `MapRenderer` applies it and continues to render the authored cached surface. The camera is observable through the existing read-only test instrumentation.

The compact HUD uses a grid for health, score, time, fullscreen and pause. Movement/fire buttons are 60.8 CSS pixels; pause/fullscreen and menu controls are at least 44 pixels high. CSS accounts for safe-area insets, and the game uses `100dvh` so the canvas follows browser chrome changes. Combat remains landscape-only; portrait pauses and requires explicit Resume after rotation.

Main Menu uses two columns on short landscape screens and readable stacked controls in portrait. Options places Game and Audio side by side in landscape and stacks them in portrait; short screens scroll instead of shrinking controls. Captain's Log contains horizontal table scrolling when columns cannot fit legibly. The original supplied art remains the source for panels and controls.

## Fullscreen

Full screen is available from menus, loading/error screens and the match HUD, using the button or **Alt+Enter** (including the numeric keypad Enter). Repeated keydown events never toggle twice or activate the focused menu button. `ApplicationServices` injects `FullscreenDisplay`; it requests fullscreen for the document root from that user gesture, keeping menus, dialogs and subsequent battles in the same session. `fullscreenchange` synchronizes the label after browser exits. Changing fullscreen during combat pauses and clears held commands; Resume remains explicit.

`ServicesProvider` owns the display's document listeners and releases them and keyboard capture at application teardown. The current authored fullscreen control registers the shortcut command, so keyboard and pointer use the same pause/error behavior even with a dialog open. `DisplayInputConfig` authors the Enter/NumpadEnter binding and the single captured key, Escape; gameplay bindings remain independent.

After entering fullscreen, the display requests `navigator.keyboard.lock(['Escape'])` when the browser exposes Keyboard Lock. A short Esc then remains available for the game's pause and native dialogs. Missing or denied capture never blocks fullscreen itself: those browsers keep their normal Esc exit. The browser's long-Esc escape hatch remains available, as do Alt+Enter and the exit button. This requires browser support and a secure context; it cannot be guaranteed by preventing DOM key events alone. [Chrome's Keyboard Lock behavior](https://developer.chrome.com/blog/better-full-screen-mode) and [API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/lock).

The browser can deny or lack fullscreen support. The authored dialog reports that condition; it never claims that CSS alone hid browser chrome. Home-screen metadata and a standalone manifest provide a route for browsers that support opening the game from a home-screen icon. Physical iOS/Android support still needs device verification. [Fullscreen API behavior and user activation](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen).

## Verification

`tests/mobile.spec.ts` covers four landscape sizes (568×320, 667×375, 844×390, 932×430), two portrait sizes (320×568, 390×844), readable controls, no HUD overlap, menu/table containment, rotation, real sailing, camera movement/pause, all four camera bounds, desktop overview, fullscreen entry/exit and unsupported-browser guidance. Run `npm run test:e2e -- --project=mobile-layout`; captures and isolated reports are under `reports/mobile-layout`.

The final focused run passed 16/16 scenarios, including production smoke and the three cases rechecked after the full 120/123 run. The full run's two startup timing failures and preceding result-baseline mismatch remain recorded; it is not relabeled 123/123. Linux reference captures passed 2/2 in the CI container. See [verification evidence](reports/mobile-layout/VERIFICATION.md). Physical devices remain unverified.

The optimized profiler also accepts `PROFILE_VIEWPORT_WIDTH`, `PROFILE_VIEWPORT_HEIGHT`, `PROFILE_DEVICE_SCALE` and `PROFILE_MOBILE=true`, alongside `PROFILE_URL` and `PROFILE_OUTPUT`, to measure the compact camera at a specific viewport. Display changes do not alter its real-time simulation pilot or five lifecycle cycles.

The subsequent Alt+Enter/Escape change passed 7 focused keyboard scenarios and 11 integration scenarios; [keyboard verification](reports/fullscreen-shortcut/README.md) records their scope and browser limitations. The older full-suite and camera profile above are historical evidence, not new measurements of this keyboard change.
