import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { hashPassword, validatePasswordStrength } from '@/lib/server/password';

/**
 * Super Admin sets a new password for someone's login, found from the screen they are on:
 * { userId | employeeId | customerId, password }. That person is signed out everywhere and
 * any lock from wrong passwords is cleared. Your own password: the 🔑 next to Logout.
 */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'users.manage', { write: true });
  const body = await readJson(request);
  const password = str(body.password, 'New password', { required: true, max: 200 });
  const weak = validatePasswordStrength(password);
  if (weak) throw badRequest(weak);

  const userId = typeof body.userId === 'string' ? body.userId : '';
  const employeeId = typeof body.employeeId === 'string' ? body.employeeId : '';
  const customerId = typeof body.customerId === 'string' ? body.customerId : '';
  let linkedUserId: string | null = userId || null;
  if (!linkedUserId && employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId: auth.tenantId }, select: { userId: true } });
    if (!employee) throw notFound('Employee not found.');
    linkedUserId = employee.userId;
    if (!linkedUserId) throw badRequest('This employee has no login yet. Add one in Admin → Users & roles.');
  }
  const user = linkedUserId
    ? await prisma.user.findFirst({ where: { id: linkedUserId, tenantId: auth.tenantId } })
    : customerId
      ? await prisma.user.findFirst({ where: { customerId, tenantId: auth.tenantId } })
      : null;
  if (!user) throw badRequest(customerId ? 'This customer has no portal login yet. Add one in Admin → Users & roles (role Customer).' : 'Login not found.');
  if (user.id === auth.userId) throw badRequest('Change your own password from the 🔑 button next to Logout.');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password), failedLoginCount: 0, lockedUntil: null } });
  await prisma.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(prisma, auth, { action: 'PASSWORD_RESET', entityType: 'User', entityId: user.id, reference: user.name, sensitive: true });
  return ok({ userId: user.id, name: user.name }, `${user.name}'s password is changed. They are signed out and must log in with the new password.`);
});
