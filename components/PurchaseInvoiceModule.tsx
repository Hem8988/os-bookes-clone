'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Pause,
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
  BankMaster,
  Customer,
  Product,
  PurchaseInvoice,
  PurchaseOrderItem,
  PurchaseOrderPayment,
  PurchaseOrder,
  SaleOrder,
  Quotation,
  StockAdjustment,
  ReturnDocument,
  Invoice,
  InvoiceItem,
  NarrationMaster,
} from '../lib/types';
import { PaymentStatusModal } from './PaymentStatusModal';
import { EnterSalePriceModal } from './EnterSalePriceModal';
import { ProductSearchDropdown } from './ProductSearchDropdown';
import { PartySearchDropdown } from './PartySearchDropdown';

interface PurchaseInvoiceModuleProps {
  vendors: Customer[];
  products: Product[];
  banks: BankMaster[];
  narrations: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  purchases: PurchaseInvoice[];
  purchaseToEdit?: PurchaseInvoice | null;
  onAddPurchase: (pur: PurchaseInvoice) => void;
  onUpdatePurchase?: (pur: PurchaseInvoice) => void;
  onUpdateProduct: (product: Product) => void;
  onAddPO: (po: PurchaseOrder) => void;
  onAddSO: (so: SaleOrder) => void;
  onAddQuotation: (qt: Quotation) => void;
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
  mrp: products[0]?.mrp || products[0]?.purchasePrice || 0,
  listPrice: products[0]?.purchasePrice || 0,
  gstRate: products[0]?.taxRate ?? 0,
  taxExcluded: true,
});

