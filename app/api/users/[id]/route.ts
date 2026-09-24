import { prisma } from '@/lib/db';
import { ROLES, Role } from '@/lib/permissions';
import { isValidMobile, phoneKey } from '@/lib/phone';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson } from '@/lib/server/http';
import { hashPassword, validatePasswordStrength } from '@/lib/server/password';

type Ctx = { params: Promise<{ id: string }> };

/** Update role / status / 2FA / password; revoke sessions and devices. */
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'users.manage', { write: true });
  const { id } = await ctx.params;
  const user = await prisma.user.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!user) throw notFound('User not found.');
  const body = await readJson(request);
  const data: Record<string, unknown> = {};
  let revoke = false;

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 100);
  if (body.mobile !== undefined) {
    if (body.mobile && !isValidMobile(String(body.mobile))) throw badRequest('Enter a valid 10-digit mobile number.');
    data.mobile = body.mobile ? phoneKey(String(body.mobile)) : null;
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as Role)) throw badRequest('Invalid role.');
    if (user.id === auth.userId && body.role !== user.role) throw badRequest('You cannot change your own role.');
    data.role = body.role;
    revoke = true;
  }
  if (body.status !== undefined) {
    if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(String(body.status))) throw badRequest('Invalid status.');
    if (user.id === auth.userId) throw badRequest('You cannot deactivate yourself.');
    data.status = body.status;
    revoke = body.status !== 'ACTIVE';
  }
  if (body.twoFactorEnabled !== undefined) data.twoFactorEnabled = !!body.twoFactorEnabled;
  if (body.password) {
    const weak = validatePasswordStrength(String(body.password));
    if (weak) throw badRequest(weak);
    data.passwordHash = hashPassword(String(body.password));
    data.failedLoginCount = 0;
    data.lockedUntil = null;
    revoke = true;
  }
  if (body.unlock) Object.assign(data, { failedLoginCount: 0, lockedUntil: null });
  if (body.revokeSessions) revoke = true;

  const updated = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, mobile: true, role: true, status: true, twoFactorEnabled: true } });
  if (revoke) await prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(prisma, auth, {
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: id,
    reference: user.name,
    oldValue: { role: user.role, status: user.status, twoFactorEnabled: user.twoFactorEnabled },
    newValue: { ...data, passwordHash: data.passwordHash ? '(reset)' : undefined },
    sensitive: true,
  });
  return ok(updated, 'User updated.');
});
