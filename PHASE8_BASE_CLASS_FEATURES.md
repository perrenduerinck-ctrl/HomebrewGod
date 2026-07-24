# Phase 8: Complete Base-Class Features

Phase 8 completes and validates the Legacy 2014 base-class catalog used by Homebrew God.

## Completed scope

- All 13 classes retain an explicit level 1 through 20 progression.
- All 285 base-class features have concise summaries, full descriptions, owning-class IDs, exact unlock levels, and Legacy 2014 source metadata.
- Detail, latest-level, feature-management, and review views show the full feature descriptions and source information.
- Canonical scaling is locked for Rage, Bardic Inspiration, Channel Divinity, Wild Shape, Ki, Unarmored Movement, Lay on Hands, Sneak Attack, Font of Magic, and artificer infusions.
- Starting and multiclass proficiency tables are validated for every class. Barbarian multiclass armor proficiency now correctly includes light armor, medium armor, and shields.

## Validation

`validateDefaultClassCollection` checks:

- the 13-class and 285-feature catalog shape;
- complete level 1 through 20 buckets;
- duplicate or missing feature IDs;
- missing, placeholder, or oversized display copy;
- incorrect owning class or unlock levels;
- missing source and edition metadata;
- unsupported base-class feature or effect types;
- invalid or decreasing progression tables;
- canonical class-resource scaling;
- starting and multiclass proficiencies.

The character schema is version 10 and the class schema is version 2. The browser self-test suite adds 14 Phase 8 regressions, bringing the expected total to 306.
