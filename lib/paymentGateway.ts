import { createHmac, timingSafeEqual } from 'crypto';

/**
 * UPI deep link for a bill (rendered as a QR code in the browser — the
 * amount and VPA are never sent to a third-party QR service).
 */
export function buildUpiLink(upiId: string, payeeName: string, amount: number, reference: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tr: reference,
    tn: `Bill ${reference}`,
  });
  return `upi://pay?${params.toString()}`;
}

/** HMAC-SHA256 signature check for the payment gateway webhook. */
export function verifyGatewaySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
