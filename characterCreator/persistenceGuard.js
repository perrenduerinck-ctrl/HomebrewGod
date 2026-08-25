import {
  mergeCharacterRecordPreservingUnknownFields
} from "../characterSheet/persistence.js?v=persistence-20260729";
import {
  guardCharacterDraftWalkingSpeed,
  installWalkingSpeedInputGuard,
  normalizeCharacterWalkingSpeed
} from "./walkingSpeed.js?v=custom-movement-speeds-20260731";
import "./uiEnhancements.js?v=multiclass-flow-20260825";

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
  const originalAddDoc =
    dependencies.addDoc;
  const originalNormalizeCharacter =
    context?.normalizeCharacter;
  const originalSanitizeDraftStrings =
    context?.sanitizeDraftStrings;
  const originalCreateCharacterPayload =
    context?.createCharacterPayload;
  const originalReplaceDraft =
    context?.replaceDraft;

  guardCharacterDraftWalkingSpeed(
    context?.creatorState
  );
  installWalkingSpeedInputGuard({
    getCharacter: () => {
      return context
        ?.creatorState?.draft;
    }
  });

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
    addDoc:
      typeof originalAddDoc ===
        "function"
        ? (
            collectionReference,
            character
          ) => {
            return originalAddDoc(
              collectionReference,
              normalizeCharacterWalkingSpeed(
                character
              )
            );
          }
        : originalAddDoc,
    updateDoc:
      async (
        documentRef,
        nextRecord
      ) => {
        normalizeCharacterWalkingSpeed(
          nextRecord
        );

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
            normalizeCharacterWalkingSpeed(
              nextRecord
            )
          );
        }

        const payload =
          mergeCharacterRecordPreservingUnknownFields(
            remoteRecord,
            nextRecord
          );

        normalizeCharacterWalkingSpeed(
          payload
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
    normalizeCharacter:
      typeof originalNormalizeCharacter ===
        "function"
        ? (character) => {
            return normalizeCharacterWalkingSpeed(
              originalNormalizeCharacter(
                character
              )
            );
          }
        : originalNormalizeCharacter,
    sanitizeDraftStrings:
      typeof originalSanitizeDraftStrings ===
        "function"
        ? (character) => {
            return normalizeCharacterWalkingSpeed(
              originalSanitizeDraftStrings(
                normalizeCharacterWalkingSpeed(
                  character
                )
              )
            );
          }
        : originalSanitizeDraftStrings,
    createCharacterPayload:
      typeof originalCreateCharacterPayload ===
        "function"
        ? (character) => {
            return normalizeCharacterWalkingSpeed(
              originalCreateCharacterPayload(
                normalizeCharacterWalkingSpeed(
                  character
                )
              )
            );
          }
        : originalCreateCharacterPayload,
    replaceDraft:
      typeof originalReplaceDraft ===
        "function"
        ? (
            character,
            options
          ) => {
            return originalReplaceDraft(
              normalizeCharacterWalkingSpeed(
                character
              ),
              options
            );
          }
        : originalReplaceDraft,
    deps: guardedDependencies
  });
}
