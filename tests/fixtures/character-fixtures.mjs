export const CLASS_IDS = Object.freeze([
  "artificer",
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard"
]);

export const CLASS_LEVEL_FIXTURES =
  Object.freeze(
    CLASS_IDS.flatMap((classId) => {
      return Array.from(
        {
          length: 20
        },
        (_, index) => {
          const level =
            index + 1;

          return Object.freeze({
            id:
              `${classId}-${level}`,
            classId,
            level
          });
        }
      );
    })
  );

export const MULTICLASS_FIXTURES =
  Object.freeze([
    {
      id: "fighter-wizard",
      classes: [
        {
          entryId: "fighter",
          classId: "fighter",
          level: 3
        },
        {
          entryId: "wizard",
          classId: "wizard",
          level: 2
        }
      ],
      expectedLevel: 5
    },
    {
      id: "barbarian-monk",
      classes: [
        {
          entryId: "barbarian",
          classId: "barbarian",
          level: 1
        },
        {
          entryId: "monk",
          classId: "monk",
          level: 1
        }
      ],
      expectedLevel: 2
    },
    {
      id: "paladin-ranger",
      classes: [
        {
          entryId: "paladin",
          classId: "paladin",
          level: 5
        },
        {
          entryId: "ranger",
          classId: "ranger",
          level: 5
        }
      ],
      expectedLevel: 10
    },
    {
      id: "wizard-warlock",
      classes: [
        {
          entryId: "wizard",
          classId: "wizard",
          level: 5
        },
        {
          entryId: "warlock",
          classId: "warlock",
          level: 5
        }
      ],
      expectedLevel: 10
    },
    {
      id: "artificer-wizard",
      classes: [
        {
          entryId: "artificer",
          classId: "artificer",
          level: 5
        },
        {
          entryId: "wizard",
          classId: "wizard",
          level: 5
        }
      ],
      expectedLevel: 10
    }
  ]);

const spellcastingProgressions =
  Object.freeze([
    {
      id: "full",
      progressionType: "full-caster",
      level: 5
    },
    {
      id: "half",
      progressionType: "half-caster",
      level: 5
    },
    {
      id: "third",
      progressionType: "third-caster",
      level: 6
    },
    {
      id: "artificer",
      progressionType: "artificer",
      level: 5
    },
    {
      id: "pact",
      progressionType: "pact-magic",
      level: 5
    }
  ]);

export const SPELLCASTING_COMBINATION_FIXTURES =
  Object.freeze(
    spellcastingProgressions
      .flatMap(
        (left, leftIndex) => {
          return spellcastingProgressions
            .slice(leftIndex)
            .map((right) => {
              return Object.freeze({
                id:
                  `${left.id}-${right.id}`,
                classes: [
                  {
                    entryId:
                      `${left.id}-one`,
                    classId:
                      left.id,
                    level:
                      left.level,
                    progressionType:
                      left.progressionType
                  },
                  {
                    entryId:
                      `${right.id}-two`,
                    classId:
                      right.id,
                    level:
                      right.level,
                    progressionType:
                      right.progressionType
                  }
                ]
              });
            });
        }
      )
  );

export const FEAT_SELECTION_FIXTURES =
  Object.freeze([
    {
      id: "elemental-adept-cold",
      featId: "elemental-adept",
      choices: {
        "damage-type": [
          "cold"
        ]
      }
    },
    {
      id: "magic-initiate-wizard",
      featId: "magic-initiate",
      choices: {
        class: [
          "wizard"
        ]
      }
    },
    {
      id: "fey-touched-wisdom",
      featId: "fey-touched",
      choices: {
        "spellcasting-ability": [
          "wis"
        ]
      }
    },
    {
      id: "telepathic-intelligence",
      featId: "telepathic",
      choices: {
        ability: [
          "int"
        ]
      }
    },
    {
      id: "fighting-initiate-defense",
      featId: "fighting-initiate",
      choices: {
        "fighting-style": [
          "defense"
        ]
      }
    }
  ]);

export function buildSubclassFixtures(
  subclasses
) {
  return (
    Array.isArray(subclasses)
      ? subclasses
      : []
  ).map((subclass) => {
    return {
      id:
        `${subclass.classId}:${subclass.id}`,
      classId:
        subclass.classId,
      subclassId:
        subclass.id,
      level: 20,
      source:
        subclass.sourceLabel
    };
  });
}

export const ROUND_TRIP_FIXTURE =
  Object.freeze({
    schemaVersion: 20,
    identity: {
      name: "Phase Twenty Hero"
    },
    classProgression: {
      classes: [
        {
          entryId: "fighter",
          classId: "fighter",
          className: "Fighter",
          level: 3
        },
        {
          entryId: "wizard",
          classId: "wizard",
          className: "Wizard",
          level: 2
        }
      ],
      totalLevel: 5
    },
    abilities: {
      scores: {
        str: 13,
        dex: 14,
        con: 14,
        int: 16,
        wis: 10,
        cha: 8
      }
    },
    equipment: {
      items: [
        {
          id: "rope",
          name: "Rope",
          quantity: 1,
          weight: 10
        }
      ]
    }
  });

export const LEGACY_MIGRATION_FIXTURES =
  Object.freeze([
    {
      id: "legacy-single-class",
      value: {
        name: "Old Fighter",
        race: "Human",
        className: "Fighter",
        level: 5,
        stats: {
          str: 16,
          dex: 12,
          con: 14,
          int: 10,
          wis: 10,
          cha: 8
        }
      }
    },
    {
      id: "legacy-spells-and-features",
      value: {
        name: "Old Wizard",
        race: "Elf",
        className: "Wizard",
        level: 7,
        spells: "Magic Missile",
        featuresText:
          "Arcane Recovery",
        equipmentText:
          "Spellbook"
      }
    }
  ]);
