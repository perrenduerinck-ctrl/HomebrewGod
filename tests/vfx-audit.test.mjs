import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { VFX_ALPHA_COPIES, resolveVfxAlphaSource } from "../vfx/alphaAssets.js";
import { createVfxClipController } from "../vfx/clipController.js";
import { SPELL_VFX_PROFILES, getSpellVfxProfile } from "../vfx/spellVfxProfiles.js";
import { compileSpellVfxProfile } from "../vfx/profileSequence.js";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { normalizeEffectRequest, createEffectEngine } from "../vfx/effectEngine.js";
import { validateModernSprite, resolveVfxClipDefinition } from "../vfx/assetVersions.js";
import { resolveSpriteReplacement } from "../vfx/spriteReplacements.js";
import { VFX_ASSET_MANIFEST, createVfxAssetCache } from "../vfx/vfxAssetManifest.js";

test("every known profile uses an explicit preset, with terrain below tokens and weather overhead", () => {
  const registry = createDefaultEffectRegistry();
  for (const profile of SPELL_VFX_PROFILES) {
    const sequence = compileSpellVfxProfile(profile, { spellLevel: 9, casterTokenId: "caster",
      affectedTokens: [{ id: "target" }] });
    for (const phase of Object.values(sequence.phases)) for (const effect of phase.effects) {
      assert.ok(effect.preset, profile.spellId);
      const request = normalizeEffectRequest(effect, { definition: registry.get(effect.type) });
      if (["profile-ground", "fire-scorch", "storm-frost"].includes(effect.type)) assert.equal(request.layer, "ground", profile.spellId);
      if (["profile-weather", "storm-cloud", "storm-hail"].includes(effect.type)) assert.equal(request.layer, "overhead", profile.spellId);
      assert.ok(effect.scale <= 3, profile.spellId);
    }
  }
});

test("major profiles compose impact feedback; utility spells and reduced mode do not shake", () => {
  const registry = createDefaultEffectRegistry();
  for (const id of ["fireball", "thunderwave", "meteor-swarm", "earthquake"]) {
    const s = compileSpellVfxProfile(getSpellVfxProfile(id) || { spellId: id, family: "burst", damageType: "fire" }, { spellLevel: 9 });
    const effect = s.phases.impact.effects.find(e => e.shake);
    assert.ok(effect?.shake.enabled, id);
    assert.ok(s.phases.impact.effects.some(e => e.layer === "ground"), id);
    const reduced = normalizeEffectRequest(effect, { definition: registry.get(effect.type), mode: "reduced" });
    assert.equal(reduced.shake, null);
    assert.equal(reduced.hitStopMs, 0);
  }
  for (const id of ["guidance", "light", "mage-hand"]) {
    const s = compileSpellVfxProfile(getSpellVfxProfile(id), { spellLevel: 0 });
    assert.ok(Object.values(s.phases).every(p => p.effects.every(e => !e.shake)), id);
  }
});

test("capacity removes secondary detail before a core projectile, and hit-stop only delays visual timers", () => {
  const visible = new Map(), timers = new Map();
  let next = 0;
  const engine = createEffectEngine({ maximumActiveEffects: 2, scheduler: {
    now: () => 0, setTimeout(fn, delay) { timers.set(++next, { fn, delay }); return next; },
    clearTimeout: id => timers.delete(id)
  }, renderer: { render: effect => visible.set(effect.id, effect), remove: id => visible.delete(id) } });
  const projectile = engine.play({ type: "procedural-pulse", duration: 500, importance: "core" });
  engine.play({ type: "procedural-pulse", duration: 500, importance: "secondary" });
  const impact = engine.play({ type: "procedural-pulse", duration: 500, importance: "core", hitStopMs: 45 });
  assert.ok(visible.has(projectile.id) && visible.has(impact.id));
  assert.ok([...timers.values()].some(t => t.delay === 545));
  assert.equal(engine.play({ type: "procedural-pulse", importance: "secondary" }).reason, "secondary-budget");
  engine.destroy(); assert.equal(timers.size, 0); assert.equal(visible.size, 0);
});

