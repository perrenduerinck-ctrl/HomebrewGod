const cleanText = (value) => String(value || "").trim();

const sentence = (value) => {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  return /[.!?]$/.test(text)
    ? text
    : `${text}.`;
};

const lowerFirst = (value) => {
  const text = cleanText(value);

  return text
    ? `${text.charAt(0).toLowerCase()}${text.slice(1)}`
    : "";
};

const PLACEHOLDER_SUMMARY_PATTERN =
  /^(?:.+\s+)?class feature\.?$|description not filled|placeholder|coming soon|\btodo\b|\btbd\b/i;

const SUMMARY_BY_ID = {
  "extra-attack-barbarian": "Make two attacks whenever you take the Attack action.",
  "fast-movement": "Increase walking speed while not wearing heavy armor.",
  "feral-instinct": "Act quickly at the start of battle and resist being surprised.",
  "brutal-critical-1": "Roll one additional weapon die on a melee critical hit.",
  "relentless-rage": "Fight to remain conscious when damage would reduce you to 0 hit points.",
  "brutal-critical-2": "Roll two additional weapon dice on a melee critical hit.",
  "persistent-rage": "Keep raging unless you fall unconscious or choose to end the rage.",
  "brutal-critical-3": "Roll three additional weapon dice on a melee critical hit.",
  "indomitable-might": "Use your Strength score as the minimum result for weaker Strength checks.",
  "primal-champion": "Raise Strength and Constitution beyond their normal mortal limits.",

  "font-of-inspiration": "Recover Bardic Inspiration uses after a short or long rest.",
  "countercharm": "Use a performance to help nearby allies resist fear and charm.",
  "superior-inspiration": "Regain one Bardic Inspiration use when initiative starts and none remain.",

  "divine-intervention": "Call on your deity for extraordinary aid, with success based on cleric level.",
  "divine-intervention-improvement": "Your request for Divine Intervention now succeeds automatically.",

  "timeless-body-druid": "Age at a greatly reduced rate and resist magical aging.",
  "beast-spells": "Cast many druid spells while using Wild Shape.",
  "archdruid": "Use Wild Shape without a normal use limit and cast more freely in beast form.",

  "action-surge-2": "Gain a second use of Action Surge between rests.",

  "slow-fall": "Use your reaction to reduce falling damage.",
  "stunning-strike": "Spend discipline to try to stun a creature hit by a melee weapon attack.",
  "ki-empowered-strikes": "Treat unarmed strikes as magical for overcoming resistance and immunity.",
  "evasion-monk": "Reduce or avoid damage from effects that allow Dexterity saving throws.",
  "stillness-of-mind": "Use an action to end one charm or fear effect on yourself.",
  "unarmored-movement-improvement-9": "Move across vertical surfaces and liquids during your turn.",
  "purity-of-body": "Become immune to disease and poison.",
  "tongue-of-the-sun-and-moon": "Understand spoken languages and be understood by creatures that know a language.",
  "diamond-soul": "Gain proficiency in every saving throw and spend discipline to reroll a failed save.",
  "timeless-body-monk": "Ignore the frailty of old age and no longer need food or water.",
  "empty-body": "Spend discipline to become invisible and resistant to most damage.",
  "perfect-self": "Regain discipline points when initiative starts and your pool is empty.",

  "aura-of-protection": "Add your Charisma modifier to saving throws for you and nearby allies.",
  "aura-of-courage": "Prevent you and nearby allies from becoming frightened while you are conscious.",
  "improved-divine-smite": "Add radiant damage to every melee weapon hit.",
  "cleansing-touch": "Use an action to end a spell affecting you or a willing creature.",
  "aura-improvements": "Extend the range of your paladin auras.",

  "lands-stride": "Move through nonmagical difficult terrain and plants without being slowed.",
  "hide-in-plain-sight": "Prepare camouflage that improves your ability to remain hidden.",
  "vanish": "Hide as a bonus action and become harder to track by nonmagical means.",
  "feral-senses": "Fight nearby unseen creatures without the usual attack disadvantage.",
  "foe-slayer": "Add Wisdom to one attack or damage roll against a favored enemy each turn.",

  "uncanny-dodge": "Use your reaction to halve damage from an attacker you can see.",
  "evasion-rogue": "Reduce or avoid damage from effects that allow Dexterity saving throws.",
  "reliable-talent": "Treat low d20 rolls on proficient ability checks as a 10.",
  "blindsense": "Detect the location of hidden or invisible creatures close to you.",
  "slippery-mind": "Gain proficiency in Wisdom saving throws.",
  "elusive": "Prevent attackers from gaining advantage against you while you remain able to act.",
  "stroke-of-luck": "Turn a missed attack or failed ability check into a successful result.",

  "sorcerous-restoration": "Recover sorcery points when you finish a short rest.",

  "eldritch-master": "Spend a minute beseeching your patron to recover expended pact spell slots.",

  "spell-mastery": "Choose low-level wizard spells that you can cast repeatedly without expending slots.",
  "signature-spells": "Choose two 3rd-level wizard spells that are always prepared and gain free casts.",

  "tool-expertise": "Double your proficiency bonus for proficient tool checks.",
  "flash-of-genius": "Use your reaction to add Intelligence to a nearby ability check or saving throw.",
  "magic-item-adept": "Attune to more magic items and craft lower-rarity items faster and more cheaply.",
  "spell-storing-item": "Store a low-level artificer spell in an item for repeated use.",
  "magic-item-savant": "Attune to additional magic items and ignore many attunement restrictions.",
  "magic-item-master": "Attune to as many as six magic items at once.",
  "soul-of-artifice": "Gain stronger saving throws from attuned items and sacrifice an infusion to avoid dropping."
};

