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
  persistExistingGameplayCharacter
} from "../characterSheet/persistence.js";
import {
  characterHasSpellContent,
  collectCharacterActions,
  collectCharacterFeatures,
  collectCharacterInventory,
  collectCharacterSpells,
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
  "gameplay persistence updates the original character without duplicates and survives reload",
  async () => {
    const characterId =
      "saved-character-17";
    const remoteRecord = {
      schemaVersion: 12,
      sheetType: "character",
      firestoreDocumentId:
        characterId,
      docId: characterId,
      ownerUid: "owner-1",
      roomCode: "TEST",
      createdAt: {
        seconds: 40
      },
      creator: {
        uid: "creator-1",
        displayName:
          "Original Creator",
        futureCreatorField:
          "keep this"
      },
      builder: {
        status: "finalized",
        finalizedAtMillis: 900,
        lastSavedAtMillis: 1000,
        futureBuilderField:
          "keep this too"
      },
      identity: {
        name:
          "Persistence Hero"
      },
      combat: {
        maxHp: 48,
        currentHp: 40,
        temporaryHp: 3,
        inspiration: false,
        conditions: [],
        futureDefense: {
          ward: 5
        }
      },
      magic: {
        spellSlots: {
          "1": {
            maximum: 4,
            used: 0
          }
        }
      },
      classMechanics: {
        resources: [
          {
            id: "arcane-recovery",
            name:
              "Arcane Recovery",
            maximumUses: 1,
            currentUses: 1,
            futureResourceField:
              "preserve resource metadata"
          }
        ]
      },
      futureTopLevel: {
        enabled: true
      },
      updatedAtMillis: 1000
    };
    const nextRecord =
      structuredClone(
        remoteRecord
      );

    delete nextRecord
      .futureTopLevel;
    delete nextRecord.combat
      .futureDefense;
    delete nextRecord.creator
      .futureCreatorField;
    delete nextRecord.classMechanics
      .resources[0]
      .futureResourceField;
    nextRecord.schemaVersion = 13;
    nextRecord.builder.status =
      "draft";
    nextRecord.builder
      .finalizedAtMillis = null;

    ensureGameplayState(
      nextRecord
    );
    applyGameplayAction(
      nextRecord,
      {
        type: "damage",
        amount: 8
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type: "set-temp-hp",
        amount: 7
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type:
          "toggle-inspiration"
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type:
          "toggle-condition",
        condition: "Blinded"
      }
    );
    nextRecord.magic
      .spellSlots["1"].used = 2;
    nextRecord.classMechanics
      .resources[0]
      .currentUses = 0;

    const store =
      new Map([
        [
          characterId,
          structuredClone(
            remoteRecord
          )
        ]
      ]);
    let updateCalls = 0;
    let addCalls = 0;
    const timestamp = {
      serverTimestamp: true
    };
    const result =
      await persistExistingGameplayCharacter({
        updateDoc:
          async (
            documentRef,
            payload
          ) => {
            updateCalls += 1;
            store.set(
              documentRef.id,
              structuredClone(
                payload
              )
            );
          },
        documentRef: {
          id: characterId
        },
        remoteRecord:
          store.get(characterId),
        nextRecord,
        characterId,
        roomCode: "TEST",
        actorUid: "owner-1",
        roomDmUid: "dm-1",
        expectedRevisionMillis:
          1000,
        savedAtMillis: 2000,
        timestamp
      });

    assert.equal(
      result.writeMethod,
      "updateDoc"
    );
    assert.equal(
      result.characterId,
      characterId
    );
    assert.equal(
      updateCalls,
      1
    );
    assert.equal(
      addCalls,
      0
    );
    assert.equal(
      store.size,
      1
    );

    const reloaded =
      structuredClone(
        store.get(characterId)
      );

    assert.equal(
      reloaded.combat
        .currentHp,
      35
    );
    assert.equal(
      reloaded.combat
        .temporaryHp,
      7
    );
    assert.equal(
      reloaded.combat
        .inspiration,
      true
    );
    assert.deepEqual(
      reloaded.combat
        .conditions,
      ["Blinded"]
    );
    assert.equal(
      reloaded.magic
        .spellSlots["1"].used,
      2
    );
    assert.equal(
      reloaded.classMechanics
        .resources[0]
        .currentUses,
      0
    );
    assert.equal(
      reloaded.builder.status,
      "finalized"
    );
    assert.equal(
      reloaded.builder
        .finalizedAtMillis,
      900
    );
    assert.equal(
      reloaded.builder
        .lastSavedAtMillis,
      2000
    );
    assert.equal(
      reloaded.ownerUid,
      "owner-1"
    );
    assert.equal(
      reloaded.roomCode,
      "TEST"
    );
    assert.deepEqual(
      reloaded.createdAt,
      remoteRecord.createdAt
    );
    assert.equal(
      reloaded.creator
        .futureCreatorField,
      "keep this"
    );
    assert.equal(
      reloaded.combat
        .futureDefense.ward,
      5
    );
    assert.equal(
      reloaded.futureTopLevel
        .enabled,
      true
    );
    assert.equal(
      reloaded.classMechanics
        .resources[0]
        .futureResourceField,
      "preserve resource metadata"
    );
    assert.equal(
      reloaded.schemaVersion,
      13
    );
    assert.equal(
      reloaded.updatedAtMillis,
      2000
    );
    assert.deepEqual(
      reloaded.updatedAt,
      timestamp
    );
  }
);

