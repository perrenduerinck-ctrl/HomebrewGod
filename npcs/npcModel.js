const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

const uniqueList = (value, maximum = 30, itemMaximum = 120) => [...new Set(
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => clean(entry, itemMaximum))
    .filter(Boolean)
)].slice(0, maximum);

const nullableNumber = (value, { minimum = 0, maximum = 9999, integer = true } = {}) => {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const bounded = Math.max(minimum, Math.min(maximum, number));
  return integer ? Math.round(bounded) : bounded;
};

const safeUrl = (value) => {
  const url = clean(value, 2048);
  return !url || /^https:\/\//i.test(url) ? url : "";
};

const safeId = (value, fallback) => clean(value, 160)
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || clean(fallback, 160);

export const NPC_ABILITY_KEYS = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

export function normalizeNpcKnowledge(raw = {}, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.freeze({
    id: safeId(source.id, `knowledge-${index + 1}`),
    title: clean(source.title, 160) || `Knowledge ${index + 1}`,
    description: clean(source.description, 5000),
    tags: Object.freeze(uniqueList(source.tags, 16, 60).map((tag) => tag.toLowerCase())),
    secret: source.secret === true,
    learnedAt: clean(source.learnedAt, 240)
  });
}

export function normalizeNpcAction(raw = {}, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.freeze({
    id: safeId(source.id, `action-${index + 1}`),
    name: clean(source.name, 120) || `Action ${index + 1}`,
    description: clean(source.description, 4000),
    attackBonus: nullableNumber(source.attackBonus, { minimum: -20, maximum: 30 }),
    damage: clean(source.damage, 160)
  });
}

export function normalizeNpcCombat(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const abilities = Object.fromEntries(NPC_ABILITY_KEYS.map((key) => [
    key,
    nullableNumber(source.abilities?.[key] ?? source[key], { minimum: 1, maximum: 30 }) ?? 10
  ]));
  const hp = nullableNumber(source.hp ?? source.maxHp, { minimum: 1, maximum: 9999 });
  return Object.freeze({
    enabled: source.enabled === true || [source.ac, hp, source.monsterId].some((value) => value !== "" && value != null),
    ac: nullableNumber(source.ac, { minimum: 0, maximum: 99 }),
    hp,
    speed: clean(source.speed, 160),
    abilities: Object.freeze(abilities),
    actions: Object.freeze((Array.isArray(source.actions) ? source.actions : []).slice(0, 30)
      .map((action, index) => normalizeNpcAction(action, index))),
    monsterId: clean(source.monsterId || source.statBlockId, 160)
  });
}

export function normalizeNpc(raw = {}, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `npc-${Date.now()}`,
  now = Date.now()
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const roomCode = clean(source.roomCode, 40).toUpperCase();
  const scope = roomCode ? "campaign" : "personal";
  const createdAtMillis = Number(source.createdAtMillis) || now;
  const knownInformation = clean(source.knownInformation, 8000);
  return Object.freeze({
    id: safeId(source.id, idFactory()),
    name: clean(source.name, 120) || "Unnamed NPC",
    portraitUrl: safeUrl(source.portraitUrl || source.portrait || source.imageUrl),
    description: clean(source.description, 8000),
    species: clean(source.species || source.ancestry, 120),
    ancestry: clean(source.ancestry || source.species, 120),
    gender: clean(source.gender, 80),
    pronouns: clean(source.pronouns, 80),
    age: clean(source.age, 80),
    occupation: clean(source.occupation || source.role, 160),
    role: clean(source.role || source.occupation, 160),
    faction: clean(source.faction, 160),
    alignment: clean(source.alignment, 120),
    disposition: clean(source.disposition, 120),
    location: clean(source.location || source.locationName, 200),
    roomCode,
    roomName: clean(source.roomName || source.campaignName, 120),
    scope,
    notes: clean(source.notes, 12000),
    personality: clean(source.personality, 5000),
    goals: clean(source.goals, 5000),
    fears: clean(source.fears, 5000),
    motivations: clean(source.motivations, 5000),
    secrets: clean(source.secrets, 8000),
    knownInformation,
    tags: Object.freeze(uniqueList(source.tags, 24, 60).map((tag) => tag.toLowerCase())),
    relationshipIds: Object.freeze(uniqueList(source.relationshipIds, 100, 160)),
    factionIds: Object.freeze(uniqueList(source.factionIds, 50, 160)),
    locationId: clean(source.locationId, 160),
    knowledge: Object.freeze((Array.isArray(source.knowledge) ? source.knowledge : []).slice(0, 100)
      .map((entry, index) => normalizeNpcKnowledge(entry, index))),
    combat: normalizeNpcCombat(source.combat || source),
    createdAtMillis,
    updatedAtMillis: Number(source.updatedAtMillis) || now,
    sourceWorkshopAssetId: clean(source.sourceWorkshopAssetId, 200),
    sourceWorkshopVersion: nullableNumber(source.sourceWorkshopVersion, { minimum: 1, maximum: 1000000 }),
    sourceAuthorUid: clean(source.sourceAuthorUid, 200),
    copiedFromLibraryId: clean(source.copiedFromLibraryId, 241),
    copiedFromNpcId: clean(source.copiedFromNpcId, 160)
  });
}

export function validateNpc(raw = {}) {
  const errors = [];
  if (!clean(raw.name, 120)) errors.push("Give the NPC a name.");
  const portrait = clean(raw.portraitUrl || raw.portrait || raw.imageUrl, 2048);
  if (portrait && !/^https:\/\//i.test(portrait)) errors.push("NPC portraits must use an HTTPS URL.");
  const combat = raw.combat || {};
  if (combat.enabled === true && nullableNumber(combat.hp, { minimum: 1, maximum: 9999 }) === null) {
    errors.push("Combat NPCs need hit points.");
  }
  return Object.freeze(errors);
}

export function duplicateNpc(raw, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `npc-${Date.now()}`,
  roomCode,
  roomName
} = {}) {
  const npc = normalizeNpc(raw);
  return normalizeNpc({
    ...clone(npc),
    id: idFactory(),
    name: `${npc.name} Copy`,
    roomCode: roomCode === undefined ? npc.roomCode : roomCode,
    roomName: roomName === undefined ? npc.roomName : roomName,
    copiedFromNpcId: npc.id,
    copiedFromLibraryId: `npc:${npc.id}`,
    createdAtMillis: Date.now(),
    updatedAtMillis: Date.now()
  });
}

export function npcAbilityModifier(score) {
  const modifier = Math.floor(((Number(score) || 10) - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}
