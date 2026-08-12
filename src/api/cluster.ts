/**
 * Cliente del API de laurel-infra-manager (Cluster).
 *
 * Reusa `laurelFetch` para inyectar el Bearer JWT. Los endpoints del cluster
 * viven bajo `/cluster/*` y el health en `/health` de laurel.
 */

import { laurelFetch } from './laurel';

export interface ClusterHealth {
  status: string;
  service: string;
}

export interface ClusterNode {
  name: string;
  ready: boolean;
  roles: string[];
  kubelet_version: string;
  capacity: {
    cpu: string;
    memory: string;
    pods: string;
  };
}

export interface ClusterOverview {
  api_server?: string;
  version?: string;
  platform?: string;
  nodes?: ClusterNode[];
  [key: string]: unknown;
}

export interface NamespaceRow {
  name: string;
  phase?: string;
}

export interface DeployRow {
  name: string;
  namespace: string;
  replicas?: number | null;
  ready_replicas?: number;
  available_replicas?: number;
  updated_replicas?: number;
  images?: string[];
  [key: string]: unknown;
}

export interface ServicePort {
  name?: string | null;
  port?: number;
  target_port?: unknown;
  node_port?: number | null;
  protocol?: string;
}

export interface ServiceRow {
  name: string;
  namespace: string;
  type?: string;
  cluster_ip?: string | null;
  ports?: ServicePort[];
  [key: string]: unknown;
}

export interface IngressRule {
  host?: string | null;
  path?: string;
  service?: string | null;
  port?: number | null;
}

export interface IngressRow {
  name: string;
  namespace: string;
  ingress_class?: string | null;
  hosts?: string[];
  rules?: IngressRule[];
  tls?: Array<{ hosts?: string[]; secret?: string | null }>;
  [key: string]: unknown;
}

export interface PodRow {
  name: string;
  namespace: string;
  phase?: string;
  reason?: string | null;
  node?: string | null;
  pod_ip?: string | null;
  restarts?: number;
  ready?: string;
  containers?: string[];
  [key: string]: unknown;
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const clusterApi = {
  async health(): Promise<ClusterHealth> {
    return laurelFetch<ClusterHealth>('/health');
  },

  async overview(): Promise<ClusterOverview> {
    return laurelFetch<ClusterOverview>('/k8s/cluster');
  },

  async namespaces(): Promise<NamespaceRow[]> {
    return laurelFetch<NamespaceRow[]>('/k8s/namespaces');
  },

  async deployments(namespace?: string): Promise<DeployRow[]> {
    return laurelFetch<DeployRow[]>(withQuery('/k8s/deployments', { namespace }));
  },

  async services(namespace?: string): Promise<ServiceRow[]> {
    return laurelFetch<ServiceRow[]>(withQuery('/k8s/services', { namespace }));
  },

  async ingresses(namespace?: string): Promise<IngressRow[]> {
    return laurelFetch<IngressRow[]>(withQuery('/k8s/ingresses', { namespace }));
  },

  async pods(namespace?: string): Promise<PodRow[]> {
    return laurelFetch<PodRow[]>(withQuery('/k8s/pods', { namespace }));
  },
};