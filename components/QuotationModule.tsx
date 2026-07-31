'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  Edit3,
  Trash2,
  Printer,
  Save,
  ChevronDown,
  ShoppingCart,
  Truck,
  RotateCcw,
  Calculator,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Customer,
  Product,
  Quotation,
  PurchaseOrderItem,
  PurchaseOrder,
  PurchaseInvoice,
  SaleOrder,
  StockAdjustment,
  ReturnDocument,
  Invoice,
  InvoiceItem,
} from '../lib/types';
import { ProductSearchDropdown } from './ProductSearchDropdown';
import { PartySearchDropdown } from './PartySearchDropdown';

interface QuotationModuleProps {
  customers: Customer[];
  products: Product[];
  quotations: Quotation[];
  quotationToEdit?: Quotation | null;
  onAddQuotation: (qt: Quotation) => void;
  onUpdateQuotation?: (qt: Quotation) => void;
  onAddPO: (po: PurchaseOrder) => void;
  onAddPurchase: (pur: PurchaseInvoice) => void;
  onAddSO: (so: SaleOrder) => void;
  onAddAdjustment: (adj: StockAdjustment) => void;
  onAddPurchaseReturn: (ret: ReturnDocument) => void;
  onAddSalesReturn: (ret: ReturnDocument) => void;
  onAddInvoice: (inv: Invoice) => void;
  onClose: () => void;
}

type ConvertTarget =
  | 'customer-sale'
  | 'company-purchase'
  | 'customer-sale-return'
  | 'company-purchase-return'
  | 'company-purchase-order'
  | 'customer-sale-order'
  | 'customer-quotation'
  | 'stock-adjustment';

const CONVERT_OPTIONS: { key: ConvertTarget; label: string; icon: typeof ShoppingCart }[] = [
  { key: 'customer-sale', label: 'Customer Sale', icon: ShoppingCart },
  { key: 'company-purchase', label: 'Company Purchase', icon: Truck },
  { key: 'customer-sale-return', label: 'Customer Sale Return', icon: RotateCcw },
  { key: 'company-purchase-return', label: 'Company Purchase Return', icon: Truck },
  { key: 'company-purchase-order', label: 'Company Purchase Order', icon: Truck },
  { key: 'customer-sale-order', label: 'Customer Sale Order', icon: ShoppingCart },
  { key: 'customer-quotation', label: 'Customer Quotation', icon: Calculator },
  { key: 'stock-adjustment', label: 'Stock Adjustment', icon: SlidersHorizontal },
];

const GST_SLABS = [0, 5, 12, 18, 28];

const emptyEntry = (products: Product[]) => ({
  productId: products[0]?.id || '',
  quantity: 1,
  mrp: products[0]?.mrp || products[0]?.salePrice || 0,
  listPrice: products[0]?.salePrice || 0,
  gstRate: products[0]?.taxRate ?? 0,
  taxExcluded: true,
});

