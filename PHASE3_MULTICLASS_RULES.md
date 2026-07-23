# Phase 3 Multiclass Rules

Homebrew God applies the Legacy 5e (2014) multiclass rules with these
saved-character invariants:

- Every class uses its published prerequisite formula. Adding a class checks
  both the existing classes and the class being added.
- Total character level is capped at 20. Proficiency bonus uses total
  character level, while ASI and feat unlocks use each individual class level.
- The class recorded at character level 1 remains the starting class even if
  class cards are reordered. Only that class grants starting saving throws and
  starting equipment.
- Secondary classes grant only their multiclass proficiency package. Pending
  skill and tool selections must be completed before finalization.
- A character keeps only the first Unarmored Defense version received. Its
  source is persisted as `classProgression.unarmoredDefenseSource` and repaired
  from level history when migrating older characters.
- Removing or lowering a class rebuilds source-owned proficiencies, features,
  subclass benefits, ASI/feat selections, spell sources, resources, and stored
  feature choices.

The browser self-test suite contains Phase 3 regressions for all 13 class
prerequisite formulas, both Barbarian/Monk acquisition orders, direct editing
guards, the full secondary-proficiency table, level-20 migration, and cleanup.
