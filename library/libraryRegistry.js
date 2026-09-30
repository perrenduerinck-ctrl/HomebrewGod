export function createLibraryRegistry(adapters = []) {
  const bySourceType = new Map();
  const registered = [];
  for (const adapter of adapters) {
    const sourceType = String(adapter?.sourceType || "").trim().toLowerCase();
    if (!sourceType || typeof adapter.listSummaries !== "function" || typeof adapter.load !== "function") {
      throw new Error("Library adapters need a sourceType, listSummaries, and load method.");
    }
    registered.push(adapter);
    for (const type of [sourceType, ...(adapter.sourceTypes || [])]) {
      bySourceType.set(String(type || "").trim().toLowerCase(), adapter);
    }
  }
  return Object.freeze({
    list: () => [...registered],
    get: (sourceType) => bySourceType.get(String(sourceType || "").trim().toLowerCase()) || null,
    has: (sourceType) => bySourceType.has(String(sourceType || "").trim().toLowerCase())
  });
}
