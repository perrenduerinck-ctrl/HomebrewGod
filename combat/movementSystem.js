import {
  measureMapDistance
} from "../battleMap/measurement.js?v=stage8-20260826";

export const MIN_BASE_MOVEMENT_SPEED = 0;
export const MAX_BASE_MOVEMENT_SPEED = 100;
export const DEFAULT_BASE_MOVEMENT_SPEED = 30;

function finiteNumber(value, fallback = 0) {
  const number = typeof value === "string"
    ? Number.parseFloat(value)
    : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundDistance(value) {
  return Math.round(
    Math.max(0, finiteNumber(value, 0)) * 10
  ) / 10;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanPosition(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Object.freeze({
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    elevation: finiteNumber(
      value.elevation ?? value.elevationFeet,
      0
    )
  });
}

export function normalizeBaseMovementSpeed(
  value,
  fallback = DEFAULT_BASE_MOVEMENT_SPEED
) {
  const safeFallback = Math.min(
    MAX_BASE_MOVEMENT_SPEED,
    Math.max(
      MIN_BASE_MOVEMENT_SPEED,
      Math.round(finiteNumber(fallback, DEFAULT_BASE_MOVEMENT_SPEED))
    )
  );
  const parsed = finiteNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) return safeFallback;
  return Math.min(
    MAX_BASE_MOVEMENT_SPEED,
    Math.max(MIN_BASE_MOVEMENT_SPEED, Math.round(parsed))
  );
}

export function readTokenBaseSpeed(token = {}) {
  const value =
    token.movementSpeed ??
    token.walkingSpeed ??
    token.baseSpeed ??
    token.combat?.baseSpeed?.walk ??
    token.combat?.speed?.walk ??
    token.linkedCharacter?.movementSpeed ??
    token.linkedCharacter?.walkingSpeed ??
    token.linkedCharacter?.baseSpeed?.walk ??
    token.linkedCharacter?.combat?.baseSpeed?.walk ??
    token.linkedMonster?.movementSpeed ??
    token.linkedMonster?.walkingSpeed ??
    token.linkedMonster?.speed?.walk ??
    token.linkedMonster?.speed ??
    token.speed?.walk ??
    token.speed;
  return normalizeBaseMovementSpeed(value);
}

export function createMovementTurnKey(initiative = {}) {
  if (
    initiative.combatActive !== true ||
    !cleanText(initiative.currentCombatantId)
  ) {
    return null;
  }
  return `${Math.max(1, Math.round(finiteNumber(
    initiative.roundNumber,
    1
  )))}:${cleanText(initiative.currentCombatantId)}`;
}

export function createEmptyMovementState() {
  return Object.freeze({
    combatActive: false,
    activeTokenId: null,
    activeTokenName: "",
    baseSpeed: 0,
    movementRemaining: 0,
    movementSpent: 0,
    movementTurnKey: null,
    turnRoundNumber: 0,
    pendingMovement: null,
    lastConfirmedPosition: null,
    lastMoveForced: false,
    movementOverage: 0
  });
}

export function normalizeMovementState(source = {}) {
  const value = source?.movementState ?? source ?? {};
  const activeTokenId = cleanText(value.activeTokenId) || null;
  const combatActive = value.combatActive === true && Boolean(activeTokenId);
  if (!combatActive) return createEmptyMovementState();

  const baseSpeed = normalizeBaseMovementSpeed(value.baseSpeed);
  const movementSpent = roundDistance(
    Math.min(
      baseSpeed,
      finiteNumber(value.movementSpent, 0)
    )
  );
  const movementRemaining = roundDistance(
    Math.min(
      baseSpeed,
      finiteNumber(
        value.movementRemaining,
        baseSpeed - movementSpent
      )
    )
  );
  const pending = value.pendingMovement;
  const pendingMovement = pending?.tokenId === activeTokenId
    ? Object.freeze({
        tokenId: activeTokenId,
        turnKey: cleanText(pending.turnKey) || null,
        startPosition: cleanPosition(pending.startPosition),
        endPosition: cleanPosition(pending.endPosition),
        distanceFeet: roundDistance(pending.distanceFeet),
        afterMove: roundDistance(
          Math.max(0, movementRemaining - finiteNumber(pending.distanceFeet, 0))
        ),
        overage: roundDistance(
          Math.max(0, finiteNumber(pending.distanceFeet, 0) - movementRemaining)
        )
      })
    : null;

  return Object.freeze({
    combatActive: true,
    activeTokenId,
    activeTokenName: cleanText(value.activeTokenName),
    baseSpeed,
    movementRemaining,
    movementSpent,
    movementTurnKey: cleanText(value.movementTurnKey) || null,
    turnRoundNumber: Math.max(1, Math.round(finiteNumber(
      value.turnRoundNumber,
      1
    ))),
    pendingMovement,
    lastConfirmedPosition: cleanPosition(value.lastConfirmedPosition),
    lastMoveForced: value.lastMoveForced === true,
    movementOverage: roundDistance(value.movementOverage)
  });
}

export function movementStatesEqual(left, right, { persistedOnly = false } = {}) {
  const a = persistedOnly
    ? toRoomMovementFields(left).movementState
    : normalizeMovementState(left);
  const b = persistedOnly
    ? toRoomMovementFields(right).movementState
    : normalizeMovementState(right);
  return JSON.stringify(a) === JSON.stringify(b);
}

export function synchronizeMovementState(
  currentState,
  initiative = {},
  {
    activeToken = null,
    baseSpeed,
    tokenExists = true,
    forceReset = false
  } = {}
) {
  const activeTokenId = cleanText(initiative.currentCombatantId);
  if (
    initiative.combatActive !== true ||
    !activeTokenId ||
    tokenExists === false
  ) {
    return createEmptyMovementState();
  }

  const combatant = Array.isArray(initiative.initiativeOrder)
    ? initiative.initiativeOrder.find((entry) => (
        cleanText(entry?.tokenId) === activeTokenId
      ))
    : null;
  const turnKey = createMovementTurnKey(initiative);
  const current = normalizeMovementState(currentState);
  const speed = normalizeBaseMovementSpeed(
    baseSpeed ??
      activeToken?.movementSpeed ??
      activeToken?.baseSpeed ??
      combatant?.baseSpeed ??
      (activeToken ? readTokenBaseSpeed(activeToken) : undefined)
  );
  const position = cleanPosition(activeToken);
  const sameTurn =
    !forceReset &&
    current.combatActive &&
    current.activeTokenId === activeTokenId &&
    current.movementTurnKey === turnKey;

  if (sameTurn) {
    return normalizeMovementState({
      ...current,
      activeTokenName:
        cleanText(activeToken?.name ?? combatant?.name) ||
        current.activeTokenName,
      pendingMovement: current.pendingMovement,
      lastConfirmedPosition:
        current.lastConfirmedPosition ?? position
    });
  }

  return normalizeMovementState({
    combatActive: true,
    activeTokenId,
    activeTokenName: cleanText(activeToken?.name ?? combatant?.name),
    baseSpeed: speed,
    movementRemaining: speed,
    movementSpent: 0,
    movementTurnKey: turnKey,
    turnRoundNumber: initiative.roundNumber,
    pendingMovement: null,
    lastConfirmedPosition: position,
    lastMoveForced: false,
    movementOverage: 0
  });
}

export function createPendingMovement(
  currentState,
  {
    tokenId,
    startPosition,
    endPosition,
    distanceFeet,
    turnKey
  } = {}
) {
  const state = normalizeMovementState(currentState);
  if (!state.combatActive) {
    throw new Error("Movement tracking is not active outside combat.");
  }
  if (cleanText(tokenId) !== state.activeTokenId) {
    throw new Error("Only the current combatant can use turn movement.");
  }
  if (turnKey && cleanText(turnKey) !== state.movementTurnKey) {
    throw new Error("That movement preview belongs to an expired turn.");
  }
  const distance = roundDistance(distanceFeet);
  const start = cleanPosition(startPosition) ?? state.lastConfirmedPosition;
  const end = cleanPosition(endPosition);
  if (!start || !end) {
    throw new Error("Movement preview requires valid map positions.");
  }

  return normalizeMovementState({
    ...state,
    pendingMovement: {
      tokenId: state.activeTokenId,
      turnKey: state.movementTurnKey,
      startPosition: start,
      endPosition: end,
      distanceFeet: distance
    }
  });
}

export function cancelPendingMovement(currentState) {
  const state = normalizeMovementState(currentState);
  return normalizeMovementState({
    ...state,
    pendingMovement: null
  });
}

export function confirmPendingMovement(
  currentState,
  { force = false } = {}
) {
  const state = normalizeMovementState(currentState);
  const pending = state.pendingMovement;
  if (!pending) throw new Error("There is no movement preview to confirm.");
  if (
    pending.tokenId !== state.activeTokenId ||
    pending.turnKey !== state.movementTurnKey
  ) {
    throw new Error("That movement preview belongs to an expired turn.");
  }
  if (pending.overage > 0 && force !== true) {
    throw new Error("That move exceeds the remaining movement budget.");
  }

  const consumed = Math.min(
    state.movementRemaining,
    pending.distanceFeet
  );
  return normalizeMovementState({
    ...state,
    movementRemaining: roundDistance(
      state.movementRemaining - consumed
    ),
    movementSpent: roundDistance(
      state.movementSpent + consumed
    ),
    pendingMovement: null,
    lastConfirmedPosition: pending.endPosition,
    lastMoveForced: force === true && pending.overage > 0,
    movementOverage:
      force === true ? pending.overage : 0
  });
}

export function toRoomMovementFields(value) {
  const state = normalizeMovementState(value);
  return {
    movementState: {
      combatActive: state.combatActive,
      activeTokenId: state.activeTokenId,
      activeTokenName: state.activeTokenName,
      baseSpeed: state.baseSpeed,
      movementRemaining: state.movementRemaining,
      movementSpent: state.movementSpent,
      movementTurnKey: state.movementTurnKey,
      turnRoundNumber: state.turnRoundNumber,
      lastConfirmedPosition: state.lastConfirmedPosition
        ? { ...state.lastConfirmedPosition }
        : null,
      lastMoveForced: state.lastMoveForced,
      movementOverage: state.movementOverage
    }
  };
}

export function canControlToken(
  token = {},
  { isDm = false, userUid = "" } = {}
) {
  if (isDm === true) return true;
  const uid = cleanText(userUid);
  if (!uid) return false;
  const owners = [
    token.ownerUid,
    token.ownerId,
    token.userUid,
    token.linkedCharacter?.ownerUid,
    token.linkedMonster?.ownerUid,
    ...(Array.isArray(token.controllerUids) ? token.controllerUids : [])
  ].map(cleanText);
  return owners.includes(uid);
}

export function getTokenMovementMode(
  token,
  initiative = {},
  { isDm = false, userUid = "" } = {}
) {
  if (!token || !canControlToken(token, { isDm, userUid })) {
    return "blocked";
  }
  if (initiative.combatActive !== true) return "free";
  return cleanText(initiative.currentCombatantId) ===
    cleanText(token.id ?? token.tokenId)
    ? "tracked"
    : "blocked";
}

export function measureMovementDistance(
  startPoint,
  endPoint,
  options = {}
) {
  return measureMapDistance(startPoint, endPoint, options);
}

export function createMovementSystem({
  initialState = {},
  getInitiativeState = () => ({}),
  getTokens = () => [],
  getUserUid = () => "",
  getIsDm = () => false,
  commit = null
} = {}) {
  let state = normalizeMovementState(initialState);
  let queue = Promise.resolve();
  const subscribers = new Set();

  const getState = () => ({
    ...state,
    pendingMovement: state.pendingMovement
      ? {
          ...state.pendingMovement,
          startPosition: { ...state.pendingMovement.startPosition },
          endPosition: { ...state.pendingMovement.endPosition }
        }
      : null,
    lastConfirmedPosition: state.lastConfirmedPosition
      ? { ...state.lastConfirmedPosition }
      : null
  });

  function notify(reason) {
    const snapshot = getState();
    subscribers.forEach((subscriber) => subscriber(snapshot, reason));
  }

  function findToken(tokenId) {
    return (getTokens() || []).find((token) => (
      cleanText(token?.id ?? token?.tokenId) === cleanText(tokenId)
    )) || null;
  }

  function sync(value = state, reason = "initiative") {
    const initiative = getInitiativeState() || {};
    const activeToken = findToken(initiative.currentCombatantId);
    const next = synchronizeMovementState(value, initiative, {
      activeToken,
      tokenExists: true
    });
    const changed = !movementStatesEqual(state, next);
    state = next;
    if (changed) notify(reason);
    return getState();
  }

  function applyRoomSnapshot(value) {
    const initiative = getInitiativeState() || value || {};
    const activeToken = findToken(initiative.currentCombatantId);
    let next = synchronizeMovementState(value, initiative, {
      activeToken,
      tokenExists: true
    });
    const localPending = state.pendingMovement;
    const sameConfirmedState =
      localPending &&
      next.movementTurnKey === state.movementTurnKey &&
      next.activeTokenId === state.activeTokenId &&
      next.movementRemaining === state.movementRemaining &&
      next.movementSpent === state.movementSpent &&
      JSON.stringify(next.lastConfirmedPosition) ===
        JSON.stringify(state.lastConfirmedPosition);
    if (sameConfirmedState) {
      next = normalizeMovementState({
        ...next,
        pendingMovement: localPending
      });
    }
    const changed = !movementStatesEqual(state, next);
    state = next;
    if (changed) notify("snapshot");
    return getState();
  }

  function previewMove(details) {
    const token = findToken(details?.tokenId);
    if (!canControlToken(token || {}, {
      isDm: getIsDm(),
      userUid: getUserUid()
    })) {
      throw new Error("You do not control that token.");
    }
    state = createPendingMovement(state, details);
    notify("preview");
    return getState();
  }

  function cancelPreview(reason = "cancel") {
    if (!state.pendingMovement) return getState();
    state = cancelPendingMovement(state);
    notify(reason);
    return getState();
  }

  function confirmMove({ force = false } = {}) {
    const pending = state.pendingMovement;
    if (!pending) {
      return Promise.reject(new Error("There is no movement preview to confirm."));
    }
    if (force === true && getIsDm() !== true) {
      return Promise.reject(new Error("Only the DM can force movement."));
    }
    const token = findToken(pending.tokenId);
    if (!canControlToken(token || {}, {
      isDm: getIsDm(),
      userUid: getUserUid()
    })) {
      return Promise.reject(new Error("You do not control that token."));
    }
    const command = Object.freeze({
      type: "confirm-movement",
      tokenId: pending.tokenId,
      turnKey: pending.turnKey,
      startPosition: { ...pending.startPosition },
      endPosition: { ...pending.endPosition },
      distanceFeet: pending.distanceFeet,
      force: force === true
    });

    queue = queue.catch(() => {}).then(async () => {
      const previewState = confirmPendingMovement(state, { force });
      const committed = typeof commit === "function"
        ? await commit(command, {
            previousState: getState(),
            previewState
          })
        : previewState;
      state = normalizeMovementState(
        committed?.state ?? committed ?? previewState
      );
      notify(force ? "force-move" : "confirm");
      return getState();
    });
    return queue;
  }

  function subscribe(subscriber) {
    subscribers.add(subscriber);
    subscriber(getState(), "subscribe");
    return () => subscribers.delete(subscriber);
  }

  return Object.freeze({
    getState,
    applyRoomSnapshot,
    sync,
    previewMove,
    cancelPreview,
    confirmMove,
    subscribe,
    canControl(token) {
      return canControlToken(token, {
        isDm: getIsDm(),
        userUid: getUserUid()
      });
    }
  });
}
