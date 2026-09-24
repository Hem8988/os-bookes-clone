import { prisma, Prisma, transaction, type Tx } from '@/lib/db';
import type { Permission } from '@/lib/permissions';
import { can } from '@/lib/permissions';
import { audit } from './audit';
import type { AuthContext } from './auth';
import { createCustomer, customerToClient, deactivateCustomer, updateCustomer } from './customers';
import { Effects } from './effects';
import { badRequest, conflict, forbidden, notFound } from './http';
import { cancelInvoice, createManualInvoice, requestOrApplyInvoiceEdit } from './manualInvoices';

// Back-office collections (masters and documents) exposed to the existing
// screens as simple lists. Flat models are mapped field-by-field with type
// coercion; anything else the screen sends is kept in the `extra` JSON column.

type Row = Record<string, unknown>;
type FieldType = 'string' | 'string?' | 'float' | 'float?' | 'int' | 'int?' | 'bool' | 'bool?' | 'string[]';

interface FlatCollection {
  kind: 'flat';
  model: string;
  read: Permission | 'staff';
  write: Permission;
  fields: Record<string, FieldType>;
  readOnly?: string[];
  where?: Row;
  defaults?: Row;
  softDelete?: Row;
  orderBy?: Row;
}

interface CustomCollection {
  kind: 'custom';
  read: Permission;
  write: Permission;
  list: (auth: AuthContext) => Promise<unknown[]>;
  create: (tx: Tx, auth: AuthContext, item: Row, effects: Effects) => Promise<unknown>;
  update: (tx: Tx, auth: AuthContext, id: string, item: Row, effects: Effects) => Promise<unknown>;
  remove: (tx: Tx, auth: AuthContext, id: string, reason: string) => Promise<void>;
}

const str = (names: string[], type: FieldType = 'string') => Object.fromEntries(names.map((n) => [n, type])) as Record<string, FieldType>;

