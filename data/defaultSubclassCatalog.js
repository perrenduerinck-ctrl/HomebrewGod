// =====================================================
// HOMEBREW GOD — LEGACY 2014 SUBCLASS COMPLETION CATALOG
// =====================================================

// Feature names are stored separately from their original, concise summaries.
// defaultSubclasses.js turns these records into complete feature objects with
// descriptions, action-economy labels, source metadata, choices, resources,
// save-DC ownership, and class-entry ownership.
export const SUBCLASS_FEATURE_CATALOG = Object.freeze({
  artificer: {
    alchemist: {
      3: ["Tool Proficiency", "Alchemist Spells", "Experimental Elixir"],
      5: ["Alchemical Savant"],
      9: ["Restorative Reagents"],
      15: ["Chemical Mastery"]
    },
    armorer: {
      3: ["Tools of the Trade", "Armorer Spells", "Arcane Armor", "Armor Model"],
      5: ["Extra Attack"],
      9: ["Armor Modifications"],
      15: ["Perfected Armor"]
    },
    artillerist: {
      3: ["Tool Proficiency", "Artillerist Spells", "Eldritch Cannon"],
      5: ["Arcane Firearm"],
      9: ["Explosive Cannon"],
      15: ["Fortified Position"]
    },
    "battle-smith": {
      3: ["Tool Proficiency", "Battle Smith Spells", "Battle Ready", "Steel Defender"],
      5: ["Extra Attack"],
      9: ["Arcane Jolt"],
      15: ["Improved Defender"]
    }
  },
  barbarian: {
    berserker: {
      3: ["Frenzy"],
      6: ["Mindless Rage"],
      10: ["Intimidating Presence"],
      14: ["Retaliation"]
    },
    "ancestral-guardian": {
      3: ["Ancestral Protectors"],
      6: ["Spirit Shield"],
      10: ["Consult the Spirits"],
      14: ["Vengeful Ancestors"]
    },
    battlerager: {
      3: ["Battlerager Armor"],
      6: ["Reckless Abandon"],
      10: ["Battlerager Charge"],
      14: ["Spiked Retribution"]
    },
    beast: {
      3: ["Form of the Beast"],
      6: ["Bestial Soul"],
      10: ["Infectious Fury"],
      14: ["Call the Hunt"]
    },
    giant: {
      3: ["Giant Power", "Giant's Havoc"],
      6: ["Elemental Cleaver"],
      10: ["Mighty Impel"],
      14: ["Demiurgic Colossus"]
    },
    "storm-herald": {
      3: ["Storm Aura"],
      6: ["Storm Soul"],
      10: ["Shielding Storm"],
      14: ["Raging Storm"]
    },
    "totem-warrior": {
      3: ["Spirit Seeker", "Totem Spirit"],
      6: ["Aspect of the Beast"],
      10: ["Spirit Walker"],
      14: ["Totemic Attunement"]
    },
    "wild-magic": {
      3: ["Magic Awareness", "Wild Surge"],
      6: ["Bolstering Magic"],
      10: ["Unstable Backlash"],
      14: ["Controlled Surge"]
    },
    zealot: {
      3: ["Divine Fury", "Warrior of the Gods"],
      6: ["Fanatical Focus"],
      10: ["Zealous Presence"],
      14: ["Rage Beyond Death"]
    }
  },
  bard: {
    lore: {
      3: ["Bonus Proficiencies", "Cutting Words"],
      6: ["Additional Magical Secrets"],
      14: ["Peerless Skill"]
    },
    creation: {
      3: ["Mote of Potential", "Performance of Creation"],
      6: ["Animating Performance"],
      14: ["Creative Crescendo"]
    },
    eloquence: {
      3: ["Silver Tongue", "Unsettling Words"],
      6: ["Unfailing Inspiration", "Universal Speech"],
      14: ["Infectious Inspiration"]
    },
    glamour: {
      3: ["Mantle of Inspiration", "Enthralling Performance"],
      6: ["Mantle of Majesty"],
      14: ["Unbreakable Majesty"]
    },
    spirits: {
      3: ["Guiding Whispers", "Spiritual Focus", "Tales from Beyond"],
      6: ["Spirit Session"],
      14: ["Mystical Connection"]
    },
    swords: {
      3: ["Bonus Proficiencies", "Fighting Style", "Blade Flourish"],
      6: ["Extra Attack"],
      14: ["Master's Flourish"]
    },
    valor: {
      3: ["Bonus Proficiencies", "Combat Inspiration"],
      6: ["Extra Attack"],
      14: ["Battle Magic"]
    },
    whispers: {
      3: ["Psychic Blades", "Words of Terror"],
      6: ["Mantle of Whispers"],
      14: ["Shadow Lore"]
    }
  },
  cleric: {
    life: {
      1: ["Bonus Proficiency", "Disciple of Life"],
      2: ["Channel Divinity: Preserve Life"],
      6: ["Blessed Healer"],
      8: ["Divine Strike"],
      17: ["Supreme Healing"]
    },
    arcana: {
      1: ["Arcane Initiate"],
      2: ["Channel Divinity: Arcane Abjuration"],
      6: ["Spell Breaker"],
      8: ["Potent Spellcasting"],
      17: ["Arcane Mastery"]
    },
    death: {
      1: ["Reaper"],
      2: ["Channel Divinity: Touch of Death"],
      6: ["Inescapable Destruction"],
      8: ["Divine Strike"],
      17: ["Improved Reaper"]
    },
    forge: {
      1: ["Bonus Proficiency", "Blessing of the Forge"],
      2: ["Channel Divinity: Artisan's Blessing"],
      6: ["Soul of the Forge"],
      8: ["Divine Strike"],
      17: ["Saint of Forge and Fire"]
    },
    grave: {
      1: ["Circle of Mortality", "Eyes of the Grave"],
      2: ["Channel Divinity: Path to the Grave"],
      6: ["Sentinel at Death's Door"],
      8: ["Potent Spellcasting"],
      17: ["Keeper of Souls"]
    },
    knowledge: {
      1: ["Blessings of Knowledge"],
      2: ["Channel Divinity: Knowledge of the Ages"],
      6: ["Channel Divinity: Read Thoughts"],
      8: ["Potent Spellcasting"],
      17: ["Visions of the Past"]
    },
    light: {
      1: ["Bonus Cantrip", "Warding Flare"],
      2: ["Channel Divinity: Radiance of the Dawn"],
      6: ["Improved Flare"],
      8: ["Potent Spellcasting"],
      17: ["Corona of Light"]
    },
    nature: {
      1: ["Acolyte of Nature", "Bonus Proficiency"],
      2: ["Channel Divinity: Charm Animals and Plants"],
      6: ["Dampen Elements"],
      8: ["Divine Strike"],
      17: ["Master of Nature"]
    },
    order: {
      1: ["Bonus Proficiency", "Voice of Authority"],
      2: ["Channel Divinity: Order's Demand"],
      6: ["Embodiment of the Law"],
      8: ["Divine Strike"],
      17: ["Order's Wrath"]
    },
    peace: {
      1: ["Implement of Peace", "Emboldening Bond"],
      2: ["Channel Divinity: Balm of Peace"],
      6: ["Protective Bond"],
      8: ["Potent Spellcasting"],
      17: ["Expansive Bond"]
    },
    tempest: {
      1: ["Bonus Proficiencies", "Wrath of the Storm"],
      2: ["Channel Divinity: Destructive Wrath"],
      6: ["Thunderbolt Strike"],
      8: ["Divine Strike"],
      17: ["Stormborn"]
    },
    trickery: {
      1: ["Blessing of the Trickster"],
      2: ["Channel Divinity: Invoke Duplicity"],
      6: ["Channel Divinity: Cloak of Shadows"],
      8: ["Divine Strike"],
      17: ["Improved Duplicity"]
    },
    twilight: {
      1: ["Bonus Proficiencies", "Eyes of Night", "Vigilant Blessing"],
      2: ["Channel Divinity: Twilight Sanctuary"],
      6: ["Steps of Night"],
      8: ["Divine Strike"],
      17: ["Twilight Shroud"]
    },
    war: {
      1: ["Bonus Proficiencies", "War Priest"],
      2: ["Channel Divinity: Guided Strike"],
      6: ["Channel Divinity: War God's Blessing"],
      8: ["Divine Strike"],
      17: ["Avatar of Battle"]
    }
  },
  druid: {
    land: {
      2: ["Bonus Cantrip", "Natural Recovery"],
      6: ["Land's Stride"],
      10: ["Nature's Ward"],
      14: ["Nature's Sanctuary"]
    },
    dreams: {
      2: ["Balm of the Summer Court"],
      6: ["Hearth of Moonlight and Shadow"],
      10: ["Hidden Paths"],
      14: ["Walker in Dreams"]
    },
    moon: {
      2: ["Combat Wild Shape", "Circle Forms"],
      6: ["Primal Strike"],
      10: ["Elemental Wild Shape"],
      14: ["Thousand Forms"]
    },
    shepherd: {
      2: ["Speech of the Woods", "Spirit Totem"],
      6: ["Mighty Summoner"],
      10: ["Guardian Spirit"],
      14: ["Faithful Summons"]
    },
    spores: {
      2: ["Circle Spells", "Halo of Spores", "Symbiotic Entity"],
      6: ["Fungal Infestation"],
      10: ["Spreading Spores"],
      14: ["Fungal Body"]
    },
    stars: {
      2: ["Star Map", "Starry Form"],
      6: ["Cosmic Omen"],
      10: ["Twinkling Constellations"],
      14: ["Full of Stars"]
    },
    wildfire: {
      2: ["Circle Spells", "Summon Wildfire Spirit"],
      6: ["Enhanced Bond"],
      10: ["Cauterizing Flames"],
      14: ["Blazing Revival"]
    }
  },
  fighter: {
    champion: {
      3: ["Improved Critical"],
      7: ["Remarkable Athlete"],
      10: ["Additional Fighting Style"],
      15: ["Superior Critical"],
      18: ["Survivor"]
    },
    "arcane-archer": {
      3: ["Arcane Archer Lore", "Arcane Shot", "Magic Arrow"],
      7: ["Curving Shot"],
      10: ["Arcane Shot Improvement"],
      15: ["Ever-Ready Shot"],
      18: ["Arcane Shot Mastery"]
    },
    "banneret-purple-dragon-knight": {
      3: ["Rallying Cry"],
      7: ["Royal Envoy"],
      10: ["Inspiring Surge"],
      15: ["Bulwark"],
      18: ["Inspiring Surge Improvement"]
    },
    "battle-master": {
      3: ["Combat Superiority", "Student of War"],
      7: ["Know Your Enemy"],
      10: ["Improved Combat Superiority"],
      15: ["Relentless"],
      18: ["Superior Combat Superiority"]
    },
    cavalier: {
      3: ["Bonus Proficiency", "Born to the Saddle", "Unwavering Mark"],
      7: ["Warding Maneuver"],
      10: ["Hold the Line"],
      15: ["Ferocious Charger"],
      18: ["Vigilant Defender"]
    },
    "echo-knight": {
      3: ["Manifest Echo", "Unleash Incarnation"],
      7: ["Echo Avatar"],
      10: ["Shadow Martyr"],
      15: ["Reclaim Potential"],
      18: ["Legion of One"]
    },
    "eldritch-knight": {
      3: ["Spellcasting", "Weapon Bond"],
      7: ["War Magic"],
      10: ["Eldritch Strike"],
      15: ["Arcane Charge"],
      18: ["Improved War Magic"]
    },
    "psi-warrior": {
      3: ["Psionic Power"],
      7: ["Telekinetic Adept"],
      10: ["Guarded Mind"],
      15: ["Bulwark of Force"],
      18: ["Telekinetic Master"]
    },
    "rune-knight": {
      3: ["Bonus Proficiencies", "Rune Carver", "Giant Might"],
      7: ["Runic Shield"],
      10: ["Great Stature"],
      15: ["Master of Runes"],
      18: ["Runic Juggernaut"]
    },
    samurai: {
      3: ["Bonus Proficiency", "Fighting Spirit"],
      7: ["Elegant Courtier"],
      10: ["Tireless Spirit"],
      15: ["Rapid Strike"],
      18: ["Strength Before Death"]
    }
  },
  monk: {
    "open-hand": {
      3: ["Open Hand Technique"],
      6: ["Wholeness of Body"],
      11: ["Tranquility"],
      17: ["Quivering Palm"]
    },
    "ascendant-dragon": {
      3: ["Draconic Disciple", "Breath of the Dragon"],
      6: ["Wings Unfurled"],
      11: ["Aspect of the Wyrm"],
      17: ["Ascendant Aspect"]
    },
    "astral-self": {
      3: ["Arms of the Astral Self"],
      6: ["Visage of the Astral Self"],
      11: ["Body of the Astral Self"],
      17: ["Awakened Astral Self"]
    },
    "drunken-master": {
      3: ["Bonus Proficiencies", "Drunken Technique"],
      6: ["Tipsy Sway"],
      11: ["Drunkard's Luck"],
      17: ["Intoxicated Frenzy"]
    },
    "four-elements": {
      3: ["Disciple of the Elements", "Elemental Disciplines"],
      6: ["Elemental Discipline Improvement"],
      11: ["Elemental Discipline Improvement"],
      17: ["Elemental Discipline Mastery"]
    },
    kensei: {
      3: ["Path of the Kensei"],
      6: ["One with the Blade"],
      11: ["Sharpen the Blade"],
      17: ["Unerring Accuracy"]
    },
    "long-death": {
      3: ["Touch of Death"],
      6: ["Hour of Reaping"],
      11: ["Mastery of Death"],
      17: ["Touch of the Long Death"]
    },
    mercy: {
      3: ["Implements of Mercy", "Hand of Healing", "Hand of Harm"],
      6: ["Physician's Touch"],
      11: ["Flurry of Healing and Harm"],
      17: ["Hand of Ultimate Mercy"]
    },
    shadow: {
      3: ["Shadow Arts"],
      6: ["Shadow Step"],
      11: ["Cloak of Shadows"],
      17: ["Opportunist"]
    },
    "sun-soul": {
      3: ["Radiant Sun Bolt"],
      6: ["Searing Arc Strike"],
      11: ["Searing Sunburst"],
      17: ["Sun Shield"]
    }
  },
  paladin: {
    devotion: {
      3: ["Oath Spells", "Channel Divinity: Sacred Weapon", "Channel Divinity: Turn the Unholy"],
      7: ["Aura of Devotion"],
      15: ["Purity of Spirit"],
      20: ["Holy Nimbus"]
    },
    ancients: {
      3: ["Oath Spells", "Channel Divinity: Nature's Wrath", "Channel Divinity: Turn the Faithless"],
      7: ["Aura of Warding"],
      15: ["Undying Sentinel"],
      20: ["Elder Champion"]
    },
    conquest: {
      3: ["Oath Spells", "Channel Divinity: Conquering Presence", "Channel Divinity: Guided Strike"],
      7: ["Aura of Conquest"],
      15: ["Scornful Rebuke"],
      20: ["Invincible Conqueror"]
    },
    crown: {
      3: ["Oath Spells", "Channel Divinity: Champion Challenge", "Channel Divinity: Turn the Tide"],
      7: ["Divine Allegiance"],
      15: ["Unyielding Spirit"],
      20: ["Exalted Champion"]
    },
    glory: {
      3: ["Oath Spells", "Channel Divinity: Peerless Athlete", "Channel Divinity: Inspiring Smite"],
      7: ["Aura of Alacrity"],
      15: ["Glorious Defense"],
      20: ["Living Legend"]
    },
    oathbreaker: {
      3: ["Oathbreaker Spells", "Channel Divinity: Control Undead", "Channel Divinity: Dreadful Aspect"],
      7: ["Aura of Hate"],
      15: ["Supernatural Resistance"],
      20: ["Dread Lord"]
    },
    redemption: {
      3: ["Oath Spells", "Channel Divinity: Emissary of Peace", "Channel Divinity: Rebuke the Violent"],
      7: ["Aura of the Guardian"],
      15: ["Protective Spirit"],
      20: ["Emissary of Redemption"]
    },
    vengeance: {
      3: ["Oath Spells", "Channel Divinity: Abjure Enemy", "Channel Divinity: Vow of Enmity"],
      7: ["Relentless Avenger"],
      15: ["Soul of Vengeance"],
      20: ["Avenging Angel"]
    },
    watchers: {
      3: ["Oath Spells", "Channel Divinity: Watcher's Will", "Channel Divinity: Abjure the Extraplanar"],
      7: ["Aura of the Sentinel"],
      15: ["Vigilant Rebuke"],
      20: ["Mortal Bulwark"]
    }
  },
  ranger: {
    hunter: {
      3: ["Hunter's Prey"],
      7: ["Defensive Tactics"],
      11: ["Multiattack"],
      15: ["Superior Hunter's Defense"]
    },
    "beast-master": {
      3: ["Ranger's Companion"],
      7: ["Exceptional Training"],
      11: ["Bestial Fury"],
      15: ["Share Spells"]
    },
    drakewarden: {
      3: ["Draconic Gift", "Drake Companion"],
      7: ["Bond of Fang and Scale"],
      11: ["Drake's Breath"],
      15: ["Perfected Bond"]
    },
    "fey-wanderer": {
      3: ["Dreadful Strikes", "Fey Wanderer Magic", "Otherworldly Glamour"],
      7: ["Beguiling Twist"],
      11: ["Fey Reinforcements"],
      15: ["Misty Wanderer"]
    },
    "gloom-stalker": {
      3: ["Dread Ambusher", "Gloom Stalker Magic", "Umbral Sight"],
      7: ["Iron Mind"],
      11: ["Stalker's Flurry"],
      15: ["Shadowy Dodge"]
    },
    "horizon-walker": {
      3: ["Detect Portal", "Horizon Walker Magic", "Planar Warrior"],
      7: ["Ethereal Step"],
      11: ["Distant Strike"],
      15: ["Spectral Defense"]
    },
    "monster-slayer": {
      3: ["Hunter's Sense", "Slayer's Prey", "Monster Slayer Magic"],
      7: ["Supernatural Defense"],
      11: ["Magic-User's Nemesis"],
      15: ["Slayer's Counter"]
    },
    swarmkeeper: {
      3: ["Gathered Swarm", "Swarmkeeper Magic"],
      7: ["Writhing Tide"],
      11: ["Mighty Swarm"],
      15: ["Swarming Dispersal"]
    }
  },
  rogue: {
    thief: {
      3: ["Fast Hands", "Second-Story Work"],
      9: ["Supreme Sneak"],
      13: ["Use Magic Device"],
      17: ["Thief's Reflexes"]
    },
    "arcane-trickster": {
      3: ["Spellcasting", "Mage Hand Legerdemain"],
      9: ["Magical Ambush"],
      13: ["Versatile Trickster"],
      17: ["Spell Thief"]
    },
    assassin: {
      3: ["Bonus Proficiencies", "Assassinate"],
      9: ["Infiltration Expertise"],
      13: ["Impostor"],
      17: ["Death Strike"]
    },
    inquisitive: {
      3: ["Ear for Deceit", "Eye for Detail", "Insightful Fighting"],
      9: ["Steady Eye"],
      13: ["Unerring Eye"],
      17: ["Eye for Weakness"]
    },
    mastermind: {
      3: ["Master of Intrigue", "Master of Tactics"],
      9: ["Insightful Manipulator"],
      13: ["Misdirection"],
      17: ["Soul of Deceit"]
    },
    phantom: {
      3: ["Whispers of the Dead", "Wails from the Grave"],
      9: ["Tokens of the Departed"],
      13: ["Ghost Walk"],
      17: ["Death's Friend"]
    },
    scout: {
      3: ["Skirmisher", "Survivalist"],
      9: ["Superior Mobility"],
      13: ["Ambush Master"],
      17: ["Sudden Strike"]
    },
    soulknife: {
      3: ["Psionic Power", "Psychic Blades"],
      9: ["Soul Blades"],
      13: ["Psychic Veil"],
      17: ["Rend Mind"]
    },
    swashbuckler: {
      3: ["Fancy Footwork", "Rakish Audacity"],
      9: ["Panache"],
      13: ["Elegant Maneuver"],
      17: ["Master Duelist"]
    }
  },
  sorcerer: {
    "draconic-bloodline": {
      1: ["Dragon Ancestor", "Draconic Resilience"],
      6: ["Elemental Affinity"],
      14: ["Dragon Wings"],
      18: ["Draconic Presence"]
    },
    "aberrant-mind": {
      1: ["Psionic Spells", "Telepathic Speech"],
      6: ["Psionic Sorcery", "Psychic Defenses"],
      14: ["Revelation in Flesh"],
      18: ["Warping Implosion"]
    },
    "clockwork-soul": {
      1: ["Clockwork Magic", "Restore Balance"],
      6: ["Bastion of Law"],
      14: ["Trance of Order"],
      18: ["Clockwork Cavalcade"]
    },
    "divine-soul": {
      1: ["Divine Magic", "Favored by the Gods"],
      6: ["Empowered Healing"],
      14: ["Otherworldly Wings"],
      18: ["Unearthly Recovery"]
    },
    "lunar-sorcery": {
      1: ["Lunar Embodiment", "Moon Fire"],
      6: ["Lunar Boons", "Waxing and Waning"],
      14: ["Lunar Empowerment"],
      18: ["Lunar Phenomenon"]
    },
    "shadow-magic": {
      1: ["Eyes of the Dark", "Strength of the Grave"],
      6: ["Hound of Ill Omen"],
      14: ["Shadow Walk"],
      18: ["Umbral Form"]
    },
    "storm-sorcery": {
      1: ["Wind Speaker", "Tempestuous Magic"],
      6: ["Heart of the Storm", "Storm Guide"],
      14: ["Storm's Fury"],
      18: ["Wind Soul"]
    },
    "wild-magic": {
      1: ["Wild Magic Surge", "Tides of Chaos"],
      6: ["Bend Luck"],
      14: ["Controlled Chaos"],
      18: ["Spell Bombardment"]
    }
  },
  warlock: {
    fiend: {
      1: ["Dark One's Blessing"],
      6: ["Dark One's Own Luck"],
      10: ["Fiendish Resilience"],
      14: ["Hurl Through Hell"]
    },
    archfey: {
      1: ["Fey Presence"],
      6: ["Misty Escape"],
      10: ["Beguiling Defenses"],
      14: ["Dark Delirium"]
    },
    celestial: {
      1: ["Expanded Spell List", "Bonus Cantrips", "Healing Light"],
      6: ["Radiant Soul"],
      10: ["Celestial Resilience"],
      14: ["Searing Vengeance"]
    },
    fathomless: {
      1: ["Expanded Spell List", "Tentacle of the Deeps", "Gift of the Sea"],
      6: ["Oceanic Soul", "Guardian Coil"],
      10: ["Grasping Tentacles"],
      14: ["Fathomless Plunge"]
    },
    genie: {
      1: ["Expanded Spell List", "Genie's Vessel"],
      6: ["Elemental Gift"],
      10: ["Sanctuary Vessel"],
      14: ["Limited Wish"]
    },
    "great-old-one": {
      1: ["Awakened Mind"],
      6: ["Entropic Ward"],
      10: ["Thought Shield"],
      14: ["Create Thrall"]
    },
    hexblade: {
      1: ["Expanded Spell List", "Hexblade's Curse", "Hex Warrior"],
      6: ["Accursed Specter"],
      10: ["Armor of Hexes"],
      14: ["Master of Hexes"]
    },
    undead: {
      1: ["Expanded Spell List", "Form of Dread"],
      6: ["Grave Touched"],
      10: ["Necrotic Husk"],
      14: ["Spirit Projection"]
    },
    undying: {
      1: ["Expanded Spell List", "Among the Dead"],
      6: ["Defy Death"],
      10: ["Undying Nature"],
      14: ["Indestructible Life"]
    }
  },
  wizard: {
    evocation: {
      2: ["Evocation Savant", "Sculpt Spells"],
      6: ["Potent Cantrip"],
      10: ["Empowered Evocation"],
      14: ["Overchannel"]
    },
    abjuration: {
      2: ["Abjuration Savant", "Arcane Ward"],
      6: ["Projected Ward"],
      10: ["Improved Abjuration"],
      14: ["Spell Resistance"]
    },
    bladesinging: {
      2: ["Training in War and Song", "Bladesong"],
      6: ["Extra Attack"],
      10: ["Song of Defense"],
      14: ["Song of Victory"]
    },
    chronurgy: {
      2: ["Chronal Shift", "Temporal Awareness"],
      6: ["Momentary Stasis"],
      10: ["Arcane Abeyance"],
      14: ["Convergent Future"]
    },
    conjuration: {
      2: ["Conjuration Savant", "Minor Conjuration"],
      6: ["Benign Transposition"],
      10: ["Focused Conjuration"],
      14: ["Durable Summons"]
    },
    divination: {
      2: ["Divination Savant", "Portent"],
      6: ["Expert Divination"],
      10: ["The Third Eye"],
      14: ["Greater Portent"]
    },
    enchantment: {
      2: ["Enchantment Savant", "Hypnotic Gaze"],
      6: ["Instinctive Charm"],
      10: ["Split Enchantment"],
      14: ["Alter Memories"]
    },
    graviturgy: {
      2: ["Adjust Density"],
      6: ["Gravity Well"],
      10: ["Violent Attraction"],
      14: ["Event Horizon"]
    },
    illusion: {
      2: ["Illusion Savant", "Improved Minor Illusion"],
      6: ["Malleable Illusions"],
      10: ["Illusory Self"],
      14: ["Illusory Reality"]
    },
    necromancy: {
      2: ["Necromancy Savant", "Grim Harvest"],
      6: ["Undead Thralls"],
      10: ["Inured to Undeath"],
      14: ["Command Undead"]
    },
    "order-of-scribes": {
      2: ["Wizardly Quill", "Awakened Spellbook"],
      6: ["Manifest Mind"],
      10: ["Master Scrivener"],
      14: ["One with the Word"]
    },
    transmutation: {
      2: ["Transmutation Savant", "Minor Alchemy"],
      6: ["Transmuter's Stone"],
      10: ["Shapechanger"],
      14: ["Master Transmuter"]
    },
    "war-magic": {
      2: ["Arcane Deflection", "Tactical Wit"],
      6: ["Power Surge"],
      10: ["Durable Magic"],
      14: ["Deflecting Shroud"]
    }
  }
});

