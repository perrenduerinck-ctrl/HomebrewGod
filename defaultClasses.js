export const DEFAULT_CLASSES = {
  barbarian: {
    id: "barbarian",
    name: "Barbarian",
    hitDie: 12,
    primaryAbility: ["Strength"],
    savingThrows: ["Strength", "Constitution"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: [
        "Animal Handling",
        "Athletics",
        "Intimidation",
        "Nature",
        "Perception",
        "Survival"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "rage",
          name: "Rage",
          type: "resource",
          summary: "Enter a battle focus that improves physical offense and durability.",
          resource: { uses: 2, recharge: "longRest" }
        },
        {
          id: "unarmored-defense-barbarian",
          name: "Unarmored Defense",
          type: "feature",
          summary: "Use Constitution as part of Armor Class while unarmored."
        }
      ],
      2: [
        {
          id: "reckless-attack",
          name: "Reckless Attack",
          type: "feature",
          summary: "Trade defense for a stronger opening attack."
        },
        {
          id: "danger-sense",
          name: "Danger Sense",
          type: "feature",
          summary: "React quickly to visible hazards."
        }
      ],
      3: [
        {
          id: "primal-path",
          name: "Primal Path",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose the source and style of your rage."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  bard: {
    id: "bard",
    name: "Bard",
    hitDie: 8,
    progressionType: "full-caster",
    spellcastingAbility: "cha",
    spellPreparation: "known",
    primaryAbility: ["Charisma"],
    savingThrows: ["Dexterity", "Charisma"],
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Three Musical Instruments"],
    skillChoices: {
      choose: 3,
      from: [
        "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
        "History", "Insight", "Intimidation", "Investigation", "Medicine",
        "Nature", "Perception", "Performance", "Persuasion", "Religion",
        "Sleight of Hand", "Stealth", "Survival"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "bard-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Charisma",
          summary: "Cast bard spells using Charisma."
        },
        {
          id: "bardic-inspiration",
          name: "Bardic Inspiration",
          type: "resource",
          summary: "Grant an ally an inspiration die for an important roll.",
          resource: { usesAbility: "Charisma", recharge: "longRest" }
        }
      ],
      2: [
        {
          id: "jack-of-all-trades",
          name: "Jack of All Trades",
          type: "feature",
          summary: "Add partial proficiency to ability checks that lack proficiency."
        },
        {
          id: "song-of-rest",
          name: "Song of Rest",
          type: "resource",
          summary: "Help allies recover additional health during a short rest."
        }
      ],
      3: [
        {
          id: "bard-college",
          name: "Bard College",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a bardic college."
        },
        {
          id: "bard-expertise",
          name: "Expertise",
          type: "choice",
          choose: 2,
          options: [],
          optionSource: "proficientSkills",
          summary: "Improve two skills in which you are already proficient."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  cleric: {
    id: "cleric",
    name: "Cleric",
    hitDie: 8,
    progressionType: "full-caster",
    spellcastingAbility: "wis",
    spellPreparation: "prepared",
    primaryAbility: ["Wisdom"],
    savingThrows: ["Wisdom", "Charisma"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ["History", "Insight", "Medicine", "Persuasion", "Religion"]
    },
    featuresByLevel: {
      1: [
        {
          id: "cleric-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Wisdom",
          summary: "Prepare and cast cleric spells using Wisdom."
        },
        {
          id: "divine-domain",
          name: "Divine Domain",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose the divine power that shapes your calling."
        }
      ],
      2: [
        {
          id: "channel-divinity",
          name: "Channel Divinity",
          type: "resource",
          summary: "Invoke a limited divine effect tied to your class and domain.",
          resource: { uses: 1, recharge: "shortOrLongRest" }
        }
      ],
      3: []
    },
    subclassLevel: 1,
    subclasses: []
  },

  druid: {
    id: "druid",
    name: "Druid",
    hitDie: 8,
    progressionType: "full-caster",
    spellcastingAbility: "wis",
    spellPreparation: "prepared",
    primaryAbility: ["Wisdom"],
    savingThrows: ["Intelligence", "Wisdom"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
    toolProficiencies: ["Herbalism Kit"],
    skillChoices: {
      choose: 2,
      from: [
        "Arcana", "Animal Handling", "Insight", "Medicine",
        "Nature", "Perception", "Religion", "Survival"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "druidic",
          name: "Druidic",
          type: "feature",
          summary: "Know the secret language and signs used by druids."
        },
        {
          id: "druid-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Wisdom",
          summary: "Prepare and cast druid spells using Wisdom."
        }
      ],
      2: [
        {
          id: "wild-shape",
          name: "Wild Shape",
          type: "resource",
          summary: "Assume a limited beast form.",
          resource: { uses: 2, recharge: "shortOrLongRest" }
        },
        {
          id: "druid-circle",
          name: "Druid Circle",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a druidic circle."
        }
      ],
      3: []
    },
    subclassLevel: 2,
    subclasses: []
  },

  fighter: {
    id: "fighter",
    name: "Fighter",
    hitDie: 10,
    primaryAbility: ["Strength", "Dexterity"],
    savingThrows: ["Strength", "Constitution"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: [
        "Acrobatics", "Animal Handling", "Athletics", "History",
        "Insight", "Intimidation", "Perception", "Survival"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "fighting-style-fighter",
          name: "Fighting Style",
          type: "choice",
          choose: 1,
          options: [
            "Archery", "Defense", "Dueling", "Great Weapon Fighting",
            "Protection", "Two-Weapon Fighting"
          ],
          summary: "Choose a preferred approach to weapon combat."
        },
        {
          id: "second-wind",
          name: "Second Wind",
          type: "resource",
          summary: "Recover a small amount of health during battle.",
          resource: { uses: 1, recharge: "shortOrLongRest" }
        }
      ],
      2: [
        {
          id: "action-surge",
          name: "Action Surge",
          type: "resource",
          summary: "Push beyond normal limits for an additional action.",
          resource: { uses: 1, recharge: "shortOrLongRest" }
        }
      ],
      3: [
        {
          id: "martial-archetype",
          name: "Martial Archetype",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a specialized martial path."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  monk: {
    id: "monk",
    name: "Monk",
    hitDie: 8,
    primaryAbility: ["Dexterity", "Wisdom"],
    savingThrows: ["Strength", "Dexterity"],
    armorProficiencies: [],
    weaponProficiencies: ["Simple Weapons", "Shortswords"],
    toolProficiencies: ["One Artisan Tool or Musical Instrument"],
    skillChoices: {
      choose: 2,
      from: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"]
    },
    featuresByLevel: {
      1: [
        {
          id: "unarmored-defense-monk",
          name: "Unarmored Defense",
          type: "feature",
          summary: "Use Wisdom as part of Armor Class while unarmored."
        },
        {
          id: "martial-arts",
          name: "Martial Arts",
          type: "feature",
          summary: "Use agile unarmed strikes and monk weapons effectively."
        }
      ],
      2: [
        {
          id: "ki",
          name: "Ki",
          type: "resource",
          summary: "Spend ki points on focused martial techniques.",
          resource: { scalesWith: "level", recharge: "shortOrLongRest" }
        },
        {
          id: "unarmored-movement",
          name: "Unarmored Movement",
          type: "feature",
          summary: "Move faster while not wearing armor."
        }
      ],
      3: [
        {
          id: "monastic-tradition",
          name: "Monastic Tradition",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a monastic tradition."
        },
        {
          id: "deflect-missiles",
          name: "Deflect Missiles",
          type: "resource",
          summary: "Use a reaction to reduce damage from a ranged weapon attack."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  paladin: {
    id: "paladin",
    name: "Paladin",
    hitDie: 10,
    progressionType: "half-caster",
    spellcastingAbility: "cha",
    spellPreparation: "prepared",
    primaryAbility: ["Strength", "Charisma"],
    savingThrows: ["Wisdom", "Charisma"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"]
    },
    featuresByLevel: {
      1: [
        {
          id: "divine-sense",
          name: "Divine Sense",
          type: "resource",
          summary: "Briefly sense nearby supernatural presences."
        },
        {
          id: "lay-on-hands",
          name: "Lay on Hands",
          type: "resource",
          summary: "Use a healing pool to restore health or purge poison.",
          resource: { perLevel: 5, recharge: "longRest" }
        }
      ],
      2: [
        {
          id: "fighting-style-paladin",
          name: "Fighting Style",
          type: "choice",
          choose: 1,
          options: ["Defense", "Dueling", "Great Weapon Fighting", "Protection"],
          summary: "Choose a preferred martial approach."
        },
        {
          id: "paladin-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Charisma",
          summary: "Prepare and cast paladin spells using Charisma."
        },
        {
          id: "divine-smite",
          name: "Divine Smite",
          type: "feature",
          summary: "Empower a weapon strike with spell-slot energy."
        }
      ],
      3: [
        {
          id: "sacred-oath",
          name: "Sacred Oath",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose the oath that defines your sacred duty."
        },
        {
          id: "divine-health",
          name: "Divine Health",
          type: "feature",
          summary: "Gain supernatural resistance to disease."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  ranger: {
    id: "ranger",
    name: "Ranger",
    hitDie: 10,
    progressionType: "half-caster",
    spellcastingAbility: "wis",
    spellPreparation: "known",
    primaryAbility: ["Dexterity", "Wisdom"],
    savingThrows: ["Strength", "Dexterity"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 3,
      from: [
        "Animal Handling", "Athletics", "Insight", "Investigation",
        "Nature", "Perception", "Stealth", "Survival"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "favored-enemy",
          name: "Favored Enemy",
          type: "choice",
          choose: 1,
          options: ["Beasts", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Humanoids", "Monstrosities", "Oozes", "Plants", "Undead"],
          summary: "Choose a category of creature you are trained to track and study."
        },
        {
          id: "natural-explorer",
          name: "Natural Explorer",
          type: "choice",
          choose: 1,
          options: ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"],
          summary: "Choose a terrain in which you are especially capable."
        }
      ],
      2: [
        {
          id: "fighting-style-ranger",
          name: "Fighting Style",
          type: "choice",
          choose: 1,
          options: ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"],
          summary: "Choose a preferred martial approach."
        },
        {
          id: "ranger-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Wisdom",
          summary: "Cast ranger spells using Wisdom."
        }
      ],
      3: [
        {
          id: "ranger-archetype",
          name: "Ranger Archetype",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a specialized ranger path."
        },
        {
          id: "primeval-awareness",
          name: "Primeval Awareness",
          type: "resource",
          summary: "Spend magical energy to sense certain creatures in the region."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  rogue: {
    id: "rogue",
    name: "Rogue",
    hitDie: 8,
    primaryAbility: ["Dexterity"],
    savingThrows: ["Dexterity", "Intelligence"],
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Thieves' Tools"],
    skillChoices: {
      choose: 4,
      from: [
        "Acrobatics", "Athletics", "Deception", "Insight", "Intimidation",
        "Investigation", "Perception", "Performance", "Persuasion",
        "Sleight of Hand", "Stealth"
      ]
    },
    featuresByLevel: {
      1: [
        {
          id: "rogue-expertise",
          name: "Expertise",
          type: "choice",
          choose: 2,
          options: [],
          optionSource: "proficientSkillsOrThievesTools",
          summary: "Improve two trained skills or one skill and thieves' tools."
        },
        {
          id: "sneak-attack",
          name: "Sneak Attack",
          type: "feature",
          summary: "Deal extra damage when attacking from a favorable position."
        },
        {
          id: "thieves-cant",
          name: "Thieves' Cant",
          type: "feature",
          summary: "Know the coded language and signs of criminal circles."
        }
      ],
      2: [
        {
          id: "cunning-action",
          name: "Cunning Action",
          type: "feature",
          summary: "Use a bonus action for quick movement or concealment."
        }
      ],
      3: [
        {
          id: "roguish-archetype",
          name: "Roguish Archetype",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a specialized roguish path."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  },

  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    hitDie: 6,
    progressionType: "full-caster",
    spellcastingAbility: "cha",
    spellPreparation: "known",
    primaryAbility: ["Charisma"],
    savingThrows: ["Constitution", "Charisma"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"]
    },
    featuresByLevel: {
      1: [
        {
          id: "sorcerer-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Charisma",
          summary: "Cast sorcerer spells using Charisma."
        },
        {
          id: "sorcerous-origin",
          name: "Sorcerous Origin",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose the origin of your innate magic."
        }
      ],
      2: [
        {
          id: "font-of-magic",
          name: "Font of Magic",
          type: "resource",
          summary: "Use sorcery points to reshape magical energy.",
          resource: { scalesWith: "level", recharge: "longRest" }
        }
      ],
      3: [
        {
          id: "metamagic",
          name: "Metamagic",
          type: "choice",
          choose: 2,
          options: ["Careful Spell", "Distant Spell", "Empowered Spell", "Extended Spell", "Heightened Spell", "Quickened Spell", "Subtle Spell", "Twinned Spell"],
          summary: "Choose ways to modify spells as they are cast."
        }
      ]
    },
    subclassLevel: 1,
    subclasses: []
  },

  warlock: {
    id: "warlock",
    name: "Warlock",
    hitDie: 8,
    progressionType: "pact-magic",
    spellcastingAbility: "cha",
    spellPreparation: "known",
    primaryAbility: ["Charisma"],
    savingThrows: ["Wisdom", "Charisma"],
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"]
    },
    featuresByLevel: {
      1: [
        {
          id: "otherworldly-patron",
          name: "Otherworldly Patron",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose the supernatural patron behind your pact."
        },
        {
          id: "pact-magic",
          name: "Pact Magic",
          type: "spellcasting",
          ability: "Charisma",
          summary: "Cast warlock spells through pact slots that recover quickly."
        }
      ],
      2: [
        {
          id: "eldritch-invocations",
          name: "Eldritch Invocations",
          type: "choice",
          choose: 2,
          options: ["Agonizing Blast", "Armor of Shadows", "Beguiling Influence", "Devil's Sight", "Eldritch Sight", "Fiendish Vigor", "Mask of Many Faces", "Repelling Blast"],
          summary: "Choose lasting supernatural improvements."
        }
      ],
      3: [
        {
          id: "pact-boon",
          name: "Pact Boon",
          type: "choice",
          choose: 1,
          options: ["Pact of the Chain", "Pact of the Blade", "Pact of the Tome"],
          summary: "Choose a special gift from your patron."
        }
      ]
    },
    subclassLevel: 1,
    subclasses: []
  },

  wizard: {
    id: "wizard",
    name: "Wizard",
    hitDie: 6,
    progressionType: "full-caster",
    spellcastingAbility: "int",
    spellPreparation: "spellbook-prepared",
    primaryAbility: ["Intelligence"],
    savingThrows: ["Intelligence", "Wisdom"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]
    },
    featuresByLevel: {
      1: [
        {
          id: "wizard-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Intelligence",
          summary: "Prepare wizard spells from a spellbook using Intelligence."
        },
        {
          id: "arcane-recovery",
          name: "Arcane Recovery",
          type: "resource",
          summary: "Recover a limited amount of spell-slot energy during a short rest.",
          resource: { uses: 1, recharge: "longRest" }
        }
      ],
      2: [
        {
          id: "arcane-tradition",
          name: "Arcane Tradition",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a school or tradition of wizardry."
        }
      ],
      3: []
    },
    subclassLevel: 2,
    subclasses: []
  },

  artificer: {
    id: "artificer",
    name: "Artificer",
    hitDie: 8,
    progressionType: "artificer",
    spellcastingAbility: "int",
    spellPreparation: "prepared",
    primaryAbility: ["Intelligence"],
    savingThrows: ["Constitution", "Intelligence"],
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons"],
    toolProficiencies: ["Thieves' Tools", "Tinker's Tools", "One Artisan Tool"],
    skillChoices: {
      choose: 2,
      from: ["Arcana", "History", "Investigation", "Medicine", "Nature", "Perception", "Sleight of Hand"]
    },
    featuresByLevel: {
      1: [
        {
          id: "magical-tinkering",
          name: "Magical Tinkering",
          type: "feature",
          summary: "Place a small temporary magical effect into an ordinary object."
        },
        {
          id: "artificer-spellcasting",
          name: "Spellcasting",
          type: "spellcasting",
          ability: "Intelligence",
          summary: "Cast artificer spells through tools and crafted effects."
        }
      ],
      2: [
        // Structured infusion choices are rendered by the character creator.
        {
          id: "infuse-item",
          name: "Infuse Item",
          type: "custom",
          customType: "artificerInfusions",
          summary: "Prepare selected infusions and place them into suitable items.",
          placeholder: {
            knownInfusions: [],
            activeInfusions: []
          }
        }
      ],
      3: [
        {
          id: "artificer-specialist",
          name: "Artificer Specialist",
          type: "choice",
          choose: 1,
          options: [],
          optionSource: "subclasses",
          summary: "Choose a specialist field for your inventions."
        },
        {
          id: "right-tool-for-the-job",
          name: "The Right Tool for the Job",
          type: "feature",
          summary: "Create a needed set of artisan tools with your tinker's tools."
        }
      ]
    },
    subclassLevel: 3,
    subclasses: []
  }
};

const progressionFeature = (
  id,
  name,
  extra = {}
) => ({
  id,
  name,
  type: "feature",
  summary: `${name} class feature.`,
  ...extra
});

const progressionAsi = (level) => progressionFeature(
  `ability-score-improvement-${level}`,
  "Ability Score Improvement",
  {
    type: "choice",
    choose: 1,
    options: ["Ability Score Improvement", "Feat"],
    optionSource: "asiOrFeat",
    summary: "Improve ability scores or choose a feat when the advancement system allows it."
  }
);

const progressionSubclassFeature = (
  classId,
  level,
  name
) => progressionFeature(
  `${classId}-subclass-feature-${level}`,
  name,
  {
    summary: `Gain a feature from the selected ${classId} subclass.`
  }
);

const f = progressionFeature;
const a = progressionAsi;
const s = progressionSubclassFeature;

const HIGHER_LEVEL_CLASS_FEATURES = {
  barbarian: {
    4: [a(4)],
    5: [f("extra-attack-barbarian", "Extra Attack"), f("fast-movement", "Fast Movement")],
    6: [s("barbarian", 6, "Primal Path Feature")],
    7: [f("feral-instinct", "Feral Instinct")],
    8: [a(8)],
    9: [f("brutal-critical-1", "Brutal Critical")],
    10: [s("barbarian", 10, "Primal Path Feature")],
    11: [f("relentless-rage", "Relentless Rage")],
    12: [a(12)],
    13: [f("brutal-critical-2", "Brutal Critical Improvement")],
    14: [s("barbarian", 14, "Primal Path Feature")],
    15: [f("persistent-rage", "Persistent Rage")],
    16: [a(16)],
    17: [f("brutal-critical-3", "Brutal Critical Mastery")],
    18: [f("indomitable-might", "Indomitable Might")],
    19: [a(19)],
    20: [f("primal-champion", "Primal Champion")]
  },

  bard: {
    4: [a(4)],
    5: [f("bardic-inspiration-d8", "Bardic Inspiration Improvement", { die: "d8" }), f("font-of-inspiration", "Font of Inspiration")],
    6: [f("countercharm", "Countercharm"), s("bard", 6, "Bard College Feature")],
    8: [a(8)],
    9: [f("song-of-rest-d8", "Song of Rest Improvement", { die: "d8" })],
    10: [f("bardic-inspiration-d10", "Bardic Inspiration Improvement", { die: "d10" }), f("bard-expertise-10", "Expertise"), f("magical-secrets-10", "Magical Secrets")],
    12: [a(12)],
    13: [f("song-of-rest-d10", "Song of Rest Improvement", { die: "d10" })],
    14: [f("magical-secrets-14", "Magical Secrets"), s("bard", 14, "Bard College Feature")],
    15: [f("bardic-inspiration-d12", "Bardic Inspiration Improvement", { die: "d12" })],
    16: [a(16)],
    17: [f("song-of-rest-d12", "Song of Rest Improvement", { die: "d12" })],
    18: [f("magical-secrets-18", "Magical Secrets")],
    19: [a(19)],
    20: [f("superior-inspiration", "Superior Inspiration")]
  },

  cleric: {
    4: [a(4)],
    5: [f("destroy-undead-1-2", "Destroy Undead (CR 1/2)")],
    6: [f("channel-divinity-2", "Channel Divinity Improvement", { type: "resource", resource: { uses: 2, recharge: "shortOrLongRest" } }), s("cleric", 6, "Divine Domain Feature")],
    8: [a(8), f("destroy-undead-1", "Destroy Undead (CR 1)"), s("cleric", 8, "Divine Domain Feature")],
    10: [f("divine-intervention", "Divine Intervention")],
    11: [f("destroy-undead-2", "Destroy Undead (CR 2)")],
    12: [a(12)],
    14: [f("destroy-undead-3", "Destroy Undead (CR 3)")],
    16: [a(16)],
    17: [f("destroy-undead-4", "Destroy Undead (CR 4)"), s("cleric", 17, "Divine Domain Feature")],
    18: [f("channel-divinity-3", "Channel Divinity Improvement", { type: "resource", resource: { uses: 3, recharge: "shortOrLongRest" } })],
    19: [a(19)],
    20: [f("divine-intervention-improvement", "Divine Intervention Improvement")]
  },

  druid: {
    4: [a(4), f("wild-shape-improvement-4", "Wild Shape Improvement")],
    6: [s("druid", 6, "Druid Circle Feature")],
    8: [a(8), f("wild-shape-improvement-8", "Wild Shape Improvement")],
    10: [s("druid", 10, "Druid Circle Feature")],
    12: [a(12)],
    14: [s("druid", 14, "Druid Circle Feature")],
    16: [a(16)],
    18: [f("timeless-body-druid", "Timeless Body"), f("beast-spells", "Beast Spells")],
    19: [a(19)],
    20: [f("archdruid", "Archdruid")]
  },

  fighter: {
    4: [a(4)],
    5: [f("extra-attack-fighter-2", "Extra Attack", { attacks: 2 })],
    6: [a(6)],
    7: [s("fighter", 7, "Martial Archetype Feature")],
    8: [a(8)],
    9: [f("indomitable-1", "Indomitable", { type: "resource", resource: { uses: 1, recharge: "longRest" } })],
    10: [s("fighter", 10, "Martial Archetype Feature")],
    11: [f("extra-attack-fighter-3", "Extra Attack Improvement", { attacks: 3 })],
    12: [a(12)],
    13: [f("indomitable-2", "Indomitable Improvement", { type: "resource", resource: { uses: 2, recharge: "longRest" } })],
    14: [a(14)],
    15: [s("fighter", 15, "Martial Archetype Feature")],
    16: [a(16)],
    17: [f("action-surge-2", "Action Surge Improvement", { type: "resource", resource: { uses: 2, recharge: "shortOrLongRest" } }), f("indomitable-3", "Indomitable Improvement", { type: "resource", resource: { uses: 3, recharge: "longRest" } })],
    18: [s("fighter", 18, "Martial Archetype Feature")],
    19: [a(19)],
    20: [f("extra-attack-fighter-4", "Extra Attack Mastery", { attacks: 4 })]
  },

  monk: {
    4: [a(4), f("slow-fall", "Slow Fall")],
    5: [f("extra-attack-monk", "Extra Attack"), f("stunning-strike", "Stunning Strike")],
    6: [f("ki-empowered-strikes", "Ki-Empowered Strikes"), s("monk", 6, "Monastic Tradition Feature")],
    7: [f("evasion-monk", "Evasion"), f("stillness-of-mind", "Stillness of Mind")],
    8: [a(8)],
    9: [f("unarmored-movement-improvement-9", "Unarmored Movement Improvement")],
    10: [f("purity-of-body", "Purity of Body")],
    11: [s("monk", 11, "Monastic Tradition Feature")],
    12: [a(12)],
    13: [f("tongue-of-the-sun-and-moon", "Tongue of the Sun and Moon")],
    14: [f("diamond-soul", "Diamond Soul")],
    15: [f("timeless-body-monk", "Timeless Body")],
    16: [a(16)],
    17: [s("monk", 17, "Monastic Tradition Feature")],
    18: [f("empty-body", "Empty Body")],
    19: [a(19)],
    20: [f("perfect-self", "Perfect Self")]
  },

  paladin: {
    4: [a(4)],
    5: [f("extra-attack-paladin", "Extra Attack")],
    6: [f("aura-of-protection", "Aura of Protection")],
    7: [s("paladin", 7, "Sacred Oath Feature")],
    8: [a(8)],
    10: [f("aura-of-courage", "Aura of Courage")],
    11: [f("improved-divine-smite", "Improved Divine Smite")],
    12: [a(12)],
    14: [f("cleansing-touch", "Cleansing Touch")],
    15: [s("paladin", 15, "Sacred Oath Feature")],
    16: [a(16)],
    18: [f("aura-improvements", "Aura Improvements")],
    19: [a(19)],
    20: [s("paladin", 20, "Sacred Oath Capstone")]
  },

  ranger: {
    4: [a(4)],
    5: [f("extra-attack-ranger", "Extra Attack")],
    6: [f("favored-enemy-improvement-6", "Favored Enemy Improvement"), f("natural-explorer-improvement-6", "Natural Explorer Improvement")],
    7: [s("ranger", 7, "Ranger Archetype Feature")],
    8: [a(8), f("lands-stride", "Land's Stride")],
    10: [f("natural-explorer-improvement-10", "Natural Explorer Improvement"), f("hide-in-plain-sight", "Hide in Plain Sight")],
    11: [s("ranger", 11, "Ranger Archetype Feature")],
    12: [a(12)],
    14: [f("favored-enemy-improvement-14", "Favored Enemy Improvement"), f("vanish", "Vanish")],
    15: [s("ranger", 15, "Ranger Archetype Feature")],
    16: [a(16)],
    18: [f("feral-senses", "Feral Senses")],
    19: [a(19)],
    20: [f("foe-slayer", "Foe Slayer")]
  },

  rogue: {
    4: [a(4)],
    5: [f("uncanny-dodge", "Uncanny Dodge"), f("sneak-attack-3d6", "Sneak Attack (3d6)", { dice: "3d6" })],
    6: [f("rogue-expertise-6", "Expertise")],
    7: [f("evasion-rogue", "Evasion"), f("sneak-attack-4d6", "Sneak Attack (4d6)", { dice: "4d6" })],
    8: [a(8)],
    9: [s("rogue", 9, "Roguish Archetype Feature"), f("sneak-attack-5d6", "Sneak Attack (5d6)", { dice: "5d6" })],
    10: [a(10)],
    11: [f("reliable-talent", "Reliable Talent"), f("sneak-attack-6d6", "Sneak Attack (6d6)", { dice: "6d6" })],
    12: [a(12)],
    13: [s("rogue", 13, "Roguish Archetype Feature"), f("sneak-attack-7d6", "Sneak Attack (7d6)", { dice: "7d6" })],
    14: [f("blindsense", "Blindsense")],
    15: [f("slippery-mind", "Slippery Mind"), f("sneak-attack-8d6", "Sneak Attack (8d6)", { dice: "8d6" })],
    16: [a(16)],
    17: [s("rogue", 17, "Roguish Archetype Feature"), f("sneak-attack-9d6", "Sneak Attack (9d6)", { dice: "9d6" })],
    18: [f("elusive", "Elusive")],
    19: [a(19), f("sneak-attack-10d6", "Sneak Attack (10d6)", { dice: "10d6" })],
    20: [f("stroke-of-luck", "Stroke of Luck")]
  },

  sorcerer: {
    4: [a(4)],
    6: [s("sorcerer", 6, "Sorcerous Origin Feature")],
    8: [a(8)],
    10: [f("metamagic-10", "Metamagic Improvement")],
    12: [a(12)],
    14: [s("sorcerer", 14, "Sorcerous Origin Feature")],
    16: [a(16)],
    17: [f("metamagic-17", "Metamagic Improvement")],
    18: [s("sorcerer", 18, "Sorcerous Origin Feature")],
    19: [a(19)],
    20: [f("sorcerous-restoration", "Sorcerous Restoration")]
  },

  warlock: {
    4: [a(4)],
    5: [f("eldritch-invocations-5", "Eldritch Invocation Improvement")],
    6: [s("warlock", 6, "Otherworldly Patron Feature")],
    7: [f("eldritch-invocations-7", "Eldritch Invocation Improvement")],
    8: [a(8)],
    9: [f("eldritch-invocations-9", "Eldritch Invocation Improvement")],
    10: [s("warlock", 10, "Otherworldly Patron Feature")],
    11: [f("mystic-arcanum-6", "Mystic Arcanum (6th Level)")],
    12: [a(12), f("eldritch-invocations-12", "Eldritch Invocation Improvement")],
    13: [f("mystic-arcanum-7", "Mystic Arcanum (7th Level)")],
    14: [s("warlock", 14, "Otherworldly Patron Feature")],
    15: [f("mystic-arcanum-8", "Mystic Arcanum (8th Level)"), f("eldritch-invocations-15", "Eldritch Invocation Improvement")],
    16: [a(16)],
    17: [f("mystic-arcanum-9", "Mystic Arcanum (9th Level)")],
    18: [f("eldritch-invocations-18", "Eldritch Invocation Improvement")],
    19: [a(19)],
    20: [f("eldritch-master", "Eldritch Master")]
  },

  wizard: {
    4: [a(4)],
    6: [s("wizard", 6, "Arcane Tradition Feature")],
    8: [a(8)],
    10: [s("wizard", 10, "Arcane Tradition Feature")],
    12: [a(12)],
    14: [s("wizard", 14, "Arcane Tradition Feature")],
    16: [a(16)],
    18: [f("spell-mastery", "Spell Mastery")],
    19: [a(19)],
    20: [f("signature-spells", "Signature Spells")]
  },

  artificer: {
    4: [a(4)],
    5: [s("artificer", 5, "Artificer Specialist Feature")],
    6: [f("tool-expertise", "Tool Expertise"), f("infuse-item-improvement-6", "Infuse Item Improvement")],
    7: [f("flash-of-genius", "Flash of Genius", { type: "resource", resource: { usesAbility: "Intelligence", recharge: "longRest" } })],
    8: [a(8)],
    9: [s("artificer", 9, "Artificer Specialist Feature")],
    10: [f("magic-item-adept", "Magic Item Adept"), f("infuse-item-improvement-10", "Infuse Item Improvement")],
    11: [f("spell-storing-item", "Spell-Storing Item")],
    12: [a(12)],
    14: [f("magic-item-savant", "Magic Item Savant"), f("infuse-item-improvement-14", "Infuse Item Improvement")],
    15: [s("artificer", 15, "Artificer Specialist Feature")],
    16: [a(16)],
    18: [f("magic-item-master", "Magic Item Master"), f("infuse-item-improvement-18", "Infuse Item Improvement")],
    19: [a(19)],
    20: [f("soul-of-artifice", "Soul of Artifice")]
  }
};

const STANDARD_ASI_LEVELS = [4, 8, 12, 16, 19];

const CLASS_ASI_LEVELS = {
  fighter: [4, 6, 8, 12, 14, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19]
};

const subclassDataFeature = (
  id,
  name,
  summary = `${name} subclass feature.`,
  extra = {}
) => ({
  id,
  name,
  type: "feature",
  summary,
  ...extra
});

const defineSubclass = ({
  id,
  name,
  summary,
  featuresByLevel
}) => ({
  id,
  name,
  source: "template",
  summary,
  levels: Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => {
      const level = index + 1;

      return [
        level,
        {
          features: featuresByLevel[level] || []
        }
      ];
    })
  )
});

const sf = subclassDataFeature;

const DEFAULT_SUBCLASS_TEMPLATES = {
  barbarian: [
    defineSubclass({
      id: "path-of-the-berserker",
      name: "Path of the Berserker",
      summary: "A primal path built around relentless offense and retaliation.",
      featuresByLevel: {
        3: [sf("berserker-frenzy", "Frenzy")],
        6: [sf("berserker-mindless-rage", "Mindless Rage")],
        10: [sf("berserker-intimidating-presence", "Intimidating Presence")],
        14: [sf("berserker-retaliation", "Retaliation")]
      }
    })
  ],

  bard: [
    defineSubclass({
      id: "college-of-lore",
      name: "College of Lore",
      summary: "A bard college focused on knowledge, versatility, and disrupting enemies.",
      featuresByLevel: {
        3: [sf("lore-bonus-proficiencies", "Bonus Proficiencies"), sf("lore-cutting-words", "Cutting Words")],
        6: [sf("lore-additional-magical-secrets", "Additional Magical Secrets")],
        14: [sf("lore-peerless-skill", "Peerless Skill")]
      }
    })
  ],

  cleric: [
    defineSubclass({
      id: "life-domain",
      name: "Life Domain",
      summary: "A divine domain devoted to healing, endurance, and preserving life.",
      featuresByLevel: {
        1: [sf("life-bonus-proficiency", "Bonus Proficiency"), sf("life-disciple-of-life", "Disciple of Life")],
        2: [sf("life-preserve-life", "Channel Divinity: Preserve Life", "Restore health to nearby creatures.", { type: "resource", resource: { recharge: "shortOrLongRest" } })],
        6: [sf("life-blessed-healer", "Blessed Healer")],
        8: [sf("life-divine-strike", "Divine Strike")],
        17: [sf("life-supreme-healing", "Supreme Healing")]
      }
    })
  ],

  druid: [
    defineSubclass({
      id: "circle-of-the-land",
      name: "Circle of the Land",
      summary: "A druid circle tied closely to a chosen land and its magic.",
      featuresByLevel: {
        2: [sf("land-bonus-cantrip", "Bonus Cantrip"), sf("land-natural-recovery", "Natural Recovery")],
        3: [sf("land-circle-spells-3", "Circle Spells")],
        5: [sf("land-circle-spells-5", "Circle Spells Improvement")],
        6: [sf("land-stride", "Land's Stride")],
        7: [sf("land-circle-spells-7", "Circle Spells Improvement")],
        9: [sf("land-circle-spells-9", "Circle Spells Improvement")],
        10: [sf("land-natures-ward", "Nature's Ward")],
        14: [sf("land-natures-sanctuary", "Nature's Sanctuary")]
      }
    })
  ],

  fighter: [
    defineSubclass({
      id: "champion",
      name: "Champion",
      summary: "A martial archetype focused on physical excellence and reliable critical hits.",
      featuresByLevel: {
        3: [sf("champion-improved-critical", "Improved Critical")],
        7: [sf("champion-remarkable-athlete", "Remarkable Athlete")],
        10: [sf("champion-additional-fighting-style", "Additional Fighting Style")],
        15: [sf("champion-superior-critical", "Superior Critical")],
        18: [sf("champion-survivor", "Survivor")]
      }
    })
  ],

  monk: [
    defineSubclass({
      id: "way-of-the-open-hand",
      name: "Way of the Open Hand",
      summary: "A monastic tradition that refines unarmed control and inner discipline.",
      featuresByLevel: {
        3: [sf("open-hand-technique", "Open Hand Technique")],
        6: [sf("open-hand-wholeness-of-body", "Wholeness of Body")],
        11: [sf("open-hand-tranquility", "Tranquility")],
        17: [sf("open-hand-quivering-palm", "Quivering Palm")]
      }
    })
  ],

  paladin: [
    defineSubclass({
      id: "oath-of-devotion",
      name: "Oath of Devotion",
      summary: "A sacred oath centered on courage, compassion, honor, and duty.",
      featuresByLevel: {
        3: [
          sf("devotion-oath-spells", "Oath Spells"),
          sf(
            "devotion-channel-divinity",
            "Channel Divinity",
            "Use a limited sacred-oath channel option.",
            {
              type: "resource",
              resource: {
                name: "Channel Divinity",
                uses: 1,
                recharge: "shortOrLongRest"
              }
            }
          )
        ],
        7: [sf("devotion-aura", "Aura of Devotion")],
        15: [sf("devotion-purity-of-spirit", "Purity of Spirit")],
        20: [sf("devotion-holy-nimbus", "Holy Nimbus")]
      }
    })
  ],

  ranger: [
    defineSubclass({
      id: "hunter",
      name: "Hunter",
      summary: "A ranger archetype that adapts its tactics to dangerous prey.",
      featuresByLevel: {
        3: [sf("hunter-prey", "Hunter's Prey")],
        7: [sf("hunter-defensive-tactics", "Defensive Tactics")],
        11: [sf("hunter-multiattack", "Multiattack")],
        15: [sf("hunter-superior-defense", "Superior Hunter's Defense")]
      }
    })
  ],

  rogue: [
    defineSubclass({
      id: "thief",
      name: "Thief",
      summary: "A roguish archetype built around speed, agility, and clever item use.",
      featuresByLevel: {
        3: [sf("thief-fast-hands", "Fast Hands"), sf("thief-second-story-work", "Second-Story Work")],
        9: [sf("thief-supreme-sneak", "Supreme Sneak")],
        13: [sf("thief-use-magic-device", "Use Magic Device")],
        17: [sf("thief-reflexes", "Thief's Reflexes")]
      }
    })
  ],

  sorcerer: [
    defineSubclass({
      id: "draconic-bloodline",
      name: "Draconic Bloodline",
      summary: "A sorcerous origin shaped by draconic ancestry and elemental power.",
      featuresByLevel: {
        1: [sf("draconic-ancestor", "Dragon Ancestor"), sf("draconic-resilience", "Draconic Resilience")],
        6: [sf("draconic-elemental-affinity", "Elemental Affinity")],
        14: [sf("draconic-wings", "Dragon Wings")],
        18: [sf("draconic-presence", "Draconic Presence")]
      }
    })
  ],

  warlock: [
    defineSubclass({
      id: "the-fiend",
      name: "The Fiend",
      summary: "An otherworldly patron that grants destructive power and infernal resilience.",
      featuresByLevel: {
        1: [sf("fiend-dark-ones-blessing", "Dark One's Blessing")],
        6: [sf("fiend-dark-ones-own-luck", "Dark One's Own Luck")],
        10: [sf("fiendish-resilience", "Fiendish Resilience")],
        14: [sf("hurl-through-hell", "Hurl Through Hell")]
      }
    })
  ],

  wizard: [
    defineSubclass({
      id: "school-of-evocation",
      name: "School of Evocation",
      summary: "An arcane tradition focused on shaping and strengthening evocation magic.",
      featuresByLevel: {
        2: [sf("evocation-savant", "Evocation Savant"), sf("sculpt-spells", "Sculpt Spells")],
        6: [sf("potent-cantrip", "Potent Cantrip")],
        10: [sf("empowered-evocation", "Empowered Evocation")],
        14: [sf("overchannel", "Overchannel")]
      }
    })
  ],

  artificer: [
    defineSubclass({
      id: "alchemist",
      name: "Alchemist",
      summary: "An artificer specialist who creates restorative and transformative mixtures.",
      featuresByLevel: {
        3: [sf("alchemist-tool-proficiency", "Tool Proficiency"), sf("alchemist-spells", "Alchemist Spells"), sf("experimental-elixir", "Experimental Elixir")],
        5: [sf("alchemical-savant", "Alchemical Savant")],
        9: [sf("restorative-reagents", "Restorative Reagents")],
        15: [sf("chemical-mastery", "Chemical Mastery")]
      }
    })
  ]
};

Object.entries(DEFAULT_CLASSES).forEach(([classId, classData]) => {
  const higherLevels = HIGHER_LEVEL_CLASS_FEATURES[classId] || {};

  classData.asiLevels = [
    ...(CLASS_ASI_LEVELS[classId] || STANDARD_ASI_LEVELS)
  ];

  classData.subclasses = [
    ...(DEFAULT_SUBCLASS_TEMPLATES[classId] || [])
  ];

  classData.featuresByLevel = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => {
      const level = index + 1;

      return [
        level,
        higherLevels[level] ||
        classData.featuresByLevel[level] ||
        []
      ];
    })
  );
});

Object.assign(DEFAULT_CLASSES.bard, {
  cantripsKnown: { 1: 2, 4: 3, 10: 4 },
  spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 13: 16, 15: 17, 17: 18 }
});

Object.assign(DEFAULT_CLASSES.cleric, {
  cantripsKnown: { 1: 3, 4: 4, 10: 5 },
  preparedSpellsFormula: { ability: "wis", levelFactor: 1, minimum: 1 }
});

Object.assign(DEFAULT_CLASSES.druid, {
  cantripsKnown: { 1: 2, 4: 3, 10: 4 },
  preparedSpellsFormula: { ability: "wis", levelFactor: 1, minimum: 1 }
});

Object.assign(DEFAULT_CLASSES.paladin, {
  preparedSpellsFormula: { ability: "cha", levelFactor: 0.5, minimum: 1 }
});

Object.assign(DEFAULT_CLASSES.ranger, {
  spellsKnown: { 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 11: 7, 13: 8, 15: 9, 17: 10, 19: 11 }
});

Object.assign(DEFAULT_CLASSES.sorcerer, {
  cantripsKnown: { 1: 4, 4: 5, 10: 6 },
  spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 13: 13, 15: 14, 17: 15 }
});

Object.assign(DEFAULT_CLASSES.warlock, {
  cantripsKnown: { 1: 2, 4: 3, 10: 4 },
  spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 11: 11, 13: 12, 15: 13, 17: 14, 19: 15 }
});

Object.assign(DEFAULT_CLASSES.wizard, {
  cantripsKnown: { 1: 3, 4: 4, 10: 5 },
  preparedSpellsFormula: { ability: "int", levelFactor: 1, minimum: 1 }
});

Object.assign(DEFAULT_CLASSES.artificer, {
  cantripsKnown: { 1: 2, 10: 3, 14: 4 },
  preparedSpellsFormula: { ability: "int", levelFactor: 0.5, round: "ceil", minimum: 1 },
  infusionsKnownByLevel: { 2: 4, 6: 6, 10: 8, 14: 10, 18: 12 },
  infusedItemsByLevel: { 2: 2, 6: 3, 10: 4, 14: 5, 18: 6 },
  infusions: [
    { id: "enhanced-arcane-focus", name: "Enhanced Arcane Focus", minimumLevel: 2, summary: "Improve a spellcasting focus used for artificer spells." },
    { id: "enhanced-defense", name: "Enhanced Defense", minimumLevel: 2, summary: "Improve armor or a shield with a defensive bonus." },
    { id: "enhanced-weapon", name: "Enhanced Weapon", minimumLevel: 2, summary: "Improve a simple or martial weapon." },
    { id: "homunculus-servant", name: "Homunculus Servant", minimumLevel: 2, summary: "Create a small magical construct companion." },
    { id: "mind-sharpener", name: "Mind Sharpener", minimumLevel: 2, summary: "Create armor that helps its wearer maintain concentration." },
    { id: "repeating-shot", name: "Repeating Shot", minimumLevel: 2, summary: "Empower a ranged weapon to create its own ammunition." },
    { id: "replicate-magic-item", name: "Replicate Magic Item", minimumLevel: 2, summary: "Learn to reproduce an eligible magic item." },
    { id: "returning-weapon", name: "Returning Weapon", minimumLevel: 2, summary: "Empower a thrown weapon to return after an attack." },
    { id: "boots-of-the-winding-path", name: "Boots of the Winding Path", minimumLevel: 6, summary: "Create boots that retrace the wearer's recent movement." },
    { id: "radiant-weapon", name: "Radiant Weapon", minimumLevel: 6, summary: "Create a luminous weapon with a defensive reaction." },
    { id: "repulsion-shield", name: "Repulsion Shield", minimumLevel: 6, summary: "Create a shield capable of pushing an attacker away." },
    { id: "resistant-armor", name: "Resistant Armor", minimumLevel: 6, summary: "Create armor that grants resistance to one damage type." },
    { id: "helm-of-awareness", name: "Helm of Awareness", minimumLevel: 10, summary: "Create a helm that sharpens initiative and awareness." },
    { id: "arcane-propulsion-armor", name: "Arcane Propulsion Armor", minimumLevel: 14, summary: "Turn armor into a magically propelled integrated weapon system." }
  ]
});

const getClassFeatureById = (classId, featureId) => {
  const classData = DEFAULT_CLASSES[classId];

  if (!classData) {
    return null;
  }

  return Object.values(classData.featuresByLevel)
    .flat()
    .find((featureData) => featureData.id === featureId) || null;
};

const addClassFeatureMechanics = (
  classId,
  featureId,
  mechanics
) => {
  const featureData = getClassFeatureById(classId, featureId);

  if (!featureData) {
    return;
  }

  Object.assign(featureData, mechanics);
};

addClassFeatureMechanics("barbarian", "rage", {
  resource: {
    name: "Rage",
    recharge: "longRest",
    usesByLevel: { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: "unlimited" }
  },
  effects: [
    {
      type: "rage",
      damageBonusByLevel: { 1: 2, 9: 3, 16: 4 },
      grantsResistance: ["bludgeoning", "piercing", "slashing"]
    }
  ]
});

addClassFeatureMechanics("barbarian", "unarmored-defense-barbarian", {
  effects: [
    {
      type: "armorClassFormula",
      base: 10,
      abilities: ["dex", "con"],
      requires: { unarmored: true }
    }
  ]
});

addClassFeatureMechanics("barbarian", "fast-movement", {
  effects: [
    {
      type: "speedBonus",
      movement: "walk",
      value: 10,
      requires: { noHeavyArmor: true }
    }
  ]
});

addClassFeatureMechanics("bard", "bardic-inspiration", {
  resource: {
    name: "Bardic Inspiration",
    usesAbility: "cha",
    minimum: 1,
    rechargeByLevel: { 1: "longRest", 5: "shortOrLongRest" },
    dieByLevel: { 1: "d6", 5: "d8", 10: "d10", 15: "d12" }
  }
});

addClassFeatureMechanics("monk", "unarmored-defense-monk", {
  effects: [
    {
      type: "armorClassFormula",
      base: 10,
      abilities: ["dex", "wis"],
      requires: { unarmored: true, noShield: true }
    }
  ]
});

addClassFeatureMechanics("monk", "ki", {
  resource: {
    name: "Ki / Discipline Points",
    pool: { formula: "classLevel" },
    recharge: "shortOrLongRest"
  },
  effects: [
    {
      type: "resourcePool",
      name: "Ki / Discipline Points",
      formula: "classLevel"
    }
  ]
});

addClassFeatureMechanics("monk", "unarmored-movement", {
  effects: [
    {
      type: "speedBonusByLevel",
      movement: "walk",
      values: { 2: 10, 6: 15, 10: 20, 14: 25, 18: 30 },
      requires: { unarmored: true }
    }
  ]
});

addClassFeatureMechanics("paladin", "lay-on-hands", {
  resource: {
    name: "Lay on Hands",
    pool: { formula: "classLevel * 5" },
    recharge: "longRest"
  },
  effects: [
    {
      type: "resourcePool",
      name: "Lay on Hands",
      formula: "classLevel * 5"
    }
  ]
});

addClassFeatureMechanics("artificer", "infuse-item", {
  type: "custom",
  customType: "artificerInfusions",
  effects: [
    {
      type: "infusions",
      knownByLevel: DEFAULT_CLASSES.artificer.infusionsKnownByLevel,
      activeByLevel: DEFAULT_CLASSES.artificer.infusedItemsByLevel
    }
  ],
  placeholder: {
    status: "picker",
    knownInfusions: [],
    activeInfusions: []
  }
});

addClassFeatureMechanics("cleric", "channel-divinity", {
  resource: {
    name: "Channel Divinity",
    usesByLevel: { 2: 1, 6: 2, 18: 3 },
    recharge: "shortOrLongRest"
  }
});

addClassFeatureMechanics("rogue", "sneak-attack", {
  effects: [
    {
      type: "sneakAttack",
      diceByLevel: {
        1: "1d6", 3: "2d6", 5: "3d6", 7: "4d6", 9: "5d6",
        11: "6d6", 13: "7d6", 15: "8d6", 17: "9d6", 19: "10d6"
      }
    }
  ]
});

[
  ["barbarian", "extra-attack-barbarian", 2],
  ["fighter", "extra-attack-fighter-2", 2],
  ["fighter", "extra-attack-fighter-3", 3],
  ["fighter", "extra-attack-fighter-4", 4],
  ["monk", "extra-attack-monk", 2],
  ["paladin", "extra-attack-paladin", 2],
  ["ranger", "extra-attack-ranger", 2]
].forEach(([classId, featureId, attacks]) => {
  addClassFeatureMechanics(classId, featureId, {
    effects: [
      {
        type: "extraAttack",
        attacks
      }
    ]
  });
});

Object.values(DEFAULT_CLASSES).forEach((classData) => {
  Object.values(classData.featuresByLevel)
    .flat()
    .filter((featureData) => featureData.type === "spellcasting")
    .forEach((featureData) => {
      featureData.effects = [
        {
          type: "spellcasting",
          ability: classData.spellcastingAbility,
          progression: classData.progressionType,
          preparation: classData.spellPreparation
        }
      ];
    });
});
