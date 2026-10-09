import { verifyMediaKey } from '@/lib/server/messaging/publicMedia';
import { readStoredFile } from '@/lib/server/storage';

/** A chat attachment for WhatsApp's servers to fetch (signed link to one stored file, no login). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('k');
  if (!key || !verifyMediaKey(key, url.searchParams.get('s'))) return new Response('Not found', { status: 404 });
  const file = await readStoredFile(key);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.mime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  });
}