const INLINE_CANTRIP_IDS = new Set([
  "thaumaturgy"
]);

const formatSpellReferenceName = (id) => (
  String(id || "")
    .split("-")
    .map((word) => (
      word
        ? `${word[0].toUpperCase()}${word.slice(1)}`
        : ""
    ))
    .join(" ")
);

const createSpellList = (
  values,
  options
) => {
  const unlockLevels = Object.keys(
    values
  ).map(Number);
  const halfCasterList =
    unlockLevels.some(
      (level) => level > 9
    );

  return Object.freeze(
    Object.fromEntries(
      Object.entries(values).map(
        ([unlockLevel, spellIds]) => {
          const numericUnlockLevel =
            Number(unlockLevel);
          const spellLevel =
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
              spellIds.map((id) =>
                Object.freeze({
                  id,
                  name:
                    formatSpellReferenceName(
                      id
                    ),
                  level:
                    INLINE_CANTRIP_IDS
                      .has(id)
                      ? 0
                      : spellLevel,
                  alwaysPrepared:
                    options
                      .alwaysPrepared,
                  countsAgainstPreparedLimit:
                    options
                      .countsAgainstPreparedLimit,
                  inlineFallback: true
                })
              )
            )
          ];
        }
      )
    )
  );
};

const preparedList = (values) =>
  createSpellList(values, {
    alwaysPrepared: true,
    countsAgainstPreparedLimit: false
  });

