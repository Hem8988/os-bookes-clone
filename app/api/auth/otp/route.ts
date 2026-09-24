import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/server/auth';
import { clientIp, handle, readJson, str, unauthorized } from '@/lib/server/http';
import { checkOtp, finishLogin, pendingResponse, sendLoginOtp } from '@/lib/server/login';
import { PENDING_LOGIN_COOKIE, readCookie, verifyPendingLogin } from '@/lib/server/sessionToken';

/** Verify the login OTP (or resend it with { resend: true }). */
export const POST = handle(async (request: Request) => {
  rateLimit(`otp:${clientIp(request)}`, 20, 60_000);
  const pending = verifyPendingLogin(readCookie(request, PENDING_LOGIN_COOKIE));
  if (!pending || pending.steps[0] !== 'OTP') throw unauthorized('Login session expired. Please log in again.');
  const user = await prisma.user.findUnique({ where: { id: pending.uid } });
  if (!user || user.status !== 'ACTIVE') throw unauthorized();

  const body = await readJson<{ code?: string; resend?: boolean }>(request);
  if (body.resend) {
    rateLimit(`otp-resend:${user.id}`, 3, 10 * 60_000);
    await sendLoginOtp(user);
    return pendingResponse(user, pending.deviceId, pending.steps);
  }
  await checkOtp(user.id, str(body.code, 'OTP', { required: true, max: 6 }));
  const remaining = pending.steps.slice(1);
  return remaining.length ? pendingResponse(user, pending.deviceId, remaining) : finishLogin(request, user, pending.deviceId);
});
