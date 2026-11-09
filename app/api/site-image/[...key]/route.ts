import { handle, notFound } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';
import { readStoredFile } from '@/lib/server/storage';
import { websiteImages } from '@/lib/website';

type Ctx = { params: Promise<{ key: string[] }> };

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

/**
 * A photo picked in Admin → Website, for the public site. Uploads are private, so only
 * files the website content uses are served here.
 */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const key = (await ctx.params).key.map(decodeURIComponent).join('/');
  const website = await getSetting(TENANT, 'website');
  if (!websiteImages(website).includes(`/api/files/${key}`)) throw notFound('Image not found.');
  const file = await readStoredFile(key);
  if (!file || !file.mime.startsWith('image/')) throw notFound('Image not found.');
  return new Response(new Uint8Array(file.data), {
    // Upload names are unique, so a changed photo gets a new address.
    headers: { 'Content-Type': file.mime, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
});