export const PurchaseInvoiceModule: React.FC<PurchaseInvoiceModuleProps> = ({
  vendors,
  products,
  banks,
  narrations,
  onAddNarration,
  purchases,
  purchaseToEdit,
  onAddPurchase,
  onUpdatePurchase,
  onUpdateProduct,
  onAddPO,
  onAddSO,
  onAddQuotation,
  onAddAdjustment,
  onAddPurchaseReturn,
  onAddSalesReturn,
  onAddInvoice,
  onClose,
}) => {
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<PurchaseInvoice | null>(null);
  const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false);
  const [isSalePriceModalOpen, setIsSalePriceModalOpen] = useState(false);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [invoiceNoSearch, setInvoiceNoSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit'>('Credit');
  const [remark, setRemark] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [entry, setEntry] = useState(emptyEntry(products));
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  // IOCL Bill Auto-Filler Modal State
  const [isIoclModalOpen, setIsIoclModalOpen] = useState(false);
  const [ioclInvNo, setIoclInvNo] = useState('MH5537072955');
  const [ioclSapDocNo, setIoclSapDocNo] = useState('7010396587');
  const [ioclTtNo, setIoclTtNo] = useState('MH12RN8805');
  const [ioclDate, setIoclDate] = useState('2026-09-01');
  const [iocl19kgQty, setIocl19kgQty] = useState('252');
  const [iocl19kgWeight, setIocl19kgWeight] = useState('4788.000');
  const [iocl47kgQty, setIocl47kgQty] = useState('29');
  const [iocl47kgWeight, setIocl47kgWeight] = useState('1377.500');
  const [ioclRatePerTonne, setIoclRatePerTonne] = useState('112086.25');

  const handleLoadIoclBillSample = () => {
    const ioclVendor = vendors.find(v => v.name.toLowerCase().includes('indian oil') || v.name.toLowerCase().includes('iocl')) || vendors[0];
    if (ioclVendor) setVendorId(ioclVendor.id);

    setInvoiceNoSearch(ioclInvNo);
    setDate(ioclDate);
    setPaymentMode('Credit');
    setRemark(`IOCL Bottling Plant Purchase Bill ${ioclInvNo} | SAP Doc #${ioclSapDocNo} | Tank Truck ${ioclTtNo} | Depot: LPG BP CHAKAN (PUNE)`);

    const prod19 = products.find(p => p.name.includes('19 KG')) || products[0];
    const prod47 = products.find(p => p.name.includes('47')) || products[1] || products[0];

    const qty19 = Number(iocl19kgQty) || 252;
    const qty47 = Number(iocl47kgQty) || 29;

    const item19: PurchaseOrderItem = {
      id: `poi-iocl-19kg-${Date.now()}`,
      productId: prod19?.id || 'prod_19kg',
      productName: '19 kg PACKED Indane Xtra TeJ LPG CYL(SC)',
      hsnCode: '271119',
      gstRate: 18,
      quantity: qty19,
      mrp: 2513,
      listPrice: 2129.6387,
      taxExcluded: true,
      amount: 633269.39,
    };

    const item47: PurchaseOrderItem = {
      id: `poi-iocl-47kg-${Date.now()}`,
      productId: prod47?.id || 'prod_47kg',
      productName: '47.5kg PACKED Indane Xtra TeJ LPG CY(LOT)',
      hsnCode: '271119',
      gstRate: 18,
      quantity: qty47,
      mrp: 6282,
      listPrice: 5324.0968,
      taxExcluded: true,
      amount: 182190.59,
    };

    setItems([item19, item47]);
    setIsIoclModalOpen(false);
    alert(`🎉 IOCL BOTTLING PLANT TAX INVOICE LOADED SUCCESSFULLY!\n\nInvoice #: ${ioclInvNo}\nSAP Doc #: ${ioclSapDocNo}\nTank Truck #: ${ioclTtNo}\nGrand Total: ₹8,15,460.00\n(CGST 9%: ₹62,196.10 | SGST 9%: ₹62,196.10)\n\nStock addition: +252 Pcs 19KG & +29 Pcs 47.5KG ready to save.`);
  };

  useEffect(() => {
    if (purchaseToEdit) {
      const matchedVendor = vendors.find((v) => v.name === purchaseToEdit.vendorName);
      if (matchedVendor) setVendorId(matchedVendor.id);
      setInvoiceNoSearch(purchaseToEdit.vendorInvoiceNumber);
      setDate(purchaseToEdit.date);
      setPaymentMode(purchaseToEdit.paymentMode || 'Credit');
      setRemark(purchaseToEdit.remark || '');
      setDiscountPercent(purchaseToEdit.discountPercent || 0);
      setItems(purchaseToEdit.items || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseToEdit]);

  const vendor = vendors.find((v) => v.id === vendorId);
  const entryProduct = products.find((p) => p.id === entry.productId);

  const entryPriceExclTax = entry.taxExcluded
    ? entry.listPrice
    : entry.listPrice / (1 + entry.gstRate / 100);
  const entryTaxable = entryPriceExclTax * entry.quantity;
  const entryGstAmount = (entryTaxable * entry.gstRate) / 100;
  const entryAmount = entryTaxable + entryGstAmount;

  const commitAddRow = () => {
    if (!entryProduct) return;
    const newItem: PurchaseOrderItem = {
      id: `poi-${Date.now()}`,
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
    setItems((prev) => [...prev, newItem]);
    setEntry(emptyEntry(products));
  };

  const handleAddRow = () => {
    if (!entryProduct) return;
    if (!entryProduct.salePrice) {
      setIsSalePriceModalOpen(true);
      return;
    }
    commitAddRow();
  };

  const handleSalePriceConfirm = (salePrice: number, wholesalePrice: number) => {
    if (entryProduct) {
      onUpdateProduct({ ...entryProduct, salePrice, wholesalePrice });
    }
    setIsSalePriceModalOpen(false);
    commitAddRow();
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
      mrp: prod?.mrp || prod?.purchasePrice || 0,
      listPrice: prod?.purchasePrice || 0,
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
    let disOnListPrice = 0;
    let itemsAmount = 0;

    items.forEach((item) => {
      const { taxable: rowTaxable, gstAmount } = rowCalc(item);
      totalQty += item.quantity;
      taxable += rowTaxable;
      gstTotal += gstAmount;
      itemsAmount += item.amount;
      const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
      disOnListPrice += Math.max(0, item.mrp - priceExclTax) * item.quantity;
    });

    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;
    const discountAmount = (taxable * discountPercent) / 100;
    const grandTotal = itemsAmount - discountAmount;

    return { totalQty, taxable, cgst, sgst, disOnListPrice, discountAmount, grandTotal };
  }, [items, discountPercent]);

  const handleSearchInvoice = () => {
    const match = purchases.find(
      (pur) => pur.vendorInvoiceNumber.toLowerCase() === invoiceNoSearch.trim().toLowerCase()
    );
    if (!match) {
      if (invoiceNoSearch.trim()) alert('No Purchase Invoice found with that Invoice No.');
      return;
    }
    const matchedVendor = vendors.find((v) => v.name === match.vendorName);
    if (matchedVendor) setVendorId(matchedVendor.id);
    setDate(match.date);
    setPaymentMode(match.paymentMode || 'Credit');
    setRemark(match.remark || '');
    setDiscountPercent(match.discountPercent || 0);
    setItems(match.items || []);
    setLastSavedTotal(match.grandTotal);
  };

  const handleResetForm = () => {
    setVendorId(vendors[0]?.id || '');
    setInvoiceNoSearch('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Credit');
    setRemark('');
    setDiscountPercent(0);
    setItems([]);
    setEntry(emptyEntry(products));
  };

  const handleSave = () => {
    if (!vendor) {
      alert('Please select a Company / Vendor Name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product line item');
      return;
    }

    const pur: PurchaseInvoice = {
      id: purchaseToEdit?.id || `pur-${Date.now()}`,
      purchaseNumber: purchaseToEdit?.purchaseNumber || `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorInvoiceNumber: invoiceNoSearch || `INV-${Date.now().toString().slice(-6)}`,
      vendorName: vendor.name,
      vendorGstin: vendor.gstin || '',
      date,
      subTotal: parseFloat(totals.taxable.toFixed(2)),
      itcEligibleAmount: parseFloat((totals.cgst + totals.sgst).toFixed(2)),
      grandTotal: parseFloat(totals.grandTotal.toFixed(2)),
      status: purchaseToEdit?.status || 'Pending',
      items,
      paymentMode,
      totalCgst: parseFloat(totals.cgst.toFixed(2)),
      totalSgst: parseFloat(totals.sgst.toFixed(2)),
      discountPercent,
      discountAmount: parseFloat(totals.discountAmount.toFixed(2)),
      remark,
      createdBy: purchaseToEdit?.createdBy || 'Shiv Kumar (Admin)',
      payments: purchaseToEdit?.payments,
      shippingParty: purchaseToEdit?.shippingParty,
    };

    setPendingPurchase(pur);
    setIsPaymentStatusOpen(true);
  };

  const handlePaymentStatusSave = (
    payments: PurchaseOrderPayment[],
    shippingParty: string,
    _attachmentName: string
  ) => {
    if (!pendingPurchase) return;
    const finalized: PurchaseInvoice = {
      ...pendingPurchase,
      payments,
      shippingParty: shippingParty || undefined,
    };

    if (purchaseToEdit) {
      if (onUpdatePurchase) onUpdatePurchase(finalized);
      setIsPaymentStatusOpen(false);
      setPendingPurchase(null);
      onClose();
    } else {
      onAddPurchase(finalized);
      setLastSavedTotal(finalized.grandTotal);
      setIsPaymentStatusOpen(false);
      setPendingPurchase(null);
      handleResetForm();
    }
  };

  const handleConvert = (target: ConvertTarget) => {
    setIsConvertMenuOpen(false);

    if (!vendor) {
      alert('Please select a Company / Vendor Name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product line item before converting');
      return;
    }

    const grandTotal = parseFloat(totals.grandTotal.toFixed(2));

    switch (target) {
      case 'company-purchase': {
        return;
      }
      case 'company-purchase-order': {
        onAddPO({
          id: `po-${Date.now()}`,
          poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          vendorName: vendor.name,
          vendorGstin: vendor.gstin,
          date,
          expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          itemsCount: items.length,
          totalAmount: grandTotal,
          status: 'Issued',
          items,
          paymentMode,
          taxableAmount: parseFloat(totals.taxable.toFixed(2)),
          totalCgst: parseFloat(totals.cgst.toFixed(2)),
          totalSgst: parseFloat(totals.sgst.toFixed(2)),
          discountPercent,
          discountAmount: parseFloat(totals.discountAmount.toFixed(2)),
          remark,
        });
        alert('Converted to a Company Purchase Order.');
        onClose();
        return;
      }
      case 'company-purchase-return': {
        onAddPurchaseReturn({
          id: `pret-${Date.now()}`,
          docNumber: `DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          originalInvNumber: purchaseToEdit?.vendorInvoiceNumber || invoiceNoSearch || 'N/A',
          partyName: vendor.name,
          date,
          returnReason: 'Excess Supply',
          amount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Company Purchase Return.');
        onClose();
        return;
      }
      case 'customer-sale-order': {
        onAddSO({
          id: `so-${Date.now()}`,
          soNumber: `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: vendor.name,
          date,
          validUntil: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          totalAmount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Customer Sale Order.');
        onClose();
        return;
      }
      case 'customer-sale-return': {
        onAddSalesReturn({
          id: `sret-${Date.now()}`,
          docNumber: `CN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          originalInvNumber: purchaseToEdit?.vendorInvoiceNumber || invoiceNoSearch || 'N/A',
          partyName: vendor.name,
          date,
          returnReason: 'Wrong Item',
          amount: grandTotal,
          status: 'Pending',
        });
        alert('Converted to a Customer Sale Return.');
        onClose();
        return;
      }
      case 'customer-quotation': {
        onAddQuotation({
          id: `qt-${Date.now()}`,
          quoteNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: vendor.name,
          customerPhone: vendor.phone || '',
          date,
          validDays: 15,
          grandTotal,
          status: 'Sent',
        });
        alert('Converted to a Customer Quotation.');
        onClose();
        return;
      }
      case 'stock-adjustment': {
        onAddAdjustment({
          id: `adj-${Date.now()}`,
          adjustCode: `ADJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          date,
          productName: items[0].productName,
          adjustmentType: 'Addition (+)',
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
          customerId: vendor.id,
          customerName: vendor.name,
          customerGstin: vendor.gstin,
          customerPhone: vendor.phone || '',
          items: invoiceItems,
          subTotal: parseFloat(totals.taxable.toFixed(2)),
          totalDiscount: parseFloat(totals.discountAmount.toFixed(2)),
          totalCgst: parseFloat(totals.cgst.toFixed(2)),
          totalSgst: parseFloat(totals.sgst.toFixed(2)),
          totalIgst: 0,
          roundOff: 0,
          grandTotal,
          paymentMode: paymentMode === 'Cash' ? 'Cash' : 'Credit',
          status: paymentMode === 'Cash' ? 'Paid' : 'Unpaid',
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
        <h2 className="text-base font-bold text-white">{purchaseToEdit ? 'Edit Purchase Invoice' : 'Purchase Invoice'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <span className={paymentMode === 'Credit' ? 'text-white' : 'text-teal-200'}>Credit</span>
            <button
              type="button"
              role="switch"
              aria-checked={paymentMode === 'Cash'}
              onClick={() => setPaymentMode(paymentMode === 'Cash' ? 'Credit' : 'Cash')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                paymentMode === 'Cash' ? 'bg-emerald-400' : 'bg-teal-900/60'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  paymentMode === 'Cash' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={paymentMode === 'Cash' ? 'text-white' : 'text-teal-200'}>Cash</span>
          </div>
          <button
            type="button"
            title="Notify Vendor"
            className="p-1.5 rounded-md bg-white/90 hover:bg-white text-rose-600 shadow"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Reset Form"
            onClick={handleResetForm}
            className="p-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-900 shadow"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Optional Tabs / Badges Row */}
      <div className="flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
          #1 - {vendor?.name || 'Select Vendor'}
          <button type="button" className="text-rose-500 hover:text-rose-600"><X className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Company / Invoice Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[320px]">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Company Name
            </label>
            <PartySearchDropdown
              parties={vendors}
              selectedPartyId={vendorId}
              onSelect={setVendorId}
              createNewLabel="Vendor"
            />
          </div>

          <div className="text-xs font-bold text-rose-600">
            Due Amount : {vendor?.balance?.toLocaleString('en-IN') ?? 0}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-500 hover:bg-slate-400 text-white text-xs font-bold shadow"
          >
            <Pause className="h-3.5 w-3.5" /> Hold
          </button>

          <button
            type="button"
            onClick={() => setIsIoclModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-md border border-amber-400/30"
            title="Import official Indian Oil Corporation Bottling Plant Purchase Tax Invoice"
          >
            <Sparkles className="h-3.5 w-3.5" /> 🔥 Import IOCL Tax Invoice (MH5537072955)
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Invoice No :
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={invoiceNoSearch}
                onChange={(e) => setInvoiceNoSearch(e.target.value)}
                placeholder="Vendor's invoice number"
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                title="Load Purchase Invoice"
                onClick={handleSearchInvoice}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Date :
            </label>
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
            {/* Live entry row */}
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
              <td className="px-2 py-2 font-mono text-slate-500 text-center">
                {entryProduct?.hsnCode || '-'}
              </td>
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
                  <span className="font-mono font-bold text-right flex-1">
                    ₹{entryPriceExclTax.toFixed(2)}
                  </span>
                </div>
              </td>
              <td className="px-2 py-2 font-mono font-black text-right">
                ₹{entryAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={handleAddRow}
                  title="Add Item"
                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>

            {/* Saved rows */}
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-2 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="px-2 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{item.productName}</td>
                <td className="px-2 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">@{item.gstRate}%</td>
                <td className="px-2 py-2.5 font-mono text-center">{item.hsnCode}</td>
                <td className="px-2 py-2.5 text-center font-bold">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right font-mono">₹{item.mrp.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2.5 text-right font-mono">₹{item.listPrice.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2.5 text-right font-mono text-[11px] text-slate-500">
                  {item.taxExcluded ? 'Excl.' : 'Incl.'}
                </td>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <div className="text-[10px] font-bold text-slate-500">Dis. (on List Price)</div>
              <div className="font-black text-rose-600">₹{totals.disOnListPrice.toFixed(2)}</div>
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
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow"
          >
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
                    const isCurrentType = opt.key === 'company-purchase';
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
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      <EnterSalePriceModal
        isOpen={isSalePriceModalOpen}
        product={entryProduct || null}
        purchasePriceInclGst={entry.taxExcluded ? entry.listPrice * (1 + entry.gstRate / 100) : entry.listPrice}
        onCancel={() => setIsSalePriceModalOpen(false)}
        onConfirm={handleSalePriceConfirm}
      />

      <PaymentStatusModal
        isOpen={isPaymentStatusOpen}
        dueAmount={totals.grandTotal}
        banks={banks}
        narrations={narrations}
        onAddNarration={onAddNarration}
        parties={vendors}
        defaultShippingParty={vendor?.name || ''}
        onClose={() => setIsPaymentStatusOpen(false)}
        onSave={handlePaymentStatusSave}
      />

      {/* IOCL BOTTLING PLANT TAX INVOICE AUTO-IMPORT MODAL */}
      {isIoclModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl p-6 text-white space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-black text-lg">
                  ⛽
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Indian Oil Corporation Ltd (IOCL) Invoice Auto-Importer</h3>
                  <p className="text-xs text-slate-400">Bottling Plant / Depot Tax Invoice Generator (Rule 46 of GST Rules)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsIoclModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="font-black uppercase text-amber-400 text-[10px] tracking-wider">📋 Header & Tank Truck Details</div>
                
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Doc Name & Number *</label>
                  <input
                    type="text"
                    value={ioclInvNo}
                    onChange={e => setIoclInvNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono font-bold text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">SAP Doc No *</label>
                    <input
                      type="text"
                      value={ioclSapDocNo}
                      onChange={e => setIoclSapDocNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">T.T. No (Tanker) *</label>
                    <input
                      type="text"
                      value={ioclTtNo}
                      onChange={e => setIoclTtNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Invoice Date & Time *</label>
                  <input
                    type="date"
                    value={ioclDate}
                    onChange={e => setIoclDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="font-black uppercase text-amber-400 text-[10px] tracking-wider">📦 Bulk LPG Cylinder Line Items</div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-extrabold text-emerald-400">19 kg Indane Xtra TeJ LPG CYL (Item 10)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Quantity (EA Pcs)</span>
                      <input
                        type="number"
                        value={iocl19kgQty}
                        onChange={e => setIocl19kgQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-bold text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Weight (KG)</span>
                      <input
                        type="number"
                        value={iocl19kgWeight}
                        onChange={e => setIocl19kgWeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-bold text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-extrabold text-indigo-400">47.5kg Indane Xtra TeJ LPG CY (Item 50)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Quantity (EA Pcs)</span>
                      <input
                        type="number"
                        value={iocl47kgQty}
                        onChange={e => setIocl47kgQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-bold text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Weight (KG)</span>
                      <input
                        type="number"
                        value={iocl47kgWeight}
                        onChange={e => setIocl47kgWeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-bold text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Summary Preview */}
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-amber-300">Generated Invoice Grand Total</div>
                <div className="text-[11px] text-slate-400">Rate: ₹1,12,086.25 / Tonne | CGST 9% (₹62,196.10) + SGST 9% (₹62,196.10) | Rounding: ₹0.02</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400">₹8,15,460.00</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsIoclModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLoadIoclBillSample}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl text-xs shadow-lg transition"
              >
                ⚡ Auto-Fill & Generate Purchase Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
