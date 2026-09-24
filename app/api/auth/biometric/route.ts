import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { ApiError, badRequest, clientIp, handle, ok, readJson, unauthorized, userAgent } from '@/lib/server/http';
import { finishLogin, pendingResponse } from '@/lib/server/login';
import { PENDING_LOGIN_COOKIE, readCookie, verifyPendingLogin } from '@/lib/server/sessionToken';

// Fingerprint / face check for delivery boys (SRS §15.1) using the phone's
// platform authenticator via WebAuthn. The credential is bound to the
// approved device, so a shared password alone is not enough to log in.

function relyingParty(request: Request) {
  const origin = process.env.APP_URL || new URL(request.url).origin;
  return { origin, rpID: new URL(origin).hostname, rpName: 'DeskShark' };
}

async function loadPending(request: Request) {
  const pending = verifyPendingLogin(readCookie(request, PENDING_LOGIN_COOKIE));
  const step = pending?.steps[0];
  if (!pending || !pending.deviceId || (step !== 'BIOMETRIC_REGISTER' && step !== 'BIOMETRIC_VERIFY')) throw unauthorized('Login session expired. Please log in again.');
  const user = await prisma.user.findUnique({ where: { id: pending.uid } });
  const device = user ? await prisma.userDevice.findUnique({ where: { userId_deviceId: { userId: user.id, deviceId: pending.deviceId } } }) : null;
  if (!user || !device || device.status !== 'APPROVED') throw unauthorized();
  return { pending, user, device, step };
}

/** GET → options for navigator.credentials; POST → verify the response. */
export const GET = handle(async (request: Request) => {
  const { user, device, step } = await loadPending(request);
  const rp = relyingParty(request);
  if (step === 'BIOMETRIC_REGISTER') {
    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    });
    await prisma.authChallenge.create({ data: { userId: user.id, challenge: options.challenge, purpose: 'BIOMETRIC_REGISTER', expiresAt: new Date(Date.now() + 5 * 60_000) } });
    return ok({ mode: 'register', options });
  }
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: 'required',
    allowCredentials: device.biometricCredentialId ? [{ id: device.biometricCredentialId }] : [],
  });
  await prisma.authChallenge.create({ data: { userId: user.id, challenge: options.challenge, purpose: 'BIOMETRIC_LOGIN', expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return ok({ mode: 'verify', options });
});

export const POST = handle(async (request: Request) => {
  const { pending, user, device, step } = await loadPending(request);
  const rp = relyingParty(request);
  const body = await readJson<{ response?: unknown }>(request);
  if (!body.response) throw badRequest('Biometric response missing.');
  const purpose = step === 'BIOMETRIC_REGISTER' ? 'BIOMETRIC_REGISTER' : 'BIOMETRIC_LOGIN';
  const challenge = await prisma.authChallenge.findFirst({ where: { userId: user.id, purpose, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!challenge) throw new ApiError(400, 'Biometric request expired. Try again.', 'CHALLENGE_EXPIRED');
  await prisma.authChallenge.deleteMany({ where: { userId: user.id, purpose } });

  try {
    if (step === 'BIOMETRIC_REGISTER') {
      const result = await verifyRegistrationResponse({
        response: body.response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: challenge.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      });
      if (!result.verified) throw new Error('not verified');
      const { credential } = result.registrationInfo;
      await prisma.userDevice.update({
        where: { id: device.id },
        data: { biometricCredentialId: credential.id, biometricPublicKey: Buffer.from(credential.publicKey).toString('base64url'), biometricCounter: credential.counter },
      });
    } else {
      if (!device.biometricCredentialId || !device.biometricPublicKey) throw new Error('no credential');
      const result = await verifyAuthenticationResponse({
        response: body.response as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
        expectedChallenge: challenge.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
        credential: { id: device.biometricCredentialId, publicKey: new Uint8Array(Buffer.from(device.biometricPublicKey, 'base64url')), counter: device.biometricCounter },
      });
      if (!result.verified) throw new Error('not verified');
      await prisma.userDevice.update({ where: { id: device.id }, data: { biometricCounter: result.authenticationInfo.newCounter } });
    }
  } catch {
    await audit(prisma, { tenantId: user.tenantId, userId: user.id, name: user.name, role: user.role, ip: clientIp(request), userAgent: userAgent(request) }, { action: 'BIOMETRIC_FAILED', entityType: 'UserDevice', entityId: device.id, sensitive: true });
    throw new ApiError(401, 'Fingerprint / face verification failed.', 'BIOMETRIC_FAILED');
  }

  const remaining = pending.steps.slice(1);
  return remaining.length ? pendingResponse(user, pending.deviceId, remaining) : finishLogin(request, user, pending.deviceId);
});
