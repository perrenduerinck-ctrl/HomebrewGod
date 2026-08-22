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
  "unused class, feat, Magical Secrets, Mystic Arcanum, and custom choices are reminders",
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
    assert.ok(result.reminders.some((warning) => /prepare 4 more Wizard spells/i.test(warning)));
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
    assert.equal(result.warnings.length, 5);
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
