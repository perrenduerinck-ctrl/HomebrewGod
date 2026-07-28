import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CLASSES
} from "../defaultClasses.js";
import {
  DEFAULT_FEATS
} from "../defaultFeats.js";
import {
  DEFAULT_SUBCLASSES
} from "../defaultSubclasses.js";
import {
  getClassFeaturesThroughLevel
} from "../characterCreator/classMechanics.js";
import {
  buildClassLevelOrder,
  calculateClassProgressionLevel
} from "../characterCreator/classProgression.js";
import {
  decodeFeatChoiceValue,
  encodeFeatChoiceValue,
  normalizeFeatChoiceSelections
} from "../characterCreator/featMechanics.js";
import {
  calculateInventoryLineWeight
} from "../characterCreator/inventoryEquipment.js";
import {
  buildLegacyMigrationReport,
  normalizeCharacterEnvelope
} from "../characterCreator/normalization.js";
import {
  buildCharacterSheetPresentation
} from "../characterCreator/sheetPresentation.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";
import {
  collectCharacterActions,
  createCharacterSheetView
} from "../characterSheet.js";
import {
  calculateSrd2014MulticlassSpellcasting
} from "../characterCreator/spellcasting.js";
import {
  getSubclassFeaturesThroughLevel
} from "../characterCreator/subclassMechanics.js";
import {
  CLASS_LEVEL_FIXTURES,
  FEAT_SELECTION_FIXTURES,
  LEGACY_MIGRATION_FIXTURES,
  MULTICLASS_FIXTURES,
  ROUND_TRIP_FIXTURE,
  SPELLCASTING_COMBINATION_FIXTURES,
  buildSubclassFixtures
} from "./fixtures/character-fixtures.mjs";

test(
  "every class has fixtures for levels 1 through 20",
  () => {
    assert.equal(
      CLASS_LEVEL_FIXTURES.length,
      260
    );

    CLASS_LEVEL_FIXTURES.forEach(
      (fixture) => {
        const classData =
          DEFAULT_CLASSES[
            fixture.classId
          ];

        assert.ok(
          classData,
          fixture.classId
        );
        assert.equal(
          calculateClassProgressionLevel([
            fixture
          ]),
          fixture.level
        );

        const actualFeatures =
          getClassFeaturesThroughLevel(
            classData.featuresByLevel,
            fixture.level
          );
        const expectedCount =
          Object.entries(
            classData.featuresByLevel ||
            {}
          ).filter(([level]) => {
            return (
              Number(level) <=
              fixture.level
            );
          }).flatMap(([, features]) => {
            return features;
          }).length;

        assert.equal(
          actualFeatures.length,
          expectedCount,
          fixture.id
        );
      }
    );
  }
);

test(
  "representative multiclass fixtures preserve totals and level order",
  () => {
    MULTICLASS_FIXTURES.forEach(
      (fixture) => {
        assert.equal(
          calculateClassProgressionLevel(
            fixture.classes
          ),
          fixture.expectedLevel,
          fixture.id
        );
        assert.equal(
          buildClassLevelOrder(
            fixture.classes
          ).length,
          fixture.expectedLevel,
          fixture.id
        );
      }
    );
  }
);

function casterContribution(
  entry
) {
  if (
    entry.progressionType ===
    "full-caster"
  ) {
    return entry.level;
  }

  if (
    entry.progressionType ===
    "half-caster"
  ) {
    return Math.floor(
      entry.level / 2
    );
  }

  if (
    entry.progressionType ===
    "third-caster"
  ) {
    return Math.floor(
      entry.level / 3
    );
  }

  if (
    entry.progressionType ===
    "artificer"
  ) {
    return Math.ceil(
      entry.level / 2
    );
  }

  return 0;
}

