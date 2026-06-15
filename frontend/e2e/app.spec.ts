import { test, expect } from '@playwright/test';

test('shows sidebar', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  await expect(page.locator('aside')).toBeVisible();
});