export const DEFAULT_WALKING_SPEED =
  30;
export const MINIMUM_WALKING_SPEED =
  0;
export const MAXIMUM_WALKING_SPEED =
  100;

const WALKING_SPEED_INPUT_SELECTOR = [
  "#ccCustomSpeciesSpeed",
  "#ccCustomClassWalkBonus",
  "#ccCustomClassClimbBonus",
  "#ccCustomClassSwimBonus",
  "#ccCustomClassFlyBonus",
  "#ccCustomClassBurrowBonus",
  "#ccCustomClassWalkSpeed",
  "#ccCustomClassClimbSpeed",
  "#ccCustomClassSwimSpeed",
  "#ccCustomClassFlySpeed",
  "#ccCustomClassBurrowSpeed",
  "#ccWalkSpeed",
  "#ccClimbSpeed",
  "#ccSwimSpeed",
  "#ccFlySpeed",
  "#ccBurrowSpeed"
].join(",");
const MOVEMENT_SPEED_DEFAULTS =
  Object.freeze({
    walk: DEFAULT_WALKING_SPEED,
    climb: 0,
    swim: 0,
    fly: 0,
    burrow: 0
  });
export const MOVEMENT_SPEED_TYPES =
  Object.freeze(
    Object.keys(
      MOVEMENT_SPEED_DEFAULTS
    )
  );

const guardedCreatorStates =
  new WeakSet();
const guardedRoots =
  new WeakMap();

function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isInvalidMovementSpeed(value) {
  if (
    value == null ||
    (
      typeof value === "string" &&
      !value.trim()
    )
  ) {
    return true;
  }

  return !Number.isFinite(
    Number(value)
  );
}

function parseMovementSpeed(
  value,
  defaultValue
) {
  if (isInvalidMovementSpeed(value)) {
    return defaultValue;
  }

  return Math.round(
    Number(value)
  );
}

function parseLegacyWalkingSpeed(value) {
  if (typeof value !== "string") {
    return value;
  }

  const match =
    value.trim().match(
      /^[-+]?(?:\d+\.?\d*|\.\d+)/
    );

  return match
    ? match[0]
    : value;
}

export function normalizeWalkingSpeed(
  value
) {
  return normalizeMovementSpeed(
    value,
    DEFAULT_WALKING_SPEED
  );
}

export function normalizeMovementSpeed(
  value,
  defaultValue = 0
) {
  return Math.min(
    MAXIMUM_WALKING_SPEED,
    Math.max(
      MINIMUM_WALKING_SPEED,
      parseMovementSpeed(
        value,
        defaultValue
      )
    )
  );
}

export function normalizeCharacterWalkingSpeed(
  character
) {
  if (!isObject(character)) {
    return character;
  }

  if (!isObject(character.combat)) {
    character.combat = {};
  }

  if (
    !isObject(
      character.combat.speed
    )
  ) {
    character.combat.speed = {};
  }

  const hadBaseSpeed =
    isObject(
      character.combat.baseSpeed
    );

  if (!hadBaseSpeed) {
    character.combat.baseSpeed = {
      ...character.combat.speed
    };
  }

  const hasCanonicalWalkingSpeed =
    Object.hasOwn(
      character.combat.baseSpeed,
      "walk"
    );
  const rawWalkingSpeed =
    hasCanonicalWalkingSpeed
      ? character.combat
          .baseSpeed.walk
      : parseLegacyWalkingSpeed(
          character.speed
        );
  const walkingSpeed =
    normalizeWalkingSpeed(
      rawWalkingSpeed
    );

  character.combat.baseSpeed.walk =
    walkingSpeed;

  [
    "climb",
    "swim",
    "fly",
    "burrow"
  ].forEach((movementType) => {
    character.combat.baseSpeed[
      movementType
    ] = normalizeMovementSpeed(
      character.combat.baseSpeed[
        movementType
      ],
      MOVEMENT_SPEED_DEFAULTS[
        movementType
      ]
    );
  });

  if (!hadBaseSpeed) {
    character.combat.speed = {
      ...character.combat.speed,
      ...character.combat.baseSpeed
    };
  } else {
    Object.keys(
      MOVEMENT_SPEED_DEFAULTS
    ).forEach((movementType) => {
      character.combat.speed[
        movementType
      ] = normalizeMovementSpeed(
        character.combat.speed[
          movementType
        ],
        character.combat.baseSpeed[
          movementType
        ]
      );
    });
  }

  if (
    Object.hasOwn(
      character,
      "speed"
    )
  ) {
    const legacyWalkingSpeed =
      hasCanonicalWalkingSpeed &&
      isInvalidMovementSpeed(
        rawWalkingSpeed
      )
        ? DEFAULT_WALKING_SPEED
        : normalizeWalkingSpeed(
            parseLegacyWalkingSpeed(
              character.speed
            )
          );

    character.speed =
      `${legacyWalkingSpeed} ft.`;
  }

  return character;
}

