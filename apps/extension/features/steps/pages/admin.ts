import { Page, expect } from "@playwright/test";

export async function openAdmin(page: Page, extensionId: string) {
    await page.goto(`chrome-extension://${extensionId}/admin.html`);
}

export async function getAdmin(page: Page) {
    const getLayout = () => page.waitForSelector(".ant-layout");
    const checkLayoutDisplay = async () => { return expect((await getLayout())).not.toBeNull() };

    return { getLayout, checkLayoutDisplay };
}