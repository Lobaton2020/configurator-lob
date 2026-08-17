import { useState, type FormEvent } from 'react';
import { AlertCircle, AppWindow, X } from 'lucide-react';
import type { ApplicationCreate } from '../api/apps';

export function CreateAppModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: ApplicationCreate) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl brand-gradient text-white flex items-center justify-center">
              <AppWindow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Nueva app
              </h2>
              <p className="text-xs text-slate-500">
                Agrupa scoops, dominios y configuracion bajo un nombre.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi App"
            />
            <p className="text-xs text-slate-500 mt-1">
              El slug se deriva del nombre (lowercase, guiones).
            </p>
          </div>
          <div>
            <label className="label">Descripcion (opcional)</label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Creando...' : 'Crear app'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
