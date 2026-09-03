import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_SPELLS } from "../data/defaultSpells.js";
import { SPELL_VFX_PROFILES, SPELL_VFX_FAMILIES, defineSpellVfxProfile,
  getSpellVfxProfile, getProfileEffectIds } from "../vfx/spellVfxProfiles.js";
import { compileSpellVfxProfile } from "../vfx/profileSequence.js";
import { createDefaultCastingSequenceRegistry, createCastingSequenceRegistry,
  createCastingSequenceSystem, defineCastingSequence, MAX_CASTING_SEQUENCE_DURATION_MS,
  MAX_EFFECTS_PER_SEQUENCE_PHASE } from "../vfx/castingSequence.js";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { createEffectEngine, normalizeEffectRequest } from "../vfx/effectEngine.js";
import { normalizeParticleCount } from "../vfx/particles.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { createSpellPreviewSession } from "../battleMap/spellPreview.js";

const cantrips = DEFAULT_SPELLS.filter((s) => s.level === 0);
const levelOne = DEFAULT_SPELLS.filter((s) => s.level === 1);
const levelTwo = DEFAULT_SPELLS.filter((s) => s.level === 2);
const levelThree = DEFAULT_SPELLS.filter((s) => s.level === 3);
const levelFour = DEFAULT_SPELLS.filter((s) => s.level === 4);
const catalogVfxSpells = [...cantrips, ...levelOne, ...levelTwo, ...levelThree, ...levelFour];
const registry = createDefaultCastingSequenceRegistry();
const effects = createDefaultEffectRegistry();
const bespoke = ["fire-bolt", "ray-of-frost", "frostbite", "eldritch-blast", "shocking-grasp", "sacred-flame"];

function clock() {
  let now = 0, next = 0;
  const tasks = new Map();
  return { tasks, now: () => now,
    setTimeout(fn, ms) { const id = ++next; tasks.set(id, { fn, at: now + ms }); return id; },
    clearTimeout(id) { tasks.delete(id); },
    finish() {
      let limit = 5000;
      while (tasks.size && --limit) {
        const [id, task] = [...tasks].sort((a,b) => a[1].at - b[1].at)[0];
        tasks.delete(id); now = task.at; task.fn();
      }
      assert.ok(limit > 0, "bounded timer work");
    }
  };
}

