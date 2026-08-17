import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

interface DeployPanelProps<T> {
  title: string;
  data: T | null;
  loading: boolean;
  error: string | null;
  done: boolean;
  onClose: () => void;
  children?: (data: T) => React.ReactNode;
}

/** Panel de deploy en vivo: spinner mientras consulta el estado del cluster. */
export function DeployPanel<T>({
  title,
  data,
  loading,
  error,
  done,
  onClose,
  children,
}: DeployPanelProps<T>) {
  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {error ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : done ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Loader2 className={`w-5 h-5 text-[#1a73e8] ${loading ? 'animate-spin' : ''}`} />
          )}
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
          {!error && (
            done ? (
              <span className="badge badge-green">Listo</span>
            ) : (
              <span className="badge badge-amber">Desplegando...</span>
            )
          )}
        </div>
        <button onClick={onClose} className="btn-secondary btn-sm">
          <X className="w-4 h-4" />
          Cerrar
        </button>
      </div>

      {error ? (
        <div className="alert alert-red">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      ) : data ? (
        children?.(data)
      ) : (
        <p className="text-sm text-slate-500">Consultando estado del cluster...</p>
      )}
    </div>
  );
}
