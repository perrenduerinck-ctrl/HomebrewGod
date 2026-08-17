import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);
const source = fs.readFileSync(
  path.join(
    testDirectory,
    "..",
    "characterCreator.fixed.js"
  ),
  "utf8"
);

function getFunctionSource(name, nextName) {
  const start = source.indexOf(
    `  function ${name}(`
  );
  const end = source.indexOf(
    `  function ${nextName}(`,
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

const setDraftValueSource =
  getFunctionSource(
    "setDraftValue",
    "getCharacterSnapshot"
  );

assert.match(
  setDraftValueSource,
  /syncDraftCompatibilityForPath\(path\)/,
  "ordinary field updates should synchronize only their direct compatibility aliases"
);
assert.doesNotMatch(
  setDraftValueSource,
  /applyCompatibilityAliases/,
  "ordinary field updates must not run the full compatibility pipeline"
);

const chromeSource = getFunctionSource(
  "refreshBuilderChrome",
  "renderMissingStep"
);

assert.doesNotMatch(
  chromeSource,
  /innerHTML|renderStepRail\(/,
  "lightweight chrome updates must not rebuild the full step rail"
);
assert.match(
  chromeSource,
  /refreshStepRailState/,
  "chrome updates should refresh only requested step markers"
);

const activeStepBindings =
  source.match(
    /renderCreatorView:\s*renderCurrentStep/g
  ) || [];

assert.equal(
  activeStepBindings.length,
  11,
  "all interactive creator step modules should request active-step-only renders"
);

assert.match(
  source,
  /function refreshCreatorForSection19Cache[\s\S]*affectedSteps\.includes/,
  "room snapshots should rerender only a visible affected step"
);

console.log(
  "Character Creator rerender performance contracts passed."
);
