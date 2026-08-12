import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Leaf } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { googleClientId, signInWithGoogle, loginRequired } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loginRequired) {
    // Si el backend dice que no requiere login, no pintamos el flujo.
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Backoffice Laurel
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Inicia sesion para continuar
        </p>

        {googleClientId ? (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (resp) => {
                if (!resp.credential) {
                  setError('Google no devolvio un id_token');
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  await signInWithGoogle(resp.credential);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Error desconocido');
                  setBusy(false);
                }
              }}
              onError={() => setError('Login con Google cancelado o fallido')}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              Backend sin <code>GOOGLE_CLIENT_ID</code> configurado.
            </p>
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm"
            >
              Login no disponible
            </button>
          </div>
        )}

        {busy && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Verificando...</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
