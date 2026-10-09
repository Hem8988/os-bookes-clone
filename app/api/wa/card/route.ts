import { readCard, renderCardPng } from '@/lib/server/messaging/card';

/**
 * Public PNG header for WhatsApp messages (WhatsApp's servers fetch it, so no login).
 * Only signed links work; the content is in the link, so it can be cached for good.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const card = readCard(url.searchParams.get('d'), url.searchParams.get('s'));
  if (!card) return new Response('Not found', { status: 404 });
  const png = await renderCardPng(card);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
