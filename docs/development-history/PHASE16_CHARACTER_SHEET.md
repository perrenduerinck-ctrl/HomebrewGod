# Phase 16 — Playable Character Sheet

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

The visible sheet is organized into Actions, Abilities, Inventory, Features, Spells, and Description. It can apply damage, healing, current HP, and temporary HP; track inspiration, death saves, standard or custom conditions, equipment, attunement, class and feat resources, Hit Dice, normal spell slots, and Pact Magic slots. Short rests restore short-rest resources and Pact Magic. Long rests also restore long-rest resources, normal spell slots, HP, and half the character’s total Hit Dice, and clear temporary HP, death saves, and Rage.

The toolbar provides confirmed short and long rests, permanent editing, JSON export, print, duplication, deletion, and return-to-library controls. Gameplay mutations use the existing ownership-checked update path and preserve the same saved character ID and finalization state, so normal play never creates duplicate characters.

## Library flow

Saved-character cards show the portrait, name, class/subclass and multiclass summary, species, last-updated time, and separate Open Sheet, Edit, Duplicate, Export, and Delete actions. Opening the sheet loads the saved character without entering the permanent-decision builder. An unsaved Review-sheet remains a read-only preview until the character is saved.

## Compatibility

JSON export preserves the existing character schema and `sheetType: "character"` contract. Existing saved and imported characters receive safe defaults for gameplay-only fields. Print mode renders every visible sheet section with light, page-friendly styling and hides interactive controls.

The gameplay reducer has focused unit tests, the existing 458 creator assertions remain green, and a browser test exercises damage, temporary-HP absorption, attunement, multiclass presentation, and the 390×844 mobile layout.
