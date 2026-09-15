import { createAnimationSequenceController } from "./animationSequence.js";
import {
  normalizeSpellAnimationReference
} from "./animationReferences.js";

const STAGE_ALIASES = Object.freeze({
  attack: "cast",
  prepare: "cast",
  projectile: "travel",
  cast: "cast",
  travel: "travel",
  impact: "impact",
  sustain: "sustain",
  end: "end"
});

const FAMILIES = new Set(["melee", "ranged", "magic"]);
const DURATION_UNITS = new Set([
  "manual",
  "seconds",
  "minutes",
  "hours",
  "rounds",
  "turns"
]);

function text(value, fallback = "", maximum = 160) {
  return String(value ?? fallback).trim().slice(0, maximum) || fallback;
}

function number(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(parsed) ? parsed : fallback)
  );
}

function copy(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function normalizeStageReferences(stages = {}) {
  const normalized = {};

  for (const [rawSlot, rawReference] of Object.entries(stages || {})) {
    const slot = STAGE_ALIASES[text(rawSlot).toLowerCase()];
    if (!slot || !rawReference) continue;
    const reference = normalizeSpellAnimationReference(rawReference);
    if (reference) normalized[slot] = reference;
  }

  return normalized;
}

export function normalizeEffectDuration(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const normalizedText = value.trim().toLowerCase();
    const match = normalizedText.match(
      /(\d+(?:\.\d+)?)\s*(rounds?|turns?|seconds?|minutes?|hours?)/
    );
    const manual = /until\s+(?:ended|dismissed)|manual/.test(normalizedText);
    if (!match && !manual && !normalizedText.includes("concentration")) return null;
    const singular = match?.[2]?.replace(/s$/, "") || "manual";
    const unit = singular === "manual" ? "manual" : `${singular}s`;
    return {
      unit,
      value: unit === "manual" ? 1 : number(match?.[1], 1, 0.001, 1000000),
      concentration: normalizedText.includes("concentration")
    };
  }

  const requestedUnit = text(value.unit || value.type, "manual").toLowerCase();
  const singular = requestedUnit.replace(/s$/, "");
  const unit = singular === "manual" ? "manual" : `${singular}s`;
  if (!DURATION_UNITS.has(unit)) return null;

  return {
    unit,
    value: unit === "manual"
      ? 1
      : number(value.value ?? value.amount, 1, 0.001, 1000000),
    concentration:
      value.concentration === true ||
      value.requiresConcentration === true,
    status: text(value.status || value.condition)
  };
}

function normalizeMotion(value = {}) {
  const kind = ["linear", "curve", "orbit", "follow"].includes(
    text(value.kind || value.type, "linear").toLowerCase()
  )
    ? text(value.kind || value.type, "linear").toLowerCase()
    : "linear";
  const points = (Array.isArray(value.points) ? value.points : [])
    .slice(0, 24)
    .map((point) => ({
      x: number(point?.x, 0, -100000, 100000),
      y: number(point?.y, 0, -100000, 100000)
    }));

  return Object.freeze({
    kind,
    points,
    curvature: number(value.curvature, 0.35, -2, 2),
    radius: number(value.radius, 64, 4, 2000),
    turns: number(value.turns, 1, 0.25, 8),
    samples: Math.round(number(value.samples, 8, 2, 24))
  });
}

function normalizeCamera(value = {}) {
  if (!value || value.enabled === false) return null;
  const shake = number(value.shake, 0, 0, 1);
  const zoom = number(value.zoom, 1, 0.5, 2);
  const durationMs = Math.round(number(value.durationMs, 240, 0, 3000));
  if (!shake && zoom === 1) return null;
  return Object.freeze({ shake, zoom, durationMs });
}

