import type { Db } from '@/lib/db';
import type { CashWallet, Customer } from '@/lib/generated/prisma/client';
import { DEFAULT_EXPENSE_HEADS, groupOf } from '@/lib/books';

// Ledger accounts. System ledgers (sales, GST, round off …) are created on
// first use; party / cash-wallet / bank / expense-head ledgers are created
// from their masters so every posting has somewhere to go.

export const SYSTEM_ACCOUNTS = {
  SALES: { code: 'SYS-SALES', name: 'Sales - LPG (GST)', group: 'Sales Accounts' },
  PURCHASE: { code: 'SYS-PURCHASE', name: 'Purchase - LPG (GST)', group: 'Purchase Accounts' },
  SALES_RETURN: { code: 'SYS-SALESRET', name: 'Sales Returns', group: 'Sales Accounts' },
  PURCHASE_RETURN: { code: 'SYS-PURRET', name: 'Purchase Returns', group: 'Purchase Accounts' },
  OUTPUT_CGST: { code: 'SYS-OCGST', name: 'Output CGST', group: 'Duties & Taxes' },
  OUTPUT_SGST: { code: 'SYS-OSGST', name: 'Output SGST', group: 'Duties & Taxes' },
  OUTPUT_IGST: { code: 'SYS-OIGST', name: 'Output IGST', group: 'Duties & Taxes' },
  INPUT_CGST: { code: 'SYS-ICGST', name: 'Input CGST', group: 'Duties & Taxes' },
  INPUT_SGST: { code: 'SYS-ISGST', name: 'Input SGST', group: 'Duties & Taxes' },
  INPUT_IGST: { code: 'SYS-IIGST', name: 'Input IGST', group: 'Duties & Taxes' },
  ROUND_OFF: { code: 'SYS-ROUND', name: 'Round Off', group: 'Indirect Expenses' },
  ADJUSTMENT: { code: 'SYS-ADJ', name: 'Discount & Rate Difference', group: 'Indirect Expenses' },
  BOUNCE_CHARGES: { code: 'SYS-BOUNCE', name: 'Cheque Bounce Charges', group: 'Indirect Incomes' },
  TDS_RECEIVABLE: { code: 'SYS-TDSR', name: 'TDS Receivable', group: 'Loans & Advances (Asset)' },
  TDS_PAYABLE: { code: 'SYS-TDSP', name: 'TDS Payable', group: 'Duties & Taxes' },
  CASH: { code: 'SYS-CASH', name: 'Cash (Office)', group: 'Cash-in-Hand' },
  BANK: { code: 'SYS-BANK', name: 'Bank Account', group: 'Bank Accounts' },
  CAPITAL: { code: 'SYS-CAPITAL', name: 'Capital Account', group: 'Capital Account' },
  SUSPENSE: { code: 'SYS-SUSPENSE', name: 'Suspense A/c', group: 'Suspense A/c' },
} as const;

export type SystemKey = keyof typeof SYSTEM_ACCOUNTS;

const natureOf = (group: string) => groupOf(group)?.nature ?? 'ASSET';

async function upsertAccount(db: Db, tenantId: string, key: string, data: { code: string; name: string; groupName: string; partyId?: string; gstin?: string | null; openingBalance?: number }) {
  const existing = await db.ledgerAccount.findUnique({ where: { tenantId_systemKey: { tenantId, systemKey: key } } });
  if (existing) {
    const changes: Record<string, unknown> = {};
    if (existing.name !== data.name) changes.name = data.name;
    if (data.gstin !== undefined && existing.gstin !== data.gstin) changes.gstin = data.gstin;
    if (data.openingBalance !== undefined && existing.openingBalance !== data.openingBalance) changes.openingBalance = data.openingBalance;
    return Object.keys(changes).length ? db.ledgerAccount.update({ where: { id: existing.id }, data: changes }) : existing;
  }
  // Codes are unique; a clash (renamed master) gets a numeric suffix.
  let code = data.code;
  for (let n = 2; await db.ledgerAccount.findUnique({ where: { tenantId_code: { tenantId, code } } }); n++) code = `${data.code}-${n}`;
  return db.ledgerAccount.create({
    data: { tenantId, systemKey: key, code, name: data.name, groupName: data.groupName, nature: natureOf(data.groupName), partyId: data.partyId, gstin: data.gstin ?? null, openingBalance: data.openingBalance ?? 0, isSystem: true },
  });
}

export async function systemAccount(db: Db, tenantId: string, key: SystemKey) {
  const def = SYSTEM_ACCOUNTS[key];
  return upsertAccount(db, tenantId, key, { code: def.code, name: def.name, groupName: def.group });
}

