import type { Tx } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { isValidGstin, isValidMobile, phoneKey } from '@/lib/phone';
import { audit, Actor } from './audit';
import { badRequest, businessDate, conflict, notFound, round2 } from './http';
import { adjustCustomerHolding } from './inventory';
import { postCustomerLedger } from './ledger';
import { nextNumber } from './sequence';

type Row = Record<string, unknown>;

// Customer Master (SRS §5). Customers are never deleted — only made
// Inactive/Blocked so history stays intact.

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const optional = (v: unknown) => s(v) || null;
const num = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? 0 : Number(v));

const KNOWN = new Set([
  'id', 'customerCode', 'type', 'name', 'tradeName', 'shortName', 'contactPerson', 'phone', 'whatsappNumber', 'otherMobile', 'email', 'gstin',
  'address', 'city', 'state', 'stateCode', 'pincode', 'area', 'route', 'defaultDeliveryBoyId', 'defaultProductIds', 'segment', 'paymentTerms',
  'creditLimit', 'creditDays', 'openingBalance', 'openingBalanceType', 'balance', 'accountGroup', 'status', 'gstApplicable', 'partyType', 'isSezParty',
  'rateMode', 'joiningDate', 'internalNotes', 'tags', 'deliveryAddresses', 'partyRates', 'extra', 'createdAt', 'updatedAt', 'active',
]);

