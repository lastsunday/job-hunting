import { chromium, type BrowserContext } from "@playwright/test";
import { test as base, createBdd } from 'playwright-bdd';
import path from "path";
const pathToExtension = path.resolve(".output/chrome-mv3");

type Fixtures = {
    context: BrowserContext;
    extensionId: string;
};

export const test = base.extend<Fixtures>({
    context: async ({ }, use) => {
        const context = await chromium.launchPersistentContext("", {
            headless: true,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
        await use(context);
        await context.close();
    },
    extensionId: async ({ context }, use) => {
        let background: { url(): string };
        if (pathToExtension.endsWith("-mv3")) {
            [background] = context.serviceWorkers();
            if (!background) background = await context.waitForEvent("serviceworker");
        } else {
            [background] = context.backgroundPages();
            if (!background)
                background = await context.waitForEvent("backgroundpage");
        }

        const extensionId = background.url().split("/")[2];
        await use(extensionId);
    },
});

export const { Given, When, Then } = createBdd(test);