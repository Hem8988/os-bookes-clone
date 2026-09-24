import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, clientIp, handle, ok, readJson, str } from '@/lib/server/http';

/** Accountant IP allow-list: office IPs and time-boxed home IPs (SRS §12.2). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage');
  const rules = await prisma.ipAllowRule.findMany({ where: { tenantId: auth.tenantId }, orderBy: { createdAt: 'desc' } });
  return ok({ rules, yourIp: clientIp(request) });
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  if (body.id && body.action === 'DISABLE') {
    await prisma.ipAllowRule.updateMany({ where: { id: String(body.id), tenantId: auth.tenantId }, data: { active: false } });
    await audit(prisma, auth, { action: 'IP_RULE_DISABLED', entityType: 'IpAllowRule', entityId: String(body.id), sensitive: true });
    return ok(null, 'Rule disabled.');
  }
  const ipAddress = str(body.ipAddress, 'IP address', { required: true, max: 45 });
  if (!/^[0-9a-fA-F:.]+$/.test(ipAddress)) throw badRequest('Enter a valid IP address.');
  const kind = body.kind === 'HOME' ? 'HOME' : 'OFFICE';
  const days = Number(body.validDays || 7);
  const rule = await prisma.ipAllowRule.create({
    data: {
      tenantId: auth.tenantId,
      role: 'ACCOUNTANT',
      ipAddress,
      label: str(body.label, 'Label', { required: true, max: 80 }),
      kind,
      expiresAt: kind === 'HOME' ? new Date(Date.now() + Math.min(Math.max(days, 1), 90) * 86_400_000) : null,
      createdBy: auth.name,
    },
  });
  await audit(prisma, auth, { action: 'IP_RULE_ADDED', entityType: 'IpAllowRule', entityId: rule.id, reference: `${rule.label} ${rule.ipAddress}`, sensitive: true });
  return ok(rule, 'IP allowed.');
});
