/**
 * Cliente del API de Applications (laurel-infra-manager).
 */

import { laurelFetch } from './laurel';

export interface Application {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  github_repo_url: string | null;
  docker_image_base: string | null;
  current_version: string;
  scoops_count: number;
  domains_count: number;
  namespace: string;
  workspace_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface ApplicationCreate {
  name: string;
  description?: string;
  github_repo_url?: string;
  docker_image_base?: string;
  create_github_repo?: boolean;
  workspace_id?: number;
}

export interface ApplicationUpdate {
  description?: string;
  github_repo_url?: string;
  docker_image_base?: string;
}

export interface ApplicationList {
  items: Application[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApplicationListOpts {
  page?: number;
  limit?: number;
  workspace_id?: number;
}

export interface DeletionLog {
  id: number;
  deleted_at: string;
  deleted_by: string;
  snapshot: Record<string, unknown> | null;
}

export interface DeletionLogsResponse {
  app_id: number;
  deleted_at: string | null;
  deleted_by: string | null;
  logs: DeletionLog[];
}

function buildListQs(opts: ApplicationListOpts): string {
  const params = new URLSearchParams();
  if (opts.page !== undefined) params.set('page', String(opts.page));
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.workspace_id !== undefined) params.set('workspace_id', String(opts.workspace_id));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const appsApi = {
  list: (opts: ApplicationListOpts = {}) =>
    laurelFetch<ApplicationList>(`/api/apps${buildListQs(opts)}`),

  get: (id: number) =>
    laurelFetch<Application>(`/api/apps/${id}`),

  create: (data: ApplicationCreate) =>
    laurelFetch<Application>('/api/apps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: ApplicationUpdate) =>
    laurelFetch<Application>(`/api/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    laurelFetch<{ deleted: number; slug: string }>(`/api/apps/${id}`, {
      method: 'DELETE',
    }),

  deletionLogs: (id: number) =>
    laurelFetch<DeletionLogsResponse>(`/api/apps/${id}/deletion-logs`),
};
