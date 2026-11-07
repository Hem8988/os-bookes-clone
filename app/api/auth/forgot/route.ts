import { prisma } from '@/lib/db';
import { phoneKey } from '@/lib/phone';
import { audit } from '@/lib/server/audit';
import { rateLimit } from '@/lib/server/auth';
import { badRequest, clientIp, handle, ok, readJson, str, userAgent } from '@/lib/server/http';
import { checkOtp, findUser, sendLoginOtp } from '@/lib/server/login';
import { hashPassword, validatePasswordStrength } from '@/lib/server/password';

const GENERIC = 'If this account exists, a reset code has been sent to its registered WhatsApp / mobile.';

/**
 * Forgot password.
 * - { identifier }                         → send a 6-digit reset OTP (WhatsApp, SMS fallback, email)
 * - { identifier, code, newPassword }      → verify the OTP and set the new password
 * The first step always answers the same way so it cannot reveal which accounts exist.
 */
export const POST = handle(async (request: Request) => {
  const ip = clientIp(request);
  rateLimit(`forgot:${ip}`, 20, 10 * 60_000);
  const body = await readJson<Record<string, unknown>>(request);
  const identifier = str(body.identifier, 'Email or mobile', { required: true, max: 120 });

  if (body.code === undefined) {
    rateLimit(`forgot-send:${identifier.toLowerCase()}`, 3, 10 * 60_000);
    const user = await findUser(identifier);
    if (user && user.status === 'ACTIVE' && (user.mobile || user.email)) {
      await sendLoginOtp(user, 'RESET');
      await audit(prisma, { tenantId: user.tenantId, userId: user.id, name: user.name, role: user.role, ip, userAgent: userAgent(request) }, { action: 'PASSWORD_RESET_REQUESTED', entityType: 'User', entityId: user.id, sensitive: true });
      return ok({ sent: true, maskedMobile: user.mobile ? `******${phoneKey(user.mobile).slice(-4)}` : null }, GENERIC);
    }
    return ok({ sent: true, maskedMobile: null }, GENERIC);
  }

  const code = str(body.code, 'OTP', { required: true, max: 6 });
  const next = str(body.newPassword, 'New password', { required: true, max: 200 });
  const weak = validatePasswordStrength(next);
  if (weak) throw badRequest(weak);

  const user = await findUser(identifier);
  if (!user || user.status !== 'ACTIVE') throw badRequest('Wrong OTP.');
  await checkOtp(user.id, code, 'RESET');

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next), failedLoginCount: 0, lockedUntil: null } }),
    // Anyone signed in with the old password is signed out.
    prisma.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit(prisma, { tenantId: user.tenantId, userId: user.id, name: user.name, role: user.role, ip, userAgent: userAgent(request) }, { action: 'PASSWORD_RESET', entityType: 'User', entityId: user.id, sensitive: true });
  return ok(null, 'Password reset. You can now log in with the new password.');
});
