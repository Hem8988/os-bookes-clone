'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { amountInWords, GST_STATES } from '../lib/gst';
import type { useCompany } from '../lib/useCompany';
import { Barcode128 } from './Barcode128';
import { today } from './ui';

// GST e-invoice print (the IRP layout): seller header with the signed QR,
// IRN barcode, Ack / e-way bill numbers, transaction and party details, goods
// table, tax totals, amount in words, remark and signatory.

export interface EinvoiceItem { productName: string; hsnCode?: string; quantity: number; unit?: string; taxRate?: number; taxableAmount?: number; cgstAmount?: number; sgstAmount?: number; igstAmount?: number; totalAmount: number; discount?: number }
export interface EinvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerGstin?: string | null;
  customerPhone?: string;
  customerPan?: string;
  isIgst?: boolean;
  items: EinvoiceItem[];
  subTotal?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  roundOff?: number;
  grandTotal: number;
  print?: {
    billTo?: { address: string; city: string | null; state: string | null; stateCode: string | null; pincode: string | null; email: string | null };
    shipTo?: string | null;
    irn?: string;
    ackNo?: string;
    ackDate?: string;
    signedQr?: string;
    ewbNo?: string;
    ewbDate?: string;
    vehicleNumber?: string;
    cylinders?: { productName: string; delivered: number; emptyReceived: number }[];
  } | null;
}

