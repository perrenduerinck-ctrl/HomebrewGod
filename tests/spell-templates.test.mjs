import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultSpellById
} from "../data/defaultSpells.js";
import {
  createSpellTemplateInstruction,
  formatSpellTemplateInstruction
} from "../battleMap/spellTemplates.js";

test("Fireball drives a point-placed circle without merging cast range and radius", () => {
  const instruction = createSpellTemplateInstruction(
    getDefaultSpellById("fireball")
  );

  assert.equal(instruction.supported, true);
  assert.equal(instruction.templateShape, "circle");
  assert.equal(instruction.placementMode, "point");
  assert.equal(instruction.rangeFeet, 150);
  assert.equal(instruction.sizeFeet, 20);
  assert.equal(instruction.previewOnly, true);
  assert.equal(
    formatSpellTemplateInstruction(instruction),
    "Fireball · Range 150 feet · 20-ft radius"
  );
});

test("Burning Hands drives a caster-origin cone", () => {
  const instruction = createSpellTemplateInstruction(
    getDefaultSpellById("burning-hands")
  );

  assert.equal(instruction.supported, true);
  assert.equal(instruction.templateShape, "cone");
  assert.equal(instruction.placementMode, "direction");
  assert.equal(instruction.rangeText, "Self");
  assert.equal(instruction.sizeFeet, 15);
});

test("Lightning Bolt drives a sized line", () => {
  const instruction = createSpellTemplateInstruction(
    getDefaultSpellById("lightning-bolt")
  );

  assert.equal(instruction.supported, true);
  assert.equal(instruction.templateShape, "line");
  assert.equal(instruction.sizeFeet, 100);
  assert.equal(instruction.widthFeet, 5);
  assert.equal(instruction.placementMode, "direction");
});

test("non-area and not-yet-supported wall spells fail safely", () => {
  const cureWounds = createSpellTemplateInstruction(
    getDefaultSpellById("cure-wounds")
  );
  const wallOfFire = createSpellTemplateInstruction(
    getDefaultSpellById("wall-of-fire")
  );

  assert.equal(cureWounds.supported, false);
  assert.match(cureWounds.reason, /no area template/i);
  assert.equal(wallOfFire.supported, false);
  assert.match(wallOfFire.reason, /not supported/i);
});
