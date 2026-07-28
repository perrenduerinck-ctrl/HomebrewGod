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

const SRD_2014_SIZE_ORDER =
  Object.freeze([
    "tiny",
    "small",
    "medium",
    "large",
    "huge",
    "gargantuan"
  ]);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeMechanicType(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function readPositiveNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? number
    : fallback;
}

function readNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) &&
    number >= 0
    ? number
    : fallback;
}

function getLargerSize(
  size,
  steps = 0
) {
  const normalized =
    normalizeMechanicType(size) ||
    "medium";
  const foundIndex =
    SRD_2014_SIZE_ORDER.indexOf(
      normalized
    );
  const currentIndex =
    foundIndex >= 0
      ? foundIndex
      : SRD_2014_SIZE_ORDER.indexOf(
          "medium"
        );
  const nextIndex = Math.min(
    SRD_2014_SIZE_ORDER.length - 1,
    currentIndex +
      Math.max(
        0,
        Math.round(
          safeNumber(steps, 0)
        )
      )
  );

  return SRD_2014_SIZE_ORDER[
    nextIndex
  ];
}

function collectCharacterCarryingAdjustments(
  character
) {
  const multiplierFields = [
    "carryingCapacityMultiplier",
    "carryCapacityMultiplier",
    "carryMultiplier"
  ];
  const bonusFields = [
    "carryingCapacityBonus",
    "carryCapacityBonus",
    "carryBonus"
  ];
  const sizeStepFields = [
    "carryingCapacitySizeSteps",
    "carryCapacitySizeSteps",
    "effectiveCarrySizeSteps"
  ];
  const multiplierTypes = new Set([
    "carryingcapacitymultiplier",
    "carrycapacitymultiplier",
    "carrymultiplier"
  ]);
  const bonusTypes = new Set([
    "carryingcapacitybonus",
    "carrycapacitybonus",
    "carrybonus"
  ]);
  const sizeStepTypes = new Set([
    "carryingcapacitysizesteps",
    "carrycapacitysizesteps",
    "effectivecarryingcapacitysize",
    "powerfulbuild"
  ]);
  const visited = new Set();
  const appliedRecords = new Set();
  let capacityMultiplier = 1;
  let capacityBonus = 0;
  let effectiveSizeSteps = 0;
  let override = null;
  let powerfulBuild = false;

  function applyMultiplier(value) {
    capacityMultiplier *=
      readPositiveNumber(value, 1);
  }

  function applyBonus(value) {
    capacityBonus +=
      safeNumber(value, 0);
  }

  function applySizeSteps(value = 1) {
    effectiveSizeSteps = Math.max(
      effectiveSizeSteps,
      Math.max(
        0,
        Math.round(
          safeNumber(value, 1)
        )
      )
    );
  }

  function visit(value) {
    if (
      !value ||
      typeof value !== "object" ||
      visited.has(value)
    ) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value.enabled === false) {
      return;
    }

    const type =
      normalizeMechanicType(
        value.type ||
        value.mechanicType ||
        value.effectType
      );
    const name =
      normalizeMechanicType(
        value.name ||
        value.id
      );

    if (multiplierTypes.has(type)) {
      applyMultiplier(
        value.value ??
        value.multiplier
      );
      appliedRecords.add(value);
    } else if (bonusTypes.has(type)) {
      applyBonus(
        value.value ??
        value.bonus
      );
      appliedRecords.add(value);
    } else if (
      sizeStepTypes.has(type) ||
      name === "powerfulbuild"
    ) {
      applySizeSteps(
        value.value ??
        value.steps ??
        1
      );
      powerfulBuild =
        type === "powerfulbuild" ||
        name === "powerfulbuild";
      appliedRecords.add(value);
    }

    if (!appliedRecords.has(value)) {
      multiplierFields.forEach((field) => {
        if (value[field] !== undefined) {
          applyMultiplier(value[field]);
        }
      });
      bonusFields.forEach((field) => {
        if (value[field] !== undefined) {
          applyBonus(value[field]);
        }
      });
      sizeStepFields.forEach((field) => {
        if (value[field] !== undefined) {
          applySizeSteps(value[field]);
        }
      });
    }

    if (
      value.carryingCapacityOverride !==
        undefined
    ) {
      override =
        readNonNegativeNumber(
          value.carryingCapacityOverride,
          override
        );
    }

    Object.values(value).forEach(visit);
  }

  [
    character?.carryingCapacity,
    character?.mechanics,
    character?.classMechanics,
    character?.featMechanics,
    character?.features,
    character?.feats,
    character?.species
  ].forEach(visit);

  return {
    capacityMultiplier,
    capacityBonus,
    effectiveSizeSteps,
    powerfulBuild,
    override
  };
}

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
    size = "medium",
    effectiveSizeSteps = 0,
    capacityMultiplier = 1,
    capacityBonus = 0,
    override = null
  }) {
    const effectiveSize = getLargerSize(
      size,
      effectiveSizeSteps
    );
    const multiplier =
      SRD_2014_SIZE_CARRY_MULTIPLIERS[
        effectiveSize
      ] || 1;
    const baseCarryingCapacity =
      Math.max(0, safeNumber(strength, 10)) *
      15 *
      multiplier;
    const adjustedCapacity =
      baseCarryingCapacity *
        readPositiveNumber(
          capacityMultiplier,
          1
        ) +
      safeNumber(capacityBonus, 0);
    const explicitOverride =
      override === null ||
      override === undefined ||
      override === ""
        ? null
        : readNonNegativeNumber(
            override,
            adjustedCapacity
          );
    const carryingCapacity =
      explicitOverride === null
        ? Math.max(0, adjustedCapacity)
        : explicitOverride;

    return {
      carryingCapacity,
      pushDragLift:
        carryingCapacity * 2,
      sizeMultiplier: multiplier
    };
  }

export function calculateCharacterCarryingCapacity(
  character
) {
  const adjustments =
    collectCharacterCarryingAdjustments(
      character
    );
  const result =
    calculateRuleCarryingCapacity({
      strength:
        character?.abilities
          ?.scores?.str,
      size:
        character?.identity?.size,
      ...adjustments
    });
  const effectiveSize =
    getLargerSize(
      character?.identity?.size,
      adjustments.effectiveSizeSteps
    );

  return {
    ...result,
    baseCarryingCapacity:
      Math.max(
        0,
        safeNumber(
          character?.abilities
            ?.scores?.str,
          10
        )
      ) *
      15 *
      result.sizeMultiplier,
    effectiveSize,
    effectiveSizeSteps:
      adjustments.effectiveSizeSteps,
    capacityMultiplier:
      adjustments.capacityMultiplier,
    capacityBonus:
      adjustments.capacityBonus,
    powerfulBuild:
      adjustments.powerfulBuild
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
