import { test, expect } from '@playwright/test';
import { mockBackend, seedSession, waitForApp } from './helpers';

test('smoke: app carga con sidebar visible', async ({ page }) => {
  await mockBackend(page);
  await seedSession(page);
  await page.goto('/scoops');
  await waitForApp(page);
  await expect(page.locator('aside')).toBeVisible();
});