import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustCanonicalSpellResource,
  buildSpellLibraryFromSources,
  clearMagicalSecretsCompatibilitySources,
  collectLegacySpellSources,
  createMagicalSecretsSpellSource,
  createStableSpellSourceId,
  getCanonicalSpellSources,
  normalizeSpellSource,
  normalizeSpellSources,
  populateSpellSourceCompatibility,
  removeCanonicalSpellSource,
  restoreCanonicalSpellResources,
  SPELL_SELECTION_MODES,
  SPELL_REFERENCE_LIMIT,
  SPELL_SELECTION_GROUP_LIMIT,
  SPELL_SOURCE_LIMIT,
  SPELL_SOURCE_MODEL_VERSION,
  SPELL_SOURCE_TYPES,
  storeMagicalSecretsCompatibilitySource,
  synchronizeCanonicalSpellSources
} from "../characterCreator/spellSources.js";
import {
  renderMagicalSecretsPanels
} from "../characterCreator/magicalSecrets.js";
import {
  evaluateSpellChoices
} from "../characterCreator/spellChoices.js";
import {
  collectCharacterSpells,
  createCharacterSheetView
} from "../characterSheet/index.js";
import {
  getInnateSpellUsageDetails,
  renderInnateSpellCards
} from "../characterCreator/innateSpellPresentation.js";
import {
  DEFAULT_FEATS,
  validateFeatSpellDefinitions
} from "../data/defaultFeats.js";
import {
  DEFAULT_SPELLS
} from "../data/defaultSpells.js";
import {
  DEFAULT_CLASSES
} from "../data/defaultClasses.js";
import {
  createFeatSpellSourceMetadata,
  describeFeatSpellChoiceRestrictions,
  getFeatSpellChoiceLimit,
  getFeatSpellIneligibilityReasons,
  isSpellEligibleForFeatChoice,
  resolveFeatSpellChoiceRestrictions
} from "../characterCreator/featMechanics.js";

test(
  "canonical spell sources expose every required type and selection mode",
  () => {
    assert.deepEqual(
      SPELL_SOURCE_TYPES,
      [
        "class",
        "subclass",
        "magical-secrets",
        "feat",
        "species",
        "background",
        "innate",
        "mystic-arcanum",
        "custom-feature",
        "custom-spell"
      ]
    );
    assert.deepEqual(
      SPELL_SELECTION_MODES,
      [
        "fixed",
        "choose-from-list",
        "choose-from-catalog",
        "class-list",
        "ritual-only"
      ]
    );
  }
);

test(
  "canonical source normalization retains the complete common contract",
  () => {
    const source = normalizeSpellSource({
      sourceType: "feat",
      sourceName: "Magic Initiate",
      sourceFeatureId: "magic-initiate-spells",
      sourceFeatureName: "Magic Initiate Spells",
      classId: "wizard",
      classEntryId: "wizard-1",
      featId: "magic-initiate",
      speciesId: "human",
      subclassId: "evocation",
      selectionMode: "class-list",
      choiceCount: 2,
      selectedSpellIds: [
        "fire-bolt",
        "fire-bolt"
      ],
      fixedSpellIds: ["mage-hand"],
      allowedSpellIds: ["fire-bolt"],
      allowedClassLists: "wizard",
      allowedSchools: ["evocation"],
      minimumSpellLevel: 0,
      maximumSpellLevel: 1,
      spellcastingAbility: "int",
      grantsKnown: true,
      grantsPrepared: false,
      alwaysPrepared: false,
      ritualOnly: false,
      freeCastUses: 1,
      recharge: "long-rest",
      canUseSpellSlots: true,
      resourceId: "magic-initiate-free-cast",
      rulesSource: "SRD 5.1"
    });

    assert.equal(
      source.sourceId,
      "feat:magic-initiate-spells"
    );
    assert.deepEqual(
      source.selectedSpellIds,
      ["fire-bolt"]
    );
    assert.deepEqual(
      source.allowedClassLists,
      ["wizard"]
    );
    assert.equal(source.maximumSpellLevel, 1);
    assert.equal(source.canUseSpellSlots, true);
    assert.equal(
      source.resourceId,
      "magic-initiate-free-cast"
    );
  }
);

test(
  "repeated feature instances receive separate stable source IDs",
  () => {
    const sources = normalizeSpellSources([
      {
        sourceType: "feat",
        sourceName: "Repeatable Magic",
        featId: "repeatable-magic",
        featInstanceId: "asi-slot-4"
      },
      {
        sourceType: "feat",
        sourceName: "Repeatable Magic",
        featId: "repeatable-magic",
        featInstanceId: "asi-slot-8"
      }
    ]);

    assert.equal(
      createStableSpellSourceId(
        sources[0]
      ),
      "feat:asi-slot-4"
    );
    assert.equal(
      sources[1].sourceId,
      "feat:asi-slot-8"
    );
    assert.notEqual(
      sources[0].sourceId,
      sources[1].sourceId
    );
  }
);

test(
  "spell library deduplicates spells while retaining every source",
  () => {
    const sources = [
      {
        sourceId: "class:wizard-1",
        sourceType: "class",
        sourceName: "Wizard",
        selectionMode: "class-list",
        selectedSpellIds: ["misty-step"],
        grantsKnown: true,
        canUseSpellSlots: true
      },
      {
        sourceId: "feat:fey-touched-1",
        sourceType: "feat",
        sourceName: "Fey Touched",
        selectionMode: "fixed",
        fixedSpellIds: ["misty-step"],
        grantsKnown: true,
        freeCastUses: 1,
        recharge: "long-rest",
        canUseSpellSlots: true
      }
    ];
    const library =
      buildSpellLibraryFromSources(sources);

    assert.equal(library.length, 1);
    assert.equal(
      library[0].spellId,
      "misty-step"
    );
    assert.deepEqual(
      library[0].sourceNames,
      ["Wizard", "Fey Touched"]
    );

    const withoutFeat =
      removeCanonicalSpellSource(
        sources,
        "feat:fey-touched-1"
      );
    assert.equal(
      buildSpellLibraryFromSources(
        withoutFeat
      ).length,
      1
    );

    const withoutFinalSource =
      removeCanonicalSpellSource(
        withoutFeat,
        "class:wizard-1"
      );
    assert.equal(
      buildSpellLibraryFromSources(
        withoutFinalSource
      ).length,
      0
    );
  }
);

