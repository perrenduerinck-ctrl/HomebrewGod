const clean = (value, maximum = 120) => String(value ?? "").trim().slice(0, maximum);

const list = (value, maximum = 20) => {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(source.map((entry) => clean(entry, 80)).filter(Boolean))].slice(0, maximum);
};

const action = (id, label) => Object.freeze({ id, label });
const filter = (id, label, options = []) => Object.freeze({ id, label, options: Object.freeze(options) });

const definitions = [
  {
    id: "monster", label: "Monsters", singular: "Monster", icon: "🐉", preview: "monster",
    filters: [filter("cr", "CR"), filter("size", "Size"), filter("creatureType", "Creature Type")],
    quickActions: [action("edit-copy", "Edit Copy"), action("create-token", "Create Map Token"), action("add-to-encounter", "Add to Encounter")],
    metadata(content = {}) {
      return { cr: clean(content.cr, 24), size: clean(content.size, 40), creatureType: clean(content.type || content.creatureType, 80) };
    },
    card(asset) {
      return [asset.typeMetadata?.cr ? `CR ${asset.typeMetadata.cr}` : "", asset.typeMetadata?.size, asset.typeMetadata?.creatureType].filter(Boolean).join(" · ");
    }
  },
  {
    id: "magic-item", label: "Magic Items", singular: "Magic Item", icon: "⚔️", group: "item", preview: "card",
    filters: [filter("itemType", "Item Type"), filter("rarity", "Rarity"), filter("attunement", "Attunement", [["required", "Required"], ["not-required", "Not Required"]])],
    quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")],
    metadata(content = {}) {
      return { itemType: clean(content.itemType || content.type, 80), rarity: clean(content.rarity, 40), attunement: Boolean(content.attunement || content.requiresAttunement) };
    },
    card(asset) { return [asset.typeMetadata?.rarity, asset.typeMetadata?.itemType].filter(Boolean).join(" · "); }
  },
  {
    id: "weapon", label: "Weapons", singular: "Weapon", icon: "🗡️", group: "item", preview: "card",
    filters: [filter("itemType", "Weapon Type"), filter("rarity", "Rarity"), filter("attunement", "Attunement", [["required", "Required"], ["not-required", "Not Required"]])],
    quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")],
    metadata(content = {}) { return { itemType: clean(content.itemType || content.type || "Weapon", 80), rarity: clean(content.rarity, 40), attunement: Boolean(content.attunement || content.requiresAttunement) }; },
    card(asset) { return [asset.typeMetadata?.rarity, asset.typeMetadata?.itemType].filter(Boolean).join(" · "); }
  },
  {
    id: "armor", label: "Armor", singular: "Armor", icon: "🛡️", group: "item", preview: "card",
    filters: [filter("itemType", "Armor Type"), filter("rarity", "Rarity"), filter("attunement", "Attunement", [["required", "Required"], ["not-required", "Not Required"]])],
    quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")],
    metadata(content = {}) { return { itemType: clean(content.itemType || content.type || "Armor", 80), rarity: clean(content.rarity, 40), attunement: Boolean(content.attunement || content.requiresAttunement) }; },
    card(asset) { return [asset.typeMetadata?.rarity, asset.typeMetadata?.itemType].filter(Boolean).join(" · "); }
  },
  {
    id: "spell", label: "Spells", singular: "Spell", icon: "📜", preview: "card",
    filters: [filter("level", "Level"), filter("school", "School"), filter("className", "Class"), filter("damageType", "Damage Type")],
    quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character"), action("assign-animation", "Assign Animation")],
    metadata(content = {}) {
      return { level: clean(content.level ?? content.spellLevel, 12), school: clean(content.school, 80), classNames: list(content.classes || content.classNames), damageType: clean(content.damageType || content.damage?.type, 60) };
    },
    card(asset) { return [asset.typeMetadata?.level !== "" ? `Level ${asset.typeMetadata?.level}` : "", asset.typeMetadata?.school].filter(Boolean).join(" · "); }
  },
  {
    id: "animation", label: "Animations", singular: "Animation", icon: "✨", preview: "animation",
    filters: [filter("family", "Family"), filter("style", "Style")],
    quickActions: [action("edit-copy", "Edit Copy"), action("assign-animation", "Assign to Action / Spell")],
    metadata(content = {}) { return { family: clean(content.family || content.type, 60), style: clean(content.style, 60) }; },
    card(asset) { return [asset.typeMetadata?.family, asset.typeMetadata?.style].filter(Boolean).join(" · "); }
  },
  {
    id: "npc", label: "NPCs", singular: "NPC", icon: "🧙", preview: "card",
    filters: [filter("creatureType", "Creature Type"), filter("role", "Role")],
    quickActions: [action("edit-copy", "Edit"), action("duplicate", "Duplicate"), action("copy-to-current-room", "Copy to Campaign"), action("create-token", "Create Token")],
    metadata(content = {}) { return { creatureType: clean(content.type || content.species, 80), role: clean(content.role || content.occupation, 80), disposition: clean(content.disposition, 80), combatEnabled: content.combat?.enabled === true }; },
    card(asset) { return [asset.typeMetadata?.creatureType, asset.typeMetadata?.role].filter(Boolean).join(" · "); }
  },
  {
    id: "map", label: "Maps", singular: "Map", icon: "🗺️", preview: "image",
    filters: [filter("mapType", "Map Type")],
    quickActions: [action("edit-copy", "Edit Copy"), action("use-map", "Use on Battle Map")],
    metadata(content = {}) { return { mapType: clean(content.mapType || content.type, 80), width: Number(content.width) || 0, height: Number(content.height) || 0 }; },
    card(asset) { const meta = asset.typeMetadata || {}; return [meta.mapType, meta.width && meta.height ? `${meta.width}×${meta.height}` : ""].filter(Boolean).join(" · "); }
  },
  {
    id: "encounter", label: "Encounters", singular: "Encounter", icon: "🎲", preview: "card",
    filters: [filter("difficulty", "Difficulty")], quickActions: [action("edit-copy", "Edit"), action("duplicate", "Duplicate"), action("use-encounter", "Load Encounter")],
    metadata(content = {}) { return { difficulty: clean(content.difficulty, 60), combatantCount: Math.max(0, Math.min(50, Number(content.combatants?.length) || 0)), mapName: clean(content.mapRef?.name, 120) }; },
    card(asset) { return [asset.typeMetadata?.difficulty, asset.typeMetadata?.combatantCount ? `${asset.typeMetadata.combatantCount} combatants` : "", asset.typeMetadata?.mapName].filter(Boolean).join(" · "); }
  },
  {
    id: "summon", label: "Summons", singular: "Summon", icon: "🜲", preview: "card",
    filters: [filter("sourceType", "Token Source")], quickActions: [action("edit-copy", "Edit Copy"), action("use-summon", "Use in Spell / Ability")],
    metadata(content = {}) { return { sourceType: clean(content.sourceType || content.tokenSource, 60), count: Math.max(1, Math.min(20, Math.trunc(Number(content.count) || 1))) }; },
    card(asset) { return [asset.typeMetadata?.sourceType, asset.typeMetadata?.count > 1 ? `×${asset.typeMetadata.count}` : ""].filter(Boolean).join(" · "); }
  },
  { id: "feat", label: "Feats", singular: "Feat", icon: "◆", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")] },
  { id: "class", label: "Classes", singular: "Class", icon: "🏛️", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")] },
  { id: "subclass", label: "Subclasses", singular: "Subclass", icon: "🏷️", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")] },
  { id: "background", label: "Backgrounds", singular: "Background", icon: "🧭", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")] },
  { id: "species", label: "Species", singular: "Species", icon: "🧬", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("add-to-character", "Add to Character")] },
  { id: "condition", label: "Conditions", singular: "Condition", icon: "◈", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("use-effect", "Use Effect")] },
  { id: "effect", label: "Effects", singular: "Effect", icon: "✦", preview: "card", filters: [], quickActions: [action("edit-copy", "Edit Copy"), action("use-effect", "Use Effect")] },
  { id: "other", label: "Other", singular: "Other", icon: "✦", preview: "structured", filters: [], quickActions: [action("edit-copy", "Edit Copy")] }
];

function freezeDefinition(definition) {
  return Object.freeze({
    group: definition.group || definition.id,
    metadata: () => ({}),
    card: () => "",
    ...definition,
    filters: Object.freeze([...(definition.filters || [])]),
    quickActions: Object.freeze([...(definition.quickActions || [])])
  });
}

export function createWorkshopTypeRegistry(extensions = []) {
  const byId = new Map();
  for (const entry of [...definitions, ...(Array.isArray(extensions) ? extensions : [])]) {
    const normalized = freezeDefinition(entry);
    byId.set(normalized.id, normalized);
  }
  const values = [...byId.values()];
  const fallback = byId.get("other");
  return Object.freeze({
    list: () => [...values],
    get: (id) => byId.get(String(id || "")) || fallback,
    has: (id) => byId.has(String(id || "")),
    ids: () => values.map((entry) => entry.id)
  });
}

export const WORKSHOP_TYPE_REGISTRY = createWorkshopTypeRegistry();
export const WORKSHOP_ASSET_TYPES = Object.freeze(WORKSHOP_TYPE_REGISTRY.ids());

export const WORKSHOP_TYPE_FILTERS = Object.freeze([
  ["monster", "Monsters"], ["item", "Items"], ["spell", "Spells"], ["animation", "Animations"],
  ["npc", "NPCs"], ["map", "Maps"], ["encounter", "Encounters"], ["summon", "Summons"],
  ["feat", "Feats"], ["class", "Classes"], ["subclass", "Subclasses"], ["background", "Backgrounds"],
  ["species", "Species"], ["condition", "Conditions"], ["effect", "Effects"], ["other", "Other"]
].map((entry) => Object.freeze(entry)));

export function getWorkshopTypeDefinition(assetType) {
  return WORKSHOP_TYPE_REGISTRY.get(assetType);
}

export function matchesWorkshopType(assetType, selectedType) {
  const selected = clean(selectedType, 80);
  if (!selected) return true;
  const definition = getWorkshopTypeDefinition(assetType);
  return definition.id === selected || definition.group === selected;
}

export function createWorkshopTypeMetadata(assetType, content = {}, provided = {}) {
  const definition = getWorkshopTypeDefinition(assetType);
  const extras = {};
  if (provided && typeof provided === "object" && !Array.isArray(provided)) {
    for (const [rawKey, rawValue] of Object.entries(provided).slice(0, 24)) {
      const key = clean(rawKey, 60);
      if (!key) continue;
      if (Array.isArray(rawValue)) extras[key] = list(rawValue);
      else if (typeof rawValue === "boolean") extras[key] = rawValue;
      else if (typeof rawValue === "number" && Number.isFinite(rawValue)) extras[key] = rawValue;
      else extras[key] = clean(rawValue, 120);
    }
  }
  return Object.freeze({ ...definition.metadata(content), ...extras });
}

export function getWorkshopCardTypeSummary(asset) {
  return getWorkshopTypeDefinition(asset?.assetType).card(asset || {});
}
