import {
  expect,
  test
} from "@playwright/test";

test(
  "character text fields and custom class movement inputs enforce central limits",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-field-limits-self-test.html?release=custom-movement-speeds-20260731",
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

    const movementFields = [
      [
        "Walking Speed",
        "#ccCustomClassWalkSpeed",
        "30"
      ],
      [
        "Climbing Speed",
        "#ccCustomClassClimbSpeed",
        "0"
      ],
      [
        "Swimming Speed",
        "#ccCustomClassSwimSpeed",
        "0"
      ],
      [
        "Flying Speed",
        "#ccCustomClassFlySpeed",
        "0"
      ],
      [
        "Burrowing Speed",
        "#ccCustomClassBurrowSpeed",
        "0"
      ]
    ];

    for (
      const [
        label,
        selector,
        defaultValue
      ] of movementFields
    ) {
      const input =
        page.locator(selector);

      await expect(
        page.getByLabel(
          label,
          { exact: true }
        )
      ).toHaveCount(1);
      await expect(input)
        .toHaveValue(defaultValue);
      await expect(input)
        .toHaveAttribute("min", "0");
      await expect(input)
        .toHaveAttribute("max", "100");
      await expect(input)
        .toHaveAttribute("step", "1");
    }

    await expect(
      page.getByText(
        "Speed Bonus",
        { exact: false }
      )
    ).toHaveCount(0);

    const flySpeed =
      page.locator(
        "#ccCustomClassFlySpeed"
      );

    await flySpeed.fill(
      "30000000000000000000"
    );
    await expect(flySpeed)
      .toHaveValue("100");
    await flySpeed.press(
      "Control+A"
    );
    await flySpeed.press(
      "Backspace"
    );
    await expect(flySpeed)
      .toHaveValue("0");
  }
);

test.beforeEach(async ({ page }) => {
  await page.goto(
    "tests/browser-pages/character-creator-ui-self-test.html?release=creator-ui-20260729",
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
        name: "Add a Multiclass"
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
  "Character Creator wizard uses the full desktop workspace",
  async ({ page }) => {
    await page.setViewportSize({
      width: 1600,
      height: 900
    });

    await page.goto(
      "?smokeTest=1&view=characterCreator&release=character-full-width",
      {
        waitUntil: "domcontentloaded"
      }
    );

    await expect(
      page.locator("#homebrewGodSmokeResult")
    ).toContainText(
      "SMOKE TEST PASS",
      {
        timeout: 30000
      }
    );

    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen("characterCreator");
    });

    await page
      .locator('[data-cc-action="new-character"]')
      .first()
      .click();

    const root = page.locator(
      "#characterWizardRoot"
    );
    const layout = page.locator(
      ".hg-character-builder-layout"
    );

    await expect(root).toBeVisible();
    await expect(layout).toBeVisible();

    const dimensions = await page.evaluate(() => {
      const grid = document.querySelector(
        "#characterCreatorScreen .creatorFullGrid"
      ).getBoundingClientRect();
      const wizard = document.querySelector(
        "#characterWizardRoot"
      ).getBoundingClientRect();
      const builder = document.querySelector(
        ".hg-character-builder-layout"
      ).getBoundingClientRect();
      const rail = document.querySelector(
        ".hg-character-step-rail"
      ).getBoundingClientRect();
      const main = document.querySelector(
        ".hg-character-builder-main"
      ).getBoundingClientRect();

      return {
        rootRatio: wizard.width / grid.width,
        leftGap: wizard.left - grid.left,
        rightGap: grid.right - wizard.right,
        layoutRatio: builder.width / wizard.width,
        railWidth: rail.width,
        mainWidth: main.width,
        pageOverflows:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      };
    });

    expect(dimensions.rootRatio).toBeGreaterThanOrEqual(0.9);
    expect(Math.abs(dimensions.leftGap)).toBeLessThanOrEqual(2);
    expect(Math.abs(dimensions.rightGap)).toBeLessThanOrEqual(2);
    expect(dimensions.layoutRatio).toBeGreaterThanOrEqual(0.95);
    expect(dimensions.railWidth).toBeGreaterThanOrEqual(230);
    expect(dimensions.railWidth).toBeLessThanOrEqual(290);
    expect(dimensions.mainWidth).toBeGreaterThan(700);
    expect(dimensions.pageOverflows).toBe(false);
  }
);