test("every catalog cantrip has intentional, valid, asset-safe, bounded VFX and a preview option", () => {
  assert.equal(cantrips.length, 45);
  assert.equal(SPELL_VFX_PROFILES.filter(p => cantrips.some(s => s.id === p.spellId)).length, 39);
  assert.equal(new Set(SPELL_VFX_PROFILES.map(p => p.spellId)).size, SPELL_VFX_PROFILES.length);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const options = html.match(/<optgroup label="Cantrips">([\s\S]*?)<\/optgroup>/)[1];
  const ids = [...options.matchAll(/value="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids.sort(), cantrips.map(s => s.id).sort());
  for (const spell of cantrips) {
    const profile = getSpellVfxProfile(spell.id);
    assert.ok(profile || bespoke.includes(spell.id), spell.id);
    const event = createSpellVfxEvent({ spell, preview: true,
      casterPoint: { x: 100, y: 100 }, targetPoint: { x: 130, y: 100 } });
    const def = registry.resolve(event);
    assert.ok(def.match.spellIds.includes(spell.id), spell.id);
    assert.equal(def.source, profile ? "profile" : "sequence");
    assert.ok(def.totalDuration > 0 && def.totalDuration <= MAX_CASTING_SEQUENCE_DURATION_MS);
    for (const type of getProfileEffectIds(profile)) assert.ok(effects.has(type), `${spell.id}: ${type}`);
    for (const phase of def.phases) {
      assert.ok(phase.effects.length <= MAX_EFFECTS_PER_SEQUENCE_PHASE);
      for (const effect of phase.effects) {
        const definition = effects.get(effect.type);
        assert.ok(definition, `${spell.id}: ${effect.type}`);
        if (definition.kind === "sprite") {
          assert.ok(existsSync(new URL("../" + definition.sprite.src, import.meta.url)), definition.sprite.src);
        } else assert.equal(definition.kind, "procedural", "intentional procedural fallback");
        const normalized = normalizeEffectRequest(effect, { id: "test", definition });
        assert.ok(Number.isFinite(normalized.scale) && normalized.scale <= 20);
        assert.ok(Number.isFinite(normalized.duration) && normalized.duration <= 5000);
        assert.equal(normalized.persistent, false);
      }
    }
  }
  // Unsupported utility/wall spells must not receive arbitrary explosions.
  for (const spell of DEFAULT_SPELLS.filter(s => ["prismatic-wall", "mirage-arcane", "clone"].includes(s.id))) {
    assert.equal(getSpellVfxProfile(spell.id), null);
  }
});

test("all 45 cantrip DM previews can lock without a character; catalog and real rules stay unchanged", () => {
  for (const spell of cantrips) {
    const before = JSON.stringify(spell);
    const real = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: getSpellVfxProfile(spell.id)?.preview });
    assert.equal(instruction.supported, true, spell.id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({ x: 100, y: 100 });
    if (!session.getState().previewLocked) session.pickPoint({ x: 130, y: 100 });
    assert.equal(session.getState().canPlay, true, spell.id);
    assert.deepEqual(createSpellTemplateInstruction(spell), real);
    assert.equal(JSON.stringify(spell), before);
  }
});

test("every level-one spell has intentional, valid, asset-safe VFX and a Play Preview option", () => {
  assert.equal(levelOne.length, 49);
  assert.equal(SPELL_VFX_PROFILES.filter(profile =>
    levelOne.some(spell => spell.id === profile.spellId)).length, 49);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const options = html.match(/<optgroup label="Level 1">([\s\S]*?)<\/optgroup>/)[1];
  const ids = [...options.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids.sort(), levelOne.map(spell => spell.id).sort());

  for (const spell of levelOne) {
    const before = JSON.stringify(spell);
    const profile = getSpellVfxProfile(spell.id);
    assert.ok(profile, spell.id);
    const event = createSpellVfxEvent({ spell, preview: true,
      casterPoint: { x: 100, y: 100 }, targetPoint: { x: 150, y: 100 } });
    const definition = registry.resolve(event);
    assert.equal(definition.source, "profile", spell.id);
    assert.ok(definition.match.spellIds.includes(spell.id), spell.id);
    assert.ok(definition.totalDuration > 0 &&
      definition.totalDuration <= MAX_CASTING_SEQUENCE_DURATION_MS, spell.id);
    for (const type of getProfileEffectIds(profile)) {
      assert.ok(effects.has(type), `${spell.id}: ${type}`);
    }
    const realInstruction = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: profile.preview
    });
    assert.equal(instruction.supported, true, spell.id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({ x: 100, y: 100 });
    if (!session.getState().previewLocked) session.pickPoint({ x: 150, y: 100 });
    assert.equal(session.getState().canPlay, true, spell.id);
    assert.deepEqual(createSpellTemplateInstruction(spell), realInstruction);
    assert.equal(JSON.stringify(spell), before);
  }
});

test("every level-two spell has intentional, valid, asset-safe VFX and a Play Preview option", () => {
  assert.equal(levelTwo.length, 54);
  assert.equal(SPELL_VFX_PROFILES.filter(profile =>
    levelTwo.some(spell => spell.id === profile.spellId)).length, 54);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const options = html.match(/<optgroup label="Level 2">([\s\S]*?)<\/optgroup>/)[1];
  const ids = [...options.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids.sort(), levelTwo.map(spell => spell.id).sort());

  for (const spell of levelTwo) {
    const before = JSON.stringify(spell);
    const profile = getSpellVfxProfile(spell.id);
    assert.ok(profile, spell.id);
    const event = createSpellVfxEvent({ spell, preview: true,
      casterPoint: { x: 100, y: 100 }, targetPoint: { x: 150, y: 100 } });
    const definition = registry.resolve(event);
    assert.equal(definition.source, "profile", spell.id);
    assert.ok(definition.match.spellIds.includes(spell.id), spell.id);
    assert.ok(definition.totalDuration > 0 &&
      definition.totalDuration <= MAX_CASTING_SEQUENCE_DURATION_MS, spell.id);
    for (const type of getProfileEffectIds(profile)) {
      assert.ok(effects.has(type), `${spell.id}: ${type}`);
    }
    const realInstruction = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: profile.preview
    });
    assert.equal(instruction.supported, true, spell.id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({ x: 100, y: 100 });
    if (!session.getState().previewLocked) session.pickPoint({ x: 150, y: 100 });
    assert.equal(session.getState().canPlay, true, spell.id);
    assert.deepEqual(createSpellTemplateInstruction(spell), realInstruction);
    assert.equal(JSON.stringify(spell), before);
  }

  assert.equal(createSpellTemplateInstruction(DEFAULT_SPELLS.find(s => s.id === "darkness")).sizeFeet, 15);
  assert.deepEqual(
    ["gust-of-wind", "spike-growth", "web", "zone-of-truth"].map(id => {
      const instruction = createSpellTemplateInstruction(DEFAULT_SPELLS.find(s => s.id === id));
      return [instruction.templateShape, instruction.sizeFeet, instruction.widthFeet];
    }),
    [["line", 60, 10], ["cylinder", 20, 5], ["cube", 20, 20], ["sphere", 15, 5]]
  );
});

