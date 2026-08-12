/**
 * Cliente de schemas/records/audits del Configurator.
 *
 * Antes apuntaba a un backend propio (configurator-lob, puerto 5001); tras la
 * migracion el backend vive en laurel-infra-manager (5002) y exige Bearer JWT.
 * Por eso todos los metodos pasan por `laurelFetch` (inyecta el token y maneja
 * el 401 redirigiendo a /login).
 */

import { laurelFetch } from './laurel';

export interface Schema {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  columns?: Column[];
}

export interface Column {
  id: number;
  schema_id: number;
  name: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  is_filterable: boolean;
  order: number;
  created_at: string;
}

export interface ConfigRecord {
  id: number;
  schema_id: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRecords {
  items: ConfigRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Audit {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const api = {
  // Schemas
  async getSchemas(): Promise<Schema[]> {
    return laurelFetch<Schema[]>('/schemas');
  },

  async getSchema(id: number): Promise<Schema> {
    return laurelFetch<Schema>(`/schemas/${id}`);
  },

  async createSchema(data: { name: string; description?: string }): Promise<Schema> {
    return laurelFetch<Schema>('/schemas', {
      method: 'POST',
      body: data,
    });
  },

  async updateSchema(id: number, data: { name: string; description?: string }): Promise<Schema> {
    return laurelFetch<Schema>(`/schemas/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteSchema(id: number): Promise<void> {
    await laurelFetch<void>(`/schemas/${id}`, { method: 'DELETE' });
  },

  // Columns
  async getColumns(schemaId: number): Promise<Column[]> {
    return laurelFetch<Column[]>(`/schemas/${schemaId}/columns`);
  },

  async createColumn(schemaId: number, data: Omit<Column, 'id' | 'schema_id' | 'created_at'>): Promise<Column> {
    return laurelFetch<Column>(`/schemas/${schemaId}/columns`, {
      method: 'POST',
      body: data,
    });
  },

  async getColumn(schemaId: number, columnId: number): Promise<Column> {
    return laurelFetch<Column>(`/schemas/${schemaId}/columns/${columnId}`);
  },

  async deleteColumn(schemaId: number, columnId: number): Promise<void> {
    await laurelFetch<void>(`/schemas/${schemaId}/columns/${columnId}`, { method: 'DELETE' });
  },

  async updateColumn(
    schemaId: number,
    columnId: number,
    data: { name: string; data_type: string; is_filterable: boolean; order: number },
  ): Promise<Column> {
    return laurelFetch<Column>(`/schemas/${schemaId}/columns/${columnId}`, {
      method: 'PUT',
      body: data,
    });
  },

  // Records
  async getRecords(schemaId: number, page = 1, limit = 20): Promise<PaginatedRecords> {
    return laurelFetch<PaginatedRecords>(
      withQuery(`/schemas/${schemaId}/records`, { page, limit }),
    );
  },

  async createRecord(schemaId: number, data: Record<string, unknown>): Promise<ConfigRecord> {
    return laurelFetch<ConfigRecord>(`/schemas/${schemaId}/records`, {
      method: 'POST',
      body: { data },
    });
  },

  async getRecord(schemaId: number, recordId: number): Promise<ConfigRecord> {
    return laurelFetch<ConfigRecord>(`/schemas/${schemaId}/records/${recordId}`);
  },

  async updateRecord(schemaId: number, recordId: number, data: Record<string, unknown>): Promise<ConfigRecord> {
    return laurelFetch<ConfigRecord>(`/schemas/${schemaId}/records/${recordId}`, {
      method: 'PUT',
      body: { data },
    });
  },

  async deleteRecord(schemaId: number, recordId: number): Promise<void> {
    await laurelFetch<void>(`/schemas/${schemaId}/records/${recordId}`, { method: 'DELETE' });
  },

  async searchRecords(
    schemaId: number,
    filters: Record<string, unknown>,
    page = 1,
    limit = 20,
  ): Promise<PaginatedRecords> {
    return laurelFetch<PaginatedRecords>(`/schemas/${schemaId}/records/search`, {
      method: 'POST',
      body: { filters, page, limit },
    });
  },

  // Audits
  async getAudits(page = 1, limit = 50): Promise<{ items: Audit[]; total: number; page: number; pages: number }> {
    return laurelFetch<{ items: Audit[]; total: number; page: number; pages: number }>(
      withQuery('/audits', { page, limit }),
    );
  },
};