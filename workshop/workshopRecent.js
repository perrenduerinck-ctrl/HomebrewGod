const PREFIX = "homebrewgod.workshop.recent.v1";

function safeParse(value) {
  try { return JSON.parse(value); } catch { return []; }
}

export function createWorkshopRecentStore({ storage = globalThis.localStorage, getUserId = () => "", limit = 100 } = {}) {
  let memory = [];
  const key = () => `${PREFIX}.${String(getUserId() || "signed-out")}`;
  const read = () => {
    const source = storage?.getItem ? safeParse(storage.getItem(key()) || "[]") : memory;
    return (Array.isArray(source) ? source : []).filter((entry) => entry?.assetId).slice(0, limit);
  };
  const write = (entries) => {
    const next = entries.slice(0, limit);
    if (storage?.setItem) storage.setItem(key(), JSON.stringify(next)); else memory = next;
    return next;
  };
  return Object.freeze({
    list: read,
    record(asset, action = "use") {
      if (!asset?.assetId) return read();
      return write([
        { assetId: String(asset.assetId), assetType: String(asset.assetType || "other"), action: String(action || "use").slice(0, 60), usedAtMillis: Date.now() },
        ...read().filter((entry) => entry.assetId !== asset.assetId)
      ]);
    },
    clear() { return write([]); }
  });
}

export function applyWorkshopRecent(assets, recentEntries = []) {
  const byId = new Map((recentEntries || []).map((entry) => [entry.assetId, entry]));
  return (assets || []).map((asset) => {
    const recent = byId.get(asset.assetId);
    return recent ? { ...asset, recentlyUsed: true, lastUsedAtMillis: recent.usedAtMillis, recentAction: recent.action } : asset;
  });
}