function normalizeAutomation(value = {}) {
  if (!value || typeof value !== "object") return null;
  const summon = value.summon && typeof value.summon === "object"
    ? {
        name: text(value.summon.name, "Summon"),
        imageUrl: text(value.summon.imageUrl, "", 2048),
        sizeCategory: text(value.summon.sizeCategory, "medium", 32),
        tokenType: text(value.summon.tokenType, "npc", 32),
        duration: normalizeEffectDuration(value.summon.duration)
      }
    : null;
  const transform = value.transform && typeof value.transform === "object"
    ? {
        tokenId: text(value.transform.tokenId),
        name: text(value.transform.name),
        imageUrl: text(value.transform.imageUrl, "", 2048),
        sizeCategory: text(value.transform.sizeCategory, "", 32)
      }
    : null;
  return summon || transform
    ? Object.freeze({ summon, transform })
    : null;
}

/**
 * One presentation-only attachment shared by weapons, spells, abilities,
 * items, traps, monster actions and environmental actions.
 */
export function normalizeCombatAnimationAttachment(value, options = {}) {
  if (!value) return null;
  const source = value.animation || value.presentation?.animation || value;
  const family = FAMILIES.has(source.family)
    ? source.family
    : FAMILIES.has(options.family)
      ? options.family
      : "magic";
  const stages = normalizeStageReferences(
    source.stages || source.animations || {}
  );
  if (source.animationId && !Object.keys(stages).length) {
    stages[family === "ranged" ? "travel" : "cast"] =
      normalizeSpellAnimationReference({ animationId: source.animationId });
  }
  const layers = (Array.isArray(source.layers) ? source.layers : [])
    .slice(0, 8)
    .map((layer, index) => ({
      id: text(layer?.id, `layer-${index + 1}`),
      stages: normalizeStageReferences(layer?.stages || layer?.animations || {}),
      delay: Math.round(number(layer?.delay, 0, 0, 10000))
    }))
    .filter((layer) => Object.keys(layer.stages).length);
  const motion = normalizeMotion(source.motion);

  if (!Object.keys(stages).length && !layers.length) return null;

  return Object.freeze({
    version: 1,
    family,
    stages: Object.freeze(stages),
    duration: normalizeEffectDuration(source.duration),
    targetMode: ["single", "all", "chain", "self"].includes(source.targetMode)
      ? source.targetMode
      : "single",
    layers: Object.freeze(layers),
    motion,
    camera: normalizeCamera(source.camera),
    automation: normalizeAutomation(source.automation)
  });
}

export function inferCombatAnimationFamily(content = {}) {
  const existing = content.animation?.family || content.presentation?.animation?.family;
  if (FAMILIES.has(existing)) return existing;
  const searchable = [
    content.kind,
    content.type,
    content.sourceKind,
    content.range,
    content.description,
    content.name
  ].join(" ").toLowerCase();
  if (/spell|magic|breath|aura|psionic|wand|potion/.test(searchable)) return "magic";
  if (/ranged|bow|crossbow|sling|thrown|projectile|\d+\s*\/\s*\d+\s*ft/.test(searchable)) return "ranged";
  return "melee";
}

export function attachCombatAnimation(content, animation) {
  if (!content || typeof content !== "object") {
    throw new Error("Choose the content that owns this animation.");
  }
  const normalized = normalizeCombatAnimationAttachment(animation, {
    family: inferCombatAnimationFamily(content)
  });
  if (normalized) content.animation = copy(normalized);
  else delete content.animation;
  return content.animation || null;
}

