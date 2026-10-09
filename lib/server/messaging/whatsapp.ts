import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { toWhatsAppNumber } from '@/lib/phone';
import { msg91Config, whatsappReady, whatsappSessionRaw } from './msg91';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

/** Meta Cloud API set up in .env. */
export const whatsappConfigured = () => !!(TOKEN && PHONE_NUMBER_ID);

/** Any WhatsApp channel for this tenant: MSG91 (when switched on) or the Meta Cloud API. */
export async function whatsappReadyFor(tenantId: string) {
  return whatsappReady(await msg91Config(tenantId)) || whatsappConfigured();
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  /** No WhatsApp set up: only logged. */
  simulated?: boolean;
}

/** Meta-style payload → MSG91 session message (text, buttons / list, media). */
function toMsg91(payload: Record<string, unknown>): Record<string, unknown> | null {
  const type = String(payload.type);
  if (type === 'text') return { content_type: 'text', text: (payload.text as { body: string }).body };
  if (type === 'interactive') return { content_type: 'interactive', interactive: payload.interactive };
  if (['image', 'document', 'video', 'audio'].includes(type)) {
    const m = payload[type] as { link: string; caption?: string; filename?: string };
    return { content_type: type, attachment_url: m.link, ...(m.caption ? { caption: m.caption } : {}), ...(m.filename ? { filename: m.filename } : {}) };
  }
  return null;
}

/** Send through MSG91 when it is switched on for the tenant, else the Meta Cloud API. */
async function callApi(tenantId: string, payload: Record<string, unknown>): Promise<SendResult> {
  const c = await msg91Config(tenantId);
  if (whatsappReady(c)) {
    const body = toMsg91(payload);
    if (!body) return { ok: false, error: `MSG91: ${String(payload.type)} messages go through MSG91 templates.` };
    const r = await whatsappSessionRaw(c, String(payload.to), body);
    return { ok: r.ok, providerId: r.requestId, error: r.error };
  }
  if (!whatsappConfigured()) return { ok: true, simulated: true };
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
    return { ok: true, providerId: data.messages?.[0]?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

type LogExtra = { mediaUrl?: string | null; mediaType?: string | null; sentBy?: string | null };

/** Log the message, and move its chat (if any) to the top of the team inbox. */
export async function log(tenantId: string, to: string, body: string, result: SendResult, templateKey?: string, extra: LogExtra = {}) {
  const row = await prisma.messageLog.create({
    data: {
      tenantId,
      channel: 'WHATSAPP',
      direction: 'OUT',
      recipient: to,
      body,
      templateKey,
      // Unique: some providers reply without a per-message id, so only real ids are kept.
      providerId: result.providerId || undefined,
      status: result.simulated ? 'SIMULATED' : result.ok ? 'SENT' : 'FAILED',
      error: result.error,
      mediaUrl: extra.mediaUrl ?? undefined,
      mediaType: extra.mediaType ?? undefined,
      sentBy: extra.sentBy ?? undefined,
    },
  });
  await prisma.whatsAppConversation.updateMany({ where: { tenantId, phone: to }, data: { lastActivityAt: new Date(), lastPreview: preview(body, extra.mediaType) } });
  return row;
}

export const preview = (body: string, mediaType?: string | null) => (body.trim() ? body.trim().replace(/\s+/g, ' ').slice(0, 120) : mediaType ? `[${mediaType}]` : '');

export async function sendWhatsAppText(tenantId: string, phone: string, text: string, templateKey?: string, extra: LogExtra = {}): Promise<SendResult> {
  const to = toWhatsAppNumber(phone);
  const result = await callApi(tenantId, { to, type: 'text', text: { body: text } });
  await log(tenantId, to, text, result, templateKey, extra);
  return result;
}

/** A photo / PDF from the chat. `link` must be public (WhatsApp fetches it); `storedUrl` is our copy for the inbox. */
export async function sendWhatsAppMedia(tenantId: string, phone: string, media: { kind: 'image' | 'document'; link: string; storedUrl: string; caption?: string; filename?: string }, extra: LogExtra = {}): Promise<SendResult> {
  const to = toWhatsAppNumber(phone);
  const item = { link: media.link, ...(media.caption ? { caption: media.caption.slice(0, 1024) } : {}), ...(media.kind === 'document' ? { filename: media.filename || 'document.pdf' } : {}) };
  const result = await callApi(tenantId, { to, type: media.kind, [media.kind]: item });
  await log(tenantId, to, media.caption || '', result, undefined, { ...extra, mediaUrl: media.storedUrl, mediaType: media.kind });
  return result;
}

/** Up to 3 quick-reply buttons (WhatsApp limit); falls back to text beyond that. */
export async function sendWhatsAppButtons(tenantId: string, phone: string, text: string, buttons: { id: string; title: string }[]) {
  const to = toWhatsAppNumber(phone);
  if (buttons.length === 0 || buttons.length > 3) return sendWhatsAppText(tenantId, phone, text);
  const result = await callApi(tenantId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: { buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  });
  await log(tenantId, to, `${text}\n[${buttons.map((b) => `${b.id}: ${b.title}`).join(' | ')}]`, result);
  return result;
}

/** Interactive list for menus with more than three options. */
export async function sendWhatsAppList(tenantId: string, phone: string, text: string, buttonLabel: string, rows: { id: string; title: string; description?: string }[]) {
  const to = toWhatsAppNumber(phone);
  const result = await callApi(tenantId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{ title: 'Options', rows: rows.slice(0, 10).map((r) => ({ id: r.id, title: r.title.slice(0, 24), description: r.description?.slice(0, 72) })) }],
      },
    },
  });
  await log(tenantId, to, `${text}\n${rows.map((r) => `• [${r.id}] ${r.title}`).join('\n')}`, result);
  return result;
}

