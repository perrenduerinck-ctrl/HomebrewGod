import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { getSpellVfxProfile } from "../vfx/spellVfxProfiles.js";
import { getCantripSpritePaths } from "../vfx/cantripEffects.js";
import { getSpriteFrameStyle, normalizeSpriteOptions } from "../vfx/spriteAnimator.js";
import { STATUS_EFFECT_DEFINITIONS, STATUS_SPRITE_ASSETS } from "../vfx/statusEffects.js";

function assertCompletePng(png, label) {
  let offset = 8;
  let foundIend = false;
  const compressed = [];
  while (offset < png.length) {
    assert.ok(offset + 12 <= png.length, `${label}: complete PNG chunk header`);
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const end = offset + 12 + length;
    assert.ok(end <= png.length, `${label}: complete ${type || "unknown"} chunk`);
    if (type === "IDAT") compressed.push(png.subarray(offset + 8, offset + 8 + length));
    offset = end;
    if (type === "IEND") {
      assert.equal(length, 0, `${label}: valid IEND chunk`);
      foundIend = true;
      break;
    }
  }
  assert.equal(foundIend, true, `${label}: has IEND chunk`);
  assert.equal(offset, png.length, `${label}: no truncated or trailing PNG data`);
  assert.ok(compressed.length > 0, `${label}: has image data`);
  assert.ok(inflateSync(Buffer.concat(compressed)).length > 0, `${label}: image data decodes`);
}

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
    assertCompletePng(png, effect.sprite.src);
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
    "power-word-stun": "status-debuff-shock",
    command: "status-debuff-power-down",
    "comprehend-languages": "status-buff-truesight",
    "cure-wounds": "status-buff-regeneration",
    "detect-evil-and-good": "status-buff-truesight",
    "detect-magic": "status-buff-truesight",
    "detect-poison-and-disease": "status-buff-truesight",
    "divine-favor": "status-buff-radiant-weapon",
    "expeditious-retreat": "status-buff-haste",
    "faerie-fire": "status-debuff-ominous-eye",
    "false-life": "status-buff-barrier",
    "feather-fall": "status-buff-blessing",
    goodberry: "status-buff-regeneration",
    "healing-word": "status-buff-regeneration",
    heroism: "status-buff-power-up",
    "hideous-laughter": "status-debuff-confusion",
    "hunters-mark": "status-debuff-ominous-eye",
    identify: "status-buff-truesight",
    jump: "status-buff-haste",
    longstrider: "status-buff-haste",
    "protection-from-evil-and-good": "status-buff-elemental-ward",
    sanctuary: "status-buff-shield",
    aid: "status-buff-power-up",
    barkskin: "status-buff-armor",
    "blindness-deafness": "status-debuff-ominous-eye",
    "branding-smite": "status-buff-radiant-weapon",
    darkvision: "status-buff-truesight",
    "detect-thoughts": "status-buff-truesight",
    "find-traps": "status-buff-truesight",
    "lesser-restoration": "status-buff-regeneration",
    "locate-animals-or-plants": "status-buff-truesight",
    "locate-object": "status-buff-truesight",
    "prayer-of-healing": "status-buff-regeneration",
    "protection-from-poison": "status-buff-elemental-ward",
    "see-invisibility": "status-buff-truesight",
    "spider-climb": "status-buff-haste"
  };
  for (const [spellId, effectId] of Object.entries(mappings)) {
    const profile = getSpellVfxProfile(spellId);
    assert.equal(profile.targetEffect, effectId, spellId);
  }
  assert.ok(getCantripSpritePaths("guidance").includes(STATUS_SPRITE_ASSETS.buff.blessing));
  const source = readFileSync(new URL("../vfx/statusEffects.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /toggle-condition|combat\.conditions|hitPoints|spellSlots|dispatchEvent/);
});
