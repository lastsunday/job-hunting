import { defineConfig, devices } from "@playwright/test";

import { defineBddConfig, cucumberReporter } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/*.feature',
  steps: 'features/steps/*.ts',
});

export default defineConfig({
  testDir,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use
  reporter: [
    cucumberReporter('html', {
      outputFile: 'cucumber-report/index.html',
      externalAttachments: true,
    }),
    ['html', { open: 'never' }],
  ],

  use: {
    // Collect trace when retrying the failed test.
    trace: { mode: "retain-on-first-failure" },
    screenshot: { mode: 'on' },
  },

  // Configure projects for major browsers.
  projects: [
    {
      name: "chromium",
      //channel: "chromium" -> https://github.com/microsoft/playwright/issues/33682
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});