const COLLECTIONS: Record<string, FlatCollection | CustomCollection> = {
  customers: {
    kind: 'custom',
    read: 'customers.view',
    write: 'customers.manage',
    list: async (auth) =>
      (
        await prisma.customer.findMany({
          where: { tenantId: auth.tenantId },
          include: { deliveryAddresses: true, partyRates: true, cylinderBalances: true },
          orderBy: { name: 'asc' },
        })
      ).map((c) => customerToClient(c as unknown as Row)),
    create: (tx, auth, item) => createCustomer(tx, auth, item),
    update: (tx, auth, id, item) => updateCustomer(tx, auth, id, item),
    remove: (tx, auth, id) => deactivateCustomer(tx, auth, id),
  },
  invoices: {
    kind: 'custom',
    read: 'invoices.view',
    write: 'invoices.manage',
    list: (auth) => prisma.invoice.findMany({ where: { tenantId: auth.tenantId }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 1000 }),
    create: (tx, auth, item, effects) => createManualInvoice(tx, auth, item, effects),
    // Returns the saved invoice, or null when the edit is waiting for admin approval.
    update: async (tx, auth, id, item, effects) => {
      const { applied } = await requestOrApplyInvoiceEdit(tx, auth, id, item, effects);
      return applied ? tx.invoice.findUnique({ where: { id }, include: { items: true } }) : null;
    },
    remove: async (tx, auth, id, reason) => {
      if (auth.role !== 'SUPER_ADMIN') throw forbidden('Only the Super Admin can cancel an invoice.');
      await cancelInvoice(tx, auth, id, reason || 'Cancelled');
    },
  },
  products: {
    kind: 'flat',
    model: 'product',
    read: 'products.view',
    write: 'products.manage',
    fields: {
      ...str(['sku', 'name', 'category', 'productType', 'hsnCode', 'unit']),
      ...str(['productHindiName', 'gasType', 'brand', 'weightUnit', 'barcode', 'image', 'description', 'termsAndCondition'], 'string?'),
      weightVolume: 'float?',
      purchasePrice: 'float',
      salePrice: 'float',
      mrp: 'float?',
      taxRate: 'float',
      gstApplicable: 'bool',
      emptyDepositValue: 'float',
      minStockAlert: 'float',
      stock: 'float',
      productTags: 'string[]',
      active: 'bool',
    },
    readOnly: ['stock'],
    softDelete: { active: false },
    orderBy: { name: 'asc' },
  },
  followUps: {
    kind: 'flat',
    model: 'followUp',
    read: 'customers.view',
    write: 'customers.view',
    fields: str(['customerId', 'type', 'note', 'followUpDate', 'createdAt']),
  },
  units: { kind: 'flat', model: 'unit', read: 'staff', write: 'masters.manage', fields: { ...str(['code', 'name', 'symbol']), isDecimalAllowed: 'bool' } },
  categories: {
    kind: 'flat',
    model: 'category',
    read: 'staff',
    write: 'masters.manage',
    fields: { name: 'string', hsnDefault: 'string?', image: 'string?', itemCount: 'int', active: 'bool', purchaseDiscount: 'float?', saleDiscount: 'float?' },
  },
  brands: { kind: 'flat', model: 'brand', read: 'staff', write: 'masters.manage', fields: str(['name', 'manufacturer']) },
  taxes: { kind: 'flat', model: 'tax', read: 'staff', write: 'masters.manage', fields: { name: 'string', rate: 'float', cgst: 'float', sgst: 'float', igst: 'float' } },
  banks: {
    kind: 'flat',
    model: 'bank',
    read: 'masters.view',
    write: 'masters.manage',
    fields: { ...str(['accountName', 'bankName', 'accountNumber', 'ifscCode', 'branch']), ...str(['upiId', 'qrCodeUrl', 'address', 'bookType'], 'string?'), openingBalance: 'float', currentBalance: 'float' },
  },
  narrations: { kind: 'flat', model: 'narration', read: 'staff', write: 'masters.view', fields: { text: 'string' } },
  bookTypes: { kind: 'flat', model: 'bookType', read: 'masters.view', write: 'masters.manage', fields: { name: 'string' } },
  staff: {
    kind: 'flat',
    model: 'employee',
    read: 'masters.view',
    write: 'masters.manage',
    fields: {
      ...str(['name', 'role', 'phone', 'email']),
      ...str(['userId', 'city', 'joiningDate', 'designation', 'salaryType'], 'string?'),
      salary: 'float',
      commissionPercent: 'float',
      active: 'bool',
      paidHoliday: 'int?',
    },
  },
  attendance: {
    kind: 'flat',
    model: 'attendance',
    read: 'masters.view',
    write: 'orders.assign',
    fields: { ...str(['employeeId', 'employeeName', 'date', 'checkIn', 'checkOut', 'status']), overtimeHours: 'float' },
  },
  accounts: {
    kind: 'flat',
    model: 'account',
    read: 'masters.view',
    write: 'masters.manage',
    fields: { ...str(['accountName', 'group']), ...str(['gstin', 'phone', 'city', 'state', 'address'], 'string?'), openingBalance: 'float', currentBalance: 'float' },
  },
  companies: {
    kind: 'flat',
    model: 'company',
    read: 'masters.view',
    write: 'masters.manage',
    fields: { ...str(['companyName', 'tradeName', 'gstin', 'pan', 'phone', 'email', 'address', 'city', 'state', 'stateCode', 'pincode']), isMainBranch: 'bool' },
  },
  expenses: {
    kind: 'flat',
    model: 'expense',
    read: 'masters.view',
    write: 'masters.manage',
    fields: { ...str(['categoryName', 'expenseHead', 'expenseType']), hsnSac: 'string?', gstRate: 'float', monthlyBudget: 'float', ytdSpent: 'float', active: 'bool' },
  },
  incomes: { kind: 'flat', model: 'income', read: 'masters.view', write: 'masters.manage', fields: { sourceName: 'string', hsnSac: 'string?', gstRate: 'float', ytdEarned: 'float' } },
  paymentModes: {
    kind: 'flat',
    model: 'paymentMode',
    read: 'staff',
    write: 'masters.manage',
    fields: { ...str(['modeName', 'linkedAccount']), transactionFeePercent: 'float', active: 'bool' },
  },
  purchaseOrders: {
    kind: 'flat',
    model: 'purchaseOrder',
    read: 'masters.view',
    write: 'invoices.manage',
    fields: { ...str(['poNumber', 'vendorName', 'date', 'expectedDate', 'status']), vendorGstin: 'string?', itemsCount: 'int', totalAmount: 'float' },
  },
  purchases: {
    kind: 'flat',
    model: 'purchaseInvoice',
    read: 'masters.view',
    write: 'invoices.manage',
    fields: { ...str(['purchaseNumber', 'vendorInvoiceNumber', 'vendorName', 'vendorGstin', 'date', 'status']), subTotal: 'float', itcEligibleAmount: 'float', grandTotal: 'float' },
  },
  purchaseReturns: {
    kind: 'flat',
    model: 'returnDocument',
    read: 'masters.view',
    write: 'invoices.manage',
    fields: { ...str(['docNumber', 'originalInvNumber', 'partyName', 'date', 'returnReason', 'status']), amount: 'float' },
    where: { kind: 'Purchase' },
    defaults: { kind: 'Purchase' },
  },
  salesReturns: {
    kind: 'flat',
    model: 'returnDocument',
    read: 'masters.view',
    write: 'invoices.manage',
    fields: { ...str(['docNumber', 'originalInvNumber', 'partyName', 'date', 'returnReason', 'status']), amount: 'float' },
    where: { kind: 'Sales' },
    defaults: { kind: 'Sales' },
  },
  challans: {
    kind: 'flat',
    model: 'deliveryChallan',
    read: 'masters.view',
    write: 'orders.create',
    fields: { ...str(['challanNumber', 'customerName', 'vehicleNumber', 'dispatchDate', 'status']), itemsCount: 'int', totalQty: 'float' },
  },
  quotations: {
    kind: 'flat',
    model: 'quotation',
    read: 'masters.view',
    write: 'orders.create',
    fields: { ...str(['quoteNumber', 'customerName', 'customerPhone', 'date', 'status']), validDays: 'int', grandTotal: 'float' },
  },
};

