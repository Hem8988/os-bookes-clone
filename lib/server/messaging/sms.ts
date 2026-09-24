import { prisma } from '@/lib/db';
import { phoneKey } from '@/lib/phone';

/**
 * Fallback SMS channel for OTPs and critical alerts when WhatsApp fails.
 * Works with any gateway that accepts a JSON POST: configure SMS_API_URL
 * (and SMS_API_KEY sent as a Bearer token). Payload: { to, message, sender }.
 */
export const smsConfigured = () => !!process.env.SMS_API_URL;

export async function sendSms(tenantId: string, phone: string, message: string, templateKey?: string) {
  const to = `91${phoneKey(phone)}`;
  let status = 'SIMULATED';
  let error: string | undefined;
  if (smsConfigured()) {
    try {
      const res = await fetch(process.env.SMS_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
        },
        body: JSON.stringify({ to, message, sender: process.env.SMS_SENDER_ID }),
      });
      status = res.ok ? 'SENT' : 'FAILED';
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (e) {
      status = 'FAILED';
      error = e instanceof Error ? e.message : String(e);
    }
  }
  await prisma.messageLog.create({
    data: { tenantId, channel: 'SMS', direction: 'OUT', recipient: to, body: message, templateKey, status, error },
  });
  return status !== 'FAILED';
}
