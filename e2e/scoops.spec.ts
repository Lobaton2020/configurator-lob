import { test, expect } from '@playwright/test';
import { mockBackend, seedSession, waitForApp } from './helpers';

test.describe('Scoops list', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
  });

  test('muestra header "Name" (regresion del rename de columna)', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    const headers = page.locator('table thead th');
    await expect(headers.nth(0)).toHaveText('Name');
    // Garantiza que el viejo "Application" no esté mas
    await expect(headers.filter({ hasText: /^Application$/ })).toHaveCount(0);
  });

  test('renderiza una fila por scoop con su nombre', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    const firstNameCell = page.locator('table tbody tr').first().locator('td').first();
    await expect(firstNameCell).toHaveText('web-app');
  });

  test('muestra todos los headers esperados en orden', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    const expected = [
      'Name', 'Access', 'Type', 'Status', 'Pods', 'URL Registry',
      'Productive', 'Req vCPU', 'Req Memory', 'Lim vCPU', 'Lim Memory',
      'Min Rep', 'Max Rep', 'Actions',
    ];
    const headers = page.locator('table thead th');
    await expect(headers).toHaveCount(expected.length);
    for (let i = 0; i < expected.length; i++) {
      await expect(headers.nth(i)).toHaveText(expected[i]);
    }
  });

  test('estado vacio cuando no hay scoops', async ({ page }) => {
    await page.route('**/api/scoops*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 200, pages: 0 }),
      });
    });
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByText('No scoops yet. Click')).toBeVisible();
  });

  test('muestra mensaje de error del backend', async ({ page }) => {
    await page.route('**/api/scoops*', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'k8s unreachable' }),
      });
    });
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByText('k8s unreachable')).toBeVisible();
  });
});