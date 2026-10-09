import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Our uploaded files (/api/files/…) need a login. A photo / PDF sent on WhatsApp must be
 * fetched by WhatsApp's servers, so it goes out as a signed public link to that one file.
 */
const PREFIX = '/api/files/';
const sign = (key: string) => createHmac('sha256', process.env.SESSION_SECRET || 'deskshark-dev').update(`wa-media:${key}`).digest('base64url').slice(0, 32);

/** Public link for a stored file, or null when it is not ours or APP_URL is not set. */
export function publicMediaUrl(storedUrl: string) {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (!appUrl || !storedUrl.startsWith(PREFIX)) return null;
  const key = storedUrl.slice(PREFIX.length);
  return `${appUrl}/api/wa/media?k=${encodeURIComponent(key)}&s=${sign(key)}`;
}

export function verifyMediaKey(key: string | null, sig: string | null) {
  if (!key || !sig) return false;
  const expected = Buffer.from(sign(key));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
