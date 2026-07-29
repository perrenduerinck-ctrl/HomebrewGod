import {
  mergeCharacterRecordPreservingUnknownFields
} from "../characterSheet/persistence.js?v=persistence-20260729";

const basePersistencePath =
  import.meta.url.includes(
    "/persistenceGuard.js"
  )
    ? "./persistence.js?source=priority8-20260728"
    : "./persistence.base.js?source=priority8-20260728";
const {
  createCharacterPersistence:
    createBaseCharacterPersistence
} = await import(
  basePersistencePath
);

function snapshotExists(snapshot) {
  if (!snapshot) {
    return false;
  }

  return typeof snapshot.exists ===
    "function"
    ? snapshot.exists()
    : snapshot.exists !== false;
}

function snapshotData(snapshot) {
  return typeof snapshot?.data ===
    "function"
    ? snapshot.data()
    : snapshot?.data || null;
}

export function createCharacterPersistence(
  context
) {
  const dependencies =
    context?.deps || {};
  const originalUpdateDoc =
    dependencies.updateDoc;
  const getDoc =
    dependencies.getDoc;

  if (
    typeof originalUpdateDoc !==
      "function" ||
    typeof getDoc !== "function"
  ) {
    return createBaseCharacterPersistence(
      context
    );
  }

  const guardedDependencies = {
    ...dependencies,
    updateDoc:
      async (
        documentRef,
        nextRecord
      ) => {
        const snapshot =
          await getDoc(documentRef);
        const remoteRecord =
          snapshotExists(snapshot)
            ? snapshotData(snapshot)
            : null;

        if (
          !remoteRecord ||
          typeof remoteRecord !==
            "object"
        ) {
          return originalUpdateDoc(
            documentRef,
            nextRecord
          );
        }

        const payload =
          mergeCharacterRecordPreservingUnknownFields(
            remoteRecord,
            nextRecord
          );

        payload.ownerUid =
          remoteRecord.ownerUid ||
          nextRecord.ownerUid;
        payload.roomCode =
          remoteRecord.roomCode ||
          remoteRecord.roomId ||
          nextRecord.roomCode;

        if (
          Object.hasOwn(
            remoteRecord,
            "createdAt"
          )
        ) {
          payload.createdAt =
            remoteRecord.createdAt;
        }

        return originalUpdateDoc(
          documentRef,
          payload
        );
      }
  };

  return createBaseCharacterPersistence({
    ...context,
    deps: guardedDependencies
  });
}
