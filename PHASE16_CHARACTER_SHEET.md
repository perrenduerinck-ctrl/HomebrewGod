# Phase 16 — Character Sheet

Phase 16 finishes the character sheet as the play-facing view of the existing Character Creator data. The sheet renders from a protected snapshot while all tracked changes are sent back through creator callbacks, so tab changes and rendering never mutate the draft by accident.

## Display coverage

The sheet now includes:

- identity, portrait, species, background, class/subclass progression, and level-by-level multiclass order;
- ability scores and modifiers, saving throws, skills, expertise, passive Perception, passive Investigation, and passive Insight;
- the selected Armor Class calculation plus every available Armor Class option;
- current, maximum, and temporary HP plus remaining Hit Dice for each class;
- attacks, attacks per action, inventory, equipment state, currency, resistances, senses, speeds, languages, and proficiencies;
- separate class and subclass feature lists with full descriptions;
- feats with descriptions, source labels, and recorded choices;
- class resources, feat resources, manual reminders, and situational effects;
- spellcasting grouped by source class, combined multiclass slots, separate Pact Magic sources, innate spells, feat spells, and custom spells.

## Play controls

The character sheet can spend and restore class resources, feat resources, Hit Dice, normal spell slots, and Pact Magic slots. Short rests restore short-rest resources and Pact Magic. Long rests also restore long-rest resources, normal spell slots, HP, and half the character’s total Hit Dice, and clear temporary HP and Rage.

The toolbar provides short-rest, long-rest, JSON export, print, and saved-character/linked-token synchronization controls. Linked-token synchronization uses the existing character save path, which keeps the saved character authoritative and refreshes linked tokens through the token system.

## Compatibility

JSON export preserves the existing character schema and `sheetType: "character"` contract. Print mode renders the Main, Story, and Spell sections together with light, page-friendly styling and hides interactive controls.

Phase 16 adds one regression assertion for every checklist item plus an additional rest-rules assertion.
