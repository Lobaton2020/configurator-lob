import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Plus, Pencil, Trash2, RefreshCw, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { ApiError, scoopsApi, type Scoop, type ScoopForm, type ScoopUiType } from '../api/scoops';
import { RegistryInput } from '../components/RegistryInput';

const emptyForm: ScoopForm = {
  application: '',
  type: 'Web',
  url_registry: '',
  is_productive: false,
  requested_vcpu: 0.1,
  requested_memory: 64,
  limit_vcpu: 0.5,
  limit_memory: 128,
  min_replicas: 1,
  max_replicas: 2,
};

const inputClass =
  'input';

const labelClass = 'label';

const statusClass: Record<Scoop['status'], string> = {
  active: 'badge-green',
  pending: 'badge-amber',
  error: 'badge-red',
};

export function Scoops() {
  const navigate = useNavigate();
  const [scoops, setScoops] = useState<Scoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ScoopForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setScoops(await scoopsApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (scoop: Scoop) => {
    setEditingId(scoop.id);
    setForm({
      application: scoop.application,
      type: scoop.type,
      url_registry: scoop.url_registry,
      is_productive: scoop.is_productive,
      requested_vcpu: scoop.requested_vcpu,
      requested_memory: scoop.requested_memory,
      limit_vcpu: scoop.limit_vcpu,
      limit_memory: scoop.limit_memory,
      min_replicas: scoop.min_replicas,
      max_replicas: scoop.max_replicas,
    });
    setErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const cancel = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setFormError(null);
  };

  const confirm = async () => {
    const next: Record<string, string> = {};
    if (!form.application.trim()) next.application = 'Application is required';
    if (!(form.url_registry ?? '').trim()) next.url_registry = 'URL Registry is required';
    if (form.min_replicas < 0) next.min_replicas = 'Must be >= 0';
    if (form.max_replicas < form.min_replicas) next.max_replicas = 'Must be >= min_replicas';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      if (editingId !== null) {
        await scoopsApi.update(editingId, form);
      } else {
        await scoopsApi.create(form);
      }
      await load();
      cancel();
    } catch (err) {
      if (err instanceof ApiError) {
        // 422 trae errores por campo; el resto (409, 502...) es un mensaje global.
        const fieldErrors = err.fieldErrors;
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : 'Error desconocido');
      }
    } finally {
      setSaving(false);
    }
  };

  const removeScoop = async (scoop: Scoop) => {
    if (!window.confirm(`¿Eliminar el scoop "${scoop.application}"?`)) return;
    const remove = async (undeploy: boolean) => {
      try {
        await scoopsApi.remove(scoop.id, { undeploy, namespace: scoop.namespace });
        await load();
      } catch (err) {
        // 409: el backend detecta un deploy activo y exige ?undeploy=true.
        if (err instanceof ApiError && err.status === 409 && !undeploy) {
          const proceed = window.confirm(
            `${err.message}\n\n¿Quieres borrar tambien la infra del cluster?`,
          );
          if (proceed) await remove(true);
          return;
        }
        setLoadError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };
    await remove(false);
  };

  return (
    <div className="p-4 lg:p-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="page-title">
          <Box />
          Scoops
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/scoops/new')}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Scoop
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 alert alert-red">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          Loading scoops...
        </div>
      ) : scoops.length === 0 ? (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          No scoops yet. Click <span className="font-medium">New Scoop</span> to create one.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  {['Application', 'Access', 'Type', 'Status', 'URL Registry', 'Productive',
                    'Req vCPU', 'Req Memory', 'Lim vCPU', 'Lim Memory', 'Min Rep', 'Max Rep'].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scoops.map((s) => (
                  <tr key={s.id} className="tr">
                    <td className="td font-medium">
                      <div className="flex flex-col">
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link hover:underline truncate inline-flex items-center gap-1"
                            title={`Abrir ${s.url}`}
                          >
                            {s.application}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="truncate">{s.application}</span>
                        )}
                        <span className="block text-xs text-slate-400 font-normal">
                          {s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {s.name}
                            </a>
                          ) : (
                            s.name
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="td">
                      <span
                        className={`badge ${
                          s.type === 'Web'
                            ? 'badge-blue'
                            : 'badge-amber'
                        }`}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`badge ${statusClass[s.status]}`}>
                        {s.status_label}
                      </span>
                    </td>
                    <td className="td">
                      {s.port ? (
                        <a
                          href={`http://192.168.20.240:${s.port}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono badge-blue hover:bg-blue-200 dark:hover:bg-blue-900/60"
                          title="Open in LAN"
                        >
                          :{s.port}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">interno</span>
                      )}
                    </td>
                    <td className="td text-slate-500">
                      <span className="truncate inline-block max-w-xs align-bottom" title={s.url_registry}>
                        {s.url_registry || '-'}
                      </span>
                    </td>
                    <td className="td text-slate-500">
                      {s.is_productive ? (
                        <span className="badge badge-green">Yes</span>
                      ) : (
                        <span className="badge badge-gray">No</span>
                      )}
                    </td>
                    <td className="td text-slate-500">{s.requested_vcpu}</td>
                    <td className="td text-slate-500">{s.requested_memory}Mi</td>
                    <td className="td text-slate-500">{s.limit_vcpu}</td>
                    <td className="td text-slate-500">{s.limit_memory}Mi</td>
                    <td className="td text-slate-500">{s.min_replicas}</td>
                    <td className="td text-slate-500">{s.max_replicas}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          to={`/scoops/${s.id}`}
                          className="link inline-flex items-center gap-1"
                          title="View"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="link inline-flex items-center gap-1"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeScoop(s)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scoop-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-2 p-5 border-b border-slate-100 dark:border-slate-800">
              <Box className="w-5 h-5 text-teal-600" />
              <h2 id="scoop-modal-title" className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingId !== null ? 'Edit Scoop' : 'New Scoop'}
              </h2>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {formError && (
                <div className="mb-4 alert alert-red">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Application</label>
                  <input
                    type="text"
                    value={form.application}
                    onChange={(e) => setForm({ ...form, application: e.target.value })}
                    className={inputClass}
                  />
                  {errors.application && <p className="text-xs text-red-600 mt-1">{errors.application}</p>}
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ScoopUiType })}
                    disabled={editingId !== null}
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <option value="Web">Web</option>
                    <option value="Job">Job</option>
                  </select>
                  {editingId !== null && (
                    <p className="text-xs text-slate-500 mt-1">Type cannot be changed after creation</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>URL Registry</label>
                  <RegistryInput
                    value={form.url_registry ?? ''}
                    onChange={(v) => setForm({ ...form, url_registry: v })}
                    className={inputClass}
                  />
                  {errors.url_registry && <p className="text-xs text-red-600 mt-1">{errors.url_registry}</p>}
                </div>

                <div>
                  <label className={labelClass}>Is Productive</label>
                  <label className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={form.is_productive}
                      onChange={(e) => setForm({ ...form, is_productive: e.target.checked })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {form.is_productive ? 'Yes' : 'No'}
                    </span>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>Requested vCPU</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.requested_vcpu}
                    onChange={(e) => setForm({ ...form, requested_vcpu: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.requested_vcpu && <p className="text-xs text-red-600 mt-1">{errors.requested_vcpu}</p>}
                </div>

                <div>
                  <label className={labelClass}>Requested Memory (Mi)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.requested_memory}
                    onChange={(e) => setForm({ ...form, requested_memory: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.requested_memory && <p className="text-xs text-red-600 mt-1">{errors.requested_memory}</p>}
                </div>

                <div>
                  <label className={labelClass}>Limit vCPU</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.limit_vcpu}
                    onChange={(e) => setForm({ ...form, limit_vcpu: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.limit_vcpu && <p className="text-xs text-red-600 mt-1">{errors.limit_vcpu}</p>}
                </div>

                <div>
                  <label className={labelClass}>Limit Memory (Mi)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.limit_memory}
                    onChange={(e) => setForm({ ...form, limit_memory: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.limit_memory && <p className="text-xs text-red-600 mt-1">{errors.limit_memory}</p>}
                </div>

                <div>
                  <label className={labelClass}>Min Replicas</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.min_replicas}
                    onChange={(e) => setForm({ ...form, min_replicas: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.min_replicas && <p className="text-xs text-red-600 mt-1">{errors.min_replicas}</p>}
                </div>

                <div>
                  <label className={labelClass}>Max Replicas</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.max_replicas}
                    onChange={(e) => setForm({ ...form, max_replicas: Number(e.target.value) })}
                    className={inputClass}
                  />
                  {errors.max_replicas && <p className="text-xs text-red-600 mt-1">{errors.max_replicas}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : editingId !== null ? 'Update' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
