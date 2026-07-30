import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteSelectedRoomClass,
  getClassTemplateMovementBonus,
  readCustomClassMovementEffects
} from "../characterCreator/customClassTools.js";

test(
  "custom class movement bonuses store only nonzero whole-number effects",
  () => {
    const values = {
      ccCustomClassWalkBonus: "10.4",
      ccCustomClassClimbBonus: "",
      ccCustomClassSwimBonus: "20",
      ccCustomClassFlyBonus:
        "30000000000000000000",
      ccCustomClassBurrowBonus: "-2"
    };
    const effects =
      readCustomClassMovementEffects(
        (id) => ({
          value: values[id]
        })
      );

    assert.deepEqual(
      effects,
      [
        {
          type: "speedBonus",
          movement: "walk",
          value: 10
        },
        {
          type: "speedBonus",
          movement: "swim",
          value: 20
        },
        {
          type: "speedBonus",
          movement: "fly",
          value: 100
        }
      ]
    );
    assert.equal(
      getClassTemplateMovementBonus(
        {
          effects
        },
        "swim"
      ),
      20
    );
    assert.equal(
      getClassTemplateMovementBonus(
        {},
        "walk"
      ),
      0
    );
  }
);

test(
  "room class deletion targets only the selected exact Firestore document",
  async () => {
    const deleted = [];
    const deps = {
      db: {},
      doc(
        _db,
        ...segments
      ) {
        return segments.join("/");
      },
      async deleteDoc(reference) {
        deleted.push(reference);
      }
    };
    const cache = [
      {
        docId: "target-doc",
        name: "Target Class"
      },
      {
        docId: "sabber-doc",
        name: "Sabber"
      }
    ];
    const result =
      await deleteSelectedRoomClass({
        deps,
        isDm: true,
        roomCode: "ROOM",
        collectionName: "classes",
        documentId:
          "target-doc",
        selectedDocumentId:
          "target-doc",
        roomClassCache: cache,
        confirmDelete: (message) => {
          assert.match(
            message,
            /"Target Class"/
          );
          return true;
        }
      });

    assert.deepEqual(
      deleted,
      [
        "rooms/ROOM/classes/target-doc"
      ]
    );
    assert.deepEqual(
      result.cache.map(
        (entry) => entry.name
      ),
      ["Sabber"]
    );
  }
);

test(
  "room class deletion refuses a non-DM or a different selected document",
  async () => {
    const common = {
      deps: {},
      roomCode: "ROOM",
      collectionName: "classes",
      documentId: "one",
      selectedDocumentId: "two",
      roomClassCache: [
        {
          docId: "one",
          name: "One"
        }
      ],
      confirmDelete: () => true
    };

    await assert.rejects(
      deleteSelectedRoomClass({
        ...common,
        isDm: false
      }),
      /Only the room DM/
    );
    await assert.rejects(
      deleteSelectedRoomClass({
        ...common,
        isDm: true
      }),
      /Select the exact/
    );
  }
);
