import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson, str } from '@/lib/server/http';

/** Bound phones of field staff (SRS §15.2). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'devices.approve');
  const devices = await prisma.userDevice.findMany({
    where: { user: { tenantId: auth.tenantId } },
    include: { user: { select: { name: true, role: true, mobile: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(devices.map(({ biometricPublicKey, ...d }) => ({ ...d, hasBiometric: !!biometricPublicKey })));
});

/** { deviceId, action: APPROVE | REVOKE | RESET_BIOMETRIC } */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'devices.approve', { write: true });
  const body = await readJson(request);
  const device = await prisma.userDevice.findFirst({ where: { id: str(body.deviceId, 'Device', { required: true }), user: { tenantId: auth.tenantId } } });
  if (!device) throw notFound('Device not found.');
  const action = String(body.action || '');
  if (action === 'APPROVE') {
    await prisma.userDevice.update({ where: { id: device.id }, data: { status: 'APPROVED', approvedBy: auth.name, approvedAt: new Date() } });
    await prisma.approvalRequest.updateMany({ where: { type: 'DEVICE_APPROVAL', referenceId: device.id, status: 'PENDING' }, data: { status: 'APPROVED', decidedByName: auth.name, decidedAt: new Date() } });
  } else if (action === 'REVOKE') {
    await prisma.userDevice.update({ where: { id: device.id }, data: { status: 'REVOKED' } });
    await prisma.userSession.updateMany({ where: { userId: device.userId, deviceId: device.deviceId, revokedAt: null }, data: { revokedAt: new Date() } });
  } else if (action === 'RESET_BIOMETRIC') {
    await prisma.userDevice.update({ where: { id: device.id }, data: { biometricCredentialId: null, biometricPublicKey: null, biometricCounter: 0 } });
  } else {
    throw badRequest('Unknown action.');
  }
  await audit(prisma, auth, { action: `DEVICE_${action}`, entityType: 'UserDevice', entityId: device.id, reference: device.label || device.deviceId, sensitive: true });
  return ok(null, 'Device updated.');
});
