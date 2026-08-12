import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Rocket,
  Undo2,
  RefreshCw,
  FileCode,
  ScrollText,
  AlertCircle,
  CheckCircle2,
  Box,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import {
  ApiError,
  scoopsApi,
  type ManifestPreview,
  type PodLogEntry,
  type Scoop,
  type ScoopStatusReport,
} from '../api/scoops';

type ActionKind = 'preview' | 'logs' | 'deployResult' | 'none';

const statusClass: Record<Scoop['status'], string> = {
  active: 'badge-green',
  pending: 'badge-amber',
  error: 'badge-red',
};

const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1';

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
      <div className={labelClass}>{label}</div>
      <div className="text-sm text-slate-800 dark:text-white font-medium">{value}</div>
    </div>
  );
}

export function ScoopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scoopId = Number(id);

  const [scoop, setScoop] = useState<Scoop | null>(null);
  const [status, setStatus] = useState<ScoopStatusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Resultado de la ultima accion del usuario (deploy, preview, logs).
  const [actionKind, setActionKind] = useState<ActionKind>('none');
  const [manifestPreview, setManifestPreview] = useState<ManifestPreview | null>(null);
  const [deployResult, setDeployResult] = useState<{ kind: string; name: string; action: string }[] | null>(null);
  const [logs, setLogs] = useState<PodLogEntry[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, st] = await Promise.all([
        scoopsApi.get(scoopId),
        scoopsApi.status(scoopId),
      ]);
      setScoop(s);
      setStatus(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [scoopId]);

  useEffect(() => {
    if (Number.isFinite(scoopId)) void load();
  }, [scoopId, load]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setActionError(null);
    setActionKind('none');
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(null);
    }
  };

  const handleDeploy = () => runAction('deploy', async () => {
    const result = await scoopsApi.deploy(scoopId, {});
    setDeployResult(result.resources);
    setActionKind('deployResult');
    await load();
  });

  const handleUndeploy = () => {
    if (!window.confirm(`Eliminar los recursos de "${scoop?.application}" del cluster?`)) return;
    void runAction('undeploy', async () => {
      await scoopsApi.undeploy(scoopId);
      setDeployResult(null);
      setActionKind('none');
      await load();
    });
  };

  const handleDryRun = () => runAction('dryRun', async () => {
    const result = await scoopsApi.deploy(scoopId, { dryRun: true });
    setDeployResult(result.resources);
    setActionKind('deployResult');
  });

  const handlePreview = () => runAction('preview', async () => {
    const preview = await scoopsApi.previewManifests(scoopId);
    setManifestPreview(preview);
    setActionKind('preview');
  });

  const handleLogs = () => runAction('logs', async () => {
    const result = await scoopsApi.logs(scoopId, { tailLines: 100 });
    setLogs(result.pods);
    setActionKind('logs');
  });

  if (loading) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <p className="text-slate-500">Loading scoop #{scoopId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <Link to="/scoops" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Scoops
        </Link>
        <div className="alert alert-red">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!scoop) return null;

  return (
    <div className="p-6 text-slate-800 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/scoops"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Box className="w-7 h-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">{scoop.application}</h1>
            <p className="text-sm text-slate-500 font-mono">{scoop.name}</p>
          </div>
          <span className={`badge ${statusClass[scoop.status]}`}>
            {scoop.status_label}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/scoops?edit=${scoop.id}`)}
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

      {/* Acciones principales */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDeploy}
            disabled={busy !== null}
            className="btn-primary"
          >
            <Rocket className="w-4 h-4" />
            {busy === 'deploy' ? 'Deploying...' : 'Deploy'}
          </button>
          <button
            onClick={handleUndeploy}
            disabled={busy !== null || !status?.deployed}
            className="btn-secondary"
          >
            <Undo2 className="w-4 h-4" />
            {busy === 'undeploy' ? 'Undeploying...' : 'Undeploy'}
          </button>
          <button
            onClick={handleDryRun}
            disabled={busy !== null}
            className="btn-secondary"
          >
            <CheckCircle2 className="w-4 h-4" />
            Dry run
          </button>
          <button
            onClick={handlePreview}
            disabled={busy !== null}
            className="btn-secondary"
          >
            <FileCode className="w-4 h-4" />
            Preview manifests
          </button>
          <button
            onClick={handleLogs}
            disabled={busy !== null || !status?.pods?.length}
            className="btn-secondary"
          >
            <ScrollText className="w-4 h-4" />
            Get logs
          </button>
        </div>
      </div>

      {/* Estado en el cluster */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Cluster status
          {status && <span className="text-xs font-normal text-slate-500 ml-2">namespace: {status.namespace}</span>}
        </h2>
        {status ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="Deployed" value={status.deployed ? 'Yes' : 'No'} />
              <Stat label="Replicas" value={
                status.desired_replicas === null ? '-' :
                `${status.ready_replicas ?? 0}/${status.desired_replicas}`
              } />
              <Stat label="Available" value={status.available_replicas ?? '-'} />
              <Stat label="Message" value={status.message ?? '-'} />
            </div>
            {status.pods.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Pod</th>
                    <th className="th">Phase</th>
                    <th className="th">Ready</th>
                    <th className="th">Restarts</th>
                    <th className="th">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {status.pods.map((p) => (
                    <tr key={p.name} className="tr">
                      <td className="py-2 font-mono">{p.name}</td>
                      <td className="py-2">{p.phase}</td>
                      <td className="py-2">{p.ready}</td>
                      <td className="py-2">{p.restarts}</td>
                      <td className="py-2 text-red-600">{p.reason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">No status available.</p>
        )}
      </div>

      {/* Especificacion del scoop */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Specification</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Type" value={scoop.type} />
          <Stat label="Productive" value={scoop.is_productive ? 'Yes' : 'No'} />
          <Stat label="Version" value={scoop.version ?? '-'} />
          <Stat label="Port (LB)" value={scoop.port ?? 'interno'} />
          <Stat label="Image" value={
            scoop.url_registry ? (
              <a href={`https://${scoop.url_registry.split('/').slice(0, -1).join('/')}`}
                 target="_blank" rel="noopener noreferrer"
                 className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono">
                {scoop.url_registry}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : '-'
          } />
          <Stat label="Replicas" value={`${scoop.min_replicas} / ${scoop.max_replicas}`} />
          <Stat label="CPU req / lim" value={`${scoop.requested_vcpu} / ${scoop.limit_vcpu}`} />
          <Stat label="Memory req / lim" value={`${scoop.requested_memory}M / ${scoop.limit_memory}M`} />
        </div>
      </div>

      {/* Resultado de la ultima accion */}
      {actionError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{actionError}</span>
        </div>
      )}

      {actionKind === 'deployResult' && deployResult && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Deploy result</h2>
          <table className="table">
            <thead>
              <tr>
                <th className="th">Kind</th>
                <th className="th">Name</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {deployResult.map((r, i) => (
                <tr key={i} className="tr">
                  <td className="py-2">{r.kind}</td>
                  <td className="py-2 font-mono">{r.name}</td>
                  <td className="py-2">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionKind === 'preview' && manifestPreview && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Manifests preview
            <span className="text-xs font-normal text-slate-500 ml-2">namespace: {manifestPreview.namespace}</span>
          </h2>
          {manifestPreview.manifests.map((m, i) => (
            <details key={i} className="mb-2 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <summary className="cursor-pointer px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-sm font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                {m.kind} / {m.metadata.name}
              </summary>
              <pre className="p-3 text-xs overflow-x-auto bg-slate-50 dark:bg-slate-900/60 rounded-b-xl">
                {JSON.stringify(m, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}

      {actionKind === 'logs' && logs && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Logs
            <span className="text-xs font-normal text-slate-500 ml-2">tail 100 lines</span>
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No logs available.</p>
          ) : (
            logs.map((entry) => (
              <details key={entry.pod} className="mb-2 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <summary className="cursor-pointer px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-sm font-medium font-mono">
                  {entry.pod}
                </summary>
                <pre className="p-3 text-xs overflow-x-auto bg-slate-900 text-green-300 rounded-b-xl max-h-96 overflow-y-auto">
                  {entry.logs || '(empty)'}
                </pre>
              </details>
            ))
          )}
        </div>
      )}
    </div>
  );
}