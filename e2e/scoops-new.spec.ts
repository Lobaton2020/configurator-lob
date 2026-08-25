import { test, expect } from '@playwright/test';
import { mockBackend, seedSession, waitForApp, MOCK_APP } from './helpers';

test.describe('ScoopNew form', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
  });

  test('muestra la app global activa en el banner', async ({ page }) => {
    await page.goto('/scoops/new');
    await waitForApp(page);
    await expect(page.getByText('App global activa')).toBeVisible();
    await expect(page.getByText(MOCK_APP.name)).toBeVisible();
    await expect(page.locator('code').filter({ hasText: MOCK_APP.slug })).toBeVisible();
  });

  test('deriva el registry del docker_image_base + version', async ({ page }) => {
    await page.goto('/scoops/new');
    await waitForApp(page);
    await expect(page.getByText(`${MOCK_APP.docker_image_base}:latest`)).toBeVisible();
    await page.getByPlaceholder('latest').fill('v1.2.3');
    await expect(page.getByText(`${MOCK_APP.docker_image_base}:v1.2.3`)).toBeVisible();
  });

  test('rechaza nombre invalido (DNS-1123) en blur/submit', async ({ page }) => {
    await page.goto('/scoops/new');
    await waitForApp(page);
    const nameInput = page.getByLabel('Scoop name');
    await nameInput.fill('INVALID NAME!');
    await page.getByRole('button', { name: 'Create Scoop' }).click();
    await expect(page.getByText(/DNS-1123|Mayusculas, digitos y guiones/)).toBeVisible();
  });

  test('rechaza max < min replicas', async ({ page }) => {
    await page.goto('/scoops/new');
    await waitForApp(page);
    await page.getByLabel('Min Replicas').fill('5');
    await page.getByLabel('Max Replicas').fill('2');
    await page.getByRole('button', { name: 'Create Scoop' }).click();
    await expect(page.getByText('Must be >= min_replicas')).toBeVisible();
  });

  test('POST exitoso navega al detalle del scoop', async ({ page }) => {
    let createdPayload: unknown = null;
    await page.route('**/api/scoops', async (route) => {
      if (route.request().method() === 'POST') {
        createdPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            name: 'created-scoop',
            application: MOCK_APP.slug,
            type: 'api',
            status: 'pending',
            status_label: 'Pending',
            version: 'latest',
            is_productive: false,
            requested_vcpu: '100m',
            requested_memory: '64Mi',
            limit_vcpu: '500m',
            limit_memory: '128Mi',
            min_replicas: 1,
            max_replicas: 2,
            url_registry: `${MOCK_APP.docker_image_base}:latest`,
            port: null,
            namespace: `user-apps-${MOCK_APP.slug}`,
            schedule: null,
            container_port: null,
            health_path: null,
            host: null,
            url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        return;
      }
      await route.fallback();
    });
    await page.goto('/scoops/new');
    await waitForApp(page);
    await page.getByRole('button', { name: 'Create Scoop' }).click();
    await expect(page).toHaveURL(/\/scoops\/99$/);

    // El backend autodefine application_id y url_registry.
    expect(createdPayload).toMatchObject({
      application_id: MOCK_APP.id,
      type: 'api',
    });
  });
});