import {
  normalizeTemplateDistance
} from "./templateGeometry.js";

const SHAPE_MAP = Object.freeze({
  sphere: "circle",
  cylinder: "circle",
  cone: "cone",
  line: "line",
  cube: "square"
});

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

function getAreaSize(area, templateShape) {
  if (templateShape === "circle") {
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

export function createSpellTemplateInstruction(spell = {}) {
  const targeting = spell.targeting;
  const area = targeting?.area;
  const templateShape = SHAPE_MAP[area?.shape];
  const targetType = cleanText(
    targeting?.target?.type
  ).toLowerCase();

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
    templateShape === "square"
      ? sizeFeet
      : 5
  );
  const rangeFeet = Number.isFinite(
    targeting.range?.feet
  )
    ? targeting.range.feet
    : null;
  const name = cleanText(spell.name, "Spell");

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

  const area = instruction.templateShape === "circle"
    ? `${instruction.sizeFeet}-ft radius`
    : instruction.templateShape === "line"
      ? `${instruction.sizeFeet} ft × ${instruction.widthFeet} ft`
      : `${instruction.sizeFeet} ft`;
  return `${instruction.spellName} · Range ${instruction.rangeText} · ${area}`;
}
