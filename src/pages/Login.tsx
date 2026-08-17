import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Leaf } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LandscapeBg } from '../components/LandscapeBg';

export function Login() {
  const { googleClientId, signInWithGoogle, loginRequired } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loginRequired) {
    // Si el backend dice que no requiere login, no pintamos el flujo.
    return null;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-950 px-4">
      <LandscapeBg />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl brand-gradient text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 ring-1 ring-white/20 mb-4">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">
            Laurel
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Inicia sesion para continuar
          </p>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800 shadow-xl shadow-indigo-500/10 p-8">
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
              <p className="text-amber-700 dark:text-amber-300 text-sm text-center">
                Backend sin <code>GOOGLE_CLIENT_ID</code> configurado.
              </p>
              <button
                disabled
                className="w-full px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm"
              >
                Login no disponible
              </button>
            </div>
          )}

          {busy && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">Verificando...</p>
          )}
          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
