import { SPELL_NAME_LIST } from "./defaultSpellNames.js";
import { SRD_SPELL_DETAILS } from "./defaultSpellDetails.js";

export const DEFAULT_SPELL_SCHEMA_VERSION = 1;

const SPELL_LEVEL_KEYS = Object.freeze([
  "cantrip", "level1", "level2", "level3", "level4",
  "level5", "level6", "level7", "level8", "level9"
]);

const SPELL_LEVELS_BY_KEY = Object.freeze({
  cantrip: 0,
  level1: 1,
  level2: 2,
  level3: 3,
  level4: 4,
  level5: 5,
  level6: 6,
  level7: 7,
  level8: 8,
  level9: 9
});

const normalizeSpellId = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[\u2018\u2019']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const normalizeSpellLevelKey = (value) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value === 0 ? "cantrip" : `level${value}`;
  }

  const raw = String(value || "").trim().toLowerCase();

  if (["cantrip", "cantrips", "level0", "0"].includes(raw)) {
    return "cantrip";
  }

  const numericLevel = raw.match(/\d+/)?.[0];
  return numericLevel ? `level${Number(numericLevel)}` : raw;
};

const freezeRecordArray = (value) => Object.freeze(
  Array.isArray(value)
    ? value.map((entry) => entry && typeof entry === "object"
      ? Object.freeze({ ...entry })
      : entry)
    : []
);

const normalizeSpellComponents = (components = {}) => {
  const raw = components && typeof components === "object" ? components : {};
  const letters = Array.isArray(raw.componentLetters)
    ? raw.componentLetters.map((value) => String(value || "").toUpperCase())
    : [];

  return Object.freeze({
    verbal: raw.verbal === true || letters.includes("V"),
    somatic: raw.somatic === true || letters.includes("S"),
    material: raw.material === true || letters.includes("M"),
    materialText: String(raw.materialText || raw.material || "").trim()
  });
};

const firstSentence = (value, fallback = "Spell details are available below.") => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  const match = text.match(/^(.{1,220}?[.!?])(?:\s|$)/);
  return match ? match[1] : `${text.slice(0, 217)}${text.length > 217 ? "..." : ""}`;
};

// The 2014 Artificer is not part of SRD 5.1, so the SRD dataset cannot tag
// those class-list entries itself. This local list adds the overlapping SRD
// spells without changing the spell rules text.
const ARTIFICER_SPELL_IDS = new Set([
  "acid-splash", "create-bonfire", "dancing-lights", "fire-bolt", "frostbite",
  "green-flame-blade", "guidance", "light", "lightning-lure", "mage-hand",
  "magic-stone", "mending", "message", "poison-spray", "prestidigitation",
  "ray-of-frost", "resistance", "shocking-grasp", "spare-the-dying",
  "sword-burst", "thorn-whip", "thunderclap", "alarm", "cure-wounds",
  "detect-magic", "disguise-self", "expeditious-retreat", "faerie-fire",
  "false-life", "feather-fall", "grease", "identify", "jump", "longstrider",
  "purify-food-and-drink", "sanctuary", "aid", "alter-self", "arcane-lock",
  "blur", "continual-flame", "darkvision", "enhance-ability", "enlarge-reduce",
  "heat-metal", "invisibility", "lesser-restoration", "levitate", "magic-mouth",
  "magic-weapon", "protection-from-poison", "rope-trick", "see-invisibility",
  "spider-climb", "web", "blink", "create-food-and-water", "dispel-magic",
  "fly", "glyph-of-warding", "haste", "protection-from-energy", "revivify",
  "water-breathing", "water-walk", "arcane-eye", "fabricate",
  "freedom-of-movement", "secret-chest", "faithful-hound", "private-sanctum",
  "resilient-sphere", "stone-shape", "stoneskin", "animate-objects",
  "arcane-hand", "creation", "greater-restoration", "wall-of-stone"
]);

