import { Given, When, Then } from './fixtures';
import { openAdmin, getAdmin } from "./pages/admin";
import { expect } from "@playwright/test";
import { APP_ID } from "@/common/config";

Given('安装了插件的浏览器', async ({ extensionId }) => {
  expect(extensionId).toEqual(APP_ID)
});

When('打开插件后台管理页面', async ({ page, extensionId }) => {
  await openAdmin(page, extensionId);
});

Then('待业者应该能看到管理页面的展示', async ({ page }) => {
  const { checkLayoutDisplay } = await getAdmin(page);
  await checkLayoutDisplay();
});
