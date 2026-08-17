import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  FileCog,
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Pencil,
  ShieldAlert,
  Lock,
  AppWindow,
} from 'lucide-react';
import { ApiError } from '../api/laurel';
import { configMapsApi, secretsApi, type ConfigMapDetail, type ConfigMapSummary, type SecretDetail, type SecretSummary } from '../api/configstore';
import { scoopsApi } from '../api/scoops';
import { appsApi, type Application } from '../api/apps';
import { clusterApi } from '../api/cluster';
import { useApp } from '../auth/AppContext';

type Tab = 'configmaps' | 'secrets';

const inputClass = 'input';
const labelClass = 'label';

interface KeyValueRow {
  key: string;
  value: string;
}

function rowsFromObject(obj: Record<string, string> | undefined): KeyValueRow[] {
  if (!obj) return [];
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

function rowsToObject(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (key.trim()) out[key] = value;
  }
  return out;
}

function TabButton({ active, onClick, icon: Icon, label, hint }: { active: boolean; onClick: () => void; icon: typeof FileCog; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-300'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {hint && <span className="text-[10px] uppercase text-slate-400 ml-1">{hint}</span>}
    </button>
  );
}

interface ConfigMapEditorProps {
  open: boolean;
  initial?: ConfigMapDetail | null;
  appSuggestions: string[];
  onClose: () => void;
  onSave: (input: { app: string; namespace?: string; name?: string; data: Record<string, string> }) => Promise<void>;
}

