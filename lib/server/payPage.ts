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

// Public "view this invoice" page (/i/<token>): same idea, signed for another purpose so a pay
// token does not open the invoice page and the other way round.
const viewSig = (invoiceId: string) => createHmac('sha256', secret()).update(`view:${invoiceId}`).digest('base64url').slice(0, 22);

export function verifyInvoiceViewToken(token: string): string | null {
  const [id, given] = token.split('.');
  if (!id || !given || !secret()) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(viewSig(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** "/i/<token>" for the invoice, or '' when SESSION_SECRET is missing. */
export function invoiceViewPath(invoiceId: string): string {
  return secret() ? `/i/${invoiceId}.${viewSig(invoiceId)}` : '';
}

/** Link to the invoice that opens without a login, for WhatsApp; '' when APP_URL / SESSION_SECRET is missing. */
export function invoiceViewUrl(invoiceId: string): string {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const path = invoiceViewPath(invoiceId);
  return appUrl && path ? `${appUrl}${path}` : '';
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
