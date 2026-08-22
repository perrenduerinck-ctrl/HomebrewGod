import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCatalogPage,
  CREATOR_CATALOG_BATCH_SIZE
} from "../characterCreator/catalogPagination.js";
import {
  DEFAULT_CLASSES
} from "../data/defaultClasses.js";
import {
  DEFAULT_SUBCLASSES
} from "../data/defaultSubclasses.js";

const testDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);
const rootDirectory = path.join(
  testDirectory,
  ".."
);

function readSource(relativePath) {
  return fs.readFileSync(
    path.join(rootDirectory, relativePath),
    "utf8"
  );
}

test("large creator catalogs filter before returning one 25-entry page", () => {
  const entries = Array.from(
    { length: 101 },
    (_, index) => ({
      id: `entry-${index + 1}`,
      name:
        index >= 90
          ? `Rare Match ${index + 1}`
          : `Ordinary Entry ${index + 1}`
    })
  );
  const initialPage = createCatalogPage(
    entries,
    {
      getSearchText: (entry) => entry.name
    }
  );

  assert.equal(CREATOR_CATALOG_BATCH_SIZE, 25);
  assert.equal(initialPage.entries.length, 25);
  assert.equal(initialPage.total, 101);
  assert.equal(initialPage.hasMore, true);

  const filteredPage = createCatalogPage(
    entries,
    {
      query: "rare match",
      getSearchText: (entry) => entry.name
    }
  );

  assert.equal(filteredPage.total, 11);
  assert.equal(filteredPage.entries.length, 11);
  assert.equal(filteredPage.hasMore, false);
  assert.ok(
    filteredPage.entries.every((entry) => {
      return entry.name.includes("Rare Match");
    })
  );
});

test("Load More expands a catalog in bounded batches and keeps selected matches visible", () => {
  const entries = Array.from(
    { length: 80 },
    (_, index) => ({
      id: `entry-${index + 1}`,
      name: `Entry ${index + 1}`
    })
  );
  const page = createCatalogPage(entries, {
    visibleLimit: 50,
    pinnedIds: ["entry-80"],
    getSearchText: (entry) => entry.name
  });

  assert.equal(page.entries.length, 50);
  assert.equal(page.entries[0].id, "entry-80");
  assert.equal(page.hasMore, true);
});

test("every large Character Creator picker uses bounded catalog results", () => {
  const creatorSource = readSource(
    "characterCreator/index.js"
  );
  const equipmentSource = readSource(
    "characterCreator/steps/equipmentStep.js"
  );
  const featsSource = readSource(
    "characterCreator/steps/featsStep.js"
  );
  const spellsSource = readSource(
    "characterCreator/steps/spellsStep.js"
  );
  const spellPickerSource = readSource(
    "characterCreator/spellPicker.js"
  );
  const uiSource = readSource(
    "characterCreator/uiEnhancements.js"
  );

  assert.match(
    creatorSource,
    /function getSection15CatalogPage[\s\S]*createCatalogPage/
  );
  assert.match(
    creatorSource,
    /function getSection16FeatPickerPage[\s\S]*createCatalogPage/
  );
  assert.match(
    equipmentSource,
    /data-cc-action="show-more-equipment"/
  );
  assert.match(
    featsSource,
    /data-cc-action="show-more-asi-feats"/
  );
  assert.doesNotMatch(
    featsSource,
    /\$\{DEFAULT_FEATS[\s\S]{0,120}\.map\(/
  );
  assert.match(
    spellsSource,
    /data-cc-action="show-more-default-feats"/
  );
  assert.match(
    spellPickerSource,
    /CREATOR_SPELL_BATCH_SIZE = 25/
  );
  assert.match(
    uiSource,
    /grid\.matches\(\s*"\[data-cc-default-feat-results\]"/
  );
});

test("built-in class and subclass choices stay below the large-catalog threshold", () => {
  const classCount = Object.keys(
    DEFAULT_CLASSES
  ).length;
  const subclassesPerClass =
    DEFAULT_SUBCLASSES.reduce(
      (counts, subclass) => {
        counts.set(
          subclass.classId,
          (counts.get(subclass.classId) || 0) + 1
        );
        return counts;
      },
      new Map()
    );
  const largestSubclassList = Math.max(
    0,
    ...subclassesPerClass.values()
  );

  assert.ok(classCount <= CREATOR_CATALOG_BATCH_SIZE);
  assert.ok(
    largestSubclassList <= CREATOR_CATALOG_BATCH_SIZE
  );
});

console.log(
  "Character Creator catalog pagination contracts passed."
);
