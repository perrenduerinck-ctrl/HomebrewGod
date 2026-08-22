# Phase 10: Feat Spellcasting

Phase 10 completes the 2014 feat-spell pipeline.

## Implemented

- Fixed casting abilities are preserved for Aberrant Dragonmark, Artificer Initiate, Drow High Magic, Svirfneblin Magic, and Wood Elf Magic.
- Magic Initiate derives its casting ability from the selected class.
- Spell Sniper derives its casting ability from the selected spell list.
- Fey Touched, Shadow Touched, Telekinetic, and Telepathic preserve the player's selected ability.
- Every selected feat spell receives a structured feat source, casting ability, usage cadence, and normal-slot eligibility.
- At-will, limited-use, and once-per-long-rest feat spells are tracked independently.
- Class-list, school, ritual, and spell-attack restrictions remain enforced by the feat spell picker.
- The read-only character sheet includes a Feat Spells card with remaining uses, recharge timing, casting ability, source feat, and normal-slot eligibility.
- Character finalization reports missing feat spell abilities or sources.

## Compatibility

The feat mechanics schema is now version 2 and the character schema is version 12. Legacy `magic.featSources.spellIds` and `grants` remain populated so older spell-source consumers continue to work.

## Validation

Phase 10 adds twenty focused self-tests, one for each completion-list item. The full browser self-test suite now contains 337 checks.
