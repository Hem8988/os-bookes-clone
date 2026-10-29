'use client';

import React, { useState } from 'react';
import { X, Printer, MessageSquare, Phone, MapPin, RefreshCw } from 'lucide-react';
import { inr } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { useCompany } from '../lib/useCompany';
import { Customer } from '../lib/types';
import { Paged } from './ui';
import { EmptyLedger, type EmptyLedgerMove } from './EmptyLedger';
import { DepositReceiptModal, type DepositVoucherView } from './DepositReceiptModal';

const MODE_LABEL: Record<string, string> = { CASH: 'Cash', BANK: 'Bank', UPI: 'UPI', CHEQUE: 'Cheque', OPENING: 'Old deposit' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Held', REFUNDED: 'Refunded', ADJUSTED: 'Adjusted in dues', TRANSFERRED: 'Transferred', CANCELLED: 'Cancelled' };

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
  const [tab, setTab] = useState<'LEDGER' | 'CYLINDERS' | 'DEPOSIT'>('LEDGER');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const customerId = isOpen && customer ? customer.id : null;
  const ledgerQ = useApiData<{ customer: { balance: number } | null; entries: LedgerRow[] }>(customerId ? `/api/financial/ledger?customerId=${customerId}` : null);
  const cylinderQ = useApiData<{ balances: CylinderRow[]; history: EmptyLedgerMove[] }>(customerId ? `/api/cylinder/ledger?customerId=${customerId}` : null);
  const depositQ = useApiData<DepositVoucherView[]>(customerId ? `/api/cylinder/vouchers?customerId=${customerId}` : null);
  const entries = ledgerQ.data?.entries ?? [];
  const deposits = (depositQ.data ?? []).filter((v) => v.status !== 'CANCELLED');
  const balance = ledgerQ.data?.customer?.balance ?? 0;
  const cylinders = cylinderQ.data?.balances ?? [];
  const cylinderHistory = cylinderQ.data?.history ?? [];
  const loading = (ledgerQ.loading && !ledgerQ.data) || (cylinderQ.loading && !cylinderQ.data);
  const error = ledgerQ.error || cylinderQ.error || null;
  const load = () => {
    ledgerQ.reload();
    cylinderQ.reload();
    depositQ.reload();
  };

  if (!isOpen || !customer) return null;

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  // Refundable security deposit: kept apart from the outstanding.
  const held = deposits.filter((v) => v.status === 'ACTIVE' || v.status === 'TRANSFERRED');
  const depositHeld = held.reduce((s, v) => s + v.depositAmount, 0);
  const cylindersOnDeposit = held.reduce((s, v) => s + v.cylinderQty, 0);
  const pendingLines = (customer.depositLines || []).filter((l) => l.qty > 0 && (l.status || 'Pending') === 'Pending' && l.fee > 0);
  const depositPending = pendingLines.reduce((s, l) => s + l.fee * l.qty, 0);
  // Deposit received / refunded, merged into the statement by date with a running "deposit held".
  const depositRows = deposits
    .flatMap((v) => [
      { key: `${v.id}:in`, date: v.issueDate, v, refund: false, adjusted: false },
      // Adjusted: the credit itself is the ledger line above; this row only takes it out of "deposit held".
      ...(v.status === 'REFUNDED' || v.status === 'ADJUSTED' ? [{ key: `${v.id}:out`, date: v.closedOn || v.issueDate, v, refund: true, adjusted: v.status === 'ADJUSTED' }] : []),
    ])
    .sort((a, b) => a.date.localeCompare(b.date));
  const depositEvents: ((typeof depositRows)[number] & { kind: 'deposit'; held: number })[] = [];
  for (const d of depositRows) {
    const before = depositEvents.length ? depositEvents[depositEvents.length - 1].held : 0;
    depositEvents.push({ ...d, kind: 'deposit', held: before + (d.refund ? -d.v.depositAmount : d.v.depositAmount) });
  }
  const ledgerRows: ({ kind: 'entry'; e: LedgerRow } | (typeof depositEvents)[number])[] = [];
  let di = 0;
  for (const e of entries) {
    while (di < depositEvents.length && depositEvents[di].date <= e.date) ledgerRows.push(depositEvents[di++]);
    ledgerRows.push({ kind: 'entry', e });
  }
  ledgerRows.push(...depositEvents.slice(di));
  const shareText = encodeURIComponent(
    `${company.name}\nStatement for ${customer.name}\nBilled: ${inr(totalDebit)}\nReceived: ${inr(totalCredit)}\nOutstanding: ${inr(balance)}\n${depositHeld ? `Security deposit held: ${inr(depositHeld)} (refundable)\n` : ''}${cylinders.map((c) => `${c.productName}: ${c.currentBalance} cylinders with you`).join('\n')}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-center items-stretch p-0">
      <div className="w-full bg-white shadow-2xl overflow-hidden flex flex-col max-w-none h-full rounded-none">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Kpi label="Total billed" value={inr(totalDebit)} />
            <Kpi label="Total received" value={inr(totalCredit)} />
            <Kpi label="Outstanding" value={inr(balance)} tone={balance > 0 ? 'text-rose-600' : 'text-emerald-600'} />
            <Kpi label="Credit limit" value={customer.creditLimit ? inr(customer.creditLimit) : 'No limit'} />
            <Kpi
              label="Security deposit"
              value={inr(depositHeld)}
              tone="text-teal-700"
              note={depositPending ? `${inr(depositPending)} pending` : cylindersOnDeposit ? `${cylindersOnDeposit} cylinders · refundable` : 'Refundable'}
              noteTone={depositPending ? 'text-orange-600' : 'text-slate-500'}
            />
          </div>

          <div className="print:hidden flex gap-2">
            {(['LEDGER', 'CYLINDERS', 'DEPOSIT'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg font-bold ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {t === 'LEDGER' ? 'Account ledger' : t === 'CYLINDERS' ? 'Empty cylinder ledger' : 'Security deposit'}
              </button>
            ))}
          </div>

          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 font-semibold">{error}</div>}
          {loading && <div className="text-slate-500">Loading…</div>}

          {tab === 'LEDGER' && !loading && (
            <Paged rows={ledgerRows} size={50}>{(pageRows) => (<table className="w-full border border-slate-200">
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
                {entries.length === 0 && depositRows.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-400">No ledger entries yet.</td></tr>
                )}
                {pageRows.map((r) =>
                  r.kind === 'entry' ? (
                    <tr key={r.e.id}>
                      <td className="p-2 font-mono">{r.e.date}</td>
                      <td className="p-2 font-mono">{r.e.voucherNumber}<div className="text-[10px] text-slate-400">{r.e.entryType}</div></td>
                      <td className="p-2">{r.e.particulars}</td>
                      <td className="p-2 text-right font-mono">{r.e.debit ? inr(r.e.debit) : ''}</td>
                      <td className="p-2 text-right font-mono text-emerald-700">{r.e.credit ? inr(r.e.credit) : ''}</td>
                      <td className="p-2 text-right font-mono font-bold">{inr(r.e.balance)}</td>
                    </tr>
                  ) : (
                    // Security deposit: shown in the statement, but refundable — it does not move the balance.
                    <tr key={r.key} className="bg-teal-50/60">
                      <td className="p-2 font-mono">{r.date}</td>
                      <td className="p-2 font-mono">{r.v.voucherNumber}<div className="text-[10px] text-teal-700">{r.adjusted ? 'DEPOSIT ADJUSTED' : r.refund ? 'DEPOSIT REFUND' : 'SECURITY DEPOSIT'}</div></td>
                      <td className="p-2">
                        {r.adjusted ? 'Security deposit adjusted against dues (see its credit entry)' : r.refund ? 'Security deposit refunded' : 'Cylinder security deposit received'} — {r.v.cylinderQty} × {r.v.productName || 'cylinder'}
                        {r.v.svNumber ? ` · SV ${r.v.svNumber}` : ''}
                        {!r.refund && r.v.paymentMode ? ` · ${MODE_LABEL[r.v.paymentMode] || r.v.paymentMode}` : ''}
                        <div className="text-[10px] text-slate-500">Refundable deposit — not part of the outstanding</div>
                      </td>
                      <td className="p-2 text-right font-mono text-teal-700">{r.refund && !r.adjusted ? inr(r.v.depositAmount) : ''}</td>
                      <td className="p-2 text-right font-mono text-teal-700">{r.refund ? '' : r.v.depositAmount ? inr(r.v.depositAmount) : 'Free'}</td>
                      <td className="p-2 text-right text-[10px] font-bold text-teal-700">Deposit {inr(r.held)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>)}</Paged>
          )}

          {tab === 'LEDGER' && !loading && (depositHeld > 0 || depositPending > 0) && (
            <p className="text-[11px] text-slate-500">
              Cylinder security deposit
              {depositHeld ? <> of <b className="text-teal-700">{inr(depositHeld)}</b> is held</> : null}
              {depositPending ? <>{depositHeld ? ',' : ''} <b className="text-orange-600">{inr(depositPending)}</b> still pending</> : null}
              {' '}— refundable, so it is kept out of the outstanding. See the{' '}
              <button className="font-bold text-teal-700 underline cursor-pointer" onClick={() => setTab('DEPOSIT')}>Security deposit</button> tab.
            </p>
          )}

          {tab === 'DEPOSIT' && !loading && (
            <div className="space-y-2">
              <table className="w-full border border-slate-200">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Voucher</th>
                    <th className="p-2 text-left">Cylinder</th>
                    <th className="p-2 text-right">Cylinders</th>
                    <th className="p-2 text-right">Deposit</th>
                    <th className="p-2 text-left">Received by</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deposits.length === 0 && !pendingLines.length && <tr><td colSpan={7} className="p-4 text-center text-slate-400">No security deposit recorded.</td></tr>}
                  {deposits.map((v) => (
                    <tr key={v.id}>
                      <td className="p-2 font-mono">{v.issueDate}</td>
                      <td className="p-2 font-mono">{v.voucherNumber}{v.svNumber && <div className="text-[10px] text-indigo-700">{v.svNumber}</div>}</td>
                      <td className="p-2">{v.productName || 'Cylinder'}</td>
                      <td className="p-2 text-right font-bold">{v.cylinderQty}</td>
                      <td className="p-2 text-right font-mono">{v.depositAmount ? inr(v.depositAmount) : 'Free'}</td>
                      <td className="p-2">{v.paymentMode ? MODE_LABEL[v.paymentMode] || v.paymentMode : '—'}</td>
                      <td className={`p-2 font-bold ${v.status === 'ACTIVE' ? 'text-teal-700' : 'text-slate-500'}`}>
                        {STATUS_LABEL[v.status] || v.status}
                        {v.closedOn ? <span className="font-normal"> · {v.closedOn}</span> : null}
                      </td>
                    </tr>
                  ))}
                  {pendingLines.length > 0 && (
                    <tr className="bg-orange-50/60">
                      <td className="p-2 text-orange-700 font-bold" colSpan={3}>Pending — not received yet</td>
                      <td className="p-2 text-right font-bold">{pendingLines.reduce((s, l) => s + l.qty, 0)}</td>
                      <td className="p-2 text-right font-mono font-bold text-orange-700">{inr(depositPending)}</td>
                      <td className="p-2 text-[11px] text-slate-500" colSpan={2}>Mark it Paid on the customer form when collected</td>
                    </tr>
                  )}
                </tbody>
                {deposits.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-black">
                      <td className="p-2" colSpan={3}>Deposit held</td>
                      <td className="p-2 text-right">{cylindersOnDeposit}</td>
                      <td className="p-2 text-right font-mono text-teal-700">{inr(depositHeld)}</td>
                      <td className="p-2" colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
              {deposits.length > 0 && (
                <div className="print:hidden flex justify-end">
                  <button onClick={() => setReceiptOpen(true)} className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Printer className="h-4 w-4" /> Deposit receipt
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'CYLINDERS' && !loading && <EmptyLedger balances={cylinders} history={cylinderHistory} />}
        </div>
      </div>
      {receiptOpen && <DepositReceiptModal customerId={customer.id} onClose={() => setReceiptOpen(false)} />}
    </div>
  );
};

const Kpi = ({ label, value, tone = 'text-slate-900', note, noteTone = 'text-slate-500' }: { label: string; value: string; tone?: string; note?: string; noteTone?: string }) => (
  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
    <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
    <div className={`text-base font-black ${tone}`}>{value}</div>
    {note && <div className={`text-[10px] font-bold ${noteTone}`}>{note}</div>}
  </div>
);
