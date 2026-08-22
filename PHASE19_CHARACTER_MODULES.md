# Phase 19: Character Creator Modules

Phase 19 splits the character creator into domain modules while preserving the existing public `createCharacterCreator()` API and the current browser behavior.

## Module boundaries

| Concern | Module |
| --- | --- |
| Pure 2014 rules calculations | `characterCreator/rulesMath.js` |
| Character input normalization and legacy migration inspection | `characterCreator/normalization.js` |
| Class-level progression | `characterCreator/classProgression.js` |
| Multiclass prerequisites and grants | `characterCreator/multiclassing.js` |
| Feat choice encoding and ability caps | `characterCreator/featMechanics.js` |
| Class feature and resource unlocks | `characterCreator/classMechanics.js` |
| Subclass feature-level merging | `characterCreator/subclassMechanics.js` |
| Spell slots, Pact Magic, and multiclass spellcasting | `characterCreator/spellcasting.js` |
| Species and background choices | `characterCreator/speciesBackgrounds.js` |
| Inventory normalization and weight calculations | `characterCreator/inventoryEquipment.js` |
| Persistence and lifecycle wiring | `characterCreator/persistence.js` |
| HTML-safe rendering helpers | `characterCreator/rendering.js` |
| Character-sheet header presentation | `characterCreator/sheetPresentation.js` |
| Static character catalogs | `characterCreator/catalogs.js` |
| Character regression suite | `characterCreator/selfTests.js` |

The main `characterCreator.js` file remains the browser-facing orchestrator. It owns mutable UI state and delegates reusable work to these modules.

## Testability contract

The domain modules for rules, normalization, progression, multiclassing, feats, class/subclass mechanics, spellcasting, species/backgrounds, inventory, rendering, and sheet presentation do not access `window` or `document`. They can be imported and tested without constructing the application UI.

`ai-testing/character-modules-self-test.html` verifies every boundary, checks representative 2014 rules, verifies that the main creator integrates the modules, and enforces a 55,000-line ceiling on `characterCreator.js`. The pre-existing character creator regression suite remains the end-to-end compatibility check.

## Size result

Before Phase 19, the creator coordinator was approximately 77,500 lines. After extraction, `characterCreator.js` is below 54,000 lines, safely below the task's 60,000-line warning threshold.
