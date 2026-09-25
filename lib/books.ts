// Books of accounts — shared (client + server) definitions: Tally-style groups
// and voucher types.

export type Nature = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';

/** Where a group sits in the Profit & Loss / Balance Sheet. */
export type Section =
  | 'CAPITAL'
  | 'LOANS'
  | 'CURRENT_LIABILITIES'
  | 'FIXED_ASSETS'
  | 'INVESTMENTS'
  | 'CURRENT_ASSETS'
  | 'SALES'
  | 'DIRECT_INCOME'
  | 'INDIRECT_INCOME'
  | 'PURCHASE'
  | 'DIRECT_EXPENSE'
  | 'INDIRECT_EXPENSE'
  | 'SUSPENSE';

export const GROUPS: { name: string; nature: Nature; section: Section }[] = [
  { name: 'Capital Account', nature: 'LIABILITY', section: 'CAPITAL' },
  { name: 'Reserves & Surplus', nature: 'LIABILITY', section: 'CAPITAL' },
  { name: 'Loans (Liability)', nature: 'LIABILITY', section: 'LOANS' },
  { name: 'Secured Loans', nature: 'LIABILITY', section: 'LOANS' },
  { name: 'Unsecured Loans', nature: 'LIABILITY', section: 'LOANS' },
  { name: 'Sundry Creditors', nature: 'LIABILITY', section: 'CURRENT_LIABILITIES' },
  { name: 'Duties & Taxes', nature: 'LIABILITY', section: 'CURRENT_LIABILITIES' },
  { name: 'Provisions', nature: 'LIABILITY', section: 'CURRENT_LIABILITIES' },
  { name: 'Current Liabilities', nature: 'LIABILITY', section: 'CURRENT_LIABILITIES' },
  { name: 'Cylinder Deposits (Liability)', nature: 'LIABILITY', section: 'CURRENT_LIABILITIES' },
  { name: 'Fixed Assets', nature: 'ASSET', section: 'FIXED_ASSETS' },
  { name: 'Investments', nature: 'ASSET', section: 'INVESTMENTS' },
  { name: 'Sundry Debtors', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Cash-in-Hand', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Bank Accounts', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Deposits (Asset)', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Current Assets', nature: 'ASSET', section: 'CURRENT_ASSETS' },
  { name: 'Sales Accounts', nature: 'INCOME', section: 'SALES' },
  { name: 'Direct Incomes', nature: 'INCOME', section: 'DIRECT_INCOME' },
  { name: 'Indirect Incomes', nature: 'INCOME', section: 'INDIRECT_INCOME' },
  { name: 'Purchase Accounts', nature: 'EXPENSE', section: 'PURCHASE' },
  { name: 'Direct Expenses', nature: 'EXPENSE', section: 'DIRECT_EXPENSE' },
  { name: 'Indirect Expenses', nature: 'EXPENSE', section: 'INDIRECT_EXPENSE' },
  { name: 'Suspense A/c', nature: 'LIABILITY', section: 'SUSPENSE' },
];

export const groupOf = (name: string) => GROUPS.find((g) => g.name === name);

export const VOUCHER_TYPES = {
  SALES: { label: 'Sales', prefix: 'SAL' },
  PURCHASE: { label: 'Purchase', prefix: 'PUR' },
  RECEIPT: { label: 'Receipt', prefix: 'RCT' },
  PAYMENT: { label: 'Payment', prefix: 'PMT' },
  CONTRA: { label: 'Contra', prefix: 'CTR' },
  JOURNAL: { label: 'Journal', prefix: 'JRN' },
  CREDIT_NOTE: { label: 'Credit Note', prefix: 'CRN' },
  DEBIT_NOTE: { label: 'Debit Note', prefix: 'DBN' },
} as const;

export type VoucherType = keyof typeof VOUCHER_TYPES;

/** Voucher types a user may enter by hand (the rest come from documents). */
export const MANUAL_VOUCHER_TYPES: VoucherType[] = ['RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL'];

export const DEFAULT_EXPENSE_HEADS: { name: string; group: 'Direct Expenses' | 'Indirect Expenses' }[] = [
  { name: 'Freight & Cartage Inward', group: 'Direct Expenses' },
  { name: 'Loading & Unloading', group: 'Direct Expenses' },
  { name: 'Salary & Wages', group: 'Indirect Expenses' },
  { name: 'Delivery Staff Incentive', group: 'Indirect Expenses' },
  { name: 'Vehicle Fuel', group: 'Indirect Expenses' },
  { name: 'Vehicle Repairs & Maintenance', group: 'Indirect Expenses' },
  { name: 'Rent', group: 'Indirect Expenses' },
  { name: 'Electricity', group: 'Indirect Expenses' },
  { name: 'Telephone & Internet', group: 'Indirect Expenses' },
  { name: 'Printing & Stationery', group: 'Indirect Expenses' },
  { name: 'Office Expenses', group: 'Indirect Expenses' },
  { name: 'Bank Charges', group: 'Indirect Expenses' },
  { name: 'Professional Fees', group: 'Indirect Expenses' },
  { name: 'Staff Welfare', group: 'Indirect Expenses' },
  { name: 'Repairs & Maintenance', group: 'Indirect Expenses' },
  { name: 'Miscellaneous Expenses', group: 'Indirect Expenses' },
];

/** "2026-09" → first / last date of that month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/** Start of the financial year containing `date` (fyStartMonth 4 → April 1st). */
export function fyStart(date: string, fyStartMonth = 4): string {
  const [y, m] = date.split('-').map(Number);
  const year = m >= fyStartMonth ? y : y - 1;
  return `${year}-${String(fyStartMonth).padStart(2, '0')}-01`;
}
