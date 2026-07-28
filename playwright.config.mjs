import {
  defineConfig
} from "@playwright/test";

const deployedBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ||
  "";
const localBaseUrl =
  "http://127.0.0.1:4173";
const browserExecutablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  "";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  forbidOnly:
    Boolean(process.env.CI),
  retries:
    process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180000,
  expect: {
    timeout: 15000
  },
  reporter:
    process.env.CI
      ? [["line"], ["html", {
          open: "never"
        }]]
      : "line",
  use: {
    baseURL:
      deployedBaseUrl ||
      localBaseUrl,
    browserName: "chromium",
    headless: true,
    launchOptions:
      browserExecutablePath
        ? {
            executablePath:
              browserExecutablePath
          }
        : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer:
    deployedBaseUrl
      ? undefined
      : {
          command:
            "node scripts/static-server.mjs",
          url: localBaseUrl,
          reuseExistingServer:
            !process.env.CI,
          timeout: 30000
        }
});
