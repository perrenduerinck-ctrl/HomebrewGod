# Phase 5 Multiclass Spellcasting

Phase 5 completes the multiclass spellcasting checklist for the 2014 ruleset.

## Implemented behavior

- Full-, half-, third-, and Artificer caster levels combine with the correct
  multiclass rounding rules.
- Pact Magic remains separate from normal Spellcasting slots and preserves
  each Pact Magic source.
- Known, prepared, spellbook, always-prepared, and Mystic Arcanum selections
  remain owned by their individual class source.
- Each class limits spell selection using its own class level even when the
  character has higher combined slots.
- Higher combined normal or Pact Magic slots can upcast a lower-level spell
  learned from an eligible source class.
- Class and feat spell sources preserve the correct spellcasting ability,
  save DC, and attack bonus context.
- Arcane, divine, druidic, bardic, Artificer, and component-pouch focus
  associations are resolved per spellcasting class.
- Imported or legacy ownerless spells produce review warnings and do not
  silently change known/prepared calculations.
- Rage blocks spellcasting while active and spellcasting resumes when Rage
  ends.

## Verification

The browser self-test suite contains 24 named `Phase 5:` regressions, one for
each checklist requirement. The complete suite passes 251 of 251 tests.
The application smoke test and the 2014 ruleset policy test are also part of
the Phase 5 release gate.
