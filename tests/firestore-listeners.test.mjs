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
      "../characterCreator.js",
      import.meta.url
    ),
    "utf8"
  ),
  realtimePersistence: await readFile(
    new URL(
      "../characterCreator/realtimePersistence.js",
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
    realtimePersistence: count(
      sourceFiles.realtimePersistence,
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
    realtimePersistence: 1,
    monsterCreator: 1,
    tokens: 1
  });

  [
    sourceFiles.app,
    sourceFiles.characterCreator,
    sourceFiles.monsterCreator,
    sourceFiles.tokens
  ].forEach((source) => {
    assert.match(
      source,
      /createRealtimeListenerRegistry/
    );
  });

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
    sourceFiles.realtimePersistence,
    /viewMode === "library"[\s\S]*new Set\(\["characters"\]\)/
  );
  assert.match(
    sourceFiles.realtimePersistence,
    /class: "classes"[\s\S]*species: "species"[\s\S]*background: "backgrounds"/
  );
  assert.match(
    sourceFiles.realtimePersistence,
    /clearCache: false/
  );
  assert.match(
    sourceFiles.realtimePersistence,
    /!isCurrent\(\)/
  );
});

test("room-scoped listeners reject late callbacks from an old room", () => {
  [
    sourceFiles.app,
    sourceFiles.realtimePersistence,
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
