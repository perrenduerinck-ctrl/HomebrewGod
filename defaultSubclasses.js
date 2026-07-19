import { SUBCLASS_NAME_LIST } from "./defaultSubclassNames.js";

export const DEFAULT_SUBCLASS_SCHEMA_VERSION = 1;

const SUBCLASS_CLASS_CONFIG = Object.freeze({
  artificer: Object.freeze({
    subclassLabel: "Artificer Specialist",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 5, 9, 15])
  }),
  barbarian: Object.freeze({
    subclassLabel: "Primal Path",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 6, 10, 14])
  }),
  bard: Object.freeze({
    subclassLabel: "Bard College",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 6, 14])
  }),
  cleric: Object.freeze({
    subclassLabel: "Divine Domain",
    unlockLevel: 1,
    featureLevels: Object.freeze([1, 2, 6, 8, 17])
  }),
  druid: Object.freeze({
    subclassLabel: "Druid Circle",
    unlockLevel: 2,
    featureLevels: Object.freeze([2, 6, 10, 14])
  }),
  fighter: Object.freeze({
    subclassLabel: "Martial Archetype",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 7, 10, 15, 18])
  }),
  monk: Object.freeze({
    subclassLabel: "Monastic Tradition",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 6, 11, 17])
  }),
  paladin: Object.freeze({
    subclassLabel: "Sacred Oath",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 7, 15, 20])
  }),
  ranger: Object.freeze({
    subclassLabel: "Ranger Archetype",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 7, 11, 15])
  }),
  rogue: Object.freeze({
    subclassLabel: "Roguish Archetype",
    unlockLevel: 3,
    featureLevels: Object.freeze([3, 9, 13, 17])
  }),
  sorcerer: Object.freeze({
    subclassLabel: "Sorcerous Origin",
    unlockLevel: 1,
    featureLevels: Object.freeze([1, 6, 14, 18])
  }),
  warlock: Object.freeze({
    subclassLabel: "Otherworldly Patron",
    unlockLevel: 1,
    featureLevels: Object.freeze([1, 6, 10, 14])
  }),
  wizard: Object.freeze({
    subclassLabel: "Arcane Tradition",
    unlockLevel: 2,
    featureLevels: Object.freeze([2, 6, 10, 14])
  })
});

const normalizeSubclassId = (value) => String(value || "")
  .normalize("NFKD")
  .trim()
  .toLowerCase()
  .replace(/[\u2018\u2019'`\u00b4]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const SUBCLASS_MATCH_AFFIXES = Object.freeze({
  artificer: Object.freeze({ prefixes: [], suffixes: [] }),
  barbarian: Object.freeze({ prefixes: ["path-of-the-", "path-of-"], suffixes: [] }),
  bard: Object.freeze({ prefixes: ["college-of-"], suffixes: [] }),
  cleric: Object.freeze({ prefixes: [], suffixes: ["-domain"] }),
  druid: Object.freeze({ prefixes: ["circle-of-the-", "circle-of-"], suffixes: [] }),
  fighter: Object.freeze({ prefixes: [], suffixes: [] }),
  monk: Object.freeze({ prefixes: ["way-of-the-", "way-of-"], suffixes: [] }),
  paladin: Object.freeze({ prefixes: ["oath-of-the-", "oath-of-"], suffixes: [] }),
  ranger: Object.freeze({ prefixes: [], suffixes: [] }),
  rogue: Object.freeze({ prefixes: [], suffixes: [] }),
  sorcerer: Object.freeze({ prefixes: [], suffixes: [] }),
  warlock: Object.freeze({ prefixes: ["the-"], suffixes: [] }),
  wizard: Object.freeze({ prefixes: ["school-of-the-", "school-of-"], suffixes: [] })
});

const uniqueStrings = (values) => [
  ...new Set(
    values
      .map(normalizeSubclassId)
      .filter(Boolean)
  )
];

const normalizeSubclassMatchAlias = (value, classId) => {
  let normalized = normalizeSubclassId(value);
  const affixes = SUBCLASS_MATCH_AFFIXES[normalizeSubclassId(classId)] || {
    prefixes: [],
    suffixes: []
  };

  affixes.prefixes.forEach((prefix) => {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
    }
  });

  affixes.suffixes.forEach((suffix) => {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
    }
  });

  return normalizeSubclassId(normalized);
};

