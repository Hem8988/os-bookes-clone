import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { toWhatsAppNumber } from '@/lib/phone';
import { isStoredFile, readStoredFile } from '../storage';
import { isConnected, rememberChoices, sendViaSession, sessionForChannel, type WaContent } from '../waweb/gateway';
import { msg91Config, whatsappReady, whatsappSessionRaw } from './msg91';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

/** Meta Cloud API set up in .env. */
export const whatsappConfigured = () => !!(TOKEN && PHONE_NUMBER_ID);

/**
 * How a chat channel sends right now. "main" (company): the linked company number (WhatsApp Web)
 * when connected, else MSG91, else the Meta Cloud API, else only logged. A staff member's own
 * channel ("u:<userId>") only ever sends from their linked number.
 */
export type WhatsAppRoute = 'web' | 'web-offline' | 'msg91' | 'meta' | 'simulated';

export async function whatsappRoute(tenantId: string, channel = 'main'): Promise<{ route: WhatsAppRoute; sessionId?: string }> {
  const web = await sessionForChannel(tenantId, channel);
  if (web && isConnected(web.id)) return { route: 'web', sessionId: web.id };
  if (channel !== 'main') return { route: 'web-offline', sessionId: web?.id };
  if (whatsappReady(await msg91Config(tenantId))) return { route: 'msg91' };
  if (whatsappConfigured()) return { route: 'meta' };
  if (web) return { route: 'web-offline', sessionId: web.id };
  return { route: 'simulated' };
}

/** A real WhatsApp channel is set up and connected for this chat channel. */
export async function whatsappReadyFor(tenantId: string, channel = 'main') {
  const { route } = await whatsappRoute(tenantId, channel);
  return route === 'web' || route === 'msg91' || route === 'meta';
}

/** The 24-hour customer-service window is a rule of the official API only (not WhatsApp Web). */
export async function usesServiceWindow(tenantId: string, channel = 'main') {
  const { route } = await whatsappRoute(tenantId, channel);
  return route === 'msg91' || route === 'meta';
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

type Choice = { id: string; title: string; description?: string };

/** Numbered text in place of buttons / lists (WhatsApp Web cannot send them); the ids are remembered for the reply. */
function numbered(channel: string, to: string, body: string, options: Choice[]) {
  rememberChoices(channel, to, options.map((o) => o.id));
  const lines = options.map((o, i) => {
    const n = `${i + 1}.`;
    const title = o.title.trim().startsWith(n) ? o.title.trim() : `${n} ${o.title.trim()}`;
    return o.description ? `${title} — ${o.description}` : title;
  });
  return `${body}\n\n${lines.join('\n')}\n\n_Number bhej kar chunein (jaise 1)._`;
}

/** Our stored copy (/api/files/…) is read from storage; any other http(s) link is fetched by WhatsApp Web. */
async function mediaSource(link: string): Promise<{ data?: Buffer; url?: string; mime?: string } | null> {
  if (isStoredFile(link)) {
    const file = await readStoredFile(link.slice('/api/files/'.length));
    return file ? { data: file.data, mime: file.mime } : null;
  }
  return /^https?:\/\//.test(link) ? { url: link } : null;
}

/** Meta-style payload → WhatsApp Web content. */
async function toWeb(channel: string, payload: Record<string, unknown>): Promise<WaContent | { error: string }> {
  const to = String(payload.to);
  const type = String(payload.type);
  if (type === 'text') return { text: (payload.text as { body: string }).body };
  if (type === 'image' || type === 'document') {
    const m = payload[type] as { link: string; caption?: string; filename?: string };
    const src = await mediaSource(m.link);
    if (!src) return { error: 'The file could not be read.' };
    return type === 'image'
      ? { image: src, caption: m.caption, mimetype: src.mime }
      : { document: src, fileName: m.filename || 'document.pdf', mimetype: src.mime || 'application/pdf', caption: m.caption };
  }
  if (type === 'interactive') {
    const i = payload.interactive as {
      type: string;
      body: { text: string };
      header?: { image?: { link: string } };
      action: { buttons?: { reply: { id: string; title: string } }[]; sections?: { rows: Choice[] }[]; parameters?: { display_text: string; url: string } };
    };
    if (i.type === 'button') return { text: numbered(channel, to, i.body.text, (i.action.buttons || []).map((b) => b.reply)) };
    if (i.type === 'list') return { text: numbered(channel, to, i.body.text, (i.action.sections || []).flatMap((s) => s.rows)) };
    if (i.type === 'cta_url') {
      const text = `${i.body.text}\n\n${i.action.parameters?.display_text || 'Open'}: ${i.action.parameters?.url || ''}`;
      const img = i.header?.image?.link ? await mediaSource(i.header.image.link) : null;
      return img ? { image: img, caption: text, mimetype: img.mime } : { text };
    }
  }
  return { error: `${type} messages cannot be sent from a linked WhatsApp number.` };
}

/**
 * Send one message on a chat channel: the linked WhatsApp number when it serves the channel,
 * else MSG91 (when switched on), else the Meta Cloud API, else only logged (SIMULATED).
 */
async function callApi(tenantId: string, payload: Record<string, unknown>, opts: { channel?: string; priority?: boolean } = {}): Promise<SendResult> {
  const channel = opts.channel || 'main';
  const { route, sessionId } = await whatsappRoute(tenantId, channel);
  if (route === 'web' && sessionId) {
    const content = await toWeb(channel, payload);
    if ('error' in content) return { ok: false, error: content.error };
    return sendViaSession(sessionId, String(payload.to), content, { priority: opts.priority });
  }
  if (route === 'web-offline') {
    return { ok: false, error: 'This WhatsApp number is not connected. Open WhatsApp → Numbers and scan the QR again.' };
  }
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

/** channel: which of our numbers ("main" = company, "u:<userId>" = a staff member's own); priority: typed by a person, no gap. */
type LogExtra = { mediaUrl?: string | null; mediaType?: string | null; sentBy?: string | null; channel?: string; priority?: boolean };

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
      waChannel: extra.channel || 'main',
    },
  });
  await prisma.whatsAppConversation.updateMany({ where: { tenantId, channel: extra.channel || 'main', phone: to }, data: { lastActivityAt: new Date(), lastPreview: preview(body, extra.mediaType) } });
  return row;
}

