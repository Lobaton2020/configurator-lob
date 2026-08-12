/**
 * Cliente del API de auditoria de laurel (audits de scoops, deploys, etc.).
 *
 * Apunta al backend de laurel (5002). El Bearer JWT se inyecta via `laurelFetch`.
 */

import { ApiError, laurelFetch } from './laurel';

export interface AuditDto {
  id: number;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  q?: string;
  entity_type?: string;
}

export const auditsApi = {
  async list(opts: { page?: number; limit?: number; q?: string; entity_type?: string } = {}): Promise<Paginated<AuditDto>> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set('page', String(opts.page));
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.q) params.set('q', opts.q);
    if (opts.entity_type) params.set('entity_type', opts.entity_type);
    const qs = params.toString() ? `?${params}` : '';
    return laurelFetch<Paginated<AuditDto>>(`/audits${qs}`);
  },

  async get(id: number): Promise<AuditDto> {
    return laurelFetch<AuditDto>(`/audits/${id}`);
  },
};

export { ApiError };