test(
  "legacy spell containers convert to canonical source-owned records",
  () => {
    const character = {
      magic: {
        knownSpellIds: [
          "fire-bolt",
          "magic-missile"
        ],
        preparedSpellIds: ["shield"],
        classSources: {
          "wizard-1": {
            classEntryId: "wizard-1",
            classId: "wizard",
            className: "Wizard",
            spellListClassId: "wizard",
            spellcastingAbility: "int",
            cantripIds: ["fire-bolt"],
            knownSpellIds: ["magic-missile"],
            preparedSpellIds: ["shield"],
            alwaysPreparedSpellIds: [
              "burning-hands"
            ],
            subclassId: "evocation",
            subclassName: "Evocation"
          }
        },
        featSources: {
          "feat:magic-initiate:asi-4": {
            sourceId:
              "feat:magic-initiate:asi-4",
            featId: "magic-initiate",
            featName: "Magic Initiate",
            spellIds: ["find-familiar"],
            grants: [
              { spellId: "mage-hand" }
            ],
            spellcastingAbility: "int"
          }
        },
        innateSpells: [
          {
            id: "minor-illusion",
            source: "species:high-elf",
            sourceType: "species"
          }
        ],
        customSpells: [
          {
            id: "arcane-pulse",
            name: "Arcane Pulse"
          }
        ]
      }
    };
    const sources =
      collectLegacySpellSources(character);
    const library =
      buildSpellLibraryFromSources(sources);

    assert.ok(
      sources.some((source) => {
        return (
          source.sourceId ===
            "class:wizard-1" &&
          source.selectedSpellIds.includes(
            "magic-missile"
          )
        );
      })
    );
    assert.ok(
      sources.some((source) => {
        return (
          source.sourceType === "subclass" &&
          source.fixedSpellIds.includes(
            "burning-hands"
          )
        );
      })
    );
    assert.ok(
      sources.some((source) => {
        return (
          source.sourceType === "feat" &&
          source.selectedSpellIds.includes(
            "find-familiar"
          ) &&
          source.fixedSpellIds.includes(
            "mage-hand"
          )
        );
      })
    );
    assert.ok(
      sources.some((source) => {
        return source.sourceType === "species";
      })
    );
    assert.ok(
      sources.some((source) => {
        return source.sourceType ===
          "custom-spell";
      })
    );
    assert.equal(library.length, 8);
  }
);

test(
  "synchronization stores model version 3 and canonical sources on the character",
  () => {
    const character = {
      magic: {
        knownSpellIds: ["light"],
        preparedSpellIds: []
      }
    };

    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );

    assert.equal(
      character.magic.spellSourceModelVersion,
      SPELL_SOURCE_MODEL_VERSION
    );
    assert.equal(
      character.magic.spellSources.length,
      1
    );
    assert.deepEqual(
      getCanonicalSpellSources(character)[0]
        .selectedSpellIds,
      ["light"]
    );
  }
);

test(
  "canonical records repopulate required compatibility fields",
  () => {
    const character = {
      magic: {
        classSources: {},
        featSources: {},
        innateSpells: [],
        customSpells: []
      },
      featMechanics: {}
    };
    const sources = normalizeSpellSources([
      {
        sourceId: "class:wizard-1",
        sourceType: "class",
        sourceName: "Wizard",
        classId: "wizard",
        classEntryId: "wizard-1",
        selectedSpellIds: [
          "fire-bolt",
          "shield"
        ],
        grantsKnown: true,
        grantsPrepared: true,
        spellStates: {
          "fire-bolt": {
            cantrip: true,
            known: true
          },
          shield: {
            prepared: true
          }
        }
      },
      {
        sourceId: "feat:fey-touched-1",
        sourceType: "feat",
        sourceName: "Fey Touched",
        featId: "fey-touched",
        fixedSpellIds: ["misty-step"],
        grantsKnown: true,
        canUseSpellSlots: true
      }
    ]);

    populateSpellSourceCompatibility(
      character,
      sources
    );

    assert.deepEqual(
      character.magic.classSources[
        "wizard-1"
      ].cantripIds,
      ["fire-bolt"]
    );
    assert.deepEqual(
      character.magic.classSources[
        "wizard-1"
      ].preparedSpellIds,
      ["shield"]
    );
    assert.deepEqual(
      character.magic.featSources[
        "feat:fey-touched-1"
      ].spellIds,
      ["misty-step"]
    );
    assert.ok(
      character.magic.knownSpellIds.includes(
        "misty-step"
      )
    );
    assert.equal(
      character.magic.knownSpellIds.includes(
        "shield"
      ),
      false
    );
    assert.equal(
      character.magic.preparedSpellIds.includes(
        "fire-bolt"
      ),
      false
    );
    assert.equal(
      character.featMechanics
        .spellcasting[0].sourceId,
      "feat:fey-touched-1"
    );
  }
);

test(
  "unused spell choices preserve valid drafts and identify missing readiness choices",
  () => {
    const spells = new Map([
      ["counterspell", { id: "counterspell", name: "Counterspell", level: 3, classes: ["wizard", "sorcerer", "warlock"] }]
    ]);
    const result = evaluateSpellChoices({
      classSelections: [
        {
          classEntryId: "wizard-main",
          classId: "wizard",
          className: "Wizard",
          spellListClassId: "wizard",
          spellcastingAbility: "int",
          requiresSpellcastingAbility: true,
          preparationMode: "spellbook-prepared",
          maxSpellLevel: 3,
          cantripsKnownLimit: 3,
          spellsKnownLimit: 0,
          preparedLimit: 4,
          cantripIds: [],
          knownSpellIds: [],
          preparedSpellIds: [],
          spellbookSpellIds: []
        },
        {
          classEntryId: "warlock-main",
          classId: "warlock",
          className: "Warlock",
          spellListClassId: "warlock",
          spellcastingAbility: "cha",
          requiresSpellcastingAbility: true,
          maxSpellLevel: 5,
          cantripsKnownLimit: 0,
          spellsKnownLimit: 0,
          preparedLimit: null,
          mysticArcanumLevels: [6],
          mysticArcanumSpellIds: {}
        }
      ],
      spellSources: [
        {
          sourceId: "magical-secrets:bard-main:10",
          sourceType: "magical-secrets",
          sourceName: "Magical Secrets",
          selectionMode: "choose-from-catalog",
          choiceCount: 2,
          selectedSpellIds: ["counterspell"],
          maximumSpellLevel: 5,
          fixedSpellIds: [],
          selectionGroups: []
        },
        {
          sourceId: "feat:magic-initiate",
          sourceType: "feat",
          sourceName: "Magic Initiate",
          selectionMode: "class-list",
          choiceCount: 1,
          selectedSpellIds: [],
          allowedClassLists: ["wizard"],
          fixedSpellIds: [],
          selectionGroups: []
        },
        {
          sourceId: "custom-feature:moon-magic",
          sourceType: "custom-feature",
          sourceName: "Moon Magic",
          selectionMode: "choose-from-catalog",
          choiceCount: 1,
          selectedSpellIds: [],
          fixedSpellIds: [],
          selectionGroups: []
        }
      ],
      resolveSpell: (spellId) => spells.get(spellId) || null
    });

    assert.deepEqual(result.blockingErrors, []);
    assert.ok(result.reminders.some((warning) => /3 cantrips/i.test(warning)));
    assert.equal(result.validDraft, true);
    assert.equal(result.isReady, false);
    assert.ok(result.readinessIssues.some((warning) => /prepare at least one/i.test(warning)));
    assert.ok(result.reminders.some((warning) => /1 Magical Secrets choice/i.test(warning)));
    assert.ok(result.reminders.some((warning) => /Magic Initiate still has 1 spell choice/i.test(warning)));
    assert.ok(result.reminders.some((warning) => /1 Mystic Arcanum choice/i.test(warning)));
    assert.ok(result.reminders.some((warning) => /Moon Magic still has 1 spell choice/i.test(warning)));
  }
);

