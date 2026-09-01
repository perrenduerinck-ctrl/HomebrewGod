import {
  FIRE_CASTING_SEQUENCE_DEFINITIONS
} from "./fireEffects.js?v=2d5-animation-20260901";
import { CANTRIP_CASTING_SEQUENCE_DEFINITIONS } from "./cantripEffects.js?v=status-sprites-20260831";
import { SPELL_VFX_PROFILES, defineSpellVfxProfile } from "./spellVfxProfiles.js?v=status-sprites-20260831";
import { compileSpellVfxProfile } from "./profileSequence.js?v=status-sprites-20260831";
import { LIGHTNING_5X5_SEQUENCE } from "./lightning5x5.js?v=status-sprites-20260831";

import { createSpellAudioPlayer, normalizeSoundCue } from "./spellAudio.js?v=status-sprites-20260831";

export const CASTING_SEQUENCE_SCHEMA_VERSION = 1;
export const CASTING_SEQUENCE_PHASES = Object.freeze([
  "charge",
  "release",
  "travel",
  "impact",
  "aftermath",
  "cleanup"
]);
export const CASTING_SEQUENCE_ANCHORS = Object.freeze([
  "caster",
  "target",
  "path",
  "affected-tokens"
]);
export const MAX_ACTIVE_CASTING_SEQUENCES = 16;
export const MAX_CASTING_SEQUENCE_DURATION_MS = 20000;
export const MAX_EFFECTS_PER_SEQUENCE_PHASE = 8;
export const MAX_EFFECT_INSTANCES_PER_SEQUENCE_PHASE = 32;

