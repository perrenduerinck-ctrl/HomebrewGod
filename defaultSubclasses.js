export const DEFAULT_SUBCLASS_SCHEMA_VERSION = 1;

function normalizeSubclassId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFeature(rawFeature) {
  const feature = rawFeature && typeof rawFeature === "object" ? rawFeature : {};

  return Object.freeze({
    ...feature,
    id: normalizeSubclassId(feature.id),
    name: String(feature.name || "").trim(),
    type: String(feature.type || "feature").trim() || "feature",
    summary: String(feature.summary || "").trim()
  });
}

function normalizeSubclassRecord(rawSubclass) {
  const raw = rawSubclass && typeof rawSubclass === "object" ? rawSubclass : {};
  const featureLevels = Array.isArray(raw.featureLevels)
    ? [...new Set(raw.featureLevels.map(Number).filter(Number.isInteger))].sort((a, b) => a - b)
    : [];
  const rawFeaturesByLevel = raw.featuresByLevel && typeof raw.featuresByLevel === "object"
    ? raw.featuresByLevel
    : {};
  const featuresByLevel = {};

  featureLevels.forEach(function (level) {
    const rawFeatures = Array.isArray(rawFeaturesByLevel[level])
      ? rawFeaturesByLevel[level]
      : [];

    featuresByLevel[level] = Object.freeze(rawFeatures.map(normalizeFeature));
  });

  const expandedSpells = raw.expandedSpells && typeof raw.expandedSpells === "object"
    ? { ...raw.expandedSpells }
    : {};
  const choices = Array.isArray(raw.choices)
    ? raw.choices.map(function (choice) {
        return choice && typeof choice === "object" ? Object.freeze({ ...choice }) : choice;
      })
    : [];

  return Object.freeze({
    schemaVersion: DEFAULT_SUBCLASS_SCHEMA_VERSION,
    id: normalizeSubclassId(raw.id),
    classId: normalizeSubclassId(raw.classId),
    className: String(raw.className || "").trim(),
    subclassLabel: String(raw.subclassLabel || "").trim(),
    name: String(raw.name || "").trim(),
    source: String(raw.source || "starter").trim() || "starter",
    summary: String(raw.summary || "").trim(),
    unlockLevel: Number(raw.unlockLevel),
    featureLevels: Object.freeze(featureLevels),
    featuresByLevel: Object.freeze(featuresByLevel),
    expandedSpells: Object.freeze(expandedSpells),
    choices: Object.freeze(choices)
  });
}