test(
  "over-selection, invalid restrictions, missing ability, duplicates, and broken fixed references still block",
  () => {
    const spells = new Map([
      ["light", { id: "light", name: "Light", level: 0, classes: ["cleric", "wizard"] }],
      ["mage-hand", { id: "mage-hand", name: "Mage Hand", level: 0, classes: ["wizard"] }],
      ["burning-hands", { id: "burning-hands", name: "Burning Hands", level: 1, classes: ["cleric"] }],
      ["fireball", { id: "fireball", name: "Fireball", level: 3, classes: ["wizard"] }]
    ]);
    const source = {
      sourceId: "feat:broken-magic",
      sourceType: "feat",
      sourceName: "Broken Magic",
      selectionMode: "class-list",
      choiceCount: 1,
      selectedSpellIds: ["light", "fireball", "burning-hands"],
      fixedSpellIds: ["missing-fixed-spell"],
      allowedClassLists: ["cleric"],
      maximumSpellLevel: 0,
      selectionGroups: []
    };
    const result = evaluateSpellChoices({
      classSelections: [
        {
          classEntryId: "wizard-main",
          classId: "wizard",
          className: "Wizard",
          spellListClassId: "wizard",
          spellcastingAbility: "",
          requiresSpellcastingAbility: true,
          maxSpellLevel: 0,
          cantripsKnownLimit: 1,
          spellsKnownLimit: 0,
          preparedLimit: null,
          cantripIds: ["light", "mage-hand", "mage-hand"]
        }
      ],
      spellSources: [source],
      rawSpellSources: [source],
      resolveSpell: (spellId) => spells.get(spellId) || null
    });
    const errors = result.blockingErrors.join("\n");

    assert.match(errors, /duplicate cantrip selection/i);
    assert.match(errors, /cantrips exceed/i);
    assert.match(errors, /needs a spellcasting ability/i);
    assert.match(errors, /more spells selected than allowed/i);
    assert.match(errors, /outside Broken Magic's permitted class list/i);
    assert.match(errors, /above Broken Magic's permitted spell level/i);
    assert.match(errors, /invalid fixed spell reference/i);
  }
);

test("malformed spell-source collections are bounded before persistence", () => {
  const references = Array.from({ length: SPELL_REFERENCE_LIMIT + 50 }, (_, index) => `spell-${index}`);
  const spellStates = Object.fromEntries(references.map((spellId) => [spellId, { known: true }]));
  const selectionGroups = Array.from({ length: SPELL_SELECTION_GROUP_LIMIT + 20 }, (_, index) => ({
    sourceFeatureId: `choice-${index}`,
    allowedSpellIds: references
  }));
  const sources = Array.from({ length: SPELL_SOURCE_LIMIT + 20 }, (_, index) => index === 0
    ? { sourceId: "oversized", selectedSpellIds: references, spellRecords: references, spellStates, selectionGroups }
    : { sourceId: `source-${index}` });
  const normalized = normalizeSpellSources(sources);

  assert.equal(normalized.length, SPELL_SOURCE_LIMIT);
  assert.equal(normalized[0].selectedSpellIds.length, SPELL_REFERENCE_LIMIT);
  assert.equal(normalized[0].spellRecords.length, SPELL_REFERENCE_LIMIT);
  assert.equal(Object.keys(normalized[0].spellStates).length, SPELL_REFERENCE_LIMIT);
  assert.equal(normalized[0].selectionGroups.length, SPELL_SELECTION_GROUP_LIMIT);
});

test(
  "regenerating a species source keeps newly unlocked innate spells",
  () => {
    const character = {
      magic: {
        spellSourceModelVersion:
          SPELL_SOURCE_MODEL_VERSION,
        spellSources: [
          {
            sourceId: "species:dark-elf",
            sourceType: "species",
            sourceName: "Dark Elf",
            fixedSpellIds: [
              "dancing-lights"
            ],
            grantsKnown: true
          }
        ],
        innateSpells: [
          {
            id: "dancing-lights",
            source: "species:dark-elf"
          },
          {
            id: "faerie-fire",
            source: "species:dark-elf"
          },
          {
            id: "darkness",
            source: "species:dark-elf"
          }
        ]
      }
    };

    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );

    assert.deepEqual(
      buildSpellLibraryFromSources(
        character.magic.spellSources
      ).map((spell) => spell.spellId),
      [
        "dancing-lights",
        "faerie-fire",
        "darkness"
      ]
    );
  }
);

test(
  "playable sheet uses canonical sources and does not resurrect a removed source",
  () => {
    const baseSources = [
      {
        sourceId: "class:wizard-1",
        sourceType: "class",
        sourceName: "Wizard",
        selectedSpellIds: ["misty-step"],
        grantsKnown: true,
        canUseSpellSlots: true
      },
      {
        sourceId: "feat:fey-touched-1",
        sourceType: "feat",
        sourceName: "Fey Touched",
        fixedSpellIds: ["misty-step"],
        grantsKnown: true,
        canUseSpellSlots: true
      }
    ];
    const character = {
      magic: {
        spellSourceModelVersion:
          SPELL_SOURCE_MODEL_VERSION,
        spellSources: baseSources,
        knownSpellIds: ["misty-step"],
        featSources: {
          "feat:fey-touched-1": {
            spellIds: ["misty-step"]
          }
        }
      }
    };
    const spells = collectCharacterSpells(
      character
    );

    assert.equal(spells.length, 1);
    assert.deepEqual(
      spells[0].sources,
      ["Wizard", "Fey Touched"]
    );

    character.magic.spellSources =
      removeCanonicalSpellSource(
        baseSources,
        "feat:fey-touched-1"
      );
    const afterFeatRemoval =
      collectCharacterSpells(character);

    assert.equal(afterFeatRemoval.length, 1);
    assert.deepEqual(
      afterFeatRemoval[0].sources,
      ["Wizard"]
    );

    character.magic.spellSources =
      removeCanonicalSpellSource(
        character.magic.spellSources,
        "class:wizard-1"
      );
    assert.deepEqual(
      collectCharacterSpells(character),
      []
    );
  }
);

test(
  "every catalog feat spell definition passes the generic audit",
  () => {
    const result =
      validateFeatSpellDefinitions(
        DEFAULT_FEATS,
        DEFAULT_SPELLS
      );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.warnings.length, 2);
    assert.equal(result.auditedFeatCount, 21);
  }
);

