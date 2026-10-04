const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);

const safeId = (value, fallback) => clean(value, 160)
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || clean(fallback, 160);

const uniqueList = (value, maximum = 20, itemMaximum = 60) => [...new Set(
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => clean(entry, itemMaximum).toLowerCase())
    .filter(Boolean)
)].slice(0, maximum);

const score = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(100, number))) : fallback;
};

export const NPC_RELATIONSHIP_TYPES = Object.freeze([
  "Friend", "Ally", "Enemy", "Rival", "Family", "Lover", "Employer", "Employee",
  "Leader", "Follower", "Contact", "Knows", "Distrusts", "Owes", "Custom"
]);

export const NPC_RELATIONSHIP_DIRECTIONS = Object.freeze(["directed", "mutual"]);

export function normalizeNpcRelationship(raw = {}, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `relationship-${Date.now()}`,
  now = Date.now()
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const relationshipType = NPC_RELATIONSHIP_TYPES.includes(source.relationshipType)
    ? source.relationshipType
    : "Knows";
  const direction = NPC_RELATIONSHIP_DIRECTIONS.includes(source.direction)
    ? source.direction
    : "directed";
  return Object.freeze({
    id: safeId(source.id, idFactory()),
    sourceNpcId: clean(source.sourceNpcId, 160),
    targetNpcId: clean(source.targetNpcId, 160),
    relationshipType,
    direction,
    trust: score(source.trust, 50),
    hostility: score(source.hostility, 0),
    notes: clean(source.notes, 5000),
    tags: Object.freeze(uniqueList(source.tags)),
    createdAtMillis: Number(source.createdAtMillis) || now,
    updatedAtMillis: Number(source.updatedAtMillis) || now
  });
}

export function validateNpcRelationship(raw = {}) {
  const errors = [];
  const sourceNpcId = clean(raw.sourceNpcId, 160);
  const targetNpcId = clean(raw.targetNpcId, 160);
  if (!sourceNpcId) errors.push("Choose a source NPC.");
  if (!targetNpcId) errors.push("Choose a target NPC.");
  if (sourceNpcId && sourceNpcId === targetNpcId) errors.push("A relationship needs two different NPCs.");
  if (raw.relationshipType && !NPC_RELATIONSHIP_TYPES.includes(raw.relationshipType)) errors.push("Choose a valid relationship type.");
  if (raw.direction && !NPC_RELATIONSHIP_DIRECTIONS.includes(raw.direction)) errors.push("Choose a valid relationship direction.");
  return Object.freeze(errors);
}

export function relationshipLabel(raw = {}, npcById = new Map()) {
  const relationship = normalizeNpcRelationship(raw);
  const source = npcById.get(relationship.sourceNpcId)?.name || "Unknown NPC";
  const target = npcById.get(relationship.targetNpcId)?.name || "Unknown NPC";
  return `${source} ${relationship.direction === "mutual" ? "↔" : "→"} ${target}: ${relationship.relationshipType}`;
}