const getSubclassMatchKeys = (subclass, fallbackClassId = "") => {
  const classId = normalizeSubclassId(subclass?.classId || fallbackClassId);
  const rawAliases = Array.isArray(subclass?.aliases)
    ? subclass.aliases
    : [];
  const identityValues = [
    subclass?.id,
    subclass?.name,
    ...rawAliases
  ];

  return uniqueStrings([
    ...identityValues,
    ...identityValues.map((value) => normalizeSubclassMatchAlias(value, classId))
  ]);
};

const hasOwn = (owner, key) => Object.prototype.hasOwnProperty.call(owner || {}, key);

const copyArray = (value, fallback = []) => Object.freeze([
  ...(Array.isArray(value) ? value : fallback)
]);

const copyFeatureMap = (value) => Object.freeze(
  Object.fromEntries(
    Object.entries(value || {}).map(([level, features]) => [
      level,
      copyArray(features)
    ])
  )
);

const getDetailedFeaturesByLevel = (detailed) => {
  const fromLevels = Object.fromEntries(
    Object.entries(detailed?.levels || {})
      .filter(([, levelData]) => (
        Array.isArray(levelData?.features) &&
        levelData.features.length > 0
      ))
      .map(([level, levelData]) => [level, levelData.features])
  );
  const explicit = detailed?.featuresByLevel &&
    typeof detailed.featuresByLevel === "object" &&
    !Array.isArray(detailed.featuresByLevel)
      ? detailed.featuresByLevel
      : {};

  return {
    ...fromLevels,
    ...explicit
  };
};

const createFeaturesByLevel = (featureLevels) => Object.freeze(
  Object.fromEntries(
    featureLevels.map((level) => [level, Object.freeze([])])
  )
);

const createSubclassRecord = (classId, name) => {
  const normalizedClassId = normalizeSubclassId(classId);
  const config = SUBCLASS_CLASS_CONFIG[normalizedClassId];
  const featureLevels = config?.featureLevels || Object.freeze([]);

  return Object.freeze({
    schemaVersion: DEFAULT_SUBCLASS_SCHEMA_VERSION,
    id: normalizeSubclassId(name),
    classId: normalizedClassId,
    name: String(name || "").trim(),
    source: "name-list",
    summary: "Description not filled in yet.",
    description: "Add this subclass's full table description here.",
    subclassLabel: config?.subclassLabel || "Subclass",
    unlockLevel: config?.unlockLevel || 1,
    featureLevels,
    featuresByLevel: createFeaturesByLevel(featureLevels),
    expandedSpells: Object.freeze({}),
    choices: Object.freeze([]),
    effects: Object.freeze([])
  });
};

const findMatchingSubclassIndex = (
  subclasses,
  candidate,
  fallbackClassId = ""
) => {
  const candidateClassId = normalizeSubclassId(
    candidate?.classId || fallbackClassId
  );
  const candidateId = normalizeSubclassId(candidate?.id);
  const candidateName = normalizeSubclassId(candidate?.name);
  const candidateKeys = new Set(
    getSubclassMatchKeys(candidate, candidateClassId)
  );

  const sameClass = (subclass) => normalizeSubclassId(
    subclass?.classId || fallbackClassId
  ) === candidateClassId;

  const exactIdMatch = subclasses.findIndex((subclass) => (
    sameClass(subclass) &&
    candidateId &&
    normalizeSubclassId(subclass?.id) === candidateId
  ));

  if (exactIdMatch >= 0) {
    return exactIdMatch;
  }

  const exactNameMatch = subclasses.findIndex((subclass) => (
    sameClass(subclass) &&
    candidateName &&
    normalizeSubclassId(subclass?.name) === candidateName
  ));

  if (exactNameMatch >= 0) {
    return exactNameMatch;
  }

  return subclasses.findIndex((subclass) => {
    if (!sameClass(subclass)) {
      return false;
    }

    return getSubclassMatchKeys(subclass, candidateClassId)
      .some((key) => candidateKeys.has(key));
  });
};

