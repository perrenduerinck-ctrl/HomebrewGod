# Animation Creator

Open **Map tools → Animations**. The creator is available to normal users without
a developer query parameter. The existing Animation ID architecture remains:

`action → animationId → library definition → shared player → existing VFX engine`

## Browse and assign

The browser shows static sprite thumbnails, names, one primary **Type**, and tags.
Search names, descriptions or tags; filter by Type, tags, Built-in/My/Room,
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

Signed-in users keep custom animation definitions at
`users/{uid}/animations/{animationId}`. The persistence adapter loads those
records into the in-memory library without changing their stable IDs or revisions.
Create, edit and Replace Sprite write the normalized definition, ownership,
`createdAt`, `updatedAt`, and hosted sprite metadata. Replace Sprite retains the
ID and increments `revision`, so spell references keep working.

Sprite sheets upload to Cloudinary before Firestore is written. Firestore stores
only the secure hosted URL and asset identity; `data:` URLs are rejected for both
sprites and sounds. Deleting a definition removes its Firestore record only after
the library's reference check succeeds. Hosted files are deliberately retained
until server-side reference checking can prove they are orphaned. A failed or
offline load shows a warning while built-ins and session edits continue to work.

Favorites, usage history and temporary action assignments remain session-only.
Spell stage references persist through the existing character save path. Built-ins
remain global and are never copied to a user's Firestore collection unless the
user explicitly duplicates one. Security rules restrict each animation collection
to its owning authenticated user and require hosted asset URLs.

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

