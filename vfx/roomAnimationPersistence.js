import { normalizeAnimation } from "./animationDefinition.js";
import { getSpellAnimationDependencies } from "./animationReferences.js";

function text(value) {
  return String(value ?? "").trim();
}

function documents(snapshot) {
  if (Array.isArray(snapshot?.docs)) return snapshot.docs;
  const result = [];
  snapshot?.forEach?.((entry) => result.push(entry));
  return result;
}

function data(snapshot) {
  return typeof snapshot?.data === "function"
    ? snapshot.data() || {}
    : snapshot?.data || snapshot || {};
}

function normalizeRoomAnimation(input, roomId) {
  return normalizeAnimation({
    ...input,
    ownership: {
      kind: "user",
      scope: "room",
      ownerId: roomId
    }
  });
}

function assertHostedAssets(definition) {
  if (!/^https:\/\//i.test(String(definition.sprite || ""))) {
    throw new Error("Upload the sprite sheet before sharing this animation.");
  }
  if (definition.sound?.src && !/^https:\/\//i.test(definition.sound.src)) {
    throw new Error("Upload the sound before sharing this animation.");
  }
}

function recordUsesAnimation(record, animationId) {
  const pending = [record];
  const visited = new WeakSet();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (getSpellAnimationDependencies(value).includes(animationId)) return true;
    Object.values(value).forEach((child) => {
      if (child && typeof child === "object") pending.push(child);
    });
  }
  return false;
}

