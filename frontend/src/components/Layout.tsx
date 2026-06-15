import { useState, useEffect, type ReactNode, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { LayoutDashboard, Settings, FileText, ClipboardList, ChevronDown, ChevronRight, Folder, User, Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [_schemas, _setSchemas] = useState<Schema[]>([]);
  const [configuratorOpen, setConfiguratorOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSchemas().then(_setSchemas).catch(console.error);
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="w-64 bg-slate-800 dark:bg-slate-950 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-slate-300" />
            <h1 className="text-xl font-bold">Backoffice Lob</h1>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                location.pathname === '/'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
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
                <Link
                  to="/schemas"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    location.pathname === '/schemas'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Schemas
                </Link>
                <Link
                  to="/audits"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    location.pathname === '/audits'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  Audits
                </Link>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
        <header className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-end items-center px-4">
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => {
                console.log('click admin', userMenuOpen);
                setUserMenuOpen(!userMenuOpen);
              }} 
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white px-2 py-1"
            >
              <User className="w-4 h-4" />
              <span>Admin</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-2 z-50">
                <button 
                  onClick={() => { 
                    console.log('click toggle dark');
                    setDarkMode(!darkMode); 
                    setUserMenuOpen(false); 
                  }} 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto flex flex-col">
            <div className="flex-1">{children}</div>
            <footer className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              Backoffice Lob v1.0 · Configurator
            </footer>
          </main>
        </div>
      </div>
  );
}