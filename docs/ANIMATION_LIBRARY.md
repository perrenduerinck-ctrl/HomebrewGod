# Animation Creator

Open **Map tools → Animations**. The creator is available to normal users without
a developer query parameter. The existing Animation ID architecture remains:

`action → animationId → library definition → shared player → existing VFX engine`

## Browse and assign

The browser shows static sprite thumbnails, names, one primary **Type**, and tags.
Search names, descriptions or tags; filter by Type, tags, Built-in/Custom,
Favorites or Recently Used. Sort by Name, Newest or Most Used. Thumbnails load as
cards enter view; the browser initially shows 24 cards and can show up to 300.
Search narrows larger libraries. A compact selector remains below the cards.

Select an animation, preview it, choose an action and click **Change animation**.
**Use original effect** clears that presentation assignment. **Duplicate / Remix**
creates a user copy with a new ID; the original is unchanged. **Edit settings**
updates the selected ID for its next playback. Only custom definitions can be
deleted. Missing/deleted/failed assignments fall back to the original spell effect.

Types and tags organize appearances; neither changes damage, rules or targeting.

## Create and remix

**Custom Animation** opens in Simple Mode. Give it a name, upload a PNG/WebP/JPEG,
choose a grid, preview and save. The basic sections expose Type, comma-separated
custom tags, frames, FPS, uniform scale and playback. Presets provide editable
starting values for Explosion, Melee Slash/Thrust, Projectile, Beam, Aura, Buff,
Debuff, Ground Effect, Impact and Summon.

**Advanced Settings** reveals collapsible controls:

- Sprite Sheet: zero-based inclusive start/end cells, reverse order and an optional
  comma-separated frame sequence. Presets include 4×4 through 8×8, plus custom
  columns and rows. Partial grids and rectangular frames are supported.
- Playback: speed multiplier, finite loop count (0 means Infinite), start and end
  delays in seconds; Once, Loop, Ping Pong and Hold Last Frame.
- Size & Position: uniform scale, unlocked width/height scales, offsets in pixels,
  nine pivot choices, source/target/midpoint/map placement, following, persistence
  and a duration override. Numeric pivots are in Advanced.
- Direction: fixed rotation, Face Target, horizontal/vertical flips and the
  artwork's source direction. Up-pointing art can face a right-hand target without
  editing the image itself.
- Behavior: simple projectile travel, speed, start/end offsets and an optional
  parabolic arc; beam stretching between both endpoints with adjustable thickness.
- Visual Effects: opacity, optional tint/strength, Normal/Screen/Additive/Multiply,
  fade-in/out. Advanced adds brightness, contrast, saturation and hue rotation.
- Advanced motion: signed spin speed, scale/opacity pulses and optional random
  rotation/scale/offset/speed. Random values are chosen once per playback; saved
  definitions never change during a play.
- Sound: optional uploaded audio, volume, first-play start frame and playback rate.
  Sound honors the map sound toggle. Autoplay/device/file failures do not stop the
  visual. Stop, cancellation, Effects Off and teardown release the audio.

Collapsing a section or returning to Simple Mode retains its values when saving.
Built-in measured crop metadata is retained unless its sheet/grid is replaced.
New uploads use the complete calculated cells, with no automatic background
removal, forced pixelation or square-frame stretching.

The upload check shows resolution, grid, calculated cell size and frames used.
Fractional cells, large images and missing transparency produce warnings. Opaque
images remain valid. Alpha detection samples a reduced image; remote images can
render even when cross-origin policy prevents their alpha inspection.

## Preview Stage

Source and target dummies can be dragged or moved with arrow keys while focused.
Play, Pause/Resume, Stop and Replay use the same player as assigned animations.
Pause freezes motion, sprite frames and the remaining cleanup/start-delay time.
Following effects track their selected dummy; other effects retain their initial
map positions when the stage resizes. Slow Motion supports 1×, 0.5× and 0.25×. FPS/scale preview overrides do not
change saved definitions. Draft preview uses the current form values.

Background choices are Dark, Light, Grid, Transparent checkerboard and Map-style.
Preview Tools expose the current sheet cell, sprite bounding box and pivot.
The preview stays alongside settings on desktop; smaller screens stack them.
Closing the dialog, Escape, leaving the map and Effects Off clear the preview.

## Ownership and persistence

This version remains **session-based**. Uploads, definition edits, assignments,
favorites and usage history reset on reload, as the UI states. No Firebase,
account, room, character or gameplay records are changed. Definitions retain
ownership `{kind, scope, ownerId}` for a future persistence adapter. Built-ins are
global; normal uploads/remixes are user definitions with session scope.

## Data and API compatibility

