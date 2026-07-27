function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}

function cleanString(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();
  return text || fallback;
}

function clampLevel(value) {
  return Math.max(
    1,
    Math.min(
      20,
      Math.round(
        safeNumber(value, 1)
      )
    )
  );
}



export const SRD_2014_SIZE_CARRY_MULTIPLIERS =
    Object.freeze({
      tiny: 0.5,
      small: 1,
      medium: 1,
      large: 2,
      huge: 4,
      gargantuan: 8
    });

export function calculateRuleSkillModifier({
    abilityModifier = 0,
    proficiencyBonus = 0,
    proficient = false,
    expertise = false
  } = {}) {
    return (
      safeNumber(abilityModifier, 0) +
      (
        proficient
          ? safeNumber(proficiencyBonus, 0) *
            (expertise ? 2 : 1)
          : 0
      )
    );
  }

export function calculateRulePassiveScore(
    skillModifier,
    state = {}
  ) {
    return (
      10 +
      safeNumber(skillModifier, 0) +
      (state.advantage ? 5 : 0) -
      (state.disadvantage ? 5 : 0)
    );
  }

export function calculateRuleFixedAverageHp({
    hitDie,
    level,
    constitutionModifier,
    levelOneValue = null
  }) {
    const dieSize =
      Math.max(
        1,
        safeNumber(
          String(hitDie || "d8").replace(/[^0-9]/g, ""),
          8
        )
      );

    const cleanLevel = clampLevel(level);
    const conModifier =
      safeNumber(constitutionModifier, 0);

    const laterLevelHp =
      Math.max(
        1,
        Math.floor(dieSize / 2) + 1 + conModifier
      );

    const firstLevelHp = Math.max(
      1,
      levelOneValue === null ||
      levelOneValue === undefined
        ? dieSize + conModifier
        : safeNumber(
            levelOneValue,
            dieSize + conModifier
          )
    );

    return Math.max(
      1,
      firstLevelHp +
      Math.max(0, cleanLevel - 1) *
        laterLevelHp
    );
  }

export function calculateRuleSpellSaveDc({
    proficiencyBonus,
    abilityModifier,
    bonus = 0
  }) {
    return (
      8 +
      safeNumber(proficiencyBonus, 0) +
      safeNumber(abilityModifier, 0) +
      safeNumber(bonus, 0)
    );
  }

export function calculateRuleSpellAttackBonus({
    proficiencyBonus,
    abilityModifier,
    bonus = 0
  }) {
    return (
      safeNumber(proficiencyBonus, 0) +
      safeNumber(abilityModifier, 0) +
      safeNumber(bonus, 0)
    );
  }

export function calculateRuleCarryingCapacity({
    strength,
    size = "medium"
  }) {
    const multiplier =
      SRD_2014_SIZE_CARRY_MULTIPLIERS[
        String(size || "medium").toLowerCase()
      ] || 1;

    const carryingCapacity =
      Math.max(0, safeNumber(strength, 10)) *
      15 *
      multiplier;

    return {
      carryingCapacity,
      pushDragLift:
        carryingCapacity * 2,
      sizeMultiplier: multiplier
    };
  }

export function calculateAbilityModifier(
  score
) {
  return Math.floor(
    (
      safeNumber(score, 10) -
      10
    ) / 2
  );
}

export function calculateProficiencyBonus(
  level
) {
  return (
    2 +
    Math.floor(
      (
        clampLevel(level) -
        1
      ) / 4
    )
  );
}

