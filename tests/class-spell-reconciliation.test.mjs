import test from "node:test";
import assert from "node:assert/strict";
import {
  reconcileClassOwnedSpellSources
} from "../characterCreator/classSpellReconciliation.js";

function makeCharacter() {
  return {
    classProgression: {
      totalLevel: 4,
      classes: [
        {
          entryId: "paladin-main",
          classId: "paladin",
          className: "Paladin",
          level: 2
        },
        {
          entryId: "cleric-main",
          classId: "cleric",
          className: "Cleric",
          level: 2
        }
      ]
    },
    magic: {
      knownSpellIds: [
        "heroism",
        "bless",
        "misty-step",
        "legacy-unknown"
      ],
      preparedSpellIds: [
        "heroism",
        "bless",
        "misty-step",
        "legacy-unknown"
      ],
      unassignedKnownSpellIds: ["legacy-unknown"],
      unassignedPreparedSpellIds: ["legacy-unknown"],
      classSources: {
        "paladin-main": {
          classEntryId: "paladin-main",
          classId: "paladin",
          preparedSpellIds: ["heroism"]
        },
        "cleric-main": {
          classEntryId: "cleric-main",
          classId: "cleric",
          preparedSpellIds: ["bless"]
        }
      },
      featSources: {
        "feat:fey-touched": {
          sourceType: "feat",
          selectedSpellIds: ["misty-step"]
        }
      },
      spellSources: [
        {
          sourceId: "class:paladin-main",
          sourceType: "class",
          classEntryId: "paladin-main",
          classId: "paladin",
          selectedSpellIds: ["heroism"]
        },
        {
          sourceId: "class:cleric-main",
          sourceType: "class",
          classEntryId: "cleric-main",
          classId: "cleric",
          selectedSpellIds: ["bless"]
        },
        {
          sourceId: "feat:fey-touched",
          sourceType: "feat",
          selectedSpellIds: ["misty-step"]
        },
        {
          sourceId: "class:legacy-spellcasting",
          sourceType: "class",
          selectedSpellIds: ["legacy-unknown"]
        }
      ],
      customSpells: [
        {
          id: "custom-oath-spell",
          name: "Custom Oath Spell",
          classEntryId: "paladin-main",
          known: true,
          prepared: true
        }
      ]
    }
  };
}

test("switching Paladin and Cleric to Fighter deactivates only removed-class spells", () => {
  const character = makeCharacter();
  character.classProgression.classes = [
    {
      entryId: "fighter-main",
      classId: "fighter",
      className: "Fighter",
      level: 4
    }
  ];

  const result = reconcileClassOwnedSpellSources(character);

  assert.equal(result.changed, true);
  assert.deepEqual(
    [...result.deactivatedSpellIds].sort(),
    ["bless", "heroism"].sort()
  );
  assert.deepEqual(
    Object.keys(character.magic.classSources),
    []
  );
  assert.deepEqual(character.magic.knownSpellIds, [
    "misty-step",
    "legacy-unknown"
  ]);
  assert.deepEqual(character.magic.preparedSpellIds, [
    "misty-step",
    "legacy-unknown"
  ]);
  assert.equal(
    character.magic.customSpells[0].known,
    false
  );
  assert.equal(
    character.magic.customSpells[0].prepared,
    false
  );
  assert.ok(
    character.builder.archivedClassSpellSources.length >= 2
  );
  assert.ok(
    character.builder.validation
      .classChangeReviewWarnings[0]
      .includes("unknown class ownership")
  );
});

test("retaining one spellcasting class preserves its owned state", () => {
  const character = makeCharacter();
  character.classProgression.classes = [
    {
      entryId: "paladin-main",
      classId: "paladin",
      className: "Paladin",
      level: 4
    }
  ];

  const result = reconcileClassOwnedSpellSources(character);

  assert.deepEqual(
    Object.keys(character.magic.classSources),
    ["paladin-main"]
  );
  assert.ok(character.magic.preparedSpellIds.includes("heroism"));
  assert.equal(character.magic.preparedSpellIds.includes("bless"), false);
  assert.ok(result.deactivatedSpellIds.includes("bless"));
});

test("legacy independent spell sources preserve a shared spell when its class is removed", () => {
  const character = makeCharacter();
  character.magic.speciesSources = {
    "species:aasimar": {
      sourceType: "species",
      fixedSpellIds: ["heroism"]
    }
  };
  character.magic.spellSources = character.magic.spellSources.filter(
    (source) => source.sourceType === "class"
  );
  character.classProgression.classes = [
    {
      entryId: "fighter-main",
      classId: "fighter",
      className: "Fighter",
      level: 4
    }
  ];

  const result = reconcileClassOwnedSpellSources(character);

  assert.equal(result.deactivatedSpellIds.includes("heroism"), false);
  assert.ok(character.magic.knownSpellIds.includes("heroism"));
});

test("class cleanup survives a save/reload round trip and is idempotent", () => {
  const character = makeCharacter();
  character.classProgression.classes = [
    {
      entryId: "fighter-main",
      classId: "fighter",
      className: "Fighter",
      level: 4
    }
  ];

  reconcileClassOwnedSpellSources(character);
  const reloaded = JSON.parse(JSON.stringify(character));
  const secondPass = reconcileClassOwnedSpellSources(reloaded);

  assert.deepEqual(Object.keys(reloaded.magic.classSources), []);
  assert.equal(reloaded.magic.knownSpellIds.includes("heroism"), false);
  assert.equal(reloaded.magic.preparedSpellIds.includes("bless"), false);
  assert.equal(secondPass.changed, false);
});
