/**
 * Fetch centralizado para los modulos de laurel (scoops, audits, etc.).
 *
 * Inyecta `Authorization: Bearer <jwt>` leyendo el localStorage y expone
 * ApiError para que los componentes distingan 401 (no-auth) del resto.
 */

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: ApiErrorDetail[];
  reason?: string;

  constructor(message: string, status: number, details: ApiErrorDetail[] = [], reason?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.reason = reason;
  }

  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      const field = d.field.split('.').pop() ?? d.field;
      out[field] = d.message;
    }
    return out;
  }
}

// Los endpoints usan path absoluto `/api/...`; la base solo debe ser el origin.
const LAUREL_ORIGIN =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LAUREL_API as string) ||
  'http://localhost:5002';
const LAUREL_BASE = LAUREL_ORIGIN.replace(/\/+$/, '').replace(/\/api$/, '');

const TOKEN_KEY = 'laurel.jwt';

function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface LaurelFetchOptions extends Omit<RequestInit, 'body'> {
  /** Si es true y el backend devuelve 401, limpia el token y va a /login. */
  handleUnauthorized?: boolean;
  /** Cualquier objeto que laurelFetch serializa a JSON antes de enviar. */
  body?: unknown;
}

export async function laurelFetch<T = unknown>(path: string, options: LaurelFetchOptions = {}): Promise<T> {
  const { handleUnauthorized = true, headers, body, ...rest } = options;
  const merged: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) merged.Authorization = `Bearer ${token}`;
  if (body && !merged['Content-Type']) {
    merged['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${LAUREL_BASE}${path}`, {
      ...rest,
      headers: merged,
      body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`No se pudo contactar con el API en ${LAUREL_BASE}.`, 0);
  }

  if (res.status === 204) return undefined as unknown as T;

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && handleUnauthorized) {
      try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    const details = (json?.details ?? []) as ApiErrorDetail[];
    const msg = (json?.error as string) || `Error ${res.status}`;
    const reason = json?.reason as string | undefined;
    throw new ApiError(msg, res.status, details, reason);
  }

  return json as T;
}

export const laurelBaseUrl = LAUREL_BASE;
