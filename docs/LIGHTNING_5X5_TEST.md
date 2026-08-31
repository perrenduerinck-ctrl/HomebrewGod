# Lightning Bolt 5×5 test

This is a bounded visual experiment, not a conversion of the spell library.
Lightning Bolt preview and confirmed-cast playback use the new sequence by
default. The existing 4×4 profile and generic sprite playback remain intact.

## Try both versions

As DM, select **Lightning Bolt** in Battle Map Spell Preview, click **Target
Spell on Map**, then place the origin and aimed direction. Once locked, click
**Play Preview VFX**. The **Lightning VFX** selector switches between **5×5 test
(25 frames)** and **4×4 baseline** without changing the locked template.
The selector changes only DM preview playback; it never changes a real cast.
It is hidden from non-DMs and for other spells. Reset cancels previews.

The supplied Lightning Bolt MP3 now plays at discharge in both versions. **Spell
sound** beside Effects mutes it independently. One audio channel is reused across
casts, with a natural four-second thunder tail and a six-second safety cap;
Reset/Off/navigation stop it. Audio does not add visual effects or extend the
hidden-template duration. See `assets/audio/README.md` for source and behavior.

## Asset and playback

- Added `assets/vfx/lightning/lightning-bolt-main-5x5.png`, copied unchanged from
  the owner's attachment ending `70c61d39f438`.
- One 1254×1254 RGBA PNG: 2,006,986 bytes (1.91 MiB compressed; approximately
  6 MiB decoded RGBA). It is lazy-loaded only when Lightning Bolt is selected.
- Metadata: `columns: 5`, `rows: 5`, `frameCount: 25`,
  `framesPerSecond: 24`, `loop: false`, `removeOnComplete: true`.
- The shared animator displays 160×160 logical frames, reading every one of
  the 25 cells. Full playback lasts 1042 ms, plus a 120 ms charge.
- Frames 0–4 charge at the origin, 5–14 discharge across the full line, and
  15–24 burst/fade at its endpoint. These are phases of **one sprite effect**,
  not additional spawned effects. The attached art points southwest; its
  -135° correction makes it point right before the map's aimed rotation.
- The existing template supplies origin, direction and full line length.
  The map renderer recalculates the path on resize/zoom. No token positions
  are substituted for the line endpoint.

## Strict per-cast budget

| Mode | Small caster charge | Main sprite/animator | Separate endpoint burst | Per-token effects | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full | 1 | 1 | 0 | 0 | **2** |
| Reduced | 0 | 1 | 0 | 0 | **1** |
| Off | 0 | 0 | 0 | 0 | **0** |

The main sheet already includes its endpoint burst. There are zero particles,
aftershocks, target flashes, persistent effects or aftermath attachments.
Reduced uses the engine's existing shorter timing. Existing active-effect and
sequence caps, cancellation and cleanup still apply to overlapping previews.
Sprite styling now updates only when the frame index changes, not on every
display refresh. This optimization also applies to older sprite sheets.

Preview still uses `createSpellVfxEvent` and the existing sequence/effect engine.
It does not resolve targets, roll dice, spend resources, modify HP or persist
a cast. The template is temporarily hidden during playback, then restored.

## Validation and limitations

`tests/vfx-lightning5.test.mjs` covers every 5×5 and 4×4 frame, completion,
eight directions for preview and confirmed events, unchanged event data,
300 affected tokens without increased effect counts, all three modes,
100 repeated previews, cancellation and renderer failures.

The browser regression checks DM visibility, both comparison choices, sprite
centering/art rotation, eight line directions, lock preservation, overlay
restoration, mode budgets and removal of effects after completion/reset.
The in-app visual check caught and corrected a missing centering translation
that otherwise shifted the stretched beam away from its caster.

The 25-frame test provides more animation poses while keeping one animator and
one texture. It is a reasonable option for selected premium spells, **not a
reason to replace all 4×4 sheets**. At equal sheet dimensions, each 5×5 cell has
20% less linear resolution (36% fewer pixels) than a 4×4 cell. Stretching a
square cell across a long line still softens fine lightning detail. The
supplied artwork also differs from the baseline, so this is not a controlled
frame-count-only comparison. Final smoothness/art preference needs DM review;
the effect-count checks do not claim an FPS benchmark on every device.

For a final premium beam, prefer a horizontally authored beam sheet with stable
padding/anchors in all 25 frames. Only the first supplied sheet is included in
this test; the other three are unnecessary for its small effect budget.
