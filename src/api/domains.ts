/**
 * Cliente del API de Domains (laurel-infra-manager).
 *
 * Un Domain es un recurso de primer nivel que asocia un subdominio publico
 * a exactamente un Scoop. NO se autogenera al crear el scoop: se crea como
 * paso separado cuando el usuario decide exponer el scoop.
 */

import { laurelFetch } from './laurel';

export interface Domain {
  id: number;
  application_id: number;
  scoop_id: number;
  host: string;
  tls: boolean;
  status: 'pending' | 'active' | 'error';
  secret_name: string;
  namespace: string;
  scoop_name: string;
  application_slug: string;
  created_at: string;
  updated_at: string;
}

export interface DomainCreate {
  application_id: number;
  scoop_id: number;
  host: string;
  tls?: boolean;
}

export interface DomainUpdate {
  host?: string;
  tls?: boolean;
}

export interface DomainList {
  items: Domain[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DomainStatus {
  domain: Domain;
  deployed: boolean;
  certificate_ready: boolean;
  domain_status: 'pending' | 'active' | 'error';
  ingress_exists: boolean;
  certificate: {
    name: string;
    secret_name: string;
    secret_exists: boolean;
    ready: boolean;
    condition: { type?: string; status?: string; reason?: string; message?: string };
  } | null;
  certificate_request: {
    name: string;
    conditions: Array<{ type?: string; status?: string; reason?: string; message?: string }>;
  } | null;
  challenges: Array<{
    name: string;
    dns_name?: string;
    state?: string;
    reason?: string;
    message?: string;
  }>;
  events: unknown[];
  message?: string;
}

export const domainsApi = {
  list: (opts: { application_id?: number; scoop_id?: number; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.application_id !== undefined) params.set('application_id', String(opts.application_id));
    if (opts.scoop_id !== undefined) params.set('scoop_id', String(opts.scoop_id));
    params.set('page', String(opts.page ?? 1));
    params.set('limit', String(opts.limit ?? 20));
    return laurelFetch<DomainList>(`/api/domains?${params.toString()}`);
  },

  get: (id: number) =>
    laurelFetch<Domain>(`/api/domains/${id}`),

  create: (data: DomainCreate) =>
    laurelFetch<Domain>('/api/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: DomainUpdate) =>
    laurelFetch<Domain>(`/api/domains/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    laurelFetch<{ deleted: number }>(`/api/domains/${id}`, {
      method: 'DELETE',
    }),

  deploy: (id: number) =>
    laurelFetch<{
      host: string;
      namespace: string;
      resources: Array<{ kind: string; name: string; action?: string; deleted?: boolean }>;
      dns_override: string;
      manual_hosts_lines: string[];
    }>(`/api/domains/${id}/deploy`, { method: 'POST' }),

  undeploy: (id: number) =>
    laurelFetch<{
      host: string;
      namespace: string;
      resources: Array<{ kind: string; name: string; deleted: boolean }>;
      dns_cleanup: string;
    }>(`/api/domains/${id}/deploy`, { method: 'DELETE' }),

  status: (id: number) =>
    laurelFetch<DomainStatus>(`/api/domains/${id}/status`),

  certificateLogs: (id: number, tailLines = 100) =>
    laurelFetch<{
      namespace: string;
      certificate: string;
      pods: Array<{ pod: string; logs: string }>;
    }>(`/api/domains/${id}/certificate/logs?tail_lines=${tailLines}`),
};