`animationDefinition.js` exports `normalizeAnimationDefinition` (also exported as
`normalizeAnimation`) and `mergeAnimationDefinition`. Missing fields get defaults.
The old `{sprite, grid, frameCount, fps, scale, loop}` format continues to work.
Normalized definitions are immutable version-2 snapshots. Flat `fps`, `scale`,
`rotation`, offsets, anchors, flips, `frameCount` and string `playback` aliases are
retained for existing callers. `timing` is the normalized playback group; nested
`playback: {fps, mode, ...}` is also accepted on input. Nested edits and legacy flat
edits synchronize those aliases without discarding unrelated settings.

```js
const animation = library.registerAnimation({
  name: "Spear throw", type: "Projectile", tags: ["spear", "ranged"],
  sprite: "./assets/vfx/my-sheet.png", grid: { columns: 8, rows: 4 },
  frames: { start: 0, end: 29, count: 30, reverse: false },
  playback: { fps: 24, mode: "once", speed: 1, startDelay: .1 },
  transform: { scale: 1, anchorX: .5, anchorY: .5 },
  direction: { mode: "face-target", sourceDirection: "up" },
  behavior: "projectile", projectile: { speed: 300, arcHeight: 30 },
  placement: { spawnAt: "source" },
  appearance: { opacity: .8, tint: "#6677ff", tintStrength: .4 },
  layers: [], events: []
});
const played = await player.playAnimation(animation.id, {
  sourcePoint: { x: 100, y: 200 }, targetPoint: { x: 350, y: 100 }
});
played.pause(); played.resume();
await played.finished; // Or played.cancel().
library.updateAnimation(animation.id, { fps: 30 });
library.updateAnimation(animation.id, { appearance: { opacity: .5 } });
bindings.setAnimation("spell:fireball", animation.id);
```

Library APIs include get/register/update/duplicate/delete/reset, search, query,
toggleFavorite, markUsed, getUsage, subscribe and export/import. The old
`getAnimationsByCategory` and `category` are compatibility aliases; the UI uses Type
and Tags. Preferences/usage are stored separately from the appearance definition.
Exports keep the existing `{version: 1, type: "homebrewgod-animation", animation}`
envelope, containing the normalized version-2 definition. Import creates a new
user ID, without importing another user's favorites or usage history.

`playSequence` supports up to 32 sequential/overlapping IDs, `AbortSignal`, and
independent cancellation. Stage bindings `{cast, travel, impact, sustain, end}`
still work; each stage can now choose its own source/target/behavior. Spell and
combat adapters supply current geometry. Attached actors use their visible token
bodies. Neither adapter moves tokens or resolves game rules.

## Implementation and limits

`animationBrowser.js`, `animationEditorFields.js` and `animationSpriteCheck.js`
support the editor. `animationPlayback.js` contains pure frame/timing/geometry
helpers and presets. The player translates these settings into the existing
effect engine. Its opt-in render update uses the existing renderer's single RAF;
there is no additional per-effect frame loop. The sprite animator supports an
explicit frame sequence/rate while leaving legacy defaults intact. The engine's
opt-in pause/resume controls preserve delay/cleanup time. Legacy event timelines
are not changed.

Tint uses an SVG color matrix with an unchanged alpha row, followed by optional
CSS filters. Fade, pulse and spin share the renderer clock. Projectiles use simple
interpolation and an optional arc; beams stretch along the artwork's source axis.
Travel speed uses overlay pixels per second, scaled by playback speed. End delay
retains the final frame (or a loop) before cleanup; fades occur within that lifetime.
Finite assigned effects remain bounded. Hold/persist/infinite previews last until
Stop unless a duration is specified. A fade-out needs a known duration; manual
cancellation removes the effect immediately.

Uploads are limited to 8 MB per file, 64 megapixels and 16384 pixels per image side;
cells must be at least 4 pixels. A session's embedded media budget is 48 MB and a
library can contain 5,000 definitions. At most 240 selected frames, 100 finite
cycles, 1–60 base FPS, 0.05–8× speed, 0.1–8× scale, and 32 sequence steps are allowed.
Finite playback must finish within 60 seconds; start/sequence offsets are bounded
to 10 seconds. Existing engine capacity and Reduced/Off behavior remain in force.

`layers` and `events` are bounded serializable extension data; layered rendering,
event spawning, screen shake events and a timeline editor are not implemented.
Face Away and Token Facing are reserved direction modes; the editor exposes Fixed
and Face Target. A marketplace, sharing UI and durable account storage remain out
of scope.

## Validation

The VFX unit suite covers legacy compatibility, normalization/updates, range and
ping-pong frame order, timing, finite loops, pause/resume, indefinite cleanup,
projectile/source-direction/fade geometry and organization without data mutation.
Browser checks exercise real upload/save/assign/remix, thumbnails/filters,
advanced settings retained in Simple Mode, frozen/resumed projectile previews,
source attachment, beam dimensions, optional audio cleanup, opacity inspection,
responsive layout and the earlier spell/melee flows.

```text
node --test --test-isolation=none tests/vfx-*.test.mjs
node node_modules/@playwright/test/cli.js test tests/vfx-animations.spec.mjs tests/vfx-combat.spec.mjs --workers=1
```
