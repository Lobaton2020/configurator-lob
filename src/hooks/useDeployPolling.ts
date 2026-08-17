import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Polls `fn` (p.ej. el status de un deploy en el cluster) cada `intervalMs`
 * hasta que `isDone` devuelva true, falle la peticion o se llame a `stop`.
 * Devuelve el ultimo dato, si sigue cargando, el error y el flag `done`.
 */
export function useDeployPolling<T>(
  fn: () => Promise<T>,
  isDone: (data: T) => boolean,
  { intervalMs = 2500, enabled = true }: Options = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fnRef = useRef(fn);
  const isDoneRef = useRef(isDone);
  useEffect(() => {
    fnRef.current = fn;
    isDoneRef.current = isDone;
  });

  const stoppedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // Reinicia el estado al arrancar una sesion de polling nueva (documented React pattern).
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (enabled) {
      setData(null);
      setLoading(true);
      setError(null);
      setDone(false);
    }
  }

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    stoppedRef.current = false;
    intervalRef.current = null;

    const finish = () => {
      stoppedRef.current = true;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const result = await fnRef.current();
        if (stoppedRef.current) return;
        setData(result);
        setLoading(false);
        if (isDoneRef.current(result)) {
          setDone(true);
          finish();
        }
      } catch (err) {
        if (stoppedRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        finish();
      }
    };

    void poll();
    intervalRef.current = window.setInterval(() => void poll(), intervalMs);
    return () => {
      stoppedRef.current = true;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs]);

  return { data, loading, error, done, stop };
}