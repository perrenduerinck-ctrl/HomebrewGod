function text(value, maximum = 240) {
  return String(value ?? "").trim().slice(0, maximum);
}

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

export function normalizePersistedCombatEffect(value = {}) {
  const id = text(value.id, 180);
  const roomCode = text(value.roomCode, 32).toUpperCase();
  if (!id || !roomCode || !value.duration) return null;
  return {
    id,
    roomCode,
    createdByUid: text(value.createdByUid, 180),
    contentId: text(value.contentId, 240),
    contentName: text(value.contentName, 240) || "Effect",
    sourceTokenId: text(value.sourceTokenId, 180),
    targetTokenIds: (Array.isArray(value.targetTokenIds) ? value.targetTokenIds : [])
      .map((entry) => text(entry, 180)).filter(Boolean).slice(0, 32),
    duration: clone(value.duration),
    startedAtWorldTime: Number(value.startedAtWorldTime) || 0,
    startedAtRound: Math.max(1, Number(value.startedAtRound) || 1),
    startedAtTurnOrdinal: Math.max(0, Number(value.startedAtTurnOrdinal) || 0),
    concentrationKey: text(value.concentrationKey, 320),
    requiredStatus: text(value.requiredStatus, 160).toLowerCase(),
    createdAtMillis: Number(value.createdAtMillis) || Date.now(),
    animation: clone(value.animation),
    automationState: clone(value.automationState),
    sourcePoint: clone(value.sourcePoint),
    targetPoints: (Array.isArray(value.targetPoints) ? value.targetPoints : [])
      .slice(0, 32).map(clone)
  };
}

/** Firestore transport for the existing lifecycle; it deliberately owns no
 * runtime controllers or competing effect state. */
export function createCombatEffectPersistence({
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

  const path = (roomCode, id) => doc(db, "rooms", roomCode, "combatEffects", id);

  async function save(value) {
    const roomCode = text(value?.roomCode || getRoomId(), 32).toUpperCase();
    const createdByUid = text(value?.createdByUid || getUserId(), 180);
    const record = normalizePersistedCombatEffect({ ...value, roomCode, createdByUid });
    if (!record || !createdByUid) throw new Error("A signed-in room member is required to save an effect.");
    await setDoc(path(roomCode, record.id), {
      ...record,
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function remove(value) {
    const roomCode = text(value?.roomCode || getRoomId(), 32).toUpperCase();
    const id = text(value?.id || value, 180);
    const owns = text(value?.createdByUid, 180) === text(getUserId(), 180);
    if (!roomCode || !id || (!owns && getIsDm() !== true)) return false;
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
      collection(db, "rooms", cleanRoom, "combatEffects"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (listeningRoom !== cleanRoom || snapshot.metadata?.hasPendingWrites) return;
        const records = snapshot.docs
          .map((entry) => normalizePersistedCombatEffect({ id: entry.id, ...entry.data() }))
          .filter(Boolean);
        onRecords?.(records);
      },
      (error) => onWarning(error?.message || "Active effects could not be synchronized.")
    );
    return unsubscribe;
  }

  return Object.freeze({ save, remove, listen, stop });
}
