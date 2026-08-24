import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AppWindow, Box, FileCog, KeyRound, Loader2, Search, Tag, X } from 'lucide-react';
import {
  ApiError,
  scoopsApi,
  type AvailableEnvFrom,
  type AvailableEnvFromItem,
  type EnvFromRef,
  type ScoopForm,
  type ScoopUiType,
} from '../api/scoops';
import { useApp } from '../auth/AppContext';

const emptyForm: Omit<ScoopForm, 'application_id'> = {
  type: 'Web',
  is_productive: false,
  version: '',
  requested_vcpu: 0.1,
  requested_memory: 64,
  limit_vcpu: 0.5,
  limit_memory: 128,
  min_replicas: 1,
  max_replicas: 2,
  env_from: [],
};

const inputClass =
  'input';

const labelClass = 'label';

function NumberInput({
  label,
  value,
  min,
  step,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

type EnvFromTab = 'all' | 'config_map' | 'secret';

function EnvFromPicker({
  selected,
  onChange,
  appSlug,
}: {
  selected: EnvFromRef[];
  onChange: (next: EnvFromRef[]) => void;
  appSlug: string;
}) {
  const [tab, setTab] = useState<EnvFromTab>('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<AvailableEnvFrom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargamos cada vez que cambia la app activa. El backend autoderiva
  // el namespace a `user-apps-<app>` y filtra por el label de la app:
  // cada app solo ve los ConfigMaps y Secrets que se crearon para ella.
  useEffect(() => {
    if (!appSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    scoopsApi
      .availableEnvFrom({
        app: appSlug,
      })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'No se pudo cargar los recursos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appSlug]);

  const items: AvailableEnvFromItem[] = (data?.items ?? [])
    .filter((it) =>
      tab === 'all' ? true : it.type === tab,
    )
    .filter((it) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        it.name.toLowerCase().includes(s) ||
        it.app.toLowerCase().includes(s) ||
        it.keys.some((k) => k.toLowerCase().includes(s))
      );
    });

  const isSelected = (item: AvailableEnvFromItem) =>
    selected.some((s) => s.type === item.type && s.name === item.name);

  const toggle = (item: AvailableEnvFromItem) => {
    if (isSelected(item)) {
      onChange(
        selected.filter(
          (s) => !(s.type === item.type && s.name === item.name),
        ),
      );
    } else {
      onChange([
        ...selected,
        { type: item.type, name: item.name, namespace: item.namespace },
      ]);
    }
  };

  return (
    <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="flex items-center gap-2 mb-2">
        <FileCog className="w-4 h-4 text-slate-500" />
        <h3 className="font-medium text-sm text-slate-700 dark:text-slate-200">
          ConfigMaps y Secrets adicionales
        </h3>
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
            {selected.length} seleccionados
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        ConfigMaps y Secrets creados previamente para esta app
        (<code className="text-slate-700 dark:text-slate-300">{appSlug || '<app>'}</code>)
        en su namespace. Los del app
        (<code>{appSlug || '<app>'}-config</code> / <code>-secret</code>)
        ya se inyectan automaticamente: podes seleccionarlos igual, no se duplican.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(['all', 'config_map', 'secret'] as EnvFromTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t === 'config_map' ? (
              <FileCog className="w-3.5 h-3.5" />
            ) : t === 'secret' ? (
              <KeyRound className="w-3.5 h-3.5" />
            ) : null}
            {t === 'all' ? 'Todos' : t === 'config_map' ? 'ConfigMaps' : 'Secrets'}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className={`${inputClass} pl-7 py-1 text-xs h-8 w-48`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}
      {loading && !data && (
        <div className="text-sm text-slate-500 inline-flex items-center gap-2 py-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="text-sm text-slate-500 py-3">
          No hay ConfigMaps ni Secrets disponibles para esta app.
        </p>
      )}

      <ul className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
        {items.map((item) => {
          const sel = isSelected(item);
          return (
            <li key={`${item.type}:${item.namespace}/${item.name}`}>
              <label className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(item)}
                  className="mt-0.5 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.type === 'config_map' ? (
                      <FileCog className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    {item.app && (
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {item.app}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {item.keys.length > 0
                      ? `${item.keys.length} clave${item.keys.length === 1 ? '' : 's'}: ${item.keys.join(', ')}`
                      : 'Sin claves'}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {selected.map((s) => (
            <span
              key={`${s.type}:${s.name}`}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
            >
              {s.type === 'config_map' ? 'CM' : 'S'}
              <span className="font-mono">{s.name}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => !(x.type === s.type && x.name === s.name)))}
                className="ml-0.5 hover:text-red-500"
                aria-label="Quitar"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Banner({ kind, children }: { kind: 'error' | 'warn'; children: React.ReactNode }) {
  const palette =
    kind === 'error'
      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300';
  return (
    <div className={`border rounded-md px-3 py-2 text-xs ${palette}`}>
      {children}
    </div>
  );
}

export function ScoopNew() {
  const navigate = useNavigate();
  const { app } = useApp();
  const [form, setForm] = useState<ScoopForm>(() => ({
    ...emptyForm,
    application_id: app?.id,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ScoopForm>(key: K, value: ScoopForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!app) next.app = 'Selecciona una app antes de crear un scoop';
    const trimmedName = form.name?.trim();
    if (trimmedName && !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(trimmedName)) {
      next.name = 'Minusculas, digitos y guiones, sin empezar ni terminar en guion (DNS-1123)';
    }
    if (form.min_replicas < 0) next.min_replicas = 'Must be >= 0';
    if (form.max_replicas < form.min_replicas) next.max_replicas = 'Must be >= min_replicas';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      const scoop = await scoopsApi.create(form);
      navigate(`/scoops/${scoop.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
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

  // El registry es IMPLICITO al app global: el backend lo deriva como
  // `<docker_image_base>:<version|latest>`. Mostramos lo que se va a usar
  // para que el usuario vea de donde sale.
  const derivedRegistry = app?.docker_image_base
    ? `${app.docker_image_base}:${form.version?.trim() || 'latest'}`
    : null;

  return (
    <div className="p-4 lg:p-6 text-slate-800 dark:text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="page-title mb-1">
          <Box />
          New Scoop
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Define la infra de una aplicacion para desplegarla en el cluster.
        </p>

        {formError && (
          <div className="mb-4 alert alert-red">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm">{formError}</span>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="card p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>App</label>
              {app ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30">
                  <AppWindow className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-white truncate">
                    {app.name}
                  </span>
                  <code className="text-xs text-slate-500 dark:text-slate-400">{app.slug}</code>
                  <span className="ml-auto text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                    App global activa
                  </span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">
                  No hay app seleccionada. Elegi una en el header antes de crear un scoop.
                </div>
              )}
              {errors.app && <p className="text-xs text-red-600 mt-1">{errors.app}</p>}
            </div>

            <div>
              <label className={labelClass}>Scoop name</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder={app?.slug ?? 'mi-scoop'}
                maxLength={63}
                pattern="^[a-z0-9]([-a-z0-9]*[a-z0-9])?$"
                className={`${inputClass} font-mono`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Opcional. Si lo dejas vacio, se usa el slug de la app
                (<code>{app?.slug ?? '<app>'}</code>). Formato DNS-1123: minusculas,
                digitos y guiones, sin empezar ni terminar en guion. No se puede
                cambiar despues de creado (es el nombre del Deployment en el cluster).
              </p>
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as ScoopUiType)}
                className={inputClass}
              >
                <option value="Web">Web</option>
                <option value="Job">Job</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Version</label>
              <input
                type="text"
                value={form.version ?? ''}
                onChange={(e) => set('version', e.target.value)}
                placeholder="latest"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">
                Tag de la imagen. Si lo dejas vacio, se usa <code>latest</code>.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>URL Registry</label>
              <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 font-mono text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {derivedRegistry ?? (
                    <span className="text-amber-600 dark:text-amber-400 italic">
                      La app no tiene docker_image_base definido. Edita la app para asignarle uno.
                    </span>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Se deriva automaticamente del <code>docker_image_base</code> de la app
                + el <code>version</code> de este scoop. No se puede editar aca: para
                cambiar el registry, edita la app.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_productive}
                  onChange={(e) => set('is_productive', e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Marcar como produccion
                </span>
              </label>
            </div>

            <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <h2 className="text-sm font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-3">
                Recursos
              </h2>
              <EnvFromPicker
                selected={form.env_from ?? []}
                onChange={(next) => set('env_from', next)}
                appSlug={app?.slug ?? ''}
              />
            </div>

            <NumberInput
              label="Requested vCPU"
              value={form.requested_vcpu}
              min={0}
              step={0.1}
              onChange={(v) => set('requested_vcpu', v)}
              hint="Ej: 0.1, 1"
            />
            <NumberInput
              label="Requested Memory (Mi)"
              value={form.requested_memory}
              min={0}
              step={1}
              onChange={(v) => set('requested_memory', v)}
            />
            <NumberInput
              label="Limit vCPU"
              value={form.limit_vcpu}
              min={0}
              step={0.1}
              onChange={(v) => set('limit_vcpu', v)}
              hint="Ej: 0.5, 1"
            />
            <NumberInput
              label="Limit Memory (Mi)"
              value={form.limit_memory}
              min={0}
              step={1}
              onChange={(v) => set('limit_memory', v)}
            />
            <NumberInput
              label="Min Replicas"
              value={form.min_replicas}
              min={0}
              step={1}
              onChange={(v) => set('min_replicas', v)}
            />
            <NumberInput
              label="Max Replicas"
              value={form.max_replicas}
              min={0}
              step={1}
              onChange={(v) => set('max_replicas', v)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => navigate('/scoops')}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !app}
              className="btn-primary"
            >
              {saving ? 'Creating...' : 'Create Scoop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}