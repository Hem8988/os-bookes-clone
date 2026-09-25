import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed session cookie. The cookie only carries the session id plus enough
 * claims for the proxy to route by role; the database row is the source of
 * truth (revocation, idle timeout) and is checked on every API call.
 */
export const SESSION_COOKIE = 'deskshark_session';

export interface SessionClaims {
  sid: string; // UserSession.id
  uid: string;
  role: string;
  tid: string; // tenant
  exp: number; // unix seconds
}

/** True when SESSION_SECRET is set to a long enough random value. */
export const sessionSecretReady = () => (process.env.SESSION_SECRET || '').length >= 32;

// No built-in fallback: a secret in the source code is public, and anyone who
// knows it can forge a login cookie. The server must be given its own.
function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  throw new Error('SESSION_SECRET is missing or shorter than 32 characters — set it in the server .env (e.g. openssl rand -base64 32).');
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export function signSession(claims: SessionClaims): string {
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const signature = b64url(createHmac('sha256', secret()).update(payload).digest());
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionClaims | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  // Without a secret nobody is logged in (pages go to /login instead of crashing).
  if (!sessionSecretReady()) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (!claims.sid || !claims.uid || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const readSessionCookie = (request: Request) => readCookie(request, SESSION_COOKIE);

// ───────── pending (multi-step) login ─────────

export const PENDING_LOGIN_COOKIE = 'deskshark_login';

export type LoginStep = 'OTP' | 'BIOMETRIC_REGISTER' | 'BIOMETRIC_VERIFY';

export interface PendingLogin {
  uid: string;
  deviceId: string | null;
  steps: LoginStep[];
  exp: number;
}

export function signPendingLogin(pending: PendingLogin): string {
  const payload = b64url(Buffer.from(JSON.stringify({ ...pending, kind: 'pending' })));
  return `${payload}.${b64url(createHmac('sha256', secret()).update(`pending:${payload}`).digest())}`;
}

export function verifyPendingLogin(token: string | null): PendingLogin | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !sessionSecretReady()) return null;
  const expected = createHmac('sha256', secret()).update(`pending:${payload}`).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PendingLogin & { kind: string };
    if (data.kind !== 'pending' || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