test(
  "special feat spell lists apply their data-driven restrictions",
  () => {
    const spell = (id) => {
      return DEFAULT_SPELLS.find((entry) => {
        return entry.id === id;
      });
    };
    const featChoice = (featId, choiceId) => {
      return DEFAULT_FEATS.find((feat) => {
        return feat.id === featId;
      }).choices.find((choice) => {
        return choice.id === choiceId;
      });
    };
    const runeChoice = featChoice(
      "rune-shaper",
      "rune-spells"
    );
    const moonChoice = featChoice(
      "initiate-of-high-sorcery",
      "moon-spells"
    );
    const alignmentChoice = featChoice(
      "divinely-favored",
      "alignment-spell"
    );

    assert.equal(
      getFeatSpellChoiceLimit(
        runeChoice,
        6
      ),
      3
    );
    assert.equal(
      isSpellEligibleForFeatChoice(
        spell("fog-cloud"),
        runeChoice
      ),
      true
    );
    assert.match(
      getFeatSpellIneligibilityReasons(
        spell("magic-missile"),
        runeChoice
      ).join(" "),
      /allowed spell list/i
    );
    assert.equal(
      isSpellEligibleForFeatChoice(
        spell("false-life"),
        moonChoice,
        {
          selections: {
            moon: ["Nuitari"]
          }
        }
      ),
      true
    );
    assert.equal(
      isSpellEligibleForFeatChoice(
        spell("shield"),
        moonChoice,
        {
          selections: {
            moon: ["Nuitari"]
          }
        }
      ),
      false
    );
    assert.equal(
      isSpellEligibleForFeatChoice(
        spell("false-life"),
        moonChoice
      ),
      false
    );
    assert.deepEqual(
      resolveFeatSpellChoiceRestrictions(
        alignmentChoice,
        { alignment: "Chaotic Evil" }
      ).allowedClassLists,
      ["warlock"]
    );
    assert.equal(
      isSpellEligibleForFeatChoice(
        spell("hellish-rebuke"),
        alignmentChoice,
        { alignment: "Chaotic Evil" }
      ),
      true
    );
    assert.match(
      describeFeatSpellChoiceRestrictions(
        moonChoice,
        {
          selections: {
            moon: ["Solinari"]
          }
        }
      ),
      /Other spells are hidden/i
    );
  }
);

test(
  "feat source metadata separates fixed grants from selected spells",
  () => {
    const feat = DEFAULT_FEATS.find((entry) => {
      return entry.id === "fey-touched";
    });
    const source =
      createFeatSpellSourceMetadata({
        feat,
        sourceId: "wizard-4-asi",
        selections: {
          ability: ["Wisdom"],
          "level-one-spell": ["charm-person"]
        },
        spellGrants: [
          {
            spellId: "misty-step"
          }
        ],
        spellRecords: [
          {
            spellId: "misty-step",
            origin: "grant",
            fixed: true,
            spellcastingAbility: "wis",
            freeCastUses: 1,
            maximumUses: 1,
            recharge: "longRest",
            canUseSpellSlots: true,
            resourceId:
              "wizard-4-asi:spell:misty-step"
          },
          {
            spellId: "charm-person",
            origin: "choice",
            fixed: false,
            spellcastingAbility: "wis",
            freeCastUses: 1,
            maximumUses: 1,
            recharge: "longRest",
            canUseSpellSlots: true,
            resourceId:
              "wizard-4-asi:spell:charm-person"
          }
        ],
        proficiencyBonus: 2
      });

    assert.equal(source.sourceId, "wizard-4-asi");
    assert.equal(source.choiceCount, 1);
    assert.deepEqual(
      source.fixedSpellIds,
      ["misty-step"]
    );
    assert.deepEqual(
      source.selectedSpellIds,
      ["charm-person"]
    );
    assert.deepEqual(
      source.allowedSchools,
      ["divination", "enchantment"]
    );
    assert.equal(
      source.spellcastingAbility,
      "wis"
    );
    assert.equal(source.freeCastUses, 1);
    assert.equal(source.canUseSpellSlots, true);
  }
);

test(
  "multi-spell fixed feat grants and per-spell casting resources survive compatibility sync",
  () => {
    const character = {
      magic: {
        featSources: {
          "feat:wood-elf-magic": {
            sourceId:
              "feat:wood-elf-magic",
            sourceType: "feat",
            featId: "wood-elf-magic",
            featName: "Wood Elf Magic",
            choiceCount: 1,
            selectedSpellIds: [
              "shillelagh"
            ],
            fixedSpellIds: [
              "longstrider",
              "pass-without-trace"
            ],
            spellIds: [
              "shillelagh",
              "longstrider",
              "pass-without-trace"
            ],
            grants: [
              {
                spellIds: [
                  "longstrider",
                  "pass-without-trace"
                ]
              }
            ],
            spellRecords: [
              {
                spellId: "shillelagh",
                origin: "choice",
                fixed: false,
                spellcastingAbility: "wis",
                atWill: true
              },
              {
                spellId: "longstrider",
                origin: "grant",
                fixed: true,
                spellcastingAbility: "wis",
                freeCastUses: 1,
                maximumUses: 1,
                currentUses: 0,
                recharge: "longRest"
              },
              {
                spellId:
                  "pass-without-trace",
                origin: "grant",
                fixed: true,
                spellcastingAbility: "wis",
                freeCastUses: 1,
                maximumUses: 1,
                currentUses: 1,
                recharge: "longRest"
              }
            ]
          }
        }
      },
      featMechanics: {}
    };
    const sources =
      collectLegacySpellSources(character);
    const source = sources.find((entry) => {
      return entry.sourceId ===
        "feat:wood-elf-magic";
    });

    assert.deepEqual(
      source.fixedSpellIds,
      ["longstrider", "pass-without-trace"]
    );
    assert.deepEqual(
      source.selectedSpellIds,
      ["shillelagh"]
    );

    populateSpellSourceCompatibility(
      character,
      sources
    );

    const longstrider =
      character.featMechanics
        .spellcasting.find((record) => {
          return record.spellId ===
            "longstrider";
        });

    assert.equal(longstrider.fixed, true);
    assert.equal(longstrider.freeCastUses, 1);
    assert.equal(longstrider.currentUses, 0);
    assert.equal(
      longstrider.recharge,
      "longRest"
    );
  }
);

test(
  "Magical Secrets source records use Bard casting rules and stable feature IDs",
  () => {
    const source = createMagicalSecretsSpellSource({
      classEntryId: "bard-main",
      sourceFeatureId: "magical-secrets-10",
      selectedSpellIds: ["counterspell", "fireball"],
      maximumSpellLevel: 5
    });

    assert.equal(
      source.sourceId,
      "magical-secrets:bard-main:magical-secrets-10"
    );
    assert.equal(source.sourceType, "magical-secrets");
    assert.equal(source.choiceCount, 2);
    assert.equal(source.maximumSpellLevel, 5);
    assert.equal(source.spellcastingAbility, "cha");
    assert.equal(source.grantsKnown, true);
    assert.equal(source.canUseSpellSlots, true);
    assert.equal(
      source.spellStates.fireball.known,
      true
    );
  }
);

