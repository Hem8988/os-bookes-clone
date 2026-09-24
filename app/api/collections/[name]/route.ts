import { requireAuth } from '@/lib/server/auth';
import { assertCollectionAction, listCollection, mutateCollection } from '@/lib/server/collections';
import { handle, ok, optStr, readJson } from '@/lib/server/http';

type Ctx = { params: Promise<{ name: string }> };

export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  return ok(await listCollection(auth, (await ctx.params).name));
});

/** { action: 'create' | 'update' | 'delete', item?, id?, reason? } */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  const result = await mutateCollection(auth, (await ctx.params).name, {
    action: assertCollectionAction(body.action),
    item: body.item && typeof body.item === 'object' ? (body.item as Record<string, unknown>) : undefined,
    id: optStr(body.id) || undefined,
    reason: optStr(body.reason) || undefined,
  });
  return ok(result);
});
