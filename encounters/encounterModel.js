const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

const safeId = (value, fallback) => clean(value, 160)
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || clean(fallback, 160);

const boundedNumber = (value, fallback, minimum, maximum) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
};

const nullableInteger = (value, minimum = -999, maximum = 999) => {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(minimum, Math.min(maximum, number))) : null;
};

const uniqueList = (value, maximum = 24, itemMaximum = 80) => [...new Set(
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => clean(entry, itemMaximum).toLowerCase())
    .filter(Boolean)
)].slice(0, maximum);

const referenceLibraryId = (source, assetType) => clean(source.libraryId, 241)
  || (clean(source.sourceRecordId || source.recordId || source.id, 160)
    ? `${assetType}:${clean(source.sourceRecordId || source.recordId || source.id, 160)}`
    : "");

export function normalizeEncounterMapReference(raw = {}) {
  if (!raw || typeof raw !== "object") return null;
  const sourceRecordId = clean(raw.sourceRecordId || raw.recordId || raw.id, 160);
  const libraryId = referenceLibraryId(raw, "map");
  if (!sourceRecordId && !libraryId) return null;
  return Object.freeze({
    assetType: "map",
    libraryId,
    sourceRecordId: sourceRecordId || libraryId.replace(/^map:/, ""),
    sourceRoomCode: clean(raw.sourceRoomCode || raw.roomCode, 40).toUpperCase(),
    sourceRoomName: clean(raw.sourceRoomName || raw.roomName, 120),
    name: clean(raw.name, 120) || "Encounter Map",
    thumbnailUrl: clean(raw.thumbnailUrl || raw.url || raw.imageUrl, 2048)
  });
}

export function normalizeEncounterCombatant(raw = {}, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  const assetType = clean(source.assetType || source.sourceType, 40).toLowerCase() === "npc" ? "npc" : "monster";
  const sourceRecordId = clean(source.sourceRecordId || source.recordId, 160)
    || clean(source.libraryId, 241).replace(/^[^:]+:/, "");
  return Object.freeze({
    id: safeId(source.id, `combatant-${index + 1}`),
    assetType,
    libraryId: referenceLibraryId(source, assetType),
    sourceRecordId,
    sourceRoomCode: clean(source.sourceRoomCode || source.roomCode, 40).toUpperCase(),
    sourceRoomName: clean(source.sourceRoomName || source.roomName, 120),
    name: clean(source.name, 120) || `${assetType === "npc" ? "NPC" : "Monster"} ${index + 1}`,
    thumbnailUrl: clean(source.thumbnailUrl || source.imageUrl || source.portraitUrl, 2048),
    x: boundedNumber(source.x, 50, 0, 100),
    y: boundedNumber(source.y, 50, 0, 100),
    elevation: Math.round(boundedNumber(source.elevation ?? source.elevationFeet, 0, -1000, 1000)),
    initiativePreset: nullableInteger(source.initiativePreset ?? source.initiative, -999, 999)
  });
}

export function normalizeEncounter(raw = {}, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `encounter-${Date.now()}`,
  now = Date.now()
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const createdAtMillis = Number(source.createdAtMillis) || now;
  const lighting = source.lighting && typeof source.lighting === "object" && !Array.isArray(source.lighting)
    ? clone(source.lighting)
    : {};
  return Object.freeze({
    id: safeId(source.id, idFactory()),
    name: clean(source.name, 120) || "Unnamed Encounter",
    description: clean(source.description, 5000),
    difficulty: clean(source.difficulty, 60),
    notes: clean(source.notes, 12000),
    environment: clean(source.environment, 2000),
    tags: Object.freeze(uniqueList(source.tags)),
    roomCode: clean(source.roomCode, 40).toUpperCase(),
    roomName: clean(source.roomName, 120),
    mapRef: normalizeEncounterMapReference(source.mapRef || source.mapReference || source.map),
    combatants: Object.freeze((Array.isArray(source.combatants) ? source.combatants : []).slice(0, 50)
      .map((entry, index) => normalizeEncounterCombatant(entry, index))),
    lighting: Object.freeze(lighting),
    createdAtMillis,
    updatedAtMillis: Number(source.updatedAtMillis) || now,
    sourceWorkshopAssetId: clean(source.sourceWorkshopAssetId, 200),
    sourceWorkshopVersion: nullableInteger(source.sourceWorkshopVersion, 1, 1000000),
    sourceAuthorUid: clean(source.sourceAuthorUid, 200),
    copiedFromLibraryId: clean(source.copiedFromLibraryId, 241),
    copiedFromEncounterId: clean(source.copiedFromEncounterId, 160)
  });
}

export function validateEncounter(raw = {}) {
  const errors = [];
  if (!clean(raw.name, 120)) errors.push("Give the encounter a name.");
  const combatants = Array.isArray(raw.combatants) ? raw.combatants : [];
  if (combatants.length > 50) errors.push("Encounters can contain at most 50 combatants.");
  const ids = new Set();
  combatants.forEach((entry, index) => {
    const normalized = normalizeEncounterCombatant(entry, index);
    if (!normalized.libraryId || !normalized.sourceRecordId) errors.push(`Combatant ${index + 1} needs a stable Library reference.`);
    if (ids.has(normalized.id)) errors.push("Every encounter combatant needs a unique placement ID.");
    ids.add(normalized.id);
  });
  const map = raw.mapRef || raw.mapReference || raw.map;
  if (map && !normalizeEncounterMapReference(map)) errors.push("The encounter map needs a stable Library reference.");
  return Object.freeze([...new Set(errors)]);
}

export function duplicateEncounter(raw, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `encounter-${Date.now()}`,
  now = Date.now()
} = {}) {
  const encounter = normalizeEncounter(raw, { now });
  return normalizeEncounter({
    ...clone(encounter),
    id: idFactory(),
    name: `${encounter.name} Copy`,
    combatants: encounter.combatants.map((entry, index) => ({ ...entry, id: `${entry.id}-copy-${index + 1}` })),
    copiedFromEncounterId: encounter.id,
    copiedFromLibraryId: `encounter:${encounter.id}`,
    createdAtMillis: now,
    updatedAtMillis: now
  }, { now });
}

export function encounterReferenceFromLibraryRecord(record = {}, overrides = {}) {
  const assetType = record.assetType === "npc" ? "npc" : record.assetType === "map" ? "map" : "monster";
  const base = {
    assetType,
    libraryId: record.libraryId,
    sourceRecordId: record.sourceRecordId,
    sourceRoomCode: record.sourceRoomCode,
    sourceRoomName: record.sourceRoomName,
    name: record.name,
    thumbnailUrl: record.thumbnailUrl,
    ...overrides
  };
  return assetType === "map" ? normalizeEncounterMapReference(base) : normalizeEncounterCombatant(base);
}