test(
  "all full, half, third, Artificer, and Pact Magic pairings have fixtures",
  () => {
    assert.equal(
      SPELLCASTING_COMBINATION_FIXTURES
        .length,
      15
    );

    SPELLCASTING_COMBINATION_FIXTURES
      .forEach((fixture) => {
        const result =
          calculateSrd2014MulticlassSpellcasting(
            fixture.classes
          );
        const expectedCasterLevel =
          fixture.classes.reduce(
            (total, entry) => {
              return (
                total +
                casterContribution(
                  entry
                )
              );
            },
            0
          );
        const expectedPactSources =
          fixture.classes.filter(
            (entry) => {
              return (
                entry.progressionType ===
                "pact-magic"
              );
            }
          ).length;

        assert.equal(
          result.casterLevel,
          expectedCasterLevel,
          fixture.id
        );
        assert.equal(
          result.pactMagic.length,
          expectedPactSources,
          fixture.id
        );
      });
  }
);

test(
  "every bundled subclass produces a level-20 fixture",
  () => {
    const fixtures =
      buildSubclassFixtures(
        DEFAULT_SUBCLASSES
      );

    assert.equal(
      fixtures.length,
      118
    );

    fixtures.forEach((fixture) => {
      const subclass =
        DEFAULT_SUBCLASSES.find(
          (entry) => {
            return (
              entry.classId ===
                fixture.classId &&
              entry.id ===
                fixture.subclassId
            );
          }
        );

      assert.ok(
        subclass,
        fixture.id
      );
      assert.ok(
        getSubclassFeaturesThroughLevel(
          subclass,
          fixture.level
        ).length > 0,
        fixture.id
      );
    });
  }
);

test(
  "feat-selection fixtures round-trip their choices",
  () => {
    FEAT_SELECTION_FIXTURES.forEach(
      (fixture) => {
        assert.ok(
          DEFAULT_FEATS.some(
            (feat) => {
              return (
                feat.id ===
                fixture.featId
              );
            }
          ),
          fixture.featId
        );

        const normalized =
          normalizeFeatChoiceSelections(
            fixture.choices
          );

        Object.entries(normalized)
          .forEach(
            ([choiceId, values]) => {
              values.forEach((value) => {
                const decoded =
                  decodeFeatChoiceValue(
                    encodeFeatChoiceValue(
                      choiceId,
                      value
                    )
                  );

                assert.deepEqual(
                  decoded,
                  {
                    choiceId,
                    value
                  }
                );
              });
            }
          );
      }
    );
  }
);

test(
  "character import and export preserve the complete fixture",
  () => {
    const exported =
      JSON.stringify(
        ROUND_TRIP_FIXTURE
      );
    const imported =
      normalizeCharacterEnvelope(
        JSON.parse(exported)
      );

    assert.deepEqual(
      imported,
      ROUND_TRIP_FIXTURE
    );
    assert.equal(
      calculateInventoryLineWeight(
        imported.equipment.items[0]
      ),
      10
    );
    assert.equal(
      buildCharacterSheetPresentation(
        imported
      ).classLine,
      "Fighter 3 / Wizard 2"
    );
  }
);

test(
  "legacy migration fixtures are detected before normalization",
  () => {
    LEGACY_MIGRATION_FIXTURES
      .forEach((fixture) => {
        const report =
          buildLegacyMigrationReport(
            fixture.value
          );

        assert.equal(
          report.requiresMigration,
          true,
          fixture.id
        );
        assert.ok(
          report.legacyFields
            .includes("name"),
          fixture.id
        );
      });
  }
);

test(
  "save and reload preserve a character without shared references",
  () => {
    const storage = new Map();
    const key =
      "phase20-character";
    storage.set(
      key,
      JSON.stringify(
        ROUND_TRIP_FIXTURE
      )
    );
    const reloaded =
      JSON.parse(
        storage.get(key)
      );

    assert.deepEqual(
      reloaded,
      ROUND_TRIP_FIXTURE
    );
    assert.notEqual(
      reloaded,
      ROUND_TRIP_FIXTURE
    );
    assert.notEqual(
      reloaded.identity,
      ROUND_TRIP_FIXTURE.identity
    );
  }
);

