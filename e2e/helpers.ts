import { test, expect } from '@playwright/test';

export const FAKE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXN1YiIsImVtYWlsIjoiYW5kcmVzQGV4YW1wbGUuY29tIiwibmFtZSI6IkFuZHJlcyIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test';

export const MOCK_USER = {
  sub: 'test-sub',
  email: 'andres@example.com',
  name: 'Andres Lobaton',
};

export const MOCK_WORKSPACE = {
  id: 1,
  name: 'Produccion',
  slug: 'produccion',
  description: 'Workspace de pruebas e2e',
  owner_sub: 'test-sub',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  apps_count: 1,
};

export const MOCK_APP = {
  id: 29,
  name: 'Notas Test',
  slug: 'notas-test',
  description: 'App de pruebas e2e',
  github_repo_url: null,
  docker_image_base: 'ghcr.io/andreslobaton/notas-test',
  current_version: '0.0.1',
  scoops_count: 1,
  domains_count: 0,
  namespace: 'user-apps-notas-test',
  workspace_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const MOCK_SCOOP_DTO = {
  id: 32,
  name: 'web-app',
  application: 'notas-test',
  type: 'api',
  status: 'active',
  status_label: 'Active',
  version: '0.0.1',
  is_productive: true,
  requested_vcpu: '100m',
  requested_memory: '64Mi',
  limit_vcpu: '500m',
  limit_memory: '128Mi',
  min_replicas: 1,
  max_replicas: 2,
  url_registry: 'ghcr.io/andreslobaton/notas-test:0.0.1',
  port: 30080,
  namespace: 'user-apps-notas-test',
  schedule: null,
  container_port: 8080,
  health_path: '/healthz',
  host: null,
  url: null,
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

export const MOCK_SCOOP_LIST = {
  items: [MOCK_SCOOP_DTO],
  total: 1,
  page: 1,
  limit: 200,
  pages: 1,
};

/**
 * Inyecta JWT, workspace y app en localStorage antes de navegar. Asi el
 * AuthContext hace boot con token valido y los providers de workspace/app
 * arrancan ya preseleccionados.
 */
export async function seedSession(
  page: import('@playwright/test').Page,
  opts: { token?: string; workspace?: typeof MOCK_WORKSPACE; app?: typeof MOCK_APP } = {},
) {
  const token = opts.token ?? FAKE_JWT;
  await page.addInitScript(({ token, workspace, app }) => {
    window.localStorage.setItem('laurel.jwt', token);
    if (workspace) window.localStorage.setItem('laurel.workspace', String(workspace.id));
    if (app) window.localStorage.setItem('laurel.app', String(app.id));
  }, { token, workspace: opts.workspace, app: opts.app });
}

/**
 * Mockea todos los endpoints del backend que el front llama durante el boot
 * y la navegacion. Devuelve lo justo para que AuthProvider/Workspace/App
 * terminen en estado `ready` con los datos que pasamos.
 *
 * Cualquier ruta no mockeada recibe 404 para que un test nuevo no pase
 * silenciosamente por datos fantasma.
 */
export function mockBackend(
  page: import('@playwright/test').Page,
  opts: {
    loginRequired?: boolean;
    user?: typeof MOCK_USER | null;
    workspaces?: typeof MOCK_WORKSPACE[];
    apps?: typeof MOCK_APP[];
    scoops?: typeof MOCK_SCOOP_LIST;
    /** Errores custom por path para tests negativos. */
    errors?: Record<string, { status: number; body: unknown }>;
  } = {},
) {
  const {
    loginRequired = true,
    user = MOCK_USER,
    workspaces = [MOCK_WORKSPACE],
    apps = [MOCK_APP],
    scoops = MOCK_SCOOP_LIST,
    errors = {},
  } = opts;

  page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = route.request().method();

    const fail = errors[`${method} ${path}`] ?? errors[path];
    if (fail) {
      await route.fulfill({
        status: fail.status,
        contentType: 'application/json',
        body: JSON.stringify(fail.body),
      });
      return;
    }

    // Boot
    if (path === '/auth/config' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google_client_id: '', login_required: loginRequired }),
      });
      return;
    }
    if (path === '/auth/me' && method === 'GET') {
      if (user) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user }),
        });
      } else {
        await route.fulfill({ status: 401, body: '{"error":"no auth"}' });
      }
      return;
    }

    // Workspaces / apps (boot)
    if (path === '/workspaces' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: workspaces,
          total: workspaces.length,
          page: 1,
          limit: 100,
          pages: 1,
        }),
      });
      return;
    }
    if (path === '/apps' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: apps,
          total: apps.length,
          page: 1,
          limit: 200,
          pages: 1,
        }),
      });
      return;
    }

    // Configurator (Layout hace api.getSchemas en mount)
    if (path === '/schemas' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    // Scoops
    if (path === '/scoops' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scoops),
      });
      return;
    }
    if (path.match(/^\/scoops\/\d+$/) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCOOP_DTO),
      });
      return;
    }

    // Por defecto: 404 explicito
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: `mockBackend: ruta no mockeada: ${method} ${path}` }),
    });
  });
}

/**
 * Espera a que el splash de "Cargando..." desaparezca y el layout principal
 * esté en pantalla.
 */
export async function waitForApp(page: import('@playwright/test').Page) {
  await expect(page.locator('text=Cargando...')).toHaveCount(0, { timeout: 10_000 });
}