const expandedList = (values) =>
  createSpellList(values, {
    alwaysPrepared: false,
    countsAgainstPreparedLimit: true
  });

export const SUBCLASS_SPELL_CATALOG = Object.freeze({
  "cleric:arcana": preparedList({ 1: ["detect-magic", "magic-missile"], 3: ["magic-weapon", "magic-aura"], 5: ["dispel-magic", "magic-circle"], 7: ["arcane-eye", "secret-chest"], 9: ["planar-binding", "teleportation-circle"] }),
  "cleric:death": preparedList({ 1: ["false-life", "ray-of-sickness"], 3: ["blindness-deafness", "ray-of-enfeeblement"], 5: ["animate-dead", "vampiric-touch"], 7: ["blight", "death-ward"], 9: ["antilife-shell", "cloudkill"] }),
  "cleric:forge": preparedList({ 1: ["identify", "searing-smite"], 3: ["heat-metal", "magic-weapon"], 5: ["elemental-weapon", "protection-from-energy"], 7: ["fabricate", "wall-of-fire"], 9: ["animate-objects", "creation"] }),
  "cleric:grave": preparedList({ 1: ["bane", "false-life"], 3: ["gentle-repose", "ray-of-enfeeblement"], 5: ["revivify", "vampiric-touch"], 7: ["blight", "death-ward"], 9: ["antilife-shell", "raise-dead"] }),
  "cleric:knowledge": preparedList({ 1: ["command", "identify"], 3: ["augury", "suggestion"], 5: ["nondetection", "speak-with-dead"], 7: ["arcane-eye", "confusion"], 9: ["legend-lore", "scrying"] }),
  "cleric:life": preparedList({ 1: ["bless", "cure-wounds"], 3: ["lesser-restoration", "spiritual-weapon"], 5: ["beacon-of-hope", "revivify"], 7: ["death-ward", "guardian-of-faith"], 9: ["mass-cure-wounds", "raise-dead"] }),
  "cleric:light": preparedList({ 1: ["burning-hands", "faerie-fire"], 3: ["flaming-sphere", "scorching-ray"], 5: ["daylight", "fireball"], 7: ["guardian-of-faith", "wall-of-fire"], 9: ["flame-strike", "scrying"] }),
  "cleric:nature": preparedList({ 1: ["animal-friendship", "speak-with-animals"], 3: ["barkskin", "spike-growth"], 5: ["plant-growth", "wind-wall"], 7: ["dominate-beast", "grasping-vine"], 9: ["insect-plague", "tree-stride"] }),
  "cleric:order": preparedList({ 1: ["command", "heroism"], 3: ["hold-person", "zone-of-truth"], 5: ["mass-healing-word", "slow"], 7: ["compulsion", "locate-creature"], 9: ["commune", "dominate-person"] }),
  "cleric:peace": preparedList({ 1: ["heroism", "sanctuary"], 3: ["aid", "warding-bond"], 5: ["beacon-of-hope", "sending"], 7: ["aura-of-purity", "resilient-sphere"], 9: ["greater-restoration", "telepathic-bond"] }),
  "cleric:tempest": preparedList({ 1: ["fog-cloud", "thunderwave"], 3: ["gust-of-wind", "shatter"], 5: ["call-lightning", "sleet-storm"], 7: ["control-water", "ice-storm"], 9: ["destructive-wave", "insect-plague"] }),
  "cleric:trickery": preparedList({ 1: ["charm-person", "disguise-self"], 3: ["mirror-image", "pass-without-trace"], 5: ["blink", "dispel-magic"], 7: ["dimension-door", "polymorph"], 9: ["dominate-person", "modify-memory"] }),
  "cleric:twilight": preparedList({ 1: ["faerie-fire", "sleep"], 3: ["moonbeam", "see-invisibility"], 5: ["aura-of-vitality", "tiny-hut"], 7: ["aura-of-life", "greater-invisibility"], 9: ["circle-of-power", "mislead"] }),
  "cleric:war": preparedList({ 1: ["divine-favor", "shield-of-faith"], 3: ["magic-weapon", "spiritual-weapon"], 5: ["crusaders-mantle", "spirit-guardians"], 7: ["freedom-of-movement", "stoneskin"], 9: ["flame-strike", "hold-monster"] }),

  "paladin:ancients": preparedList({ 3: ["ensnaring-strike", "speak-with-animals"], 5: ["moonbeam", "misty-step"], 9: ["plant-growth", "protection-from-energy"], 13: ["ice-storm", "stoneskin"], 17: ["commune-with-nature", "tree-stride"] }),
  "paladin:conquest": preparedList({ 3: ["armor-of-agathys", "command"], 5: ["hold-person", "spiritual-weapon"], 9: ["bestow-curse", "fear"], 13: ["dominate-beast", "stoneskin"], 17: ["cloudkill", "dominate-person"] }),
  "paladin:crown": preparedList({ 3: ["command", "compelled-duel"], 5: ["warding-bond", "zone-of-truth"], 9: ["aura-of-vitality", "spirit-guardians"], 13: ["banishment", "guardian-of-faith"], 17: ["circle-of-power", "geas"] }),
  "paladin:devotion": preparedList({ 3: ["protection-from-evil-and-good", "sanctuary"], 5: ["lesser-restoration", "zone-of-truth"], 9: ["beacon-of-hope", "dispel-magic"], 13: ["freedom-of-movement", "guardian-of-faith"], 17: ["commune", "flame-strike"] }),
  "paladin:glory": preparedList({ 3: ["guiding-bolt", "heroism"], 5: ["enhance-ability", "magic-weapon"], 9: ["haste", "protection-from-energy"], 13: ["compulsion", "freedom-of-movement"], 17: ["commune", "flame-strike"] }),
  "paladin:oathbreaker": preparedList({ 3: ["hellish-rebuke", "inflict-wounds"], 5: ["crown-of-madness", "darkness"], 9: ["animate-dead", "bestow-curse"], 13: ["blight", "confusion"], 17: ["contagion", "dominate-person"] }),
  "paladin:redemption": preparedList({ 3: ["sanctuary", "sleep"], 5: ["calm-emotions", "hold-person"], 9: ["counterspell", "hypnotic-pattern"], 13: ["resilient-sphere", "stoneskin"], 17: ["hold-monster", "wall-of-force"] }),
  "paladin:vengeance": preparedList({ 3: ["bane", "hunters-mark"], 5: ["hold-person", "misty-step"], 9: ["haste", "protection-from-energy"], 13: ["banishment", "dimension-door"], 17: ["hold-monster", "scrying"] }),
  "paladin:watchers": preparedList({ 3: ["alarm", "detect-magic"], 5: ["moonbeam", "see-invisibility"], 9: ["counterspell", "nondetection"], 13: ["aura-of-purity", "banishment"], 17: ["hold-monster", "scrying"] }),

  "warlock:archfey": expandedList({ 1: ["faerie-fire", "sleep"], 3: ["calm-emotions", "phantasmal-force"], 5: ["blink", "plant-growth"], 7: ["dominate-beast", "greater-invisibility"], 9: ["dominate-person", "seeming"] }),
  "warlock:celestial": expandedList({ 1: ["cure-wounds", "guiding-bolt"], 3: ["flaming-sphere", "lesser-restoration"], 5: ["daylight", "revivify"], 7: ["guardian-of-faith", "wall-of-fire"], 9: ["flame-strike", "greater-restoration"] }),
  "warlock:fathomless": expandedList({ 1: ["create-or-destroy-water", "thunderwave"], 3: ["gust-of-wind", "silence"], 5: ["lightning-bolt", "sleet-storm"], 7: ["control-water", "summon-elemental"], 9: ["bigbys-hand", "cone-of-cold"] }),
  "warlock:fiend": expandedList({ 1: ["burning-hands", "command"], 3: ["blindness-deafness", "scorching-ray"], 5: ["fireball", "stinking-cloud"], 7: ["fire-shield", "wall-of-fire"], 9: ["flame-strike", "hallow"] }),
  "warlock:genie": expandedList({ 1: ["detect-evil-and-good", "sanctuary"], 3: ["phantasmal-force"], 5: ["create-food-and-water"], 7: ["phantasmal-killer"], 9: ["creation"] }),
  "warlock:great-old-one": expandedList({ 1: ["dissonant-whispers", "tashas-hideous-laughter"], 3: ["detect-thoughts", "phantasmal-force"], 5: ["clairvoyance", "sending"], 7: ["dominate-beast", "evards-black-tentacles"], 9: ["dominate-person", "telekinesis"] }),
  "warlock:hexblade": expandedList({ 1: ["shield", "wrathful-smite"], 3: ["blur", "branding-smite"], 5: ["blink", "elemental-weapon"], 7: ["phantasmal-killer", "staggering-smite"], 9: ["banishing-smite", "cone-of-cold"] }),
  "warlock:undead": expandedList({ 1: ["bane", "false-life"], 3: ["blindness-deafness", "phantasmal-force"], 5: ["phantom-steed", "speak-with-dead"], 7: ["death-ward", "greater-invisibility"], 9: ["antilife-shell", "cloudkill"] }),
  "warlock:undying": expandedList({ 1: ["false-life", "ray-of-sickness"], 3: ["blindness-deafness", "silence"], 5: ["feign-death", "speak-with-dead"], 7: ["aura-of-life", "death-ward"], 9: ["contagion", "legend-lore"] }),

  "ranger:drakewarden": preparedList({ 3: ["thaumaturgy"], 5: ["dragons-breath"], 9: ["fear"], 13: ["elemental-bane"], 17: ["summon-draconic-spirit"] }),
  "ranger:fey-wanderer": preparedList({ 3: ["charm-person"], 5: ["misty-step"], 9: ["dispel-magic"], 13: ["dimension-door"], 17: ["mislead"] }),
  "ranger:gloom-stalker": preparedList({ 3: ["disguise-self"], 5: ["rope-trick"], 9: ["fear"], 13: ["greater-invisibility"], 17: ["seeming"] }),
  "ranger:horizon-walker": preparedList({ 3: ["protection-from-evil-and-good"], 5: ["misty-step"], 9: ["haste"], 13: ["banishment"], 17: ["teleportation-circle"] }),
  "ranger:monster-slayer": preparedList({ 3: ["protection-from-evil-and-good"], 5: ["zone-of-truth"], 9: ["magic-circle"], 13: ["banishment"], 17: ["hold-monster"] }),
  "ranger:swarmkeeper": preparedList({ 3: ["faerie-fire"], 5: ["web"], 9: ["gaseous-form"], 13: ["arcane-eye"], 17: ["insect-plague"] }),

  "sorcerer:aberrant-mind": preparedList({ 1: ["arms-of-hadar", "dissonant-whispers"], 3: ["calm-emotions", "detect-thoughts"], 5: ["hunger-of-hadar", "sending"], 7: ["evards-black-tentacles", "summon-aberration"], 9: ["rarys-telepathic-bond", "telekinesis"] }),
  "sorcerer:clockwork-soul": preparedList({ 1: ["alarm", "protection-from-evil-and-good"], 3: ["aid", "lesser-restoration"], 5: ["dispel-magic", "protection-from-energy"], 7: ["freedom-of-movement", "summon-construct"], 9: ["greater-restoration", "wall-of-force"] }),
  "sorcerer:lunar-sorcery": preparedList({ 1: ["shield", "ray-of-sickness", "color-spray"], 3: ["lesser-restoration", "blindness-deafness", "alter-self"], 5: ["dispel-magic", "vampiric-touch", "phantom-steed"], 7: ["death-ward", "confusion", "hallucinatory-terrain"], 9: ["rarys-telepathic-bond", "hold-monster", "mislead"] })
});

