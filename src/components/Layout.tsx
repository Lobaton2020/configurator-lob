import { useState, useEffect, type ReactNode, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Settings, FileText, ChevronDown, ChevronRight, Moon, Sun, Box, Server, LogOut, Menu, X, Leaf, LayoutDashboard, Clock, FileCog, KeyRound } from 'lucide-react';

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
        ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-300'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  const sectionToggle = () =>
    `flex items-center justify-between w-full px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-slate-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 ${
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
              <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
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
                  Config Store
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

          <Link to="/secrets" className={navItem('/secrets', true)}>
            <KeyRound className="w-5 h-5" />
            Secretos del sistema
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 gap-3">
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
              className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full px-2 py-1.5 transition-colors"
            >
              <span className="hidden sm:block truncate max-w-[14rem] font-medium" title={user?.email || ''}>
                {user?.name || user?.email || 'Sesion'}
              </span>
              <span className="w-9 h-9 rounded-full brand-gradient text-white text-xs font-semibold flex items-center justify-center shadow-sm select-none">
                {initialsOf(user?.name, user?.email)}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg py-2 z-50">
                <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || ''}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { setDarkMode(!darkMode); setUserMenuOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>
        </header>

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
