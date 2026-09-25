import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from './sessionToken';

/** Error that maps directly onto an HTTP response. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const badRequest = (message: string) => new ApiError(400, message, 'BAD_REQUEST');
export const unauthorized = (message = 'Please log in again.') => new ApiError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'You do not have permission for this action.') => new ApiError(403, message, 'FORBIDDEN');
export const notFound = (message = 'Record not found.') => new ApiError(404, message, 'NOT_FOUND');
export const conflict = (message: string) => new ApiError(409, message, 'CONFLICT');

export function ok<T>(data: T, message?: string, init?: ResponseInit) {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) }, init);
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    const res = NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    // A signed cookie whose session was revoked / timed out would otherwise keep
    // the page gate letting the user in while every API says 401 (redirect loop).
    if (error.code === 'UNAUTHORIZED') res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  // Prisma errors, recognised by code/name so this file stays client-free.
  const prismaCode = (error as { code?: string })?.code;
  if (prismaCode === 'P2002') return NextResponse.json({ success: false, error: 'This record already exists (duplicate value).', code: 'DUPLICATE' }, { status: 409 });
  if (prismaCode === 'P2025') return NextResponse.json({ success: false, error: 'Record not found.', code: 'NOT_FOUND' }, { status: 404 });
  if ((error as Error)?.name === 'PrismaClientValidationError') {
    return NextResponse.json({ success: false, error: 'Some fields are missing or invalid.', code: 'INVALID' }, { status: 400 });
  }
  console.error('[api] unexpected error', error);
  return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
}

/** Wrap a route handler so thrown ApiErrors become JSON responses. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return fail(error);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
}

// ───────── input helpers ─────────

export function str(value: unknown, field: string, opts: { required?: boolean; max?: number } = {}): string {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  if (opts.required && !text) throw badRequest(`${field} is required.`);
  if (opts.max && text.length > opts.max) throw badRequest(`${field} must be at most ${opts.max} characters.`);
  return text;
}

export function optStr(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  return text ? text : null;
}

export function num(value: unknown, field: string, opts: { min?: number; required?: boolean } = {}): number {
  if ((value === undefined || value === null || value === '') && !opts.required) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw badRequest(`${field} must be a number.`);
  if (opts.min !== undefined && n < opts.min) throw badRequest(`${field} must be at least ${opts.min}.`);
  return n;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dateStr(value: unknown, field: string): string {
  if (!isDateString(value)) throw badRequest(`${field} must be a date (YYYY-MM-DD).`);
  return value;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ───────── request metadata ─────────

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export function userAgent(request: Request): string {
  return (request.headers.get('user-agent') || 'unknown').slice(0, 300);
}

// ───────── business time (India by default) ─────────

const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** Today's business date as YYYY-MM-DD in the business timezone. */
export function businessDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Minutes since midnight in the business timezone. */
export function businessMinutesOfDay(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Indian financial year label for a date, e.g. 2026-09-24 → "26-27". */
export function financialYear(date: string): string {
  const [y, m] = date.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}
