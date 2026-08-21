// =====================================================
// SCOPED DERIVED-VALUE CACHE
// Keeps expensive character calculations isolated by dependency domain.
// =====================================================

function mixHash(hash, text) {
  let next = hash >>> 0;

  for (let index = 0; index < text.length; index += 1) {
    next ^= text.charCodeAt(index);
    next = Math.imul(next, 16777619);
  }

  return next >>> 0;
}

const objectIdentityKeys = new WeakMap();
let nextObjectIdentityKey = 1;

export function getDerivedObjectIdentity(value) {
  if (
    !value ||
    (typeof value !== "object" &&
      typeof value !== "function")
  ) {
    return `primitive:${String(value)}`;
  }

  if (!objectIdentityKeys.has(value)) {
    objectIdentityKeys.set(
      value,
      nextObjectIdentityKey
    );
    nextObjectIdentityKey += 1;
  }

  return `object:${objectIdentityKeys.get(value)}`;
}

export function createDerivedSignature(value) {
  const active = new Set();
  let hash = 2166136261;
  let parts = 0;

  function add(text) {
    hash = mixHash(hash, text);
    parts += 1;
  }

  function visit(entry) {
    if (entry === null) {
      add("null;");
      return;
    }

    const type = typeof entry;

    if (type === "number") {
      add(Number.isNaN(entry) ? "number:nan;" : `number:${entry};`);
      return;
    }

    if (type === "string" || type === "boolean" || type === "bigint") {
      add(`${type}:${String(entry)};`);
      return;
    }

    if (type === "undefined") {
      add("undefined;");
      return;
    }

    if (type !== "object") {
      add(`${type};`);
      return;
    }

    if (active.has(entry)) {
      add("cycle;");
      return;
    }

    active.add(entry);

    if (Array.isArray(entry)) {
      add(`array:${entry.length}[`);
      entry.forEach(visit);
      add("];");
    } else {
      const keys = Object.keys(entry).sort();
      add(`object:${keys.length}{`);
      keys.forEach((key) => {
        add(`key:${key};`);
        visit(entry[key]);
      });
      add("};");
    }

    active.delete(entry);
  }

  visit(value);
  return `${parts}:${hash.toString(36)}`;
}

export function createScopedDerivedCache({
  maximumEntriesPerScope = 256
} = {}) {
  const scopes = new Map();
  const metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    byScope: new Map()
  };
  const limit = Math.max(
    1,
    Math.round(Number(maximumEntriesPerScope) || 256)
  );

  function getScopeMetrics(scope) {
    if (!metrics.byScope.has(scope)) {
      metrics.byScope.set(scope, {
        hits: 0,
        misses: 0,
        evictions: 0
      });
    }

    return metrics.byScope.get(scope);
  }

  function get(scopeName, dependencyKey, calculate) {
    const scope = String(scopeName || "derived");
    const key = String(dependencyKey ?? "");
    const entries = scopes.get(scope) || new Map();
    const scopeMetrics = getScopeMetrics(scope);

    if (entries.has(key)) {
      const value = entries.get(key);
      entries.delete(key);
      entries.set(key, value);
      metrics.hits += 1;
      scopeMetrics.hits += 1;
      return value;
    }

    const value = calculate();
    entries.set(key, value);
    scopes.set(scope, entries);
    metrics.misses += 1;
    scopeMetrics.misses += 1;

    if (entries.size > limit) {
      entries.delete(entries.keys().next().value);
      metrics.evictions += 1;
      scopeMetrics.evictions += 1;
    }

    return value;
  }

  function clear(scopeName = "") {
    if (scopeName) {
      scopes.delete(String(scopeName));
      return;
    }

    scopes.clear();
  }

  function getMetrics() {
    return {
      hits: metrics.hits,
      misses: metrics.misses,
      evictions: metrics.evictions,
      scopes: Object.fromEntries(
        [...metrics.byScope.entries()].map(([scope, value]) => {
          return [
            scope,
            {
              ...value,
              size: scopes.get(scope)?.size || 0
            }
          ];
        })
      )
    };
  }

  return {
    get,
    clear,
    getMetrics
  };
}