test(
  "guided multiclass choices drive Paladin spells and remove stale class spell ownership",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&view=characterCreator&release=class-workflow-20261024",
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.locator("#homebrewGodSmokeResult"))
      .toContainText("SMOKE TEST PASS", { timeout: 30000 });
    await page.evaluate(() => {
      return window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen(
        "characterCreator"
      );
    });
    await page.locator('[data-cc-action="new-character"]')
      .first()
      .click();
    await page.evaluate(() => {
      window.__characterClassNavigationButton =
        document.querySelector(
          '.hg-core-progress [data-cc-action="go-step"][data-step-id="class"]'
        );
    });
    await page.waitForTimeout(100);
    await expect.poll(() => {
      return page.evaluate(() => {
        const current = document.querySelector(
          '.hg-core-progress [data-cc-action="go-step"][data-step-id="class"]'
        );
        return Boolean(
          current &&
          current === window.__characterClassNavigationButton &&
          current.isConnected
        );
      });
    }).toBe(true);
    await page.locator(
      '.hg-core-progress [data-cc-action="go-step"][data-step-id="class"]'
    ).click();

    await page.locator("#ccClassBuildTotalLevel").fill("3");
    await page.getByText("2. Build Type", { exact: true }).click();
    await page.getByRole("button", { name: "Multiclass", exact: true })
      .click();
    await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="fighter"]')
      .click();
    await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="paladin"]')
      .click();
    await page.locator('input[data-class-build-starting="true"][value="paladin"]')
      .check();
    await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="paladin"][data-level-delta="1"]')
      .click();
    await expect(page.locator(".hg-class-build-summary"))
      .toContainText("Fighter 1 / Paladin 2");
    await page.locator('[data-cc-action="confirm-class-build"]')
      .click();
    await expect(page.locator(".hg-class-build-summary"))
      .toContainText("Paladin 2 / Fighter 1");

    await page.locator('[data-cc-action="go-step"][data-step-id="spells"]')
      .first()
      .click();
    await page.locator("#ccDefaultSpellSearch").fill("Heroism");
    const heroism = page.locator('article[data-spell-id="heroism"]');
    await expect(heroism).toBeVisible();
    await expect(heroism.getByRole("button", { name: "Prepare Spell" }))
      .toBeVisible();
    await heroism.getByRole("button", { name: "Prepare Spell" }).click();
    await expect(heroism).toContainText("Status: Prepared");
    await page.locator('[data-cc-action="go-step"][data-step-id="review"]').first().click();
    await expect(page.locator("#characterWizardStepBody")).not.toContainText("is prepared without a matching");

    await page.locator('[data-cc-action="go-step"][data-step-id="class"]')
      .first()
      .click();
    await page.getByRole("button", { name: "Single Class", exact: true })
      .click();
    await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="fighter"]')
      .click();
    await expect(page.locator(".hg-class-build-summary"))
      .toContainText("Remove Paladin and deactivate its class-owned spells");
    await page.locator('[data-cc-action="confirm-class-build"]')
      .click();
    await page.locator('[data-cc-action="go-step"][data-step-id="spells"]')
      .first()
      .click();
    await page.locator("#ccDefaultSpellSearch").fill("Heroism");
    await page.locator("[data-cc-show-unavailable]").check();
    const removedHeroism = page.locator('article[data-spell-id="heroism"]');
    await expect(removedHeroism).toContainText("No valid spellcasting source.");
    await expect(removedHeroism).not.toHaveClass(/selected/);
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


test("unfinished choices explain what is missing and review links open the right creator field", async ({ page }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("?smokeTest=1&view=characterCreator");
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 60000 });
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
  await page.locator('[data-cc-action="new-character"]').first().click();
  const body = page.locator("#characterWizardStepBody");
  const guidance = body.locator("[data-cc-completion-guidance]");
  await expect(guidance).toContainText("Character name is missing");
  await expect(page.locator("[data-hg-step-missing]")).toContainText("Character name is missing");
  await guidance.getByRole("button", { name: /Show in Character Basics/ }).click();
  const name = body.locator('[data-draft-path="identity.name"]');
  await expect(name).toBeFocused();
  await name.fill("Mira"); await name.press("Tab");
  await expect(guidance).not.toContainText("Character name is missing");
  await expect(page.locator("[data-hg-step-missing]")).toBeHidden();
  await page.locator('.hg-character-step-button[data-step-id="review"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-hg-step-missing]")).toContainText("Still needed:");
  expect(await page.locator(".hg-character-step-footer").evaluate((footer) => footer.getBoundingClientRect().height)).toBeLessThan(422);
  await page.setViewportSize({ width: 1280, height: 720 });
  const classIssue = body.locator('[data-cc-issue]').filter({ hasText: /Show in Class/ }).first();
  await expect(classIssue).toBeVisible(); await classIssue.click();
  await expect(page.locator("#characterWizardStepTitle")).toHaveText("Class");
  await expect(guidance).toContainText("Choose a class");
  await page.locator('.hg-character-step-button[data-step-id="save"]').click();
  const speciesIssue = body.locator('[data-cc-issue]').filter({ hasText: /Show in Species/ }).first();
  await expect(speciesIssue).toBeVisible(); await speciesIssue.click();
  await expect(page.locator("#characterWizardStepTitle")).toHaveText("Species / Race");
  expect(errors).toEqual([]);
});


