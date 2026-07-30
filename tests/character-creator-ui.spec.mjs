import {
  expect,
  test
} from "@playwright/test";

test(
  "character text fields and custom class movement inputs enforce central limits",
  async ({ page }) => {
    await page.goto(
      "ai-testing/character-field-limits-self-test.html?release=creator-fix-pass-20260730",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );

    const expectations = [
      ["#testCharacterName", "100"],
      ["#testSearch", "100"],
      ["#testAppearance", "2000"],
      ["#testBackstory", "10000"],
      [
        "#testSpellDescription",
        "6000"
      ]
    ];

    for (
      const [
        selector,
        maximum
      ] of expectations
    ) {
      await expect(
        page.locator(selector)
      ).toHaveAttribute(
        "maxlength",
        maximum
      );
    }

    await expect(
      page.locator(
        "[data-character-counter-for='testAppearance']"
      )
    ).toContainText("0 / 2000");

    const flyBonus =
      page.locator(
        "#ccCustomClassFlyBonus"
      );

    await expect(flyBonus)
      .toHaveAttribute("min", "0");
    await expect(flyBonus)
      .toHaveAttribute("max", "100");
    await expect(flyBonus)
      .toHaveAttribute("step", "1");

    await flyBonus.fill(
      "30000000000000000000"
    );
    await expect(flyBonus)
      .toHaveValue("100");
    await flyBonus.press(
      "Control+A"
    );
    await flyBonus.press(
      "Backspace"
    );
    await expect(flyBonus)
      .toHaveValue("0");
  }
);

test.beforeEach(async ({ page }) => {
  await page.goto(
    "ai-testing/character-creator-ui-self-test.html?release=creator-ui-20260729",
    {
      waitUntil:
        "domcontentloaded"
    }
  );

  await expect(page.locator("body"))
    .toHaveAttribute(
      "data-test-status",
      "pass"
    );
});

test(
  "spell levels collapse independently and preserve selected spells",
  async ({ page }) => {
    const groups =
      page.locator(
        "[data-hg-spell-level]"
      );

    await expect(groups)
      .toHaveCount(10);

    const cantrips =
      groups.filter({
        hasText: "Cantrips"
      });
    const firstLevel =
      groups.filter({
        hasText:
          "1st-Level Spells"
      });

    await expect(cantrips)
      .toHaveAttribute("open", "");
    await expect(firstLevel)
      .toHaveAttribute("open", "");
    await expect(cantrips)
      .toContainText("1 selected");

    await cantrips.locator(
      ":scope > summary"
    ).click();

    await page.evaluate(() => {
      window
        .__CHARACTER_CREATOR_UI_TEST__
        .enhance();
    });

    await expect(cantrips)
      .not.toHaveAttribute("open", "");
    await expect(
      page.locator(
        '[data-spell-search-text*="fire bolt"]'
      )
    ).toHaveClass(/selected/);

    const details =
      page.getByRole("heading", {
        name: "Shield"
      }).locator("..")
        .locator(
          ".hg-compact-details"
        );

    await expect(details)
      .not.toHaveAttribute("open", "");
    await expect(details)
      .toContainText(
        "temporary bonus"
      );
  }
);

test(
  "spell search crosses every level and selected-only filtering is stable",
  async ({ page }) => {
    const search =
      page.locator(
        "#ccDefaultSpellSearch"
      );

    await search.fill(
      "Meteor Swarm"
    );

    const ninth =
      page.locator(
        '[data-hg-spell-level="9"]'
      );

    await expect(ninth)
      .toBeVisible();
    await expect(ninth)
      .toHaveAttribute("open", "");
    await expect(
      page.getByRole("heading", {
        name: "Meteor Swarm"
      })
    ).toBeVisible();

    await search.fill("");
    await page.locator(
      "[data-hg-selected-spells-only]"
    ).check();

    await expect(
      page.getByRole("heading", {
        name: "Meteor Swarm"
      }).locator("..")
    ).toBeHidden();
    await expect(
      page.locator(
        "[data-cc-default-spell-option]:visible"
      )
    ).toHaveCount(2);

    await page.evaluate(() => {
      window
        .__CHARACTER_CREATOR_UI_TEST__
        .enhance();
      window
        .__CHARACTER_CREATOR_UI_TEST__
        .enhance();
    });

    await expect(
      page.locator(
        "[data-cc-default-spell-option]"
      )
    ).toHaveCount(3);
    await expect(
      page.locator(
        "[data-hg-selected-spells-only]"
      )
    ).toHaveCount(1);
  }
);

