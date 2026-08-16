import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, RefreshCw, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { ApiError } from '../api/laurel';
import {
  systemSecretsApi,
  type ManagedSecretContent,
  type ManagedSecretMeta,
  type UpdateSecretResponse,
} from '../api/secrets';

interface FetchState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

const EMPTY_META: FetchState<ManagedSecretMeta[]> = { loading: false, error: null, data: null };
const EMPTY_CONTENT: FetchState<ManagedSecretContent> = { loading: false, error: null, data: null };

function Banner({ kind, children }: { kind: 'error' | 'warn' | 'info' | 'success'; children: React.ReactNode }) {
  const palette = {
    error: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300',
    warn: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300',
    info: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300',
  }[kind];
  const Icon = kind === 'error' || kind === 'warn' ? ShieldAlert : AlertCircle;
  return (
    <div className={`flex gap-2 items-start border rounded-md px-3 py-2 text-sm ${palette}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function Secrets() {
  const [list, setList] = useState<FetchState<ManagedSecretMeta[]>>(EMPTY_META);
  const [content, setContent] = useState<FetchState<ManagedSecretContent>>(EMPTY_CONTENT);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [reveal, setReveal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ kind: 'error' | 'warn' | 'success'; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    setList({ loading: true, error: null, data: list.data });
    try {
      const data = await systemSecretsApi.list();
      setList({ loading: false, error: null, data: data.items });
    } catch (e) {
      setList({ loading: false, error: errMsg(e), data: list.data });
    }
  }, [list.data]);

  const openSecret = useCallback(async (id: string) => {
    setActiveId(id);
    setContent({ loading: true, error: null, data: null });
    setDraft('');
    setReveal(id !== 'laurel-secrets'); // .env values are usually sensitive
    setBanner(null);
    try {
      const data = await systemSecretsApi.get(id);
      setContent({ loading: false, error: null, data });
      setDraft(data.content);
    } catch (e) {
      setContent({ loading: false, error: errMsg(e), data: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSave() {
    if (!activeId || !content.data) return;
    setSaving(true);
    setBanner(null);
    try {
      const result: UpdateSecretResponse = await systemSecretsApi.update(activeId, draft);
      if (result.restarted) {
        setBanner({ kind: 'success', msg: `Guardado. El pod se esta reiniciando (patched_at ${result.patched_at}).` });
      } else {
        setBanner({
          kind: 'warn',
          msg: `Guardado, pero el rollout fallo: ${result.restart_error ?? 'unknown'}. El pod no recargo el contenido aun.`,
        });
      }
      refresh();
      const reloaded = await systemSecretsApi.get(activeId);
      setContent({ loading: false, error: null, data: reloaded });
      setDraft(reloaded.content);
    } catch (e) {
      setBanner({ kind: 'error', msg: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  const dirty = content.data != null && draft !== content.data.content;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <KeyRound className="w-6 h-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Secretos del sistema</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Edita los secretos que monta el propio backend (laurel-secrets, laurel-kubeconfig). Cualquier cambio
              dispara un rollout del deployment.
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={refresh}>
          <RefreshCw className={`w-4 h-4 ${list.loading ? 'animate-spin' : ''}`} /> Refrescar
        </button>
      </header>

      {list.error && <Banner kind="error">{list.error}</Banner>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card divide-y divide-slate-200 dark:divide-slate-800">
          {list.loading && !list.data && (
            <div className="p-4 text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          )}
          {list.data?.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => openSecret(item.id)}
              className={`w-full text-left p-3 transition-colors ${
                activeId === item.id
                  ? 'bg-[#e8f0fe] dark:bg-blue-950/60'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">{item.name}</span>
                <span className="text-[10px] uppercase text-slate-400">
                  {item.kind === 'env' ? '.env' : 'text'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {item.namespace} / clave <code className="text-slate-700 dark:text-slate-300">{item.key}</code>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {item.kind === 'env'
                  ? `${item.keys_count} variables${item.env_keys ? `: ${item.env_keys.slice(0, 4).join(', ')}${item.env_keys.length > 4 ? '...' : ''}` : ''}`
                  : `${item.keys_count} lineas`}
                {' '}· {fmtBytes(item.size_bytes)}
              </div>
            </button>
          ))}
          {list.data && list.data.length === 0 && (
            <div className="p-4 text-sm text-slate-500">No hay secretos gestionados.</div>
          )}
        </aside>

        <section className="card p-4 space-y-3">
          {!activeId && (
            <p className="text-sm text-slate-500">Selecciona un secreto de la izquierda para editarlo.</p>
          )}
          {content.loading && (
            <div className="text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          )}
          {content.error && <Banner kind="error">{content.error}</Banner>}
          {content.data && (
            <>
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {content.data.namespace}/{content.data.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Clave editada: <code>{content.data.key}</code> · {fmtBytes(content.data.content.length)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center gap-2"
                    onClick={() => setReveal((v) => !v)}
                  >
                    {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {reveal ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar y reiniciar
                  </button>
                </div>
              </div>

              {banner && <Banner kind={banner.kind}>{banner.msg}</Banner>}

              {content.data.kind === 'env' && content.data.entries && (
                <p className="text-xs text-slate-500">
                  {content.data.entries.length} variables detectadas. Edita el texto abajo como
                  <code className="mx-1">CLAVE=VALOR</code>
                  (una por linea, lineas con <code>#</code> son comentarios).
                </p>
              )}

              <textarea
                className="input font-mono text-xs h-[440px]"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                style={reveal ? undefined : { WebkitTextSecurity: 'disc' } as React.CSSProperties}
              />

              <p className="text-xs text-slate-400">
                El contenido se envia tal cual al cluster y se reemplaza en una clave del secret. El deployment
                del backend se reinicia para recargar <code>.env</code> / <code>k3s.yaml</code>.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
