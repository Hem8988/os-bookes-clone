'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCompany } from '../lib/useCompany';
import { amountInWords, stateLabel, GST_STATES } from '../lib/gst';

// GST tax invoice laid out like the distributor's existing printed bill:
// title strip, firm header, buyer / invoice-details box, place of delivery /
// bank box, item grid with CGST/SGST columns, totals, declaration and terms.

interface InvoiceItemView {
  id?: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
}

export interface InvoiceView {
  id?: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerGstin?: string | null;
  customerPhone?: string;
  items: InvoiceItemView[];
  subTotal?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount?: number;
  balanceAfter?: number | null;
  paymentMode?: string;
  status?: string;
  isIgst?: boolean;
  notes?: string | null;
}

interface PrintExtra {
  billTo: { address: string; city: string | null; state: string | null; stateCode: string | null; pincode: string | null; email: string | null };
  shipTo: string | null;
  placeOfSupply: string;
  orderNumber?: string;
  deliveryNumber?: string;
  deliveryBoy?: string;
  irn?: string;
  vehicleNumber?: string;
  grnNumber?: string;
  challanNumber?: string;
  poNumber?: string;
}

type PrintData = InvoiceView & { print?: PrintExtra | null; customerPan?: string; canEditRefs?: boolean };

const REF_FIELDS = [
  { key: 'grnNumber', label: 'GRN No.' },
  { key: 'vehicleNumber', label: 'Vehicle No' },
  { key: 'challanNumber', label: 'Challan No' },
  { key: 'poNumber', label: 'P.O. No' },
] as const;
type RefKey = (typeof REF_FIELDS)[number]['key'];

interface PrintInvoiceModalProps {
  invoice: InvoiceView | null;
  onClose: () => void;
}

const money = (n: number | null | undefined) => Number(n || 0).toFixed(2);
const pct = (n: number) => n.toFixed(2);
/** 2026-09-23 → 23/09/2026 */
const dmy = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || '');

