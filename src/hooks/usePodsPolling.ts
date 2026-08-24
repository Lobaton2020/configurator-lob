import { useEffect, useRef, useState } from 'react';
import type { ScoopStatusReport } from '../api/scoops';
import { scoopsApi } from '../api/scoops';

interface Options {
  /** Cuanto tiempo entre cada batch de polls. Default 2000 ms. */
  intervalMs?: number;
  /** Si esta desactivado, no arranca el polling. Default true. */
  enabled?: boolean;
}

/**
 * Polls `scoopsApi.status` para varios scoops en paralelo y devuelve el
 * ultimo reporte por id. Pensado para la lista: muestra el estado real del
 * cluster (pods, ready/available) y se actualiza solo hasta que todo este
 * estable (deployed && ready_replicas === desired_replicas). Si el caller
 * desmonta el componente o todos los scoops ya estan estables, el interval
 * se cancela solo.
 */
export function usePodsPolling(
  ids: number[],
  { intervalMs = 2000, enabled = true }: Options = {}
): Record<number, ScoopStatusReport | null> {
  const [reports, setReports] = useState<Record<number, ScoopStatusReport | null>>({});
  const idsKey = ids.join(',');
  const idsRef = useRef(ids);

  useEffect(() => {
    idsRef.current = ids;
    if (!enabled || ids.length === 0) return;

    let stopped = false;
    let interval: number | null = null;

    const isStable = (r: ScoopStatusReport | null | undefined) =>
      !!r &&
      r.deployed &&
      r.desired_replicas !== null &&
      r.ready_replicas !== null &&
      r.desired_replicas === r.ready_replicas;

    const tick = async () => {
      if (stopped) return;
      const current = idsRef.current;
      const results = await Promise.all(
        current.map(async (id) => {
          try {
            return [id, await scoopsApi.status(id)] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (stopped) return;
      setReports((prev) => {
        const next = { ...prev };
        for (const [id, r] of results) next[id] = r;
        return next;
      });
      // Si TODOS los scoops visibles ya estan estables, paramos el interval.
      // Si llega un scoop nuevo (deploy reciente) y queda alguno pending,
      // el efecto se reinicia porque `idsKey` cambia y vuelve a arrancar.
      if (results.every(([, r]) => isStable(r))) {
        if (interval !== null) {
          window.clearInterval(interval);
          interval = null;
        }
      }
    };

    void tick();
    interval = window.setInterval(() => void tick(), intervalMs);
    return () => {
      stopped = true;
      if (interval !== null) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, intervalMs, enabled]);

  return reports;
}
