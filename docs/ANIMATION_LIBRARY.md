# Reusable animations

Open the battle map's **Map tools → Animations**. This is available without a
developer query parameter. Choose an animation, preview it, choose an action,
and click **Change animation**. **Use original effect** removes that assignment.
Existing spell mechanics and stored spell data are never edited by this panel.

**Custom Animation** opens the upload editor. Enter a name, upload a PNG/WebP/JPEG
sheet, choose 4×4, 5×5, 6×6, 7×7 or a custom grid, set frames/FPS/scale/playback,
preview the draft, and save. Then assign it to a spell or the sword test.
Frames can be fewer than the grid's cells, including one frame in a larger grid.
The full calculated cells are used for new uploads; there is no automatic
background removal, forced pixelation, or square-frame stretching.

**Edit settings** changes the selected ID for its next playback. **Duplicate**
makes an independent custom ID. Preview FPS/scale controls affect only previews;
save through Edit settings to change a definition. Play/Replay restart the preview;
Stop, Escape, closing the dialog, leaving the map, Effects Off and page teardown
release the relevant effects, including pending loads.

## Ownership and persistence

This first version is deliberately session-based. Uploaded images, definition
updates and action assignments remain in memory until reload; the UI states this
next to the controls. No Firebase collections, rules, character data, room data,
or account storage are changed. Built-in defaults are available to everyone and
cannot be deleted through the library API. User copies have generated IDs and
ownership `{kind: "user", scope: "session", ownerId: null}`. The model also accepts
`user` and `room` scopes for a future persistence adapter; these are ownership
metadata, not a substitute for future server-side authorization.

Six existing assets demonstrate the system: Fireball (6×6), sword slash (6×6),
healing (5×5), cold burst (6×6), classic fire (4×4), and radiant spear (one frame).
No new artwork is generated. The existing sword and older built-ins retain their
explicit measured gutters/insets. New uploads default to zero inset. Replacing a
definition's sheet/grid clears old crop metadata unless explicitly supplied.

## Architecture and API

`action → animationId → library definition → animationPlayer → existing effectEngine`

`animationLibrary.js` contains validation, ownership, lookup, editing, search,
export/import, and a separate presentation-assignment store. `animationBuiltins.js`
contains built-in appearances. `animationPlayer.js` translates definitions into
the existing engine's requests. It does not introduce a second renderer or frame
loop. `combatEffects.js` is now a placement/compatibility adapter to that player.
`animationSpellAdapter.js` wraps the existing spell sequence boundary: unassigned
spells use their original sequence; failed/missing assigned sprites fall back to it.

```js
import { createAnimationLibrary, createAnimationBindings } from "../vfx/animationLibrary.js";
import { BUILTIN_ANIMATIONS } from "../vfx/animationBuiltins.js";
import { createAnimationPlayer } from "../vfx/animationPlayer.js";

const library = createAnimationLibrary({ builtins: BUILTIN_ANIMATIONS });
const bindings = createAnimationBindings({ library });
const player = createAnimationPlayer({ engine: existingMapEngine, library });

const attack = { animationId: "sword_slash_01" }; // Only a presentation reference.
const played = await player.playAnimation(attack.animationId, {
  x: 200, y: 150, targetX: 300, targetY: 200, scale: 1.2, rotation: 0, flipX: false
});
await played.finished; // Or played.cancel() to stop it early.

library.updateAnimation("sword_slash_01", { fps: 24 });
const copy = library.duplicateAnimation("sword_slash_01");
bindings.setAnimation("spell:fireball", copy.id); // The app wrapper resolves this.
bindings.setAnimation("spell:fireball", null); // Restore the original spell effect.

const custom = library.registerAnimation({
  name: "My effect", sprite: "./assets/vfx/my-sheet.png",
  grid: { columns: 8, rows: 4 }, frameCount: 30, fps: 24,
  scale: 1, playback: "once", anchorX: .5, anchorY: .5,
  category: "Other", tags: ["impact"]
});
library.getAnimation(custom.id);
library.getAnimationsByCategory("Other");
library.searchAnimations("impact");
library.deleteAnimation(custom.id);
library.resetAnimation("sword_slash_01"); // Restore a built-in's original settings.

const exportObject = library.exportAnimation(copy.id);
// {version: 1, type: "homebrewgod-animation", animation: {...}}
const imported = library.importAnimation(JSON.parse(JSON.stringify(exportObject)));
const assignmentData = bindings.exportAssignments();
player.destroy();
```

