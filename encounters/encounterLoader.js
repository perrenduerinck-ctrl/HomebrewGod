import { normalizeEncounter } from "./encounterModel.js";

export async function prepareEncounterLoad(raw, { resolveLibraryIds, loadLibraryRecord } = {}) {
  if (typeof resolveLibraryIds !== "function" || typeof loadLibraryRecord !== "function") {
    throw new Error("Encounter Library resolution is unavailable.");
  }
  const encounter = normalizeEncounter(raw);
  const requested = [encounter.mapRef?.libraryId, ...encounter.combatants.map((entry) => entry.libraryId)].filter(Boolean);
  const resolved = await resolveLibraryIds([...new Set(requested)]);
  const records = new Map((resolved?.entries || []).map((entry) => [entry.libraryId, entry]));
  const missing = requested.filter((libraryId) => !records.has(libraryId));
  if (missing.length) throw new Error(`Encounter content is unavailable: ${[...new Set(missing)].join(", ")}.`);
  const loaded = new Map();
  const load = async (libraryId) => {
    if (!loaded.has(libraryId)) loaded.set(libraryId, Promise.resolve(loadLibraryRecord(records.get(libraryId))));
    return loaded.get(libraryId);
  };
  const loadedContent = async (libraryId) => {
    const result = await load(libraryId);
    return result?.content ?? result;
  };
  const map = encounter.mapRef ? {
    reference: encounter.mapRef,
    record: records.get(encounter.mapRef.libraryId),
    content: await loadedContent(encounter.mapRef.libraryId)
  } : null;
  const combatants = await Promise.all(encounter.combatants.map(async (placement) => ({
    placement,
    record: records.get(placement.libraryId),
    content: await loadedContent(placement.libraryId)
  })));
  return Object.freeze({ encounter, map, combatants, metrics: resolved?.metrics || {} });
}

export async function loadEncounter(raw, {
  resolveLibraryIds,
  loadLibraryRecord,
  hasExistingBattle = async () => false,
  confirmReplace = async () => true,
  replaceBattleState
} = {}) {
  const prepared = await prepareEncounterLoad(raw, { resolveLibraryIds, loadLibraryRecord });
  if (typeof replaceBattleState !== "function") throw new Error("Encounter battle loading is unavailable.");
  const hasExisting = await hasExistingBattle();
  if (hasExisting && !(await confirmReplace(prepared))) {
    return Object.freeze({ loaded: false, cancelled: true, prepared });
  }
  const result = await replaceBattleState(prepared);
  return Object.freeze({ loaded: true, cancelled: false, prepared, result });
}
