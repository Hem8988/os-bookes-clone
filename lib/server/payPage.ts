import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { paymentLinkFor, razorpayReady } from './paymentLinks';
import { getSetting } from './settings';

// Public "pay this invoice" page (/pay/<token>) for WhatsApp messages: no login, the token is the
// invoice id signed with SESSION_SECRET, so nobody can open another customer's invoice by guessing.

const secret = () => process.env.SESSION_SECRET || '';
const sig = (invoiceId: string) => createHmac('sha256', secret()).update(`pay:${invoiceId}`).digest('base64url').slice(0, 22);

export function signPayToken(invoiceId: string) {
  return `${invoiceId}.${sig(invoiceId)}`;
}

export function verifyPayToken(token: string): string | null {
  const [id, given] = token.split('.');
  if (!id || !given || !secret()) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(sig(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/**
 * Link to pay an invoice from WhatsApp, or null when nothing is due / nothing is set up:
 * Razorpay keys → the Razorpay link (the payment is recorded by its webhook), else with a
 * UPI ID in Settings → Company → our /pay page with the UPI QR and an "open UPI app" button.
 */
export async function payUrlFor(tenantId: string, invoiceId: string): Promise<string | null> {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { grandTotal: true, paidAmount: true, status: true } });
    if (!invoice || invoice.status === 'Cancelled' || invoice.grandTotal - invoice.paidAmount <= 0.5) return null;
    if (razorpayReady()) return (await paymentLinkFor(tenantId, invoiceId)).url;
    const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
    const company = await getSetting(tenantId, 'company');
    if (!appUrl || !company.upiId || !secret()) return null;
    return `${appUrl}/pay/${signPayToken(invoiceId)}`;
  } catch {
    return null;
  }
}
