import { rateLimit } from '@/lib/server/auth';
import { ApiError, clientIp, handle } from '@/lib/server/http';
import { downloadMetaMedia, verifyWebhookSignature } from '@/lib/server/messaging/whatsapp';
import { receiveWhatsApp, updateWhatsAppStatus, type InboundMedia } from '@/lib/server/whatsappInbox';

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

type MediaPart = { id: string; caption?: string; filename?: string };
type InboundMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  interactive?: { button_reply?: { id: string; title?: string }; list_reply?: { id: string; title?: string } };
  button?: { payload?: string; text?: string };
  image?: MediaPart;
  document?: MediaPart;
  video?: MediaPart;
  audio?: MediaPart;
  sticker?: MediaPart;
};
type Value = {
  messages?: InboundMessage[];
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
};

const MEDIA_KINDS = ['image', 'document', 'video', 'audio', 'sticker'] as const;

/** Incoming messages (into the team inbox / bot) and delivery reports (sent → delivered → read). */
export const POST = handle(async (request: Request) => {
  rateLimit(`wa-webhook:${clientIp(request)}`, 600, 60_000);
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-hub-signature-256'))) throw new ApiError(401, 'Invalid signature.', 'BAD_SIGNATURE');
  const body = JSON.parse(raw) as { entry?: { changes?: { value?: Value }[] }[] };
  const values = (body.entry || []).flatMap((e) => (e.changes || []).map((c) => c.value || {}));

  for (const value of values) {
    for (const s of value.statuses || []) await updateWhatsAppStatus([s.id], s.status, s.errors?.[0]?.message || s.errors?.[0]?.title);
    for (const message of value.messages || []) {
      if (!message.from) continue;
      // Button / list replies carry the option id the bot understands.
      const text = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || message.button?.payload || message.text?.body || '';
      const kind = MEDIA_KINDS.find((k) => message[k]?.id);
      const part = kind ? message[kind] : undefined;
      const media: InboundMedia | null = kind && part ? { kind, caption: part.caption, download: () => downloadMetaMedia(part.id) } : null;
      if (!text && !media) continue;
      try {
        rateLimit(`wa-from:${message.from}`, 30, 60_000);
        const name = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
        await receiveWhatsApp(TENANT, { phone: message.from, text, providerId: message.id, name, media });
      } catch (error) {
        console.error('[whatsapp] failed to handle message', message.id, error);
      }
    }
  }
  return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
