# Owner-supplied spell atlas batch — 2026-08-31

## Grid policy

| Base spell level | Grid | Frames | Availability |
| --- | --- | ---: | --- |
| Cantrips–2 | 4×4 | 16 | Existing cantrip art plus ten supplied elemental atlases |
| 3–6 | 5×5 | 25 | Thirteen supplied atlases, including five acid/poison variants |
| 7–9 | 6×6 | 36 | Thirteen supplied atlases, including the final corrected lightning |

Upcasting does not substitute a different grid. Never reinterpret existing
pixels with a larger grid or duplicate frames to claim extra animation.
Unmapped spells retain their existing presentation. This is not completion of
every spell in levels 1–9. Current inventory is in `VFX_TIERS.md`.

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

`assets/vfx/tiers7-9/{theme}-cast-6x6.png` contains psychic, earth, force,
cold, acid, fire, piercing, poison, necrotic, radiant, thunder, slashing and lightning.
The final replacement lightning (`codex-clipboard-1323290d-9fda-4274-ad29-75e9701d7eeb.png`)
has six columns and six rows and is stored as `lightning-cast-6x6.png`.
All thirteen are 1254×1254 opaque RGB images and use screen blending.
The two superseded seven-row lightning sheets are not shipped.
Grid metadata follows the actual source layout without discarding any frames.
Uneven upper-sheet gutters/trailing padding are recorded in `EPIC_ATLAS_BOUNDS`.
The player selects those source rectangles and fits each one without stretching;
it does not assume that dividing the whole PNG equally isolates every frame.
`scripts/inspect-atlas-grid.ps1` measures dark row/column gutters for inspection.

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
- Level 7: Arcane Sword, Delayed Blast Fireball, Divine Word, Finger of Death,
  Fire Storm, Forcecage, Plane Shift, Reverse Gravity, Teleport.
- Level 8: Antimagic Field, Demiplane, Dominate Monster, Earthquake, Feeblemind,
  Holy Aura, Incendiary Cloud, Maze, Power Word Stun, Sunburst.
- Level 9: Gate, Imprisonment, Mass Heal, Meteor Swarm, Power Word Kill,
  Storm of Vengeance, Time Stop, Weird, Wish.

Acid Splash and Poison Spray also receive their supplied 4×4 art. Other
completed cantrip compositions remain intact. Utility spells not listed here
are not assigned arbitrary explosions. Cloudkill uses poison-cloud;
Stinking Cloud uses poison-comet's dissipating cloud frames. Disintegrate uses
the green acid-stream art for its ray while retaining **force** damage metadata.
Art color does not change damage types, rules, targets, ranges or resources.
Upper-tier utility spells use explicit rune/portal windows, not meteor impacts.
Arcane Sword uses the slashing art while retaining force metadata. Earthquake
uses earth art with bludgeoning metadata. Some upper-tier sheets remain available
for future matching profiles; unused acid/cold/piercing/poison art is not eagerly loaded.

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
Meteor Swarm likewise shows one representative projectile/impact at the selected
center, not four independently targeted meteors. Delayed Blast Fireball previews
the release/impact; it does not add a gameplay delay or simulate concentration.
Upper-tier area sprites fit the template up to a scale of 6 (960 map pixels),
then remain capped even for Earthquake/Storm of Vengeance. The targeting outline
and actual affected area are not capped or changed. Storm of Vengeance uses one
brief lightning gather in Full and one thunder impact; no multi-round simulation.
Ice Storm retains at most 32 procedural hailstones + 7 small sprite bursts in
Full, versus 7 hailstones + 2 bursts in Reduced; native animations are canceled
on removal. It is an existing bounded storm composition, not a new per-token storm.

## Verification and quality

Unit coverage checks 4/5/6 grids, all local asset dimensions, per-sheet windows,
last-frame completion, source-rectangle bounds/aspect ratio, malformed metadata,
preview and confirmed-cast events, eight directions,
100 affected-token inputs, every mode, preload selection, repeated cancellation,
renderer failure and native ice-animation disposal. Browser coverage exercises
real DM controls, CSS direction, parent-layer blending, grid sizing, bounded
counts, unchanged locked geometry and complete cleanup. Existing lightning
sound, 4×4 comparison, cantrip and compact-map tests remain regression gates.

The extra frames are useful for impact-to-smoke transitions while keeping one
sprite draw per effect. A 25-cell grid alone does not guarantee smoother art;
frame spacing and consistent centers still matter, and role windows deliberately
skip unrelated flight/impact imagery. These supplied sheets are roughly
about 1–3 MB each; they are lazy-loaded and reused. This is a visual/functional
check, not a cross-device GPU benchmark. The upper tier retains the same bounded
effect/node budget instead of adding particles to compensate for higher spell levels.
