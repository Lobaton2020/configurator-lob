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
  scoops_count: number;
  domains_count: number;
  namespace: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreate {
  name: string;
  description?: string;
  github_repo_url?: string;
  docker_image_base?: string;
  create_github_repo?: boolean;
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

export const appsApi = {
  list: (page = 1, limit = 20) =>
    laurelFetch<ApplicationList>(
      `/api/apps?page=${page}&limit=${limit}`,
    ),

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
};