export const DEFAULT_FEATS = [
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
