import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertCircle, AppWindow, FolderKanban, Leaf, LogOut, Plus } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { useApp } from './AppContext';
import { CreateAppModal } from '../components/CreateAppModal';
import { LandscapeBg } from '../components/LandscapeBg';
import type { Application } from '../api/apps';

export function RequireApp({ children }: { children?: ReactNode }) {
  const { ready, app, apps, createApp, refreshApps, selectApp } = useApp();
  const { workspace, signOutWorkspace } = useWorkspace();
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Cargando...
      </div>
    );
  }

  if (app) {
    return <>{children ?? <Outlet />}</>;
  }

  const retry = () => {
    setListError(null);
    refreshApps().catch((e: unknown) =>
      setListError(e instanceof Error ? e.message : 'Error al cargar las apps')
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
          {workspace && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-3 pl-3 border-l border-slate-200 dark:border-neutral-800">
              <FolderKanban className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span className="truncate max-w-[14rem]">{workspace.name}</span>
            </span>
          )}
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
              <AppWindow className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">
              Selecciona tu app
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {apps.length === 0
                ? `Hola, ${user?.name || user?.email || ''}. Crea tu primera app para empezar.`
                : 'Elige una de tus apps o crea una nueva para acceder a scoops, dominios, configs y secretos.'}
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

            {apps.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  Aun no tienes ninguna app. Cada app vive en su propio namespace
                  y agrupa sus scoops y dominios.
                </p>
                <button onClick={() => setCreating(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Crear mi primera app
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {apps.map((a) => (
                  <AppCard key={a.id} app={a} onSelect={selectApp} />
                ))}
                <button
                  onClick={() => setCreating(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-[#1a73e8] hover:text-[#1a73e8] transition-all flex flex-col items-center justify-center gap-2 p-4 text-slate-500 dark:text-slate-400 min-h-[9rem]"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Crear nueva</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {creating && (
        <CreateAppModal onClose={() => setCreating(false)} onCreate={createApp} />
      )}
    </div>
  );
}

function AppCard({ app, onSelect }: { app: Application; onSelect: (a: Application) => void }) {
  return (
    <button
      onClick={() => onSelect(app)}
      className="text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#1a73e8] hover:shadow-md transition-all p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 shrink-0 rounded-xl brand-gradient text-white flex items-center justify-center">
          <AppWindow className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 dark:text-white truncate">
            {app.name}
          </div>
          <code className="text-xs text-slate-400">{app.slug}</code>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
        {app.description || 'Sin descripcion'}
      </p>
      <p className="text-[11px] text-slate-400 mt-2">
        {app.scoops_count} scoops · {app.domains_count} dominios
      </p>
    </button>
  );
}
