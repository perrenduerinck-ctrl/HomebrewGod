import test from "node:test";
import assert from "node:assert/strict";
import { applyConfirmedSpellCast, getCharacterSpellSlotOptions } from "../combat/characterCombatCommands.js";
import { applyConfirmedMonsterSpellCast, getMonsterSpellAvailability, restoreMonsterSpellResources } from "../combat/monsterSpellcasting.js";
import { normalizeMonsterSpellcasting } from "../monsters/spellcastingEditor.js";
import { getActionAvailability } from "../combat/actionIconRegistry.js";
import { SPELL_SOURCE_MODEL_VERSION } from "../characterCreator/spellSources.js";

const spell = { id: "shared", name: "Shared spell", level: 1, castingTime: "1 action", known: true, prepared: true };
const source = (id, classId, state = { known: true }) => ({ sourceId: id, sourceType: "class", classId, selectedSpellIds: [spell.id], spellStates: { [spell.id]: state } });
const character = (...sources) => ({ magic: { spellSourceModelVersion: SPELL_SOURCE_MODEL_VERSION, spellSources: sources, slots: { 1: 1 }, pactMagicSources: [{ classEntryId: "pact", slots: 1, slotLevel: 1 }] } });

test("stale client cannot confirm a removed or unprepared spell, including cantrips", () => {
  for (const level of [0, 1]) {
    const definition = { ...spell, level };
    const original = character(source("wizard", "wizard", { prepared: true }));
    const selection = getCharacterSpellSlotOptions(original, definition)[0];
    const remote = structuredClone(original);
    remote.magic.spellSources = [];
    assert.throws(() => applyConfirmedSpellCast(remote, definition, selection), /no longer available/i);
    assert.equal(remote.magic.slotUsage, undefined);
  }
  const original = character(source("wizard", "wizard", { prepared: true, spellbook: true }));
  const selection = getCharacterSpellSlotOptions(original, spell)[0];
  original.magic.spellSources[0].spellStates.shared.prepared = false;
  assert.throws(() => applyConfirmedSpellCast(original, spell, selection), /no longer available/i);
});

test("each multiclass source needs its own permission; Wizard spellbook retains ritual exception", () => {
  const caster = character(source("wizard", "wizard", { spellbook: true }), source("cleric", "cleric", { prepared: true }), source("sorcerer", "sorcerer"), source("warlock", "warlock"));
  const options = getCharacterSpellSlotOptions(caster, { ...spell, ritual: true });
  assert.deepEqual([...new Set(options.filter((option) => option.kind !== "ritual").map((option) => option.castingSourceId))].sort(), ["cleric", "sorcerer", "warlock"]);
  assert(options.some((option) => option.kind === "ritual" && option.castingSourceId === "wizard"));
  for (const id of ["cleric", "sorcerer", "warlock"]) assert(options.some((option) => option.kind === "pact" && option.castingSourceId === id));
});

test("a class cannot spend a feat's free cast; forbidden slot use is rejected at confirmation", () => {
  const feat = { sourceId: "feat", sourceType: "feat", selectedSpellIds: [spell.id], canUseSpellSlots: false, spellRecords: [{ spellId: spell.id, maximumUses: 1, currentUses: 1, canUseSpellSlots: false }] };
  const caster = character(source("sorcerer", "sorcerer"), feat);
  const options = getCharacterSpellSlotOptions(caster, spell);
  assert.equal(options.filter((option) => option.kind === "special").length, 1);
  assert.equal(options.find((option) => option.kind === "special").castingSourceId, "feat");
  assert(!options.some((option) => ["normal", "pact"].includes(option.kind) && option.castingSourceId === "feat"));
  assert.throws(() => applyConfirmedSpellCast(caster, spell, { kind: "special", level: 1, sourceId: "feat", castingSourceId: "sorcerer" }), /no longer available/i);
  assert.throws(() => applyConfirmedSpellCast(caster, spell, { kind: "pact", level: 1, sourceId: "pact", castingSourceId: "feat" }), /no longer available/i);
  const cast = applyConfirmedSpellCast(caster, spell, options.find((option) => option.kind === "special"));
  assert.equal(cast.magic.spellSources.find((entry) => entry.sourceId === "feat").spellRecords[0].currentUses, 0);
});

