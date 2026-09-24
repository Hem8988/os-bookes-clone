'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

interface Result<T> {
  url: string;
  tick: number;
  data?: T;
  error?: string;
}

/**
 * GET an API route and keep the result. `reload()` fetches again (the last
 * data stays visible meanwhile); pass `null` as url to skip loading.
 * State is only set from the request callback, never synchronously in the effect.
 */
export function useApiData<T>(url: string | null, onError?: (message: string) => void) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [tick, setTick] = useState(0);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url).then(
      (data) => {
        if (alive) setResult({ url, tick, data });
      },
      (e) => {
        if (!alive) return;
        setResult((prev) => ({ url, tick, data: prev?.url === url ? prev.data : undefined, error: errorMessage(e) }));
        onErrorRef.current?.(errorMessage(e));
      }
    );
    return () => {
      alive = false;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const current = result && result.url === url ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: !!url && (!current || current.tick !== tick),
    reload,
  };
}
