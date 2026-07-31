'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Calculator, 
  UserPlus, 
  CheckCircle,
  Receipt,
  FileCheck
} from 'lucide-react';
import { Customer, Product, Invoice, InvoiceItem } from '../lib/types';

interface BillingModuleProps {
  customers: Customer[];
  products: Product[];
  onAddInvoice: (invoice: Invoice) => void;
  onOpenInvoiceModal: (inv: Invoice) => void;
}

export const BillingModule: React.FC<BillingModuleProps> = ({
  customers,
  products,
  onAddInvoice,
  onOpenInvoiceModal,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Credit'>('UPI');
  const [isIgst, setIsIgst] = useState(false);
  const [notes, setNotes] = useState('Thank you for shopping with us!');
  
  // Invoice items state
  const [lineItems, setLineItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
    }>
  >([
    {
      productId: products[0]?.id || '',
      quantity: 1,
      unitPrice: products[0]?.salePrice || 0,
      discountPercent: 0,
    },
  ]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Calculate detailed line item figures
  const calculatedItems: InvoiceItem[] = lineItems.map((item, idx) => {
    const prod = products.find((p) => p.id === item.productId) || products[0];
    const qty = Math.max(1, item.quantity);
    const price = item.unitPrice || prod.salePrice;
    const disc = Math.min(100, Math.max(0, item.discountPercent));

    const totalBeforeTax = qty * price;
    const discountAmt = (totalBeforeTax * disc) / 100;
    const taxableAmount = totalBeforeTax - discountAmt;
    
    const taxRate = prod.taxRate;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isIgst) {
      igstAmount = (taxableAmount * taxRate) / 100;
    } else {
      cgstAmount = (taxableAmount * (taxRate / 2)) / 100;
      sgstAmount = (taxableAmount * (taxRate / 2)) / 100;
    }

    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    return {
      id: `item-${idx}-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      hsnCode: prod.hsnCode,
      quantity: qty,
      unit: prod.unit,
      unitPrice: price,
      discountPercent: disc,
      taxRate: taxRate,
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      cgstAmount: parseFloat(cgstAmount.toFixed(2)),
      sgstAmount: parseFloat(sgstAmount.toFixed(2)),
      igstAmount: parseFloat(igstAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  });

  const subTotal = calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCgst = calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const rawGrandTotal = subTotal + totalCgst + totalSgst + totalIgst;
  
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: products[0]?.id || '',
        quantity: 1,
        unitPrice: products[0]?.salePrice || 0,
        discountPercent: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      productId: prodId,
      unitPrice: prod ? prod.salePrice : 0,
    };
    setLineItems(updated);
  };

  const handleItemFieldChange = (
    index: number,
    field: 'quantity' | 'unitPrice' | 'discountPercent',
    val: number
  ) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setLineItems(updated);
  };

  const handleSaveInvoice = (andPrint = false) => {
    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `OS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerGstin: selectedCustomer.gstin,
      customerPhone: selectedCustomer.phone,
      items: calculatedItems,
      subTotal: parseFloat(subTotal.toFixed(2)),
      totalDiscount: 0,
      totalCgst: parseFloat(totalCgst.toFixed(2)),
      totalSgst: parseFloat(totalSgst.toFixed(2)),
      totalIgst: parseFloat(totalIgst.toFixed(2)),
      roundOff: roundOff,
      grandTotal: grandTotal,
      paymentMode: paymentMode,
      status: paymentMode === 'Credit' ? 'Unpaid' : 'Paid',
      isIgst: isIgst,
      notes: notes,
    };

    onAddInvoice(newInv);
    if (andPrint) {
      onOpenInvoiceModal(newInv);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-500" />
            Create GST Tax Invoice (POS Counter)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time tax calculation for SGST, CGST, and IGST billing
          </p>
        </div>

        {/* IGST Supply Switch */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isIgst}
              onChange={(e) => setIsIgst(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>Inter-state Supply (IGST)</span>
          </label>
        </div>
      </div>

      {/* Customer & Party Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Customer Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Select Customer / B2B Party
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.gstin ? `(${c.gstin})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Party Details Card */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-bold text-slate-900 dark:text-slate-100">{selectedCustomer.name}</div>
          <div>GSTIN: {selectedCustomer.gstin || 'Unregistered / Retail'}</div>
          <div>Phone: {selectedCustomer.phone}</div>
        </div>

        {/* Payment mode select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Payment Mode
          </label>
          <div className="grid grid-cols-4 gap-1">
            {(['UPI', 'Cash', 'Bank Transfer', 'Credit'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  paymentMode === mode
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-800 font-semibold uppercase text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-2 py-2">Product Item</th>
              <th className="px-2 py-2 w-24">HSN</th>
              <th className="px-2 py-2 w-20">Qty</th>
              <th className="px-2 py-2 w-24">Rate (₹)</th>
              <th className="px-2 py-2 w-20">Disc %</th>
              <th className="px-2 py-2 w-20">GST %</th>
              <th className="px-2 py-2 w-28 text-right">Taxable</th>
              <th className="px-2 py-2 w-28 text-right">Total (₹)</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {lineItems.map((item, idx) => {
              const calc = calculatedItems[idx];
              const prod = products.find((p) => p.id === item.productId);
              return (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-2 py-2.5">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-slate-500">{prod?.hsnCode}</td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full py-1 px-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => handleItemFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full py-1 px-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-right"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPercent}
                      onChange={(e) => handleItemFieldChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                      className="w-full py-1 px-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-center"
                    />
                  </td>
                  <td className="px-2 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                    {prod?.taxRate}%
                  </td>
                  <td className="px-2 py-2.5 text-right font-medium">
                    ₹{calc?.taxableAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-2 py-2.5 text-right font-extrabold text-slate-900 dark:text-slate-100">
                    ₹{calc?.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={lineItems.length === 1}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          type="button"
          onClick={handleAddItem}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Another Line Item</span>
        </button>
      </div>

      {/* Invoice Calculation Summary & Final Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoice Notes */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Invoice Terms & Customer Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            GSTIN: 23AAACO8991F1Z2 | Subject to Indore Jurisdiction.
          </div>
        </div>

        {/* Calculation Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Taxable Subtotal:</span>
            <span className="font-mono text-slate-200">₹{subTotal.toLocaleString('en-IN')}</span>
          </div>

          {!isIgst ? (
            <>
              <div className="flex justify-between text-xs text-slate-400">
                <span>CGST Amount:</span>
                <span className="font-mono text-emerald-400">₹{totalCgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>SGST Amount:</span>
                <span className="font-mono text-emerald-400">₹{totalSgst.toLocaleString('en-IN')}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-slate-400">
              <span>IGST Amount:</span>
              <span className="font-mono text-purple-400">₹{totalIgst.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-400">
            <span>Round Off:</span>
            <span className="font-mono">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
          </div>

          <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-200">Grand Total:</span>
            <span className="text-xl font-black text-emerald-400">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSaveInvoice(false)}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-1 transition-all"
            >
              <Save className="h-4 w-4 text-emerald-400" />
              <span>Save Invoice</span>
            </button>

            <button
              onClick={() => handleSaveInvoice(true)}
              className="py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
