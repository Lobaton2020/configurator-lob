import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Globe, Loader2, Plus, Power, Trash2, X } from 'lucide-react';
import { ApiError } from '../api/laurel';
import { type Domain, type DomainCreate, domainsApi } from '../api/domains';
import { appsApi, type Application } from '../api/apps';
import { scoopsApi, type Scoop } from '../api/scoops';

function NewDomainForm({
  apps,
  scoops,
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  apps: Application[];
  scoops: Scoop[];
  onSubmit: (data: DomainCreate) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<DomainCreate>({
    application_id: 0,
    scoop_id: 0,
    host: '',
    tls: true,
  });

  const apiScoops = scoops.filter(
    (s) => s.application === apps.find((a) => a.id === form.application_id)?.slug
      && s.type === 'Web'
      && s.port !== null,
  );

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (form.application_id && form.scoop_id && form.host) onSubmit(form);
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
            host: '',
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
            const slug = apps.find((a) => a.id === form.application_id)?.slug || '';
            const scoop = apiScoops.find((s) => s.id === scoopId);
            setForm({
              ...form,
              scoop_id: scoopId,
              host: scoop ? `${scoop.name}.${guessTld(slug)}` : form.host,
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
        <label className="label">Host (subdominio publico)</label>
        <input
          required
          className="input"
          value={form.host}
          onChange={(e) => setForm({ ...form, host: e.target.value })}
          placeholder="notas.resto.com"
        />
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
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Guardando...' : 'Crear'}
        </button>
      </div>
    </form>
  );
}

function guessTld(_slug: string): string {
  return 'andreslobaton.top';
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

  const reload = () => {
    setLoading(true);
    Promise.all([
      domainsApi.list({ limit: 100 }),
      appsApi.list(1, 100),
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

  useEffect(reload, []);

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