export const COLLECTION_NAMES = Object.keys(COLLECTIONS);

function coerce(value: unknown, type: FieldType): unknown {
  const optional = type.endsWith('?');
  const empty = value === undefined || value === null || value === '';
  if (type === 'string[]') return Array.isArray(value) ? value.map(String) : [];
  if (empty) {
    if (optional) return null;
    return type.startsWith('float') || type.startsWith('int') ? 0 : type.startsWith('bool') ? false : '';
  }
  if (type.startsWith('float')) return Number.isFinite(Number(value)) ? Number(value) : 0;
  if (type.startsWith('int')) return Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  if (type.startsWith('bool')) return value === true || value === 'true';
  return String(value);
}

function toRecord(cfg: FlatCollection, item: Row, forUpdate: boolean) {
  const data: Row = {};
  const extra: Row = {};
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id' || key === 'tenantId' || key === 'extra') continue;
    if (cfg.fields[key]) {
      if (forUpdate && cfg.readOnly?.includes(key)) continue;
      data[key] = coerce(value, cfg.fields[key]);
    } else if (!(cfg.where && key in cfg.where)) {
      extra[key] = value;
    }
  }
  if (!forUpdate) {
    for (const [key, type] of Object.entries(cfg.fields)) if (!(key in data)) data[key] = coerce(undefined, type);
    for (const key of cfg.readOnly || []) data[key] = coerce(undefined, cfg.fields[key]);
  }
  data.extra = extra as Prisma.InputJsonValue;
  return { ...data, ...(cfg.defaults || {}) };
}

const toClient = (row: Row) => {
  const { extra, ...rest } = row;
  delete rest.tenantId;
  return { ...((extra as Row) || {}), ...rest };
};

