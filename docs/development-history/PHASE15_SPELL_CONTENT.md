# Phase 15 — Spell Content Verification

Phase 15 keeps the spell catalog fixed to Legacy 5e (2014): 319 SRD 5.1 spells and 21 explicitly labeled additional cantrips, for 340 total entries.

## Validation coverage

The catalog audit now verifies:

- exact SRD, additional-cantrip, and total counts;
- class lists, spell level, school, casting time, range, components, materials, duration, concentration, and ritual status;
- spell-attack, weapon-attack, and saving-throw metadata;
- damage, healing, character-level scaling, slot-level scaling, and higher-level text;
- Legacy 5e edition and source labels;
- feat and subclass spell references.

Subclass spell entries that are outside the fixed 340-spell catalog remain valid only when they contain the complete inline fallback record added during the subclass work. A missing feat spell or an unresolved subclass spell without that fallback is a validation error.

## Additional cantrip review

The 21 additional cantrips now carry explicit canonical metadata and damage scaling where applicable. Blade Ward includes Warlock in its class list. Booming Blade and Green-Flame Blade are labeled as weapon-attack cantrips rather than spell attacks, so spell-attack-only choices do not accept them.

The spell browser and selected-spell cards display normalized components, resolution type, and available scaling data.
