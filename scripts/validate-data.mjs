import {
  readFile
} from "node:fs/promises";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";
import {
  DEFAULT_CLASSES,
  validateDefaultClassCollection
} from "../data/defaultClasses.js";
import {
  DEFAULT_FEATS,
  validateDefaultFeatCollection,
  validateFeatSpellDefinitions
} from "../data/defaultFeats.js";
import {
  DEFAULT_SPELLS,
  validateDefaultSpellCatalog
} from "../data/defaultSpells.js";
import {
  DEFAULT_SUBCLASSES,
  validateDefaultSubclassCollection
} from "../data/defaultSubclasses.js";

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  ".."
);
const errors = [];
const allowedEffects = {
  classFeature: new Set([
    "armorClassFormula",
    "divineSmite",
    "eldritchInvocations",
    "expertise",
    "extraAttack",
    "favoredEnemy",
    "infusions",
    "magicalSecrets",
    "martialArts",
    "metamagic",
    "naturalExplorer",
    "rage",
    "resourcePool",
    "sneakAttack",
    "speedBonus",
    "speedBonusByLevel",
    "spellcasting",
    "wildShape"
  ]),
  subclassFeature: new Set([
    "extraAttack",
    "magicalSecrets",
    "subclassFeature"
  ]),
  subclass: new Set([
    "subclassProgression"
  ]),
  feat: new Set([
    "abilityChoice",
    "abilityIncrease",
    "abilityScoreImprovement",
    "armorClassBonus",
    "armorProficiency",
    "classChoice",
    "custom",
    "damageReduction",
    "damageResistance",
    "darkvisionBonus",
    "elementalAdept",
    "expertiseChoice",
    "featureChoice",
    "giantStrike",
    "healingBonus",
    "hpBonus",
    "initiativeBonus",
    "languageProficiency",
    "mediumArmorDexterityCap",
    "naturalWeapon",
    "passiveSkillBonus",
    "planarScion",
    "proficiency",
    "proficiencyChoice",
    "resource",
    "restChoiceResistance",
    "ritualBook",
    "savingThrowProficiencyFromAbilityChoice",
    "speedBonus",
    "spellChoice",
    "spellGrant",
    "telepathy",
    "unarmedDamage",
    "unarmoredArmorClass",
    "weaponProficiency"
  ]),
  spell: new Set([
    "cone",
    "cube",
    "cylinder",
    "damage",
    "healing",
    "line",
    "saving-throw",
    "sphere"
  ])
};

function addValidation(
  name,
  validation
) {
  if (!validation?.valid) {
    errors.push(
      ...(
        validation?.errors || [
          `${name} validation failed.`
        ]
      ).map((message) => {
        return `${name}: ${message}`;
      })
    );
  }
}

function collectEffects(entries) {
  return entries.flatMap((entry) => {
    return Array.isArray(entry?.effects)
      ? entry.effects
      : [];
  });
}

function validateEffectTypes(
  label,
  effects,
  allowed
) {
  effects.forEach(
    (effect, index) => {
      const type =
        String(
          effect?.type ||
          ""
        ).trim();

      if (!allowed.has(type)) {
        errors.push(
          `${label} effect ${index + 1} uses unsupported type "${type || "(missing)"}".`
        );
      }
    }
  );
}

addValidation(
  "Classes",
  validateDefaultClassCollection(
    DEFAULT_CLASSES
  )
);
addValidation(
  "Subclasses",
  validateDefaultSubclassCollection(
    DEFAULT_SUBCLASSES
  )
);
addValidation(
  "Feats",
  validateDefaultFeatCollection(
    DEFAULT_FEATS
  )
);
addValidation(
  "Feat spells",
  validateFeatSpellDefinitions(
    DEFAULT_FEATS,
    DEFAULT_SPELLS
  )
);
addValidation(
  "Spells",
  validateDefaultSpellCatalog(
    DEFAULT_SPELLS,
    {
      feats: DEFAULT_FEATS,
      subclasses:
        DEFAULT_SUBCLASSES
    }
  )
);

const classFeatures =
  Object.values(DEFAULT_CLASSES)
    .flatMap((classData) => {
      return Object.values(
        classData.featuresByLevel ||
        {}
      ).flat();
    });
const subclassFeatures =
  DEFAULT_SUBCLASSES.flatMap(
    (subclass) => {
      return Object.values(
        subclass.featuresByLevel ||
        {}
      ).flat();
    }
  );

validateEffectTypes(
  "Class feature",
  collectEffects(classFeatures),
  allowedEffects.classFeature
);
validateEffectTypes(
  "Subclass",
  collectEffects(
    DEFAULT_SUBCLASSES
  ),
  allowedEffects.subclass
);
validateEffectTypes(
  "Subclass feature",
  collectEffects(subclassFeatures),
  allowedEffects.subclassFeature
);
validateEffectTypes(
  "Feat",
  collectEffects(DEFAULT_FEATS),
  allowedEffects.feat
);
validateEffectTypes(
  "Spell",
  collectEffects(DEFAULT_SPELLS),
  allowedEffects.spell
);

const placeholderPattern =
  /description not filled|placeholder|coming soon|\btodo\b|\btbd\b/i;

DEFAULT_SUBCLASSES.forEach(
  (subclass) => {
    const text = [
      subclass.summary,
      subclass.description,
      ...Object.values(
        subclass.featuresByLevel ||
        {}
      ).flat()
        .flatMap((feature) => [
          feature.summary,
          feature.description
        ])
    ].join(" ");

    if (placeholderPattern.test(text)) {
      errors.push(
        `Subclass ${subclass.classId}:${subclass.id} contains placeholder text.`
      );
    }
  }
);

const domIndependentModules = [
  "rulesMath.js",
  "normalization.js",
  "classProgression.js",
  "multiclassing.js",
  "featMechanics.js",
  "classMechanics.js",
  "subclassMechanics.js",
  "spellcasting.js",
  "speciesBackgrounds.js",
  "inventoryEquipment.js",
  "rendering.js",
  "sheetPresentation.js"
];

for (
  const moduleName of
  domIndependentModules
) {
  const source =
    await readFile(
      path.join(
        root,
        "characterCreator",
        moduleName
      ),
      "utf8"
    );

  if (
    /\bdocument\b|\bwindow\b/.test(
      source
    )
  ) {
    errors.push(
      `DOM-independent module ${moduleName} accesses browser globals.`
    );
  }
}

const creatorSource =
  await readFile(
    path.join(
      root,
      "characterCreator",
      "index.js"
    ),
    "utf8"
  );
const creatorLineCount =
  creatorSource.split(/\r?\n/)
    .length;

if (creatorLineCount >= 55000) {
  errors.push(
    `characterCreator/index.js has ${creatorLineCount} lines; the Phase 19 ceiling is 54,999.`
  );
}

if (errors.length) {
  console.error(
    errors.join("\n")
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      valid: true,
      counts: {
        classes:
          Object.keys(
            DEFAULT_CLASSES
          ).length,
        classFeatures:
          classFeatures.length,
        subclasses:
          DEFAULT_SUBCLASSES.length,
        feats:
          DEFAULT_FEATS.length,
        spells:
          DEFAULT_SPELLS.length,
        creatorLines:
          creatorLineCount
      }
    },
    null,
    2
  )
);
