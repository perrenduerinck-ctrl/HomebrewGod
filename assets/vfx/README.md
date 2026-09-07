# Supplied VFX artwork

The PNGs in `cantrips/` and `library/` were supplied by the project owner.
They are copied unchanged, with transparent backgrounds retained. The renderer
scales and rotates them at runtime; no image-generation or external upload
service is involved. Only assets used by the selected spell are preloaded.

## Cantrip batch 1

- Ray of Frost: frost-projectile + frost-impact (4x4, 16 frames).
- Frostbite: the same frost-impact sheet, target only.
- Eldritch Blast: force-projectile + force-impact (4x4, 16 frames).
- Shocking Grasp: lightning-impact (4x4, 16 frames), target only.
- Sacred Flame: radiant-projectile falling at the target + radiant-impact
  (4x4, 16 frames). It does not travel from the caster.
- Fire Bolt retains its existing assets in `fire/`.

The two force impact attachments ending `82ded898a0d2` and
`219885d8cdfa` are byte-for-byte duplicates; only one copy is stored.

## Reserved artwork (not loaded at startup)

- `cantrips/dark-*.png`: dark-energy projectile/impact, reserved.
- `cantrips/lightning-projectile.png`: lightning bolt, reserved.
- `library/meteor-*.png`: meteor projectile and impact sheet.
- `library/lightning-spear.png`, `lightning-storm-impact.png`: stronger lightning.
- `library/ice-spear.png`: alternate ice projectile (Ice Storm uses `ice-burst.png` below).
- `library/void-*.png`: void projectile and impact sheet.
- `library/radiant-spear.png`: alternate radiant projectile.

The meteor impact sheet has visible grid seams; crop/padding metadata or a
cleaner sheet will be needed before animating that variant. It is not used now.

## Lightning Bolt / Ice Storm polish

- `storms/lightning-charge.png`: owner attachment ending `f200bab78219`,
  unchanged 1254px RGB, 4x4. Frames 0–3 form the charge; frames 4–11 animate
  the moving bolt head. Shared frame windows keep these phases separate.
- `storms/lightning-impact.png`: attachment ending `eccaca59d728`, unchanged
  1254px RGB, 4x4. Full 16-frame impact.
- The original black-backed sheets remain untouched. Runtime resolves RGBA
  compatibility copies; screen blending retains their luminous appearance
  without relying on it to remove an opaque background.
- `library/ice-burst.png` is now used for Ice Storm's staggered ground impacts.
  Shared procedural hail/cloud/frost complete the effect inside its template.
- The supplied lance (`df0f9abe`) and vortex (`48636a1e`) sheets remain optional
  future variants; they are not copied or downloaded for these compositions.

The normal and additive layers share engine caps, resize, Off/Reduced settings,
and cleanup. No extra persistent effects or gameplay state are created.

## Clip-based asset standard

ALL newly remade animated assets use 6×6 atlases: 36 intentional frames,
including projectiles, buffs/debuffs, auras and smoke. Phase windows may select
subsets of those frames. Legacy grid dimensions remain metadata: 1×1, 4×4,
5×5, 6×4, 4×3, 6×7 and measured custom atlases all remain supported.

`vfx/vfxAssetManifest.js` is the central clip registry. A spell may define any
subset of `charge`, `release`, `travel`, `impact`, `aftermath`, and `persistent`.
World movement, fake Z, easing, shadows and trails remain separate engine data;
sprite frames animate the object rather than carrying it across the map.

Migration is incremental:

- `legacyStatus: KEEP_AS_FALLBACK`: retain the existing file and mapping.
- `modernReplacementStatus: NEEDS_6X6`: animated replacement remains planned.
- `READY`: a modern version is available; this is separate from legacy retention.
- `STATIC_REVIEW`: single-image art needs a role decision before an animated remake.

Fireball is the first complete composition. Its charge/release/travel/impact
windows play through one reusable clip controller, while the engine separately
adds arc motion, perspective, a moving shadow, ember trail, impact flash,
shockwave, debris, smoke, embers and a temporary scorch mark. Assets are loaded
when a clip is about to play and retained in a small recently-used cache.

