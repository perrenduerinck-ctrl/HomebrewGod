import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function getFunctionSource(
  source,
  name,
  nextName
) {
  const start = source.indexOf(
    `function ${name}(`
  );
  const end = source.indexOf(
    `function ${nextName}(`,
    start + 1
  );

  assert.notEqual(
    start,
    -1,
    `${name} should exist`
  );
  assert.notEqual(
    end,
    -1,
    `${nextName} should follow ${name}`
  );

  return source.slice(start, end);
}

const creatorSource = readSource(
  "characterCreator.fixed.js"
);
const uiSource = readSource(
  "characterCreator/uiEnhancements.js"
);
const featsSource = readSource(
  "characterCreator/steps/featsStep.js"
);
const persistenceSource = readSource(
  "characterCreator/persistence.base.js"
);

assert.match(
  creatorSource,
  /const CREATOR_INPUT_DEBOUNCE_MS = 250;/,
  "expensive creator input processing should wait 250 ms"
);
assert.match(
  creatorSource,
  /const DRAFT_AUTOSAVE_DEBOUNCE_MS = 300;/,
  "draft autosaves should wait 300 ms"
);

const inputHandlerSource = getFunctionSource(
  creatorSource,
  "handleWizardInput",
  "handleWizardChange"
);

assert.match(
  inputHandlerSource,
  /scheduleCreatorInputProcessing\(\s*`ability:/,
  "manual ability typing should schedule one recalculation"
);
assert.match(
  inputHandlerSource,
  /scheduleCreatorInputProcessing\(\s*"character-level"/,
  "level typing should schedule one progression recalculation"
);

const draftSchedulerSource =
  getFunctionSource(
    creatorSource,
    "scheduleDraftPersistence",
    "handleDraftBeforeUnload"
  );

assert.match(
  draftSchedulerSource,
  /clearTimeout[\s\S]*setTimeout/,
  "draft autosaves should replace a pending timer"
);
assert.doesNotMatch(
  draftSchedulerSource,
  /updateDoc|addDoc|setDoc/,
  "draft typing must not call Firestore"
);
assert.match(
  persistenceSource,
  /saveSection18Character[\s\S]*(?:updateDoc|addDoc)/,
  "Firestore writes should remain in the explicit character save path"
);

assert.match(
  featsSource,
  /CREATOR_FEAT_SEARCH_DEBOUNCE_MS = 250/,
  "feat searching should use the shared performance delay"
);
assert.match(
  featsSource,
  /setTimeout\([\s\S]*CREATOR_FEAT_SEARCH_DEBOUNCE_MS/,
  "feat cards should be filtered after typing pauses"
);
assert.match(
  uiSource,
  /UI_FILTER_DEBOUNCE_MS = 250/,
  "enhancement filters should use a 250 ms delay"
);
assert.doesNotMatch(
  uiSource,
  /queueMicrotask\(\(\) => \{[\s\S]*filterSpellViewer[\s\S]*filterClassGrid[\s\S]*filterFeatPanel/,
  "one unrelated input must not refilter every large picker"
);

console.log(
  "Character Creator debounce contracts passed."
);