Definitions are immutable snapshots: updates affect the next playback without
changing an animation already running. Positions and offsets use overlay pixels;
runtime rotation overrides the definition's rotation, then adds the optional
target-facing angle. Anchors range from 0 to 1 on each axis. Flips occur around the
same anchor. Categories/tags have no effect on rendering.

`playSequence(["id1", "id2"], options)` plays in order. Objects such as
`{animationId: "id2", at: 400}` allow overlap. All sheets load before the sequence
starts. An `AbortSignal` cancels pending and active playback. `clear()` affects only
that player's effects. Completion uses the engine's lifecycle callback, without an
extra cleanup timer. The engine's single RAF drives concurrent sprites.

`bindings.setAnimation(key, {animations: {cast, travel, impact, sustain, end}})` and
spell `animationId` / `animations` fields are supported by the presentation event
adapter. Stage references currently play in order at the target point. A future
sequencing editor can add paths and phase placement without changing the library.
The reusable selector exports `createAnimationSelector({container, library,
onSelect})` for future creators. No creator screens are redesigned in this version.

## Bounds and compatibility

- FPS 1–60, scale 0.1–8, at most 240 played frames. Grid dimensions are metadata;
  the player preserves unused cells without changing the existing legacy defaults.
- Once playback must finish within 60 seconds. Direct/preview loops continue until
  stopped; assigned spell loops are bounded to 5 seconds to keep spell previews
  temporary. Combat test loops can be stopped with Clear combat effects.
- At most 32 sequence steps, offsets up to 10 seconds, and the existing engine cap
  of 64 simultaneous effects. Reduced mode retains the existing 100 ms delay cap.
- Uploads are limited to 8 MB each, 64 megapixels and 16384 pixels per dimension;
  cells must be at least 4 pixels wide/high. Embedded sheets share a bounded session
  budget. A library can hold up to 5,000 definitions, with search limiting UI results.
- `sound` is reserved metadata in this first version. Existing spell sequence sound
  remains unchanged; custom assignment playback is visual only. Advanced playback
  modes, permanent uploads/account persistence and a sharing UI are not implemented.

## Changed files and checks

New modules: `vfx/animationLibrary.js`, `animationBuiltins.js`, `animationPlayer.js`,
`animationSpellAdapter.js`, `animationEditor.js`, `animationWorkspace.js`.
Small integrations: `app.js`, `index.html`, `assets/styles/app.css`,
`vfx/castEvent.js`, `vfx/combatEffects.js`, `vfx/combatSpriteTest.js`,
`vfx/effectEngine.js`, `vfx/spriteAnimator.js`. Release scripts in `package.json`
include the new tests. No sprite asset files or gameplay modules are changed.

Tests: `tests/vfx-animations.test.mjs` and `tests/vfx-animations.spec.mjs`;
the earlier combat tests now expect the shared loader's error wording and allow
partial grids. The tests cover IDs/ownership/export, hot updates, grid bounds,
FPS, alpha, anchors/flips, looping/cleanup, capacity, decode cancellation, the real
upload/edit/assign UI, Fireball replacement/restoration, and existing map controls.

```text
node --test --test-isolation=none tests/vfx-*.test.mjs
node node_modules/@playwright/test/cli.js test tests/vfx-animations.spec.mjs tests/vfx-combat.spec.mjs --workers=1
```

Validated locally: **132 VFX unit checks** and **23 selected browser checks** passed.
The browser run included the upload/editor/assignment workflow, restoring Fireball,
the prior melee test, existing Fireball/Lightning/storm/tier sprites, all seven
replacement roles, elevated tokens, overlapping effects and token movement.
The local import graph also passed (569 references across 238 source files).