test(
  "class and feat choices are searchable, compact, and explain state",
  async ({ page }) => {
    const classSearch =
      page.locator(
        "[data-hg-class-search]"
      );

    await classSearch.fill(
      "Wizard"
    );

    await expect(
      page.getByRole("heading", {
        name: "Wizard"
      }).locator("..")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Fighter"
      }).locator("..")
    ).toBeVisible();

    await expect(
      page.locator(
        ".hg-card-status",
        {
          hasText: "Selected"
        }
      ).first()
    ).toBeVisible();

    const featPanel =
      page.locator(
        "[data-cc-asi-feat-picker]"
      );
    const featFilter =
      featPanel.locator(
        "[data-hg-feat-filter]"
      );

    await featFilter.selectOption(
      "prerequisites"
    );
    await expect(
      featPanel.getByRole(
        "heading",
        {
          name:
            "Heavy Armor Master"
        }
      )
    ).toBeVisible();
    await expect(featPanel)
      .toContainText(
        "Prerequisite not met"
      );
    await expect(
      featPanel.getByRole(
        "heading",
        {
          name: "Alert"
        }
      ).locator("..")
    ).toBeHidden();
  }
);

test(
  "multiclass selection opens in a focused dialog and removal confirms",
  async ({ page }) => {
    const open =
      page.getByRole("button", {
        name: "Add Another Class"
      });

    await expect(open)
      .toBeVisible();
    await open.click();

    const dialog =
      page.getByRole("dialog");

    await expect(dialog)
      .toBeVisible();
    await expect(
      dialog.locator(
        "#ccMulticlassAddClass"
      )
    ).toBeVisible();

    await dialog.getByRole(
      "button",
      {
        name:
          "Close multiclass selection"
      }
    ).click();
    await expect(dialog)
      .not.toBeVisible();

    const remove =
      page.getByRole("button", {
        name: "Remove Class"
      });

    await remove.click();
    expect(
      await page.evaluate(() => {
        return window
          .__CHARACTER_CREATOR_UI_TEST__
          .removalCount();
      })
    ).toBe(0);

    await page.evaluate(() => {
      window
        .__CHARACTER_CREATOR_UI_TEST__
        .allowClassRemoval(true);
    });
    await remove.click();
    expect(
      await page.evaluate(() => {
        return window
          .__CHARACTER_CREATOR_UI_TEST__
          .removalCount();
      })
    ).toBe(1);
  }
);

test(
  "core progress and sticky actions remain usable on a smaller laptop",
  async ({ page }) => {
    await page.setViewportSize({
      width: 1024,
      height: 700
    });

    await expect(
      page.locator(
        ".hg-core-progress button"
      )
    ).toHaveCount(5);

    const next =
      page.getByRole("button", {
        name: "Continue"
      });

    await expect(next)
      .toBeDisabled();
    await expect(
      page.locator(
        "[data-hg-step-missing]"
      )
    ).toContainText(
      "Complete the required choices"
    );

    const footerPosition =
      await page.locator(
        ".hg-character-step-footer"
      ).evaluate((element) => {
        return getComputedStyle(
          element
        ).position;
      });

    expect(footerPosition)
      .toBe("sticky");

    const overflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          document.documentElement
            .clientWidth
        );
      });

    expect(overflow).toBe(false);

    await page.setViewportSize({
      width: 390,
      height: 844
    });

    const phoneOverflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          document.documentElement
            .clientWidth
        );
      });

    expect(phoneOverflow)
      .toBe(false);
  }
);
