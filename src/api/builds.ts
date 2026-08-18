/**
 * Cliente del modulo Builds de laurel-infra-manager.
 *
 * Cada vez que llega un push a master del repo de la app, el backend
 * crea un `AppBuild` con la version que la UI seteo en la app
 * (`app.current_version`). El estado se actualiza on-demand via polling
 * a Jenkins: cada GET de un build en estado vivo consulta a Jenkins.
 */

import { laurelFetch } from './laurel';

export type BuildStatus = 'pending' | 'running' | 'success' | 'failed' | 'aborted';

export interface AppBuild {
  id: number;
  application_id: number;
  version: string;
  commit_sha: string | null;
  status: BuildStatus;
  jenkins_job: string;
  jenkins_number: number | null;
  jenkins_url: string | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface AppBuildList {
  items: AppBuild[];
}

export interface CurrentVersion {
  id: number;
  slug: string;
  current_version: string;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const buildsApi = {
  /** Lista los builds de la app, mas recientes primero. */
  list(appId: number, opts: { poll?: boolean } = {}): Promise<AppBuild[]> {
    const poll = opts.poll ?? true;
    return laurelFetch<AppBuild[]>(`/api/apps/${appId}/builds${qs({ poll })}`).then(
      (r) => (r as unknown as { items: AppBuild[] }).items ?? (r as unknown as AppBuild[]),
    );
  },

  /** Detalle de un build (con polling on-demand a Jenkins si esta vivo). */
  get(appId: number, buildId: number): Promise<AppBuild> {
    return laurelFetch<AppBuild>(`/api/apps/${appId}/builds/${buildId}`);
  },

  /** Setea la version que se usara en el proximo build (push a master). */
  setCurrentVersion(appId: number, version: string): Promise<CurrentVersion> {
    return laurelFetch<CurrentVersion>(`/api/apps/${appId}/current-version`, {
      method: 'PATCH',
      body: { version },
    });
  },
};

/**
 * Respuesta de GET /api/apps/<slug>/next_version.
 * La version es calculada por el backend desde los tags de Docker Hub
 * (source-of-truth), no la setea el usuario. La UI solo la muestra.
 */
export interface NextVersionResponse {
  slug: string;
  namespace: string;
  image: string;
  next_version: string;
}

/**
 * Cliente del endpoint de versionado automatico. Vive en su propio
 * modulo (no en appsApi) porque no depende de un appId numerico:
 * la ruta es por slug.
 */
export const versionsApi = {
  /**
   * Proxima version semver que el pipeline asignara al siguiente build.
   * El backend hace login a Docker Hub y consulta los tags existentes
   * sobre `docker.io/<namespace>/laurel_<slug>`.
   *
   * Posibles errores:
   *   400 invalid_slug     -> el slug no cumple el formato
   *   503 dockerhub_unconfigured -> el backend no tiene DOCKERHUB creds
   *   502 dockerhub_error   -> Docker Hub rechazo login o tags fetch
   */
  next(slug: string): Promise<NextVersionResponse> {
    return laurelFetch<NextVersionResponse>(`/api/apps/${slug}/next_version`);
  },
};
