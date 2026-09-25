'use client';

import React, { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Card, Empty, useToast } from '../ui';
import { BooksHeader, Kpi, money, PeriodBar, plain, ReportTable, sum, Tabs, useBooksReport, usePeriod } from './shared';

type Tax = { taxable: number; cgst: number; sgst: number; igst: number };
interface B2B extends Tax { gstin: string; receiverName: string; invoiceNumber: string; date: string; invoiceValue: number; placeOfSupply: string; rate: number }
interface B2C extends Tax { type: string; placeOfSupply: string; rate: number }
interface Hsn extends Tax { hsn: string; description: string; uqc: string; qty: number; rate: number; total: number }
interface G1 { gstin: string; b2b: B2B[]; b2c: B2C[]; hsn: Hsn[]; docs: { from: string; to: string; total: number; cancelled: number }; totals: { b2b: Tax; b2c: Tax; all: Tax } }
interface G3 {
  outward: Tax & { cess: number };
  itc: { igst: number; cgst: number; sgst: number };
  ineligibleItc: { igst: number; cgst: number; sgst: number };
  payableInCash: { igst: number; cgst: number; sgst: number };
  carryForward: { igst: number; cgst: number; sgst: number };
  totalPayable: number;
}

const taxCols = <R extends Tax>() => [
  { label: 'Taxable', align: 'right' as const, render: (r: R) => plain(r.taxable), total: (rows: R[]) => plain(sum(rows, (x) => x.taxable)) },
  { label: 'IGST', align: 'right' as const, render: (r: R) => plain(r.igst), total: (rows: R[]) => plain(sum(rows, (x) => x.igst)) },
  { label: 'CGST', align: 'right' as const, render: (r: R) => plain(r.cgst), total: (rows: R[]) => plain(sum(rows, (x) => x.cgst)) },
  { label: 'SGST', align: 'right' as const, render: (r: R) => plain(r.sgst), total: (rows: R[]) => plain(sum(rows, (x) => x.sgst)) },
];