for (const [classId, spellId, spellName, level] of [
  ["cleric", "cure-wounds", "Cure Wounds", 1],
  ["druid", "cure-wounds", "Cure Wounds", 1],
  ["paladin", "heroism", "Heroism", 2],
  ["wizard", "magic-missile", "Magic Missile", 1]
]) {
  test(`${classId} prepared spell survives Review and Finish without a false unknown warning`, async ({ page }) => {
    await page.goto("?smokeTest=1&view=characterCreator");
    await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
    await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
    await page.locator('[data-cc-action="new-character"]').first().click();
    await page.locator('.hg-character-step-button[data-step-id="class"]').click();
    await page.locator("#ccClassBuildTotalLevel").fill(String(level));
    await page.getByText("2. Build Type", { exact: true }).click();
    await page.locator(`[data-cc-action="toggle-class-build-class"][data-class-id="${classId}"]`).click();
    await page.locator('[data-cc-action="confirm-class-build"]').click();
    await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
    await page.locator("#ccDefaultSpellSearch").fill(spellName);
    const spell = page.locator(`article[data-spell-id="${spellId}"]`);
    const choices = page.locator("[data-cc-class-spell-choices]");
    await expect(choices).toContainText(classId === "wizard" ? "Spells in spellbook:" : "Prepared choices: 0 /");
    if (classId === "wizard") {
      await expect(spell.getByRole("button", { name: "Prepare Spell", exact: true })).toBeDisabled();
      await expect(spell).toContainText("Add that spell to the spellbook before preparing it.");
      await spell.getByRole("button", { name: /Add to Spellbook/i }).click();
    }
    await spell.getByRole("button", { name: "Prepare Spell", exact: true }).click();
    await expect(spell).toContainText("Status: Prepared");
    const origin = spell.locator("[data-spell-provenance]");
    await origin.locator("summary").click();
    await expect(origin).toContainText(classId.charAt(0).toUpperCase() + classId.slice(1));
    await expect(origin).toContainText(classId === "wizard" ? "spellbook" : "prepared choice");
    await expect(choices).toContainText("Prepared choices: 1 /");
    for (const step of ["review", "save"]) {
      await page.locator(`.hg-character-step-button[data-step-id="${step}"]`).click();
      await expect(page.locator("#characterWizardStepBody")).not.toContainText("is prepared without a matching");
    }
    await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
    await page.locator("#ccDefaultSpellSearch").fill(spellName);
    await expect(spell).toContainText("Status: Prepared");
    await spell.getByRole("button", { name: /Unprepare Spell/i }).click();
    await expect(spell).not.toContainText("Status: Prepared");
    if (classId === "paladin") await expect(page.locator("#ccNewSpellKnown")).toBeDisabled();
    await expect(page.locator("#ccNewSpellPrepared")).toBeDisabled();
    const customName = "Flow Test " + classId;
    if (!(await page.locator("#ccCustomSpellsSection").evaluate(el=>el.open))) await page.locator("#ccCustomSpellsSection > summary").click();
    await page.locator("#ccNewSpellName").fill(customName);
    if (!(await page.locator("#ccCustomSpellsSection").evaluate(el=>el.open))) await page.locator("#ccCustomSpellsSection > summary").click();
    await page.locator("#ccNewSpellLevel").selectOption("1");
    const learn = page.locator("#ccNewSpellKnown");
    if (classId === "wizard") await expect(learn).toBeEnabled();
    else { await expect(learn).toBeDisabled(); await expect(learn).not.toBeChecked(); }
    await page.locator("#ccNewSpellPrepared").check();
    await page.locator('[data-cc-action="add-custom-spell"]').click();
    const custom = page.getByRole("heading", {name:customName,exact:true}).locator("..");
    await expect(custom).toContainText("Prepared");
    await expect(custom.locator("[data-spell-provenance] summary")).toHaveText("Why do I have this spell?");
    await page.locator('.hg-character-step-button[data-step-id="review"]').click();
    await expect(page.locator("#characterWizardStepBody")).not.toContainText("is prepared without a matching");
    await expect(page.locator("#characterWizardStepBody")).not.toContainText("known spells exceed the calculated limit");
  });
}


for (const [classId, spellId, spellName] of [
  ["cleric", "cure-wounds", "Cure Wounds"],
  ["warlock", "burning-hands", "Burning Hands"]
]) {
  test(`${classId} distinguishes subclass grants from additional spell choices`, async ({ page }) => {
    await page.goto("?smokeTest=1&view=characterCreator");
    await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
    await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
    await page.locator('[data-cc-action="new-character"]').first().click();
    await page.locator('.hg-character-step-button[data-step-id="class"]').click();
    await page.getByText("2. Build Type", { exact: true }).click();
    await page.locator(`[data-cc-action="toggle-class-build-class"][data-class-id="${classId}"]`).click();
    await page.locator('[data-cc-action="confirm-class-build"]').click();
    const subclass = page.locator("#ccClassSubclass-0");
    await subclass.evaluate((el) => { for (let parent = el.closest("details"); parent; parent = parent.parentElement?.closest("details")) parent.open = true; });
    const value = await subclass.evaluate((el, classId) => Array.from(el.options).find((option) => (classId === "cleric" ? /^Life(?: Domain)?$/ : /^(?:The )?Fiend$/).test(option.text.trim()))?.value, classId);
    expect(value).toBeTruthy();
    await subclass.selectOption(value);
    await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
    const choices = page.locator("[data-cc-class-spell-choices]");
    await page.locator("#ccDefaultSpellSearch").fill(spellName);
    const spell = page.locator(`article[data-spell-id="${spellId}"]`);
    if (classId === "cleric") {
      await expect(choices).toContainText("Automatically prepared from");
      await expect(choices).toContainText("Prepared choices: 0 /");
      await expect(spell).toContainText("Always Prepared");
      const origin = spell.locator("[data-spell-provenance]");
      await origin.locator("summary").click();
      await expect(origin).toContainText("Granted automatically");
      await expect(origin).toContainText("Does not use a manual class prepared choice");
      await expect(spell.getByRole("button", {name: "Prepare Spell", exact:true})).toHaveCount(0);
      await page.locator("#ccDefaultSpellSearch").fill("Healing Word");
      await page.locator('article[data-spell-id="healing-word"]').getByRole("button",{name:"Prepare Spell",exact:true}).click();
      await expect(choices).toContainText("Prepared choices: 1 / 1");
      await page.locator("#ccDefaultSpellSearch").fill("Guiding Bolt");
      const bolt = page.locator('article[data-spell-id="guiding-bolt"]');
      await expect(bolt.getByRole("button",{name:"Prepare Spell",exact:true})).toBeDisabled();
      await expect(bolt).toContainText("prepared spells are already at the calculated limit");
      await page.locator('.hg-character-step-button[data-step-id="class"]').click();
      const light = page.locator("#ccClassSubclass-0");
      await light.selectOption(await light.evaluate((el) => Array.from(el.options).find((option) => /^Light(?: Domain)?$/.test(option.text.trim()))?.value));
      await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
      await page.locator("#ccDefaultSpellSearch").fill("Cure Wounds");
      await expect(spell).not.toContainText("Always Prepared");
      await page.locator("#ccDefaultSpellSearch").fill("Healing Word");
      await expect(page.locator('article[data-spell-id="healing-word"]')).toContainText("Status: Prepared");
      await expect(choices).toContainText("Prepared choices: 1 / 1");

    } else {
      await expect(choices).toContainText("Additional spells available to choose");
      await expect(choices).not.toContainText("Automatically prepared from");
      await expect(spell).not.toContainText("Always Prepared");
      await expect(spell.getByRole("button", {name:"Learn Spell",exact:true})).toBeEnabled();
      await spell.getByRole("button", {name:"Learn Spell",exact:true}).click();
      await expect(choices).toContainText("Spells learned: 1 / 2");
    }
    await page.locator('.hg-character-step-button[data-step-id="review"]').click();
    await expect(page.locator("#characterWizardStepBody")).not.toContainText("is prepared without a matching");
  });
}