export function validateDefaultSubclassCollection(subclasses) {
  const errors = [];

  if (!Array.isArray(subclasses)) {
    return {
      valid: false,
      errors: ["Subclass collection must be an array."]
    };
  }

  const seenSubclassIds = new Set();

  subclasses.forEach(function (subclass, subclassIndex) {
    const label = `Subclass at index ${subclassIndex}`;

    if (!subclass || typeof subclass !== "object") {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (!subclass.id) errors.push(`${label} must have an id.`);
    if (!subclass.classId) errors.push(`${label} must have a classId.`);
    if (!subclass.name) errors.push(`${label} must have a name.`);
    if (!subclass.subclassLabel) errors.push(`${label} must have a subclassLabel.`);

    if (!Number.isInteger(subclass.unlockLevel) || subclass.unlockLevel < 1 || subclass.unlockLevel > 20) {
      errors.push(`${label} must have an unlockLevel between 1 and 20.`);
    }

    if (!Array.isArray(subclass.featureLevels)) {
      errors.push(`${label} must have a featureLevels array.`);
    }

    if (!subclass.featuresByLevel || typeof subclass.featuresByLevel !== "object" || Array.isArray(subclass.featuresByLevel)) {
      errors.push(`${label} must have a featuresByLevel object.`);
    } else {
      Object.entries(subclass.featuresByLevel).forEach(function ([level, features]) {
        if (!Array.isArray(features)) {
          errors.push(`${label} featuresByLevel.${level} must be an array.`);
          return;
        }

        features.forEach(function (feature, featureIndex) {
          const featureLabel = `${label} feature ${level}.${featureIndex}`;

          if (!feature || typeof feature !== "object") {
            errors.push(`${featureLabel} must be an object.`);
            return;
          }

          if (!feature.id) errors.push(`${featureLabel} must have an id.`);
          if (!feature.name) errors.push(`${featureLabel} must have a name.`);
          if (!feature.summary) errors.push(`${featureLabel} must have a summary.`);
        });
      });
    }

    const uniqueKey = `${subclass.classId}:${subclass.id}`;

    if (subclass.classId && subclass.id && seenSubclassIds.has(uniqueKey)) {
      errors.push(`${label} duplicates subclass id "${subclass.id}" for class "${subclass.classId}".`);
    }

    seenSubclassIds.add(uniqueKey);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

const starterSubclasses = [
  {
    id: "berserker",
    classId: "barbarian",
    className: "Barbarian",
    subclassLabel: "Primal Path",
    name: "Berserker",
    source: "starter",
    summary: "A rage-focused warrior who turns fury into relentless offense.",
    unlockLevel: 3,
    featureLevels: [3, 6, 10, 14],
    featuresByLevel: {
      3: [{
        id: "berserker-frenzied-rage",
        name: "Frenzied Rage",
        type: "feature",
        summary: "Your rage becomes more aggressive and focused on offense."
      }],
      6: [],
      10: [],
      14: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "lore",
    classId: "bard",
    className: "Bard",
    subclassLabel: "Bard College",
    name: "Lore",
    source: "starter",
    summary: "A curious bard who gathers knowledge and turns insight into an advantage.",
    unlockLevel: 3,
    featureLevels: [3, 6, 14],
    featuresByLevel: {
      3: [{
        id: "lore-bonus-proficiencies",
        name: "Bonus Proficiencies",
        type: "feature",
        summary: "Your broad studies grant training in several additional skills."
      }],
      6: [],
      14: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "life",
    classId: "cleric",
    className: "Cleric",
    subclassLabel: "Divine Domain",
    name: "Life",
    source: "starter",
    summary: "A devoted healer who strengthens restorative magic and protects allies.",
    unlockLevel: 1,
    featureLevels: [1, 2, 6, 8, 17],
    featuresByLevel: {
      1: [{
        id: "life-disciple-of-life",
        name: "Disciple of Life",
        type: "feature",
        summary: "Your healing spells restore additional vitality."
      }],
      2: [],
      6: [],
      8: [],
      17: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "land",
    classId: "druid",
    className: "Druid",
    subclassLabel: "Druid Circle",
    name: "Land",
    source: "starter",
    summary: "A spell-focused druid whose magic reflects a chosen natural environment.",
    unlockLevel: 2,
    featureLevels: [2, 6, 10, 14],
    featuresByLevel: {
      2: [{
        id: "land-bonus-cantrip",
        name: "Bonus Cantrip",
        type: "feature",
        summary: "Your bond with the land teaches you an additional druid cantrip."
      }],
      6: [],
      10: [],
      14: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "champion",
    classId: "fighter",
    className: "Fighter",
    subclassLabel: "Martial Archetype",
    name: "Champion",
    source: "starter",
    summary: "A focused combatant who develops dependable athletic and martial excellence.",
    unlockLevel: 3,
    featureLevels: [3, 7, 10, 15, 18],
    featuresByLevel: {
      3: [{
        id: "champion-improved-critical",
        name: "Improved Critical",
        type: "feature",
        summary: "Your weapon attacks become more likely to land decisive hits."
      }],
      7: [],
      10: [],
      15: [],
      18: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "open-hand",
    classId: "monk",
    className: "Monk",
    subclassLabel: "Monastic Tradition",
    name: "Open Hand",
    source: "starter",
    summary: "A disciplined martial artist who controls the flow of close combat.",
    unlockLevel: 3,
    featureLevels: [3, 6, 11, 17],
    featuresByLevel: {
      3: [{
        id: "open-hand-technique",
        name: "Open Hand Technique",
        type: "feature",
        summary: "Your rapid strikes can disrupt an opponent's balance and reactions."
      }],
      6: [],
      11: [],
      17: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "devotion",
    classId: "paladin",
    className: "Paladin",
    subclassLabel: "Sacred Oath",
    name: "Devotion",
    source: "starter",
    summary: "An honorable paladin who embodies courage, compassion, and steadfast duty.",
    unlockLevel: 3,
    featureLevels: [3, 7, 15, 20],
    featuresByLevel: {
      3: [{
        id: "devotion-sacred-weapon",
        name: "Sacred Weapon",
        type: "feature",
        summary: "You empower a weapon with divine purpose for a limited time."
      }],
      7: [],
      15: [],
      20: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "hunter",
    classId: "ranger",
    className: "Ranger",
    subclassLabel: "Ranger Archetype",
    name: "Hunter",
    source: "starter",
    summary: "A practical ranger who adapts specialized tactics to dangerous prey.",
    unlockLevel: 3,
    featureLevels: [3, 7, 11, 15],
    featuresByLevel: {
      3: [{
        id: "hunter-hunters-prey",
        name: "Hunter's Prey",
        type: "feature",
        summary: "You choose a combat tactic suited to bringing down difficult enemies."
      }],
      7: [],
      11: [],
      15: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "thief",
    classId: "rogue",
    className: "Rogue",
    subclassLabel: "Roguish Archetype",
    name: "Thief",
    source: "starter",
    summary: "A nimble rogue who excels at quick hands, climbing, and opportunistic action.",
    unlockLevel: 3,
    featureLevels: [3, 9, 13, 17],
    featuresByLevel: {
      3: [{
        id: "thief-fast-hands",
        name: "Fast Hands",
        type: "feature",
        summary: "You perform certain object and agility tasks with exceptional speed."
      }],
      9: [],
      13: [],
      17: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "draconic-bloodline",
    classId: "sorcerer",
    className: "Sorcerer",
    subclassLabel: "Sorcerous Origin",
    name: "Draconic Bloodline",
    source: "starter",
    summary: "A sorcerer whose inherited draconic power hardens body and magic.",
    unlockLevel: 1,
    featureLevels: [1, 6, 14, 18],
    featuresByLevel: {
      1: [{
        id: "draconic-bloodline-resilience",
        name: "Draconic Resilience",
        type: "feature",
        summary: "Draconic power improves your durability and natural defenses."
      }],
      6: [],
      14: [],
      18: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "fiend",
    classId: "warlock",
    className: "Warlock",
    subclassLabel: "Otherworldly Patron",
    name: "Fiend",
    source: "starter",
    summary: "A warlock empowered by a destructive patron from the lower planes.",
    unlockLevel: 1,
    featureLevels: [1, 6, 10, 14],
    featuresByLevel: {
      1: [{
        id: "fiend-dark-ones-blessing",
        name: "Dark One's Blessing",
        type: "feature",
        summary: "Defeating a hostile creature grants you a brief reserve of vitality."
      }],
      6: [],
      10: [],
      14: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "evocation",
    classId: "wizard",
    className: "Wizard",
    subclassLabel: "Arcane Tradition",
    name: "Evocation",
    source: "starter",
    summary: "A wizard who shapes forceful spells with precision and control.",
    unlockLevel: 2,
    featureLevels: [2, 6, 10, 14],
    featuresByLevel: {
      2: [{
        id: "evocation-sculpt-spells",
        name: "Sculpt Spells",
        type: "feature",
        summary: "You shape area spells to better protect selected allies."
      }],
      6: [],
      10: [],
      14: []
    },
    expandedSpells: {},
    choices: []
  },
  {
    id: "alchemist",
    classId: "artificer",
    className: "Artificer",
    subclassLabel: "Artificer Specialist",
    name: "Alchemist",
    source: "starter",
    summary: "An inventive artificer who produces experimental mixtures and restorative effects.",
    unlockLevel: 3,
    featureLevels: [3, 5, 9, 15],
    featuresByLevel: {
      3: [{
        id: "alchemist-experimental-elixir",
        name: "Experimental Elixir",
        type: "feature",
        summary: "You create a temporary magical mixture with a useful unpredictable effect."
      }],
      5: [],
      9: [],
      15: []
    },
    expandedSpells: {},
    choices: []
  }
];

const normalizedDefaultSubclasses = starterSubclasses.map(normalizeSubclassRecord);
const validation = validateDefaultSubclassCollection(normalizedDefaultSubclasses);

if (!validation.valid) {
  throw new Error(
    `Invalid default subclass data: ${validation.errors.join(" ")}`
  );
}

export const DEFAULT_SUBCLASSES = Object.freeze(normalizedDefaultSubclasses);

const subclassMap = {};

DEFAULT_SUBCLASSES.forEach(function (subclass) {
  if (!subclassMap[subclass.classId]) {
    subclassMap[subclass.classId] = {};
  }

  subclassMap[subclass.classId][subclass.id] = subclass;
});

Object.keys(subclassMap).forEach(function (classId) {
  subclassMap[classId] = Object.freeze(subclassMap[classId]);
});

export const DEFAULT_SUBCLASS_MAP = Object.freeze(subclassMap);

export function getDefaultSubclassesForClass(classId) {
  const normalizedClassId = normalizeSubclassId(classId);
  const classSubclasses = DEFAULT_SUBCLASS_MAP[normalizedClassId];

  return classSubclasses ? Object.values(classSubclasses) : [];
}

export function getDefaultSubclassById(classId, subclassId) {
  const normalizedClassId = normalizeSubclassId(classId);
  const normalizedSubclassId = normalizeSubclassId(subclassId);
  const classSubclasses = DEFAULT_SUBCLASS_MAP[normalizedClassId];

  return classSubclasses?.[normalizedSubclassId] || null;
}
