# Asset attribution

The ships, ship parts, water/terrain tiles, effects, menu/HUD/control PNGs, spritesheets, UI reference images, Jungle Gaming logo and WAV sound files were supplied in the original [Jungle Gaming challenge repository](https://github.com/junglegaming/game-developer-challenge).

`assets/maps/arena_00.tmj`, `terrain.tsj` and the Tiled project were authored manually by the candidate using those supplied terrain tiles. The game preserves that layout and the five authored collision rectangles. No AI-generated game art, replacement icons, procedural fallback map or synthetic audio was added.

The supplied asset directories are retained. Pixi gameplay uses shared ship/UI atlases with their supplied XML/JSON frames. React/CSS use individual UI PNGs; repeated water uses its standalone tile. Vite creates hashed production URLs. Cropping health textures and map tiles happens in Pixi without modifying source images.

The accepted gameplay brief authorized complementary authored foam/wake/trail art. The registered additions under `assets/authored/` are `foam_ring.svg`, `projectile_trail.svg` and the owner's Krita-authored `Splash.png`. The logical `authored/water_splash` reference now loads that PNG; the previous `water_splash.svg` is retained as unused source art. `Splash.kra` is the editable source, not a runtime texture. The owner removed the previous ship wake on 13 October 2026; its emitter, profile, registration and SVG are removed. The owner's `shipt-trail.png` is preserved for future work and is not loaded by the game. These are authored drawings, not runtime-generated fallbacks or screenshot crops. No competitor code/art or synthesized sounds were imported. See [ASSET_AUDIT.md](ASSET_AUDIT.md) for all visual categories, metadata checks, legitimate omissions and the 27-WAV event catalog.

The upstream challenge contains no separate asset licence file. This submission uses its materials for that challenge; it does not assert a new licence or broader redistribution rights for the supplied assets. Third-party packages retain their respective licences in their distributions.

The personal Portuguese tutorial and its earlier educational diagram remain outside this repository in the candidate's Docs directory; they are not game assets or part of the published build.