test("removed manual overrides cannot be smuggled in from an earlier spell object", () => {
  const caster = character({ sourceId: "custom", sourceType: "custom-spell", selectedSpellIds: [spell.id], spellRecords: [{ spellId: spell.id, manualOverride: true }], canUseSpellSlots: true });
  const stale = { ...spell, manualOverride: true };
  const selection = getCharacterSpellSlotOptions(caster, stale)[0];
  caster.magic.spellSources[0].spellRecords[0].manualOverride = false;
  assert.throws(() => applyConfirmedSpellCast(caster, stale, selection), /no longer available/i);
});

const monster = () => ({ spellcasting: { spells: [
  { id: "fire", sourceId: "fireball", name: "Fireball", level: 3, usage: "slot", slots: 1 },
  { id: "counter", sourceId: "counterspell", name: "Counterspell", level: 3, usage: "slot", slots: 1 },
  { id: "innate", sourceId: "fireball", name: "Fireball", level: 3, usage: "daily", uses: 1 }
] } });

test("different monster spells spend the same final slot and recover only on long rest", () => {
  const original = monster();
  const cast = applyConfirmedMonsterSpellCast(original, { id: "fire" });
  assert.equal(getMonsterSpellAvailability(cast, { id: "counter" }).available, false);
  assert.throws(() => applyConfirmedMonsterSpellCast(cast, { id: "counter" }), /No monster spell slots/i);
  assert.equal(getMonsterSpellAvailability(cast, { id: "innate" }).available, true);
  assert.equal(getMonsterSpellAvailability(restoreMonsterSpellResources(cast, "short"), { id: "counter" }).available, false);
  assert.equal(getMonsterSpellAvailability(restoreMonsterSpellResources(cast, "long"), { id: "counter" }).remaining, 1);
  assert.equal(getMonsterSpellAvailability(JSON.parse(JSON.stringify(cast)), { id: "counter" }).remaining, 0);
});

test("monster upcasting charges only the chosen level pool", () => {
  const caster = monster();
  caster.spellcasting.slotPools = { 3: { maximum: 0, used: 0 }, 4: { maximum: 1, used: 0 } };
  const cast = applyConfirmedMonsterSpellCast(caster, { id: "fire" }, {}, { level: 4 });
  assert.deepEqual(cast.spellcasting.slotPools[4], { maximum: 1, used: 1 });
  assert.throws(() => applyConfirmedMonsterSpellCast(caster, { id: "fire" }, {}, { level: 2 }), /No monster spell slots/i);
});

test("monster entry IDs win over spell IDs and ambiguous fallback is rejected", () => {
  const caster = monster();
  const cast = applyConfirmedMonsterSpellCast(caster, { id: "innate", sourceId: "fireball" });
  assert.equal(getMonsterSpellAvailability(cast, { id: "fire" }).remaining, 1);
  assert.equal(getMonsterSpellAvailability(cast, { id: "innate" }).remaining, 0);
  assert.equal(getMonsterSpellAvailability(caster, { sourceId: "fireball" }).available, false);
  assert.equal(getMonsterSpellAvailability(caster, { id: "removed", sourceId: "fireball" }).available, false);
  assert.equal(getMonsterSpellAvailability(caster, { sourceId: "counterspell" }).available, false);
  delete caster.spellcasting.spells[1].id;
  assert.equal(getMonsterSpellAvailability(caster, { sourceId: "counterspell" }).available, true);
});

test("legacy pool migration is idempotent, preserves references, and does not mint slots", () => {
  const legacy = monster().spellcasting;
  legacy.spells[0].slotsUsed = 1;
  const normalized = normalizeMonsterSpellcasting(legacy);
  assert.deepEqual(normalized.slotPools[3], { maximum: 1, used: 1 });
  assert.deepEqual(normalizeMonsterSpellcasting(normalized), normalized);
  assert.equal(normalized.spells.length, 3);
});

test("combat availability excludes ritual-only and longer casts before clicking", () => {
  const action = { kind: "spell", raw: { ...spell, castingTime: "1 minute" } };
  assert.match(getActionAvailability({ action }).reason, /more than one action/i);
  assert.equal(getActionAvailability({ action: { ...action, raw: spell }, spellSlotOptions: [{ kind: "ritual", remaining: 1 }] }).available, false);
  assert.equal(getActionAvailability({ action: { ...action, raw: spell }, spellSlotOptions: [{ kind: "normal", remaining: 1 }] }).available, true);
  assert.equal(getActionAvailability({ action, inCombat: false, spellSlotOptions: [{ kind: "ritual", remaining: 1 }] }).available, false);
});

