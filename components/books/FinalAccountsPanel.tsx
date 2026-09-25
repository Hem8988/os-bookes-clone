'use client';

import React, { useState } from 'react';
import { AlertTriangle, Printer, Scale } from 'lucide-react';
import { Button, Card, Empty, useToast } from '../ui';
import { BooksHeader, PeriodBar, plain, Tabs, useBooksReport, usePeriod } from './shared';

interface TbAccount { id: string; name: string; closing: number }
interface TB { from: string; to: string; openingStock: number; groups: { group: string; nature: string; accounts: TbAccount[]; closing: number }[]; totalDr: number; totalCr: number; openingDifference: number }
interface Line { id: string; name: string; group: string; amount: number }
interface PL {
  trading: { openingStock: number; purchases: Line[]; directExpenses: Line[]; sales: Line[]; directIncome: Line[]; closingStock: number; grossProfit: number };
  indirectIncome: Line[];
  indirectExpenses: Line[];
  grossProfit: number;
  netProfit: number;
}
interface BSGroup { group: string; accounts: { id: string; name: string; amount: number }[]; amount: number }
interface BS { asOf: string; fyFrom: string; liabilities: BSGroup[]; profitThisYear: number; profitEarlier: number; assets: BSGroup[]; liabilitiesTotal: number; assetsTotal: number; openingDifference: number }

type Row = { label: string; amount?: number; bold?: boolean; indent?: boolean };

function Side({ title, rows, total }: { title: string; rows: Row[]; total?: Row }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 bg-slate-900 text-white text-xs font-black flex justify-between"><span>{title}</span><span>₹</span></div>
      <div className="flex-1 divide-y divide-slate-100">
        {rows.map((r, i) => (
          <div key={i} className={`flex justify-between gap-3 px-3 py-1.5 text-xs ${r.bold ? 'font-black bg-slate-50' : ''}`}>
            <span className={r.indent ? 'pl-4 text-slate-600' : ''}>{r.label}</span>
            <span className="font-mono tabular-nums">{r.amount === undefined ? '' : plain(r.amount)}</span>
          </div>
        ))}
      </div>
      {total && (
        <div className="flex justify-between px-3 py-2 text-sm font-black border-t-2 border-slate-900 bg-slate-100">
          <span>{total.label}</span>
          <span className="font-mono">{plain(total.amount)}</span>
        </div>
      )}
    </div>
  );
}

/** Tally-style two-sided statement; the last "Total" row of each side is its footer. */
function TwoSided({ leftTitle, rightTitle, left, right }: { leftTitle: string; rightTitle: string; left: Row[]; right: Row[] }) {
  const split = (rows: Row[]) => {
    const total = [...rows].reverse().find((r) => r.bold && r.label === 'Total');
    return { body: rows.filter((r) => r !== total), total };
  };
  const l = split(left);
  const r = split(right);
  return (
    <div className="grid md:grid-cols-2 border border-slate-300 rounded-xl overflow-hidden bg-white divide-y md:divide-y-0 md:divide-x divide-slate-300">
      <Side title={leftTitle} rows={l.body} total={l.total} />
      <Side title={rightTitle} rows={r.body} total={r.total} />
    </div>
  );
}

