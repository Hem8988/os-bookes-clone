'use client';

import React, { useEffect, useState } from 'react';
import { PrintInvoiceModal, type InvoiceView } from './PrintInvoiceModal';

// The invoice a customer opens from WhatsApp (/i/<token>), without a login.

export function PublicInvoiceView({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/invoice/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!alive) return;
        if (r.ok && j?.data) setInvoice(j.data as InvoiceView);
        else setError(j?.error || 'This invoice link is not valid.');
      })
      .catch(() => alive && setError('No internet connection. Please try again.'));
    return () => {
      alive = false;
    };
  }, [token]);

  if (invoice) return <PrintInvoiceModal invoice={invoice} publicToken={token} onClose={() => {}} />;
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-black text-slate-900">Invoice not found</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-600">Loading invoice…</p>
        )}
      </div>
    </main>
  );
}
