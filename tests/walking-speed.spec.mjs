import {
  expect,
  test
} from "@playwright/test";

test(
  "custom walking speed caps huge values without freezing the website",
  async ({ page }) => {
    await page.goto(
      "ai-testing/walking-speed-self-test.html?release=walking-speed-20260729",
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

    const input = page.locator(
      "#ccCustomSpeciesSpeed"
    );

    await expect(input)
      .toHaveAttribute("min", "0");
    await expect(input)
      .toHaveAttribute("max", "100");
    await expect(input)
      .toHaveAttribute("step", "1");
    await expect(input)
      .toHaveValue("100");

    const startedAt = Date.now();

    await input.fill(
      "30000000000000000000"
    );
    await expect(input)
      .toHaveValue("100");

    expect(
      Date.now() - startedAt
    ).toBeLessThan(5000);

    await input.fill("");
    await expect(input)
      .toHaveValue("30");

    await input.fill("42.6");
    await expect(input)
      .toHaveValue("43");

    await input.fill("-20");
    await expect(input)
      .toHaveValue("0");

    const pageResponse =
      await page.evaluate(
        async () => {
          return new Promise(
            (resolve) => {
              window.setTimeout(
                () => {
                  resolve(
                    window
                      .__WALKING_SPEED_TEST__
                      .ping()
                  );
                },
                0
              );
            }
          );
        }
      );

    expect(pageResponse)
      .toBe("responsive");
  }
);
