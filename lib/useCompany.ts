'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type CompanyProfile } from './settings';

// The distributor's own name / GSTIN / address come from Settings → Company,
// never from code, so every print-out and screen shows the right business.

let pending: Promise<CompanyProfile> | null = null;

function load(): Promise<CompanyProfile> {
  if (!pending) {
    pending = fetch('/api/settings/company', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => ({ ...DEFAULT_SETTINGS.company, ...(json?.data || {}) }))
      .catch(() => DEFAULT_SETTINGS.company);
  }
  return pending;
}

export function useCompany(): CompanyProfile {
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_SETTINGS.company);
  useEffect(() => {
    let alive = true;
    load().then((c) => alive && setCompany(c));
    return () => {
      alive = false;
    };
  }, []);
  return company;
}

/** Call after saving Settings → Company so screens pick up the change. */
export function refreshCompany() {
  pending = null;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'DS';
