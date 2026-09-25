import { NextResponse } from 'next/server';
import { PERMISSIONS, Permission, can } from '@/lib/permissions';
import { getAuth } from '@/lib/server/auth';
import { handle } from '@/lib/server/http';
import { SESSION_COOKIE } from '@/lib/server/sessionToken';
import { getSetting } from '@/lib/server/settings';

export const GET = handle(async (request: Request) => {
  const auth = await getAuth(request);
  if (!auth) {
    // Session revoked or idle-timed-out: drop the cookie so /login is reachable again.
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  const company = await getSetting(auth.tenantId, 'company');
  const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(auth.role, p));
  return NextResponse.json({
    authenticated: true,
    user: { id: auth.userId, name: auth.name, email: auth.email, role: auth.role, customerId: auth.customerId },
    permissions,
    company: { name: company.name, phone: company.phone, supportPhone: company.supportPhone, gstin: company.gstin, address: company.address, upiId: company.upiId, email: company.email },
  });
});
