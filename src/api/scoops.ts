/**
 * Cliente del API de laurel-infra-manager (Scoops).
 *
 * Vive aparte de `client.ts` porque apunta a otro backend: `client.ts` habla con
 * el configurator (5001) y este con laurel (5002). Inyecta el Bearer JWT via
 * `laurelFetch`.
 */

import { ApiError, laurelFetch, laurelBaseUrl } from './laurel';

export type ScoopUiType = 'Web' | 'Job';
export type ComponentType = 'api' | 'worker' | 'cronjob';
export type ScoopStatus = 'active' | 'pending' | 'error';

/** Forma que devuelve el API. */
export interface ComponentDto {
  id: number;
  name: string;
  application: string;
  type: ComponentType;
  status: ScoopStatus;
  status_label: string;
  version: string | null;
  is_productive: boolean;
  requested_vcpu: string;
  requested_memory: string;
  limit_vcpu: string;
  limit_memory: string;
  min_replicas: number;
  max_replicas: number;
  url_registry: string;
  port: number | null;
  namespace: string;
  schedule: string | null;
  container_port: number | null;
  health_path: string | null;
  host?: string | null;
  url?: string | null;
  created_at: string;
  updated_at: string;
}

/** Forma que usa la UI. */
export interface Scoop {
  id: number;
  name: string;
  application: string;
  /** FK a la aplicacion dueña. La fuente de verdad es `application_id`;
   *  `application` es solo el slug derivado. */
  application_id?: number;
  application_slug?: string;
  type: ScoopUiType;
  url_registry: string;
  is_productive: boolean;
  version: string | null;
  requested_vcpu: number;
  requested_memory: number;
  limit_vcpu: number;
  limit_memory: number;
  min_replicas: number;
  max_replicas: number;
  container_port: number | null;
  health_path: string | null;
  // Derivados del API, solo lectura.
  status: ScoopStatus;
  status_label: string;
  port: number | null;
  namespace: string;
  host?: string | null;
  url?: string | null;
}

export type ScoopForm = {
  /** Slug de la Application (solo se manda si el caller no conoce el ID;
   *  preferido: enviar `application_id` para que el backend lo valide). */
  application?: string;
  /** ID preferido por el backend: si llega, el scoop se vincula a esta app
   *  y `url_registry` se autoderiva del `docker_image_base` de la app. */
  application_id?: number;
  /** Nombre tecnico del scoop (DNS-1123). Opcional: si llega vacio, el
   *  backend lo deriva del slug de la app. Inmutable despues de creado. */
  name?: string;
  type: ScoopUiType;
  /** Solo para scoops SIN app (legacy). Cuando hay app, el backend lo ignora
   *  y usa el docker_image_base de la app + `version` como tag. */
  url_registry?: string;
  is_productive: boolean;
  version?: string | null;
  requested_vcpu: number;
  requested_memory: number;
  limit_vcpu: number;
  limit_memory: number;
  min_replicas: number;
  max_replicas: number;
  env_from?: EnvFromRef[];
};

export interface EnvFromRef {
  type: 'config_map' | 'secret';
  name: string;
  namespace?: string | null;
}

export interface AvailableEnvFromItem {
  type: 'config_map' | 'secret';
  name: string;
  namespace: string;
  app: string;
  keys: string[];
}

