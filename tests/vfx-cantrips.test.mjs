import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CANTRIP_CASTING_SEQUENCE_DEFINITIONS, CANTRIP_EFFECT_DEFINITIONS,
  getCantripSpritePaths } from "../vfx/cantripEffects.js";
import { createCastingSequenceSystem, createDefaultCastingSequenceRegistry } from "../vfx/castingSequence.js";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { DEFAULT_SPELLS, getDefaultSpellById } from "../data/defaultSpells.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { createSpellPreviewSession } from "../battleMap/spellPreview.js";

function harness({ fail = false, mode = "full" } = {}) {
  let nextId = 0;
  const timers = new Map(), requests = [], states = [];
  const scheduler = {
    now: () => 0,
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: (id) => timers.delete(id)
  };
  const system = createCastingSequenceSystem({
    scheduler,
    effectEngine: {
      getState: () => ({ mode }),
      play(request) {
        requests.push(request);
        if (fail) throw new Error("broken visual");
        return { ok: true, cancel() {} };
      }
    },
    onStateChange: (state) => states.push(state.activeCount)
  });
  return { system, requests, states, timers,
    finish() {
      for (const [id, task] of [...timers].sort((a,b) => a[1].delay - b[1].delay)) {
        if (timers.delete(id)) task.fn();
      }
    }
  };
}

test("five cantrips select dedicated sequences and every sprite path exists", () => {
  const sequences = createDefaultCastingSequenceRegistry();
  const effects = createDefaultEffectRegistry();
  assert.equal(CANTRIP_CASTING_SEQUENCE_DEFINITIONS.length, 5);
  for (const def of CANTRIP_CASTING_SEQUENCE_DEFINITIONS) {
    const spell = getDefaultSpellById(def.id);
    assert.equal(spell.level, 0);
    assert.equal(sequences.resolve(createSpellVfxEvent({ spell })).id, def.id);
    for (const phase of Object.values(def.phases)) {
      for (const effect of phase.effects || []) assert.ok(effects.has(effect.type));
    }
    assert.ok(getCantripSpritePaths(def.id).length > 0);
  }
  for (const def of CANTRIP_EFFECT_DEFINITIONS) {
    const bytes = readFileSync(new URL("../" + def.sprite.src, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), 1254);
    assert.equal(bytes.readUInt32BE(20), 1254);
    assert.equal(def.sprite.loop, false);
  }
  assert.deepEqual(getCantripSpritePaths("unknown"), []);
});

test("projectiles preserve origin and target; target-only cantrips never travel from caster", () => {
  for (const def of CANTRIP_CASTING_SEQUENCE_DEFINITIONS) {
    const h = harness();
    const casterPoint = { x: 80, y: 140 }, targetPoint = { x: 210, y: 70 };
    const event = createSpellVfxEvent({
      spell: getDefaultSpellById(def.id), casterPoint, targetPoint, preview: true
    });
    const snapshot = JSON.stringify(event);
    assert.equal(h.system.play(event).ok, true);
    h.finish();
    const paths = h.requests.filter((request) => request.startPosition);
    assert.equal(paths.length, ["ray-of-frost", "eldritch-blast"].includes(def.id) ? 1 : 0);
    for (const path of paths) {
      assert.deepEqual(path.startPosition, event.casterPoint);
      assert.deepEqual(path.endPosition, event.targetPoint);
    }
    assert.equal(JSON.stringify(event), snapshot);
    assert.ok(h.requests.every((r) => r.metadata.preview && !r.persistent));
    assert.equal(h.system.getState().activeCount, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.states.at(-1), 0);
  }
});

test("overlay observer stays active across overlapping casts and restores on failure, reset, and cleanup", () => {
  const h = harness({ fail: true });
  const spell = getDefaultSpellById("ray-of-frost");
  h.system.play(createSpellVfxEvent({ spell, preview: true }));
  h.system.play(createSpellVfxEvent({ spell }));
  assert.equal(h.states.at(-1), 2);
  h.system.clearPreviews();
  assert.equal(h.states.at(-1), 1, "reset must not cancel a real cast");
  h.finish();
  assert.equal(h.states.at(-1), 0);
  assert.equal(h.timers.size, 0);
  h.system.play(createSpellVfxEvent({ spell, preview: true }));
  h.system.destroy();
  assert.equal(h.states.at(-1), 0);
});

test("Effects Off never starts a sequence; Reduced remains bounded and cleans up", () => {
  const event = createSpellVfxEvent({ spell: getDefaultSpellById("frostbite"), preview: true });
  const off = harness({ mode: "off" });
  assert.equal(off.system.play(event).reason, "effects-off");
  assert.equal(off.requests.length, 0);
  assert.equal(off.states.length, 0);
  const reduced = harness({ mode: "reduced" });
  for (let i = 0; i < 40; i++) reduced.system.play(event);
  assert.equal(reduced.system.getState().activeCount, 16);
  reduced.finish();
  assert.equal(reduced.system.getState().activeCount, 0);
  assert.ok(reduced.requests.every((r) => r.duration <= 480));
});

test("Shocking Grasp supports a bounded five-foot DM preview without changing real casting", () => {
  const spell = getDefaultSpellById("shocking-grasp");
  assert.equal(createSpellTemplateInstruction(spell).supported, false);
  const instruction = createSpellTemplateInstruction(spell, { allowTouchPreview: true });
  assert.equal(instruction.rangeFeet, 5);
  assert.match(instruction.rangeText, /Touch/);
  const session = createSpellPreviewSession({
    spell, instruction, getMetrics: () => ({ pixelsPerSquare: 5, feetPerSquare: 5 })
  });
  session.pickPoint({ x: 0, y: 0 });
  assert.equal(session.aimAt({ x: 6, y: 0 }).inRange, false);
  assert.equal(session.pickPoint({ x: 3, y: 4 }).canPlay, true);
  assert.equal(spell.targeting.range.feet, null);
});

test("tier inventory remains accurate and distinguishes dedicated sequences from fallbacks", () => {
  assert.equal(DEFAULT_SPELLS.length, 340);
  assert.deepEqual(Array.from({ length: 10 }, (_, level) =>
    DEFAULT_SPELLS.filter((spell) => spell.level === level).length),
    [45,49,54,42,31,37,31,20,16,15]);
  const registry = createDefaultCastingSequenceRegistry();
  const dedicated = DEFAULT_SPELLS.filter((spell) =>
    registry.resolve(createSpellVfxEvent({ spell }))?.match.spellIds.includes(spell.id));
  assert.equal(dedicated.filter((spell) => spell.level === 0).length, 45);
  assert.equal(dedicated.filter((spell) => spell.level === 1).length, 49);
  assert.equal(dedicated.filter((spell) => spell.level === 2).length, 54);
  assert.equal(dedicated.filter((spell) => spell.level === 3).length, 42);
  assert.equal(dedicated.filter((spell) => spell.level === 4).length, 31);
  assert.equal(dedicated.filter((spell) => spell.level === 5).length, 37);
  assert.equal(dedicated.filter((spell) => spell.level === 6).length, 31);
  assert.equal(dedicated.length, 318);
  assert.deepEqual([7,8,9].map(level => dedicated.filter(s => s.level === level).length), [10,10,9]);
});