const getEffect = (feature, type) => (
  Array.isArray(feature?.effects)
    ? feature.effects.find((effect) => effect?.type === type)
    : null
);

const getLevelValue = (table, level) => {
  const entries = Object.entries(table || {})
    .map(([key, value]) => [Number(key), value])
    .filter(([key]) => Number.isInteger(key) && key <= level)
    .sort((a, b) => a[0] - b[0]);

  return entries.length
    ? entries[entries.length - 1][1]
    : null;
};

const getPatternSummary = ({
  classId,
  level,
  feature
}) => {
  const id = cleanText(feature?.id);
  const name = cleanText(feature?.name);

  if (/^ability-score-improvement-/.test(id)) {
    return "Improve ability scores or choose an eligible feat.";
  }

  if (/-subclass-feature-\d+$/.test(id)) {
    return `Gain the level-${level} benefit from your selected ${classId} subclass.`;
  }

  if (/^extra-attack-/.test(id)) {
    const attacks = getEffect(feature, "extraAttack")?.attacks || 2;
    return `Make ${attacks} attacks whenever you take the Attack action.`;
  }

  if (/^bardic-inspiration-d/.test(id)) {
    return `Increase the Bardic Inspiration die to ${feature.die || "its next size"}.`;
  }

  if (/^song-of-rest-d/.test(id)) {
    return `Increase the extra healing from Song of Rest to ${feature.die || "its next die"}.`;
  }

  if (/^destroy-undead-/.test(id)) {
    const challengeRating = name.match(/CR ([^)]+)/i)?.[1] || "the listed challenge rating";
    return `Destroy turned undead of challenge rating ${challengeRating} or lower.`;
  }

  if (/^channel-divinity-[23]$/.test(id)) {
    const uses = feature.resource?.uses || (level >= 18 ? 3 : 2);
    return `Increase Channel Divinity to ${uses} uses between rests.`;
  }

  if (/^wild-shape-improvement-/.test(id)) {
    const maxCr = getLevelValue(
      getEffect(feature, "wildShape")?.maxCrByLevel,
      level
    ) || (level >= 8 ? "1" : "1/2");
    return `Expand Wild Shape forms to challenge rating ${maxCr} with fewer movement limits.`;
  }

  if (/^indomitable-/.test(id)) {
    const uses = level >= 17 ? 3 : level >= 13 ? 2 : 1;
    return `Reroll a failed saving throw up to ${uses} time${uses === 1 ? "" : "s"} between long rests.`;
  }

  if (/^sneak-attack-\d+d6$/.test(id)) {
    const dice = name.match(/\(([^)]+)\)/)?.[1] || "its new value";
    return `Increase Sneak Attack damage to ${dice}.`;
  }

  if (/^metamagic-(?:10|17)$/.test(id)) {
    const choices = level >= 17 ? 4 : 3;
    return `Increase the number of Metamagic options known to ${choices}.`;
  }

  if (/^eldritch-invocations-\d+$/.test(id)) {
    const choices = getLevelValue(
      feature.chooseByLevel ||
      { 2: 2, 5: 3, 7: 4, 9: 5, 12: 6, 15: 7, 18: 8 },
      level
    );
    return `Increase the number of Eldritch Invocations known to ${choices}.`;
  }

  if (/^mystic-arcanum-\d$/.test(id)) {
    const spellLevel = id.match(/(\d)$/)?.[1] || "higher";
    return `Choose one ${spellLevel}th-level warlock spell to cast once per long rest without a slot.`;
  }

  if (/^infuse-item-improvement-\d+$/.test(id)) {
    const known = getLevelValue(
      { 2: 4, 6: 6, 10: 8, 14: 10, 18: 12 },
      level
    );
    const active = getLevelValue(
      { 2: 2, 6: 3, 10: 4, 14: 5, 18: 6 },
      level
    );
    return `Increase infusion capacity to ${known} known and ${active} active items.`;
  }

  if (/^favored-enemy-improvement-/.test(id)) {
    return "Choose an additional favored enemy and associated language.";
  }

  if (/^natural-explorer-improvement-/.test(id)) {
    return "Choose an additional favored terrain for Natural Explorer.";
  }

  return SUMMARY_BY_ID[id] || "";
};

