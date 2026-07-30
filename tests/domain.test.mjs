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
  calculateInventoryLineWeight,
  countCharacterAttunedItems,
  getCharacterAttunementLimit
} from "../characterCreator/inventoryEquipment.js";
import {
  buildLegacyMigrationReport,
  normalizeCharacterEnvelope
} from "../characterCreator/normalization.js";
import {
  buildCharacterSheetPresentation
} from "../characterCreator/sheetPresentation.js";
import {
  calculateCharacterCarryingCapacity,
  calculateRuleCarryingCapacity
} from "../characterCreator/rulesMath.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";
import {
  characterHasSpellContent,
  collectCharacterActions,
  collectCharacterFeatures,
  collectCharacterInventory,
  collectCharacterSpells,
  createCharacterSpellCache,
  filterCharacterSpells,
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
      /attunement limit of 3 items/i
    );
  }
);

test(
  "attunement limit defaults, feature increases, overrides, and item validation share one helper",
  () => {
    assert.equal(
      getCharacterAttunementLimit({}),
      3
    );

    const makeItem = (
      id,
      attuned = false,
      requiresAttunement = true
    ) => {
      return {
        id,
        name: `Ring ${id}`,
        isMagical: true,
        requiresAttunement,
        attuned
      };
    };
    const belowLimit = {
      equipment: {
        items: [
          makeItem("a", true),
          makeItem("b", true),
          makeItem("c")
        ]
      }
    };
    const reachesDefault =
      applyGameplayAction(
        belowLimit,
        {
          type:
            "toggle-item-attuned",
          itemId: "c"
        }
      );

    assert.equal(
      reachesDefault.changed,
      true
    );
    assert.equal(
      countCharacterAttunedItems(
        belowLimit
      ),
      3
    );

    belowLimit.equipment.items.push(
      makeItem("d")
    );
    const blockedAtDefault =
      applyGameplayAction(
        belowLimit,
        {
          type:
            "toggle-item-attuned",
          itemId: "d"
        }
      );

    assert.equal(
      blockedAtDefault.changed,
      false
    );
    assert.match(
      blockedAtDefault.message,
      /limit of 3 items/i
    );

    const featureCharacter = {
      features: {
        classFeatures: [
          {
            id: "magic-item-adept",
            name:
              "Magic Item Adept"
          }
        ]
      },
      equipment: {
        items: [
          makeItem("a", true),
          makeItem("b", true),
          makeItem("c", true),
          makeItem("d"),
          makeItem("e")
        ]
      }
    };

    assert.equal(
      getCharacterAttunementLimit(
        featureCharacter
      ),
      4
    );
    assert.equal(
      applyGameplayAction(
        featureCharacter,
        {
          type:
            "toggle-item-attuned",
          itemId: "d"
        }
      ).changed,
      true
    );
    assert.equal(
      countCharacterAttunedItems(
        featureCharacter
      ),
      4
    );

    const blockedAboveDefault =
      applyGameplayAction(
        featureCharacter,
        {
          type:
            "toggle-item-attuned",
          itemId: "e"
        }
      );

    assert.equal(
      blockedAboveDefault.changed,
      false
    );
    assert.match(
      blockedAboveDefault.message,
      /limit of 4 items/i
    );

    const html =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          featureCharacter,
          {
            activeTab:
              "inventory"
          }
        );

    assert.match(
      html,
      /<strong>4 \/ 4<\/strong>/
    );
    assert.match(
      html,
      /The attunement limit is reached\./
    );

    assert.equal(
      getCharacterAttunementLimit({
        classProgression: {
          classes: [
            {
              classId:
                "artificer",
              level: 18
            }
          ]
        }
      }),
      6
    );
    assert.equal(
      getCharacterAttunementLimit({
        classMechanics: {
          effects: [
            {
              type:
                "attunementLimitBonus",
              value: 2
            }
          ]
        }
      }),
      5
    );
    assert.equal(
      getCharacterAttunementLimit({
        equipment: {
          attunementLimitOverride: 5
        }
      }),
      5
    );

    const noRequirement = {
      equipment: {
        items: [
          makeItem(
            "ordinary",
            false,
            false
          )
        ]
      }
    };
    const rejected =
      applyGameplayAction(
        noRequirement,
        {
          type:
            "toggle-item-attuned",
          itemId: "ordinary"
        }
      );

    assert.equal(
      rejected.changed,
      false
    );
    assert.match(
      rejected.message,
      /does not require attunement/i
    );
    assert.equal(
      countCharacterAttunedItems(
        noRequirement
      ),
      0
    );
  }
);