export default function FinalAccountsPanel() {
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<'tb' | 'pl' | 'bs'>('pl');
  const [period, setPeriod] = usePeriod('fy');
  const onError = (m: string) => showToast(m, 'error');
  const tb = useBooksReport<TB>(tab === 'tb' ? 'trial-balance' : null, period, '', onError).data;
  const pl = useBooksReport<PL>(tab === 'pl' ? 'pl' : null, period, '', onError).data;
  const bs = useBooksReport<BS>(tab === 'bs' ? 'balance-sheet' : null, period, '', onError).data;

  const plView = () => {
    if (!pl) return <Empty>Loading…</Empty>;
    const t = pl.trading;
    const gp = t.grossProfit;
    const tradingDr: Row[] = [
      { label: 'Opening stock', amount: t.openingStock },
      ...(t.purchases.length ? [{ label: 'Purchase accounts', bold: true } as Row, ...t.purchases.map((x) => ({ label: x.name, amount: x.amount, indent: true }))] : []),
      ...(t.directExpenses.length ? [{ label: 'Direct expenses', bold: true } as Row, ...t.directExpenses.map((x) => ({ label: x.name, amount: x.amount, indent: true }))] : []),
      ...(gp >= 0 ? [{ label: 'Gross profit c/o', amount: gp, bold: true }] : []),
    ];
    const tradingCr: Row[] = [
      { label: 'Sales accounts', bold: true },
      ...t.sales.map((x) => ({ label: x.name, amount: x.amount, indent: true })),
      ...(t.directIncome.length ? [{ label: 'Direct incomes', bold: true } as Row, ...t.directIncome.map((x) => ({ label: x.name, amount: x.amount, indent: true }))] : []),
      { label: 'Closing stock', amount: t.closingStock },
      ...(gp < 0 ? [{ label: 'Gross loss c/o', amount: -gp, bold: true }] : []),
    ];
    const sumRows = (rows: Row[]) => rows.filter((r) => !r.bold || r.amount !== undefined).reduce((s, r) => s + (r.amount || 0), 0);
    const tradingTotal = Math.max(sumRows(tradingDr), sumRows(tradingCr));
    const np = pl.netProfit;
    const plDr: Row[] = [
      ...(gp < 0 ? [{ label: 'Gross loss b/f', amount: -gp }] : []),
      { label: 'Indirect expenses', bold: true },
      ...pl.indirectExpenses.map((x) => ({ label: x.name, amount: x.amount, indent: true })),
      ...(np >= 0 ? [{ label: 'Net profit', amount: np, bold: true }] : []),
    ];
    const plCr: Row[] = [
      ...(gp >= 0 ? [{ label: 'Gross profit b/f', amount: gp }] : []),
      ...(pl.indirectIncome.length ? [{ label: 'Indirect incomes', bold: true } as Row, ...pl.indirectIncome.map((x) => ({ label: x.name, amount: x.amount, indent: true }))] : []),
      ...(np < 0 ? [{ label: 'Net loss', amount: -np, bold: true }] : []),
    ];
    const plTotal = Math.max(sumRows(plDr), sumRows(plCr));
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-2xl text-white flex flex-wrap items-center justify-between gap-2 ${np >= 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-rose-600 to-red-700'}`}>
          <div>
            <div className="text-[11px] font-bold uppercase opacity-80">{np >= 0 ? 'Net profit' : 'Net loss'} · {period.from} to {period.to}</div>
            <div className="text-2xl font-black font-mono">₹{plain(Math.abs(np))}</div>
          </div>
          <div className="text-right text-xs">
            <div>Gross {gp >= 0 ? 'profit' : 'loss'} ₹{plain(Math.abs(gp))}</div>
            <div className="opacity-80">Stock valued at cost</div>
          </div>
        </div>
        <TwoSided leftTitle="Trading A/c — Dr" rightTitle="Cr" left={[...tradingDr, { label: 'Total', amount: tradingTotal, bold: true }]} right={[...tradingCr, { label: 'Total', amount: tradingTotal, bold: true }]} />
        <TwoSided leftTitle="Profit & Loss A/c — Dr" rightTitle="Cr" left={[...plDr, { label: 'Total', amount: plTotal, bold: true }]} right={[...plCr, { label: 'Total', amount: plTotal, bold: true }]} />
      </div>
    );
  };

  const bsView = () => {
    if (!bs) return <Empty>Loading…</Empty>;
    const liab: Row[] = [
      ...bs.liabilities.flatMap((g) => [{ label: g.group, amount: g.amount, bold: true }, ...g.accounts.map((a) => ({ label: a.name, amount: a.amount, indent: true }))]),
      { label: 'Profit & loss A/c', bold: true, amount: bs.profitThisYear + bs.profitEarlier },
      ...(bs.profitEarlier ? [{ label: 'Opening balance', amount: bs.profitEarlier, indent: true }] : []),
      { label: 'Current period', amount: bs.profitThisYear, indent: true },
      ...(bs.openingDifference > 0 ? [{ label: 'Difference in opening balances', amount: bs.openingDifference, bold: true }] : []),
      { label: 'Total', amount: bs.liabilitiesTotal + Math.max(bs.openingDifference, 0), bold: true },
    ];
    const assets: Row[] = [
      ...bs.assets.flatMap((g) => [{ label: g.group, amount: g.amount, bold: true }, ...g.accounts.map((a) => ({ label: a.name, amount: a.amount, indent: true }))]),
      ...(bs.openingDifference < 0 ? [{ label: 'Difference in opening balances', amount: -bs.openingDifference, bold: true }] : []),
      { label: 'Total', amount: bs.assetsTotal + Math.max(-bs.openingDifference, 0), bold: true },
    ];
    return (
      <div className="space-y-3">
        {bs.openingDifference !== 0 && <OpeningHint amount={bs.openingDifference} />}
        <TwoSided leftTitle={`Liabilities · as on ${bs.asOf}`} rightTitle="Assets" left={liab} right={assets} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Scale} title="Final accounts" subtitle="Trial balance, profit & loss (with trading account) and balance sheet — straight from the vouchers." actions={<Button tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Tabs value={tab} onChange={setTab} items={[['pl', 'Profit & loss'], ['bs', 'Balance sheet'], ['tb', 'Trial balance']]} />
        <PeriodBar value={period} onChange={setPeriod} single={tab === 'bs'} />
      </div>
      {tab === 'pl' && plView()}
      {tab === 'bs' && bsView()}
      {tab === 'tb' &&
        (!tb ? (
          <Empty>Loading…</Empty>
        ) : (
          <Card>
            {tb.openingDifference !== 0 && <OpeningHint amount={tb.openingDifference} />}
            <table className="w-full text-xs mt-2">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2 text-left">Particulars</th>
                  <th className="p-2 text-right w-40">Debit</th>
                  <th className="p-2 text-right w-40">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tb.openingStock > 0 && (
                  <tr className="font-black bg-slate-50">
                    <td className="p-2">Opening stock</td>
                    <td className="p-2 text-right font-mono">{plain(tb.openingStock)}</td>
                    <td />
                  </tr>
                )}
                {tb.groups.map((g) => (
                  <React.Fragment key={g.group}>
                    <tr className="font-black bg-slate-50">
                      <td className="p-2">{g.group}</td>
                      <td className="p-2 text-right font-mono">{g.closing > 0 ? plain(g.closing) : ''}</td>
                      <td className="p-2 text-right font-mono">{g.closing < 0 ? plain(-g.closing) : ''}</td>
                    </tr>
                    {g.accounts.map((a) => (
                      <tr key={a.id} className="text-slate-600">
                        <td className="p-2 pl-6">{a.name}</td>
                        <td className="p-2 text-right font-mono">{a.closing > 0 ? plain(a.closing) : ''}</td>
                        <td className="p-2 text-right font-mono">{a.closing < 0 ? plain(-a.closing) : ''}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {tb.openingDifference !== 0 && (
                  <tr className="italic text-amber-700">
                    <td className="p-2">Difference in opening balances</td>
                    <td className="p-2 text-right font-mono">{tb.openingDifference < 0 ? plain(-tb.openingDifference) : ''}</td>
                    <td className="p-2 text-right font-mono">{tb.openingDifference > 0 ? plain(tb.openingDifference) : ''}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900">
                <tr>
                  <td className="p-2">Grand total</td>
                  <td className="p-2 text-right font-mono">{plain(Math.max(tb.totalDr, tb.totalCr))}</td>
                  <td className="p-2 text-right font-mono">{plain(Math.max(tb.totalDr, tb.totalCr))}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        ))}
    </div>
  );
}

function OpeningHint({ amount }: { amount: number }) {
  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <strong>Difference in opening balances: ₹{plain(Math.abs(amount))}.</strong> Customer dues and stock brought forward have no matching opening entry yet. Open <em>Books → Ledgers</em> and enter the opening balances of Capital, bank, loans and fixed assets (as on the day you start) — the difference clears when the books match your last balance sheet, exactly as in Tally.
      </div>
    </div>
  );
}
