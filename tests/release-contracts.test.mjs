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