const mergeSubclassRecord = (
  placeholder,
  detailed,
  fallbackClassId = ""
) => {
  const hasPlaceholder = Boolean(placeholder);
  const classId = normalizeSubclassId(
    detailed?.classId ||
    placeholder?.classId ||
    fallbackClassId
  );
  const detailedDefinedFields = Object.fromEntries(
    Object.entries(detailed || {}).filter(([, value]) => value !== undefined)
  );
  const fallbackName = String(
    detailed?.name ||
    placeholder?.name ||
    detailed?.id ||
    "Subclass"
  ).trim();
  const base = placeholder || createSubclassRecord(classId, fallbackName);
  const detailedFeaturesByLevel = getDetailedFeaturesByLevel(detailed);
  const featuresByLevel = {
    ...(base.featuresByLevel || {}),
    ...detailedFeaturesByLevel
  };
  const featureLevels = [
    ...new Set([
      ...(Array.isArray(base.featureLevels) ? base.featureLevels : []),
      ...(Array.isArray(detailed?.featureLevels) ? detailed.featureLevels : []),
      ...Object.keys(detailedFeaturesByLevel).map(Number)
    ])
  ]
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 20)
    .sort((a, b) => a - b);
  const aliases = uniqueStrings([
    ...(Array.isArray(base.aliases) ? base.aliases : []),
    ...(Array.isArray(detailed?.aliases) ? detailed.aliases : []),
    base.id,
    base.name,
    detailed?.id,
    detailed?.name,
    normalizeSubclassMatchAlias(base.id, classId),
    normalizeSubclassMatchAlias(base.name, classId),
    normalizeSubclassMatchAlias(detailed?.id, classId),
    normalizeSubclassMatchAlias(detailed?.name, classId)
  ]);
  const expandedSpells = {
    ...(base.expandedSpells || {}),
    ...(detailed?.expandedSpells || {})
  };
  const merged = {
    ...base,
    ...detailedDefinedFields,
    schemaVersion:
      detailed?.schemaVersion ??
      base.schemaVersion ??
      DEFAULT_SUBCLASS_SCHEMA_VERSION,
    classId,
    id: hasPlaceholder
      ? normalizeSubclassId(base.id || base.name)
      : normalizeSubclassId(detailed?.id || detailed?.name || base.id),
    name: hasPlaceholder
      ? String(base.name || detailed?.name || "Subclass").trim()
      : String(detailed?.name || base.name || "Subclass").trim(),
    featureLevels: copyArray(featureLevels),
    featuresByLevel: copyFeatureMap(featuresByLevel),
    expandedSpells: Object.freeze(expandedSpells),
    choices: copyArray(
      hasOwn(detailed, "choices") ? detailed.choices : base.choices
    ),
    effects: copyArray(
      hasOwn(detailed, "effects") ? detailed.effects : base.effects
    ),
    aliases: copyArray(aliases)
  };

  if (hasOwn(detailed, "resources") || hasOwn(base, "resources")) {
    const resources = hasOwn(detailed, "resources")
      ? detailed.resources
      : base.resources;

    merged.resources = Array.isArray(resources)
      ? copyArray(resources)
      : resources && typeof resources === "object"
        ? Object.freeze({ ...resources })
        : resources;
  }

  return Object.freeze(merged);
};

export function mergeDefaultSubclassCollections(
  placeholderSubclasses,
  detailedSubclasses,
  options = {}
) {
  const fallbackClassId = normalizeSubclassId(options.classId);
  const merged = [];

  (Array.isArray(placeholderSubclasses) ? placeholderSubclasses : [])
    .forEach((placeholder) => {
      const normalizedPlaceholder = mergeSubclassRecord(
        null,
        placeholder,
        fallbackClassId
      );
      const matchIndex = findMatchingSubclassIndex(
        merged,
        normalizedPlaceholder,
        fallbackClassId
      );

      if (matchIndex >= 0) {
        merged[matchIndex] = mergeSubclassRecord(
          merged[matchIndex],
          normalizedPlaceholder,
          fallbackClassId
        );
      } else {
        merged.push(normalizedPlaceholder);
      }
    });

  (Array.isArray(detailedSubclasses) ? detailedSubclasses : [])
    .forEach((detailed) => {
      const candidate = {
        ...detailed,
        classId: detailed?.classId || fallbackClassId
      };
      const matchIndex = findMatchingSubclassIndex(
        merged,
        candidate,
        fallbackClassId
      );

      if (matchIndex >= 0) {
        merged[matchIndex] = mergeSubclassRecord(
          merged[matchIndex],
          candidate,
          fallbackClassId
        );
      } else {
        merged.push(
          mergeSubclassRecord(
            null,
            candidate,
            fallbackClassId
          )
        );
      }
    });

  return Object.freeze(merged);
}