export default function GstPanel() {
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<'gstr1' | 'gstr3b'>('gstr1');
  const [part, setPart] = useState<'b2b' | 'b2c' | 'hsn'>('b2b');
  const [period, setPeriod] = usePeriod('month');
  const onError = (m: string) => showToast(m, 'error');
  const g1 = useBooksReport<G1>(tab === 'gstr1' ? 'gstr1' : null, period, '', onError).data;
  const g3 = useBooksReport<G3>(tab === 'gstr3b' ? 'gstr3b' : null, period, '', onError).data;

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={FileCheck2} title="GST returns" subtitle="GSTR-1 and GSTR-3B figures from the invoices, purchase bills and expenses of the period — ready to key in or hand to your CA." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} items={[['gstr1', 'GSTR-1 (sales)'], ['gstr3b', 'GSTR-3B (summary)']]} />
        <PeriodBar value={period} onChange={setPeriod} />
      </div>

      {tab === 'gstr1' &&
        (!g1 ? (
          <Empty>Loading…</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Taxable value" value={money(g1.totals.all.taxable)} tone="green" />
              <Kpi label="Tax (IGST+CGST+SGST)" value={money(g1.totals.all.igst + g1.totals.all.cgst + g1.totals.all.sgst)} tone="red" />
              <Kpi label="B2B / B2C taxable" value={`${plain(g1.totals.b2b.taxable)} / ${plain(g1.totals.b2c.taxable)}`} />
              <Kpi label="Invoices issued" value={`${g1.docs.total}`} hint={g1.docs.total ? `${g1.docs.from} → ${g1.docs.to} · cancelled ${g1.docs.cancelled}` : undefined} />
            </div>
            <Tabs value={part} onChange={setPart} items={[['b2b', `4A · B2B (${g1.b2b.length})`], ['b2c', `5/7 · B2C (${g1.b2c.length})`], ['hsn', `12 · HSN (${g1.hsn.length})`]]} />
            {part === 'b2b' && (
              <ReportTable
                rows={g1.b2b}
                rowKey={(r, i) => `${r.invoiceNumber}-${r.rate}-${i}`}
                columns={[
                  { label: 'GSTIN', render: (r) => <span className="font-mono">{r.gstin}</span> },
                  { label: 'Receiver', render: (r) => r.receiverName },
                  { label: 'Invoice', render: (r) => <span className="font-mono font-bold">{r.invoiceNumber}</span> },
                  { label: 'Date', render: (r) => r.date },
                  { label: 'Value', align: 'right', render: (r) => plain(r.invoiceValue) },
                  { label: 'Place of supply', render: (r) => r.placeOfSupply },
                  { label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
                  ...taxCols<B2B>(),
                ]}
              />
            )}
            {part === 'b2c' && (
              <ReportTable
                rows={g1.b2c}
                rowKey={(r, i) => `${r.placeOfSupply}-${r.rate}-${i}`}
                columns={[
                  { label: 'Type', render: (r) => r.type },
                  { label: 'Place of supply', render: (r) => r.placeOfSupply },
                  { label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
                  ...taxCols<B2C>(),
                ]}
              />
            )}
            {part === 'hsn' && (
              <ReportTable
                rows={g1.hsn}
                rowKey={(r) => `${r.hsn}-${r.rate}`}
                columns={[
                  { label: 'HSN', render: (r) => <span className="font-mono font-bold">{r.hsn}</span> },
                  { label: 'Description', render: (r) => r.description },
                  { label: 'UQC', render: (r) => r.uqc },
                  { label: 'Qty', align: 'right', render: (r) => r.qty, total: (rows) => sum(rows, (x) => x.qty) },
                  { label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
                  { label: 'Total value', align: 'right', render: (r) => plain(r.total), total: (rows) => plain(sum(rows, (x) => x.total)) },
                  ...taxCols<Hsn>(),
                ]}
              />
            )}
          </>
        ))}

      {tab === 'gstr3b' &&
        (!g3 ? (
          <Empty>Loading…</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Output tax" value={money(g3.outward.igst + g3.outward.cgst + g3.outward.sgst)} tone="red" />
              <Kpi label="Input tax credit" value={money(g3.itc.igst + g3.itc.cgst + g3.itc.sgst)} tone="green" />
              <Kpi label="Pay in cash" value={money(g3.totalPayable)} tone="red" hint="After IGST → CGST/SGST set-off" />
              <Kpi label="ITC carried forward" value={money(g3.carryForward.igst + g3.carryForward.cgst + g3.carryForward.sgst)} tone="blue" />
            </div>
            <Card>
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-2 text-left">GSTR-3B table</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">Integrated</th>
                    <th className="p-2 text-right">Central</th>
                    <th className="p-2 text-right">State/UT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {[
                    ['3.1 (a) Outward taxable supplies', g3.outward.taxable, g3.outward],
                    ['4 (A)(5) All other ITC', null, g3.itc],
                    ['4 (B) ITC not claimed', null, g3.ineligibleItc],
                    ['6.1 Tax payable in cash', null, g3.payableInCash],
                    ['ITC carried forward', null, g3.carryForward],
                  ].map(([label, taxable, t]) => {
                    const x = t as { igst: number; cgst: number; sgst: number };
                    return (
                      <tr key={label as string} className={(label as string).startsWith('6.1') ? 'bg-rose-50 font-black' : ''}>
                        <td className="p-2 font-sans font-bold">{label as string}</td>
                        <td className="p-2 text-right">{taxable == null ? '' : plain(taxable as number)}</td>
                        <td className="p-2 text-right">{plain(x.igst)}</td>
                        <td className="p-2 text-right">{plain(x.cgst)}</td>
                        <td className="p-2 text-right">{plain(x.sgst)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-slate-500">ITC comes from purchase bills marked “claim ITC” and expenses with a supplier GSTIN. Check it against your GSTR-2B before filing.</p>
            </Card>
          </>
        ))}
    </div>
  );
}
