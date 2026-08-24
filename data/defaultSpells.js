import { SPELL_NAME_LIST } from "./defaultSpellNames.js";
import { SRD_SPELL_DETAILS } from "./defaultSpellDetails.js";
import {
  createSpellTargetingData,
  validateSpellTargetingData
} from "./spellTargeting.js";
import {
  ACTIVE_RULESET,
  getLegacy2014Metadata
} from "./ruleset2014.js?v=phase15-20260726";

export const DEFAULT_SPELL_SCHEMA_VERSION = 2;
export const SRD_SPELL_COUNT_2014 = 319;
export const ADDITIONAL_CANTRIP_COUNT_2014 = 21;

const SPELL_SCHOOLS = Object.freeze([
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation"
]);

const SPELL_CLASS_IDS = Object.freeze([
  "artificer",
  "bard",
  "cleric",
  "druid",
  "paladin",
  "ranger",
  "sorcerer",
  "warlock",
  "wizard"
]);

const SPELL_ATTACK_TYPES = Object.freeze([
  "",
  "melee",
  "ranged",
  "melee-weapon",
  "ranged-weapon"
]);

const SPELL_SAVE_ABILITIES = Object.freeze([
  "",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha"
]);

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
    id: "blade-ward",
    name: "Blade Ward",
    school: "abjuration",
    castingTime: "1 action",
    range: "Self",
    componentLetters: ["V", "S"],
    duration: "1 round",
    classes: ["bard", "sorcerer", "warlock", "wizard"],
    description:
      "Trace a protective sign. Until the end of your next turn, you have resistance to bludgeoning, piercing, and slashing damage dealt by weapon attacks."
  },
  {
    id: "booming-blade",
    name: "Booming Blade",
    school: "evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    componentLetters: ["S", "M"],
    material: "A melee weapon worth at least 1 sp.",
    duration: "1 round",
    classes: ["sorcerer", "warlock", "wizard", "artificer"],
    attackType: "melee-weapon",
    damage: {
      damageType: "thunder",
      atCharacterLevel: {
        "1": "1d8 on willing movement",
        "5": "1d8 on hit + 2d8 on willing movement",
        "11": "2d8 on hit + 3d8 on willing movement",
        "17": "3d8 on hit + 4d8 on willing movement"
      }
    },
    description:
      "Make one melee weapon attack against a creature within 5 feet. On a hit, the attack has its normal effects and the target is sheathed in booming energy until your next turn; if it willingly moves 5 feet or more before then, it takes thunder damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "control-flames",
    name: "Control Flames",
    school: "transmutation",
    castingTime: "1 action",
    range: "60 feet",
    componentLetters: ["S"],
    duration: "Instantaneous or 1 hour",
    classes: ["druid", "sorcerer", "wizard"],
    description:
      "Choose a nonmagical flame that fits inside a 5-foot cube. You can expand or extinguish it, move it to nearby fuel, alter its light, or create simple shapes within it. Up to three non-instantaneous effects can be active at once."
  },
  {
    id: "create-bonfire",
    name: "Create Bonfire",
    school: "conjuration",
    castingTime: "1 action",
    range: "60 feet",
    componentLetters: ["V", "S"],
    duration: "Concentration, up to 1 minute",
    concentration: true,
    classes: ["druid", "sorcerer", "warlock", "wizard", "artificer"],
    saveAbility: "dex",
    saveSuccess: "none",
    damage: {
      damageType: "fire",
      atCharacterLevel: {
        "1": "1d8",
        "5": "2d8",
        "11": "3d8",
        "17": "4d8"
      }
    },
    description:
      "Create a bonfire in a 5-foot cube on the ground. A creature in its space when it appears, that enters it, or that ends its turn there must make a Dexterity save or take fire damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "encode-thoughts",
    name: "Encode Thoughts",
    school: "enchantment",
    castingTime: "1 action",
    range: "Self",
    componentLetters: ["S"],
    duration: "Up to 8 hours",
    classes: ["wizard"],
    description:
      "Pull a memory, idea, or message from your mind and turn it into a visible thought strand. A creature can receive the strand's contents through this spell or another suitable mind-reading effect."
  },
  {
    id: "friends",
    name: "Friends",
    school: "enchantment",
    castingTime: "1 action",
    range: "Self",
    componentLetters: ["S", "M"],
    material: "A small amount of makeup applied while casting.",
    duration: "Concentration, up to 1 minute",
    concentration: true,
    classes: ["bard", "sorcerer", "warlock", "wizard"],
    description:
      "For the duration, you have advantage on Charisma checks directed at one creature that is not hostile toward you. When the spell ends, that creature realizes magic influenced its mood and may become hostile."
  },
  {
    id: "frostbite",
    name: "Frostbite",
    school: "evocation",
    castingTime: "1 action",
    range: "60 feet",
    componentLetters: ["V", "S"],
    duration: "Instantaneous",
    classes: ["druid", "sorcerer", "warlock", "wizard", "artificer"],
    saveAbility: "con",
    saveSuccess: "none",
    damage: {
      damageType: "cold",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "One creature makes a Constitution save. On a failure it takes cold damage and has disadvantage on the next weapon attack roll it makes before the end of its next turn. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "green-flame-blade",
    name: "Green-Flame Blade",
    school: "evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    componentLetters: ["S", "M"],
    material: "A melee weapon worth at least 1 sp.",
    duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"],
    attackType: "melee-weapon",
    damage: {
      damageType: "fire",
      atCharacterLevel: {
        "1": "spellcasting ability modifier to secondary target",
        "5": "1d8 on hit + 1d8 + ability modifier to secondary target",
        "11": "2d8 on hit + 2d8 + ability modifier to secondary target",
        "17": "3d8 on hit + 3d8 + ability modifier to secondary target"
      }
    },
    description:
      "Make one melee weapon attack against a creature within 5 feet. On a hit, the attack has its normal effects and green fire leaps to another creature you choose within 5 feet of the target. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "gust",
    name: "Gust",
    school: "transmutation",
    castingTime: "1 action",
    range: "30 feet",
    componentLetters: ["V", "S"],
    duration: "Instantaneous",
    classes: ["druid", "sorcerer", "wizard"],
    saveAbility: "str",
    saveSuccess: "none",
    description:
      "Create a small blast of air that can push a Medium or smaller creature 5 feet on a failed Strength save, move an unattended light object, or produce a harmless sensory air effect."
  },
  {
    id: "infestation",
    name: "Infestation",
    school: "conjuration",
    castingTime: "1 action",
    range: "30 feet",
    componentLetters: ["V", "S", "M"],
    material: "A living flea.",
    duration: "Instantaneous",
    classes: ["druid", "sorcerer", "warlock", "wizard"],
    saveAbility: "con",
    saveSuccess: "none",
    damage: {
      damageType: "poison",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "A creature makes a Constitution save. On a failure it takes poison damage and moves 5 feet in a randomly determined direction if it can move. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "lightning-lure",
    name: "Lightning Lure",
    school: "evocation",
    castingTime: "1 action",
    range: "Self (15-foot radius)",
    componentLetters: ["V"],
    duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"],
    saveAbility: "str",
    saveSuccess: "none",
    damage: {
      damageType: "lightning",
      atCharacterLevel: {
        "1": "1d8",
        "5": "2d8",
        "11": "3d8",
        "17": "4d8"
      }
    },
    description:
      "One creature you can see within 15 feet makes a Strength save. On a failure it is pulled up to 10 feet toward you and takes lightning damage if it ends within 5 feet of you. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "magic-stone",
    name: "Magic Stone",
    school: "transmutation",
    castingTime: "1 bonus action",
    range: "Touch",
    componentLetters: ["V", "S"],
    duration: "1 minute",
    classes: ["druid", "warlock", "artificer"],
    attackType: "ranged",
    damage: {
      damageType: "bludgeoning",
      atCharacterLevel: {
        "1": "1d6 + spellcasting ability modifier"
      }
    },
    description:
      "Imbue one to three pebbles with magic. A creature can make a ranged spell attack with one pebble, dealing bludgeoning damage using your spellcasting ability. Casting the spell again ends the magic on earlier pebbles."
  },
  {
    id: "mind-sliver",
    name: "Mind Sliver",
    school: "enchantment",
    castingTime: "1 action",
    range: "60 feet",
    componentLetters: ["V"],
    duration: "1 round",
    classes: ["sorcerer", "warlock", "wizard"],
    saveAbility: "int",
    saveSuccess: "none",
    damage: {
      damageType: "psychic",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "One creature makes an Intelligence save. On a failure it takes psychic damage and subtracts 1d4 from the next saving throw it makes before the end of your next turn. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "mold-earth",
    name: "Mold Earth",
    school: "transmutation",
    castingTime: "1 action",
    range: "30 feet",
    componentLetters: ["S"],
    duration: "Instantaneous or 1 hour",
    classes: ["druid", "sorcerer", "wizard"],
    description:
      "Choose loose earth or stone within a 5-foot cube. You can excavate it, create shapes or colors, or make the ground difficult or normal terrain. Up to two non-instantaneous effects can be active at once."
  },
  {
    id: "primal-savagery",
    name: "Primal Savagery",
    school: "transmutation",
    castingTime: "1 action",
    range: "Self",
    componentLetters: ["S"],
    duration: "Instantaneous",
    classes: ["druid"],
    attackType: "melee",
    damage: {
      damageType: "acid",
      atCharacterLevel: {
        "1": "1d10",
        "5": "2d10",
        "11": "3d10",
        "17": "4d10"
      }
    },
    description:
      "Your teeth or fingernails become corrosive natural weapons for one melee spell attack against a creature within 5 feet. On a hit, the target takes acid damage. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "sapping-sting",
    name: "Sapping Sting",
    school: "necromancy",
    castingTime: "1 action",
    range: "30 feet",
    componentLetters: ["V", "S"],
    duration: "Instantaneous",
    classes: ["wizard"],
    saveAbility: "con",
    saveSuccess: "none",
    damage: {
      damageType: "necrotic",
      atCharacterLevel: {
        "1": "1d4",
        "5": "2d4",
        "11": "3d4",
        "17": "4d4"
      }
    },
    description:
      "One creature makes a Constitution save. On a failure it takes necrotic damage and falls prone. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "shape-water",
    name: "Shape Water",
    school: "transmutation",
    castingTime: "1 action",
    range: "30 feet",
    componentLetters: ["S"],
    duration: "Instantaneous or 1 hour",
    classes: ["druid", "sorcerer", "wizard"],
    description:
      "Manipulate water within a 5-foot cube: move it, form simple shapes, change its color or opacity, or freeze it if no creature is inside. Up to two non-instantaneous effects can be active at once."
  },
  {
    id: "sword-burst",
    name: "Sword Burst",
    school: "conjuration",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    componentLetters: ["V"],
    duration: "Instantaneous",
    classes: ["sorcerer", "warlock", "wizard", "artificer"],
    saveAbility: "dex",
    saveSuccess: "none",
    damage: {
      damageType: "force",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "Spectral blades sweep around you. Each other creature within 5 feet makes a Dexterity save, taking force damage on a failure. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "thunderclap",
    name: "Thunderclap",
    school: "evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    componentLetters: ["S"],
    duration: "Instantaneous",
    classes: ["bard", "druid", "sorcerer", "warlock", "wizard", "artificer"],
    saveAbility: "con",
    saveSuccess: "none",
    damage: {
      damageType: "thunder",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "A burst of thunder is audible 100 feet away. Each other creature within 5 feet makes a Constitution save, taking thunder damage on a failure. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "toll-the-dead",
    name: "Toll the Dead",
    school: "necromancy",
    castingTime: "1 action",
    range: "60 feet",
    componentLetters: ["V", "S"],
    duration: "Instantaneous",
    classes: ["cleric", "warlock", "wizard"],
    saveAbility: "wis",
    saveSuccess: "none",
    damage: {
      damageType: "necrotic",
      atCharacterLevel: {
        "1": "1d8 or 1d12",
        "5": "2d8 or 2d12",
        "11": "3d8 or 3d12",
        "17": "4d8 or 4d12"
      }
    },
    description:
      "One creature makes a Wisdom save. On a failure it takes necrotic damage, using a larger damage die if it is missing any hit points. Damage increases at character levels 5, 11, and 17."
  },
  {
    id: "word-of-radiance",
    name: "Word of Radiance",
    school: "evocation",
    castingTime: "1 action",
    range: "Self (5-foot radius)",
    componentLetters: ["V", "M"],
    material: "A holy symbol.",
    duration: "Instantaneous",
    classes: ["cleric"],
    saveAbility: "con",
    saveSuccess: "none",
    damage: {
      damageType: "radiant",
      atCharacterLevel: {
        "1": "1d6",
        "5": "2d6",
        "11": "3d6",
        "17": "4d6"
      }
    },
    description:
      "Each creature you choose within 5 feet makes a Constitution save, taking radiant damage on a failure. Damage increases at character levels 5, 11, and 17."
  }
];

export const ADDITIONAL_CANTRIP_IDS_2014 =
  Object.freeze(
    EXTRA_CANTRIP_DETAILS.map(
      (spell) => normalizeSpellId(spell.id)
    )
  );

export const ADDITIONAL_CANTRIP_EXPECTATIONS_2014 =
  Object.freeze(
    Object.fromEntries(
      EXTRA_CANTRIP_DETAILS.map((spell) => {
        const id = normalizeSpellId(spell.id);

        return [
          id,
          Object.freeze({
            id,
            level: 0,
            school:
              normalizeSpellId(spell.school),
            castingTime:
              String(spell.castingTime),
            range:
              String(spell.range),
            components:
              normalizeSpellComponents(spell),
            duration:
              String(spell.duration),
            concentration:
              spell.concentration === true,
            ritual:
              spell.ritual === true,
            classes: Object.freeze(
              spell.classes.map(
                normalizeSpellId
              )
            ),
            attackType:
              normalizeSpellId(
                spell.attackType
              ),
            saveAbility:
              normalizeSpellId(
                spell.saveAbility
              ),
            damageType:
              normalizeSpellId(
                spell.damage?.damageType
              ),
            damageAtCharacterLevel:
              Object.freeze({
                ...(
                  spell.damage
                    ?.atCharacterLevel ||
                  {}
                )
              })
          })
        ];
      })
    )
  );

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
  const isSrdSpell =
    SRD_SPELL_DETAILS.includes(raw);
  const metadata = getLegacy2014Metadata(
    "spell",
    id,
    isSrdSpell
      ? {
          ...raw,
          sourceType: "srd",
          sourceLabel:
            ACTIVE_RULESET.srdLabel
        }
      : raw
  );
  const attackType =
    normalizeSpellId(raw.attackType);
  const isSpellAttack = [
    "melee",
    "ranged"
  ].includes(attackType);
  const tags = [
    raw.school,
    raw.ritual ? "ritual" : "",
    raw.concentration ? "concentration" : "",
    attackType
      ? (
          isSpellAttack
            ? "spell-attack"
            : "weapon-attack"
        )
      : "",
    raw.saveAbility ? "saving-throw" : "",
    damageRecord?.damageType || "",
    Object.keys(healingBySlotLevel).length ? "healing" : ""
  ].map(normalizeSpellId).filter(Boolean);

  const targeting = createSpellTargetingData(raw);

  return Object.freeze({
    ...metadata,
    schemaVersion: DEFAULT_SPELL_SCHEMA_VERSION,
    id,
    name: String(raw.name || "").trim(),
    source: String(
      raw.source ||
      metadata.sourceLabel
    ),
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
    attackType,
    saveAbility: normalizeSpellId(raw.saveAbility),
    saveSuccess: String(
      raw.saveSuccess ||
      ""
    ).trim().toLowerCase(),
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
      : null,
    targeting
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
    if (spell.rulesetId !== ACTIVE_RULESET.id) errors.push(`${label} has an invalid ruleset ID.`);
    if (spell.rulesEdition !== ACTIVE_RULESET.edition) errors.push(`${label} has an invalid rules edition.`);
    if (!String(spell.sourceType || "").trim()) errors.push(`${label} is missing a source type.`);
    if (!String(spell.sourceLabel || "").trim()) errors.push(`${label} is missing a source label.`);
    if (!String(spell.summary || "").trim()) errors.push(`${label} is missing a summary.`);
    if (!String(spell.description || "").trim()) errors.push(`${label} is missing a description.`);
    if (/details have not been supplied|placeholder|coming soon|\btodo\b|\btbd\b/i.test(String(spell.description || ""))) {
      errors.push(`${label} contains placeholder description text.`);
    }
    if (!SPELL_LEVEL_KEYS.includes(levelKey)) errors.push(`${label} has an invalid levelKey.`);
    if (!Number.isInteger(spell.level) || spell.level < 0 || spell.level > 9) errors.push(`${label} must have a level from 0 to 9.`);
    else if (SPELL_LEVELS_BY_KEY[levelKey] !== spell.level) errors.push(`${label} level does not match levelKey.`);
    if (!SPELL_SCHOOLS.includes(spell.school)) errors.push(`${label} has an invalid school.`);
    if (!String(spell.castingTime || "").trim()) errors.push(`${label} is missing a casting time.`);
    if (!String(spell.range || "").trim()) errors.push(`${label} is missing a range.`);
    if (!String(spell.duration || "").trim()) errors.push(`${label} is missing a duration.`);
    if (typeof spell.concentration !== "boolean") errors.push(`${label} concentration must be a boolean.`);
    if (typeof spell.ritual !== "boolean") errors.push(`${label} ritual must be a boolean.`);
    if (!spell.components || typeof spell.components !== "object" || Array.isArray(spell.components)) {
      errors.push(`${label} components must be an object.`);
    } else {
      const componentFlags = [
        spell.components.verbal,
        spell.components.somatic,
        spell.components.material
      ];
      if (componentFlags.some((value) => typeof value !== "boolean")) {
        errors.push(`${label} component flags must be booleans.`);
      }
      if (!componentFlags.some(Boolean)) {
        errors.push(`${label} must have at least one component.`);
      }
      if (
        spell.components.material !==
        Boolean(String(spell.components.materialText || "").trim())
      ) {
        errors.push(`${label} material component text does not match its material flag.`);
      }
    }
    if (!Array.isArray(spell.classes) || !spell.classes.length) {
      errors.push(`${label} classes must be a non-empty array.`);
    } else {
      const normalizedClasses = spell.classes.map(normalizeSpellId);
      if (normalizedClasses.some((classId) => !SPELL_CLASS_IDS.includes(classId))) {
        errors.push(`${label} contains an unsupported class ID.`);
      }
      if (new Set(normalizedClasses).size !== normalizedClasses.length) {
        errors.push(`${label} contains duplicate class IDs.`);
      }
    }
    if (!Array.isArray(spell.subclasses)) errors.push(`${label} subclasses must be an array.`);
    if (!SPELL_ATTACK_TYPES.includes(spell.attackType)) errors.push(`${label} has invalid attack metadata.`);
    if (!SPELL_SAVE_ABILITIES.includes(spell.saveAbility)) errors.push(`${label} has invalid saving-throw metadata.`);
    if (!Array.isArray(spell.damage)) errors.push(`${label} damage must be an array.`);
    if (!Array.isArray(spell.healing)) errors.push(`${label} healing must be an array.`);
    if (!spell.scaling || typeof spell.scaling !== "object" || Array.isArray(spell.scaling)) {
      errors.push(`${label} scaling must be an object.`);
    } else {
      [
        "atCharacterLevel",
        "atSlotLevel",
        "healingAtSlotLevel"
      ].forEach((field) => {
        if (
          !spell.scaling[field] ||
          typeof spell.scaling[field] !== "object" ||
          Array.isArray(spell.scaling[field])
        ) {
          errors.push(`${label} has invalid ${field} scaling.`);
        }
      });
      if (typeof spell.scaling.higherLevelDescription !== "string") {
        errors.push(`${label} higher-level scaling text must be a string.`);
      }
    }
    if (!Array.isArray(spell.effects)) errors.push(`${label} effects must be an array.`);
    if (!Array.isArray(spell.tags)) errors.push(`${label} tags must be an array.`);
    const targetingValidation =
      validateSpellTargetingData(
        spell.targeting,
        `${label} targeting`
      );
    errors.push(...targetingValidation.errors);
    if (
      spell.targeting?.range?.text !==
      spell.range
    ) {
      errors.push(`${label} targeting range does not match its catalog range.`);
    }
    if (
      spell.targeting?.duration?.text !==
      spell.duration
    ) {
      errors.push(`${label} targeting duration does not match its catalog duration.`);
    }
    if (
      spell.targeting?.duration?.concentration !==
      spell.concentration
    ) {
      errors.push(`${label} targeting concentration does not match its catalog flag.`);
    }
    if (
      (spell.targeting?.save?.ability || "") !==
      spell.saveAbility
    ) {
      errors.push(`${label} targeting save does not match its catalog save.`);
    }
    if (
      (spell.targeting?.attack?.type || "") !==
      spell.attackType
    ) {
      errors.push(`${label} targeting attack does not match its catalog attack.`);
    }
    if (
      ["melee", "ranged"].includes(spell.attackType) &&
      !spell.tags?.includes("spell-attack")
    ) {
      errors.push(`${label} is missing its spell-attack tag.`);
    }
    if (
      ["melee-weapon", "ranged-weapon"].includes(spell.attackType) &&
      (
        !spell.tags?.includes("weapon-attack") ||
        spell.tags?.includes("spell-attack")
      )
    ) {
      errors.push(`${label} has incorrect weapon-attack tags.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function spellValuesMatch(actual, expected) {
  return JSON.stringify(actual) ===
    JSON.stringify(expected);
}

function compareCanonicalSpell(
  actual,
  expected,
  label,
  errors
) {
  [
    "level",
    "levelKey",
    "school",
    "castingTime",
    "range",
    "duration",
    "concentration",
    "ritual",
    "attackType",
    "saveAbility",
    "saveSuccess",
    "higherLevelDescription",
    "rulesetId",
    "rulesEdition",
    "sourceType",
    "sourceLabel"
  ].forEach((field) => {
    if (actual?.[field] !== expected?.[field]) {
      errors.push(`${label} has invalid ${field}.`);
    }
  });

  [
    "components",
    "classes",
    "subclasses",
    "damage",
    "healing",
    "scaling"
  ].forEach((field) => {
    if (
      !spellValuesMatch(
        actual?.[field],
        expected?.[field]
      )
    ) {
      errors.push(`${label} has invalid ${field}.`);
    }
  });
}

export function validateDefaultSpellReferences({
  spells,
  feats = [],
  subclasses = []
} = {}) {
  const spellIds = new Set(
    (Array.isArray(spells) ? spells : [])
      .map((spell) => {
        return normalizeSpellId(
          spell?.id ||
          spell?.name
        );
      })
      .filter(Boolean)
  );
  const errors = [];
  const references = [];
  let inlineFallbackCount = 0;

  (Array.isArray(feats) ? feats : [])
    .forEach((feat) => {
      (
        Array.isArray(feat?.effects)
          ? feat.effects
          : []
      ).forEach((effect) => {
        const referencedIds = [
          effect?.spellId,
          ...(
            Array.isArray(effect?.spellIds)
              ? effect.spellIds
              : []
          )
        ]
          .map(normalizeSpellId)
          .filter(Boolean);

        referencedIds.forEach((spellId) => {
          const source =
            `feat:${normalizeSpellId(
              feat?.id ||
              feat?.name
            )}`;
          references.push({
            source,
            spellId,
            inlineFallback: false
          });

          if (!spellIds.has(spellId)) {
            errors.push(
              `${source} references missing spell "${spellId}".`
            );
          }
        });
      });
    });

  (Array.isArray(subclasses) ? subclasses : [])
    .forEach((subclass) => {
      Object.entries(
        subclass?.expandedSpells ||
        {}
      ).forEach(
        ([unlockLevel, entries]) => {
          (
            Array.isArray(entries)
              ? entries
              : []
          ).forEach((entry) => {
            const spellId =
              normalizeSpellId(
                typeof entry === "string"
                  ? entry
                  : entry?.id ||
                    entry?.name
              );
            const source =
              `subclass:${normalizeSpellId(
                subclass?.classId
              )}:${normalizeSpellId(
                subclass?.id ||
                subclass?.name
              )}:${unlockLevel}`;
            const hasInlineFallback =
              Boolean(
                entry &&
                typeof entry === "object" &&
                entry.inlineFallback === true &&
                String(entry.name || "").trim() &&
                Number.isInteger(entry.level) &&
                entry.level >= 0 &&
                entry.level <= 9
              );

            if (!spellId) {
              errors.push(
                `${source} contains an empty spell reference.`
              );
              return;
            }

            references.push({
              source,
              spellId,
              inlineFallback:
                hasInlineFallback
            });

            if (
              !spellIds.has(spellId) &&
              !hasInlineFallback
            ) {
              errors.push(
                `${source} references missing spell "${spellId}" without a valid inline fallback.`
              );
            } else if (
              !spellIds.has(spellId) &&
              hasInlineFallback
            ) {
              inlineFallbackCount += 1;
            }
          });
        }
      );
    });

  return {
    valid: errors.length === 0,
    errors,
    referenceCount: references.length,
    inlineFallbackCount,
    references
  };
}

export function validateDefaultSpellCatalog(
  spells,
  {
    feats = [],
    subclasses = []
  } = {}
) {
  const structural =
    validateDefaultSpellCollection(spells);
  const errors = [
    ...structural.errors
  ];
  const entries =
    Array.isArray(spells)
      ? spells
      : [];
  const spellMap = new Map(
    entries.map((spell) => [
      normalizeSpellId(
        spell?.id ||
        spell?.name
      ),
      spell
    ])
  );
  const srdIds = new Set(
    SRD_SPELL_DETAILS.map((spell) => {
      return normalizeSpellId(
        spell.id ||
        spell.name
      );
    })
  );
  const additionalIds = new Set(
    ADDITIONAL_CANTRIP_IDS_2014
  );
  const srdCount = entries.filter(
    (spell) => srdIds.has(spell.id)
  ).length;
  const additionalCantripCount =
    entries.filter((spell) => {
      return additionalIds.has(
        spell.id
      );
    }).length;

  if (
    SRD_SPELL_DETAILS.length !==
      SRD_SPELL_COUNT_2014 ||
    srdCount !== SRD_SPELL_COUNT_2014
  ) {
    errors.push(
      `Expected ${SRD_SPELL_COUNT_2014} SRD spells, found ${srdCount}.`
    );
  }

  if (
    EXTRA_CANTRIP_DETAILS.length !==
      ADDITIONAL_CANTRIP_COUNT_2014 ||
    additionalCantripCount !==
      ADDITIONAL_CANTRIP_COUNT_2014
  ) {
    errors.push(
      `Expected ${ADDITIONAL_CANTRIP_COUNT_2014} additional cantrips, found ${additionalCantripCount}.`
    );
  }

  if (
    entries.length !==
    SRD_SPELL_COUNT_2014 +
      ADDITIONAL_CANTRIP_COUNT_2014
  ) {
    errors.push(
      `Expected 340 total spells, found ${entries.length}.`
    );
  }

  [
    ...SRD_SPELL_DETAILS,
    ...EXTRA_CANTRIP_DETAILS
  ].forEach((rawSpell) => {
    const expected =
      normalizeDetailedSpell(rawSpell);
    const actual =
      spellMap.get(expected.id);

    if (!actual) {
      errors.push(
        `Missing canonical spell "${expected.id}".`
      );
      return;
    }

    compareCanonicalSpell(
      actual,
      expected,
      `Spell ${expected.id}`,
      errors
    );
  });

  const referenceValidation =
    validateDefaultSpellReferences({
      spells: entries,
      feats,
      subclasses
    });
  errors.push(
    ...referenceValidation.errors
  );

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      srd: srdCount,
      additionalCantrips:
        additionalCantripCount,
      total: entries.length,
      references:
        referenceValidation
          .referenceCount,
      inlineFallbacks:
        referenceValidation
          .inlineFallbackCount
    }
  };
}

export const DEFAULT_SPELLS = Object.freeze(buildDefaultSpells());
const defaultSpellValidation =
  validateDefaultSpellCatalog(
    DEFAULT_SPELLS
  );

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

