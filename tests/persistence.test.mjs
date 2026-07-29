import test from "node:test";
import assert from "node:assert/strict";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";
import {
  persistExistingGameplayCharacter
} from "../characterSheet/persistence.js";

function clone(value) {
  return structuredClone(value);
}

function makeSavedCharacter(
  overrides = {}
) {
  return {
    schemaVersion: 12,
    sheetType: "character",
    firestoreDocumentId:
      "saved-character-17",
    docId: "saved-character-17",
    ownerUid: "owner-1",
    roomCode: "TEST",
    createdAt: {
      seconds: 40
    },
    creator: {
      uid: "creator-1",
      permanentNote:
        "Never discard this.",
      futureCreatorField:
        "preserve creator metadata"
    },
    builder: {
      status: "finalized",
      finalizedAtMillis: 900,
      lastSavedAtMillis: 1000,
      futureBuilderField:
        "preserve builder metadata"
    },
    identity: {
      name: "Persistence Hero"
    },
    combat: {
      maxHp: 48,
      currentHp: 40,
      temporaryHp: 3,
      inspiration: false,
      conditions: [],
      futureDefense: {
        ward: 5
      }
    },
    magic: {
      spellSlots: {
        "1": {
          maximum: 4,
          used: 0
        }
      }
    },
    classMechanics: {
      resources: [
        {
          id: "arcane-recovery",
          maximumUses: 1,
          currentUses: 1,
          futureResourceField:
            "preserve resource metadata"
        }
      ]
    },
    futureTopLevel: {
      enabled: true
    },
    updatedAtMillis: 1000,
    ...overrides
  };
}

test(
  "gameplay persistence updates the original ID without duplicates and reloads every change",
  async () => {
    const characterId =
      "saved-character-17";
    const remoteRecord =
      makeSavedCharacter();
    const nextRecord =
      clone(remoteRecord);

    delete nextRecord
      .futureTopLevel;
    delete nextRecord.combat
      .futureDefense;
    delete nextRecord.creator
      .futureCreatorField;
    delete nextRecord.classMechanics
      .resources[0]
      .futureResourceField;
    nextRecord.schemaVersion = 13;
    nextRecord.builder.status =
      "draft";
    nextRecord.builder
      .finalizedAtMillis = null;

    ensureGameplayState(nextRecord);
    applyGameplayAction(
      nextRecord,
      {
        type: "damage",
        amount: 8
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type: "set-temp-hp",
        amount: 7
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type:
          "toggle-inspiration"
      }
    );
    applyGameplayAction(
      nextRecord,
      {
        type:
          "toggle-condition",
        condition: "Blinded"
      }
    );
    nextRecord.magic
      .spellSlots["1"].used = 2;
    nextRecord.classMechanics
      .resources[0]
      .currentUses = 0;

    const store =
      new Map([
        [
          characterId,
          clone(remoteRecord)
        ]
      ]);
    let updateCalls = 0;
    let addCalls = 0;
    const result =
      await persistExistingGameplayCharacter({
        updateDoc:
          async (
            documentRef,
            payload
          ) => {
            updateCalls += 1;
            store.set(
              documentRef.id,
              clone(payload)
            );
          },
        documentRef: {
          id: characterId
        },
        remoteRecord:
          store.get(characterId),
        nextRecord,
        characterId,
        roomCode: "TEST",
        actorUid: "owner-1",
        roomDmUid: "dm-1",
        expectedRevisionMillis:
          1000,
        savedAtMillis: 2000,
        timestamp: {
          serverTimestamp: true
        }
      });

    assert.equal(
      result.writeMethod,
      "updateDoc"
    );
    assert.equal(updateCalls, 1);
    assert.equal(addCalls, 0);
    assert.equal(store.size, 1);

    const reloaded =
      clone(store.get(characterId));

    assert.deepEqual(
      {
        currentHp:
          reloaded.combat
            .currentHp,
        temporaryHp:
          reloaded.combat
            .temporaryHp,
        inspiration:
          reloaded.combat
            .inspiration,
        conditions:
          reloaded.combat
            .conditions,
        slots:
          reloaded.magic
            .spellSlots["1"].used,
        resource:
          reloaded.classMechanics
            .resources[0]
            .currentUses
      },
      {
        currentHp: 35,
        temporaryHp: 7,
        inspiration: true,
        conditions: ["Blinded"],
        slots: 2,
        resource: 0
      }
    );
    assert.equal(
      reloaded.builder.status,
      "finalized"
    );
    assert.equal(
      reloaded.builder
        .finalizedAtMillis,
      900
    );
    assert.equal(
      reloaded.ownerUid,
      "owner-1"
    );
    assert.equal(
      reloaded.roomCode,
      "TEST"
    );
    assert.deepEqual(
      reloaded.createdAt,
      remoteRecord.createdAt
    );
    assert.equal(
      reloaded.creator
        .futureCreatorField,
      "preserve creator metadata"
    );
    assert.equal(
      reloaded.combat
        .futureDefense.ward,
      5
    );
    assert.equal(
      reloaded.classMechanics
        .resources[0]
        .futureResourceField,
      "preserve resource metadata"
    );
    assert.equal(
      reloaded.futureTopLevel
        .enabled,
      true
    );
    assert.equal(
      reloaded.schemaVersion,
      13
    );
    assert.equal(
      reloaded.builder
        .lastSavedAtMillis,
      2000
    );
  }
);

