import { createTemplateGeometry } from "./templateGeometry.js";
import { measureMapDistance, formatMapDistance } from "./measurement.js";
import { normalizeElevation } from "./elevation.js";

// Presentation-only state. Deliberately has no character, persistence, or cast adapter.
export function createSpellPreviewSession({
  spell,
  instruction,
  getMetrics = () => ({})
} = {}) {
  if (!spell || !instruction?.supported) {
    throw new TypeError("A supported spell is required for preview.");
  }

  let caster = null;
  let target = null;
  let locked = false;
  const directional = ["cone", "line"].includes(instruction.templateShape);
  const selfCentered = instruction.targetType === "self" && !directional;
  const projectile = String(
    spell.targeting?.attack?.type || spell.attackType || ""
  ).toLowerCase().includes("ranged");

  function copyPoint(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return null;
    }
    return Object.freeze({
      x: point.x,
      y: point.y,
      xRatio: Number.isFinite(point.xRatio) ? point.xRatio : null,
      yRatio: Number.isFinite(point.yRatio) ? point.yRatio : null
    });
  }

  function projectPoint(point, metrics) {
    if (!point) return null;
    return copyPoint({
      ...point,
      x: Number.isFinite(point.xRatio) && metrics.width > 0
        ? point.xRatio * metrics.width : point.x,
      y: Number.isFinite(point.yRatio) && metrics.height > 0
        ? point.yRatio * metrics.height : point.y
    });
  }

  function getState() {
    const metrics = getMetrics();
    const previewCasterPoint = projectPoint(caster, metrics);
    const previewTargetPoint = projectPoint(target, metrics);
    const previewCasterElevation = normalizeElevation(metrics.startElevationFeet);
    const previewTargetElevation = selfCentered || directional
      ? previewCasterElevation
      : normalizeElevation(metrics.endElevationFeet);
    const measurement = previewCasterPoint && previewTargetPoint
      ? measureMapDistance(previewCasterPoint, previewTargetPoint, {
          ...metrics,
          startElevationFeet: previewCasterElevation,
          endElevationFeet: previewTargetElevation
        })
      : null;
    // Self-origin cones/lines use the second point only for aiming. Their
    // reach is the template length, not a distance limit on the aiming cursor.
    const maxRangeFeet = instruction.rangeType !== "self" &&
      Number.isFinite(instruction.rangeFeet)
      ? instruction.rangeFeet : null;
    const hasDirection = selfCentered || (!directional && !projectile) ||
      (measurement?.pixelDistance || 0) > 0.001;
    const inRange = Boolean(measurement && hasDirection && (
      maxRangeFeet === null || measurement.feet <= maxRangeFeet + 0.001
    ));
    const previewGeometry = measurement && hasDirection
      ? createTemplateGeometry({
          shape: instruction.templateShape,
          anchor: previewCasterPoint,
          pointer: previewTargetPoint,
          sizeFeet: instruction.sizeFeet,
          widthFeet: instruction.widthFeet,
          heightFeet: instruction.heightFeet,
          elevationFeet: previewTargetElevation,
          pixelsPerSquare: metrics.pixelsPerSquare,
          feetPerSquare: metrics.feetPerSquare
        })
      : null;
    return Object.freeze({
      spellId: spell.id,
      previewCasterPoint,
      previewCasterElevation,
      previewTargetPoint,
      previewTargetElevation,
      previewLocked: locked,
      inRange,
      rangeFeet: measurement?.feet ?? 0,
      maxRangeFeet,
      measurement,
      previewInstruction: instruction,
      previewGeometry,
      directional,
      hasDirection,
      phase: !caster ? "caster" : locked ? "locked" : "aiming",
      canPlay: Boolean(locked && inRange && previewGeometry)
    });
  }

  function pickPoint(point) {
    const next = copyPoint(point);
    if (!next || locked) return getState();
    if (!caster) {
      caster = next;
      if (selfCentered) {
        target = next;
        locked = true;
      }
    } else {
      target = next;
      locked = true;
    }
    return getState();
  }

  function aimAt(point) {
    if (caster && !locked) target = copyPoint(point);
    return getState();
  }

  function reset() {
    caster = null;
    target = null;
    locked = false;
    return getState();
  }

  return Object.freeze({ getState, pickPoint, aimAt, reset });
}

export function formatSpellPreviewStatus(state) {
  if (!state?.previewCasterPoint) return "Click caster position.";
  const range = state.maxRangeFeet === null
    ? `${formatMapDistance(state.rangeFeet)} aim · ${state.previewInstruction.rangeText}${
        state.directional ? ` (${state.previewInstruction.sizeFeet}-ft ${state.previewInstruction.templateShape})` : ""
      }`
    : `${formatMapDistance(state.rangeFeet)} / ${state.maxRangeFeet} ft`;
  if (!state.previewTargetPoint) return `Caster set. Click target. ${range}`;
  if (!state.hasDirection) return `Choose a different target point to set direction. ${range}`;
  if (!state.inRange) return `${range} — Out of range${state.previewLocked ? ". Reset Preview to try again." : ""}`;
  return state.previewLocked
    ? `Target locked. ${range}. Ready to preview.`
    : `Caster set. Click target. ${range}`;
}
