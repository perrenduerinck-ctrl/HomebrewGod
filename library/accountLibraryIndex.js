import { createLibraryRecord, libraryIdFor, libraryTimestampMillis } from "./libraryRecord.js";

export const ACCOUNT_LIBRARY_INDEX_VERSION = 1;
export const ACCOUNT_LIBRARY_REPAIR_INTERVAL_MS = 24 * 60 * 60 * 1000;

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const dataOf = (snapshot) => typeof snapshot?.data === "function" ? snapshot.data() || {} : snapshot?.data || {};
const definedMetadata = (value) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""));

export function createAccountLibraryIndexEntry({ assetType, sourceRecordId, roomCode, roomName, ownerUid, ownerName, record = {}, now = Date.now() } = {}) {
  const normalized = createLibraryRecord({
    assetType,
    sourceType: assetType,
    sourceRecordId,
    sourceScope: `room:${String(roomCode || "").toUpperCase()}`,
    sourceKind: "campaign",
    sourceRoomCode: roomCode,
    sourceRoomName: roomName,
    name: record.name,
    description: record.notes || record.description,
    thumbnailUrl: assetType === "map" ? record.thumbnailUrl : record.imageUrl || record.image?.url,
    tags: record.tags || (assetType === "monster" ? [record.type, record.size, record.cr ? `cr-${record.cr}` : ""] : [record.mapType || record.type]),
    ownerUid,
    ownerName,
    roomCode,
    visibility: "ROOM",
    createdAt: record.createdAt,
    createdAtMillis: record.createdAtMillis || libraryTimestampMillis(record.createdAt, now) || now,
    updatedAt: record.updatedAt || record.createdAt,
    updatedAtMillis: record.updatedAtMillis || libraryTimestampMillis(record.updatedAt || record.createdAt, now) || now,
    sourceWorkshopAssetId: record.sourceWorkshopAssetId,
    sourceWorkshopVersion: record.sourceWorkshopVersion,
    sourceAuthorUid: record.sourceAuthorUid,
    copiedFromLibraryId: record.copiedFromLibraryId,
    copiedFromRoomCode: record.copiedFromRoomCode,
    copiedFromRecordId: record.copiedFromRecordId,
    metadata: definedMetadata(assetType === "monster"
      ? { cr: record.cr, size: record.size, type: record.type || record.creatureType }
      : { mapType: record.mapType || record.type, width: record.width, height: record.height })
  });
  return Object.freeze({
    libraryId: normalized.libraryId,
    assetType: normalized.assetType,
    sourceType: normalized.sourceType,
    sourceRecordId: normalized.sourceRecordId,
    sourceScope: normalized.sourceScope,
    sourceKind: normalized.sourceKind,
    sourceRoomCode: normalized.sourceRoomCode,
    sourceRoomName: normalized.sourceRoomName,
    name: normalized.name,
    description: normalized.description,
    thumbnailUrl: normalized.thumbnailUrl,
    tags: normalized.tags,
    ownerUid: normalized.ownerUid,
    ownerName: normalized.authorName,
    roomCode: normalized.roomCode,
    visibility: normalized.visibility,
    createdAtMillis: normalized.createdAtMillis || now,
    updatedAtMillis: normalized.updatedAtMillis || now,
    sourceWorkshopAssetId: normalized.sourceWorkshopAssetId,
    sourceWorkshopVersion: normalized.sourceWorkshopVersion,
    sourceAuthorUid: normalized.sourceAuthorUid,
    copiedFromLibraryId: normalized.copiedFromLibraryId,
    copiedFromRoomCode: normalized.copiedFromRoomCode,
    copiedFromRecordId: normalized.copiedFromRecordId,
    unavailable: false,
    unavailableReason: "",
    metadata: normalized.metadata,
    indexedAtMillis: now
  });
}

