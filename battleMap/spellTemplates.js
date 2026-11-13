import {
  normalizeTemplateDistance,
  normalizeTemplateHeight
} from "./templateGeometry.js";
import { createSpellTargetingData } from "../data/spellTargeting.js";

const SHAPE_MAP = Object.freeze({
  sphere: "sphere",
  cylinder: "cylinder",
  cone: "cone",
  line: "line",
  wall: "line",
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

export function createSpellTemplateInstruction(spell = {}, { allowTouchPreview = false, vfxPreview = null } = {}) {
  // Saved custom spells retain plain range/area fields. Derive the same
  // targeting schema used by the catalog at this shared preview/cast boundary.
  // Explicit targeting remains authoritative; unknown ranges still fail safely.
  const targeting = spell.targeting || createSpellTargetingData(spell);
  const area = targeting?.area;
  const templateShape = SHAPE_MAP[area?.shape];
  const targetType = cleanText(
    targeting?.target?.type
  ).toLowerCase();
  // A character-free DM preview uses a one-square touch reach. Real casting
  // keeps its existing targeting rules; this opt-in is presentation only.
  const touchRange = targeting?.range?.type === "touch";
  const touchPreview = allowTouchPreview && touchRange;
  const rangeFeet = touchRange ? 5 : Number.isFinite(
    targeting?.range?.feet
  )
    ? targeting.range.feet
    : null;
  const name = cleanText(spell.name, "Spell");

  // Profile placement is opt-in for DM presentation, never a real cast rule.
  if (allowTouchPreview && vfxPreview) {
    const self = vfxPreview.mode === "self";
    const cube = vfxPreview.shape === "cube";
    const size = normalizeTemplateDistance(vfxPreview.sizeFeet, 2.5);
    return Object.freeze({ supported: true, spellId: cleanText(spell.id), spellName: name,
      sourceShape: cube ? "cube" : "single-target", templateShape: cube ? "cube" : "circle",
      targetType: self ? "self" : "point", sourceTargetType: targetType,
      placementMode: "point", sizeFeet: size, widthFeet: cube ? size : size * 2,
      heightFeet: cube ? size : 0, rangeType: self ? "self" : "distance",
      rangeFeet: self ? null : normalizeTemplateDistance(vfxPreview.rangeFeet, 5),
      rangeText: cleanText(vfxPreview.label, self ? "Self (visual preview)" : "Preview reach"),
      singleTarget: !cube, previewOnly: true });
  }

  if (!allowTouchPreview && (targetType === "special" || targeting?.range?.type === "special")) {
    return Object.freeze({ supported: false, reason: "This spell has special targeting or range. Resolve its targets manually with the DM." });
  }

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
      rangeText: touchRange ? "Touch (5-ft reach)" : cleanText(
        targeting.range?.text,
        `${rangeFeet} feet`
      ),
      singleTarget: true,
      manualResolution: targetType === "object" ? "Choose a visible map object. Verify spell-specific object restrictions and resolve its effects with the DM." : "",
      previewOnly: true
    });
  }

  if (
    targeting &&
    !area &&
    (
      targetType === "self" ||
      targetType === "special" ||
      targeting.range?.type === "special"
    )
  ) {
    return Object.freeze({
      supported: true,
      spellId: cleanText(spell.id),
      spellName: name,
      sourceShape: "self",
      templateShape: "circle",
      targetType: "self",
      sourceTargetType: targetType,
      placementMode: "self",
      sizeFeet: SINGLE_TARGET_RADIUS_FEET,
      widthFeet: SINGLE_TARGET_RADIUS_FEET * 2,
      heightFeet: 0,
      rangeType: targeting.range?.type || "special",
      rangeFeet: null,
      rangeText: cleanText(targeting.range?.text, "Self / special"),
      singleTarget: true,
      requiresMapTarget: false,
      previewOnly: true
    });
  }

  if (!targeting || !area) {
    return Object.freeze({
      supported: false,
      reason: "This spell has no area template."
    });
  }

  if (area.shape === "wall" && (!Number.isFinite(rangeFeet) || ![area.length, area.width, area.height].every((value) => Number.isFinite(value) && value > 0))) {
    return Object.freeze({ supported: false, reason: "A straight wall needs a numeric range, length, width and height. Resolve other wall forms manually with the DM." });
  }

  if (!templateShape) {
    return Object.freeze({
      supported: false,
      reason: `${cleanText(area.shape, "This area shape")} is not supported by the basic template engine yet. Resolve its shape and targets manually with the DM.`
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
    manualResolution: area.shape === "wall" ? "Straight wall only. Resolve bends, rings, side-dependent damage and continuing effects with the DM." : "",
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

  if (instruction.sourceShape === "wall") return `${instruction.spellName} · Range ${instruction.rangeText} · straight wall ${instruction.sizeFeet} × ${instruction.widthFeet} × ${instruction.heightFeet} ft · ${instruction.manualResolution}`;
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

export function prepareSpellTemplateGeometry(geometry, instruction) {
  if (!geometry || instruction?.sourceShape !== "wall") return geometry;
  const base = Number(geometry.elevationFeet) || 0;
  return { ...geometry, verticalBounds: { minFeet: base, maxFeet: base + instruction.heightFeet, heightFeet: instruction.heightFeet } };
}
