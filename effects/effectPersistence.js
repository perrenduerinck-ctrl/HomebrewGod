import { normalizeEffectInstance } from "./effectModel.js";

const text = (value, maximum = 240) => String(value ?? "").trim().slice(0, maximum);

export function createEffectPersistence({
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getRoomId = () => "",
  getUserId = () => "",
  getIsDm = () => false,
  onWarning = () => {}
} = {}) {
  let unsubscribe = null;
  let listeningRoom = "";
  const path = (roomCode, id) => doc(db, "rooms", roomCode, "effects", id);

  async function save(value) {
    if (getIsDm() !== true) throw new Error("Only the room DM can apply gameplay effects.");
    const roomCode = text(value?.roomCode || getRoomId(), 32).toUpperCase();
    const createdByUid = text(value?.createdByUid || getUserId(), 180);
    const record = normalizeEffectInstance({
      ...value,
      roomCode,
      createdByUid,
      updatedAtMillis: Date.now()
    });
    if (!record || !createdByUid) throw new Error("A signed-in DM, room, and target are required.");
    await setDoc(path(roomCode, record.id), {
      ...record,
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function remove(value) {
    if (getIsDm() !== true) return false;
    const roomCode = text(value?.roomCode || getRoomId(), 32).toUpperCase();
    const id = text(value?.id || value, 180);
    if (!roomCode || !id) return false;
    await deleteDoc(path(roomCode, id));
    return true;
  }

  function stop() {
    try { unsubscribe?.(); } catch {}
    unsubscribe = null;
    listeningRoom = "";
  }

  function listen(roomCode, onRecords) {
    const cleanRoom = text(roomCode, 32).toUpperCase();
    if (!cleanRoom) {
      stop();
      return () => {};
    }
    if (cleanRoom === listeningRoom && unsubscribe) return unsubscribe;
    stop();
    listeningRoom = cleanRoom;
    unsubscribe = onSnapshot(
      collection(db, "rooms", cleanRoom, "effects"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (listeningRoom !== cleanRoom || snapshot.metadata?.hasPendingWrites) return;
        const records = snapshot.docs
          .map((entry) => normalizeEffectInstance({ id: entry.id, ...entry.data() }))
          .filter(Boolean);
        onRecords?.(records);
      },
      (error) => onWarning(error?.message || "Gameplay effects could not be synchronized.")
    );
    return unsubscribe;
  }

  return Object.freeze({ save, remove, listen, stop });
}