test("every level-three spell has intentional, valid, asset-safe VFX and a Play Preview option", () => {
  assert.equal(levelThree.length, 42);
  assert.equal(SPELL_VFX_PROFILES.filter(profile =>
    levelThree.some(spell => spell.id === profile.spellId)).length, 41);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const options = html.match(/<optgroup label="Level 3">([\s\S]*?)<\/optgroup>/)[1];
  const ids = [...options.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids.sort(), levelThree.map(spell => spell.id).sort());

  for (const spell of levelThree) {
    const before = JSON.stringify(spell);
    const profile = getSpellVfxProfile(spell.id);
    assert.ok(profile || spell.id === "fireball", spell.id);
    const event = createSpellVfxEvent({ spell, preview: true,
      casterPoint: { x: 100, y: 100 }, targetPoint: { x: 150, y: 100 } });
    const definition = registry.resolve(event);
    assert.ok(definition.match.spellIds.includes(spell.id), spell.id);
    assert.equal(definition.source,
      ["fireball", "lightning-bolt"].includes(spell.id) ? "sequence" : "profile",
      spell.id);
    assert.ok(definition.totalDuration > 0 &&
      definition.totalDuration <= MAX_CASTING_SEQUENCE_DURATION_MS, spell.id);
    for (const type of getProfileEffectIds(profile)) {
      assert.ok(effects.has(type), `${spell.id}: ${type}`);
    }
    const realInstruction = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: profile?.preview
    });
    assert.equal(instruction.supported, true, spell.id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({ x: 100, y: 100 });
    if (!session.getState().previewLocked) session.pickPoint({ x: 150, y: 100 });
    assert.equal(session.getState().canPlay, true, spell.id);
    assert.deepEqual(createSpellTemplateInstruction(spell), realInstruction);
    assert.equal(JSON.stringify(spell), before);
  }

  assert.deepEqual(
    ["fear", "daylight", "magic-circle", "speak-with-plants", "tiny-hut"].map(id => {
      const instruction = createSpellTemplateInstruction(DEFAULT_SPELLS.find(s => s.id === id));
      return [instruction.templateShape, instruction.sizeFeet, instruction.heightFeet];
    }),
    [["cone", 30, 0], ["sphere", 60, 120], ["cylinder", 10, 20],
      ["sphere", 30, 60], ["sphere", 10, 20]]
  );
  const windWall = DEFAULT_SPELLS.find(s => s.id === "wind-wall");
  assert.equal(createSpellTemplateInstruction(windWall).supported, false);
  assert.equal(createSpellTemplateInstruction(windWall, { allowTouchPreview: true,
    vfxPreview: getSpellVfxProfile("wind-wall").preview }).supported, true);
});

