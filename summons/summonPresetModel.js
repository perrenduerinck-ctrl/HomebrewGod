import { normalizeSummonAutomation } from "../vfx/summonAutomation.js";

const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  return Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? Math.round(parsed) : fallback));
};
const safeId = (value, fallback) => clean(value, 160)
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || clean(fallback, 160);
const uniqueList = (value, maximum = 20) => [...new Set(
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => clean(entry, 80).toLowerCase())
    .filter(Boolean)
)].slice(0, maximum);

export function normalizeSummonSource(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const assetType = ["monster", "npc", "character", "custom"].includes(clean(source.assetType || source.sourceType, 40).toLowerCase())
    ? clean(source.assetType || source.sourceType, 40).toLowerCase()
    : "custom";
  const sourceRecordId = clean(source.sourceRecordId || source.recordId || source.id, 160);
  const libraryId = clean(source.libraryId, 241) || (sourceRecordId ? `${assetType}:${sourceRecordId}` : "");
  return Object.freeze({
    assetType,
    libraryId,
    sourceRecordId,
    sourceRoomCode: clean(source.sourceRoomCode || source.roomCode, 40).toUpperCase(),
    sourceRoomName: clean(source.sourceRoomName || source.roomName, 120),
    name: clean(source.name, 120) || "Summoned Token",
    thumbnailUrl: clean(source.thumbnailUrl || source.imageUrl || source.portraitUrl, 2048),
    sizeCategory: clean(source.sizeCategory || source.size, 32).toLowerCase() || "medium",
    tokenType: clean(source.tokenType, 32).toLowerCase() || (assetType === "monster" ? "enemy" : "npc"),
    ac: Number.isFinite(Number(source.ac ?? source.armorClass ?? source.combat?.ac)) ? Math.round(Number(source.ac ?? source.armorClass ?? source.combat?.ac)) : null,
    maxHp: Number.isFinite(Number(source.maxHp ?? source.hp ?? source.combat?.hp)) ? Math.max(1, Math.round(Number(source.maxHp ?? source.hp ?? source.combat?.hp))) : null,
    speed: clean(source.speed || source.combat?.speed, 160),
    combatEnabled: source.combatEnabled === true || source.combat?.enabled === true
  });
}

export function normalizeSummonPreset(raw = {}, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `summon-${Date.now()}`,
  now = Date.now()
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const tokenSource = normalizeSummonSource(source.source || {
    assetType: source.sourceType,
    libraryId: source.sourceLibraryId,
    sourceRecordId: source.sourceRecordId || source.sourceId,
    sourceRoomCode: source.sourceRoomCode,
    sourceRoomName: source.sourceRoomName,
    name: source.sourceName || source.name,
    thumbnailUrl: source.thumbnailUrl || source.imageUrl,
    sizeCategory: source.sizeCategory,
    tokenType: source.tokenType,
    ac: source.ac,
    maxHp: source.maxHp,
    speed: source.speed,
    combatEnabled: source.combatEnabled
  });
  const durationSource = source.duration && typeof source.duration === "object" ? source.duration : {};
  const durationMode = ["permanent", "dismissed", "rounds", "turns", "world-time", "concentration"]
    .includes(clean(durationSource.mode, 40).toLowerCase())
    ? clean(durationSource.mode, 40).toLowerCase()
    : "permanent";
  const worldUnit = ["seconds", "minutes", "hours"].includes(clean(durationSource.unit, 20).toLowerCase())
    ? clean(durationSource.unit, 20).toLowerCase()
    : "minutes";
  const placementSource = source.placement && typeof source.placement === "object" ? source.placement : {};
  const ownershipSource = source.ownership && typeof source.ownership === "object" ? source.ownership : {};
  const initiativeSource = source.initiative && typeof source.initiative === "object" ? source.initiative : { mode: source.initiative };
  const endSource = source.endBehavior && typeof source.endBehavior === "object" ? source.endBehavior : source.onEnd || {};
  const createdAtMillis = Number(source.createdAtMillis) || now;
  return Object.freeze({
    id: safeId(source.id, idFactory()),
    name: clean(source.name, 120) || "Unnamed Summon",
    description: clean(source.description, 2000),
    sourceLibraryId: tokenSource.libraryId,
    source: tokenSource,
    count: boundedInteger(source.count, 1, 1, 20),
    placement: Object.freeze({
      mode: ["target", "caster", "around-target", "around-caster", "manual"].includes(clean(placementSource.mode || source.spawnLocation, 40).toLowerCase())
        ? clean(placementSource.mode || source.spawnLocation, 40).toLowerCase()
        : "target",
      radius: boundedInteger(placementSource.radius, 1, 0, 100),
      userPlaces: placementSource.userPlaces === true || (placementSource.mode || source.spawnLocation) === "manual",
      preventOverlap: placementSource.preventOverlap !== false,
      nearestFree: placementSource.nearestFree !== false,
      allowDmOverride: placementSource.allowDmOverride !== false
    }),
    ownership: Object.freeze({
      mode: ["dm", "caster", "player"].includes(clean(ownershipSource.mode || source.ownership, 40).toLowerCase())
        ? clean(ownershipSource.mode || source.ownership, 40).toLowerCase()
        : "dm",
      playerUid: clean(ownershipSource.playerUid, 180)
    }),
    initiative: Object.freeze({
      mode: ["after-caster", "roll", "shared", "none"].includes(clean(initiativeSource.mode, 40).toLowerCase())
        ? clean(initiativeSource.mode, 40).toLowerCase()
        : "none"
    }),
    duration: Object.freeze({
      mode: durationMode,
      value: ["rounds", "turns", "world-time"].includes(durationMode)
        ? boundedInteger(durationSource.value, 1, 1, 1000000)
        : 1,
      unit: worldUnit
    }),
    endBehavior: Object.freeze({
      mode: ["remove", "dismiss", "leave"].includes(clean(endSource.mode || endSource, 40).toLowerCase())
        ? clean(endSource.mode || endSource, 40).toLowerCase()
        : durationMode === "permanent" ? "leave" : "remove",
      animationId: clean(endSource.animationId || endSource.dismissAnimationId, 180)
    }),
    spawnTiming: ["start", "event", "end"].includes(clean(source.spawnTiming, 20).toLowerCase())
      ? clean(source.spawnTiming, 20).toLowerCase()
      : "event",
    eventName: clean(source.eventName, 80).toLowerCase() || "impact",
    summonAnimationId: clean(source.summonAnimationId, 180),
    tags: Object.freeze(uniqueList(source.tags)),
    createdAtMillis,
    updatedAtMillis: Number(source.updatedAtMillis) || now,
    sourceWorkshopAssetId: clean(source.sourceWorkshopAssetId, 200),
    sourceWorkshopVersion: Math.max(0, Math.trunc(Number(source.sourceWorkshopVersion) || 0)),
    sourceAuthorUid: clean(source.sourceAuthorUid, 200),
    copiedFromLibraryId: clean(source.copiedFromLibraryId, 241),
    copiedFromSummonId: clean(source.copiedFromSummonId, 160)
  });
}

