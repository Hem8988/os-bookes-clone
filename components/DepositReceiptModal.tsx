'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { useCompany } from '../lib/useCompany';
import { amountInWords } from '../lib/gst';

// Cylinder security deposit receipt: what the customer was given (cylinder
// type × count), the refundable deposit taken for each, and the SV / TV
// voucher numbers — printed in the same A4 style as the tax invoice.

export interface DepositVoucherView {
  id: string;
  voucherNumber: string;
  voucherType: string;
  svNumber: string | null;
  productName: string | null;
  cylinderQty: number;
  regulatorQty: number;
  depositAmount: number;
  issueDate: string;
  status: string;
  paymentMode: string | null;
  closedOn: string | null;
  customer: { name: string; shortName: string | null; customerCode: string; phone?: string; address?: string; city?: string | null; state?: string | null; pincode?: string | null; gstin?: string | null };
}

const MODE_LABEL: Record<string, string> = { CASH: 'Cash', BANK: 'Bank transfer', UPI: 'UPI', CHEQUE: 'Cheque', OPENING: 'Old deposit (taken earlier)' };
const money = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (d?: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || '');

/** Opens for a customer (all their live deposits) or for given vouchers only. */
export function DepositReceiptModal({ customerId, voucherIds, onClose }: { customerId: string | null; voucherIds?: string[]; onClose: () => void }) {
  const company = useCompany();
  const [rows, setRows] = useState<DepositVoucherView[] | null>(null);
  const [error, setError] = useState('');
  const idsKey = (voucherIds || []).join(',');

  useEffect(() => {
    if (!customerId) return;
    let alive = true;
    fetch(`/api/cylinder/vouchers?customerId=${encodeURIComponent(customerId)}`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j?.success) return setError(j?.error || 'Could not load the deposit.');
        const ids = idsKey ? idsKey.split(',') : null;
        const list = (j.data as DepositVoucherView[]).filter((v) => (ids ? ids.includes(v.id) : v.status !== 'CANCELLED'));
        setRows(list.sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.voucherNumber.localeCompare(b.voucherNumber)));
      })
      .catch(() => alive && setError('Could not load the deposit.'));
    return () => {
      alive = false;
    };
  }, [customerId, idsKey]);

  if (!customerId) return null;
  const c = rows?.[0]?.customer;
  const held = (rows || []).filter((v) => v.status === 'ACTIVE' || v.status === 'TRANSFERRED');
  const total = held.reduce((sum, v) => sum + v.depositAmount, 0);
  const cylinders = held.reduce((sum, v) => sum + v.cylinderQty, 0);
  const regulators = held.reduce((sum, v) => sum + v.regulatorQty, 0);
  const date = rows?.length ? rows[rows.length - 1].issueDate : '';
  const modes = [...new Set(held.map((v) => v.paymentMode).filter(Boolean) as string[])].map((m) => MODE_LABEL[m] || m).join(', ');
  const firm = (company.legalName || company.name).toUpperCase();
  const cell = 'border-r border-black px-1.5 py-1 align-top';
  const head = 'border-r border-b border-black px-1.5 py-1 font-bold text-left';

  const modal = (
    <div className="invoice-print-root fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center overflow-y-auto print:static print:block print:bg-white print:p-0 print:overflow-visible print:backdrop-blur-none items-stretch p-0">
      <div className="w-full bg-white text-black shadow-2xl overflow-hidden flex flex-col print:max-h-none print:rounded-none print:shadow-none print:overflow-visible print:max-w-none max-w-none h-full rounded-none">
        <div className="print:hidden flex items-center justify-between px-5 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">Cylinder deposit receipt{c ? ` — ${c.name}` : ''}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={!rows?.length} onClick={() => window.print()} className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {error ? (
            <p className="p-6 text-center text-sm font-bold text-rose-600">{error}</p>
          ) : !rows ? (
            <p className="p-6 text-center text-sm text-slate-500">Loading…</p>
          ) : !rows.length || !c ? (
            <p className="p-6 text-center text-sm text-slate-600">No deposit recorded for this customer yet. Mark a cylinder&apos;s deposit as <b>Paid</b> (or Free) on the customer form and save.</p>
          ) : (
            <div id="printable-invoice" className="relative mx-auto bg-white border border-black text-[11px] leading-snug font-sans text-black" style={{ width: '100%', maxWidth: 800 }}>
              {/* Title + firm */}
              <div className="relative px-2 pt-1 text-center">
                <div className="font-serif font-bold text-base tracking-wide">CYLINDER SECURITY DEPOSIT RECEIPT</div>
                <div className="absolute right-2 top-1 font-serif font-bold text-[11px]">Refundable</div>
              </div>
              <div className="relative px-2 pb-1 text-center">
                {company.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt="" className="absolute left-3 top-0 h-14 max-w-[120px] object-contain" />
                )}
                <div className="font-serif font-black text-[22px] leading-tight">{firm}</div>
                {company.address && <div className="font-serif font-bold text-[11px]">{company.address}</div>}
                <div className="font-serif font-bold text-[11px]">
                  {[company.phone && `Phone : ${company.phone}`, company.gstin && `GSTIN : ${company.gstin}`].filter(Boolean).join('   ')}
                </div>
              </div>

              {/* Customer | receipt details */}
              <div className="grid grid-cols-2 border-t border-black">
                <div className="border-r border-black px-1.5 py-1 min-h-[80px]">
                  <div className="font-bold uppercase">Received from M/S {c.name}</div>
                  {c.address && <div className="whitespace-pre-line">{c.address}</div>}
                  {(c.city || c.pincode) && <div>{[c.city, c.pincode].filter(Boolean).join(' - ')}</div>}
                  <div>GSTIN : {c.gstin || 'Unregistered'}</div>
                  {c.phone && <div>Phone : {c.phone}</div>}
                </div>
                <div className="px-1.5 py-1 font-bold text-[12px] space-y-0.5">
                  <div>Customer Code : {c.customerCode}</div>
                  <div>Date : {dmy(date)}</div>
                  <div>Received by : {modes || '—'}</div>
                  <div className="font-normal text-[11px]">Voucher No(s) : {rows.map((v) => v.voucherNumber).join(', ')}</div>
                </div>
              </div>

              {/* Lines */}
              <table className="w-full border-t border-black border-collapse">
                <thead>
                  <tr>
                    <th className={head}>#</th>
                    <th className={head}>Voucher No.</th>
                    <th className={head}>SV / TV No.</th>
                    <th className={head}>Cylinder</th>
                    <th className={`${head} text-right`}>Cylinders</th>
                    <th className={`${head} text-right`}>Deposit / cyl (₹)</th>
                    <th className={`${head} text-right`}>Amount (₹)</th>
                    <th className="border-b border-black px-1.5 py-1 font-bold text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v, i) => (
                    <tr key={v.id}>
                      <td className={cell}>{i + 1}</td>
                      <td className={`${cell} font-mono`}>{v.voucherNumber}<div className="text-[9px] text-slate-600">{dmy(v.issueDate)}</div></td>
                      <td className={`${cell} font-mono font-bold`}>{v.svNumber || '—'}</td>
                      <td className={cell}>{v.productName || 'Cylinder'}{v.regulatorQty ? <div className="text-[9px]">+ {v.regulatorQty} regulator(s)</div> : null}</td>
                      <td className={`${cell} text-right font-bold`}>{v.cylinderQty}</td>
                      <td className={`${cell} text-right`}>{v.depositAmount ? money(v.depositAmount / v.cylinderQty) : 'Free'}</td>
                      <td className={`${cell} text-right font-bold`}>{v.depositAmount ? money(v.depositAmount) : '0.00'}</td>
                      <td className="px-1.5 py-1 align-top">
                        {v.status === 'ACTIVE' ? 'Held' : v.status === 'REFUNDED' ? `Refunded ${dmy(v.closedOn)}` : v.status === 'ADJUSTED' ? `Adjusted ${dmy(v.closedOn)}` : v.status.toLowerCase()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-black font-bold">
                    <td className={cell} colSpan={4}>Total deposit held{regulators ? ` (with ${regulators} regulator${regulators > 1 ? 's' : ''})` : ''}</td>
                    <td className={`${cell} text-right`}>{cylinders}</td>
                    <td className={cell} />
                    <td className={`${cell} text-right text-[13px]`}>{money(total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
              <div className="border-t border-black px-1.5 py-1 font-bold">Amount in words : {amountInWords(total)}</div>

              {/* Terms | signatory */}
              <div className="grid grid-cols-[1fr_260px] border-t border-black">
                <div className="px-1.5 py-1 text-[10px] leading-snug">
                  <div className="font-bold">Terms</div>
                  <ol className="list-decimal pl-4">
                    <li>This is a refundable security deposit for the cylinders listed above. It is not a sale.</li>
                    <li>The cylinders remain the property of the company / oil company and must not be refilled elsewhere.</li>
                    <li>The deposit is refunded when every cylinder is returned in good condition, against this receipt and the SV / TV voucher.</li>
                    <li>Lost or damaged cylinders are recovered from the deposit.</li>
                  </ol>
                  <div className="mt-6 w-40 border-t border-black pt-0.5 text-[10px]">Customer&apos;s signature</div>
                </div>
                <div className="px-2 py-1 flex flex-col items-center justify-between text-center">
                  <div className="font-bold text-[11px] text-blue-900">{company.legalName ? company.legalName : `M/S ${company.name}`}</div>
                  {company.signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.signature} alt="" className="h-12 max-w-[160px] object-contain" />
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="font-bold text-[11px] text-blue-900">{company.signatoryTitle || 'PROPRIETOR'}</div>
                  <div className="text-[10px]">Authorised signatory</div>
                </div>
              </div>
            </div>
          )}
          <div className="mx-auto mt-1 text-center text-[9px] text-slate-500" style={{ maxWidth: 800 }}>
            {company.name} · Computer generated receipt
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
