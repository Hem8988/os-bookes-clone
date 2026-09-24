'use client';

/** Error returned by our API routes ({ success: false, error, code }). */
export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

/**
 * JSON fetch against our API. Throws ApiRequestError with the server's
 * message; a 401 sends the user back to the login page.
 */
export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown; redirectOn401?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError('No internet connection.', 0, 'OFFLINE');
  }
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string; code?: string; message?: string };
  if (res.status === 401 && options.redirectOn401 !== false && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok || json.success === false) throw new ApiRequestError(json.error || `Request failed (${res.status})`, res.status, json.code);
  return json.data as T;
}

/** Same as api() but also returns the server's success message. */
export async function apiWithMessage<T = unknown>(path: string, body?: unknown, method?: string): Promise<{ data: T; message?: string }> {
  const res = await fetch(path, {
    method: method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string; code?: string; message?: string };
  if (!res.ok || json.success === false) throw new ApiRequestError(json.error || `Request failed (${res.status})`, res.status, json.code);
  return { data: json.data as T, message: json.message };
}

/** Upload a photo/PDF; returns the protected /api/files/... URL. */
export async function uploadFile(file: File | Blob): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/files', { method: 'POST', body: form, credentials: 'same-origin' });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: { url: string }; error?: string };
  if (!res.ok || !json.data) throw new ApiRequestError(json.error || 'Upload failed', res.status);
  return json.data.url;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export const inr = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
