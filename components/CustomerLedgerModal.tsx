'use client';

import React, { useEffect, useState } from 'react';
import { X, Printer, MessageSquare, Phone, MapPin, RefreshCw } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useCompany } from '../lib/useCompany';
import { Customer } from '../lib/types';

interface LedgerRow {
  id: string;
  date: string;
  voucherNumber: string;
  entryType: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

interface CylinderRow {
  productName: string;
  openingQty: number;
  deliveredQtyTotal: number;
  emptyReceivedTotal: number;
  adjustmentQty: number;
  currentBalance: number;
}

interface CustomerLedgerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

/** Customer statement straight from the posted ledger (no client-side maths). */
export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({ isOpen, customer, onClose }) => {
  const company = useCompany();
  const [tab, setTab] = useState<'LEDGER' | 'CYLINDERS'>('LEDGER');
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [cylinders, setCylinders] = useState<CylinderRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const [ledger, cyl] = await Promise.all([
        api<{ customer: { balance: number } | null; entries: LedgerRow[] }>(`/api/financial/ledger?customerId=${customer.id}`),
        api<{ balances: CylinderRow[] }>(`/api/cylinder/ledger?customerId=${customer.id}`),
      ]);
      setEntries(ledger.entries);
      setBalance(ledger.customer?.balance ?? 0);
      setCylinders(cyl.balances);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer?.id]);

  if (!isOpen || !customer) return null;

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const shareText = encodeURIComponent(
    `${company.name}\nStatement for ${customer.name}\nBilled: ${inr(totalDebit)}\nReceived: ${inr(totalCredit)}\nOutstanding: ${inr(balance)}\n${cylinders.map((c) => `${c.productName}: ${c.currentBalance} cylinders with you`).join('\n')}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="print:hidden flex items-center justify-between px-5 py-3 bg-slate-900 text-white">
          <div>
            <h3 className="font-extrabold text-sm">{customer.name}</h3>
            <p className="text-[11px] text-slate-300 flex items-center gap-3">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
              {customer.area && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.area}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <a href={`https://wa.me/91${customer.whatsappNumber || customer.phone}?text=${shareText}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> Send on WhatsApp
            </a>
            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold flex items-center gap-1">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="hidden print:block text-center">
            <div className="text-lg font-black uppercase">{company.name}</div>
            <div>Statement of account — {customer.name}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Total billed" value={inr(totalDebit)} />
            <Kpi label="Total received" value={inr(totalCredit)} />
            <Kpi label="Outstanding" value={inr(balance)} tone={balance > 0 ? 'text-rose-600' : 'text-emerald-600'} />
            <Kpi label="Credit limit" value={customer.creditLimit ? inr(customer.creditLimit) : 'No limit'} />
          </div>

          <div className="print:hidden flex gap-2">
            {(['LEDGER', 'CYLINDERS'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg font-bold ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {t === 'LEDGER' ? 'Account ledger' : 'Cylinder balance'}
              </button>
            ))}
          </div>

          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 font-semibold">{error}</div>}
          {loading && <div className="text-slate-500">Loading…</div>}

          {tab === 'LEDGER' && !loading && (
            <table className="w-full border border-slate-200">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Voucher</th>
                  <th className="p-2 text-left">Particulars</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-400">No ledger entries yet.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="p-2 font-mono">{e.date}</td>
                    <td className="p-2 font-mono">{e.voucherNumber}<div className="text-[10px] text-slate-400">{e.entryType}</div></td>
                    <td className="p-2">{e.particulars}</td>
                    <td className="p-2 text-right font-mono">{e.debit ? inr(e.debit) : ''}</td>
                    <td className="p-2 text-right font-mono text-emerald-700">{e.credit ? inr(e.credit) : ''}</td>
                    <td className="p-2 text-right font-mono font-bold">{inr(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'CYLINDERS' && !loading && (
            <table className="w-full border border-slate-200">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">Opening</th>
                  <th className="p-2 text-right">Delivered (full)</th>
                  <th className="p-2 text-right">Empty received</th>
                  <th className="p-2 text-right">Adjustment</th>
                  <th className="p-2 text-right">With customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cylinders.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">No cylinders recorded.</td></tr>}
                {cylinders.map((c) => (
                  <tr key={c.productName}>
                    <td className="p-2 font-bold">{c.productName}</td>
                    <td className="p-2 text-right">{c.openingQty}</td>
                    <td className="p-2 text-right">{c.deliveredQtyTotal}</td>
                    <td className="p-2 text-right">{c.emptyReceivedTotal}</td>
                    <td className="p-2 text-right">{c.adjustmentQty}</td>
                    <td className="p-2 text-right font-black">{c.currentBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) => (
  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
    <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
    <div className={`text-base font-black ${tone}`}>{value}</div>
  </div>
);
