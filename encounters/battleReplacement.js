import {
  normalizeInitiativeState,
  toRoomInitiativeFields
} from "../combat/initiativeSystem.js";
import { toRoomMovementFields } from "../combat/movementSystem.js";
import {
  applyTimeCommand,
  normalizeTimeState,
  toRoomTimeFields
} from "../timeSystem.js";

const clean = (value) => String(value ?? "").trim();

export function createEncounterOperationContext({
  roomCode,
  roomData,
  userId,
  isDm,
  operationId = globalThis.crypto?.randomUUID?.() || `encounter-${Date.now()}`
} = {}) {
  const cleanRoomCode = clean(roomCode).toUpperCase();
  const cleanUserId = clean(userId);
  if (!cleanRoomCode || !cleanUserId || isDm !== true) {
    throw new Error("Open the destination room as its DM before loading an encounter.");
  }
  return Object.freeze({
    operationId: clean(operationId),
    roomCode: cleanRoomCode,
    userId: cleanUserId,
    roomData: { ...(roomData || {}) }
  });
}

export function assertEncounterOperationCurrent(context, current = {}) {
  if (
    clean(current.roomCode).toUpperCase() !== context.roomCode ||
    clean(current.userId) !== context.userId ||
    current.isDm !== true
  ) {
    throw new Error("The active room or account changed while the encounter was loading. The original battle was left in place.");
  }
  return true;
}

function validMapUrl(value) {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
}

export function preflightEncounterReplacement(prepared, { retainedMap = null } = {}) {
  const combatants = Array.isArray(prepared?.combatants) ? prepared.combatants : [];
  const mapContent = prepared?.map?.content || null;
  const mapUrl = clean(mapContent?.url || mapContent?.imageUrl);
  if (prepared?.map && !validMapUrl(mapUrl)) {
    throw new Error("The encounter map image is unavailable or does not use HTTPS.");
  }
  if (!prepared?.map && !retainedMap && combatants.length) {
    throw new Error("Load a battle map or add a map reference before spawning encounter combatants.");
  }
  for (const entry of combatants) {
    const type = clean(entry?.placement?.assetType);
    if (!entry?.record || !entry?.content || !["monster", "npc"].includes(type)) {
      throw new Error("One or more encounter combatants are unavailable.");
    }
  }
  return Object.freeze({
    mapUrl,
    retainedMap,
    combatants: [...combatants]
  });
}

export function buildEncounterBattleResetFields(roomData = {}, initiativeOrder = []) {
  const initiative = normalizeInitiativeState({
    initiativeOrder,
    combatActive: false,
    currentCombatantId: null,
    currentTurnIndex: -1,
    roundNumber: 1,
    turnOrdinal: 0
  });
  const time = applyTimeCommand(
    normalizeTimeState(roomData),
    { type: "end-combat" }
  );
  return {
    ...toRoomInitiativeFields(initiative),
    ...toRoomMovementFields({}),
    ...toRoomTimeFields(time)
  };
}

export async function runRecoverableEncounterStaging({
  entries = [],
  stageToken,
  activate,
  cleanupToken = async () => {}
} = {}) {
  if (typeof stageToken !== "function" || typeof activate !== "function") {
    throw new Error("Encounter replacement staging is unavailable.");
  }
  const staged = [];
  try {
    for (const entry of entries) {
      staged.push({ entry, token: await stageToken(entry) });
    }
    return await activate(staged);
  } catch (error) {
    await Promise.allSettled(staged.map(({ token }) => cleanupToken(token)));
    throw error;
  }
}
