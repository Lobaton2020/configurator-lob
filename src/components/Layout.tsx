import { useState, useEffect, type ReactNode, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LayoutDashboard, Settings, FileText, Clock, ChevronDown, ChevronRight, User, Moon, Sun, Box, Server, LogOut, Menu, X, Leaf } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
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

  const sidebarLink = (to: string, exact: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      (exact ? location.pathname === to : location.pathname.startsWith(to))
        ? 'bg-slate-700 text-white'
        : 'text-slate-300 hover:bg-slate-700'
    }`;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-slate-800 dark:bg-slate-950 text-white flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-slate-300" />
            <h1 className="text-xl font-bold">Backoffice Laurel</h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-700 text-slate-300"
            aria-label="Cerrar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <Link to="/" className={sidebarLink('/', true)}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          <div className="mb-2">
            <button
              onClick={() => setConfiguratorOpen(!configuratorOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Configurator</span>
              </div>
              {configuratorOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {configuratorOpen && (
              <div className="ml-2 mt-1 space-y-1">
                <Link to="/schemas" className={sidebarLink('/schemas', true)}>
                  <FileText className="w-4 h-4" />
                  Schemas
                </Link>
              </div>
            )}
          </div>

          <div className="mb-2">
            <button
              onClick={() => setScoopsOpen(!scoopsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                <span>Scoops</span>
              </div>
              {scoopsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {scoopsOpen && (
              <div className="ml-2 mt-1 space-y-1">
                <Link to="/scoops" className={sidebarLink('/scoops', false)}>
                  <Box className="w-4 h-4" />
                  Scoops
                </Link>
                <Link to="/scoops/new" className={sidebarLink('/scoops/new', true)}>
                  <Box className="w-4 h-4" />
                  New Scoop
                </Link>
                <Link to="/audits" className={sidebarLink('/audits', true)}>
                  <Clock className="w-4 h-4" />
                  Audits
                </Link>
              </div>
            )}
          </div>

          <div className="mb-4">
            <Link to="/cluster" className={sidebarLink('/cluster', true)}>
              <Server className="w-4 h-4" />
              Cluster
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
        <header className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white px-2 py-1"
            >
              <User className="w-4 h-4" />
              <span className="truncate max-w-[14rem]" title={user?.email || ''}>
                {user?.name || user?.email || 'Sesion'}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-2 z-50">
                <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || ''}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                <button
                  onClick={() => { setDarkMode(!darkMode); setUserMenuOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
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
          <footer className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            Backoffice Laurel v1.0 · Configurator
          </footer>
        </main>
      </div>
    </div>
  );
}