test("every level-four spell has intentional, valid, asset-safe VFX and a Play Preview option", () => {
  assert.equal(levelFour.length, 31);
  assert.equal(SPELL_VFX_PROFILES.filter(profile =>
    levelFour.some(spell => spell.id === profile.spellId)).length, 31);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const options = html.match(/<optgroup label="Level 4">([\s\S]*?)<\/optgroup>/)[1];
  const ids = [...options.matchAll(/value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids.sort(), levelFour.map(spell => spell.id).sort());

  for (const spell of levelFour) {
    const before = JSON.stringify(spell);
    const profile = getSpellVfxProfile(spell.id);
    assert.ok(profile, spell.id);
    const event = createSpellVfxEvent({ spell, preview: true,
      casterPoint: { x: 100, y: 100 }, targetPoint: { x: 150, y: 100 } });
    const definition = registry.resolve(event);
    assert.equal(definition.source, "profile", spell.id);
    assert.ok(definition.match.spellIds.includes(spell.id), spell.id);
    assert.ok(definition.totalDuration > 0 &&
      definition.totalDuration <= MAX_CASTING_SEQUENCE_DURATION_MS, spell.id);
    for (const type of getProfileEffectIds(profile)) {
      assert.ok(effects.has(type), `${spell.id}: ${type}`);
    }
    const realInstruction = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: profile.preview
    });
    assert.equal(instruction.supported, true, spell.id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({ x: 100, y: 100 });
    if (!session.getState().previewLocked) session.pickPoint({ x: 150, y: 100 });
    assert.equal(session.getState().canPlay, true, spell.id);
    assert.deepEqual(createSpellTemplateInstruction(spell), realInstruction);
    assert.equal(JSON.stringify(spell), before);
  }

  assert.deepEqual(
    ["arcane-eye", "black-tentacles", "control-water", "fire-shield",
      "hallucinatory-terrain", "private-sanctum"].map(id => {
      const instruction = createSpellTemplateInstruction(DEFAULT_SPELLS.find(s => s.id === id));
      return [instruction.templateShape, instruction.sizeFeet, instruction.heightFeet];
    }),
    [["sphere", 30, 60], ["cube", 20, 20], ["cube", 100, 100],
      ["sphere", 5, 10], ["cube", 150, 150], ["cube", 100, 100]]
  );
  const wallOfFire = DEFAULT_SPELLS.find(s => s.id === "wall-of-fire");
  assert.equal(createSpellTemplateInstruction(wallOfFire).supported, false);
  assert.equal(createSpellTemplateInstruction(wallOfFire, { allowTouchPreview: true,
    vfxPreview: getSpellVfxProfile("wall-of-fire").preview }).supported, true);
});

test("cantrip through level-four bulk playback in Full / Reduced / Off preserves events, respects caps, and leaves no timers", () => {
  for (const mode of ["full", "reduced", "off"]) {
    const scheduler = clock(), rendered = new Map(), requests = [];
    const engine = createEffectEngine({ scheduler, mode,
      renderer: { render(e) { rendered.set(e.id, e); requests.push(e); },
        remove(id) { rendered.delete(id); }, clear() { rendered.clear(); } } });
    const system = createCastingSequenceSystem({ effectEngine: engine, scheduler });
    for (const spell of catalogVfxSpells) {
      const event = createSpellVfxEvent({ spell, preview: true,
        casterPoint: { x: 40, y: 50 }, targetPoint: { x: 150, y: 80 } });
      const before = JSON.stringify(event);
      const result = system.play(event);
      assert.equal(result.ok, true, spell.id);
      scheduler.finish();
      assert.equal(JSON.stringify(event), before);
      assert.equal(system.getState().activeCount, 0);
      assert.equal(engine.getState().activeCount, 0);
      assert.equal(rendered.size, 0);
    }
    for (let i = 0; i < 100; i++) system.play(createSpellVfxEvent({
      spell: catalogVfxSpells[i % catalogVfxSpells.length], preview: true
    }));
    assert.ok(system.getState().activeCount <= 16);
    assert.ok(engine.getState().activeCount <= 64);
    system.clearPreviews(); scheduler.finish();
    assert.equal(rendered.size, 0); assert.equal(scheduler.tasks.size, 0);
    if (mode === "off") assert.equal(requests.length, 0);
    for (const e of requests) {
      assert.equal(e.metadata.preview, true); assert.equal(e.persistent, false);
      assert.ok(normalizeParticleCount((e.particles?.count || 0) * e.intensity, { mode }) <= (mode === "reduced" ? 24 : 240));
      if (mode === "reduced") assert.ok(e.duration <= 1000);
    }
    system.destroy(); engine.destroy();
  }
});