test(
  "normal and Additional Magical Secrets remain separate through save and reload",
  () => {
    const character = {
      magic: {
        classSources: {
          "bard-main": {
            classEntryId: "bard-main",
            classId: "bard",
            className: "Bard",
            spellcastingAbility: "cha",
            knownSpellIds: ["cure-wounds"],
            magicalSecretSpellIds: []
          }
        },
        featSources: {}
      },
      featMechanics: {}
    };

    clearMagicalSecretsCompatibilitySources(character);
    storeMagicalSecretsCompatibilitySource(character, {
      sourceId: "magical-secrets:bard-main:magical-secrets-10",
      sourceFeatureId: "magical-secrets-10",
      classEntryId: "bard-main",
      selectedSpellIds: ["counterspell", "fireball"],
      maximumSpellLevel: 5
    });
    storeMagicalSecretsCompatibilitySource(character, {
      sourceId: "magical-secrets:bard-main:lore-additional-magical-secrets",
      sourceName: "Additional Magical Secrets",
      sourceFeatureId: "lore-additional-magical-secrets",
      classEntryId: "bard-main",
      subclassId: "lore",
      selectedSpellIds: ["spiritual-weapon", "spike-growth"],
      maximumSpellLevel: 3
    });
    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );

    const reloaded = JSON.parse(
      JSON.stringify(character)
    );
    const sources = getCanonicalSpellSources(reloaded);
    const magicalSources = sources.filter((source) => {
      return source.sourceType === "magical-secrets";
    });
    const classSource = sources.find((source) => {
      return source.sourceType === "class";
    });

    assert.equal(magicalSources.length, 2);
    assert.deepEqual(
      magicalSources.map((source) => source.sourceId),
      [
        "magical-secrets:bard-main:magical-secrets-10",
        "magical-secrets:bard-main:lore-additional-magical-secrets"
      ]
    );
    assert.deepEqual(
      classSource.selectedSpellIds,
      ["cure-wounds"]
    );

    const sheetSpells = collectCharacterSpells(reloaded);
    const fireball = sheetSpells.find((spell) => {
      return spell.id === "fireball";
    });

    assert.deepEqual(fireball.sources, ["Magical Secrets"]);
    assert.ok(fireball.statuses.includes("Magical Secrets"));
    assert.equal(
      fireball.statuses.includes("Feat-granted"),
      false
    );
  }
);

test(
  "Lore Additional Magical Secrets is an independent catalog choice feature",
  () => {
    const lore = DEFAULT_CLASSES.bard.subclasses
      .find((subclass) => subclass.id === "lore");
    const feature = lore.featuresByLevel[6]
      .find((entry) => {
        return entry.id ===
          "lore-additional-magical-secrets";
      });

    assert.equal(feature.type, "choice");
    assert.equal(feature.choose, 2);
    assert.equal(
      feature.optionSource,
      "castableSpellsAllClasses"
    );
    assert.equal(
      feature.effects[0].type,
      "magicalSecrets"
    );
    assert.equal(feature.effects[0].additional, true);
  }
);

test(
  "Magical Secrets panel preserves and marks selections invalidated by a lower Bard level",
  () => {
    const html = renderMagicalSecretsPanels(
      [
        {
          id: "magical-secrets-10",
          name: "Magical Secrets",
          classEntryId: "bard-main",
          level: 10,
          effects: [{ type: "magicalSecrets" }]
        }
      ],
      {
        classOptions: [
          {
            classEntryId: "bard-main",
            maxSpellLevel: 2
          }
        ],
        getChoiceKey: () =>
          "bard-main:magical-secrets-10",
        getChoiceCount: () => 2,
        getSelections: () => ["fireball"],
        getOptions: () => [],
        getSourceKey: (entry) =>
          entry.classEntryId,
        getSpellById: () => ({
          id: "fireball",
          name: "Fireball"
        })
      }
    );

    assert.match(html, /Needs attention/);
    assert.match(html, /Fireball/);
    assert.match(html, /selection is preserved/i);
    assert.match(html, /Remaining:<\/b> 2/);
  }
);

test(
  "removing Magical Secrets preserves the same spell when Bard also knows it normally",
  () => {
    const character = {
      magic: { classSources: {}, featSources: {} },
      featMechanics: {}
    };
    const sources = [
      {
        sourceId: "class:bard-main",
        sourceType: "class",
        sourceName: "Bard",
        classId: "bard",
        classEntryId: "bard-main",
        selectedSpellIds: ["fireball"],
        grantsKnown: true,
        spellStates: { fireball: { known: true } }
      },
      createMagicalSecretsSpellSource({
        sourceId: "magical-secrets:bard-main:magical-secrets-10",
        classEntryId: "bard-main",
        sourceFeatureId: "magical-secrets-10",
        selectedSpellIds: ["fireball"],
        maximumSpellLevel: 5
      })
    ];

    character.magic.spellSources = sources;
    character.magic.spellSourceModelVersion =
      SPELL_SOURCE_MODEL_VERSION;
    populateSpellSourceCompatibility(character, sources);
    clearMagicalSecretsCompatibilitySources(character);
    const rebuilt = collectLegacySpellSources(character);

    assert.ok(
      character.magic.classSources["bard-main"]
        .knownSpellIds.includes("fireball")
    );
    assert.equal(
      rebuilt.some((source) => {
        return source.sourceType ===
          "magical-secrets";
      }),
      false
    );
    assert.ok(
      rebuilt.find((source) => {
        return source.sourceType === "class";
      }).selectedSpellIds.includes("fireball")
    );
  }
);

