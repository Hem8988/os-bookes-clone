import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handle } from '@/lib/server/http';
import { readSessionCookie, SESSION_COOKIE, verifySession } from '@/lib/server/sessionToken';

export const POST = handle(async (request: Request) => {
  const claims = verifySession(readSessionCookie(request));
  if (claims) await prisma.userSession.updateMany({ where: { id: claims.sid, revokedAt: null }, data: { revokedAt: new Date() } });
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
