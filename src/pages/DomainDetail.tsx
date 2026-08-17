import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
  ScrollText,
  ShieldAlert,
  ShieldX,
  Undo2,
} from 'lucide-react';
import { ApiError } from '../api/laurel';
import {
  domainsApi,
  type Domain,
  type DomainStatus,
} from '../api/domains';
import { DeployPanel } from '../components/DeployPanel';
import { useDeployPolling } from '../hooks/useDeployPolling';

type DeployResult = { kind: string; name: string; action?: string; deleted?: boolean };

interface EventEntry {
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  last?: string | null;
}

const statusClass: Record<Domain['status'], string> = {
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

export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const domainId = Number(id);

  const [domain, setDomain] = useState<Domain | null>(null);
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult[] | null>(null);
  const [certLogs, setCertLogs] = useState<Array<{ pod: string; logs: string }> | null>(null);
  const [deploying, setDeploying] = useState(false);

  const deployDone = (st: DomainStatus) => st.deployed === true;

  const deployPoll = useDeployPolling<DomainStatus>(
    () => domainsApi.status(domainId),
    deployDone,
    { enabled: deploying },
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, st] = await Promise.all([
        domainsApi.get(domainId),
        domainsApi.status(domainId),
      ]);
      setDomain(d);
      setStatus(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => {
    if (Number.isFinite(domainId)) void load();
  }, [domainId, load]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(null);
    }
  };

  const handleDeploy = () => runAction('deploy', async () => {
    const result = await domainsApi.deploy(domainId);
    setDeployResult(result.resources);
    setDeploying(true);
  });

  const closeDeployPanel = () => {
    setDeploying(false);
    setDeployResult(null);
    void load();
  };

  const handleUndeploy = () => {
    if (!window.confirm(`Quitar Ingress + Certificate + DNS de "${domain?.host}"?`)) return;
    void runAction('undeploy', async () => {
      await domainsApi.undeploy(domainId);
      setDeployResult(null);
      setDeploying(false);
      await load();
    });
  };

  const handleCertificateLogs = () => runAction('certificateLogs', async () => {
    const result = await domainsApi.certificateLogs(domainId);
    setCertLogs(result.pods);
  });

  if (loading) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <p className="text-slate-500">Loading domain #{domainId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-slate-800 dark:text-white">
        <Link to="/domains" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Domains
        </Link>
        <div className="alert alert-red">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!domain) return null;

  const events = (status?.events ?? []) as EventEntry[];
  const cert = status?.certificate;

  return (
    <div className="p-6 text-slate-800 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/domains')}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Globe className="w-7 h-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold font-mono">{domain.host}</h1>
            <p className="text-sm text-slate-500">namespace: {domain.namespace}</p>
          </div>
          <span className={`badge ${statusClass[domain.status]}`}>
            {domain.status}
          </span>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading || busy !== null}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            onClick={handleCertificateLogs}
            disabled={busy !== null}
            className="btn-secondary"
          >
            <ScrollText className="w-4 h-4" />
            Certificate logs
          </button>
        </div>
      </div>

      {/* Deploy en vivo */}
      {deploying && (
        <DeployPanel
          title="Deploying domain"
          data={deployPoll.data}
          loading={deployPoll.loading}
          error={deployPoll.error}
          done={deployPoll.done}
          onClose={closeDeployPanel}
        >
          {(st) => (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Deployed" value={st.deployed ? 'Yes' : 'No'} />
              <Stat label="Ingress" value={st.ingress_exists ? 'Exists' : 'Missing'} />
              <Stat label="Certificate" value={st.certificate_ready ? 'Ready' : 'Pending'} />
              <Stat label="Message" value={st.message ?? '-'} />
            </div>
          )}
        </DeployPanel>
      )}

      {/* Especificacion del domain */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Specification</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Host" value={<span className="font-mono">{domain.host}</span>} />
          <Stat label="Application" value={domain.application_slug} />
          <Stat label="Scoop" value={domain.scoop_name} />
          <Stat label="Namespace" value={<span className="font-mono">{domain.namespace}</span>} />
          <Stat label="TLS" value={domain.tls ? 'Si' : 'No'} />
          <Stat label="Status" value={domain.status} />
          <Stat label="Secret name" value={<span className="font-mono">{domain.secret_name}</span>} />
        </div>
      </div>

      {/* Estado en el cluster */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Cluster status</h2>
        {status ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="Deployed" value={status.deployed ? 'Yes' : 'No'} />
              <Stat label="Ingress" value={status.ingress_exists ? 'Exists' : 'Missing'} />
              <Stat label="Certificate" value={status.certificate_ready ? 'Ready' : 'Pending'} />
              <Stat label="Message" value={status.message ?? '-'} />
            </div>

            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
              TLS certificate
              {cert ? (
                cert.ready ? (
                  <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                ) : (
                  <span className="badge badge-amber"><ShieldAlert className="w-3 h-3" /> {cert.condition.reason ?? 'Pending'}</span>
                )
              ) : (
                <span className="badge badge-red"><ShieldX className="w-3 h-3" /> Not found</span>
              )}
            </h3>

            {cert && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Stat label="Certificado" value={cert.ready ? 'Emitido' : (cert.condition.reason ?? 'En proceso')} />
                <Stat label="Secret TLS" value={cert.secret_exists ? 'Creado' : 'Pendiente'} />
                <Stat label="Secret name" value={<span className="font-mono">{cert.secret_name}</span>} />
              </div>
            )}

            {cert?.condition.message && (
              <p className="text-sm text-slate-500 mb-4">{cert.condition.message}</p>
            )}

            {status.challenges.length > 0 && (
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
                    {status.challenges.map((c) => (
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

            {events.length > 0 && (
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
                    {events.map((e, i) => (
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
          </>
        ) : (
          <p className="text-sm text-slate-500">No status available.</p>
        )}
      </div>

      {/* Resultado de la ultima accion */}
      {actionError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{actionError}</span>
        </div>
      )}

      {deployResult && (
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
                  <td className="py-2">{r.action ?? (r.deleted ? 'deleted' : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {certLogs && certLogs.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            cert-manager logs
            <span className="text-xs font-normal text-slate-500 ml-2">
              {certLogs.length > 0 && cert ? cert.name : ''}
            </span>
          </h2>
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

      {certLogs && certLogs.length === 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">cert-manager logs</h2>
          <p className="text-sm text-slate-500">
            {busy === 'certificateLogs' ? <><Loader2 className="w-4 h-4 inline animate-spin mr-1" />Loading...</> : 'No logs available.'}
          </p>
        </div>
      )}
    </div>
  );
}
