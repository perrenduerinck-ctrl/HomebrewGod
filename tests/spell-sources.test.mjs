import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSpellLibraryFromSources,
  collectLegacySpellSources,
  createStableSpellSourceId,
  getCanonicalSpellSources,
  normalizeSpellSource,
  normalizeSpellSources,
  populateSpellSourceCompatibility,
  removeCanonicalSpellSource,
  SPELL_SELECTION_MODES,
  SPELL_SOURCE_MODEL_VERSION,
  SPELL_SOURCE_TYPES,
  synchronizeCanonicalSpellSources
} from "../characterCreator/spellSources.js";
import {
  collectCharacterSpells
} from "../characterSheet.js";

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