const getStructuredDetail = ({
  classId,
  className,
  level,
  feature
}) => {
  const id = cleanText(feature?.id);
  const type = cleanText(feature?.type);
  const extraAttack = getEffect(feature, "extraAttack");
  const resource = feature?.resource;

  if (/^ability-score-improvement-/.test(id)) {
    return "Choose the listed ability-score increase or an eligible feat when you gain this level; the selection is stored with this class entry.";
  }

  if (/-subclass-feature-\d+$/.test(id)) {
    return `The exact benefit is supplied by the selected ${className} subclass and uses this ${classId} level, not total character level, for scaling.`;
  }

  if (type === "spellcasting") {
    return `Spellcasting ability, preparation method, and slot progression come from the ${className} class table and use individual ${classId} level for multiclass calculations.`;
  }

  if (extraAttack) {
    return `When you take the Attack action, this feature sets that action to ${extraAttack.attacks} attacks; Extra Attack features do not stack with one another.`;
  }

  if (id === "rage") {
    return "Rage uses and damage bonuses increase at the levels in the structured progression, while its physical-damage resistance and spellcasting restrictions remain active for the rage.";
  }

  if (id === "bardic-inspiration") {
    return "The inspiration die grows from d6 through d12, and Font of Inspiration changes its recovery from a long rest to a short or long rest.";
  }

  if (id === "wild-shape") {
    return "The form's challenge rating, movement limits, and duration advance from your individual druid level, while the shared use pool recovers after a short or long rest.";
  }

  if (id === "sneak-attack") {
    return "The extra damage begins at 1d6 and increases by 1d6 at every odd rogue level, using individual rogue level in a multiclass character.";
  }

  if (id === "ki" || id === "font-of-magic") {
    return `The point pool equals your individual ${classId} level and uses the recharge timing recorded with the resource.`;
  }

  if (id === "lay-on-hands") {
    return "The healing pool equals five times your individual paladin level and returns after a long rest.";
  }

  if (id === "infuse-item") {
    return "Known infusions and simultaneously infused items increase on separate artificer-level tables, and the selected known and active infusions are tracked independently.";
  }

  if (resource) {
    return `Uses, recharge timing, dice, and any other resource values are resolved from the structured ${className} resource data at individual class level ${level}.`;
  }

  if (type === "choice") {
    return "Make the listed selection when this feature is gained; the choice remains attached to the class entry that granted it.";
  }

  if (type === "custom") {
    return `Use the dedicated ${className} feature picker to make and track this feature's structured selections.`;
  }

  return "Apply the benefit whenever its stated conditions are met; later upgrades are recorded as separate unlocks at their correct class levels.";
};

export const SUPPORTED_BASE_CLASS_FEATURE_TYPES = Object.freeze([
  "choice",
  "custom",
  "feature",
  "resource",
  "spellcasting"
]);

export const SUPPORTED_BASE_CLASS_EFFECT_TYPES = Object.freeze([
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
]);

export const DEFAULT_CLASS_IDS = Object.freeze([
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
  "artificer"
]);

