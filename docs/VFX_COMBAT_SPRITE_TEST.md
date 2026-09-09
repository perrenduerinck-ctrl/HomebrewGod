# Combat sprite test

Open the app with `?vfxTest=1` (or append `&vfxTest=1` to an existing query).
Local development and smoke-test pages also enable the control automatically.
On the battle map, open **Map tools → 2.5D Debug → Combat sprite test**.
Click **TEST SWORD SLASH**. The tools close on successful playback to reveal the map.

Click a token first to remember it as the attacker, or select an attacker in the
control. Target defaults to the nearest other visible token; choose a specific
token or **No target (attack right)**. With no tokens, the test uses the map center.
Selection is local to this test: no token, movement, initiative or database state
is written by the animation. **Clear combat effects**, Effects Off, leaving the
battle screen and page teardown cancel pending and active combat effects.

Change **FPS** (18, 24, 30 or 36) and **Scale** directly in the test control.
Defaults are `fps: 30`, `size: 160`, `scale: 1` in
`vfx/combatEffects.js`, under `COMBAT_ANIMATIONS["melee.swordSlash"]`.
At 30 FPS, all 36 frames take 1.2 seconds. Size is the longest frame dimension in
map pixels before scale and map zoom; aspect ratio and the 50%/50% pivot remain fixed.
The debug checkbox adds center, bounds and angle. The existing **Live readout**
and **Labels** options also show the current frame (zero-based) and position.

## Asset and cropping

The supplied PNG is preserved byte-for-byte at
`assets/vfx/combat/melee/sword-slash-test.png`: 1254 × 1254 RGBA, 6 columns,
6 rows and 36 frames, in row-major order. Each source cell is 209 × 209 pixels.
The image contains faint drawn grid lines and partially transparent background
pixels. A four-pixel inset crops within each cell, using the existing measured
atlas support. No background removal, resampling or artwork regeneration is applied.
The original artwork's changes in shape and internal position remain part of its
animation; the player keeps the cell center fixed. Use `inset: 0` for future
clean sheets with no gutters. The loader waits for image decode and dimensions.

## Reusable API

```js
import { createCombatEffectSystem } from "./vfx/combatEffects.js";

const combat = createCombatEffectSystem({ engine: existingBattleMapEffectEngine });
await combat.playCombatEffect("melee.swordSlash", attackerElement, targetElement, {
  fps: 24, scale: 1.25, rotationOffset: 0, flipX: false, flipY: false, debug: false
});

combat.register("defense.parry", {
  src: "./assets/vfx/combat/defense/parry.png", // Supply this future asset yourself.
  columns: 5, rows: 5, frameCount: 25, fps: 25, size: 140, inset: 0
});

// Strings play consecutively. Explicit at offsets allow overlapping layers.
const sequence = await combat.playCombatSequence([
  { animation: "melee.swordSlash", at: 0 },
  { animation: "defense.parry", at: 400, layer: "airborne" }
], attackerElement, targetElement);
sequence.cancel();
combat.clear();
combat.destroy();
```

`swordSlash` is an alias for `melee.swordSlash`. Categories/names are registry
keys; no additional melee, ranged, defense or impact artwork is created.
Actors may also be `{x, y, width}` points relative to the VFX overlay. Override
`position: {x, y}` to keep the effect at a particular attack/target point.
`getCombatActorPoint` reads the visible raised token body;
`resolveCombatPlacement` calculates the midpoint and `atan2` angle.
`loop: true` accepts a bounded `duration`; non-looping duration is derived from
frame count and FPS. The existing engine caps effects at 64, duration at 60 s,
and sequence offsets at 10 s. Reduced mode uses the engine's existing delay cap.

The adapter uses the existing sprite animator and shared renderer RAF. The
engine owns delay/cleanup timers. Effects use the existing airborne layer above
tokens and below map UI, with normal alpha blending and no pointer events.
Image failures report a useful console message without starting playback.
Invalid grid overrides also fail before loading. Grids follow the existing player
limits: at most 240 frames, with each grid dimension no larger than the frame count;
decoded sheets must fit within 16384 × 16384 pixels and have cells at least 4 pixels wide/high.

## Files

- `vfx/combatEffects.js`: registry, geometry and combat-effect/sequence API.
- `vfx/combatSpriteTest.js`: optional controls, token choice and lifecycle hooks.
- `vfx/vfxAssetManifest.js`: decoded-image dimension accessor on the asset cache.
- `vfx/vfxMigrationManifest.js`: inventory entry for the supplied combat sheet.
- `assets/vfx/combat/melee/sword-slash-test.png`: unchanged supplied image.
- `app.js`: VFX setup, screen-change, Effects Off and teardown integration only.
- `index.html`: test controls inside the existing VFX debug panel.
- `assets/styles/app.css`: scoped combat sprite, debug and test-control styles.
- `tests/vfx-combat.test.mjs`: timing, cropping, directions, load/cancel and sequence tests.
- `tests/vfx-combat.spec.mjs`: real-map interaction, rendering and cleanup tests.
- `package.json`: includes the new VFX tests in the release suite.
- `docs/VFX_COMBAT_SPRITE_TEST.md`: this guide.

## Validation

```text
node --test --test-isolation=none tests/vfx-*.test.mjs
node node_modules/@playwright/test/cli.js test tests/vfx-combat.spec.mjs --workers=1
```

The unit tests exercise all frames at a simulated 144 Hz display, all four FPS
choices, all eight directions, original image preservation, crop bounds,
arbitrary grids, delayed/failed decode, overlapping and sequential effects,
per-adapter cancellation and existing spell coexistence. Browser tests exercise
actual map tokens, repeated attacks, flips, alpha, cleanup, Effects Off and token
movement after playback. Existing VFX integration checks are also run separately.

Validated locally: 125 VFX unit checks, 20 selected browser checks (including
melee, existing spell sprites, elevation and movement), syntax for 214 JavaScript
files, and 541 local import references. All passed. Map preview:
output/vfx/combat-sprite-test/map-preview.png.
