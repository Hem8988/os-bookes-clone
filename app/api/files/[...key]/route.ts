import { requireAuth } from '@/lib/server/auth';
import { forbidden, handle, notFound } from '@/lib/server/http';
import { fileTenantFolder, readStoredFile } from '@/lib/server/storage';

type Ctx = { params: Promise<{ key: string[] }> };

/** Serve an uploaded file to logged-in users of the same tenant only. */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { key } = await ctx.params;
  const path = key.join('/');
  if (fileTenantFolder(path) !== auth.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-')) throw forbidden();
  const file = await readStoredFile(path);
  if (!file) throw notFound('File not found.');
  return new Response(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.mime, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
});
