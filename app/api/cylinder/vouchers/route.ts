import { prisma, transaction } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { depositMessage, depositMode, postDepositAdjustment, syncFormLine, VOUCHER_STATUSES } from '@/lib/server/cylinderDeposits';
import { Effects } from '@/lib/server/effects';
import { badRequest, businessDate, handle, notFound, ok, optStr, readJson, str } from '@/lib/server/http';
import { nextNumber } from '@/lib/server/sequence';

/** Subscription (SV) / transfer (TV) vouchers — cylinder caution deposits. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'customers.view');
  const customerId = new URL(request.url).searchParams.get('customerId');
  const vouchers = await prisma.cylinderVoucher.findMany({
    where: { tenantId: auth.tenantId, ...(customerId ? { customerId } : {}) },
    // Address / GSTIN are printed on the deposit receipt.
    include: { customer: { select: { name: true, shortName: true, customerCode: true, phone: true, address: true, city: true, state: true, pincode: true, gstin: true } } },
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
  const status = (VOUCHER_STATUSES as readonly string[]).includes(String(body.status)) ? String(body.status) : 'ACTIVE';
  const mode = depositMode(body.paymentMode);
  const depositAmount = Math.max(0, Number(body.depositAmount) || 0);
  if (!id && depositAmount > 0 && !mode) throw badRequest('Choose how the deposit was received.');
  const data = {
    customerId,
    voucherType: body.voucherType === 'TV' ? 'TV' : 'SV',
    productId: product?.id || null,
    productName: product?.name || null,
    cylinderQty: Math.max(1, Math.floor(Number(body.cylinderQty) || 1)),
    regulatorQty: Math.max(0, Math.floor(Number(body.regulatorQty) || 0)),
    depositAmount,
    issueDate: optStr(body.issueDate) || businessDate(),
    status,
    svNumber: optStr(body.svNumber)?.toUpperCase() || null,
    ...(mode ? { paymentMode: mode } : {}),
    notes: optStr(body.notes),
  };

  const effects = new Effects();
  const voucher = await transaction(async (tx) => {
    const before = id ? await tx.cylinderVoucher.findFirst({ where: { id, tenantId: auth.tenantId } }) : null;
    if (id && !before) throw notFound('Voucher not found.');
    const closedOn = status === 'ACTIVE' || status === 'TRANSFERRED' ? null : before?.status === status ? before.closedOn : optStr(body.closedOn) || businessDate();
    const v = before
      ? await tx.cylinderVoucher.update({ where: { id: before.id }, data: { ...data, closedOn } })
      : await tx.cylinderVoucher.create({ data: { ...data, closedOn, tenantId: auth.tenantId, voucherNumber: await nextNumber(tx, auth.tenantId, data.voucherType), createdBy: auth.name } });
    await postDepositAdjustment(tx, auth, v);
    await syncFormLine(tx, v);
    await audit(tx, auth, { action: id ? 'VOUCHER_UPDATED' : 'VOUCHER_ISSUED', entityType: 'CylinderVoucher', entityId: v.id, reference: `${v.voucherNumber} · ${customer.name}`, newValue: data });
    if (v.status === 'ACTIVE' && v.paymentMode !== 'OPENING' && before?.status !== 'ACTIVE') depositMessage(effects, auth.tenantId, customer, [v]);
    return v;
  });
  effects.schedule();
  return ok(voucher, 'Voucher saved.');
});