test("spell-specific override beats profile which beats generic fallback", () => {
  const profile = getSpellVfxProfile("mage-hand");
  const generic = { id: "fallback", priority: 100, match: {}, phases: {} };
  const reg = createCastingSequenceRegistry([generic], { profiles: [profile] });
  assert.equal(reg.resolve({ spellId: "mage-hand" }).source, "profile");
  reg.register({ id: "hand-override", priority: -100, match: { spellIds: ["mage-hand"] }, phases: {} });
  assert.equal(reg.resolve({ spellId: "mage-hand" }).id, "hand-override");
  assert.equal(reg.resolve({ spellId: "unknown" }).id, "fallback");
  for (const id of [...bespoke, "fireball"]) {
    const spell = DEFAULT_SPELLS.find(s => s.id === id);
    assert.equal(registry.resolve(createSpellVfxEvent({ spell })).id, id);
  }
});

test("every reusable family compiles and higher spell levels scale within hard safety limits", () => {
  for (const family of SPELL_VFX_FAMILIES) {
    const raw = { spellId: "future-test-only", family, targetEffect: "profile-glyph",
      impactCount: 999, aftershockCount: 999, particleMultiplier: 999,
      travelSpeed: 600, screenShakeIntensity: 999 };
    const low = defineCastingSequence(compileSpellVfxProfile(raw, { spellLevel: 0 }));
    const high = defineCastingSequence(compileSpellVfxProfile(raw, { spellLevel: 9 }));
    assert.ok(high.scaling.scale > low.scaling.scale);
    assert.ok(high.scaling.intensity > low.scaling.intensity);
    assert.equal(high.scaling.impactCount, 3);
    assert.equal(high.scaling.aftershockCount, 2);
    assert.equal(high.scaling.screenShakeIntensity, 1, "metadata only; never applied to camera");
    assert.ok(high.totalDuration < MAX_CASTING_SEQUENCE_DURATION_MS);
    for (const phase of high.phases) for (const effect of phase.effects) assert.ok(effects.has(effect.type));
  }
  const bad = defineSpellVfxProfile({ spellId: "bad-numbers", family: "aura",
    scale: Infinity, intensity: NaN, particleMultiplier: "", travelDuration: -100, impactDuration: 1e99 });
  const def = defineCastingSequence(compileSpellVfxProfile(bad, { spellLevel: Infinity }));
  assert.ok(Number.isFinite(def.totalDuration));
  assert.ok(Number.isFinite(def.scaling.scale));
  assert.throws(() => defineSpellVfxProfile({ spellId: "bad", family: "not-a-family" }));
});

test("utility profiles use small non-explosion compositions and geometry stays presentation-only", () => {
  for (const id of ["mage-hand", "light", "guidance", "resistance", "message", "minor-illusion",
    "mending", "mold-earth", "shape-water", "gust", "druidcraft", "prestidigitation", "thaumaturgy",
    "alarm", "comprehend-languages", "create-or-destroy-water", "detect-magic", "disguise-self",
    "find-familiar", "floating-disk", "fog-cloud", "grease", "identify", "illusory-script",
    "purify-food-and-drink", "silent-image", "speak-with-animals", "unseen-servant",
    "alter-self", "animal-messenger", "arcane-lock", "arcanists-magic-aura", "augury",
    "blur", "calm-emotions", "darkness", "detect-thoughts", "enthrall", "find-steed",
    "find-traps", "gentle-repose", "gust-of-wind", "invisibility", "knock", "levitate",
    "locate-animals-or-plants", "locate-object", "magic-mouth", "mirror-image", "misty-step",
    "pass-without-trace", "rope-trick", "see-invisibility", "spike-growth", "suggestion",
    "web", "zone-of-truth"]) {
    const profile = getSpellVfxProfile(id);
    assert.ok(getProfileEffectIds(profile).every(type =>
      type.startsWith("profile-") || type.startsWith("status-buff-") ||
        type.startsWith("status-debuff-")), id);
    assert.ok(profile.scale <= 1);
  }
  const source = readFileSync(new URL("../vfx/profileSequence.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /dispatchEvent|setDoc|updateDoc|hitPoints|spellSlots|screen\.shake/);
});
