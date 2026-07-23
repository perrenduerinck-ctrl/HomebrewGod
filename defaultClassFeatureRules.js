const normalizeId = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/['\u2019]/g, "")
  .replace(/[^a-z0-9]+/gi, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase();

const mergeFeature = (classes, classId, featureId, overlay) => {
  const classData = classes?.[classId];

  if (!classData) {
    return null;
  }

  const feature = Object.values(classData.featuresByLevel || {})
    .flat()
    .find((entry) => normalizeId(entry?.id) === normalizeId(featureId));

  if (!feature) {
    return null;
  }

  Object.assign(feature, overlay);
  return feature;
};

const FIGHTING_STYLE_EFFECTS = {
  Archery: {
    type: "weaponAttackBonus",
    value: 2,
    requires: { rangedWeapon: true },
    summary: "+2 to attack rolls with ranged weapons."
  },
  Defense: {
    type: "armorClassBonus",
    value: 1,
    requires: { wearingArmor: true },
    summary: "+1 AC while wearing armor."
  },
  Dueling: {
    type: "weaponDamageBonus",
    value: 2,
    requires: { oneHandedMeleeWeapon: true, noOtherWeapon: true },
    summary: "+2 damage with a one-handed melee weapon while no other weapon is wielded."
  },
  "Great Weapon Fighting": {
    type: "damageDieReroll",
    reroll: [1, 2],
    requires: { twoHandedOrVersatileMeleeWeapon: true },
    summary: "Reroll weapon damage dice showing 1 or 2 when attacking with an eligible weapon."
  },
  Protection: {
    type: "reactionDefense",
    requires: { shield: true, allyWithinFeet: 5 },
    summary: "Use a reaction while wielding a shield to hinder an attack against a nearby ally."
  },
  "Two-Weapon Fighting": {
    type: "offhandAbilityDamage",
    summary: "Add the attack ability modifier to the damage of the second two-weapon attack."
  }
};

const METAMAGIC_DETAILS = {
  "Careful Spell": { cost: 1, summary: "Protect a limited number of creatures from the worst result of your spell's saving throw." },
  "Distant Spell": { cost: 1, summary: "Increase a spell's range, or give a touch spell a 30-foot range." },
  "Empowered Spell": { cost: 1, summary: "Reroll a limited number of the spell's damage dice." },
  "Extended Spell": { cost: 1, summary: "Double an eligible spell's duration, up to 24 hours." },
  "Heightened Spell": { cost: 3, summary: "Give one target disadvantage on its first saving throw against the spell." },
  "Quickened Spell": { cost: 2, summary: "Cast a normally one-action spell as a bonus action." },
  "Subtle Spell": { cost: 1, summary: "Cast without verbal or somatic components." },
  "Twinned Spell": { cost: "spell level (1 for a cantrip)", summary: "Add a second eligible target to a single-target spell." }
};

const INVOCATION_DETAILS = {
  "Agonizing Blast": {
    effects: [{ type: "spellDamageAbilityBonus", spellId: "eldritch-blast", ability: "cha" }],
    summary: "Add Charisma to eldritch blast damage."
  },
  "Armor of Shadows": {
    effects: [{ type: "atWillSpell", spellId: "mage-armor", selfOnly: true }],
    summary: "Cast mage armor on yourself at will."
  },
  "Beguiling Influence": {
    effects: [{ type: "skillProficiency", skills: ["Deception", "Persuasion"] }],
    summary: "Gain proficiency in Deception and Persuasion."
  },
  "Devil's Sight": {
    effects: [{ type: "sense", sense: "darkvision", range: 120, magicalDarkness: true }],
    summary: "See normally in darkness, including magical darkness, out to 120 feet."
  },
  "Eldritch Sight": {
    effects: [{ type: "atWillSpell", spellId: "detect-magic" }],
    summary: "Cast detect magic at will."
  },
  "Fiendish Vigor": {
    effects: [{ type: "atWillSpell", spellId: "false-life", fixedSpellLevel: 1, selfOnly: true }],
    summary: "Cast false life on yourself at will as a 1st-level spell."
  },
  "Mask of Many Faces": {
    effects: [{ type: "atWillSpell", spellId: "disguise-self" }],
    summary: "Cast disguise self at will."
  },
  "Repelling Blast": {
    effects: [{ type: "spellHitPush", spellId: "eldritch-blast", feet: 10 }],
    summary: "An eldritch blast hit can push its target 10 feet away."
  },
  "Eyes of the Rune Keeper": {
    effects: [{ type: "languageReading", values: ["all"] }],
    summary: "Read all writing."
  },
  "Mire the Mind": {
    minimumLevel: 5,
    effects: [{ type: "oncePerRestSpell", spellId: "slow", slot: "pact", recharge: "longRest" }],
    summary: "Cast slow once using a pact slot, then recover the use after a long rest."
  },
  "One with Shadows": {
    minimumLevel: 5,
    effects: [{ type: "conditionalInvisibility", requires: { dimLightOrDarkness: true, stationary: true } }],
    summary: "Become invisible while stationary in dim light or darkness."
  },
  "Otherworldly Leap": {
    minimumLevel: 9,
    effects: [{ type: "atWillSpell", spellId: "jump", selfOnly: true }],
    summary: "Cast jump on yourself at will."
  },
  "Thirsting Blade": {
    minimumLevel: 5,
    effects: [{
      type: "extraAttack",
      attacks: 2,
      pactWeaponOnly: true,
      stacks: false
    }],
    summary: "Attack twice, instead of once, with your pact weapon. This does not add another attack to Extra Attack."
  },
  "Whispers of the Grave": {
    minimumLevel: 9,
    effects: [{ type: "atWillSpell", spellId: "speak-with-dead" }],
    summary: "Cast speak with dead at will."
  },
  "Witch Sight": {
    minimumLevel: 15,
    effects: [{ type: "trueFormSight", range: 30 }],
    summary: "See the true form of nearby shapechangers and magically disguised creatures."
  }
};

const MANEUVER_DETAILS = {
  "Commander's Strike": "Trade one attack and a bonus action so an ally can attack with its reaction.",
  "Disarming Attack": "Add the superiority die to damage and try to make the target drop an item.",
  "Distracting Strike": "Add the superiority die to damage and set up an ally's next attack.",
  "Evasive Footwork": "Add the superiority die to AC while moving.",
  "Feinting Attack": "Use a bonus action to gain advantage and add the superiority die to damage.",
  "Goading Attack": "Add the superiority die to damage and discourage attacks against others.",
  "Lunging Attack": "Extend a melee attack's reach and add the superiority die to damage.",
  "Maneuvering Attack": "Add the superiority die to damage and let an ally reposition safely.",
  "Menacing Attack": "Add the superiority die to damage and try to frighten the target.",
  "Parry": "Use a reaction and superiority die to reduce melee damage taken.",
  "Precision Attack": "Add the superiority die to a weapon attack roll.",
  "Pushing Attack": "Add the superiority die to damage and try to push the target.",
  "Rally": "Use a bonus action and superiority die to grant temporary hit points.",
  "Riposte": "Use a reaction after a missed attack to strike back and add the superiority die to damage.",
  "Sweeping Attack": "Spend a superiority die to damage a second adjacent creature.",
  "Trip Attack": "Add the superiority die to damage and try to knock the target prone."
};

const makeBattleMasterFeature = (id, name, level, extra = {}) => ({
  id,
  name,
  level,
  source: "subclass",
  type: "feature",
  summary: `${name} Battle Master feature.`,
  ...extra
});

const applyBattleMasterRules = (classes) => {
  const fighter = classes?.fighter;
  const subclassIndex = (fighter?.subclasses || []).findIndex((entry) => {
    const key = normalizeId(entry?.id || entry?.name);
    return key === "battle-master" || normalizeId(entry?.name) === "battle-master";
  });
  const subclass = fighter?.subclasses?.[subclassIndex];

  if (!subclass || subclassIndex < 0) {
    return;
  }

  const maneuvers = Object.keys(MANEUVER_DETAILS);
  const featuresByLevel = {
    3: [
      makeBattleMasterFeature("battle-master-combat-superiority", "Combat Superiority", 3, {
        type: "resource",
        summary: "Fuel selected maneuvers with superiority dice.",
        resource: {
          id: "superiority-dice",
          name: "Superiority Dice",
          usesByLevel: { 3: 4, 7: 5, 15: 6 },
          dieByLevel: { 3: "d8", 10: "d10", 18: "d12" },
          recharge: "shortOrLongRest"
        },
        effects: [{ type: "maneuverSaveDc", formula: "8 + proficiency + max(str,dex)" }]
      }),
      makeBattleMasterFeature("battle-master-maneuvers", "Maneuvers", 3, {
        type: "choice",
        chooseByLevel: { 3: 3, 7: 5, 10: 7, 15: 9 },
        choose: 3,
        options: maneuvers,
        optionDetails: Object.fromEntries(Object.entries(MANEUVER_DETAILS).map(([name, summary]) => [name, { summary }]))
      }),
      makeBattleMasterFeature("battle-master-student-of-war", "Student of War", 3, {
        type: "choice",
        choose: 1,
        optionSource: "artisanTools",
        summary: "Gain proficiency with one artisan's tool."
      })
    ],
    7: [makeBattleMasterFeature("battle-master-know-your-enemy", "Know Your Enemy", 7)],
    10: [makeBattleMasterFeature("battle-master-improved-combat-superiority", "Improved Combat Superiority", 10, { summary: "Your superiority dice become d10s." })],
    15: [makeBattleMasterFeature("battle-master-relentless", "Relentless", 15, { summary: "Regain one superiority die when initiative is rolled with none remaining." })],
    18: [makeBattleMasterFeature("battle-master-superiority-d12", "Improved Combat Superiority", 18, { summary: "Your superiority dice become d12s." })]
  };
  const existingFeaturesByName = new Map(
    Object.values(
      subclass.featuresByLevel || {}
    )
      .flat()
      .map((feature) => [
        normalizeId(feature?.name),
        feature
      ])
  );
  const completedFeaturesByLevel =
    Object.fromEntries(
      Object.entries(featuresByLevel)
        .map(([level, features]) => [
          level,
          features.map((feature) => {
            const catalogFeature =
              existingFeaturesByName.get(
                normalizeId(feature.name)
              ) || {};

            return {
              ...catalogFeature,
              ...feature,
              description:
                catalogFeature.description ||
                `${feature.name} is a complete Battle Master feature gained at fighter level ${level}.`,
              sourceType:
                catalogFeature.sourceType ||
                subclass.sourceType,
              sourceLabel:
                catalogFeature.sourceLabel ||
                subclass.sourceLabel,
              rulesetId:
                catalogFeature.rulesetId ||
                subclass.rulesetId,
              rulesEdition:
                catalogFeature.rulesEdition ||
                subclass.rulesEdition,
              actionEconomy:
                catalogFeature
                  .actionEconomy ||
                "passive",
              effects:
                Array.isArray(
                  feature.effects
                ) &&
                feature.effects.length
                  ? feature.effects
                  : catalogFeature.effects ||
                    [{
                      type:
                        "subclassFeature",
                      actionEconomy:
                        catalogFeature
                          .actionEconomy ||
                        "passive",
                      summary:
                        feature.summary
                    }],
              scaling: {
                basis: "classLevel",
                classId: "fighter",
                unlockLevel:
                  Number(level),
                ...(catalogFeature
                  .scaling || {})
              }
            };
          })
        ])
    );

  const summary = "A tactical martial archetype that uses superiority dice to fuel combat maneuvers.";

  fighter.subclasses = fighter.subclasses.map((entry, index) => {
    if (index !== subclassIndex) {
      return entry;
    }

    return {
      ...entry,
      summary,
      description:
        entry.description &&
        entry.description !==
          entry.summary
          ? entry.description
          : "Battle Masters study tactical combat and spend superiority dice on selected maneuvers. Their dice, maneuver list, battlefield analysis, and recovery improve only with Fighter levels.",
      featuresByLevel:
        completedFeaturesByLevel,
      featureLevels: [3, 7, 10, 15, 18],
      choices: [
        {
          id:
            "battle-master-maneuvers",
          name: "Maneuvers",
          featureName: "Maneuvers",
          choose: 3,
          options: maneuvers,
          summary:
            "Choose the maneuvers fueled by superiority dice."
        },
        {
          id:
            "battle-master-student-of-war",
          name: "Student of War",
          featureName:
            "Student of War",
          choose: 1,
          optionsSource: "artisanTools",
          summary:
            "Choose one artisan tool proficiency."
        }
      ],
      resources: [
        {
          id: "superiority-dice",
          name: "Superiority Dice",
          sourceFeatureId:
            "battle-master-combat-superiority"
        }
      ],
      effects: [
        ...(Array.isArray(entry.effects)
          ? entry.effects
          : []),
        {
          id: "battle-master-maneuvers",
          type: "maneuvers",
          options: maneuvers
        }
      ],
      levels: Object.fromEntries(
        Array.from({ length: 20 }, (_, levelIndex) => {
          const level = levelIndex + 1;
          return [
            level,
            {
              features:
                completedFeaturesByLevel[
                  level
                ] || []
            }
          ];
        })
      )
    };
  });
};

const applyChampionRules = (classes) => {
  const fighter = classes?.fighter;
  const subclassIndex = (fighter?.subclasses || [])
    .findIndex((entry) => normalizeId(entry?.id || entry?.name) === "champion");
  const subclass = fighter?.subclasses?.[subclassIndex];

  if (!subclass || subclassIndex < 0) {
    return;
  }

  const overlayFeature = (feature) => {
    if (feature.id === "champion-improved-critical") {
      return {
        ...feature,
        summary: "Weapon attacks score a critical hit on a roll of 19 or 20.",
        effects: [{ type: "criticalRange", minimumRoll: 19 }]
      };
    }

    if (feature.id === "champion-additional-fighting-style") {
      return {
        ...feature,
        type: "choice",
        choose: 1,
        options: Object.keys(FIGHTING_STYLE_EFFECTS),
        optionEffects: FIGHTING_STYLE_EFFECTS,
        repeatableChoice: false,
        summary: "Choose a second Fighting Style that you have not already selected."
      };
    }

    if (feature.id === "champion-superior-critical") {
      return {
        ...feature,
        summary: "Weapon attacks score a critical hit on a roll of 18 through 20.",
        effects: [{ type: "criticalRange", minimumRoll: 18 }]
      };
    }

    if (feature.id === "champion-survivor") {
      return {
        ...feature,
        summary: "At the start of each turn, recover hit points while conscious and at or below half hit points.",
        effects: [{ type: "survivorRegeneration", formula: "5 + con", requires: { conscious: true, atOrBelowHalfHp: true } }]
      };
    }

    return feature;
  };
  const featuresByLevel = Object.fromEntries(
    Object.entries(subclass.featuresByLevel || {})
      .map(([level, features]) => [
        level,
        (features || []).map(overlayFeature)
      ])
  );
  const levels = Object.fromEntries(
    Object.entries(subclass.levels || {})
      .map(([level, levelData]) => [
        level,
        {
          ...levelData,
          features: (levelData.features || []).map(overlayFeature)
        }
      ])
  );

  fighter.subclasses = fighter.subclasses.map((entry, index) => {
    return index === subclassIndex
      ? { ...entry, featuresByLevel, levels }
      : entry;
  });
};

export function applyDefaultClassFeatureRules(classes) {
  ["fighter", "paladin", "ranger"].forEach((classId) => {
    mergeFeature(classes, classId, `fighting-style-${classId}`, {
      optionEffects: FIGHTING_STYLE_EFFECTS,
      repeatableChoice: false
    });
  });

  mergeFeature(classes, "barbarian", "rage", {
    effects: [
      {
        type: "rage",
        damageBonusByLevel: { 1: 2, 9: 3, 16: 4 },
        grantsAdvantage: ["strengthChecks", "strengthSavingThrows"],
        grantsResistance: ["bludgeoning", "piercing", "slashing"],
        requires: { noHeavyArmor: true, strengthMeleeAttackForDamage: true },
        restrictions: ["cannotCastSpells", "cannotConcentrate"],
        durationRounds: 10
      }
    ]
  });

  mergeFeature(classes, "druid", "wild-shape", {
    resource: { id: "wild-shape", name: "Wild Shape", uses: 2, recharge: "shortOrLongRest" },
    effects: [{
      type: "wildShape",
      maxCrByLevel: { 2: "1/4", 4: "1/2", 8: "1" },
      limitationsByLevel: {
        2: ["noFlyingSpeed", "noSwimmingSpeed"],
        4: ["noFlyingSpeed"],
        8: []
      },
      durationHoursFormula: "floor(classLevel / 2)",
      requiresSeenForm: true
    }]
  });

  mergeFeature(classes, "monk", "martial-arts", {
    effects: [{
      type: "martialArts",
      dieByLevel: { 1: "d4", 5: "d6", 11: "d8", 17: "d10" },
      attackAbilityOptions: ["str", "dex"],
      bonusActionUnarmedStrike: true,
      requires: { unarmored: true, noShield: true, monkWeaponOrUnarmed: true }
    }]
  });

  mergeFeature(classes, "monk", "ki", {
    resource: {
      id: "ki",
      name: "Ki Points",
      pool: { formula: "classLevel" },
      recharge: "shortOrLongRest"
    },
    spendOptions: [
      { name: "Flurry of Blows", cost: 1 },
      { name: "Patient Defense", cost: 1 },
      { name: "Step of the Wind", cost: 1 }
    ],
    effects: [{ type: "resourcePool", name: "Ki Points", formula: "classLevel" }]
  });

  mergeFeature(classes, "paladin", "divine-smite", {
    effects: [{
      type: "divineSmite",
      baseDamage: "2d8",
      damagePerSlotAboveFirst: "1d8",
      maximumDamage: "5d8",
      bonusAgainst: ["fiend", "undead"],
      bonusDamage: "1d8",
      trigger: "meleeWeaponHit",
      resource: "spellSlot"
    }]
  });

  mergeFeature(classes, "rogue", "sneak-attack", {
    effects: [{
      type: "sneakAttack",
      diceByLevel: {
        1: "1d6", 3: "2d6", 5: "3d6", 7: "4d6", 9: "5d6",
        11: "6d6", 13: "7d6", 15: "8d6", 17: "9d6", 19: "10d6"
      },
      frequency: "oncePerTurn",
      requiresWeapon: ["finesse", "ranged"],
      eligibility: ["advantage", "adjacentConsciousEnemyAndNoDisadvantage"]
    }]
  });

  [
    ["bard", "bard-expertise", 2, "proficientSkills"],
    ["bard", "bard-expertise-10", 2, "proficientSkills"],
    ["rogue", "rogue-expertise", 2, "proficientSkillsOrThievesTools"],
    ["rogue", "rogue-expertise-6", 2, "proficientSkillsOrThievesTools"]
  ].forEach(([classId, featureId, choose, optionSource]) => {
    mergeFeature(classes, classId, featureId, {
      type: "choice",
      choose,
      optionSource,
      effects: [{ type: "expertise", optionSource }],
      summary: `Choose ${choose} trained proficiencies to double their proficiency bonus.`
    });
  });

  mergeFeature(classes, "sorcerer", "font-of-magic", {
    resource: { id: "sorcery-points", name: "Sorcery Points", pool: { formula: "classLevel" }, recharge: "longRest" },
    effects: [{ type: "resourcePool", name: "Sorcery Points", formula: "classLevel" }]
  });

  mergeFeature(classes, "sorcerer", "metamagic", {
    chooseByLevel: { 3: 2, 10: 3, 17: 4 },
    optionDetails: METAMAGIC_DETAILS,
    effects: [{ type: "metamagic", resourceId: "sorcery-points" }]
  });

  mergeFeature(classes, "warlock", "eldritch-invocations", {
    chooseByLevel: { 2: 2, 5: 3, 7: 4, 9: 5, 12: 6, 15: 7, 18: 8 },
    options: Object.keys(INVOCATION_DETAILS),
    optionDetails: INVOCATION_DETAILS,
    minimumLevelByOption: Object.fromEntries(
      Object.entries(INVOCATION_DETAILS)
        .filter(([, details]) => details.minimumLevel)
        .map(([name, details]) => [name, details.minimumLevel])
    ),
    effects: [{ type: "eldritchInvocations" }]
  });

  [
    ["bard", "magical-secrets-10"],
    ["bard", "magical-secrets-14"],
    ["bard", "magical-secrets-18"]
  ].forEach(([classId, featureId]) => {
    mergeFeature(classes, classId, featureId, {
      type: "choice",
      choose: 2,
      optionSource: "castableSpellsAllClasses",
      effects: [{ type: "magicalSecrets", count: 2 }],
      summary: "Choose two spells from any class that you can cast at your current bard level."
    });
  });

  mergeFeature(classes, "ranger", "favored-enemy", {
    chooseByLevel: { 1: 1, 6: 2, 14: 3 },
    effects: [{ type: "favoredEnemy", grantsLanguagePerChoice: true }]
  });

  mergeFeature(classes, "ranger", "natural-explorer", {
    chooseByLevel: { 1: 1, 6: 2, 10: 3 },
    effects: [{ type: "naturalExplorer" }]
  });

  const artificer = classes?.artificer;
  if (artificer) {
    const infusionEffects = {
      "enhanced-arcane-focus": [{ type: "spellAttackBonus", valueByLevel: { 2: 1, 10: 2 }, target: "spellcastingFocus" }],
      "enhanced-defense": [{ type: "armorClassBonus", valueByLevel: { 2: 1, 10: 2 }, target: "armorOrShield" }],
      "enhanced-weapon": [{ type: "weaponMagicBonus", valueByLevel: { 2: 1, 10: 2 }, target: "weapon" }],
      "repeating-shot": [{ type: "weaponMagicBonus", value: 1, target: "ammunitionWeapon" }, { type: "ignoresAmmunitionAndLoading" }],
      "returning-weapon": [{ type: "weaponMagicBonus", value: 1, target: "thrownWeapon" }, { type: "returnsAfterAttack" }],
      "radiant-weapon": [{ type: "weaponMagicBonus", value: 1, target: "weapon" }, { type: "radiantWeaponReaction", uses: 4, recharge: "longRest" }],
      "repulsion-shield": [{ type: "armorClassBonus", value: 1, target: "shield" }, { type: "repulsionReaction", uses: 4, recharge: "longRest" }],
      "resistant-armor": [{ type: "damageResistanceChoice", target: "armor" }],
      "helm-of-awareness": [{ type: "initiativeAdvantage", target: "helmet" }, { type: "cannotBeSurprised", target: "helmet" }],
      "arcane-propulsion-armor": [{ type: "speedBonus", value: 5, target: "armor" }, { type: "integratedGauntletWeapon", damage: "1d8 force" }]
    };

    artificer.infusions = (artificer.infusions || []).map((infusion) => ({
      ...infusion,
      effects: infusionEffects[infusion.id] || [],
      requiresItemTarget: !["homunculus-servant", "replicate-magic-item"].includes(infusion.id)
    }));
  }

  applyBattleMasterRules(classes);
  applyChampionRules(classes);
  return classes;
}

export const DEFAULT_FIGHTING_STYLE_EFFECTS = FIGHTING_STYLE_EFFECTS;
export const DEFAULT_METAMAGIC_DETAILS = METAMAGIC_DETAILS;
export const DEFAULT_INVOCATION_DETAILS = INVOCATION_DETAILS;
export const DEFAULT_MANEUVER_DETAILS = MANEUVER_DETAILS;
