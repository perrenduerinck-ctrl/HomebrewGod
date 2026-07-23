# Phase 6: Shared Multiclass Feature Rules

Phase 6 completes the shared-feature and class-owned resource rules for the
2014/legacy 5e character creator.

## Implemented behavior

- Extra Attack uses the highest eligible attack count and never stacks across
  classes. Fighter improvements remain authoritative, while Thirsting Blade
  supplies an alternate two-attack source without adding another attack.
- Channel Divinity uses one shared pool. Eligible class and subclass options
  are merged into that pool, retain their source class entry, and use the
  correct class save DC. The pool increases only when an explicit class-level
  feature grants more uses.
- Sneak Attack, Rage, Martial Arts, Ki, Wild Shape, Lay on Hands, and other
  class-owned mechanics scale from their owning class level rather than total
  character level.
- Divine Smite lists only available standard or Pact Magic slot sources. Pact
  Magic usage is tracked independently for each source.
- Class feature save DCs use the correct class ability and remain attached to
  their owning class entry.
- Character schema version 8 normalizes per-source Pact Magic usage and the
  new class-mechanics records.

## Verification

The character-creator suite contains exactly 15 Phase 6 regression tests, one
for each item in the Phase 6 task list. The complete suite passes 266 of 266
tests.
