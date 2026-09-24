'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

type Identified = { id: string };

/**
 * A server-backed list with the same shape as useState, so existing screens
 * keep calling setItems([...]). Changes are diffed by id against the last
 * server copy and saved through /api/collections/<name>; on any error the
 * list is reloaded so the screen never shows unsaved data.
 */
export function useServerCollection<T extends Identified>(name: string, enabled = true) {
  const [items, setItemsState] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<T[]>([]); // what the screen shows
  const synced = useRef<T[]>([]); // what the server has

  const show = useCallback((list: T[]) => {
    current.current = list;
    setItemsState(list);
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await api<T[]>(`/api/collections/${name}`);
      synced.current = data;
      show(data);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [name, enabled, show]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (item: T) => {
      const saved = await api<T>(`/api/collections/${name}`, { body: { action: 'create', item } });
      synced.current = [saved, ...synced.current];
      show([saved, ...current.current.filter((i) => i.id !== item.id && i.id !== saved.id)]);
      return saved;
    },
    [name, show]
  );

  const update = useCallback(
    async (item: T) => {
      const saved = await api<T | null>(`/api/collections/${name}`, { body: { action: 'update', id: item.id, item } });
      if (saved) {
        synced.current = synced.current.map((i) => (i.id === item.id ? saved : i));
        show(current.current.map((i) => (i.id === item.id ? saved : i)));
      }
      return saved;
    },
    [name, show]
  );

  const remove = useCallback(
    async (id: string, reason?: string) => {
      await api(`/api/collections/${name}`, { body: { action: 'delete', id, reason } });
      await reload();
    },
    [name, reload]
  );

  /** useState-compatible setter: shows the change, then persists the diff. */
  const setItems: Dispatch<SetStateAction<T[]>> = useCallback(
    (next) => {
      const target = typeof next === 'function' ? (next as (p: T[]) => T[])(current.current) : next;
      show(target);
      const before = new Map(synced.current.map((i) => [i.id, i]));
      const after = new Set(target.map((i) => i.id));
      const jobs: Array<() => Promise<unknown>> = [];
      for (const item of target) {
        const old = before.get(item.id);
        if (!old) jobs.push(() => create(item));
        else if (JSON.stringify(old) !== JSON.stringify(item)) jobs.push(() => update(item));
      }
      for (const id of before.keys()) if (!after.has(id)) jobs.push(() => remove(id));
      if (!jobs.length) return;
      void (async () => {
        try {
          for (const job of jobs) await job();
        } catch (e) {
          window.alert(errorMessage(e));
          await reload();
        }
      })();
    },
    [create, update, remove, reload, show]
  );

  return { items, setItems, create, update, remove, reload, loading, error };
}
