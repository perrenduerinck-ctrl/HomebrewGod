import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMonsterRecord } from "../monsters/creator.js";
import { formatMonsterNamedEntries, parseMonsterNamedEntries, stableMonsterActionId } from "../monsters/entryEditor.js";
import { formatMonsterModifier, monsterAbilityModifier } from "../monsters/monsterMath.js";

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
