const API_BASE = 'http://localhost:5001/api';

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

export const api = {
  // Schemas
  async getSchemas(): Promise<Schema[]> {
    const res = await fetch(`${API_BASE}/schemas`);
    return res.json();
  },

  async getSchema(id: number): Promise<Schema> {
    const res = await fetch(`${API_BASE}/schemas/${id}`);
    return res.json();
  },

  async createSchema(data: { name: string; description?: string }): Promise<Schema> {
    const res = await fetch(`${API_BASE}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSchema(id: number, data: { name: string; description?: string }): Promise<Schema> {
    const res = await fetch(`${API_BASE}/schemas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSchema(id: number): Promise<void> {
    await fetch(`${API_BASE}/schemas/${id}`, { method: 'DELETE' });
  },

  // Columns
  async getColumns(schemaId: number): Promise<Column[]> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/columns`);
    return res.json();
  },

  async createColumn(schemaId: number, data: Omit<Column, 'id' | 'schema_id' | 'created_at'>): Promise<Column> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getColumn(schemaId: number, columnId: number): Promise<Column> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/columns/${columnId}`);
    return res.json();
  },

  async deleteColumn(schemaId: number, columnId: number): Promise<void> {
    await fetch(`${API_BASE}/schemas/${schemaId}/columns/${columnId}`, { method: 'DELETE' });
  },

  async updateColumn(schemaId: number, columnId: number, data: { name: string; data_type: string; is_filterable: boolean; order: number }): Promise<Column> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Records
  async getRecords(schemaId: number, page = 1, limit = 20): Promise<PaginatedRecords> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/records?page=${page}&limit=${limit}`);
    return res.json();
  },

  async createRecord(schemaId: number, data: Record<string, unknown>): Promise<ConfigRecord> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return res.json();
  },

  async getRecord(schemaId: number, recordId: number): Promise<ConfigRecord> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/records/${recordId}`);
    return res.json();
  },

  async updateRecord(schemaId: number, recordId: number, data: Record<string, unknown>): Promise<ConfigRecord> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return res.json();
  },

  async deleteRecord(schemaId: number, recordId: number): Promise<void> {
    await fetch(`${API_BASE}/schemas/${schemaId}/records/${recordId}`, { method: 'DELETE' });
  },

  async searchRecords(schemaId: number, filters: Record<string, unknown>, page = 1, limit = 20): Promise<PaginatedRecords> {
    const res = await fetch(`${API_BASE}/schemas/${schemaId}/records/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, page, limit }),
    });
    return res.json();
  },

  // Audits
  async getAudits(page = 1, limit = 50): Promise<{ items: Audit[]; total: number; page: number; pages: number }> {
    const res = await fetch(`${API_BASE}/audits?page=${page}&limit=${limit}`);
    return res.json();
  },
};

export interface Audit {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}