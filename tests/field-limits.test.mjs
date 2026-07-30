import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCharacterImportSize,
  assertCharacterSerializedSize,
  CHARACTER_FIELD_LIMITS,
  countUnicodeCharacters,
  getCharacterFieldLimit,
  normalizeCharacterTextFields,
  truncateUnicode
} from "../characterCreator/fieldLimits.js";

test(
  "character field limits use the requested central categories",
  () => {
    assert.equal(
      getCharacterFieldLimit({
        path: "identity.name"
      }),
      CHARACTER_FIELD_LIMITS.name
    );
    assert.equal(
      getCharacterFieldLimit({
        path:
          "background.backstory",
        type: "textarea"
      }),
      CHARACTER_FIELD_LIMITS.backstory
    );
    assert.equal(
      getCharacterFieldLimit({
        path:
          "magic.customSpells.0.description",
        type: "textarea"
      }),
      CHARACTER_FIELD_LIMITS.spellDescription
    );
  }
);

test(
  "Unicode truncation never splits a surrogate pair",
  () => {
    const value = "A🧙B";
    const truncated =
      truncateUnicode(value, 2);

    assert.equal(truncated, "A🧙");
    assert.equal(
      countUnicodeCharacters(
        truncated
      ),
      2
    );
  }
);

test(
  "normalization limits content but leaves IDs and security metadata unchanged",
  () => {
    const longName = "N".repeat(150);
    const longId = "i".repeat(300);
    const character = {
      id: longId,
      ownerUid: longId,
      identity: {
        name: longName
      },
      background: {
        backstory:
          "B".repeat(12000)
      },
      customUnknown: {
        description:
          "D".repeat(7000)
      }
    };

    normalizeCharacterTextFields(
      character
    );

    assert.equal(
      character.identity.name
        .length,
      100
    );
    assert.equal(
      character.background
        .backstory.length,
      10000
    );
    assert.equal(
      character.id,
      longId
    );
    assert.equal(
      character.ownerUid,
      longId
    );
    assert.ok(
      character.customUnknown
        .description.length <=
      2000
    );
  }
);

test(
  "oversized imports and save payloads are rejected before persistence",
  () => {
    assert.throws(
      () => {
        assertCharacterImportSize(
          3 * 1024 * 1024
        );
      },
      /too large/i
    );
    assert.throws(
      () => {
        assertCharacterSerializedSize({
          notes:
            "x".repeat(910000)
        });
      },
      /too large/i
    );
  }
);