test("monster concentration responds to damage, failed saves, incapacitation, and manual ending", async () => {
  const { applyMonsterConcentrationEvent } = await import("../combat/monsterSpellcasting.js");
  const original = applyConfirmedMonsterSpellCast(monster(), { id: "innate" }, { id: "hold-person", name: "Hold Person", concentration: true });
  const damaged = applyMonsterConcentrationEvent(original, { type: "damage", amount: 26, currentHp: 10 });
  assert.equal(damaged.spellcasting.pendingConcentrationCheck.dc, 13);
  assert.equal(applyMonsterConcentrationEvent(damaged, { type: "save", total: 13 }).spellcasting.concentration.spellId, "hold-person");
  assert.equal(applyMonsterConcentrationEvent(damaged, { type: "save", total: 12 }).spellcasting.concentration, null);
  assert.equal(applyMonsterConcentrationEvent(original, { type: "damage", amount: 1, currentHp: 0 }).spellcasting.concentration, null);
  assert.equal(applyMonsterConcentrationEvent(original, { type: "condition", condition: "Stunned" }).spellcasting.concentration, null);
  assert.equal(applyMonsterConcentrationEvent(original, { type: "condition", condition: "Restrained" }).spellcasting.concentration.spellId, "hold-person");
  assert.equal(applyMonsterConcentrationEvent(original, { type: "end" }).spellcasting.concentration, null);
  assert.equal(normalizeMonsterSpellcasting(JSON.parse(JSON.stringify(damaged.spellcasting))).pendingConcentrationCheck.dc, 13);
});

test("object spells use object-only targeting while special ranges stay manual", async () => {
  const { createSpellTemplateInstruction } = await import("../battleMap/spellTemplates.js");
  const { createSpellTargetingData } = await import("../data/spellTargeting.js");
  assert.match(createSpellTemplateInstruction({ range: "Special" }).reason, /manually with the DM/i);
  const targeting = structuredClone(createSpellTargetingData({ range: "60 feet" }));
  targeting.target.type = "object";
  const objectInstruction = createSpellTemplateInstruction({ targeting });
  assert.equal(objectInstruction.supported, true);
  assert.equal(objectInstruction.sourceTargetType, "object");
  assert.match(objectInstruction.manualResolution, /visible map object/);
});

test("custom monster definitions resolve complete saved mechanics without reference-field defaults", async () => {
  const { resolveMonsterSpellDefinition } = await import("../combat/monsterSpellDefinition.js");
  for (const mechanics of [
    { targeting: { area: { shape: "sphere", radius: 20 } } },
    { healing: [{ dice: "2d8 + MOD" }] },
    { damage: [{ dice: "8d6", damageType: "fire" }], animations: { impact: { animationId: "custom-impact" } } },
    { castingTime: "1 reaction", reactionTrigger: "when a creature falls" },
    { concentration: true, effects: [{ type: "condition", condition: "restrained" }] }
  ]) {
    const definition = { id: "custom-spell", name: "Saved spell", level: 3, ...mechanics };
    let loaded;
    const resolved = await resolveMonsterSpellDefinition({ id: "entry", sourceId: "custom-spell", source: "custom", range: "Self" }, {}, { loadSpell: async (id) => { loaded = id; return definition; } });
    assert.equal(loaded, "custom-spell");
    assert.deepEqual(resolved, definition);
    assert.equal(resolved.range, undefined);
  }
  await assert.rejects(resolveMonsterSpellDefinition({ sourceId: "deleted", source: "custom" }, {}, { loadSpell: async () => { throw new Error("deleted"); } }), /missing or inaccessible.*repair/i);
});

test("long casting times cannot be relabeled as single actions or free actions", async () => {
  const { getSpellActionKind, getSpellActionResource } = await import("../spells/spellCastingRules.js");
  const longCast = { castingTime: "1 minute", actionKind: "action" };
  assert.equal(getSpellActionKind(longCast), "long-cast");
  assert.equal(getSpellActionResource(longCast), "action");
});

