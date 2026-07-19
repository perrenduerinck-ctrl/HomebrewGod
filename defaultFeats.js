import { FEAT_NAME_LIST } from "./defaultFeatNames.js";
import { DEFAULT_FEAT_RULES } from "./defaultFeatRules.js";

export const DEFAULT_FEAT_SCHEMA_VERSION = 2;

const RAW_DEFAULT_FEATS = [
  {
    id: "tough",
    name: "Tough",
    summary: "Increases maximum hit points as the character gains levels.",
    prerequisites: [],
    effects: [
      {
        type: "hpBonus",
        perLevel: 2
      }
    ]
  },
  {
    id: "alert",
    name: "Alert",
    summary: "Improves readiness at the start of combat.",
    prerequisites: [],
    effects: [
      {
        type: "initiativeBonus",
        value: 5
      },
      {
        type: "custom",
        id: "alert-awareness"
      }
    ]
  },
  {
    id: "skilled",
    name: "Skilled",
    summary: "Adds training in three skills or tools.",
    prerequisites: [],
    effects: [
      {
        type: "proficiencyChoice",
        choose: 3,
        categories: ["skill", "tool"]
      }
    ]
  },
  {
    id: "mobile",
    name: "Mobile",
    summary: "Increases speed and supports movement through close combat.",
    prerequisites: [],
    effects: [
      {
        type: "speedBonus",
        value: 10
      },
      {
        type: "custom",
        id: "mobile-combat-movement"
      }
    ]
  },
  {
    id: "lucky",
    name: "Lucky",
    summary: "Provides a small pool of luck points for pivotal rolls.",
    prerequisites: [],
    effects: [
      {
        type: "resource",
        id: "luck-points",
        uses: 3,
        recharge: "longRest"
      }
    ]
  },
  {
    id: "magic-initiate",
    name: "Magic Initiate",
    summary: "Grants a small selection of spells from one magical tradition.",
    prerequisites: [],
    effects: [
      {
        type: "classChoice",
        id: "magic-initiate-class",
        options: ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"]
      },
      {
        type: "spellChoice",
        cantrips: 2,
        levelOneSpells: 1
      }
    ]
  },
  {
    id: "great-weapon-master",
    name: "Great Weapon Master",
    summary: "Supports forceful attacks with heavy melee weapons.",
    prerequisites: [],
    effects: [
      {
        type: "custom",
        id: "great-weapon-master-attacks"
      }
    ]
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    summary: "Improves difficult long-range weapon attacks.",
    prerequisites: [],
    effects: [
      {
        type: "custom",
        id: "sharpshooter-attacks"
      }
    ]
  },
  {
    id: "war-caster",
    name: "War Caster",
    summary: "Helps maintain and cast magic during close combat.",
    prerequisites: [
      {
        type: "spellcasting"
      }
    ],
    effects: [
      {
        type: "custom",
        id: "war-caster-concentration"
      },
      {
        type: "custom",
        id: "war-caster-combat-casting"
      }
    ]
  },
  {
    id: "resilient",
    name: "Resilient",
    summary: "Improves one ability and its related saving throw training.",
    prerequisites: [],
    effects: [
      {
        type: "abilityChoice",
        choose: 1,
        options: [
          "Strength",
          "Dexterity",
          "Constitution",
          "Intelligence",
          "Wisdom",
          "Charisma"
        ],
        increase: 1
      },
      {
        type: "savingThrowProficiencyFromAbilityChoice"
      }
    ]
  }
];

const normalizeFeatId = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const createNameListPlaceholder = (name) => ({
  id: normalizeFeatId(name),
  name,
  summary: "Description not filled in yet.",
  description: "Add this feat's full table description here.",
  source: "name-list",
  prerequisites: [],
  effects: [],
  choices: [],
  tags: []
});

const getStructuredEntryKey = (entry) => {
  if (!entry || typeof entry !== "object") {
    return String(entry);
  }

  const type = String(entry.type || "record");

  if (type === "abilityChoice") {
    return type;
  }

  if (type === "savingThrowProficiencyFromAbilityChoice") {
    return type;
  }

  if (entry.id) {
    return `${type}:${entry.id}`;
  }

  return `${type}:${JSON.stringify({
    ability: entry.ability,
    categories: entry.categories,
    category: entry.category,
    classId: entry.classId,
    damageType: entry.damageType,
    damageTypes: entry.damageTypes,
    featureType: entry.featureType,
    spellId: entry.spellId,
    spellIds: entry.spellIds,
    value: entry.value
  })}`;
};

const mergeStructuredArrays = (...collections) => {
  const entries = new Map();

  collections.forEach((collection) => {
    (Array.isArray(collection) ? collection : [])
      .forEach((entry) => {
        entries.set(getStructuredEntryKey(entry), entry);
      });
  });

  return [...entries.values()];
};

const mergeFeatRecords = (...records) => {
  const validRecords = records.filter((record) => {
    return record && typeof record === "object";
  });

  return {
    ...Object.assign({}, ...validRecords),
    prerequisites: mergeStructuredArrays(
      ...validRecords.map((record) => record.prerequisites)
    ),
    effects: mergeStructuredArrays(
      ...validRecords.map((record) => record.effects)
    ),
    choices: mergeStructuredArrays(
      ...validRecords.map((record) => record.choices)
    ),
    tags: [...new Set(
      validRecords.flatMap((record) => {
        return Array.isArray(record.tags) ? record.tags : [];
      })
    )]
  };
};

