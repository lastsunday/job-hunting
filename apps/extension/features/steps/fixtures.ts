import { chromium, type BrowserContext } from "@playwright/test";
import { test as base, createBdd } from 'playwright-bdd';
import path from "path";
import { APP_ID } from "../../common/config";

const pathToExtension = path.resolve(".output/chrome-mv3");

type Fixtures = {
  context: BrowserContext;
  extensionId: string;
};

export const test = base.extend<Fixtures>({
  context: async ({ }, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: true,
      timeout: 60000,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
  },
  extensionId: async ({ }, use) => {
    await use(APP_ID);
  },
});

export const { Given, When, Then } = createBdd(test);