test("unprepared multiclass sources explain why they are unavailable without becoming slot choices", async () => {
  const { getCharacterSpellcastingSourceOptions } = await import("../combat/characterCombatCommands.js");
  const { buildActionTooltip } = await import("../combat/actionIconRegistry.js");
  const caster = character(source("wizard", "wizard", { spellbook: true }), source("cleric", "cleric", { prepared: true }));
  const feedback = getCharacterSpellcastingSourceOptions(caster, spell, { includeUnavailable: true });
  assert.equal(feedback.length, 2);
  assert.match(feedback.find((entry) => entry.sourceId === "wizard").reason, /prepared|Prepare/i);
  assert(!getCharacterSpellSlotOptions(caster, spell).some((option) => option.castingSourceId === "wizard"));
  assert.match(buildActionTooltip({ kind: "spell", raw: spell }, { actor: caster }), /prepared|Prepare/i);
});

test("separate damage sources queue separate concentration saves instead of overwriting the harder save", async () => {
  const { applyMonsterConcentrationEvent } = await import("../combat/monsterSpellcasting.js");
  let actor = { spellcasting: { concentration: { spellId: "blur", spellName: "Blur" } } };
  actor = applyMonsterConcentrationEvent(actor, { type: "damage", amount: 30 });
  actor = applyMonsterConcentrationEvent(actor, { type: "damage", amount: 2 });
  assert.equal(actor.spellcasting.pendingConcentrationCheck.dc, 15);
  assert.equal(actor.spellcasting.pendingConcentrationChecks.length, 2);
  actor = applyMonsterConcentrationEvent(actor, { type: "save", total: 15 });
  assert.equal(actor.spellcasting.pendingConcentrationCheck.dc, 10);
  actor = applyMonsterConcentrationEvent(actor, { type: "save", total: 9 });
  assert.equal(actor.spellcasting.concentration, null);
  assert.deepEqual(actor.spellcasting.pendingConcentrationChecks, []);
  const hero = { combat: { currentHp: 100, maxHp: 100, concentration: { spellId: "blur", spellName: "Blur" } } };
  const { applyGameplayAction } = await import("../characterSheet/gameplayState.js");
  applyGameplayAction(hero, { type: "damage", amount: 30 });
  applyGameplayAction(hero, { type: "damage", amount: 2 });
  assert.equal(hero.combat.pendingConcentrationCheck.dc, 15);
  applyGameplayAction(hero, { type: "resolve-concentration-check", total: 15 });
  assert.equal(hero.combat.pendingConcentrationCheck.dc, 10);
});

test("straight-wall targeting respects its height and does not include flying creatures above it", async () => {
  const { createSpellTemplateInstruction, prepareSpellTemplateGeometry } = await import("../battleMap/spellTemplates.js");
  const { getDefaultSpellById } = await import("../data/defaultSpells.js");
  const { createTemplateGeometry } = await import("../battleMap/templateGeometry.js");
  const { findAffectedTokens } = await import("../battleMap/tokenCollision.js");
  const instruction = createSpellTemplateInstruction(getDefaultSpellById("wall-of-fire"));
  const base = createTemplateGeometry({ shape: "line", anchor: { x: 0, y: 0 }, pointer: { x: 1000, y: 0 }, sizeFeet: 60, widthFeet: 1, pixelsPerSquare: 64, feetPerSquare: 5 });
  const geometry = prepareSpellTemplateGeometry(base, instruction);
  const tokens = [0, 30].map((elevation) => ({ id: `height-${elevation}`, left: 90, top: -5, width: 10, height: 10, elevation }));
  assert.deepEqual(findAffectedTokens(geometry, tokens).map((token) => token.id), ["height-0"]);
  assert.equal(base.verticalBounds, null);
});

test("hotbar distinguishes Rage, ritual-only permission and removed cantrips", () => {
  assert.match(getActionAvailability({ action: { kind: "spell", raw: spell }, actor: { combat: { classFeatureStates: { rageActive: true } } }, spellSlotOptions: [{ kind: "normal", remaining: 1 }] }).reason, /Rage/);
  assert.match(getActionAvailability({ action: { kind: "spell", raw: spell }, spellSlotOptions: [{ kind: "ritual", remaining: 1 }] }).reason, /Only ritual/);
  assert.match(getActionAvailability({ action: { kind: "spell", raw: { ...spell, level: 0 } }, spellSlotOptions: [] }).reason, /cantrip.*no longer known/);
});