const mergeDefaultFeatRecords = () => {
  const rawById = new Map(
    RAW_DEFAULT_FEATS.map((feat) => {
      return [normalizeFeatId(feat?.id || feat?.name), feat];
    })
  );
  const rulesById = new Map(
    DEFAULT_FEAT_RULES.map((feat) => {
      return [normalizeFeatId(feat?.id || feat?.name), feat];
    })
  );

  return FEAT_NAME_LIST.map((name) => {
    const id = normalizeFeatId(name);
    return mergeFeatRecords(
      createNameListPlaceholder(name),
      rawById.get(id),
      rulesById.get(id),
      { id, name }
    );
  });
};

const freezeRecordArray = (value) => Object.freeze(
  Array.isArray(value)
    ? value.map((entry) => {
        return entry && typeof entry === "object"
          ? Object.freeze({ ...entry })
          : entry;
      })
    : []
);

const normalizeFeatRecord = (rawFeat) => {
  const raw = rawFeat || {};

  return Object.freeze({
    ...raw,
    schemaVersion: DEFAULT_FEAT_SCHEMA_VERSION,
    id: normalizeFeatId(raw.id || raw.name),
    name: String(raw.name || "Unnamed Feat").trim(),
    summary: String(
      raw.summary || "Description not filled in yet."
    ).trim(),
    description: String(
      raw.description ||
      raw.summary ||
      "Add this feat's full table description here."
    ).trim(),
    source: String(raw.source || "default").trim(),
    prerequisites: freezeRecordArray(raw.prerequisites),
    effects: freezeRecordArray(raw.effects),
    choices: freezeRecordArray(raw.choices),
    tags: Object.freeze(
      Array.isArray(raw.tags)
        ? raw.tags
            .map((tag) => String(tag || "").trim())
            .filter(Boolean)
        : []
    ),
    repeatable: raw.repeatable === true,
    repeatByChoice: raw.repeatByChoice === true,
    repeatLimit:
      Number.isFinite(Number(raw.repeatLimit)) && Number(raw.repeatLimit) > 0
        ? Math.round(Number(raw.repeatLimit))
        : null
  });
};

export function validateDefaultFeatCollection(feats) {
  const entries = Array.isArray(feats) ? feats : [];
  const errors = [];
  const ids = new Set();

  entries.forEach((feat, index) => {
    const id = normalizeFeatId(feat?.id || feat?.name);
    const name = String(feat?.name || "").trim();

    if (!id) {
      errors.push(`Feat ${index + 1} is missing an id.`);
    } else if (ids.has(id)) {
      errors.push(`Duplicate feat id: ${id}.`);
    } else {
      ids.add(id);
    }

    if (!name) {
      errors.push(`Feat ${id || index + 1} is missing a name.`);
    }

    if (!String(feat?.summary || "").trim()) {
      errors.push(`Feat ${id || index + 1} is missing a summary.`);
    }

    if (!String(feat?.description || "").trim()) {
      errors.push(`Feat ${id || index + 1} is missing a description.`);
    }

    if (!Array.isArray(feat?.prerequisites)) {
      errors.push(`Feat ${id || index + 1} prerequisites must be an array.`);
    }

    if (!Array.isArray(feat?.effects)) {
      errors.push(`Feat ${id || index + 1} effects must be an array.`);
    } else if (!feat.effects.length) {
      errors.push(`Feat ${id || index + 1} has no structured effects.`);
    }

    if (!Array.isArray(feat?.choices)) {
      errors.push(`Feat ${id || index + 1} choices must be an array.`);
    }

    if (!Array.isArray(feat?.tags)) {
      errors.push(`Feat ${id || index + 1} tags must be an array.`);
    }

    if (
      /description not filled in|add this feat's full table description/i.test(
        `${feat?.summary || ""} ${feat?.description || ""}`
      )
    ) {
      errors.push(`Feat ${id || index + 1} still contains placeholder text.`);
    }
  });

  const expectedIds = new Set(FEAT_NAME_LIST.map(normalizeFeatId));

  expectedIds.forEach((id) => {
    if (!ids.has(id)) {
      errors.push(`Missing feat from name list: ${id}.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

const normalizedDefaultFeats = mergeDefaultFeatRecords().map(
  normalizeFeatRecord
);

const defaultFeatValidation = validateDefaultFeatCollection(
  normalizedDefaultFeats
);

if (!defaultFeatValidation.valid) {
  throw new Error(
    `Invalid default feat data: ${defaultFeatValidation.errors.join(" ")}`
  );
}

export const DEFAULT_FEATS = Object.freeze(
  normalizedDefaultFeats
);

export const DEFAULT_FEAT_MAP = Object.freeze(
  Object.fromEntries(
    DEFAULT_FEATS.map((feat) => [feat.id, feat])
  )
);

export function getDefaultFeatById(featId) {
  return DEFAULT_FEAT_MAP[normalizeFeatId(featId)] || null;
}
