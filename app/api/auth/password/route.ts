import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson, str } from '@/lib/server/http';
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/lib/server/password';

/** Change own password; all other sessions are signed out. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const body = await readJson(request);
  const current = str(body.currentPassword, 'Current password', { required: true });
  const next = str(body.newPassword, 'New password', { required: true, max: 200 });
  const weak = validatePasswordStrength(next);
  if (weak) throw badRequest(weak);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
  if (!verifyPassword(current, user.passwordHash)) throw badRequest('Current password is wrong.');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  await prisma.userSession.updateMany({ where: { userId: user.id, id: { not: auth.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(prisma, auth, { action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id, sensitive: true });
  return ok(null, 'Password changed.');
});
