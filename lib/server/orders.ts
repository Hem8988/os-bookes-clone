import type { Tx } from '@/lib/db';
import type { Order } from '@/lib/generated/prisma/client';
import { createApproval, cancelPendingApprovals } from './approvals';
import { audit, Actor } from './audit';
import type { Effects } from './effects';
import { badRequest, businessDate, conflict, dateStr, forbidden, notFound, round2 } from './http';
import { notifyCustomer, notifyUsers } from './notify';
import { resolveRate } from './pricing';
import { nextNumber } from './sequence';
import { getSetting } from './settings';

export const ORDER_STATUSES = [
  'DRAFT',
  'WHATSAPP_RECEIVED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'ASSIGNED',
  'ACCEPTED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PENDING_VERIFICATION',
  'SENT_BACK',
  'VERIFIED',
  'INVOICED',
  'LEDGER_POSTED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderSource = 'WHATSAPP' | 'MANUAL' | 'ADMIN' | 'CUSTOMER_PORTAL' | 'DELIVERY_BOY';

const ASSIGNABLE: OrderStatus[] = ['APPROVED', 'ASSIGNED', 'ACCEPTED'];
const CANCELLABLE: OrderStatus[] = ['DRAFT', 'WHATSAPP_RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'ACCEPTED'];

export async function setOrderStatus(tx: Tx, order: Pick<Order, 'id' | 'status'>, to: OrderStatus, actorName: string, note?: string, extra: Record<string, unknown> = {}) {
  await tx.order.update({ where: { id: order.id }, data: { status: to, ...extra } });
  await tx.orderStatusLog.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: to, actorName, note } });
  order.status = to;
}

const itemsText = (items: { productName: string; orderedQty: number }[]) => items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ');

export interface CreateOrderInput {
  customerId: string;
  source: OrderSource;
  items: { productId: string; qty: number }[];
  requestedDeliveryDate?: string;
  deliveryAddressId?: string | null;
  priority?: 'NORMAL' | 'URGENT';
  notes?: string | null;
  assignedDeliveryBoyId?: string | null;
}

export async function createOrder(tx: Tx, actor: Actor, input: CreateOrderInput, effects: Effects) {
  const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId: actor.tenantId, type: 'Customer' } });
  if (!customer) throw notFound('Customer not found.');
  if (customer.status !== 'ACTIVE') throw forbidden(`Customer is ${customer.status.toLowerCase()} — orders are not allowed.`);

  const lines = input.items.filter((i) => Number(i.qty) > 0);
  if (lines.length === 0) throw badRequest('Add at least one product with quantity.');

  const today = businessDate();
  const deliveryDate = input.requestedDeliveryDate ? dateStr(input.requestedDeliveryDate, 'Delivery date') : today;
  if (deliveryDate < today) throw badRequest('Delivery date cannot be in the past.');

  const items: { productId: string; productName: string; orderedQty: number; unitPrice: number; taxRate: number; totalAmount: number }[] = [];
  for (const line of lines) {
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1) throw badRequest('Quantity must be a whole number of at least 1.');
    const product = await tx.product.findFirst({ where: { id: line.productId, tenantId: actor.tenantId, active: true } });
    if (!product) throw badRequest('One of the products is not available.');
    const unitPrice = await resolveRate(tx, customer.id, product, deliveryDate);
    items.push({ productId: product.id, productName: product.name, orderedQty: qty, unitPrice, taxRate: product.taxRate, totalAmount: round2(qty * unitPrice) });
  }
  const totalAmount = round2(items.reduce((s, i) => s + i.totalAmount, 0));
  const isCreditOverLimit = customer.creditLimit > 0 && customer.balance + totalAmount > customer.creditLimit;

  let address = customer.address;
  if (input.deliveryAddressId) {
    const a = await tx.customerAddress.findFirst({ where: { id: input.deliveryAddressId, customerId: customer.id } });
    if (!a) throw badRequest('Delivery address not found.');
    address = a.address;
  } else {
    const def = await tx.customerAddress.findFirst({ where: { customerId: customer.id }, orderBy: { isDefault: 'desc' } });
    if (def) address = def.address;
  }

  const orderNumber = await nextNumber(tx, actor.tenantId, 'ORD');
  const initialStatus: OrderStatus = input.source === 'WHATSAPP' ? 'WHATSAPP_RECEIVED' : 'PENDING_APPROVAL';
  const order = await tx.order.create({
    data: {
      tenantId: actor.tenantId,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      whatsappNumber: customer.whatsappNumber,
      source: input.source,
      status: initialStatus,
      priority: input.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
      requestedDeliveryDate: deliveryDate,
      deliveryAddressId: input.deliveryAddressId || null,
      deliveryAddress: address,
      area: customer.area,
      route: customer.route,
      assignedDeliveryBoyId: input.assignedDeliveryBoyId || null,
      isCreditOverLimit,
      totalAmount,
      notes: input.notes || null,
      createdBy: actor.name,
      items: { create: items },
      statusLogs: { create: { toStatus: initialStatus, actorName: actor.name, note: `Created via ${input.source}` } },
    },
    include: { items: true },
  });
  if (initialStatus === 'WHATSAPP_RECEIVED') await setOrderStatus(tx, order, 'PENDING_APPROVAL', 'System', 'Auto-routed to approval');

  await audit(tx, actor, { action: 'ORDER_CREATED', entityType: 'Order', entityId: order.id, reference: orderNumber, newValue: { totalAmount, items: itemsText(items), source: input.source } });

  // Managers/admins creating a normal order approve it themselves; everything
  // else (and any credit-limit breach) waits in the approval queue.
  const selfApprove = (actor.role === 'SUPER_ADMIN' || actor.role === 'MANAGER') && !isCreditOverLimit;
  if (selfApprove) {
    await approveOrder(tx, actor, order, { creditOverride: false }, effects);
  } else {
    await createApproval(
      tx,
      {
        tenantId: actor.tenantId,
        type: isCreditOverLimit ? 'CREDIT_APPROVAL' : 'ORDER_APPROVAL',
        referenceType: 'ORDER',
        referenceId: order.id,
        title: `${orderNumber} · ${customer.name}`,
        summary: `${itemsText(items)} · ₹${totalAmount.toLocaleString('en-IN')} · deliver ${deliveryDate}${isCreditOverLimit ? ` · credit limit exceeded (outstanding ₹${customer.balance.toLocaleString('en-IN')} / limit ₹${customer.creditLimit.toLocaleString('en-IN')})` : ''}`,
        payload: { orderNumber, customerId: customer.id, totalAmount, outstanding: customer.balance, creditLimit: customer.creditLimit, source: input.source },
        requestedById: actor.userId === 'system' ? null : actor.userId,
        requestedByName: actor.name,
      },
      effects
    );
  }

  effects.add('order received message', () =>
    notifyCustomer(actor.tenantId, customer, 'ORDER_RECEIVED', { orderNumber, items: itemsText(items), deliveryDate }, `Order ${orderNumber} received`)
  );
  return order;
}

