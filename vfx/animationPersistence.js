import { normalizeAnimation } from "./animationDefinition.js";
import { getSpellAnimationDependencies } from "./animationReferences.js";

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
  if (!/^https:\/\//i.test(String(definition.sprite || ""))) throw hostedAssetError("The sprite sheet (secure hosted URL required)");
  if (definition.sound?.src && !/^https:\/\//i.test(String(definition.sound.src))) throw hostedAssetError("The sound asset (secure hosted URL required)");
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
  assetBaseUrl = globalThis.document?.baseURI,
  onStatus = () => {},
} = {}) {
  if (!library) throw new Error("An animation library is required.");

  const loadedOwners = new Set();
  const loadingOwners = new Map();
  const knownIds = new Set();
  const assets = new Map();
  const subscribers = new Set();
  let lastStatus = { state: "idle", message: "Sign in to sync personal animations." };
  let contextOwner = null;

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
    if (owner !== contextOwner) { loadedOwners.clear(); contextOwner = owner; }
    library.setContext?.({ ownerId: owner || null, roomId: getRoomId?.() || null });
    return owner;
  }

  const assetKey = (owner, id) => `${owner}/${id}`;
  function requireOwner(owner, input = null) {
    if (owner !== ownerId() || input?.ownership?.scope === "user" && input.ownership.ownerId !== owner) {
      throw new Error("Your signed-in account changed. Reopen the animation before saving.");
    }
  }
  function resolveAssets(input) {
    const resolve = src => {
      if (!src || DATA_URL_PATTERN.test(src) || /^https?:\/\//i.test(src)) return src;
      try { return new URL(src, assetBaseUrl).href; } catch { return src; }
    };
    return { ...input, sprite: resolve(input.sprite), sound: input.sound ? { ...input.sound, src: resolve(input.sound.src) } : null };
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
        if (owner !== ownerId()) return { state: "cancelled", message: "Account changed while loading animations." };
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
            knownIds.add(assetKey(owner, definition.id));
            if (record.spriteAsset) assets.set(assetKey(owner, definition.id), { ...record.spriteAsset });
            count += 1;
          } catch (error) {
            console.warn("Skipped an invalid saved animation.", error);
          }
        }
        loadedOwners.add(owner);
        return publish("ready", count ? `${count} personal animation${count === 1 ? "" : "s"} synced.` : "Personal animations are synced.");
      } catch (error) {
        if (owner !== ownerId()) return { state: "cancelled", message: "Account changed while loading animations." };
        loadedOwners.delete(owner);
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

    requireOwner(owner, input);
    let definition = normalizeOwnedAnimation(resolveAssets(input), owner);
    let asset = assets.get(assetKey(owner, definition.id)) || null;
    if (spriteFile) {
      if (typeof uploadSprite !== "function") throw new Error("Sprite uploads are not configured.");
      publish("uploading", "Uploading sprite sheet…");
      let uploaded;
      try { uploaded = await uploadSprite(spriteFile); }
      catch (error) {
        if (owner === ownerId()) publish("offline", "The sprite sheet could not be uploaded. Your previous saved animation is unchanged.", error);
        throw error;
      }
      requireOwner(owner);
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
    requireOwner(owner, input);
    const definition = normalizeOwnedAnimation(resolveAssets(input), owner);
    assertHostedAssets(definition);
    const stamp = timestamp(serverTimestamp);
    const record = {
      ...JSON.parse(JSON.stringify(definition)),
      id: definition.id,
      ownerId: owner,
      updatedAt: stamp,
    };
    const key = assetKey(owner, definition.id);
    if (!knownIds.has(key)) record.createdAt = stamp;
    const spriteAsset = asset || assets.get(key);
    if (spriteAsset) record.spriteAsset = { ...spriteAsset };
    try { await setDoc(doc(db, "users", owner, "animations", definition.id), record, { merge: true }); }
    catch (error) {
      if (owner === ownerId()) publish("offline", "The animation could not be synced. Your session remains usable.", error);
      throw error;
    }
    knownIds.add(key);
    if (spriteAsset) assets.set(key, { ...spriteAsset });
    if (owner === ownerId()) publish("ready", `Saved “${definition.name}” to your personal animation library.`);
    return { ok: true, persistent: true, definition };
  }

  async function deleteAnimation(animationId) {
    const owner = syncLibraryContext();
    if (!configured || !owner) return { ok: false, persistent: false };
    requireOwner(owner, library.getAnimation(animationId));
    // Loaded draft reference tools cannot prove that a saved character is safe.
    // Recheck the current room's authoritative spell records before deletion.
    const room = getRoomId?.();
    if (room) {
      let snapshot;
      try { snapshot = await getDocs(collection(db, "rooms", room, "characters")); }
      catch (error) {
        if (owner === ownerId()) publish("offline", "Saved spell dependencies could not be checked. The animation was not deleted.", error);
        throw new Error("Saved spell dependencies could not be checked. Try again when your room is online.");
      }
      requireOwner(owner);
      for (const entry of snapshotDocuments(snapshot)) for (const spell of documentData(entry).magic?.customSpells || []) {
        if (getSpellAnimationDependencies(spell).includes(String(animationId))) {
          throw new Error(`Saved spell “${spell.name || "Unnamed spell"}” still uses this animation. Replace or clear its stages and save the character before deleting.`);
        }
      }
    }
    try { await deleteDoc(doc(db, "users", owner, "animations", String(animationId))); }
    catch (error) {
      if (owner === ownerId()) publish("offline", "The animation could not be deleted from your account while offline.", error);
      throw error;
    }
    knownIds.delete(assetKey(owner, animationId));
    // Hosted files are intentionally retained unless a server can prove that no
    // other saved animation references them.
    assets.delete(assetKey(owner, animationId));
    if (owner === ownerId()) publish("ready", "Animation deleted from your personal library.");
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