test("a shared spell keeps independent preparation for each multiclass source", async ({ page }) => {
  await page.goto("?smokeTest=1&view=characterCreator");
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
  await page.locator('[data-cc-action="new-character"]').first().click();
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.locator("#ccClassBuildTotalLevel").fill("2");
  await page.getByText("2. Build Type", { exact: true }).click();
  await page.getByRole("button", { name: "Multiclass", exact: true }).click();
  for (const classId of ["cleric", "druid"]) await page.locator(`[data-cc-action="toggle-class-build-class"][data-class-id="${classId}"]`).click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
  await page.locator("#ccDefaultSpellSearch").fill("Cure Wounds");
  const spell = page.locator('article[data-spell-id="cure-wounds"]');
  const select = spell.locator("[data-cc-spell-source-select]");
  const sourceIds = await select.evaluate((el) => Object.fromEntries(["Cleric", "Druid"].map((name) => [name, Array.from(el.options).find((option) => option.text.includes(name))?.value])));
  expect(sourceIds.Cleric).toBeTruthy(); expect(sourceIds.Druid).toBeTruthy();
  const summary = (name) => page.locator("[data-cc-class-spell-choices]").filter({has:page.getByRole("heading",{name:name+" spell choices",exact:true})});
  await select.selectOption(sourceIds.Cleric);
  await spell.getByRole("button",{name:"Prepare Spell",exact:true}).click();
  await expect(summary("Cleric")).toContainText("Prepared choices: 1 /");
  await expect(summary("Druid")).toContainText("Prepared choices: 0 /");
  await select.selectOption(sourceIds.Druid);
  await expect(spell.getByRole("button",{name:"Prepare Spell",exact:true})).toBeEnabled();
  await spell.getByRole("button",{name:"Prepare Spell",exact:true}).click();
  await select.selectOption(sourceIds.Cleric);
  await spell.getByRole("button",{name:"Unprepare Spell",exact:true}).click();
  await expect(summary("Cleric")).toContainText("Prepared choices: 0 /");
  await expect(summary("Druid")).toContainText("Prepared choices: 1 /");
  await select.selectOption(sourceIds.Druid);
  await expect(spell).toContainText("Status: Prepared");
  const origins = spell.locator("[data-spell-provenance]");
  await origins.locator("summary").click();
  await expect(origins).toContainText("Druid");
  await expect(origins).not.toContainText("Uses one Cleric prepared choice");
});


for (const [classId, subclassName, spellId, spellName] of [
  ["fighter", "Eldritch Knight", "magic-missile", "Magic Missile"],
  ["rogue", "Arcane Trickster", "charm-person", "Charm Person"]
]) {
  test(`${subclassName} unlocks class-owned spell choices without preparation controls`, async ({ page }) => {
    await page.goto("?smokeTest=1&view=characterCreator");
    await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
    await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
    await page.locator('[data-cc-action="new-character"]').first().click();
    await page.locator('.hg-character-step-button[data-step-id="class"]').click();
    await page.locator("#ccClassBuildTotalLevel").fill("3");
    await page.getByText("2. Build Type", { exact: true }).click();
    await page.locator(`[data-cc-action="toggle-class-build-class"][data-class-id="${classId}"]`).click();
    await page.locator('[data-cc-action="confirm-class-build"]').click();
    const subclass = page.locator("#ccClassSubclass-0");
    await subclass.selectOption(await subclass.evaluate((el, name) => Array.from(el.options).find((option) => option.text.trim() === name)?.value, subclassName));
    await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
    await expect(page.locator("[data-cc-class-spell-choices]")).toContainText("Spells learned: 0 / 3");
    await page.locator("#ccDefaultSpellSearch").fill(spellName);
    const spell = page.locator(`article[data-spell-id="${spellId}"]`);
    await expect(spell.getByRole("button", {name:"Prepare Spell",exact:true})).toHaveCount(0);
    await spell.getByRole("button", {name:"Learn Spell",exact:true}).click();
    await expect(page.locator("[data-cc-class-spell-choices]")).toContainText("Spells learned: 1 / 3");
    await page.locator("#ccCustomSpellsSection > summary").click();
    await page.locator("#ccNewSpellLevel").selectOption("1");
    await expect(page.locator("#ccNewSpellKnown")).toBeEnabled();
    await expect(page.locator("#ccNewSpellPrepared")).toBeDisabled();
    await page.locator('.hg-character-step-button[data-step-id="review"]').click();
    await expect(page.locator("#characterWizardStepBody")).not.toContainText("is prepared without a matching");
  });
}


