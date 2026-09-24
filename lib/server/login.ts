import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { User } from '@/lib/generated/prisma/client';
import { ROLE_HOME, Role } from '@/lib/permissions';
import { phoneKey } from '@/lib/phone';
import { createApproval } from './approvals';
import { audit } from './audit';
import { assertIpAllowed, rateLimit } from './auth';
import { Effects } from './effects';
import { ApiError, clientIp, userAgent } from './http';
import { notifyCustomer } from './notify';
import { generateOtp, hashOtp, hashPassword, needsRehash, verifyPassword } from './password';
import { getSetting } from './settings';
import { LoginStep, PENDING_LOGIN_COOKIE, SESSION_COOKIE, signPendingLogin, signSession } from './sessionToken';

const OTP_TTL_MS = 10 * 60_000;
const PENDING_TTL_S = 10 * 60;
const secure = process.env.NODE_ENV === 'production';

export interface LoginAttempt {
  identifier: string;
  password: string;
  deviceId?: string | null;
  deviceLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const actorFor = (user: User, request: Request) => ({ tenantId: user.tenantId, userId: user.id, name: user.name, role: user.role, ip: clientIp(request), userAgent: userAgent(request) });

async function findUser(identifier: string) {
  const id = identifier.trim().toLowerCase();
  if (id.includes('@')) return prisma.user.findUnique({ where: { email: id } });
  const key = phoneKey(id);
  return key.length === 10 ? prisma.user.findFirst({ where: { mobile: { endsWith: key } } }) : null;
}

/** Step 1: password + policy checks. Returns the remaining steps. */
export async function beginLogin(request: Request, input: LoginAttempt) {
  const ip = clientIp(request);
  rateLimit(`login:${ip}`, 30, 60_000);
  rateLimit(`login:${input.identifier.toLowerCase()}`, 10, 60_000);

  const user = await findUser(input.identifier);
  const invalid = new ApiError(401, 'Wrong email/mobile or password.', 'INVALID_CREDENTIALS');
  if (!user) throw invalid;
  const security = await getSetting(user.tenantId, 'security');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(423, `Too many wrong attempts. Try again after ${user.lockedUntil.toLocaleTimeString('en-IN')}.`, 'ACCOUNT_LOCKED');
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= security.maxFailedLogins;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + security.lockoutMinutes * 60_000) : null },
    });
    await audit(prisma, actorFor(user, request), { action: lock ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', entityType: 'User', entityId: user.id, sensitive: lock });
    throw invalid;
  }
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'Your account is not active. Contact the administrator.', 'ACCOUNT_INACTIVE');
  if (needsRehash(user.passwordHash)) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(input.password) } });

  if (user.role === 'ACCOUNTANT' && security.accountantIpRestriction) await assertIpAllowed(user.tenantId, user.role, ip);

  const steps: LoginStep[] = [];
  let deviceId: string | null = null;

  if (user.role === 'DELIVERY_BOY') {
    const locationOk = input.latitude != null && input.longitude != null;
    if (security.loginLocationRequired && !security.locationOverride && !locationOk) {
      throw new ApiError(400, 'Location permission is required to log in.', 'LOCATION_REQUIRED');
    }
    if (security.deviceBindingRequired) {
      deviceId = (input.deviceId || '').trim().slice(0, 100) || null;
      if (!deviceId) throw new ApiError(400, 'This device could not be identified. Please use the DeskShark delivery app.', 'DEVICE_REQUIRED');
      let device = await prisma.userDevice.findUnique({ where: { userId_deviceId: { userId: user.id, deviceId } } });
      if (!device) {
        const effects = new Effects();
        await prisma.$transaction(async (tx) => {
          device = await tx.userDevice.create({ data: { userId: user.id, deviceId: deviceId!, label: (input.deviceLabel || userAgent(request)).slice(0, 120) } });
          await createApproval(
            tx,
            {
              tenantId: user.tenantId,
              type: 'DEVICE_APPROVAL',
              referenceType: 'DEVICE',
              referenceId: device.id,
              title: `${user.name} — new device`,
              summary: `${device.label} · IP ${ip}${locationOk ? ` · ${input.latitude?.toFixed(4)}, ${input.longitude?.toFixed(4)}` : ''}`,
              requestedById: user.id,
              requestedByName: user.name,
            },
            effects
          );
          await audit(tx, actorFor(user, request), { action: 'NEW_DEVICE_LOGIN_BLOCKED', entityType: 'UserDevice', entityId: device.id, reference: device.label || undefined, sensitive: true });
        });
        effects.schedule();
        throw new ApiError(403, 'New device detected. The admin has been asked to approve this phone — try again after approval.', 'DEVICE_PENDING');
      }
      const bound = device as { status: string; biometricCredentialId: string | null };
      if (bound.status === 'PENDING') throw new ApiError(403, 'This phone is waiting for admin approval.', 'DEVICE_PENDING');
      if (bound.status === 'REVOKED') throw new ApiError(403, 'This phone has been blocked by the admin.', 'DEVICE_REVOKED');
      if (security.biometricRequired) steps.push(bound.biometricCredentialId ? 'BIOMETRIC_VERIFY' : 'BIOMETRIC_REGISTER');
    }
  }

  if ((security.otpRequiredRoles.includes(user.role) || user.twoFactorEnabled) && user.role !== 'CUSTOMER') {
    if (!user.mobile) throw new ApiError(400, 'OTP is required but no mobile number is registered. Contact the admin.', 'OTP_NO_MOBILE');
    steps.unshift('OTP');
    await sendLoginOtp(user);
  }

  if (input.latitude != null && input.longitude != null && user.role === 'DELIVERY_BOY') {
    await prisma.deliveryLocation.upsert({
      where: { tenantId_deliveryBoyId: { tenantId: user.tenantId, deliveryBoyId: user.id } },
      create: { tenantId: user.tenantId, deliveryBoyId: user.id, deliveryBoyName: user.name, latitude: input.latitude, longitude: input.longitude },
      update: { latitude: input.latitude, longitude: input.longitude, recordedAt: new Date() },
    });
  }

  if (steps.length === 0) return finishLogin(request, user, deviceId);
  return pendingResponse(user, deviceId, steps);
}

