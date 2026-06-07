import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4300';
const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: './src',
  retries: process.env.CI ? 1 : 0,
  fullyParallel: !process.env.CI,

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  webServer: [
    {
      command: 'moon run server-ui:preview',
      url: 'http://localhost:4300',
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
