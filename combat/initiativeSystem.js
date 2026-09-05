const MAX_INITIATIVE = 999;
const MIN_INITIATIVE = -999;

function finiteInteger(
  value,
  fallback = 0,
  minimum = Number.MIN_SAFE_INTEGER,
  maximum = Number.MAX_SAFE_INTEGER
) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(
    maximum,
    Math.max(minimum, Math.round(number))
  );
}

function cleanText(value, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

function readDexterity(token = {}) {
  return finiteInteger(
    token.dexterity ??
      token.abilities?.dexterity ??
      token.abilities?.dex ??
      token.stats?.dexterity ??
      token.stats?.dex,
    10,
    0,
    99
  );
}

function readInitiativeBonus(token = {}, dexterity = 10) {
  const explicit =
    token.initiativeBonus ??
    token.initiative?.bonus ??
    token.combat?.initiativeBonus;

  if (Number.isFinite(Number(explicit))) {
    return finiteInteger(
      explicit,
      0,
      MIN_INITIATIVE,
      MAX_INITIATIVE
    );
  }

  return Math.floor((dexterity - 10) / 2);
}

export function combatantFromToken(token = {}) {
  const tokenId = cleanText(token.tokenId ?? token.id);
  if (!tokenId) {
    throw new Error("A battle-map token ID is required.");
  }
  const dexterity = readDexterity(token);
  const initiativeBonus = readInitiativeBonus(
    token,
    dexterity
  );

  return normalizeCombatant({
    tokenId,
    name: cleanText(token.name, "Combatant"),
    tokenType: cleanText(
      token.tokenType ?? token.type,
      "object"
    ),
    initiativeRoll: null,
    initiativeBonus,
    totalInitiative: initiativeBonus,
    dexterity,
    ownerUid:
      token.ownerUid ??
      token.ownerId ??
      token.linkedCharacter?.ownerUid ??
      null
  });
}

export function normalizeCombatant(value = {}) {
  const tokenId = cleanText(
    value.tokenId ?? value.id
  );
  const initiativeBonus = finiteInteger(
    value.initiativeBonus,
    0,
    MIN_INITIATIVE,
    MAX_INITIATIVE
  );
  const hasRoll =
    value.initiativeRoll !== null &&
    value.initiativeRoll !== undefined &&
    Number.isFinite(Number(value.initiativeRoll));
  const initiativeRoll = hasRoll
    ? finiteInteger(value.initiativeRoll, 0, 0, 999)
    : null;
  const fallbackTotal =
    (initiativeRoll ?? 0) + initiativeBonus;

  return Object.freeze({
    tokenId,
    name: cleanText(value.name, "Combatant"),
    tokenType: cleanText(
      value.tokenType ?? value.type,
      "object"
    ),
    initiativeRoll,
    initiativeBonus,
    totalInitiative: finiteInteger(
      value.totalInitiative,
      fallbackTotal,
      MIN_INITIATIVE,
      MAX_INITIATIVE
    ),
    dexterity: finiteInteger(
      value.dexterity,
      10,
      0,
      99
    ),
    ownerUid: cleanText(value.ownerUid) || null
  });
}

function copyCombatants(order) {
  return order.map((combatant) => ({
    ...combatant
  }));
}

export function sortInitiativeOrder(order = []) {
  return copyCombatants(order)
    .map((combatant, index) => ({
      combatant: normalizeCombatant(combatant),
      index
    }))
    .sort((left, right) => (
      right.combatant.totalInitiative -
        left.combatant.totalInitiative ||
      left.index - right.index
    ))
    .map(({ combatant }) => ({ ...combatant }));
}

export function normalizeInitiativeState(source = {}) {
  const value = source?.initiativeState ?? source ?? {};
  const seen = new Set();
  const initiativeOrder = [];

  for (const raw of Array.isArray(value.initiativeOrder)
    ? value.initiativeOrder
    : []) {
    const combatant = normalizeCombatant(raw);
    if (!combatant.tokenId || seen.has(combatant.tokenId)) {
      continue;
    }
    seen.add(combatant.tokenId);
    initiativeOrder.push({ ...combatant });
  }

  const combatActive =
    value.combatActive === true &&
    initiativeOrder.length > 0;
  let currentCombatantId = combatActive
    ? cleanText(value.currentCombatantId)
    : null;
  let currentTurnIndex = combatActive
    ? initiativeOrder.findIndex(
        (combatant) =>
          combatant.tokenId === currentCombatantId
      )
    : -1;

  if (combatActive && currentTurnIndex < 0) {
    currentTurnIndex = Math.min(
      initiativeOrder.length - 1,
      Math.max(
        0,
        finiteInteger(value.currentTurnIndex, 0)
      )
    );
    currentCombatantId =
      initiativeOrder[currentTurnIndex].tokenId;
  }

  return Object.freeze({
    combatActive,
    roundNumber: combatActive
      ? finiteInteger(value.roundNumber, 1, 1)
      : 1,
    initiativeOrder,
    currentTurnIndex,
    currentCombatantId
  });
}

export function initiativeStatesEqual(left, right) {
  const a = normalizeInitiativeState(left);
  const b = normalizeInitiativeState(right);
  return JSON.stringify(a) === JSON.stringify(b);
}

function stateWithOrder(
  state,
  order,
  preferredCurrentId = state.currentCombatantId
) {
  const initiativeOrder = copyCombatants(order);
  if (!state.combatActive || initiativeOrder.length === 0) {
    return {
      ...state,
      combatActive: false,
      roundNumber: 1,
      initiativeOrder,
      currentTurnIndex: -1,
      currentCombatantId: null
    };
  }

  let currentTurnIndex = initiativeOrder.findIndex(
    (combatant) =>
      combatant.tokenId === preferredCurrentId
  );
  if (currentTurnIndex < 0) currentTurnIndex = 0;

  return {
    ...state,
    initiativeOrder,
    currentTurnIndex,
    currentCombatantId:
      initiativeOrder[currentTurnIndex].tokenId
  };
}

function requireCombatantIndex(state, tokenId) {
  const cleanId = cleanText(tokenId);
  const index = state.initiativeOrder.findIndex(
    (combatant) => combatant.tokenId === cleanId
  );
  if (index < 0) {
    throw new Error("That combatant is not in initiative.");
  }
  return index;
}

export function applyInitiativeCommand(
  currentState,
  command = {},
  { rollDie = () => 1 + Math.floor(Math.random() * 20) } = {}
) {
  const state = normalizeInitiativeState(currentState);
  const type = cleanText(command.type);
  const effects = [];
  let next = state;

  if (type === "add-combatant") {
    const combatant = command.combatant?.tokenId
      ? normalizeCombatant(command.combatant)
      : combatantFromToken(command.token || command.combatant);
    if (!combatant.tokenId) {
      throw new Error("A battle-map token ID is required.");
    }
    if (state.initiativeOrder.some(
      (entry) => entry.tokenId === combatant.tokenId
    )) {
      return { state, effects };
    }
    next = stateWithOrder(
      state,
      sortInitiativeOrder([
        ...state.initiativeOrder,
        combatant
      ])
    );
  } else if (type === "remove-combatant") {
    const index = requireCombatantIndex(
      state,
      command.tokenId
    );
    const removingCurrent =
      state.currentCombatantId ===
        state.initiativeOrder[index].tokenId;
    const order = copyCombatants(state.initiativeOrder);
    order.splice(index, 1);

    if (state.combatActive && order.length === 0) {
      next = stateWithOrder(state, order);
      effects.push("combat-ended");
    } else if (state.combatActive && removingCurrent) {
      const nextIndex = index >= order.length ? 0 : index;
      next = {
        ...state,
        initiativeOrder: order,
        currentTurnIndex: nextIndex,
        currentCombatantId: order[nextIndex].tokenId
      };
    } else {
      next = stateWithOrder(state, order);
    }
  } else if (type === "roll-initiative") {
    const requestedIds = Array.isArray(command.tokenIds)
      ? new Set(command.tokenIds.map(cleanText))
      : null;
    const preferredCurrentId = state.currentCombatantId;
    const order = state.initiativeOrder.map((entry) => {
      if (requestedIds && !requestedIds.has(entry.tokenId)) {
        return { ...entry };
      }
      const roll = finiteInteger(
        rollDie(entry),
        1,
        1,
        20
      );
      return {
        ...entry,
        initiativeRoll: roll,
        totalInitiative: roll + entry.initiativeBonus
      };
    });
    next = stateWithOrder(
      state,
      sortInitiativeOrder(order),
      preferredCurrentId
    );
  } else if (type === "set-initiative") {
    const index = requireCombatantIndex(state, command.tokenId);
    const totalInitiative = finiteInteger(
      command.totalInitiative,
      state.initiativeOrder[index].totalInitiative,
      MIN_INITIATIVE,
      MAX_INITIATIVE
    );
    const preferredCurrentId = state.currentCombatantId;
    const order = copyCombatants(state.initiativeOrder);
    order[index] = {
      ...order[index],
      initiativeRoll: null,
      totalInitiative
    };
    next = stateWithOrder(
      state,
      sortInitiativeOrder(order),
      preferredCurrentId
    );
  } else if (type === "move-tie") {
    const index = requireCombatantIndex(state, command.tokenId);
    const direction = command.direction === "down" ? 1 : -1;
    const targetIndex = index + direction;
    if (
      targetIndex < 0 ||
      targetIndex >= state.initiativeOrder.length ||
      state.initiativeOrder[index].totalInitiative !==
        state.initiativeOrder[targetIndex].totalInitiative
    ) {
      return { state, effects };
    }
    const order = copyCombatants(state.initiativeOrder);
    [order[index], order[targetIndex]] = [
      order[targetIndex],
      order[index]
    ];
    next = stateWithOrder(state, order);
  } else if (type === "start-combat") {
    if (state.combatActive) return { state, effects };
    if (state.initiativeOrder.length === 0) {
      throw new Error("Add at least one combatant before starting combat.");
    }
    const order = sortInitiativeOrder(state.initiativeOrder);
    next = {
      combatActive: true,
      roundNumber: 1,
      initiativeOrder: order,
      currentTurnIndex: 0,
      currentCombatantId: order[0].tokenId
    };
    effects.push("combat-started");
  } else if (type === "end-combat") {
    if (!state.combatActive) return { state, effects };
    next = {
      ...state,
      combatActive: false,
      roundNumber: 1,
      currentTurnIndex: -1,
      currentCombatantId: null
    };
    effects.push("combat-ended");
  } else if (type === "next-turn") {
    if (!state.combatActive) {
      throw new Error("Start combat before advancing turns.");
    }
    const wraps =
      state.currentTurnIndex >=
        state.initiativeOrder.length - 1;
    const currentTurnIndex = wraps
      ? 0
      : state.currentTurnIndex + 1;
    next = {
      ...state,
      roundNumber:
        state.roundNumber + (wraps ? 1 : 0),
      currentTurnIndex,
      currentCombatantId:
        state.initiativeOrder[currentTurnIndex].tokenId
    };
    if (wraps) effects.push("round-completed");
  } else if (type === "previous-turn") {
    if (!state.combatActive) {
      throw new Error("Start combat before changing turns.");
    }
    const wraps = state.currentTurnIndex <= 0;
    const currentTurnIndex = wraps
      ? state.initiativeOrder.length - 1
      : state.currentTurnIndex - 1;
    next = {
      ...state,
      roundNumber: wraps
        ? Math.max(1, state.roundNumber - 1)
        : state.roundNumber,
      currentTurnIndex,
      currentCombatantId:
        state.initiativeOrder[currentTurnIndex].tokenId
    };
    if (wraps && state.roundNumber > 1) {
      effects.push("round-reverted");
    }
  } else {
    throw new Error(
      `Unknown initiative command: ${type || "empty"}`
    );
  }

  return {
    state: normalizeInitiativeState(next),
    effects
  };
}

export function toRoomInitiativeFields(value) {
  const state = normalizeInitiativeState(value);
  return {
    initiativeState: {
      combatActive: state.combatActive,
      roundNumber: state.roundNumber,
      initiativeOrder: copyCombatants(state.initiativeOrder),
      currentTurnIndex: state.currentTurnIndex,
      currentCombatantId: state.currentCombatantId
    }
  };
}

export class InitiativePermissionError extends Error {
  constructor() {
    super("Only the room DM can change initiative.");
    this.name = "InitiativePermissionError";
    this.code = "initiative/permission-denied";
  }
}

export function createInitiativeSystem({
  initialState = {},
  canMutate = () => true,
  commit = null,
  rollDie,
  onCombatStart = null,
  onRoundComplete = null,
  onRoundRevert = null,
  onCombatEnd = null
} = {}) {
  let state = normalizeInitiativeState(initialState);
  let mutationQueue = Promise.resolve();
  const subscribers = new Set();

  const getState = () => ({
    ...state,
    initiativeOrder: copyCombatants(state.initiativeOrder)
  });

  function notify(reason) {
    const snapshot = getState();
    subscribers.forEach((subscriber) => {
      subscriber(snapshot, reason);
    });
  }

  function applySnapshot(value) {
    const next = normalizeInitiativeState(value);
    const changed = !initiativeStatesEqual(state, next);
    state = next;
    if (changed) notify("snapshot");
    return getState();
  }

  async function runEffects(effects) {
    for (const effect of effects) {
      if (effect === "combat-started" && onCombatStart) {
        await onCombatStart();
      } else if (effect === "round-completed" && onRoundComplete) {
        await onRoundComplete();
      } else if (effect === "round-reverted" && onRoundRevert) {
        await onRoundRevert();
      } else if (effect === "combat-ended" && onCombatEnd) {
        await onCombatEnd();
      }
    }
  }

  async function executeNow(command) {
    if (!canMutate()) throw new InitiativePermissionError();

    const previousState = getState();
    const preview = applyInitiativeCommand(
      previousState,
      command,
      { rollDie }
    );
    if (
      initiativeStatesEqual(previousState, preview.state) &&
      preview.effects.length === 0
    ) {
      return previousState;
    }

    const committed = typeof commit === "function"
      ? await commit(
          { ...command },
          {
            previousState,
            previewState: preview.state,
            previewEffects: [...preview.effects]
          }
        )
      : preview;
    const committedState =
      committed?.state ?? committed ?? preview.state;
    const effects = Array.isArray(committed?.effects)
      ? committed.effects
      : preview.effects;

    state = normalizeInitiativeState(committedState);
    notify(command.type);
    await runEffects(effects);
    return getState();
  }

  function execute(command) {
    const result = mutationQueue.then(
      () => executeNow(command)
    );
    mutationQueue = result.catch(() => undefined);
    return result;
  }

  const api = {
    getState,
    applySnapshot,
    applyRoomSnapshot: applySnapshot,
    subscribe(subscriber, { immediate = true } = {}) {
      if (typeof subscriber !== "function") {
        throw new TypeError(
          "Initiative subscribers must be functions."
        );
      }
      subscribers.add(subscriber);
      if (immediate) subscriber(getState(), "subscribe");
      return () => subscribers.delete(subscriber);
    },
    addToken: (token) => execute({
      type: "add-combatant",
      token
    }),
    addCombatant: (combatant) => execute({
      type: "add-combatant",
      combatant
    }),
    removeCombatant: (tokenId) => execute({
      type: "remove-combatant",
      tokenId
    }),
    rollInitiative(tokenIds) {
      return execute({
        type: "roll-initiative",
        ...(Array.isArray(tokenIds) ? { tokenIds } : {})
      });
    },
    setInitiative: (tokenId, totalInitiative) => execute({
      type: "set-initiative",
      tokenId,
      totalInitiative
    }),
    moveTie: (tokenId, direction) => execute({
      type: "move-tie",
      tokenId,
      direction
    }),
    startCombat: () => execute({ type: "start-combat" }),
    endCombat: () => execute({ type: "end-combat" }),
    nextTurn: () => execute({ type: "next-turn" }),
    previousTurn: () => execute({ type: "previous-turn" })
  };

  return Object.freeze(api);
}
