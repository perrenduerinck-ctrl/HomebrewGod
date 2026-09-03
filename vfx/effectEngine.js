import {
  createDefaultEffectRegistry
} from "./effectRegistry.js?v=level-five-spells-20260903";
import {
  createEffectRenderer
} from "./effectRenderer.js?v=fireball-blend-20260902";
import {
  createPersistentEffectStore,
  MAX_PERSISTENT_LIFETIME_MS
} from "./persistentEffects.js";
import { elevationToVisualPixels } from "../battleMap/elevation.js?v=2d5-vfx-polish-20260902";
import { applyEffectPreset } from "./effectPresets.js";
import { normalizeEffectLayer } from "./effectLayers.js";
import {
  normalizeMotion25d,
  resolveMotionDuration
} from "./motion25d.js";
import { normalizeEffectTimeline } from "./effectTimeline.js";

export const EFFECTS_MODES = Object.freeze([
  "full",
  "reduced",
  "off"
]);
export const MAX_ACTIVE_EFFECTS = 64;
export const MAX_EFFECT_DURATION_MS = 60000;
export const MAX_EFFECT_DELAY_MS = 10000;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function normalizeEffectsMode(value) {
  const mode = String(value || "")
    .trim()
    .toLowerCase();
  return EFFECTS_MODES.includes(mode)
    ? mode
    : "full";
}

function normalizePoint(value) {
  if (!value) return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  if (x === null || y === null) return null;
  return Object.freeze({
    x,
    y,
    // Geometry points omit ratios. Null is not the map's zero coordinate.
    xRatio: value.xRatio == null || value.xRatio === ""
      ? null : finiteNumber(value.xRatio),
    yRatio: value.yRatio == null || value.yRatio === ""
      ? null : finiteNumber(value.yRatio)
  });
}

