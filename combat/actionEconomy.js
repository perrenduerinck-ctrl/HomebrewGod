// Authoritative per-token turn economy. This module owns only the small
// synchronized turn ledger; movement, spells, inventory and VFX remain in
// their existing systems.

const ACTION_ECONOMY_SCHEMA_VERSION = 1;

function text(value) {
  return String(value ?? "").trim();
}

function integer(value, fallback = 0, minimum = 0, maximum = 999) {
  const number = Number(value);
  const resolved = Number.isFinite(number) ? Math.round(number) : fallback;
  return Math.max(minimum, Math.min(maximum, resolved));
}

export function createActionTurnKey(initiative = {}, tokenId = "") {
  const id = text(tokenId || initiative.currentCombatantId);
  if (initiative.combatActive !== true || !id) return null;
  return `${integer(initiative.roundNumber, 1, 1)}:${integer(
    initiative.turnCounter,
    0,
    0
  )}:${id}`;
}

export function createEmptyActionEconomy(tokenId = "") {
  return Object.freeze({
    schemaVersion: ACTION_ECONOMY_SCHEMA_VERSION,
    tokenId: text(tokenId) || null,
    combatActive: false,
    turnKey: null,
    roundNumber: 0,
    turnCounter: 0,
    actionsRemaining: 0,
    bonusActionsRemaining: 0,
    reactionAvailable: false,
    attackActionStarted: false,
    attacksRemaining: 0,
    actionSurgeUsed: false,
    dashUsed: false,
    disengaged: false,
    dodging: false,
    hidden: false,
    helping: false,
    lastCommand: "",
    lastResource: "free",
    lastCommandByUid: "",
    revision: 0,
    updatedAtMillis: 0
  });
}

export function createFreshActionEconomy(initiative = {}, tokenId = "") {
  const id = text(tokenId || initiative.currentCombatantId);
  const turnKey = createActionTurnKey(initiative, id);
  if (!turnKey || id !== text(initiative.currentCombatantId)) {
    return createEmptyActionEconomy(id);
  }
  return Object.freeze({
    ...createEmptyActionEconomy(id),
    combatActive: true,
    turnKey,
    roundNumber: integer(initiative.roundNumber, 1, 1),
    turnCounter: integer(initiative.turnCounter, 0, 0),
    actionsRemaining: 1,
    bonusActionsRemaining: 1,
    reactionAvailable: true
  });
}

export function normalizeActionEconomy(source = {}) {
  const value = source?.actionEconomy ?? source ?? {};
  const tokenId = text(value.tokenId) || null;
  const combatActive = value.combatActive === true && Boolean(tokenId && text(value.turnKey));
  if (!combatActive) {
    return Object.freeze({
      ...createEmptyActionEconomy(tokenId),
      revision: integer(value.revision, 0, 0, Number.MAX_SAFE_INTEGER),
      updatedAtMillis: integer(value.updatedAtMillis, 0, 0, Number.MAX_SAFE_INTEGER)
    });
  }
  return Object.freeze({
    schemaVersion: ACTION_ECONOMY_SCHEMA_VERSION,
    tokenId,
    combatActive: true,
    turnKey: text(value.turnKey),
    roundNumber: integer(value.roundNumber, 1, 1),
    turnCounter: integer(value.turnCounter, 0, 0),
    actionsRemaining: integer(value.actionsRemaining, 1, 0, 2),
    bonusActionsRemaining: integer(value.bonusActionsRemaining, 1, 0, 1),
    reactionAvailable: value.reactionAvailable !== false,
    attackActionStarted: value.attackActionStarted === true,
    attacksRemaining: integer(value.attacksRemaining, 0, 0, 20),
    actionSurgeUsed: value.actionSurgeUsed === true,
    dashUsed: value.dashUsed === true,
    disengaged: value.disengaged === true,
    dodging: value.dodging === true,
    hidden: value.hidden === true,
    helping: value.helping === true,
    lastCommand: text(value.lastCommand),
    lastResource: ["action", "bonus", "reaction", "free"].includes(text(value.lastResource))
      ? text(value.lastResource)
      : "free",
    lastCommandByUid: text(value.lastCommandByUid),
    revision: integer(value.revision, 0, 0, Number.MAX_SAFE_INTEGER),
    updatedAtMillis: integer(value.updatedAtMillis, 0, 0, Number.MAX_SAFE_INTEGER)
  });
}