export interface AvailableEnvFrom {
  items: AvailableEnvFromItem[];
  namespace: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ManifestPreview {
  namespace: string;
  manifests: Array<{
    apiVersion: string;
    kind: string;
    metadata: { name: string; namespace?: string; labels?: Record<string, string> };
    spec?: Record<string, unknown>;
  }>;
  host?: string;
}

export interface PodInfo {
  name: string;
  phase: string;
  reason: string | null;
  node: string | null;
  pod_ip: string | null;
  restarts: number;
  ready: string;
}

export interface ScoopStatusReport {
  scoop: Scoop;
  deployed: boolean;
  namespace: string;
  desired_replicas: number | null;
  ready_replicas: number | null;
  available_replicas: number | null;
  pods: PodInfo[];
  message: string | null;
}

export interface DeployResult {
  namespace: string;
  dry_run: boolean;
  resources: Array<{ kind: string; name: string; action: 'created' | 'updated' }>;
  scoop: Scoop;
  host?: string;
}

// ---------- conversiones ----------

function toCpuQuantity(v: number): string {
  return Number.isInteger(v) ? String(v) : `${Math.round(v * 1000)}m`;
}

function fromCpuQuantity(v: string): number {
  if (v.endsWith('m')) return Number(v.slice(0, -1)) / 1000;
  return Number(v);
}

function toMemoryQuantity(v: number): string {
  return `${v}Mi`;
}

function fromMemoryQuantity(v: string): number {
  const match = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?$/.exec(v);
  if (!match) return 0;
  const value = Number(match[1]);
  const factors: Record<string, number> = {
    Ki: 1 / 1024, Mi: 1, Gi: 1024, Ti: 1024 * 1024,
    K: 1 / 1000, M: 1, G: 1000, T: 1000 * 1000,
  };
  return Math.round(value * (factors[match[2] ?? 'Mi'] ?? 1));
}

function toUiType(t: ComponentType): ScoopUiType {
  return t === 'api' ? 'Web' : 'Job';
}

function toApiType(t: ScoopUiType): ComponentType {
  return t === 'Web' ? 'api' : 'worker';
}

function toScoop(dto: ComponentDto): Scoop {
  return {
    id: dto.id,
    name: dto.name,
    application: dto.application,
    type: toUiType(dto.type),
    url_registry: dto.url_registry,
    is_productive: dto.is_productive,
    version: dto.version,
    requested_vcpu: fromCpuQuantity(dto.requested_vcpu),
    requested_memory: fromMemoryQuantity(dto.requested_memory),
    limit_vcpu: fromCpuQuantity(dto.limit_vcpu),
    limit_memory: fromMemoryQuantity(dto.limit_memory),
    min_replicas: dto.min_replicas,
    max_replicas: dto.max_replicas,
    container_port: dto.container_port,
    health_path: dto.health_path,
    status: dto.status,
    status_label: dto.status_label,
    port: dto.port,
    namespace: dto.namespace,
    host: dto.host ?? null,
    url: dto.url ?? dto.host ?? null,
  };
}

function toPayload(form: ScoopForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: toApiType(form.type),
    is_productive: form.is_productive,
    requested_vcpu: toCpuQuantity(form.requested_vcpu),
    requested_memory: toMemoryQuantity(form.requested_memory),
    limit_vcpu: toCpuQuantity(form.limit_vcpu),
    limit_memory: toMemoryQuantity(form.limit_memory),
    min_replicas: form.min_replicas,
    max_replicas: form.max_replicas,
    env_from: form.env_from ?? [],
  };
  // application_id es la fuente de verdad: el backend autollena `application`
  // (slug) y `url_registry` desde el record de Application. Solo mandamos
  // `application` (slug) si el caller lo pone explicitamente (legacy).
  if (form.application_id !== undefined) payload.application_id = form.application_id;
  if (form.application) payload.application = form.application;
  if (form.version) payload.version = form.version;
  if (form.url_registry) payload.url_registry = form.url_registry;
  const trimmedName = form.name?.trim();
  if (trimmedName) payload.name = trimmedName;
  return payload;
}

// ---------- API ----------

