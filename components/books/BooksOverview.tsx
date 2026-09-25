'use client';

import React from 'react';
import { ArrowRight, BookOpenCheck, FileSpreadsheet, Plus, Receipt, ShoppingCart, Wallet } from 'lucide-react';
import { VOUCHER_TYPES } from '../../lib/books';
import { Button, Card, Empty, useToast } from '../ui';
import { BooksHeader, Kpi, money, PeriodBar, useBooksReport, usePeriod, VoucherBadge } from './shared';

interface Overview {
  sales: number;
  purchases: number;
  expenses: number;
  receipts: number;
  cashInHand: number;
  bank: number;
  receivables: number;
  payables: number;
  gstPayable: number;
  grossProfit: number;
  netProfit: number;
  closingStock: number;
}
interface DayRow { id: string; voucherNumber: string; voucherType: keyof typeof VOUCHER_TYPES; date: string; partyName: string | null; narration: string | null; amount: number; cancelled: boolean }
interface AgeRow { customerId: string; name: string; shortName: string | null; balance: number; d90: number; d61_90: number }

export default function BooksOverview({ onNavigate }: { onNavigate: (sub: string) => void }) {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('month');
  const onError = (m: string) => showToast(m, 'error');
  const o = useBooksReport<Overview>('overview', period, '', onError).data;
  const days = useBooksReport<DayRow[]>('day-book', period, '', onError).data ?? [];
  const ageing = useBooksReport<AgeRow[]>('ageing', period, '', onError).data ?? [];

  return (
    <div className="space-y-5">
      {toast}
      <BooksHeader
        icon={BookOpenCheck}
        title="Books of accounts"
        subtitle="Tally-style double-entry books kept automatically from invoices, payments, cash handovers, purchases and expenses."
        actions={<PeriodBar value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button onClick={() => onNavigate('purchases')} className="py-3"><ShoppingCart className="h-4 w-4" /> Purchase bill</Button>
        <Button onClick={() => onNavigate('expenses')} className="py-3"><Receipt className="h-4 w-4" /> Expense</Button>
        <Button tone="secondary" onClick={() => onNavigate('vouchers')} className="py-3"><Plus className="h-4 w-4" /> Voucher</Button>
        <Button tone="secondary" onClick={() => onNavigate('ca-pack')} className="py-3"><FileSpreadsheet className="h-4 w-4" /> CA pack</Button>
      </div>

      {!o ? (
        <Empty>Loading books…</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Sales (taxable)" value={money(o.sales)} tone="green" onClick={() => onNavigate('gst')} />
            <Kpi label="Purchases (taxable)" value={money(o.purchases)} tone="blue" onClick={() => onNavigate('purchases')} />
            <Kpi label="Expenses" value={money(o.expenses)} tone="amber" onClick={() => onNavigate('expenses')} />
            <Kpi label="Receipts" value={money(o.receipts)} onClick={() => onNavigate('cash-bank')} />
            <Kpi label="Gross profit" value={money(o.grossProfit)} tone={o.grossProfit < 0 ? 'red' : 'green'} hint="Trading account (after stock)" onClick={() => onNavigate('final')} />
            <Kpi label="Net profit" value={money(o.netProfit)} tone={o.netProfit < 0 ? 'red' : 'green'} onClick={() => onNavigate('final')} />
            <Kpi label="GST payable (cash)" value={money(o.gstPayable)} tone="red" hint="GSTR-3B after ITC set-off" onClick={() => onNavigate('gst')} />
            <Kpi label="Closing stock" value={money(o.closingStock)} hint="Full cylinders at cost" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Cash in hand" value={money(o.cashInHand)} hint="Office + delivery staff" onClick={() => onNavigate('cash-bank')} />
            <Kpi label="Bank" value={money(o.bank)} onClick={() => onNavigate('cash-bank')} />
            <Kpi label="Receivable (debtors)" value={money(o.receivables)} tone="amber" onClick={() => onNavigate('ledgers')} />
            <Kpi label="Payable (creditors)" value={money(o.payables)} tone="red" onClick={() => onNavigate('purchases')} />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3" title="Latest vouchers" actions={<Button size="sm" tone="ghost" onClick={() => onNavigate('vouchers')}>Day book <ArrowRight className="h-3.5 w-3.5" /></Button>}>
          {days.length === 0 ? (
            <Empty>No vouchers in this period.</Empty>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...days].reverse().slice(0, 10).map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <VoucherBadge type={v.voucherType} label={VOUCHER_TYPES[v.voucherType]?.label || v.voucherType} />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{v.partyName || v.narration}</div>
                      <div className="text-[10px] text-slate-400">{v.voucherNumber} · {v.date}{v.cancelled ? ' · cancelled' : ''}</div>
                    </div>
                  </div>
                  <div className={v.cancelled ? 'font-mono line-through text-slate-400' : 'font-mono font-black'}>{money(v.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2" title="Biggest dues" actions={<Wallet className="h-4 w-4 text-slate-400" />}>
          {ageing.length === 0 ? (
            <Empty>No customer dues. 🎉</Empty>
          ) : (
            <div className="divide-y divide-slate-100">
              {ageing.slice(0, 8).map((a) => (
                <div key={a.customerId} className="flex items-center justify-between py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{a.shortName || a.name}</div>
                    {a.d90 + a.d61_90 > 0 && <div className="text-[10px] text-rose-600 font-bold">{money(a.d90 + a.d61_90)} over 60 days</div>}
                  </div>
                  <div className="font-mono font-black">{money(a.balance)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
