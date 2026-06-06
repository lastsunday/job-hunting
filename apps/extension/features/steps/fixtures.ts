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
            timeout: 60000,
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
            const swPromise = context.waitForEvent("serviceworker", { timeout: 120000 });
            const serviceWorkers = context.serviceWorkers();
            if (serviceWorkers.length > 0) {
                background = serviceWorkers[0];
            } else {
                try {
                    background = await swPromise;
                } catch (error) {
                    throw new Error(
                        `Failed to load extension service worker within 60s. ` +
                        `Ensure extension is built (wxt build) and output exists at ${pathToExtension}. ${error}`
                    );
                }
            }
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