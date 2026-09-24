import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { toWhatsAppNumber } from '@/lib/phone';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

export const whatsappConfigured = () => !!(TOKEN && PHONE_NUMBER_ID);

interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

async function callApi(payload: Record<string, unknown>): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: true };
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

async function log(tenantId: string, to: string, body: string, result: SendResult, templateKey?: string) {
  await prisma.messageLog.create({
    data: {
      tenantId,
      channel: 'WHATSAPP',
      direction: 'OUT',
      recipient: to,
      body,
      templateKey,
      providerId: result.providerId,
      status: !whatsappConfigured() ? 'SIMULATED' : result.ok ? 'SENT' : 'FAILED',
      error: result.error,
    },
  });
}

export async function sendWhatsAppText(tenantId: string, phone: string, text: string, templateKey?: string): Promise<SendResult> {
  const to = toWhatsAppNumber(phone);
  const result = await callApi({ to, type: 'text', text: { body: text } });
  await log(tenantId, to, text, result, templateKey);
  return result;
}

/** Up to 3 quick-reply buttons (WhatsApp limit); falls back to text beyond that. */
export async function sendWhatsAppButtons(tenantId: string, phone: string, text: string, buttons: { id: string; title: string }[]) {
  const to = toWhatsAppNumber(phone);
  if (buttons.length === 0 || buttons.length > 3) return sendWhatsAppText(tenantId, phone, text);
  const result = await callApi({
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
  const result = await callApi({
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

/** Pre-approved Meta template (needed outside the 24h customer-service window). */
export async function sendWhatsAppTemplate(tenantId: string, phone: string, metaName: string, language: string, params: string[], renderedBody: string, templateKey: string) {
  const to = toWhatsAppNumber(phone);
  const result = await callApi({
    to,
    type: 'template',
    template: {
      name: metaName,
      language: { code: language },
      components: params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] : [],
    },
  });
  await log(tenantId, to, renderedBody, result, templateKey);
  return result;
}

/** Verify Meta's X-Hub-Signature-256 header on webhook calls. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) return process.env.NODE_ENV !== 'production';
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', APP_SECRET).update(rawBody).digest();
  const given = Buffer.from(signatureHeader.slice(7), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