test("incapacitation blocks ordinary, bonus and reaction casting without spending resources", async () => {
  const { getSpellcasterBlockReason } = await import("../spells/spellCastingRules.js");
  for (const condition of ["Incapacitated", "PARALYZED", "petrified", "Stunned", "Unconscious", "dead"]) {
    for (const castingTime of ["1 action", "1 bonus action", "1 reaction"]) {
      const cast = { ...spell, castingTime };
      const hero = { ...character(source("sorcerer", "sorcerer")), combat: { currentHp: 20, conditions: [condition] } };
      assert.throws(() => applyConfirmedSpellCast(hero, cast, getCharacterSpellSlotOptions(hero, cast)[0]), /incapacitated/i);
      assert.equal(hero.magic.slotUsage, undefined);
      const mage = { ...monster(), conditions: [{ name: condition }] };
      assert.equal(getMonsterSpellAvailability(mage, { id: "innate" }).available, false);
      assert.throws(() => applyConfirmedMonsterSpellCast(mage, { id: "innate" }, cast), /incapacitated/i);
      assert.equal(getActionAvailability({ action: { kind: "monster-spell", raw: cast }, actor: monster(), token: { conditions: [condition] } }).available, false);
    }
  }
  assert.match(getSpellcasterBlockReason({ combat: { currentHp: 0 } }, { token: { currentHp: 20 } }), /unconscious/i);
  assert.equal(getSpellcasterBlockReason({ combat: { currentHp: 20 } }, { token: { currentHp: 0 } }), "");
  for (const condition of ["restrained", "prone", "blinded", "deafened", "poisoned"]) assert.equal(getSpellcasterBlockReason({ conditions: [condition] }), "");
  assert.equal(getSpellcasterBlockReason({}), "");
});


test("monster reference edits invalidate stale targeting without blocking resource-only updates", () => {
  const original = monster();
  const reference = normalizeMonsterSpellcasting(original.spellcasting).spells[0];
  for (const patch of [{ sourceId: "other-spell" }, { source: "custom" }, { usage: "daily" }, { level: 4 }, { castingTime: "1 reaction" }, { range: "Touch" }]) {
    const latest = structuredClone(original);
    Object.assign(latest.spellcasting.spells[0], patch);
    assert.equal(getMonsterSpellAvailability(latest, reference).available, false);
    assert.throws(() => applyConfirmedMonsterSpellCast(latest, reference), /reference changed/i);
    assert.equal(latest.spellcasting.slotPools, undefined);
  }
  assert.equal(getMonsterSpellAvailability(original, { ...reference, source: "catalog" }).available, true);
  const current = structuredClone(original);
  current.spellcasting.spells[0].name = "Renamed Fireball";
  current.spellcasting.slotPools = { 3: { maximum: 2, used: 1 } };
  assert.equal(getMonsterSpellAvailability(current, reference).available, true);
  assert.equal(applyConfirmedMonsterSpellCast(current, reference).spellcasting.slotPools[3].used, 2);
});

test("missing monster definitions cannot resolve to null or arrays", async () => {
  const { resolveMonsterSpellDefinition } = await import("../combat/monsterSpellDefinition.js");
  for (const invalid of [null, undefined, [], "missing"]) {
    const dependencies = { loadSpell: async () => invalid, getCatalogSpell: () => null };
    await assert.rejects(resolveMonsterSpellDefinition({ source: "custom", sourceId: "missing" }, {}, dependencies), /missing or inaccessible/i);
    await assert.rejects(resolveMonsterSpellDefinition({ source: "library", sourceId: "missing" }, {}, dependencies), /repair its reference/i);
    const catalog = { id: "shield", name: "Shield", level: 1 };
    assert.deepEqual(await resolveMonsterSpellDefinition({ source: "library", sourceId: "shield" }, {}, { ...dependencies, getCatalogSpell: () => catalog }), catalog);
  }
});


test("versioned Library definitions reject edits and deletions while snapshots remain valid", async () => {
  const { assertSpellDefinitionRevision } = await import("../combat/monsterSpellDefinition.js");
  assert.doesNotThrow(() => assertSpellDefinitionRevision({ revision: 3 }, { revision: 3 }));
  assert.throws(() => assertSpellDefinitionRevision({ revision: 3 }, { revision: 4 }), /definition changed/i);
  assert.throws(() => assertSpellDefinitionRevision({ revision: 3 }, null), /deleted/i);
});
