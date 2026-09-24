import { prisma } from '@/lib/db';
import { can, Permission, Role, ROLES } from '@/lib/permissions';
import { ApiError, businessMinutesOfDay, clientIp, forbidden, unauthorized, userAgent } from './http';
import { readSessionCookie, verifySession } from './sessionToken';
import { getSetting } from './settings';

export interface AuthContext {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  customerId: string | null;
  deviceId: string | null;
  ip: string;
  userAgent: string;
}

const TOUCH_INTERVAL_MS = 60_000;

/** Resolve the logged-in user from the signed cookie + session row, or null. */
export async function getAuth(request: Request): Promise<AuthContext | null> {
  const claims = verifySession(readSessionCookie(request));
  if (!claims) return null;

  const session = await prisma.userSession.findUnique({ where: { id: claims.sid }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (user.status !== 'ACTIVE' || !ROLES.includes(user.role as Role)) return null;

  const security = await getSetting(user.tenantId, 'security');
  const idleMs = security.sessionIdleMinutes * 60_000;
  if (Date.now() - session.lastSeenAt.getTime() > idleMs) {
    await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }

  return {
    sessionId: session.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    tenantId: user.tenantId,
    customerId: user.customerId,
    deviceId: session.deviceId,
    ip: clientIp(request),
    userAgent: userAgent(request),
  };
}

interface RequireOptions {
  /** The call creates or changes data — working-hour rules apply. */
  write?: boolean;
}

/**
 * Authenticate and authorise a request. `access` is either a permission key
 * from the RBAC matrix or an explicit list of roles.
 */
export async function requireAuth(request: Request, access?: Permission | Role[], options: RequireOptions = {}): Promise<AuthContext> {
  const auth = await getAuth(request);
  if (!auth) throw unauthorized();

  if (access) {
    const allowed = Array.isArray(access) ? access.includes(auth.role) : can(auth.role, access);
    if (!allowed) throw forbidden();
  }

  const security = await getSetting(auth.tenantId, 'security');

  if (auth.role === 'ACCOUNTANT' && security.accountantIpRestriction) {
    await assertIpAllowed(auth.tenantId, auth.role, auth.ip);
  }

  if (options.write) assertWithinWorkingHours(auth.role, security.workingHours);

  return auth;
}

export async function assertIpAllowed(tenantId: string, role: string, ip: string) {
  if (process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1')) return;
  const rules = await prisma.ipAllowRule.findMany({ where: { tenantId, role, active: true, ipAddress: ip } });
  const valid = rules.some((r) => !r.expiresAt || r.expiresAt > new Date());
  if (!valid) throw new ApiError(403, `Access from IP ${ip} is not allowed. Ask the admin to approve this IP.`, 'IP_BLOCKED');
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function assertWithinWorkingHours(
  role: string,
  hours: { enabled: boolean; start: string; end: string; roles: string[]; overrideUntil: string | null }
) {
  if (!hours.enabled || !hours.roles.includes(role)) return;
  if (hours.overrideUntil && new Date(hours.overrideUntil) > new Date()) return;
  const now = businessMinutesOfDay();
  if (now < toMinutes(hours.start) || now > toMinutes(hours.end)) {
    throw new ApiError(403, `New entries are allowed only between ${hours.start} and ${hours.end}. Ask the admin for an override.`, 'OUTSIDE_WORKING_HOURS');
  }
}

// ───────── simple in-memory rate limiter (per server instance) ─────────

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new ApiError(429, 'Too many requests. Please wait a minute and try again.', 'RATE_LIMITED');
}
