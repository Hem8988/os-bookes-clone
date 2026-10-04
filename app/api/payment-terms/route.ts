import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok } from '@/lib/server/http';
import { PAYMENT_TERMS } from '@/lib/settings';

/**
 * Payment terms the business made itself (e.g. "45 days", "Advance"): every
 * term already given to a party that is not one of the built-in ones, with its
 * credit days.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'customers.view');
  const builtIn = new Set<string>(PAYMENT_TERMS.map((t) => t.value));
  const rows = await prisma.customer.groupBy({ by: ['paymentTerms', 'creditDays'], where: { tenantId: auth.tenantId }, _count: { _all: true } });
  const terms = new Map<string, { value: string; label: string; days: number; uses: number }>();
  for (const r of rows) {
    if (!r.paymentTerms || builtIn.has(r.paymentTerms)) continue;
    const cur = terms.get(r.paymentTerms);
    // The credit days most parties on this term have.
    if (!cur || r._count._all > cur.uses) terms.set(r.paymentTerms, { value: r.paymentTerms, label: r.paymentTerms, days: r.creditDays ?? 0, uses: r._count._all });
  }
  return ok([...terms.values()].sort((a, b) => a.days - b.days || a.label.localeCompare(b.label)).map(({ value, label, days }) => ({ value, label, days })));
});
