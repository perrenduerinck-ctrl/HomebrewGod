import {
  normalizeTemplateDistance,
  normalizeTemplateHeight
} from "./templateGeometry.js";

const SHAPE_MAP = Object.freeze({
  sphere: "sphere",
  cylinder: "cylinder",
  cone: "cone",
  line: "line",
  cube: "cube"
});
const SINGLE_TARGET_TYPES = Object.freeze([
  "creature",
  "object"
]);
const SINGLE_TARGET_RADIUS_FEET = 2.5;

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

function getAreaSize(area, templateShape) {
  if (
    templateShape === "sphere" ||
    templateShape === "cylinder"
  ) {
    return area.radius;
  }
  if (
    templateShape === "cone" ||
    templateShape === "line"
  ) {
    return area.length;
  }
  return area.side;
}

export function createSpellTemplateInstruction(spell = {}, { allowTouchPreview = false } = {}) {
  const targeting = spell.targeting;
  const area = targeting?.area;
  const templateShape = SHAPE_MAP[area?.shape];
  const targetType = cleanText(
    targeting?.target?.type
  ).toLowerCase();
  // A character-free DM preview uses a one-square touch reach. Real casting
  // keeps its existing targeting rules; this opt-in is presentation only.
  const touchPreview = allowTouchPreview && targeting?.range?.type === "touch";
  const rangeFeet = touchPreview ? 5 : Number.isFinite(
    targeting?.range?.feet
  )
    ? targeting.range.feet
    : null;
  const name = cleanText(spell.name, "Spell");

  if (
    targeting &&
    !area &&
    rangeFeet !== null &&
    SINGLE_TARGET_TYPES.includes(targetType)
  ) {
    return Object.freeze({
      supported: true,
      spellId: cleanText(spell.id),
      spellName: name,
      sourceShape: "single-target",
      templateShape: "circle",
      targetType: "point",
      sourceTargetType: targetType,
      placementMode: "point",
      sizeFeet: SINGLE_TARGET_RADIUS_FEET,
      widthFeet: SINGLE_TARGET_RADIUS_FEET * 2,
      heightFeet: 0,
      rangeType: targeting.range?.type || "distance",
      rangeFeet,
      rangeText: touchPreview ? "Touch (5-ft preview reach)" : cleanText(
        targeting.range?.text,
        `${rangeFeet} feet`
      ),
      singleTarget: true,
      previewOnly: true
    });
  }

  if (!targeting || !area) {
    return Object.freeze({
      supported: false,
      reason: "This spell has no area template."
    });
  }

  if (!templateShape) {
    return Object.freeze({
      supported: false,
      reason: `${cleanText(area.shape, "This area shape")} is not supported by the basic template engine yet.`
    });
  }

  if (
    targetType !== "point" &&
    targetType !== "direction" &&
    targetType !== "self"
  ) {
    return Object.freeze({
      supported: false,
      reason: "This spell does not use point, direction, or self-area placement."
    });
  }

  const sizeFeet = normalizeTemplateDistance(
    getAreaSize(area, templateShape),
    5
  );
  const widthFeet = normalizeTemplateDistance(
    area.width,
    templateShape === "cube"
      ? sizeFeet
      : 5
  );
  const heightFeet = normalizeTemplateHeight(
    area.height,
    templateShape === "sphere"
      ? sizeFeet * 2
      : templateShape === "cube"
        ? sizeFeet
        : templateShape === "cylinder"
          ? sizeFeet * 2
          : 0
  );
  return Object.freeze({
    supported: true,
    spellId: cleanText(spell.id),
    spellName: name,
    sourceShape: area.shape,
    templateShape,
    targetType,
    placementMode:
      targetType === "point"
        ? "point"
        : "direction",
    sizeFeet,
    widthFeet,
    heightFeet,
    rangeType: targeting.range?.type || "special",
    rangeFeet,
    rangeText: cleanText(
      targeting.range?.text,
      targeting.range?.type === "self"
        ? "Self"
        : "Special"
    ),
    previewOnly: true
  });
}

export function formatSpellTemplateInstruction(instruction) {
  if (!instruction?.supported) {
    return instruction?.reason || "Spell template unavailable.";
  }

  if (instruction.singleTarget) {
    return `${instruction.spellName} · Range ${instruction.rangeText} · single target`;
  }

  const area = instruction.templateShape === "sphere"
    ? `${instruction.sizeFeet}-ft radius`
    : instruction.templateShape === "cylinder"
      ? `${instruction.sizeFeet}-ft radius × ${instruction.heightFeet} ft high`
    : instruction.templateShape === "line"
      ? `${instruction.sizeFeet} ft × ${instruction.widthFeet} ft`
      : instruction.templateShape === "cube"
        ? `${instruction.sizeFeet}-ft cube`
        : `${instruction.sizeFeet} ft`;
  return `${instruction.spellName} · Range ${instruction.rangeText} · ${area}`;
}
