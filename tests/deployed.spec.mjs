import {
  expect,
  test
} from "@playwright/test";

test(
  "deployed GitHub Pages build loads every application module",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=phase20-20260727",
      {
        waitUntil:
          "domcontentloaded"
      }
    );

    await expect(
      page.locator(
        "#homebrewGodSmokeResult"
      )
    ).toContainText(
      "SMOKE TEST PASS",
      {
        timeout: 60000
      }
    );
    await expect(page.locator("html"))
      .toContainText(
        "Homebrew God"
      );
  }
);

test(
  "deployed GitHub Pages build passes the module contract suite",
  async ({ page }) => {
    await page.goto(
      "ai-testing/character-modules-self-test.html?release=phase20-20260727",
      {
        waitUntil: "commit"
      }
    );

    await expect(
      page.locator("#result")
    ).toContainText(
      "PASS — 88",
      {
        timeout: 60000
      }
    );
  }
);

const deployedSelfTests = [
  {
    name:
      "character creator",
    path:
      "ai-testing/character-creator-self-test.html?release=phase20-20260727",
    selector: "#result",
    expected: "\"total\": 456"
  },
  {
    name:
      "ruleset policy",
    path:
      "ai-testing/ruleset-policy-test.html?release=phase20-20260727",
    selector: "#result",
    expected: "\"passed\": true"
  },
  {
    name:
      "monster creator",
    path:
      "ai-testing/monster-creator-self-test.html?release=phase20-20260727",
    selector: "#testResult",
    expected: "97 Phase 20"
  },
  {
    name:
      "security and persistence",
    path:
      "ai-testing/security-persistence-self-test.html?release=phase20-20260727",
    selector: "#testResult",
    expected: "60 Phase 18"
  }
];

for (const suite of deployedSelfTests) {
  test(
    `deployed GitHub Pages build passes the ${suite.name} suite`,
    async ({ page }) => {
      await page.goto(
        suite.path,
        {
          waitUntil:
            "domcontentloaded"
        }
      );

      await expect(
        page.locator("body")
      ).toHaveAttribute(
        "data-test-status",
        "pass",
        {
          timeout: 120000
        }
      );
      await expect(
        page.locator(
          suite.selector
        )
      ).toContainText(
        suite.expected
      );
    }
  );
}