async function openSpellAuditCharacter(page, classId = "wizard") {
  page.setDefaultTimeout(15000);
  page.on("dialog", dialog => dialog.accept());
  await page.goto("?smokeTest=1&view=characterCreator");
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {timeout:30000});
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
  await page.locator('[data-cc-action="new-character"]').first().click();
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.getByText("2. Build Type",{exact:true}).click();
  await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="'+classId+'"]').click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
}
async function exportSpellAuditCharacter(page) {
  await page.locator('.hg-character-step-button[data-step-id="save"]').click();
  const pending=page.waitForEvent("download");
  await page.getByRole('button',{name:'Export JSON File',exact:true}).click();
  const stream=await (await pending).createReadStream(); const chunks=[];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function importSpellAuditCharacter(page, character) {
  await page.locator('.hg-character-step-button[data-step-id="save"]').click();
  await page.locator("#ccImportJsonText").fill(JSON.stringify(character));
  expect(await page.locator("#ccImportJsonText").inputValue()).toBe(JSON.stringify(character));
  await page.locator('[data-cc-action="import-json-text"]').click();
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
}
test("spell readiness distinguishes missing Bard choices from invalid spell rules",async({page})=>{
  await openSpellAuditCharacter(page,"bard");
  await expect(page.locator('[data-cc-spell-readiness]')).toContainText("Valid draft");
  await expect(page.locator('[data-hg-step-missing]')).toContainText("Bard");
  await expect(page.locator('.hg-character-step-button[data-step-id="spells"]')).not.toHaveClass(/\bcomplete\b/);
  await page.locator('.hg-character-step-button[data-step-id="review"]').click();
  await expect(page.locator('[data-cc-readiness-issues]')).toContainText("4 Bard");
  const jump=page.locator('[data-cc-readiness-issues] [data-cc-issue]').first(); await jump.click();
  await expect(page.locator('#characterWizardStepTitle')).toHaveText("Spells / Features");
});
test("Wizard spellbook free choices and copied spells survive export and legacy history review",async({page})=>{
  await openSpellAuditCharacter(page);
  for(const [id,name] of [["magic-missile","Magic Missile"],["shield","Shield"],["mage-armor","Mage Armor"],["detect-magic","Detect Magic"],["identify","Identify"],["sleep","Sleep"],["alarm","Alarm"]]) {
    await page.locator('#ccDefaultSpellSearch').fill(name);
    const card=page.locator('article[data-spell-id="'+id+'"]');
    if(id==="alarm") { await card.getByRole("button",{name:"Show Spell Details",exact:true}).click(); await card.locator('[data-cc-spellbook-acquisition]').selectOption("copied"); }
    await card.getByRole("button",{name:/Add to Spellbook/i}).click();
    if(id==="magic-missile") await card.getByRole("button",{name:"Prepare Spell",exact:true}).click();
  }
  await expect(page.locator('[data-cc-spellbook-progress] summary')).toContainText("6 / 6");
  const character=await exportSpellAuditCharacter(page);
  const source=Object.values(character.magic.classSources).find(s=>s.classId==="wizard");
  expect(source.spellbookSpellIds).toHaveLength(7); expect(source.spellbookAcquisitions.alarm.kind).toBe("copied");
  // Simulate a pre-history save; both canonical and compatibility data must stay intact.
  delete source.spellbookAcquisitions; for(const s of character.magic.spellSources) delete s.spellbookAcquisitions;
  await importSpellAuditCharacter(page,character);
  const progress=page.locator('[data-cc-spellbook-progress]');await progress.locator('summary').click();
  await expect(progress).toContainText("Unreviewed entries: 7");
  await expect(progress.locator('[data-cc-spellbook-history-preview]')).toBeVisible();
  await progress.getByRole("button",{name:"Confirm proposed spellbook history"}).click();
  await expect(progress.locator('summary')).toContainText("6 / 6");
  await expect(progress).toHaveAttribute("open", "");
  const history = progress.locator('[data-cc-spellbook-history="magic-missile"]');
  await history.selectOption("copied");await expect(progress).toHaveAttribute("open", "");
  await history.selectOption("level:1");await expect(history).toBeFocused();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const after=await exportSpellAuditCharacter(page);const recovered=Object.values(after.magic.classSources).find(s=>s.classId==="wizard");
  expect(recovered.spellbookSpellIds.sort()).toEqual(source.spellbookSpellIds.sort());
  expect(recovered.preparedSpellIds).toEqual(["magic-missile"]);
  expect(Object.values(recovered.spellbookAcquisitions).filter(a=>a.kind==="copied")).toHaveLength(1);
});
test("spell source restoration requires an unchanged reviewed preview",async({page})=>{
  await openSpellAuditCharacter(page);
  const character=await exportSpellAuditCharacter(page);const entry=character.classProgression.classes[0];
  character.builder.archivedClassSpellSources=[{sourceId:"class:old-wizard",sourceType:"class",classEntryId:"old-wizard",classId:"wizard",className:"Archived Wizard",selectedSpellIds:["shield"],spellStates:{shield:{spellbook:true,known:true}},spellbookAcquisitions:{shield:{kind:"level",classLevel:1}}}];
  character.builder.validation.classChangeReviewWarnings=["Archived Wizard spells need review after a class change."];
  await importSpellAuditCharacter(page,character);
  await page.locator('.hg-character-step-button[data-step-id="review"]').click();
  await expect(page.locator('#characterWizardStepBody')).toContainText("Archived Wizard spells need review");
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();
  const recovery=page.locator('[data-cc-spell-source-recovery]');await recovery.locator('summary').click();
  await recovery.locator('[data-cc-restore-target]').selectOption(entry.entryId);
  await recovery.getByRole("button",{name:"Preview restoration"}).click();
  await expect(recovery.locator('[data-cc-spell-repair-preview]')).toContainText("has not changed the character");
  await recovery.getByRole("button",{name:"Cancel preview"}).click();
  if (!(await recovery.evaluate(el=>el.open))) await recovery.locator('summary').click();
  await expect(recovery.locator('[data-cc-archive-row]')).toHaveCount(1);
  await recovery.locator('[data-cc-restore-target]').selectOption(entry.entryId);
  await recovery.getByRole("button",{name:"Preview restoration"}).click();
  await recovery.getByRole("button",{name:"Apply reviewed spell-source changes"}).click();
  const after=await exportSpellAuditCharacter(page);
  expect(after.builder.archivedClassSpellSources).toHaveLength(0);
  expect(after.magic.classSources[entry.entryId].spellbookSpellIds).toContain("shield");
});


test("Paladin 19 Druid 1 Review shows Smite slots and repairs Oathbreaker Channel Divinity",async({page})=>{
  await openSpellAuditCharacter(page);
  const character=await exportSpellAuditCharacter(page);
  character.classProgression={totalLevel:20,classes:[{entryId:"reported-paladin",classId:"paladin",className:"Paladin",source:"template",level:19,subclassId:"oathbreaker",subclassName:"Oathbreaker",choices:{}},{entryId:"reported-druid",classId:"druid",className:"Druid",source:"template",level:1,choices:{}}],levelOrder:[...Array(19).fill("reported-paladin"),"reported-druid"]};
  character.magic.slots={};character.magic.slotUsage={normal:{"1":2},pact:0,pactSources:{}};
  character.classMechanics.resources=[{id:"shared:channel-divinity",canonicalId:"channel-divinity",maximumUses:0,currentUses:0}];
  await importSpellAuditCharacter(page,character);
  await page.locator('.hg-character-step-button[data-step-id="review"]').click();
  const body=page.locator('#characterWizardStepBody');
  await expect(body).toContainText("Divine Smite Slot Usage");
  await expect(body).not.toContainText("currently has no spell slots");
  const firstSlot=body.locator('article').filter({has:page.getByRole('heading',{name:'Level 1 slot',exact:true})});
  await expect(firstSlot).toContainText('Remaining 2 / 4');
  const fifthSlot=body.locator('article').filter({has:page.getByRole('heading',{name:'Level 5 slot',exact:true})});
  await expect(fifthSlot).toContainText('Remaining 2 / 2');
  const channel=body.locator('article').filter({has:page.getByRole('heading',{name:'Channel Divinity',exact:true})});
  await expect(channel).toContainText('Available: 1 / 1');
  await expect(channel).toContainText('Control Undead');await expect(channel).toContainText('Dreadful Aspect');
});


test("compact spell workspace separates class choices from unavailable catalog spells",async({page})=>{
  await page.setViewportSize({width:1366,height:900});await openSpellAuditCharacter(page,"druid");
  await expect(page.locator('#ccSpellSettings')).not.toHaveAttribute('open','');
  await expect(page.locator('#ccCustomSpellsSection')).not.toHaveAttribute('open','');
  await page.locator('#ccDefaultSpellSearch').fill('Frostbite');
  const frost=page.locator('article[data-spell-id="frostbite"]');
  await expect(frost.getByRole('button',{name:'Learn Cantrip',exact:true})).toBeVisible();
  expect(await frost.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(210);
  await expect(frost.locator('[data-cc-action="edit-builtin-spell-animations"]')).toHaveCount(0);
  await frost.getByRole('button',{name:'Show Spell Details',exact:true}).click();
  await expect(frost.getByRole('button',{name:'Change animation',exact:true})).toBeVisible();
  await frost.getByRole('button',{name:'Learn Cantrip',exact:true}).click();
  await expect(frost.getByRole('button',{name:'Remove Cantrip',exact:true})).toBeVisible();
  await expect(frost.getByRole('button',{name:'Remove Cantrip',exact:true})).toBeFocused();
  await frost.getByRole('button',{name:'Hide Spell Details',exact:true}).click();
  await page.locator('#homebrewGodSmokeResult').evaluate(el=>el.style.display='none');
  await page.screenshot({path:'output/compact-creator-desktop.png'});
  await page.locator('#ccDefaultSpellSearch').fill('Fire Bolt');await expect(page.locator('article[data-spell-id="fire-bolt"]')).toHaveCount(0);
  await page.locator('[data-cc-show-unavailable]').check();
  const unavailable=page.locator('article[data-spell-id="fire-bolt"]');await expect(unavailable).toContainText('not on the selected class spell list');
  await expect(unavailable.locator('[data-cc-action="toggle-spell-known"]')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.locator('#ccDefaultSpellSearch').fill('Frostbite');
  await expect(frost).toBeVisible();await frost.scrollIntoViewIfNeeded();
  expect(await page.locator('.hg-character-step-footer').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(160);
  await page.screenshot({path:'output/compact-creator-phone.png'});
});


test("Bard 10 Cleric 10 class choices finish without advanced tools or multi-select gestures",async({page})=>{
  await openSpellAuditCharacter(page,"bard");
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.locator('#ccClassBuildTotalLevel').fill('20');await page.locator('#ccClassBuildTotalLevel').blur();
  await page.locator('[data-build-mode="multiclass"]').click();
  await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="cleric"]').click();
  for(let i=0;i<9;i++) await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="cleric"][data-level-delta="1"]').click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
  await expect(page.locator('[data-cc-completion-guidance]')).toContainText('pending Magical Secrets choice (0/2)');
  await expect(page.locator('[data-cc-action="show-advanced-class-tools"]')).toBeVisible();
  await page.locator('[data-multiclass-subclass-index="0"]').selectOption({label:'Valor'});
  await page.locator('[data-multiclass-subclass-index="1"]').selectOption({label:'Life'});
  const secrets=page.locator('[data-feature-card-id="magical-secrets-10"]');
  const spell=index=>secrets.locator('[data-choice-index="'+index+'"]');
  await page.locator('[data-cc-completion-guidance] [data-cc-issue]').filter({hasText:'Show in Class: Class choices'}).first().click();
  await expect(spell(0)).toBeFocused();
  await expect(spell(0)).not.toHaveAttribute('multiple');
  await spell(0).evaluate(element=>element.scrollIntoView({block:'center'}));
  const spellTop=await spell(0).evaluate(element=>element.getBoundingClientRect().top);
  await spell(0).selectOption('fireball');await expect(spell(0)).toHaveValue('fireball');
  await expect.poll(async()=>Math.abs(await spell(0).evaluate(element=>element.getBoundingClientRect().top)-spellTop)).toBeLessThan(5);
  await expect(spell(0)).toBeFocused();
  await expect(page.locator('[data-cc-completion-guidance]')).toContainText('pending Magical Secrets choice (1/2)');
  await spell(1).selectOption('counterspell');await expect(spell(0)).toHaveValue('fireball');await expect(spell(1)).toHaveValue('counterspell');
  await expect(spell(1).locator('option[value="fireball"]')).toHaveAttribute('disabled','');
  for(let i=0;i<4;i++){ const pending=page.locator('[data-cc-action="set-asi-mode"][data-mode="asi"]:not(.selected)');if(await pending.count())await pending.first().click(); }
  await expect(page.locator('[data-cc-action="set-asi-mode"][data-mode="asi"]:not(.selected)')).toHaveCount(0);
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).toHaveClass(/complete/);
  await page.locator('[data-cc-action="show-advanced-progression-tools"]').click();
  await expect(page.getByRole('heading',{name:'Level Up Workflow',exact:true})).toHaveCount(0);
  await expect(page.locator('[data-multiclass-subclass-index]')).toHaveCount(2);
  const character=await exportSpellAuditCharacter(page);
  const bard=character.classProgression.classes.find(entry=>entry.classId==='bard');
  expect(bard.level).toBe(10);expect(character.classProgression.classes.find(entry=>entry.classId==='cleric').level).toBe(10);
  expect(Object.values(bard.choices.classFeatures).some(values=>values.includes('fireball')&&values.includes('counterspell'))).toBe(true);
  await importSpellAuditCharacter(page,character);
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(spell(0)).toHaveValue('fireball');await expect(spell(1)).toHaveValue('counterspell');
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).toHaveClass(/complete/);
});


