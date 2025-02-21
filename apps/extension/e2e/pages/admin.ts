import { Page } from "@playwright/test";

export async function openAdmin(page: Page, extensionId: string) {

    await page.goto(`chrome-extension://${extensionId}/admin.html`);
    await ready(page);
    await page.waitForSelector(".ant-layout");

    const admin = {
        getLayout: () => page.waitForSelector(".ant-layout"),
    };
    return admin;
}

function ready(page: Page): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        let maxCount = 60;
        let count = 0;
        setInterval(() => {
            if (count > maxCount) {
                count++;
                reject("check app status timeout")
            }
        }, 1000);
        page.on('console', async msg => {
            const text = msg.text();
            if (text == `[Bridge] initBridge success`) {
                resolve();
            }
        });
    })
    return promise;
}