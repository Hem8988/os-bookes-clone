import { requireAuth, rateLimit } from '@/lib/server/auth';
import { badRequest, handle, ok } from '@/lib/server/http';
import { storeFile } from '@/lib/server/storage';

/** Upload one proof photo / document (multipart field "file"). */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, undefined, { write: true });
  rateLimit(`upload:${auth.userId}`, 60, 60_000);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw badRequest('Choose a file to upload.');
  const stored = await storeFile(auth.tenantId, Buffer.from(await file.arrayBuffer()));
  return ok(stored);
});