/** Image card on top and / or a link button under the text. */
export type RichParts = { imageUrl?: string | null; button?: { label: string; url: string } | null };

const logText = (text: string, parts: RichParts) =>
  [parts.imageUrl ? '[Card image]' : '', text, parts.button ? `[${parts.button.label} → ${parts.button.url}]` : ''].filter(Boolean).join('\n');

/**
 * Session message with the card and button: a link button → interactive CTA message
 * (card as its header), a card only → image with the text as caption, else plain text.
 */
export async function sendWhatsAppRich(tenantId: string, phone: string, text: string, parts: RichParts, templateKey?: string): Promise<SendResult> {
  if (!parts.imageUrl && !parts.button) return sendWhatsAppText(tenantId, phone, text, templateKey);
  const to = toWhatsAppNumber(phone);
  const body = text.slice(0, 1024);
  const result = parts.button
    ? await callApi(tenantId, {
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          ...(parts.imageUrl ? { header: { type: 'image', image: { link: parts.imageUrl } } } : {}),
          body: { text: body },
          action: { name: 'cta_url', parameters: { display_text: parts.button.label.slice(0, 20), url: parts.button.url } },
        },
      })
    : await callApi(tenantId, { to, type: 'image', image: { link: parts.imageUrl, caption: body } });
  await log(tenantId, to, logText(text, parts), result, templateKey);
  return result;
}

/**
 * Pre-approved Meta template (needed outside the 24h customer-service window).
 * Create it in Meta with an IMAGE header when the message has a card, and a URL button
 * `<APP_URL>/{{1}}` when it has a button: the part of the link after APP_URL goes in {{1}}.
 */
export async function sendWhatsAppTemplate(tenantId: string, phone: string, metaName: string, language: string, params: string[], renderedBody: string, templateKey: string, parts: RichParts = {}) {
  const to = toWhatsAppNumber(phone);
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const buttonSuffix = parts.button ? (appUrl && parts.button.url.startsWith(`${appUrl}/`) ? parts.button.url.slice(appUrl.length + 1) : parts.button.url) : null;
  const components = [
    ...(parts.imageUrl ? [{ type: 'header', parameters: [{ type: 'image', image: { link: parts.imageUrl } }] }] : []),
    ...(params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] : []),
    ...(buttonSuffix ? [{ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: buttonSuffix }] }] : []),
  ];
  const result = await callApi(tenantId, { to, type: 'template', template: { name: metaName, language: { code: language }, components } });
  await log(tenantId, to, logText(renderedBody, parts), result, templateKey);
  return result;
}

/** A photo / document a customer sent (Meta gives an id; the file needs our token to download). */
export async function downloadMetaMedia(mediaId: string): Promise<Buffer | null> {
  if (!whatsappConfigured()) return null;
  const meta = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!meta.ok) return null;
  const { url } = (await meta.json()) as { url?: string };
  if (!url) return null;
  const file = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return file.ok ? Buffer.from(await file.arrayBuffer()) : null;
}

/** Verify Meta's X-Hub-Signature-256 header on webhook calls. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) return process.env.NODE_ENV !== 'production';
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', APP_SECRET).update(rawBody).digest();
  const given = Buffer.from(signatureHeader.slice(7), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