function getProgressionValue(values, level) {
  if (!isObject(values)) {
    return 0;
  }

  return Object.entries(values)
    .filter(([requiredLevel]) => {
      return Number(requiredLevel) <= level;
    })
    .sort((left, right) => {
      return Number(right[0]) - Number(left[0]);
    })[0]?.[1] ?? 0;
}

function getStoredChoiceValues(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      getStoredChoiceValues(entry, result);
    });
  } else if (isObject(value)) {
    Object.values(value).forEach((entry) => {
      getStoredChoiceValues(entry, result);
    });
  } else if (
    typeof value === "string"
  ) {
    result.push(value);
  }

  return result;
}

function isMovementEffectActive(
  effect,
  character
) {
  if (effect?.duration) {
    return false;
  }

  const requires = effect?.requires;

  if (!isObject(requires)) {
    return true;
  }

  const equipped = (
    Array.isArray(
      character?.equipment?.items
    )
      ? character.equipment.items
      : []
  ).filter((item) => {
    return item?.equipped === true;
  });
  const wornArmor = equipped.filter((item) => {
    const type = [
      item?.type,
      item?.category,
      item?.armorType
    ].join(" ").toLowerCase();

    return (
      type.includes("armor") &&
      !type.includes("shield")
    );
  });

  if (
    requires.unarmored === true &&
    wornArmor.length
  ) {
    return false;
  }

  if (
    requires.noHeavyArmor === true &&
    wornArmor.some((item) => {
      return [
        item?.armorCategory,
        item?.armorType,
        item?.category,
        item?.name
      ].join(" ").toLowerCase()
        .includes("heavy");
    })
  ) {
    return false;
  }

  if (requires.choiceId && requires.option) {
    const choices = character
      ?.classProgression?.classes
      ?.flatMap((entry) => {
        return getStoredChoiceValues(
          entry?.choices
        );
      }) || [];

    return choices.includes(
      String(requires.option)
    );
  }

  return true;
}

export function applyDerivedMovementSpeeds(
  character,
  {
    classEffects = [],
    featWalkBonus = 0
  } = {}
) {
  normalizeCharacterWalkingSpeed(character);

  if (!isObject(character)) {
    return character;
  }

  const bonuses = Object.fromEntries(
    MOVEMENT_SPEED_TYPES.map(
      (type) => [type, 0]
    )
  );
  const classSpeeds = Object.fromEntries(
    MOVEMENT_SPEED_TYPES.map(
      (type) => [type, null]
    )
  );
  const seen = new Set();

  classEffects.forEach((effect, index) => {
    const movement = String(
      effect?.movement || "walk"
    ).trim().toLowerCase();
    const id = String(
      effect?.id || `movement-${index}`
    );

    if (
      !MOVEMENT_SPEED_TYPES.includes(movement) ||
      seen.has(id) ||
      !isMovementEffectActive(
        effect,
        character
      )
    ) {
      return;
    }

    seen.add(id);

    if (
      effect?.type === "speedBonus" &&
      effect?.mode === "replace"
    ) {
      classSpeeds[movement] =
        normalizeMovementSpeed(
          effect.value,
          MOVEMENT_SPEED_DEFAULTS[
            movement
          ]
        );
    } else if (effect?.type === "speedBonus") {
      bonuses[movement] +=
        Number(effect.value) || 0;
    } else if (
      effect?.type === "speedBonusByLevel"
    ) {
      bonuses[movement] += Number(
        getProgressionValue(
          effect.values,
          Math.max(
            1,
            Number(effect.classLevel) || 1
          )
        )
      ) || 0;
    }
  });

  bonuses.walk += Math.max(
    0,
    Number(featWalkBonus) || 0
  );

  MOVEMENT_SPEED_TYPES.forEach((movement) => {
    const base = normalizeMovementSpeed(
      character.combat.baseSpeed[movement],
      MOVEMENT_SPEED_DEFAULTS[movement]
    );

    const effectiveBase =
      classSpeeds[movement] ??
      base;

    character.combat.speed[movement] =
      normalizeMovementSpeed(
        effectiveBase +
        Math.max(
          0,
          Math.round(bonuses[movement])
        ),
        effectiveBase
      );
  });

  character.combat.speed.special =
    String(
      character.combat.baseSpeed.special ??
      character.combat.speed.special ??
      ""
    ).trim();

  return character;
}

function getInputMovementType(input) {
  const draftPath =
    input?.dataset?.draftPath;
  const pathMatch =
    typeof draftPath === "string"
      ? draftPath.match(
          /^combat\.(?:baseSpeed|speed)\.(walk|climb|swim|fly|burrow)$/
        )
      : null;

  if (pathMatch) {
    return pathMatch[1];
  }

  if (
    input?.id ===
      "ccCustomSpeciesSpeed" ||
    input?.id === "ccWalkSpeed"
  ) {
    return "walk";
  }

  const inputTypes = {
    ccCustomClassWalkSpeed: "walk",
    ccCustomClassClimbSpeed: "climb",
    ccCustomClassSwimSpeed: "swim",
    ccCustomClassFlySpeed: "fly",
    ccCustomClassBurrowSpeed: "burrow",
    ccClimbSpeed: "climb",
    ccSwimSpeed: "swim",
    ccFlySpeed: "fly",
    ccBurrowSpeed: "burrow"
  };

  return inputTypes[input?.id] ||
    "walk";
}

