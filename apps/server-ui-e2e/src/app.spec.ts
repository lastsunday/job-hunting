import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  const getLayout = () => page.waitForSelector(".mantine-Container-root", { state: "attached", timeout: 60000 });
  return expect((await getLayout())).not.toBeNull();
});
