import type { Db } from '@/lib/db';
import { financialYear } from './http';

async function next(db: Db, tenantId: string, key: string): Promise<number> {
  const row = await db.sequence.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

const pad = (n: number, width = 5) => String(n).padStart(width, '0');

/** Sequential document number such as ORD-00042. */
export async function nextNumber(db: Db, tenantId: string, prefix: string): Promise<string> {
  return `${prefix}-${pad(await next(db, tenantId, prefix))}`;
}

/**
 * GST-compliant invoice number, unique per financial year and at most 16
 * characters: INV/26-27/00001.
 */
export async function nextInvoiceNumber(db: Db, tenantId: string, date: string, prefix = 'INV'): Promise<string> {
  const fy = financialYear(date);
  const cleanPrefix = prefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 4) || 'INV';
  return `${cleanPrefix}/${fy}/${pad(await next(db, tenantId, `${cleanPrefix}:${fy}`))}`;
}
