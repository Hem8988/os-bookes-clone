import type { Metadata } from 'next';
import { PublicInvoiceView } from '@/components/PublicInvoiceView';

// Public invoice page opened from the WhatsApp invoice message: no login, the link carries the
// invoice id signed with SESSION_SECRET (lib/server/payPage.ts → invoiceViewUrl).

export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicInvoiceView token={decodeURIComponent(token)} />;
}