`layers` remains bounded extension data. Frame `events` now emit host callbacks;
they do not spawn gameplay objects or apply damage. Layered rendering, camera
shake and a timeline editor are not implemented.
Face Away works through the API and spell overrides; Token Facing is reserved.
The creator exposes Fixed and Face Target. A marketplace and sharing UI remain
out of scope; signed-in personal animation storage is implemented above.

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
node node_modules/@playwright/test/cli.js test tests/vfx-animation-runtime.spec.mjs tests/vfx-animations.spec.mjs tests/vfx-combat.spec.mjs --workers=1
```

## Shared source and target runtime

`animationRuntime.js` owns point normalization for preview, spells and melee.
Pass DOM tokens, token objects/IDs with a renderer token resolver, plain centered
`{x,y}`, rectangular `{x,y,width,height}`, mouse coordinates, or preview dummies.
Rectangles use their center; visible token bodies include elevation transforms.
Use `anchor:"center"` for an already-centered rectangle. Explicit world points use
`coordinateSpace:"world"`; otherwise coordinates are relative to the animation
layer. Screen/page coordinates pass through `screenToAnimationLayer`.

Definitions describe placement; runtime contexts retain actor references:

```js
await player.playAnimation("sword_slash_01", {
  source: casterElement, target: targetElement,
  placement: { mode: "SOURCE_TOWARD_TARGET", towardOffset: 40, followSource: true },
  speedMultiplier: 1.25, scaleMultiplier: 1.2, opacityMultiplier: .8,
  rotationOffset: 10, debugPoints: true
});
```

Modes are SOURCE, TARGET, MIDPOINT, WORLD, SOURCE_TO_TARGET and
SOURCE_TOWARD_TARGET. Old `spawnAt` values remain aliases. Face Target compensates
for RIGHT/DOWN/LEFT/UP artwork orientation. Self targets keep manual rotation;
missing targets fall back to source. `followSource`/`followTarget` re-read actors;
`fixedToMap` retains placement while map bounds change. `targets` prepares a
multi-target API, with one primary target currently rendered. Explicit target
points take priority over that list, preserving AOE centers.

Optional debug markers show source, target, connecting path, impact, angle and
distance in the actual layer. Preview uses this same player with draggable DOM
dummies, swap/reset, distance presets from adjacent through 120 ft, and six quick
behavior tests. The preview width represents 150 ft. No independent motion clock
or alternate preview geometry exists.

Optional `area:{shape:"circle",radius:20,unit:"ft"}` uses
`grid:{pixelsPerFoot:10}` or `{pixelsPerSquare:50,feetPerSquare:5}`. Grid pixels are
measured before zoom. Circles/self use diameter; line/cone/rectangle use length
and width. This sizes artwork without clipping it or changing targeting rules.
Without a grid, feet metadata leaves manual sizing intact. `unit:"px"` works
without a grid. Manual Scale remains a multiplier. `visualReach` is metadata only.

## Spell creation and stages

The Spells step has **Choose, create or upload animations** for a new spell, plus
an animation button on each saved custom spell. It opens one sequence panel with
Cast, Travel, Impact, Sustain and End cards connected in playback order. Empty
optional cards are skipped. Choose/Replace, Preview, Clear, Duplicate/Remix,
Create New and Upload New use the same persistent library and creator as the map.
Saving an animation assigns its stable ID to the active slot. Returning preserves
unsaved spell fields.

Both authoring surfaces use `animationPreviewStage.js` for the draggable Source
and Target anchors. Stage preview and map spell preview then enter the same
`animationSequence` → `animationPlayer` → `animationRuntime` path used by a real
cast. The runtime resolves DOM token bodies at their visible centers, respects
large/small token bounds and elevation, and re-samples following actors. Preview
targeting carries Source/Target token IDs when applicable; AOE targeting carries
its actual selected map center and never substitutes the first affected token.

Spell records store references, never sprite payloads:

```js
animations: {
  cast: "holy_cast_01",
  impact: { animationId: "healing_burst_01", overrides: { tint: "#55ffaa", scaleMultiplier: 1.2 } }
}
```

`normalizeSpellAnimationReference` accepts strings and objects. The optional
`overrides` group supports playback, placement and appearance changes without
mutating the library definition. Legacy single `animationId` remains supported.
Missing assets show a replacement/clear message; casting falls back to existing
presentation without blocking gameplay. Custom spell fields persist through the
existing character save system, while signed-in custom animation definitions and
hosted sheets survive reload through the personal library.

`createAnimationSequenceController({player})` exposes `playAnimationSequence` and
`startEffect`. Pass `animations` slots or ordered `stages` with
`{slot,animationId,overrides,trigger,delay,waitForCompletion}`. Cast defaults to
source, Travel to projectile, Impact/End to target and Sustain to following target.
Default Impact waits for Travel's arrival. Triggers include immediate,
afterPrevious, onArrival, onImpact, durationStart and durationEnd; delay is in ms.
Set `waitForCompletion:false` to allow subsequent immediate overlap.

The result exposes `finished`, `pause`, `resume`, `cancel`, `update`, and `end`.
`duration:{unit:"seconds"|"minutes"|"hours",value}` starts when Sustain begins;
manual/rounds/turns await the host's `end()`. Turn/time rules remain external.
Timed sustains are capped at 24 hours. `end()` stops Sustain, plays End and cleans
up; `cancel()` skips End. Effects Off and renderer teardown release pending stages
and timers. `getInstances()` exposes active instance IDs, source/target IDs,
start time and duration. Normal spell casts remain bounded previews of stages;
host-managed lasting effects opt into this duration API separately.

Events `{frame:19,type:"impact"}` are zero-based and emit once per play, including
when a slow render skips a frame. `onEvent` receives the event and runtime points;
`onFrame` also identifies its animation. `SHOW_TOKEN`, sound and camera event
payloads can be consumed by a future host adapter, but this player never changes
tokens/HP or automatically triggers camera effects. Start-frame audio still works.
Orbit, follow-path, automatic summon tokens and camera effects remain future work.

## Asset ownership and dependencies

Drop a PNG/WebP/JPEG sheet on the upload zone or use **Replace Sprite**. Replacement
preserves the animation ID/settings/assignments and increments `revision`, separate
from schema `version:2`. No full revert history is stored. GIF and animated WebP
decoding are not implemented; uploads should be static sprite sheets.

Collections are comma-separated organizational groups, and can overlap.
`library.setContext({ownerId,roomId})` filters user/room definitions; room scope's
`ownership.ownerId` identifies its room. Room definitions are never returned in
other room contexts. User definitions are hydrated from the authenticated user's
Firestore collection. Room-scoped durable storage and a shared marketplace remain
future work.

`getAnimationUsage(id)` includes action bindings and currently tracked custom
spells. `trackReferences(key,{name,get,replace})` lets other hosts register their
records without coupling the library to persistence. Used assets cannot be
deleted until references are explicitly replaced or removed; the editor presents
both choices and Cancel. Rename and sprite replacement retain identity.
`getSpellAnimationDependencies(spell)` prepares spell-only versus spell-plus-assets
export; dependency packaging and marketplace/sharing are not implemented.

Optional `animationSelection:{mode:"specific"|"random"|"cycle",ids:[...]}` is
prepared by `normalizeAnimationSelection`/`chooseAnimationSelection`; hosts own
cycle indices. Dependency discovery/replacement includes these IDs. Automatic
variant selection in gameplay and a variant editor remain future integration.

## Acceptance hardening

The creator and spell panel import the same canonical workspace module so their
library and persistence context cannot split into separate sessions. Saves validate
and sync before committing visible definitions or spell assignments; failed saves
keep the previous revision. Remote deletes finish before local references change.
Delete also rechecks saved spells in the current room: replace/clear those stages
and save their character before deleting. This is not a global cross-room reference
index; unopened rooms and concurrent remote edits still need care.

Hosted assets must use HTTPS. Relative built-in URLs resolve against the app origin
when remixing them into personal storage. Account changes discard stale loads and
prevent assigning a save from a previous account. Failed sprites are labelled
unavailable; requests time out, can retry, and release pending work on disposal.

The shared preview stage has a fixed 150-ft width. Distance presets change actual
Source/Target separation, while drag/keyboard/reset switch the selector to Custom.
Unedited override controls inherit the animation definition without storing extra
defaults; clearing placement/direction/fades removes their old overrides.

See [the acceptance report](ANIMATION_ACCEPTANCE.md) for browser coverage and the
live-service checks required before merging. The acceptance spec is included in
`npm run test:browser` and uses simulated Firebase/Cloudinary transport, not a
production account.
