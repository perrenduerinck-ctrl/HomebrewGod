import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import path from "node:path";

const root =
  path.resolve(
    import.meta.dirname,
    ".."
  );

async function read(relativePath) {
  return readFile(
    path.join(
      root,
      relativePath
    ),
    "utf8"
  );
}

test(
  "package scripts expose every release gate",
  async () => {
    const packageJson =
      JSON.parse(
        await read(
          "package.json"
        )
      );
    const requiredScripts = [
      "audit:phases",
      "check:syntax",
      "check:imports",
      "validate:data",
      "test:unit",
      "test:browser",
      "test:deployed",
      "test:ci",
      "build:pages"
    ];

    requiredScripts.forEach(
      (scriptName) => {
        assert.equal(
          typeof packageJson
            .scripts[scriptName],
          "string",
          scriptName
        );
      }
    );
  }
);

test(
  "GitHub Actions tests every push before deploying Pages",
  async () => {
    const workflow =
      await read(
        ".github/workflows/release-readiness.yml"
      );

    assert.match(
      workflow,
      /\bpush:/
    );
    assert.match(
      workflow,
      /needs:\s*test/
    );
    assert.match(
      workflow,
      /npm run test:ci/
    );
    assert.match(
      workflow,
      /npm run test:deployed/
    );
    assert.match(
      workflow,
      /actions\/deploy-pages@/
    );
  }
);

test(
  "release gates cover missing imports, placeholders, and unsupported effects",
  async () => {
    const importCheck =
      await read(
        "scripts/check-imports.mjs"
      );
    const dataCheck =
      await read(
        "scripts/validate-data.mjs"
      );

    assert.match(
      importCheck,
      /references missing file/
    );
    assert.match(
      dataCheck,
      /placeholderPattern/
    );
    assert.match(
      dataCheck,
      /unsupported type/
    );
  }
);

test(
  "the Phase 20 release marker is wired through the application",
  async () => {
    const index =
      await read("index.html");
    const smoke =
      await read(
        "ai-testing/app-smoke-test.html"
      );

    assert.match(
      index,
      /phase20-20260727/
    );
    assert.match(
      smoke,
      /phase20-20260727/
    );
  }
);

test(
  "character choice cards keep their natural height",
  async () => {
    const creator =
      await read(
        "characterCreator.fixed.js"
      );

    assert.match(
      creator,
      /\.hg-character-choice-grid\s*\{[^}]*align-items:\s*start;/s
    );
    assert.match(
      creator,
      /\.hg-character-choice-card\s*\{[^}]*align-self:\s*start;/s
    );
  }
);

test(
  "multiclass details preserve explicit class ownership",
  async () => {
    const creator =
      await read(
        "characterCreator.fixed.js"
      );

    assert.match(
      creator,
      /data-class-profile-entry-id=/
    );
    assert.match(
      creator,
      /data-class-feature-group-entry-id=/
    );
    assert.match(
      creator,
      /data-feature-card-class-id=/
    );
    assert.match(
      creator,
      /Only .* class and subclass features are shown in this group\./
    );
  }
);

test(
  "existing gameplay saves use guarded update-only persistence",
  async () => {
    const creatorPersistence =
      await read(
        "characterCreator/persistenceGuard.js"
      );
    const gameplayPersistence =
      await read(
        "characterSheet/persistence.js"
      );
    const index =
      await read("index.html");

    assert.match(
      creatorPersistence,
      /mergeCharacterRecordPreservingUnknownFields/
    );
    assert.match(
      creatorPersistence,
      /persistence\.base\.js/
    );
    assert.match(
      gameplayPersistence,
      /assertCharacterMutationAccess/
    );
    assert.match(
      gameplayPersistence,
      /assertNoStaleRevision/
    );
    assert.match(
      gameplayPersistence,
      /await updateDoc/
    );
    assert.doesNotMatch(
      gameplayPersistence,
      /\baddDoc\b/
    );
    assert.match(
      index,
      /"\.\/characterCreator\/persistence\.js":\s*"\.\/characterCreator\/(?:persistence|persistenceGuard)\.js\?v=/
    );
  }
);

test(
  "character walking speed is guarded at input, load, and save boundaries",
  async () => {
    const walkingSpeed =
      await read(
        "characterCreator/walkingSpeed.js"
      );
    const persistenceGuard =
      await read(
        "characterCreator/persistenceGuard.js"
      );
    const packageJson =
      JSON.parse(
        await read("package.json")
      );

    assert.match(
      walkingSpeed,
      /MINIMUM_WALKING_SPEED\s*=\s*\n?\s*0/
    );
    assert.match(
      walkingSpeed,
      /MAXIMUM_WALKING_SPEED\s*=\s*\n?\s*100/
    );
    assert.match(
      walkingSpeed,
      /DEFAULT_WALKING_SPEED\s*=\s*\n?\s*30/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"min"/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"max"/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"step"/
    );
    assert.match(
      persistenceGuard,
      /guardCharacterDraftWalkingSpeed/
    );
    assert.match(
      persistenceGuard,
      /normalizeCharacterWalkingSpeed/
    );
    assert.match(
      packageJson.scripts[
        "test:browser"
      ],
      /walking-speed\.spec\.mjs/
    );
    assert.match(
      packageJson.scripts[
        "test:deployed"
      ],
      /walking-speed\.spec\.mjs/
    );
  }
);