export const SUBCLASS_CHOICE_CATALOG = Object.freeze({
  "barbarian:beast": [{ id: "beast-form", name: "Form of the Beast", featureName: "Form of the Beast", choose: 1, options: ["Bite", "Claws", "Tail"] }],
  "barbarian:storm-herald": [{ id: "storm-environment", name: "Storm Environment", featureName: "Storm Aura", choose: 1, options: ["Desert", "Sea", "Tundra"] }],
  "barbarian:totem-warrior": [{ id: "totem-animal", name: "Totem Animal", featureName: "Totem Spirit", choose: 1, options: ["Bear", "Eagle", "Elk", "Tiger", "Wolf"] }],
  "bard:swords": [{ id: "swords-fighting-style", name: "Fighting Style", featureName: "Fighting Style", choose: 1, options: ["Dueling", "Two-Weapon Fighting"] }],
  "cleric:arcana": [{ id: "arcane-cantrips", name: "Wizard Cantrips", featureName: "Arcane Initiate", choose: 2, optionsSource: "wizardCantrips" }],
  "druid:land": [{ id: "circle-land", name: "Circle Land", featureName: "Circle Spells", choose: 1, options: ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"] }],
  "fighter:arcane-archer": [{ id: "arcane-shot-options", name: "Arcane Shot Options", featureName: "Arcane Shot", choose: 2, options: ["Banishing Arrow", "Beguiling Arrow", "Bursting Arrow", "Enfeebling Arrow", "Grasping Arrow", "Piercing Arrow", "Seeking Arrow", "Shadow Arrow"] }],
  "fighter:battle-master": [{ id: "maneuvers", name: "Maneuvers", featureName: "Combat Superiority", choose: 3, optionsSource: "maneuvers" }],
  "fighter:rune-knight": [{ id: "runes-known", name: "Runes Known", featureName: "Rune Carver", choose: 2, options: ["Cloud Rune", "Fire Rune", "Frost Rune", "Hill Rune", "Stone Rune", "Storm Rune"] }],
  "monk:ascendant-dragon": [{ id: "draconic-damage", name: "Draconic Damage Type", featureName: "Draconic Disciple", choose: 1, options: ["Acid", "Cold", "Fire", "Lightning", "Poison"] }],
  "monk:four-elements": [{ id: "elemental-disciplines", name: "Elemental Disciplines", featureName: "Elemental Disciplines", choose: 2, options: ["Fangs of the Fire Snake", "Fist of Four Thunders", "Fist of Unbroken Air", "Rush of the Gale Spirits", "Shape the Flowing River", "Sweeping Cinder Strike", "Water Whip"] }],
  "monk:kensei": [{ id: "kensei-weapons", name: "Kensei Weapons", featureName: "Path of the Kensei", choose: 2, optionsSource: "eligibleWeapons" }],
  "ranger:beast-master": [{ id: "ranger-companion", name: "Ranger Companion", featureName: "Ranger's Companion", choose: 1, optionsSource: "eligibleBeastCompanions" }],
  "ranger:hunter": [
    { id: "hunters-prey", name: "Hunter's Prey", featureName: "Hunter's Prey", choose: 1, options: ["Colossus Slayer", "Giant Killer", "Horde Breaker"] },
    { id: "defensive-tactics", name: "Defensive Tactics", featureName: "Defensive Tactics", choose: 1, options: ["Escape the Horde", "Multiattack Defense", "Steel Will"] },
    { id: "multiattack", name: "Multiattack", featureName: "Multiattack", choose: 1, options: ["Volley", "Whirlwind Attack"] },
    { id: "superior-hunters-defense", name: "Superior Hunter's Defense", featureName: "Superior Hunter's Defense", choose: 1, options: ["Evasion", "Stand Against the Tide", "Uncanny Dodge"] }
  ],
  "sorcerer:draconic-bloodline": [{ id: "dragon-ancestor", name: "Dragon Ancestor", featureName: "Dragon Ancestor", choose: 1, options: ["Black", "Blue", "Brass", "Bronze", "Copper", "Gold", "Green", "Red", "Silver", "White"] }],
  "sorcerer:lunar-sorcery": [{ id: "lunar-phase", name: "Lunar Phase", featureName: "Lunar Embodiment", choose: 1, options: ["Full Moon", "New Moon", "Crescent Moon"] }],
  "warlock:genie": [{ id: "genie-kind", name: "Genie Kind", featureName: "Genie's Vessel", choose: 1, options: ["Dao", "Djinni", "Efreeti", "Marid"] }]
});

export const SUBCLASS_RESOURCE_CATALOG = Object.freeze({
  "bard:creation:mote-of-potential": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "bard:eloquence:unsettling-words": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "bard:glamour:mantle-of-inspiration": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "bard:spirits:tales-from-beyond": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "bard:swords:blade-flourish": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "bard:whispers:psychic-blades": { id: "bardic-inspiration", name: "Bardic Inspiration", usesAbility: "Charisma", recharge: "longRest" },
  "druid:dreams:balm-of-the-summer-court": { id: "balm-of-the-summer-court", name: "Balm of the Summer Court", scalesWith: "level", die: "d6", recharge: "longRest" },
  "fighter:arcane-archer:arcane-shot": { id: "arcane-shot", name: "Arcane Shot", uses: 2, recharge: "shortOrLongRest" },
  "fighter:battle-master:combat-superiority": { id: "superiority-dice", name: "Superiority Dice", uses: 4, dieByLevel: { 3: "d8", 10: "d10", 18: "d12" }, recharge: "shortOrLongRest" },
  "fighter:echo-knight:unleash-incarnation": { id: "unleash-incarnation", name: "Unleash Incarnation", usesAbility: "Constitution", recharge: "longRest" },
  "fighter:psi-warrior:psionic-power": { id: "psionic-energy-dice", name: "Psionic Energy Dice", uses: "twiceProficiencyBonus", dieByLevel: { 3: "d6", 5: "d8", 11: "d10", 17: "d12" }, recharge: "longRest" },
  "fighter:samurai:fighting-spirit": { id: "fighting-spirit", name: "Fighting Spirit", uses: 3, recharge: "longRest" },
  "monk:open-hand:wholeness-of-body": { id: "wholeness-of-body", name: "Wholeness of Body", uses: 1, recharge: "longRest" },
  "paladin:glory:glorious-defense": { id: "glorious-defense", name: "Glorious Defense", usesAbility: "Charisma", recharge: "longRest" },
  "rogue:phantom:wails-from-the-grave": { id: "wails-from-the-grave", name: "Wails from the Grave", uses: "proficiencyBonus", recharge: "longRest" },
  "rogue:soulknife:psionic-power": { id: "psionic-energy-dice", name: "Psionic Energy Dice", uses: "twiceProficiencyBonus", dieByLevel: { 3: "d6", 5: "d8", 11: "d10", 17: "d12" }, recharge: "longRest" },
  "sorcerer:wild-magic:tides-of-chaos": { id: "tides-of-chaos", name: "Tides of Chaos", uses: 1, recharge: "longRest" },
  "warlock:celestial:healing-light": { id: "healing-light", name: "Healing Light", perLevel: 1, die: "d6", recharge: "longRest" },
  "warlock:fathomless:tentacle-of-the-deeps": { id: "tentacle-of-the-deeps", name: "Tentacle of the Deeps", uses: "proficiencyBonus", recharge: "longRest" },
  "warlock:genie:limited-wish": { id: "limited-wish", name: "Limited Wish", uses: 1, recharge: "longRest" },
  "warlock:undead:form-of-dread": { id: "form-of-dread", name: "Form of Dread", uses: "proficiencyBonus", recharge: "longRest" },
  "wizard:divination:portent": { id: "portent-dice", name: "Portent Dice", usesByLevel: { 2: 2, 14: 3 }, recharge: "longRest" },
  "wizard:chronurgy:chronal-shift": { id: "chronal-shift", name: "Chronal Shift", uses: 2, recharge: "longRest" },
  "wizard:war-magic:power-surge": { id: "power-surges", name: "Power Surges", usesAbility: "Intelligence", recharge: "longRest" }
});

export const SUBCLASS_METADATA_CATALOG = Object.freeze({
  "fighter:eldritch-knight": {
    spellcastingProgression: "third-caster",
    spellcastingAbility: "int",
    spellPreparation: "known",
    spellListClassId: "wizard",
    cantripsKnown: { 3: 2, 10: 3 },
    spellsKnown: { 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 },
    spellSchoolRestrictions: {
      allowedSchools: ["abjuration", "evocation"],
      unrestrictedKnownSpellLevels: [3, 8, 14, 20]
    }
  },
  "rogue:arcane-trickster": {
    spellcastingProgression: "third-caster",
    spellcastingAbility: "int",
    spellPreparation: "known",
    spellListClassId: "wizard",
    cantripsKnown: { 3: 3, 10: 4 },
    spellsKnown: { 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 },
    spellSchoolRestrictions: {
      allowedSchools: ["enchantment", "illusion"],
      unrestrictedKnownSpellLevels: [3, 8, 14, 20],
      requiredCantripIds: ["mage-hand"]
    }
  },
  "sorcerer:divine-soul": {
    spellListClassIds: ["sorcerer", "cleric"]
  }
});

export const SRD_SUBCLASS_PRIORITY = Object.freeze({
  barbarian: "berserker",
  bard: "lore",
  cleric: "life",
  druid: "land",
  fighter: "champion",
  monk: "open-hand",
  paladin: "devotion",
  ranger: "hunter",
  rogue: "thief",
  sorcerer: "draconic-bloodline",
  warlock: "fiend",
  wizard: "evocation"
});
