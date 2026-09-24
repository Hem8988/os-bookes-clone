import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok } from '@/lib/server/http';

/** Audit trail (Super Admin only, SRS §15.5). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'audit.view');
  const url = new URL(request.url);
  const where: Prisma.AuditLogWhereInput = { tenantId: auth.tenantId };
  if (url.searchParams.get('sensitive') === '1') where.isSensitive = true;
  const action = url.searchParams.get('action');
  if (action) where.action = { contains: action.toUpperCase() };
  const search = url.searchParams.get('search');
  if (search) where.OR = [{ actorName: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }, { details: { contains: search, mode: 'insensitive' } }];
  const from = url.searchParams.get('from');
  if (from) where.createdAt = { gte: new Date(`${from}T00:00:00+05:30`) };
  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(Number(url.searchParams.get('limit')) || 300, 1000) });
  return ok(logs);
});