export async function approveOrder(tx: Tx, actor: Actor, order: Order, opts: { creditOverride: boolean }, effects: Effects) {
  if (order.status !== 'PENDING_APPROVAL' && order.status !== 'WHATSAPP_RECEIVED') throw conflict(`Order is already ${order.status.replace(/_/g, ' ').toLowerCase()}.`);
  if (order.isCreditOverLimit && !opts.creditOverride) throw conflict('Customer credit limit is exceeded — approve it as a credit override.');

  await setOrderStatus(tx, order, 'APPROVED', actor.name, opts.creditOverride ? 'Approved with credit-limit override' : undefined, {
    approvedBy: actor.name,
    approvedAt: new Date(),
    ...(opts.creditOverride ? { creditOverrideBy: actor.name } : {}),
  });
  await audit(tx, actor, {
    action: opts.creditOverride ? 'ORDER_APPROVED_CREDIT_OVERRIDE' : 'ORDER_APPROVED',
    entityType: 'Order',
    entityId: order.id,
    reference: order.orderNumber,
    sensitive: opts.creditOverride,
  });

  const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
  effects.add('order approved message', () =>
    notifyCustomer(actor.tenantId, customer, 'ORDER_APPROVED', { orderNumber: order.orderNumber, deliveryDate: order.requestedDeliveryDate })
  );

  // A delivery boy's own field order goes straight back to him.
  if (order.source === 'DELIVERY_BOY' && order.assignedDeliveryBoyId) {
    const boy = await tx.user.findFirst({ where: { id: order.assignedDeliveryBoyId, tenantId: actor.tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE' } });
    if (boy) return assignOrders(tx, actor, [order], boy.id, effects, `Assigned to ${boy.name} (his own order)`);
  }

  const operations = await getSetting(actor.tenantId, 'operations');
  if (operations.autoAssignDefaultDeliveryBoy) {
    let boyId = order.assignedDeliveryBoyId || customer.defaultDeliveryBoyId;
    if (!boyId && customer.route) {
      const route = await tx.route.findFirst({ where: { tenantId: actor.tenantId, OR: [{ name: customer.route }, { code: customer.route }] } });
      boyId = route?.defaultDeliveryBoyId || null;
    }
    if (boyId) {
      const boy = await tx.user.findFirst({ where: { id: boyId, tenantId: actor.tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE' } });
      if (boy) await assignOrders(tx, actor, [order], boy.id, effects, 'Auto-assigned (default delivery boy)');
    }
  }
}

export async function rejectOrder(tx: Tx, actor: Actor, order: Order, reason: string, effects: Effects) {
  if (!reason.trim()) throw badRequest('Rejection reason is mandatory.');
  if (!['PENDING_APPROVAL', 'WHATSAPP_RECEIVED'].includes(order.status)) throw conflict('Only orders waiting for approval can be rejected.');
  await setOrderStatus(tx, order, 'REJECTED', actor.name, reason, { rejectionReason: reason });
  await audit(tx, actor, { action: 'ORDER_REJECTED', entityType: 'Order', entityId: order.id, reference: order.orderNumber, reason });
  const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
  effects.add('order rejected message', () => notifyCustomer(actor.tenantId, customer, 'ORDER_REJECTED', { orderNumber: order.orderNumber, reason }));
}

export async function assignOrders(tx: Tx, actor: Actor, orders: Order[], deliveryBoyId: string, effects: Effects, note?: string) {
  const boy = await tx.user.findFirst({ where: { id: deliveryBoyId, tenantId: actor.tenantId, role: 'DELIVERY_BOY', status: 'ACTIVE' } });
  if (!boy) throw badRequest('Select an active delivery boy.');
  for (const order of orders) {
    if (!ASSIGNABLE.includes(order.status as OrderStatus)) throw conflict(`${order.orderNumber} cannot be assigned while ${order.status.replace(/_/g, ' ').toLowerCase()}.`);
    const reassigned = order.assignedDeliveryBoyId && order.assignedDeliveryBoyId !== boy.id && order.status !== 'APPROVED';
    await setOrderStatus(tx, order, 'ASSIGNED', actor.name, note || (reassigned ? `Reassigned to ${boy.name}` : `Assigned to ${boy.name}`), {
      assignedDeliveryBoyId: boy.id,
      assignedDeliveryBoyName: boy.name,
      assignedAt: new Date(),
      acceptedAt: null,
    });
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
    effects.add('delivery assigned message', () =>
      notifyCustomer(actor.tenantId, customer, 'DELIVERY_ASSIGNED', { orderNumber: order.orderNumber, deliveryBoyName: boy.name, deliveryDate: order.requestedDeliveryDate })
    );
  }
  await audit(tx, actor, { action: 'ORDERS_ASSIGNED', entityType: 'Order', reference: orders.map((o) => o.orderNumber).join(', '), newValue: { deliveryBoy: boy.name } });
  effects.add('notify delivery boy', () =>
    notifyUsers(actor.tenantId, [boy.id], { title: 'New delivery assigned', body: `${orders.length} order(s): ${orders.map((o) => o.orderNumber).join(', ')}`, link: '/delivery' })
  );
}

export async function acceptOrder(tx: Tx, actor: Actor, order: Order) {
  if (order.assignedDeliveryBoyId !== actor.userId) throw forbidden('This order is not assigned to you.');
  if (order.status !== 'ASSIGNED') throw conflict('Only newly assigned orders can be accepted.');
  await setOrderStatus(tx, order, 'ACCEPTED', actor.name, undefined, { acceptedAt: new Date() });
}

export async function dispatchOrder(tx: Tx, actor: Actor, order: Order, effects: Effects) {
  if (order.assignedDeliveryBoyId !== actor.userId) throw forbidden('This order is not assigned to you.');
  if (!['ASSIGNED', 'ACCEPTED'].includes(order.status)) throw conflict('Order is not ready to go out for delivery.');
  if (order.status === 'ASSIGNED') await setOrderStatus(tx, order, 'ACCEPTED', actor.name, undefined, { acceptedAt: new Date() });
  await setOrderStatus(tx, order, 'OUT_FOR_DELIVERY', actor.name, undefined, { dispatchedAt: new Date() });
  const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
  effects.add('out for delivery message', () =>
    notifyCustomer(actor.tenantId, customer, 'OUT_FOR_DELIVERY', { orderNumber: order.orderNumber, deliveryBoyName: actor.name })
  );
}

export async function cancelOrder(tx: Tx, actor: Actor, order: Order, reason: string) {
  if (!reason.trim()) throw badRequest('Cancellation reason is mandatory.');
  if (!CANCELLABLE.includes(order.status as OrderStatus)) throw conflict('Order can no longer be cancelled.');
  await setOrderStatus(tx, order, 'CANCELLED', actor.name, reason, { rejectionReason: reason });
  await cancelPendingApprovals(tx, actor.tenantId, 'ORDER', order.id, actor.name, `Order cancelled: ${reason}`);
  await audit(tx, actor, { action: 'ORDER_CANCELLED', entityType: 'Order', entityId: order.id, reference: order.orderNumber, reason });
}
