import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Globe,
  Loader2,
  Plus,
  Power,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { ApiError } from '../api/laurel';
import { type Domain, type DomainCreate, domainsApi } from '../api/domains';
import { type DomainPoolItem, domainPoolApi } from '../api/domainPool';
import { appsApi, type Application } from '../api/apps';
import { scoopsApi, type Scoop } from '../api/scoops';

const DNS_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function isValidFqdn(d: string): boolean {
  const labels = d.split('.');
  return labels.length >= 2 && labels.every((l) => l.length <= 63 && DNS_LABEL.test(l));
}

function NewDomainForm({
  apps,
  scoops,
  poolItems,
  poolLoading,
  onSubmit,
  onCancel,
  onOpenManage,
  submitting,
  error,
}: {
  apps: Application[];
  scoops: Scoop[];
  poolItems: DomainPoolItem[];
  poolLoading: boolean;
  onSubmit: (data: DomainCreate) => void;
  onCancel: () => void;
  onOpenManage: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<{
    application_id: number;
    scoop_id: number;
    domain_pool_id: number;
    prefix: string;
    tls: boolean;
  }>({ application_id: 0, scoop_id: 0, domain_pool_id: 0, prefix: '', tls: true });

  const apiScoops = scoops.filter(
    (s) => s.application === apps.find((a) => a.id === form.application_id)?.slug
      && s.type === 'Web'
      && s.port !== null,
  );

  const chosen = poolItems.find((p) => p.id === form.domain_pool_id);
  const host = chosen && form.prefix ? `${form.prefix}.${chosen.domain}` : '';

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (form.application_id && form.scoop_id && chosen && form.prefix && host) {
          onSubmit({ ...form, host });
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">App</label>
        <select
          className="input"
          value={form.application_id}
          onChange={(e) => setForm({
            ...form,
            application_id: Number(e.target.value),
            scoop_id: 0,
            prefix: '',
          })}
          required
        >
          <option value={0}>-- selecciona --</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.slug})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Scoop (solo tipo api)</label>
        <select
          className="input"
          value={form.scoop_id}
          onChange={(e) => {
            const scoopId = Number(e.target.value);
            const scoop = apiScoops.find((s) => s.id === scoopId);
            setForm({
              ...form,
              scoop_id: scoopId,
              prefix: scoop && !form.prefix ? scoop.name : form.prefix,
            });
          }}
          required
          disabled={!form.application_id}
        >
          <option value={0}>-- selecciona --</option>
          {apiScoops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (puerto {s.port})
            </option>
          ))}
        </select>
        {form.application_id && apiScoops.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Esta app no tiene scoops de tipo api con puerto asignado.
          </p>
        )}
      </div>

      <div>
        <label className="label">Dominio del pool</label>
        <div className="flex gap-2">
          <select
            className="input"
            value={form.domain_pool_id}
            onChange={(e) => setForm({ ...form, domain_pool_id: Number(e.target.value) })}
            disabled={poolLoading}
            required
          >
            <option value={0}>
              {poolLoading ? 'Cargando dominios...' : '-- selecciona --'}
            </option>
            {poolItems.map((p) => (
              <option key={p.id} value={p.id}>{p.domain}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenManage}
            className="btn-secondary whitespace-nowrap"
          >
            <Settings2 className="w-4 h-4" />
            Gestionar dominios
          </button>
        </div>
        {!poolLoading && poolItems.length === 0 && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            No hay dominios registrados — añade uno.
          </p>
        )}
      </div>

      <div>
        <label className="label">Prefijo (subdominio)</label>
        <input
          required
          className="input font-mono"
          value={form.prefix}
          onChange={(e) => setForm({ ...form, prefix: e.target.value.toLowerCase() })}
          placeholder="notas"
          maxLength={63}
        />
        <p className="text-xs text-slate-500 mt-1">
          Solo letras minusculas, numeros y guiones (DNS-1123).
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
        <span className="text-xs text-slate-500">Host resultante</span>
        <span className="text-sm font-mono text-slate-800 dark:text-white">
          {host || '—'}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.tls}
          onChange={(e) => setForm({ ...form, tls: e.target.checked })}
          className="rounded"
        />
        TLS (LetsEncrypt via cert-manager)
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
        <button type="submit" disabled={submitting || !host} className="btn-primary">
          {submitting ? 'Guardando...' : 'Crear'}
        </button>
      </div>
    </form>
  );
}