test(
  "gameplay persistence rejects stale and unauthorized saves while preserving DM access",
  async () => {
    const makeRecord = () => {
      return {
        schemaVersion: 13,
        firestoreDocumentId:
          "access-character",
        ownerUid: "owner-1",
        roomCode: "TEST",
        builder: {
          status: "finalized",
          finalizedAtMillis: 500,
          lastSavedAtMillis: 2000
        },
        updatedAtMillis: 2000
      };
    };
    let updateCalls = 0;
    const updateDoc =
      async () => {
        updateCalls += 1;
      };

    await assert.rejects(
      persistExistingGameplayCharacter({
        updateDoc,
        documentRef: {
          id: "access-character"
        },
        remoteRecord:
          makeRecord(),
        nextRecord:
          makeRecordó]ü¶‰žËkºwµç@€€€±…ÍÍ5•¡…¹¥Ìèì(€€€€€€€É•Í½ÕÉ•Ìèl(€€€€€€€€€ì(€€€€€€€€€€€¥è(€€€€€€€€€€€€€€‰™¥¡Ñ•Èé…Ñ¥½¸µÍÕÉ”ˆ°(€€€€€€€€€€€¹…µ”è€‰Ñ¥½¸MÕÉ”ˆ°(€€€€€€€€€€€ÕÉÉ•¹ÑUÍ•Ìè€Ä°(€€€€€€€€€€€µ…á¥µÕµUÍ•Ìè€Ä°(€€€€€€€€€€€É•¡…É”è(€€€€€€€€€€€€€€‰Í¡½ÉÑ=É1½¹I•ÍÐˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô°(€€€€€™•…Ñ5•¡…¹¥Ìèì(€€€€€€€É•Í½ÕÉ•Ìèl(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰Ý…Èµ…ÍÑ•Èµ™½ÕÌˆ°(€€€€€€€€€€€¹…µ”è(€€€€€€€€€€€€€€‰]…È…ÍÑ•È½ÕÌˆ°(€€€€€€€€€€€™•…Ñ9…µ”è€‰]…È…ÍÑ•Èˆ°(€€€€€€€€€€€ÕÉÉ•¹ÑUÍ•Ìè€Ä°(€€€€€€€€€€€µ…á¥µÕµUÍ•Ìè€Ä°(€€€€€€€€€€€É•¡…É”è€‰±½¹I•ÍÐˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô(€€€ôì(€€€½¹ÍÐÉ½ÕÁÌ€ô(€€€€€½±±•Ñ¡…É…Ñ•É•…ÑÕÉ•Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤ì((€€€…ÍÍ•ÉÐ¹‘••ÁÅÕ…° (€€€€€É½ÕÁÌ¹µ…À ¡É½ÕÀ¤€ôøì(€€€€€€€É•ÑÕÉ¸É½ÕÀ¹¥ì(€€€€€ô¤°(€€€€€l(€€€€€€€€‰±…ÍÌˆ°(€€€€€€€€‰ÍÕ‰±…ÍÌˆ°(€€€€€€€€‰ÍÁ•¥•Ìˆ°(€€€€€€€€‰‰…­É½Õ¹ˆ°(€€€€€€€€‰™•…ÑÌˆ°(€€€€€€€€‰ÕÍÑ½´ˆ(€€€€€t(€€€€¤ì((€€€½¹ÍÐ…Ñ¥½¹MÕÉ”€ô(€€€€€É½ÕÁÍlÁt¹•¹ÑÉ¥•ÍlÁtì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…Ñ¥½¹MÕÉ”¹±•Ù•±…¥¹•°(€€€€€€È(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…Ñ¥½¹MÕÉ”¹‘•ÍÉ¥ÁÑ¥½¸°(€€€€€€‰e½Ô…¸ÕÍ”½¹±ä½¹”Ñ¥½¸MÕÉ”½¸„ÑÕÉ¸¸ˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…Ñ¥½¹MÕÉ”¹‘•ÍÉ¥ÁÑ¥½¹1…‰•°°(€€€€€€‰‘‘¥Ñ¥½¹…°‘•Ñ…¥±Ìˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…Ñ¥½¹MÕÉ”¹É•Í½ÕÉ”¹¥°(€€€€€€‰™¥¡Ñ•Èé…Ñ¥½¸µÍÕÉ”ˆ(€€€€¤ì((€€€½¹ÍÐ…É…¹•]…É€ô(€€€€€É½ÕÁÍlÅt¹•¹ÑÉ¥•ÍlÁtì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…É…¹•]…É¹‘•ÍÉ¥ÁÑ¥½¸°(€€€€€€ˆˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€É½ÕÁÍlÉt¹•¹ÑÉ¥•ÍlÁt(€€€€€€€€¹¡½¥•Ì°(€€€€€€‰1¥¹•…”è!¥ ±˜ˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€É½ÕÁÍlÑt¹•¹ÑÉ¥•ÍlÁt(€€€€€€€€¹É•Í½ÕÉ”¹¥°(€€€€€€‰Ý…Èµ…ÍÑ•Èµ™½ÕÌˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€É½ÕÁÍlÑt¹•¹ÑÉ¥•ÍlÁt(€€€€€€€€¹¡½¥•Ì°(€€€€€€‰½¹•¹ÑÉ…Ñ¥½¸Q•¡¹¥ÅÕ”èÉ…¹”™½ÕÌˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€É½ÕÁÍlÑt¹•¹ÑÉ¥•ÍlÁt(€€€€€€€€¹Í½ÕÉ”°(€€€€€€‰1•Ù•°€Ð™•…Ðˆ(€€€€¤ì((€€€½¹ÍÐ¡Ñµ°€ô(€€€€€É•…Ñ•¡…É…Ñ•ÉM¡••ÑY¥•Ü ¤(€€€€€€€€¹É•¹‘•É¡…É…Ñ•ÉM¡••Ñ!Ñµ° (€€€€€€€€€¡…É…Ñ•È°(€€€€€€€€€ì(€€€€€€€€€€€…Ñ¥Ù•Q…ˆè€‰™•…ÑÕÉ•Ìˆ°(€€€€€€€€€€€Í¡••Ñ½¹Ñ•áÐèì(€€€€€€€€€€€€€¡…É…Ñ•É%è(€€€€€€€€€€€€€€€¡…É…Ñ•È¹¥(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€€¤ì((€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰±…ÍÌˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰ÍÕ‰±…ÍÌˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰ÍÁ•¥•Ìˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰™•…ÑÌˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰‰…­É½Õ¹ˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÑÕÉ”µÉ½ÕÀô‰ÕÍÑ½´ˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€¼ñ‘•Ñ…¥±Ì±…ÍÌô‰¡œµÍ¡••Ðµ™•…ÑÕÉ”µ‘•ÍÉ¥ÁÑ¥½¸ˆø¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¡Ñµ°°(€€€€€€¼ñ‘•Ñ…¥±Ì±…ÍÌô‰¡œµÍ¡••Ðµ™•…ÑÕÉ”µ‘•ÍÉ¥ÁÑ¥½¸ˆ½Á•¸¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ¡…É…Ñ•ÈµÍ¡••Ðµ…Ñ¥½¸ô‰…‘©ÕÍÐµ±…ÍÌµÉ•Í½ÕÉ”ˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ¡…É…Ñ•ÈµÍ¡••Ðµ…Ñ¥½¸ô‰…‘©ÕÍÐµ™•…ÐµÉ•Í½ÕÉ”ˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½¡½¥•Ìè¼(€€€€¤ì(€ô(¤ì()Ñ•ÍÐ (€€‰…ÉÉå¥¹œ…Á…¥Ñä¥ÌÍ¡…É•°Í¥é”µ…Ý…É”°µ•¡…¹¥Œµ…Ý…É”°…¹½Õ¹ÑÌ½¹Ñ…¥¹•È½¹Ñ•¹ÑÌ½¹”ˆ°(€€ ¤€ôøì(€€€™½È€ (€€€€€½¹ÍÐl(€€€€€€€Í¥é”°(€€€€€€€•áÁ•Ñ•‘…Á…¥Ñä(€€€€€t½˜l(€€€€€€€l‰µ•‘¥Õ´ˆ°€ÄÔÁt°(€€€€€€€l‰Íµ…±°ˆ°€ÄÔÁt°(€€€€€€€l‰±…É”ˆ°€ÌÀÁt(€€€€€t(€€€€¤ì(€€€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€€€…±Õ±…Ñ•IÕ±•…ÉÉå¥¹…Á…¥Ñä¡ì(€€€€€€€€€ÍÑÉ•¹Ñ è€ÄÀ°(€€€€€€€€€Í¥é”(€€€€€€€ô¤¹…ÉÉå¥¹…Á…¥Ñä°(€€€€€€€•áÁ•Ñ•‘…Á…¥Ñä(€€€€€€¤ì(€€€ô((€€€½¹ÍÐÁ½Ý•É™Õ±	Õ¥±‘¡…É…Ñ•È€ôì(€€€€€¥‘•¹Ñ¥Ñäèì(€€€€€€€Í¥é”è€‰µ•‘¥Õ´ˆ(€€€€€ô°(€€€€€…‰¥±¥Ñ¥•Ìèì(€€€€€€€Í½É•Ìèì(€€€€€€€€€ÍÑÈè€ÄÀ(€€€€€€€ô(€€€€€ô°(€€€€€™•…ÑÕÉ•Ìèì(€€€€€€€ÍÁ•¥•ÍQÉ…¥ÑÌèl(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰Á½Ý•É™Õ°µ‰Õ¥±ˆ°(€€€€€€€€€€€¹…µ”è€‰A½Ý•É™Õ°	Õ¥±ˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô(€€€ôì(€€€½¹ÍÐÁ½Ý•É™Õ±	Õ¥±€ô(€€€€€…±Õ±…Ñ•¡…É…Ñ•É…ÉÉå¥¹…Á…¥Ñä (€€€€€€€Á½Ý•É™Õ±	Õ¥±‘¡…É…Ñ•È(€€€€€€¤ì((€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€Á½Ý•É™Õ±	Õ¥±¹…ÉÉå¥¹…Á…¥Ñä°(€€€€€€ÌÀÀ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€Á½Ý•É™Õ±	Õ¥±¹•™™•Ñ¥Ù•M¥é”°(€€€€€€‰±…É”ˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€Á½Ý•É™Õ±	Õ¥±¹Á½Ý•É™Õ±	Õ¥±°(€€€€€ÑÉÕ”(€€€€¤ì((€€€½¹ÍÐ…‘©ÕÍÑ•€ô(€€€€€…±Õ±…Ñ•¡…É…Ñ•É…ÉÉå¥¹…Á…¥Ñä¡ì(€€€€€€€¥‘•¹Ñ¥Ñäèì(€€€€€€€€€Í¥é”è€‰µ•‘¥Õ´ˆ(€€€€€€€ô°(€€€€€€€…‰¥±¥Ñ¥•Ìèì(€€€€€€€€€Í½É•Ìèì(€€€€€€€€€€€ÍÑÈè€ÄÀ(€€€€€€€€€ô(€€€€€€€ô°(€€€€€€€µ•¡…¹¥Ìèì(€€€€€€€€€•™™•ÑÌèl(€€€€€€€€€€€ì(€€€€€€€€€€€€€ÑåÁ”è(€€€€€€€€€€€€€€€€‰…ÉÉå¥¹…Á…¥Ñå5Õ±Ñ¥Á±¥•Èˆ°(€€€€€€€€€€€€€Ù…±Õ”è€È(€€€€€€€€€€€ô°(€€€€€€€€€€€ì(€€€€€€€€€€€€€ÑåÁ”è(€€€€€€€€€€€€€€€€‰…ÉÉå¥¹…Á…¥Ñå	½¹ÕÌˆ°(€€€€€€€€€€€€€Ù…±Õ”è€ÈÔ(€€€€€€€€€€€ô(€€€€€€€€€t(€€€€€€€ô(€€€€€ô¤ì((€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…‘©ÕÍÑ•¹…ÉÉå¥¹…Á…¥Ñä°(€€€€€€ÌÈÔ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…‘©ÕÍÑ•¹…Á…¥Ñå5Õ±Ñ¥Á±¥•È°(€€€€€€È(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€…‘©ÕÍÑ•¹…Á…¥Ñå	½¹ÕÌ°(€€€€€€ÈÔ(€€€€¤ì((€€€½¹ÍÐ½¹Ñ…¥¹•É¡…É…Ñ•È€ôì(€€€€€¥è(€€€€€€€€‰ÁÉ¥½É¥Ñäµ™¥Ù”µ…Á…¥Ñäˆ°(€€€€€¥‘•¹Ñ¥Ñäèì(€€€€€€€Í¥é”è€‰µ•‘¥Õ´ˆ(€€€€€ô°(€€€€€…‰¥±¥Ñ¥•Ìèì(€€€€€€€Í½É•Ìèì(€€€€€€€€€ÍÑÈè€ÄÀ(€€€€€€€ô(€€€€€ô°(€€€€€•ÅÕ¥Áµ•¹Ðèì(€€€€€€€¥Ñ•µÌèl(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰Á…¬ˆ°(€€€€€€€€€€€¹…µ”è€‰A…¬ˆ°(€€€€€€€€€€€Ý•¥¡Ðè€Ô°(€€€€€€€€€€€ÅÕ…¹Ñ¥Ñäè€Ä°(€€€€€€€€€€€¥Í½¹Ñ…¥¹•ÈèÑÉÕ”(€€€€€€€€€ô°(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰Á½Õ ˆ°(€€€€€€€€€€€¹…µ”è€‰A½Õ ˆ°(€€€€€€€€€€€Ý•¥¡Ðè€Ä°(€€€€€€€€€€€ÅÕ…¹Ñ¥Ñäè€Ä°(€€€€€€€€€€€¥Í½¹Ñ…¥¹•ÈèÑÉÕ”°(€€€€€€€€€€€½¹Ñ…¥¹•É%è€‰Á…¬ˆ(€€€€€€€€€ô°(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰É…Ñ¥½¹Ìˆ°(€€€€€€€€€€€¹…µ”è€‰I…Ñ¥½¹Ìˆ°(€€€€€€€€€€€Ý•¥¡Ðè€À¸Ô°(€€€€€€€€€€€ÅÕ…¹Ñ¥Ñäè€È°(€€€€€€€€€€€½¹Ñ…¥¹•É%è€‰Á½Õ ˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô(€€€ôì(€€€½¹ÍÐ¡Ñµ°€ô(€€€€€É•…Ñ•¡…É…Ñ•ÉM¡••ÑY¥•Ü ¤(€€€€€€€€¹É•¹‘•É¡…É…Ñ•ÉM¡••Ñ!Ñµ° (€€€€€€€€€½¹Ñ…¥¹•É¡…É…Ñ•È°(€€€€€€€€€ì(€€€€€€€€€€€…Ñ¥Ù•Q…ˆè(€€€€€€€€€€€€€€‰¥¹Ù•¹Ñ½Éäˆ°(€€€€€€€€€€€Í¡••Ñ½¹Ñ•áÐèì(€€€€€€€€€€€€€¡…É…Ñ•É%è(€€€€€€€€€€€€€€€½¹Ñ…¥¹•É¡…É…Ñ•È¹¥(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€€¤ì(€€€½¹ÍÐÍÉ••¹!Ñµ°€ô(€€€€€¡Ñµ°¹µ…Ñ  (€€€€€€€€¼ñ‘¥Ø±…ÍÌô‰¡œµÍ¡••ÐµÍÉ••¸µÁ…¹•°ˆø¡mqÍqMt¨ü¤ñ‘¥Ø±…ÍÌô‰¡œµÍ¡••ÐµÁÉ¥¹Ðµ½¹±äˆ¼(€€€€€€¤ü¹lÅtñð€ˆˆì((€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€¼ñÍÁ…¸ù…ÉÉ¥•]•¥¡Ðñp½ÍÁ…¸ùqÌ¨ñÍÑÉ½¹œøÜ±‰p¸ñp½ÍÑÉ½¹œø¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€¼ñÍÁ…¸ù…Á…¥Ñäñp½ÍÁ…¸ùqÌ¨ñÍÑÉ½¹œøÄÔÀ±‰p¸ñp½ÍÑÉ½¹œø¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€¼ñÍÁ…¸ùI•µ…¥¹¥¹œ…Á…¥Ñäñp½ÍÁ…¸ùqÌ¨ñÍÑÉ½¹œøÄÐÌ±‰p¸ñp½ÍÑÉ½¹œø¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€¼ñÍÁ…¸ù¹Õµ‰É…¹”ñp½ÍÁ…¸ùqÌ¨ñÍÑÉ½¹œ±…ÍÌô‰¡œµÍ¡••ÐµÍÑ…ÐµÑ•áÐˆù]¥Ñ¡¥¸…Á…¥Ñäñp½ÍÑÉ½¹œø¼(€€€€¤ì(€ô(¤ì()Ñ•ÍÐ (€€‰Á±…å…‰±”Í¡••ÐÉ•Í½±Ù•Ì°É½ÕÁÌ°±…‰•±Ì°Í•…É¡•Ì°…¹™¥±Ñ•ÉÌ½µÁ±•Ñ”ÍÁ•±°É•½É‘Ìˆ°(€€ ¤€ôøì(€€€½¹ÍÐ¡…É…Ñ•È€ôì(€€€€€¥è€‰ÍÁ•±°µÍ¡••ÐµÑ•ÍÐˆ°(€€€€€¥‘•¹Ñ¥Ñäèì(€€€€€€€¹…µ”è€‰MÁ•±°Q•ÍÑ•Èˆ(€€€€€ô°(€€€€€±…ÍÍAÉ½É•ÍÍ¥½¸èì(€€€€€€€Ñ½Ñ…±1•Ù•°è€ÄÜ°(€€€€€€€±…ÍÍ•Ìèl(€€€€€€€€€ì(€€€€€€€€€€€•¹ÑÉå%è€‰Ý¥é…Éµ•¹ÑÉäˆ°(€€€€€€€€€€€±…ÍÍ%è€‰Ý¥é…Éˆ°(€€€€€€€€€€€±…ÍÍ9…µ”è€‰]¥é…Éˆ°(€€€€€€€€€€€±•Ù•°è€ÄÀ°(€€€€€€€€€€€ÍÕ‰±…ÍÍ9…µ”è(€€€€€€€€€€€€€€‰M¡½½°½˜Ù½…Ñ¥½¸ˆ(€€€€€€€€€ô°(€€€€€€€€€ì(€€€€€€€€€€€•¹ÑÉå%è€‰Ý…É±½¬µ•¹ÑÉäˆ°(€€€€€€€€€€€±…ÍÍ%è€‰Ý…É±½¬ˆ°(€€€€€€€€€€€±…ÍÍ9…µ”è€‰]…É±½¬ˆ°(€€€€€€€€€€€±•Ù•°è€Ü°(€€€€€€€€€€€ÍÕ‰±…ÍÍ9…µ”è(€€€€€€€€€€€€€€‰Q¡”¥•¹ˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô°(€€€€€™•…Ñ5•¡…¹¥Ìèì(€€€€€€€ÍÁ•±±…ÍÑ¥¹œèl(€€€€€€€€€ì(€€€€€€€€€€€¥è(€€€€€€€€€€€€€€‰µ…¥Œµ¥¹¥Ñ¥…Ñ”éÍÁ•±°é¡•…±¥¹œµÝ½Éˆ°(€€€€€€€€€€€™•…Ñ%è€‰µ…¥Œµ¥¹¥Ñ¥…Ñ”ˆ°(€€€€€€€€€€€™•…Ñ9…µ”è(€€€€€€€€€€€€€€‰5…¥Œ%¹¥Ñ¥…Ñ”ˆ°(€€€€€€€€€€€ÍÁ•±±%è(€€€€€€€€€€€€€€‰¡•…±¥¹œµÝ½Éˆ°(€€€€€€€€€€€ÍÁ•±±9…µ”è(€€€€€€€€€€€€€€‰!•…±¥¹œ]½Éˆ°(€€€€€€€€€€€µ…á¥µÕµUÍ•Ìè€Ä°(€€€€€€€€€€€ÕÉÉ•¹ÑUÍ•Ìè€Ä°(€€€€€€€€€€€É•¡…É”è€‰±½¹I•ÍÐˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô°(€€€€€µ…¥Œèì(€€€€€€€ÍÁ•±±…ÍÑ¥¹‰¥±¥Ñäè€‰¥¹Ðˆ°(€€€€€€€ÍÁ•±±M…Ù•Œè€ÄÜ°(€€€€€€€ÍÁ•±±ÑÑ…­	½¹ÕÌè€ä°(€€€€€€€­¹½Ý¹MÁ•±±%‘Ìèl(€€€€€€€€€€‰™¥É”µ‰½±Ðˆ°(€€€€€€€€€€‰µ…”µ¡…¹ˆ(€€€€€€€t°(€€€€€€€ÁÉ•Á…É•‘MÁ•±±%‘Ìèl(€€€€€€€€€€‰µ…¥Œµµ¥ÍÍ¥±”ˆ°(€€€€€€€€€€‰Í¡¥•±ˆ(€€€€€€€t°(€€€€€€€Í±½ÑÌèì(€€€€€€€€€€Äè€Ð°(€€€€€€€€€€Èè€Ì°(€€€€€€€€€€Ìè€Ì(€€€€€€€ô°(€€€€€€€Á…Ñ5…¥Œèì(€€€€€€€€€Í±½ÑÌè€È°(€€€€€€€€€Í±½Ñ1•Ù•°è€Ð(€€€€€€€ô°(€€€€€€€±…ÍÍM½ÕÉ•Ìèì(€€€€€€€€€€‰Ý¥é…Éµ•¹ÑÉäˆèì(€€€€€€€€€€€±…ÍÍ¹ÑÉå%è(€€€€€€€€€€€€€€‰Ý¥é…Éµ•¹ÑÉäˆ°(€€€€€€€€€€€±…ÍÍ%è€‰Ý¥é…Éˆ°(€€€€€€€€€€€±…ÍÍ9…µ”è€‰]¥é…Éˆ°(€€€€€€€€€€€ÍÕ‰±…ÍÍ9…µ”è(€€€€€€€€€€€€€€‰M¡½½°½˜Ù½…Ñ¥½¸ˆ°(€€€€€€€€€€€ÍÁ•±±…ÍÑ¥¹‰¥±¥Ñäè€‰¥¹Ðˆ°(€€€€€€€€€€€ÍÁ•±±M…Ù•Œè€ÄÜ°(€€€€€€€€€€€ÍÁ•±±ÑÑ…­	½¹ÕÌè€ä°(€€€€€€€€€€€…¹ÑÉ¥Á%‘Ìèl(€€€€€€€€€€€€€€‰™¥É”µ‰½±Ðˆ°(€€€€€€€€€€€€€€‰µ…”µ¡…¹ˆ(€€€€€€€€€€€t°(€€€€€€€€€€€ÁÉ•Á…É•‘MÁ•±±%‘Ìèl(€€€€€€€€€€€€€€‰µ…¥Œµµ¥ÍÍ¥±”ˆ°(€€€€€€€€€€€€€€‰Í¡¥•±ˆ(€€€€€€€€€€€t°(€€€€€€€€€€€ÍÁ•±±‰½½­MÁ•±±%‘Ìèl(€€€€€€€€€€€€€€‰‘•Ñ•Ðµµ…¥Œˆ°(€€€€€€€€€€€€€€‰µ¥ÍÑäµÍÑ•Àˆ°(€€€€€€€€€€€€€€‰Ý•ˆˆ(€€€€€€€€€€€t°(€€€€€€€€€€€…±Ý…åÍAÉ•Á…É•‘MÁ•±±%‘Ìèl(€€€€€€€€€€€€€€‰Í¡¥•±ˆ(€€€€€€€€€€€t°(€€€€€€€€€€€ÍÕ‰±…ÍÍMÁ•±±%‘Ìèl(€€€€€€€€€€€€€€‰Í¡¥•±ˆ(€€€€€€€€€€€t(€€€€€€€€€ô°(€€€€€€€€€€‰Ý…É±½¬µ•¹ÑÉäˆèì(€€€€€€€€€€€±…ÍÍ¹ÑÉå%è(€€€€€€€€€€€€€€‰Ý…É±½¬µ•¹ÑÉäˆ°(€€€€€€€€€€€±…ÍÍ%è€‰Ý…É±½¬ˆ°(€€€€€€€€€€€±…ÍÍ9…µ”è€‰]…É±½¬ˆ°(€€€€€€€€€€€ÍÕ‰±…ÍÍ9…µ”è€‰Q¡”¥•¹ˆ°(€€€€€€€€€€€ÍÁ•±±…ÍÑ¥¹‰¥±¥Ñäè€‰¡„ˆ°(€€€€€€€€€€€µåÍÑ¥É…¹ÕµMÁ•±±%‘Ìèì(€€€€€€€€€€€€€€Øè€‰¥É±”µ½˜µ‘•…Ñ ˆ(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€ô°(€€€€€€€¥¹¹…Ñ•MÁ•±±Ìèl(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰±¥¡Ðˆ°(€€€€€€€€€€€Í½ÕÉ”è(€€€€€€€€€€€€€€‰ÍÁ•¥•Ìé¡¥ µ•±˜ˆ°(€€€€€€€€€€€¥¹¹…Ñ•M½ÕÉ”è(€€€€€€€€€€€€€€‰ÍÁ•¥•Ìé¡¥ µ•±˜ˆ°(€€€€€€€€€€€¥¹¹…Ñ”èÑÉÕ”(€€€€€€€€€ô(€€€€€€€t°(€€€€€€€ÕÍÑ½µMÁ•±±Ìèl(€€€€€€€€€ì(€€€€€€€€€€€¥è€‰Ñ•ÍÑ¥¹œµ…•¥Ìˆ°(€€€€€€€€€€€¹…µ”è€‰Q•ÍÑ¥¹œ•¥Ìˆ°(€€€€€€€€€€€±•Ù•°è€È°(€€€€€€€€€€€Í¡½½°è€‰…‰©ÕÉ…Ñ¥½¸ˆ°(€€€€€€€€€€€…ÍÑ¥¹Q¥µ”è(€€€€€€€€€€€€€€ˆÄÉ•…Ñ¥½¸ˆ°(€€€€€€€€€€€É…¹”è€‰M•±˜ˆ°(€€€€€€€€€€€½µÁ½¹•¹ÑÌè€‰X°Lˆ°(€€€€€€€€€€€‘ÕÉ…Ñ¥½¸è€ˆÄÉ½Õ¹ˆ°(€€€€€€€€€€€‘•ÍÉ¥ÁÑ¥½¸è(€€€€€€€€€€€€€€‰½µÁ±•Ñ”ÕÍÑ½´ÍÁ•±°‘•ÍÉ¥ÁÑ¥½¸¸ˆ°(€€€€€€€€€€€Í½ÕÉ”è€‰ÕÍÑ½´Ñ•ÍÐˆ(€€€€€€€€€ô(€€€€€€€t(€€€€€ô(€€€ôì(€€€½¹ÍÐÍÁ•±±Ì€ô(€€€€€½±±•Ñ¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤ì(€€€½¹ÍÐ‰å%€ô¹•Ü5…À (€€€€€ÍÁ•±±Ì¹µ…À ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸mÍÁ•±°¹¥°ÍÁ•±±tì(€€€€€ô¤(€€€€¤ì((€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€ÍÁ•±±Ì¹™¥±Ñ•È ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸ÍÁ•±°¹¥€ôôô€‰Í¡¥•±ˆì(€€€€€ô¤¹±•¹Ñ °(€€€€€€Ä(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€‰å%¹•Ð ‰™¥É”µ‰½±Ðˆ¤¹±•Ù•°°(€€€€€€À(€€€€¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€‰å%¹•Ð ‰™¥É”µ‰½±Ðˆ¤(€€€€€€€€¹Í¡½½°°(€€€€€€‰•Ù½…Ñ¥½¸ˆ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰™¥É”µ‰½±Ðˆ¤(€€€€€€€€¹‘•ÍÉ¥ÁÑ¥½¸¹±•¹Ñ €ø€ÈÀ(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘••ÁÅÕ…° (€€€€€‰å%¹•Ð ‰Í¡¥•±ˆ¤¹ÍÑ…ÑÕÍ•Ì°(€€€€€l(€€€€€€€€‰AÉ•Á…É•ˆ°(€€€€€€€€‰±Ý…åÌÁÉ•Á…É•ˆ°(€€€€€€€€‰MÕ‰±…ÍÌµÉ…¹Ñ•ˆ(€€€€€t(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰‘•Ñ•Ðµµ…¥Œˆ¤(€€€€€€€€¹ÍÑ…ÑÕÍ•Ì¹¥¹±Õ‘•Ì (€€€€€€€€€€‰MÁ•±±‰½½¬ˆ(€€€€€€€€¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰±¥¡Ðˆ¤(€€€€€€€€¹ÍÑ…ÑÕÍ•Ì¹¥¹±Õ‘•Ì (€€€€€€€€€€‰MÁ•¥•ÌµÉ…¹Ñ•ˆ(€€€€€€€€¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰¡•…±¥¹œµÝ½Éˆ¤(€€€€€€€€¹ÍÑ…ÑÕÍ•Ì¹¥¹±Õ‘•Ì (€€€€€€€€€€‰•…ÐµÉ…¹Ñ•ˆ(€€€€€€€€¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰¥É±”µ½˜µ‘•…Ñ ˆ¤(€€€€€€€€¹ÍÑ…ÑÕÍ•Ì¹¥¹±Õ‘•Ì (€€€€€€€€€€‰5åÍÑ¥ŒÉ…¹Õ´ˆ(€€€€€€€€¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€‰å%¹•Ð ‰Ñ•ÍÑ¥¹œµ…•¥Ìˆ¤(€€€€€€€€¹ÍÑ…ÑÕÍ•Ì¹¥¹±Õ‘•Ì (€€€€€€€€€€‰ÕÍÑ½´ÍÁ•±°ˆ(€€€€€€€€¤(€€€€¤ì((€€€…ÍÍ•ÉÐ¹‘••ÁÅÕ…° (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ìÍ•…É è€‰µ¥ÍÑäÍÑ•Àˆô(€€€€€€¤¹µ…À ¡ÍÁ•±°¤€ôøÍÁ•±°¹¥¤°(€€€€€l‰µ¥ÍÑäµÍÑ•À‰t(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl(€€€€€€€€€€€€‰½¹•¹ÑÉ…Ñ¥½¸ˆ(€€€€€€€€€t(€€€€€€€ô(€€€€€€¤¹Í½µ” ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸ÍÁ•±°¹¥€ôôô€‰Ý•ˆˆì(€€€€€ô¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl(€€€€€€€€€€€€‰É¥ÑÕ…°ˆ(€€€€€€€€€t(€€€€€€€ô(€€€€€€¤¹Í½µ” ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€ÍÁ•±°¹¥€ôôô(€€€€€€€€€€‰‘•Ñ•Ðµµ…¥Œˆ(€€€€€€€€¤ì(€€€€€ô¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl(€€€€€€€€€€€€‰‰½¹ÕÌµ…Ñ¥½¸ˆ(€€€€€€€€€t(€€€€€€€ô(€€€€€€¤¹Í½µ” ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€ÍÁ•±°¹¥€ôôô(€€€€€€€€€€‰µ¥ÍÑäµÍÑ•Àˆ(€€€€€€€€¤ì(€€€€€ô¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl‰É•…Ñ¥½¸‰t(€€€€€€€ô(€€€€€€¤¹Í½µ” ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸ÍÁ•±°¹¥€ôôô€‰Í¡¥•±ˆì(€€€€€ô¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹½¬ (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl‰‘…µ…”‰t(€€€€€€€ô(€€€€€€¤¹Í½µ” ¡ÍÁ•±°¤€ôøì(€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€ÍÁ•±°¹¥€ôôô€‰™¥É”µ‰½±Ðˆ(€€€€€€€€¤ì(€€€€€ô¤(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘••ÁÅÕ…° (€€€€€™¥±Ñ•É¡…É…Ñ•ÉMÁ•±±Ì (€€€€€€€ÍÁ•±±Ì°(€€€€€€€ì(€€€€€€€€€™¥±Ñ•ÉÌèl‰¡•…±¥¹œ‰t(€€€€€€€ô(€€€€€€¤¹µ…À ¡ÍÁ•±°¤€ôøÍÁ•±°¹¥¤°(€€€€€l‰¡•…±¥¹œµÝ½É‰t(€€€€¤ì((€€€½¹ÍÐ¡Ñµ°€ô(€€€€€É•…Ñ•¡…É…Ñ•ÉM¡••ÑY¥•Ü ¤(€€€€€€€€¹É•¹‘•É¡…É…Ñ•ÉM¡••Ñ!Ñµ° (€€€€€€€€€¡…É…Ñ•È°(€€€€€€€€€ì(€€€€€€€€€€€…Ñ¥Ù•Q…ˆè€‰ÍÁ•±±Ìˆ°(€€€€€€€€€€€ÍÁ•±±M•…É è(€€€€€€€€€€€€€€‰µ…¥Œµ¥ÍÍ¥±”ˆ°(€€€€€€€€€€€Í¡••Ñ½¹Ñ•áÐèì(€€€€€€€€€€€€€¡…É…Ñ•É%è(€€€€€€€€€€€€€€€¡…É…Ñ•È¹¥(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€€¤ì(€€€½¹ÍÐÍÉ••¹!Ñµ°€ô(€€€€€¡Ñµ°¹µ…Ñ  (€€€€€€€€¼ñ‘¥Ø±…ÍÌô‰¡œµÍ¡••ÐµÍÉ••¸µÁ…¹•°ˆø¡mqÍqMt¨ü¤ñ‘¥Ø±…ÍÌô‰¡œµÍ¡••ÐµÁÉ¥¹Ðµ½¹±äˆ¼(€€€€€€¤ü¹lÅtñð€ˆˆì((€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€½‘…Ñ„µÍÁ•±°µ±•Ù•°µÉ½ÕÀôˆÄˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€½‘…Ñ„µÍ¡••ÐµÍÁ•±°µ¥ô‰µ…¥Œµµ¥ÍÍ¥±”ˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€ÍÉ••¹!Ñµ°°(€€€€€€½‘…Ñ„µÍ¡••ÐµÍÁ•±°µ¥ô‰™¥É”µ‰½±Ðˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€¼ñ‘•Ñ…¥±Ì±…ÍÌô‰¡œµÍ¡••ÐµÍÁ•±°µ‘•ÍÉ¥ÁÑ¥½¸ˆø¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¡Ñµ°°(€€€€€€¼ñ‘•Ñ…¥±Ì±…ÍÌô‰¡œµÍ¡••ÐµÍÁ•±°µ‘•ÍÉ¥ÁÑ¥½¸ˆ½Á•¸¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½…ÍÑ¥¹œQ¥µ”¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½½µÁ½¹•¹ÑÌ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½½¹•¹ÑÉ…Ñ¥½¸¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ¹½Éµ…°µÍÁ•±°µÍ±½ÐôˆÄˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µÁ…ÐµÍ½ÕÉ”ô¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¡Ñµ°°(€€€€€€½‘…Ñ„µ™•…ÐµÍÁ•±°µÉ•Í½ÕÉ”ô¼(€€€€¤ì((€€€½¹ÍÐ¹½¹MÁ•±±…ÍÑ•È€ôì(€€€€€¥è€‰™¥¡Ñ•Èµ½¹±äˆ°(€€€€€¥‘•¹Ñ¥Ñäèì(€€€€€€€¹…µ”è€‰¥¡Ñ•È=¹±äˆ(€€€€€ô°(€€€€€±…ÍÍAÉ½É•ÍÍ¥½¸èì(€€€€€€€Ñ½Ñ…±1•Ù•°è€Ô°(€€€€€€€±…ÍÍ•Ìèl(€€€€€€€€€ì(€€€€€€€€€€€•¹ÑÉå%è€‰™¥¡Ñ•Èµ•¹ÑÉäˆ°(€€€€€€€€€€€±…ÍÍ%è€‰™¥¡Ñ•Èˆ°(€€€€€€€€€€€±…ÍÍ9…µ”è€‰¥¡Ñ•Èˆ°(€€€€€€€€€€€±•Ù•°è€Ô(€€€€€€€€€ô(€€€€€€€t(€€€€€ô°(€€€€€µ…¥Œèíô(€€€ôì(€€€½¹ÍÐ¹½¹MÁ•±±!Ñµ°€ô(€€€€€É•…Ñ•¡…É…Ñ•ÉM¡••ÑY¥•Ü ¤(€€€€€€€€¹É•¹‘•É¡…É…Ñ•ÉM¡••Ñ!Ñµ° (€€€€€€€€€¹½¹MÁ•±±…ÍÑ•È°(€€€€€€€€€ì(€€€€€€€€€€€…Ñ¥Ù•Q…ˆè€‰ÍÁ•±±Ìˆ°(€€€€€€€€€€€Í¡••Ñ½¹Ñ•áÐèì(€€€€€€€€€€€€€¡…É…Ñ•É%è(€€€€€€€€€€€€€€€¹½¹MÁ•±±…ÍÑ•È¹¥(€€€€€€€€€€€ô(€€€€€€€€€ô(€€€€€€€€¤ì((€€€…ÍÍ•ÉÐ¹•ÅÕ…° (€€€€€¡…É…Ñ•É!…ÍMÁ•±±½¹Ñ•¹Ð (€€€€€€€¹½¹MÁ•±±…ÍÑ•È(€€€€€€¤°(€€€€€™…±Í”(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¹½¹MÁ•±±!Ñµ°°(€€€€€€½‘…Ñ„µ¡…É…Ñ•ÈµÍ¡••ÐµÑ…ˆô‰ÍÁ•±±Ìˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ  (€€€€€¹½¹MÁ•±±!Ñµ°°(€€€€€€½…É¥„µ±…‰•°ô‰MÁ•±°¡…É…Ñ•ÈÍ¡••Ðˆ¼(€€€€¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ  (€€€€€¹½¹MÁ•±±!Ñµ°°(€€€€€€½…É¥„µ±…‰•°ô‰Ñ¥½¹Ìˆ¼(€€€€¤ì(€ô(¤ì(