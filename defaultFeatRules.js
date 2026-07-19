// Structured legacy feat rules used by the character creator. Descriptions are
// concise implementation summaries rather than reproduced rulebook text.

const ABILITIES = Object.freeze([
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma"
]);

const MENTAL_ABILITIES = Object.freeze([
  "Intelligence",
  "Wisdom",
  "Charisma"
]);

const DAMAGE_TYPES = Object.freeze([
  "Acid",
  "Cold",
  "Fire",
  "Lightning",
  "Thunder"
]);

const GIANT_STRIKES = Object.freeze([
  "Cloud Strike",
  "Fire Strike",
  "Frost Strike",
  "Hill Strike",
  "Stone Strike",
  "Storm Strike"
]);

const normalizeId = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const custom = (id, summary, extra = {}) => ({
  type: "custom",
  id,
  summary,
  ...extra
});

const abilityChoice = (
  id = "ability",
  options = ABILITIES,
  increase = 1
) => ({
  type: "abilityChoice",
  id,
  choose: 1,
  options: [...options],
  increase
});

const fixedAbility = (ability, value = 1) => ({
  type: "abilityIncrease",
  ability,
  value
});

const choice = (
  id,
  label,
  type,
  options = [],
  extra = {}
) => ({
  id,
  label,
  type,
  choose: 1,
  options: [...options],
  ...extra
});

const resource = (id, label, uses, recharge = "longRest", extra = {}) => ({
  type: "resource",
  id,
  label,
  uses,
  recharge,
  ...extra
});

const rule = (
  name,
  summary,
  description,
  config = {}
) => ({
  id: normalizeId(name),
  name,
  summary,
  description,
  source: "official-legacy",
  prerequisites: [],
  effects: [custom(normalizeId(name), summary)],
  choices: [],
  tags: [],
  repeatable: false,
  ...config
});

