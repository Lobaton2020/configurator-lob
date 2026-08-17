/**
 * Contexto del workspace activo.
 *
 * Tras el login carga la lista de workspaces del usuario y preselecciona el
 * guardado en localStorage (`laurel.workspace`). Al hacer logout (o cambiar
 * de usuario) se limpia la seleccion para que se vuelva a exigir.
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
import { type Workspace, workspacesApi } from '../api/workspaces';

interface WorkspaceContextValue {
  ready: boolean;
  workspace: Workspace | null;
  workspaces: Workspace[];
  selectWorkspace: (ws: Workspace | null) => void;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
  signOutWorkspace: () => void;
}

const WS_KEY = 'laurel.workspace';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function wsStore() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // key por user.sub: al loguear/logout/limpiar se remonta el estado limpio
  // y el gate vuelve a exigir workspace sin sincronizar estado en effects.
  return <WorkspaceState key={user?.sub ?? null}>{children}</WorkspaceState>;
}

function WorkspaceState({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  // Montaje: carga lista + preseleccion desde localStorage.
  useEffect(() => {
    if (!user) return;
    const store = wsStore();
    const storedId = Number(store?.getItem(WS_KEY));
    let cancelled = false;
    workspacesApi
      .list(1, 100)
      .then((data) => {
        if (cancelled) return;
        setWorkspaces(data.items);
        setWorkspace(
          Number.isFinite(storedId)
            ? data.items.find((w) => w.id === storedId) ?? null
            : null
        );
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectWorkspace = useCallback((ws: Workspace | null) => {
    setWorkspace(ws);
    const store = wsStore();
    if (!store) return;
    if (ws) store.setItem(WS_KEY, String(ws.id));
    else store.removeItem(WS_KEY);
  }, []);

  const signOutWorkspace = useCallback(() => {
    const store = wsStore();
    try { store?.removeItem(WS_KEY); } catch { /* noop */ }
    setWorkspace(null);
    setWorkspaces([]);
    setReady(true);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const data = await workspacesApi.list(1, 100);
    setWorkspaces(data.items);
    setWorkspace((cur) =>
      cur ? data.items.find((w) => w.id === cur.id) ?? null : null
    );
  }, []);

  const createWorkspace = useCallback(
    async (data: { name: string; description?: string }) => {
      const created = await workspacesApi.create(data);
      setWorkspaces((prev) => [...prev, created]);
      selectWorkspace(created);
      return created;
    },
    [selectWorkspace]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      workspace,
      workspaces,
      selectWorkspace,
      createWorkspace,
      refreshWorkspaces,
      signOutWorkspace,
    }),
    [ready, workspace, workspaces, selectWorkspace, createWorkspace, refreshWorkspaces, signOutWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace debe usarse dentro de <WorkspaceProvider>');
  return ctx;
}