test("Cleric starting class exposes Bard multiclass skill and instrument choices",async({page})=>{
  await openSpellAuditCharacter(page,"cleric");
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.locator('#ccClassBuildTotalLevel').fill('20');await page.locator('#ccClassBuildTotalLevel').blur();
  await page.locator('[data-build-mode="multiclass"]').click();await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="bard"]').click();
  for(let i=0;i<9;i++)await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="bard"][data-level-delta="1"]').click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
  const choices=page.locator('[data-cc-required-multiclass-choices]');
  await expect(choices).toContainText('Bard Level 10 Choices');
  await expect(page.locator('[data-cc-completion-guidance]')).toContainText('Bard multiclass skill choice is pending');
  await expect(page.locator('[data-cc-completion-guidance]')).toContainText('musical instrument');
  await page.setViewportSize({width:390,height:844});
  const skill=choices.locator('[data-cc-action="toggle-multiclass-skill"]').first();
  await skill.evaluate(element=>element.scrollIntoView({block:'center'}));
  const skillTop=await skill.evaluate(element=>element.getBoundingClientRect().top);
  await skill.click();
  await expect.poll(async()=>Math.abs(await skill.evaluate(element=>element.getBoundingClientRect().top)-skillTop)).toBeLessThan(5);
  await expect(skill).toBeFocused();
  await choices.locator('[data-cc-action="toggle-multiclass-tool"]').first().click();
  await expect(page.locator('[data-cc-completion-guidance]')).not.toContainText('Bard multiclass skill choice is pending');
  await expect(page.locator('[data-cc-completion-guidance]')).not.toContainText('musical instrument');
  await expect(choices.locator('[data-cc-action="toggle-multiclass-skill"].selected')).toHaveCount(1);
  await expect(choices.locator('[data-cc-action="toggle-multiclass-tool"].selected')).toHaveCount(1);
});