test(
  "stale and unauthorized saves fail while a DM preserves or repairs ownership",
  async () => {
    const record =
      makeSavedCharacter({
        updatedAtMillis: 2000,
        builder: {
          status: "finalized",
          finalizedAtMillis: 900,
          lastSavedAtMillis: 2000
        }
      });
    let updateCalls = 0;
    const updateDoc =
      async () => {
        updateCalls += 1;
      };
    const baseOptions = {
      updateDoc,
      documentRef: {
        id:
          "saved-character-17"
      },
      remoteRecord: record,
      nextRecord: clone(record),
      characterId:
        "saved-character-17",
      roomCode: "TEST",
      roomDmUid: "dm-1",
      savedAtMillis: 3000,
      timestamp: {}
    };

    await assert.rejects(
      persistExistingGameplayCharacter({
        ...baseOptions,
        actorUid: "owner-1",
        expectedRevisionMillis:
          1000
      }),
      /newer version/i
    );
    await assert.rejects(
      persistExistingGameplayCharacter({
        ...baseOptions,
        actorUid:
          "different-player",
        expectedRevisionMillis:
          2000
      }),
      /owner or the room DM/i
    );
    assert.equal(updateCalls, 0);

    let dmPayload = null;
    await persistExistingGameplayCharacter({
      ...baseOptions,
      updateDoc:
        async (
          _documentRef,
          payload
        ) => {
          dmPayload = payload;
        },
      actorUid: "dm-1",
      expectedRevisionMillis:
        2000
    });
    assert.equal(
      dmPayload.ownerUid,
      "owner-1"
    );

    let repairedPayload = null;
    const legacyRecord = {
      ...record,
      ownerUid: ""
    };
    await persistExistingGameplayCharacter({
      ...baseOptions,
      updateDoc:
        async (
          _documentRef,
          payload
        ) => {
          repairedPayload =
            payload;
        },
      remoteRecord:
        legacyRecord,
      nextRecord:
        clone(legacyRecord),
      actorUid: "dm-1",
      expectedRevisionMillis:
        2000
    });
    assert.equal(
      repairedPayload.ownerUid,
      "dm-1"
    );
  }
);

test(
  "viewing schema-12 data is read-only and intentional save upgrades it safely",
  async () => {
    const remoteRecord =
      makeSavedCharacter({
        schemaVersion: 12,
        combat: undefined
      });
    let updateCalls = 0;
    const viewedCharacter =
      clone(remoteRecord);

    ensureGameplayState(
      viewedCharacter
    );
    assert.equal(updateCalls, 0);
    assert.equal(
      viewedCharacter.combat
        .currentHp,
      1
    );
    assert.deepEqual(
      viewedCharacter.combat
        .conditions,
      []
    );

    viewedCharacter.schemaVersion =
      13;
    applyGameplayAction(
      viewedCharacter,
      {
        type: "set-temp-hp",
        amount: 4
      }
    );
    let savedPayload = null;

    await persistExistingGameplayCharacter({
      updateDoc:
        async (
          _documentRef,
          payload
        ) => {
          updateCalls += 1;
          savedPayload = payload;
        },
      documentRef: {
        id:
          "saved-character-17"
      },
      remoteRecord,
      nextRecord:
        viewedCharacter,
      characterId:
        "saved-character-17",
      roomCode: "TEST",
      actorUid: "owner-1",
      roomDmUid: "dm-1",
      expectedRevisionMillis:
        1000,
      savedAtMillis: 1200,
      timestamp: {}
    });

    assert.equal(updateCalls, 1);
    assert.equal(
      savedPayload.schemaVersion,
      13
    );
    assert.equal(
      savedPayload.combat
        .temporaryHp,
      4
    );
    assert.equal(
      savedPayload.creator
        .permanentNote,
      "Never discard this."
    );
    assert.equal(
      savedPayload.builder.status,
      "finalized"
    );
  }
);
