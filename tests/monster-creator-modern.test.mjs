import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMonsterRecord } from "../monsters/creator.js";
import { formatMonsterNamedEntries, parseMonsterNamedEntries, stableMonsterActionId } from "../monsters/entryEditor.js";
import { formatMonsterModifier, monsterAbilityModifier } from "../monsters/monsterMath.js";
import {
  getMonsterMathRecommendations,
  monsterProficiencyBonus
} from "../monsters/monsterMath.js";
import {
  buildMonsterAttackDescription,
  normalizeMonsterAttack
} from "../monsters/attackBuilder.js";
import { normalizeMonsterSpellcasting } from "../monsters/spellcastingEditor.js";

test("legacy monster entry lines remain backward compatible", () => {
  const entries = parseMonsterNamedEntries("Multiattack | Makes two attacks.\nBite | Melee Weapon Attack.\nRoar");
  assert.deepEqual(entries, [
    { name: "Multiattack", description: "Makes two attacks." },
    { name: "Bite", description: "Melee Weapon Attack." },
    { name: "Roar", description: "" }
  ]);
  assert.equal(formatMonsterNamedEntries(entries), "Multiattack | Makes two attacks.\nBite | Melee Weapon Attack.\nRoar");
});

test("existing saved monsters retain action IDs, animation references and multiattack sequences", () => {
  const saved = normalizeMonsterRecord({
    id: "monster-77",
    name: "Clockwork Hydra",
    actions: [
      { id: "multi", name: "Multiattack", description: "Makes two Bite attacks.", sequence: [{ actionId: "bite", count: 2 }] },
      { id: "bite", name: "Bite", description: "Melee Weapon Attack." }
    ],
    actionAnimations: {
      multi: { animation: { family: "melee", stages: { impact: "slash" } }, sequence: [{ actionId: "bite", count: 2 }] },
      bite: { animation: { family: "melee", stages: { impact: "bite-impact" } } }
    }
  });
  assert.equal(saved.id, "monster-77");
  assert.deepEqual(saved.actions.map(action => action.id), ["multi", "bite"]);
  assert.deepEqual(saved.actions[0].sequence, [{ actionId: "bite", count: 2 }]);
  assert.equal(saved.actionAnimations.bite.animation.stages.impact, "bite-impact");
  assert.deepEqual(saved.actionAnimations.multi.sequence, [{ actionId: "bite", count: 2 }]);
});

test("ability modifiers use standard monster stat-block math", () => {
  assert.equal(monsterAbilityModifier(1), -5);
  assert.equal(monsterAbilityModifier(10), 0);
  assert.equal(monsterAbilityModifier(18), 4);
  assert.equal(formatMonsterModifier(18), "+4");
  assert.equal(formatMonsterModifier(7), "-2");
  assert.equal(stableMonsterActionId("legendaryActions", "Tail Swipe", 2), "monster-action-legendaryactions-tail-swipe-2");
});

test("structured attacks generate readable text while retaining manual-compatible metadata", () => {
  const melee = normalizeMonsterAttack({
    type: "Melee Weapon Attack",
    attackBonus: 7,
    reach: "10 ft.",
    targetCount: 2,
    damageDice: "2d8",
    damageBonus: 4,
    damageType: "slashing",
    secondaryDamage: "1d6 fire damage",
    recharge: "5–6",
    legendaryCost: 2,
    autoDescription: true
  });
  assert.equal(
    buildMonsterAttackDescription(melee),
    "Melee Weapon Attack: +7 to hit, reach 10 ft., 2 targets. Hit: 2d8 + 4 slashing damage, plus 1d6 fire damage."
  );
  const saved = normalizeMonsterRecord({
    actions: [{ id: "sweep", name: "Flame Sweep", description: "Custom wording.", attack: melee }]
  });
  assert.equal(saved.actions[0].description, "Custom wording.");
  assert.equal(saved.actions[0].attack.recharge, "5–6");
  assert.equal(saved.actions[0].attack.legendaryCost, 2);
});

test("monster spellcasting stores stable lightweight references for every usage mode", () => {
  const spellcasting = normalizeMonsterSpellcasting({
    enabled: true,
    ability: "cha",
    saveDc: 17,
    attackBonus: 9,
    casterLevel: 12,
    spells: [
      { id: "ref-fireball", source: "library", sourceId: "spell-fireball", name: "Fireball", usage: "slot", level: 3, slots: 3, description: "must not copy" },
      { id: "ref-hex", source: "custom", sourceId: "homebrew-hex", name: "Ashen Hex", usage: "daily", uses: 2, damage: "must not copy" },
      { id: "ref-spark", sourceId: "spark", name: "Spark", usage: "atWill" },
      { id: "ref-sense", sourceId: "sense", name: "Sense Magic", usage: "innate" }
    ]
  });
  assert.deepEqual(spellcasting.spells.map(({ sourceId, usage }) => ({ sourceId, usage })), [
    { sourceId: "spell-fireball", usage: "slot" },
    { sourceId: "homebrew-hex", usage: "daily" },
    { sourceId: "spark", usage: "atWill" },
    { sourceId: "sense", usage: "innate" }
  ]);
  assert.equal("description" in spellcasting.spells[0], false);
  assert.equal("damage" in spellcasting.spells[1], false);
});

test("CR helpers recommend numbers without mutating the monster", () => {
  const monster = { cr: "13", hp: 999, abilities: { str: 22, dex: 10, con: 18, int: 8, wis: 14, cha: 16 } };
  const before = structuredClone(monster);
  const guidance = getMonsterMathRecommendations(monster);
  assert.equal(monsterProficiencyBonus("1/2"), 2);
  assert.equal(monsterProficiencyBonus(13), 5);
  assert.equal(guidance.averageHp, 258);
  assert.deepEqual(guidance.hpRange, [251, 265]);
  assert.equal(guidance.expectedAttackBonus, 8);
  assert.equal(guidance.expectedSaveDc, 18);
  assert.equal(guidance.saveModifiers.str, 11);
  assert.deepEqual(monster, before);
});
