function snapshotExists(snapshot) {
  return typeof snapshot?.exists === "function"
    ? snapshot.exists()
    : snapshot?.exists === true;
}

function snapshotData(snapshot) {
  return typeof snapshot?.data === "function"
    ? snapshot.data() || {}
    : snapshot?.data || {};
}

export function normalizeRecordRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision >= 0
    ? revision
    : 0;
}

export function createRevisionConflictError(label, draft) {
  const error = new Error(
    `This ${label} changed in another tab. Your unsaved version is still in the editor; reload the saved record before trying again.`
  );
  error.code = "revision-conflict";
  error.draft = draft && typeof draft === "object"
    ? structuredClone(draft)
    : draft;
  return error;
}

export async function saveRevisionedRecord({
  db,
  reference,
  raw,
  record,
  label = "record",
  runTransaction,
  getDoc,
  setDoc
}) {
  const expectedRevision = normalizeRecordRevision(raw?.revision);

  const commit = async (reader, writer) => {
    const snapshot = await reader(reference);
    const exists = snapshotExists(snapshot);
    const remote = exists ? snapshotData(snapshot) : {};
    const remoteRevision = normalizeRecordRevision(remote.revision);

    if (
      (exists && expectedRevision !== remoteRevision) ||
      (!exists && expectedRevision !== 0)
    ) {
      throw createRevisionConflictError(label, raw);
    }
    if (
      exists &&
      remote.ownerUid &&
      record.ownerUid &&
      remote.ownerUid !== record.ownerUid
    ) {
      throw new Error(`This ${label} belongs to another account.`);
    }

    const next = {
      ...record,
      revision: remoteRevision + 1
    };
    if (exists && Object.hasOwn(remote, "createdAt")) {
      next.createdAt = remote.createdAt;
    }
    if (exists && Number(remote.createdAtMillis) > 0) {
      next.createdAtMillis = Number(remote.createdAtMillis);
    }
    await writer(reference, next);
    return next;
  };

  if (typeof runTransaction === "function") {
    return runTransaction(db, (transaction) => commit(
      (target) => transaction.get(target),
      (target, next) => transaction.set(target, next, { merge: true })
    ));
  }

  // Kept for isolated adapters/tests. The application always supplies a
  // transaction; callers without one still get conflict detection, but not
  // cross-client atomicity.
  if (typeof getDoc !== "function" || typeof setDoc !== "function") {
    throw new Error(`Atomic ${label} saving is unavailable.`);
  }
  return commit(
    getDoc,
    (target, next) => setDoc(target, next, { merge: true })
  );
}
