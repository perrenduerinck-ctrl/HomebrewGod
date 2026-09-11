import { normalizeAnimation } from "./animationDefinition.js";

const DATA_URL_PATTERN = /^data:/i;

function timestamp(factory) {
  return typeof factory === "function" ? factory() : new Date().toISOString();
}

function documentData(snapshot) {
  return typeof snapshot?.data === "function" ? snapshot.data() : snapshot?.data || snapshot || {};
}

function snapshotDocuments(snapshot) {
  if (Array.isArray(snapshot?.docs)) return snapshot.docs;
  const documents = [];
  snapshot?.forEach?.((entry) => documents.push(entry));
  return documents;
}

function hostedAssetError(label) {
  return new Error(`${label} must be uploaded before this animation can sync.`);
}

function assertHostedAssets(definition) {
  if (DATA_URL_PATTERN.test(String(definition.sprite || ""))) throw hostedAssetError("The sprite sheet");
  if (definition.sound?.src && DATA_URL_PATTERN.test(String(definition.sound.src))) throw hostedAssetError("The sound asset");
}

function normalizeOwnedAnimation(input, ownerId) {
  return normalizeAnimation({
    ...input,
    ownership: { kind: "user", scope: "user", ownerId: String(ownerId), roomId: null },
  });
}

/** Firestore-backed personal animation store. Dependencies are injected so the
 * editor and unit tests do not import a second Firebase bundle. */
export function createAnimationPersistence({
  library,
  db = null,
  getUserId = () => null,
  getRoomId = () => null,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  uploadSprite,
  onStatus = () => {},
} = {}) {
  if (!library) throw new Error("An animation library is required.");

  const loadedOwners = new Set();
  const loadingOwners = new Map();
  const knownIds = new Set();
  const assets = new Map();
  const subscribers = new Set();
  let lastStatus = { state: "idle", message: "Sign in to sync personal animations." };

  const configured = [collection, doc, getDocs, setDoc, deleteDoc].every((item) => typeof item === "function");
  const ownerId = () => String(getUserId?.() || "").trim();

  function publish(state, message, error = null) {
    lastStatus = { state, message, error };
    onStatus(lastStatus);
    subscribers.forEach((listener) => listener(lastStatus));
    return lastStatus;
  }

  function syncLibraryContext() {
    const owner = ownerId();
    library.setContext?.({ ownerId: owner || null, roomId: getRoomId?.() || null });
    return owner;
  }

  function canPersist() {
    return Boolean(configured && ownerId());
  }

  async function load({ force = false } = {}) {
    const owner = syncLibraryContext();
    if (!configured) return publish("unavailable", "Animation sync is unavailable; edits stay in this session.");
    if (!owner) return publish("signed-out", "Sign in to sync personal animations.");
    if (!force && loadedOwners.has(owner)) return publish("ready", "Personal animations are synced.");
    if (!force && loadingOwners.has(owner)) return loadingOwners.get(owner);

    const work = (async () => {
      publish("loading", "Loading personal animations…");
      try {
        const snapshot = await getDocs(collection(db, "users", owner, "animations"));
        let count = 0;
        for (const entry of snapshotDocuments(snapshot)) {
          try {
            const record = documentData(entry);
            const definition = normalizeOwnedAnimation({
              ...(record.definition || record.animation || record),
              id: record.id || entry.id,
            }, owner);
            assertHostedAssets(definition);
            library.hydrateAnimation?.(definition);
            knownIds.add(definition.id);
            if (record.spriteAsset) assets.set(definition.id, { ...record.spriteAsset });
            count += 1;
          } catch (error) {
            console.warn("Skipped an invalid saved animation.", error);
          }
        }
        loadedOwners.add(owner);
        return publish("ready", count ? `${count} personal animation${count === 1 ? "" : "s"} synced.` : "Personal animations are synced.");
      } catch (error) {
        return publish("offline", "Personal animations could not be loaded. Built-ins and session edits still work.", error);
      } finally {
        loadingOwners.delete(owner);
      }
    })();
    loadingOwners.set(owner, work);
    return work;
  }

  async function prepareAnimation(input, { spriteFile = null } = {}) {
    const owner = syncLibraryContext();
    if (!owner || !configured) return { definition: normalizeAnimation(input), asset: null, persistent: false };

    let definition = normalizeOwnedAnimation(input, owner);
    let asset = assets.get(definition.id) || null;
    if (spriteFile) {
      if (typeof uploadSprite !== "function") throw new Error("Sprite uploads are not configured.");
      publish("uploading", "Uploading sprite sheet…");
      let uploaded;
      try { uploaded = await uploadSprite(spriteFile); }
      catch (error) {
        publish("offline", "The sprite sheet could not be uploaded. Your previous saved animation is unchanged.", error);
        throw error;
      }
      const url = String(uploaded?.url || uploaded?.secure_url || "").trim();
      if (!/^https:\/\//i.test(url)) throw new Error("The sprite upload did not return a secure URL.");
      asset = {
        url,
        publicId: uploaded.publicId || uploaded.public_id || null,
        resourceType: uploaded.resourceType || uploaded.resource_type || "image",
      };
      definition = normalizeOwnedAnimation({ ...definition, sprite: url }, owner);
    }
    assertHostedAssets(definition);
    return { definition, asset, persistent: true };
  }

  async function saveAnimation(input, { asset = null } = {}) {
    const owner = syncLibraryContext();
    if (!configured || !owner) return { ok: false, persistent: false };
    const definition = normalizeOwnedAnimation(input, owner);
    assertHostedAssets(definition);
    const stamp = timestamp(serverTimestamp);
    const record = {
      ...JSON.parse(JSON.stringify(definition)),
      id: definition.id,
      ownerId: owner,
      updatedAt: stamp,
    };
    if (!knownIds.has(definition.id)) record.createdAt = stamp;
    const spriteAsset = asset || assets.get(definition.id);
    if (spriteAsset) record.spriteAsset = { ...spriteAsset };
    try { await setDoc(doc(db, "users", owner, "animations", definition.id), record, { merge: true }); }
    catch (error) {
      publish("offline", "The animation could not be synced. Your session remains usable.", error);
      throw error;
    }
    knownIds.add(definition.id);
    if (spriteAsset) assets.set(definition.id, { ...spriteAsset });
    publish("ready", `Saved “${definition.name}” to your personal animation library.`);
    return { ok: true, persistent: true, definition };
  }

  async function deleteAnimation(animationId) {
    const owner = syncLibraryContext();
    if (!configured || !owner) return { ok: false, persistent: false };
    try { await deleteDoc(doc(db, "users", owner, "animations", String(animationId))); }
    catch (error) {
      publish("offline", "The animation could not be deleted from your account while offline.", error);
      throw error;
    }
    knownIds.delete(String(animationId));
    // Hosted files are intentionally retained unless a server can prove that no
    // other saved animation references them.
    assets.delete(String(animationId));
    publish("ready", "Animation deleted from your personal library.");
    return { ok: true, persistent: true };
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    subscribers.add(listener);
    listener(lastStatus);
    return () => subscribers.delete(listener);
  }

  return {
    canPersist,
    load,
    prepareAnimation,
    saveAnimation,
    deleteAnimation,
    subscribe,
    getStatus: () => ({ ...lastStatus }),
    setContext() {
      syncLibraryContext();
      return load();
    },
  };
}
