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
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from 'lucide-react';
import {
  ApiError,
  scoopsApi,
  type CertificateReport,
  type ManifestPreview,
  type PodLogEntry,
  type Scoop,
  type ScoopStatusReport,
} from '../api/scoops';

type ActionKind = 'preview' | 'logs' | 'deployResult' | 'certificate' | 'none';

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
  const [certificate, setCertificate] = useState<CertificateReport | null>(null);
  const [certLogs, setCertLogs] = useState<PodLogEntry[] | null>(null);
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

  const handleCertificate = () => runAction('certificate', async () => {
    const report = await scoopsApi.certificate(scoopId, status?.namespace);
    setCertificate(report);
    setActionKind('certificate');
    if (report.certificate?.secret_exists) {
      const logs = await scoopsApi.certificateLogs(scoopId);
      setCertLogs(logs.pods);
    } else {
      setCertLogs(null);
    }
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
          {scoop.host && (
            <button
              onClick={handleCertificate}
              disabled={busy !== null}
              className="btn-secondary"
            >
              <ShieldCheck className="w-4 h-4" />
              TLS certificate
            </button>
          )}
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

      {actionKind === 'certificate' && certificate && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            TLS certificate
            {certificate.certificate ? (
              certificate.certificate.ready ? (
                <span className="badge badge-green">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="badge badge-amber">
                  <ShieldAlert className="w-3 h-3" /> {certificate.certificate.condition.reason ?? 'Pending'}
                </span>
              )
            ) : (
              <span className="badge badge-red"><ShieldX className="w-3 h-3" /> Not found</span>
            )}
          </h2>

          {certificate.host && (
            <p className="text-xs font-mono text-slate-500 mb-3">
              {certificate.host}
              {certificate.certificate && (
                <span className="ml-3">
                  secret: {certificate.certificate.secret_name}
                  {' '}
                  <span className={certificate.certificate.secret_exists ? 'text-green-600' : 'text-red-600'}>
                    ({certificate.certificate.secret_exists ? 'existe' : 'no existe'})
                  </span>
                </span>
              )}
            </p>
          )}

          {certificate.message && (
            <p className={`text-sm mb-4 ${certificate.certificate?.ready ? 'text-green-600' : 'text-amber-600'}`}>
              {certificate.message}
            </p>
          )}

          {certificate.certificate && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Stat label="Estado" value={certificate.certificate.ready ? 'Emitido' : (certificate.certificate.condition.reason ?? 'En proceso')} />
              <Stat label="Secret TLS" value={certificate.certificate.secret_exists ? 'Creado' : 'Pendiente'} />
              <Stat label="Issuer" value="letsencrypt-prod" />
            </div>
          )}

          {certificate.certificate_request && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                CertificateRequest {certificate.certificate_request.name}
              </h3>
              {certificate.certificate_request.conditions.map((c, i) => (
                <p key={i} className="text-sm mb-1">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {c.type} {c.status}
                  </span>{' '}
                  {c.reason && <span className="text-amber-600 text-xs">{c.reason}</span>}
                  {c.message && <span className="text-slate-500 text-xs block mt-1">{c.message}</span>}
                </p>
              ))}
            </div>
          )}

          {certificate.challenges.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                ACME challenges
              </h3>
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">DNS</th>
                    <th className="th">State</th>
                    <th className="th">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {certificate.challenges.map((c) => (
                    <tr key={c.name} className="tr">
                      <td className="py-2 font-mono">{c.name}</td>
                      <td className="py-2 font-mono">{c.dns_name}</td>
                      <td className="py-2">{c.state ?? '-'}</td>
                      <td className="py-2 text-red-600">{c.reason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {certificate.events.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Events</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Type</th>
                    <th className="th">Reason</th>
                    <th className="th">Message</th>
                    <th className="th">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {certificate.events.map((e, i) => (
                    <tr key={i} className="tr">
                      <td className="py-2">
                        <span className={`badge ${e.type === 'Normal' ? 'badge-green' : 'badge-red'}`}>{e.type}</span>
                      </td>
                      <td className="py-2">{e.reason}</td>
                      <td className="py-2 text-xs">{e.message}</td>
                      <td className="py-2">{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {certLogs && certLogs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                cert-manager logs (filtrados por {certificate.certificate?.name})
              </h3>
              {certLogs.map((entry) => (
                <details key={entry.pod} className="mb-2 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <summary className="cursor-pointer px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-sm font-medium font-mono">
                    {entry.pod}
                  </summary>
                  <pre className="p-3 text-xs overflow-x-auto bg-slate-900 text-green-300 rounded-b-xl max-h-96 overflow-y-auto">
                    {entry.logs || '(sin coincidencias)'}
                  </pre>
                </details>
              ))}
            </div>
          )}

          {!certificate.certificate && !certLogs?.length && (
            <p className="text-sm text-slate-500">Desplega el scoop para generar el certificado TLS.</p>
          )}
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