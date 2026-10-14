# Asset attribution

The ships, ship parts, water/terrain tiles, effects, menu/HUD/control PNGs, spritesheets, UI reference images, Jungle Gaming logo and WAV sound files were supplied in the original [Jungle Gaming challenge repository](https://github.com/junglegaming/game-developer-challenge).

`assets/maps/arena_00.tmj`, `terrain.tsj` and the Tiled project were authored manually by the candidate using those supplied terrain tiles. The game preserves that layout and the five authored collision rectangles. No AI-generated game art, replacement icons, procedural fallback map or synthetic audio was added.

The supplied asset directories are retained. Pixi gameplay uses shared ship/UI atlases with their supplied XML/JSON frames. React/CSS use individual UI PNGs; repeated water uses its standalone tile. Vite creates hashed production URLs. Cropping health textures and map tiles happens in Pixi without modifying source images.

The accepted gameplay brief authorized complementary authored foam/wake/trail art. The registered additions under `assets/authored/` are `foam_ring.svg`, `projectile_trail.svg`, the owner's Krita-authored `Splash.png` and the owner's `shipt-trail.png`. The logical `authored/water_splash` reference loads `Splash.png`; the previous `water_splash.svg` is retained as unused source art. `Splash.kra` is the editable source, not a runtime texture. `authored/ship_trail` loads `shipt-trail.png` (256×32), stretched along each moving ship's stern path by the ship-trail system; it replaced the earlier stamped wake, which the owner removed on 13 October 2026. These are authored drawings, not runtime-generated fallbacks or screenshot crops. No synthesized sounds were added. See [ASSET_AUDIT.md](ASSET_AUDIT.md) for all visual categories, metadata checks, legitimate omissions and the 27-WAV event catalog.

The upstream challenge contains no separate asset licence file. This submission uses its materials for that challenge; it does not assert a new licence or broader redistribution rights for the supplied assets. Third-party packages retain their respective licences in their distributions.

The personal Portuguese tutorial and its earlier educational diagram remain outside this repository in the candidate's Docs directory; they are not game assets or part of the published build.


## Third-party sources and licences

| File | Source | Licence |
| --- | --- | --- |
| `assets/sounds/extra/ebunny-pirate-adventure-361663.mp3` | "Pirate Adventure" by ebunny, [Pixabay track 361663](https://pixabay.com/music/adventure-pirate-adventure-361663/) | [Pixabay Content License](https://pixabay.com/service/license-summary/): free use, attribution not required; the unaltered track is not redistributed as a standalone product |
| `assets/sounds/extra/576054__istudeny__pirat-battle.wav` | "Pirat Battle" by istudeny, [Freesound 576054](https://freesound.org/people/istudeny/sounds/576054/) | [Creative Commons 0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication) |

`assets/sounds/extra/SoundCredits.txt` keeps the owner's original source notes. Both files are bundled unchanged.

## Owner-supplied soundtrack

The owner supplied `assets/sounds/extra/ebunny-pirate-adventure-361663.mp3` and authorized it as the continuous OST. `AudioConfig.Music` registers that exact asset. It streams through the React-authored audio element owned by `MusicPlayer`; it is separate from the original 27-WAV effect catalog and the effect voice budget. The track is preserved unchanged and bundled by Vite.

The owner also selected `assets/sounds/extra/576054__istudeny__pirat-battle.wav` for player death. `AudioConfig.Cues.GameOver` registers the exact extra WAV; the original `game_over.wav` is preserved as unused source audio. The new WAV is unchanged stereo PCM, 44.1 kHz, approximately 13.978 seconds, decoded through the existing Web Audio voice system and bundled by Vite. `assets/sounds/extra/SoundCredits.txt` records the owner-provided source/attribution references. The death cue temporarily ducks the OST and survives the transition to results.
