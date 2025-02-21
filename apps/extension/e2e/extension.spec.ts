import { test, expect } from "./fixtures";
import { openAdmin } from "./pages/admin";

test("Extension startup", async ({ page, extensionId }) => {
  const admin = await openAdmin(page, extensionId);
  expect(await admin.getLayout()).not.toBeNull();
});