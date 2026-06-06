import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4300';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  retries: process.env.CI ? 1 : 0,
  fullyParallel: !process.env.CI,

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  webServer: [
    {
      command: 'pnpm exec nx run server-ui:preview',
      url: 'http://localhost:4300',
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
    },
  ],

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