export function synchronizeActionEconomy(source, initiative = {}, tokenId = "") {
  const id = text(tokenId);
  const current = normalizeActionEconomy(source);
  const expectedTurnKey = createActionTurnKey(initiative, id);
  if (!expectedTurnKey || id !== text(initiative.currentCombatantId)) {
    return Object.freeze({
      ...createEmptyActionEconomy(id),
      revision: current.revision,
      updatedAtMillis: current.updatedAtMillis
    });
  }
  if (
    current.combatActive &&
    current.tokenId === id &&
    current.turnKey === expectedTurnKey
  ) {
    return current;
  }
  return Object.freeze({
    ...createFreshActionEconomy(initiative, id),
    revision: current.revision,
    updatedAtMillis: current.updatedAtMillis
  });
}

export function synchronizeReactionEconomy(source, initiative = {}, tokenId = "") {
  const id = text(tokenId);
  const current = normalizeActionEconomy(source);
  const order = (Array.isArray(initiative?.initiativeOrder)
    ? initiative.initiativeOrder
    : [])
    .map((entry) => text(entry?.tokenId || entry?.id))
    .filter(Boolean);
  if (
    initiative.combatActive !== true ||
    !id ||
    !order.includes(id)
  ) {
    return Object.freeze({
      ...createEmptyActionEconomy(id),
      revision: current.revision,
      updatedAtMillis: current.updatedAtMillis
    });
  }
  if (id === text(initiative.currentCombatantId)) {
    return synchronizeActionEconomy(current, initiative, id);
  }
  if (current.combatActive && current.tokenId === id) {
    return current;
  }
  return Object.freeze({
    ...createEmptyActionEconomy(id),
    combatActive: true,
    turnKey: `reaction:${integer(initiative.roundNumber, 1, 1)}:${integer(
      initiative.turnCounter,
      0,
      0
    )}:${id}`,
    roundNumber: integer(initiative.roundNumber, 1, 1),
    turnCounter: integer(initiative.turnCounter, 0, 0),
    reactionAvailable: true,
    revision: current.revision,
    updatedAtMillis: current.updatedAtMillis
  });
}

function spend(state, resource) {
  if (resource === "free" || !resource) return state;
  if (resource === "action") {
    if (state.actionsRemaining < 1) throw new Error("No Action remains this turn.");
    return { ...state, actionsRemaining: state.actionsRemaining - 1 };
  }
  if (resource === "bonus") {
    if (state.bonusActionsRemaining < 1) throw new Error("No Bonus Action remains this turn.");
    return { ...state, bonusActionsRemaining: state.bonusActionsRemaining - 1 };
  }
  if (resource === "reaction") {
    if (!state.reactionAvailable) throw new Error("The Reaction has already been used.");
    return { ...state, reactionAvailable: false };
  }
  throw new Error("Unknown action-economy resource.");
}

export function applyActionEconomyCommand(currentState, command = {}) {
  let state = normalizeActionEconomy(currentState);
  if (!state.combatActive) {
    throw new Error("Turn action economy is only tracked during active initiative.");
  }
  const type = text(command.type);
  if (!type) throw new Error("A combat command is required.");

  if (type === "weapon-attack") {
    const attackCount = integer(command.numberOfAttacks, 1, 1, 20);
    if (state.attackActionStarted && state.attacksRemaining > 0) {
      state = { ...state, attacksRemaining: state.attacksRemaining - 1 };
    } else {
      state = spend(state, text(command.resource) || "action");
      state = {
        ...state,
        attackActionStarted: true,
        attacksRemaining: Math.max(0, attackCount - 1)
      };
    }
  } else if (type === "action-surge") {
    if (state.actionSurgeUsed) throw new Error("Action Surge was already used this turn.");
    state = {
      ...state,
      actionsRemaining: Math.min(2, state.actionsRemaining + 1),
      actionSurgeUsed: true
    };
  } else {
    state = spend(state, text(command.resource) || "action");
  }

  if (type === "dash") {
    if (state.dashUsed) throw new Error("The generic Dash has already been used this turn.");
    state = { ...state, dashUsed: true };
  }
  if (type === "disengage") state = { ...state, disengaged: true };
  if (type === "dodge") state = { ...state, dodging: true };
  if (type === "hide") state = { ...state, hidden: true };
  if (type === "help") state = { ...state, helping: true };

  return normalizeActionEconomy({
    ...state,
    lastCommand: type,
    lastResource: text(command.resource) || "action",
    lastCommandByUid: text(command.actorUid),
    revision: state.revision + 1,
    updatedAtMillis: integer(command.updatedAtMillis, Date.now(), 0, Number.MAX_SAFE_INTEGER)
  });
}

export function toCombatTurnDocument(value) {
  const state = normalizeActionEconomy(value);
  return { ...state };
}

export function getEconomyResourceForSection(section = "") {
  const value = text(section).toLowerCase();
  if (value === "bonusaction" || value === "bonus-action" || value === "bonus") return "bonus";
  if (value === "reaction") return "reaction";
  if (value === "free" || value === "other") return "free";
  return "action";
}
