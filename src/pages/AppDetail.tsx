import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AppWindow,
  ArrowLeft,
  Box,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { ApiError, laurelFetch } from '../api/laurel';
import { type Application, type ApplicationUpdate, appsApi } from '../api/apps';

interface AppScoop {
  id: number;
  name: string;
  type: string;
  status: string;
  status_label: string;
}

const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1';

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
      <div className={labelClass}>{label}</div>
      <div className="text-sm text-slate-800 dark:text-white font-medium break-all">{value}</div>
    </div>
  );
}

function EditForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: Application;
  onSave: (data: ApplicationUpdate) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ApplicationUpdate>({
    description: initial.description ?? '',
    github_repo_url: initial.github_repo_url ?? '',
    docker_image_base: initial.docker_image_base ?? '',
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
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
        <label className="label">Repo GitHub</label>
        <input
          className="input"
          value={form.github_repo_url ?? ''}
          onChange={(e) => setForm({ ...form, github_repo_url: e.target.value })}
          placeholder="https://github.com/owner/repo"
        />
      </div>
      <div>
        <label className="label">Imagen Docker base</label>
        <input
          className="input"
          value={form.docker_image_base ?? ''}
          onChange={(e) => setForm({ ...form, docker_image_base: e.target.value })}
          placeholder="aflobaton/laurel_<slug>"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appId = Number(id);

  const [app, setApp] = useState<Application | null>(null);
  const [scoops, setScoops] = useState<AppScoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, scoopsData] = await Promise.all([
        appsApi.get(appId),
        laurelFetch<{ items: AppScoop[] }>(
          `/api/scoops?application=${encodeURIComponent(id ?? '')}&limit=100`,
        ),
      ]);
      setApp(a);
      setScoops(scoopsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [appId, id]);

  useEffect(() => {
    if (Number.isFinite(appId)) void load();
  }, [appId, load]);

  const handleSave = (data: ApplicationUpdate) => {
    setSaving(true);
    setSaveError(null);
    appsApi
      .update(appId, data)
      .then((updated) => {
        setApp(updated);
        setEditing(false);
      })
      .catch((e: unknown) => {
        setSaveError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error desconocido');
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!app) return;
    if (!window.confirm(`Soft-delete de '${app.slug}'. No toca el cluster. Continuar?`)) return;
    setBusy('delete');
    setActionError(null);
    appsApi
      .delete(appId)
      .then(() => navigate('/apps'))
      .catch((e: unknown) =>
        setActionError(e instanceof Error ? e.message : 'Error al eliminar'),
      )
      .finally(() => setBusy(null));
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <p className="text-slate-500">Loading app #{appId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <Link to="/apps" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
        <div className="alert alert-red">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!app) return null;

  return (
    <div className="p-6 text-slate-800 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/apps"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <AppWindow className="w-7 h-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {app.name}
              <span className="badge badge-gray">{app.slug}</span>
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Creada: {app.created_at ? new Date(app.created_at).toLocaleString() : '-'}
            </p>
          </div>
          <span className="badge badge-green">activo</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing((v) => !v);
              setSaveError(null);
            }}
            className="btn-secondary"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => void load()}
            disabled={loading || busy !== null}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {app.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{app.description}</p>
      )}

      {/* Edicion inline */}
      {editing && (
        <div className="card p-5 mb-6 border border-slate-200 dark:border-neutral-800">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar {app.slug}
            </h2>
            <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <EditForm
            initial={app}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
            error={saveError}
          />
        </div>
      )}

      {/* Especificacion */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Specification</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="GitHub repo"
            value={
              app.github_repo_url ? (
                <a
                  href={app.github_repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono"
                >
                  {app.github_repo_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400">-</span>
              )
            }
          />
          <Stat
            label="Docker image base"
            value={
              app.docker_image_base ? (
                <span className="font-mono">{app.docker_image_base}</span>
              ) : (
                <span className="text-slate-400">-</span>
              )
            }
          />
          <Stat label="Namespace" value={<span className="font-mono">{app.namespace}</span>} />
        </div>
      </div>

      {/* Resumen */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to={`/scoops?application=${encodeURIComponent(app.slug)}`} className="block">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-colors">
              <div className={labelClass}>Scoops</div>
              <div className="text-sm font-medium flex items-center gap-1">
                <Box className="w-4 h-4" />
                {app.scoops_count}
              </div>
            </div>
          </Link>
          <Link to="/domains" className="block">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-colors">
              <div className={labelClass}>Dominios</div>
              <div className="text-sm font-medium flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {app.domains_count}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Scoops de la app */}
      <div className="card overflow-hidden mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-4 py-3">
          Scoops de {app.slug}
        </h2>
        {scoops.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No hay scoops en esta app.</p>
        ) : (
          <table className="table">
            <thead className="bg-slate-50 dark:bg-neutral-950 text-left">
              <tr>
                <th className="th">Nombre</th>
                <th className="th">Tipo</th>
                <th className="th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {scoops.map((s) => (
                <tr
                  key={s.id}
                  className="tr cursor-pointer"
                  onClick={() => navigate(`/scoops/${s.id}`)}
                >
                  <td className="td font-medium">{s.name}</td>
                  <td className="td">{s.type}</td>
                  <td className="td">
                    <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'error' ? 'badge-red' : 'badge-amber'}`}>
                      {s.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {actionError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{actionError}</span>
        </div>
      )}

      {/* Zona de peligro */}
      <div className="card p-4 border-red-200 dark:border-red-900/50">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Danger zone</h2>
        <button
          onClick={handleDelete}
          disabled={busy !== null}
          className="btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          {busy === 'delete' ? 'Eliminando...' : 'Soft-delete app'}
        </button>
      </div>
    </div>
  );
}
