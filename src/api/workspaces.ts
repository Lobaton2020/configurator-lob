/**
 * Cliente del API de Workspaces (laurel-infra-manager).
 * Solo devuelve los workspaces del usuario autenticado (JWT).
 */

import { laurelFetch } from './laurel';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  owner_sub: string;
  created_at: string;
  updated_at: string;
  apps_count: number;
}

export interface WorkspaceList {
  items: Workspace[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface WorkspaceCreate {
  name: string;
  description?: string;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
}

export const workspacesApi = {
  list: (page = 1, limit = 100) =>
    laurelFetch<WorkspaceList>(`/api/workspaces?page=${page}&limit=${limit}`),

  create: (data: WorkspaceCreate) =>
    laurelFetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: WorkspaceUpdate) =>
    laurelFetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    laurelFetch<{ deleted: number }>(`/api/workspaces/${id}`, {
      method: 'DELETE',
    }),
};