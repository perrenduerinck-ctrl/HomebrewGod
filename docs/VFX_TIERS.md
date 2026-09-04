# Spell VFX tiers

Scope: the app's current 2014 catalog, not every published D&D spell or
user-created spell. Counts are checked by `tests/vfx-cantrips.test.mjs`.
Intentional shared profiles count as mapped; generic delivery fallbacks do not.
The complete cantrip and level 1–9 catalog now has intentional VFX. The owner-supplied atlas
batch adds 12 selected level 1–2 profiles, 19 selected level 3–6 profiles, and
28 selected level 7–9 profiles. The remaining spells use deliberate shared
compositions rather than generic damage fallbacks.

| Spell level | Catalog spells | Intentional VFX mappings | Remaining |
| --- | ---: | ---: | ---: |
| Cantrips | 45 | 45 | 0 |
| 1 | 49 | 49 | 0 |
| 2 | 54 | 54 | 0 |
| 3 | 42 | 42 | 0 |
| 4 | 31 | 31 | 0 |
| 5 | 37 | 37 | 0 |
| 6 | 31 | 31 | 0 |
| 7 | 20 | 20 | 0 |
| 8 | 16 | 16 | 0 |
| 9 | 15 | 15 | 0 |
| **Total** | **340** | **340** | **0** |

## Existing bespoke overrides (preserved)

Fire Bolt, Ray of Frost, Frostbite, Eldritch Blast, Shocking Grasp, Sacred Flame.
Fireball uses the supplied 5×5 fire atlas for one projectile and one explosion.
Burning Hands and Flame Strike now have intentional shared profiles.

Lightning Bolt and Ice Storm now have richer shared-profile compositions:
charge, branching full-length lightning and sprite impact; or gathering cloud,
staggered hail, ice bursts and fading frost. Ice Storm fits the exact template
radius rather than increasing the affected area with visual intensity.
Ice Storm now uses the supplied 5×5 cold atlas with bounded native frame stepping.

Lightning Bolt additionally has a bounded **5×5 test** override: one 25-frame
sprite, plus one small charge in Full mode (Reduced: one effect; Off: zero).
The DM's Lightning VFX selector preserves the 4×4 baseline for comparison.
Its sound and comparison selector are unchanged. See `LIGHTNING_5X5_TEST.md`.

Eldritch Blast currently demonstrates one beam from the selected origin to one
target. Level-scaled multi-beam and separate targets are a later cantrip task.
Shocking Grasp's character-free preview uses a labeled five-foot touch reach;
this does not modify real casting or character reach.

## Completed shared-profile cantrip batches

1. Acid Splash, Poison Spray, Chill Touch, Toll the Dead, Mind Sliver,
   Vicious Mockery, Sapping Sting, Infestation.
2. Produce Flame, Create Bonfire, Control Flames, Booming Blade, Green-Flame
   Blade, Lightning Lure, Primal Savagery, Sword Burst, Thunderclap,
   Word of Radiance, Magic Stone.
3. Blade Ward, Dancing Lights, Druidcraft, Encode Thoughts, Friends, Guidance,
   Gust, Light, Mage Hand, Mending, Message, Minor Illusion, Mold Earth,
   Prestidigitation, Resistance, Shape Water, Shillelagh, Spare the Dying,
   Thaumaturgy, True Strike.

Every spell above now has a shared-family composition and a DM preview option.
Weapon previews demonstrate a strike at the selected point, not an equipped
weapon attachment or a resolved hit. Persistent spells demonstrate a short,
bounded animation, not a gameplay-duration persistent effect.

These 39 cantrips use small glyphs, hands, ripples, auras, leaves, swarms,
weapon arcs and shared elemental sprites. Utility magic does not use an
explosion fallback. 340 spells do not require 340 different sprite sheets.

## Completed level 2 batch

All 54 level 2 spells now have intentional compositions. The 46 additions cover
buffs and debuffs, touch and self magic, utility glyphs, movement effects,
summons, projectiles, and exact area geometry. Arcane Lock, Augury, Hold Person,
Rope Trick, Web, and Zone of Truth use dedicated lock, eye, chain, portal, and
web glyph variants. Darkness, Calm Emotions, Gust of Wind, Spike Growth, Web,
and Zone of Truth fit their catalog templates without changing those templates.

Status art is reused for effects such as Aid, Barkskin, Darkvision, Lesser
Restoration, Protection from Poison, and Spider Climb. Every composition is a
short preview only; no condition, movement, healing, summon, or spell resource
is applied by the VFX system.

## Completed level 3 batch

All 42 level 3 spells now have intentional compositions. The 32 additions cover
summoning, divination, dispelling, transformation, healing, travel, wards, and
the remaining area magic. New skull, cancel, ward, spiral, horse, and wave
glyphs keep utility spells visually distinct without assigning them arbitrary
damage explosions.

Fear, Daylight, Magic Circle, Speak with Plants, and Tiny Hut preserve their
catalog geometry. Wind Wall uses a labeled point anchor because freeform wall
drawing is not yet supported by the map template editor; its real 50-foot wall
data remains unchanged. Fireball and Lightning Bolt retain their bespoke
clip-based and storm sequences.

## Completed level 4 batch

All 31 level 4 spells now have intentional compositions. The 26 additions cover
conjuration, planar travel, transformation, divination, protection, terrain,
water, stone, and fire. Elemental, paw, and chest glyphs distinguish summons,
beast magic, and Secret Chest without substituting arbitrary explosions.