function ConfigMapEditor({ open, initial, appSuggestions, onClose, onSave }: ConfigMapEditorProps) {
  const [app, setApp] = useState(initial?.app ?? '');
  const [namespace, setNamespace] = useState(initial?.namespace ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const initialRows = rowsFromObject(initial?.data);
  const [rows, setRows] = useState<KeyValueRow[]>(initialRows.length ? initialRows : [{ key: '', value: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const cleanedApp = app.trim();
    if (!cleanedApp) {
      setError('Application es obligatorio');
      return;
    }
    const data = rowsToObject(rows);
    setSaving(true);
    setError(null);
    try {
      await onSave({
        app: cleanedApp,
        namespace: namespace.trim() || undefined,
        name: name.trim() || undefined,
        data,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Error');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileCog className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold">{initial ? 'Editar ConfigMap' : 'Nuevo ConfigMap'}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="alert alert-red">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Application <span className="text-red-500">*</span></label>
              <input
                type="text"
                list="configstore-apps-cm"
                value={app}
                onChange={(e) => setApp(e.target.value)}
                className={inputClass}
                placeholder="ej: portafolio-web"
              />
              <datalist id="configstore-apps-cm">
                {appSuggestions.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Namespace</label>
              <input type="text" value={namespace} onChange={(e) => setNamespace(e.target.value)} className={inputClass} placeholder="(default)" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre <span className="text-xs text-slate-400">(opcional; default: <code>&lt;app&gt;-config</code>)</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ej: portafolio-web-config" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Data (clave = valor)</label>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setRows([...rows, { key: '', value: '' }])}>
                <Plus className="w-3 h-3" />
                Fila
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={row.key}
                    onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))}
                    className={`${inputClass} flex-1 font-mono`}
                  />
                  <input
                    type="text"
                    placeholder="value"
                    value={row.value}
                    onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    className={`${inputClass} flex-[2] font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    aria-label="Quitar fila"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SecretEditorProps {
  open: boolean;
  initial?: SecretDetail | null;
  appSuggestions: string[];
  onClose: () => void;
  onSave: (input: { app: string; namespace?: string; name?: string; data: Record<string, string> }) => Promise<void>;
}

function SecretEditor({ open, initial, appSuggestions, onClose, onSave }: SecretEditorProps) {
  const [app, setApp] = useState(initial?.app ?? '');
  const [namespace, setNamespace] = useState(initial?.namespace ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  // Solo prellenamos las claves (sin valores): los valores nunca salen del backend.
  const initialKeys = initial?.keys ?? [];
  const [rows, setRows] = useState<KeyValueRow[]>(
    initialKeys.length ? initialKeys.map((k) => ({ key: k, value: '' })) : [{ key: '', value: '' }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ack, setAck] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!open) return null;

  const submit = async () => {
    const cleanedApp = app.trim();
    if (!cleanedApp) {
      setError('Application es obligatorio');
      return;
    }
    const data = rowsToObject(rows);
    if (Object.keys(data).length === 0) {
      setError('El Secret debe tener al menos una clave con valor');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        app: cleanedApp,
        namespace: namespace.trim() || undefined,
        name: name.trim() || undefined,
        data,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Error');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold">{initial ? 'Editar Secret' : 'Nuevo Secret'}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="alert alert-red">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-3 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Importante.</strong> Los Secrets <em>nunca</em> exponen sus valores por la API.
              Para editar, pega de nuevo <strong>todas</strong> las claves y valores: cualquier clave sin valor sera
              eliminada. Asegurate de tenerlos a mano antes de continuar.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Application <span className="text-red-500">*</span></label>
              <input
                type="text"
                list="configstore-apps-secret"
                value={app}
                onChange={(e) => setApp(e.target.value)}
                className={inputClass}
                placeholder="ej: portafolio-web"
              />
              <datalist id="configstore-apps-secret">
                {appSuggestions.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Namespace</label>
              <input type="text" value={namespace} onChange={(e) => setNamespace(e.target.value)} className={inputClass} placeholder="(default)" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre <span className="text-xs text-slate-400">(opcional; default: <code>&lt;app&gt;-secret</code>)</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ej: portafolio-web-secret" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Data (clave = valor)</label>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setRows([...rows, { key: '', value: '' }])}>
                <Plus className="w-3 h-3" />
                Fila
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={row.key}
                    onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))}
                    className={`${inputClass} flex-1 font-mono`}
                  />
                  <div className="relative flex-[2]">
                    <input
                      type={revealed.has(i) ? 'text' : 'password'}
                      placeholder="(pega el valor)"
                      value={row.value}
                      onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                      className={`${inputClass} font-mono pr-9`}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      aria-label={revealed.has(i) ? 'Ocultar' : 'Mostrar'}
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    aria-label="Quitar fila"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Entiendo que tendre que volver a pegar todos los valores para editarlos despues.
          </label>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !ack}
            className="btn-primary"
            title={!ack ? 'Marca la casilla de confirmacion primero' : undefined}
          >
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfigStore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { app: globalApp } = useApp();
  const initialTab = (searchParams.get('tab') === 'secrets' ? 'secrets' : 'configmaps') as Tab;
  // El app por defecto es la activa en el header; el caller puede sobreescribir
  // via ?app=<slug> (ej: link compartido con un scoop concreto). El backend
  // autoderiva el namespace a `user-apps-<slug>` y filtra por label, asi que
  // cada app solo ve los ConfigMaps/Secrets que se crearon para ella.
  const initialApp = searchParams.get('app') ?? globalApp?.slug ?? '';
  const initialNamespace = searchParams.get('namespace') ?? '';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [appFilter, setAppFilter] = useState(initialApp);
  const [namespaceFilter, setNamespaceFilter] = useState(initialNamespace);

  // Si cambia la app global y no hay override explicito en la URL, seguimos la app.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const urlOverride = searchParams.get('app');
    if (!urlOverride && globalApp && appFilter !== globalApp.slug) {
      setAppFilter(globalApp.slug);
    }
  }, [globalApp?.slug, searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [cmList, setCmList] = useState<ConfigMapSummary[]>([]);
  const [secretsList, setSecretsList] = useState<SecretSummary[]>([]);
  const [appSuggestions, setAppSuggestions] = useState<string[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [userNamespaces, setUserNamespaces] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cmEditor, setCmEditor] = useState<{ open: boolean; detail: ConfigMapDetail | null }>({ open: false, detail: null });
  const [secretEditor, setSecretEditor] = useState<{ open: boolean; detail: SecretDetail | null }>({ open: false, detail: null });

  // Sincroniza estado -> URL para que /configstore?tab=secrets&app=portafolio-web sea compartible.
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'configmaps') next.set('tab', tab);
    if (appFilter) next.set('app', appFilter);
    if (namespaceFilter) next.set('namespace', namespaceFilter);
    setSearchParams(next, { replace: true });
  }, [tab, appFilter, namespaceFilter, setSearchParams]);

  // Carga inicial de apps existentes (para datalist) + lista filtrada.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const opts = { namespace: namespaceFilter || undefined, app: appFilter || undefined };
      const [cms, secs, scoops] = await Promise.all([
        configMapsApi.list(opts),
        secretsApi.list(opts),
        scoopsApi.list().catch(() => []),
      ]);
      setCmList(cms);
      setSecretsList(secs);
      const apps = new Set<string>(scoops.map((s) => s.application));
      cms.forEach((c) => apps.add(c.app));
      secs.forEach((s) => apps.add(s.app));
      setAppSuggestions([...apps].sort());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [namespaceFilter, appFilter]);

  useEffect(() => { void load(); }, [load]);

  // Carga las opciones de los dropdowns de filtros.
  useEffect(() => {
    appsApi
      .list({ page: 1, limit: 1000 })
      .then((d) => setApps(d.items))
      .catch(() => undefined);
    clusterApi
      .namespaces()
      .then((nsList) =>
        setUserNamespaces(
          nsList.map((ns) => ns.name).filter((n) => n.startsWith('user-apps')).sort(),
        ),
      )
      .catch(() => undefined);
  }, []);

  const onEditCM = async (row: ConfigMapSummary) => {
    try {
      const detail = await configMapsApi.get(row.namespace, row.name);
      setCmEditor({ open: true, detail });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error');
    }
  };

  const onEditSecret = async (row: SecretSummary) => {
    try {
      const detail = await secretsApi.get(row.namespace, row.name);
      setSecretEditor({ open: true, detail });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error');
    }
  };

  const onDeleteCM = async (row: ConfigMapSummary) => {
    if (!window.confirm(`Eliminar ConfigMap "${row.name}" del cluster?`)) return;
    try {
      await configMapsApi.delete(row.namespace, row.name);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error');
    }
  };

  const onDeleteSecret = async (row: SecretSummary) => {
    if (!window.confirm(`Eliminar Secret "${row.name}" del cluster?`)) return;
    try {
      await secretsApi.delete(row.namespace, row.name);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error');
    }
  };

  const onUpsertCM = async (input: { app: string; namespace?: string; name?: string; data: Record<string, string> }) => {
    await configMapsApi.upsert(input);
    await load();
  };

  const onUpsertSecret = async (input: { app: string; namespace?: string; name?: string; data: Record<string, string> }) => {
    await secretsApi.upsert(input);
    await load();
  };

  const list = tab === 'configmaps' ? cmList : secretsList;

  const totalKeys = useMemo(() => {
    if (tab === 'configmaps') return cmList.reduce((acc, c) => acc + c.keys.length, 0);
    return secretsList.reduce((acc, s) => acc + s.keys.length, 0);
  }, [tab, cmList, secretsList]);

  return (
    <div className="p-4 lg:p-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">
            {tab === 'configmaps' ? <FileCog /> : <KeyRound />}
            Config Store
          </h1>
          {globalApp && appFilter === globalApp.slug && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1.5">
              <AppWindow className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Filtrado por la app global <code className="font-mono">{globalApp.slug}</code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {tab === 'configmaps' ? (
            <button type="button" onClick={() => setCmEditor({ open: true, detail: null })} className="btn-primary">
              <Plus className="w-4 h-4" />
              New ConfigMap
            </button>
          ) : (
            <button type="button" onClick={() => setSecretEditor({ open: true, detail: null })} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Secret
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <TabButton active={tab === 'configmaps'} onClick={() => setTab('configmaps')} icon={FileCog} label="ConfigMaps" hint={String(cmList.length)} />
        <TabButton active={tab === 'secrets'} onClick={() => setTab('secrets')} icon={KeyRound} label="Secrets" hint={String(secretsList.length)} />
        <span className="ml-auto chip">Total claves: {totalKeys}</span>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Filtrar por application</label>
            <select
              className={inputClass}
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
            >
              <option value="">(todas)</option>
              {appFilter && !apps.some((a) => a.slug === appFilter) && (
                <option value={appFilter}>{appFilter}</option>
              )}
              {apps.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name} ({a.slug})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Namespace</label>
            <select
              className={inputClass}
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
            >
              <option value="">(default)</option>
              {namespaceFilter && !userNamespaces.includes(namespaceFilter) && (
                <option value={namespaceFilter}>{namespaceFilter}</option>
              )}
              {userNamespaces.map((ns) => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>
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
          Loading...
        </div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          {tab === 'configmaps' ? 'No hay ConfigMaps para los filtros activos.' : 'No hay Secrets para los filtros activos.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Namespace</th>
                  <th className="th">App</th>
                  <th className="th">Keys</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={`${row.namespace}/${row.name}`} className="tr">
                    <td className="td font-mono">{row.name}</td>
                    <td className="td">{row.namespace}</td>
                    <td className="td">
                      <button
                        type="button"
                        className="link"
                        onClick={() => setAppFilter(row.app)}
                        title="Filtrar por esta app"
                      >
                        {row.app || <span className="text-slate-400">-</span>}
                      </button>
                    </td>
                    <td className="td">
                      {row.keys.length === 0 ? (
                        <span className="text-slate-400 text-xs">(vacio)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.keys.slice(0, 5).map((k) => (
                            <span key={k} className="chip font-mono">{k}</span>
                          ))}
                          {row.keys.length > 5 && (
                            <span className="chip">+{row.keys.length - 5}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="td text-slate-500 text-xs">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => tab === 'configmaps' ? onEditCM(row as ConfigMapSummary) : onEditSecret(row as SecretSummary)}
                          className="link inline-flex items-center gap-1"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => tab === 'configmaps' ? onDeleteCM(row as ConfigMapSummary) : onDeleteSecret(row as SecretSummary)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
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

      <ConfigMapEditor
        key={cmEditor.detail ? `${cmEditor.detail.namespace}/${cmEditor.detail.name}` : 'new-cm'}
        open={cmEditor.open}
        initial={cmEditor.detail}
        appSuggestions={appSuggestions}
        onClose={() => setCmEditor({ open: false, detail: null })}
        onSave={onUpsertCM}
      />

      <SecretEditor
        key={secretEditor.detail ? `${secretEditor.detail.namespace}/${secretEditor.detail.name}` : 'new-secret'}
        open={secretEditor.open}
        initial={secretEditor.detail}
        appSuggestions={appSuggestions}
        onClose={() => setSecretEditor({ open: false, detail: null })}
        onSave={onUpsertSecret}
      />
    </div>
  );
}
