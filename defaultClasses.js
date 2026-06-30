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
    progressionType: "half-caster",
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
        // TODO: Build full Artificer infusion picker later.
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
