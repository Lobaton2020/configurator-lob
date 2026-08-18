import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Tag } from 'lucide-react';
import { ApiError } from '../api/laurel';
import { versionsApi, type NextVersionResponse } from '../api/builds';

interface NextVersionBadgeProps {
  /** Slug de la app. Se usa para construir la ruta /api/apps/<slug>/next_version. */
  slug: string;
  /**
   * Cuando es true, el badge se re-fetchea automaticamente cada 30s y
   * al recibir focus. Mantenerlo asi para que el operador vea la version
   * que el backend ya computo a partir del push anterior.
   */
  autoRefresh?: boolean;
}

/**
 * Badge de solo lectura con la proxima version que el pipeline usara.
 *
 * Regla de oro: el operador NUNCA edita este valor. Es 100% backend.
 * Si el operador lo necesitara, lo pide al endpoint y lo muestra tal
 * cual. El trigger de build usa la version del backend, no una
 * local.
 */
export function NextVersionBadge({ slug, autoRefresh = true }: NextVersionBadgeProps) {
  const [data, setData] = useState<NextVersionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await versionsApi.next(slug);
      setData(r);
      setError(null);
      setErrorReason(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setErrorReason(e.reason ?? null);
      } else {
        setError(e instanceof Error ? e.message : 'Error desconocido');
        setErrorReason(null);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false;
    setLoading(true);
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (!cancelled) void load();
    }, 30_000);
    const onFocus = () => {
      if (!cancelled) void load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, autoRefresh]);

  if (loading && !data && !error) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Calculando proxima version desde Docker Hub...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-700 dark:text-red-400">
            No se pudo calcular la proxima version.
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {errorReason === 'invalid_slug' && 'El slug no cumple el formato esperado.'}
            {errorReason === 'dockerhub_unconfigured' &&
              'El backend no tiene credenciales de Docker Hub configuradas.'}
            {errorReason === 'dockerhub_error' &&
              'Docker Hub rechazo la consulta. Reintentando en 30s.'}
            {!errorReason && error}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-secondary btn-sm shrink-0"
          aria-label="Reintentar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
          Proxima version (auto)
        </span>
        <span
          className="badge badge-blue font-mono"
          aria-readonly="true"
          data-testid="next-version"
          title="Calculada por el backend desde los tags de Docker Hub"
        >
          v{data.next_version}
        </span>
      </div>
      <code className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">
        {data.image}:v{data.next_version}
      </code>
      <button
        type="button"
        onClick={() => void load()}
        className="btn-secondary btn-sm shrink-0"
        aria-label="Refrescar version"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
