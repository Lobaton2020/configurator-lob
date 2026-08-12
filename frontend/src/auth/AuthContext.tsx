/**
 * Contexto de autenticacion del front.
 *
 * Flujo:
 *   1. Boot: GET /api/auth/config para conocer el GOOGLE_CLIENT_ID y si la
 *      pantalla de login es obligatoria.
 *   2. LoginScreen usa <GoogleLogin>; al obtener el credential pasa por
 *      authApi.googleLogin(credential) -> JWT propio -> localStorage.
 *   3. useAuth() expone {user, signInWithGoogle, signOut, ready} a la app.
 *   4. apiFetchers en src/api/laurel.ts inyectan Authorization y manejan 401.
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
import { useNavigate, useLocation } from 'react-router-dom';
import { laurelFetch } from '../api/laurel';

export interface AuthUser {
  sub: string;
  email: string | null;
  name: string | null;
  picture_url?: string | null;
}

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  googleClientId: string;
  loginRequired: boolean;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => string | null;
}

const TOKEN_KEY = 'laurel.jwt';

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenStore() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [loginRequired, setLoginRequired] = useState(true);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const store = tokenStore();
    const token = store?.getItem(TOKEN_KEY) ?? null;
    (async () => {
      try {
        const cfg = await laurelFetch<{ google_client_id: string; login_required: boolean }>(
          '/auth/config',
          { handleUnauthorized: false }
        );
        setGoogleClientId(cfg.google_client_id ?? '');
        setLoginRequired(cfg.login_required ?? true);
      } catch {
        // offline / server caido: seguir sin saber si hay que loguear.
      }
      if (token) {
        try {
          const me = await laurelFetch<{ user: AuthUser }>('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
            handleUnauthorized: false,
          });
          setUser(me.user);
        } catch {
          // token invalido o expirado: limpiar.
          try { store?.removeItem(TOKEN_KEY); } catch { /* noop */ }
        }
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback((token: string | null) => {
    const store = tokenStore();
    if (!store) return;
    if (token) store.setItem(TOKEN_KEY, token);
    else store.removeItem(TOKEN_KEY);
  }, []);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const resp = await laurelFetch<{
        token: string;
        expires_at: string;
        user: AuthUser;
      }>('/auth/google', {
        method: 'POST',
        body: { credential: idToken },
        handleUnauthorized: false,
      });
      persist(resp.token);
      setUser({
        sub: resp.user.sub,
        email: resp.user.email,
        name: resp.user.name,
        picture_url: resp.user.picture_url,
      });
      const next = new URLSearchParams(location.search).get('next') || '/scoops';
      navigate(next, { replace: true });
    },
    [persist, navigate, location.search]
  );

  const signOut = useCallback(async () => {
    const store = tokenStore();
    const token = store?.getItem(TOKEN_KEY) ?? null;
    if (token) {
      try {
        await laurelFetch('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          handleUnauthorized: false,
        });
      } catch {
        /* offline: no importa */
      }
    }
    persist(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [persist, navigate]);

  const getToken = useCallback(() => {
    return tokenStore()?.getItem(TOKEN_KEY) ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, user, googleClientId, loginRequired, signInWithGoogle, signOut, getToken }),
    [ready, user, googleClientId, loginRequired, signInWithGoogle, signOut, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