const buildDefaultSubclasses = () => Object.entries(SUBCLASS_NAME_LIST)
  .flatMap(([classId, subclassNames]) => {
    if (!Array.isArray(subclassNames)) {
      return [];
    }

    return subclassNames.map((name) => createSubclassRecord(classId, name));
  });

const makeNestedSubclassMap = (subclasses) => {
  const subclassMap = {};

  subclasses.forEach((subclass) => {
    if (!subclassMap[subclass.classId]) {
      subclassMap[subclass.classId] = {};
    }

    subclassMap[subclass.classId][subclass.id] = subclass;
  });

  Object.keys(subclassMap).forEach((classId) => {
    subclassMap[classId] = Object.freeze(subclassMap[classId]);
  });

  return Object.freeze(subclassMap);
};

export function validateDefaultSubclassCollection(subclasses) {
  const errors = [];

  if (!Array.isArray(subclasses)) {
    return {
      valid: false,
      errors: ["Subclass collection must be an array."]
    };
  }

  const seenSubclassIds = new Set();

  subclasses.forEach((subclass, index) => {
    const label = `Subclass ${index + 1}`;
    const id = normalizeSubclassId(subclass?.id || subclass?.name);
    const classId = normalizeSubclassId(subclass?.classId);

    if (!subclass || typeof subclass !== "object") {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (subclass.schemaVersion !== DEFAULT_SUBCLASS_SCHEMA_VERSION) {
      errors.push(`${label} must use schema version ${DEFAULT_SUBCLASS_SCHEMA_VERSION}.`);
    }

    if (!id) {
      errors.push(`${label} is missing an id.`);
    }

    if (!classId) {
      errors.push(`${label} is missing a classId.`);
    }

    if (!String(subclass.name || "").trim()) {
      errors.push(`${label} is missing a name.`);
    }

    if (!String(subclass.source || "").trim()) {
      errors.push(`${label} is missing a source.`);
    }

    if (!String(subclass.summary || "").trim()) {
      errors.push(`${label} is missing a summary.`);
    }

    if (!String(subclass.description || "").trim()) {
      errors.push(`${label} is missing a description.`);
    }

    if (!String(subclass.subclassLabel || "").trim()) {
      errors.push(`${label} is missing a subclassLabel.`);
    }

    if (!Number.isInteger(subclass.unlockLevel) || subclass.unlockLevel < 1 || subclass.unlockLevel > 20) {
      errors.push(`${label} must have an unlockLevel between 1 and 20.`);
    }

    if (!Array.isArray(subclass.featureLevels)) {
      errors.push(`${label} featureLevels must be an array.`);
    }

    if (!subclass.featuresByLevel || typeof subclass.featuresByLevel !== "object" || Array.isArray(subclass.featuresByLevel)) {
      errors.push(`${label} featuresByLevel must be an object.`);
    } else if (Array.isArray(subclass.featureLevels)) {
      subclass.featureLevels.forEach((level) => {
        if (!Array.isArray(subclass.featuresByLevel[level])) {
          errors.push(`${label} featuresByLevel.${level} must be an array.`);
        }
      });
    }

    if (!subclass.expandedSpells || typeof subclass.expandedSpells !== "object" || Array.isArray(subclass.expandedSpells)) {
      errors.push(`${label} expandedSpells must be an object.`);
    }

    if (!Array.isArray(subclass.choices)) {
      errors.push(`${label} choices must be an array.`);
    }

    if (!Array.isArray(subclass.effects)) {
      errors.push(`${label} effects must be an array.`);
    }

    const duplicateKey = `${classId}:${id}`;

    if (classId && id && seenSubclassIds.has(duplicateKey)) {
      errors.push(`${label} duplicates subclass id "${id}" for class "${classId}".`);
    }

    seenSubclassIds.add(duplicateKey);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export const DEFAULT_SUBCLASSES = Object.freeze(buildDefaultSubclasses());

const defaultSubclassValidation = validateDefaultSubclassCollection(
  DEFAULT_SUBCLASSES
);

if (!defaultSubclassValidation.valid) {
  throw new Error(
    `Invalid default subclass data: ${defaultSubclassValidation.errors.join(" ")}`
  );
}

export const DEFAULT_SUBCLASS_MAP = makeNestedSubclassMap(DEFAULT_SUBCLASSES);

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