export function normalizeEffectRequest(
  request = {},
  {
    id,
    definition,
    mode = "full"
  } = {}
) {
  const effectsMode = normalizeEffectsMode(mode);
  const source = applyEffectPreset({
    preset: request.preset ?? definition.preset,
    ...(definition.effectDefaults || {}),
    ...request
  });
  const position = normalizePoint(source.position || source.targetPoint);
  const startPosition = normalizePoint(source.startPosition || source.startPoint);
  const endPosition = normalizePoint(source.endPosition || source.endPoint);
  const elevation = clamp(Math.round(
    finiteNumber(source.elevation ?? source.targetElevation) ?? 0
  ), -1000, 1000);
  const startElevation = clamp(Math.round(
    finiteNumber(source.startElevation) ?? elevation
  ), -1000, 1000);
  const endElevation = clamp(Math.round(
    finiteNumber(source.endElevation) ?? elevation
  ), -1000, 1000);
  const motion = normalizeMotion25d(
    source.motion ?? definition.motion,
    {
      type:
        startPosition &&
        endPosition &&
        (startElevation !== 0 || endElevation !== 0)
          ? "straight"
          : "stationary",
      startZ: elevationToVisualPixels(startElevation),
      endZ: elevationToVisualPixels(endElevation)
    }
  );
  const duration = clamp(
    resolveMotionDuration({
      duration: source.duration,
      speed: motion.speed,
      start: startPosition,
      end: endPosition,
      fallback: 900
    }),
    0,
    effectsMode === "reduced"
      ? 1000
      : MAX_EFFECT_DURATION_MS
  );
  const delay = clamp(
    finiteNumber(source.delay) ?? 0,
    0,
    effectsMode === "reduced"
      ? 100
      : MAX_EFFECT_DELAY_MS
  );
  const rawIntensity = clamp(
    Math.round(
      finiteNumber(source.intensity) ?? 1
    ),
    1,
    5
  );

  return Object.freeze({
    id: String(id || request.id || "").trim(),
    type: definition.id,
    definition,
    position,
    startPosition,
    endPosition,
    scale: clamp(
      finiteNumber(source.scale) ?? 1,
      0.05,
      20
    ),
    rotation: clamp(
      finiteNumber(source.rotation) ?? 0,
      -3600,
      3600
    ),
    opacity: clamp(
      finiteNumber(source.opacity) ?? 1,
      0,
      1
    ),
    duration,
    delay,
    elevation,
    startElevation,
    endElevation,
    intensity: effectsMode === "reduced"
      ? Math.min(2, rawIntensity)
      : rawIntensity,
    effectsMode,
    particles: source.particles || null,
    sprite: source.sprite || null,
    clips: source.clips && typeof source.clips === "object"
      ? source.clips
      : (definition.clips || null),
    clip: String(source.clip || definition.initialClip || "").trim().toLowerCase(),
    layer: normalizeEffectLayer(source.layer ?? definition.layer,
      source.persistent === true ? "ground" : "airborne"),
    motion,
    shadow: source.shadow === false
      ? null
      : Object.freeze({
          ...(source.shadow === true ? {} : (source.shadow || {})),
          enabled: source.shadow === true || source.shadow?.enabled === true
        }),
    heightScaling: source.heightScaling === false
      ? null
      : Object.freeze({
          ...(source.heightScaling === true ? {} : (source.heightScaling || {})),
          enabled: source.heightScaling === true || source.heightScaling?.enabled === true
        }),
    heightGlow: source.heightGlow === false
      ? null
      : Object.freeze({
          ...(source.heightGlow === true ? {} : (source.heightGlow || {})),
          enabled: source.heightGlow === true || source.heightGlow?.enabled === true
        }),
    trail: source.trail === false
      ? null
      : Object.freeze({
          ...(source.trail === true ? {} : (source.trail || {})),
          enabled: source.trail === true || source.trail?.enabled === true
        }),
    debris: source.debris === false
      ? null
      : Object.freeze({
          ...(source.debris === true ? {} : (source.debris || {})),
          enabled: source.debris === true || source.debris?.enabled === true
        }),
    shake: source.shake === false
      ? null
      : Object.freeze({
          ...(source.shake === true ? {} : (source.shake || {})),
          enabled: source.shake === true || source.shake?.enabled === true
        }),
    impactPunch: source.impactPunch === false
      ? null
      : Object.freeze({
          ...(source.impactPunch === true ? {} : (source.impactPunch || {})),
          enabled: source.impactPunch === true || source.impactPunch?.enabled === true
        }),
    attachment: source.attachment && typeof source.attachment === "object"
      ? Object.freeze({
          tokenId: String(source.attachment.tokenId || "").trim(),
          position: ["under", "centered", "above", "orbit", "overhead"]
            .includes(String(source.attachment.position || "").toLowerCase())
              ? String(source.attachment.position).toLowerCase()
              : "centered",
          radius: clamp(finiteNumber(source.attachment.radius) ?? 36, 0, 1000),
          cycles: clamp(finiteNumber(source.attachment.cycles) ?? 1, -20, 20)
        })
      : null,
    persistent: source.persistent === true,
    persistentLifetime: clamp(
      finiteNumber(source.persistentLifetime) ?? duration,
      1,
      MAX_PERSISTENT_LIFETIME_MS
    ),
    fadeOut: source.fadeOut !== false,
    attachToGrid: source.attachToGrid === true,
    timeline: normalizeEffectTimeline(source.timeline || source.events, duration),
    metadata: Object.freeze({ ...(source.metadata || {}) })
  });
}

function createDefaultScheduler() {
  return Object.freeze({
    clearTimeout: (handle) => clearTimeout(handle),
    now: () => Date.now(),
    setTimeout: (callback, delay) => (
      setTimeout(callback, delay)
    )
  });
}