async function buildAuditSplit(page, first, second, firstLevel, secondLevel) {
  await openSpellAuditCharacter(page,first);
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.locator('#ccClassBuildTotalLevel').fill(String(firstLevel+secondLevel));await page.locator('#ccClassBuildTotalLevel').blur();
  await page.locator('[data-build-mode="multiclass"]').click();
  await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="'+second+'"]').click();
  for(let i=1;i<secondLevel;i++)await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="'+second+'"][data-level-delta="1"]').click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
}

test("choice audit: single-class progression cannot look complete with required feature choices missing",async({page})=>{
  await openSpellAuditCharacter(page,'bard');await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await page.locator('#ccClassBuildTotalLevel').fill('10');await page.locator('#ccClassBuildTotalLevel').blur();await page.locator('[data-cc-action="confirm-class-build"]').click();
  await expect(page.locator('[data-feature-card-id="magical-secrets-10"]')).toBeVisible();
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).not.toHaveClass(/complete/);
  await expect(page.locator('[data-cc-completion-guidance]')).toContainText('pending Magical Secrets choice (0/2)');
  await page.locator('[data-multiclass-subclass-index="0"]').selectOption({label:'Valor'});
  const secrets=page.locator('[data-feature-card-id="magical-secrets-10"]');
  await secrets.locator('[data-choice-index="0"]').selectOption('fireball');await secrets.locator('[data-choice-index="1"]').selectOption('counterspell');
  for(let i=0;i<2;i++)await page.locator('[data-cc-action="set-asi-mode"][data-mode="asi"]:not(.selected)').first().click();
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).toHaveClass(/complete/);
  const saved=await exportSpellAuditCharacter(page);await importSpellAuditCharacter(page,saved);await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).toHaveClass(/complete/);
});

