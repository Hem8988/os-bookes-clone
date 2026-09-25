// Role-based access control matrix (SRS §4). Shared by server and client so
// menus only show what the API will actually allow.

export const ROLES = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY'];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  DELIVERY_BOY: 'Delivery Boy',
  CUSTOMER: 'Customer',
};

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/admin',
  MANAGER: '/admin',
  ACCOUNTANT: '/accountant',
  DELIVERY_BOY: '/delivery',
  CUSTOMER: '/customer',
};

const SA: Role = 'SUPER_ADMIN';
const MG: Role = 'MANAGER';
const AC: Role = 'ACCOUNTANT';
const DB: Role = 'DELIVERY_BOY';
const CU: Role = 'CUSTOMER';

export const PERMISSIONS = {
  'dashboard.view': [SA, MG, AC, DB],
  'customers.view': [SA, MG, AC],
  'customers.manage': [SA],
  'products.view': [SA, MG, AC, DB],
  'products.manage': [SA],
  'masters.view': [SA, MG, AC],
  'masters.manage': [SA],
  'orders.view': [SA, MG, AC],
  'orders.create': [SA, MG],
  'orders.approve': [SA, MG],
  'orders.assign': [SA, MG],
  'delivery.execute': [DB],
  'deliveries.view': [SA, MG, AC],
  'payments.enter': [SA, AC],
  'payments.verify': [SA, AC],
  'invoices.view': [SA, AC],
  'invoices.manage': [SA, AC],
  'ledger.view': [SA, MG, AC],
  'ledger.adjust': [SA],
  'ledger.adjust.request': [AC],
  'wallet.viewAll': [SA, AC],
  'cash.approve': [SA, AC],
  'dayclose.perform': [SA, AC],
  'dayclose.reopen': [SA],
  'dayclose.reopen.request': [AC],
  'inventory.view': [SA, MG, AC],
  'inventory.receive': [SA],
  'stock.transfer.request': [SA, MG, DB],
  'stock.transfer.approve': [SA, MG],
  'stock.adjust.request': [SA, MG, AC],
  'stock.adjust.approve': [SA],
  'approvals.view': [SA, MG, AC],
  'reports.view': [SA, MG, AC],
  'books.view': [SA, AC],
  'books.manage': [SA, AC],
  'ops.view': [SA, MG, AC],
  'ops.manage': [SA, MG, AC],
  'audit.view': [SA],
  'settings.manage': [SA],
  'whatsapp.manage': [SA],
  'users.manage': [SA],
  'devices.approve': [SA],
  'tracking.view': [SA, MG],
  'portal.use': [CU],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | null | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/** Who may decide each approval-queue item type (SRS §8). */
export const APPROVAL_TYPES = {
  ORDER_APPROVAL: { label: 'Order Approval', approvers: [SA, MG], slaHours: 12 },
  CREDIT_APPROVAL: { label: 'Credit Limit Override', approvers: [SA, MG], slaHours: 12 },
  DELIVERY_VERIFICATION: { label: 'Delivery Verification', approvers: [SA, AC], slaHours: 24 },
  PAYMENT_VERIFICATION: { label: 'Payment Verification', approvers: [SA, AC], slaHours: 24 },
  CASH_SUBMISSION: { label: 'Cash Submission', approvers: [SA, AC], slaHours: 12 },
  STOCK_TRANSFER: { label: 'Stock Transfer', approvers: [SA, MG], slaHours: 12 },
  STOCK_ADJUSTMENT: { label: 'Stock Adjustment', approvers: [SA], slaHours: 48 },
  LEDGER_ADJUSTMENT: { label: 'Ledger Adjustment', approvers: [SA], slaHours: 48 },
  INVOICE_APPROVAL: { label: 'Invoice Edit Approval', approvers: [SA], slaHours: 24 },
  DAY_REOPEN: { label: 'Day Reopen', approvers: [SA], slaHours: 4 },
  DEVICE_APPROVAL: { label: 'New Device Login', approvers: [SA], slaHours: 4 },
  FIELD_REQUEST: { label: 'Delivery Boy Request', approvers: [SA, MG], slaHours: 12 },
} as const satisfies Record<string, { label: string; approvers: Role[]; slaHours: number }>;

export type ApprovalType = keyof typeof APPROVAL_TYPES;

export function canDecide(role: string | null | undefined, type: string): boolean {
  const config = APPROVAL_TYPES[type as ApprovalType];
  return !!role && !!config && (config.approvers as readonly string[]).includes(role);
}