const EXTRA_CANTRIP_DETAILS = [
  {
    id: "blade-ward", name: "Blade Ward", school: "abjuration",
    castingTime: "1 action", range: "Self", componentLetters: ["V", "S"],
    duration: "1 round", classes: ["bard", "sorcerer", "wizard"],
    description: "Trace a protective sign. Until the end of your next turn, you have resistance to bludgeoning, piercing, and slashing damage dealt by weapon attacks."
  },
  {
    id: "booming-blade", name: "Booming Blade", school: "evocation",
    castingTime: "1 action", range: "Self (5-foot radius)", componentLetters: ["S", "M"],
    material: "A melee weapon worth at least 1 sp.", duration: "1 round",
    classes: ["sorcerer", "warlock", "wizard", "artificer"], attackType: "melee",
    description: "Make one melee weapon attack against a creature within 5 feet. On a hit, the attack has its normal effects and the target is sheathed in booming energy until your next turn; if it willingly moves 5 feet or more before then, it takes thunder damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "control-flames", name: "Control Flames", school: "transmutation",
    castingTime: "1 action", range: "60 feet", componentLetters: ["S"],
    duration: "Instantaneous or 1 hour", classes: ["druid", "sorcerer", "wizard"],
    description: "Choose a nonmagical flame that fits inside a 5-foot cube. You can expand or extinguish it, move it to nearby fuel, alter its light, or create simple shapes within it. Up to three non-instantaneous effects can be active at once."
  },
  {
    id: "create-bonfire", name: "Create Bonfire", school: "conjuration",
    castingTime: "1 action", range: "60 feet", componentLetters: ["V", "S"],
    duration: "Concentration, up to 1 minute", concentration: true,
    classes: ["druid", "sorcerer", "warlock", "wizard", "artificer"], saveAbility: "dex",
    description: "Create a bonfire in a 5-foot cube on the ground. A creature in its space when it appears, that enters it, or that ends its turn there must make a Dexterity save or take fire damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "encode-thoughts", name: "Encode Thoughts", school: "enchantment",
    castingTime: "1 action", range: "Self", componentLetters: ["S"],
    duration: "Up to 8 hours", classes: ["wizard"],
    description: "Pull a memory, idea, or message from your mind and turn it into a visible thought strand. A creature can receive the strand's contents through this spell or another suitable mind-reading effect."
  },
  {
    id: "friends", name: "Friends", school: "enchantment",
    castingTime: "1 action", range: "Self", componentLetters: ["S", "M"],
    material: "A small amount of makeup applied while casting.",
    duration: "Concentration, up to 1 minute", concentration: true,
    classes: ["bard", "sorcerer", "warlock", "wizard"],
    description: "For the duration, you have advantage on Charisma checks directed at one creature that is not hostile toward you. When the spell ends, that creature realizes magic influenced its mood and may become hostile."
  },
  {
    id: "frostbite", name: "Frostbite", school: "evocation",
    castingTime: "1 action", range: "60 feet", componentLetters: ["V", "S"],
    duration: "Instantaneous", classes: ["druid", "sorcerer", "warlock", "wizard", "artificer"], saveAbility: "con",
    description: "One creature makes a Constitution save. On a failure it takes cold damage and has disadvantage on the next weapon attack roll it makes before the end of its next turn. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "green-flame-blade", name: "Green-Flame Blade", school: "evocation",
    castingTime: "1 action", range: "Self (5-foot radius)", componentLetters: ["S", "M"],
    material: "A melee weapon worth at least 1 sp.", duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"], attackType: "melee",
    description: "Make one melee weapon attack against a creature within 5 feet. On a hit, the attack has its normal effects and green fire leaps to another creature you choose within 5 feet of the target. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "gust", name: "Gust", school: "transmutation", castingTime: "1 action",
    range: "30 feet", componentLetters: ["V", "S"], duration: "Instantaneous",
    classes: ["druid", "sorcerer", "wizard"], saveAbility: "str",
    description: "Create a small blast of air that can push a Medium or smaller creature 5 feet on a failed Strength save, move an unattended light object, or produce a harmless sensory air effect."
  },
  {
    id: "infestation", name: "Infestation", school: "conjuration", castingTime: "1 action",
    range: "30 feet", componentLetters: ["V", "S", "M"], material: "A living flea.",
    duration: "Instantaneous", classes: ["druid", "sorcerer", "warlock", "wizard"], saveAbility: "con",
    description: "A creature makes a Constitution save. On a failure it takes poison damage and moves 5 feet in a randomly determined direction if it can move. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "lightning-lure", name: "Lightning Lure", school: "evocation", castingTime: "1 action",
    range: "Self (15-foot radius)", componentLetters: ["V"], duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"], saveAbility: "str",
    description: "One creature you can see within 15 feet makes a Strength save. On a failure it is pulled up to 10 feet toward you and takes lightning damage if it ends within 5 feet of you. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "magic-stone", name: "Magic Stone", school: "transmutation", castingTime: "1 bonus action",
    range: "Touch", componentLetters: ["V", "S"], duration: "1 minute",
    classes: ["druid", "warlock", "artificer"], attackType: "ranged",
    description: "Imbue one to three pebbles with magic. A creature can make a ranged spell attack with one pebble, dealing bludgeoning damage using your spellcasting ability. Casting the spell again ends the magic on earlier pebbles."
  },
  {
    id: "mind-sliver", name: "Mind Sliver", school: "enchantment", castingTime: "1 action",
    range: "60 feet", componentLetters: ["V"], duration: "1 round",
    classes: ["sorcerer", "warlock", "wizard"], saveAbility: "int",
    description: "One creature makes an Intelligence save. On a failure it takes psychic damage and subtracts 1d4 from the next saving throw it makes before the end of your next turn. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "mold-earth", name: "Mold Earth", school: "transmutation", castingTime: "1 action",
    range: "30 feet", componentLetters: ["S"], duration: "Instantaneous or 1 hour",
    classes: ["druid", "sorcerer", "wizard"],
    description: "Choose loose earth or stone within a 5-foot cube. You can excavate it, create shapes or colors, or make the ground difficult or normal terrain. Up to two non-instantaneous effects can be active at once."
  },
  {
    id: "primal-savagery", name: "Primal Savagery", school: "transmutation", castingTime: "1 action",
    range: "Self", componentLetters: ["S"], duration: "Instantaneous", classes: ["druid"], attackType: "melee",
    description: "Your teeth or fingernails become corrosive natural weapons for one melee spell attack against a creature within 5 feet. On a hit, the target takes acid damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "sapping-sting", name: "Sapping Sting", school: "necromancy", castingTime: "1 action",
    range: "30 feet", componentLetters: ["V", "S"], duration: "Instantaneous", classes: ["wizard"], saveAbility: "con",
    description: "One creature makes a Constitution save. On a failure it takes necrotic damage and falls prone. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "shape-water", name: "Shape Water", school: "transmutation", castingTime: "1 action",
    range: "30 feet", componentLetters: ["S"], duration: "Instantaneous or 1 hour",
    classes: ["druid", "sorcerer", "wizard"],
    description: "Manipulate water within a 5-foot cube: move it, form simple shapes, change its color or opacity, or freeze it if no creature is inside. Up to two non-instantaneous effects can be active at once."
  },
  {
    id: "sword-burst", name: "Sword Burst", school: "conjuration", castingTime: "1 action",
    range: "Self (5-foot radius)", componentLetters: ["V"], duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"], saveAbility: "dex",
    description: "Spectral blades sweep around you. Each other creature within 5 feet makes a Dexterity save, taking force damage on a failure. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "thunderclap", name: "Thunderclap", school: "evocation", castingTime: "1 action",
    range: "Self (5-foot radius)", componentLetters: ["S"], duration: "Instantaneous",
    classes: ["bard", "druid", "sorcerer", "warlock", "wizard", "artificer"], saveAbility: "con",
    description: "A burst of thunder is audible 100 feet away. Each other creature within 5 feet makes a Constitution save, taking thunder damage on a failure. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "toll-the-dead", name: "Toll the Dead", school: "necromancy", castingTime: "1 action",
    range: "60 feet", componentLetters: ["V", "S"], duration: "Instantaneous",
    classes: ["cleric", "warlock", "wizard"], saveAbility: "wis",
    description: "One creature makes a Wisdom save. On a failure it takes necrotic damage, using a larger damage die if it is missing any hit points. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "word-of-radiance", name: "Word of Radiance", school: "evocation", castingTime: "1 action",
    range: "Self (5-foot radius)", componentLetters: ["V", "M"], material: "A holy symbol.",
    duration: "Instantaneous", classes: ["cleric"], saveAbility: "con",
    description: "Each creature you choose within 5 feet makes a Constitution save, taking radiant damage on a failure. Damage increases at character levels 5, 11, and 17."
  }
];

