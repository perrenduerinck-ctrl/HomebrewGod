import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, collection, setDoc, deleteDoc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { applyConfirmedSpellCast, getCharacterSpellSlotOptions } from "../combat/characterCombatCommands.js";
import { applyConfirmedMonsterSpellCast } from "../combat/monsterSpellcasting.js";
const ROOM = "SPELL-AUDIT";
let environment;
before(async () => {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "Requires the isolated demo Firestore emulator");
  environment = await initializeTestEnvironment({ projectId: "demo-homebrew-god", firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "rooms", ROOM), { roomCode: ROOM, dmUid: "spell-dm" });
    await setDoc(doc(db, "rooms", ROOM, "players", "spell-player"), { uid: "spell-player", role: "player" });
  });
});
after(async () => { await environment?.cleanup(); });
const client = (uid = "spell-player") => environment.authenticatedContext(uid).firestore();
const spell = { id: "shield", name: "Shield", level: 1, known: true, castingTime: "1 reaction" };
const base = () => ({ roomCode: ROOM, ownerUid: "spell-player", revision: 1, magic: { knownSpellIds: ["shield"], slots: { 1: 1 } } });
async function seed(path, data) {
  await environment.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), ...path), data));
}
async function cast(db, path, mutate) {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, ...path);
    const snapshot = await transaction.get(ref);
    const latest = snapshot.data();
    const next = mutate(latest);
    transaction.set(ref, { ...next, revision: latest.revision + 1 });
  });
}
for (const kind of ["normal", "pact", "special"]) {
  test(`two independent clients can spend the final ${kind} spell resource only once`, async () => {
    const data = base();
    if (kind === "pact") data.magic = { knownSpellIds: ["shield"], pactMagic: { slots: 1, slotLevel: 1 } };
    if (kind === "special") data.magic = { featSources: { feat: { sourceId: "feat", sourceType: "feat", selectedSpellIds: ["shield"], freeCastUses: 1, currentUses: 1 } } };
    const path = ["rooms", ROOM, "characters", kind];
    await seed(path, data);
    const selection = getCharacterSpellSlotOptions(data, spell).find((option) => option.kind === kind);
    assert(selection);
    const results = await Promise.allSettled([client(), client()].map((db) => cast(db, path, (latest) => applyConfirmedSpellCast(latest, spell, selection))));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.match(results.find((result) => result.status === "rejected").reason.message, /no longer available|PERMISSION_DENIED/i);
    await assert.rejects(cast(client(), path, (latest) => applyConfirmedSpellCast(latest, spell, selection)), /no longer available/i);
    const saved = (await getDoc(doc(client(), ...path))).data();
    assert.equal(saved.revision, 2);
  });
}
test("two DM clients contend across different spells for the last shared monster slot", async () => {
  const path = ["rooms", ROOM, "monsters", "mage"];
  await seed(path, { roomCode: ROOM, ownerUid: "spell-dm", revision: 1, spellcasting: { slotPools: { 3: { maximum: 1, used: 0 } }, spells: [
    { id: "fire", sourceId: "fireball", level: 3, usage: "slot" },
    { id: "counter", sourceId: "counterspell", level: 3, usage: "slot" }
  ] } });
  const results = await Promise.allSettled(["fire", "counter"].map((id) => cast(client("spell-dm"), path, (latest) => applyConfirmedMonsterSpellCast(latest, { id }))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const saved = (await getDoc(doc(client("spell-dm"), ...path))).data();
  assert.equal(saved.spellcasting.slotPools[3].used, 1);
});
test("another client removing a spell while targeting makes stale confirmation fail", async () => {
  const path = ["rooms", ROOM, "characters", "removed"];
  const original = base();
  await seed(path, original);
  const selection = getCharacterSpellSlotOptions(original, spell)[0];
  await cast(client(), path, (latest) => ({ ...latest, magic: { ...latest.magic, knownSpellIds: [] } }));
  await assert.rejects(cast(client(), path, (latest) => applyConfirmedSpellCast(latest, spell, selection)), /no longer available/i);
  const saved = (await getDoc(doc(client(), ...path))).data();
  assert.equal(saved.magic.slotUsage, undefined);
  assert.equal(saved.revision, 2);
});

test("two clients cannot advance or complete the same long casting step twice", async () => {
  const { applyLongCastingCommand } = await import("../combat/longCasting.js");
  const definition = { id: "long", name: "Long cast", level: 1, castingTime: "1 minute", range: "Self", known: true };
  const original = { ...base(), magic: { knownSpellIds: ["long"], slots: { 1: 1 } } };
  const context = (round) => ({ roomCode: ROOM, token: { id: "hero" }, room: {}, initiative: { combatActive: true, currentCombatantId: "hero", roundNumber: round, turnCounter: round - 1 } });
  const selection = getCharacterSpellSlotOptions(original, definition)[0];
  const started = applyLongCastingCommand(original, { type: "start", attemptId: "attempt", spell: definition, selection }, context(1));
  const path = ["rooms", ROOM, "characters", "long-casting"];
  await seed(path, started);
  const step = (db, type, round) => cast(db, path, (latest) => applyLongCastingCommand(latest, { type, attemptId: "attempt" }, context(round)));
  const raced = await Promise.allSettled([step(client(), "advance", 2), step(client(), "advance", 2)]);
  assert.equal(raced.filter((result) => result.status === "fulfilled").length, 1);
  for (let round = 3; round <= 10; round += 1) await step(client(), "advance", round);
  const completed = await Promise.allSettled([step(client(), "complete", 10), step(client(), "complete", 10)]);
  assert.equal(completed.filter((result) => result.status === "fulfilled").length, 1);
  const saved = (await getDoc(doc(client(), ...path))).data();
  assert.equal(saved.magic.slotUsage.normal[1], 1);
  assert.equal(saved.combat.longCasting.status, "completed");
});


test("a second client changing a monster resource type invalidates the targeting snapshot", async () => {
  const path = ["rooms", ROOM, "monsters", "changed-reference"];
  const reference = { id: "entry", source: "library", sourceId: "shield", name: "Shield", level: 1, usage: "slot", castingTime: "1 reaction", range: "Self" };
  await seed(path, { roomCode: ROOM, ownerUid: "spell-dm", revision: 1, spellcasting: { enabled: true, slotPools: { 1: { maximum: 1, used: 0 } }, spells: [reference] } });
  await cast(client("spell-dm"), path, (latest) => ({ ...latest, spellcasting: { ...latest.spellcasting, spells: [{ ...reference, usage: "atWill" }] } }));
  await assert.rejects(cast(client("spell-dm"), path, (latest) => applyConfirmedMonsterSpellCast(latest, reference, spell, { level: 1 })), /reference changed/i);
  const saved = (await getDoc(doc(client("spell-dm"), ...path))).data();
  assert.equal(saved.revision, 2);
  assert.equal(saved.spellcasting.slotPools[1].used, 0);
  assert.equal(saved.spellcasting.concentration, undefined);
});


test("map conditions atomically end character and monster concentration off-turn and clear their casting blocks", async () => {
  const { createEffectPersistence } = await import("../effects/effectPersistence.js");
  const { prepareConditionMutation } = await import("../effects/conditionPersistence.js");
  const { getSpellcasterBlockReason } = await import("../spells/spellCastingRules.js");
  for (const kind of ["character", "monster"]) {
    const id = "condition-" + kind;
    const tokenPath = ["rooms", ROOM, "tokens", id];
    const actorPath = ["rooms", ROOM, kind === "character" ? "characters" : "monsters", id];
    const data = kind === "character" ? { ...base(), combat: { maxHp: 20, currentHp: 20, concentration: { spellId: "blur", spellName: "Blur" } } } : { roomCode: ROOM, ownerUid: "spell-dm", revision: 1, spellcasting: { concentration: { spellId: "blur", spellName: "Blur" } } };
    await seed(actorPath, data);
    await seed(tokenPath, { visibility: "shared", [kind === "character" ? "linkedCharacterId" : "linkedMonsterId"]: id });
    const db = client("spell-dm");
    const persistence = createEffectPersistence({ db, doc, collection, setDoc, deleteDoc, serverTimestamp, runTransaction, getUserId: () => "spell-dm", getIsDm: () => true, getRoomId: () => ROOM,
      prepareTargetMutation: (transaction, record, remove) => prepareConditionMutation(transaction, { db, doc, roomCode: ROOM, userUid: "spell-dm", record, remove, serverTimestamp }) });
    const input = { id: id + "-stunned", definitionId: "stunned", name: "Stunned", type: "condition", roomCode: ROOM, targetTokenId: id };
    const effect = await persistence.save(input);
    const actor = (await getDoc(doc(db, ...actorPath))).data();
    const token = (await getDoc(doc(db, ...tokenPath))).data();
    assert.equal((kind === "character" ? actor.combat : actor.spellcasting).concentration, null);
    assert.equal(actor.revision, 2);
    assert.match(getSpellcasterBlockReason(actor, { token, actorKind: kind }), /incapacitated/i);
    const second = await persistence.save({ ...input, id: input.id + "-second" });
    await persistence.remove(effect);
    assert.match(getSpellcasterBlockReason(actor, { token: (await getDoc(doc(db, ...tokenPath))).data(), actorKind: kind }), /incapacitated/i);
    await persistence.remove(second);
    assert.equal(getSpellcasterBlockReason(actor, { token: (await getDoc(doc(db, ...tokenPath))).data(), actorKind: kind }), "");
  }
});

test("editing an independent Library definition blocks a stale monster cast inside its transaction", async () => {
  const { assertSpellDefinitionRevision } = await import("../combat/monsterSpellDefinition.js");
  const definitionPath = ["users", "spell-dm", "spells", "versioned"];
  const actorPath = ["rooms", ROOM, "monsters", "versioned-caster"];
  await seed(definitionPath, { id: "versioned", revision: 2, name: "Changed" });
  await seed(actorPath, { roomCode: ROOM, ownerUid: "spell-dm", revision: 1 });
  const db = client("spell-dm");
  await assert.rejects(runTransaction(db, async (transaction) => {
    const definition = await transaction.get(doc(db, ...definitionPath));
    const actor = await transaction.get(doc(db, ...actorPath));
    assertSpellDefinitionRevision({ revision: 1 }, definition.data());
    transaction.set(doc(db, ...actorPath), { ...actor.data(), revision: 2 });
  }), /definition changed/i);
  assert.equal((await getDoc(doc(db, ...actorPath))).data().revision, 1);
});
