import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { normalizeAnimationDefinition } from "../vfx/animationDefinition.js";
import { createAnimationLibrary, createAnimationBindings } from "../vfx/animationLibrary.js";
import { FAMILY_TEMPLATES, inferAnimationFamily } from "../vfx/animationFamilies.js";
import { normalizeAttackAnimation, attackAnimationToSpellStages, spellStagesToAttackAnimation } from "../vfx/contentAnimationModel.js";
import { getSpellAnimationDependencies, replaceAnimationReferences } from "../vfx/animationReferences.js";
import { createSpellAnimationPresentation } from "../vfx/spellAnimationPresentation.js";
import { createAnimationSpellAdapter } from "../vfx/animationSpellAdapter.js";
import { renderSpellAnimationSection } from "../vfx/spellAnimationSection.js";

const base = { id: "visual", name: "Visual", sprite: "https://example.test/old-sheet.png", grid: { columns: 6, rows: 6 }, tags: ["fire"] };
function fixture() {
  let uid = "a", reject = false;
  const docs = { "users/a": { displayName: "Owner A", spellAnimationOverrides: {} }, "users/b": { displayName: "Owner B" } };
  const writes = [];
  const library = createAnimationLibrary({ builtins: [base] }), bindings = createAnimationBindings({ library });
  library.setContext({ ownerId: uid });
  const options = { db: {}, library, bindings, getUserId: () => uid, doc: (_, ...parts) => parts.join("/"), serverTimestamp: () => "timestamp",
    getDoc: async path => ({ data: () => structuredClone(docs[path]) }),
    setDoc: async (path, data, settings) => {
      if (reject) throw Error("permission denied");
      writes.push({ path, data, settings }); docs[path] ||= {};
      for (const field of settings.mergeFields) {
        const [map, key] = field.split("."); docs[path][map] ||= {}; docs[path][map][key] = structuredClone(data[map][key]);
      }
    } };
  return { docs, writes, library, bindings, store: createSpellAnimationPresentation(options), options,
    switchUser(next) { uid = next; library.setContext({ ownerId: uid }); }, failWrites() { reject = true; } };
}
test("legacy family inference preserves IDs, hosted assets and frame schema", () => {
  const old = normalizeAnimationDefinition(base);
  assert.equal(old.family, "magic"); assert.equal(old.id, base.id); assert.equal(old.sprite, base.sprite);
  assert.equal(inferAnimationFamily({ type: "Projectile" }), "magic");
  assert.equal(inferAnimationFamily({ tags: ["arrow", "bow"] }), "ranged");
  assert.equal(inferAnimationFamily({ category: "melee", tags: ["sword"] }), "melee");
  assert.equal(inferAnimationFamily({ tags: ["magic", "arrow"] }), "magic");
  for (const family of ["melee", "ranged", "magic"]) assert.equal(normalizeAnimationDefinition({ ...base, family }).family, family);
});
test("family and magic subtype filtering remain independent from elemental tags", () => {
  const library = createAnimationLibrary({ builtins: [base, { ...base, id: "slash", family: "melee" }, { ...base, id: "arrow", family: "ranged" }, { ...base, id: "impact", family: "magic", subtype: "impact" }] });
  assert.deepEqual(library.query({ family: "melee" }).map(x => x.id), ["slash"]);
  assert.deepEqual(library.query({ family: "ranged" }).map(x => x.id), ["arrow"]);
  assert.deepEqual(library.query({ family: "magic", subtype: "impact", tags: "fire" }).map(x => x.id), ["impact"]);
});
test("all melee/ranged templates use the existing source/target contract", () => {
  assert.equal(FAMILY_TEMPLATES.filter(x => x.family === "melee").length, 11);
  assert.equal(FAMILY_TEMPLATES.filter(x => x.family === "ranged").length, 8);
  assert.equal(FAMILY_TEMPLATES.filter(x => x.family === "magic").length, 14);
  for (const template of FAMILY_TEMPLATES) {
    const definition = normalizeAnimationDefinition({ ...base, ...template });
    assert.equal(definition.direction.mode, "face-target");
    if (template.family === "melee") {
      assert.equal(definition.placement.mode, "SOURCE_TOWARD_TARGET"); assert.equal(definition.behavior, "melee");
      assert.equal(definition.placement.followSource, true); assert.equal(definition.placement.followTarget, false);
    }
    if (template.family === "ranged") { assert.equal(definition.placement.mode, "SOURCE_TO_TARGET"); assert.equal(definition.behavior, "projectile"); }
  }
});
test("attack content stages round-trip and reference replacement preserves combat mechanics", () => {
  for (const family of ["melee", "ranged"]) {
    const animation = normalizeAttackAnimation({ family, stages: family === "melee" ? { attack: "visual" } : { prepare: "visual", projectile: "visual", impact: "visual" } });
    assert.deepEqual(spellStagesToAttackAnimation(family, attackAnimationToSpellStages(animation)), animation);
    const attack = { name: "Longbow", damage: { dice: "1d8", type: "piercing" }, range: 150, animation };
    assert.deepEqual(getSpellAnimationDependencies(attack), ["visual"]);
    replaceAnimationReferences(attack, "visual", "replacement");
    assert.deepEqual(getSpellAnimationDependencies(attack), ["replacement"]); assert.deepEqual(attack.damage, { dice: "1d8", type: "piercing" }); assert.equal(attack.range, 150);
    replaceAnimationReferences(attack, "replacement", null); assert.deepEqual(getSpellAnimationDependencies(attack), []);
  }
  assert.throws(() => normalizeAttackAnimation({ family: "constructor" }), /family/);
});
test("custom spell section exposes all five stages, names and all six actions without unsafe markup", () => {
  const library = createAnimationLibrary({ builtins: [{ ...base, name: "<unsafe>" }] });
  const html = renderSpellAnimationSection({ library, animations: { cast: "visual", travel: "visual", impact: "visual", sustain: "visual", end: "visual" } });
  assert.match(html, /cast → travel → impact → sustain → end/);
  assert.doesNotMatch(html, /<unsafe>/); assert.match(html, /&lt;unsafe&gt;/);
  assert.equal((html.match(/data-content-stage=/g) || []).length, 5);
  for (const action of ["choose", "create", "upload", "remix", "preview", "clear"]) assert.equal((html.match(new RegExp('data-animation-action="' + action + '"', "g")) || []).length, 5);
  assert.match(html, /Preview Full Spell/);
});
test("built-in overrides survive reopening without mutating profile, other spells or canonical catalog", async () => {
  const f = fixture(), canonical = structuredClone(base);
  await f.store.save("fireball", { cast: "visual", travel: "visual", impact: "visual", sustain: "visual", end: "visual" });
  await f.store.save("healing-word", { cast: "visual" });
  await f.store.save("fireball", { impact: "visual" });
  assert.equal(f.docs["users/a"].displayName, "Owner A");
  assert.deepEqual(Object.keys(f.docs["users/a"].spellAnimationOverrides.fireball.animations), ["impact"]);
  assert.equal(f.docs["users/a"].spellAnimationOverrides["healing-word"].animations.cast, "visual");
  assert.deepEqual(f.writes.at(-1).settings, { mergeFields: ["spellAnimationOverrides.fireball"] });
  f.store.destroy();
  const reopened = createSpellAnimationPresentation(f.options); await reopened.load();
  assert.equal(reopened.get("fireball").animations.impact, "visual"); assert.deepEqual(base, canonical);
  assert.equal(f.bindings.getAssignment("spell:fireball").animations.impact, "visual");
});
test("one saved presentation is counted once, while attacks and custom spells count separately", async () => {
  const f = fixture(); await f.store.save("fireball", { impact: "visual" });
  const spell = { animations: { cast: "visual" } }, attack = { animation: { family: "ranged", stages: { projectile: "visual" } } };
  const stopSpell = f.library.trackReferences("custom", { name: "Custom spell", get: () => spell, replace: (oldId, newId) => replaceAnimationReferences(spell, oldId, newId) });
  const stopAttack = f.library.trackReferences("attack", { name: "Arrow", get: () => attack, replace: (oldId, newId) => replaceAnimationReferences(attack, oldId, newId) });
  assert.equal(f.library.getAnimationUsage("visual").length, 3);
  stopSpell(); stopAttack(); assert.equal(f.library.getAnimationUsage("visual").length, 1);
  await f.store.save("fireball", {}); assert.equal(f.library.getAnimationUsage("visual").length, 0);
});
test("logout/login and owner switches never expose another owner's presentation", async () => {
  const f = fixture(); await f.store.save("fireball", { impact: "visual" });
  f.switchUser("b"); await f.store.setContext(); assert.equal(f.store.get("fireball"), null); assert.equal(f.bindings.getAssignment("spell:fireball"), null);
  await f.store.save("fireball", { cast: "visual" }); assert.equal(f.docs["users/a"].spellAnimationOverrides.fireball.animations.impact, "visual");
  f.switchUser(null); await f.store.setContext(); assert.equal(f.bindings.getAssignment("spell:fireball"), null);
  await assert.rejects(f.store.save("fireball", { cast: "visual" }), /Sign in/);
  f.switchUser("a"); await f.store.setContext(); assert.equal(f.store.get("fireball").animations.impact, "visual");
});
test("failed saves retain the last good setup and reject invalid IDs and missing selections", async () => {
  const f = fixture(); await f.store.save("fireball", { impact: "visual" }); f.failWrites();
  await assert.rejects(f.store.save("fireball", { cast: "visual" }), /permission denied/);
  assert.equal(f.store.get("fireball").animations.impact, "visual");
  await assert.rejects(f.store.save("__proto__", {}), /valid built-in spell/);
  await assert.rejects(f.store.save("fireball", { impact: "missing" }), /unavailable/);
});
test("a late previous-account load cannot replace the new account's presentation", async () => {
  const f = fixture(); let release;
  f.docs["users/a"].spellAnimationOverrides.fireball = { spellId: "fireball", animations: { impact: "visual" } };
  f.docs["users/b"].spellAnimationOverrides = { fireball: { spellId: "fireball", animations: { cast: "visual" } } };
  f.options.getDoc = async path => { if (path === "users/a") await new Promise(resolve => { release = resolve; }); return { data: () => structuredClone(f.docs[path]) }; };
  f.store.destroy(); const store = createSpellAnimationPresentation(f.options);
  const late = store.load(); f.switchUser("b"); await store.setContext(); release();
  assert.equal((await late).ok, false);
  assert.deepEqual(Object.keys(store.get("fireball").animations), ["cast"]);
  assert.deepEqual(Object.keys(f.bindings.getAssignment("spell:fireball").animations), ["cast"]);
});
test("account switches during a save never install the old owner's runtime binding", async () => {
  const f = fixture(); let release;
  f.options.setDoc = async () => new Promise(resolve => { release = resolve; });
  f.store.destroy(); const store = createSpellAnimationPresentation(f.options);
  await store.load(); const pending = store.save("fireball", { impact: "visual" });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  f.switchUser("b"); await store.setContext(); release();
  await assert.rejects(pending, /Account changed/);
  assert.equal(store.get("fireball"), null); assert.equal(f.bindings.getAssignment("spell:fireball"), null);
});
test("a replaced loaded presentation is marked unsaved until its normal setup save", async () => {
  const f = fixture(); f.library.registerAnimation({ ...base, id: "replacement" });
  await f.store.save("fireball", { impact: "visual" });
  assert.equal(f.library.replaceKnownReferences("visual", "replacement").length, 1);
  assert.equal(f.store.get("fireball").pendingSave, true);
  assert.equal(f.docs["users/a"].spellAnimationOverrides.fireball.animations.impact, "visual");
  await f.store.save("fireball", f.store.get("fireball").animations);
  assert.equal(f.store.get("fireball").pendingSave, undefined);
  assert.equal(f.docs["users/a"].spellAnimationOverrides.fireball.animations.impact, "replacement");
});
test("hydrated missing animation uses the unchanged safe legacy spell fallback", async () => {
  const f = fixture(); f.docs["users/a"].spellAnimationOverrides.fireball = { spellId: "fireball", animations: { impact: "missing" } };
  await f.store.load(); let legacyCalls = 0;
  const adapter = createAnimationSpellAdapter({ library: f.library, bindings: f.bindings, player: { getMode: () => "full" }, legacy: { play() { legacyCalls++; return { ok: true }; } } });
  assert.equal(adapter.play({ spellId: "fireball" }).ok, true); assert.equal(legacyCalls, 1);
  assert.equal(f.store.get("fireball").animations.impact, "missing");
});
test("the five foundational modules remain byte-for-byte identical to merged main", () => {
  const expected = { animationRuntime: "c6b662892d23645373aeb9192147647d23763929fb469cd0ae947212e1c72eed", animationPlayer: "38c38caa4bf3cffcacba14f028dcccb3c5f994d242f6c872f945781b732bb27b", animationSequence: "79259d2d3554413e2143183095612e4aafa04ab6d2352527954bf651212a9632", animationSpellAdapter: "4aedc5b8da50aeeda940cd0564fe66db2d1e81b10a090566cc5aa72ccc77e04b", animationPersistence: "9dff983660c320021a7c64f5f4a086243df7a1327066df276def17548828492e" };
  for (const [file, hash] of Object.entries(expected)) {
    // Git on Windows may change line endings, not module contents.
    const source = readFileSync(new URL("../vfx/" + file + ".js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    assert.equal(createHash("sha256").update(source).digest("hex"), hash, file);
  }
});
