import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteSelectedRoomClass,
  getClassTemplateMovementSpeed,
  readCustomClassMovementEffects,
  renderCustomClassMovementFields
} from "../characterCreator/customClassTools.js";

test(
  "custom classes store actual movement speeds as whole-number effects",
  () => {
    const values = {
      ccCustomClassWalkSpeed: "30.4",
      ccCustomClassClimbSpeed: "",
      ccCustomClassSwimSpeed: "20",
      ccCustomClassFlySpeed:
        "30000000000000000000",
      ccCustomClassBurrowSpeed: "-2"
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
          mode: "replace",
          movement: "walk",
          value: 30
        },
        {
          type: "speedBonus",
          mode: "replace",
          movement: "swim",
          value: 20
        },
        {
          type: "speedBonus",
          mode: "replace",
          movement: "fly",
          value: 100
        }
      ]
    );
    assert.equal(
      getClassTemplateMovementSpeed(
        {
          effects
        },
        "swim"
      ),
      20
    );
    assert.equal(
      getClassTemplateMovementSpeed(
        {},
        "walk"
      ),
      30
    );
  }
);

test(
  "custom class movement fields use speed labels without bonus wording",
  () => {
    const rendered =
      renderCustomClassMovementFields({
        template: {},
        wizardField(
          label,
          id,
          value
        ) {
          return `${label}|${id}|${value}\n`;
        }
      });

    assert.match(
      rendered,
      /Walking Speed\|ccCustomClassWalkSpeed\|30/
    );
    assert.match(
      rendered,
      /Climbing Speed\|ccCustomClassClimbSpeed\|0/
    );
    assert.match(
      rendered,
      /Swimming Speed\|ccCustomClassSwimSpeed\|0/
    );
    assert.match(
      rendered,
      /Flying Speed\|ccCustomClassFlySpeed\|0/
    );
    assert.match(
      rendered,
      /Burrowing Speed\|ccCustomClassBurrowSpeed\|0/
    );
    assert.doesNotMatch(
      rendered,
      /Bonus/
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
