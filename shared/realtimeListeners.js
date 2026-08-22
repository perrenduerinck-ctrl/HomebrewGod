export function createRealtimeListenerRegistry({
  onStopError = null
} = {}) {
  const listeners = new Map();
  const metrics = {
    started: 0,
    reused: 0,
    stopped: 0,
    staleCallbacksBlocked: 0
  };
  let nextGeneration = 1;

  function normalizeName(name) {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
      throw new Error(
        "Realtime listener names must not be empty."
      );
    }

    return cleanName;
  }

  function normalizeScopeKey(scopeKey) {
    return String(scopeKey ?? "");
  }

  function stop(name) {
    const cleanName = normalizeName(name);
    const listener = listeners.get(cleanName);

    if (!listener) {
      return false;
    }

    listener.active = false;
    listeners.delete(cleanName);
    metrics.stopped += 1;

    if (typeof listener.unsubscribe === "function") {
      try {
        listener.unsubscribe();
      } catch (error) {
        if (typeof onStopError === "function") {
          onStopError(error, {
            name: cleanName,
            scopeKey: listener.scopeKey
          });
        }
      }
    }

    return true;
  }

  function connect(name, scopeKey, subscribe) {
    const cleanName = normalizeName(name);
    const cleanScopeKey =
      normalizeScopeKey(scopeKey);
    const current = listeners.get(cleanName);

    if (
      current?.active === true &&
      current.scopeKey === cleanScopeKey
    ) {
      metrics.reused += 1;
      return false;
    }

    stop(cleanName);

    if (typeof subscribe !== "function") {
      throw new TypeError(
        `Realtime listener "${cleanName}" requires a subscribe function.`
      );
    }

    const listener = {
      active: true,
      generation: nextGeneration,
      scopeKey: cleanScopeKey,
      unsubscribe: null
    };
    nextGeneration += 1;
    listeners.set(cleanName, listener);

    const isCurrent = () => {
      const currentListener =
        listeners.get(cleanName);
      const current = Boolean(
        listener.active &&
        currentListener === listener
      );

      if (!current) {
        metrics.staleCallbacksBlocked += 1;
      }

      return current;
    };

    try {
      const unsubscribe = subscribe({
        isCurrent,
        name: cleanName,
        scopeKey: cleanScopeKey
      });

      if (typeof unsubscribe !== "function") {
        throw new TypeError(
          `Realtime listener "${cleanName}" did not return an unsubscribe function.`
        );
      }

      if (listeners.get(cleanName) !== listener) {
        unsubscribe();
        return false;
      }

      listener.unsubscribe = unsubscribe;
      metrics.started += 1;
      return true;
    } catch (error) {
      listener.active = false;

      if (listeners.get(cleanName) === listener) {
        listeners.delete(cleanName);
      }

      throw error;
    }
  }

  function has(name, scopeKey) {
    const listener = listeners.get(
      normalizeName(name)
    );

    if (!listener?.active) {
      return false;
    }

    if (arguments.length < 2) {
      return true;
    }

    return (
      listener.scopeKey ===
      normalizeScopeKey(scopeKey)
    );
  }

  function stopAll() {
    [...listeners.keys()].forEach(stop);
  }

  function getSnapshot() {
    return {
      activeCount: listeners.size,
      active: [...listeners.entries()].map(
        ([name, listener]) => {
          return {
            name,
            scopeKey: listener.scopeKey,
            generation: listener.generation
          };
        }
      ),
      metrics: {
        ...metrics
      }
    };
  }

  return Object.freeze({
    connect,
    has,
    stop,
    stopAll,
    getSnapshot
  });
}