test("every migrated clip validates and falls back for disabled, invalid or unavailable modern metadata", () => {
  for (const spell of Object.values(VFX_ASSET_MANIFEST)) for (const versions of Object.values(spell.clips)) {
    if (!versions.modern6x6) continue;
    assert.deepEqual(validateModernSprite(versions.modern6x6), []);
    assert.equal(resolveVfxClipDefinition(versions).assetVersion, "modern6x6");
    for (const change of [{ rows: 5 }, { framesPerSecond: 0 }, { endFrame: 36 },
      { frameWidth: 0 }, { enabled: false }, { src: "" }]) {
      assert.equal(resolveVfxClipDefinition({ ...versions, modern6x6: { ...versions.modern6x6, ...change } }).assetVersion, "legacy");
    }
    assert.equal(resolveVfxClipDefinition(versions, { assetAvailable: src => src !== versions.modern6x6.src }).assetVersion, "legacy");
    // The same modern grid works for a low-level effect; legacy tiers cannot downgrade it.
    const selected = resolveSpriteReplacement("lesser-fire-burst", versions.legacy, {
      replacements: { "lesser-fire-burst": versions.modern6x6 } });
    assert.equal(selected.frameCount, 36);
    assert.equal(selected.blendMode, "normal");
  }
});

test("cache readiness includes decode and decode failure is a safe failed asset", async () => {
  for (const fail of [false, true]) {
    let finish;
    const image = { decode: () => new Promise((resolve, reject) => { finish = fail ? reject : resolve; }) };
    const cache = createVfxAssetCache({ createImage: () => image, onError() {} });
    const promise = cache.preload("imminent.png");
    image.onload();
    assert.equal(cache.getStatus("imminent.png"), "decoding");
    finish();
    assert.equal(await promise, !fail);
    assert.equal(cache.getStatus("imminent.png"), fail ? "failed" : "loaded");
  }
});

test("every cleaned copy is RGBA, retains its source dimensions and leaves the original hash intact", () => {
  const report = JSON.parse(readFileSync(new URL("../assets/vfx/audit/alpha-report.json", import.meta.url)));
  for (const [src, copy] of Object.entries(VFX_ALPHA_COPIES)) {
    const original = new URL("../" + src.slice(2), import.meta.url);
    const output = new URL("../" + copy.slice(2), import.meta.url);
    assert.ok(existsSync(output));
    const input = readFileSync(original), rgba = readFileSync(output);
    assert.equal(rgba[25], 6, copy);
    assert.deepEqual(rgba.subarray(16, 24), input.subarray(16, 24), copy);
    const record = report.find(r => r.source === src.slice(2));
    assert.equal(createHash("sha256").update(input).digest("hex"), record.sha256);
    assert.equal(record.compatibilityCopy.fullyOpaque, false, copy);
    assert.equal(record.compatibilityCopy.opaqueBlack, 0, copy);
    assert.equal(resolveVfxAlphaSource(src + "?v=cache"), copy);
  }
});

test("real migrated clip events fire at the same normalized progress in both versions", () => {
  for (const spell of Object.values(VFX_ASSET_MANIFEST)) for (const [name, versions] of Object.entries(spell.clips)) {
    if (!versions.modern6x6) continue;
    const logs = {};
    for (const mode of ["legacy", "modern6x6"]) {
      const events = [];
      const controller = createVfxClipController({ element: { style: {}, dataset: {} },
        clips: { [name]: versions }, initialClip: name, assetMode: mode, manual: true, now: () => 0,
        onEvent: event => { if (event.type !== "complete") events.push([event.id, event.progress]); } });
      const clip = controller.getState().options;
      controller.seek((clip.endFrame - clip.startFrame + 1) / clip.framesPerSecond * 1000 + 1);
      logs[mode] = events; controller.destroy();
    }
    assert.deepEqual(logs.modern6x6, logs.legacy, name);
  }
});
