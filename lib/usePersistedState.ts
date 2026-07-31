import { useEffect, useState, Dispatch, SetStateAction } from 'react';

export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Start from initialValue on both server and first client render to avoid
  // a hydration mismatch; the persisted value (if any) is applied right
  // after mount, once we're guaranteed to be client-side only.
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setState(JSON.parse(stored) as T);
    } catch {
      // storage unavailable or corrupt; keep initialValue
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage unavailable or quota exceeded; state stays in-memory only
    }
  }, [key, state, hydrated]);

  return [state, setState];
}
