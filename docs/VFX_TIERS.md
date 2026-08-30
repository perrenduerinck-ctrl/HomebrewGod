# Spell VFX tiers

Scope: the app's current 2014 catalog, not every published D&D spell or
user-created spell. Counts are checked by `tests/vfx-cantrips.test.mjs`.
Intentional shared profiles count as mapped; generic delivery fallbacks do not.
The current cantrip tier is complete. Level 1 is next, not part of this pass.

| Spell level | Catalog spells | Intentional VFX mappings | Remaining |
| --- | ---: | ---: | ---: |
| Cantrips | 45 | 45 | 0 |
| 1 | 49 | 0 | 49 |
| 2 | 54 | 0 | 54 |
| 3 | 42 | 2 | 40 |
| 4 | 31 | 1 | 30 |
| 5 | 37 | 0 | 37 |
| 6 | 31 | 0 | 31 |
| 7 | 20 | 0 | 20 |
| 8 | 16 | 0 | 16 |
| 9 | 15 | 0 | 15 |
| **Total** | **340** | **48** | **292** |

## Existing bespoke overrides (preserved)

Fire Bolt, Ray of Frost, Frostbite, Eldritch Blast, Shocking Grasp, Sacred Flame.
Fireball also already has a dedicated sequence. Burning Hands and Flame Strike
remain available in Preview but still use fallback
sequences; their presence in the dropdown does not mean bespoke VFX are done.

Lightning Bolt and Ice Storm now have richer shared-profile compositions:
charge, branching full-length lightning and sprite impact; or gathering cloud,
staggered hail, ice bursts and fading frost. Ice Storm fits the exact template
radius rather than increasing the affected area with visual intensity.
These two requested visual upgrades do not start the Level 1 batch.

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

Tests programmatically validate all 45 catalog cantrips, referenced assets,
sequence normalization, placement, levels, caps, Full/Reduced/Off and cleanup.
A small browser sample covers projectile, target impact, touch, beam, utility,
ground and weapon compositions, alongside the existing sprite regressions.

Next batch: **Level 1 — all 49 spells**. No Level 1 profiles were added here.
Multi-beam Eldritch Blast and real weapon attachments remain future enhancements;
all 45 cantrips already have intentional preview compositions.

## Optional art upgrades (not blockers)

- Acid: green liquid projectile plus splash/impact sheet.
- Poison: green/purple mist puff and a dissipating cloud sheet.
- Spectral hand: pale ghostly hand for Chill Touch and Mage Hand.
- Psychic: pink/violet ripple or mind-shatter sheet.
- Necrotic bell/skull pulse for Toll the Dead (existing dark art can supplement).
- Later: wind swirl, water ripple, leaf/healing glow, shield/rune ring,
  weapon slash and insect swarm.

Prefer transparent PNG, a uniform 4x4 grid of 16 frames, consistent center and
padding in every cell, no labels/grid lines, and a separate single projectile
pointing horizontally right. Leave a little transparent padding at each edge.

## Safety and playback

The targeting overlay is temporarily transparent for the complete sequence,
including overlapping casts, and returns when the final sequence ends.
Reset cancels only previews; Effects Off, cleanup and failures restore it too.
Geometry/locks are never cleared just to hide the overlay. Preview remains
DM-only, character-free and does not resolve rolls, HP, resources or persistence.
