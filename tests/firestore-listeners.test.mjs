import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceFiles = {
  app: await readFile(
    new URL("../app.js", import.meta.url),
    "utf8"
  ),
  characterCreator: await readFile(
    new URL(
      "../characterCreator.fixed.js",
      import.meta.url
    ),
    "utf8"
  ),
  monsterCreator: await readFile(
    new URL("../monsterCreator.js", import.meta.url),
    "utf8"
  ),
  tokens: await readFile(
    new URL("../tokens.js", import.meta.url),
    "utf8"
  )
};

function count(source, pattern) {
  return source.match(pattern)?.length || 0;
}

test("every Firestore snapshot subscription uses the shared lifecycle registry", () => {
  const snapshotCallCounts = {
    app: count(
      sourceFiles.app,
      /\bonSnapshot\s*\(/g
    ),
    characterCreator: count(
      sourceFiles.characterCreator,
      /\bdeps\.onSnapshot\s*\(/g
    ),
    monsterCreator: count(
      sourceFiles.monsterCreator,
      /\bconfig\.onSnapshot\s*\(/g
    ),
    tokens: count(
      sourceFiles.tokens,
      /\bdeps\.onSnapshot\s*\(/g
    )
  };

  assert.deepEqual(snapshotCallCounts, {
    app: 5,
    characterCreator: 1,
    monsterCreator: 1,
    tokens: 1
  });

  Object.entries(sourceFiles).forEach(
    ([name, source]) => {
      assert.match(
        source,
        /createRealtimeListenerRegistry/,
        `${name} must use the listener registry`
      );
    }
  );

  assert.doesNotMatch(
    sourceFiles.app,
    /stopListeningTo(?:MyRooms|Room|Players|Maps|PuzzleTiles)/
  );
});

test("screen changes stop listeners that the destination does not need", () => {
  assert.match(
    sourceFiles.app,
    /syncRealtimeListenersForScreen\(screenName\)/
  );
  assert.match(
    sourceFiles.app,
    /stopRoomViewListeners\(\)/
  );
  assert.match(
    sourceFiles.app,
    /appRealtimeListeners\.stopAll\(\)/
  );
  assert.match(
    sourceFiles.app,
    /screenName !== "characterCreator"[\s\S]*characterCreatorSystem\.cleanupListeners\(\)/
  );
  assert.match(
    sourceFiles.app,
    /screenName !== "monsterCreator"[\s\S]*monsterCreatorSystem\.cleanupListeners\(\)/
  );
  assert.match(
    sourceFiles.app,
    /tokenSystem\.stopTokenListener\(\)/
  );
});

test("character creator subscribes only for the active library or template step", () => {
  assert.match(
    sourceFiles.characterCreator,
    /viewMode === "library"[\s\S]*requiredListeners\.add\("characters"\)/
  );
  assert.match(
    sourceFiles.characterCreator,
    /class: "classes"[\s\S]*species: "species"[\s\S]*background: "backgrounds"/
  );
  assert.match(
    sourceFiles.characterCreator,
    /\{ clearCache: false \}/
  );
  assert.match(
    sourceFiles.characterCreator,
    /!isCurrent\(\)/
  );
});

test("room-scoped listeners reject late callbacks from an old room", () => {
  [
    sourceFiles.app,
    sourceFiles.characterCreator,
    sourceFiles.monsterCreator,
    sourceFiles.tokens
  ].forEach((source) => {
    assert.match(source, /!isCurrent\(\)/);
  });

  assert.match(
    sourceFiles.app,
    /currentRoomCode !== cleanCode/
  );
  assert.match(
    sourceFiles.monsterCreator,
    /getRoomCode\(\) !== roomCode/
  );
  assert.match(
    sourceFiles.tokens,
    /tokenRoomCode !== roomCode/
  );
});
