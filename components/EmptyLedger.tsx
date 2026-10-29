'use client';

import React, { useMemo, useState } from 'react';
import { Paged, cx } from './ui';

// Empty cylinder ledger of one customer: per cylinder type, the opening count, every
// delivery (full given, empties taken back), adjustments and the running balance of
// our cylinders still with the customer — like the paper empty-cylinder register.

export interface EmptyLedgerBalance {
  productName: string;
  openingQty: number;
  deliveredQtyTotal: number;
  emptyReceivedTotal: number;
  adjustmentQty: number;
  currentBalance: number;
}

export interface EmptyLedgerMove {
  id: string;
  date: string;
  type: string; // SALE | EMPTY_RETURN | ADJUSTMENT | REVERSAL
  productName: string;
  full: number;
  empty: number;
  change: number;
  balance: number;
  reference: string | null;
  reason: string | null;
  by: string;
}

interface Row {
  key: string;
  date: string | null;
  reference: string;
  productName: string;
  given: number;
  taken: number;
  adjust: number;
  balance: number;
  note: string;
}

const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function EmptyLedger({ balances, history }: { balances: EmptyLedgerBalance[]; history: EmptyLedgerMove[] }) {
  const products = balances.map((b) => b.productName);
  const [product, setProduct] = useState<string>('');

  const rows = useMemo(() => {
    const list: Row[] = [];
    // Opening first, then the moves oldest first (the API sends newest first).
    for (const b of balances) {
      if (product && b.productName !== product) continue;
      list.push({ key: `open-${b.productName}`, date: null, reference: 'Opening', productName: b.productName, given: 0, taken: 0, adjust: 0, balance: b.openingQty, note: 'Cylinders with the customer when they joined' });
    }
    for (const m of [...history].reverse()) {
      if (product && m.productName !== product) continue;
      // A delivery writes "full given" and "empties taken" as two moves; show them on one line.
      const prev = list[list.length - 1];
      const sameDelivery = prev && prev.reference === (m.reference || '') && prev.productName === m.productName && prev.date && day(prev.date) === day(m.date) && m.type === 'EMPTY_RETURN' && prev.taken === 0;
      if (sameDelivery) {
        prev.taken = m.empty;
        prev.balance = m.balance;
        continue;
      }
      list.push({
        key: m.id,
        date: m.date,
        reference: m.reference || '—',
        productName: m.productName,
        given: m.type === 'SALE' ? m.full : 0,
        taken: m.type === 'EMPTY_RETURN' ? m.empty : 0,
        adjust: m.type === 'ADJUSTMENT' || m.type === 'REVERSAL' ? m.change : 0,
        balance: m.balance,
        note: m.type === 'REVERSAL' ? `Correction · ${m.reason || ''}` : m.type === 'ADJUSTMENT' ? m.reason || 'Adjustment' : `by ${m.by}`,
      });
    }
    return list;
  }, [balances, history, product]);

  const shown = product ? balances.filter((b) => b.productName === product) : balances;
  const totals = {
    opening: shown.reduce((s, b) => s + b.openingQty, 0),
    given: shown.reduce((s, b) => s + b.deliveredQtyTotal, 0),
    taken: shown.reduce((s, b) => s + b.emptyReceivedTotal, 0),
    adjust: shown.reduce((s, b) => s + b.adjustmentQty, 0),
    now: shown.reduce((s, b) => s + b.currentBalance, 0),
  };

  if (!balances.length) return <p className="p-4 text-center text-slate-400">No cylinders recorded for this customer yet.</p>;

  return (
    <div className="space-y-3">
      {/* What is with the customer now, per cylinder type — click to filter the statement. */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {products.length > 1 && (
          <button onClick={() => setProduct('')} className={cx('rounded-xl border px-3 py-2 text-left', !product ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}>
            <div className="text-[10px] font-bold uppercase text-slate-500">All cylinders</div>
            <div className="text-base font-black">{balances.reduce((s, b) => s + b.currentBalance, 0)} with customer</div>
          </button>
        )}
        {balances.map((b) => (
          <button key={b.productName} onClick={() => setProduct(product === b.productName ? '' : b.productName)} className={cx('rounded-xl border px-3 py-2 text-left', product === b.productName ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}>
            <div className="text-[10px] font-bold uppercase text-slate-500">{b.productName}</div>
            <div className={cx('text-base font-black', b.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700')}>{b.currentBalance} with customer</div>
          </button>
        ))}
      </div>

      <Paged rows={rows} size={50}>
        {(pageRows) => (
          <table className="w-full border border-slate-200">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Delivery / ref</th>
                <th className="p-2 text-left">Cylinder</th>
                <th className="p-2 text-right">Full given</th>
                <th className="p-2 text-right">Empty taken back</th>
                <th className="p-2 text-right">Adjustment</th>
                <th className="p-2 text-right">With customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((r) => (
                <tr key={r.key} className={r.date ? '' : 'bg-slate-50/70'}>
                  <td className="p-2 font-mono whitespace-nowrap">{r.date ? day(r.date) : '—'}</td>
                  <td className="p-2">
                    <span className="font-mono font-bold">{r.reference}</span>
                    <div className="text-[10px] text-slate-400">{r.note}</div>
                  </td>
                  <td className="p-2">{r.productName}</td>
                  <td className="p-2 text-right font-mono">{r.given ? `+${r.given}` : ''}</td>
                  <td className="p-2 text-right font-mono text-emerald-700">{r.taken ? `−${r.taken}` : ''}</td>
                  <td className="p-2 text-right font-mono">{r.adjust ? (r.adjust > 0 ? `+${r.adjust}` : `−${-r.adjust}`) : ''}</td>
                  <td className="p-2 text-right font-mono font-black">{r.balance}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-black">
                <td className="p-2" colSpan={3}>
                  Total{product ? ` · ${product}` : ''} <span className="font-normal text-slate-500">(opening {totals.opening})</span>
                </td>
                <td className="p-2 text-right font-mono">{totals.given ? `+${totals.given}` : ''}</td>
                <td className="p-2 text-right font-mono text-emerald-700">{totals.taken ? `−${totals.taken}` : ''}</td>
                <td className="p-2 text-right font-mono">{totals.adjust ? (totals.adjust > 0 ? `+${totals.adjust}` : `−${-totals.adjust}`) : ''}</td>
                <td className="p-2 text-right font-mono">{totals.now}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Paged>
    </div>
  );
}
