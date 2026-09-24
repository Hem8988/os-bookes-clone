import type { Db } from '@/lib/db';
import { round2 } from './http';

/**
 * Selling rate of a product for a customer on a date. A customer-specific
 * monthly rate wins over a customer rate without month, which wins over the
 * product's standard rate. Rates are GST-inclusive (per-cylinder price).
 */
export async function resolveRate(db: Db, customerId: string, product: { id: string; salePrice: number }, date: string): Promise<number> {
  const month = date.slice(0, 7);
  const rates = await db.partyRate.findMany({ where: { customerId, productId: product.id } });
  const monthly = rates
    .filter((r) => r.effectiveMonth && r.effectiveMonth <= month)
    .sort((a, b) => (b.effectiveMonth || '').localeCompare(a.effectiveMonth || ''))[0];
  const general = rates.find((r) => !r.effectiveMonth);
  const chosen = monthly || general;
  if (chosen) return chosen.customRate ?? chosen.price;
  return product.salePrice;
}

/** Split a GST-inclusive amount into taxable value and CGST/SGST or IGST. */
export function splitGst(inclusiveAmount: number, taxRate: number, isIgst: boolean) {
  const taxable = round2(inclusiveAmount / (1 + taxRate / 100));
  const tax = round2(inclusiveAmount - taxable);
  if (isIgst) return { taxable, cgst: 0, sgst: 0, igst: tax };
  const half = round2(tax / 2);
  return { taxable, cgst: half, sgst: round2(tax - half), igst: 0 };
}

export function isInterState(companyStateCode: string | null | undefined, customerStateCode: string | null | undefined, customerGstin?: string | null) {
  const customerState = customerStateCode || (customerGstin ? customerGstin.slice(0, 2) : '');
  if (!companyStateCode || !customerState) return false;
  return companyStateCode !== customerState;
}