/** Full print details (buyer address, references) for a stored invoice. */
function usePrintData(invoice: InvoiceView | null): [PrintData | null, (print: PrintExtra) => void] {
  const [loaded, setLoaded] = useState<{ id: string; data: PrintData } | null>(null);
  const id = invoice?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/invoices/${encodeURIComponent(id)}/print`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.data) setLoaded({ id, data: j.data as PrintData });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  const setPrint = (print: PrintExtra) => setLoaded((l) => (l ? { ...l, data: { ...l.data, print } } : l));
  if (!invoice) return [null, setPrint];
  return [loaded && loaded.id === id ? loaded.data : invoice, setPrint];
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, onClose }) => {
  const company = useCompany();
  const [inv, setPrint] = usePrintData(invoice);
  const [refs, setRefs] = useState<Record<RefKey, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [refError, setRefError] = useState('');
  if (!invoice || !inv) return null;

  const startEditRefs = () => {
    const pr = inv.print;
    setRefError('');
    setRefs({
      grnNumber: pr?.grnNumber || '',
      vehicleNumber: pr?.vehicleNumber || '',
      challanNumber: pr?.challanNumber || pr?.deliveryNumber || '',
      poNumber: pr?.poNumber || '',
    });
  };
  const saveRefs = async () => {
    if (!refs || !inv.id) return;
    setSaving(true);
    setRefError('');
    try {
      const r = await fetch(`/api/invoices/${encodeURIComponent(inv.id)}/print`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refs),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'Could not save details.');
      setPrint(j.data as PrintExtra);
      setRefs(null);
    } catch (e) {
      setRefError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const items = Array.isArray(inv.items) ? inv.items : [];
  const igst = !!inv.isIgst;
  const line = (i: InvoiceItemView) => {
    const rate = Number(i.taxRate || 0);
    const taxable = i.taxableAmount ?? Number(i.totalAmount) / (1 + rate / 100);
    const tax = Number(i.totalAmount) - taxable;
    return {
      taxable,
      rate,
      unitRate: i.quantity ? taxable / Number(i.quantity) : 0,
      cgst: igst ? 0 : i.cgstAmount ?? tax / 2,
      sgst: igst ? 0 : i.sgstAmount ?? tax / 2,
      igst: igst ? i.igstAmount ?? tax : 0,
    };
  };
  const lines = items.map((i) => ({ item: i, ...line(i) }));
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const subTotal = inv.subTotal ?? lines.reduce((s, l) => s + l.taxable, 0);

  // Tax lines per rate, e.g. "SGST 9 %" / "CGST 9 %".
  const byRate = new Map<number, { cgst: number; sgst: number; igst: number }>();
  lines.forEach((l) => {
    const r = byRate.get(l.rate) || { cgst: 0, sgst: 0, igst: 0 };
    r.cgst += l.cgst;
    r.sgst += l.sgst;
    r.igst += l.igst;
    byRate.set(l.rate, r);
  });

  const p = inv.print;
  const bill = p?.billTo;
  const buyerState = bill ? stateLabel(bill.stateCode, inv.customerGstin, bill.state) : stateLabel(null, inv.customerGstin);
  const buyerStateName = bill?.state || GST_STATES[(bill?.stateCode || inv.customerGstin?.slice(0, 2) || '').trim()] || '';
  const buyerStateCode = (bill?.stateCode || inv.customerGstin?.slice(0, 2) || '').trim();
  const firm = (company.legalName || company.name).toUpperCase();
  const paid = Number(inv.paidAmount || 0);
  const due = Math.max(Number(inv.grandTotal) - paid, 0);
  const upiLink =
    company.upiId && due > 0 && inv.status !== 'Cancelled'
      ? `upi://pay?${new URLSearchParams({ pa: company.upiId, pn: company.name, am: due.toFixed(2), cu: 'INR', tr: inv.invoiceNumber, tn: `Bill ${inv.invoiceNumber}` })}`
      : null;
  const terms = (company.invoiceTerms || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const cols = igst ? 9 : 11;
  const fillerRows = Math.max(0, 8 - items.length);

  const cell = 'border-r border-black px-1 py-0.5 align-top';
  const head = 'border-r border-b border-black px-1 py-0.5 font-bold text-left align-top leading-tight';

  const modal = (
    <div className="invoice-print-root fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:block print:bg-white print:p-0 print:overflow-visible print:backdrop-blur-none">
      <div className="w-full max-w-[860px] bg-white text-black rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:rounded-none print:shadow-none print:overflow-visible print:max-w-none">
        <div className="print:hidden flex items-center justify-between px-5 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">Tax Invoice {inv.invoiceNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            {inv.canEditRefs && inv.id && !refs && (
              <button onClick={startEditRefs} className="py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer">
                <Pencil className="h-3.5 w-3.5" /> GRN / Challan
              </button>
            )}
            <button onClick={() => window.print()} className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => { setRefs(null); onClose(); }} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {refs && (
          <div className="print:hidden px-5 py-3 bg-slate-800 text-white border-t border-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REF_FIELDS.map((f) => (
                <label key={f.key} className="text-[11px] font-bold text-slate-300">
                  {f.label}
                  <input
                    value={refs[f.key]}
                    maxLength={60}
                    onChange={(e) => setRefs({ ...refs, [f.key]: e.target.value })}
                    className="mt-0.5 w-full rounded-md bg-slate-900 border border-slate-600 px-2 py-1 text-xs text-white font-normal"
                  />
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              {refError && <span className="mr-auto text-xs text-rose-400">{refError}</span>}
              <button onClick={() => setRefs(null)} disabled={saving} className="py-1 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
                Cancel
              </button>
              <button onClick={saveRefs} disabled={saving} className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-xs cursor-pointer">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-3 sm:p-5 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div id="printable-invoice" className="relative mx-auto bg-white border border-black text-[11px] leading-snug font-sans text-black" style={{ width: '100%', maxWidth: 800 }}>
            {inv.status === 'Cancelled' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-7xl font-black text-rose-600/20 -rotate-12 border-8 border-rose-600/20 px-6">CANCELLED</span>
              </div>
            )}

            {/* Title strip */}
            <div className="relative px-2 pt-1">
              <div className="text-center font-serif font-bold text-base tracking-wide">GST INVOICE</div>
              <div className="absolute right-2 top-1 font-serif font-bold text-[12px]">Original for Buyer</div>
            </div>

            {/* Firm header */}
            <div className="relative px-2 pb-1 text-center">
              {company.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt="" className="absolute left-3 top-0 h-14 max-w-[120px] object-contain" />
              )}
              <div className="font-serif font-black text-[22px] leading-tight">{firm}</div>
              {company.address && <div className="font-serif font-bold text-[11px]">{company.address}</div>}
              {(company.phone || company.email) && (
                <div className="font-serif font-bold text-[11px]">
                  {company.phone && <>Phone : {company.phone}</>}
                  {company.phone && company.email && <>&nbsp;&nbsp;</>}
                  {company.email && <>E-Mail : {company.email}</>}
                </div>
              )}
            </div>

            {/* Buyer | invoice details */}
            <div className="grid grid-cols-2 border-t border-black">
              <div className="border-r border-black px-1.5 py-1 min-h-[88px]">
                <div className="font-bold uppercase">To M/S {inv.customerName}</div>
                {bill?.address && <div className="whitespace-pre-line">{bill.address}</div>}
                {(bill?.city || bill?.pincode) && <div>{[bill?.city, bill?.pincode].filter(Boolean).join(' - ')}</div>}
                {buyerStateName && (
                  <div>
                    {buyerStateName}
                    {buyerStateCode && <> State : {buyerStateCode}</>}
                  </div>
                )}
                <div>GSTIN :{inv.customerGstin || 'Unregistered'}</div>
                {inv.customerPan && <div>PAN NO :{inv.customerPan}</div>}
                {inv.customerPhone && <div>Phone :{inv.customerPhone}</div>}
              </div>
              <div className="px-1.5 py-1 font-bold text-[12px] space-y-0.5">
                <div className="flex justify-between gap-2">
                  <span>Invoice No. : {inv.invoiceNumber}</span>
                  <span className="font-normal text-[11px]">Date : {dmy(inv.date)}</span>
                </div>
                <div>GRN No.: {p?.grnNumber || ''}</div>
                <div>Vehicle No : {p?.vehicleNumber || ''}</div>
                <div>CHALLAN NO:{p?.challanNumber || p?.deliveryNumber || ''}</div>
                <div>P.O. NO:{p?.poNumber || ''}</div>
                {p?.orderNumber && <div className="font-normal text-[11px]">Order No : {p.orderNumber}</div>}
                {inv.dueDate && <div className="font-normal text-[11px]">Due Date : {dmy(inv.dueDate)}</div>}
              </div>
            </div>

            {/* Place of delivery | bank */}
            <div className="grid grid-cols-2 border-t border-black">
              <div className="border-r border-black px-1.5 py-1 min-h-[88px] flex flex-col">
                <div>Place of Delivery:</div>
                <div className="whitespace-pre-line">{p?.shipTo || bill?.address || ''}</div>
                {buyerState && <div>Place of Supply : {buyerState}</div>}
                <div className="mt-auto">PAN NO : {inv.customerPan || ''}</div>
              </div>
              <div className="px-1.5 py-1">
                <div className="font-bold text-[12px]">Our Bank Details</div>
                <div>Bank Name : {company.bankName}</div>
                <div>A/C No : {company.bankAccountNo}</div>
                <div>IFSC code : {company.bankIfsc}</div>
                <div>BRANCH : {company.bankBranch}</div>
              </div>
            </div>

            {/* Items */}
            <table className="w-full border-t border-black border-collapse text-[10.5px]">
              <thead>
                <tr>
                  <th className={`${head} w-9`}>Sr.No</th>
                  <th className={head}>Description</th>
                  <th className={`${head} w-16`}>HSN Code</th>
                  <th className={`${head} w-14`}>Quantity</th>
                  <th className={`${head} w-10`}>Unit</th>
                  <th className={`${head} w-16`}>Rate</th>
                  {igst ? (
                    <>
                      <th className={`${head} w-11 text-right`}>IGST %</th>
                      <th className={`${head} w-16 text-right`}>IGST AMT</th>
                    </>
                  ) : (
                    <>
                      <th className={`${head} w-11 text-right`}>CGST %</th>
                      <th className={`${head} w-16 text-right`}>CGST AMT</th>
                      <th className={`${head} w-11 text-right`}>SGST %</th>
                      <th className={`${head} w-16 text-right`}>SGST AMT</th>
                    </>
                  )}
                  <th className="border-b border-black px-1 py-0.5 font-bold text-left w-20">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.item.id || idx}>
                    <td className={`${cell} text-center`}>{idx + 1}</td>
                    <td className={cell}>{l.item.productName}</td>
                    <td className={`${cell} text-right`}>{l.item.hsnCode || ''}</td>
                    <td className={`${cell} text-right`}>{l.item.quantity}</td>
                    <td className={`${cell} text-center`}>{l.item.unit || ''}</td>
                    <td className={`${cell} text-right`}>{money(l.unitRate)}</td>
                    {igst ? (
                      <>
                        <td className={`${cell} text-right`}>{pct(l.rate)}</td>
                        <td className={`${cell} text-right`}>{money(l.igst)}</td>
                      </>
                    ) : (
                      <>
                        <td className={`${cell} text-right`}>{pct(l.rate / 2)}</td>
                        <td className={`${cell} text-right`}>{money(l.cgst)}</td>
                        <td className={`${cell} text-right`}>{pct(l.rate / 2)}</td>
                        <td className={`${cell} text-right`}>{money(l.sgst)}</td>
                      </>
                    )}
                    <td className="px-1 py-0.5 text-right align-top">{money(Number(l.item.totalAmount))}</td>
                  </tr>
                ))}
                {Array.from({ length: fillerRows }).map((_, i) => (
                  <tr key={`f${i}`} className="h-6">
                    {Array.from({ length: cols }).map((__, j) => (
                      <td key={j} className={j < cols - 1 ? 'border-r border-black' : ''} />
                    ))}
                  </tr>
                ))}
                {/* e-invoice IRN / pay-by-UPI QR, inside the item grid like the paper bill */}
                <tr>
                  <td className="border-r border-black" />
                  <td className="border-r border-black px-1 py-2" colSpan={1}>
                    {p?.irn ? (
                      <div className="space-y-1">
                        <QRCodeSVG value={p.irn} size={76} />
                        <div className="text-[10px] break-all">IRN NO : {p.irn}</div>
                      </div>
                    ) : upiLink ? (
                      <div className="flex items-end gap-2">
                        <QRCodeSVG value={upiLink} size={76} />
                        <div className="text-[10px]">
                          <div className="font-bold">Scan to pay ₹{money(due)}</div>
                          <div>UPI : {company.upiId}</div>
                        </div>
                      </div>
                    ) : null}
                  </td>
                  {Array.from({ length: cols - 2 }).map((_, j) => (
                    <td key={j} className={j < cols - 3 ? 'border-r border-black' : ''} />
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Words / total qty / sub total */}
            <div className="grid grid-cols-[1fr_auto_210px] border-t border-black">
              <div className="px-1.5 py-1">
                <div className="font-bold text-[12px]">Amount in Words :</div>
                <div>{amountInWords(inv.grandTotal)}</div>
              </div>
              <div className="px-3 py-1 font-serif font-bold text-[12px] whitespace-nowrap">
                TOTAL QTY : <span className="text-[14px]">{totalQty.toFixed(3)}</span>
              </div>
              <div className="px-1.5 py-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUB TOTAL</span>
                  <span className="font-bold text-[12px]">{money(subTotal)}</span>
                </div>
                {[...byRate.entries()].map(([rate, t]) =>
                  igst ? (
                    <div key={rate} className="flex justify-between">
                      <span>IGST {rate} %</span>
                      <span>{money(t.igst)}</span>
                    </div>
                  ) : (
                    <React.Fragment key={rate}>
                      <div className="flex justify-between">
                        <span>SGST {rate / 2} %</span>
                        <span>{money(t.sgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST {rate / 2} %</span>
                        <span>{money(t.cgst)}</span>
                      </div>
                    </React.Fragment>
                  )
                )}
                <div className="flex justify-between">
                  <span>Roundoff</span>
                  <span>{money(inv.roundOff)}</span>
                </div>
              </div>
            </div>

            {/* Firm GSTIN / PAN | grand total */}
            <div className="grid grid-cols-[1fr_260px] border-t border-black">
              <div className="px-1.5 py-1 font-serif font-bold text-[12px] space-y-1">
                <div>GSTIN : {company.gstin}</div>
                <div className="border-t border-black -mx-1.5 px-1.5 pt-1">
                  PAN NO : {company.pan}
                  {company.stateCode && <span className="ml-8">STATE CODE - {company.stateCode}</span>}
                </div>
              </div>
              <div className="border-l border-black px-3 py-1 flex items-center justify-between font-serif font-bold">
                <span className="text-[12px]">GRAND TOTAL</span>
                <span className="text-[16px]">{money(inv.grandTotal)}</span>
              </div>
            </div>

            {/* Declaration | signatory */}
            <div className="grid grid-cols-[1fr_260px] border-t border-black">
              <div className="px-1.5 py-1 text-[9px] leading-tight font-serif">
                Declaration : I/we certify that our registration certificate under GST act 2017 is in force on the date on which the supply of goods specified in this tax invoice is made by me/us &amp; the transaction of supply covered by this tax invoice has been
                effected by me/us and it shall be accounted for in the turnover of supplies while filing of returns &amp; the due tax if any payable on the supplies has been or shall be paid. Further certified that the particulars given above are true
                and correct &amp; the amount indicated represents the prices actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.
                <div className="mt-6 w-32 border-t border-black pt-0.5 font-sans text-[10px]">Receivers sign</div>
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

            {/* Terms */}
            <div className="border-t border-black px-2 py-1 text-center font-serif font-bold text-[12px] leading-snug">
              {terms.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-1 text-center text-[9px] text-slate-500" style={{ maxWidth: 800 }}>
            {company.name} · Computer generated invoice
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
};
