import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Box, Globe, RefreshCw, Server, Ship } from 'lucide-react';
import {
  clusterApi,
  type ClusterHealth,
  type ClusterOverview,
  type DeployRow,
  type IngressRow,
  type NamespaceRow,
  type PodRow,
  type ServiceRow,
} from '../api/cluster';

const cardClass =
  'bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700';
const thClass =
  'px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide';
const tdClass = 'px-3 py-2 text-sm text-slate-600 dark:text-slate-400';
const tdStrong = 'px-3 py-2 text-sm font-medium text-slate-800 dark:text-white';

function SectionTitle({ icon: Icon, children }: { icon?: typeof Box; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {children}
      </h2>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 text-center text-slate-600 dark:text-slate-400 text-sm">
      {children}
    </div>
  );
}

function Badge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
      OK
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
      DOWN
    </span>
  );
}

function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  const palette =
    phase === 'Running'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : phase === 'Succeeded'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        : phase === 'Failed'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${palette}`}>{phase}</span>
  );
}

export function Cluster() {
  const [health, setHealth] = useState<ClusterHealth | null>(null);
  const [overview, setOverview] = useState<ClusterOverview | null>(null);
  const [namespaces, setNamespaces] = useState<NamespaceRow[]>([]);
  const [deployments, setDeployments] = useState<DeployRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [ingresses, setIngresses] = useState<IngressRow[]>([]);
  const [pods, setPods] = useState<PodRow[]>([]);
  const [namespace, setNamespace] = useState<string>('user-apps');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ns = namespace) => {
    setLoading(true);
    setError(null);
    try {
      const [h, o, nsList, dep, svc, ing, pd] = await Promise.all([
        clusterApi.health(),
        clusterApi.overview().catch(() => null),
        clusterApi.namespaces().catch(() => [] as NamespaceRow[]),
        clusterApi.deployments(ns).catch(() => [] as DeployRow[]),
        clusterApi.services(ns).catch(() => [] as ServiceRow[]),
        clusterApi.ingresses(ns).catch(() => [] as IngressRow[]),
        clusterApi.pods(ns).catch(() => [] as PodRow[]),
      ]);
      setHealth(h);
      setOverview(o);
      setNamespaces(nsList);
      setDeployments(dep);
      setServices(svc);
      setIngresses(ing);
      setPods(pd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el cluster');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const nodes = overview?.nodes ?? [];

  return (
    <div className="p-4 lg:p-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Server className="w-7 h-7" />
          Cluster
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Namespace del cluster a inspeccionar"
          >
            {namespaces.length === 0 ? (
              <option value={namespace}>{namespace}</option>
            ) : (
              namespaces.map((ns) => (
                <option key={ns.name} value={ns.name}>
                  {ns.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className={cardClass}>
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">
            Consultando el cluster...
          </div>
        </div>
      ) : (
        <>
          {/* Version / platform / api server */}
          {overview && (overview.version || overview.platform || overview.api_server) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={cardClass}>
                <div className="p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Version
                  </div>
                  <div className="font-mono text-lg">{String(overview.version ?? '—')}</div>
                </div>
              </div>
              <div className={cardClass}>
                <div className="p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Platform
                  </div>
                  <div className="text-lg font-medium">{String(overview.platform ?? '—')}</div>
                </div>
              </div>
              <div className={cardClass}>
                <div className="p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    API Server
                  </div>
                  <div className="font-mono text-sm break-all">{String(overview.api_server ?? '—')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={cardClass}>
              <div className="p-5">
                <SectionTitle>Health</SectionTitle>
                {health ? (
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-slate-600 dark:text-slate-400">Servicio</dt>
                      <dd className="font-medium">{health.service}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-slate-600 dark:text-slate-400">Estado</dt>
                      <dd>
                        <Badge ok={health.status === 'ok'} />
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos</p>
                )}
              </div>
            </div>
            <div className={cardClass}>
              <div className="p-5">
                <SectionTitle>Nodes ({nodes.length})</SectionTitle>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Ready:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {nodes.filter((n) => n.ready).length}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-600 dark:text-slate-400">{nodes.length}</span>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <div className="p-5">
                <SectionTitle>Resumen</SectionTitle>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-600 dark:text-slate-400">Deployments</dt>
                    <dd className="font-medium">{deployments.length}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-600 dark:text-slate-400">Pods</dt>
                    <dd className="font-medium">{pods.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Nodes */}
          {nodes.length > 0 && (
            <div className={`${cardClass} p-5 mb-6`}>
              <SectionTitle icon={Server}>Nodes</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {nodes.map((n) => (
                  <div
                    key={n.name}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm break-all">{n.name}</div>
                      <Badge ok={n.ready} />
                    </div>
                    {n.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {n.roles.map((r) => (
                          <span
                            key={r}
                            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    <dl className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Kubelet</dt>
                        <dd className="font-mono">{n.kubelet_version || '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">CPU</dt>
                        <dd className="font-mono">{n.capacity?.cpu ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Memoria</dt>
                        <dd className="font-mono">{n.capacity?.memory ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Pods max</dt>
                        <dd className="font-mono">{n.capacity?.pods ?? '—'}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Namespaces */}
          {namespaces.length > 0 && (
            <div className={`${cardClass} p-5 mb-6`}>
              <SectionTitle>Namespaces ({namespaces.length})</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {namespaces.map((ns) => (
                  <span
                    key={ns.name}
                    className="px-2 py-1 rounded text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {ns.name}
                    {ns.phase === 'Terminating' && (
                      <span className="ml-1 text-red-500 dark:text-red-400">(terminando)</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deployments */}
          <div className={`${cardClass} mb-6`}>
            <div className="p-5 pb-3">
              <SectionTitle icon={Box}>Deployments ({deployments.length})</SectionTitle>
            </div>
            {deployments.length === 0 ? (
              <EmptyHint>Sin deployments (o el cluster no responde).</EmptyHint>
            ) : (
              <div className="overflow-x-auto p-5 pt-0">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      {['Nombre', 'Namespace', 'Replicas', 'Disponibles', 'Imagen'].map((h) => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deployments.map((d) => (
                      <tr key={`${d.namespace}/${d.name}`} className="border-t border-slate-100 dark:border-slate-700">
                        <td className={tdStrong}>{String(d.name)}</td>
                        <td className={tdClass}>{String(d.namespace)}</td>
                        <td className={tdClass}>
                          {d.ready_replicas ?? 0}/{d.replicas ?? 0}
                        </td>
                        <td className={tdClass}>{d.available_replicas ?? 0}</td>
                        <td className={`${tdClass} break-all max-w-xs`}>
                          {(d.images ?? []).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Services */}
          <div className={`${cardClass} mb-6`}>
            <div className="p-5 pb-3">
              <SectionTitle>Services ({services.length})</SectionTitle>
            </div>
            {services.length === 0 ? (
              <EmptyHint>Sin services.</EmptyHint>
            ) : (
              <div className="overflow-x-auto p-5 pt-0">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      {['Nombre', 'Namespace', 'Tipo', 'Cluster IP', 'Puertos'].map((h) => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={`${s.namespace}/${s.name}`} className="border-t border-slate-100 dark:border-slate-700">
                        <td className={tdStrong}>{String(s.name)}</td>
                        <td className={tdClass}>{String(s.namespace)}</td>
                        <td className={tdClass}>{String(s.type ?? '—')}</td>
                        <td className={`${tdClass} font-mono`}>{s.cluster_ip ?? '—'}</td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-1">
                            {(s.ports ?? []).map((p, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              >
                                {p.port}
                                {p.node_port ? `:${p.node_port}` : ''}/{p.protocol ?? ''}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ingresses */}
          <div className={`${cardClass} mb-6`}>
            <div className="p-5 pb-3">
              <SectionTitle icon={Globe}>Ingresses ({ingresses.length})</SectionTitle>
            </div>
            {ingresses.length === 0 ? (
              <EmptyHint>Sin ingresses.</EmptyHint>
            ) : (
              <div className="overflow-x-auto p-5 pt-0">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      {['Nombre', 'Hosts', 'Clase', 'Reglas'].map((h) => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingresses.map((ing) => (
                      <tr key={`${ing.namespace}/${ing.name}`} className="border-t border-slate-100 dark:border-slate-700">
                        <td className={tdStrong}>{String(ing.name)}</td>
                        <td className={`${tdClass} font-mono`}>
                          {(ing.hosts ?? []).join(', ') || '—'}
                        </td>
                        <td className={tdClass}>{String(ing.ingress_class ?? '—')}</td>
                        <td className={tdClass}>{(ing.rules ?? []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pods */}
          <div className={`${cardClass} mb-6`}>
            <div className="p-5 pb-3">
              <SectionTitle icon={Ship}>Pods ({pods.length})</SectionTitle>
            </div>
            {pods.length === 0 ? (
              <EmptyHint>Sin pods.</EmptyHint>
            ) : (
              <div className="overflow-x-auto p-5 pt-0">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      {['Nombre', 'Namespace', 'Estado', 'Ready', 'Restarts', 'Nodo'].map((h) => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pods.map((p) => (
                      <tr key={`${p.namespace}/${p.name}`} className="border-t border-slate-100 dark:border-slate-700">
                        <td className={tdStrong}>
                          {String(p.name)}
                          {p.reason && (
                            <span className="block text-xs text-red-600 dark:text-red-400 font-normal">
                              {String(p.reason)}
                            </span>
                          )}
                        </td>
                        <td className={tdClass}>{String(p.namespace)}</td>
                        <td className={tdClass}>
                          <PhaseBadge phase={p.phase} />
                        </td>
                        <td className={tdClass}>{String(p.ready ?? '—')}</td>
                        <td className={tdClass}>{p.restarts ?? 0}</td>
                        <td className={`${tdClass} font-mono`}>{p.node ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}