export async function sendLoginOtp(user: User) {
  const code = generateOtp();
  await prisma.loginOtp.create({ data: { userId: user.id, purpose: 'LOGIN', codeHash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  await notifyCustomer(user.tenantId, { name: user.name, phone: user.mobile || '', whatsappNumber: user.mobile }, 'OTP', { code });
}

export async function checkOtp(userId: string, code: string) {
  const otp = await prisma.loginOtp.findFirst({ where: { userId, purpose: 'LOGIN', consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.expiresAt < new Date()) throw new ApiError(400, 'OTP expired. Log in again to get a new one.', 'OTP_EXPIRED');
  if (otp.attempts >= 5) throw new ApiError(429, 'Too many wrong OTP attempts. Log in again.', 'OTP_LOCKED');
  if (otp.codeHash !== hashOtp(code.trim())) {
    await prisma.loginOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, 'Wrong OTP.', 'OTP_INVALID');
  }
  await prisma.loginOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

export function pendingResponse(user: User, deviceId: string | null, steps: LoginStep[]) {
  const response = NextResponse.json({ success: true, data: { next: steps[0], name: user.name, maskedMobile: user.mobile ? `******${phoneKey(user.mobile).slice(-4)}` : null } });
  response.cookies.set(PENDING_LOGIN_COOKIE, signPendingLogin({ uid: user.id, deviceId, steps, exp: Math.floor(Date.now() / 1000) + PENDING_TTL_S }), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: PENDING_TTL_S,
  });
  return response;
}

/** All checks passed: create the server-side session and set the cookie. */
export async function finishLogin(request: Request, user: User, deviceId: string | null) {
  const security = await getSetting(user.tenantId, 'security');
  const expiresAt = new Date(Date.now() + security.sessionMaxHours * 3_600_000);
  const ip = clientIp(request);
  const session = await prisma.userSession.create({ data: { userId: user.id, deviceId, ipAddress: ip, userAgent: userAgent(request), expiresAt } });
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip } });
  if (deviceId) await prisma.userDevice.updateMany({ where: { userId: user.id, deviceId }, data: { lastSeenAt: new Date() } });
  await audit(prisma, actorFor(user, request), { action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id, details: deviceId ? `device ${deviceId}` : undefined });

  const token = signSession({ sid: session.id, uid: user.id, role: user.role, tid: user.tenantId, exp: Math.floor(expiresAt.getTime() / 1000) });
  const response = NextResponse.json({
    success: true,
    data: { done: true, redirectPath: ROLE_HOME[user.role as Role] || '/login', user: { id: user.id, name: user.name, role: user.role } },
  });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires: expiresAt });
  response.cookies.delete(PENDING_LOGIN_COOKIE);
  return response;
}