const DEFAULT_PHASE_DURATIONS = Object.freeze({
  charge: 180,
  release: 90,
  travel: 280,
  impact: 200,
  aftermath: 320,
  cleanup: 0
});

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value, fallback = "", maximum = 160) {
  return String(value ?? fallback)
    .trim()
    .slice(0, maximum);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function boundedNumber(value, fallback, minimum, maximum) {
  return clamp(
    finiteNumber(value) ?? fallback,
    minimum,
    maximum
  );
}

function normalizeIdList(value, maximum = 32) {
  return Object.freeze(
    Array.from(new Set(
      (Array.isArray(value) ? value : [value])
        .map(cleanId)
        .filter(Boolean)
        .slice(0, maximum)
    ))
  );
}

function freezeOptions(value) {
  if (!value || typeof value !== "object") return null;
  return Object.freeze({ ...value });
}

function freezeList(value, maximum = 32) {
  return Object.freeze(
    (Array.isArray(value) ? value : [])
      .slice(0, maximum)
      .map((item) => Object.freeze({ ...(item || {}) }))
  );
}

function normalizeSequenceEffect(effect = {}) {
  const type = cleanId(
    effect.type || effect.effectType || "procedural-pulse"
  ) || "procedural-pulse";
  const requestedAnchor = cleanId(effect.anchor || "target");

  return Object.freeze({
    type,
    preset: cleanId(effect.preset),
    anchor: CASTING_SEQUENCE_ANCHORS.includes(requestedAnchor)
      ? requestedAnchor
      : "target",
    scale: boundedNumber(effect.scale, 1, 0.05, 20),
    maxGeometryScale: boundedNumber(effect.maxGeometryScale, 20, .1, 20),
    rotation: boundedNumber(effect.rotation, 0, -3600, 3600),
    opacity: boundedNumber(effect.opacity, 1, 0, 1),
    duration: finiteNumber(effect.duration) === null
      ? null
      : Math.round(boundedNumber(effect.duration, 0, 0, 5000)),
    geometryScaleBasePixels:
      finiteNumber(effect.geometryScaleBasePixels) === null
        ? null
        : boundedNumber(
            effect.geometryScaleBasePixels,
            72,
            8,
            4096
          ),
    intensityOffset: Math.round(boundedNumber(
      effect.intensityOffset,
      0,
      -4,
      4
    )),
    intensity: finiteNumber(effect.intensity) === null ? null
      : Math.round(boundedNumber(effect.intensity, 1, 1, 5)),
    particles: freezeOptions(effect.particles),
    sprite: freezeOptions(effect.sprite),
    layer: cleanId(effect.layer),
    motion: freezeOptions(effect.motion),
    shadow: effect.shadow === false ? false : freezeOptions(effect.shadow),
    heightScaling: effect.heightScaling === false
      ? false
      : freezeOptions(effect.heightScaling),
    attachment: freezeOptions(effect.attachment),
    timeline: freezeList(effect.timeline || effect.events),
    persistent: effect.persistent === true,
    fadeOut: effect.fadeOut !== false,
    attachToGrid: effect.attachToGrid === true,
    fullOnly: effect.fullOnly === true,
    persistentLifetime: finiteNumber(effect.persistentLifetime) === null
      ? null
      : Math.round(boundedNumber(
          effect.persistentLifetime,
          1,
          1,
          60000
        )),
    metadata: Object.freeze({
      ...(effect.metadata || {})
    })
  });
}

function getRequestedPhase(phases, phaseName) {
  if (Array.isArray(phases)) {
    return phases.find((phase) => (
      cleanId(phase?.phase || phase?.id) === phaseName
    )) || {};
  }
  return phases?.[phaseName] || {};
}

function normalizePhases(phases) {
  let elapsed = 0;

  return Object.freeze(
    CASTING_SEQUENCE_PHASES.map((phaseName) => {
      const requested = getRequestedPhase(phases, phaseName);
      const remaining = Math.max(
        0,
        MAX_CASTING_SEQUENCE_DURATION_MS - elapsed
      );
      const delay = Math.min(
        remaining,
        Math.round(boundedNumber(requested.delay, 0, 0, 5000))
      );
      elapsed += delay;
      const duration = phaseName === "cleanup"
        ? 0
        : Math.min(
            Math.max(
              0,
              MAX_CASTING_SEQUENCE_DURATION_MS - elapsed
            ),
            Math.round(boundedNumber(
              requested.duration,
              DEFAULT_PHASE_DURATIONS[phaseName],
              0,
              5000
            ))
          );
      elapsed += duration;
      const effects = phaseName === "cleanup"
        ? []
        : (Array.isArray(requested.effects) ? requested.effects : [])
            .slice(0, MAX_EFFECTS_PER_SEQUENCE_PHASE)
            .map(normalizeSequenceEffect);

      return Object.freeze({
        phase: phaseName,
        delay,
        duration,
        effects: Object.freeze(effects)
      });
    })
  );
}

export function defineCastingSequence(definition = {}) {
  const id = cleanId(definition.id);
  if (!id) {
    throw new TypeError(
      "Casting sequences require a stable id."
    );
  }

  const phases = normalizePhases(definition.phases || {});
  const totalDuration = phases.reduce(
    (total, phase) => total + phase.delay + phase.duration,
    0
  );

  return Object.freeze({
    schemaVersion: CASTING_SEQUENCE_SCHEMA_VERSION,
    id,
    label: cleanText(definition.label, id) || id,
    source: definition.source === "profile" ? "profile" : "sequence",
    family: cleanId(definition.family),
    sound: normalizeSoundCue(definition.sound),
    spellLevel: Math.round(boundedNumber(definition.spellLevel, 0, 0, 9)),
    scaling: definition.scaling ? Object.freeze({ ...definition.scaling }) : null,
    priority: Math.round(boundedNumber(
      definition.priority,
      0,
      -100,
      100
    )),
    match: Object.freeze({
      spellIds: normalizeIdList(definition.match?.spellIds),
      deliveryTypes: normalizeIdList(
        definition.match?.deliveryTypes
      ),
      damageTypes: normalizeIdList(definition.match?.damageTypes)
    }),
    phases,
    totalDuration
  });
}

function matchesSequence(definition, event = {}) {
  const spellId = cleanId(event.spellId);
  const deliveryType = cleanId(event.deliveryType);
  const damageTypes = new Set(
    normalizeIdList(event.damageTypes)
  );
  const match = definition.match;

  if (match.spellIds.length && !match.spellIds.includes(spellId)) {
    return false;
  }
  if (
    match.deliveryTypes.length &&
    !match.deliveryTypes.includes(deliveryType)
  ) {
    return false;
  }
  if (
    match.damageTypes.length &&
    !match.damageTypes.some((type) => damageTypes.has(type))
  ) {
    return false;
  }
  return true;
}

function matchScore(definition) {
  return (
    definition.priority +
    (definition.match.spellIds.length ? 1000 : 0) +
    (definition.match.deliveryTypes.length ? 100 : 0) +
    (definition.match.damageTypes.length ? 10 : 0)
  );
}

export function createCastingSequenceRegistry(
  initialDefinitions = [],
  { profiles = [] } = {}
) {
  const definitions = new Map();
  const profileMap = new Map();
  for (const raw of profiles) {
    const profile = defineSpellVfxProfile(raw);
    if (profileMap.has(profile.spellId)) throw new Error(`Duplicate profile: ${profile.spellId}`);
    profileMap.set(profile.spellId, profile);
  }

  function register(definition, { replace = false } = {}) {
    const normalized = defineCastingSequence(definition);
    if (definitions.has(normalized.id) && replace !== true) {
      throw new Error(
        `Casting sequence already exists: ${normalized.id}`
      );
    }
    definitions.set(normalized.id, normalized);
    return normalized;
  }

  function get(id, event = {}) {
    const key = cleanId(id);
    const profile = profileMap.get(key.replace(/^profile-/, ""));
    return definitions.get(key) || (profile
      ? defineCastingSequence(compileSpellVfxProfile(profile, event)) : null);
  }

  function resolve(event) {
    const matches = Array.from(definitions.values())
      .filter((definition) => matchesSequence(definition, event))
      .sort((left, right) => (
        matchScore(right) - matchScore(left)
      ));
    // An explicit override always wins, regardless of generic priority.
    const override = matches.find((definition) => definition.match.spellIds.length);
    if (override) return override;
    const profile = profileMap.get(cleanId(event?.spellId));
    if (profile) return defineCastingSequence(compileSpellVfxProfile(profile, event));
    return matches[0] || null;
  }

  initialDefinitions.forEach((definition) => register(definition));

  return Object.freeze({
    get,
    has: (id) => Boolean(get(id)),
    list: () => Object.freeze([...definitions.values(), ...Array.from(profileMap.values())
      .map((profile) => defineCastingSequence(compileSpellVfxProfile(profile)))]),
    register,
    resolve,
    unregister: (id) => definitions.delete(cleanId(id))
  });
}

function makeStandardSequence({
  id,
  label,
  deliveryTypes,
  travelAnchor = "path",
  travelDuration = 280,
  impactScale = 1.2
}) {
  return {
    id,
    label,
    match: { deliveryTypes },
    phases: {
      charge: {
        duration: 180,
        effects: [{
          type: "procedural-pulse",
          anchor: "caster",
          scale: 0.65,
          metadata: { role: "charge" }
        }]
      },
      release: {
        duration: 90,
        effects: [{
          type: "procedural-pulse",
          anchor: "caster",
          scale: 0.9,
          metadata: { role: "release" }
        }]
      },
      travel: {
        duration: travelDuration,
        effects: [{
          type: "procedural-pulse",
          anchor: travelAnchor,
          scale: 0.55,
          metadata: { role: "travel" }
        }]
      },
      impact: {
        duration: 200,
        effects: [{
          type: "procedural-pulse",
          anchor: "target",
          scale: impactScale,
          metadata: { role: "impact" }
        }]
      },
      aftermath: {
        duration: 320,
        effects: [{
          type: "procedural-pulse",
          anchor: "target",
          scale: 0.75,
          opacity: 0.6,
          particles: {
            count: 6,
            distance: 30,
            size: 3
          },
          metadata: { role: "aftermath" }
        }]
      },
      cleanup: {}
    }
  };
}

export const DEFAULT_CASTING_SEQUENCES = Object.freeze([
  defineCastingSequence(makeStandardSequence({
    id: "generic-projectile",
    label: "Projectile",
    deliveryTypes: ["projectile"],
    travelDuration: 360
  })),
  defineCastingSequence(makeStandardSequence({
    id: "generic-burst",
    label: "Burst",
    deliveryTypes: ["burst"],
    travelDuration: 320,
    impactScale: 1.35
  })),
  defineCastingSequence(makeStandardSequence({
    id: "generic-line",
    label: "Line or Beam",
    deliveryTypes: ["line", "beam"],
    travelDuration: 220,
    impactScale: 1.1
  })),
  defineCastingSequence(makeStandardSequence({
    id: "generic-cone",
    label: "Cone",
    deliveryTypes: ["cone"],
    travelDuration: 240,
    impactScale: 1.15
  })),
  defineCastingSequence(makeStandardSequence({
    id: "generic-aura",
    label: "Aura or Self",
    deliveryTypes: ["aura", "self"],
    travelAnchor: "caster",
    travelDuration: 160,
    impactScale: 1.25
  })),
  defineCastingSequence(makeStandardSequence({
    id: "generic-impact",
    label: "Point or Impact",
    deliveryTypes: ["point", "impact"],
    travelAnchor: "target",
    travelDuration: 120,
    impactScale: 1.2
  }))
]);

export const DEFAULT_FIRE_CASTING_SEQUENCES = Object.freeze(
  FIRE_CASTING_SEQUENCE_DEFINITIONS.map(defineCastingSequence)
);

export function createDefaultCastingSequenceRegistry() {
  return createCastingSequenceRegistry(
    [
      ...DEFAULT_CASTING_SEQUENCES,
      ...DEFAULT_FIRE_CASTING_SEQUENCES,
      ...CANTRIP_CASTING_SEQUENCE_DEFINITIONS,
      LIGHTNING_5X5_SEQUENCE
    ],
    { profiles: SPELL_VFX_PROFILES }
  );
}

function createDefaultScheduler() {
  return Object.freeze({
    clearTimeout: (handle) => clearTimeout(handle),
    now: () => Date.now(),
    setTimeout: (callback, delay) => setTimeout(callback, delay)
  });
}

function getTimingScale(effectEngine) {
  try {
    const mode = effectEngine.getState?.().mode;
    if (mode === "off") return 0;
    if (mode === "reduced") return 0.6;
  } catch {
    // A missing state adapter should not prevent presentation.
  }
  return 1;
}

function resolveAnchorPoints(effect, event) {
  const casterPoint = event?.casterPoint || event?.targetPoint || null;
  const directional = ["cone", "line"].includes(event?.geometry?.shape);
  const targetPoint = (directional && event?.geometry?.directionPoint) ||
    event?.targetPoint || event?.casterPoint || null;

  if (effect.anchor === "caster") {
    return [{
      position: casterPoint,
      elevation: event?.casterElevation
    }];
  }
  if (effect.anchor === "path") {
    return [{
      position: targetPoint,
      startPosition: casterPoint,
      endPosition: targetPoint,
      elevation: event?.targetElevation,
      startElevation: event?.casterElevation,
      endElevation: event?.targetElevation
    }];
  }
  if (effect.anchor === "affected-tokens") {
    const affected = (Array.isArray(event?.affectedTokens)
      ? event.affectedTokens
      : [])
      .filter((token) => token?.center)
      .slice(0, MAX_EFFECT_INSTANCES_PER_SEQUENCE_PHASE)
      .map((token) => ({
        position: token.center,
        elevation: token.elevation ?? event?.targetElevation,
        affectedTokenId: cleanText(token.id, "", 160)
      }));
    return affected.length
      ? affected
      : [{
          position: targetPoint,
          elevation: event?.targetElevation
        }];
  }
  return [{
    position: targetPoint,
    elevation: event?.targetElevation
  }];
}

function makeEffectRequest({
  effect,
  event,
  phase,
  phaseIndex,
  sequenceId,
  points,
  timingScale
}) {
  const intensity = clamp(
    Math.round(
      (effect.intensity ?? finiteNumber(event?.intensity) ?? 1) +
      effect.intensityOffset
    ),
    1,
    5
  );
  const duration = Math.round(
    (effect.duration ?? phase.duration) * timingScale
  );
  const geometryDiameter = Math.max(
    finiteNumber(event?.geometry?.bounds?.width) ?? 0,
    finiteNumber(event?.geometry?.bounds?.height) ?? 0,
    (finiteNumber(event?.geometry?.sizePixels) ?? 0) * 2
  );
  const scale = effect.geometryScaleBasePixels && geometryDiameter > 0
    ? clamp(
        geometryDiameter /
          effect.geometryScaleBasePixels *
          effect.scale,
        0.05,
        effect.maxGeometryScale
      )
    : effect.scale;

  return {
    type: effect.type,
    ...points,
    scale,
    rotation: effect.rotation,
    opacity: effect.opacity,
    duration,
    intensity,
    particles: effect.particles,
    sprite: effect.sprite,
    preset: effect.preset,
    layer: effect.layer,
    motion: effect.motion,
    shadow: effect.shadow,
    heightScaling: effect.heightScaling,
    attachment: effect.attachment,
    timeline: effect.timeline,
    persistent: effect.persistent,
    fadeOut: effect.fadeOut,
    attachToGrid: effect.attachToGrid,
    persistentLifetime: effect.persistentLifetime ?? duration,
    metadata: {
      ...effect.metadata,
      eventType: event?.preview === true
        ? "preview-cast-sequence"
        : "confirmed-cast-sequence",
      preview: event?.preview === true,
      sequenceId,
      phase: phase.phase,
      phaseIndex,
      spellId: cleanText(event?.spellId, "", 160),
      spellLevel: Math.round(boundedNumber(event?.spellLevel, 0, 0, 9)),
      casterTokenId: cleanText(event?.casterTokenId, "", 160),
      deliveryType: cleanId(event?.deliveryType),
      damageTypes: Object.freeze([
        ...normalizeIdList(event?.damageTypes)
      ]),
      affectedTokenId: points.affectedTokenId || ""
    }
  };
}

export function createCastingSequenceSystem({
  effectEngine,
  registry = createDefaultCastingSequenceRegistry(),
  scheduler = createDefaultScheduler(),
  maximumActiveSequences = MAX_ACTIVE_CASTING_SEQUENCES,
  audioPlayer = null,
  onPhase = () => {},
  onStateChange = () => {}
} = {}) {
  if (typeof effectEngine?.play !== "function") {
    throw new TypeError(
      "Casting sequences require a VFX effect engine."
    );
  }

  const maximum = Math.round(boundedNumber(
    maximumActiveSequences,
    MAX_ACTIVE_CASTING_SEQUENCES,
    1,
    MAX_ACTIVE_CASTING_SEQUENCES
  ));
  const records = new Map();
  const sounds = audioPlayer || createSpellAudioPlayer({ scheduler,
    getMode: () => effectEngine.getState?.().mode || "full" });
  const soundCall = (method, ...args) => {
    try { return sounds[method]?.(...args); } catch { return false; }
  };
  let nextId = 1;
  let destroyed = false;

  function getState() {
    return Object.freeze({
      activeCount: records.size,
      sequences: Object.freeze(
        Array.from(records.values()).map((record) => Object.freeze({
          id: record.id,
          definitionId: record.definition.id,
          phase: record.phase,
          phaseIndex: record.phaseIndex,
          effectCount: record.effects.length,
          failures: record.failures
        }))
      )
    });
  }

  function emitState() {
    try {
      onStateChange(getState());
    } catch {
      // Observers are presentation-only.
    }
  }

  function stopRecord(record, reason) {
    if (!records.has(record.id)) return false;
    // Natural thunder tails may outlast the flash, but never cancellation.
    if (reason !== "completed") soundCall("cancel", record.id);
    record.timers.forEach((handle) => {
      try {
        scheduler.clearTimeout(handle);
      } catch {
        // Continue clearing the sequence.
      }
    });
    record.timers.clear();
    record.effects.forEach((result) => {
      try {
        result.cancel?.();
      } catch {
        // A broken effect must not prevent sequence cleanup.
      }
    });
    record.effects.length = 0;
    record.phase = reason;
    records.delete(record.id);
    emitState();
    return true;
  }

  function runPhase(record, phase, phaseIndex) {
    if (!records.has(record.id)) return;
    record.phase = phase.phase;
    record.phaseIndex = phaseIndex;

    try {
      onPhase(Object.freeze({
        sequenceId: record.id,
        definitionId: record.definition.id,
        phase: phase.phase,
        phaseIndex,
        event: record.event
      }));
    } catch {
      // Phase observers cannot break the sequence.
    }

    if (phase.phase === "cleanup") {
      stopRecord(record, "completed");
      return;
    }

    let instanceCount = 0;
    for (const effect of phase.effects) {
      if (effect.fullOnly && getTimingScale(effectEngine) !== 1) continue;
      const anchors = resolveAnchorPoints(effect, record.event);
      for (const points of anchors) {
        if (
          instanceCount >=
          MAX_EFFECT_INSTANCES_PER_SEQUENCE_PHASE
        ) {
          break;
        }
        instanceCount += 1;
        try {
          const result = effectEngine.play(
            makeEffectRequest({
              effect,
              event: record.event,
              phase,
              phaseIndex,
              sequenceId: record.id,
              points,
              timingScale: record.timingScale
            })
          );
          if (result?.ok) {
            record.effects.push(result);
          } else if (result?.skipped !== true) {
            record.failures += 1;
          }
        } catch {
          record.failures += 1;
        }
      }
    }
    emitState();
  }

  function scheduleRecord(record) {
    let elapsed = 0;

    record.definition.phases.forEach((phase, phaseIndex) => {
      elapsed += Math.round(
        phase.delay * record.timingScale
      );
      const startsAt = elapsed;

      if (startsAt === 0) {
        runPhase(record, phase, phaseIndex);
      } else {
        let handle = null;
        handle = scheduler.setTimeout(() => {
          record.timers.delete(handle);
          runPhase(record, phase, phaseIndex);
        }, startsAt);
        record.timers.add(handle);
      }

      elapsed += Math.round(
        phase.duration * record.timingScale
      );
    });
  }

  function cancel(id, reason = "cancelled") {
    const soundCancelled = soundCall("cancel", id);
    const record = records.get(String(id || ""));
    return record
      ? stopRecord(record, reason)
      : soundCancelled;
  }

  function clear(reason = "cleared") {
    soundCall("clear");
    Array.from(records.values()).forEach((record) => {
      stopRecord(record, reason);
    });
  }

  function clearPreviews() {
    soundCall("clearPreviews");
    Array.from(records.values()).forEach((record) => {
      if (record.event.preview === true) stopRecord(record, "preview-reset");
    });
  }

  function play(event = {}, { sequenceId = "" } = {}) {
    if (destroyed) {
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "sequence-system-destroyed"
      });
    }

    const timingScale = getTimingScale(effectEngine);
    if (timingScale === 0) {
      return Object.freeze({
        ok: true,
        skipped: true,
        reason: "effects-off"
      });
    }

    const definition = sequenceId
      ? registry.get(sequenceId, event)
      : registry.resolve(event);
    if (!definition) {
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "unknown-sequence"
      });
    }

    while (records.size >= maximum) {
      stopRecord(
        records.values().next().value,
        "capacity"
      );
    }

    const id = `cast-vfx-${nextId++}`;
    const record = {
      id,
      definition,
      event,
      phase: "queued",
      phaseIndex: -1,
      effects: [],
      failures: 0,
      timers: new Set(),
      timingScale,
      createdAt: scheduler.now()
    };
    records.set(id, record);

    try {
      scheduleRecord(record);
      if (definition.sound && records.has(id)) {
        let soundDelay = 0;
        for (const phase of definition.phases) {
          soundDelay += phase.delay;
          if (phase.phase === definition.sound.phase) break;
          soundDelay += phase.duration;
        }
        soundCall("play", definition.sound, { id, preview: event.preview === true,
          delay: Math.round((soundDelay + definition.sound.delay) * timingScale) });
      }
    } catch {
      stopRecord(record, "schedule-failed");
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "schedule-failed"
      });
    }

    return Object.freeze({
      ok: records.has(id),
      skipped: !records.has(id),
      id,
      definition,
      cancel: () => cancel(id)
    });
  }

  function destroy() {
    if (destroyed) return;
    clear("destroyed");
    soundCall("destroy");
    destroyed = true;
  }

  return Object.freeze({
    cancel,
    clear,
    clearPreviews,
    destroy,
    getState,
    setSoundEnabled: value => soundCall("setEnabled", value),
    play,
    registry
  });
}
