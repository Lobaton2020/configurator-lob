import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertCircle, FolderKanban, Leaf, LogOut, Plus } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import { LandscapeBg } from '../components/LandscapeBg';

/**
 * Gate que exige un workspace seleccionado antes de mostrar las rutas hijas.
 * Si el usuario autenticado aun no ha elegido workspace, muestra la pantalla
 * de seleccion/creacion (estilo perfiles de streaming). La cabecera con logout
 * si se ve, el contenido de las rutas no.
 */
export function RequireWorkspace({ children }: { children?: ReactNode }) {
  const { ready, workspace, workspaces, selectWorkspace, createWorkspace, refreshWorkspaces } =
    useWorkspace();
  const { user, signOut } = useAuth();
  const { signOutWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Cargando...
      </div>
    );
  }

  if (workspace) {
    return <>{children ?? <Outlet />}</>;
  }

  const retry = () => {
    setListError(null);
    refreshWorkspaces().catch((e: unknown) =>
      setListError(e instanceof Error ? e.message : 'Error al cargar los workspaces')
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-black">
      <header className="h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-neutral-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl brand-gradient text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight tracking-tight">Laurel</h1>
            <p className="text-xs text-slate-400 leading-tight">Configurator</p>
          </div>
        </div>
        <button
          onClick={() => {
            signOutWorkspace();
            signOut();
          }}
          className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full px-3 py-1.5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </header>

      <main className="flex-1 relative overflow-hidden flex items-center justify-center px-4 py-8">
        <LandscapeBg />
        <div className="relative z-10 w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl brand-gradient text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 ring-1 ring-white/20 mx-auto mb-4">
              <FolderKanban className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">
              Selecciona tu workspace
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {workspaces.length === 0
                ? `Hola, ${user?.name || user?.email || ''}. Crea tu primer workspace para empezar.`
                : 'Elige uno de tus workspaces o crea uno nuevo.'}
            </p>
          </div>

          <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800 shadow-xl shadow-indigo-500/10 p-6">
            {listError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{listError}</span>
                <button onClick={retry} className="font-medium underline">
                  Reintentar
                </button>
              </div>
            )}

            {workspaces.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  Aun no tienes ningun workspace. Agrupa tus apps, scoops y dominios por
                  proyecto o entorno.
                </p>
                <button onClick={() => setCreating(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Crear mi primer workspace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => selectWorkspace(w)}
                    className="text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#1a73e8] hover:shadow-md transition-all p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 shrink-0 rounded-xl brand-gradient text-white flex items-center justify-center">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-white truncate">
                          {w.name}
                        </div>
                        <code className="text-xs text-slate-400">{w.slug}</code>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {w.description || 'Sin descripcion'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">{w.apps_count} apps</p>
                  </button>
                ))}
                <button
                  onClick={() => setCreating(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-[#1a73e8] hover:text-[#1a73e8] transition-all flex flex-col items-center justify-center gap-2 p-4 text-slate-500 dark:text-slate-400 min-h-[9rem]"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Crear nuevo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {creating && (
        <CreateWorkspaceModal onClose={() => setCreating(false)} onCreate={createWorkspace} />
      )}
    </div>
  );
}