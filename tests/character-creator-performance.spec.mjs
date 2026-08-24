import {
  expect,
  test
} from "@playwright/test";

const CPU_THROTTLE_RATE = 4;
const REOPEN_CYCLES = 12;
const INVENTORY_ITEM_COUNT = 250;

const budgets = Object.freeze({
  creatorInitialLoadMs: 15000,
  newDraftMs: 2500,
  stepSwitchP95Ms: 6000,
  typingP95Ms: 100,
  spellSearchMs: 2000,
  largeInventoryMs: 7000,
  reviewMs: 7000,
  heavyDomNodes: 30000,
  memoryGrowthBytes: 24 * 1024 * 1024,
  activeCreatorListeners: 1
});

function percentile(values, ratio) {
  const sorted = [...values].sort(
    (left, right) => left - right
  );
  const index = Math.min(
    sorted.length - 1,
    Math.max(
      0,
      Math.ceil(sorted.length * ratio) - 1
    )
  );

  return sorted[index] || 0;
}

async function collectGarbage(client) {
  await client.send(
    "HeapProfiler.collectGarbage"
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
}

test(
  "Character Creator performance and stress budgets stay bounded on a weaker CPU",
  async ({ page }, testInfo) => {
    const client =
      await page.context()
        .newCDPSession(page);

    await client.send(
      "Emulation.setCPUThrottlingRate",
      { rate: CPU_THROTTLE_RATE }
    );
    await client.send(
      "HeapProfiler.enable"
    );

    const report = {
      environment: {
        cpuThrottleRate:
          CPU_THROTTLE_RATE,
        inventoryItemCount:
          INVENTORY_ITEM_COUNT,
        reopenCycles:
          REOPEN_CYCLES
      },
      budgets,
      measurements: {}
    };

    await page.goto(
      "?smokeTest=1&view=characterCreator&step=library&release=priority12-performance",
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
      { timeout: 30000 }
    );

    const startup =
      await page.evaluate(async () => {
        const api =
          window
            .__HOMEBREW_GOD_RELEASE_TEST__;
        const startedAt =
          performance.now();

        const state =
          await api.openScreen(
            "characterCreator"
          );

        return {
          durationMs:
            performance.now() -
            startedAt,
          state,
          domNodes:
            document.querySelectorAll(
              "#characterCreatorScreen *"
            ).length
        };
      });

    const newDraft =
      await page.evaluate(() => {
        const button =
          document.querySelector(
            '[data-cc-action="new-character"]'
          );
        const startedAt =
          performance.now();

        button.click();

        return {
          durationMs:
            performance.now() -
            startedAt,
          hasNameInput:
            Boolean(
              document.getElementById(
                "ccCharacterName"
              )
            )
        };
      });

    const listenerState =
      await page.evaluate(() => {
        return window
          .__HOMEBREW_GOD_RELEASE_TEST__
          .getListenerState();
      });

    await collectGarbage(client);
    const memoryBeforeCycles =
      await client.send(
        "Runtime.getHeapUsage"
      );

    await page.evaluate(
      async (cycles) => {
        const api =
          window
            .__HOMEBREW_GOD_RELEASE_TEST__;

        for (
          let index = 0;
          index < cycles;
          index += 1
        ) {
          await api.openScreen("room");
          await api.openScreen(
            "characterCreator"
          );
        }
      },
      REOPEN_CYCLES
    );

    await collectGarbage(client);
    const memoryAfterCycles =
      await client.send(
        "Runtime.getHeapUsage"
      );
    const listenersAfterCycles =
      await page.evaluate(() => {
        return window
          .__HOMEBREW_GOD_RELEASE_TEST__
          .getListenerState();
      });

    report.measurements.startup = {
      creatorInitialLoadMs:
        startup.durationMs,
      initialCreatorDomNodes:
        startup.domNodes,
      newDraftMs:
        newDraft.durationMs
    };
    report.measurements.listeners = {
      initial:
        listenerState.characterCreator,
      afterReopenCycles:
        listenersAfterCycles
          .characterCreator
    };
    report.measurements.memory = {
      beforeBytes:
        memoryBeforeCycles.usedSize,
      afterBytes:
        memoryAfterCycles.usedSize,
      growthBytes: Math.max(
        0,
        memoryAfterCycles.usedSize -
          memoryBeforeCycles.usedSize
      )
    };

    await page.goto(
      "tests/browser-pages/character-creator-performance.html?view=characterCreator&step=basics&release=priority12-performance",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "ready"
      );

    const stressSetup =
      await page.evaluate(
        ({ itemCount }) => {
          const creator =
            window
              .__CHARACTER_CREATOR_PERFORMANCE__;
          const draft =
            JSON.parse(
              JSON.stringify(
                creator.getDraft()
              )
            );

          draft.identity.name =
            "Priority Twelve Stress Hero";
          draft.abilities.base = {
            str: 16,
            dex: 16,
            con: 16,
            int: 16,
            wis: 16,
            cha: 16
          };
          draft.abilities.scores = {
            ...draft.abilities.base
          };
          draft.classProgression = {
            totalLevel: 20,
            classes: [
              {
                entryId:
                  "fighter-stress",
                classId: "fighter",
                className: "Fighter",
                level: 8
              },
              {
                entryId:
                  "wizard-stress",
                classId: "wizard",
                className: "Wizard",
                level: 7
              },
              {
                entryId:
                  "cleric-stress",
                classId: "cleric",
                className: "Cleric",
                level: 5
              }
            ],
            levelOrder: [
              ...Array(8).fill(
                "fighter-stress"
              ),
              ...Array(7).fill(
                "wizard-stress"
              ),
              ...Array(5).fill(
                "cleric-stress"
              )
            ],
            unarmoredDefenseSource:
              null
          };
          draft.equipment.items =
            Array.from(
              { length: itemCount },
              (_, index) => {
                return {
                  id:
                    `stress-item-${index}`,
                  name:
                    `Stress Item ${index}`,
                  category:
                    index % 5 === 0
                      ? "weapon"
                      : "adventuring-gear",
                  quantity:
                    (index % 4) + 1,
                  weight:
                    (index % 10) / 2,
                  equipped:
                    index % 11 === 0,
                  notes:
                    "Bounded performance fixture item.",
                  source: "performance-test"
                };
              }
            );

          const startedAt =
            performance.now();
          creator.replaceDraft(
            draft,
            {
              dirty: false,
              skipDiscardGuard: true,
              stepId: "equipment"
            }
          );

          return {
            durationMs:
              performance.now() -
              startedAt,
            inventoryButtons:
              document.querySelectorAll(
                '[data-cc-action="remove-inventory-item"]'
              ).length,
            domNodes:
              document.querySelectorAll(
                "#characterCreatorScreen *"
              ).length
          };
        },
        {
          itemCount:
            INVENTORY_ITEM_COUNT
        }
      );

    const interaction =
      await page.evaluate(async () => {
        const creator =
          window
            .__CHARACTER_CREATOR_PERFORMANCE__;
        const stepIds = [
          "basics",
          "class",
          "background",
          "species",
          "abilities",
          "equipment",
          "spells",
          "review"
        ];
        const stepTimings = [];
        const domNodesByStep = {};

        for (const stepId of stepIds) {
          const startedAt =
            performance.now();
          creator.navigateToStep(stepId);
          stepTimings.push({
            stepId,
            durationMs:
              performance.now() -
              startedAt
          });
          domNodesByStep[stepId] =
            document.querySelectorAll(
              "#characterCreatorScreen *"
            ).length;
        }

        creator.navigateToStep(
          "basics"
        );
        const nameInput =
          document.getElementById(
            "ccCharacterName"
          );
        const typingTimings = [];
        const typingValue =
          "Responsive Priority Twelve Hero";

        for (
          let index = 1;
          index <= typingValue.length;
          index += 1
        ) {
          nameInput.value =
            typingValue.slice(0, index);
          const startedAt =
            performance.now();
          nameInput.dispatchEvent(
            new InputEvent(
              "input",
              {
                bubbles: true,
                inputType:
                  "insertText",
                data:
                  typingValue[index - 1]
              }
            )
          );
          typingTimings.push(
            performance.now() -
              startedAt
          );
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 400);
        });

        const reviewStartedAt =
          performance.now();
        creator.navigateToStep(
          "review"
        );
        const reviewMs =
          performance.now() -
          reviewStartedAt;
        const reviewDomNodes =
          document.querySelectorAll(
            "#characterCreatorScreen *"
          ).length;

        creator.navigateToStep(
          "spells"
        );
        const spellSearch =
          document.getElementById(
            "ccDefaultSpellSearch"
          );
        const spellSearchStartedAt =
          performance.now();

        spellSearch.value =
          "meteor swarm";
        spellSearch.dispatchEvent(
          new InputEvent(
            "input",
            {
              bubbles: true,
              inputType:
                "insertText",
              data: "meteor swarm"
            }
          )
        );
        await new Promise((resolve) => {
          setTimeout(resolve, 400);
        });

        return {
          stepTimings,
          typingTimings,
          domNodesByStep,
          reviewMs,
          reviewDomNodes,
          spellSearchMs:
            performance.now() -
            spellSearchStartedAt,
          spellSearchDomNodes:
            document.querySelectorAll(
              "#characterCreatorScreen *"
            ).length,
          spellMatches:
            document.querySelectorAll(
              "[data-cc-default-spell-option]"
            ).length,
          renderMetrics:
            creator.getRenderMetrics()
        };
      });

    const stepDurations =
      interaction.stepTimings.map(
        (entry) => entry.durationMs
      );
    const allHeavyDomCounts = [
      stressSetup.domNodes,
      interaction.reviewDomNodes,
      interaction.spellSearchDomNodes,
      ...Object.values(
        interaction.domNodesByStep
      )
    ];

    report.measurements.stress = {
      largeInventoryMs:
        stressSetup.durationMs,
      renderedInventoryItems:
        stressSetup.inventoryButtons,
      stepTimings:
        interaction.stepTimings,
      stepSwitchP95Ms:
        percentile(
          stepDurations,
          0.95
        ),
      typingP95Ms:
        percentile(
          interaction.typingTimings,
          0.95
        ),
      spellSearchMs:
        interaction.spellSearchMs,
      spellMatches:
        interaction.spellMatches,
      reviewMs:
        interaction.reviewMs,
      maximumDomNodes:
        Math.max(...allHeavyDomCounts),
      domNodesByStep:
        interaction.domNodesByStep,
      renderMetrics:
        interaction.renderMetrics
    };

    await testInfo.attach(
      "character-creator-performance.json",
      {
        body: Buffer.from(
          JSON.stringify(
            report,
            null,
            2
          )
        ),
        contentType:
          "application/json"
      }
    );

    console.log(
      "Character Creator performance report:\n" +
      JSON.stringify(
        report.measurements,
        null,
        2
      )
    );

    expect(startup.state.visible)
      .toBe(true);
    expect(startup.state.characterCreatorReady)
      .toBe(true);
    expect(newDraft.hasNameInput)
      .toBe(true);
    expect(
      startup.durationMs
    ).toBeLessThan(
      budgets.creatorInitialLoadMs
    );
    expect(
      newDraft.durationMs
    ).toBeLessThan(
      budgets.newDraftMs
    );
    expect(
      listenerState.characterCreator
        ?.activeCount || 0
    ).toBeLessThanOrEqual(
      budgets.activeCreatorListeners
    );
    expect(
      listenersAfterCycles
        .characterCreator
        ?.activeCount || 0
    ).toBeLessThanOrEqual(
      budgets.activeCreatorListeners
    );
    expect(
      report.measurements.memory
        .growthBytes
    ).toBeLessThan(
      budgets.memoryGrowthBytes
    );
    expect(
      stressSetup.inventoryButtons
    ).toBe(INVENTORY_ITEM_COUNT);
    expect(
      stressSetup.durationMs
    ).toBeLessThan(
      budgets.largeInventoryMs
    );
    expect(
      report.measurements.stress
        .stepSwitchP95Ms
    ).toBeLessThan(
      budgets.stepSwitchP95Ms
    );
    expect(
      report.measurements.stress
        .typingP95Ms
    ).toBeLessThan(
      budgets.typingP95Ms
    );
    expect(
      interaction.spellSearchMs
    ).toBeLessThan(
      budgets.spellSearchMs
    );
    expect(
      interaction.spellMatches
    ).toBeGreaterThan(0);
    expect(
      interaction.reviewMs
    ).toBeLessThan(
      budgets.reviewMs
    );
    expect(
      report.measurements.stress
        .maximumDomNodes
    ).toBeLessThan(
      budgets.heavyDomNodes
    );
  }
);
