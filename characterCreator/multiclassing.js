function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}



export const MULTICLASS_PREREQUISITES =
    Object.freeze({
      artificer: Object.freeze([
        Object.freeze({ ability: "int", minimum: 13 })
      ]),
      barbarian: Object.freeze([
        Object.freeze({ ability: "str", minimum: 13 })
      ]),
      bard: Object.freeze([
        Object.freeze({ ability: "cha", minimum: 13 })
      ]),
      cleric: Object.freeze([
        Object.freeze({ ability: "wis", minimum: 13 })
      ]),
      druid: Object.freeze([
        Object.freeze({ ability: "wis", minimum: 13 })
      ]),
      fighter: Object.freeze([
        Object.freeze({
          any: Object.freeze([
            Object.freeze({ ability: "str", minimum: 13 }),
            Object.freeze({ ability: "dex", minimum: 13 })
          ])
        })
      ]),
      monk: Object.freeze([
        Object.freeze({ ability: "dex", minimum: 13 }),
        Object.freeze({ ability: "wis", minimum: 13 })
      ]),
      paladin: Object.freeze([
        Object.freeze({ ability: "str", minimum: 13 }),
        Object.freeze({ ability: "cha", minimum: 13 })
      ]),
      ranger: Object.freeze([
        Object.freeze({ ability: "dex", minimum: 13 }),
        Object.freeze({ ability: "wis", minimum: 13 })
      ]),
      rogue: Object.freeze([
        Object.freeze({ ability: "dex", minimum: 13 })
      ]),
      sorcerer: Object.freeze([
        Object.freeze({ ability: "cha", minimum: 13 })
      ]),
      warlock: Object.freeze([
        Object.freeze({ ability: "cha", minimum: 13 })
      ]),
      wizard: Object.freeze([
        Object.freeze({ ability: "int", minimum: 13 })
      ])
    });

export const MULTICLASS_PROFICIENCY_GRANTS =
    Object.freeze({
      artificer: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([]),
        tools: Object.freeze([
          "Thieves' Tools",
          "Tinker's Tools"
        ])
      }),
      barbarian: Object.freeze({
        armor: Object.freeze([
          "Shields"
        ]),
        weapons: Object.freeze([
          "Simple Weapons",
          "Martial Weapons"
        ]),
        tools: Object.freeze([])
      }),
      bard: Object.freeze({
        armor: Object.freeze([
          "Light Armor"
        ]),
        weapons: Object.freeze([]),
        tools: Object.freeze([]),
        skillChoices: Object.freeze({
          choose: 1
        }),
        toolChoices: Object.freeze({
          choose: 1,
          label: "musical instrument"
        })
      }),
      cleric: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([]),
        tools: Object.freeze([])
      }),
      druid: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([]),
        tools: Object.freeze([])
      }),
      fighter: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([
          "Simple Weapons",
          "Martial Weapons"
        ]),
        tools: Object.freeze([])
      }),
      monk: Object.freeze({
        armor: Object.freeze([]),
        weapons: Object.freeze([
          "Simple Weapons",
          "Shortswords"
        ]),
        tools: Object.freeze([])
      }),
      paladin: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([
          "Simple Weapons",
          "Martial Weapons"
        ]),
        tools: Object.freeze([])
      }),
      ranger: Object.freeze({
        armor: Object.freeze([
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]),
        weapons: Object.freeze([
          "Simple Weapons",
          "Martial Weapons"
        ]),
        tools: Object.freeze([]),
        skillChoices: Object.freeze({
          choose: 1
        })
      }),
      rogue: Object.freeze({
        armor: Object.freeze([
          "Light Armor"
        ]),
        weapons: Object.freeze([]),
        tools: Object.freeze([
          "Thieves' Tools"
        ]),
        skillChoices: Object.freeze({
          choose: 1
        })
      }),
      sorcerer: Object.freeze({
        armor: Object.freeze([]),
        weapons: Object.freeze([]),
        tools: Object.freeze([])
      }),
      warlock: Object.freeze({
        armor: Object.freeze([
          "Light Armor"
        ]),
        weapons: Object.freeze([
          "Simple Weapons"
        ]),
        tools: Object.freeze([])
      }),
      wizard: Object.freeze({
        armor: Object.freeze([]),
        weapons: Object.freeze([]),
        tools: Object.freeze([])
      })
    });

export function isMulticlassRequirementMet(
  requirement,
  getAbilityScore
) {
  const readScore =
    typeof getAbilityScore ===
      "function"
      ? getAbilityScore
      : () => 0;
  const meetsItem = (item) => {
    return (
      safeNumber(
        readScore(item?.ability),
        0
      ) >=
      Math.max(
        1,
        Math.round(
          safeNumber(
            item?.minimum,
            13
          )
        )
      )
    );
  };

  return Array.isArray(
    requirement?.any
  )
    ? requirement.any.some(
        meetsItem
      )
    : meetsItem(requirement);
}

export function evaluateMulticlassPrerequisites({
  classId,
  configuredRequirements = [],
  getAbilityScore
} = {}) {
  const requirements =
    Array.isArray(
      configuredRequirements
    ) &&
    configuredRequirements.length
      ? configuredRequirements
      : MULTICLASS_PREREQUISITES[
          classId
        ] || [];
  const failed =
    requirements.filter(
      (requirement) => {
        return !isMulticlassRequirementMet(
          requirement,
          getAbilityScore
        );
      }
    );

  return {
    met: failed.length === 0,
    requirements,
    failed
  };
}