const money = (n: number | null | undefined) => Number(n || 0).toFixed(2);
const dmyDash = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}` : d || '');
const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3));

export function EinvoiceSheet({ inv, company }: { inv: EinvoiceData; company: ReturnType<typeof useCompany> }) {
  const p = inv.print || {};
  const bill = p.billTo;
  const igst = !!inv.isIgst;
  const firm = (company.legalName || company.name).toUpperCase();
  const sellerState = company.stateCode ? `${company.stateCode} - ${GST_STATES[company.stateCode] || ''}` : '';
  const buyerCode = (bill?.stateCode || inv.customerGstin?.slice(0, 2) || '').trim();
  const buyerState = buyerCode ? `${buyerCode} - ${bill?.state || GST_STATES[buyerCode] || ''}` : bill?.state || '';
  const buyerAddress = [bill?.address, [bill?.city, bill?.pincode].filter(Boolean).join(',')].filter(Boolean).join(', ');
  const items = inv.items || [];
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const taxable = inv.subTotal ?? items.reduce((s, i) => s + Number(i.taxableAmount || 0), 0);
  const cgst = inv.totalCgst ?? items.reduce((s, i) => s + Number(i.cgstAmount || 0), 0);
  const sgst = inv.totalSgst ?? items.reduce((s, i) => s + Number(i.sgstAmount || 0), 0);
  const igstAmt = inv.totalIgst ?? items.reduce((s, i) => s + Number(i.igstAmount || 0), 0);
  // Remark like the IRP print: what went (cylinder count) and the vehicle.
  const cylinders = (p.cylinders || []).filter((c) => c.delivered > 0);
  const th = 'border border-black px-1 py-0.5 text-left font-normal text-[#a3201c]';
  const td = 'border border-black px-1 py-0.5 align-top';
  const band = 'border-x border-b border-black bg-slate-200 py-1 text-center font-bold text-[13px] print:bg-slate-200';

  return (
    <div className="bg-white text-black text-[11px] leading-snug font-serif" style={{ width: '100%', maxWidth: 800 }}>
      {/* Seller header + signed QR */}
      <div className="flex items-start justify-between gap-3 border border-black px-2 py-1.5">
        <div className="font-bold text-[12px] leading-tight space-y-0.5">
          <div>{firm}</div>
          {company.address && <div className="max-w-[440px]">{company.address}</div>}
          {company.stateCode && <div>State Code: {company.stateCode}</div>}
          {company.email && <div>Email ID: {company.email}</div>}
          {company.phone && <div>Mobile: {company.phone}</div>}
        </div>
        {(p.signedQr || p.irn) && <QRCodeSVG value={p.signedQr || p.irn || ''} size={128} level="M" />}
      </div>

      <div className={band}>EInvoice Details</div>
      <div className="border-x border-b border-black px-2 py-1.5 flex items-center gap-2">
        <span className="font-bold shrink-0">IRN :</span>
        {p.irn ? (
          <div className="flex-1 min-w-0">
            <Barcode128 value={p.irn} height={38} />
            <div className="text-center font-mono text-[8px] break-all">{p.irn}</div>
          </div>
        ) : (
          <span className="text-rose-700 font-sans text-[11px]">IRN not generated yet — Books → E-invoice &amp; e-way bill</span>
        )}
      </div>
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="border-r border-black px-1.5 py-0.5"><b>Ack No :</b>{p.ackNo || ''}</div>
        <div className="px-1.5 py-0.5"><b>Ack Date :</b>{dmyDash(p.ackDate)}</div>
        <div className="border-r border-t border-black px-1.5 py-0.5"><b>Ewb No :</b>{p.ewbNo || ''}</div>
        <div className="border-t border-black px-1.5 py-0.5"><b>Ewb Date :</b>{p.ewbDate || ''}</div>
      </div>

      <div className={band}>Transaction Details</div>
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="border-r border-black px-1.5 py-0.5"><b>Category :</b>{inv.customerGstin ? 'B2B' : 'B2C'}</div>
        <div className="px-1.5 py-0.5"><b>Invoice No :</b>{inv.invoiceNumber}</div>
        <div className="border-r border-t border-black px-1.5 py-0.5"><b>Invoice Type :</b>Tax Invoice</div>
        <div className="border-t border-black px-1.5 py-0.5"><b>Invoice Date :</b>{dmyDash(inv.date)}</div>
      </div>

      <div className={band}>Party Details</div>
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="border-r border-black">
          <div className="border-b border-black px-1.5 py-0.5 font-bold font-sans text-[10px]">Seller</div>
          <div className="px-1.5 py-1 space-y-0.5">
            <div className="font-bold">GSTIN :{company.gstin}</div>
            <div className="font-bold">Name:{firm}</div>
            <div>Address:{company.address}</div>
            {sellerState && <div>State:{sellerState}</div>}
            <div>Mobile:{company.phone}{company.email ? `   email: ${company.email}` : ''}</div>
            {company.pan && <div>PAN : {company.pan}</div>}
          </div>
        </div>
        <div>
          <div className="border-b border-black px-1.5 py-0.5 font-bold font-sans text-[10px]">Purchaser</div>
          <div className="px-1.5 py-1 space-y-0.5">
            <div className="font-bold">Name:{inv.customerName.toUpperCase()}</div>
            <div className="font-bold">GSTIN :{inv.customerGstin || 'URP'}</div>
            <div>Address:{buyerAddress}</div>
            {buyerState && <div>State:{buyerState}</div>}
            <div>Mobile:{inv.customerPhone || ''}{bill?.email ? `   EmailID: ${bill.email}` : ''}</div>
            {inv.customerPan && <div>PAN : {inv.customerPan}</div>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="border-r border-black" />
        <div>
          <div className="border-b border-black px-1.5 py-0.5 font-bold font-sans text-[10px]">Ship To</div>
          <div className="px-1.5 py-1 space-y-0.5">
            <div>GSTIN : {inv.customerGstin || 'URP'}</div>
            <div>{inv.customerName.toUpperCase()}</div>
            <div>Address{p.shipTo || buyerAddress}</div>
            {buyerState && <div>State:{buyerState}</div>}
          </div>
        </div>
      </div>

      <div className={band}>Goods/Service Details</div>
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr>
            <th className={th}>SlNo</th>
            <th className={th}>Description</th>
            <th className={th}>HSN/SAC</th>
            <th className={th}>Qty</th>
            <th className={th}>Unit</th>
            <th className={th}>Price/Unit</th>
            <th className={th}>Discount</th>
            <th className={th}>Rate</th>
            <th className={th}>Taxable Value</th>
            <th className={th}>IGST</th>
            <th className={th}>Tax Amount</th>
            <th className={th}>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => {
            const tv = Number(i.taxableAmount ?? Number(i.totalAmount) / (1 + Number(i.taxRate || 0) / 100));
            const tax = Number(i.totalAmount) - tv;
            return (
              <tr key={idx}>
                <td className={td}>{idx + 1}</td>
                <td className={td}>{i.productName}</td>
                <td className={td}>{i.hsnCode || ''}</td>
                <td className={td}>{qtyText(Number(i.quantity))}</td>
                <td className={td}>{(i.unit || '').toUpperCase() === 'KG' ? 'KGS' : i.unit}</td>
                <td className={td}>{i.quantity ? money(tv / Number(i.quantity)) : '0.00'}</td>
                <td className={td}>{money(i.discount)}</td>
                <td className={td}>{Number(i.taxRate || 0)}</td>
                <td className={td}>{money(tv)}</td>
                <td className={td}>{igst ? money(i.igstAmount ?? tax) : '0.00'}</td>
                <td className={td}>{money(tax)}</td>
                <td className={td}>{money(Number(i.totalAmount))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="font-bold">
            {['Quantity', 'Taxable', 'IGST', 'CGST', 'SGST', 'CESS', 'State Cess', 'Discount', 'Other Charges', 'Round Off', 'Total Invoice'].map((h) => (
              <th key={h} className="border border-black px-1 py-0.5 text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {[qtyText(totalQty), money(taxable), money(igstAmt), money(cgst), money(sgst), '0.00', '0.00', '0.00', '0.00', money(inv.roundOff), money(inv.grandTotal)].map((v, i) => (
              <td key={i} className="border border-black px-1 py-0.5">{v}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="border-x border-b border-black px-1.5 py-1">
        <b>Amount in Words :</b>
        {amountInWords(inv.grandTotal)}
      </div>
      <div className="grid grid-cols-[1fr_220px] border-x border-b border-black">
        <div className="px-1.5 py-1 space-y-1">
          <div className="flex gap-1">
            <b>Remark :</b>
            <div>
              {cylinders.map((c) => (
                <div key={c.productName}>{c.productName}</div>
              ))}
              {cylinders.length > 0 && <div className="pl-6">Qty : {cylinders.reduce((s, c) => s + c.delivered, 0)}</div>}
              {p.vehicleNumber && <div className="pl-6">Veh no : {p.vehicleNumber}</div>}
            </div>
          </div>
          <div><b>Generated By :</b>{company.gstin}</div>
          <div><b>Print Date :</b>{dmyDash(today())}</div>
        </div>
        <div className="flex flex-col items-center justify-end px-2 py-1 text-center font-sans">
          <div className="font-bold text-[11px]">{firm}</div>
          {company.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.signature} alt="" className="h-12 max-w-[160px] object-contain" />
          ) : (
            <div className="h-12" />
          )}
          <div className="font-bold text-[11px]">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}