export function createEffectEngine({
  renderer,
  registry = createDefaultEffectRegistry(),
  persistentStore = createPersistentEffectStore(),
  scheduler = createDefaultScheduler(),
  mode = "full",
  maximumActiveEffects = MAX_ACTIVE_EFFECTS,
  onStateChange = () => {}
} = {}) {
  if (!renderer?.render || !renderer?.remove) {
    throw new TypeError(
      "The VFX engine requires a renderer."
    );
  }

  const maximum = clamp(
    Math.round(
      finiteNumber(maximumActiveEffects) ?? MAX_ACTIVE_EFFECTS
    ),
    1,
    MAX_ACTIVE_EFFECTS
  );
  const records = new Map();
  let effectsMode = normalizeEffectsMode(mode);
  let connected = false;
  let destroyed = false;
  let nextId = 1;

  function getState() {
    return Object.freeze({
      mode: effectsMode,
      activeCount: records.size,
      effects: Object.freeze(
        Array.from(records.values()).map((record) => (
          Object.freeze({
            id: record.effect.id,
            type: record.effect.type,
            phase: record.phase,
            persistent: record.effect.persistent
          })
        ))
      )
    });
  }

  function emitState() {
    try {
      onStateChange(getState());
    } catch {
      // UI observers must never break visual cleanup.
    }
  }

  function connect() {
    if (destroyed || connected) return false;
    try {
      renderer.connect?.();
      renderer.setMode?.(effectsMode);
      connected = true;
    } catch {
      connected = false;
      return false;
    }
    emitState();
    return true;
  }

  function cancel(id, reason = "cancelled") {
    const record = records.get(String(id || ""));
    if (!record) return false;
    if (record.delayTimer !== null) {
      try {
        scheduler.clearTimeout(record.delayTimer);
      } catch {
        // The record is still removed from the engine below.
      }
    }
    if (record.cleanupTimer !== null) {
      try {
        scheduler.clearTimeout(record.cleanupTimer);
      } catch {
        // The record is still removed from the engine below.
      }
    }
    record.eventTimers.forEach((handle) => {
      try {
        scheduler.clearTimeout(handle);
      } catch {
        // Continue removing the visual and record.
      }
    });
    record.eventTimers.clear();
    try {
      renderer.remove(record.effect.id);
    } catch {
      // Cleanup must continue even if a visual adapter fails.
    }
    try {
      persistentStore.remove(record.effect.id);
    } catch {
      // Persistence is an optional visual cache, not game state.
    }
    record.phase = reason;
    records.delete(record.effect.id);
    emitState();
    return true;
  }

  function runEffectEvent(record, event) {
    if (!records.has(record.effect.id)) return;
    if (event.type === "layer" && event.layer) {
      try {
        renderer.update?.(record.effect.id, { layer: event.layer });
      } catch {
        // Layer changes are optional presentation events.
      }
    }
    if (event.type === "clip" && event.clip) {
      try {
        renderer.update?.(record.effect.id, { clip: event.clip });
      } catch {
        // Clip changes cannot affect spell resolution.
      }
    }
    if (event.type === "spawn" && event.effect) {
      const anchor = record.effect.endPosition ||
        record.effect.position || record.effect.startPosition;
      play({
        position: anchor,
        elevation: record.effect.endElevation ?? record.effect.elevation,
        ...event.effect,
        metadata: {
          ...record.effect.metadata,
          ...(event.effect.metadata || {}),
          parentEffectId: record.effect.id,
          timelineEventId: event.id,
          clipName: event.clipName || ""
        }
      });
    }
    try {
      renderer.notifyTimelineEvent?.(record.effect.id, event);
    } catch {
      // Debug adapters cannot interrupt cleanup.
    }
  }

  function startRecord(record) {
    if (!records.has(record.effect.id)) return;
    record.delayTimer = null;
    try {
      renderer.render(record.effect, {
        onClipEvent: (event) => runEffectEvent(record, event)
      });
      record.phase = "active";
    } catch {
      cancel(record.effect.id, "render-failed");
      return;
    }

    const lifetime = record.effect.persistent
      ? record.effect.persistentLifetime
      : record.effect.duration;
    if (record.effect.persistent) {
      try {
        persistentStore.add(record.effect, {
          lifetimeMs: lifetime
        });
      } catch {
        // The effect can still render as a normal timed visual.
      }
    }
    record.effect.timeline.forEach((event) => {
      let handle = null;
      const runEvent = () => {
        if (handle !== null) record.eventTimers.delete(handle);
        runEffectEvent(record, event);
      };
      if (event.atMilliseconds === 0) {
        runEvent();
      } else {
        try {
          handle = scheduler.setTimeout(runEvent, event.atMilliseconds);
          record.eventTimers.add(handle);
        } catch {
          // A missed presentation event does not invalidate the parent effect.
        }
      }
    });
    // A zero-time follow-up may evict this parent at the active-effect cap.
    // Do not leave an unowned cleanup timer behind in that case.
    if (!records.has(record.effect.id)) return;
    try {
      record.cleanupTimer = scheduler.setTimeout(
        () => cancel(record.effect.id, "completed"),
        lifetime
      );
    } catch {
      cancel(record.effect.id, "timer-failed");
      return;
    }
    emitState();
  }

  function play(request = {}) {
    if (destroyed) {
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "engine-destroyed"
      });
    }
    if (effectsMode === "off") {
      return Object.freeze({
        ok: true,
        skipped: true,
        reason: "effects-off"
      });
    }

    const definition = registry.get(
      request.type || request.effectType
    );
    if (!definition) {
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "unknown-effect"
      });
    }
    if (!connected && !connect()) {
      return Object.freeze({
        ok: false,
        skipped: true,
        reason: "renderer-unavailable"
      });
    }

    while (records.size >= maximum) {
      cancel(
        records.keys().next().value,
        "capacity"
      );
    }

    const id = `vfx-${nextId++}`;
    const effect = normalizeEffectRequest(
      request,
      {
        id,
        definition,
        mode: effectsMode
      }
    );
    const record = {
      effect,
      phase: effect.delay > 0
        ? "pending"
        : "starting",
      createdAt: scheduler.now(),
      delayTimer: null,
      cleanupTimer: null,
      eventTimers: new Set()
    };
    records.set(id, record);

    if (effect.delay > 0) {
      try {
        record.delayTimer = scheduler.setTimeout(
          () => startRecord(record),
          effect.delay
        );
        emitState();
      } catch {
        cancel(id, "timer-failed");
      }
    } else {
      startRecord(record);
    }

    return Object.freeze({
      ok: records.has(id),
      skipped: !records.has(id),
      id,
      effect,
      cancel: () => cancel(id)
    });
  }

  function clear(reason = "cleared") {
    Array.from(records.keys()).forEach((id) => {
      cancel(id, reason);
    });
    try {
      renderer.clear?.();
    } catch {
      // Individual records have already been forgotten safely.
    }
    try {
      persistentStore.clear();
    } catch {
      // Persistence is an optional visual cache, not game state.
    }
  }

  function setMode(nextMode) {
    effectsMode = normalizeEffectsMode(nextMode);
    try {
      renderer.setMode?.(effectsMode);
    } catch {
      // The state remains valid even if a visual adapter is unavailable.
    }
    if (effectsMode === "off") {
      clear("effects-off");
    }
    emitState();
    return effectsMode;
  }

  function destroy() {
    if (destroyed) return;
    clear("destroyed");
    try {
      renderer.destroy?.();
    } catch {
      // Destruction is best-effort after all timers are cleared.
    }
    connected = false;
    destroyed = true;
  }

  return Object.freeze({
    cancel,
    clear,
    connect,
    destroy,
    getOverlayElement: () => renderer.getOverlayElement?.() || null,
    getDebugState: () => renderer.getDebugState?.() || null,
    getState,
    play,
    refresh: () => {
      try {
        renderer.refresh?.();
        return true;
      } catch {
        return false;
      }
    },
    registry,
    setDebugOptions: (options) => renderer.setDebugOptions?.(options) || null,
    setMode
  });
}

export function createBattleMapEffectEngine({
  surface,
  getTargetElement,
  getScale,
  getTokenElement,
  ...options
} = {}) {
  const renderer = options.renderer ||
    createEffectRenderer({
      surface,
      getTargetElement,
      getScale,
      getTokenElement
    });
  return createEffectEngine({
    ...options,
    renderer
  });
}
