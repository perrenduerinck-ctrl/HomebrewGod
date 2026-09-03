# Spell VFX tiers

Scope: the app's current 2014 catalog, not every published D&D spell or
user-created spell. Counts are checked by `tests/vfx-cantrips.test.mjs`.
Intentional shared profiles count as mapped; generic delivery fallbacks do not.
The current cantrip, level 1, and level 2 tiers are complete. The owner-supplied atlas
batch adds 12 selected level 1–2 profiles, 19 selected level 3–6 profiles, and
28 selected level 7–9 profiles. Other spells still use their existing generic
presentation; dropdown presence is not full-tier completion.

| Spell level | Catalog spells | Intentional VFX mappings | Remaining |
| --- | ---: | ---: | ---: |
| Cantrips | 45 | 45 | 0 |
| 1 | 49 | 49 | 0 |
| 2 | 54 | 54 | 0 |
| 3 | 42 | 10 | 32 |
| 4 | 31 | 5 | 26 |
| 5 | 37 | 3 | 34 |
| 6 | 31 | 9 | 22 |
| 7 | 20 | 10 | 10 |
| 8 | 16 | 10 | 6 |
| 9 | 15 | 9 | 6 |
| **Total** | **340** | **204** | **136** |

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

Tests programmatically validate all 45 catalog cantrips and all level 1–2 spells, referenced assets,
sequence normalization, placement, levels, caps, Full/Reduced/Off and cleanup.
A small browser sample covers projectile, target impact, touch, beam, utility,
ground and weapon compositions, alongside the existing sprite regressions.

Further work starts with the remaining level 3 spells and the other unmapped
catalog tiers. Multi-beam Eldritch Blast and real weapon attachments remain
future enhancements; all 45 cantrips, all 49 level 1 spells, and all 54 level 2
spells already have intentional preview compositions.

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
are supplied, with 28 intentional high-level mappings; other fallbacks remain.
Do not relabel a 4×4 or 5×5 sheet as 6×6. Keep consistent centers and cell
padding, no labels/grid lines, and preferably transparent backgrounds.
See `SPRITE_ATLAS_BATCH.md` for assets, mappings, budgets and verification.

## Safety and playback

The targeting overlay is temporarily transparent for the complete sequence,
including overlapping casts, and returns when the final sequence ends.
Reset cancels only previews; Effects Off, cleanup and failures restore it too.
Geometry/locks are never cleared just to hide the overlay. Preview remains
DM-only, character-free and does not resolve rolls, HP, resources or persistence.
