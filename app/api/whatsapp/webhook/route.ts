import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/server/auth';
import { ApiError, clientIp, handle } from '@/lib/server/http';
import { verifyWebhookSignature } from '@/lib/server/messaging/whatsapp';
import { handleIncomingMessage } from '@/lib/server/whatsappBot';

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

/** Meta webhook verification handshake. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === token) {
    return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

type InboundMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  interactive?: { button_reply?: { id: string }; list_reply?: { id: string } };
  button?: { payload?: string; text?: string };
};

export const POST = handle(async (request: Request) => {
  rateLimit(`wa-webhook:${clientIp(request)}`, 600, 60_000);
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-hub-signature-256'))) throw new ApiError(401, 'Invalid signature.', 'BAD_SIGNATURE');
  const body = JSON.parse(raw) as { entry?: { changes?: { value?: { messages?: InboundMessage[] } }[] }[] };

  const messages = (body.entry || []).flatMap((e) => (e.changes || []).flatMap((c) => c.value?.messages || []));
  for (const message of messages) {
    const text = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || message.button?.payload || message.text?.body || '';
    if (!message.from || !text) continue;
    try {
      // The unique providerId makes Meta's retries idempotent.
      await prisma.messageLog.create({ data: { tenantId: TENANT, channel: 'WHATSAPP', direction: 'IN', recipient: message.from, body: text, providerId: message.id, status: 'RECEIVED' } });
    } catch {
      continue;
    }
    try {
      rateLimit(`wa-from:${message.from}`, 30, 60_000);
      await handleIncomingMessage(message.from, text);
    } catch (error) {
      console.error('[whatsapp] failed to handle message', message.id, error);
    }
  }
  return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