export function createAccountLibraryIndex({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch,
  getUserId = () => "", getUserName = () => "", now = () => Date.now(),
  repairIntervalMs = ACCOUNT_LIBRARY_REPAIR_INTERVAL_MS
} = {}) {
  const activeRepairs = new Map();
  const userId = () => String(getUserId() || "");
  const indexRef = (uid, libraryId) => doc(db, "users", uid, "libraryIndex", libraryId);

  async function syncNative({ assetType, sourceRecordId, roomCode, roomName = "", record = {} } = {}) {
    const uid = userId();
    if (!uid || !sourceRecordId || !roomCode || !["monster", "map"].includes(assetType)) return null;
    const entry = createAccountLibraryIndexEntry({
      assetType, sourceRecordId, roomCode, roomName,
      ownerUid: uid, ownerName: getUserName(), record, now: now()
    });
    await setDoc(indexRef(uid, entry.libraryId), entry, { merge: true });
    return entry;
  }

  async function removeNative(assetType, sourceRecordId) {
    const uid = userId();
    if (!uid || !sourceRecordId) return false;
    await deleteDoc(indexRef(uid, libraryIdFor(assetType, sourceRecordId)));
    return true;
  }

  async function writeOperations(uid, operations) {
    if (typeof writeBatch !== "function") {
      for (const operation of operations) {
        if (operation.kind === "set") await setDoc(indexRef(uid, operation.id), operation.value, { merge: true });
        else await deleteDoc(indexRef(uid, operation.id));
      }
      return operations.length;
    }
    for (let offset = 0; offset < operations.length; offset += 450) {
      const batch = writeBatch(db);
      for (const operation of operations.slice(offset, offset + 450)) {
        if (operation.kind === "set") batch.set(indexRef(uid, operation.id), operation.value, { merge: true });
        else batch.delete(indexRef(uid, operation.id));
      }
      await batch.commit();
    }
    return operations.length;
  }

  async function repair({ force = false } = {}) {
    const uid = userId();
    if (!uid) return { skipped: true, reason: "signed-out", reads: 0, writes: 0 };
    const timestamp = now();
    const userRef = doc(db, "users", uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.exists?.() ? dataOf(userSnapshot) : {};
    const lastRepair = libraryTimestampMillis(userData.libraryIndexRepairedAtMillis);
    if (!force && Number(userData.libraryIndexVersion) >= ACCOUNT_LIBRARY_INDEX_VERSION && timestamp - lastRepair < repairIntervalMs) {
      return { skipped: true, reason: "fresh", reads: 1, writes: 0 };
    }

    const roomSnapshot = await getDocs(collection(db, "users", uid, "rooms"));
    const rooms = docsOf(roomSnapshot).map((entry) => ({ id: entry.id, ...dataOf(entry) }))
      .filter((entry) => String(entry.role || "").toLowerCase() === "dm");
    const expected = new Map();
    const repairedRooms = new Set();
    const deletedRooms = new Set();
    const inaccessibleRooms = new Set();
    const incompleteRooms = new Set();
    let reads = 1 + docsOf(roomSnapshot).length;

    for (const room of rooms) {
      const roomCode = String(room.roomCode || room.id || "").toUpperCase();
      if (!roomCode) continue;
      try {
        const sourceRoomSnapshot = await getDoc(doc(db, "rooms", roomCode));
        reads += 1;
        if (!sourceRoomSnapshot.exists?.()) {
          deletedRooms.add(roomCode);
          continue;
        }
        const sourceRoomData = dataOf(sourceRoomSnapshot);
        if (sourceRoomData.dmUid && sourceRoomData.dmUid !== uid) {
          inaccessibleRooms.add(roomCode);
          continue;
        }
        const [monsters, maps] = await Promise.all([
          getDocs(collection(db, "rooms", roomCode, "monsters")),
          getDocs(collection(db, "rooms", roomCode, "maps"))
        ]);
        reads += docsOf(monsters).length + docsOf(maps).length;
        repairedRooms.add(roomCode);
        for (const [assetType, snapshot] of [["monster", monsters], ["map", maps]]) {
          for (const entry of docsOf(snapshot)) {
            const value = createAccountLibraryIndexEntry({
              assetType, sourceRecordId: entry.id, roomCode,
              roomName: room.roomName || room.name || roomCode,
              ownerUid: uid, ownerName: getUserName(), record: dataOf(entry), now: timestamp
            });
            expected.set(value.libraryId, value);
          }
        }
      } catch (error) {
        const code = String(error?.code || "").replace(/^firestore\//, "");
        if (["permission-denied", "unauthenticated", "not-found"].includes(code)) {
          inaccessibleRooms.add(roomCode);
        } else {
          incompleteRooms.add(roomCode);
        }
      }
    }

    const existingSnapshot = await getDocs(collection(db, "users", uid, "libraryIndex"));
    reads += docsOf(existingSnapshot).length;
    const operations = [...expected.values()].map((value) => ({ kind: "set", id: value.libraryId, value }));
    for (const entry of docsOf(existingSnapshot)) {
      const value = dataOf(entry);
      const sourceRoomCode = String(value.sourceRoomCode || value.roomCode || "").toUpperCase();
      if (
        ["monster", "map"].includes(value.assetType) &&
        (repairedRooms.has(sourceRoomCode) || deletedRooms.has(sourceRoomCode)) &&
        !expected.has(entry.id)
      ) {
        operations.push({ kind: "delete", id: entry.id });
      } else if (["monster", "map"].includes(value.assetType) && inaccessibleRooms.has(sourceRoomCode)) {
        operations.push({
          kind: "set",
          id: entry.id,
          value: {
            unavailable: true,
            unavailableReason: "Campaign access is unavailable.",
            indexedAtMillis: timestamp
          }
        });
      }
    }
    const writes = await writeOperations(uid, operations);
    const incomplete = inaccessibleRooms.size > 0 || incompleteRooms.size > 0;
    await setDoc(userRef, incomplete ? {
      libraryIndexRepairAttemptedAtMillis: timestamp,
      libraryIndexRepairIncomplete: true
    } : {
      libraryIndexVersion: ACCOUNT_LIBRARY_INDEX_VERSION,
      libraryIndexRepairedAtMillis: timestamp,
      libraryIndexRepairAttemptedAtMillis: timestamp,
      libraryIndexRepairIncomplete: false
    }, { merge: true });
    return {
      skipped: false,
      incomplete,
      reads,
      writes: writes + 1,
      rooms: repairedRooms.size,
      records: expected.size,
      deletedRooms: [...deletedRooms],
      inaccessibleRooms: [...inaccessibleRooms],
      incompleteRooms: [...incompleteRooms]
    };
  }

  async function ensure() {
    const uid = userId();
    if (!uid) return repair();
    if (!activeRepairs.has(uid)) {
      activeRepairs.set(uid, repair().finally(() => activeRepairs.delete(uid)));
    }
    return activeRepairs.get(uid);
  }

  return Object.freeze({ syncNative, removeNative, repair, ensure });
}
