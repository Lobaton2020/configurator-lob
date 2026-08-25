import { test, expect } from '@playwright/test';
import { mockBackend, seedSession, waitForApp } from './helpers';

test.describe('Layout & navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
  });

  test('sidebar muestra todas las secciones', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    await expect(aside.getByText('Dashboard')).toBeVisible();
    await expect(aside.getByText('Configurator')).toBeVisible();
    await expect(aside.getByText('Schemas')).toBeVisible();
    await expect(aside.getByText('Scoops')).toBeVisible();
    await expect(aside.getByText('Apps')).toBeVisible();
    await expect(aside.getByText('Cluster')).toBeVisible();
  });

  test('el header muestra la app activa', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByRole('button', { name: /Notas Test/i })).toBeVisible();
  });

  test('links del sidebar navegan', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    await page.getByRole('link', { name: 'Schemas' }).click();
    await expect(page).toHaveURL(/\/schemas$/);
    await page.getByRole('link', { name: 'Apps' }).click();
    await expect(page).toHaveURL(/\/apps$/);
    await page.getByRole('link', { name: 'Cluster' }).click();
    await expect(page).toHaveURL(/\/cluster$/);
  });

  test('toggle de dark mode persiste en localStorage', async ({ page }) => {
    await page.goto('/scoops');
    await waitForApp(page);
    const header = page.locator('header');
    await header.getByRole('button').last().click();
    await page.getByRole('button', { name: /Dark Mode|Light Mode/ }).click();
    const stored = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(stored).toBeTruthy();
  });

  test('requiere app para acceder a /scoops (gate)', async ({ page }) => {
    // Seed sin app
    await seedSession(page);
    await page.evaluate(() => localStorage.removeItem('laurel.app'));
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByText('Selecciona tu app')).toBeVisible();
  });

  test('requiere workspace para acceder a /scoops (gate)', async ({ page }) => {
    await seedSession(page);
    await page.evaluate(() => localStorage.removeItem('laurel.workspace'));
    await page.goto('/scoops');
    await waitForApp(page);
    await expect(page.getByText('Selecciona tu workspace')).toBeVisible();
  });
});