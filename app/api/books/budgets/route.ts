import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson } from '@/lib/server/http';
import { getSetting, saveSetting } from '@/lib/server/settings';

/** Monthly budget per expense head (ledger name → rupees). */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.view');
  return ok(await getSetting(auth.tenantId, 'budgets'));
});

export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'books.manage', { write: true });
  const body = await readJson(request);
  const raw = (body.heads && typeof body.heads === 'object' ? body.heads : {}) as Record<string, unknown>;
  const heads: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw badRequest(`Budget for ${k} must be a positive number.`);
    if (n > 0) heads[k.slice(0, 100)] = Math.round(n * 100) / 100;
  }
  const before = await getSetting(auth.tenantId, 'budgets');
  // Replace the whole map (merge would keep removed heads).
  await prisma.setting.deleteMany({ where: { tenantId: auth.tenantId, key: 'budgets' } });
  const saved = await saveSetting(auth.tenantId, 'budgets', { heads }, auth.name);
  await audit(prisma, auth, { action: 'BUDGETS_UPDATED', entityType: 'Setting', entityId: 'budgets', oldValue: before, newValue: saved });
  return ok(saved, 'Budgets saved.');
});
