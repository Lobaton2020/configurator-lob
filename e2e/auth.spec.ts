import { test, expect } from '@playwright/test';
import { mockBackend, seedSession, waitForApp } from './helpers';

test.describe('auth flow', () => {
  test('redirige a /login cuando no hay token', async ({ page }) => {
    await mockBackend(page, { user: null });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Inicia sesion para continuar')).toBeVisible();
  });

  test('muestra "Login no disponible" si el backend no tiene GOOGLE_CLIENT_ID', async ({ page }) => {
    await mockBackend(page, { user: null });
    await page.goto('/login');
    await expect(page.getByText('Login no disponible')).toBeVisible();
    await expect(page.getByText('Backend sin')).toBeVisible();
  });

  test('entra al scoops list cuando hay token valido + workspace + app', async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: 'Scoops' })).toBeVisible();
  });

  test('token invalido limpia el JWT y manda a /login', async ({ page }) => {
    await mockBackend(page, {
      errors: { '/auth/me': { status: 401, body: { error: 'invalid' } } },
    });
    await seedSession(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});