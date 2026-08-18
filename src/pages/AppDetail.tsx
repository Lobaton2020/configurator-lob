import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AppWindow,
  ArrowLeft,
  Box,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { ApiError, laurelFetch } from '../api/laurel';
import {
  type Application,
  type ApplicationUpdate,
  type DeletionLog,
  appsApi,
} from '../api/apps';
import { buildsApi, type AppBuild, type BuildStatus } from '../api/builds';
import { NextVersionBadge } from '../components/NextVersionBadge';

interface AppScoop {
  id: number;
  name: string;
  type: string;
  status: string;
  status_label: string;
}

const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1';

const STATUS_STYLES: Record<BuildStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  pending: {
    label: 'Pendiente',
    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Loader2,
  },
  running: {
    label: 'Corriendo',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    icon: Loader2,
  },
  success: {
    label: 'Exitoso',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Fallido',
    cls: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    icon: XCircle,
  },
  aborted: {
    label: 'Abortado',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    icon: XCircle,
  },
};

function StatusPill({ status }: { status: BuildStatus }) {
  const s = STATUS_STYLES[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <Icon className={`w-3 h-3 ${status === 'running' || status === 'pending' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function shortSha(sha: string | null): string {
  if (!sha) return '-';
  return sha.slice(0, 7);
}

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[] | null>(null);

  // --- Versiones & Builds ---
  // La version ya NO la edita el operador: el backend la calcula desde
  // los tags de Docker Hub via GET /api/apps/<slug>/next_version. La UI
  // solo la muestra (NextVersionBadge) y dispara builds que usan esa
  // version automaticamente.
  const [builds, setBuilds] = useState<AppBuild[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(false);

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

  useEffect(() => {
    if (!app?.deleted_at) {
      setDeletionLogs(null);
      return;
    }
    appsApi
      .deletionLogs(appId)
      .then((r) => setDeletionLogs(r.logs))
      .catch(() => setDeletionLogs([]));
  }, [app?.deleted_at, appId]);

  // Sincroniza el draft de version con la version actual de la app.
  /* eslint-disable react-hooks/set-state-in-effect */
  // Carga inicial + auto-refresh mientras haya builds vivos (pending/running).
  // El backend hace polling a Jenkins on-demand, asi que el frontend solo
  // necesita recargar la lista cada 5s.
  const loadBuilds = useCallback(async () => {
    if (!Number.isFinite(appId)) return;
    setBuildsLoading(true);
    try {
      const list = await buildsApi.list(appId, { poll: true });
      setBuilds(list);
    } catch {
      // Si falla el poll, no rompemos la pagina: queda la lista anterior.
    } finally {
      setBuildsLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void loadBuilds();
  }, [loadBuilds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const hasLive = builds.some((b) => b.status === 'pending' || b.status === 'running');
    if (!hasLive) return;
    const id = window.setInterval(() => {
      void loadBuilds();
    }, 5000);
    return () => window.clearInterval(id);
  }, [builds, loadBuilds]);

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

  const openDelete = () => {
    if (!app) return;
    setDeleteOpen(true);
    setDeletePhrase('');
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!app) return;
    setDeleting(true);
    setDeleteError(null);
    appsApi
      .delete(appId)
      .then(() => navigate('/apps'))
      .catch((e: unknown) =>
        setDeleteError(e instanceof Error ? e.message : 'Error al eliminar'),
      )
      .finally(() => setDeleting(false));
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
            disabled={loading}
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

      {/* Versiones & Builds */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Versiones & Builds
        </h2>

        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <NextVersionBadge slug={app.slug} />
          {app.current_version && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Ultima version pusheada: <span className="font-mono">v{app.current_version}</span>
            </p>
          )}
        </div>

        {buildsLoading && builds.length === 0 ? (
          <p className="text-sm text-slate-500 inline-flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando builds...
          </p>
        ) : builds.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">
            No hay builds todavia. Hace push a master del repo de la app para
            disparar el primero.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {builds.map((b) => (
              <li key={b.id} className="py-3 flex items-center gap-3">
                <StatusPill status={b.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono text-sm font-semibold text-slate-800 dark:text-white">
                      {b.version}
                    </code>
                    <code className="text-xs text-slate-400 font-mono">
                      {shortSha(b.commit_sha)}
                    </code>
                    <span className="text-xs text-slate-500">
                      {fmtDate(b.started_at ?? b.queued_at)}
                    </span>
                  </div>
                  {b.error_message && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
                      {b.error_message}
                    </p>
                  )}
                </div>
                {b.jenkins_url && (
                  <a
                    href={b.jenkins_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 shrink-0"
                    title="Abrir en Jenkins"
                  >
                    Jenkins
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {builds.some((b) => b.status === 'pending' || b.status === 'running') && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Refrescando status cada 5s mientras hay builds en curso...
          </p>
        )}
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

      {/* Zona de peligro */}
      <div className="card p-4 border-red-200 dark:border-red-900/50">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Danger zone</h2>
        <button
          onClick={openDelete}
          disabled={!!app.deleted_at}
          className="btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          {app.deleted_at ? 'App eliminada' : 'Soft-delete app'}
        </button>
        {app.deleted_at && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Esta app ya fue eliminada el{' '}
            {new Date(app.deleted_at).toLocaleString()}
            {app.deleted_by ? ` por ${app.deleted_by}` : ''}. Su historial de
            borrado se conserva mas abajo.
          </p>
        )}
      </div>

      {/* Historial de borrado */}
      {app.deleted_at && (
        <div className="card p-4 mb-6 border-amber-200 dark:border-amber-900/50">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial de borrado
          </h2>
          <div className="text-sm text-slate-700 dark:text-slate-200 space-y-1 mb-3">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Borrada el: </span>
              {new Date(app.deleted_at).toLocaleString()}
            </div>
            {app.deleted_by && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Borrada por: </span>
                <code className="text-xs">{app.deleted_by}</code>
              </div>
            )}
          </div>
          {deletionLogs === null ? (
            <p className="text-sm text-slate-500">Cargando logs...</p>
          ) : deletionLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No hay logs de borrado.</p>
          ) : (
            <ul className="space-y-2">
              {deletionLogs.map((log) => (
                <li
                  key={log.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                >
                  <details>
                    <summary className="cursor-pointer text-sm text-slate-700 dark:text-slate-200 select-none">
                      <span className="font-mono text-xs text-slate-400 mr-2">
                        #{log.id}
                      </span>
                      {new Date(log.deleted_at).toLocaleString()}
                      {log.deleted_by && (
                        <span className="text-slate-500"> por {log.deleted_by}</span>
                      )}
                    </summary>
                    {log.snapshot && (
                      <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-800 dark:text-slate-200">
                        {JSON.stringify(log.snapshot, null, 2)}
                      </pre>
                    )}
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal de confirmacion de borrado */}
      {deleteOpen && app && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Eliminar app
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Soft-delete. No toca el cluster. El historial queda en la pagina.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              Esta accion es reversible solo restaurando manualmente. Para
              confirmar, escribe el slug{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-300 font-mono">
                {app.slug}
              </code>
              :
            </p>

            <input
              type="text"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder={app.slug}
              className="input w-full font-mono"
              autoFocus
              disabled={deleting}
            />

            {deleteError && (
              <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting || deletePhrase !== app.slug}
                className="btn-danger"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar app
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
