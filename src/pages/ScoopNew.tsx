import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Box } from 'lucide-react';
import {
  ApiError,
  scoopsApi,
  type ScoopForm,
  type ScoopUiType,
} from '../api/scoops';

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

export function ScoopNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ScoopForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ScoopForm>(key: K, value: ScoopForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.application.trim()) next.application = 'Application is required';
    if (!form.url_registry.trim()) next.url_registry = 'URL Registry is required';
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
            <div>
              <label className={labelClass}>Application *</label>
              <input
                type="text"
                value={form.application}
                onChange={(e) => set('application', e.target.value)}
                placeholder="mi-aplicacion"
                className={inputClass}
              />
              {errors.application && <p className="text-xs text-red-600 mt-1">{errors.application}</p>}
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

            <div className="md:col-span-2">
              <label className={labelClass}>URL Registry *</label>
              <RegistryInput
                value={form.url_registry}
                onChange={(v) => set('url_registry', v)}
                className={inputClass}
              />
              {errors.url_registry && <p className="text-xs text-red-600 mt-1">{errors.url_registry}</p>}
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
              disabled={saving}
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