'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { Customer } from '../lib/types';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { Card, Empty, cx, inputClass, useToast } from './ui';

// Books of account posted by the system: customer statements (invoice /
// payment / adjustment lines with running balance), cash book and bank book.

interface Entry { id: string; date: string; voucherNumber: string; entryType: string; accountName: string; particulars: string; debit: number; credit: number; balance: number; createdBy: string }

export default function LedgersModule({ initialTab = 'customers' }: { initialTab?: 'customers' | 'CASH' | 'BANK' }) {
  const [tab, setTab] = useState(initialTab);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Customer | null>(null);
  const [book, setBook] = useState<Entry[]>([]);
  const [toast, showToast] = useToast();

  useEffect(() => setTab(initialTab), [initialTab]);

  const load = useCallback(async () => {
    try {
      if (tab === 'customers') setCustomers(await api<Customer[]>('/api/customers'));
      else setBook((await api<{ entries: Entry[] }>(`/api/financial/ledger?type=${tab}`)).entries);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [tab, showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.customerCode || '').toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Ledgers</h2>
        <div className="flex gap-2">
          {([['customers', 'Customer statements'], ['CASH', 'Cash book'], ['BANK', 'Bank book']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'customers' ? (
        <Card
          actions={
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer" className={cx(inputClass, 'pl-8 py-1.5 w-60')} />
            </div>
          }
          title="Outstanding by customer"
        >
          {filtered.length === 0 ? (
            <Empty>No customers.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Terms</th>
                  <th className="p-2 text-right">Credit limit</th>
                  <th className="p-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setOpen(c)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <td className="p-2"><strong>{c.name}</strong><div className="text-[10px] text-slate-400">{c.customerCode} · {c.phone}</div></td>
                    <td className="p-2">{c.paymentTerms || 'COD'}</td>
                    <td className="p-2 text-right">{c.creditLimit ? inr(c.creditLimit) : '—'}</td>
                    <td className={cx('p-2 text-right font-mono font-black', c.balance > 0 ? 'text-rose-600' : 'text-emerald-700')}>{inr(c.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card title={tab === 'CASH' ? 'Cash book' : 'Bank book'}>
          {book.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Voucher</th>
                  <th className="p-2">Particulars</th>
                  <th className="p-2 text-right">Receipt (Dr)</th>
                  <th className="p-2 text-right">Payment (Cr)</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {book.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="p-2">{e.date}</td>
                    <td className="p-2 font-mono">{e.voucherNumber}</td>
                    <td className="p-2">{e.particulars}<div className="text-[10px] text-slate-400">{e.createdBy}</div></td>
                    <td className="p-2 text-right font-mono">{e.debit ? inr(e.debit) : ''}</td>
                    <td className="p-2 text-right font-mono">{e.credit ? inr(e.credit) : ''}</td>
                    <td className="p-2 text-right font-mono font-bold">{inr(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      <CustomerLedgerModal isOpen={!!open} customer={open} onClose={() => setOpen(null)} />
    </div>
  );
}
