import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_HOME, Role } from '@/lib/permissions';
import { SESSION_COOKIE, verifySession } from '@/lib/server/sessionToken';

// Page-level gate: every portal needs a signed session, and each role only
// reaches its own portal. API routes do their own (stricter, DB-backed)
// checks, so they are excluded here.

const PORTALS: Record<string, Role[]> = {
  '/admin': ['SUPER_ADMIN', 'MANAGER'],
  '/accountant': ['ACCOUNTANT', 'SUPER_ADMIN'],
  '/delivery': ['DELIVERY_BOY'],
  '/customer': ['CUSTOMER'],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const home = claims ? ROLE_HOME[claims.role as Role] || '/login' : '/login';

  if (pathname === '/' || pathname === '/login') {
    if (claims) return NextResponse.redirect(new URL(home, request.url));
    return pathname === '/' ? NextResponse.redirect(new URL('/login', request.url)) : NextResponse.next();
  }

  const portal = Object.keys(PORTALS).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!portal) return NextResponse.next();
  if (!claims) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (!PORTALS[portal].includes(claims.role as Role)) return NextResponse.redirect(new URL(home, request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/accountant/:path*', '/delivery/:path*', '/customer/:path*'],
};
