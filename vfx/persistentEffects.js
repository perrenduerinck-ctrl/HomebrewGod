export const MAX_PERSISTENT_EFFECTS = 32;
export const MAX_PERSISTENT_LIFETIME_MS = 300000;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function createPersistentEffectStore({
  maximum = MAX_PERSISTENT_EFFECTS,
  now = Date.now
} = {}) {
  const safeMaximum = clamp(
    Math.round(finiteNumber(maximum) ?? MAX_PERSISTENT_EFFECTS),
    1,
    MAX_PERSISTENT_EFFECTS
  );
  const effects = new Map();

  function prune(timestamp = now()) {
    const expired = [];
    effects.forEach((record, id) => {
      if (record.expiresAt <= timestamp) {
        effects.delete(id);
        expired.push(id);
      }
    });
    return Object.freeze(expired);
  }

  function add(
    effect,
    { lifetimeMs = 60000 } = {}
  ) {
    const id = String(effect?.id || "").trim();
    if (!id) {
      throw new TypeError(
        "Persistent VFX require an effect id."
      );
    }
    prune();
    while (effects.size >= safeMaximum) {
      effects.delete(effects.keys().next().value);
    }
    const createdAt = now();
    const record = Object.freeze({
      effect,
      createdAt,
      expiresAt: createdAt + clamp(
        finiteNumber(lifetimeMs) ?? 60000,
        1,
        MAX_PERSISTENT_LIFETIME_MS
      )
    });
    effects.set(id, record);
    return record;
  }

  function remove(id) {
    return effects.delete(String(id || ""));
  }

  return Object.freeze({
    add,
    clear: () => effects.clear(),
    get: (id) => effects.get(String(id || "")) || null,
    list: () => Object.freeze(
      Array.from(effects.values())
    ),
    prune,
    remove,
    size: () => effects.size
  });
}
