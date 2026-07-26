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
      effects: [fixedAbility("Constitution"), { type: "spellChoice", classId: "sorcerer", cantrips: 1, levelOneSpells: 1, ability: "Constitution" }, custom("aberrant-vitality", "When the marked spell is cast, an optional Hit Die can produce temporary hit points or force damage.")],
      choices: [choice("cantrip", "Sorcerer cantrip", "spell", [], { classId: "sorcerer", levels: [0], ability: "Constitution", atWill: true }), choice("level-one-spell", "1st-level sorcerer spell", "spell", [], { classId: "sorcerer", levels: [1], ability: "Constitution", uses: 1, recharge: "shortOrLongRest" })],
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
      effects: [{ type: "spellChoice", schools: ["enchantment", "necromancy"], levels: [2], count: 1 }, custom("life-channel", "Spend Hit Dice after rolling spell damage to add the rolls to one target's damage.")],
      choices: [choice("robe-spell", "2nd-level enchantment or necromancy spell", "spell", [], { levels: [2], schools: ["enchantment", "necromancy"], uses: 1, recharge: "longRest", canUseSpellSlots: true })],
      usesExistingSpellcastingAbility: true,
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Adept of the Red Robes",
    "Deepen Lunitari magic and replace a poor attack or save roll with a balanced result.",
    "Learn a 2nd-level illusion or transmutation spell and cast it once per long rest. A limited reaction can treat a d20 roll of 9 or lower as a 10.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "initiate-of-high-sorcery", choiceId: "moon", values: ["Lunitari"] }],
      effects: [{ type: "spellChoice", schools: ["illusion", "transmutation"], levels: [2], count: 1 }, resource("balance-of-precision", "Balance of Precision", "proficiencyBonus"), custom("balance-of-precision-rule", "Reaction after an attack or save roll of 9 or lower changes the d20 result to 10.")],
      choices: [choice("robe-spell", "2nd-level illusion or transmutation spell", "spell", [], { levels: [2], schools: ["illusion", "transmutation"], uses: 1, recharge: "longRest", canUseSpellSlots: true })],
      usesExistingSpellcastingAbility: true,
      tags: ["spellcasting", "dragonlance"]
    }
  ),
  rule(
    "Adept of the White Robes",
    "Deepen Solinari magic and protect an ally by spending magical power.",
    "Learn a 2nd-level abjuration or divination spell and cast it once per long rest. A reaction can spend a spell slot to reduce damage to a nearby creature.",
    {
      prerequisites: [{ type: "level", minimum: 4 }, { type: "featChoice", featId: "initiate-of-high-sorcery", choiceId: "moon", values: ["Solinari"] }],
      effects: [{ type: "spellChoice", schools: ["abjuration", "divination"], levels: [2], count: 1 }, custom("protective-ward", "Reaction spends a spell slot and reduces nearby damage by 1d6 per slot level plus the spellcasting modifier.")],
      choices: [choice("robe-spell", "2nd-level abjuration or divination spell", "spell", [], { levels: [2], schools: ["abjuration", "divination"], uses: 1, recharge: "longRest", canUseSpellSlots: true })],
      usesExistingSpellcastingAbility: true,
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
      effects: [{ type: "spellChoice", classId: "artificer", cantrips: 1, levelOneSpells: 1, ability: "Intelligence" }, { type: "proficiencyChoice", choose: 1, categories: ["artisanTool"] }],
      choices: [choice("cantrip", "Artificer cantrip", "spell", [], { classId: "artificer", levels: [0], ability: "Intelligence", atWill: true }), choice("level-one-spell", "1st-level artificer spell", "spell", [], { classId: "artificer", levels: [1], ability: "Intelligence", uses: 1, recharge: "longRest", canUseSpellSlots: true }), choice("artisan-tool", "Artisan's tool", "tool", [], { category: "artisan" })],
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
    { prerequisites: [{ type: "level", minimum: 4 }, { type: "spellcasting" }], effects: [{ type: "spellGrant", spellId: "prestidigitation", atWill: true }, resource("hidden-ace", "Hidden Ace", 1), custom("hidden-ace-rule", "Store one prepared spell with a casting time of one action; cast it from the card as a bonus action before the next long rest.")], usesExistingSpellcastingAbility: true, tags: ["spellcasting", "focus"] }
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
    "While wielding a finesse weapon, use a reaction when hit by a melee attack to add proficiency bonus to AC for that atta×7ÚÚ$z{-®éÜj×VÆÆ67F–ær&–Æ—G’"Â&&–Æ—G’"ÂÔTåDÅô$”Ä•D”U2’Â6†ö–6R‚&ÆWfVÂÖöæR×7VÆÂ"Â#7BÖÆWfVÂ–ÆÇW6–öâ÷"æV7&öÖæ7’7VÆÂ"Â'7VÆÂ"ÂµÒÂ²ÆWfVÇ3¢³ÒÂ66†ööÇ3¢²&–ÆÇW6–öâ"Â&æV7&öÖæ7’%ÒÂ&–Æ—G”6†ö–6T–C¢&&–Æ—G’"ÂW6W3¢Â&V6†&vS¢&Æöæu&W7B"Â6åW6U7VÆÅ6Æ÷G3¢G'VRÒ•ÒÀ¢Fw3¢²&†ÆbÖfVB"Â'7VÆÆ67F–ær%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6†'6†ö÷FW""ÀĞ¢$Ö7FW"F–ff–7VÇBÆöær×&ævR6†÷G2æBG&FR67W&7’f÷"FÖvRâ"ÀĞ¢$Æöær&ævRæòÆöævW"–×÷6W2F—6GfçFvRÂ&ævVBvVöâGF6·2–væ÷&RÖ÷7B6÷fW"ÂæB&öf–6–VçB&ævVBGF6·26âF¶RÓRFò†—Bf÷"³FÖvRâ"ÀĞ¢²VffV7G3¢¶7W7FöÒ‚'6†'6†ö÷FW"×&ævR"Â%&ævVBvVöâGF6·2Fòæ÷B7VffW"F—6GfçFvRBÆöær&ævRâ"’Â7W7FöÒ‚'6†'6†ö÷FW"Ö6÷fW""Â%&ævVBvVöâGF6·2–væ÷&R†ÆbæBF‡&VR×V'FW'26÷fW"â"’Â7W7FöÒ‚'6†'6†ö÷FW"×÷vW"ÖGF6²"Â$&Vf÷&R&öf–6–VçB&ævVBvVöâGF6²Â6†ö÷6RÓRFò†—BæB³FÖvRâ"•ÒÂFw3¢²&6öÖ&B"Â'&ævVB"Â'vVöâ%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6†–VÆBÖ7FW""ÀĞ¢%W6R6†–VÆBöffVç6—fVÇ’æBFVfVæBv–ç7BFW‡FW&—G’Ö&6VBVffV7G2â"ÀĞ¢$gFW"GF6¶–ærÂ6†÷fRv—F‚6†–VÆB2&öçW27F–öââFBF†R6†–VÆBw22&öçW2Fò6W'F–â6–ævÆR×F&vWBFW‡FW&—G’6fW2æBW6R&V7F–öâFòF¶RæòFÖvRöâ7V66W76gVÂ6fRâ"ÀĞ¢²VffV7G3¢¶7W7FöÒ‚'6†–VÆBÖÖ7FW"×6†÷fR"Â$gFW"F¶–ærGF6²Â&öçW27F–öâ6†÷fR7&VGW&Rv—F†–âRfVWBW6–ærF†R6†–VÆBâ"’Â7W7FöÒ‚'6†–VÆBÖÖ7FW"×6fRÖ&öçW2"Â$FB6†–VÆB2&öçW2FòFW‡FW&—G’6fW2v–ç7BVffV7G2F&vWF–æröæÇ’–÷Râ"’Â7W7FöÒ‚'6†–VÆBÖÖ7FW"ÖWf6–öâ"Â%&V7F–öâgFW"7V66W76gVÂFW‡FW&—G’6fRf÷"†ÆbFÖvR&VGV6W2FÖvRFò¦W&òâ"•ÒÂFw3¢²&6öÖ&B"Â'6†–VÆB"Â'6f–ær×F‡&÷r%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6¶–ÆÂW‡W'B"ÀĞ¢$–×&÷fRöæR&–Æ—G’ÂÆV&âöæR6¶–ÆÂÂæBv–âW‡W'F—6R–âöæR&öf–6–VçB6¶–ÆÂâ"ÀĞ¢$–æ7&V6Rç’&–Æ—G’'’Âv–âöæR6¶–ÆÂ&öf–6–Væ7’ÂæBF÷V&ÆR&öf–6–Væ7’&öçW2f÷"öæR&öf–6–VçB6¶–ÆÂF†BFöW2æ÷BÇ&VG’W6RW‡W'F—6Râ"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â$”Ä•D”U2’Â²G—S¢'&öf–6–Væ7”6†ö–6R"Â6†ö÷6S¢Â6FVv÷&–W3¢²'6¶–ÆÂ%ÒÒÂ²G—S¢&W‡W'F—6T6†ö–6R"Â6†ö÷6S¢Â6FVv÷&–W3¢²'6¶–ÆÂ%ÒÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â$”Ä•D”U2’Â6†ö–6R‚'6¶–ÆÂ"Â%6¶–ÆÂ&öf–6–Væ7’"Â'6¶–ÆÂ"’Â6†ö–6R‚&W‡W'F—6R"Â%6¶–ÆÂW‡W'F—6R"Â'6¶–ÆÂ"ÂµÒÂ²&öf–6–VçDöæÇ“¢G'VRÒ•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â'6¶–ÆÂ"Â&W‡W'F—6R%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6¶–ÆÆVB"ÀĞ¢$v–â&öf–6–Væ7’–âç’6öÖ&–æF–öâöbF‡&VR6¶–ÆÇ2÷"FööÇ2â"ÀĞ¢$6†ö÷6RF‡&VR6¶–ÆÇ2÷"FööÇ2â–÷Rv–â&öf–6–Væ7’v—F‚V6‚6VÆV7F–öââ"ÀĞ¢°Ğ¢VffV7G3¢·²G—S¢'&öf–6–Væ7”6†ö–6R"Â6†ö÷6S¢2Â6FVv÷&–W3¢²'6¶–ÆÂ"Â'FööÂ%ÒÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚'&öf–6–Væ6–W2"Â%6¶–ÆÇ2÷"FööÇ2"Â'6¶–ÆÄ÷%FööÂ"ÂµÒÂ²6†ö÷6S¢2Ò•ÒÀĞ¢Fw3¢²'6¶–ÆÂ"Â'FööÂ"Â'&öf–6–Væ7’%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6·VÆ¶W""ÀĞ¢$†–FRVffV7F—fVÇ’–âF–ÒÆ–v‡BæBÖ¶RÖ—76VB&ævVBGF6·2v—F†÷WB&WfVÆ–ær–÷W'6VÆbâ"ÀĞ¢$†–FRv†–ÆRÆ–v‡FÇ’ö'67W&VBÂ&VÖ–â†–FFVâgFW"Ö—76VB&ævVBvVöâGF6²ÂæB&VÖ÷fRF–ÒÖÆ–v‡BF—6GfçFvRg&öÒ6–v‡BÖ&6VBW&6WF–öâ6†V6·2â"ÀĞ¢²&W&WV—6—FW3¢·²G—S¢&&–Æ—G”Ö–æ–×VÒ"Â&–Æ—G“¢&FW‚"ÂÖ–æ–×VÓ¢2ÕÒÂVffV7G3¢¶7W7FöÒ‚'6·VÆ¶W"Ö†–FR"Â$6âGFV×BFò†–FRv†–ÆRÆ–v‡FÇ’ö'67W&VBâ"’Â7W7FöÒ‚'6·VÆ¶W"ÖÖ—72"Â$Ö—76VB&ævVBvVöâGF6²FöW2æ÷B&WfVÂ–÷W"÷6—F–öââ"’Â7W7FöÒ‚'6·VÆ¶W"ÖF–ÒÖÆ–v‡B"Â$F–ÒÆ–v‡BFöW2æ÷B–×÷6RF—6GfçFvRöâ6–v‡BÖ&6VBW&6WF–öâ6†V6·2â"•ÒÂFw3¢²'7FVÇF‚"Â'&ævVB"Â&W‡Æ÷&F–öâ%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6Æ6†W""ÀĞ¢$–×&÷fR7G&VæwF‚÷"FW‡FW&—G’æB†–æFW"VæVÖ–W2v—F‚6Æ6†–ærGF6·2â"ÀĞ¢$–æ7&V6R7G&VæwF‚÷"FW‡FW&—G’'’âöæ6RW"GW&â&VGV6R6Æ6†–ærF&vWBw27VVBÂæB6Æ6†–ær7&—F–6Â†—G2†–æFW"—G2GF6·2f÷"&÷VæBâ"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò’Â7W7FöÒ‚'6Æ6†W"×6Æ÷r"Â$öæ6RW"GW&âÂ6Æ6†–ær†—B&VGV6W2F†RF&vWBw27VVB'’fVWBVçF–Â–÷W"æW‡BGW&ââ"’Â7W7FöÒ‚'6Æ6†W"Ö7&—F–6Â"Â$6Æ6†–ær7&—F–6Â†—Bv—fW2F†RF&vWBF—6GfçFvRöâGF6·2VçF–Â–÷W"æW‡BGW&ââ"•ÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â&6öÖ&B"Â'6Æ6†–ær%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%6÷VÂöbF†R7F÷&Òv–çB"ÀĞ¢$–æ7&V6R‡—6–6Â&–Æ—G’Â&W6—7BF‡VæFW"ÂæB7W'&÷VæB–÷W'6VÆbv—F‚7F÷&ÒW&â"ÀĞ¢$–æ7&V6R7G&VæwF‚Â6öç7F—GWF–öâÂ÷"v—6FöÒ'’Âv–âF‡VæFW"&W6—7Fæ6RÂæBW6RÆ–Ö—FVB&öçW27F–öâW&F†BF—7'WG2æV&'’GF6·2æB6Æ÷w2VæVÖ–W2â"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢&ÆWfVÂ"ÂÖ–æ–×VÓ¢BÒÂ²G—S¢&fVD6†ö–6R"ÂfVD–C¢'7G&–¶RÖöb×F†RÖv–çG2"Â6†ö–6T–C¢&v–çB×7G&–¶R"ÂfÇVW3¢²%7F÷&Ò7G&–¶R%ÒÕÒÀĞ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ"Â%v—6FöÒ%Ò’Â²G—S¢&FÖvU&W6—7Fæ6R"ÂFÖvUG—S¢'F‡VæFW""ÒÂ&W6÷W&6R‚&ÖVÇ7G&öÒÖW&"Â$ÖVÇ7G&öÒW&"Â'&öf–6–Væ7”&öçW2"’Â7W7FöÒ‚&ÖVÇ7G&öÒÖW&×'VÆR"Â$&öçW27F–öâ7&VFW2Öfö÷BW&f÷"Ö–çWFS²æV&'’7&VGW&W26fRFòfö–BGF6²F—6GfçFvRæB†ÇfVB7VVBVçF–ÂæW‡BGW&ââ"•ÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6RæBW&6fR&–Æ—G’"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ"Â%v—6FöÒ%Ò•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â&v–çB"Â'F‡VæFW""Â&W&%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%7VÆÂ6æ—W""ÀĞ¢$ÆV&ââGF6²6çG&—æBÖ¶R&ævVB7VÆÂGF6·2F‡&÷Vv‚&ævRæB6÷fW"VæÇF–W2â"ÀĞ¢$F÷V&ÆRF†R&ævRöbGF6²×&öÆÂ7VÆÇ2Â–væ÷&R†ÆbæBF‡&VR×V'FW'26÷fW"v—F‚&ævVB7VÆÂGF6·2ÂæBÆV&âöæRGF6²6çG&—g&öÒâVÆ–v–&ÆR6Æ72Æ—7Bâ"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢'7VÆÆ67F–ær"ÕÒÀĞ¢VffV7G3¢¶7W7FöÒ‚'7VÆÂ×6æ—W"×&ævR"Â$F÷V&ÆRF†R&ævRöb7VÆÇ2F†B&WV—&RâGF6²&öÆÂâ"’Â7W7FöÒ‚'7VÆÂ×6æ—W"Ö6÷fW""Â%&ævVB7VÆÂGF6·2–væ÷&R†ÆbæBF‡&VR×V'FW'26÷fW"â"’Â²G—S¢'7VÆÄ6†ö–6R"Â6çG&—3¢ÂGF6µ&öÆÄöæÇ“¢G'VRÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&6çG&—Ö6Æ72"Â$6çG&—6Æ72"Â&6Æ72"Â²$&&B"Â$6ÆW&–2"Â$G'V–B"Â%6÷&6W&W""Â%v&Æö6²"Â%v—¦&B%Ò’Â6†ö–6R‚&GF6²Ö6çG&—"Â$GF6²×&öÆÂ6çG&—"Â'7VÆÂ"ÂµÒÂ²ÆWfVÇ3¢³ÒÂGF6µ&öÆÄöæÇ“¢G'VRÂ6Æ746†ö–6T–C¢&6çG&—Ö6Æ72"ÂEv–ÆÃ¢G'VRÒ•ÒÀ¢Fw3¢²'7VÆÆ67F–ær"Â'&ævVB%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%7V—&Röb6öÆÖæ–"ÀĞ¢$v–â&VÆ–&ÆRÖ÷VçFVBÖ÷fVÖVçBæBÆ–Ö—FVBGfçFvVBvVöâ7G&–¶Râ"ÀĞ¢$Ö÷VçF–ær÷"F—6Ö÷VçF–ær6÷7G2öæÇ’RfVWBâ&öf–6–Væ7’ÖÆ–Ö—FVBvVöâGF6²v–ç2GfçFvRæBFVÇ2C‚W‡G&FÖvRöâ†—C²Ö—72FöW2æ÷B7VæBF†RW6Râ"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢&6Æ74÷$&6¶w&÷VæB"Â6Æ74–G3¢²&f–v‡FW""Â'ÆF–â%ÒÂ&6¶w&÷VæD–G3¢²&¶æ–v‡BÖöb×6öÆÖæ–%ÒÒÂ²G—S¢'6WGF–ær"Â6WGF–æs¢$G&vöæÆæ6R"ÕÒÀĞ¢VffV7G3¢¶7W7FöÒ‚'7V—&RÖÖ÷VçB"Â$Ö÷VçF–ær÷"F—6Ö÷VçF–ær6÷7G2RfVWBöbÖ÷fVÖVçBâ"’Â&W6÷W&6R‚'&V6—6R×7G&–¶R"Â%&V6—6R7G&–¶R"Â'&öf–6–Væ7”&öçW2"’Â7W7FöÒ‚'&V6—6R×7G&–¶R×'VÆR"Â$&Vf÷&RvVöâGF6²Â7VæBW6Rf÷"GfçFvS²†—BFG2C‚FÖvRÂv†–ÆRÖ—72&W6W'fW2F†RW6Râ"•ÒÀĞ¢Fw3¢²&G&vöæÆæ6R"Â&6öÖ&B"Â&Ö÷VçFVB%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%7VBæ–Ö&ÆVæW72"ÀĞ¢$–×&÷fR7G&VæwF‚÷"FW‡FW&—G’ÂÖ÷fRf7FW"ÂæBW66Rw&ÆW2Ö÷&RV6–Ç’â"ÀĞ¢$–æ7&V6R7G&VæwF‚÷"FW‡FW&—G’'’Â–æ7&V6RvÆ¶–ær7VVB'’RfVWBÂv–âF†ÆWF–72÷"7&ö&F–72&öf–6–Væ7’ÂæBv–âGfçFvRFòW66Rw&ÆW2â"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢'7V6–W56—¦T÷%7V6–W2"Â6—¦W3¢²%6ÖÆÂ%ÒÂ7V6–W4–G3¢²&Gv&b%ÒÕÒÀĞ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò’Â²G—S¢'7VVD&öçW2"ÂfÇVS¢RÒÂ²G—S¢'&öf–6–Væ7”6†ö–6R"Â6†ö÷6S¢Â6FVv÷&–W3¢²'6¶–ÆÂ%ÒÂ÷F–öç3¢²$F†ÆWF–72"Â$7&ö&F–72%ÒÒÂ7W7FöÒ‚'7VBÖæ–Ö&ÆVæW72ÖW66R"Â$GfçFvRöâF†ÆWF–72÷"7&ö&F–726†V6·2ÖFRFòW66Rw&ÆRâ"•ÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò’Â6†ö–6R‚'6¶–ÆÂ"Â%6¶–ÆÂ&öf–6–Væ7’"Â'6¶–ÆÂ"Â²$F†ÆWF–72"Â$7&ö&F–72%Ò•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â&Ö÷fVÖVçB"Â'6¶–ÆÂ%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%7G&–¶RöbF†Rv–çG2"ÀĞ¢$ÆV&âöæRv–çBÖ–ç7—&VB7G&–¶RF†BFG2FÖvRæB&–FW"FòvVöâGF6·2â"ÀĞ¢$6†ö÷6Rv–çBÆ–æVvRâöæ6RW"GW&âÂ&öf–6–Væ7’ÖÆ–Ö—FVBÖVÆVR÷"F‡&÷vâ×vVöâ†—BFVÇ2W‡G&FÖvRæBÆ–W2F†BÆ–æVvRw2VffV7Bâ"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢'vVöå&öf–6–Væ7’"Â6FVv÷&–W3¢²'6–×ÆR"Â&Ö'F–Â%ÒÕÒÀĞ¢VffV7G3¢·&W6÷W&6R‚&v–çB×7G&–¶R"Â$v–çB7G&–¶W2"Â'&öf–6–Væ7”&öçW2"’Â²G—S¢&v–çE7G&–¶R"Â6†ö–6T–C¢&v–çB×7G&–¶R"ÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&v–çB×7G&–¶R"Â$v–çB7G&–¶R"Â&÷F–öâ"Ât”åEõ5E$”´U2•ÒÀĞ¢Fw3¢²&v–çB"Â&6öÖ&B"Â'vVöâ%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%7f—&fæV&Æ–âÖv–2"ÀĞ¢$v–âFVWvæöÖR–ææFRÖv–2–æ6ÇVF–ærB×v–ÆÂæöæFWFV7F–öââ"ÀĞ¢$67BæöæFWFV7F–öâöâ–÷W'6VÆbBv–ÆÂæB67B&Æ–æFæW72öFVfæW72Â&ÇW"ÂæBF—6wV—6R6VÆböæ6RV6‚W"Æöær&W7BW6–ær–çFVÆÆ–vVæ6Râ"ÀĞ¢²&W&WV—6—FW3¢·²G—S¢'7V6–W2"Â7V6–W4–G3¢²&væöÖR%ÒÂ7V'&6T–G3¢²&FVWÖvæöÖR"Â'7f—&fæV&Æ–â%ÒÕÒÂVffV7G3¢·²G—S¢'7VÆÄw&çB"Â7VÆÄ–C¢&æöæFWFV7F–öâ"ÂEv–ÆÃ¢G'VRÂ6VÆdöæÇ“¢G'VRÂ&–Æ—G“¢$–çFVÆÆ–vVæ6R"ÒÂ²G—S¢'7VÆÄw&çB"Â7VÆÄ–G3¢²&&Æ–æFæW72ÖFVfæW72"Â&&ÇW""Â&F—6wV—6R×6VÆb%ÒÂW6W4V6ƒ¢Â&V6†&vS¢&Æöæu&W7B"Â&–Æ—G“¢$–çFVÆÆ–vVæ6R"ÕÒÂFw3¢²'7V6–W2"Â'7VÆÆ67F–ær%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%FfW&â'&vÆW""ÀĞ¢$–×&÷fR7G&VæwF‚÷"6öç7F—GWF–öâæBf–v‡BVffV7F—fVÇ’v—F‚–×&÷f—6VBvVöç2æBw&ÆW2â"ÀĞ¢$–æ7&V6R7G&VæwF‚÷"6öç7F—GWF–öâ'’Âv–â–×&÷f—6VB×vVöâ&öf–6–Væ7’Â–×&÷fRVæ&ÖVBFÖvRÂæBGFV×Bw&ÆR2&öçW27F–öâgFW"†—Bâ"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ%Ò’Â²G—S¢'vVöå&öf–6–Væ7’"ÂfÇVW3¢²$–×&÷f—6VBvVöç2%ÒÒÂ²G—S¢'Væ&ÖVDFÖvR"ÂF–S¢&CB"ÒÂ7W7FöÒ‚'FfW&âÖ'&vÆW"Öw&ÆR"Â$gFW"†—GF–ærv—F‚âVæ&ÖVB7G&–¶R÷"–×&÷f—6VBvVöâÂ&öçW27F–öâGFV×BFòw&ÆRF†RF&vWBâ"•ÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ%Ò•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â&6öÖ&B"Â&w&ÆR%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%FVÆV¶–æWF–2"ÀĞ¢$–×&÷fRÖVçFÂ&–Æ—G’Âv–VÆBâVæ†æ6VBÖvR†æBÂæB6†÷fR7&VGW&W2B&ævRâ"ÀĞ¢$–æ7&V6R–çFVÆÆ–vVæ6RÂv—6FöÒÂ÷"6†&—6Ö'’Âv–ââ–çf—6–&ÆRW‡FVæFVBÖvR†æBÂæBW6R&öçW27F–öâFòFVÆV¶–æWF–6ÆÇ’W6‚÷"VÆÂæV&'’7&VGW&Râ"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"ÂÔTåDÅô$”Ä•D”U2’Â²G—S¢'7VÆÄw&çB"Â7VÆÄ–C¢&ÖvRÖ†æB"Â&–Æ—G”6†ö–6T–C¢&&–Æ—G’"ÂEv–ÆÃ¢G'VRÂ–çf—6–&ÆS¢G'VRÂ&ævT&öçW3¢3ÒÂ7W7FöÒ‚'FVÆV¶–æWF–2×6†÷fR"Â$&öçW27F–öâf÷&6W27G&VæwF‚6fRFòÖ÷fRf—6–&ÆR7&VGW&Rv—F†–â3fVWBRfVWBF÷v&B÷"v’g&öÒ–÷Râ"•ÒÀ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6RæB6fR&–Æ—G’"Â&&–Æ—G’"ÂÔTåDÅô$”Ä•D”U2•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â'7VÆÆ67F–ær"Â&Ö÷fVÖVçB%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%FVÆWF†–2"ÀĞ¢$–×&÷fRÖVçFÂ&–Æ—G’Â7V²FVÆWF†–6ÆÇ’ÂæB67BFWFV7BF†÷Vv‡G2â"ÀĞ¢$–æ7&V6R–çFVÆÆ–vVæ6RÂv—6FöÒÂ÷"6†&—6Ö'’Â6öÖ×Væ–6FRöæR×v’FVÆWF†–6ÆÇ’v—F†–âcfVWBÂæB67BFWFV7BF†÷Vv‡G2öæ6RW"Æöær&W7B÷"v—F‚6Æ÷G2â"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"ÂÔTåDÅô$”Ä•D”U2’Â²G—S¢'FVÆWF‡’"Â&ævS¢cÂ&W7öç6U&WV—&VE6†&VDÆæwVvS¢G'VRÒÂ²G—S¢'7VÆÄw&çB"Â7VÆÄ–C¢&FWFV7B×F†÷Vv‡G2"ÂW6W3¢Â&V6†&vS¢&Æöæu&W7B"Â&–Æ—G”6†ö–6T–C¢&&–Æ—G’"Â6åW6U7VÆÅ6Æ÷G3¢G'VRÂæô6ö×öæVçG3¢G'VRÕÒÀ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6RæB7VÆÆ67F–ær&–Æ—G’"Â&&–Æ—G’"ÂÔTåDÅô$”Ä•D”U2•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â'7VÆÆ67F–ær"Â'FVÆWF‡’%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%F÷Vv‚"ÀĞ¢$v–â"Ö†–×VÒ†—Bö–çG2f÷"WfW'’6†&7FW"ÆWfVÂâ"ÀĞ¢$Ö†–×VÒ†—Bö–çG2–æ7&V6R'’Gv–6R–÷W"7W'&VçB6†&7FW"ÆWfVÂæB'’"v†VæWfW"–÷Rv–âæ÷F†W"ÆWfVÂâ"ÀĞ¢²VffV7G3¢·²G—S¢&‡&öçW2"ÂW$ÆWfVÃ¢"ÕÒÂFw3¢²&†—B×ö–çG2"Â&GW&&–Æ—G’%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%f–v÷"öbF†R†–ÆÂv–çB"ÀĞ¢$–æ7&V6R‡—6–6Â&–Æ—G’Â–×&÷fR†VÆ–ærÂæB&W6—7Bf÷&6VBÖ÷fVÖVçB÷"&V–ær¶æö6¶VBF÷vââ"ÀĞ¢$–æ7&V6R7G&VæwF‚Â6öç7F—GWF–öâÂ÷"v—6FöÒ'’â†VÆ–ærg&öÒ7VÆÇ2÷"†—BF–6Rv–ç2&öf–6–Væ7’&öçW2ÂæB&V7F–öâ6â&W6—7Bf÷&6VBÖ÷fVÖVçB÷"&V–ær¶æö6¶VB&öæRâ"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢&ÆWfVÂ"ÂÖ–æ–×VÓ¢BÒÂ²G—S¢&fVD6†ö–6R"ÂfVD–C¢'7G&–¶RÖöb×F†RÖv–çG2"Â6†ö–6T–C¢&v–çB×7G&–¶R"ÂfÇVW3¢²$†–ÆÂ7G&–¶R%ÒÕÒÀĞ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ"Â%v—6FöÒ%Ò’Â²G—S¢&†VÆ–æt&öçW2"ÂfÇVS¢'&öf–6–Væ7”&öçW2"Â6÷W&6W3¢²'7VÆÂ"Â&†—DF–R%ÒÒÂ7W7FöÒ‚&'VÇv&²×&V7F–öâ"Â%&V7F–öâgFW"f÷&6VBÖ÷fVÖVçB÷"&V–ær¶æö6¶VB&öæR&WfVçG2F†RÖ÷fVÖVçB÷"&öæR6öæF—F–öââ"•ÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$6öç7F—GWF–öâ"Â%v—6FöÒ%Ò•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â&v–çB"Â&†VÆ–ær"Â'&V7F–öâ%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%v"67FW""ÀĞ¢$Ö–çF–â6öæ6VçG&F–öâæB67BVffV7F—fVÇ’v†–ÆR&ÖVB–â6Æ÷6R6öÖ&Bâ"ÀĞ¢$v–âGfçFvRöâ6öæ6VçG&F–öâ6fW2ÂW&f÷&Ò6öÖF–26ö×öæVçG2v—F‚ö67W–VB†æG2ÂæB&WÆ6Râ÷÷'GVæ—G’GF6²v—F‚VÆ–g––æröæR×F&vWB7VÆÂâ"ÀĞ¢²&W&WV—6—FW3¢·²G—S¢'7VÆÆ67F–ær"ÕÒÂVffV7G3¢¶7W7FöÒ‚'v"Ö67FW"Ö6öæ6VçG&F–öâ"Â$GfçFvRöâ6öç7F—GWF–öâ6fW2FòÖ–çF–â6öæ6VçG&F–öâgFW"FÖvRâ"’Â7W7FöÒ‚'v"Ö67FW"Ö6ö×öæVçG2"Â%W&f÷&Ò6öÖF–27VÆÂ6ö×öæVçG2v†–ÆR†æG2†öÆBvVöç2÷"6†–VÆBâ"’Â7W7FöÒ‚'v"Ö67FW"Ö÷÷'GVæ—G’×7VÆÂ"Â%&V7F–öâ67G2öæRÖ7F–öâÂöæR×F&vWB7VÆÂ–ç7FVBöbâ÷÷'GVæ—G’GF6²â"•ÒÂFw3¢²'7VÆÆ67F–ær"Â&6öÖ&B"Â&6öæ6VçG&F–öâ%ÒĞĞ¢’ÀĞ¢'VÆR€Ğ¢%vVöâÖ7FW""ÀĞ¢$–×&÷fR7G&VæwF‚÷"FW‡FW&—G’æBv–â&öf–6–Væ7’v—F‚f÷W"vVöç2â"ÀĞ¢$–æ7&V6R7G&VæwF‚÷"FW‡FW&—G’'’æB6†ö÷6Rf÷W"6–×ÆR÷"Ö'F–ÂvVöç2v—F‚v†–6‚Fòv–â&öf–6–Væ7’â"ÀĞ¢°Ğ¢VffV7G3¢¶&–Æ—G”6†ö–6R‚&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò’Â²G—S¢'&öf–6–Væ7”6†ö–6R"Â6†ö÷6S¢BÂ6FVv÷&–W3¢²'vVöâ%ÒÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&&–Æ—G’"Â$&–Æ—G’–æ7&V6R"Â&&–Æ—G’"Â²%7G&VæwF‚"Â$FW‡FW&—G’%Ò’Â6†ö–6R‚'vVöç2"Â%vVöâ&öf–6–Væ6–W2"Â'vVöâ"ÂµÒÂ²6†ö÷6S¢BÒ•ÒÀĞ¢Fw3¢²&†ÆbÖfVB"Â'vVöâ"Â'&öf–6–Væ7’%ĞĞ¢ĞĞ¢’ÀĞ¢'VÆR€Ğ¢%vööBVÆbÖv–2"ÀĞ¢$ÆV&âöæRG'V–B6çG&—æB67BÆöæw7G&–FW"æB72v—F†÷WBG&6Râ"ÀĞ¢%W6Rv—6FöÒFòÆV&âöæRG'V–B6çG&—æB67BÆöæw7G&–FW"æB72v—F†÷WBG&6Röæ6RV6‚W"Æöær&W7Bâ"ÀĞ¢°Ğ¢&W&WV—6—FW3¢·²G—S¢'7V6–W2"Â7V6–W4–G3¢²&VÆb%ÒÂ7V'&6T–G3¢²'vööBÖVÆb%ÒÕÒÀĞ¢VffV7G3¢·²G—S¢'7VÆÄ6†ö–6R"Â6Æ74–C¢&G'V–B"Â6çG&—3¢Â&–Æ—G“¢%v—6FöÒ"ÒÂ²G—S¢'7VÆÄw&çB"Â7VÆÄ–G3¢²&Æöæw7G&–FW""Â'72×v—F†÷WB×G&6R%ÒÂW6W4V6ƒ¢Â&V6†&vS¢&Æöæu&W7B"Â&–Æ—G“¢%v—6FöÒ"ÕÒÀĞ¢6†ö–6W3¢¶6†ö–6R‚&6çG&—"Â$G'V–B6çG&—"Â'7VÆÂ"ÂµÒÂ²6Æ74–C¢&G'V–B"ÂÆWfVÇ3¢³ÒÂ&–Æ—G“¢%v—6FöÒ"ÂEv–ÆÃ¢G'VRÒ•ÒÀ¢Fw3¢²'7V6–W2"Â'7VÆÆ67F–ær"Â'7FVÇF‚%ĞĞ¢ĞĞ¢Ğ¥Ò“°Ğ Ğ¦W‡÷'BFVfVÇBDTdTÅEôdTEõ%TÄU3°Ğ