/**
 * Cliente del API del pool de dominios (laurel-infra-manager).
 *
 * Un DomainPoolItem es un dominio de segundo nivel poseido (ej. "andreslobaton.top").
 * Al crear un Domain el usuario elige uno de aqui y escribe solo el prefijo.
 */

import { laurelFetch } from './laurel';

export interface DomainPoolItem {
  id: number;
  domain: string;
  description: string;
  created_at: string;
}

export interface DomainPoolList {
  items: DomainPoolItem[];
}

export interface DomainPoolCreate {
  domain: string;
  description: string;
}

export interface DomainPoolUpdate {
  description: string;
}

export const domainPoolApi = {
  list: () => laurelFetch<DomainPoolList>('/domain-pool'),

  create: (data: DomainPoolCreate) =>
    laurelFetch<DomainPoolItem>('/domain-pool', {
      method: 'POST',
      body: data,
    }),

  update: (id: number, data: DomainPoolUpdate) =>
    laurelFetch<DomainPoolItem>(`/domain-pool/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: number) =>
    laurelFetch<{ deleted: boolean }>(`/domain-pool/${id}`, {
      method: 'DELETE',
    }),
};