Arcane Eye, Black Tentacles, Control Water, Fire Shield, Hallucinatory Terrain,
and Private Sanctum preserve their catalog geometry. Wall of Fire uses a labeled
point anchor because freeform wall drawing is not yet supported by the template
editor; its real 60-by-20-foot wall data remains unchanged. Ice Storm retains
its dedicated fitted storm composition.

## Completed level 5 batch

All 37 level 5 spells now have intentional compositions. The 34 additions cover
animated objects, conjuration, planar contact, control, restoration, resurrection,
divination, teleportation, transformation, and protective magic. New object,
tree, book, and mind glyphs keep utility magic visually distinct, while existing
status art identifies poison, domination, sleep, restraint, healing, and scrying.

Antilife Shell, Conjure Elemental, Creation, Hallow, Insect Plague, Mass Cure
Wounds, Telekinesis, and Teleportation Circle preserve their catalog geometry.
Wall of Force and Wall of Stone use labeled point anchors because freeform wall
drawing is not yet supported; their real spell data remains unchanged. Both
walls render as upright depth-layer effects rather than a global light overlay.

## Completed level 6 batch

All 31 level 6 spells now have intentional compositions. The 22 additions cover
major wards, undead and planar summons, transformation, divination, healing,
travel, illusion, terrain, and persistent barriers. Wing, path, feast, music,
and jar glyphs distinguish utility magic without substituting damage effects.

Circle of Death, Disintegrate, Forbiddance, Freezing Sphere, Globe of
Invulnerability, Guards and Wards, Move Earth, Programmed Illusion, Sunbeam,
Wall of Ice, and Word of Recall preserve their catalog geometry. Blade Barrier,
Wall of Ice, and Wall of Thorns use bounded upright wall previews with labeled
anchors where the basic template editor cannot express their freeform walls.
The walls remain in the normal depth-layer system and do not use a global light
overlay.

## Completed levels 7–9 batch

All 51 level 7–9 spells now have intentional compositions. The final 22 additions
cover celestial summoning, ethereal and astral travel, large-scale illusion,
resurrection, transformation, weather control, wards, cloning, foresight, and
prismatic magic. Door, mirror, twin, magnet, astral, and transmutation glyphs
keep high-level utility magic distinct without assigning arbitrary explosions.

Magnificent Mansion, Mirage Arcane, Prismatic Spray, Symbol, and
Antipathy/Sympathy preserve their catalog geometry. Prismatic Wall uses a
labeled point anchor because the basic template editor cannot express its
90-by-30-foot wall; its real wall data remains unchanged. Prismatic Spray and
Prismatic Wall use dedicated multicolor depth-layer effects with screen blending,
not a global light overlay.

## Bulk pipeline

`vfx/spellVfxProfiles.js` contains the immutable configuration records.
`vfx/profileSequence.js` compiles a profile into the existing six-phase sequence.
Resolution order is spell-specific override, configured profile, then generic
damage/delivery fallback. `vfx/profileEffects.js` registers reusable procedural
primitives and reuses the existing damage palettes; sprites remain lazy-loaded.

Profiles support effect IDs for projectile/impact/caster/target/aftermath,
family, damage/palette, scale, intensity, travel/impact duration, travel speed
(map pixels per second), particle multiplier, impact count and aftershocks.
Spell level drives bounded size/intensity/particle growth. Screen-shake intensity
is reserved metadata only: no camera movement is applied. Counts and durations
are clamped before scheduling and the existing engine safety caps still apply.

To add a future level, add profiles rather than a new engine. Keep catalog IDs
authoritative, validate every referenced effect/asset, and use `specialOptions`
for presentation variants. Optional `preview` placement settings apply only to
DM VFX previews, never real casting rules. Unknown spells keep their fallback.

Tests programmatically validate all 340 catalog spells, referenced assets,
sequence normalization, placement, levels, caps, Full/Reduced/Off and cleanup.
A small browser sample covers projectile, target impact, touch, beam, utility,
ground and weapon compositions, alongside the existing sprite regressions.

No catalog spell remains unmapped. Multi-beam Eldritch Blast and real weapon
attachments remain future enhancements; every current 2014 catalog spell has
an intentional preview composition.

## Optional art upgrades (not blockers)

- Acid: green liquid projectile plus splash/impact sheet.
- Poison: green/purple mist puff and a dissipating cloud sheet.
- Spectral hand: pale ghostly hand for Chill Touch and Mage Hand.
- Psychic: pink/violet ripple or mind-shatter sheet.
- Necrotic bell/skull pulse for Toll the Dead (existing dark art can supplement).
- Later: wind swirl, water ripple, leaf/healing glow, shield/rune ring,
  weapon slash and insect swarm.

Art policy follows the spell's base level: 4×4/16 frames for levels 0–2,
5×5/25 for levels 3–6, and 6×6/36 for levels 7–9. Thirteen upper-tier sheets
are supplied, with 28 sprite-driven high-level mappings; the other high-level
spells use intentional shared compositions.
Do not relabel a 4×4 or 5×5 sheet as 6×6. Keep consistent centers and cell
padding, no labels/grid lines, and preferably transparent backgrounds.
See `SPRITE_ATLAS_BATCH.md` for assets, mappings, budgets and verification.

## Safety and playback

The targeting overlay is temporarily transparent for the complete sequence,
including overlapping casts, and returns when the final sequence ends.
Reset cancels only previews; Effects Off, cleanup and failures restore it too.
Geometry/locks are never cleared just to hide the overlay. Preview remains
DM-only, character-free and does not resolve rolls, HP, resources or persistence.
