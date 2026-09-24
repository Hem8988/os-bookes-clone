import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, businessDate, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { nextNumber } from '@/lib/server/sequence';

/** Subscription (SV) / transfer (TV) vouchers — cylinder caution deposits. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'customers.view');
  const customerId = new URL(request.url).searchParams.get('customerId');
  const vouchers = await prisma.cylinderVoucher.findMany({
    where: { tenantId: auth.tenantId, ...(customerId ? { customerId } : {}) },
    include: { customer: { select: { name: true, shortName: true, customerCode: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(vouchers);
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'customers.manage', { write: true });
  const body = await readJson(request);
  const id = optStr(body.id);
  const customerId = str(body.customerId, 'Customer', { required: true });
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: auth.tenantId } });
  if (!customer) throw badRequest('Customer not found.');
  const product = optStr(body.productId) ? await prisma.product.findFirst({ where: { id: String(body.productId), tenantId: auth.tenantId } }) : null;
  const data = {
    customerId,
    voucherType: body.voucherType === 'TV' ? 'TV' : 'SV',
    productId: product?.id || null,
    productName: product?.name || null,
    cylinderQty: Math.max(1, Math.floor(Number(body.cylinderQty) || 1)),
    regulatorQty: Math.max(0, Math.floor(Number(body.regulatorQty) || 0)),
    depositAmount: Math.max(0, Number(body.depositAmount) || 0),
    issueDate: optStr(body.issueDate) || businessDate(),
    status: ['ACTIVE', 'CANCELLED', 'TRANSFERRED', 'REFUNDED'].includes(String(body.status)) ? String(body.status) : 'ACTIVE',
    notes: optStr(body.notes),
  };
  const voucher = id
    ? await prisma.cylinderVoucher.update({ where: { id }, data })
    : await prisma.cylinderVoucher.create({ data: { ...data, tenantId: auth.tenantId, voucherNumber: await nextNumber(prisma, auth.tenantId, data.voucherType), createdBy: auth.name } });
  await audit(prisma, auth, { action: id ? 'VOUCHER_UPDATED' : 'VOUCHER_ISSUED', entityType: 'CylinderVoucher', entityId: voucher.id, reference: `${voucher.voucherNumber} · ${customer.name}`, newValue: data });
  return ok(voucher, 'Voucher saved.');
});
