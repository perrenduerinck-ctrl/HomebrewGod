import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCharacterReviewServices,
  createCreatorSharedServices,
  createStepWarningCollector
} from "../characterCreator/stepServices.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const stepsDirectory = path.join(
  root,
  "characterCreator",
  "steps"
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

test("shared creator services expose a stable, immutable boundary", () => {
  const services = createCreatorSharedServices({
    cleanString: String,
    getCreatorState: () => ({}),
    unrelatedInternal: true
  });

  assert.equal(services.cleanString, String);
  assert.equal(typeof services.getCreatorState, "function");
  assert.equal("unrelatedInternal" in services, false);
  assert.equal(Object.isFrozen(services), true);
});

test("step warning collection routes validation without sharing step objects", () => {
  const calls = [];
  const getWarnings = createStepWarningCollector({
    abilities: (character) => {
      calls.push(["abilities", character]);
      return ["Choose ability scores."];
    },
    species: () => ["Choose a species."],
    ignored: null
  });
  const character = { id: "hero" };

  assert.deepEqual(
    getWarnings(["abilities"], character),
    ["Choose ability scores."]
  );
  assert.deepEqual(calls, [["abilities", character]]);
  assert.deepEqual(
    getWarnings(["species"], character),
    ["Choose a species."]
  );
});

test("Review receives facades instead of creator subsystem objects", () => {
  const creator = read("characterCreator.js");
  const review = read(
    "characterCreator/steps/reviewStep.js"
  );
  const reviewCall = creator.match(
    /const reviewStep = createReviewStep\(\{([\s\S]*?)\n\s*\}\);/
  );

  assert.ok(reviewCall, "Review factory call is present");
  assert.match(reviewCall[1], /sharedServices:\s*sharedStepServices/);
  assert.match(reviewCall[1], /\breviewServices\b/);
  assert.doesNotMatch(
    reviewCall[1],
    /\b(?:abilities|background|class|equipment|skills|species|spells)Step\b/
  );
  assert.doesNotMatch(
    review,
    /\b(?:abilities|background|class|equipment|skills|species|spells)Step\b/
  );
  assert.match(review, /dependencies\.sharedServices/);
  assert.match(review, /dependencies\.reviewServices/);
  assert.equal(
    Object.isFrozen(
      createCharacterReviewServices({ ready: true })
    ),
    true
  );
});

test("every creator step uses shared services and never imports another step", () => {
  const stepFiles = fs.readdirSync(stepsDirectory)
    .filter((fileName) => fileName.endsWith("Step.js"));
  const creator = read("characterCreator.js");

  stepFiles.forEach((fileName) => {
    const source = read(
      path.join("characterCreator", "steps", fileName)
    );

    assert.match(
      source,
      /dependencies\.sharedServices\s*\|\|\s*dependencies/,
      `${fileName} must consume the shared infrastructure facade`
    );
    assert.doesNotMatch(
      source,
      /from\s+["']\.\/(?:[A-Za-z]+Step)\.js/,
      `${fileName} must not import a sibling step`
    );
  });

  const sharedServiceUses = creator.match(
    /sharedServices:\s*sharedStepServices/g
  ) || [];

  assert.equal(sharedServiceUses.length, stepFiles.length);

  const priorityNineStepUrls = creator.match(
    /characterCreator\/steps\/[A-Za-z]+Step\.js\?v=priority9-20260822/g
  ) || [];

  assert.equal(
    priorityNineStepUrls.length,
    stepFiles.length,
    "every changed step module must use the Priority 9 cache key"
  );
});

test("character creator modules have no circular relative imports", () => {
  const moduleRoot = path.join(root, "characterCreator");
  const files = [];

  function visitDirectory(directory) {
    fs.readdirSync(directory, { withFileTypes: true })
      .forEach((entry) => {
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          visitDirectory(absolutePath);
        } else if (entry.name.endsWith(".js")) {
          files.push(absolutePath);
        }
      });
  }

  visitDirectory(moduleRoot);

  const fileSet = new Set(files.map((file) => path.normalize(file)));
  const graph = new Map();

  files.forEach((file) => {
    const imports = [];
    const source = fs.readFileSync(file, "utf8");
    const matcher = /from\s+["'](\.[^"']+)["']/g;
    let match;

    while ((match = matcher.exec(source))) {
      const withoutQuery = match[1].split("?")[0];
      const resolved = path.normalize(
        path.resolve(path.dirname(file), withoutQuery)
      );

      if (fileSet.has(resolved)) {
        imports.push(resolved);
      }
    }

    graph.set(path.normalize(file), imports);
  });

  const visiting = new Set();
  const visited = new Set();

  function visit(file, trail = []) {
    if (visiting.has(file)) {
      assert.fail(
        `Circular creator import: ${[...trail, file]
          .map((item) => path.relative(root, item))
          .join(" -> ")}`
      );
    }

    if (visited.has(file)) {
      return;
    }

    visiting.add(file);
    (graph.get(file) || []).forEach((dependency) => {
      visit(dependency, [...trail, file]);
    });
    visiting.delete(file);
    visited.add(file);
  }

  files.forEach((file) => visit(path.normalize(file)));
});