function DomainPoolModal({
  items,
  loading,
  onClose,
  onChanged,
}: {
  items: DomainPoolItem[];
  loading: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({ domain: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const domain = form.domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    if (!isValidFqdn(domain)) {
      setError('El dominio debe ser un FQDN valido en minusculas (ej. andreslobaton.top), sin http://');
      return;
    }
    void run(async () => {
      await domainPoolApi.create({ domain, description: form.description.trim() });
      setForm({ domain: '', description: '' });
      onChanged();
    });
  };

  const handleUpdate = (item: DomainPoolItem) => {
    const desc = editDesc.trim();
    if (desc === item.description) {
      setEditingId(null);
      return;
    }
    void run(async () => {
      await domainPoolApi.update(item.id, { description: desc });
      setEditingId(null);
      onChanged();
    });
  };

  const handleDelete = (item: DomainPoolItem) => {
    if (!confirm(`Eliminar dominio '${item.domain}' del pool?`)) return;
    void run(async () => {
      await domainPoolApi.delete(item.id);
      onChanged();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#1a73e8]" />
            <h2 className="text-lg font-medium">Dominios del pool</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="space-y-3 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div>
              <label className="label">Dominio (FQDN poseido)</label>
              <input
                className="input font-mono"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="andreslobaton.top"
                required
              />
            </div>
            <div>
              <label className="label">Descripcion</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Dominio principal"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={busy} className="btn-primary btn-sm">
                {busy ? 'Guardando...' : 'Añadir dominio'}
              </button>
            </div>
          </form>

          {loading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay dominios registrados. Añade uno cuando compres un dominio nuevo.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-slate-800 dark:text-white">{p.domain}</div>
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            className="input py-1 text-sm"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Descripcion"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdate(p)}
                            disabled={busy}
                            className="btn-primary btn-sm"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-secondary btn-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 truncate">{p.description || '—'}</div>
                      )}
                    </div>
                    {editingId !== p.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingId(p.id); setEditDesc(p.description); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          disabled={busy}
                          className="text-red-600 hover:opacity-70 disabled:opacity-50 p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function Domains() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [scoops, setScoops] = useState<Scoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [poolItems, setPoolItems] = useState<DomainPoolItem[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [showPoolModal, setShowPoolModal] = useState(false);

  const loadPool = () => {
    setPoolLoading(true);
    domainPoolApi
      .list()
      .then((r) => setPoolItems(r.items))
      .catch(() => setPoolItems([]))
      .finally(() => setPoolLoading(false));
  };

  const reload = () => {
    setLoading(true);
    Promise.all([
      domainsApi.list({ limit: 100 }),
      appsApi.list({ page: 1, limit: 100 }),
      scoopsApi.list(),
    ])
      .then(([d, a, s]) => {
        setDomains(d.items);
        setApps(a.items);
        setScoops(s);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    loadPool();
  }, []);

  const handleCreate = (data: DomainCreate) => {
    setSubmitting(true);
    setSubmitError(null);
    domainsApi
      .create(data)
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

  const handleDeploy = async (d: Domain) => {
    setActionLoading(d.id);
    try {
      await domainsApi.deploy(d.id);
      reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al deploy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndeploy = async (d: Domain) => {
    setActionLoading(d.id);
    try {
      await domainsApi.undeploy(d.id);
      reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al undeploy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (d: Domain) => {
    if (!confirm(`Eliminar domain '${d.host}'? Esto borra Ingress + Cert + DNS override.`)) return;
    setActionLoading(d.id);
    try {
      await domainsApi.delete(d.id);
      reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando domains...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Domains</h1>
          <p className="text-sm text-slate-500">
            Asocia un subdominio publico a un scoop de tipo api. Genera
            Ingress + Certificate LetsEncrypt + DNS override.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
          disabled={apps.length === 0}
          title={apps.length === 0 ? 'Crea una app primero' : ''}
        >
          <Plus className="w-4 h-4" />
          Nuevo dominio
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
              <Globe className="w-5 h-5" />
              Nuevo domain
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <NewDomainForm
            apps={apps}
            scoops={scoops}
            poolItems={poolItems}
            poolLoading={poolLoading}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            onOpenManage={() => setShowPoolModal(true)}
            submitting={submitting}
            error={submitError}
          />
        </div>
      )}

      {showPoolModal && (
        <DomainPoolModal
          items={poolItems}
          loading={poolLoading}
          onClose={() => setShowPoolModal(false)}
          onChanged={loadPool}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-neutral-950 text-left">
            <tr>
              <th className="px-4 py-2">Host</th>
              <th className="px-4 py-2">App</th>
              <th className="px-4 py-2">Scoop</th>
              <th className="px-4 py-2">Namespace</th>
              <th className="px-4 py-2">TLS</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay domains. Crea uno para exponer un scoop.
                </td>
              </tr>
            )}
            {domains.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 dark:border-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-950">
                <td className="px-4 py-2 font-mono text-xs">{d.host}</td>
                <td className="px-4 py-2">{d.application_slug}</td>
                <td className="px-4 py-2">{d.scoop_name}</td>
                <td className="px-4 py-2">
                  <code className="text-xs">{d.namespace}</code>
                </td>
                <td className="px-4 py-2">{d.tls ? 'Si' : 'No'}</td>
                <td className="px-4 py-2">
                  <span className={
                    d.status === 'active'
                      ? 'inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                      : d.status === 'error'
                      ? 'inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      : 'inline-block px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => navigate(`/domains/${d.id}`)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Detalle
                  </button>
                  <button
                    onClick={() => handleDeploy(d)}
                    disabled={actionLoading === d.id}
                    className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
                    title="Deploy Ingress + Certificate + DNS"
                  >
                    <Power className="w-3 h-3 inline" /> Deploy
                  </button>
                  <button
                    onClick={() => handleUndeploy(d)}
                    disabled={actionLoading === d.id}
                    className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                    title="Quitar Ingress + Certificate + DNS"
                  >
                    Undeploy
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={actionLoading === d.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3 inline" />
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
