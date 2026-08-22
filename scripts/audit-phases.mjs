import {
  access,
  readFile
} from "node:fs/promises";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  ".."
);
const phaseEvidence = [
  [
    1,
    [
      "app.js",
      "characterSheet/index.js",
      "tests/browser-pages/app-smoke-test.html",
      "tests/browser-pages/character-creator-self-test.html"
    ]
  ],
  [
    2,
    [
      "docs/rules/RULESET_POLICY.md",
      "data/ruleset2014.js",
      "tests/browser-pages/ruleset-policy-test.html"
    ]
  ],
  ...Array.from(
    {
      length: 14
    },
    (_, index) => {
      const phase =
        index + 3;
      const fileNames = {
        3: "PHASE3_MULTICLASS_RULES.md",
        4: "PHASE4_MULTICLASS_HP.md",
        5: "PHASE5_MULTICLASS_SPELLCASTING.md",
        6: "PHASE6_SHARED_MULTICLASS_FEATURES.md",
        7: "PHASE7_SUBCLASS_CATALOG.md",
        8: "PHASE8_BASE_CLASS_FEATURES.md",
        9: "PHASE9_FEAT_ABILITY_SCORES.md",
        10: "PHASE10_FEAT_SPELLCASTING.md",
        11: "PHASE11_FEAT_MECHANICS.md",
        12: "PHASE12_SITUATIONAL_FEATS.md",
        13: "PHASE13_FEAT_PREREQUISITES.md",
        14: "PHASE14_SPECIES_BACKGROUNDS.md",
        15: "PHASE15_SPELL_CONTENT.md",
        16: "PHASE16_CHARACTER_SHEET.md"
      };

      return [
        phase,
        [
          `docs/development-history/${fileNames[phase]}`,
          "characterCreator/selfTests.js"
        ]
      ];
    }
  ),
  [
    17,
    [
      "docs/development-history/PHASE17_MONSTER_CREATOR.md",
      "monsters/creator.js",
      "tests/browser-pages/monster-creator-self-test.html"
    ]
  ],
  [
    18,
    [
      "docs/development-history/PHASE18_SECURITY_PERSISTENCE.md",
      "firestore.rules",
      "shared/securityPersistence.js",
      "functions/index.js",
      "tests/browser-pages/security-persistence-self-test.html"
    ]
  ],
  [
    19,
    [
      "docs/development-history/PHASE19_CHARACTER_MODULES.md",
      "characterCreator/rulesMath.js",
      "characterCreator/persistence.js",
      "characterCreator/sheetPresentation.js",
      "tests/browser-pages/character-modules-self-test.html"
    ]
  ],
  [
    20,
    [
      "docs/development-history/PHASE20_RELEASE_READINESS.md",
      "docs/development-history/PHASE_AUDIT.md",
      "package.json",
      "playwright.config.mjs",
      ".github/workflows/release-readiness.yml",
      "tests/domain.test.mjs",
      "tests/browser.spec.mjs",
      "tests/fixtures/character-fixtures.mjs"
    ]
  ]
];
const results = [];

for (
  const [phase, files] of
  phaseEvidence
) {
  const missing = [];

  for (const file of files) {
    try {
      await access(
        path.join(root, file)
      );
    } catch {
      missing.push(file);
    }
  }

  results.push({
    phase,
    passed:
      missing.length === 0,
    evidenceFiles:
      files.length,
    missing
  });
}

const creatorTests =
  await readFile(
    path.join(
      root,
      "characterCreator",
      "selfTests.js"
    ),
    "utf8"
  );

for (
  let phase = 3;
  phase <= 16;
  phase += 1
) {
  if (
    !new RegExp(
      `Phase ${phase}`,
      "i"
    ).test(creatorTests)
  ) {
    results.find(
      (entry) => {
        return entry.phase === phase;
      }
    ).missing.push(
      `Phase ${phase} named regression coverage`
    );
    results.find(
      (entry) => {
        return entry.phase === phase;
      }
    ).passed = false;
  }
}

const failures =
  results.filter(
    (entry) => {
      return !entry.passed;
    }
  );

console.log(
  JSON.stringify(
    {
      passed:
        failures.length === 0,
      phases: results
    },
    null,
    2
  )
);

if (failures.length) {
  process.exit(1);
}
