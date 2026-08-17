import { useState, useEffect, type ReactNode, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../auth/WorkspaceContext';
import { useApp } from '../auth/AppContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { Settings, FileText, ChevronDown, ChevronRight, Moon, Sun, Box, Server, LogOut, Menu, X, Leaf, LayoutDashboard, Clock, FileCog, AppWindow, Globe, FolderKanban, Check, Plus } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

function initialsOf(name?: string | null, email?: string | null): string {
  const src = name || email || '?';
  const parts = src.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const REQUIRES_APP_TOOLTIP = 'Selecciona una app';

/** Item de sidebar: si `requiresApp` y no hay app activa, queda deshabilitado
 *  con tooltip explicativo, en vez de Link. */
function SidebarItem({
  to,
  exact,
  className,
  requiresApp,
  hasApp,
  children,
}: {
  to: string;
  exact: boolean;
  className: string;
  requiresApp: boolean;
  hasApp: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  const disabled = requiresApp && !hasApp;
  if (disabled) {
    return (
      <span
        title={REQUIRES_APP_TOOLTIP}
        aria-disabled="true"
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium opacity-50 cursor-not-allowed text-slate-600 dark:text-neutral-400"
      >
        {children}
      </span>
    );
  }
  // Cuando esta activo, no necesitamos clases de hover; en estado normal, si.
  const withActive = active
    ? className
    : className;
  void withActive;
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [_schemas, _setSchemas] = useState<Schema[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configuratorOpen, setConfiguratorOpen] = useState(true);
  const [scoopsOpen, setScoopsOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { workspace, workspaces, selectWorkspace, createWorkspace, signOutWorkspace } =
    useWorkspace();
  const { app, apps, ready: appReady, selectApp } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const hasApp = !!app;

  const userMenuRef = useRef<HTMLDivElement>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSchemas().then(_setSchemas).catch(console.error);
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Cierra el drawer al navegar (mobile).
  useEffect(() => {
    const id = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!appMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (appMenuRef.current && !appMenuRef.current.contains(e.target as Node)) {
        setAppMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [appMenuOpen]);

  const navItem = (to: string, exact: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${
      (exact ? location.pathname === to : location.pathname.startsWith(to))
        ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-neutral-900 dark:text-neutral-50'
        : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900'
    }`;

  const sectionToggle = () =>
    `flex items-center justify-between w-full px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-black">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-white dark:bg-black border-r border-slate-200/80 dark:border-neutral-900 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl brand-gradient text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight">Laurel</h1>
              <p className="text-xs text-slate-400 leading-tight">Configurator</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <Link to="/" className={navItem('/', true)}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <div>
            <button
              onClick={() => setConfiguratorOpen(!configuratorOpen)}
              className={sectionToggle()}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span>Configurator</span>
              </div>
              {configuratorOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {configuratorOpen && (
              <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                <Link to="/schemas" className={navItem('/schemas', true)}>
                  <FileText className="w-5 h-5" />
                  Schemas
                </Link>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setScoopsOpen(!scoopsOpen)}
              className={sectionToggle()}
            >
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5" />
                <span>Scoops</span>
              </div>
              {scoopsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {scoopsOpen && (
              <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 dark:border-neutral-800 pl-3">
                <SidebarItem to="/apps" exact={false} className={navItem('/apps', false)} requiresApp={false} hasApp={hasApp}>
                  <AppWindow className="w-5 h-5" />
                  Apps
                </SidebarItem>
                <SidebarItem to="/domains" exact={false} className={navItem('/domains', false)} requiresApp hasApp={hasApp}>
                  <Globe className="w-5 h-5" />
                  Domains
                </SidebarItem>
                <SidebarItem to="/scoops" exact={false} className={navItem('/scoops', false)} requiresApp hasApp={hasApp}>
                  <Box className="w-5 h-5" />
                  Scoops
                </SidebarItem>
                <SidebarItem to="/configstore" exact className={navItem('/configstore', true)} requiresApp hasApp={hasApp}>
                  <FileCog className="w-5 h-5" />
                  Configs & Secrets
                </SidebarItem>
                <SidebarItem to="/audits" exact className={navItem('/audits', true)} requiresApp={false} hasApp={hasApp}>
                  <Clock className="w-5 h-5" />
                  Audits
                </SidebarItem>
              </div>
            )}
          </div>

          <Link to="/cluster" className={navItem('/cluster', true)}>
            <Server className="w-5 h-5" />
            Cluster
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-black border-b border-slate-200/80 dark:border-neutral-900 flex items-center justify-between px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {appReady && workspace && (
              <div className="relative" ref={appMenuRef}>
                <button
                  onClick={() => setAppMenuOpen(!appMenuOpen)}
                  title="Cambiar app"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 dark:hover:bg-emerald-950/60 transition-colors"
                >
                  <AppWindow className="w-3.5 h-3.5" />
                  {app ? (
                    <>
                      <span className="truncate max-w-[12rem]">{app.name}</span>
                      <code className="opacity-70">{app.slug}</code>
                    </>
                  ) : (
                    <span>Seleccionar app</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                {appMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg py-2 z-50">
                    <div className="px-4 py-2">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                        App activa
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {app?.name ?? 'Ninguna'}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <div className="max-h-64 overflow-y-auto px-1">
                      {apps.length === 0 && (
                        <div className="px-3 py-3 text-xs text-slate-500">
                          No hay apps en este workspace.
                        </div>
                      )}
                      {apps.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            selectApp(a);
                            setAppMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ${
                            app?.id === a.id
                              ? 'bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{a.name}</span>
                            <code className="text-xs text-slate-400">{a.slug}</code>
                          </span>
                          {app?.id === a.id && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <div className="px-1">
                      <button
                        onClick={() => {
                          setAppMenuOpen(false);
                          navigate('/apps');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 rounded-xl"
                      >
                        <Plus className="w-4 h-4" />
                        Nueva app
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full px-3 py-1.5 transition-colors border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/40"
              title="Workspace activo"
            >
              <FolderKanban className="w-4 h-4" />
              <span className="hidden sm:block font-semibold truncate max-w-[14rem]">
                {workspace?.name ?? 'Sin workspace'}
              </span>
              <ChevronDown className="w-4 h-4 opacity-70" />
              <span className="w-8 h-8 rounded-full brand-gradient text-white text-xs font-semibold flex items-center justify-center shadow-sm select-none">
                {initialsOf(user?.name, user?.email)}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg py-2 z-50">
                <div className="px-4 py-2">
                  <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Workspace activo
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {workspace?.name ?? 'Ninguno'}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <div className="max-h-64 overflow-y-auto px-1">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        selectWorkspace(w);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 ${
                        workspace?.id === w.id
                          ? 'bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{w.name}</span>
                        <code className="text-xs text-slate-400">{w.slug}</code>
                      </span>
                      {workspace?.id === w.id && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="px-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setCreateOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 text-blue-700 dark:text-blue-300 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo workspace
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || ''}
                </div>
                <button
                  onClick={() => { setDarkMode(!darkMode); setUserMenuOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); signOutWorkspace(); signOut(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>
        </header>

        {createOpen && (
          <CreateWorkspaceModal onClose={() => setCreateOpen(false)} onCreate={createWorkspace} />
        )}

        <main className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Laurel v1.0 · Configurator
          </footer>
        </main>
      </div>
    </div>
  );
}