test(
  "subclass, species, background, innate, and Mystic Arcanum sources stay separate",
  () => {
    const character = {
      magic: {
        classSources: {
          "cleric-main": {
            classEntryId: "cleric-main",
            classId: "cleric",
            className: "Cleric",
            subclassId: "life",
            subclassName: "Life Domain",
            spellcastingAbility: "wis",
            alwaysPreparedSpellIds: [
              "bless"
            ]
          },
          "warlock-main": {
            classEntryId: "warlock-main",
            classId: "warlock",
            className: "Warlock",
            spellcastingAbility: "cha",
            mysticArcanumSpellIds: {
              6: "arcane-gate"
            }
          }
        },
        innateSpells: [
          {
            id: "minor-illusion",
            source: "subrace:forest-gnome",
            sourceFeatureName:
              "Natural Illusionist",
            spellcastingAbility: "int",
            atWill: true,
            recharge: "none",
            canUseSpellSlots: false
          },
          {
            id: "darkness",
            source: "species:tiefling",
            sourceFeatureName:
              "Infernal Legacy",
            spellcastingAbility: "cha",
            freeCastUses: 1,
            maximumUses: 1,
            currentUses: 0,
            recharge: "longRest",
            canUseSpellSlots: false
          },
          {
            id: "guidance",
            source: "background:blessed",
            sourceLabel:
              "Blessed Background",
            backgroundId: "blessed",
            spellcastingAbility: "wis",
            atWill: true,
            recharge: "none",
            canUseSpellSlots: false
          }
        ]
      }
    };
    const sources =
      collectLegacySpellSources(character);
    const subclass = sources.find((source) => {
      return source.sourceType === "subclass";
    });
    const species = sources.filter((source) => {
      return source.sourceType === "species";
    });
    const background = sources.find((source) => {
      return source.sourceType === "background";
    });
    const arcanum = sources.find((source) => {
      return source.sourceType ===
        "mystic-arcanum";
    });

    assert.deepEqual(
      subclass.fixedSpellIds,
      ["bless"]
    );
    assert.equal(subclass.alwaysPrepared, true);
    assert.equal(subclass.canUseSpellSlots, true);
    assert.equal(
      subclass.sourceName,
      "Cleric — Life Domain"
    );
    assert.equal(species.length, 2);
    assert.equal(background.backgroundId, "blessed");
    assert.equal(
      background.sourceName,
      "Blessed Background"
    );
    assert.equal(arcanum.freeCastUses, 1);
    assert.equal(arcanum.recharge, "longRest");
    assert.equal(arcanum.canUseSpellSlots, false);
    assert.equal(
      arcanum.spellRecords[0].level,
      6
    );

    const library =
      buildSpellLibraryFromSources(sources);
    const darkness = library.find((spell) => {
      return spell.spellId === "darkness";
    }).sources[0];

    assert.equal(darkness.currentUses, 0);
    assert.equal(darkness.maximumUses, 1);
    assert.equal(darkness.recharge, "longRest");
    assert.equal(darkness.canUseSpellSlots, false);

    populateSpellSourceCompatibility(
      character,
      sources
    );
    const savedDarkness =
      character.magic.innateSpells.find(
        (spell) => spell.id === "darkness"
      );

    assert.equal(savedDarkness.currentUses, 0);
    assert.equal(savedDarkness.freeCastUses, 1);
    assert.equal(savedDarkness.recharge, "longRest");
    assert.equal(
      savedDarkness.canUseSpellSlots,
      false
    );
  }
);

test(
  "innate spell cards show ability, free uses, recharge, and slot permission",
  () => {
    const usage = getInnateSpellUsageDetails({
      freeCastUses: 1,
      maximumUses: 1,
      currentUses: 0,
      recharge: "longRest",
      canUseSpellSlots: false
    });
    const html = renderInnateSpellCards([
      {
        id: "darkness",
        name: "Darkness",
        level: 2,
        source: "species:tiefling",
        spellcastingAbility: "cha",
        freeCastUses: 1,
        maximumUses: 1,
        currentUses: 0,
        recharge: "longRest",
        canUseSpellSlots: false
      }
    ]);

    assert.equal(
      usage.usageLabel,
      "0 / 1 free cast remaining"
    );
    assert.match(html, /species:tiefling/);
    assert.match(html, /CHA/);
    assert.match(html, /0 \/ 1 free cast remaining/);
    assert.match(html, /Long rest/);
    assert.match(
      html,
      /Does not use normal spell slots/
    );
  }
);

test(
  "the final sheet shows Mystic Arcanum as a long-rest resource outside Pact Magic",
  () => {
    const character = {
      name: "Arcanum Tester",
      classProgression: {
        classes: [
          {
            entryId: "warlock-main",
            classEntryId: "warlock-main",
            classId: "warlock",
            className: "Warlock",
            level: 11
          }
        ],
        totalLevel: 11
      },
      magic: {
        classSources: {
          "warlock-main": {
            classEntryId: "warlock-main",
            classId: "warlock",
            className: "Warlock",
            spellcastingAbility: "cha",
            mysticArcanumSpellIds: {
              6: "arcane-gate"
            }
          }
        },
        pactMagic: {
          slots: 3,
          slotLevel: 5
        }
      }
    };

    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );
    const view = createCharacterSheetView();
    const html = view.renderCharacterSheetHtml(
      character,
      { activeTab: "spells" }
    );

    assert.match(
      html,
      /Innate &amp; Mystic Arcanum/
    );
    assert.match(html, /Arcane Gate/);
    assert.match(html, /1 \/ 1 free cast remaining/);
    assert.match(html, /Recharge: long rest/i);
    assert.match(
      html,
      /Separate from normal spell slots/
    );
    assert.match(html, /3 \/ 3 level 5/);
  }
);

test(
  "innate and Mystic Arcanum uses spend, persist, and recharge without touching slots",
  () => {
    const character = {
      magic: {
        classSources: {
          "warlock-main": {
            classEntryId: "warlock-main",
            classId: "warlock",
            className: "Warlock",
            spellcastingAbility: "cha",
            mysticArcanumSpellIds: {
              6: "arcane-gate"
            }
          }
        },
        pactMagic: {
          slots: 3,
          slotLevel: 5
        },
        slotUsage: {
          pact: 2
        }
      }
    };

    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );
    const source = getCanonicalSpellSources(
      character
    ).find((entry) => {
      return entry.sourceType ===
        "mystic-arcanum";
    });

    assert.equal(
      adjustCanonicalSpellResource(
        character,
        source.sourceId,
        "arcane-gate",
        -1
      ),
      true
    );
    let arcanum = getCanonicalSpellSources(
      character
    ).find((entry) => {
      return entry.sourceId === source.sourceId;
    });
    assert.equal(
      arcanum.spellRecords[0].currentUses,
      0
    );
    synchronizeCanonicalSpellSources(
      character,
      { fromCompatibility: true }
    );
    arcanum = getCanonicalSpellSources(
      character
    ).find((entry) => {
      return entry.sourceId === source.sourceId;
    });
    assert.equal(
      arcanum.spellRecords[0].currentUses,
      0
    );
    assert.equal(character.magic.slotUsage.pact, 2);
    assert.equal(
      restoreCanonicalSpellResources(
        character,
        "shortRest"
      ),
      false
    );
    assert.equal(
      restoreCanonicalSpellResources(
        character,
        "longRest"
      ),
      true
    );
    arcanum = getCanonicalSpellSources(
      character
    ).find((entry) => {
      return entry.sourceId === source.sourceId;
    });
    assert.equal(
      arcanum.spellRecords[0].currentUses,
      1
    );
    assert.equal(character.magic.slotUsage.pact, 2);
  }
);


