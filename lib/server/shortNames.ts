import { prisma } from '@/lib/db';

// Operational screens show the customer's shop / short name (Party Master →
// "Shop / Short Name"); legal documents keep the legal name. Orders, deliveries
// and payments only snapshot the legal name, so the short name is looked up here.

export async function withShortNames<T extends { customerId: string }>(tenantId: string, rows: T[]): Promise<(T & { customerShortName: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.customerId))];
  const found = ids.length ? await prisma.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, shortName: true } }) : [];
  const names = new Map(found.map((c) => [c.id, c.shortName?.trim() || null]));
  return rows.map((r) => ({ ...r, customerShortName: names.get(r.customerId) ?? null }));
}
