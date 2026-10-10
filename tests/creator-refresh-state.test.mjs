import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  creatorSaveRefreshMessage,
  retainAcknowledgedCreatorRecord
} from "../shared/creatorRefreshState.js";

test("an acknowledged creator save remains available when list refresh fails", () => {
  const previous = [
    { id: "one", name: "Old One" },
    { id: "two", name: "Two" }
  ];
  const saved = { id: "one", name: "Updated One" };

  const retained = retainAcknowledgedCreatorRecord(previous, saved);

  assert.deepEqual(retained, [saved, previous[1]]);
  assert.match(
    creatorSaveRefreshMessage(saved.name, new Error("offline")),
    /was saved[\s\S]*could not refresh[\s\S]*Refresh to retry/
  );
});

test("every personal creator preserves acknowledged saves across refresh errors", () => {
  for (const path of [
    "../items/magicItemCreator.js",
    "../spells/spellCreator.js",
    "../npcs/npcCreator.js",
    "../encounters/encounterCreator.js",
    "../summons/summonCreator.js"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /(?:retainAcknowledgedCreatorRecord\(records, saved\)|libraryPager\.retain\(saved\)\.records)/, path);
    assert.match(source, /creatorSaveRefreshMessage\(saved\.name,/, path);
  }
});