function uniqueTargets(targets, fallback) {
  const list = (Array.isArray(targets) ? targets : [targets || fallback])
    .filter(Boolean);
  const seen = new Set();
  return list.filter((target) => {
    const key = target?.id || target?.tokenId || target;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 16);
}

function pointOf(value) {
  if (!value) return null;
  if (Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) {
    return { x: Number(value.x), y: Number(value.y) };
  }
  if (Number.isFinite(Number(value.centerX)) && Number.isFinite(Number(value.centerY))) {
    return { x: Number(value.centerX), y: Number(value.centerY) };
  }
  if (typeof value.getBoundingClientRect === "function") {
    const rect = value.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  return null;
}

export function buildPresentationPath(source, target, motion = {}) {
  const normalized = normalizeMotion(motion);
  const start = pointOf(source);
  const end = pointOf(target);
  if (!start || !end) return normalized.points;
  if (normalized.kind === "linear" || normalized.kind === "follow") {
    return normalized.points.length ? normalized.points : [end];
  }
  if (normalized.kind === "curve") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const bend = length * normalized.curvature;
    const control = {
      x: (start.x + end.x) / 2 - (dy / length) * bend,
      y: (start.y + end.y) / 2 + (dx / length) * bend
    };
    return Array.from({ length: normalized.samples }, (_, index) => {
      const t = (index + 1) / normalized.samples;
      const inverse = 1 - t;
      return {
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
      };
    });
  }
  const center = end;
  const samples = Math.min(24, Math.max(2, Math.round(normalized.samples * normalized.turns)));
  return Array.from({ length: samples }, (_, index) => {
    const angle = (Math.PI * 2 * normalized.turns * (index + 1)) / samples;
    return {
      x: center.x + Math.cos(angle) * normalized.radius,
      y: center.y + Math.sin(angle) * normalized.radius
    };
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

/**
 * Host-side combat presentation. Gameplay is committed through the injected
 * callback exactly once; the animation player still never mutates game state.
 */
export function createCombatPresentationSystem({
  player,
  library,
  scheduler = globalThis,
  onCamera = () => {},
  onAutomation = () => {},
  onWarning = () => {}
} = {}) {
  if (!player) throw new Error("A shared animation player is required.");
  const sequence = createAnimationSequenceController({ player, scheduler });
  const active = new Set();

  async function play(request = {}) {
    const attachment = normalizeCombatAnimationAttachment(
      request.animation || request.content,
      { family: inferCombatAnimationFamily(request.content || {}) }
    );
    const commit = typeof request.commit === "function"
      ? request.commit
      : () => true;
    let committed = false;
    const commitOnce = async (reason) => {
      if (committed) return false;
      committed = true;
      await commit({ reason, request, attachment });
      return true;
    };

    if (!attachment) {
      await commitOnce("no-animation");
      return {
        ok: true,
        skipped: true,
        reason: "no-animation",
        impactReady: Promise.resolve("no-animation"),
        committed: Promise.resolve(true),
        finished: Promise.resolve({ ok: true, reason: "no-animation" }),
        cancel() {},
        end() {}
      };
    }

    const ids = [
      ...Object.values(attachment.stages),
      ...attachment.layers.flatMap((layer) => Object.values(layer.stages))
    ].map((reference) => reference.animationId);
    if (library && ids.some((id) => !library.getAnimation(id))) {
      onWarning("A referenced combat animation is unavailable; gameplay continued without it.");
      await commitOnce("animation-unavailable");
      return {
        ok: true,
        skipped: true,
        reason: "animation-unavailable",
        impactReady: Promise.resolve("animation-unavailable"),
        committed: Promise.resolve(true),
        finished: Promise.resolve({ ok: true, reason: "animation-unavailable" }),
        cancel() {},
        end() {}
      };
    }

    const targetMode = ["single", "all", "chain", "self"].includes(request.targetMode)
      ? request.targetMode
      : attachment.targetMode;
    const destinations = targetMode === "self"
      ? uniqueTargets([request.source], request.source)
      : uniqueTargets(
          targetMode === "single"
            ? [request.target || request.targets?.[0]]
            : request.targets,
          request.target
        );
    if (!destinations.length) destinations.push(request.target || request.source);

    const impact = deferred();
    const controllers = [];
    const record = {
      attachment,
      controllers,
      cancel() {
        controllers.forEach((controller) => controller.cancel?.());
        active.delete(record);
      },
      end() {
        controllers.forEach((controller) => controller.end?.());
      },
      pause() {
        controllers.forEach((controller) => controller.pause?.());
      },
      resume() {
        controllers.forEach((controller) => controller.resume?.());
      }
    };
    active.add(record);

    let impactResolved = false;
    const noteImpact = (event) => {
      if (impactResolved) return;
      if (["impact", "arrived"].includes(event?.type) ||
          event?.type === "stage" && event.slot === "impact") {
        impactResolved = true;
        impact.resolve(event?.type || "impact");
      }
    };
    const stageSets = [
      { id: "base", stages: attachment.stages, delay: 0 },
      ...attachment.layers
    ];

    try {
      for (const [destinationIndex, destination] of destinations.entries()) {
        const orbitStartedAt = Date.now();
        const runtimeDestination = attachment.motion.kind === "orbit"
          ? () => {
              const center = pointOf(destination) || { x: 0, y: 0 };
              const progress = ((Date.now() - orbitStartedAt) / 1000) * attachment.motion.turns;
              return {
                x: center.x + Math.cos(progress * Math.PI * 2) * attachment.motion.radius,
                y: center.y + Math.sin(progress * Math.PI * 2) * attachment.motion.radius
              };
            }
          : destination;
        for (const layer of stageSets) {
          if (!Object.keys(layer.stages).length) continue;
          const chainDelay = targetMode === "chain"
            ? destinationIndex * Math.round(number(request.chainDelay, 120, 0, 2000))
            : 0;
          const layerStages = Object.fromEntries(
            Object.entries(layer.stages).map(([slot, reference], index) => [
              slot,
              {
                ...reference,
                ...(index === 0 && (layer.delay || chainDelay)
                  ? {
                      delay: Math.min(
                        10000,
                        (Number(reference.delay) || 0) + layer.delay + chainDelay
                      )
                    }
                  : {}),
                ...(slot === "travel" && attachment.motion.kind === "curve"
                  ? {
                      overrides: {
                        ...reference.overrides,
                        projectile: {
                          ...reference.overrides?.projectile,
                          arcHeight: Math.round(240 * attachment.motion.curvature)
                        }
                      }
                    }
                  : {}),
                ...(slot === "travel" && ["orbit", "follow"].includes(attachment.motion.kind)
                  ? {
                      overrides: {
                        ...reference.overrides,
                        placement: {
                          ...reference.overrides?.placement,
                          followTarget: true
                        }
                      }
                    }
                  : {})
              }
            ])
          );
          const controller = await sequence.playAnimationSequence({
            animations: layerStages,
            source: request.source,
            target: runtimeDestination,
            sourcePoint: pointOf(request.source),
            targetPoint: pointOf(destination),
            duration: request.manageDurationExternally && attachment.duration
              ? { ...attachment.duration, unit: "manual", value: 1 }
              : attachment.duration,
            maximumDuration: request.maximumDuration || 8000,
            onEvent(event) {
              noteImpact(event);
              request.onEvent?.({ ...event, target: destination, layer: layer.id });
            }
          });
          if (controller?.ok) controllers.push(controller);
        }
      }
    } catch (error) {
      onWarning(error?.message || "Combat animation failed; gameplay continued.");
    }

    if (!controllers.length) {
      impactResolved = true;
      impact.resolve("animation-unavailable");
    }

    const committedPromise = impact.promise.then(async (reason) => {
      if (attachment.camera) {
        try { onCamera({ phase: "impact", ...attachment.camera, request }); } catch {}
      }
      const result = await commitOnce(reason);
      if (attachment.automation) {
        try {
          await onAutomation({
            automation: attachment.automation,
            request,
            targets: destinations
          });
        } catch (error) {
          onWarning(error?.message || "Token automation could not complete.");
        }
      }
      return result;
    });

    const timeout = scheduler.setTimeout(
      () => {
        if (!impactResolved) {
          impactResolved = true;
          impact.resolve("presentation-timeout");
        }
      },
      Math.min(10000, Math.max(250, Number(request.maximumDuration) || 8000))
    );
    const finished = Promise.all(
      controllers.map((controller) => controller.finished)
    ).then((results) => ({
      ok: results.every((result) => result?.ok !== false),
      reason: "completed",
      results
    })).finally(() => {
      scheduler.clearTimeout(timeout);
      if (!impactResolved) {
        impactResolved = true;
        impact.resolve("animation-complete");
      }
      active.delete(record);
    });

    return {
      ok: true,
      attachment,
      controllers,
      impactReady: impact.promise,
      committed: committedPromise,
      finished,
      cancel: record.cancel,
      end: record.end,
      pause: record.pause,
      resume: record.resume,
      path: buildPresentationPath(request.source, request.target, attachment.motion)
    };
  }

  return Object.freeze({
    play,
    clear() {
      [...active].forEach((record) => record.cancel());
      sequence.clear();
    },
    getActive: () => [...active]
  });
}
