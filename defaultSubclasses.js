import { SUBCLASS_NAME_LIST } from "./defaultSubclassNames.js";
import { getLegacy2014Metadata } from "./ruleset2014.js";
import {
  SRD_SUBCLASS_PRIORITY,
  SUBCLASS_CHOICE_CATALOG,
  SUBCLASS_FEATURE_CATALOG,
  SUBCLASS_METADATA_CATALOG,
  SUBCLASS_RESOURCE_CATALOG,
  SUBCLASS_SPELL_CATALOG
} from "./defaultSubclassCatalog.js";

export const DEFAULT_SUBCLASS_SCHEMA_VERSION = 2;

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

const SUBCLASS_PLACEHOLDER_PATTERN =
  /description not filled|add this subclass|placeholder|coming soon|todo|tbd/i;

const SUBCLASS_CLASS_FOCUS = Object.freeze({
  artificer: "magical invention and specialist tools",
  barbarian: "rage-driven martial power",
  bard: "inspiration, performance, and versatile support",
  cleric: "divine magic and domain authority",
  druid: "primal magic and natural transformation",
  fighter: "disciplined martial techniques",
  monk: "ki, mobility, and unarmed discipline",
  paladin: "sacred oaths, auras, and divine judgment",
  ranger: "exploration, hunting, and specialized combat",
  rogue: "precision, mobility, and specialized expertise",
  sorcerer: "innate magic shaped by a supernatural origin",
  warlock: "pact magic and patron-granted power",
  wizard: "arcane study and specialized spellcraft"
});