const createPlaceholderSpell = (name, levelKey) => {
  const level = SPELL_LEVELS_BY_KEY[normalizeSpellLevelKey(levelKey)];
  return {
    id: normalizeSpellId(name),
    name: String(name || "").trim(),
    level,
    description: `${name} is listed in the local spell catalog, but its rules details have not been supplied.`,
    source: "name-list"
  };
};

const normalizeDetailedSpell = (rawSpell) => {
  const raw = rawSpell || {};
  const id = normalizeSpellId(raw.id || raw.name);
  const level = Math.max(0, Math.min(9, Number(raw.level) || 0));
  const levelKey = normalizeSpellLevelKey(level);
  const classes = [...new Set([
    ...(Array.isArray(raw.classes) ? raw.classes : []),
    ...(ARTIFICER_SPELL_IDS.has(id) ? ["artificer"] : [])
  ].map(normalizeSpellId).filter(Boolean))];
  const damageRecord = raw.damage && typeof raw.damage === "object"
    ? {
        damageType: normalizeSpellId(raw.damage.damage_type?.index || raw.damage.damageType),
        atCharacterLevel: { ...(raw.damage.damage_at_character_level || raw.damage.atCharacterLevel || {}) },
        atSlotLevel: { ...(raw.damage.damage_at_slot_level || raw.damage.atSlotLevel || {}) }
      }
    : null;
  const healingBySlotLevel = raw.healingBySlotLevel && typeof raw.healingBySlotLevel === "object"
    ? { ...raw.healingBySlotLevel }
    : {};
  const description = String(raw.description || "").trim();
  const higherLevelDescription = String(raw.higherLevel || "").trim();
  const effects = [];

  if (damageRecord && (damageRecord.damageType || Object.keys(damageRecord.atCharacterLevel).length || Object.keys(damageRecord.atSlotLevel).length)) {
    effects.push({ type: "damage", ...damageRecord });
  }
  if (Object.keys(healingBySlotLevel).length) {
    effects.push({ type: "healing", atSlotLevel: healingBySlotLevel });
  }
  if (raw.saveAbility) {
    effects.push({ type: "saving-throw", ability: normalizeSpellId(raw.saveAbility), success: String(raw.saveSuccess || "") });
  }
  if (raw.areaOfEffect && typeof raw.areaOfEffect === "object") {
    effects.push({ type: "area", ...raw.areaOfEffect });
  }

  const components = normalizeSpellComponents(raw);
  const tags = [
    raw.school,
    raw.ritual ? "ritual" : "",
    raw.concentration ? "concentration" : "",
    raw.attackType ? "spell-attack" : "",
    raw.saveAbility ? "saving-throw" : "",
    damageRecord?.damageType || "",
    Object.keys(healingBySlotLevel).length ? "healing" : ""
  ].map(normalizeSpellId).filter(Boolean);

  return Object.freeze({
    schemaVersion: DEFAULT_SPELL_SCHEMA_VERSION,
    id,
    name: String(raw.name || "").trim(),
    source: String(raw.source || (SRD_SPELL_DETAILS.includes(raw) ? "SRD 5.1 (CC BY 4.0)" : "Homebrew God core catalog")),
    summary: String(raw.summary || firstSentence(description)).trim(),
    description,
    higherLevelDescription,
    level,
    levelKey,
    school: normalizeSpellId(raw.school),
    castingTime: String(raw.castingTime || "").trim(),
    range: String(raw.range || "").trim(),
    components,
    duration: String(raw.duration || "").trim(),
    concentration: raw.concentration === true,
    ritual: raw.ritual === true,
    classes: Object.freeze(classes),
    subclasses: Object.freeze((Array.isArray(raw.subclasses) ? raw.subclasses : []).map(normalizeSpellId).filter(Boolean)),
    attackType: normalizeSpellId(raw.attackType),
    saveAbility: normalizeSpellId(raw.saveAbility),
    damage: damageRecord ? freezeRecordArray([damageRecord]) : Object.freeze([]),
    healing: Object.keys(healingBySlotLevel).length
      ? freezeRecordArray([{ atSlotLevel: healingBySlotLevel }])
      : Object.freeze([]),
    scaling: Object.freeze({
      higherLevelDescription,
      atCharacterLevel: Object.freeze({ ...(damageRecord?.atCharacterLevel || {}) }),
      atSlotLevel: Object.freeze({ ...(damageRecord?.atSlotLevel || {}) }),
      healingAtSlotLevel: Object.freeze(healingBySlotLevel)
    }),
    effects: freezeRecordArray(effects),
    tags: Object.freeze([...new Set(tags)]),
    areaOfEffect: raw.areaOfEffect && typeof raw.areaOfEffect === "object"
      ? Object.freeze({ ...raw.areaOfEffect })
      : null
  });
};