test(
  "playable sheet damage, healing, temporary HP, and death saves are normalized",
  () => {
    const character = {
      combat: {
        maxHp: 30,
        currentHp: 24,
        temporaryHp: 5
      }
    };

    ensureGameplayState(character);
    applyGameplayAction(
      character,
      {
        type: "damage",
        amount: 8
      }
    );

    assert.equal(
      character.combat.temporaryHp,
      0
    );
    assert.equal(
      character.combat.currentHp,
      21
    );

    applyGameplayAction(
      character,
      {
        type: "heal",
        amount: 20
      }
    );
    assert.equal(
      character.combat.currentHp,
      30
    );

    applyGameplayAction(
      character,
      {
        type: "adjust-death-save",
        kind: "failure",
        delta: 9
      }
    );
    assert.equal(
      character.combat
        .deathSaves.failures,
      3
    );
  }
);

test(
  "playable sheet tracks conditions, inspiration, equipment, and attunement safely",
  () => {
    const character = {
      combat: {
        maxHp: 10,
        currentHp: 10
      },
      equipment: {
        items: [
          {
            id: "blade",
            name: "Moon Blade",
            equipped: false
          },
          {
            id: "ring-1",
            name: "Ring One",
            isMagical: true,
            requiresAttunement: true,
            attuned: true
          },
          {
            id: "ring-2",
            name: "Ring Two",
            isMagical: true,
            requiresAttunement: true,
            attuned: true
          },
          {
            id: "ring-3",
            name: "Ring Three",
            isMagical: true,
            requiresAttunement: true,
            attuned: true
          },
          {
            id: "ring-4",
            name: "Ring Four",
            isMagical: true,
            requiresAttunement: true,
            attuned: false
          }
        ]
      }
    };

    applyGameplayAction(
      character,
      {
        type:
          "toggle-inspiration"
      }
    );
    applyGameplayAction(
      character,
      {
        type:
          "toggle-condition",
        condition: "Poisoned"
      }
    );
    applyGameplayAction(
      character,
      {
        type:
          "toggle-item-equipped",
        itemId: "blade"
      }
    );
    const blocked =
      applyGameplayAction(
        character,
        {
          type:
            "toggle-item-attuned",
          itemId: "ring-4"
        }
      );

    assert.equal(
      character.combat.inspiration,
      true
    );
    assert.deepEqual(
      character.combat.conditions,
      ["Poisoned"]
    );
    assert.equal(
      character.equipment
        .items[0].equipped,
      true
    );
    assert.equal(
      blocked.changed,
      false
    );
    assert.match(
      blocked.message,
      /three attuned items/i
    );
  }
);