export function createRoomAnimationPersistence({
  library,
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getUserId = () => null,
  getRoomId = () => null,
  getIsDm = () => false,
  uploadSprite = null
} = {}) {
  const loadedRooms = new Set();
  const roomId = () => text(getRoomId?.());
  const userId = () => text(getUserId?.());
  const configured = [collection, doc, getDocs, setDoc, deleteDoc]
    .every((dependency) => typeof dependency === "function");

  function canShareWithRoom() {
    return Boolean(configured && roomId() && userId() && getIsDm?.() === true);
  }

  function requireDm() {
    if (!canShareWithRoom()) {
      throw new Error("Open a room as its DM before changing shared animations.");
    }
  }

  async function load({ force = false } = {}) {
    const room = roomId();
    library.setContext?.({
      ...library.getContext?.(),
      roomId: room || null
    });
    if (!configured || !room || !userId()) return { state: "unavailable", count: 0 };
    if (!force && loadedRooms.has(room)) return { state: "ready", count: 0 };

    const snapshot = await getDocs(collection(db, "rooms", room, "animations"));
    if (room !== roomId()) return { state: "cancelled", count: 0 };
    let count = 0;
    for (const entry of documents(snapshot)) {
      try {
        const record = data(entry);
        if (
          record.roomCode !== room ||
          record.ownership?.scope !== "room" ||
          record.ownership?.ownerId !== room
        ) {
          continue;
        }
        const definition = normalizeRoomAnimation({
          ...(record.definition || record.animation || record),
          id: record.id || entry.id
        }, room);
        assertHostedAssets(definition);
        library.hydrateAnimation(definition);
        count += 1;
      } catch (error) {
        console.warn("Skipped an invalid shared room animation.", error);
      }
    }
    loadedRooms.add(room);
    return { state: "ready", count };
  }

  async function prepareAnimation(input, { spriteFile = null } = {}) {
    requireDm();
    const room = roomId();
    let definition = normalizeRoomAnimation(input, room);
    let asset = null;
    if (spriteFile) {
      if (typeof uploadSprite !== "function") {
        throw new Error("Shared sprite uploads are unavailable.");
      }
      const uploaded = await uploadSprite(spriteFile);
      const url = text(uploaded?.url || uploaded?.secure_url);
      if (!/^https:\/\//i.test(url)) {
        throw new Error("The shared sprite upload did not return a secure URL.");
      }
      asset = {
        url,
        publicId: uploaded.publicId || uploaded.public_id || null,
        resourceType: uploaded.resourceType || uploaded.resource_type || "image"
      };
      definition = normalizeRoomAnimation({ ...definition, sprite: url }, room);
    }
    assertHostedAssets(definition);
    return { definition, asset, persistent: true };
  }

  async function saveAnimation(input, { asset = null } = {}) {
    requireDm();
    const room = roomId();
    const definition = normalizeRoomAnimation(input, room);
    assertHostedAssets(definition);
    const stamp = typeof serverTimestamp === "function"
      ? serverTimestamp()
      : new Date().toISOString();
    const record = {
      ...JSON.parse(JSON.stringify(definition)),
      id: definition.id,
      roomCode: room,
      ownerId: room,
      publishedByUid: userId(),
      updatedAt: stamp
    };
    if (asset) record.spriteAsset = { ...asset };
    await setDoc(
      doc(db, "rooms", room, "animations", definition.id),
      record,
      { merge: true }
    );
    loadedRooms.add(room);
    return { ok: true, persistent: true, definition };
  }

  async function deleteAnimation(animationId) {
    requireDm();
    const room = roomId();
    const id = text(animationId);
    for (const collectionName of ["characters", "monsters"]) {
      const snapshot = await getDocs(collection(db, "rooms", room, collectionName));
      for (const entry of documents(snapshot)) {
        if (recordUsesAnimation(data(entry), id)) {
          throw new Error(`A saved ${collectionName === "characters" ? "character" : "monster"} still uses this room animation.`);
        }
      }
    }
    await deleteDoc(doc(db, "rooms", room, "animations", id));
    return { ok: true, persistent: true };
  }

  async function shareAnimationWithRoom(animationId) {
    requireDm();
    const source = library.getAnimation(animationId);
    if (!source || source.ownership.kind === "builtin") {
      throw new Error("Choose one of your saved custom animations to share.");
    }
    assertHostedAssets(source);
    const sharedId = source.ownership.scope === "room"
      ? source.id
      : `room_${source.id}`.slice(0, 120);
    const definition = normalizeRoomAnimation({
      ...source,
      id: sharedId,
      revision: 1
    }, roomId());
    await saveAnimation(definition);
    library.hydrateAnimation(definition);
    return { ok: true, persistent: true, definition };
  }

  return Object.freeze({
    canShareWithRoom,
    isRoomAnimation: (animationId) => (
      library.getAnimation(animationId)?.ownership?.scope === "room"
    ),
    load,
    prepareAnimation,
    saveAnimation,
    deleteAnimation,
    shareAnimationWithRoom
  });
}

/** Adds room behavior to the existing personal persistence object in-place so
 * the already-created editor keeps its established dependency reference. */
export function extendAnimationPersistenceWithRoom(personal, room) {
  if (!personal || !room) return personal;
  const base = {
    load: personal.load.bind(personal),
    prepareAnimation: personal.prepareAnimation.bind(personal),
    saveAnimation: personal.saveAnimation.bind(personal),
    deleteAnimation: personal.deleteAnimation.bind(personal)
  };
  personal.canShareWithRoom = room.canShareWithRoom;
  personal.shareAnimationWithRoom = room.shareAnimationWithRoom;
  personal.load = async (options) => {
    const personalResult = await base.load(options);
    try { await room.load(options); } catch (error) {
      console.warn("Shared room animations could not be loaded.", error);
    }
    return personalResult;
  };
  personal.setContext = () => personal.load();
  personal.prepareAnimation = (input, options) => (
    input?.ownership?.scope === "room"
      ? room.prepareAnimation(input, options)
      : base.prepareAnimation(input, options)
  );
  personal.saveAnimation = (input, options) => (
    input?.ownership?.scope === "room"
      ? room.saveAnimation(input, options)
      : base.saveAnimation(input, options)
  );
  personal.deleteAnimation = (animationId) => (
    room.isRoomAnimation(animationId)
      ? room.deleteAnimation(animationId)
      : base.deleteAnimation(animationId)
  );
  return personal;
}
