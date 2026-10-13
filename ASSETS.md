# Asset attribution

The ships, ship parts, water/terrain tiles, effects, menu/HUD/control PNGs, spritesheets, UI reference images, Jungle Gaming logo and WAV sound files were supplied in the original [Jungle Gaming challenge repository](https://github.com/junglegaming/game-developer-challenge).

`assets/maps/arena_00.tmj`, `terrain.tsj` and the Tiled project were authored manually by the candidate using those supplied terrain tiles. The game preserves that layout and the five authored collision rectangles. No AI-generated game art, replacement icons, procedural fallback map or synthetic audio was added.

The supplied asset directories are retained. Individual PNGs are used directly; Vite creates hashed production URLs. UI layout metadata comes from `assets/spritesheet/ui_sheet.json`. Cropping health textures and atlas tiles happens in Pixi without modifying the source images.

The upstream challenge contains no separate asset licence file. This submission uses its materials for that challenge; it does not assert a new licence or broader redistribution rights for the supplied assets. Third-party packages retain their respective licences in their distributions.

The personal Portuguese tutorial and its earlier educational diagram remain outside this repository in the candidate's Docs directory; they are not game assets or part of the published build.
