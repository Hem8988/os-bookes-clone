import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { buildUpiLink } from '@/lib/paymentGateway';
import { verifyPayToken } from '@/lib/server/payPage';
import { getSetting } from '@/lib/server/settings';

// Public page opened from the WhatsApp invoice message: pay the due amount by UPI (QR or the UPI app).
// No login; the link carries a signed invoice id (lib/server/payPage.ts).

export const metadata: Metadata = { title: 'Pay invoice', robots: { index: false, follow: false } };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl overflow-hidden">{children}</div>
    </main>
  );
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoiceId = verifyPayToken(decodeURIComponent(token));
  const invoice = invoiceId ? await prisma.invoice.findUnique({ where: { id: invoiceId } }) : null;

  if (!invoice) {
    return (
      <Shell>
        <div className="p-6 text-center space-y-2">
          <h1 className="text-lg font-black text-slate-900">Link not valid</h1>
          <p className="text-sm text-slate-600">This payment link is wrong or has expired. Please ask us for a new one on WhatsApp.</p>
        </div>
      </Shell>
    );
  }

  const company = await getSetting(invoice.tenantId, 'company');
  const due = Math.round(Math.max(invoice.grandTotal - invoice.paidAmount, 0) * 100) / 100;
  const support = company.supportPhone || company.phone;
  const upi = due > 0 && invoice.status !== 'Cancelled' && company.upiId ? buildUpiLink(company.upiId, company.name, due, invoice.invoiceNumber) : null;
  const qr = upi ? await QRCode.toDataURL(upi, { margin: 1, width: 260 }) : null;

  return (
    <Shell>
      <div className="bg-slate-900 px-6 py-5 text-white">
        <p className="text-xs font-semibold text-emerald-300">{company.name}</p>
        <h1 className="text-lg font-black">Invoice {invoice.invoiceNumber}</h1>
        <p className="text-xs text-slate-300">
          {invoice.customerName} · {invoice.date}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">Invoice amount</p>
            <p className="font-bold text-slate-900">{inr(invoice.grandTotal)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold text-emerald-700">To pay now</p>
            <p className="text-lg font-black text-emerald-800">{inr(due)}</p>
          </div>
        </div>

        {invoice.status === 'Cancelled' ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">This invoice is cancelled. Nothing to pay.</p>
        ) : due <= 0 ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">✅ This invoice is fully paid. Thank you!</p>
        ) : upi && qr ? (
          <>
            <a href={upi} className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500">
              Pay {inr(due)} with a UPI app
            </a>
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500">Or scan with GPay / PhonePe / Paytm / any UPI app</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`UPI QR code to pay ${inr(due)}`} width={220} height={220} className="mx-auto rounded-xl border border-slate-200 p-2" />
              <p className="text-xs text-slate-600">
                UPI ID: <span className="font-mono font-semibold">{company.upiId}</span>
              </p>
            </div>
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">After paying, please send the payment screenshot on WhatsApp{support ? ` (${support})` : ''}. We will update your account.</p>
          </>
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Online payment is not set up yet. Please pay us directly{support ? ` or call ${support}` : ''}.</p>
        )}
      </div>
    </Shell>
  );
}
