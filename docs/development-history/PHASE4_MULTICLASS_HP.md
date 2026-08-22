# Phase 4 Multiclass HP and Hit Dice

Homebrew God applies the Legacy 5e (2014) HP and Hit Dice rules with these
saved-character invariants:

- Each class keeps a separate Hit Die pool whose count equals that class's
  current level.
- Character level 1 uses the maximum result of the starting class's Hit Die.
  Every later level uses that level's class Hit Die and the fixed averages
  d6 = 4, d8 = 5, d10 = 6, and d12 = 7 when fixed HP is selected.
- Constitution is applied once per total character level. Dwarven Toughness
  adds one HP per total level, and Tough adds two HP per total level.
- Rolled HP is stored as a per-level record with its class entry and Hit Die.
  A stored roll is capped by its associated die.
- Adding, removing, or moving class levels remaps only compatible class-owned
  rolls. A roll from one class is never silently reused for another class.
- Legacy numeric multiclass rolls are migrated using saved level order and
  receive an explicit warning because their class ownership cannot be known
  with certainty.

The browser self-test suite contains one Phase 4 regression for each checklist
item, including all four Hit Die sizes, class addition/removal, level-order
changes, Constitution changes, legacy migration, warnings, and roll caps.
