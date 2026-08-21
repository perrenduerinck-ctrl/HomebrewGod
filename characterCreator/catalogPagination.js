export const CREATOR_CATALOG_BATCH_SIZE = 25;

function cleanSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function createCatalogPage(
  entries,
  options = {}
) {
  const source = Array.isArray(entries)
    ? entries
    : [];
  const query = cleanSearchValue(
    options.query
  );
  const getSearchText =
    typeof options.getSearchText === "function"
      ? options.getSearchText
      : (entry) => JSON.stringify(entry || {});
  const getId =
    typeof options.getId === "function"
      ? options.getId
      : (entry) => entry?.id;
  const pinnedIds = new Set(
    Array.isArray(options.pinnedIds)
      ? options.pinnedIds
        .map(cleanSearchValue)
        .filter(Boolean)
      : []
  );
  const visibleLimit = Math.max(
    1,
    Math.round(
      Number(options.visibleLimit) ||
      CREATOR_CATALOG_BATCH_SIZE
    )
  );
  const matches = source.filter((entry) => {
    return (
      !query ||
      cleanSearchValue(
        getSearchText(entry)
      ).includes(query)
    );
  });
  const pinned = [];
  const remaining = [];

  matches.forEach((entry) => {
    if (
      pinnedIds.has(
        cleanSearchValue(getId(entry))
      )
    ) {
      pinned.push(entry);
    } else {
      remaining.push(entry);
    }
  });

  const orderedMatches = [
    ...pinned,
    ...remaining
  ];
  const visibleEntries =
    orderedMatches.slice(0, visibleLimit);

  return Object.freeze({
    entries: visibleEntries,
    query,
    total: orderedMatches.length,
    visibleCount: visibleEntries.length,
    visibleLimit,
    hasMore:
      visibleEntries.length < orderedMatches.length
  });
}
