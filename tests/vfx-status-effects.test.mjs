import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { getSpellVfxProfile } from "../vfx/spellVfxProfiles.js";
import { getCantripSpritePaths } from "../vfx/cantripEffects.js";
import { getSpriteFrameStyle, normalizeSpriteOptions } from "../vfx/spriteAnimator.js";
import { STATUS_EFFECT_DEFINITIONS, STATUS_SPRITE_ASSETS } from "../vfx/statusEffects.js";

test("buff and debuff atlases are distinct, complete, and registered", () => {
  assert.equal(Object.keys(STATUS_SPRITE_ASSETS.buff).length, 10);
  assert.equal(Object.keys(STATUS_SPRITE_ASSETS.debuff).length, 10);
  assert.equal(STATUS_EFFECT_DEFINITIONS.length, 20);
  const registry = createDefaultEffectRegistry();
  const paths = new Set();
  for (const effect of STATUS_EFFECT_DEFINITIONS) {
    assert.ok(effect.id.startsWith("status-buff-") || effect.id.startsWith("status-debuff-"));
    assert.equal(effect.kind, "sprite");
    assert.equal(effect.blendMode, "screen");
    assert.ok(registry.has(effect.id));
    assert.ok(existsSync(new URL("../" + effect.sprite.src, import.meta.url)), effect.sprite.src);
    const png = readFileSync(new URL("../" + effect.sprite.src, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1254, 1254]);
    assert.equal(paths.has(effect.sprite.src), false, "duplicate source atlas");
    paths.add(effect.sprite.src);
  }
});

test("status atlas cropping excludes drawn grids without crossing frame bounds", () => {
  for (const effect of STATUS_EFFECT_DEFINITIONS) {
    const sprite = normalizeSpriteOptions(effect.sprite);
    assert.equal(sprite.columns, 5);
    assert.equal(sprite.rows, 5);
    assert.equal(sprite.frameCount, 25);
    assert.equal(sprite.atlas.columns.length, 6);
    assert.equal(sprite.atlas.rows.length, 6);
    assert.ok(sprite.atlas.inset >= 5);
    for (let frame = 0; frame < 25; frame++) {
      const style = getSpriteFrameStyle(sprite, frame);
      const col = frame % 5, row = Math.floor(frame / 5);
      const scale = parseFloat(style.backgroundSize) / sprite.atlas.width;
      const [x, y] = style.backgroundPosition.split(" ").map(parseFloat);
      const sourceX = -x / scale, sourceY = -y / scale;
      const sourceWidth = parseFloat(style.width) / scale;
      const sourceHeight = parseFloat(style.height) / scale;
      assert.ok(sourceX >= sprite.atlas.columns[col] + sprite.atlas.inset - .01);
      assert.ok(sourceY >= sprite.atlas.rows[row] + sprite.atlas.inset - .01);
      assert.ok(sourceX + sourceWidth <= sprite.atlas.columns[col + 1] - sprite.atlas.inset + .01);
      assert.ok(sourceY + sourceHeight <= sprite.atlas.rows[row + 1] - sprite.atlas.inset + .01);
    }
  }
});

test("known buff/debuff spells select status art while leaving semantics external", () => {
  const mappings = {
    bless: "status-buff-blessing",
    haste: "status-buff-haste",
    shield: "status-buff-shield",
    regenerate: "status-buff-regeneration",
    "protection-from-energy": "status-buff-elemental-ward",
    "magic-weapon": "status-buff-radiant-weapon",
    "globe-of-invulnerability": "status-buff-barrier",
    "true-seeing": "status-buff-truesight",
    "mage-armor": "status-buff-armor",
    "enhance-ability": "status-buff-power-up",
    slow: "status-debuff-chill",
    silence: "status-debuff-silence",
    sleep: "status-debuff-sleep",
    confusion: "status-debuff-confusion",
    "bestow-curse": "status-debuff-ominous-eye",
    "ray-of-enfeeblement": "status-debuff-power-down",
    entangle: "status-debuff-entangle",
    "power-word-stun": "status-debuff-shock"
  };
  for (const [spellId, effectId] of Object.entries(mappings)) {
    const profile = getSpellVfxProfile(spellId);
    assert.equal(profile.targetEffect, effectId, spellId);
  }
  assert.ok(getCantripSpritePaths("guidance").includes(STATUS_SPRITE_ASSETS.buff.blessing));
  const source = readFileSync(new URL("../vfx/statusEffects.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /toggle-condition|combat\.conditions|hitPoints|spellSlots|dispatchEvent/);
});
