# Phase 14 — Species and Background Content

Phase 14 completes the built-in Legacy 5e (2014) species and background catalog without changing the application's selected rules edition.

## Included content

- Nine built-in species with complete descriptions, fixed 2014 ability bonuses, size, speed, languages, proficiencies, resistances, and ancestry choices.
- Nine built-in subraces with complete descriptions and their fixed 2014 mechanics.
- Complete descriptions and source/edition metadata for every built-in species trait and subrace trait.
- Thirteen built-in backgrounds with complete descriptions.
- Complete descriptions and source/edition metadata for every built-in background feature.
- Validated background skill, tool, language, and equipment-package definitions.

The character creator keeps short summaries visible on selection cards and places the longer descriptions and nested trait/feature details in expandable sections.

## Catalog scope decision

Additional published species and backgrounds are not bundled in the fixed catalog. They remain supported through the existing custom and room-content paths when that content supplies explicit source and edition labels. This keeps the built-in catalog deterministic while preserving homebrew extensibility.

`validateBuiltinSpeciesBackgroundCatalog` enforces these expectations, and the browser self-test covers each Phase 14 checklist item.
