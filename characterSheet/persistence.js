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
  runTransaction,
  db,
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
  if (
    typeof updateDoc !== "function" &&
    typeof runTransaction !== "function"
  ) {
    throw new Error(
      "Firestore updateDoc is unavailable."
    );
  }

  if (!documentRef) {
    throw new Error(
      "The saved character document reference is unavailable."
    );
  }

  const persistAgainstRecord = async (
    currentRecord,
    write
  ) => {
    const ownerUid =
      cleanText(
        currentRecord?.ownerUid
      );
    const actor = cleanText(actorUid);
    const dm = cleanText(roomDmUid);

    assertCharacterMutationAccess({
      actorUid: actor,
      roomDmUid: dm,
      ownerUid,
      label: "character"
    });

    const remoteRevision = Math.max(
      0,
      Math.floor(
        Number(currentRecord?.revision) || 0
      )
    );
    const expectedRevision = Math.max(
      0,
      Math.floor(
        Number(nextRecord?.revision) || 0
      )
    );

    if (
      remoteRevision > 0 ||
      expectedRevision > 0
    ) {
      if (remoteRevision !== expectedRevision) {
        throw new Error(
          "The character has a newer version. Reload it before saving again."
        );
      }
    } else {
      assertNoStaleRevision({
        remoteRecord: currentRecord,
        expectedRevisionMillis,
        label: "character"
      });
    }

    const payload =
      buildExistingGameplayCharacterUpdate({
        remoteRecord: currentRecord,
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

    payload.revision = remoteRevision + 1;
    await write(payload);
    return payload;
  };

  if (typeof runTransaction === "function") {
    const payload = await runTransaction(
      db,
      async (transaction) => {
        const snapshot =
          await transaction.get(documentRef);
        const currentRecord =
          typeof snapshot?.data === "function"
            ? snapshot.data()
            : snapshot?.data;

        if (
          !currentRecord ||
          snapshot?.exists === false ||
          (
            typeof snapshot?.exists ===
              "function" &&
            !snapshot.exists()
          )
        ) {
          throw new Error(
            "The saved character no longer exists."
          );
        }

        return persistAgainstRecord(
          currentRecord,
          async (nextPayload) => {
            transaction.update(
              documentRef,
              nextPayload
            );
          }
        );
      }
    );

    return {
      characterId: cleanText(characterId),
      payload,
      writeMethod: "transaction"
    };
  }

  const payload = await persistAgainstRecord(
    remoteRecord,
    async (nextPayload) => {
      await updateDoc(
        documentRef,
        nextPayload
      );
    }
  );

  return {
    characterId: cleanText(characterId),
    payload,
    writeMethod: "updateDoc"
  };
}