test(
  "playable sheet actions are grouped, deduplicated, expandable, and resource-linked",
  () => {
    const character = {
      id: "priority-one-actions",
      abilities: {
        scores: {
          str: 14,
          dex: 16,
          int: 18
        }
      },
      combat: {
        proficiencyBonus: 3,
        attacksPerAction: 2
      },
      attacks: [
        {
          id: "moon-blade",
          name: "Moon Blade",
          attackBonus: 6,
          damage: "1d8",
          damageType: "slashing"
        }
      ],
      equipment: {
        items: [
          {
            id: "moon-blade",
            name: "Moon Blade",
            category: "weapon",
            equipped: true,
            proficient: true,
            attackAbility: "dex",
            damageDice: "1d8",
            damageType: "slashing"
          },
          {
            id: "spare-bow",
            name: "Spare Bow",
            category: "weapon",
            equipped: false,
            damageDice: "1d8"
          }
        ]
      },
      features: {
        classFeatures: [
          {
            id: "action-surge",
            name: "Action Surge",
            summary: "Take one additional action.",
            description: "Use this burst of effort on your turn.",
            sourceLabel: "Fighter 2"
          },
          {
            id: "arcane-deflection",
            name: "Arcane Deflection",
            summary: "Raise a quick defense.",
            description: "Use this when an attack hits you.",
            source: "subclass",
            actionEconomy: "reaction"
          },
          {
            id: "improved-critical",
            name: "Improved Critical",
            summary: "Weapon attacks score critical hits more often.",
            actionEconomy: "passive"
          }
        ],
        speciesTraits: [
          {
            id: "fey-step",
            name: "Fey Step",
            actionEconomy: "bonusAction",
            range: "Self",
            summary: "Teleport up to 30 feet."
          }
        ],
        customFeatures: [
          {
            id: "study-field",
            name: "Study the Field",
            activationType: "other",
            activationTime: "1 minute",
            summary: "Study the battlefield."
          }
        ]
      },
      classMechanics: {
        resources: [
          {
            id: "fighter:action-surge",
            name: "Action Surge",
            className: "Fighter",
            currentUses: 1,
            maximumUses: 1,
            recharge: "shortOrLongRest"
          }
        ],
        actions: [
          {
            id: "second-wind",
            name: "Second Wind",
            className: "Fighter",
            actionEconomy: "bonusAction",
            healing: "1d10 + 2"
          }
        ]
      },
      featMechanics: {
        resources: [],
        actions: [
          {
            id: "arcane-shove",
            name: "Arcane Shove",
            featName: "Telekinetic",
            actionEconomy: "bonusAction",
            saveDc: 15,
            target: "One creature"
          }
        ],
        situationalEffects: [
          {
            id: "war-caster-spell",
            effectId: "war-caster-spell",
            featName: "War Caster",
            actionEconomy: "reaction",
            summary: "Cast a spell for an opportunity attack.",
            instructions: "Target only the provoking creature."
          },
          {
            id: "war-caster-passive",
            effectId: "war-caster-passive",
            featName: "War Caster",
            actionEconomy: "passive",
            summary: "Advantage on concentration saves."
          }
        ]
      },
      magic: {
        spellAttacks: [
          {
            id: "fire-bolt",
            name: "Fire Bolt",
            attackBonus: 7,
            damage: "2d10",
            damageType: "fire",
            range: "120 ft.",
            target: "One creature",
            summary: "Hurl a mote of fire.",
            description: "Make a ranged spell attack."
          }
        ]
      }
    };
    const actions =
      collectCharacterActions(
        character,
        3
      );
    const names = actions.map(
      (entry) => entry.name
    );

    assert.equal(
      names.filter((name) => {
        return name === "Moon Blade";
      }).length,
      1
    );
    assert.equal(
      names.includes("Spare Bow"),
      false
    );
    assert.equal(
      names.includes(
        "Improved Critical"
      ),
      false
    );
    assert.equal(
      names.includes(
        "War Caster Passive"
      ),
      false
    );
    assert.deepEqual(
      new Set(
        actions.map((entry) => {
          return entry.section;
        })
      ),
      new Set([
        "action",
        "bonusAction",
        "reaction",
        "other"
      ])
    );

    const actionSurge = actions.find(
      (entry) => {
        return entry.name ===
          "Action Surge";
      }
    );
    assert.equal(
      actionSurge.resource.id,
      "fighter:action-surge"
    );
    assert.equal(
      actionSurge.resource.currentUses,
      1
    );

    const html = createCharacterSheetView()
      .renderCharacterSheetHtml(
        character,
        {
          activeTab: "actions",
          sheetContext: {
            characterId:
              character.id
          }
        }
      );

    assert.match(
      html,
      /<h2>Actions<\/h2>/
    );
    assert.match(
      html,
      /<h2>Bonus Actions<\/h2>/
    );
    assert.match(
      html,
      /<h2>Reactions<\/h2>/
    );
    assert.match(
      html,
      /<h2>Other Actions<\/h2>/
    );
    assert.match(
      html,
      /<details class="hg-sheet-action-description">/
    );
    assert.doesNotMatch(
      html,
      /<details class="hg-sheet-action-description" open/
    );
    assert.match(
      html,
      /data-character-sheet-action="adjust-class-resource"/
    );
  }
);
