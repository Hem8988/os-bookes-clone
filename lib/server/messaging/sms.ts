import { prisma } from '@/lib/db';
import { phoneKey } from '@/lib/phone';
import { msg91Config, smsReady, smsSend } from './msg91';

/**
 * SMS for OTPs and the alerts chosen in Settings → WhatsApp → MSG91.
 *
 * MSG91 (preferred): auth key + one DLT-approved template per message, created from
 * the templates screen (or MSG91_AUTH_KEY / MSG91_TEMPLATE_<KEY> in .env).
 *
 * Any other gateway that accepts a JSON POST: SMS_API_URL (+ SMS_API_KEY as a Bearer
 * token). Payload: { to, message, sender }.
 */
export async function smsConfigured(tenantId: string) {
  return smsReady(await msg91Config(tenantId)) || !!process.env.SMS_API_URL;
}

type Vars = Record<string, string | number | null | undefined>;
type SendResult = { status: 'SENT' | 'FAILED' | 'SIMULATED'; providerId?: string; error?: string };

async function viaGateway(to: string, message: string): Promise<SendResult> {
  const res = await fetch(process.env.SMS_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
    },
    body: JSON.stringify({ to, message, sender: process.env.SMS_SENDER_ID }),
  });
  return res.ok ? { status: 'SENT' } : { status: 'FAILED', error: `HTTP ${res.status}` };
}

/** `vars` fill the MSG91 template; `message` is the full text (generic gateway, and the log). */
export async function sendSms(tenantId: string, phone: string, message: string, templateKey?: string, vars: Vars = {}) {
  const to = `91${phoneKey(phone)}`;
  let result: SendResult = { status: 'SIMULATED' };
  const c = await msg91Config(tenantId);
  try {
    if (smsReady(c)) {
      const templateId = templateKey ? c.templates[templateKey]?.smsTemplateId : undefined;
      // India (DLT) allows only pre-approved templates, so a free-text SMS cannot go out.
      if (!templateId) result = { status: 'FAILED', error: `No MSG91 SMS template for ${templateKey || 'this message'} — create it in WhatsApp → MSG91.` };
      else {
        const values = Object.fromEntries(Object.entries(vars).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
        const r = await smsSend(c, templateId, to, values);
        result = r.ok ? { status: 'SENT', providerId: r.requestId } : { status: 'FAILED', error: r.error };
      }
    } else if (process.env.SMS_API_URL) result = await viaGateway(to, message);
  } catch (e) {
    result = { status: 'FAILED', error: e instanceof Error ? e.message : String(e) };
  }
  await prisma.messageLog.create({
    data: { tenantId, channel: 'SMS', direction: 'OUT', recipient: to, body: message, templateKey, providerId: result.providerId, status: result.status, error: result.error },
  });
  return result.status !== 'FAILED';
}