// Prisma delegates are looked up by model name from the configuration table.
type Delegate = {
  findMany: (args: unknown) => Promise<Row[]>;
  findFirst: (args: unknown) => Promise<Row | null>;
  create: (args: unknown) => Promise<Row>;
  update: (args: unknown) => Promise<Row>;
  delete: (args: unknown) => Promise<Row>;
};
const delegate = (db: Tx | typeof prisma, model: string) => (db as unknown as Record<string, Delegate>)[model];

function assertAccess(auth: AuthContext, permission: Permission | 'staff') {
  const allowed = permission === 'staff' ? auth.role !== 'CUSTOMER' : can(auth.role, permission);
  if (!allowed) throw forbidden();
}

function configOf(name: string) {
  const cfg = COLLECTIONS[name];
  if (!cfg) throw notFound('Unknown collection.');
  return cfg;
}

export async function listCollection(auth: AuthContext, name: string) {
  const cfg = configOf(name);
  assertAccess(auth, cfg.read);
  if (cfg.kind === 'custom') return cfg.list(auth);
  const rows = await delegate(prisma, cfg.model).findMany({ where: { tenantId: auth.tenantId, ...(cfg.where || {}) }, orderBy: cfg.orderBy });
  return rows.map(toClient);
}

export type CollectionAction = { action: 'create' | 'update' | 'delete'; item?: Row; id?: string; reason?: string };

export async function mutateCollection(auth: AuthContext, name: string, input: CollectionAction) {
  const cfg = configOf(name);
  assertAccess(auth, cfg.write);
  const effects = new Effects();
  const result = await transaction(async (tx) => {
    if (cfg.kind === 'custom') {
      if (input.action === 'create') return cfg.create(tx, auth, input.item || {}, effects);
      if (input.action === 'update') return cfg.update(tx, auth, String(input.id || input.item?.id || ''), input.item || {}, effects);
      await cfg.remove(tx, auth, String(input.id || ''), input.reason || '');
      return null;
    }

    const model = delegate(tx, cfg.model);
    const scope = { tenantId: auth.tenantId, ...(cfg.where || {}) };
    if (input.action === 'create') {
      const item = input.item || {};
      const clientId = typeof item.id === 'string' && /^[\w-]{1,60}$/.test(item.id) ? item.id : undefined;
      if (clientId && (await model.findFirst({ where: { id: clientId } }))) throw conflict('A record with this id already exists.');
      const record = toRecord(cfg, item, false);
      // Documents always carry the real author, never a name typed on screen.
      record.extra = { ...(record.extra as Row), createdBy: auth.name } as Prisma.InputJsonValue;
      const row = await model.create({ data: { ...record, tenantId: auth.tenantId, ...(clientId ? { id: clientId } : {}) } });
      await audit(tx, auth, { action: `${name.toUpperCase()}_CREATED`, entityType: cfg.model, entityId: String(row.id) });
      return toClient(row);
    }

    const id = String(input.id || input.item?.id || '');
    const existing = await model.findFirst({ where: { id, ...scope } });
    if (!existing) throw notFound();
    if (input.action === 'update') {
      const row = await model.update({ where: { id }, data: toRecord(cfg, input.item || {}, true) });
      await audit(tx, auth, { action: `${name.toUpperCase()}_UPDATED`, entityType: cfg.model, entityId: id });
      return toClient(row);
    }
    if (cfg.softDelete) await model.update({ where: { id }, data: cfg.softDelete });
    else await model.delete({ where: { id } });
    await audit(tx, auth, { action: `${name.toUpperCase()}_DELETED`, entityType: cfg.model, entityId: id, oldValue: existing });
    return null;
  });
  effects.schedule();
  if (input.action === 'delete') return null;
  // Custom creators return raw rows; re-read so the client gets the full shape.
  if (cfg.kind === 'custom' && result && typeof result === 'object' && 'id' in (result as Row)) {
    const list = await cfg.list(auth);
    return (list as Row[]).find((r) => r.id === (result as Row).id) ?? result;
  }
  return result;
}

export function assertCollectionAction(value: unknown): CollectionAction['action'] {
  if (value === 'create' || value === 'update' || value === 'delete') return value;
  throw badRequest('Action must be create, update or delete.');
}
