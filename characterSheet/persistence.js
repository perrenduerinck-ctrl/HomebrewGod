import {
  assertCharacterMutationAccess,
  assertNoStaleRevision
} from "../shared/securityPersistence.js";

function cleanText(value) {
  return String(
    value == null
      ? ""
      : value
  ).trim();
}

function isPlainRecord(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function mergePreservingUnknownFields(
  remoteValue,
  nextValue
) {
  if (Array.isArray(nextValue)) {
    const remoteItems =
      Array.isArray(remoteValue)
        ? remoteValue
        : [];

    return nextValue.map(
      (nextItem, index) => {
        if (!isPlainRecord(nextItem)) {
          return nextItem;
        }

        const identityKeys = [
          "id",
          "docId",
          "firestoreDocumentId",
          "classId",
          "subclassId",
          "spellId",
          "featId",
          "itemId",
          "resourceId"
        ];
        const matchingKey =
          identityKeys.find(
            (key) => {
              return cleanText(
                nextItem[key]
              );
            }
          );
        const matchingValue =
          matchingKey
            ? cleanText(
                nextItem[
                  matchingKey
                ]
              )
            : "";
        const matchingRemoteItem =
          matchingKey
            ? remoteItems.find(
                (remoteItem) => {
                  return (
                    isPlainRecord(
                      remoteItem
                    ) &&
                    cleanText(
                      remoteItem[
                        matchingKey
                      ]
                    ) ===
                      matchingValue
                  );
                }
              )
            : remoteItems[index];

        return mergePreservingUnknownFields(
          matchingRemoteItem,
          nextItem
        );
      }
    );
  }

  if (!isPlainRecord(nextValue)) {
    return nextValue;
  }

  const merged = {
    ...(isPlainRecord(remoteValue)
      ? remoteValue
      : {})
  };

  Object.entries(nextValue).forEach(
    ([key, value]) => {
      if (value === undefined) {
        return;
      }

      merged[key] =
        (
          isPlainRecord(value) ||
          Array.isArray(value)
        )
          ? mergePreservingUnknownFields(
              merged[key],
              value
            )
          : value;
    }
  );

  return merged;
}

export function mergeCharacterRecordPreservingUnknownFields(
  remoteRecord,
  nextRecord
) {
  if (!isPlainRecord(remoteRecord)) {
    throw new Error(
      "The saved character record is missing or invalid."
    );
  }

  if (!isPlainRecord(nextRecord)) {
    throw new Error(
      "The character update is missing or invalid."
    );
  }

  return mergePreservingUnknownFields(
    remoteRecord,
    nextRecord
  );
}

export function buildExistingGameplayCharacterUpdate({
  remoteRecord,
  nextRecord,
  characterId,
  roomCode,
  resolvedOwnerUid,
  savedAtMillis,
  timestamp
}) {
  const savedId =
    cleanText(characterId);
  const expectedRoom =
    cleanText(roomCode)
      .toUpperCase();
  const storedRoom =
    cleanText(
      remoteRecord?.roomCode ||
      remoteRecord?.roomId ||
      remoteRecord?.room
    ).toUpperCase();
  const explicitDocumentId =
    cleanText(
      remoteRecord
        ?.firestoreDocumentId ||
      remoteRecord?.docId
    );

  if (!savedId) {
    throw new Error(
      "A saved character ID is required for a gameplay update."
    );
  }

  if (
    explicitDocumentId &&
    explicitDocumentId !== savedId
  ) {
    throw new Error(
      "The saved character ID does not match the loaded Firestore document."
    );
  }

  if (
    storedRoom &&
    expectedRoom &&
    storedRoom !== expectedRoom
  ) {
    throw new Error(
      "This character belongs to a different room and cannot be changed here."
    );
  }

  const ownerUid =
    cleanText(resolvedOwnerUid);

  if (!ownerUid) {
    throw new Error(
      "A character owner is required before gameplay changes can be saved."
    );
  }

  const merged =
    mergeCharacterRecordPreservingUnknownFields(
      remoteRecord,
      nextRecord
    );
  const remoteBuilder =
    isPlainRecord(remoteRecord.builder)
      ? remoteRecord.builder
      : {};

  merged.ownerUid = ownerUid;
  merged.roomCode =
    storedRoom ||
    expectedRoom;
  merged.builder = {
    ...(isPlainRecord(merged.builder)
      ? merged.builder
      : {}),
    lastSavedAtMillis:
      savedAtMillis
  };

  if (
    Object.hasOwn(
      remoteBuilder,
      "status"
    )
  ) {
    merged.builder.status =
      remoteBuilder.status;
  }

  if (
    Object.hasOwn(
      remoteBuilder,
      "finalizedAtMillis"
    )
  ) {
    merged.builder.finalizedAtMillis =
      remoteBuilder
        .finalizedAtMillis;
  }

  if (
    Object.hasOwn(
      remoteRecord,
      "createdAt"
    )
  ) {
    merged.createdAt =
      remoteRecord.createdAt;
  }

  merged.updatedAtMillis =
    savedAtMillis;
  merged.updatedAt = timestamp;

  return merged;
}

export async function persistExistingGameplayCharacter({
  updateDoc,
  documentRef,
  remoteRecord,
  nextRecord,
  characterId,
  roomCode,
  actorUid,
  roomDmUid,
  expectedRevisionMillis,
  savedAtMillis,
  timestamp
}) {
  if (typeof updateDoc !== "function") {
    throw new Error(
      "Firestore updateDoc is unavailable."
    );
  }

  if (!documentRef) {
    throw new Error(
      "The saved character document reference is unavailable."
    );
  }

  const ownerUid =
    cleanText(
      remoteRecord?.ownerUid
    );
  const actor =
    cleanText(actorUid);
  const dm =
    cleanText(roomDmUid);

  assertCharacterMutationAccess({
    actorUid: actor,
    roomDmUid: dm,
    ownerUid,
    label: "character"
  });

  assertNoStaleRevision({
    remoteRecord,
    expectedRevisionMillis,
    label: "character"
  });

  const payload =
    buildExistingGameplayCharacterUpdate({
      remoteRecord,
      nextRecord,
      characterId,
      roomCode,
      resolvedOwnerUid:
        ownerUid ||
        (
          actor === dm
            ? actor
            : ""
        ),
      savedAtMillis,
      timestamp
    });

  await updateDoc(
    documentRef,
    payload
  );

  return {
    characterId:
      cleanText(characterId),
    payload,
    writeMethod: "updateDoc"
  };
}
