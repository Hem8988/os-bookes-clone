import { NextResponse } from 'next/server';
import { PERMISSIONS, Permission, can } from '@/lib/permissions';
import { getAuth } from '@/lib/server/auth';
import { handle } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';

export const GET = handle(async (request: Request) => {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ authenticated: false }, { status: 401 });
  const company = await getSetting(auth.tenantId, 'company');
  const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(auth.role, p));
  return NextResponse.json({
    authenticated: true,
    user: { id: auth.userId, name: auth.name, email: auth.email, role: auth.role, customerId: auth.customerId },
    permissions,
    company: { name: company.name, phone: company.phone, supportPhone: company.supportPhone, gstin: company.gstin, address: company.address, upiId: company.upiId, email: company.email },
  });
});
