/**
 * Cliente del modulo ConfigStore (ConfigMaps y Secrets vinculados a una app).
 *
 * Convencion del backend: cada recurso se nombra `<app>-config` (ConfigMap)
 * y `<app>-secret` (Secret). El caller puede sobreescribir el nombre pasando
 * `name` en el create, pero el caso normal es el default.
 *
 * Nota de seguridad: los Secrets **nunca** exponen sus valores por la API.
 * El GET devuelve solo la lista de claves existentes; para editar, el cliente
 * envia el `data` completo en base64 (mismo formato que la API nativa de K8s).
 */

import { laurelFetch } from './laurel';

// ---------- Tipos ----------

export interface ConfigMapSummary {
  name: string;
  namespace: string;
  app: string;
  keys: string[];
  created_at: string | null;
}

export interface ConfigMapDetail extends Omit<ConfigMapSummary, 'keys'> {
  data: Record<string, string>;
  labels: Record<string, string>;
}

/** Detalle de un Secret: `data` NO esta incluido por seguridad. */
export interface SecretSummary {
  name: string;
  namespace: string;
  app: string;
  keys: string[];
  created_at: string | null;
}

export interface SecretDetail extends Omit<SecretSummary, 'keys'> {
  /** Lista de claves existentes (los valores NO se exponen). */
  keys: string[];
  labels: Record<string, string>;
}

export interface UpsertResult {
  action: 'created' | 'updated';
  name: string;
  namespace: string;
  app: string;
}

// ---------- Helpers URL ----------

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function b64(s: string): string {
  // El navegador expone btoa para ASCII puro. Para UTF-8 (claves con acentos
  // o valores binarios) usamos el truco de encodeURIComponent + unescape,
  // que es lo que recomienda MDN.
  return btoa(unescape(encodeURIComponent(s)));
}

// ---------- ConfigMaps ----------

export const configMapsApi = {
  async list(opts: { namespace?: string; app?: string } = {}): Promise<ConfigMapSummary[]> {
    return laurelFetch<ConfigMapSummary[]>(`/configstore/configmaps${qs(opts)}`);
  },

  async get(namespace: string, name: string): Promise<ConfigMapDetail> {
    return laurelFetch<ConfigMapDetail>(`/configstore/configmaps/${namespace}/${name}`);
  },

  /** Crea o reemplaza un ConfigMap. Devuelve el detalle completo (incluye data). */
  async upsert(input: {
    app: string;
    namespace?: string;
    name?: string;
    data: Record<string, string>;
  }): Promise<UpsertResult> {
    return laurelFetch<UpsertResult>('/configstore/configmaps', {
      method: 'POST',
      body: input,
    });
  },

  async delete(namespace: string, name: string): Promise<{ deleted: boolean; kind: string; namespace: string; name: string }> {
    return laurelFetch(`/configstore/configmaps/${namespace}/${name}`, { method: 'DELETE' });
  },
};

// ---------- Secrets ----------

export const secretsApi = {
  async list(opts: { namespace?: string; app?: string } = {}): Promise<SecretSummary[]> {
    return laurelFetch<SecretSummary[]>(`/configstore/secrets${qs(opts)}`);
  },

  /** Devuelve metadata + keys. Los valores NO se exponen. */
  async get(namespace: string, name: string): Promise<SecretDetail> {
    return laurelFetch<SecretDetail>(`/configstore/secrets/${namespace}/${name}`);
  },

  /**
   * Crea o reemplaza un Secret. `data` debe ser {clave: valor en claro}: el
   * cliente lo base64-encodea antes de enviar, para que el operador pueda
   * pegar valores sin pensar en la codificacion.
   */
  async upsert(input: {
    app: string;
    namespace?: string;
    name?: string;
    data: Record<string, string>;
  }): Promise<UpsertResult> {
    const encoded: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.data)) {
      encoded[k] = b64(v);
    }
    return laurelFetch<UpsertResult>('/configstore/secrets', {
      method: 'POST',
      body: { app: input.app, namespace: input.namespace, name: input.name, data: encoded },
    });
  },

  async delete(namespace: string, name: string): Promise<{ deleted: boolean; kind: string; namespace: string; name: string }> {
    return laurelFetch(`/configstore/secrets/${namespace}/${name}`, { method: 'DELETE' });
  },
};
