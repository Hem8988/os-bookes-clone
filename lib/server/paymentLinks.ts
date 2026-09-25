import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { buildUpiLink } from '@/lib/paymentGateway';
import { badRequest, notFound, round2 } from './http';
import { getSetting } from './settings';

// Online payment links for invoices. With Razorpay keys (RAZORPAY_KEY_ID /
// RAZORPAY_KEY_SECRET) a hosted payment link is created (UPI, cards, net
// banking) and the "payment_link.paid" webhook records the payment for the
// accountant to verify. Without keys the customer gets the UPI link and the
// invoice page in the customer portal.

export const razorpayReady = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

interface SavedLink {
  id: string;
  url: string;
  amount: number;
  createdAt: string;
}

export async function paymentLinkFor(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw notFound('Invoice not found.');
  if (invoice.status === 'Cancelled') throw badRequest('This invoice is cancelled.');
  const amount = round2(Math.max(invoice.grandTotal - invoice.paidAmount, 0));
  if (amount <= 0) throw badRequest('This invoice is already paid.');
  const [company, customer] = await Promise.all([getSetting(tenantId, 'company'), prisma.customer.findFirst({ where: { id: invoice.customerId, tenantId } })]);
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const portalUrl = appUrl ? `${appUrl}/customer?invoice=${invoice.id}` : null;
  const upiUrl = company.upiId ? buildUpiLink(company.upiId, company.name, amount, invoice.invoiceNumber) : null;

  if (!razorpayReady()) {
    if (!upiUrl && !portalUrl) throw badRequest('Set a UPI ID in Settings → Company (or Razorpay keys) to send payment links.');
    return { provider: 'UPI' as const, url: portalUrl || upiUrl!, upiUrl, amount, invoiceNumber: invoice.invoiceNumber, phone: customer?.whatsappNumber || customer?.phone || invoice.customerPhone };
  }

  // Re-use a link made for the same amount (Razorpay links stay valid until paid / expired).
  const extra = (invoice.extra as Record<string, unknown> | null) ?? {};
  const saved = extra.payLink as SavedLink | undefined;
  if (saved && saved.amount === amount) return { provider: 'RAZORPAY' as const, url: saved.url, upiUrl, amount, invoiceNumber: invoice.invoiceNumber, phone: customer?.whatsappNumber || customer?.phone || invoice.customerPhone };

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      accept_partial: false,
      description: `${company.name} — invoice ${invoice.invoiceNumber}`,
      reference_id: `${invoice.invoiceNumber}-${Date.now().toString(36)}`.slice(0, 40),
      customer: { name: invoice.customerName, ...(customer?.phone ? { contact: `+91${customer.phone.replace(/\D/g, '').slice(-10)}` } : {}), ...(customer?.email ? { email: customer.email } : {}) },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { tenantId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      ...(portalUrl ? { callback_url: portalUrl, callback_method: 'get' } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { id?: string; short_url?: string; error?: { description?: string } } | null;
  if (!res?.ok || !json?.short_url || !json.id) throw badRequest(`Razorpay: ${json?.error?.description || 'could not create the payment link.'}`);
  const link: SavedLink = { id: json.id, url: json.short_url, amount, createdAt: new Date().toISOString() };
  await prisma.invoice.update({ where: { id: invoice.id }, data: { extra: { ...extra, payLink: link } as object } });
  return { provider: 'RAZORPAY' as const, url: link.url, upiUrl, amount, invoiceNumber: invoice.invoiceNumber, phone: customer?.whatsappNumber || customer?.phone || invoice.customerPhone };
}

/** X-Razorpay-Signature = hex HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyRazorpay(raw: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
