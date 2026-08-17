import { useState, useEffect, type ReactNode, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../auth/WorkspaceContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { Settings, FileText, ChevronDown, ChevronRight, Moon, Sun, Box, Server, LogOut, Menu, X, Leaf, LayoutDashboard, Clock, FileCog, KeyRound, AppWindow, Globe, FolderKanban, Check, Plus } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

function initialsOf(name?: string | null, email?: string | null): string {
  const src = name || email || '?';
  const parts = src.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
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
  const { user, signOut } = useAuth();
  const { workspace, workspaces, selectWorkspace, createWorkspace, signOutWorkspace } =
    useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const navItem = (to: string, exact: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${
      (exact ? location.pathname === to : location.pathname.startsWith(to))
        ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-neutral-900 dark:text-neutral-50'
        : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900'
    }`;

  const sectionToggle = () =>
    `flex items-center justify-between w-full px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#0b120d]">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-white dark:bg-[#0b120d] border-r border-slate-200/80 dark:border-neutral-900 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 ${
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
                <Link to="/apps" className={navItem('/apps', false)}>
                  <AppWindow className="w-5 h-5" />
                  Apps
                </Link>
                <Link to="/domains" className={navItem('/domains', false)}>
                  <Globe className="w-5 h-5" />
                  Domains
                </Link>
                <Link to="/scoops" className={navItem('/scoops', false)}>
                  <Box className="w-5 h-5" />
                  Scoops
                </Link>
                <Link to="/scoops/new" className={navItem('/scoops/new', true)}>
                  <Box className="w-5 h-5" />
                  New Scoop
                </Link>
                <Link to="/configstore" className={navItem('/configstore', true)}>
                  <FileCog className="w-5 h-5" />
                  Configs
                </Link>
                <Link to="/secrets" className={navItem('/secrets', false)}>
                  <KeyRound className="w-5 h-5" />
                  Secrets
                </Link>
                <Link to="/audits" className={navItem('/audits', true)}>
                  <Clock className="w-5 h-5" />
                  Audits
                </Link>
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
        <header className="h-16 bg-white dark:bg-[#0b120d] border-b border-slate-200/80 dark:border-neutral-900 flex items-center justify-between px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative ml-auto" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full px-3 py-1.5 transition-colors"
              title="Workspace activo"
            >
              <FolderKanban className="w-4 h-4 text-[#1a73e8]" />
              <span className="hidden sm:block font-semibold truncate max-w-[14rem]">
                {workspace?.name ?? 'Sin workspace'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
              <span className="w-8 h-8 rounded-full brand-gradient text-white text-xs font-semibold flex items-center justify-center shadow-sm select-none">
                {initialsOf(user?.name, user?.email)}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#101813] border border-slate-200 dark:border-[#1d2a22] rounded-2xl shadow-lg py-2 z-50">
                <div className="px-4 py-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Workspace activo
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {workspace?.name ?? 'Ninguno'}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-[#1d2a22] my-1" />
                <div className="max-h-64 overflow-y-auto px-1">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        selectWorkspace(w);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        workspace?.id === w.id
                          ? 'text-[#1a73e8] font-medium'
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
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-[#1a73e8] rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo workspace
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-[#1d2a22] my-1" />
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
