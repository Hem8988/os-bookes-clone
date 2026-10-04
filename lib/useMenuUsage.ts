'use client';

import { useCallback, useEffect, useState } from 'react';

// Which menu pages this person opens most, and which they pinned, kept on this
// device (per user) so the sidebar can show just their everyday pages.

export interface MenuUsage {
  counts: Record<string, number>;
  pinned: string[];
  /** true once the person pinned / unpinned something; until then the default pins apply. */
  pinsEdited?: boolean;
}

const EVENT = 'deskshark:menu-usage';
const keyFor = (userId: string) => `deskshark.menu.${userId}`;
export const menuKey = (tab: string, sub?: string) => `${tab}:${sub || ''}`;

/** Pinned for everyone until they change their pins (shown only if their role can open them). */
const DEFAULT_PINNED = ['books:purchases', 'books:expenses'];

function read(userId: string): MenuUsage {
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(userId)) || 'null');
    if (v && typeof v === 'object') {
      const saved: string[] = Array.isArray(v.pinned) ? v.pinned : [];
      return { counts: v.counts || {}, pinsEdited: !!v.pinsEdited, pinned: v.pinsEdited ? saved : [...new Set([...DEFAULT_PINNED, ...saved])] };
    }
  } catch {
    // storage blocked: nothing remembered
  }
  return { counts: {}, pinned: [...DEFAULT_PINNED] };
}

function write(userId: string, v: MenuUsage) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(v));
  } catch {
    // storage blocked: works for this visit only
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useMenuUsage(userId: string | undefined) {
  const [usage, setUsage] = useState<MenuUsage>({ counts: {}, pinned: [...DEFAULT_PINNED] });
  useEffect(() => {
    if (!userId) return;
    const load = () => setUsage(read(userId));
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [userId]);

  /** Count a visit (recent visits weigh more, so old habits fade). */
  const record = useCallback(
    (tab: string, sub?: string) => {
      if (!userId || tab === 'dashboard') return;
      const v = read(userId);
      const counts: Record<string, number> = {};
      for (const [k, n] of Object.entries(v.counts)) if (n * 0.97 >= 0.2) counts[k] = n * 0.97;
      counts[menuKey(tab, sub)] = (counts[menuKey(tab, sub)] || 0) + 1;
      write(userId, { ...v, counts });
    },
    [userId]
  );

  const togglePin = useCallback(
    (key: string) => {
      if (!userId) return;
      const v = read(userId);
      write(userId, { ...v, pinsEdited: true, pinned: v.pinned.includes(key) ? v.pinned.filter((k) => k !== key) : [...v.pinned, key] });
    },
    [userId]
  );

  return { usage, record, togglePin };
}