const buildDefaultSpells = () => {
  const detailedById = new Map(
    [...SRD_SPELL_DETAILS, ...EXTRA_CANTRIP_DETAILS]
      .map((spell) => [normalizeSpellId(spell.id || spell.name), spell])
  );
  const catalog = [];

  SPELL_LEVEL_KEYS.forEach((levelKey) => {
    const names = Array.isArray(SPELL_NAME_LIST[levelKey]) ? SPELL_NAME_LIST[levelKey] : [];
    names.forEach((name) => {
      const id = normalizeSpellId(name);
      catalog.push(normalizeDetailedSpell(
        detailedById.get(id) || createPlaceholderSpell(name, levelKey)
      ));
      detailedById.delete(id);
    });
  });

  detailedById.forEach((spell) => catalog.push(normalizeDetailedSpell(spell)));

  return catalog.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
};

export function validateDefaultSpellCollection(spells) {
  const errors = [];
  if (!Array.isArray(spells)) return { valid: false, errors: ["Spell collection must be an array."] };

  const spellIds = new Set();
  spells.forEach((spell, index) => {
    const label = `Spell ${index + 1}`;
    const id = normalizeSpellId(spell?.id || spell?.name);
    const levelKey = normalizeSpellLevelKey(spell?.levelKey);
    if (!spell || typeof spell !== "object") return errors.push(`${label} must be an object.`);
    if (spell.schemaVersion !== DEFAULT_SPELL_SCHEMA_VERSION) errors.push(`${label} must use schema version ${DEFAULT_SPELL_SCHEMA_VERSION}.`);
    if (!id) errors.push(`${label} is missing an id.`);
    else if (spellIds.has(id)) errors.push(`${label} duplicates spell id "${id}".`);
    else spellIds.add(id);
    if (!String(spell.name || "").trim()) errors.push(`${label} is missing a name.`);
    if (!String(spell.source || "").trim()) errors.push(`${label} is missing a source.`);
    if (!String(spell.summary || "").trim()) errors.push(`${label} is missing a summary.`);
    if (!String(spell.description || "").trim()) errors.push(`${label} is missing a description.`);
    if (!SPELL_LEVEL_KEYS.includes(levelKey)) errors.push(`${label} has an invalid levelKey.`);
    if (!Number.isInteger(spell.level) || spell.level < 0 || spell.level > 9) errors.push(`${label} must have a level from 0 to 9.`);
    else if (SPELL_LEVELS_BY_KEY[levelKey] !== spell.level) errors.push(`${label} level does not match levelKey.`);
    if (!spell.components || typeof spell.components !== "object" || Array.isArray(spell.components)) errors.push(`${label} components must be an object.`);
    if (!Array.isArray(spell.classes)) errors.push(`${label} classes must be an array.`);
    if (!Array.isArray(spell.subclasses)) errors.push(`${label} subclasses must be an array.`);
    if (!Array.isArray(spell.damage)) errors.push(`${label} damage must be an array.`);
    if (!Array.isArray(spell.healing)) errors.push(`${label} healing must be an array.`);
    if (!spell.scaling || typeof spell.scaling !== "object" || Array.isArray(spell.scaling)) errors.push(`${label} scaling must be an object.`);
    if (!Array.isArray(spell.effects)) errors.push(`${label} effects must be an array.`);
    if (!Array.isArray(spell.tags)) errors.push(`${label} tags must be an array.`);
  });

  return { valid: errors.length === 0, errors };
}

export const DEFAULT_SPELLS = Object.freeze(buildDefaultSpells());
const defaultSpellValidation = validateDefaultSpellCollection(DEFAULT_SPELLS);

if (!defaultSpellValidation.valid) {
  throw new Error(`Invalid default spell data: ${defaultSpellValidation.errors.join(" ")}`);
}

export const DEFAULT_SPELL_MAP = Object.freeze(
  Object.fromEntries(DEFAULT_SPELLS.map((spell) => [spell.id, spell]))
);

export function getDefaultSpellById(spellId) {
  return DEFAULT_SPELL_MAP[normalizeSpellId(spellId)] || null;
}

export function getDefaultSpellsByLevel(levelKey) {
  const normalizedLevelKey = normalizeSpellLevelKey(levelKey);
  return DEFAULT_SPELLS.filter((spell) => spell.levelKey === normalizedLevelKey);
}
