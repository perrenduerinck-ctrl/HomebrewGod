import {
  createDefaultEffectRegistry
} from "./effectRegistry.js?v=lightning-sound-20260830";
import {
  createEffectRenderer
} from "./effectRenderer.js?v=lightning-sound-20260830";
import {
  createPersistentEffectStore,
  MAX_PERSISTENT_LIFETIME_MS
} from "./persistentEffects.js";

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
  const duration = clamp(
    finiteNumber(request.duration) ?? 900,
    0,
    effectsMode === "reduced"
      ? 1000
      : MAX_EFFECT_DURATION_MS
  );
  const delay = clamp(
    finiteNumber(request.delay) ?? 0,
    0,
    effectsMode === "reduced"
      ? 100
      : MAX_EFFECT_DELAY_MS
  );
  const rawIntensity = clamp(
    Math.round(
      finiteNumber(request.intensity) ?? 1
    ),
    1,
    5
  );

  return Object.freeze({
    id: String(id || request.id || "").trim(),
    type: definition.id,
    definition,
    position: normalizePoint(
      request.position || request.targetPoint
    ),
    startPosition: normalizePoint(
      request.startPosition || request.startPoint
    ),
    endPosition: normalizePoint(
      request.endPosition || request.endPoint
    ),
    scale: clamp(
      finiteNumber(request.scale) ?? 1,
      0.05,
      20
    ),
    rotation: clamp(
      finiteNumber(request.rotation) ?? 0,
      -3600,
      3600
    ),
    opacity: clamp(
      finiteNumber(request.opacity) ?? 1,
      0,
      1
    ),
    duration,
    delay,
    elevation: clamp(
      Math.round(
        finiteNumber(
          request.elevation ?? request.targetElevation
        ) ?? 0
      ),
      -1000,
      1000
    ),
    startElevation: clamp(
      Math.round(
        finiteNumber(request.startElevation) ?? 0
      ),
      -1000,
      1000
    ),
    endElevation: clamp(
      Math.round(
        finiteNumber(request.endElevation) ?? 0
      ),
      -1000,
      1000
    ),
    intensity: effectsMode === "reduced"
      ? Math.min(2, rawIntensity)
      : rawIntensity,
    effectsMode,
    particles: request.particles || null,
    sprite: request.sprite || null,
    persistent: request.persistent === true,
    persistentLifetime: clamp(
      finiteNumber(request.persistentLifetime) ?? duration,
      1,
      MAX_PERSISTENT_LIFETIME_MS
    ),
    metadata: Object.freeze({
      ...(request.metadata || {})
    })
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

  function startRecord(record) {
    if (!records.has(record.effect.id)) return;
    record.delayTimer = null;
    try {
      renderer.render(record.effect);
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
      cleanupTimer: null
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
    setMode
  });
}

export function createBattleMapEffectEngine({
  surface,
  getTargetElement,
  getScale,
  ...options
} = {}) {
  const renderer = options.renderer ||
    createEffectRenderer({
      surface,
      getTargetElement,
      getScale
    });
  return createEffectEngine({
    ...options,
    renderer
  });
}
