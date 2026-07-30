export const DEFAULT_WALKING_SPEED =
  30;
export const MINIMUM_WALKING_SPEED =
  0;
export const MAXIMUM_WALKING_SPEED =
  100;

const WALKING_SPEED_INPUT_SELECTOR = [
  "#ccCustomSpeciesSpeed",
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

  const hasCanonicalWalkingSpeed =
    Object.hasOwn(
      character.combat.speed,
      "walk"
    );
  const rawWalkingSpeed =
    hasCanonicalWalkingSpeed
      ? character.combat
          .speed.walk
      : parseLegacyWalkingSpeed(
          character.speed
        );
  const walkingSpeed =
    normalizeWalkingSpeed(
      rawWalkingSpeed
    );

  character.combat.speed.walk =
    walkingSpeed;

  [
    "climb",
    "swim",
    "fly",
    "burrow"
  ].forEach((movementType) => {
    character.combat.speed[
      movementType
    ] = normalizeMovementSpeed(
      character.combat.speed[
        movementType
      ],
      MOVEMENT_SPEED_DEFAULTS[
        movementType
      ]
    );
  });

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

function getInputMovementType(input) {
  const draftPath =
    input?.dataset?.draftPath;
  const pathMatch =
    typeof draftPath === "string"
      ? draftPath.match(
          /^combat\.speed\.(walk|climb|swim|fly|burrow)$/
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
    ccClimbSpeed: "climb",
    ccSwimSpeed: "swim",
    ccFlySpeed: "fly",
    ccBurrowSpeed: "burrow"
  };

  return inputTypes[input?.id] ||
    "walk";
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
      MOVEMENT_SPEED_DEFAULTS[
        movementType
      ]
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
          `combat.speed.${movementType}`
      ) {
        normalizeCharacterWalkingSpeed(
          character
        );

        if (character?.combat?.speed) {
          character.combat.speed[
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
        `combat.speed.${movementType}` &&
      isObject(character)
    ) {
      normalizeCharacterWalkingSpeed(
        character
      );
      character.combat.speed[
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