test("prepared-list and always-prepared spells keep legacy access across canonical round trips", () => {
  const character = { magic: { spellSourceModelVersion: 2, classSources: {
    cleric: { classEntryId: "cleric", classId: "cleric", className: "Cleric", preparationMode: "prepared",
      knownSpellIds: [], preparedSpellIds: ["healing-word"], alwaysPreparedSpellIds: ["bless"] },
    wizard: { classEntryId: "wizard", classId: "wizard", className: "Wizard", preparationMode: "spellbook-prepared",
      knownSpellIds: [], preparedSpellIds: ["magic-missile"], spellbookSpellIds: [] }
  } } };
  synchronizeCanonicalSpellSources(character, { fromCompatibility: true });
  for (const record of [character, JSON.parse(JSON.stringify(character))]) {
    synchronizeCanonicalSpellSources(record);
    assert.ok(record.magic.knownSpellIds.includes("healing-word"));
    assert.ok(record.magic.knownSpellIds.includes("bless"));
    assert.equal(record.magic.knownSpellIds.includes("magic-missile"), false, "invalid Wizard preparation must not create spellbook knowledge");
    assert.deepEqual(record.magic.classSources.cleric.knownSpellIds, [], "preparation does not spend learned spell choices");
    assert.deepEqual(record.magic.classSources.wizard.spellbookSpellIds, []);
  }
});


test("spellbook and preparation states survive canonical reconstruction independently", () => {
  const character = { magic: { classSources: { wizard: { preparationMode: "spellbook-prepared" } } } };
  const sources = [{ sourceId: "class:wizard", sourceType: "class", classEntryId: "wizard", classId: "wizard", grantsKnown: true,
    selectedSpellIds: ["magic-missile", "shield"], spellStates: {
      "magic-missile": { known: true, spellbook: true, prepared: true },
      shield: { known: true, spellbook: true, prepared: false }
    } }];
  populateSpellSourceCompatibility(character, sources);
  assert.deepEqual(character.magic.classSources.wizard.spellbookSpellIds, ["magic-missile", "shield"]);
  assert.deepEqual(character.magic.classSources.wizard.preparedSpellIds, ["magic-missile"]);
  assert.deepEqual(character.magic.classSources.wizard.knownSpellIds, []);
  assert.deepEqual(character.magic.preparedSpellIds, ["magic-missile"]);
  const reloaded = JSON.parse(JSON.stringify(character));
  synchronizeCanonicalSpellSources(reloaded, { fromCompatibility: true });
  synchronizeCanonicalSpellSources(reloaded);
  assert.deepEqual(reloaded.magic.classSources.wizard.preparedSpellIds, ["magic-missile"]);
});


test("automatic grants do not spend ordinary prepared choices", () => {
  const result = evaluateSpellChoices({ classSelections: [{
    classEntryId: "cleric", classId: "cleric", className: "Cleric", preparationMode: "prepared",
    spellcastingAbility: "wis", maxSpellLevel: 1, cantripsKnownLimit: 0, spellsKnownLimit: 0,
    preparedLimit: 1, preparedSpellIds: ["bless", "healing-word"], alwaysPreparedSpellIds: ["bless"]
  }], spellSources: [], resolveSpell: (id) => DEFAULT_SPELLS.find((spell) => spell.id === id) });
  assert.deepEqual(result.blockingErrors, []);
  assert.equal(result.remainingChoices.some((choice) => choice.choiceType === "prepared"), false);
});

test("class-source reconstruction preserves simultaneous states independently for each class", () => {
  const character = { magic: { classSources: {} } };
  const sources = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard", "artificer", "fighter", "rogue"].map((classId) => ({
    sourceId: "class:" + classId, sourceType: "class", classEntryId: classId, classId,
    selectedSpellIds: ["shared"], spellStates: { shared: classId === "wizard"
      ? { known: true, spellbook: true, prepared: true } : { known: true, prepared: true } }
  }));
  populateSpellSourceCompatibility(character, sources);
  for (const source of sources) {
    const entry = character.magic.classSources[source.classEntryId];
    assert.deepEqual(entry.preparedSpellIds, ["shared"], source.classId);
    assert.deepEqual(source.classId === "wizard" ? entry.spellbookSpellIds : entry.knownSpellIds, ["shared"], source.classId);
  }
  const remaining = sources.filter((source) => source.classId !== "cleric");
  populateSpellSourceCompatibility(character, remaining);
  assert.deepEqual(character.magic.classSources.cleric.preparedSpellIds, []);
  assert.deepEqual(character.magic.classSources.wizard.preparedSpellIds, ["shared"]);
});

test("class spell summaries distinguish grants, choices, and spellbook preparation", async () => {
  const { renderClassSpellChoices, getManualPreparedSpellIds } = await import("../characterCreator/spellSelectionSummary.js");
  const entry = { classEntryId: "cleric", className: "Cleric", subclassName: "Life Domain", preparationMode: "prepared",
    preparedLimit: 1, preparedSpellIds: ["bless", "healing-word"], alwaysPreparedSpellIds: ["bless"], expandedSpellIds: ["bless", "extra"] };
  assert.deepEqual(getManualPreparedSpellIds(entry), ["healing-word"]);
  const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', '&quot;');
  const html = renderClassSpellChoices([entry], (id) => ({name: id}), escape);
  assert.ok(html.includes("Prepared choices: 1 / 1"));
  assert.match(html, /Automatically prepared from Life Domain/);
  assert.match(html, /do not use your prepared choices/);
  assert.match(html, /extra options/);
  assert.doesNotMatch(renderClassSpellChoices([{...entry, className: "<script>"}], () => null, escape), /<script>/);
});


test("spell origins distinguish shared class choices, automatic grants, and extra options", async () => {
  const {createSpellOriginIndex,renderSpellOriginDetails} = await import("../characterCreator/spellProvenance.js");
  const sources = [
    {sourceId:"class:cleric",sourceType:"class",classEntryId:"cleric",sourceName:"Cleric",selectedSpellIds:["shared"],spellStates:{shared:{prepared:true}}},
    {sourceId:"class:wizard",sourceType:"class",classEntryId:"wizard",sourceName:"Wizard",selectedSpellIds:["shared"],spellStates:{shared:{spellbook:true,prepared:false}}},
    {sourceId:"subclass:life",sourceType:"subclass",sourceName:"Life",fixedSpellIds:["automatic"],alwaysPrepared:true},
    {sourceId:"feat:gift",sourceType:"feat",sourceName:"A <gift>",fixedSpellIds:["shared"]}
  ];
  const origins = createSpellOriginIndex(sources,[{classEntryId:"cleric",className:"Cleric"},{classEntryId:"wizard",className:"Wizard"},{classEntryId:"warlock",className:"Warlock",subclassName:"Fiend",expandedSpellIds:["extra"]}]);
  assert.equal(origins.get("shared").length,3);
  assert.match(origins.get("shared")[0].explanation,/Uses one Cleric prepared choice/);
  assert.match(origins.get("shared")[1].explanation,/Not prepared; uses no prepared choice/);
  assert.match(origins.get("automatic")[0].explanation,/Does not use a manual/);
  assert.equal(origins.get("extra")[0].owned,false);
  assert.match(origins.get("extra")[0].explanation,/not granted automatically/);
  const html = renderSpellOriginDetails(origins.get("shared"), (text) => String(text).replaceAll("<","&lt;"));
  assert.match(html,/Why do I have this spell/);assert.doesNotMatch(html,/<gift>/);
});

