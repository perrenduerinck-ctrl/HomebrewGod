# Spell VFX tiers

Scope: the app's current 2014 catalog, not every published D&D spell or
user-created spell. Counts are checked by `tests/vfx-cantrips.test.mjs`.
Fallback pulses/element effects are not counted as finished bespoke VFX.

| Spell level | Catalog spells | Dedicated VFX | Remaining |
| --- | ---: | ---: | ---: |
| Cantrips | 45 | 6 | 39 |
| 1 | 49 | 0 | 49 |
| 2 | 54 | 0 | 54 |
| 3 | 42 | 1 | 41 |
| 4 | 31 | 0 | 31 |
| 5 | 37 | 0 | 37 |
| 6 | 31 | 0 | 31 |
| 7 | 20 | 0 | 20 |
| 8 | 16 | 0 | 16 |
| 9 | 15 | 0 | 15 |
| **Total** | **340** | **7** | **333** |

## Finished first cantrip batch

Fire Bolt, Ray of Frost, Frostbite, Eldritch Blast, Shocking Grasp, Sacred Flame.
Fireball also already has a dedicated sequence. Burning Hands, Lightning Bolt,
Ice Storm and Flame Strike remain available in Preview but still use fallback
sequences; their presence in the dropdown does not mean bespoke VFX are done.

Eldritch Blast currently demonstrates one beam from the selected origin to one
target. Level-scaled multi-beam and separate targets are a later cantrip task.
Shocking Grasp's character-free preview uses a labeled five-foot touch reach;
this does not modify real casting or character reach.

## Next cantrip batches

1. Acid Splash, Poison Spray, Chill Touch, Toll the Dead, Mind Sliver,
   Vicious Mockery, Sapping Sting, Infestation.
2. Produce Flame, Create Bonfire, Control Flames, Booming Blade, Green-Flame
   Blade, Lightning Lure, Primal Savagery, Sword Burst, Thunderclap,
   Word of Radiance, Magic Stone.
3. Blade Ward, Dancing Lights, Druidcraft, Encode Thoughts, Friends, Guidance,
   Gust, Light, Mage Hand, Mending, Message, Minor Illusion, Mold Earth,
   Prestidigitation, Resistance, Shape Water, Shillelagh, Spare the Dying,
   Thaumaturgy, True Strike.
4. Revisit multi-beam/weapon-attached variants, then progress through levels 1–9.

These remaining 39 cantrips include utility magic: many need a small glyph,
hand, ripple or aura rather than an explosion. Share art by effect family;
340 spells do not require 340 different sprite sheets.

## Most useful next assets

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
