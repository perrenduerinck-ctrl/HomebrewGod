# Owner-supplied spell atlas batch — 2026-08-31

## Grid policy

| Base spell level | Grid | Frames | Availability |
| --- | --- | ---: | --- |
| Cantrips–2 | 4×4 | 16 | Existing cantrip art plus ten supplied elemental atlases |
| 3–6 | 5×5 | 25 | Thirteen supplied atlases, including five acid/poison variants |
| 7–9 | 6×6 | 36 | Player/policy tested; awaiting actual 6×6 artwork |

Upcasting does not substitute a different grid. Never reinterpret existing
pixels with a larger grid or duplicate frames to claim extra animation.
Unmapped spells retain their existing presentation. This is not completion of
every spell in levels 1–6. Current inventory is in `VFX_TIERS.md`.

## Assets and provenance

All PNGs were supplied by the project owner in this task and copied unchanged.
`assets/vfx/tiers0-2/{theme}-cast-4x4.png` contains fire, acid, cold, lightning,
poison, necrotic, radiant, force, thunder and psychic (1254×1254 each).
These were the ten images initially called 5×5 and then corrected to 4×4.

`assets/vfx/tiers3-6/{theme}-cast-5x5.png` contains fire, cold, lightning,
thunder, necrotic, radiant, force, psychic, acid, poison, acid-ground,
acid-stream and poison-comet. All are 1254×1254 except acid-ground (1402×1122,
five columns/five rows of rectangular cells; registered without stretching).
The four square green acid/poison variants have black RGB backgrounds and use
the existing screen-blended light layer. The other sheets retain their alpha.
No raster regeneration, rotation, cutting or recoloring was performed. The
renderer clips burst/cloud cell rims to suppress neighboring-row fragments
where the supplied art touches the cell boundary; source pixels remain intact.

`vfx/tierEffects.js` holds explicit grid metadata and per-sheet frame windows.
Flight uses only pre-impact frames; impact/cloud uses only appropriate later
frames. There is no extra network request per frame. Some art variants are
registered for reuse but not yet assigned (e.g. acid-ground); spare atlases
are not preloaded at startup. Selected profiles preload only their own textures.

## New mappings

- Level 1: Burning Hands, Guiding Bolt, Hellish Rebuke, Inflict Wounds,
  Magic Missile, Sleep, Thunderwave.
- Level 2: Acid Arrow, Scorching Ray, Shatter, Moonbeam, Ray of Enfeeblement.
- Level 3: Call Lightning, Sleet Storm, Stinking Cloud, Vampiric Touch.
  Existing Fireball and Lightning Bolt also use 5×5 art.
- Level 4: Blight, Phantasmal Killer, Confusion, Guardian of Faith.
  Existing Ice Storm now steps its ice bursts through the 5×5 cold atlas.
- Level 5: Cloudkill, Cone of Cold, Flame Strike.
- Level 6: Chain Lightning, Circle of Death, Disintegrate, Freezing Sphere,
  Harm, Globe of Invulnerability, Sunbeam, Mass Suggestion.

Acid Splash and Poison Spray also receive their supplied 4×4 art. Other
completed cantrip compositions remain intact. Utility spells not listed here
are not assigned arbitrary explosions. Cloudkill uses poison-cloud;
Stinking Cloud uses poison-comet's dissipating cloud frames. Disintegrate uses
the green acid-stream art for its ray while retaining **force** damage metadata.
Art color does not change damage types, rules, targets, ranges or resources.

## Presentation budgets

| Sequence | Full | Reduced | Off |
| --- | ---: | ---: | ---: |
| New projectile/beam/cone profiles and Fireball | 3 | 2 | 0 |
| New impact/cloud/touch/aura profiles | 2 | 1 | 0 |
| Existing Lightning Bolt 5×5 test | 2 | 1 | 0 |
| Existing Ice Storm | 3 phases/effects | 3 phases/effects | 0 |

The new batch has zero separate particle nodes and zero per-token effects;
counts do not grow with the number of affected tokens. Full adds one small
charge (or a local area gather); Reduced omits it. No persistent aftermath.
Fireball shares one texture between flight and explosion. Magic Missile and
Chain Lightning intentionally demonstrate one path rather than spawning
one projectile per dart/secondary target. Gameplay targeting remains unchanged.
Ice Storm retains at most 32 procedural hailstones + 7 small sprite bursts in
Full, versus 7 hailstones + 2 bursts in Reduced; native animations are canceled
on removal. It is an existing bounded storm composition, not a new per-token storm.

## Verification and quality

Unit coverage checks 4/5/6 grids, all local asset dimensions, per-sheet windows,
last-frame completion, preview and confirmed-cast events, eight directions,
100 affected-token inputs, every mode, preload selection, repeated cancellation,
renderer failure and native ice-animation disposal. Browser coverage exercises
real DM controls, CSS direction, parent-layer blending, grid sizing, bounded
counts, unchanged locked geometry and complete cleanup. Existing lightning
sound, 4×4 comparison, cantrip and compact-map tests remain regression gates.

The extra frames are useful for impact-to-smoke transitions while keeping one
sprite draw per effect. A 25-cell grid alone does not guarantee smoother art;
frame spacing and consistent centers still matter, and role windows deliberately
skip unrelated flight/impact imagery. These supplied sheets are roughly
1.8–2.7 MB each; they are lazy-loaded and reused. This is a visual/functional
check, not a cross-device GPU benchmark. Use 5×5 selectively for higher-tier
effects; evaluate real 6×6 art and memory cost before enabling the upper tier.
