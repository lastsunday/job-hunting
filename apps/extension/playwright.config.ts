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
  retries: process.env.CI ? 1 : 0,

  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,

  timeout: 180000,

  reporter: [
    cucumberReporter('html', {
      outputFile: 'cucumber-report/index.html',
      externalAttachments: true,
    }),
    ['allure-playwright'],
  ],

  use: {
    trace: { mode: 'retain-on-first-failure' },
    screenshot: { mode: 'only-on-failure' },
    video: 'retain-on-failure',
    ...(process.env.CI || process.env.DEBUG
      ? { launchOptions: { args: ['--enable-logging', '--v=1'] } }
      : {}),
  },

  projects: [
    {
      name: 'chromium',
      // https://github.com/microsoft/playwright/issues/33682
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
