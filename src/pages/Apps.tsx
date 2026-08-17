import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AppWindow, ExternalLink, Loader2, Plus, X } from 'lucide-react';
import { ApiError } from '../api/laurel';
import { type Application, type ApplicationCreate, appsApi } from '../api/apps';
import { useWorkspace } from '../auth/WorkspaceContext';

const emptyForm: ApplicationCreate = {
  name: '',
  description: '',
  create_github_repo: false,
};

function AppForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  initial?: Partial<ApplicationCreate>;
  onSubmit: (data: ApplicationCreate) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ApplicationCreate>({
    ...emptyForm,
    ...initial,
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">Nombre</label>
        <input
          required
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Mi App"
        />
        <p className="text-xs text-slate-500 mt-1">
          El slug se deriva del nombre (lowercase, guiones).
        </p>
      </div>
      <div>
        <label className="label">Descripcion</label>
        <textarea
          className="input"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Repo GitHub (opcional, override)</label>
        <input
          className="input"
          value={form.github_repo_url ?? ''}
          onChange={(e) => setForm({ ...form, github_repo_url: e.target.value })}
          placeholder="https://github.com/owner/repo"
        />
        <p className="text-xs text-slate-500 mt-1">
          Si lo dejas vacio y marcas el toggle, se crea automaticamente como
          <code> laurel_&lt;slug&gt;</code> en la org <code>laurel-applications</code>.
        </p>
      </div>
      <div>
        <label className="label">Imagen Docker base (opcional, override)</label>
        <input
          className="input"
          value={form.docker_image_base ?? ''}
          onChange={(e) => setForm({ ...form, docker_image_base: e.target.value })}
          placeholder="aflobaton/laurel_<slug>"
        />
        <p className="text-xs text-slate-500 mt-1">
          Default: <code>aflobaton/laurel_&lt;slug&gt;</code>. Sobreescribelo aqui
          solo si necesitas una excepcion al prefijo.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.create_github_repo ?? false}
          onChange={(e) => setForm({ ...form, create_github_repo: e.target.checked })}
          className="rounded"
        />
        Crear repo vacio en GitHub al guardar (requiere PAT configurado)
      </label>

      {error && (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Crear'
          )}
        </button>
      </div>
    </form>
  );
}

export function Apps() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    appsApi
      .list(1, 100)
      .then((data) => setApps(data.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const handleCreate = (data: ApplicationCreate) => {
    setSubmitting(true);
    setSubmitError(null);
    appsApi
      .create({ ...data, ...(workspace ? { workspace_id: workspace.id } : {}) })
      .then(() => {
        setShowForm(false);
        reload();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError) setSubmitError(e.message);
        else setSubmitError('Error desconocido');
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id: number, slug: string) => {
    if (!confirm(`Soft-delete de '${slug}'. Continuar?`)) return;
    appsApi
      .delete(id)
      .then(reload)
      .catch((e: unknown) => alert(e instanceof Error ? e.message : 'Error al eliminar'));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando apps...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Apps</h1>
          <p className="text-sm text-slate-500">
            Cada app tiene su propio namespace en el cluster. Los scoops y
            dominios cuelgan de aqui.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva app
        </button>
      </header>

      {error && (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="card p-5 border border-slate-200 dark:border-neutral-800">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <AppWindow className="w-5 h-5" />
              Nueva app
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <AppForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitting={submitting}
            error={submitError}
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-neutral-950 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Slug / NS</th>
              <th className="px-4 py-2">Scoops</th>
              <th className="px-4 py-2">Dominios</th>
              <th className="px-4 py-2">Repo</th>
              <th className="px-4 py-2">Docker</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay apps. Crea una para empezar.
                </td>
              </tr>
            )}
            {apps.map((a) => (
              <tr
                key={a.id}
                className="border-t border-slate-100 dark:border-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-950 cursor-pointer"
                onClick={() => navigate(`/apps/${a.id}`)}
              >
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2">
                  <code className="text-xs">{a.slug}</code>
                </td>
                <td className="px-4 py-2">{a.scoops_count}</td>
                <td className="px-4 py-2">{a.domains_count}</td>
                <td className="px-4 py-2">
                  {a.github_repo_url ? (
                    <a
                      href={a.github_repo_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      link
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {a.docker_image_base ? (
                    <code className="text-xs">{a.docker_image_base}</code>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(a.id, a.slug);
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}