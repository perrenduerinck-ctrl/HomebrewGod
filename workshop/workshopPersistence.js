import {
  WORKSHOP_PAGE_SIZE,
  canAccessWorkshopAsset,
  createWorkshopSummary,
  normalizeWorkshopAsset,
  sortWorkshopAssets
} from "./workshopModel.js";
import { normalizeWorkshopCollection, updateCollectionAssets } from "./workshopCollections.js";
import { nextWorkshopVersion } from "./workshopVersioning.js";

const dataOf = (snapshot) => typeof snapshot?.data === "function" ? snapshot.data() || {} : snapshot?.data || {};
const exists = (snapshot) => typeof snapshot?.exists === "function" ? snapshot.exists() : Boolean(snapshot && snapshot.exists !== false);
const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];

export function createWorkshopPersistence(options = {}) {
  const {
    db, collection, doc, getDoc, getDocs, setDoc, deleteDoc,
    query, where, limit, startAfter, serverTimestamp, writeBatch,
    getUserId = () => "", getUserName = () => "", getRoomCode = () => "",
    publicBrowse = false,
    idFactory = () => globalThis.crypto.randomUUID()
  } = options;
  const configured = [collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, limit]
    .every((entry) => typeof entry === "function");
  if (!configured) throw new Error("Workshop persistence is not configured.");

  const context = () => ({
    uid: String(getUserId() || ""),
    authorUid: String(getUserId() || ""),
    authorName: String(getUserName() || ""),
    roomCode: String(getRoomCode() || "").toUpperCase()
  });
  const requireUser = () => {
    const current = context();
    if (!current.uid) throw new Error("Sign in before using the Workshop.");
    return current;
  };
  const newId = (prefix = "workshop") => `${prefix}_${String(idFactory()).replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const summaryRef = (assetId) => doc(db, "workshopAssets", String(assetId));
  const versionRef = (assetId, version) => doc(db, "workshopAssets", String(assetId), "versions", String(version));
  const stamp = () => typeof serverTimestamp === "function" ? serverTimestamp() : new Date().toISOString();

  async function getSummary(assetId) {
    const snapshot = await getDoc(summaryRef(assetId));
    if (!exists(snapshot)) return null;
    return { ...dataOf(snapshot), assetId: snapshot.id || assetId };
  }

  async function publish(input = {}, { assetId = "", mode = "new-version" } = {}) {
    const actor = requireUser();
    let existing = null;
    let resolvedId = String(assetId || input.assetId || "").trim();
    if (resolvedId) {
      existing = await getSummary(resolvedId);
      if (!existing) throw new Error("That published Workshop asset no longer exists.");
      if (existing.authorUid !== actor.uid) throw new Error("Only the author can update this Workshop asset.");
    } else resolvedId = newId("asset");
    const version = existing ? nextWorkshopVersion(existing.version, mode) : 1;
    const normalized = normalizeWorkshopAsset({
      ...existing,
      ...input,
      assetId: resolvedId,
      version,
      forkedFrom: input.forkedFrom ?? existing?.forkedFrom ?? null,
      content: input.content
    }, actor);
    const nowMillis = Date.now();
    const createdAt = existing?.createdAt || stamp();
    const createdAtMillis = existing?.createdAtMillis || nowMillis;
    const updatedAt = stamp();
    const versionDocument = {
      assetId: resolvedId,
      version,
      authorUid: actor.uid,
      createdAt: updatedAt,
      createdAtMillis: nowMillis,
      content: normalized.content
    };
    const summary = createWorkshopSummary(normalized, {
      createdAt, updatedAt, createdAtMillis, updatedAtMillis: nowMillis
    });
    if (actor.uid !== context().uid) throw new Error("Your account changed while publishing. Try again.");
    if (typeof writeBatch === "function") {
      const batch = writeBatch(db);
      batch.set(versionRef(resolvedId, version), versionDocument);
      batch.set(summaryRef(resolvedId), summary);
      await batch.commit();
    } else {
      await setDoc(summaryRef(resolvedId), summary);
      try { await setDoc(versionRef(resolvedId, version), versionDocument); }
      catch (error) {
        if (!existing) await deleteDoc(summaryRef(resolvedId)).catch(() => {});
        throw error;
      }
    }
    return { ...summary, content: normalized.content };
  }

  async function loadAsset(assetId, requestedVersion = null) {
    const actor = requireUser();
    const summary = await getSummary(assetId);
    if (!summary || !canAccessWorkshopAsset(summary, actor)) throw new Error("This Workshop asset is unavailable.");
    const version = Math.max(1, Math.trunc(Number(requestedVersion || summary.version) || 1));
    const snapshot = await getDoc(versionRef(assetId, version));
    if (!exists(snapshot)) throw new Error("That Workshop version is unavailable.");
    const versionData = dataOf(snapshot);
    return { ...summary, version, content: versionData.content || {} };
  }

  async function runSummaryQuery(constraints, pageSize, cursor) {
    const parts = [...constraints];
    if (cursor && typeof startAfter === "function") parts.push(startAfter(cursor));
    parts.push(limit(Math.max(1, Math.min(100, pageSize))));
    const snapshot = await getDocs(query(collection(db, "workshopAssets"), ...parts));
    const entries = docsOf(snapshot).map((entry) => ({ ...dataOf(entry), assetId: entry.id || dataOf(entry).assetId }));
    return { entries, cursor: docsOf(snapshot).at(-1) || null, hasMore: docsOf(snapshot).length >= pageSize };
  }

  async function listPersonal(kind) {
    const actor = requireUser();
    const snapshot = await getDocs(collection(db, "users", actor.uid, kind));
    return docsOf(snapshot).map((entry) => ({ ...dataOf(entry), id: entry.id }));
  }

  async function listAssets({ scope = "browse", pageSize = WORKSHOP_PAGE_SIZE, cursors = {} } = {}) {
    const actor = requireUser();
    if (["saved", "library"].includes(scope)) {
      const imports = await listPersonal("workshopImports");
      const importOffset = Math.max(0, Math.trunc(Number(cursors.importOffset) || 0));
      const importPage = imports.slice(importOffset, importOffset + pageSize);
      const importedEntries = importPage.map((entry) => ({
        ...entry.summary,
        imported: true,
        localRecordId: entry.localRecordId,
        sourceWorkshopVersion: entry.sourceWorkshopVersion || entry.summary?.version || 1
      }));
      const importsHaveMore = importOffset + importPage.length < imports.length;
      if (scope === "saved") return { entries: sortWorkshopAssets(importedEntries), cursors: { importOffset: importOffset + importPage.length }, hasMore: importsHaveMore };
      const owned = await runSummaryQuery([where("authorUid", "==", actor.uid)], pageSize, cursors.my);
      const merged = new Map(owned.entries.map((entry) => [entry.assetId, entry]));
      importedEntries.forEach((entry) => merged.set(entry.assetId, entry));
      return { entries: sortWorkshopAssets([...merged.values()]), cursors: { my: owned.cursor, importOffset: importOffset + importPage.length }, hasMore: owned.hasMore || importsHaveMore };
    }
    if (scope === "favorites") {
      const favorites = await listPersonal("workshopFavorites");
      const favoriteOffset = Math.max(0, Math.trunc(Number(cursors.favoriteOffset) || 0));
      const favoritePage = favorites.slice(favoriteOffset, favoriteOffset + pageSize);
      const resolved = [];
      for (const favorite of favoritePage) {
        try {
          const summary = await getSummary(favorite.assetId || favorite.id);
          if (summary && canAccessWorkshopAsset(summary, actor)) resolved.push({ ...summary, favorite: true });
        } catch { /* Inaccessible favorites disappear without exposing metadata. */ }
      }
      return { entries: sortWorkshopAssets(resolved), cursors: { favoriteOffset: favoriteOffset + favoritePage.length }, hasMore: favoriteOffset + favoritePage.length < favorites.length };
    }
    if (scope === "friends") return { entries: [], cursors: {}, hasMore: false };

    const sources = [];
    if (["browse", "my"].includes(scope)) sources.push(["my", [where("authorUid", "==", actor.uid)]]);
    if (["browse", "room"].includes(scope) && actor.roomCode) {
      sources.push(["room", [where("visibility", "==", "ROOM"), where("roomCode", "==", actor.roomCode)]]);
    }
    if (scope === "browse" && publicBrowse) sources.push(["public", [where("visibility", "==", "PUBLIC")]]);
    const results = await Promise.all(sources.map(async ([key, constraints]) => [key, await runSummaryQuery(constraints, pageSize, cursors[key])]));
    const unique = new Map();
    const nextCursors = {};
    let hasMore = false;
    for (const [key, result] of results) {
      result.entries.forEach((entry) => unique.set(entry.assetId, entry));
      nextCursors[key] = result.cursor;
      hasMore ||= result.hasMore;
    }
    return { entries: sortWorkshopAssets([...unique.values()]), cursors: nextCursors, hasMore };
  }

  async function listLibraryState() {
    const actor = requireUser();
    const [favorites, imports, collections] = await Promise.all([
      listPersonal("workshopFavorites"),
      listPersonal("workshopImports"),
      listCollections()
    ]);
    return {
      favoriteIds: new Set(favorites.map((entry) => entry.assetId || entry.id)),
      imports: new Map(imports.map((entry) => [entry.assetId || entry.id, entry])),
      collections
    };
  }

  async function findOwnedSource(sourceKey) {
    const actor = requireUser();
    let cursor = null;
    for (let page = 0; page < 10; page += 1) {
      const result = await runSummaryQuery([where("authorUid", "==", actor.uid)], 100, cursor);
      const match = result.entries.find((entry) => entry.sourceKey === sourceKey);
      if (match) return match;
      if (!result.hasMore || !result.cursor) break;
      cursor = result.cursor;
    }
    return null;
  }

  async function deleteAsset(assetId) {
    const actor = requireUser();
    const summary = await getSummary(assetId);
    if (!summary || summary.authorUid !== actor.uid) throw new Error("Only the author can delete this Workshop asset.");
    const versions = await getDocs(collection(db, "workshopAssets", String(assetId), "versions"));
    for (const entry of docsOf(versions)) await deleteDoc(entry.ref || versionRef(assetId, entry.id));
    await deleteDoc(summaryRef(assetId));
    return true;
  }

  async function removeFromRoom(assetId) {
    const actor = requireUser();
    const summary = await getSummary(assetId);
    if (!summary || summary.visibility !== "ROOM" || summary.roomCode !== actor.roomCode) {
      throw new Error("That asset is not shared with the current room.");
    }
    await setDoc(summaryRef(assetId), {
      visibility: "PRIVATE",
      roomCode: "",
      updatedAt: stamp(),
      updatedAtMillis: Date.now()
    }, { merge: true });
    return true;
  }

  async function remix(assetId, overrides = {}) {
    const original = await loadAsset(assetId);
    return publish({
      ...original,
      ...overrides,
      assetId: "",
      name: overrides.name || `${original.name} Remix`,
      visibility: overrides.visibility || "PRIVATE",
      roomCode: overrides.roomCode || "",
      forkedFrom: original.assetId,
      sourceKey: "",
      sourceRecordId: "",
      content: original.content
    });
  }

  async function toggleFavorite(asset, favorite) {
    const actor = requireUser();
    const assetId = String(asset?.assetId || asset || "");
    const reference = doc(db, "users", actor.uid, "workshopFavorites", assetId);
    if (favorite === false) {
      await deleteDoc(reference);
      return false;
    }
    await setDoc(reference, { assetId, createdAt: stamp(), createdAtMillis: Date.now() });
    return true;
  }

  async function recordImport(asset, localRecordId) {
    const actor = requireUser();
    await setDoc(doc(db, "users", actor.uid, "workshopImports", asset.assetId), {
      assetId: asset.assetId,
      sourceWorkshopVersion: asset.version,
      sourceAuthorUid: asset.authorUid,
      assetType: asset.assetType,
      localRecordId: String(localRecordId || ""),
      summary: createWorkshopSummary(asset, asset),
      importedAt: stamp(),
      importedAtMillis: Date.now()
    });
  }

  async function listCollections() {
    const actor = requireUser();
    const snapshot = await getDocs(collection(db, "users", actor.uid, "workshopCollections"));
    return docsOf(snapshot).map((entry) => normalizeWorkshopCollection({ ...dataOf(entry), collectionId: entry.id }, actor.uid));
  }

  async function listCollectionAssets(input) {
    const actor = requireUser();
    const collectionRecord = normalizeWorkshopCollection(input, actor.uid);
    const assets = [];
    for (let index = 0; index < collectionRecord.assetIds.length; index += 20) {
      const batch = collectionRecord.assetIds.slice(index, index + 20);
      const summaries = await Promise.all(batch.map(async (assetId) => {
        try { return await getSummary(assetId); }
        catch { return null; }
      }));
      for (const summary of summaries) {
        if (summary && canAccessWorkshopAsset(summary, actor)) assets.push(summary);
      }
    }
    return sortWorkshopAssets(assets);
  }

  async function saveCollection(input) {
    const actor = requireUser();
    const collectionId = String(input.collectionId || newId("collection"));
    const normalized = normalizeWorkshopCollection({ ...input, collectionId }, actor.uid);
    await setDoc(doc(db, "users", actor.uid, "workshopCollections", collectionId), {
      ...normalized,
      createdAt: input.createdAt || stamp(),
      updatedAt: stamp(),
      updatedAtMillis: Date.now()
    }, { merge: true });
    return normalized;
  }

  async function setCollectionAsset(input, assetId, included) {
    return saveCollection(updateCollectionAssets(input, assetId, included));
  }

  async function deleteCollection(collectionId) {
    const actor = requireUser();
    await deleteDoc(doc(db, "users", actor.uid, "workshopCollections", String(collectionId)));
    return true;
  }

  return Object.freeze({
    publish, loadAsset, listAssets, findOwnedSource, deleteAsset, removeFromRoom, remix,
    toggleFavorite, recordImport, listCollections, listCollectionAssets, saveCollection,
    setCollectionAsset, deleteCollection, getSummary, listLibraryState
  });
}
