import { laurelFetch } from './laurel';

export interface ManagedSecretMeta {
  id: string;
  namespace: string;
  name: string;
  key: string;
  kind: 'env' | 'text';
  keys_count: number;
  env_keys: string[] | null;
  size_bytes: number;
}

export interface ManagedSecretContent {
  id: string;
  namespace: string;
  name: string;
  key: string;
  kind: 'env' | 'text';
  content: string;
  entries: { key: string; value: string }[] | null;
}

export interface UpdateSecretResponse {
  id: string;
  saved: boolean;
  restarted: boolean;
  restart_error: string | null;
  patched_at: string;
  size_bytes: number;
  old_resource_version: string | null;
}

export const systemSecretsApi = {
  list: () =>
    laurelFetch<{ items: ManagedSecretMeta[] }>('/system/secrets'),
  get: (id: string) =>
    laurelFetch<ManagedSecretContent>(`/system/secrets/${encodeURIComponent(id)}`),
  update: (id: string, content: string) =>
    laurelFetch<UpdateSecretResponse>(`/system/secrets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { content },
    }),
};