function getInputDefaultSpeed(
  input,
  movementType
) {
  if (
    input?.id ===
      "ccCustomClassWalkSpeed"
  ) {
    return DEFAULT_WALKING_SPEED;
  }

  if (
    /^ccCustomClass/.test(input?.id || "")
  ) {
    return 0;
  }

  return MOVEMENT_SPEED_DEFAULTS[
    movementType
  ];
}

export function correctWalkingSpeedInput(
  input
) {
  if (!input) {
    return DEFAULT_WALKING_SPEED;
  }

  input.setAttribute(
    "type",
    "number"
  );
  input.setAttribute(
    "min",
    String(
      MINIMUM_WALKING_SPEED
    )
  );
  input.setAttribute(
    "max",
    String(
      MAXIMUM_WALKING_SPEED
    )
  );
  input.setAttribute(
    "step",
    "1"
  );

  const movementType =
    getInputMovementType(input);
  const movementSpeed =
    normalizeMovementSpeed(
      input.value,
      getInputDefaultSpeed(
        input,
        movementType
      )
    );

  input.value =
    String(movementSpeed);

  return movementSpeed;
}

export function guardCharacterDraftWalkingSpeed(
  creatorState
) {
  if (
    !isObject(creatorState) ||
    guardedCreatorStates.has(
      creatorState
    )
  ) {
    return creatorState;
  }

  let draft =
    normalizeCharacterWalkingSpeed(
      creatorState.draft
    );

  Object.defineProperty(
    creatorState,
    "draft",
    {
      configurable: true,
      enumerable: true,
      get() {
        return draft;
      },
      set(value) {
        draft =
          normalizeCharacterWalkingSpeed(
            value
          );
      }
    }
  );

  guardedCreatorStates.add(
    creatorState
  );

  return creatorState;
}

export function installWalkingSpeedInputGuard({
  root =
    typeof document !==
      "undefined"
      ? document
      : null,
  getCharacter =
    () => null
} = {}) {
  if (
    !root ||
    typeof root.querySelectorAll !==
      "function"
  ) {
    return null;
  }

  if (guardedRoots.has(root)) {
    const existing =
      guardedRoots.get(root);

    existing.recheck();
    return existing;
  }

  const recheck = () => {
    const character =
      normalizeCharacterWalkingSpeed(
        getCharacter()
      );

    root.querySelectorAll(
      WALKING_SPEED_INPUT_SELECTOR
    ).forEach((input) => {
      const movementType =
        getInputMovementType(input);
      const characterMovementSpeed =
        character?.combat
          ?.speed?.[
            movementType
          ];

      if (
        characterMovementSpeed != null &&
        (
          input.value == null ||
          input.value === ""
        )
      ) {
        input.value =
          String(
            characterMovementSpeed
          );
      }

      const corrected =
        correctWalkingSpeedInput(
          input
        );

      if (
        input.dataset?.draftPath ===
          `combat.baseSpeed.${movementType}`
      ) {
        normalizeCharacterWalkingSpeed(
          character
        );

        if (character?.combat?.baseSpeed) {
          character.combat.baseSpeed[
            movementType
          ] = corrected;
        }
      }
    });
  };

  const correctEvent = (event) => {
    const input =
      event.target;

    if (
      typeof input?.matches !==
        "function" ||
      !input.matches(
        WALKING_SPEED_INPUT_SELECTOR
      )
    ) {
      return;
    }

    const corrected =
      correctWalkingSpeedInput(
        input
      );
    const character =
      getCharacter();
    const movementType =
      getInputMovementType(input);

    if (
      input.dataset?.draftPath ===
        `combat.baseSpeed.${movementType}` &&
      isObject(character)
    ) {
      normalizeCharacterWalkingSpeed(
        character
      );
      character.combat.baseSpeed[
        movementType
      ] = corrected;
    }
  };

  root.addEventListener(
    "input",
    correctEvent,
    true
  );
  root.addEventListener(
    "change",
    correctEvent,
    true
  );
  root.addEventListener(
    "blur",
    correctEvent,
    true
  );

  const observer =
    typeof MutationObserver ===
      "function"
      ? new MutationObserver(
          recheck
        )
      : null;

  observer?.observe(
    root.documentElement ||
    root,
    {
      childList: true,
      subtree: true
    }
  );

  const installation = {
    recheck,
    disconnect() {
      observer?.disconnect();
      root.removeEventListener(
        "input",
        correctEvent,
        true
      );
      root.removeEventListener(
        "change",
        correctEvent,
        true
      );
      root.removeEventListener(
        "blur",
        correctEvent,
        true
      );
      guardedRoots.delete(root);
    }
  };

  guardedRoots.set(
    root,
    installation
  );
  recheck();

  return installation;
}
