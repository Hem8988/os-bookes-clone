import { prisma } from '@/lib/db';
import { can, ROLES, Role } from '@/lib/permissions';
import { isValidMobile, phoneKey } from '@/lib/phone';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, conflict, forbidden, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { hashPassword, validatePasswordStrength } from '@/lib/server/password';

const PUBLIC_FIELDS = { id: true, name: true, email: true, mobile: true, role: true, status: true, customerId: true, twoFactorEnabled: true, lastLoginAt: true, lastLoginIp: true, createdAt: true } as const;

/**
 * Users. Staff can list delivery boys / accountants (for assignment and cash
 * handover pickers); only the Super Admin sees and manages everyone.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const role = new URL(request.url).searchParams.get('role');
  if (can(auth.role, 'users.manage')) {
    return ok(await prisma.user.findMany({ where: { tenantId: auth.tenantId, ...(role ? { role } : {}) }, select: PUBLIC_FIELDS, orderBy: [{ role: 'asc' }, { name: 'asc' }] }));
  }
  if (auth.role === 'CUSTOMER' || !role || !['DELIVERY_BOY', 'ACCOUNTANT'].includes(role)) throw forbidden();
  return ok(await prisma.user.findMany({ where: { tenantId: auth.tenantId, role, status: 'ACTIVE' }, select: { id: true, name: true, mobile: true, role: true }, orderBy: { name: 'asc' } }));
});

/** Create a user (password is set by the admin and should be changed on first login). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'users.manage', { write: true });
  const body = await readJson(request);
  const role = str(body.role, 'Role', { required: true }) as Role;
  if (!ROLES.includes(role)) throw badRequest('Invalid role.');
  const email = str(body.email, 'Email', { required: true, max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email.');
  const mobileRaw = optStr(body.mobile);
  if (mobileRaw && !isValidMobile(mobileRaw)) throw badRequest('Enter a valid 10-digit mobile number.');
  const mobile = mobileRaw ? phoneKey(mobileRaw) : null;
  if (role === 'DELIVERY_BOY' && !mobile) throw badRequest('Mobile number is required for delivery boys.');
  const password = str(body.password, 'Password', { required: true, max: 200 });
  const weak = validatePasswordStrength(password);
  if (weak) throw badRequest(weak);

  let customerId: string | null = null;
  if (role === 'CUSTOMER') {
    customerId = str(body.customerId, 'Customer', { required: true });
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: auth.tenantId } });
    if (!customer) throw badRequest('Customer not found.');
  }
  if (await prisma.user.findUnique({ where: { email } })) throw conflict('A user with this email already exists.');
  if (mobile && (await prisma.user.findUnique({ where: { mobile } }))) throw conflict('A user with this mobile already exists.');

  const user = await prisma.user.create({
    data: { tenantId: auth.tenantId, name: str(body.name, 'Name', { required: true, max: 100 }), email, mobile, role, customerId, passwordHash: hashPassword(password), twoFactorEnabled: !!body.twoFactorEnabled },
    select: PUBLIC_FIELDS,
  });
  await audit(prisma, auth, { action: 'USER_CREATED', entityType: 'User', entityId: user.id, reference: `${user.name} (${role})`, sensitive: true });
  return ok(user, `${user.name} created as ${role.replace('_', ' ').toLowerCase()}.`);
});