export function validateSummonPreset(raw = {}) {
  const errors = [];
  if (!clean(raw.name, 120)) errors.push("Give the summon preset a name.");
  const source = normalizeSummonSource(raw.source || {
    assetType: raw.sourceType,
    libraryId: raw.sourceLibraryId,
    sourceRecordId: raw.sourceRecordId || raw.sourceId,
    name: raw.sourceName
  });
  if (source.assetType !== "custom" && (!source.libraryId || !source.sourceRecordId)) {
    errors.push("Choose a stable Monster, NPC, or Character Library source.");
  }
  if (source.assetType === "custom" && !clean(source.name, 120)) errors.push("Give the custom summoned token a name.");
  return Object.freeze([...new Set(errors)]);
}

export function duplicateSummonPreset(raw, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `summon-${Date.now()}`,
  now = Date.now()
} = {}) {
  const preset = normalizeSummonPreset(raw, { now });
  return normalizeSummonPreset({
    ...clone(preset),
    id: idFactory(),
    name: `${preset.name} Copy`,
    copiedFromSummonId: preset.id,
    copiedFromLibraryId: `summon:${preset.id}`,
    createdAtMillis: now,
    updatedAtMillis: now
  }, { now });
}

export function summonPresetAutomation(raw = {}, overrides = {}) {
  const preset = normalizeSummonPreset(raw);
  const source = normalizeSummonSource(overrides.source || preset.source);
  const duration = preset.duration.mode === "world-time"
    ? { mode: "world-time", value: preset.duration.value, unit: preset.duration.unit }
    : preset.duration;
  return normalizeSummonAutomation({
    sourceType: source.assetType,
    sourceId: source.sourceRecordId,
    sourceLibraryId: source.libraryId,
    name: source.name,
    imageUrl: source.thumbnailUrl,
    sizeCategory: source.sizeCategory,
    tokenType: source.tokenType,
    ac: source.ac,
    maxHp: source.maxHp,
    speed: source.speed,
    combatEnabled: source.combatEnabled,
    count: preset.count,
    spawnLocation: preset.placement.userPlaces ? "manual" : preset.placement.mode,
    spawnTiming: preset.spawnTiming,
    eventName: preset.eventName,
    ownership: preset.ownership,
    initiative: preset.initiative.mode,
    duration,
    onEnd: { mode: preset.endBehavior.mode, dismissAnimationId: preset.endBehavior.animationId },
    placement: preset.placement
  });
}