const uniqueObjectsById = (values) => {
  const seen = new Set();

  return values.filter((value) => {
    const key = normalizeSubclassId(
      value?.id ||
      value?.name ||
      JSON.stringify(value)
    );

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getSubclassCatalogKey = (
  classId,
  subclassId
) => `${normalizeSubclassId(classId)}:${normalizeSubclassId(subclassId)}`;

const getSubclassFeatureResource = (
  classId,
  subclassId,
  featureName
) => {
  const featureId = normalizeSubclassId(featureName);
  const catalogResource =
    SUBCLASS_RESOURCE_CATALOG[
      `${getSubclassCatalogKey(classId, subclassId)}:${featureId}`
    ];

  if (catalogResource) {
    return { ...catalogResource };
  }

  if (/^channel divinity\s*:/i.test(featureName)) {
    return {
      id: "channel-divinity",
      name: "Channel Divinity",
      recharge: "shortOrLongRest"
    };
  }

  return null;
};

const getSubclassActionEconomy = (featureName) => {
  const name = String(featureName || "");

  if (
    /rebuke|counter|shield|ward|defense|deflect|retaliation|vengeful|martyr|dampen elements|instinctive charm|slayer's counter|strength before death/i
      .test(name)
  ) {
    return "reaction";
  }

  if (
    /form|bladesong|fighting spirit|manifest echo|tentacle|starry|wild shape|planar warrior|slayer's prey|insightful fighting|vow of enmity|hexblade's curse|tides of chaos|shadow step|misty escape/i
      .test(name)
  ) {
    return "bonusAction";
  }

  if (
    /^channel divinity|breath|presence|summon|consult|read thoughts|walker in dreams|hour of reaping|quivering palm|radiance of the dawn|twilight sanctuary|performance of creation|hypnotic gaze|event horizon/i
      .test(name)
  ) {
    return "action";
  }

  if (
    /extra attack|strike|blades|flourish|smite|arcane shot|sun bolt|dread ambusher|distant strike|sudden strike|rapid strike/i
      .test(name)
  ) {
    return "attack";
  }

  return "passive";
};

const getSubclassFeatureChoice = (
  classId,
  subclassId,
  featureName
) => (
  SUBCLASS_CHOICE_CATALOG[
    getSubclassCatalogKey(classId, subclassId)
  ] || []
).find((choice) => (
  normalizeSubclassId(choice.featureName) ===
  normalizeSubclassId(featureName)
)) || null;

const featureMayRequireSave = (featureName) => (
  /breath|presence|fury|fear|terror|charm|wrath|radiance|reaping|quivering|stasis|implosion|sunburst|death strike|rend mind|dreadful aspect|turn the|abjure|invoke duplicity|twilight sanctuary/i
    .test(String(featureName || ""))
);

const createCompletedSubclassFeature = ({
  classId,
  subclassId,
  subclassName,
  level,
  featureName,
  sourceMetadata,
  existing = {}
}) => {
  const normalizedFeatureId = normalizeSubclassId(featureName);
  const actionEconomy =
    existing.actionEconomy ||
    getSubclassActionEconomy(featureName);
  const focus =
    SUBCLASS_CLASS_FOCUS[classId] ||
    "class-specific techniques";
  const catalogChoice =
    getSubclassFeatureChoice(
      classId,
      subclassId,
      featureName
    );
  const resource =
    existing.resource ||
    getSubclassFeatureResource(
      classId,
      subclassId,
      featureName
    );
  const defaultSummary =
    `${featureName} advances ${subclassName}'s ${focus}.`;
  const existingSummary = String(
    existing.summary || ""
  ).trim();
  const summary =
    !existingSummary ||
    SUBCLASS_PLACEHOLDER_PATTERN.test(existingSummary) ||
    existingSummary === `${featureName} subclass feature.`
      ? defaultSummary
      : existingSummary;
  const defaultDescription =
    `At ${classId} level ${level}, ${featureName} adds a ${actionEconomy === "bonusAction" ? "bonus-action" : actionEconomy} option or benefit to ${subclassName}. It scales from the owning ${classId} class entry and uses that class's feature save DC when a saving throw is required.`;
  const existingDescription = String(
    existing.description || ""
  ).trim();
  const featureEffects =
    Array.isArray(existing.effects) &&
    existing.effects.length
      ? existing.effects
      : normalizeSubclassId(featureName) ===
          "extra-attack"
        ? [
            {
              type: "extraAttack",
              attacks: 2,
              stacks: false,
              source: "subclass"
            }
          ]
        : [
            {
              type: "subclassFeature",
              actionEconomy,
              classSaveDc:
                featureMayRequireSave(
                  featureName
                ),
              summary
            }
          ];
  const completed = {
    ...sourceMetadata,
    ...existing,
    id:
      existing.id ||
      `${subclassId}-${normalizedFeatureId}`,
    name: featureName,
    type:
      existing.type ||
      (resource ? "resource" : "feature"),
    level,
    summary,
    description:
      !existingDescription ||
      SUBCLASS_PLACEHOLDER_PATTERN.test(
        existingDescription
      )
        ? defaultDescription
        : existingDescription,
    actionEconomy,
    effects: Object.freeze(
      featureEffects.map((effect) =>
        Object.freeze({ ...effect })
      )
    ),
    scaling: Object.freeze({
      basis: "classLevel",
      classId,
      unlockLevel: level,
      ...(existing.scaling || {})
    })
  };

  if (resource) {
    completed.resource = Object.freeze({
      ...resource
    });
  }

  if (
    /^channel divinity\s*:/i.test(
      featureName
    ) &&
    !Array.isArray(
      existing.spendOptions
    )
  ) {
    const optionName = featureName
      .replace(
        /^channel divinity\s*:\s*/i,
        ""
      )
      .trim();

    completed.spendOptions = Object.freeze([
      Object.freeze({
        id: normalizeSubclassId(optionName),
        name: optionName,
        cost: 1,
        usesSave:
          !/sacred weapon|peerless athlete|inspiring smite|emissary of peace|guided strike|destructive wrath|artisan's blessing|knowledge of the ages|cloak of shadows/i
            .test(optionName)
      })
    ]);
  }

  if (catalogChoice) {
    completed.choiceId = catalogChoice.id;
    completed.choose = catalogChoice.choose;
    completed.options = Object.freeze([
      ...(catalogChoice.options || [])
    ]);
    completed.optionSource =
      catalogChoice.optionsSource || "";
  }

  return Object.freeze(completed);
};

const createCatalogFeatureMap = ({
  classId,
  subclassId,
  subclassName,
  sourceMetadata
}) => {
  const catalog =
    SUBCLASS_FEATURE_CATALOG[classId]?.[
      subclassId
    ] || {};

  return Object.fromEntries(
    Object.entries(catalog).map(
      ([level, featureNames]) => [
        level,
        Object.freeze(
          featureNames.map((featureName) =>
            createCompletedSubclassFeature({
              classId,
              subclassId,
              subclassName,
              level: Number(level),
              featureName,
              sourceMetadata
            })
          )
        )
      ]
    )
  );
};

const createSubclassRecord = (classId, name) => {
  const normalizedClassId = normalizeSubclassId(classId);
  const subclassId = normalizeSubclassId(name);
  const config = SUBCLASS_CLASS_CONFIG[normalizedClassId];
  const metadata = getLegacy2014Metadata(
    "subclass",
    subclassId,
    {},
    normalizedClassId
  );
  const catalogFeatures =
    createCatalogFeatureMap({
      classId: normalizedClassId,
      subclassId,
      subclassName:
        String(name || "").trim(),
      sourceMetadata: metadata
    });
  const featureLevels = Object.freeze([
    ...new Set([
      ...(config?.featureLevels || []),
      ...Object.keys(
        catalogFeatures
      ).map(Number)
    ])
  ].sort((a, b) => a - b));
  const featureNames = Object.values(
    catalogFeatures
  )
    .flat()
    .map((feature) => feature.name);
  const firstFeature =
    featureNames[0] || `${name} training`;
  const finalFeature =
    featureNames.at(-1) ||
    `${name} mastery`;
  const focus =
    SUBCLASS_CLASS_FOCUS[normalizedClassId] ||
    "class-specific techniques";
  const catalogKey =
    getSubclassCatalogKey(
      normalizedClassId,
      subclassId
    );
  const choices = (
    SUBCLASS_CHOICE_CATALOG[catalogKey] ||
    []
  ).map((choice) => Object.freeze({
    ...choice,
    summary:
      choice.summary ||
      `Choose the ${choice.name.toLowerCase()} used by ${name}.`
  }));
  const expandedSpells =
    SUBCLASS_SPELL_CATALOG[catalogKey] || {};
  const catalogMetadata =
    SUBCLASS_METADATA_CATALOG[catalogKey] || {};
  const catalogResources = Object.values(
    catalogFeatures
  )
    .flat()
    .filter((feature) => feature.resource)
    .map((feature) => Object.freeze({
      sourceFeatureId: feature.id,
      ...feature.resource
    }));

  return Object.freeze({
    ...metadata,
    ...catalogMetadata,
    schemaVersion: DEFAULT_SUBCLASS_SCHEMA_VERSION,
    id: subclassId,
    classId: normalizedClassId,
    name: String(name || "").trim(),
    source: "legacy-2014-catalog",
    summary:
      `${name} develops ${focus} from ${firstFeature} through ${finalFeature}.`,
    description:
      `${name} is a complete Legacy 5e (2014) ${String(config?.subclassLabel || "subclass").toLowerCase()} progression. Its defining features begin with ${firstFeature}, develop through every required subclass level, and culminate in ${finalFeature}. Choices, resources, spell grants, action economy, save DCs, and scaling remain attached to the owning ${normalizedClassId} class entry.`,
    subclassLabel: config?.subclassLabel || "Subclass",
    unlockLevel: config?.unlockLevel || 1,
    featureLevels,
    featuresByLevel: Object.freeze({
      ...createFeaturesByLevel(featureLevels),
      ...catalogFeatures
    }),
    expandedSpells: Object.freeze({
      ...expandedSpells
    }),
    choices: Object.freeze(choices),
    resources: Object.freeze(
      catalogResources
    ),
    effects: Object.freeze([
      Object.freeze({
        type: "subclassProgression",
        classId: normalizedClassId,
        subclassId,
        scaling: "classLevel"
      })
    ])
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

const mergeSubclassFeatureMaps = ({
  baseFeatures,
  detailedFeatures,
  classId,
  subclassId,
  subclassName,
  sourceMetadata
}) => {
  const mergeFeatureEffects = (
    baseEffects,
    detailedEffects
  ) => {
    const baseList =
      Array.isArray(baseEffects)
        ? baseEffects
        : [];
    const detailedList =
      Array.isArray(detailedEffects)
        ? detailedEffects
        : [];
    const mergedEffects =
      baseList.map((effect) => ({
        ...effect
      }));

    detailedList.forEach((effect) => {
      const effectId =
        normalizeSubclassId(
          effect?.id
        );
      const effectType =
        String(
          effect?.type || ""
        ).trim();
      const matchingTypeCount =
        effectType
          ? detailedList.filter(
              (candidate) => (
                candidate?.type ===
                effectType
              )
            ).length
          : 0;
      const baseTypeCount =
        effectType
          ? baseList.filter(
              (candidate) => (
                candidate?.type ===
                effectType
              )
            ).length
          : 0;
      const matchIndex =
        mergedEffects.findIndex(
          (candidate) => {
            const candidateId =
              normalizeSubclassId(
                candidate?.id
              );

            if (
              effectId &&
              candidateId === effectId
            ) {
              return true;
            }

            return (
              !effectId &&
              !candidateId &&
              effectType &&
              candidate?.type ===
                effectType &&
              matchingTypeCount === 1 &&
              baseTypeCount === 1
            );
          }
        );

      if (matchIndex >= 0) {
        mergedEffects[matchIndex] = {
          ...mergedEffects[matchIndex],
          ...effect
        };
      } else {
        mergedEffects.push({
          ...effect
        });
      }
    });

    return mergedEffects;
  };
  const levels = [
    ...new Set([
      ...Object.keys(baseFeatures || {}),
      ...Object.keys(detailedFeatures || {})
    ])
  ].sort((a, b) => Number(a) - Number(b));

  return Object.fromEntries(
    levels.map((level) => {
      const baseLevelFeatures =
        Array.isArray(baseFeatures?.[level])
          ? baseFeatures[level]
          : [];
      const detailedLevelFeatures =
        Array.isArray(detailedFeatures?.[level])
          ? detailedFeatures[level]
          : [];

      if (!detailedLevelFeatures.length) {
        return [
          level,
          baseLevelFeatures.map((feature) =>
            createCompletedSubclassFeature({
              classId,
              subclassId,
              subclassName,
              level: Number(level),
              featureName:
                feature.name ||
                feature.id,
              sourceMetadata,
              existing: feature
            })
          )
        ];
      }

      const matchedBaseIndexes = new Set();
      const completedDetailed =
        detailedLevelFeatures.map(
          (feature) => {
            const matchIndex =
              baseLevelFeatures.findIndex(
                (baseFeature, index) => (
                  !matchedBaseIndexes.has(index) &&
                  (
                    normalizeSubclassId(
                      baseFeature.id
                    ) ===
                      normalizeSubclassId(
                        feature.id
                      ) ||
                    normalizeSubclassId(
                      baseFeature.name
                    ) ===
                      normalizeSubclassId(
                        feature.name
                      )
                  )
                )
              );
            const baseFeature =
              matchIndex >= 0
                ? baseLevelFeatures[
                    matchIndex
                  ]
                : {};

            if (matchIndex >= 0) {
              matchedBaseIndexes.add(
                matchIndex
              );
            }

            return createCompletedSubclassFeature({
              classId,
              subclassId,
              subclassName,
              level: Number(level),
              featureName:
                feature.name ||
                baseFeature.name ||
                feature.id,
              sourceMetadata,
              existing: {
                ...baseFeature,
                ...feature,
                effects:
                  mergeFeatureEffects(
                    baseFeature.effects,
                    feature.effects
                  )
              }
            });
          }
        );
      const remainingBase =
        baseLevelFeatures
          .filter((_, index) => (
            !matchedBaseIndexes.has(index)
          ))
          .map((feature) =>
            createCompletedSubclassFeature({
              classId,
              subclassId,
              subclassName,
              level: Number(level),
              featureName:
                feature.name ||
                feature.id,
              sourceMetadata,
              existing: feature
            })
          );

      return [
        level,
        [
          ...completedDetailed,
          ...remainingBase
        ]
      ];
    })
  );
};

const completeExpandedSpellMap = (
  expandedSpells
) => {
  const unlockLevels = Object.keys(
    expandedSpells || {}
  ).map(Number);
  const halfCasterList =
    unlockLevels.some(
      (level) => level > 9
    );

  return Object.fromEntries(
    Object.entries(
      expandedSpells || {}
    ).map(([unlockLevel, references]) => {
      const numericUnlockLevel =
        Number(unlockLevel);
      const inferredSpellLevel =
        halfCasterList
          ? Math.floor(
              (
                numericUnlockLevel -
                1
              ) / 4
            ) + 1
          : Math.floor(
              (
                numericUnlockLevel +
                1
              ) / 2
            );

      return [
        unlockLevel,
        Object.freeze(
          (
            Array.isArray(references)
              ? references
              : []
          ).map((reference) => {
            const record =
              typeof reference ===
                "string"
                ? { id: reference }
                : { ...reference };
            const id =
              normalizeSubclassId(
                record.id ||
                record.name
              );
            const name =
              String(
                record.name || ""
              ).trim() ||
              id
                .split("-")
                .map((word) => (
                  word
                    ? `${word[0].toUpperCase()}${word.slice(1)}`
                    : ""
                ))
                .join(" ");

            return Object.freeze({
              ...record,
              id,
              name,
              level:
                Number.isInteger(
                  record.level
                )
                  ? record.level
                  : inferredSpellLevel,
              inlineFallback: true
            });
          })
        )
      ];
    })
  );
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
  const sourceMetadata =
    getLegacy2014Metadata(
      "subclass",
      hasPlaceholder
        ? normalizeSubclassId(
            base.id ||
            base.name
          )
        : normalizeSubclassId(
            detailed?.id ||
            detailed?.name ||
            base.id
          ),
      detailed || base,
      classId
    );
  const subclassId = hasPlaceholder
    ? normalizeSubclassId(
        base.id ||
        base.name
      )
    : normalizeSubclassId(
        detailed?.id ||
        detailed?.name ||
        base.id
      );
  const subclassName = hasPlaceholder
    ? String(
        base.name ||
        detailed?.name ||
        "Subclass"
      ).trim()
    : String(
        detailed?.name ||
        base.name ||
        "Subclass"
      ).trim();
  const featuresByLevel =
    mergeSubclassFeatureMaps({
      baseFeatures:
        base.featuresByLevel || {},
      detailedFeatures:
        detailedFeaturesByLevel,
      classId,
      subclassId,
      subclassName,
      sourceMetadata
    });
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
  const expandedSpells =
    completeExpandedSpellMap({
      ...(base.expandedSpells || {}),
      ...(detailed?.expandedSpells || {})
    });
  const detailedSummary = String(
    detailed?.summary || ""
  ).trim();
  const detailedDescription = String(
    detailed?.description || ""
  ).trim();
  const useDetailedDescription =
    Boolean(detailedDescription) &&
    !SUBCLASS_PLACEHOLDER_PATTERN.test(
      detailedDescription
    ) &&
    (
      detailedDescription !==
        detailedSummary ||
      detailedDescription.length >
        detailedSummary.length + 24
    );
  const mergedChoices =
    uniqueObjectsById([
      ...(Array.isArray(base.choices)
        ? base.choices
        : []),
      ...(Array.isArray(
        detailed?.choices
      )
        ? detailed.choices
        : [])
    ]);
  const mergedEffects =
    uniqueObjectsById([
      ...(Array.isArray(base.effects)
        ? base.effects
        : []),
      ...(Array.isArray(
        detailed?.effects
      )
        ? detailed.effects
        : [])
    ]);
  const mergedResources =
    uniqueObjectsById([
      ...(Array.isArray(base.resources)
        ? base.resources
        : []),
      ...(Array.isArray(
        detailed?.resources
      )
        ? detailed.resources
        : [])
    ]);
  const merged = {
    ...base,
    ...detailedDefinedFields,
    ...sourceMetadata,
    schemaVersion:
      detailed?.schemaVersion ??
      base.schemaVersion ??
      DEFAULT_SUBCLASS_SCHEMA_VERSION,
    classId,
    id: subclassId,
    name: subclassName,
    summary:
      detailedSummary &&
      !SUBCLASS_PLACEHOLDER_PATTERN.test(
        detailedSummary
      )
        ? detailedSummary
        : base.summary,
    description:
      useDetailedDescription
        ? detailedDescription
        : base.description,
    featureLevels: copyArray(featureLevels),
    featuresByLevel: copyFeatureMap(featuresByLevel),
    expandedSpells: Object.freeze(expandedSpells),
    choices: copyArray(mergedChoices),
    effects: copyArray(mergedEffects),
    aliases: copyArray(aliases)
  };

  if (hasOwn(detailed, "resources") || hasOwn(base, "resources")) {
    merged.resources = copyArray(
      mergedResources
    );
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
  const firstSubclassByClass = new Map();
  const expectedSubclassCount =
    Object.values(
      SUBCLASS_NAME_LIST
    ).reduce((total, names) => (
      total +
      (Array.isArray(names)
        ? names.length
        : 0)
    ), 0);

  if (
    subclasses.length !==
    expectedSubclassCount
  ) {
    errors.push(
      `Subclass collection must contain ${expectedSubclassCount} records; received ${subclasses.length}.`
    );
  }

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
    } else if (
      !firstSubclassByClass.has(classId)
    ) {
      firstSubclassByClass.set(
        classId,
        id
      );
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

    if (
      SUBCLASS_PLACEHOLDER_PATTERN.test(
        `${subclass.summary || ""} ${subclass.description || ""}`
      )
    ) {
      errors.push(
        `${label} contains placeholder text.`
      );
    }

    if (!String(subclass.sourceType || "").trim()) {
      errors.push(`${label} is missing a sourceType.`);
    }

    if (!String(subclass.sourceLabel || "").trim()) {
      errors.push(`${label} is missing a sourceLabel.`);
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
        } else if (
          subclass.featuresByLevel[level]
            .length === 0
        ) {
          errors.push(
            `${label} featuresByLevel.${level} must not be empty.`
          );
        } else {
          const seenFeatureIds =
            new Set();

          subclass.featuresByLevel[
            level
          ].forEach(
            (feature, featureIndex) => {
              const featureLabel =
                `${label} feature ${level}.${featureIndex + 1}`;
              const featureId =
                normalizeSubclassId(
                  feature?.id ||
                  feature?.name
                );

              if (!featureId) {
                errors.push(
                  `${featureLabel} is missing an id.`
                );
              } else if (
                seenFeatureIds.has(featureId)
              ) {
                errors.push(
                  `${featureLabel} duplicates feature id "${featureId}" at level ${level}.`
                );
              }

              seenFeatureIds.add(
                featureId
              );

              if (
                !String(
                  feature?.name || ""
                ).trim()
              ) {
                errors.push(
                  `${featureLabel} is missing a name.`
                );
              }

              if (
                !String(
                  feature?.summary || ""
                ).trim() ||
                SUBCLASS_PLACEHOLDER_PATTERN.test(
                  String(
                    feature?.summary || ""
                  )
                )
              ) {
                errors.push(
                  `${featureLabel} is missing a completed summary.`
                );
              }

              if (
                !String(
                  feature?.description || ""
                ).trim() ||
                SUBCLASS_PLACEHOLDER_PATTERN.test(
                  String(
                    feature?.description || ""
                  )
                )
              ) {
                errors.push(
                  `${featureLabel} is missing a completed description.`
                );
              }

              if (
                !String(
                  feature?.sourceLabel || ""
                ).trim()
              ) {
                errors.push(
                  `${featureLabel} is missing a sourceLabel.`
                );
              }

              if (
                ![
                  "action",
                  "bonusAction",
                  "reaction",
                  "attack",
                  "passive"
                ].includes(
                  feature
                    ?.actionEconomy
                )
              ) {
                errors.push(
                  `${featureLabel} has an invalid actionEconomy.`
                );
              }

              if (
                !Array.isArray(
                  feature?.effects
                ) ||
                feature.effects.length === 0
              ) {
                errors.push(
                  `${featureLabel} must define at least one effect.`
                );
              }

              if (
                feature?.scaling
                  ?.basis !==
                  "classLevel" ||
                feature?.scaling
                  ?.classId !==
                  classId
              ) {
                errors.push(
                  `${featureLabel} must scale from the owning class level.`
                );
              }
            }
          );
        }
      });
    }

    if (!subclass.expandedSpells || typeof subclass.expandedSpells !== "object" || Array.isArray(subclass.expandedSpells)) {
      errors.push(`${label} expandedSpells must be an object.`);
    }

    if (!Array.isArray(subclass.choices)) {
      errors.push(`${label} choices must be an array.`);
    } else {
      subclass.choices.forEach(
        (choice, choiceIndex) => {
          if (
            !String(
              choice?.id || ""
            ).trim() ||
            !String(
              choice?.name || ""
            ).trim()
          ) {
            errors.push(
              `${label} choice ${choiceIndex + 1} is missing an id or name.`
            );
          }

          if (
            !Array.isArray(
              choice?.options
            ) &&
            !String(
              choice?.optionsSource || ""
            ).trim()
          ) {
            errors.push(
              `${label} choice ${choiceIndex + 1} needs options or an optionsSource.`
            );
          }
        }
      );
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

  Object.entries(
    SRD_SUBCLASS_PRIORITY
  ).forEach(([classId, subclassId]) => {
    if (
      firstSubclassByClass.get(
        classId
      ) !== subclassId
    ) {
      errors.push(
        `Class "${classId}" must list its SRD subclass "${subclassId}" first.`
      );
    }
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