export const DEFAULT_CLASS_PROFICIENCY_EXPECTATIONS = Object.freeze({
  barbarian: {
    starting: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 2, "Animal Handling|Athletics|Intimidation|Nature|Perception|Survival"],
    multiclass: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 0, ""]
  },
  bard: {
    starting: ["Light Armor", "Hand Crossbows|Longswords|Rapiers|Shortswords|Simple Weapons", "Three Musical Instruments", 3, "Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival"],
    multiclass: ["Light Armor", "", "", 1, ""],
    multiclassToolChoice: [1, "musical instrument"]
  },
  cleric: {
    starting: ["Light Armor|Medium Armor|Shields", "Simple Weapons", "", 2, "History|Insight|Medicine|Persuasion|Religion"],
    multiclass: ["Light Armor|Medium Armor|Shields", "", "", 0, ""]
  },
  druid: {
    starting: ["Light Armor|Medium Armor|Shields", "Clubs|Daggers|Darts|Javelins|Maces|Quarterstaffs|Scimitars|Sickles|Slings|Spears", "Herbalism Kit", 2, "Animal Handling|Arcana|Insight|Medicine|Nature|Perception|Religion|Survival"],
    multiclass: ["Light Armor|Medium Armor|Shields", "", "", 0, ""]
  },
  fighter: {
    starting: ["Heavy Armor|Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 2, "Acrobatics|Animal Handling|Athletics|History|Insight|Intimidation|Perception|Survival"],
    multiclass: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 0, ""]
  },
  monk: {
    starting: ["", "Shortswords|Simple Weapons", "One Artisan Tool or Musical Instrument", 2, "Acrobatics|Athletics|History|Insight|Religion|Stealth"],
    multiclass: ["", "Shortswords|Simple Weapons", "", 0, ""]
  },
  paladin: {
    starting: ["Heavy Armor|Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 2, "Athletics|Insight|Intimidation|Medicine|Persuasion|Religion"],
    multiclass: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 0, ""]
  },
  ranger: {
    starting: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 3, "Animal Handling|Athletics|Insight|Investigation|Nature|Perception|Stealth|Survival"],
    multiclass: ["Light Armor|Medium Armor|Shields", "Martial Weapons|Simple Weapons", "", 1, ""]
  },
  rogue: {
    starting: ["Light Armor", "Hand Crossbows|Longswords|Rapiers|Shortswords|Simple Weapons", "Thieves' Tools", 4, "Acrobatics|Athletics|Deception|Insight|Intimidation|Investigation|Perception|Performance|Persuasion|Sleight of Hand|Stealth"],
    multiclass: ["Light Armor", "", "Thieves' Tools", 1, ""]
  },
  sorcerer: {
    starting: ["", "Daggers|Darts|Light Crossbows|Quarterstaffs|Slings", "", 2, "Arcana|Deception|Insight|Intimidation|Persuasion|Religion"],
    multiclass: ["", "", "", 0, ""]
  },
  warlock: {
    starting: ["Light Armor", "Simple Weapons", "", 2, "Arcana|Deception|History|Intimidation|Investigation|Nature|Religion"],
    multiclass: ["Light Armor", "Simple Weapons", "", 0, ""]
  },
  wizard: {
    starting: ["", "Daggers|Darts|Light Crossbows|Quarterstaffs|Slings", "", 2, "Arcana|History|Insight|Investigation|Medicine|Religion"],
    multiclass: ["", "", "", 0, ""]
  },
  artificer: {
    starting: ["Light Armor|Medium Armor|Shields", "Simple Weapons", "One Artisan Tool|Thieves' Tools|Tinker's Tools", 2, "Arcana|History|Investigation|Medicine|Nature|Perception|Sleight of Hand"],
    multiclass: ["Light Armor|Medium Armor|Shields", "", "Thieves' Tools|Tinker's Tools", 0, ""]
  }
});

export const getBaseClassFeatureCopy = ({
  classId,
  className,
  level,
  feature
}) => {
  const existingSummary = sentence(feature?.summary);
  const generatedSummary = sentence(
    getPatternSummary({
      classId,
      className,
      level,
      feature
    })
  );
  const summary = (
    !existingSummary ||
    PLACEHOLDER_SUMMARY_PATTERN.test(existingSummary)
  )
    ? generatedSummary
    : existingSummary;
  const finalSummary = summary || sentence(
    `${feature?.name || "This feature"} advances the ${className} progression`
  );
  const existingDescription = sentence(feature?.description);
  const description = existingDescription || sentence(
    `${feature?.name || "This feature"} becomes available at ${className} level ${level}: ${lowerFirst(finalSummary)} ${getStructuredDetail({
      classId,
      className,
      level,
      feature
    })}`
  );

  return {
    summary: finalSummary,
    description
  };
};

export const isBaseClassSummaryPlaceholder = (value) => (
  !cleanText(value) ||
  PLACEHOLDER_SUMMARY_PATTERN.test(cleanText(value))
);