function fields(input: Row) {
  const type = input.type === 'Vendor' ? 'Vendor' : 'Customer';
  const name = s(input.name);
  if (!name) throw badRequest('Company / trade name is required.');
  const phone = phoneKey(s(input.phone));
  if (!isValidMobile(phone)) throw badRequest('Enter a valid 10-digit mobile number.');
  const whatsapp = s(input.whatsappNumber) ? phoneKey(s(input.whatsappNumber)) : phone;
  if (!isValidMobile(whatsapp)) throw badRequest('Enter a valid WhatsApp number.');
  const gstin = s(input.gstin).toUpperCase() || null;
  if (!isValidGstin(gstin)) throw badRequest('GSTIN format is not valid.');
  const email = s(input.email) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Email is not valid.');
  const address = s(input.address);
  if (!address) throw badRequest('Billing address is required.');
  const status = input.active === false && !input.status ? 'INACTIVE' : ['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(s(input.status)) ? s(input.status) : 'ACTIVE';

  const extra: Row = {};
  for (const [k, v] of Object.entries(input)) if (!KNOWN.has(k)) extra[k] = v;
  if (input.extra && typeof input.extra === 'object') Object.assign(extra, input.extra);

  return {
    type,
    name,
    tradeName: optional(input.tradeName),
    shortName: optional(input.shortName),
    contactPerson: optional(input.contactPerson),
    phone,
    whatsappNumber: whatsapp,
    otherMobile: optional(input.otherMobile),
    email,
    gstin,
    address,
    city: optional(input.city),
    state: optional(input.state),
    stateCode: optional(input.stateCode) || (gstin ? gstin.slice(0, 2) : null),
    pincode: optional(input.pincode),
    area: optional(input.area),
    route: optional(input.route),
    defaultDeliveryBoyId: optional(input.defaultDeliveryBoyId),
    defaultProductIds: Array.isArray(input.defaultProductIds) ? input.defaultProductIds.map(String) : [],
    segment: optional(input.segment),
    paymentTerms: ['COD', 'NET_7', 'NET_15', 'NET_30'].includes(s(input.paymentTerms)) ? s(input.paymentTerms) : 'COD',
    creditLimit: Math.max(0, num(input.creditLimit)),
    creditDays: input.creditDays === '' || input.creditDays == null ? null : Math.max(0, Math.floor(num(input.creditDays))),
    accountGroup: type === 'Vendor' ? 'Sundry Creditors' : 'Sundry Debtors',
    status,
    gstApplicable: optional(input.gstApplicable),
    partyType: optional(input.partyType),
    isSezParty: typeof input.isSezParty === 'boolean' ? input.isSezParty : null,
    rateMode: optional(input.rateMode),
    joiningDate: optional(input.joiningDate),
    internalNotes: optional(input.internalNotes),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    extra: extra as Prisma.InputJsonValue,
  };
}

function nested(input: Row) {
  const addresses = Array.isArray(input.deliveryAddresses)
    ? (input.deliveryAddresses as Row[])
        .filter((a) => s(a.address))
        .map((a, i) => ({
          label: s(a.label) || `Address ${i + 1}`,
          address: s(a.address),
          city: optional(a.city),
          state: optional(a.state),
          pincode: optional(a.pincode),
          area: optional(a.area),
          route: optional(a.route),
          contactPerson: optional(a.contactPerson),
          phone: optional(a.phone),
          isDefault: !!a.isDefault,
        }))
    : [];
  if (addresses.length && !addresses.some((a) => a.isDefault)) addresses[0].isDefault = true;
  const rates = Array.isArray(input.partyRates)
    ? (input.partyRates as Row[])
        .filter((r) => s(r.productId))
        .map((r) => ({
          productId: s(r.productId),
          productName: s(r.productName),
          price: num(r.price),
          customRate: r.customRate === '' || r.customRate == null ? null : num(r.customRate),
          effectiveMonth: optional(r.effectiveMonth),
        }))
    : [];
  return { addresses, rates };
}

async function assertUniquePhone(tx: Tx, tenantId: string, type: string, phone: string, exceptId?: string) {
  if (type !== 'Customer') return;
  const clash = await tx.customer.findFirst({ where: { tenantId, type: 'Customer', phone, NOT: exceptId ? { id: exceptId } : undefined } });
  if (clash) throw conflict(`Mobile ${phone} is already registered for ${clash.name}.`);
}

export async function createCustomer(tx: Tx, actor: Actor, input: Row) {
  const data = fields(input);
  await assertUniquePhone(tx, actor.tenantId, data.type, data.phone);
  const { addresses, rates } = nested(input);
  const id = /^[\w-]{1,60}$/.test(s(input.id)) ? s(input.id) : undefined;
  if (id && (await tx.customer.findUnique({ where: { id } }))) throw conflict('Customer id already exists.');

  const customer = await tx.customer.create({
    data: {
      ...data,
      ...(id ? { id } : {}),
      tenantId: actor.tenantId,
      customerCode: await nextNumber(tx, actor.tenantId, data.type === 'Vendor' ? 'VEND' : 'CUST'),
      deliveryAddresses: { create: addresses },
      partyRates: { create: rates },
    },
  });

  // One-time opening balances at onboarding.
  const opening = round2(num(input.openingBalance) * (input.openingBalanceType === 'Cr' ? -1 : 1));
  if (opening !== 0) {
    await tx.customer.update({ where: { id: customer.id }, data: { openingBalance: opening } });
    await postCustomerLedger(tx, {
      tenantId: actor.tenantId,
      customerId: customer.id,
      entryType: 'OPENING',
      debit: opening > 0 ? opening : 0,
      credit: opening < 0 ? -opening : 0,
      voucherNumber: `OPEN-${customer.customerCode}`,
      date: businessDate(),
      particulars: 'Opening balance',
      referenceType: 'CUSTOMER',
      referenceId: customer.id,
      createdBy: actor.name,
    });
  }
  const cylinders: { productId: string; qty: number }[] = Array.isArray(input.openingCylinders)
    ? (input.openingCylinders as Row[]).map((c) => ({ productId: s(c.productId), qty: num(c.qty) }))
    : num(input.openingEmptyCylinderQty) && data.defaultProductIds[0]
      ? [{ productId: data.defaultProductIds[0], qty: num(input.openingEmptyCylinderQty) }]
      : [];
  for (const c of cylinders.filter((x) => x.qty)) {
    const product = await tx.product.findFirst({ where: { id: c.productId, tenantId: actor.tenantId } });
    if (!product) continue;
    await adjustCustomerHolding(tx, { tenantId: actor.tenantId, customerId: customer.id, customerName: customer.name, productId: product.id, productName: product.name, qtyDelta: c.qty, opening: true, reason: 'Opening cylinders at onboarding', performedBy: actor.name });
  }

  await audit(tx, actor, { action: data.type === 'Vendor' ? 'VENDOR_CREATED' : 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer.id, reference: `${customer.customerCode} ${customer.name}`, newValue: { opening, creditLimit: data.creditLimit } });
  return customer;
}

export async function updateCustomer(tx: Tx, actor: Actor, id: string, input: Row) {
  const existing = await tx.customer.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!existing) throw notFound('Customer not found.');
  const data = fields({ ...input, type: existing.type });
  await assertUniquePhone(tx, actor.tenantId, existing.type, data.phone, id);
  const { addresses, rates } = nested(input);
  await tx.customerAddress.deleteMany({ where: { customerId: id } });
  await tx.partyRate.deleteMany({ where: { customerId: id } });
  const customer = await tx.customer.update({
    where: { id },
    data: { ...data, deliveryAddresses: { create: addresses }, partyRates: { create: rates } },
  });
  const watched = ['status', 'creditLimit', 'paymentTerms', 'phone', 'whatsappNumber', 'defaultDeliveryBoyId'] as const;
  const changed = watched.filter((k) => JSON.stringify(existing[k]) !== JSON.stringify(customer[k]));
  if (changed.length) {
    await audit(tx, actor, {
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: id,
      reference: `${customer.customerCode} ${customer.name}`,
      oldValue: Object.fromEntries(changed.map((k) => [k, existing[k]])),
      newValue: Object.fromEntries(changed.map((k) => [k, customer[k]])),
      sensitive: changed.includes('creditLimit') || changed.includes('status'),
    });
  }
  return customer;
}

/** Soft delete: customers keep their history (SRS §5.3). */
export async function deactivateCustomer(tx: Tx, actor: Actor, id: string) {
  const existing = await tx.customer.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!existing) throw notFound('Customer not found.');
  await tx.customer.update({ where: { id }, data: { status: 'INACTIVE' } });
  await audit(tx, actor, { action: 'CUSTOMER_DEACTIVATED', entityType: 'Customer', entityId: id, reference: `${existing.customerCode} ${existing.name}` });
}

export function customerToClient(c: Row & { extra?: unknown }) {
  const { extra, ...rest } = c;
  return { ...((extra as Row) || {}), ...rest, active: rest.status === 'ACTIVE' };
}
