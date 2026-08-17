/**
 * Contexto de la app activa.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { type Application, type ApplicationCreate, appsApi } from '../api/apps';

interface AppContextValue {
  ready: boolean;
  app: Application | null;
  apps: Application[];
  selectApp: (a: Application | null) => void;
  createApp: (data: ApplicationCreate) => Promise<Application>;
  refreshApps: () => Promise<void>;
  signOutApp: () => void;
}

const APP_KEY = 'laurel.app';

const AppContext = createContext<AppContextValue | null>(null);

function appStore() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  return (
    <AppState key={`${user?.sub ?? 'anon'}:${workspace?.id ?? 'none'}`}>
      {children}
    </AppState>
  );
}

function AppState({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [app, setApp] = useState<Application | null>(null);

  const wsId = workspace?.id;
  useEffect(() => {
    if (!user) return;
    const store = appStore();
    const storedId = Number(store?.getItem(APP_KEY));
    let cancelled = false;
    const req = wsId !== undefined
      ? appsApi.list({ page: 1, limit: 200, workspace_id: wsId })
      : appsApi.list({ page: 1, limit: 200 });
    req
      .then((data) => {
        if (cancelled) return;
        setApps(data.items);
        setApp(
          Number.isFinite(storedId)
            ? data.items.find((a) => a.id === storedId) ?? null
            : null
        );
      })
      .catch(() => {
        if (!cancelled) setApps([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.sub, wsId]);

  const selectApp = useCallback((a: Application | null) => {
    setApp(a);
    const store = appStore();
    if (!store) return;
    if (a) store.setItem(APP_KEY, String(a.id));
    else store.removeItem(APP_KEY);
  }, []);

  const signOutApp = useCallback(() => {
    const store = appStore();
    try { store?.removeItem(APP_KEY); } catch { /* noop */ }
    setApp(null);
    setApps([]);
    setReady(true);
  }, []);

  const refreshApps = useCallback(async () => {
    const req = wsId !== undefined
      ? appsApi.list({ page: 1, limit: 200, workspace_id: wsId })
      : appsApi.list({ page: 1, limit: 200 });
    const data = await req;
    setApps(data.items);
    setApp((cur) =>
      cur ? data.items.find((a) => a.id === cur.id) ?? null : null
    );
  }, [wsId]);

  const createApp = useCallback(
    async (data: ApplicationCreate) => {
      const created = await appsApi.create(
        wsId !== undefined ? { ...data, workspace_id: wsId } : data
      );
      setApps((prev) => [...prev, created]);
      selectApp(created);
      return created;
    },
    [selectApp, wsId]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      app,
      apps,
      selectApp,
      createApp,
      refreshApps,
      signOutApp,
    }),
    [ready, app, apps, selectApp, createApp, refreshApps, signOutApp]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
