'use client';

import { useEffect, useState } from 'react';
import type { Permission, Role } from './permissions';

// Client-side view of the logged-in user. Authorisation is always enforced
// by the API; this only drives what the screens show.

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  customerId: string | null;
}

export interface SessionInfo {
  user: SessionUser;
  permissions: Permission[];
  company: { name: string; phone: string; supportPhone: string; gstin: string; address: string; upiId: string; email: string };
}

// One request per page load, shared by every component that asks.
let pending: Promise<SessionInfo | null> | null = null;

function loadSession(): Promise<SessionInfo | null> {
  if (!pending) {
    pending = fetch('/api/auth/me', { cache: 'no-store' }).then(async (res) => {
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return null;
      }
      const json = await res.json();
      return json.authenticated ? { user: json.user, permissions: json.permissions, company: json.company } : null;
    });
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((s) => !cancelled && setSession(s))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const can = (permission: Permission) => !!session?.permissions.includes(permission);
  return { session, loading, can };
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
}
