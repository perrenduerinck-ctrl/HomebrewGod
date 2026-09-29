export function createLibraryRegistry(adapters = []) {
  const bySourceType = new Map();
  for (const adapter of adapters) {
    const sourceType = String(adapter?.sourceType || "").trim().toLowerCase();
    if (!sourceType || typeof adapter.listSummaries !== "function" || typeof adapter.load !== "function") {
      throw new Error("Library adapters need a sourceType, listSummaries, and load method.");
    }
    bySourceType.set(sourceType, adapter);
  }
  return Object.freeze({
    list: () => [...bySourceType.values()],
    get: (sourceType) => bySourceType.get(String(sourceType || "").trim().toLowerCase()) || null,
    has: (sourceType) => bySourceType.has(String(sourceType || "").trim().toLowerCase())
  });
}