test("choice audit: Lore and normal Magical Secrets remain independent while editing, clearing and reopening",async({page})=>{
  await buildAuditSplit(page,'bard','cleric',10,10);
  await page.locator('[data-multiclass-subclass-index="0"]').selectOption({label:'Lore'});
  const normal=page.locator('[data-feature-card-id="magical-secrets-10"]');const extra=page.locator('[data-feature-card-id="lore-additional-magical-secrets"]');
  await normal.locator('[data-choice-index="0"]').selectOption('fireball');await normal.locator('[data-choice-index="1"]').selectOption('counterspell');
  await extra.locator('[data-choice-index="0"]').selectOption('shield');await extra.locator('[data-choice-index="1"]').selectOption('revivify');
  await normal.locator('[data-choice-index="0"]').selectOption('');
  await expect(normal.locator('[data-choice-index="0"]')).toHaveValue('counterspell');
  await expect(extra.locator('[data-choice-index="0"]')).toHaveValue('shield');await expect(extra.locator('[data-choice-index="1"]')).toHaveValue('revivify');
  await normal.locator('[data-choice-index="1"]').selectOption('fly');
  const saved=await exportSpellAuditCharacter(page);await importSpellAuditCharacter(page,saved);await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(normal.locator('[data-choice-index="0"]')).toHaveValue('counterspell');await expect(normal.locator('[data-choice-index="1"]')).toHaveValue('fly');
  await expect(extra.locator('[data-choice-index="0"]')).toHaveValue('shield');await expect(extra.locator('[data-choice-index="1"]')).toHaveValue('revivify');
});

test("choice audit: same-level multiclass ability increases update only their owning class",async({page})=>{
  await buildAuditSplit(page,'bard','cleric',4,4);
  const bard=page.locator('[data-feature-card-class-id="bard"][data-feature-card-id="ability-score-improvement-4"]');
  const cleric=page.locator('[data-feature-card-class-id="cleric"][data-feature-card-id="ability-score-improvement-4"]');
  for(const card of [bard,cleric])await card.locator('[data-cc-action="set-asi-mode"][data-mode="asi"]').click();
  for(let i=0;i<2;i++)await bard.locator('[data-cc-action="adjust-asi-ability"][data-ability-id="str"][data-delta="1"]').click();
  for(let i=0;i<2;i++)await cleric.locator('[data-cc-action="adjust-asi-ability"][data-ability-id="wis"][data-delta="1"]').click();
  await expect(bard).toContainText('Strength +2');await expect(bard).toContainText('Wisdom +0');
  await expect(cleric).toContainText('Wisdom +2');await expect(cleric).toContainText('Strength +0');
  const saved=await exportSpellAuditCharacter(page);await importSpellAuditCharacter(page,saved);await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(bard).toContainText('Strength +2');await expect(cleric).toContainText('Wisdom +2');
});

test("choice audit: sorcerer and warlock feature choices survive each other's redraws",async({page})=>{
  await buildAuditSplit(page,'sorcerer','warlock',3,2);
  const meta=page.locator('[data-feature-card-id="metamagic"]');const invocations=page.locator('[data-feature-card-id="eldritch-invocations"]');
  for(const card of [meta,invocations])for(let i=0;i<2;i++)await card.locator('[data-cc-action="toggle-class-feature-choice"]:not(.selected)').first().click();
  await expect(meta.locator('[data-cc-action="toggle-class-feature-choice"].selected')).toHaveCount(2);
  await expect(invocations.locator('[data-cc-action="toggle-class-feature-choice"].selected')).toHaveCount(2);
  const saved=await exportSpellAuditCharacter(page);await importSpellAuditCharacter(page,saved);await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(meta.locator('[data-cc-action="toggle-class-feature-choice"].selected')).toHaveCount(2);
  await expect(invocations.locator('[data-cc-action="toggle-class-feature-choice"].selected')).toHaveCount(2);
});


test("choice audit: expanded details stay with their own feature after a selection redraw",async({page})=>{
  await buildAuditSplit(page,'bard','cleric',10,10);
  const secrets=page.locator('[data-feature-card-id="magical-secrets-10"]');
  const details=secrets.locator('details.hg-compact-details');
  await expect(details).toHaveCount(1);expect(await page.locator('details.hg-compact-details').count()).toBeGreaterThan(1);
  await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
  await secrets.locator('[data-choice-index="0"]').selectOption('fireball');
  await expect(details).toHaveAttribute('open','');
  await expect(page.locator('[data-feature-card-id]:not([data-feature-card-id="magical-secrets-10"]) details[open]')).toHaveCount(0);
});


test("choice audit: Fighter and Paladin styles do not duplicate or overwrite one another",async({page})=>{
  await buildAuditSplit(page,'fighter','paladin',2,2);
  const fighter=page.locator('[data-feature-card-class-id="fighter"][data-feature-card-id="fighting-style-fighter"]');
  const paladin=page.locator('[data-feature-card-class-id="paladin"][data-feature-card-id="fighting-style-paladin"]');
  await fighter.locator('[data-cc-action="toggle-class-feature-choice"][data-option="Defense"]').click();
  await paladin.locator('[data-cc-action="toggle-class-feature-choice"][data-option="Defense"]').click();
  await expect(paladin.locator('[data-cc-action="toggle-class-feature-choice"].selected')).toHaveCount(0);
  await expect(fighter.locator('[data-option="Defense"]')).toHaveClass(/selected/);
  await paladin.locator('[data-cc-action="toggle-class-feature-choice"][data-option="Dueling"]').click();
  const saved=await exportSpellAuditCharacter(page);await importSpellAuditCharacter(page,saved);await page.locator('.hg-character-step-button[data-step-id="class"]').click();
  await expect(fighter.locator('[data-option="Defense"]')).toHaveClass(/selected/);
  await expect(paladin.locator('[data-option="Dueling"]')).toHaveClass(/selected/);
  await expect(page.locator('.hg-character-step-button[data-step-id="class"]')).toHaveClass(/complete/);
});