test("spell quota errors identify affected spells and the owning class", () => {
  const result=evaluateSpellChoices({classSelections:[{classEntryId:"cleric",classId:"cleric",className:"Cleric",preparationMode:"prepared",maxSpellLevel:1,cantripsKnownLimit:0,spellsKnownLimit:0,preparedLimit:1,preparedSpellIds:["bless","healing-word"]}],spellSources:[],resolveSpell:(id)=>DEFAULT_SPELLS.find((spell)=>spell.id===id)});
  const error=result.blockingErrors.find((error)=>error.includes("prepared spells exceed"));
  assert.ok(error.includes("Cleric"));assert.ok(error.includes("Bless"));assert.ok(error.includes("Healing Word"));assert.ok(error.includes("Unprepare"));
});


test("character sheets explain each source of a shared granted spell", () => {
  const character = {identity:{name:"Origin Test"},magic:{spellSourceModelVersion:3,classSources:{cleric:{className:"Cleric",preparationMode:"prepared",alwaysPreparedSpellIds:["bless"]}},spellSources:[
    {sourceId:"class:cleric",sourceType:"class",sourceName:"Cleric",classEntryId:"cleric",selectedSpellIds:["bless"],spellStates:{bless:{prepared:true}}},
    {sourceId:"subclass:life",sourceType:"subclass",sourceName:"Life",classEntryId:"cleric",fixedSpellIds:["bless"],alwaysPrepared:true}
  ]}};
  const spells=collectCharacterSpells(character);
  assert.equal(spells.filter((spell)=>spell.id==="bless").length,1);
  assert.equal(spells.find((spell)=>spell.id==="bless").origins.length,2);
  const html=createCharacterSheetView().renderCharacterSheetHtml(character,{activeTab:"spells"});
  assert.match(html,/Why do I have this spell/);assert.match(html,/Granted automatically/);assert.match(html,/uses no prepared choice/);
});


test("spell origin explanations use fresh grants and discard replaced subclass grants without mutating data", async () => {
  const {createSpellOriginIndex}=await import("../characterCreator/spellProvenance.js");
  const sources=[{sourceId:"subclass:life",sourceType:"subclass",sourceName:"Life",classEntryId:"cleric",fixedSpellIds:["cure-wounds"],alwaysPrepared:true}];
  const classes=[{classEntryId:"cleric",className:"Cleric",subclassName:"Light",alwaysPreparedSpellIds:["burning-hands"]}];
  const before=JSON.stringify({sources,classes});const origins=createSpellOriginIndex(sources,classes);
  assert.equal(origins.has("cure-wounds"),false);
  assert.equal(origins.get("burning-hands")[0].owned,true);
  assert.match(origins.get("burning-hands")[0].label,/Light/);
  assert.equal(JSON.stringify({sources,classes}),before);
});


test("subclass reference metadata survives conversion and cannot become a free cantrip", async () => {
  const {getSpellCastEligibility} = await import("../spells/spellCastingRules.js");
  const {getCharacterSpellSlotOptions,applyConfirmedSpellCast} = await import("../combat/characterCombatCommands.js");
  const c={magic:{classSources:{cleric:{classId:"cleric",classEntryId:"cleric",className:"Cleric",subclassId:"death",alwaysPreparedSpellIds:["test-unresolved-spell"],subclassSpellRecords:[{id:"test-unresolved-spell",name:"Test Spell",level:1,inlineSubclassSpell:true,requiresSpellDefinition:true}]}}}};
  synchronizeCanonicalSpellSources(c,{fromCompatibility:true,populateCompatibility:true});
  const [record]=collectCharacterSpells(c);
  assert.equal(record.level,1);
  assert.equal(record.requiresSpellDefinition,true);
  assert.equal(getSpellCastEligibility({...record,manualOverride:true}).eligible,false);
  assert.deepEqual(getCharacterSpellSlotOptions(c,record),[]);
  assert.throws(()=>applyConfirmedSpellCast(c,record,{kind:"cantrip"}),/complete spell definition/);
  synchronizeCanonicalSpellSources(c,{fromCompatibility:true,populateCompatibility:true});
  assert.equal(collectCharacterSpells(c)[0].level,1);
});

test("a complete custom definition replaces an inline subclass reference without losing its grant",()=>{
 const fallback={id:"test-unresolved-spell",name:"Test Spell",level:1,requiresSpellDefinition:true};
 const complete={id:"test-unresolved-spell",name:"Test Spell",level:1,castingTime:"1 action",range:"60 feet",damageDice:"2d8",damageType:"poison"};
 for(const spellSources of [
 [{sourceId:"grant",sourceType:"subclass",fixedSpellIds:[fallback.id],alwaysPrepared:true,spellRecords:[fallback]},{sourceId:"custom",sourceType:"custom",selectedSpellIds:[complete.id],spellRecords:[complete]}],
 [{sourceId:"custom",sourceType:"custom",selectedSpellIds:[complete.id],spellRecords:[complete]},{sourceId:"grant",sourceType:"subclass",fixedSpellIds:[fallback.id],alwaysPrepared:true,spellRecords:[fallback]}]
 ]){const [record]=collectCharacterSpells({magic:{spellSourceModelVersion:SPELL_SOURCE_MODEL_VERSION,spellSources}});assert.notEqual(record.requiresSpellDefinition,true);assert.equal(record.range,"60 feet");assert.equal(record.prepared,true);}
});


test("older saved grants recover reference levels and catalog aliases without editing the character",async()=>{
 const {getCharacterSpellSlotOptions}=await import("../combat/characterCombatCommands.js");
 const c={magic:{slots:{2:2},spellSourceModelVersion:SPELL_SOURCE_MODEL_VERSION,spellSources:[{sourceId:'arcana',sourceType:'subclass',classId:'cleric',fixedSpellIds:['magic-aura','ray-of-sickness'],alwaysPrepared:true,grantsPrepared:true,canUseSpellSlots:true}]}};
 const records=collectCharacterSpells(c);const aura=records.find(s=>s.id==='arcanists-magic-aura');assert.equal(aura.level,2);assert.equal(getCharacterSpellSlotOptions(c,aura).length,1);
 const ray=records.find(s=>s.id==='ray-of-sickness');assert.equal(ray.level,1);assert.notEqual(ray.requiresSpellDefinition,true);assert.equal(getCharacterSpellSlotOptions(c,ray).length,1);
});
