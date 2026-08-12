import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
}

/**
 * Gate que protege rutas: si no hay usuario redirige a /login?next=<ruta actual>.
 * Mientras `AuthContext.ready` es false (boot) muestra un loader para no
 * parpadear la pagina de login al refrescar.
 */
export function RequireAuth({ children }: Props) {
  const { ready, user } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Cargando...
      </div>
    );
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