### Legacy + modern asset selection

Fireball's impact and aftermath now retain explicit `legacy` and `modern6x6`
definitions with `preferred: "modern6x6"`. This migration reuses the existing
transparent `fireball-impact-alpha-6x6.png`; it does not redraw or delete artwork.
The original 4×4 fire sheet remains registered for other spells as well as fallback.
Charge, release and travel retain their existing art in explicit legacy entries,
with empty modern slots until reviewed 6×6 replacements exist.

`getVfxClipSet()` still returns flat sprite options for existing consumers, with
version metadata retained for playback. The clip controller warms only the chosen
effect's versioned sheets, including impact during charge/travel, and waits for
image decode. Modern ready at clip start means modern for the entire clip.
Otherwise the entire clip uses legacy; later loading benefits the next playback.
A missing, invalid-grid/FPS/window or disabled modern entry, or a failed image request, uses
legacy. Late requests cannot revive a stopped/destroyed effect or replace a newer
clip. Keep all geometry, frame ranges, events and timing inside each version;
never apply a modern grid to legacy pixels.

On localhost only, use `?vfxAssets=auto`, `?vfxAssets=legacy`, or
`?vfxAssets=modern6x6` to compare playback. Force Modern still falls back if needed.
Normal player hosts ignore this query option. There is no player-facing control.

`vfx/vfxMigrationManifest.js` inventories every current PNG using the live effect
definitions plus reserved artwork. Its four labels are KEEP, UPGRADE LATER,
REPLACE WITH 6×6, and ALREADY MODERN. The classification plans work; it does not
alter mappings or mark every existing 6×6 sheet as visually approved.

To migrate another animated clip, retain its legacy definition, add a separate
6-column/6-row/36-frame entry, set the preference, then test that one effect and
its missing-image fallback. Keep other phases and spell mappings unchanged.

Non-clip sprites can use `vfx/spriteReplacements.js`, keyed by effect ID rather
than spell level. Each modern entry owns its source, frame window, FPS,
`blendMode`, `artAngle` and `anchor`. Prefer equal cells with a fixed center,
projectile center, impact center or ground contact. Measured atlases remain
available where the actual artwork has uneven gutters, including the meteor replacement.

### Transparency and review tools

`python scripts/vfx-alpha.py --audit` inspects all original sheets using the
current registry metadata. `--build-compat` also generates RGBA copies under
`alpha-compat/`, a source mapping in `vfx/alphaAssets.js`, an alpha report and
a contact sheet under `audit/`. Originals are never overwritten. These copies
retain their legacy grids and frames; they are not new 6×6 artwork.

For new art, use `--source NEW.png --output CLEAN.png --unmat --columns 6 --rows 6`.
Omit `--unmat` for already transparent art; low-alpha cleanup still runs.
The tool flags empty frames, edge coverage, center jumps and brightness changes.
Review all 36 frames at a fixed anchor for size/rotation jumps and flicker.
Those flags are review aids, not an automatic guarantee of artistic continuity.

The 2026-09-06 audit found 37 fully opaque sheets with dark backgrounds and
created transparent compatibility copies, including a measured dark-blue matte
correction for Blessing. Runtime sprites and imminent cache loads resolve these
copies, including cache-busted status URLs. Modern Fireball uses normal blending.
Rendered-pixel tests cover dark, bright, colored, transparent and token-colored
backgrounds inside isolated layers. See `docs/VFX_AUDIT_2026-09-06.md`.

Validation: `node tests/vfx-clips.test.mjs` includes migration unit tests.
`node node_modules/@playwright/test/cli.js test tests/browser.spec.mjs --grep
"Fireball"` includes real PNG loading, failed-image fallback, 2.5D composition,
alpha checks and a screenshot comparing the modern and legacy impact windows.

## Buff and debuff status batch