/** Customer → Sundry Debtors, vendor / plant → Sundry Creditors. */
export async function partyAccount(db: Db, customer: Pick<Customer, 'id' | 'tenantId' | 'name' | 'customerCode' | 'type' | 'gstin'>, openingBalance?: number) {
  const creditor = customer.type === 'Vendor';
  const existing = await db.ledgerAccount.findUnique({ where: { tenantId_systemKey: { tenantId: customer.tenantId, systemKey: `PARTY:${customer.id}` } } });
  const account = await upsertAccount(db, customer.tenantId, `PARTY:${customer.id}`, {
    code: `PTY-${customer.customerCode}`,
    name: customer.name,
    groupName: creditor ? 'Sundry Creditors' : 'Sundry Debtors',
    partyId: customer.id,
    gstin: customer.gstin || null,
    openingBalance,
  });
  // A party switched between customer and vendor moves group.
  const group = creditor ? 'Sundry Creditors' : 'Sundry Debtors';
  if (existing && existing.groupName !== group && (existing.groupName === 'Sundry Debtors' || existing.groupName === 'Sundry Creditors')) {
    return db.ledgerAccount.update({ where: { id: account.id }, data: { groupName: group, nature: natureOf(group) } });
  }
  return account;
}

/** One Cash-in-Hand ledger per cash wallet (office cash and each delivery boy). */
export async function walletAccount(db: Db, wallet: Pick<CashWallet, 'id' | 'tenantId' | 'ownerType' | 'ownerName'>) {
  const name = wallet.ownerType === 'COMPANY' ? 'Cash (Office)' : `Cash - ${wallet.ownerName}`;
  if (wallet.ownerType === 'COMPANY') {
    // The office wallet shares the generic office cash ledger.
    const office = await systemAccount(db, wallet.tenantId, 'CASH');
    return office;
  }
  return upsertAccount(db, wallet.tenantId, `WALLET:${wallet.id}`, { code: `CSH-${wallet.id.slice(-6).toUpperCase()}`, name, groupName: 'Cash-in-Hand' });
}

/** Bank master → Bank Accounts ledger. */
export async function bankAccount(db: Db, bank: { id: string; tenantId: string; accountName: string; bankName: string; accountNumber: string; openingBalance: number }) {
  return upsertAccount(db, bank.tenantId, `BANK:${bank.id}`, {
    code: `BNK-${bank.accountNumber.slice(-4) || bank.id.slice(-4)}`,
    name: `${bank.bankName} - ${bank.accountNumber.slice(-4)}`.trim() || bank.accountName,
    groupName: 'Bank Accounts',
    openingBalance: bank.openingBalance,
  });
}

/** Expense head → Direct / Indirect Expenses ledger. */
export async function expenseAccount(db: Db, tenantId: string, headName: string) {
  const name = headName.trim() || 'Miscellaneous Expenses';
  const known = DEFAULT_EXPENSE_HEADS.find((h) => h.name.toLowerCase() === name.toLowerCase());
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return upsertAccount(db, tenantId, `EXPENSE_HEAD:${name.toLowerCase()}`, { code: `EXP-${slug}`, name, groupName: known?.group || 'Indirect Expenses' });
}

/** Creates every master-backed ledger so the chart is complete before reports run. */
export async function ensureChart(db: Db, tenantId: string) {
  for (const key of Object.keys(SYSTEM_ACCOUNTS) as SystemKey[]) await systemAccount(db, tenantId, key);
  for (const head of DEFAULT_EXPENSE_HEADS) await expenseAccount(db, tenantId, head.name);
  const [parties, wallets, banks] = await Promise.all([
    db.customer.findMany({ where: { tenantId }, select: { id: true, tenantId: true, name: true, customerCode: true, type: true, gstin: true } }),
    db.cashWallet.findMany({ where: { tenantId } }),
    db.bank.findMany({ where: { tenantId } }),
  ]);
  // Party opening = the OPENING lines of the customer ledger (previous dues).
  const openings = await db.ledgerEntry.groupBy({ by: ['customerId'], where: { tenantId, ledgerType: 'CUSTOMER', entryType: 'OPENING' }, _sum: { debit: true, credit: true } });
  const openingOf = new Map(openings.map((o) => [o.customerId, Math.round(((o._sum.debit || 0) - (o._sum.credit || 0)) * 100) / 100]));
  for (const p of parties) await partyAccount(db, p, openingOf.get(p.id) ?? 0);
  for (const w of wallets) await walletAccount(db, w);
  for (const b of banks) await bankAccount(db, b);
}