export const DEFAULT_FEAT_RULES = Object.freeze([
  rule(
    "Ability Score Improvement",
    "Increase one ability by 2, or two abilities by 1.",
    "Choose how to distribute two ability-score increases. No score can be raised above 20 by this feat.",
    {
      effects: [{ type: "abilityScoreImprovement", points: 2, maximum: 20, choiceIds: ["ability-score-one", "ability-score-two"] }],
      choices: [
        choice("ability-score-one", "First ability increase", "ability", ABILITIES),
        choice("ability-score-two", "Second ability increase", "ability", ABILITIES)
      ],
      repeatable: true,
      tags: ["ability-scores"]
    }
  ),
  rule(
    "Aberrant Dragonmark",
    "Gain a Constitution-based cantrip, a 1st-level spell, and a risky surge of vitality or power.",
    "Increase Constitution by 1, learn one sorcerer cantrip and one 1st-level sorcerer spell, and cast the spell once per short or long rest through the mark.",
    {
      prerequisites: [{ type: "setting", setting: "Eberron" }],
      effects: [fixedAbility("Constitution"), { type: "spellChoice", classId: "sorcerer", cantrips: 1, levelOneSpells: 1, ability: "Constitution" }, resource("aberrant-spell", "Aberrant spell", 1, "shortOrLongRest"), custom("aberrant-vitality", "When the marked spell is cast, an optional Hit Die can produce temporary hit points or force damage.")],
      choices: [choice("cantrip", "Sorcerer cantrip", "spell", [], { classId: "sorcerer", levels: [0] }), choice("level-one-spell", "1st-level sorcerer spell", "spell", [], { classId: "sorcerer", levels: [1] })],
      tags: ["half-feat", "spellcasting", "dragonmark"]
    }
  ),
  rule(
    "Actor",
    "Improve Charisma and become exceptionally convincing at impersonation.",
    "Increase Charisma by 1. Gain advantage when passing as another person and accurately mimic voices and sounds after studying them.",
    { effects: [fixedAbility("Charisma"), custom("actor-impersonation", "Advantage on Deception and Performance checks made to impersonate another person."), custom("actor-mimicry", "Mimic a studied voice or sound; Insight contests the performance.")], tags: ["half-feat", "social"] }
  ),
  rule(
    "Adept of the Black Robes",
    "Deepen Nuitari magic and trade vitality to intensify a damaging spell.",
    "Learn a 2nd-level enchantment or necromancy spell and cast it once per long rest. Hit Dice can be spent to add damage to a spell.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "initiate-of-high-sorcery", choiceId: "moon", values: ["Nuitari"] }],
      effects: [{ type: "spellChoice", schools: ["enchantment", "necromancy"], levels: [2], count: 1 }, resource("black-robe-spell", "Black Robe spell", 1), custom("life-channel", "Spend Hit Dice after rolling spell damage to add the rolls to one target's damage.")],
      choices: [choice("robe-spell", "2nd-level enchantment or necromancy spell", "spell", [], { levels: [2], schools: ["enchantment", "necromancy"] })],
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Adept of the Red Robes",
    "Deepen Lunitari magic and replace a poor attack or save roll with a balanced result.",
    "Learn a 2nd-level illusion or transmutation spell and cast it once per long rest. A limited reaction can treat a d20 roll of 9 or lower as a 10.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "initiate-of-high-sorcery", choiceId: "moon", values: ["Lunitari"] }],
      effects: [{ type: "spellChoice", schools: ["illusion", "transmutation"], levels: [2], count: 1 }, resource("red-robe-spell", "Red Robe spell", 1), resource("balance-of-precision", "Balance of Precision", "proficiencyBonus"), custom("balance-of-precision-rule", "Reaction after an attack or save roll of 9 or lower changes the d20 result to 10.")],
      choices: [choice("robe-spell", "2nd-level illusion or transmutation spell", "spell", [], { levels: [2], schools: ["illusion", "transmutation"] })],
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Adept of the White Robes",
    "Deepen Solinari magic and protect an ally by spending magical power.",
    "Learn a 2nd-level abjuration or divination spell and cast it once per long rest. A reaction can spend a spell slot to reduce damage to a nearby creature.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "initiate-of-high-sorcery", choiceId: "moon", values: ["Solinari"] }],
      effects: [{ type: "spellChoice", schools: ["abjuration", "divination"], levels: [2], count: 1 }, resource("white-robe-spell", "White Robe spell", 1), custom("protective-ward", "Reaction spends a spell slot and reduces nearby damage by 1d6 per slot level plus the spellcasting modifier.")],
      choices: [choice("robe-spell", "2nd-level abjuration or divination spell", "spell", [], { levels: [2], schools: ["abjuration", "divination"] })],
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Alert",
    "Gain +5 initiative and remain difficult to surprise or ambush.",
    "Add 5 to initiative. While conscious, surprise and unseen attackers do not gain their usual edge against you.",
    { effects: [{ type: "initiativeBonus", value: 5 }, custom("alert-awareness", "Cannot be surprised while conscious and unseen attackers do not gain advantage solely for being unseen.")], tags: ["initiative", "combat"] }
  ),
  rule(
    "Artificer Initiate",
    "Learn a cantrip, a 1st-level artificer spell, and one artisan's tool.",
    "Use Intelligence for the chosen artificer spells, cast the 1st-level spell once per long rest, and use an artisan's tool as a spellcasting focus.",
    {
      effects: [{ type: "spellChoice", classId: "artificer", cantrips: 1, levelOneSpells: 1, ability: "Intelligence" }, { type: "proficiencyChoice", choose: 1, categories: ["artisanTool"] }, resource("artificer-initiate-spell", "Artificer Initiate spell", 1)],
      choices: [choice("cantrip", "Artificer cantrip", "spell", [], { classId: "artificer", levels: [0] }), choice("level-one-spell", "1st-level artificer spell", "spell", [], { classId: "artificer", levels: [1] }), choice("artisan-tool", "Artisan's tool", "tool", [], { category: "artisan" })],
      tags: ["spellcasting", "tool"]
    }
  ),
  rule(
    "Athlete",
    "Improve Strength or Dexterity and move, climb, and jump more efficiently.",
    "Increase Strength or Dexterity by 1. Standing costs little movement, climbing no longer costs extra movement, and running jumps need less approach.",
    {
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), custom("athlete-movement", "Standing uses 5 feet, climbing costs no extra movement, and running jumps need only a 5-foot approach.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "movement"]
    }
  ),
  rule(
    "Baleful Scion",
    "Increase a mental ability and turn successful attacks into necrotic harm and healing.",
    "Increase Intelligence, Wisdom, or Charisma by 1. A limited-use rider adds necrotic damage to an attack and restores the same amount of hit points.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["scion-of-the-outer-planes"] }],
      effects: [abilityChoice("ability", MENTAL_ABILITIES), resource("baleful-strike", "Baleful strike", "proficiencyBonus"), custom("baleful-strike-rule", "After a hit, deal 1d6 + proficiency bonus necrotic damage and regain that many hit points.")],
      choices: [choice("ability", "Ability increase", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "planescape", "healing", "damage"]
    }
  ),
  rule(
    "Bountiful Luck",
    "Let a nearby ally reroll a natural 1 by sharing halfling luck.",
    "When a nearby ally rolls a 1 on an attack, check, or save, use a reaction to let that ally reroll; your own Lucky trait pauses until your next turn.",
    { prerequisites: [{ type: "species", speciesIds: ["halfling"] }], effects: [custom("bountiful-luck-reaction", "Reaction lets a nearby ally reroll a natural 1; personal halfling luck is unavailable until the next turn.")], tags: ["species", "reaction", "support"] }
  ),
  rule(
    "Cartomancer",
    "Use playing cards as a focus and hide one prepared spell in a card each day.",
    "Gain prestidigitation and use cards as a spellcasting focus. After a long rest, store one spell from your class list in a card for a bonus-action casting.",
    { prerequisites: [{ type: "level", minimum: 4 }, { type: "spellcasting" }], effects: [{ type: "spellGrant", spellId: "prestidigitation" }, resource("hidden-ace", "Hidden Ace", 1), custom("hidden-ace-rule", "Store one prepared spell with a casting time of one action; cast it from the card as a bonus action before the next long rest.")], tags: ["spellcasting", "focus"] }
  ),
  rule(
    "Charger",
    "Dash into a forceful bonus-action attack or shove.",
    "After using the Dash action, make one melee weapon attack or shove as a bonus action; moving straight toward the target improves its damage or push.",
    { effects: [custom("charger-attack", "After Dash, bonus action melee attack gains +5 damage after a 10-foot straight approach, or shove pushes 10 feet.")], tags: ["combat", "movement", "bonus-action"] }
  ),
  rule(
    "Chef",
    "Improve Constitution or Wisdom and prepare restorative meals and treats.",
    "Increase Constitution or Wisdom by 1, add extra healing during short rests, and prepare proficiency-bonus treats that grant temporary hit points.",
    {
      effects: [abilityChoice("ability", ["Constitution", "Wisdom"]), { type: "proficiency", category: "tools", value: "Cook's utensils" }, custom("restorative-meal", "Creatures spending Hit Dice during a short rest regain an extra 1d8 hit points."), resource("chef-treats", "Special treats", "proficiencyBonus", "longRest", { durationHours: 8, temporaryHitPoints: "proficiencyBonus" })],
      choices: [choice("ability", "Ability increase", "ability", ["Constitution", "Wisdom"])],
      tags: ["half-feat", "healing", "tool"]
    }
  ),
  rule(
    "Cohort of Chaos",
    "Increase a mental ability and trigger a random chaotic benefit after rolling with advantage or disadvantage.",
    "Increase Intelligence, Wisdom, or Charisma by 1. A natural 1 or 20 on an advantaged or disadvantaged d20 roll can unleash one of four short-lived chaos effects.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["scion-of-the-outer-planes"] }],
      effects: [abilityChoice("ability", MENTAL_ABILITIES), resource("cohort-chaos", "Cohort of Chaos", 1, "longRest"), custom("cohort-chaos-table", "On a natural 1 or 20 rolled with advantage or disadvantage, roll the chaos benefit and regain the trigger after a long rest.")],
      choices: [choice("ability", "Ability increase", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "planescape", "random"]
    }
  ),
  rule(
    "Crossbow Expert",
    "Ignore crossbow loading, fight at close range, and make a hand-crossbow bonus attack.",
    "Ignore Loading for proficient crossbows, avoid close-range disadvantage with ranged attacks, and make a hand-crossbow attack as a bonus action after a one-handed attack.",
    { effects: [custom("crossbow-loading", "Ignore the Loading property of proficient crossbows."), custom("close-range-ranged", "Being within 5 feet of a hostile creature does not impose disadvantage on ranged attacks."), custom("hand-crossbow-bonus-attack", "After attacking with a one-handed weapon, make a hand-crossbow attack as a bonus action.")], tags: ["combat", "ranged", "weapon"] }
  ),
  rule(
    "Crusher",
    "Improve Strength or Constitution and control enemies with bludgeoning attacks.",
    "Increase Strength or Constitution by 1. Once per turn move a creature hit by bludgeoning damage, and critical bludgeoning hits expose it to allied attacks.",
    {
      effects: [abilityChoice("ability", ["Strength", "Constitution"]), custom("crusher-move", "Once per turn, a bludgeoning hit can move a target no more than one size larger by 5 feet."), custom("crusher-critical", "A critical bludgeoning hit grants advantage on attacks against the target until your next turn.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution"])],
      tags: ["half-feat", "combat", "bludgeoning"]
    }
  ),
  rule(
    "Defensive Duelist",
    "Use a reaction and a finesse weapon to add proficiency bonus to AC against one attack.",
    "While wielding a finesse weapon, use a reaction when hit by a melee attack to add proficiency bonus to AC for that attack.",
    { prerequisites: [{ type: "abilityMinimum", ability: "dex", minimum: 13 }], effects: [custom("defensive-duelist-reaction", "Reaction adds proficiency bonus to AC against the triggering melee attack while wielding a finesse weapon.")], tags: ["combat", "reaction", "armor-class"] }
  ),
  rule(
    "Divinely Favored",
    "Learn divine magic shaped by your alignment and use a holy symbol as a focus.",
    "Learn one cleric cantrip, augury, and one 1st-level spell determined by alignment. Cast each leveled spell once per long rest and choose its mental casting ability.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "setting", setting: "Dragonlance" }],
      effects: [{ type: "spellChoice", cantrips: 1, levelOneSpells: 1, grantedSpells: ["augury"] }, resource("divinely-favored-augury", "Augury", 1), resource("divinely-favored-spell", "Divinely Favored spell", 1)],
      choices: [choice("spellcasting-ability", "Spellcasting ability", "ability", MENTAL_ABILITIES), choice("cleric-cantrip", "Cleric cantrip", "spell", [], { classId: "cleric", levels: [0] }), choice("alignment-spell", "Alignment spell", "spell", [], { levels: [1], alignmentFiltered: true })],
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Dragon Fear",
    "Improve a physical ability and replace a breath attack with a frightening roar.",
    "Increase Strength, Constitution, or Charisma by 1. Expend a breath-weapon use to frighten nearby creatures that fail a Wisdom save.",
    {
      prerequisites: [{ type: "species", speciesIds: ["dragonborn"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Charisma"]), custom("dragon-fear-roar", "Spend a Breath Weapon use to force chosen creatures within 30 feet to make a Wisdom save or become frightened for up to 1 minute.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Charisma"])],
      tags: ["half-feat", "species", "fear"]
    }
  ),
  rule(
    "Dragon Hide",
    "Improve a physical ability and gain claws and protective scales.",
    "Increase Strength, Constitution, or Charisma by 1. Grow natural claw weapons and gain a 13 + Dexterity unarmored AC calculation.",
    {
      prerequisites: [{ type: "species", speciesIds: ["dragonborn"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Charisma"]), { type: "naturalWeapon", id: "dragon-claws", damage: "1d4", damageType: "slashing" }, { type: "unarmoredArmorClass", id: "dragon-hide", base: 13, ability: "Dexterity" }],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Charisma"])],
      tags: ["half-feat", "species", "armor-class", "natural-weapon"]
    }
  ),
  rule(
    "Drow High Magic",
    "Gain at-will detect magic plus levitate and dispel magic once per long rest.",
    "Use Charisma to cast detect magic at will and cast levitate and dispel magic once each per long rest.",
    { prerequisites: [{ type: "species", speciesIds: ["elf"], subraceIds: ["drow", "dark-elf"] }], effects: [{ type: "spellGrant", spellId: "detect-magic", atWill: true, ability: "Charisma" }, { type: "spellGrant", spellId: "levitate", uses: 1, recharge: "longRest", ability: "Charisma" }, { type: "spellGrant", spellId: "dispel-magic", uses: 1, recharge: "longRest", ability: "Charisma" }], tags: ["species", "spellcasting"] }
  ),
  rule(
    "Dual Wielder",
    "Fight effectively with two non-light weapons and gain AC while wielding both.",
    "Gain +1 AC while holding separate melee weapons, use two-weapon fighting with non-light one-handed weapons, and draw or stow two weapons together.",
    { effects: [{ type: "armorClassBonus", value: 1, condition: "dual-wielding-melee-weapons" }, custom("dual-wielder-weapons", "Two-weapon fighting no longer requires light one-handed melee weapons."), custom("dual-draw-stow", "Draw or stow two one-handed weapons when normally able to handle one.")], tags: ["combat", "armor-class", "two-weapon"] }
  ),
  rule(
    "Dungeon Delver",
    "Find secret doors and resist the danger of traps.",
    "Gain advantage to find hidden doors and resist traps, plus resistance to trap damage; moving quickly does not impose the normal passive-perception penalty for hidden threats.",
    { effects: [custom("dungeon-delver-search", "Advantage on Perception and Investigation checks to detect secret doors."), custom("dungeon-delver-traps", "Advantage on saves against traps and resistance to trap damage."), custom("dungeon-delver-travel", "Fast travel does not impose the normal passive Perception penalty for hidden threats.")], tags: ["exploration", "resistance"] }
  ),
  rule(
    "Durable",
    "Improve Constitution and make Hit Dice more reliable during short rests.",
    "Increase Constitution by 1. When spending a Hit Die, the minimum hit points regained from the die is twice your Constitution modifier.",
    { effects: [fixedAbility("Constitution"), custom("durable-hit-dice", "Each Hit Die spent restores at least twice the Constitution modifier from the die, before other bonuses.")], tags: ["half-feat", "healing", "hit-dice"] }
  ),
  rule(
    "Dwarven Fortitude",
    "Improve Constitution and spend a Hit Die when taking the Dodge action.",
    "Increase Constitution by 1. Whenever you Dodge in combat, spend one Hit Die to heal the die roll plus Constitution modifier.",
    { prerequisites: [{ type: "species", speciesIds: ["dwarf"] }], effects: [fixedAbility("Constitution"), custom("dwarven-fortitude-dodge", "When taking Dodge, optionally spend one Hit Die and regain the roll plus Constitution modifier hit points.")], tags: ["half-feat", "species", "healing", "hit-dice"] }
  ),
  rule(
    "Eldritch Adept",
    "Learn one eligible Eldritch Invocation and exchange it when gaining a level.",
    "Choose an invocation whose prerequisites you meet. A prerequisite-bearing invocation normally also requires warlock levels, and the choice can change on level-up.",
    {
      prerequisites: [{ type: "spellcastingOrPactMagic" }],
      effects: [{ type: "featureChoice", featureType: "eldritchInvocation", count: 1 }],
      choices: [choice("invocation", "Eldritch Invocation", "feature", [], { source: "eldritch-invocations" })],
      tags: ["spellcasting", "warlock"]
    }
  ),
  rule(
    "Elemental Adept",
    "Specialize in one elemental damage type, bypassing resistance and poor damage rolls.",
    "Choose acid, cold, fire, lightning, or thunder. Your spells ignore resistance to that type and treat damage die results of 1 as 2.",
    {
      prerequisites: [{ type: "spellcasting" }],
      effects: [{ type: "elementalAdept", choiceId: "damage-type", ignoreResistance: true, minimumDamageDie: 2 }],
      choices: [choice("damage-type", "Elemental damage type", "damageType", DAMAGE_TYPES)],
      repeatable: true,
      repeatByChoice: true,
      tags: ["spellcasting", "damage"]
    }
  ),
  rule(
    "Elven Accuracy",
    "Improve a graceful or mental ability and sharpen advantage into a three-die roll.",
    "Increase Dexterity, Intelligence, Wisdom, or Charisma by 1. When attacking with advantage using one of those abilities, reroll one attack die once.",
    {
      prerequisites: [{ type: "species", speciesIds: ["elf", "half-elf"] }],
      effects: [abilityChoice("ability", ["Dexterity", "Intelligence", "Wisdom", "Charisma"]), custom("elven-accuracy-roll", "With advantage on an attack using Dexterity, Intelligence, Wisdom, or Charisma, reroll one of the attack dice once.")],
      choices: [choice("ability", "Ability increase", "ability", ["Dexterity", "Intelligence", "Wisdom", "Charisma"])],
      tags: ["half-feat", "species", "combat"]
    }
  ),
  rule(
    "Ember of the Fire Giant",
    "Increase a physical ability, gain fire resistance, and create an explosive fiery burst.",
    "Increase Strength, Constitution, or Wisdom by 1, gain fire resistance, and use a limited replacement attack to damage and blind nearby creatures.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Fire Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Wisdom"]), { type: "damageResistance", damageType: "fire" }, resource("searing-ignition", "Searing Ignition", "proficiencyBonus"), custom("searing-ignition-rule", "Replace one Attack action attack with a 15-foot fire burst that damages and can blind on a failed Dexterity save.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Wisdom"])],
      tags: ["half-feat", "giant", "fire", "resistance"]
    }
  ),
  rule(
    "Fade Away",
    "Improve Dexterity or Intelligence and turn invisible after taking damage.",
    "Increase Dexterity or Intelligence by 1. After taking damage, use a reaction to become invisible until after your next attack, spell, damage roll, or the end of your next turn.",
    {
      prerequisites: [{ type: "species", speciesIds: ["gnome"] }],
      effects: [abilityChoice("ability", ["Dexterity", "Intelligence"]), resource("fade-away", "Fade Away", 1, "shortOrLongRest"), custom("fade-away-rule", "Reaction after taking damage grants temporary invisibility until an offensive action or the end of the next turn.")],
      choices: [choice("ability", "Ability increase", "ability", ["Dexterity", "Intelligence"])],
      tags: ["half-feat", "species", "reaction"]
    }
  ),
  rule(
    "Fey Teleportation",
    "Improve Intelligence or Charisma, learn Sylvan, and gain a renewable misty step.",
    "Increase Intelligence or Charisma by 1, learn Sylvan, and cast misty step once per short or long rest using the chosen ability.",
    {
      prerequisites: [{ type: "species", speciesIds: ["elf"], subraceIds: ["high-elf"] }],
      effects: [abilityChoice("ability", ["Intelligence", "Charisma"]), { type: "languageProficiency", language: "Sylvan" }, { type: "spellGrant", spellId: "misty-step", uses: 1, recharge: "shortOrLongRest", abilityChoiceId: "ability" }],
      choices: [choice("ability", "Ability increase and spellcasting ability", "ability", ["Intelligence", "Charisma"])],
      tags: ["half-feat", "species", "spellcasting", "language"]
    }
  ),
  rule(
    "Fey Touched",
    "Improve a mental ability and learn misty step plus one 1st-level divination or enchantment spell.",
    "Increase Intelligence, Wisdom, or Charisma by 1. Cast each learned spell once per long rest or with available slots, using the chosen ability.",
    {
      effects: [abilityChoice("ability", MENTAL_ABILITIES), { type: "spellGrant", spellId: "misty-step", uses: 1, recharge: "longRest", abilityChoiceId: "ability" }, { type: "spellChoice", levels: [1], schools: ["divination", "enchantment"], count: 1, abilityChoiceId: "ability" }],
      choices: [choice("ability", "Ability increase and spellcasting ability", "ability", MENTAL_ABILITIES), choice("level-one-spell", "1st-level divination or enchantment spell", "spell", [], { levels: [1], schools: ["divination", "enchantment"] })],
      tags: ["half-feat", "spellcasting", "teleportation"]
    }
  ),
  rule(
    "Fighting Initiate",
    "Learn one fighter Fighting Style and exchange it at later ASI levels.",
    "Choose a Fighting Style available to fighters. You must qualify for the style and can replace it whenever you reach a level that grants an ASI.",
    {
      prerequisites: [{ type: "weaponProficiency", category: "martial" }],
      effects: [{ type: "featureChoice", featureType: "fightingStyle", count: 1 }],
      choices: [choice("fighting-style", "Fighting Style", "feature", ["Archery", "Blind Fighting", "Defense", "Dueling", "Great Weapon Fighting", "Interception", "Protection", "Superior Technique", "Thrown Weapon Fighting", "Two-Weapon Fighting", "Unarmed Fighting"])],
      tags: ["combat", "fighting-style"]
    }
  ),
  rule(
    "Flames of Phlegethos",
    "Improve Intelligence or Charisma and make fire spells more dangerous and protective.",
    "Increase Intelligence or Charisma by 1. Reroll fire-spell damage dice showing 1, and fire spells can surround you in retaliatory flame until your next turn.",
    {
      prerequisites: [{ type: "species", speciesIds: ["tiefling"] }],
      effects: [abilityChoice("ability", ["Intelligence", "Charisma"]), custom("flames-reroll", "Reroll any result of 1 on fire damage dice from a spell once per die."), custom("flames-aura", "After casting a fire-damage spell, optional flames shed light and deal 1d4 fire to adjacent melee attackers until next turn.")],
      choices: [choice("ability", "Ability increase", "ability", ["Intelligence", "Charisma"])],
      tags: ["half-feat", "species", "spellcasting", "fire"]
    }
  ),
  rule(
    "Fury of the Frost Giant",
    "Increase Strength, Constitution, or Wisdom, resist cold, and retaliate with chilling force.",
    "Increase a listed ability by 1, gain cold resistance, and use a limited reaction after being hit to damage and slow the attacker.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Frost Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Wisdom"]), { type: "damageResistance", damageType: "cold" }, resource("frigid-retaliation", "Frigid Retaliation", "proficiencyBonus"), custom("frigid-retaliation-rule", "Reaction after a hit deals cold damage and can reduce the attacker's speed to 0 on a failed Constitution save.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Wisdom"])],
      tags: ["half-feat", "giant", "cold", "resistance"]
    }
  ),
  rule(
    "Gift of the Chromatic Dragon",
    "Imbue a weapon with elemental damage and react for temporary elemental resistance.",
    "Once per long rest, grant a weapon 1d4 acid, cold, fire, lightning, or poison damage for 1 minute. A proficiency-limited reaction grants resistance to one elemental hit.",
    { effects: [resource("chromatic-infusion", "Chromatic Infusion", 1), resource("reactive-resistance", "Reactive Resistance", "proficiencyBonus"), custom("chromatic-infusion-rule", "Bonus action imbues a simple or martial weapon with a chosen elemental damage type for 1 minute."), custom("reactive-resistance-rule", "Reaction grants resistance to acid, cold, fire, lightning, or poison damage from the triggering instance.")], choices: [choice("infusion-damage-type", "Infusion damage type", "damageType", ["Acid", "Cold", "Fire", "Lightning", "Poison"])], tags: ["dragon", "weapon", "resistance"] }
  ),
  rule(
    "Gift of the Gem Dragon",
    "Improve a mental ability and repel a nearby attacker with telekinetic force.",
    "Increase Intelligence, Wisdom, or Charisma by 1. A proficiency-limited reaction after taking nearby damage can push the attacker and deal force damage.",
    {
      effects: [abilityChoice("ability", MENTAL_ABILITIES), resource("telekinetic-reprisal", "Telekinetic Reprisal", "proficiencyBonus"), custom("telekinetic-reprisal-rule", "Reaction after nearby damage deals 2d8 force and pushes the attacker 10 feet on a failed Strength save.")],
      choices: [choice("ability", "Ability increase and save ability", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "dragon", "reaction", "force"]
    }
  ),
  rule(
    "Gift of the Metallic Dragon",
    "Learn cure wounds and manifest protective spectral wings.",
    "Cast cure wounds once per long rest or with spell slots using a chosen mental ability. A proficiency-limited reaction adds proficiency bonus to AC against one attack.",
    {
      effects: [{ type: "spellGrant", spellId: "cure-wounds", uses: 1, recharge: "longRest", abilityChoiceId: "spellcasting-ability" }, resource("protective-wings", "Protective Wings", "proficiencyBonus"), custom("protective-wings-rule", "Reaction adds proficiency bonus to your or a nearby creature's AC against the triggering attack.")],
      choices: [choice("spellcasting-ability", "Spellcasting ability", "ability", MENTAL_ABILITIES)],
      tags: ["dragon", "spellcasting", "healing", "armor-class"]
    }
  ),
  rule(
    "Grappler",
    "Gain advantage against creatures you grapple and attempt to restrain them.",
    "Attacks against a creature you grapple have advantage. Use an action to contest a second grapple that restrains both you and the target.",
    { prerequisites: [{ type: "abilityMinimum", ability: "str", minimum: 13 }], effects: [custom("grappler-advantage", "Advantage on attack rolls against creatures you are grappling."), custom("grappler-pin", "Action makes another grapple contest; success restrains both grappler and target until the grapple ends.")], tags: ["combat", "grapple"] }
  ),
  rule(
    "Great Weapon Master",
    "Gain a bonus attack after a critical hit or takedown and trade accuracy for heavy-weapon damage.",
    "A melee critical hit or reduction to 0 hit points can trigger one bonus-action melee attack. Before a proficient heavy-weapon attack, take -5 to hit for +10 damage.",
    { effects: [custom("great-weapon-master-bonus-attack", "Critical melee hits and melee takedowns can grant one bonus-action melee attack."), custom("great-weapon-master-power-attack", "Before a proficient heavy melee attack, choose -5 to hit and +10 damage.")], tags: ["combat", "weapon", "heavy"] }
  ),
  rule(
    "Guile of the Cloud Giant",
    "Increase a physical ability and vanish from danger through a reactive teleport.",
    "Increase Strength, Constitution, or Charisma by 1. A proficiency-limited reaction after being hit grants resistance to the damage and teleports you.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Cloud Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Charisma"]), resource("cloudy-escape", "Cloudy Escape", "proficiencyBonus"), custom("cloudy-escape-rule", "Reaction after damage grants resistance to that damage and teleports up to 30 feet to a visible space.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Charisma"])],
      tags: ["half-feat", "giant", "reaction", "teleportation"]
    }
  ),
  rule(
    "Gunner",
    "Improve Dexterity and become proficient and effective with firearms at close range.",
    "Increase Dexterity by 1, gain firearm proficiency, ignore firearm Loading, and avoid close-range disadvantage on ranged attacks.",
    { effects: [fixedAbility("Dexterity"), { type: "weaponProficiency", values: ["Firearms"] }, custom("gunner-loading", "Ignore the Loading property of firearms."), custom("gunner-close-range", "Being within 5 feet of a hostile creature does not impose disadvantage on ranged attacks.")], tags: ["half-feat", "combat", "ranged", "firearm"] }
  ),
  rule(
    "Healer",
    "Use a healer's kit to stabilize more effectively and restore hit points.",
    "A healer's kit can stabilize a creature and restore 1 hit point, or restore a larger amount once per creature between rests.",
    { effects: [custom("healer-stabilize", "Using a healer's kit to stabilize also restores 1 hit point."), custom("healer-kit-healing", "Action and one kit use restore 1d6 + 4 + target Hit Dice maximum; each target benefits once per short or long rest.")], tags: ["healing", "item"] }
  ),
  rule(
    "Heavily Armored",
    "Improve Strength and gain heavy armor proficiency.",
    "Increase Strength by 1 and gain proficiency with heavy armor.",
    { prerequisites: [{ type: "armorProficiency", category: "medium" }], effects: [fixedAbility("Strength"), { type: "armorProficiency", values: ["Heavy Armor"] }], tags: ["half-feat", "armor", "proficiency"] }
  ),
  rule(
    "Heavy Armor Master",
    "Improve Strength and reduce mundane physical damage while wearing heavy armor.",
    "Increase Strength by 1. While wearing heavy armor, reduce nonmagical bludgeoning, piercing, and slashing damage by 3.",
    { prerequisites: [{ type: "armorProficiency", category: "heavy" }], effects: [fixedAbility("Strength"), { type: "damageReduction", value: 3, damageTypes: ["bludgeoning", "piercing", "slashing"], condition: "wearing-heavy-armor-and-nonmagical" }], tags: ["half-feat", "armor", "damage-reduction"] }
  ),
  rule(
    "Infernal Constitution",
    "Improve Constitution and gain resilience to cold and poison.",
    "Increase Constitution by 1, gain resistance to cold and poison damage, and gain advantage on saves against poison.",
    { prerequisites: [{ type: "species", speciesIds: ["tiefling"] }], effects: [fixedAbility("Constitution"), { type: "damageResistance", damageTypes: ["cold", "poison"] }, custom("infernal-poison-saves", "Advantage on saving throws against being poisoned.")], tags: ["half-feat", "species", "resistance"] }
  ),
  rule(
    "Initiate of High Sorcery",
    "Choose a moon of magic and learn one wizard cantrip plus two aligned 1st-level spells.",
    "Choose Solinari, Lunitari, or Nuitari, a mental casting ability, one wizard cantrip, and two 1st-level spells from that moon's schools. Each leveled spell is cast once per long rest.",
    {
      prerequisites: [{ type: "classOrBackground", classIds: ["sorcerer", "wizard"], backgroundIds: ["mage-of-high-sorcery"] }, { type: "setting", setting: "Dragonlance" }],
      effects: [{ type: "spellChoice", classId: "wizard", cantrips: 1, levelOneSpells: 2 }, resource("high-sorcery-spells", "High Sorcery spells", 2)],
      choices: [choice("moon", "Moon of magic", "option", ["Solinari", "Lunitari", "Nuitari"]), choice("spellcasting-ability", "Spellcasting ability", "ability", MENTAL_ABILITIES), choice("cantrip", "Wizard cantrip", "spell", [], { classId: "wizard", levels: [0] }), choice("moon-spells", "Moon-aligned 1st-level spells", "spell", [], { levels: [1], choose: 2, moonChoiceId: "moon" })],
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Inspiring Leader",
    "Bolster companions with a ten-minute speech and temporary hit points.",
    "After ten minutes, up to six friendly creatures gain temporary hit points equal to your level plus Charisma modifier, once per rest.",
    { prerequisites: [{ type: "abilityMinimum", ability: "cha", minimum: 13 }], effects: [custom("inspiring-speech", "After 10 minutes, up to six allies gain temporary hit points equal to character level + Charisma modifier; a creature benefits once per rest.")], tags: ["support", "temporary-hit-points"] }
  ),
  rule(
    "Keen Mind",
    "Improve Intelligence and gain precise memory, direction, and time sense.",
    "Increase Intelligence by 1, know north and the time until the next sunrise or sunset, and accurately recall the last month.",
    { effects: [fixedAbility("Intelligence"), custom("keen-mind-memory", "Always know north and time to sunrise/sunset; accurately recall anything seen or heard within one month.")], tags: ["half-feat", "exploration"] }
  ),
  rule(
    "Keenness of the Stone Giant",
    "Increase Strength, Constitution, or Wisdom, extend darkvision, and hurl a forceful stone-like attack.",
    "Increase a listed ability by 1, extend darkvision by 60 feet, and use a proficiency-limited bonus action ranged spell attack that can knock a target prone.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Stone Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Wisdom"]), { type: "darkvisionBonus", value: 60 }, resource("stone-throw", "Stone Throw", "proficiencyBonus"), custom("stone-throw-rule", "Bonus action 60-foot spell attack deals 1d10 force; Strength save or target falls prone.")],
      choices: [choice("ability", "Ability increase and Stone Throw ability", "ability", ["Strength", "Constitution", "Wisdom"])],
      tags: ["half-feat", "giant", "ranged", "darkvision"]
    }
  ),
  rule(
    "Knight of the Crown",
    "Increase a physical ability and direct an ally to make an immediate attack.",
    "Increase Strength, Dexterity, or Constitution by 1. A proficiency-limited bonus action lets a nearby ally use its reaction to attack, with bonus damage on a hit.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["squire-of-solamnia"] }],
      effects: [abilityChoice("ability", ["Strength", "Dexterity", "Constitution"]), resource("commanding-rally", "Commanding Rally", "proficiencyBonus"), custom("commanding-rally-rule", "Bonus action lets a nearby ally use its reaction for one weapon attack; a hit gains 1d8 damage.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity", "Constitution"])],
      tags: ["half-feat", "dragonlance", "support"]
    }
  ),
  rule(
    "Knight of the Rose",
    "Increase Constitution, Wisdom, or Charisma and rally allies with temporary vitality.",
    "Increase a listed ability by 1. A proficiency-limited bonus action grants temporary hit points to a nearby creature based on a Hit Die roll and the chosen ability modifier.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["squire-of-solamnia"] }],
      effects: [abilityChoice("ability", ["Constitution", "Wisdom", "Charisma"]), resource("bolstering-rally", "Bolstering Rally", "proficiencyBonus"), custom("bolstering-rally-rule", "Bonus action grants a nearby ally temporary hit points equal to one Hit Die roll + proficiency bonus + chosen ability modifier.")],
      choices: [choice("ability", "Ability increase and rally ability", "ability", ["Constitution", "Wisdom", "Charisma"])],
      tags: ["half-feat", "dragonlance", "support", "temporary-hit-points"]
    }
  ),
  rule(
    "Knight of the Sword",
    "Increase a mental ability and frighten a creature with a decisive strike.",
    "Increase Intelligence, Wisdom, or Charisma by 1. A proficiency-limited rider on a successful attack can frighten the target and nearby enemies.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["squire-of-solamnia"] }],
      effects: [abilityChoice("ability", MENTAL_ABILITIES), resource("demoralizing-strike", "Demoralizing Strike", "proficiencyBonus"), custom("demoralizing-strike-rule", "After a hit, force the target and chosen nearby creatures to save or become frightened for 1 minute, repeating saves at turn ends.")],
      choices: [choice("ability", "Ability increase and save ability", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "dragonlance", "fear"]
    }
  ),
  rule(
    "Lightly Armored",
    "Improve Strength or Dexterity and gain light armor proficiency.",
    "Increase Strength or Dexterity by 1 and gain proficiency with light armor.",
    {
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), { type: "armorProficiency", values: ["Light Armor"] }],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "armor", "proficiency"]
    }
  ),
  rule(
    "Linguist",
    "Improve Intelligence, learn three languages, and create decipherable ciphers.",
    "Increase Intelligence by 1, learn three languages, and create written ciphers that others can decode only through your key, magic, or a difficult Intelligence check.",
    {
      effects: [fixedAbility("Intelligence"), { type: "proficiencyChoice", choose: 3, categories: ["language"] }, custom("linguist-cipher", "Create ciphers with a save DC equal to Intelligence score + proficiency bonus.")],
      choices: [choice("languages", "Languages", "language", [], { choose: 3 })],
      tags: ["half-feat", "language", "exploration"]
    }
  ),
  rule(
    "Lucky",
    "Gain three luck points to influence attacks, checks, saves, or attacks against you.",
    "Spend a luck point to roll an extra d20 for your attack, check, or save, or to interfere with an attack against you; choose which die determines the result.",
    { effects: [resource("luck-points", "Luck points", 3), custom("lucky-roll", "Spend after seeing the roll but before the outcome to roll another d20 and choose which eligible die is used.")], tags: ["resource", "d20"] }
  ),
  rule(
    "Mage Slayer",
    "Punish nearby spellcasting and resist spells cast at close range.",
    "React to a nearby spellcaster with a melee attack, impose disadvantage on concentration saves caused by your damage, and gain advantage on saves against nearby spells.",
    { effects: [custom("mage-slayer-reaction", "Reaction melee attack when a creature within 5 feet casts a spell."), custom("mage-slayer-concentration", "Damage you deal imposes disadvantage on concentration saves."), custom("mage-slayer-saves", "Advantage on saves against spells cast by creatures within 5 feet.")], tags: ["combat", "spellcasting", "reaction"] }
  ),
  rule(
    "Magic Initiate",
    "Learn two cantrips and one 1st-level spell from a chosen spellcasting class.",
    "Choose bard, cleric, druid, sorcerer, warlock, or wizard. Learn two cantrips and one 1st-level spell from that class, casting the leveled spell once per long rest.",
    {
      effects: [{ type: "classChoice", id: "magic-initiate-class", options: ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"] }, { type: "spellChoice", cantrips: 2, levelOneSpells: 1 }, resource("magic-initiate-spell", "Magic Initiate spell", 1)],
      choices: [choice("spell-class", "Spellcasting class", "class", ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"]), choice("cantrips", "Cantrips", "spell", [], { choose: 2, levels: [0], classChoiceId: "spell-class" }), choice("level-one-spell", "1st-level spell", "spell", [], { levels: [1], classChoiceId: "spell-class" })],
      repeatable: true,
      repeatByChoice: true,
      tags: ["spellcasting"]
    }
  ),
  rule(
    "Martial Adept",
    "Learn two Battle Master maneuvers and gain one superiority die.",
    "Choose two maneuvers and gain one d6 superiority die, restored after a short or long rest. Its save DC uses Strength or Dexterity.",
    {
      effects: [{ type: "featureChoice", featureType: "battleMasterManeuver", count: 2 }, resource("superiority-dice", "Superiority die", 1, "shortOrLongRest", { die: "d6" })],
      choices: [choice("maneuvers", "Battle Master maneuvers", "feature", [], { choose: 2, source: "battle-master-maneuvers" }), choice("maneuver-ability", "Maneuver save ability", "ability", ["Strength", "Dexterity"])],
      tags: ["combat", "maneuver", "resource"]
    }
  ),
  rule(
    "Medium Armor Master",
    "Use medium armor stealthily and apply more Dexterity to AC.",
    "Medium armor no longer imposes Stealth disadvantage, and its Dexterity bonus cap rises from +2 to +3.",
    { prerequisites: [{ type: "armorProficiency", category: "medium" }], effects: [{ type: "mediumArmorDexterityCap", value: 3 }, custom("medium-armor-stealth", "Wearing medium armor does not impose disadvantage on Dexterity (Stealth) checks.")], tags: ["armor", "armor-class", "stealth"] }
  ),
  rule(
    "Metamagic Adept",
    "Learn two Metamagic options and gain two sorcery points for them.",
    "Choose two sorcerer Metamagic options. Gain two sorcery points that return on a long rest and can be spent only on Metamagic.",
    {
      prerequisites: [{ type: "spellcasting" }],
      effects: [{ type: "featureChoice", featureType: "metamagic", count: 2 }, resource("metamagic-sorcery-points", "Metamagic sorcery points", 2)],
      choices: [choice("metamagic-options", "Metamagic options", "feature", [], { choose: 2, source: "metamagic-options" })],
      tags: ["spellcasting", "metamagic", "resource"]
    }
  ),
  rule(
    "Mobile",
    "Increase speed and move through dangerous melee without being pinned down.",
    "Increase walking speed by 10 feet, ignore difficult terrain while Dashing, and creatures you attack cannot make opportunity attacks against you that turn.",
    { effects: [{ type: "speedBonus", value: 10 }, custom("mobile-dash", "Dashing ignores extra movement from difficult terrain for that turn."), custom("mobile-disengage", "A creature you make a melee attack against cannot make opportunity attacks against you that turn.")], tags: ["movement", "combat"] }
  ),
  rule(
    "Moderately Armored",
    "Improve Strength or Dexterity and gain medium armor and shield proficiency.",
    "Increase Strength or Dexterity by 1 and gain proficiency with medium armor and shields.",
    {
      prerequisites: [{ type: "armorProficiency", category: "light" }],
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), { type: "armorProficiency", values: ["Medium Armor", "Shields"] }],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "armor", "proficiency"]
    }
  ),
  rule(
    "Mounted Combatant",
    "Fight effectively from a mount and protect it from attacks and area effects.",
    "Gain advantage on melee attacks against smaller unmounted foes, redirect attacks from your mount to yourself, and improve its Dexterity-save outcomes.",
    { effects: [custom("mounted-advantage", "While mounted, advantage on melee attacks against unmounted creatures smaller than the mount."), custom("mounted-redirect", "Redirect an attack targeting the mount to yourself."), custom("mounted-evasion", "Mount takes no damage on a successful Dexterity save and half on a failure when the effect normally allows half.")], tags: ["combat", "mounted"] }
  ),
  rule(
    "Observant",
    "Improve Intelligence or Wisdom and sharpen lip-reading and passive awareness.",
    "Increase Intelligence or Wisdom by 1, read visible lips in a language you know, and gain +5 passive Perception and passive Investigation.",
    {
      effects: [abilityChoice("ability", ["Intelligence", "Wisdom"]), { type: "passiveSkillBonus", skills: ["perception", "investigation"], value: 5 }, custom("observant-lip-reading", "Understand visible speech by reading lips when you know the language.")],
      choices: [choice("ability", "Ability increase", "ability", ["Intelligence", "Wisdom"])],
      tags: ["half-feat", "perception", "investigation"]
    }
  ),
  rule(
    "Orcish Fury",
    "Improve Strength or Constitution and channel orcish ferocity into attacks and retaliation.",
    "Increase Strength or Constitution by 1, add one weapon damage die once per rest, and make a reaction weapon attack when Relentless Endurance triggers.",
    {
      prerequisites: [{ type: "species", speciesIds: ["half-orc"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution"]), resource("orcish-fury-damage", "Orcish Fury damage", 1, "shortOrLongRest"), custom("orcish-fury-retaliation", "When Relentless Endurance triggers, use a reaction to make one weapon attack.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution"])],
      tags: ["half-feat", "species", "combat"]
    }
  ),
  rule(
    "Piercer",
    "Improve Strength or Dexterity and make piercing attacks more reliable and deadly.",
    "Increase Strength or Dexterity by 1. Once per turn reroll one piercing damage die, and piercing critical hits add one extra weapon damage die.",
    {
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), custom("piercer-reroll", "Once per turn reroll one piercing damage die and use the new roll."), custom("piercer-critical", "A piercing critical hit adds one extra weapon damage die.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "combat", "piercing"]
    }
  ),
  rule(
    "Planar Wanderer",
    "Increase a mental ability, adapt elemental resistance, and sense and exploit portals.",
    "Increase Intelligence, Wisdom, or Charisma by 1. Choose acid, cold, or fire resistance after each long rest, sense nearby portals, and reduce the time needed to use a portal again.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "feat", featIds: ["scion-of-the-outer-planes"] }],
      effects: [abilityChoice("ability", MENTAL_ABILITIES), { type: "restChoiceResistance", damageTypes: ["acid", "cold", "fire"] }, custom("portal-cracker", "Sense portals within 30 feet and treat a portal's normal reuse wait as one round for you.")],
      choices: [choice("ability", "Ability increase", "ability", MENTAL_ABILITIES), choice("default-resistance", "Default planar resistance", "damageType", ["Acid", "Cold", "Fire"])],
      tags: ["half-feat", "planescape", "resistance", "exploration"]
    }
  ),
  rule(
    "Poisoner",
    "Ignore poison resistance and craft potent doses of injury poison.",
    "Poison damage you deal ignores resistance, applying poison to a weapon is a bonus action, and a rest plus materials creates proficiency-bonus doses of a damaging poison.",
    { effects: [custom("poisoner-resistance", "Poison damage you deal ignores resistance to poison damage."), custom("poisoner-application", "Apply poison to a weapon or ammunition as a bonus action."), resource("potent-poison-doses", "Potent poison doses", "proficiencyBonus", "longRest", { costGp: 50, damage: "2d8", saveAbility: "Constitution", saveDc: 14 })], tags: ["poison", "crafting", "damage"] }
  ),
  rule(
    "Polearm Master",
    "Gain a bonus butt-end attack and opportunity attacks against approaching foes.",
    "After attacking with a qualifying polearm, make a bonus-action 1d4 bludgeoning attack. Enemies provoke opportunity attacks when entering the polearm's reach.",
    { effects: [custom("polearm-bonus-attack", "After attacking only with a glaive, halberd, quarterstaff, or spear, make a bonus-action butt-end attack for 1d4 bludgeoning."), custom("polearm-opportunity", "Creatures provoke an opportunity attack when entering the reach of a qualifying polearm.")], tags: ["combat", "weapon", "reaction"] }
  ),
  rule(
    "Prodigy",
    "Learn one skill, one tool, and one language, and gain expertise in a skill.",
    "Gain one skill proficiency, one tool proficiency, and one language. Double proficiency bonus for one proficient skill that does not already use expertise.",
    {
      prerequisites: [{ type: "species", speciesIds: ["human", "half-elf", "half-orc"] }],
      effects: [{ type: "proficiencyChoice", choose: 1, categories: ["skill"] }, { type: "proficiencyChoice", choose: 1, categories: ["tool"] }, { type: "proficiencyChoice", choose: 1, categories: ["language"] }, { type: "expertiseChoice", choose: 1, categories: ["skill"] }],
      choices: [choice("skill", "Skill proficiency", "skill"), choice("tool", "Tool proficiency", "tool"), choice("language", "Language", "language"), choice("expertise", "Skill expertise", "skill", [], { proficientOnly: true })],
      tags: ["species", "proficiency", "expertise"]
    }
  ),
  rule(
    "Resilient",
    "Improve one ability and gain proficiency in that ability's saving throws.",
    "Choose an ability. Increase it by 1 and gain proficiency with saving throws using it.",
    {
      effects: [abilityChoice("ability", ABILITIES), { type: "savingThrowProficiencyFromAbilityChoice", choiceId: "ability" }],
      choices: [choice("ability", "Ability increase and saving throw", "ability", ABILITIES)],
      tags: ["half-feat", "saving-throw", "proficiency"]
    }
  ),
  rule(
    "Revenant Blade",
    "Improve Strength or Dexterity and master the double-bladed scimitar.",
    "Increase Strength or Dexterity by 1, gain +1 AC while wielding a double-bladed scimitar in two hands, and treat it as finesse.",
    {
      prerequisites: [{ type: "species", speciesIds: ["elf"] }],
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), { type: "armorClassBonus", value: 1, condition: "wielding-double-bladed-scimitar-two-handed" }, custom("revenant-blade-finesse", "Double-bladed scimitars have the finesse property for you.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "species", "weapon", "armor-class"]
    }
  ),
  rule(
    "Ritual Caster",
    "Gain a ritual book and copy qualifying ritual spells into it.",
    "Choose a spellcasting class, add two 1st-level ritual spells from its list to a ritual book, and copy additional rituals up to half your level when found.",
    {
      prerequisites: [{ type: "abilityAnyMinimum", abilities: ["int", "wis"], minimum: 13 }],
      effects: [{ type: "ritualBook", initialSpells: 2, maximumSpellLevelFormula: "floor(characterLevel/2)" }],
      choices: [choice("ritual-class", "Ritual spell class", "class", ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"]), choice("ritual-spells", "1st-level ritual spells", "spell", [], { choose: 2, levels: [1], ritualOnly: true, classChoiceId: "ritual-class" })],
      tags: ["spellcasting", "ritual", "spellbook"]
    }
  ),
  rule(
    "Rune Shaper",
    "Learn comprehend languages and inscribe a small set of rune spells.",
    "Cast comprehend languages without a slot and choose a proficiency-scaled number of 1st-level rune spells, each cast once per long rest or with slots.",
    {
      prerequisites: [{ type: "spellcastingOrRuneCarver" }],
      effects: [{ type: "spellGrant", spellId: "comprehend-languages", atWill: true }, { type: "spellChoice", list: "rune-spells", count: "proficiencyBonus", levels: [1] }],
      choices: [choice("rune-spells", "Rune spells", "spell", [], { chooseFormula: "proficiencyBonus", levels: [1], list: "rune-spells" }), choice("spellcasting-ability", "Spellcasting ability", "ability", MENTAL_ABILITIES)],
      tags: ["spellcasting", "giant", "runes"]
    }
  ),
  rule(
    "Savage Attacker",
    "Reroll a melee weapon's damage dice once per turn and choose either total.",
    "Once per turn when rolling melee weapon damage, roll the weapon's damage dice a second time and use either result.",
    { effects: [custom("savage-attacker-reroll", "Once per turn, reroll all damage dice for one melee weapon hit and choose either total.")], tags: ["combat", "weapon", "damage"] }
  ),
  rule(
    "Scion of the Outer Planes",
    "Attune to an outer plane, gaining a resistance and a thematic cantrip.",
    "Choose one outer plane. Its influence grants a damage resistance and one cantrip, using Intelligence, Wisdom, or Charisma.",
    {
      prerequisites: [{ type: "setting", setting: "Planescape" }],
      effects: [{ type: "planarScion", choiceId: "outer-plane" }],
      choices: [choice("outer-plane", "Outer plane", "option", ["Astral Plane", "Elysium", "Feywild", "Gehanna", "Mechanus", "Mount Celestia", "The Abyss", "The Beastlands", "The Nine Hells", "The Outlands", "Shadowfell"]), choice("spellcasting-ability", "Spellcasting ability", "ability", MENTAL_ABILITIES)],
      tags: ["planescape", "resistance", "spellcasting"]
    }
  ),
  rule(
    "Second Chance",
    "Improve Dexterity, Constitution, or Charisma and force a nearby attacker to reroll.",
    "Increase Dexterity, Constitution, or Charisma by 1. Use a reaction when a visible creature hits you to force a reroll; recharge on rest or when rolling initiative.",
    {
      prerequisites: [{ type: "species", speciesIds: ["halfling"] }],
      effects: [abilityChoice("ability", ["Dexterity", "Constitution", "Charisma"]), resource("second-chance", "Second Chance", 1, "shortOrLongRestOrInitiative"), custom("second-chance-rule", "Reaction forces a visible attacker within 30 feet to reroll a hit against you and use the new result.")],
      choices: [choice("ability", "Ability increase", "ability", ["Dexterity", "Constitution", "Charisma"])],
      tags: ["half-feat", "species", "reaction"]
    }
  ),
  rule(
    "Sentinel",
    "Stop enemies with opportunity attacks and punish attacks against nearby allies.",
    "Opportunity attacks reduce speed to 0, Disengage does not prevent them, and a nearby attack against someone else can trigger a reaction melee attack.",
    { effects: [custom("sentinel-stop", "A creature hit by your opportunity attack has speed 0 for the rest of its turn."), custom("sentinel-disengage", "Creatures provoke your opportunity attacks even after taking Disengage."), custom("sentinel-retaliation", "Reaction melee attack when a nearby creature attacks someone other than you without this feat.")], tags: ["combat", "reaction", "control"] }
  ),
  rule(
    "Shadow Touched",
    "Improve a mental ability and learn invisibility plus one 1st-level illusion or necromancy spell.",
    "Increase Intelligence, Wisdom, or Charisma by 1. Cast each learned spell once per long rest or with available slots, using the chosen ability.",
    {
      effects: [abilityChoice("ability", MENTAL_ABILITIES), { type: "spellGrant", spellId: "invisibility", uses: 1, recharge: "longRest", abilityChoiceId: "ability" }, { type: "spellChoice", levels: [1], schools: ["illusion", "necromancy"], count: 1, abilityChoiceId: "ability" }],
      choices: [choice("ability", "Ability increase and spellcasting ability", "ability", MENTAL_ABILITIES), choice("level-one-spell", "1st-level illusion or necromancy spell", "spell", [], { levels: [1], schools: ["illusion", "necromancy"] })],
      tags: ["half-feat", "spellcasting"]
    }
  ),
  rule(
    "Sharpshooter",
    "Master difficult long-range shots and trade accuracy for damage.",
    "Long range no longer imposes disadvantage, ranged weapon attacks ignore most cover, and proficient ranged attacks can take -5 to hit for +10 damage.",
    { effects: [custom("sharpshooter-range", "Ranged weapon attacks do not suffer disadvantage at long range."), custom("sharpshooter-cover", "Ranged weapon attacks ignore half and three-quarters cover."), custom("sharpshooter-power-attack", "Before a proficient ranged weapon attack, choose -5 to hit and +10 damage.")], tags: ["combat", "ranged", "weapon"] }
  ),
  rule(
    "Shield Master",
    "Use a shield offensively and defend against Dexterity-based effects.",
    "After attacking, shove with a shield as a bonus action. Add the shield's AC bonus to certain single-target Dexterity saves and use a reaction to take no damage on a successful save.",
    { effects: [custom("shield-master-shove", "After taking Attack, bonus action shove a creature within 5 feet using the shield."), custom("shield-master-save-bonus", "Add shield AC bonus to Dexterity saves against effects targeting only you."), custom("shield-master-evasion", "Reaction after a successful Dexterity save for half damage reduces damage to zero.")], tags: ["combat", "shield", "saving-throw"] }
  ),
  rule(
    "Skill Expert",
    "Improve one ability, learn one skill, and gain expertise in one proficient skill.",
    "Increase any ability by 1, gain one skill proficiency, and double proficiency bonus for one proficient skill that does not already use expertise.",
    {
      effects: [abilityChoice("ability", ABILITIES), { type: "proficiencyChoice", choose: 1, categories: ["skill"] }, { type: "expertiseChoice", choose: 1, categories: ["skill"] }],
      choices: [choice("ability", "Ability increase", "ability", ABILITIES), choice("skill", "Skill proficiency", "skill"), choice("expertise", "Skill expertise", "skill", [], { proficientOnly: true })],
      tags: ["half-feat", "skill", "expertise"]
    }
  ),
  rule(
    "Skilled",
    "Gain proficiency in any combination of three skills or tools.",
    "Choose three skills or tools. You gain proficiency with each selection.",
    {
      effects: [{ type: "proficiencyChoice", choose: 3, categories: ["skill", "tool"] }],
      choices: [choice("proficiencies", "Skills or tools", "skillOrTool", [], { choose: 3 })],
      tags: ["skill", "tool", "proficiency"]
    }
  ),
  rule(
    "Skulker",
    "Hide effectively in dim light and make missed ranged attacks without revealing yourself.",
    "Hide while lightly obscured, remain hidden after a missed ranged weapon attack, and remove dim-light disadvantage from sight-based Perception checks.",
    { prerequisites: [{ type: "abilityMinimum", ability: "dex", minimum: 13 }], effects: [custom("skulker-hide", "Can attempt to hide while lightly obscured."), custom("skulker-miss", "A missed ranged weapon attack does not reveal your position."), custom("skulker-dim-light", "Dim light does not impose disadvantage on sight-based Perception checks.")], tags: ["stealth", "ranged", "exploration"] }
  ),
  rule(
    "Slasher",
    "Improve Strength or Dexterity and hinder enemies with slashing attacks.",
    "Increase Strength or Dexterity by 1. Once per turn reduce a slashing target's speed, and slashing critical hits hinder its attacks for a round.",
    {
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), custom("slasher-slow", "Once per turn, a slashing hit reduces the target's speed by 10 feet until your next turn."), custom("slasher-critical", "A slashing critical hit gives the target disadvantage on attacks until your next turn.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"])],
      tags: ["half-feat", "combat", "slashing"]
    }
  ),
  rule(
    "Soul of the Storm Giant",
    "Increase a physical ability, resist thunder, and surround yourself with a storm aura.",
    "Increase Strength, Constitution, or Wisdom by 1, gain thunder resistance, and use a limited bonus action aura that disrupts nearby attacks and slows enemies.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Storm Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Wisdom"]), { type: "damageResistance", damageType: "thunder" }, resource("maelstrom-aura", "Maelstrom Aura", "proficiencyBonus"), custom("maelstrom-aura-rule", "Bonus action creates a 10-foot aura for 1 minute; nearby creatures save to avoid attack disadvantage and halved speed until next turn.")],
      choices: [choice("ability", "Ability increase and aura save ability", "ability", ["Strength", "Constitution", "Wisdom"])],
      tags: ["half-feat", "giant", "thunder", "aura"]
    }
  ),
  rule(
    "Spell Sniper",
    "Learn an attack cantrip and make ranged spell attacks through range and cover penalties.",
    "Double the range of attack-roll spells, ignore half and three-quarters cover with ranged spell attacks, and learn one attack cantrip from an eligible class list.",
    {
      prerequisites: [{ type: "spellcasting" }],
      effects: [custom("spell-sniper-range", "Double the range of spells that require an attack roll."), custom("spell-sniper-cover", "Ranged spell attacks ignore half and three-quarters cover."), { type: "spellChoice", cantrips: 1, attackRollOnly: true }],
      choices: [choice("cantrip-class", "Cantrip class", "class", ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"]), choice("attack-cantrip", "Attack-roll cantrip", "spell", [], { levels: [0], attackRollOnly: true, classChoiceId: "cantrip-class" })],
      tags: ["spellcasting", "ranged"]
    }
  ),
  rule(
    "Squire of Solamnia",
    "Gain reliable mounted movement and a limited advantaged weapon strike.",
    "Mounting or dismounting costs only 5 feet. A proficiency-limited weapon attack gains advantage and deals 1d8 extra damage on a hit; a miss does not spend the use.",
    {
      prerequisites: [{ type: "classOrBackground", classIds: ["fighter", "paladin"], backgroundIds: ["knight-of-solamnia"] }, { type: "setting", setting: "Dragonlance" }],
      effects: [custom("squire-mount", "Mounting or dismounting costs 5 feet of movement."), resource("precise-strike", "Precise Strike", "proficiencyBonus"), custom("precise-strike-rule", "Before a weapon attack, spend a use for advantage; a hit adds 1d8 damage, while a miss preserves the use.")],
      tags: ["dragonlance", "combat", "mounted"]
    }
  ),
  rule(
    "Squat Nimbleness",
    "Improve Strength or Dexterity, move faster, and escape grapples more easily.",
    "Increase Strength or Dexterity by 1, increase walking speed by 5 feet, gain Athletics or Acrobatics proficiency, and gain advantage to escape grapples.",
    {
      prerequisites: [{ type: "speciesSizeOrSpecies", sizes: ["Small"], speciesIds: ["dwarf"] }],
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), { type: "speedBonus", value: 5 }, { type: "proficiencyChoice", choose: 1, categories: ["skill"], options: ["Athletics", "Acrobatics"] }, custom("squat-nimbleness-escape", "Advantage on Athletics or Acrobatics checks made to escape a grapple.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"]), choice("skill", "Skill proficiency", "skill", ["Athletics", "Acrobatics"])],
      tags: ["half-feat", "movement", "skill"]
    }
  ),
  rule(
    "Strike of the Giants",
    "Learn one giant-inspired strike that adds damage and a rider to weapon attacks.",
    "Choose a giant lineage. Once per turn, a proficiency-limited melee or thrown-weapon hit deals extra damage and applies that lineage's effect.",
    {
      prerequisites: [{ type: "weaponProficiency", categories: ["simple", "martial"] }],
      effects: [resource("giant-strike", "Giant strikes", "proficiencyBonus"), { type: "giantStrike", choiceId: "giant-strike" }],
      choices: [choice("giant-strike", "Giant strike", "option", GIANT_STRIKES)],
      tags: ["giant", "combat", "weapon"]
    }
  ),
  rule(
    "Svirfneblin Magic",
    "Gain deep gnome innate magic including at-will nondetection.",
    "Cast nondetection on yourself at will and cast blindness/deafness, blur, and disguise self once each per long rest using Intelligence.",
    { prerequisites: [{ type: "species", speciesIds: ["gnome"], subraceIds: ["deep-gnome", "svirfneblin"] }], effects: [{ type: "spellGrant", spellId: "nondetection", atWill: true, selfOnly: true, ability: "Intelligence" }, { type: "spellGrant", spellIds: ["blindness-deafness", "blur", "disguise-self"], usesEach: 1, recharge: "longRest", ability: "Intelligence" }], tags: ["species", "spellcasting"] }
  ),
  rule(
    "Tavern Brawler",
    "Improve Strength or Constitution and fight effectively with improvised weapons and grapples.",
    "Increase Strength or Constitution by 1, gain improvised-weapon proficiency, improve unarmed damage, and attempt a grapple as a bonus action after a hit.",
    {
      effects: [abilityChoice("ability", ["Strength", "Constitution"]), { type: "weaponProficiency", values: ["Improvised Weapons"] }, { type: "unarmedDamage", die: "d4" }, custom("tavern-brawler-grapple", "After hitting with an unarmed strike or improvised weapon, bonus action attempt to grapple the target.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution"])],
      tags: ["half-feat", "combat", "grapple"]
    }
  ),
  rule(
    "Telekinetic",
    "Improve a mental ability, wield an enhanced mage hand, and shove creatures at range.",
    "Increase Intelligence, Wisdom, or Charisma by 1, gain an invisible extended mage hand, and use a bonus action to telekinetically push or pull a nearby creature.",
    {
      effects: [abilityChoice("ability", MENTAL_ABILITIES), { type: "spellGrant", spellId: "mage-hand", abilityChoiceId: "ability", invisible: true, rangeBonus: 30 }, custom("telekinetic-shove", "Bonus action forces a Strength save to move a visible creature within 30 feet 5 feet toward or away from you.")],
      choices: [choice("ability", "Ability increase and save ability", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "spellcasting", "movement"]
    }
  ),
  rule(
    "Telepathic",
    "Improve a mental ability, speak telepathically, and cast detect thoughts.",
    "Increase Intelligence, Wisdom, or Charisma by 1, communicate one-way telepathically within 60 feet, and cast detect thoughts once per long rest or with slots.",
    {
      effects: [abilityChoice("ability", MENTAL_ABILITIES), { type: "telepathy", range: 60, responseRequiredSharedLanguage: true }, { type: "spellGrant", spellId: "detect-thoughts", uses: 1, recharge: "longRest", abilityChoiceId: "ability", noComponents: true }],
      choices: [choice("ability", "Ability increase and spellcasting ability", "ability", MENTAL_ABILITIES)],
      tags: ["half-feat", "spellcasting", "telepathy"]
    }
  ),
  rule(
    "Tough",
    "Gain 2 maximum hit points for every character level.",
    "Maximum hit points increase by twice your current character level and by 2 whenever you gain another level.",
    { effects: [{ type: "hpBonus", perLevel: 2 }], tags: ["hit-points", "durability"] }
  ),
  rule(
    "Vigor of the Hill Giant",
    "Increase a physical ability, improve healing, and resist forced movement or being knocked down.",
    "Increase Strength, Constitution, or Wisdom by 1. Healing from spells or Hit Dice gains proficiency bonus, and a reaction can resist forced movement or being knocked prone.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "strike-of-the-giants", choiceId: "giant-strike", values: ["Hill Strike"] }],
      effects: [abilityChoice("ability", ["Strength", "Constitution", "Wisdom"]), { type: "healingBonus", value: "proficiencyBonus", sources: ["spell", "hitDie"] }, custom("bulwark-reaction", "Reaction after forced movement or being knocked prone prevents the movement or prone condition.")],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Constitution", "Wisdom"])],
      tags: ["half-feat", "giant", "healing", "reaction"]
    }
  ),
  rule(
    "War Caster",
    "Maintain concentration and cast effectively while armed in close combat.",
    "Gain advantage on concentration saves, perform somatic components with occupied hands, and replace an opportunity attack with a qualifying one-target spell.",
    { prerequisites: [{ type: "spellcasting" }], effects: [custom("war-caster-concentration", "Advantage on Constitution saves to maintain concentration after damage."), custom("war-caster-components", "Perform somatic spell components while hands hold weapons or a shield."), custom("war-caster-opportunity-spell", "Reaction casts a one-action, one-target spell instead of an opportunity attack.")], tags: ["spellcasting", "combat", "concentration"] }
  ),
  rule(
    "Weapon Master",
    "Improve Strength or Dexterity and gain proficiency with four weapons.",
    "Increase Strength or Dexterity by 1 and choose four simple or martial weapons with which to gain proficiency.",
    {
      effects: [abilityChoice("ability", ["Strength", "Dexterity"]), { type: "proficiencyChoice", choose: 4, categories: ["weapon"] }],
      choices: [choice("ability", "Ability increase", "ability", ["Strength", "Dexterity"]), choice("weapons", "Weapon proficiencies", "weapon", [], { choose: 4 })],
      tags: ["half-feat", "weapon", "proficiency"]
    }
  ),
  rule(
    "Wood Elf Magic",
    "Learn one druid cantrip and cast longstrider and pass without trace.",
    "Use Wisdom to learn one druid cantrip and cast longstrider and pass without trace once each per long rest.",
    {
      prerequisites: [{ type: "species", speciesIds: ["elf"], subraceIds: ["wood-elf"] }],
      effects: [{ type: "spellChoice", classId: "druid", cantrips: 1, ability: "Wisdom" }, { type: "spellGrant", spellIds: ["longstrider", "pass-without-trace"], usesEach: 1, recharge: "longRest", ability: "Wisdom" }],
      choices: [choice("cantrip", "Druid cantrip", "spell", [], { classId: "druid", levels: [0] })],
      tags: ["species", "spellcasting", "stealth"]
    }
  )
]);

export default DEFAULT_FEAT_RULES;