The 20 unique 5×5 atlases in `status/` are the owner's unchanged 1254×1254
uploads: 10 buffs and 10 debuffs. One second purple-eye attachment was an exact
duplicate and is intentionally not stored twice. Runtime atlas bounds and
insets remove the drawn card/grid borders. RGBA compatibility copies remove
opaque mattes, while the radial screen-blended mask softens legacy frame edges.
The original PNGs remain untouched.

Status VFX are presentation only. Spell profiles can select an icon, but the
renderer never applies a condition, changes a roll, or mutates character/combat
state. Ambiguous artwork keeps a descriptive neutral name (`hostile-flame`,
`ominous-eye`, `power-up`, and `power-down`) instead of inventing rules.

## Priority seven replacements — 2026-09-07

Seven separate RGBA sheets are stored in `modern6x6/`. The corresponding originals
remain byte-for-byte intact. `vfx/spriteReplacements.js` connects the active effects
to their modern and legacy metadata; decoded modern art uses normal alpha blending.
A cold load retains legacy for the entire playback and uses modern on the next
play. Failed modern loads retain legacy. No texture is swapped during a clip.

| Original | Replacement in `modern6x6/` | Use |
| --- | --- | --- |
| `storms/lightning-impact.png` | `lightning-impact-6x6.png` | Storm impact |
| `lightning/lightning-bolt-main-5x5.png` | `lightning-bolt-main-6x6.png` | Lightning Bolt |
| `library/meteor-impact.png` | `meteor-impact-6x6.png` | Reserved art, no new spell mapping |
| `tiers3-6/cold-cast-5x5.png` | `cold-cast-6x6.png` | Cold roles and Ice Storm frost |
| `tiers3-6/acid-cast-5x5.png` | `acid-cast-6x6.png` | Acid roles |
| `tiers3-6/poison-cast-5x5.png` | `poison-cast-6x6.png` | Poison roles |
| `tiers3-6/necrotic-cast-5x5.png` | `necrotic-cast-6x6.png` | Necrotic roles |

All seven contain 36 nonempty frames in six columns and six rows. Meteor uses
measured row bounds to keep the eruption plume inside its frame. Flight/beam,
impact and cloud roles select appropriate windows; effects retain their existing
duration and gameplay geometry. Lightning charge and status artwork are outside
this replacement batch. The earlier alpha compatibility copies remain available.

The built-in imagegen output was processed with the requested black-unmatting
pipeline, then checked as RGBA rather than trusting a displayed checkerboard.
`audit/priority-seven-generation.json` records the final prompts; `audit/priority-seven-alpha.json`
records hashes, transparency, frame occupancy and edge checks. Its centroid flags
mark phase transitions and late faint remnants for artistic review; they do not
indicate an opaque background. Additive extraction makes dark smoke translucent,
especially over very bright maps; it does not reconstruct opaque smoke material.

Run `node scripts/static-server.mjs`, then visit
`/output/vfx/priority-seven/index.html` for animated modern/legacy comparisons on
five backgrounds. Focused browser tests live in `tests/vfx-replacements.spec.mjs`;
unit checks live in `tests/vfx-replacements.test.mjs`.

## Lightning Bolt legacy 5×5 fallback

`lightning/lightning-bolt-main-5x5.png` is the owner's unchanged 1254×1254 RGBA
attachment ending `70c61d39f438`: 5 columns, 5 rows, 25 frames at 24 fps, no loop.
One main sprite contains charge, line discharge and endpoint fade. Full adds
one tiny procedural charge (2 effects total); Reduced uses only the main sprite
(1); Off uses none. No per-token effects or persistent aftermath are spawned.
The DM-only Lightning VFX selector now labels the default as a 6×6 bolt with legacy
fallback; its stored `5x5` value stays compatible. The other option selects the
storm composition, whose impact also has a modern replacement. Use the local
`?vfxAssets=legacy` developer override to inspect exact legacy artwork. See
`docs/LIGHTNING_5X5_TEST.md` for the budget, tradeoffs and validation.