test(
  "playable sheet nests containers, filters inventory, and renders each item once",
  () => {
    const character = {
      id: "priority-four-inventory",
      equipment: {
        items: [
          {
            id: "pack",
            name: "Explorer's Pack",
            category:
              "adventuring-gear",
            quantity: 1,
            weight: 5,
            isContainer: true,
            notes:
              "A weathered field pack."
          },
          {
            id: "pouch",
            name: "Inner Pouch",
            category:
              "adventuring-gear",
            quantity: 1,
            weight: 1,
            isContainer: true,
            containerId: "pack"
          },
          {
            id: "healing-potion",
            name: "Healing Potion",
            category: "consumable",
            quantity: 2,
            weight: 0.5,
            isMagical: true,
            containerId: "pouch",
            notes:
              "Two crimson draughts.",
            description:
              "Drink a potion to regain hit points."
          },
          {
            id: "moon-blade",
            name: "Moon Blade",
            category: "weapon",
            quantity: 1,
            weight: 3,
            equipped: true
          },
          {
            id: "chain-shirt",
            name: "Chain Shirt",
            category: "armor",
            quantity: 1,
            weight: 20
          },
          {
            id: "orphan-map",
            name: "Orphan Map",
            category: "gear",
            quantity: 1,
            weight: 0,
            containerId:
              "missing-case"
          }
        ]
      }
    };
    const inventory =
      collectCharacterInventory(
        character
      );
    const byId = new Map(
      inventory.entries.map(
        (entry) => {
          return [entry.id, entry];
        }
      )
    );

    assert.equal(
      byId.get("healing-potion")
        .parent.id,
      "pouch"
    );
    assert.equal(
      byId.get("pouch").parent.id,
      "pack"
    );
    assert.equal(
      byId.get("healing-potion")
        .lineWeight,
      1
    );
    assert.equal(
      byId.get("orphan-map")
        .parent,
      null
    );

    const searched =
      collectCharacterInventory(
        character,
        { search: "crimson" }
      );
    assert.equal(
      searched.matchedCount,
      1
    );
    assert.deepEqual(
      searched.visibleRoots.map(
        (entry) => entry.id
      ),
      ["pack"]
    );

    const weapons =
      collectCharacterInventory(
        character,
        { filters: ["weapons"] }
      );
    assert.deepEqual(
      weapons.visibleRoots.map(
        (entry) => entry.id
      ),
      ["moon-blade"]
    );

    const view =
      createCharacterSheetView();
    const html =
      view.renderCharacterSheetHtml(
        character,
        {
          activeTab: "inventory",
          sheetContext: {
            characterId:
              character.id
          }
        }
      );
    const screenHtml =
      html.match(
        /<div class="hg-sheet-screen-panel">([\s\S]*)<\/div>\s*<\/div>\s*$/
      )?.[1] || "";

    assert.equal(
      (
        screenHtml.match(
          /data-inventory-item-id="healing-potion"/g
        ) || []
      ).length,
      1
    );
    assert.match(
      screenHtml,
      /data-inventory-container="pack"/
    );
    assert.doesNotMatch(
      screenHtml,
      /data-inventory-container="pack"[^>]*open/
    );
    assert.match(
      screenHtml,
      /data-inventory-location="pouch"/
    );
    assert.match(
      screenHtml,
      /Not in a Container/
    );
    assert.match(
      screenHtml,
      /data-character-sheet-input="inventory-search"/
    );
    assert.match(
      screenHtml,
      /data-inventory-filter="containers"/
    );
    assert.match(
      screenHtml,
      /Notes &amp; description/
    );
    assert.doesNotMatch(
      screenHtml,
      /<details class="hg-sheet-item-details" open/
    );

    const searchedHtml =
      view.renderCharacterSheetHtml(
        character,
        {
          activeTab: "inventory",
          inventorySearch:
            "Healing Potion",
          sheetContext: {
            characterId:
              character.id
          }
        }
      );
    const searchedScreenHtml =
      searchedHtml.match(
        /<div class="hg-sheet-screen-panel">([\s\S]*)<\/div>\s*<\/div>\s*$/
      )?.[1] || "";

    assert.match(
      searchedScreenHtml,
      /data-inventory-container="pack"[^>]*open/
    );
    assert.doesNotMatch(
      searchedScreenHtml,
      /data-inventory-item-id="moon-blade"/
    );

    const blocked =
      applyGameplayAction(
        character,
        {
          type:
            "toggle-item-equipped",
          itemId:
            "healing-potion"
        }
      );
    assert.equal(
      blocked.changed,
      false
    );
    assert.match(
      blocked.message,
      /out of its container/i
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
      feats: [
        {
          id: "war-caster",
          name: "War Caster",
          summary: "Maintain concentration and cast during opportunity attacks."
        }
      ],
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
    assert.equal(
      names.includes("War Caster"),
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

test(
  "playable sheet features stay separated, compact, choice-preserving, and resource-linked",
  () => {
    const character = {
      id: "priority-three-features",
      features: {
        classFeatures: [
          {
            id: "action-surge",
            name: "Action Surge",
            summary:
              "Take one additional action.",
            description:
              "Take one additional action. You can use only one Action Surge on a turn.",
            levelGained: 2,
            sourceLabel: "Fighter"
          },
          {
            id: "arcane-ward",
            name: "Arcane Ward",
            summary:
              "A protective ward absorbs damage.",
            description:
              "A protective ward absorbs damage.",
            level: 2,
            source: "subclass",
            sourceLabel: "School of Abjuration"
          }
        ],
        speciesTraits: [
          {
            id: "fey-ancestry",
            name: "Fey Ancestry",
            summary:
              "Advantage against being charmed.",
            choices: {
              lineage: "High Elf"
            },
            sourceLabel: "Elf"
          }
        ],
        backgroundFeatures: [],
        customFeatures: []
      },
      feats: [
        {
          id: "war-caster",
          name: "War Caster",
          summary:
            "Maintain concentration under pressure.",
          description:
            "You have practiced spellcasting in combat.",
          choices: {
            concentrationTechnique:
              "Arcane focus"
          },
          levelGained: 4,
          sourceLabel: "Level 4 feat"
        }
      ],
      classMechanics: {
        resources: [
          {
            id:
              "fighter:action-surge",
            name: "Action Surge",
            currentUses: 1,
            maximumUses: 1,
            recharge:
              "shortOrLongRest"
          }
        ]
      },
      featMechanics: {
        resources: [
          {
            id: "war-caster-focus",
            name:
              "War Caster Focus",
            featName: "War Caster",
            currentUses: 1,
            maximumUses: 1,
            recharge: "longRest"
          }
        ]
      }
    };
    const groups =
      collectCharacterFeatures(
        character
      );

    assert.deepEqual(
      groups.map((group) => {
        return group.id;
      }),
      [
        "class",
        "subclass",
        "species",
        "background",
        "feats",
        "custom"
      ]
    );

    const actionSurge =
      groups[0].entries[0];
    assert.equal(
      actionSurge.levelGained,
      2
    );
    assert.equal(
      actionSurge.description,
      "You can use only one Action Surge on a turn."
    );
    assert.equal(
      actionSurge.descriptionLabel,
      "Additional details"
    );
    assert.equal(
      actionSurge.resource.id,
      "fighter:action-surge"
    );

    const arcaneWard =
      groups[1].entries[0];
    assert.equal(
      arcaneWard.description,
      ""
    );
    assert.equal(
      groups[2].entries[0]
        .choices,
      "Lineage: High Elf"
    );
    assert.equal(
      groups[4].entries[0]
        .resource.id,
      "war-caster-focus"
    );
    assert.equal(
      groups[4].entries[0]
        .choices,
      "Concentration Technique: Arcane focus"
    );
    assert.equal(
      groups[4].entries[0]
        .source,
      "Level 4 feat"
    );

    const html =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          character,
          {
            activeTab: "features",
            sheetContext: {
              characterId:
                character.id
            }
          }
        );

    assert.match(
      html,
      /data-feature-group="class"/
    );
    assert.match(
      html,
      /data-feature-group="subclass"/
    );
    assert.match(
      html,
      /data-feature-group="species"/
    );
    assert.match(
      html,
      /data-feature-group="feats"/
    );
    assert.doesNotMatch(
      html,
      /data-feature-group="background"/
    );
    assert.doesNotMatch(
      html,
      /data-feature-group="custom"/
    );
    assert.match(
      html,
      /<details class="hg-sheet-feature-description">/
    );
    assert.doesNotMatch(
      html,
      /<details class="hg-sheet-feature-description" open/
    );
    assert.match(
      html,
      /data-character-sheet-action="adjust-class-resource"/
    );
    assert.match(
      html,
      /data-character-sheet-action="adjust-feat-resource"/
    );
    assert.match(
      html,
      /Choices:/
    );
  }
);

test(
  "carrying capacity is shared, size-aware, mechanic-aware, and counts container contents once",
  () => {
    for (
      const [
        size,
        expectedCapacity
      ] of [
        ["medium", 150],
        ["small", 150],
        ["large", 300]
      ]
    ) {
      assert.equal(
        calculateRuleCarryingCapacity({
          strength: 10,
          size
        }).carryingCapacity,
        expectedCapacity
      );
    }

    const powerfulBuildCharacter = {
      identity: {
        size: "medium"
      },
      abilities: {
        scores: {
          str: 10
        }
      },
      features: {
        speciesTraits: [
          {
            id: "powerful-build",
            name: "Powerful Build"
          }
        ]
      }
    };
    const powerfulBuild =
      calculateCharacterCarryingCapacity(
        powerfulBuildCharacter
      );

    assert.equal(
      powerfulBuild.carryingCapacity,
      300
    );
    assert.equal(
      powerfulBuild.effectiveSize,
      "large"
    );
    assert.equal(
      powerfulBuild.powerfulBuild,
      true
    );

    const adjusted =
      calculateCharacterCarryingCapacity({
        identity: {
          size: "medium"
        },
        abilities: {
          scores: {
            str: 10
          }
        },
        mechanics: {
          effects: [
            {
              type:
                "carryingCapacityMultiplier",
              value: 2
            },
            {
              type:
                "carryingCapacityBonus",
              value: 25
            }
          ]
        }
      });

    assert.equal(
      adjusted.carryingCapacity,
      325
    );
    assert.equal(
      adjusted.capacityMultiplier,
      2
    );
    assert.equal(
      adjusted.capacityBonus,
      25
    );

    const containerCharacter = {
      id:
        "priority-five-capacity",
      identity: {
        size: "medium"
      },
      abilities: {
        scores: {
          str: 10
        }
      },
      equipment: {
        items: [
          {
            id: "pack",
            name: "Pack",
            weight: 5,
            quantity: 1,
            isContainer: true
          },
          {
            id: "pouch",
            name: "Pouch",
            weight: 1,
            quantity: 1,
            isContainer: true,
            containerId: "pack"
          },
          {
            id: "rations",
            name: "Rations",
            weight: 0.5,
            quantity: 2,
            containerId: "pouch"
          }
        ]
      }
    };
    const html =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          containerCharacter,
          {
            activeTab:
              "inventory",
            sheetContext: {
              characterId:
                containerCharacter.id
            }
          }
        );
    const screenHtml =
      html.match(
        /<div class="hg-sheet-screen-panel">([\s\S]*)<\/div>\s*<\/div>\s*$/
      )?.[1] || "";

    assert.match(
      screenHtml,
      /<span>Carried Weight<\/span>\s*<strong>7 lb\.<\/strong>/
    );
    assert.match(
      screenHtml,
      /<span>Capacity<\/span>\s*<strong>150 lb\.<\/strong>/
    );
    assert.match(
      screenHtml,
      /<span>Remaining Capacity<\/span>\s*<strong>143 lb\.<\/strong>/
    );
    assert.match(
      screenHtml,
      /<span>Encumbrance<\/span>\s*<strong class="hg-sheet-stat-text">Within capacity<\/strong>/
    );
  }
);

test(
  "playable sheet resolves, groups, labels, searches, and filters complete spell records",
  () => {
    const character = {
      id: "spell-sheet-test",
      identity: {
        name: "Spell Tester"
      },
      classProgression: {
        totalLevel: 17,
        classes: [
          {
            entryId: "wizard-entry",
            classId: "wizard",
            className: "Wizard",
            level: 10,
            subclassName:
              "School of Evocation"
          },
          {
            entryId: "warlock-entry",
            classId: "warlock",
            className: "Warlock",
            level: 7,
            subclassName:
              "The Fiend"
          }
        ]
      },
      featMechanics: {
        spellcasting: [
          {
            id:
              "magic-initiate:spell:healing-word",
            featId: "magic-initiate",
            featName:
              "Magic Initiate",
            spellId:
              "healing-word",
            spellName:
              "Healing Word",
            maximumUses: 1,
            currentUses: 1,
            recharge: "longRest"
          }
        ]
      },
      magic: {
        spellcastingAbility: "int",
        spellSaveDc: 17,
        spellAttackBonus: 9,
        knownSpellIds: [
          "fire-bolt",
          "mage-hand"
        ],
        preparedSpellIds: [
          "magic-missile",
          "shield"
        ],
        slots: {
          1: 4,
          2: 3,
          3: 3
        },
        pactMagic: {
          slots: 2,
          slotLevel: 4
        },
        classSources: {
          "wizard-entry": {
            classEntryId:
              "wizard-entry",
            classId: "wizard",
            className: "Wizard",
            subclassName:
              "School of Evocation",
            spellcastingAbility: "int",
            spellSaveDc: 17,
            spellAttackBonus: 9,
            cantripIds: [
              "fire-bolt",
              "mage-hand"
            ],
            preparedSpellIds: [
              "magic-missile",
              "shield"
            ],
            spellbookSpellIds: [
              "detect-magic",
              "misty-step",
              "web"
            ],
            alwaysPreparedSpellIds: [
              "shield"
            ],
            subclassSpellIds: [
              "shield"
            ]
          },
          "warlock-entry": {
            classEntryId:
              "warlock-entry",
            classId: "warlock",
            className: "Warlock",
            subclassName: "The Fiend",
            spellcastingAbility: "cha",
            mysticArcanumSpellIds: {
              6: "circle-of-death"
            }
          }
        },
        innateSpells: [
          {
            id: "light",
            source:
              "species:high-elf",
            innateSource:
              "species:high-elf",
            innate: true
          }
        ],
        customSpells: [
          {
            id: "testing-aegis",
            name: "Testing Aegis",
            level: 2,
            school: "abjuration",
            castingTime:
              "1 reaction",
            range: "Self",
            components: "V, S",
            duration: "1 round",
            description:
              "A complete custom spell description.",
            source: "Custom test"
          }
        ]
      }
    };
    const spells =
      collectCharacterSpells(
        character
      );
    const byId = new Map(
      spells.map((spell) => {
        return [spell.id, spell];
      })
    );

    assert.equal(
      spells.filter((spell) => {
        return spell.id === "shield";
      }).length,
      1
    );
    assert.equal(
      byId.get("fire-bolt").level,
      0
    );
    assert.equal(
      byId.get("fire-bolt")
        .school,
      "evocation"
    );
    assert.ok(
      byId.get("fire-bolt")
        .description.length > 20
    );
    assert.ok(
      byId.get("fire-bolt")
        .searchText.includes(
          "evocation"
        )
    );
    assert.deepEqual(
      byId.get("shield").statuses,
      [
        "Prepared",
        "Always prepared",
        "Subclass-granted"
      ]
    );
    assert.ok(
      byId.get("detect-magic")
        .statuses.includes(
          "Spellbook"
        )
    );
    assert.ok(
      byId.get("light")
        .statuses.includes(
          "Species-granted"
        )
    );
    assert.ok(
      byId.get("healing-word")
        .statuses.includes(
          "Feat-granted"
        )
    );
    assert.ok(
      byId.get("circle-of-death")
        .statuses.includes(
          "Mystic Arcanum"
        )
    );
    assert.ok(
      byId.get("testing-aegis")
        .statuses.includes(
          "Custom spell"
        )
    );

    assert.deepEqual(
      filterCharacterSpells(
        spells,
        { search: "misty step" }
      ).map((spell) => spell.id),
      ["misty-step"]
    );
    assert.ok(
      filterCharacterSpells(
        spells,
        {
          filters: [
            "concentration"
          ]
        }
      ).some((spell) => {
        return spell.id === "web";
      })
    );
    assert.ok(
      filterCharacterSpells(
        spells,
        {
          filters: [
            "ritual"
          ]
        }
      ).some((spell) => {
        return (
          spell.id ===
          "detect-magic"
        );
      })
    );
    assert.ok(
      filterCharacterSpells(
        spells,
        {
          filters: [
            "bonus-action"
          ]
        }
      ).some((spell) => {
        return (
          spell.id ===
          "misty-step"
        );
      })
    );
    assert.ok(
      filterCharacterSpells(
        spells,
        {
          filters: ["reaction"]
        }
      ).some((spell) => {
        return spell.id === "shield";
      })
    );
    assert.ok(
      filterCharacterSpells(
        spells,
        {
          filters: ["damage"]
        }
      ).some((spell) => {
        return (
          spell.id === "fire-bolt"
        );
      })
    );
    assert.deepEqual(
      filterCharacterSpells(
        spells,
        {
          filters: ["healing"]
        }
      ).map((spell) => spell.id),
      ["healing-word"]
    );

    const spellCache =
      createCharacterSpellCache(
        character
      );

    assert.equal(
      spellCache.count,
      spells.length
    );
    assert.equal(
      spellCache.groupsByLevel[0]
        .some((spell) => {
          return spell.id ===
            "fire-bolt";
        }),
      true
    );

    const html =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          character,
          {
            activeTab: "spells",
            spellSearch:
              "magic missile",
            sheetContext: {
              characterId:
                character.id
            }
          }
        );
    assert.match(
      html,
      /data-spell-level-group="1"/
    );
    assert.match(
      html,
      /data-sheet-spell-id="magic-missile"/
    );
    assert.doesNotMatch(
      html,
      /data-sheet-spell-id="fire-bolt"/
    );
    assert.match(
      html,
      /class="hg-sheet-spell-description"/
    );
    assert.doesNotMatch(
      html,
      /data-character-sheet-spell-description="magic-missile"[^>]*\sopen/
    );
    assert.equal(
      html.includes(
        byId.get("magic-missile")
          .description
      ),
      false
    );
    assert.equal(
      (
        html.match(
          /class="hg-sheet-spell-library"/g
        ) || []
      ).length,
      1
    );
    assert.doesNotMatch(
      html,
      /data-character-sheet-print-area/
    );
    assert.match(
      html,
      /Casting Time/
    );
    assert.match(
      html,
      /Components/
    );
    assert.match(
      html,
      /Concentration/
    );
    assert.match(
      html,
      /data-normal-spell-slot="1"/
    );
    assert.match(
      html,
      /data-pact-source=/
    );
    assert.match(
      html,
      /data-feat-spell-resource=/
    );

    const nonSpellcaster = {
      id: "fighter-only",
      identity: {
        name: "Fighter Only"
      },
      classProgression: {
        totalLevel: 5,
        classes: [
          {
            entryId: "fighter-entry",
            classId: "fighter",
            className: "Fighter",
            level: 5
          }
        ]
      },
      magic: {}
    };
    const nonSpellHtml =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          nonSpellcaster,
          {
            activeTab: "spells",
            sheetContext: {
              characterId:
                nonSpellcaster.id
            }
          }
        );

    assert.equal(
      characterHasSpellContent(
        nonSpellcaster
      ),
      false
    );
    assert.doesNotMatch(
      nonSpellHtml,
      /data-character-sheet-tab="spells"/
    );
    assert.doesNotMatch(
      nonSpellHtml,
      /aria-label="Spell character sheet"/
    );
    assert.match(
      nonSpellHtml,
      /aria-label="Actions"/
    );
  }
);
