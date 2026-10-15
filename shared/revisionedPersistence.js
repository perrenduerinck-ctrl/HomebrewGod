import {
  friendlyServiceError,
  reportPersistenceFailure
} from "./securityPersistence.js";

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
  actorUid = "",
  label = "record",
  runTransaction,
  getDoc,
  setDoc
}) {
  const expectedRevision = normalizeRecordRevision(raw?.revision);
  const authenticatedActorUid = String(actorUid || "").trim();
  let observedRemoteOwnerUid = "";
  let observedRevisionState =
    expectedRevision > 0
      ? "unknown"
      : "new";

  const commit = async (reader, writer) => {
    const snapshot = await reader(reference);
    const exists = snapshotExists(snapshot);
    const remote = exists ? snapshotData(snapshot) : {};
    const remoteRevision = normalizeRecordRevision(remote.revision);
    observedRemoteOwnerUid = String(remote.ownerUid || "").trim();

    if (
      (exists && expectedRevision !== remoteRevision) ||
      (!exists && expectedRevision !== 0)
    ) {
      observedRevisionState = "stale";
      throw createRevisionConflictError(label, raw);
    }
    observedRevisionState = exists
      ? "current"
      : "new";
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

  try {
    if (typeof runTransaction === "function") {
      return await runTransaction(db, (transaction) => commit(
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
    return await commit(
      getDoc,
      (target, next) => setDoc(target, next, { merge: true })
    );
  } catch (error) {
    const code = String(error?.code || "")
      .toLowerCase();
    const serviceFailure = [
      "permission-denied",
      "unauthenticated",
      "unavailable",
      "resource-exhausted",
      "failed-precondition",
      "aborted"
    ].some((value) => code.includes(value));
    const options = {
      service: "Firebase",
      feature: label,
      operation:
        expectedRevision > 0
          ? "update"
          : "create",
      action: `save this ${label}`,
      path:
        typeof reference?.path === "string"
          ? reference.path
          : String(reference || "unknown"),
      authenticated:
        authenticatedActorUid
          ? true
          : null,
      membershipState: "unknown",
      expectedRole: "record owner",
      ownershipState:
        authenticatedActorUid &&
        observedRemoteOwnerUid
          ? authenticatedActorUid ===
              observedRemoteOwnerUid
            ? "owner"
            : "mismatch"
          : "unknown",
      revisionState:
        error?.code === "revision-conflict"
          ? "stale"
          : observedRevisionState
    };

    reportPersistenceFailure(
      error,
      options
    );

    if (serviceFailure) {
      const friendlyError = new Error(
        friendlyServiceError(
          error,
          options
        )
      );
      friendlyError.code = error?.code || "";
      friendlyError.cause = error;
      throw friendlyError;
    }

    throw error;
  }
}