export const scoopsApi = {
  async list(): Promise<Scoop[]> {
    const data = await laurelFetch<Paginated<ComponentDto>>('/scoops?limit=200');
    return data.items.map(toScoop);
  },

  async get(id: number): Promise<Scoop> {
    const dto = await laurelFetch<ComponentDto>(`/scoops/${id}`);
    return toScoop(dto);
  },

  async create(form: ScoopForm): Promise<Scoop> {
    const dto = await laurelFetch<ComponentDto>('/scoops', {
      method: 'POST',
      body: toPayload(form),
    });
    return toScoop(dto);
  },

  async update(id: number, form: ScoopForm): Promise<Scoop> {
    const payload = toPayload(form);
    delete payload.type;
    const dto = await laurelFetch<ComponentDto>(`/scoops/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return toScoop(dto);
  },

  async availableEnvFrom(opts: {
    namespace?: string;
    app?: string;
  } = {}): Promise<AvailableEnvFrom> {
    const params = new URLSearchParams();
    if (opts.namespace) params.set('namespace', opts.namespace);
    if (opts.app) params.set('app', opts.app);
    const qs = params.toString() ? `?${params}` : '';
    return laurelFetch<AvailableEnvFrom>(`/scoops/available-env-from${qs}`);
  },

  async remove(id: number, opts: { undeploy?: boolean; force?: boolean; namespace?: string } = {}): Promise<void> {
    const params = new URLSearchParams();
    if (opts.undeploy) params.set('undeploy', 'true');
    if (opts.force) params.set('force', 'true');
    if (opts.namespace) params.set('namespace', opts.namespace);
    const qs = params.toString() ? `?${params}` : '';
    await laurelFetch<void>(`/scoops/${id}${qs}`, { method: 'DELETE' });
  },

  async previewManifests(id: number, namespace?: string): Promise<ManifestPreview> {
    const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return laurelFetch<ManifestPreview>(`/scoops/${id}/manifests${qs}`);
  },

  async deploy(id: number, opts: { namespace?: string; dryRun?: boolean } = {}): Promise<DeployResult> {
    const body: Record<string, unknown> = {};
    if (opts.namespace) body.namespace = opts.namespace;
    if (opts.dryRun !== undefined) body.dry_run = opts.dryRun;
    return laurelFetch<DeployResult>(`/scoops/${id}/deploy`, {
      method: 'POST',
      body,
    });
  },

  async undeploy(id: number, namespace?: string): Promise<{ namespace: string; resources: Array<{ kind: string; name: string; deleted: boolean }> }> {
    const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return laurelFetch(`/scoops/${id}/deploy${qs}`, { method: 'DELETE' });
  },

  async status(id: number, namespace?: string): Promise<ScoopStatusReport> {
    const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    const report = await laurelFetch<ScoopStatusReport & { scoop: ComponentDto }>(
      `/scoops/${id}/status${qs}`
    );
    return { ...report, scoop: toScoop(report.scoop) };
  },

  async logs(id: number, opts: { namespace?: string; tailLines?: number; previous?: boolean } = {}): Promise<{ namespace: string; pods: PodLogEntry[] }> {
    const params = new URLSearchParams();
    if (opts.namespace) params.set('namespace', opts.namespace);
    if (opts.tailLines !== undefined) params.set('tail_lines', String(opts.tailLines));
    if (opts.previous) params.set('previous', 'true');
    const qs = params.toString() ? `?${params}` : '';
    return laurelFetch<{ namespace: string; pods: PodLogEntry[] }>(`/scoops/${id}/logs${qs}`);
  },

  async certificate(id: number, namespace?: string): Promise<CertificateReport> {
    const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return laurelFetch<CertificateReport>(`/scoops/${id}/certificate${qs}`);
  },

  async certificateLogs(id: number, tailLines = 100): Promise<{ namespace: string; certificate: string; pods: PodLogEntry[] }> {
    return laurelFetch(`/scoops/${id}/certificate/logs?tail_lines=${tailLines}`);
  },

  async health(): Promise<{ status: string }> {
    return laurelFetch<{ status: string }>('/health');
  },
};

export interface CertificateCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
}

export interface CertificateReport {
  host: string | null;
  message: string;
  certificate: {
    name: string;
    secret_name: string;
    secret_exists: boolean;
    ready: boolean;
    condition: CertificateCondition;
  } | null;
  certificate_request: {
    name: string;
    conditions: CertificateCondition[];
  } | null;
  challenges: Array<{
    name: string;
    dns_name?: string;
    state?: string;
    reason?: string;
    message?: string;
  }>;
  events: Array<{
    type: string;
    reason: string;
    message: string;
    count: number;
    last: string | null;
  }>;
}

export interface PodLogEntry {
  pod: string;
  logs: string;
}

export { ApiError, laurelBaseUrl };
