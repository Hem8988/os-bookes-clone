import { timingSafeEqual } from 'crypto';
import { rateLimit } from '@/lib/server/auth';
import { clientIp } from '@/lib/server/http';
import { getSetting } from '@/lib/server/settings';
import { receiveWhatsApp, updateWhatsAppStatus, type InboundMedia } from '@/lib/server/whatsappInbox';

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

/**
 * MSG91 webhook (WhatsApp → Webhook (New), Content-Type JSON): incoming messages for the
 * team inbox and delivery reports. The URL carries our secret: …/api/whatsapp/msg91?token=…
 * MSG91 sends some fields (messages, content, contacts…) as JSON inside a string.
 */

type Obj = Record<string, unknown>;
const parse = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return v;
  try {
    return JSON.parse(t);
  } catch {
    return v;
  }
};
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const first = (v: unknown): Obj | null => {
  const x = parse(v);
  return Array.isArray(x) ? ((x[0] as Obj) ?? null) : x && typeof x === 'object' ? (x as Obj) : null;
};

const KINDS = ['image', 'document', 'video', 'audio', 'sticker'] as const;

async function download(url: string): Promise<Buffer | null> {
  if (!/^https:\/\//.test(url)) return null;
  const res = await fetch(url);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

async function handleEvent(e: Obj) {
  const message = first(e.messages);
  const content = first(e.content);
  const inbound = ['0', 'inbound', 'in'].includes(str(e.direction).toLowerCase()) || (!!message && !e.eventName && !e.status);
  const ids = [str(e.uuid), str(e.requestId), str(e.request_id), str(message?.id)];

  if (!inbound) {
    const status = str(e.eventName || e.status);
    if (status) await updateWhatsAppStatus(ids, status, str(e.reason || e.failureReason) || null);
    return;
  }

  const phone = str(e.customerNumber || message?.from || e.recipient_number);
  if (!phone) return;
  const interactive = (message?.interactive ?? content?.interactive) as Obj | undefined;
  const reply = (interactive?.button_reply ?? interactive?.list_reply) as Obj | undefined;
  const text =
    str(reply?.id) ||
    str((message?.button as Obj | undefined)?.payload) ||
    str(e.button) ||
    str(e.text) ||
    str((message?.text as Obj | undefined)?.body) ||
    str(content?.text) ||
    '';
  const kind = KINDS.find((k) => (message?.[k] ?? content?.[k] ?? (str(e.contentType) === k ? e : null)) != null);
  const part = kind ? ((message?.[kind] ?? content?.[kind] ?? {}) as Obj) : null;
  const url = str(part?.url || part?.link || e.url || e.mediaUrl || e.media_url);
  const media: InboundMedia | null = kind ? { kind, caption: str(part?.caption) || undefined, download: () => download(url) } : null;
  if (!text && !media) return;
  const contact = first(e.contacts);
  const name = str((contact?.profile as Obj | undefined)?.name || contact?.name || e.customerName) || null;
  await receiveWhatsApp(TENANT, { phone, text, providerId: str(e.uuid || message?.id) || null, name, media });
}

export async function POST(request: Request) {
  rateLimit(`msg91-webhook:${clientIp(request)}`, 600, 60_000);
  const settings = await getSetting(TENANT, 'msg91');
  const given = Buffer.from(new URL(request.url).searchParams.get('token') || request.headers.get('x-webhook-token') || '');
  const expected = Buffer.from(settings.webhookToken || '');
  // Wrong token: 404, so MSG91 doesn't retry and nobody learns the URL is live.
  if (!expected.length || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response('Not found', { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  const events = (Array.isArray(body) ? body : (body as Obj)?.data && Array.isArray((body as Obj).data) ? ((body as Obj).data as Obj[]) : [body]) as Obj[];
  for (const e of events) {
    try {
      await handleEvent(e);
    } catch (error) {
      console.error('[msg91] webhook event failed', error);
    }
  }
  return Response.json({ status: 'ok' });
}
