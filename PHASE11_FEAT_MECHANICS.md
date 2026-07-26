# Phase 11 — Completed Feat Mechanics

Phase 11 converts the checklist's feat descriptions into structured,
persisted character mechanics.

## Applied mechanics

- Natural weapons, unarmed-damage dice, conditional Armor Class bonuses,
  conditional damage reduction, elemental spell rules, senses, telepathy,
  healing bonuses, resistance sources, and change-after-rest resistance.
- Selected Eldritch Invocations, Fighting Styles, Battle Master maneuvers,
  and Metamagic options.
- Martial Adept superiority dice and Metamagic Adept sorcery points use the
  existing tracked feat-resource system.
- Ritual Caster creates a class-labeled ritual book and rejects rituals above
  `floor(total character level / 2)`.
- Scion of the Outer Planes applies the selected planar category's resistance
  and cantrip.
- Strike of the Giants creates a structured strike action linked to its
  proficiency-based resource.

## Character sheet

The read-only sheet now includes feat-granted attacks, resources, selected
features, defenses, senses and communication, Elemental Adept rules, ritual
books, strike actions, and healing bonuses.

## Verification

- 23 Phase 11 regression checks cover every checklist item.
- The complete creator suite contains 360 self-tests.