export const QuotationModule: React.FC<QuotationModuleProps> = ({
  customers,
  products,
  quotations,
  quotationToEdit,
  onAddQuotation,
  onUpdateQuotation,
  onAddPO,
  onAddPurchase,
  onAddSO,
  onAddAdjustment,
  onAddPurchaseReturn,
  onAddSalesReturn,
  onAddInvoice,
  onClose,
}) => {
  const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [quoteNoSearch, setQuoteNoSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validDays, setValidDays] = useState(15);
  const [remark, setRemark] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [entry, setEntry] = useState(emptyEntry(products));
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  useEffect(() => {
    if (quotationToEdit) {
      const matched = customers.find((c) => c.name === quotationToEdit.customerName);
      if (matched) setCustomerId(matched.id);
      setQuoteNoSearch(quotationToEdit.quoteNumber);
      setDate(quotationToEdit.date);
      setValidDays(quotationToEdit.validDays);
      setRemark(quotationToEdit.remark || '');
      setDiscountPercent(quotationToEdit.discountPercent || 0);
      setItems(quotationToEdit.items || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationToEdit]);

  const customer = customers.find((c) => c.id === customerId);
  const entryProduct = products.find((p) => p.id === entry.productId);

  const entryPriceExclTax = entry.taxExcluded
    ? entry.listPrice
    : entry.listPrice / (1 + entry.gstRate / 100);
  const entryTaxable = entryPriceExclTax * entry.quantity;
  const entryGstAmount = (entryTaxable * entry.gstRate) / 100;
  const entryAmount = entryTaxable + entryGstAmount;

  const handleAddRow = () => {
    if (!entryProduct) return;
    const newItem: PurchaseOrderItem = {
      id: `qti-${Date.now()}`,
      productId: entryProduct.id,
      productName: entryProduct.name,
      hsnCode: entryProduct.hsnCode,
      gstRate: entry.gstRate,
      quantity: entry.quantity,
      mrp: entry.mrp,
      listPrice: entry.listPrice,
      taxExcluded: entry.taxExcluded,
      amount: parseFloat(entryAmount.toFixed(2)),
    };
    setItems([...items, newItem]);
    setEntry(emptyEntry(products));
  };

  const handleEditRow = (item: PurchaseOrderItem) => {
    setEntry({
      productId: item.productId,
      quantity: item.quantity,
      mrp: item.mrp,
      listPrice: item.listPrice,
      gstRate: item.gstRate,
      taxExcluded: item.taxExcluded,
    });
    setItems(items.filter((i) => i.id !== item.id));
  };

  const handleDeleteRow = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleProductSelect = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setEntry((prev) => ({
      ...prev,
      productId,
      mrp: prod?.mrp || prod?.salePrice || 0,
      listPrice: prod?.salePrice || 0,
      gstRate: prod?.taxRate ?? 0,
    }));
  };

  const rowCalc = (item: PurchaseOrderItem) => {
    const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
    const taxable = priceExclTax * item.quantity;
    const gstAmount = (taxable * item.gstRate) / 100;
    return { taxable, gstAmount };
  };

  const totals = useMemo(() => {
    let totalQty = 0;
    let taxable = 0;
    let gstTotal = 0;
    let itemsAmount = 0;

    items.forEach((item) => {
      const { taxable: rowTaxable, gstAmount } = rowCalc(item);
      totalQty += item.quantity;
      taxable += rowTaxable;
      gstTotal += gstAmount;
      itemsAmount += item.amount;
    });

    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;
    const discountAmount = (taxable * discountPercent) / 100;
    const grandTotal = itemsAmount - discountAmount;

    return { totalQty, taxable, cgst, sgst, discountAmount, grandTotal };
  }, [items, discountPercent]);

  const handleSearchQuote = () => {
    const match = quotations.find(
      (qt) => qt.quoteNumber.toLowerCase() === quoteNoSearch.trim().toLowerCase()
    );
    if (!match) {
      if (quoteNoSearch.trim()) alert('No Quotation found with that number.');
      return;
    }
    const matched = customers.find((c) => c.name === match.customerName);
    if (matched) setCustomerId(matched.id);
    setDate(match.date);
    setValidDays(match.validDays);
    setRemark(match.remark || '');
    setDiscountPercent(match.discountPercent || 0);
    setItems(match.items || []);
    setLastSavedTotal(match.grandTotal);
  };

  const handleResetForm = () => {
    setCustomerId(customers[0]?.id || '');
    setQuoteNoSearch('');
    setDate(new Date().toISOString().split('T')[0]);
    setValidDays(15);
    setRemark('');
    setDiscountPercent(0);
    setItems([]);
    setEntry(emptyEntry(products));
  };

  const handleSave = () => {
    if (!customer) {
      alert('Please select a Company / Customer Name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product line item');
      return;
    }

    const qt: Quotation = {
      id: quotationToEdit?.id || `qt-${Date.now()}`,
      quoteNumber: quotationToEdit?.quoteNumber || `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerGstin: customer.gstin,
      date,
      validDays,
      grandTotal: parseFloat(totals.grandTotal.toFixed(2)),
      status: quotationToEdit?.status || 'Sent',
      items,
      taxableAmount: parseFloat(totals.taxable.toFixed(2)),
      totalCgst: parseFloat(totals.cgst.toFixed(2)),
      totalSgst: parseFloat(totals.sgst.toFixed(2)),
      discountPercent,
      discountAmount: parseFloat(totals.discountAmount.toFixed(2)),
      remark,
      createdBy: quotationToEdit?.createdBy || 'Shiv Kumar (Admin)',
    };

    if (quotationToEdit) {
      if (onUpdateQuotation) onUpdateQuotation(qt);
      onClose();
    } else {
      onAddQuotation(qt);
      setLastSavedTotal(qt.grandTotal);
      handleResetForm();
    }
  };

  const handleConvert = (target: ConvertTarget) => {
    setIsConvertMenuOpen(false);

    if (!customer) {
      alert('Please select a Company / Customer Name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product line item before converting');
      return;
    }

    const grandTotal = parseFloat(totals.grandTotal.toFixed(2));

    switch (target) {
      case 'customer-quotation': {
        return;
      }
      case 'customer-sale-order': {
        onAddSO({
          id: `so-${Date.now()}`,
          soNumber: `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: customer.name,
          customerGstin: customer.gstin,
          date,
          validUntil: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          totalAmount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Customer Sale Order.');
        onClose();
        return;
      }
      case 'company-purchase-order': {
        onAddPO({
          id: `po-${Date.now()}`,
          poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          vendorName: customer.name,
          vendorGstin: customer.gstin,
          date,
          expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          itemsCount: items.length,
          totalAmount: grandTotal,
          status: 'Issued',
        });
        alert('Converted to a Company Purchase Order.');
        onClose();
        return;
      }
      case 'company-purchase': {
        onAddPurchase({
          id: `pur-${Date.now()}`,
          purchaseNumber: `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          vendorInvoiceNumber: quoteNoSearch || `QT-REF-${Date.now().toString().slice(-6)}`,
          vendorName: customer.name,
          vendorGstin: customer.gstin || '',
          date,
          subTotal: parseFloat(totals.taxable.toFixed(2)),
          itcEligibleAmount: parseFloat((totals.cgst + totals.sgst).toFixed(2)),
          grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Company Purchase bill.');
        onClose();
        return;
      }
      case 'company-purchase-return': {
        onAddPurchaseReturn({
          id: `pret-${Date.now()}`,
          docNumber: `DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          originalInvNumber: quotationToEdit?.quoteNumber || 'N/A',
          partyName: customer.name,
          date,
          returnReason: 'Excess Supply',
          amount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Company Purchase Return.');
        onClose();
        return;
      }
      case 'customer-sale-return': {
        onAddSalesReturn({
          id: `sret-${Date.now()}`,
          docNumber: `CN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          originalInvNumber: quotationToEdit?.quoteNumber || 'N/A',
          partyName: customer.name,
          date,
          returnReason: 'Wrong Item',
          amount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Customer Sale Return.');
        onClose();
        return;
      }
      case 'stock-adjustment': {
        onAddAdjustment({
          id: `adj-${Date.now()}`,
          adjustCode: `ADJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          date,
          productName: items[0].productName,
          adjustmentType: 'Deduction (-)',
          qty: totals.totalQty,
          reason: 'Physical Stock Count',
          approvedBy: 'Shiv Kumar (Admin)',
        });
        alert('Converted to a Stock Adjustment.');
        onClose();
        return;
      }
      case 'customer-sale': {
        const invoiceItems: InvoiceItem[] = items.map((item, idx) => {
          const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
          const taxableAmount = parseFloat((priceExclTax * item.quantity).toFixed(2));
          const gstAmount = parseFloat(((taxableAmount * item.gstRate) / 100).toFixed(2));
          return {
            id: `item-${idx}-${Date.now()}`,
            productId: item.productId,
            productName: item.productName,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: products.find((p) => p.id === item.productId)?.unit || 'PCS',
            unitPrice: priceExclTax,
            mrp: item.mrp,
            discountPercent: 0,
            taxRate: item.gstRate,
            taxableAmount,
            cgstAmount: gstAmount / 2,
            sgstAmount: gstAmount / 2,
            igstAmount: 0,
            totalAmount: item.amount,
          };
        });

        onAddInvoice({
          id: `inv-${Date.now()}`,
          invoiceNumber: `OS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date,
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          customerId: customer.id,
          customerName: customer.name,
          customerGstin: customer.gstin,
          customerPhone: customer.phone || '',
          items: invoiceItems,
          subTotal: parseFloat(totals.taxable.toFixed(2)),
          totalDiscount: parseFloat(totals.discountAmount.toFixed(2)),
          totalCgst: parseFloat(totals.cgst.toFixed(2)),
          totalSgst: parseFloat(totals.sgst.toFixed(2)),
          totalIgst: 0,
          roundOff: 0,
          grandTotal,
          paymentMode: 'Credit',
          status: 'Unpaid',
          isIgst: false,
          notes: remark,
        });
        alert('Converted to a Customer Sale invoice.');
        onClose();
        return;
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 flex flex-col min-h-[calc(100vh-4rem)] -mx-4 -mt-4 md:-mx-6 md:-mt-6 -mb-24 md:-mb-24">
      {/* Teal Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-teal-600 dark:bg-teal-800">
        <h2 className="text-base font-bold text-white">{quotationToEdit ? 'Edit Customer Quotation' : 'Customer Quotation'}</h2>
        <div className="flex items-center gap-3">
          <button type="button" title="Notify Customer" className="p-1.5 rounded-md bg-white/90 hover:bg-white text-rose-600 shadow">
            <Sparkles className="h-4 w-4" />
          </button>
          <button type="button" title="Reset Form" onClick={handleResetForm} className="p-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-900 shadow">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" title="Close" onClick={onClose} className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Optional Tabs / Badges Row */}
      <div className="flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
          #1 - {customer?.name || 'Select Customer'}
          <button type="button" className="text-rose-500 hover:text-rose-600"><X className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Company / Invoice Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[320px]">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Company Name</label>
            <PartySearchDropdown
              parties={customers}
              selectedPartyId={customerId}
              onSelect={setCustomerId}
              createNewLabel="Customer"
            />
          </div>

          <div className="w-24">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Valid (Days)</label>
            <input
              type="number"
              min={1}
              value={validDays}
              onChange={(e) => setValidDays(parseInt(e.target.value) || 1)}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Quote No :</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={quoteNoSearch}
                onChange={(e) => setQuoteNoSearch(e.target.value)}
                placeholder="Search existing quote number"
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button type="button" title="Load Quotation" onClick={handleSearchQuote} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Date :</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Line Item Entry Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
          <thead className="bg-slate-900 text-white font-bold">
            <tr>
              <th className="px-2 py-2.5 w-14 text-center">S.NO.#</th>
              <th className="px-2 py-2.5">Product Name</th>
              <th className="px-2 py-2.5 w-20">GST %</th>
              <th className="px-2 py-2.5 w-24">HSN/SAC</th>
              <th className="px-2 py-2.5 w-24">Quantity</th>
              <th className="px-2 py-2.5 w-24">MRP</th>
              <th className="px-2 py-2.5 w-24">List Price</th>
              <th className="px-2 py-2.5 w-28">
                Price
                <span className="block text-[9px] font-normal text-slate-300">(TAX EXCLUDED)</span>
              </th>
              <th className="px-2 py-2.5 w-28">Amount</th>
              <th className="px-2 py-2.5 w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <tr className="bg-sky-50/60 dark:bg-slate-800/40">
              <td className="px-2 py-2 text-center font-bold text-slate-500">{items.length + 1}</td>
              <td className="px-2 py-2 relative">
                <ProductSearchDropdown
                  products={products}
                  selectedProductId={entry.productId}
                  onSelect={handleProductSelect}
                />
              </td>
              <td className="px-2 py-2">
                <select
                  value={entry.gstRate}
                  onChange={(e) => setEntry({ ...entry, gstRate: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center"
                >
                  {GST_SLABS.map((rate) => (
                    <option key={rate} value={rate}>@{rate} %</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2 font-mono text-slate-500 text-center">{entryProduct?.hsnCode || '-'}</td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={(e) => setEntry({ ...entry, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={0}
                  value={entry.mrp}
                  onChange={(e) => setEntry({ ...entry, mrp: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={0}
                  value={entry.listPrice}
                  onChange={(e) => setEntry({ ...entry, listPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-right"
                />
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={entry.taxExcluded}
                    onClick={() => setEntry({ ...entry, taxExcluded: !entry.taxExcluded })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${
                      entry.taxExcluded ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        entry.taxExcluded ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="font-mono font-bold text-right flex-1">₹{entryPriceExclTax.toFixed(2)}</span>
                </div>
              </td>
              <td className="px-2 py-2 font-mono font-black text-right">
                ₹{entryAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-center">
                <button type="button" onClick={handleAddRow} title="Add Item" className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>

            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-2 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="px-2 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{item.productName}</td>
                <td className="px-2 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">@{item.gstRate}%</td>
                <td className="px-2 py-2.5 font-mono text-center">{item.hsnCode}</td>
                <td className="px-2 py-2.5 text-center font-bold">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right font-mono">₹{item.mrp.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2.5 text-right font-mono">₹{item.listPrice.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2.5 text-right font-mono text-[11px] text-slate-500">{item.taxExcluded ? 'Excl.' : 'Incl.'}</td>
                <td className="px-2 py-2.5 text-right font-mono font-black">₹{item.amount.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEditRow(item)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteRow(item.id)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Stats + Remark + Discount */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <div className="text-[10px] font-bold text-slate-500">Total Qty</div>
              <div className="font-black text-slate-900 dark:text-slate-100">{totals.totalQty}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <div className="text-[10px] font-bold text-slate-500">Taxable</div>
              <div className="font-black text-slate-900 dark:text-slate-100">₹{totals.taxable.toFixed(2)}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <div className="text-[10px] font-bold text-slate-500">CGST</div>
              <div className="font-black text-emerald-600">₹{totals.cgst.toFixed(2)}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <div className="text-[10px] font-bold text-slate-500">SGST</div>
              <div className="font-black text-emerald-600">₹{totals.sgst.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Remark</label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter Remark"
              className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="min-w-[220px] space-y-2">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Subtotal:</label>
            <input
              type="text"
              readOnly
              value={`₹${totals.taxable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black text-right text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Dis.%</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-right text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Dis. Amount</label>
              <input
                type="text"
                readOnly
                value={`₹${totals.discountAmount.toFixed(2)}`}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-right text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white">
        <div className="text-xs font-bold text-slate-300">
          Last Invoice Total: <span className="text-emerald-400 font-mono">₹{lastSavedTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow">
            <Save className="h-4 w-4" /> Save
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsConvertMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow"
            >
              Convert Type <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {isConvertMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsConvertMenuOpen(false)} />
                <div className="absolute z-20 bottom-full mb-2 right-0 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                  <div className="px-4 py-2 text-center text-xs font-bold text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    Convert to:
                  </div>
                  {CONVERT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isCurrentType = opt.key === 'customer-quotation';
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isCurrentType}
                        onClick={() => handleConvert(opt.key)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                          isCurrentType
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow">
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
    </div>
  );
};
