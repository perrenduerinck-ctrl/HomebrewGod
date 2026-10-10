const DEFAULT_PAGE_SIZE = 50;

function recordId(record) {
  return String(record?.id || "").trim();
}

function mergeUnique(records) {
  const seen = new Set();
  return (Array.isArray(records) ? records : []).filter((record) => {
    const id = recordId(record);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function createPaginatedCreatorLibrary({ persistence, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  if (!persistence || (typeof persistence.listPage !== "function" && typeof persistence.list !== "function")) {
    throw new Error("A creator library needs listPage() or list().");
  }

  const size = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || DEFAULT_PAGE_SIZE)));
  let records = [];
  let cursor = null;
  let hasMore = true;
  let loading = false;
  let error = null;
  let generation = 0;
  let activePromise = null;

  const snapshot = () => Object.freeze({
    records: [...records],
    hasMore,
    loading,
    error
  });

  async function requestPage({ reset = false } = {}) {
    if (loading) {
      try { await activePromise; } catch {}
      if (!reset) return snapshot();
    }
    if (!reset && !hasMore) return snapshot();

    const operation = ++generation;
    const requestedCursor = reset ? null : cursor;
    loading = true;
    error = null;
    activePromise = (async () => {
      try {
        const page = typeof persistence.listPage === "function"
          ? await persistence.listPage({ cursor: requestedCursor, pageSize: size })
          : { entries: await persistence.list(), cursor: null, hasMore: false };
        if (operation !== generation) return snapshot();
        const entries = Array.isArray(page?.entries) ? page.entries : [];
        records = mergeUnique(reset ? entries : [...records, ...entries]);
        cursor = page?.cursor || null;
        hasMore = Boolean(page?.hasMore && cursor);
        return snapshot();
      } catch (nextError) {
        if (operation === generation) error = nextError;
        throw nextError;
      } finally {
        if (operation === generation) loading = false;
      }
    })();
    return activePromise;
  }

  function retain(record) {
    const id = recordId(record);
    if (!id) return snapshot();
    records = [record, ...records.filter((entry) => recordId(entry) !== id)];
    return snapshot();
  }

  function remove(id) {
    const normalizedId = String(id || "").trim();
    records = records.filter((entry) => recordId(entry) !== normalizedId);
    return snapshot();
  }

  return Object.freeze({
    refresh: () => requestPage({ reset: true }),
    loadMore: () => requestPage({ reset: false }),
    retain,
    remove,
    getState: snapshot
  });
}