export const preview = (body: string, mediaType?: string | null) => (body.trim() ? body.trim().replace(/\s+/g, ' ').slice(0, 120) : mediaType ? `[${mediaType}]` : '');

export async function sendWhatsAppText(tenantId: string, phone: string, text: string, templateKey?: string, extra: LogExtra = {}): Promise<SendResult> {
  const to = toWhatsAppNumber(phone);
  const result = await callApi(tenantId, { to, type: 'text', text: { body: text } }, extra);
  await log(tenantId, to, text, result, templateKey, extra);
  return result;
}

/** A photo / PDF from the chat. `link` must be public (WhatsApp fetches it); `storedUrl` is our copy for the inbox. */
export async function sendWhatsAppMedia(tenantId: string, phone: string, media: { kind: 'image' | 'document'; link: string; storedUrl: string; caption?: string; filename?: string }, extra: LogExtra = {}): Promise<SendResult> {
  const to = toWhatsAppNumber(phone);
  const item = { link: media.link, ...(media.caption ? { caption: media.caption.slice(0, 1024) } : {}), ...(media.kind === 'document' ? { filename: media.filename || 'document.pdf' } : {}) };
  const result = await callApi(tenantId, { to, type: media.kind, [media.kind]: item }, extra);
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
export async function sendWhatsAppRich(tenantId: string, phone: string, text: string, parts: RichParts, templateKey?: string, extra: LogExtra = {}): Promise<SendResult> {
  if (!parts.imageUrl && !parts.button) return sendWhatsAppText(tenantId, phone, text, templateKey, extra);
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
      }, extra)
    : await callApi(tenantId, { to, type: 'image', image: { link: parts.imageUrl, caption: body } }, extra);
  await log(tenantId, to, logText(text, parts), result, templateKey, extra);
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
