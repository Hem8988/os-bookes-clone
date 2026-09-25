'use client';

import React, { useState } from 'react';
import { Landmark, Printer } from 'lucide-react';
import { VOUCHER_TYPES, VoucherType } from '../../lib/books';
import { Button, Card, Empty, useToast } from '../ui';
import { BooksHeader, drCr, Kpi, money, PeriodBar, plain, Tabs, useBooksReport, usePeriod, VoucherBadge } from './shared';

interface Book {
  account: { id: string; name: string; groupName: string };
  opening: number;
  closing: number;
  totalDebit: number;
  totalCredit: number;
  rows: { date: string; voucherId: string; voucherNumber: string; voucherType: VoucherType; particulars: string; narration: string | null; debit: number; credit: number; balance: number }[];
}
interface Books { opening: number; closing: number; books: Book[] }

export default function CashBankPanel() {
  const [toast, showToast] = useToast();
  const [kind, setKind] = useState<'cash-book' | 'bank-book'>('cash-book');
  const [period, setPeriod] = usePeriod('month');
  const q = useBooksReport<Books>(kind, period, '', (m) => showToast(m, 'error'));
  const d = q.data;

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Landmark} title="Cash & bank book" subtitle="Receipts and payments of every cash wallet (office and each delivery boy) and every bank account, with running balance." actions={<Button tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Tabs value={kind} onChange={setKind} items={[['cash-book', 'Cash book'], ['bank-book', 'Bank book']]} />
        <PeriodBar value={period} onChange={setPeriod} />
      </div>
      {!d ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Opening" value={money(d.opening)} />
            <Kpi label={kind === 'cash-book' ? 'Cash received' : 'Deposits'} value={money(d.books.reduce((s, b) => s + b.totalDebit, 0))} tone="green" />
            <Kpi label={kind === 'cash-book' ? 'Cash paid / handed over' : 'Withdrawals'} value={money(d.books.reduce((s, b) => s + b.totalCredit, 0))} tone="red" />
            <Kpi label="Closing" value={money(d.closing)} tone="blue" />
          </div>
          {d.books.length === 0 && <Empty>{kind === 'cash-book' ? 'No cash movement yet.' : 'No bank ledgers or movement yet. Add banks in Masters → Banks.'}</Empty>}
          {d.books.map((b) => (
            <Card key={b.account.id} title={b.account.name} actions={<span className="text-xs font-mono font-black">{drCr(b.closing)}</span>}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Particulars</th>
                      <th className="p-2 text-left">Voucher</th>
                      <th className="p-2 text-right">Receipt</th>
                      <th className="p-2 text-right">Payment</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2">{period.from}</td>
                      <td className="p-2">Opening balance</td>
                      <td />
                      <td />
                      <td />
                      <td className="p-2 text-right font-mono">{drCr(b.opening)}</td>
                    </tr>
                    {b.rows.map((r, i) => (
                      <tr key={`${r.voucherId}-${i}`}>
                        <td className="p-2 whitespace-nowrap">{r.date}</td>
                        <td className="p-2"><div className="font-bold">{r.particulars}</div>{r.narration && <div className="text-[10px] text-slate-400">{r.narration}</div>}</td>
                        <td className="p-2 whitespace-nowrap"><VoucherBadge type={r.voucherType} label={VOUCHER_TYPES[r.voucherType]?.label || r.voucherType} /></td>
                        <td className="p-2 text-right font-mono text-emerald-700">{r.debit ? plain(r.debit) : ''}</td>
                        <td className="p-2 text-right font-mono text-rose-700">{r.credit ? plain(r.credit) : ''}</td>
                        <td className="p-2 text-right font-mono font-bold">{drCr(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black">
                    <tr>
                      <td className="p-2" colSpan={3}>Total · closing</td>
                      <td className="p-2 text-right font-mono">{plain(b.totalDebit)}</td>
                      <td className="p-2 text-right font-mono">{plain(b.totalCredit)}</td>
                      <td className="p-2 text-right font-mono">{drCr(b.closing)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
