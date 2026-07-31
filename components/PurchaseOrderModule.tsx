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
  Filter,
  Info,
} from 'lucide-react';
import {
  BankMaster,
  Customer,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderPayment,
  PurchaseInvoice,
  SaleOrder,
  Quotation,
  StockAdjustment,
  ReturnDocument,
  Invoice,
  InvoiceItem,
  NarrationMaster,
} from '../lib/types';
import { PaymentStatusModal } from './PaymentStatusModal';
import { AddEditVendorModal } from './AddEditVendorModal';

interface PurchaseOrderModuleProps {
  vendors: Customer[];
  products: Product[];
  banks: BankMaster[];
  narrations: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  purchaseOrders: PurchaseOrder[];
  poToEdit?: PurchaseOrder | null;
  onAddPO: (po: PurchaseOrder) => void;
  onUpdatePO?: (po: PurchaseOrder) => void;
  onAddPurchase: (pur: PurchaseInvoice) => void;
  onAddSO: (so: SaleOrder) => void;
  onAddQuotation: (qt: Quotation) => void;
  onAddAdjustment: (adj: StockAdjustment) => void;
  onAddPurchaseReturn: (ret: ReturnDocument) => void;
  onAddSalesReturn: (ret: ReturnDocument) => void;
  onAddInvoice: (inv: Invoice) => void;
  onAddCustomer?: (customer: Customer) => void;
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

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-slate-50 font-black rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
};

const emptyEntry = (products: Product[]) => ({
  productId: products[0]?.id || '',
  quantity: 1,
  mrp: products[0]?.mrp || products[0]?.purchasePrice || 0,
  listPrice: products[0]?.purchasePrice || 0,
  gstRate: products[0]?.taxRate ?? 0,
  taxExcluded: true,
  otherInfo: '',
});

export const PurchaseOrderModule: React.FC<PurchaseOrderModuleProps> = ({
  vendors,
  products,
  banks,
  narrations,
  onAddNarration,
  purchaseOrders,
  poToEdit,
  onAddPO,
  onUpdatePO,
  onAddPurchase,
  onAddSO,
  onAddQuotation,
  onAddAdjustment,
  onAddPurchaseReturn,
  onAddSalesReturn,
  onAddInvoice,
  onAddCustomer,
  onClose,
}) => {
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const [pendingPO, setPendingPO] = useState<PurchaseOrder | null>(null);
  const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [poNumberSearch, setPoNumberSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit'>('Credit');
  const [remark, setRemark] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [entry, setEntry] = useState(emptyEntry(products));
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false);

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const [isOtherInfoModalOpen, setIsOtherInfoModalOpen] = useState(false);
  const [otherInfoTargetIdx, setOtherInfoTargetIdx] = useState<number | null>(null);
  const [tempOtherInfo, setTempOtherInfo] = useState('');

  useEffect(() => {
    if (entry.productId) {
      const p = products.find((p) => p.id === entry.productId);
      if (p) setProductSearchQuery(p.name);
    }
  }, [entry.productId, products]);

  useEffect(() => {
    if (vendorId) {
      const v = vendors.find(v => v.id === vendorId);
      if (v) setVendorSearchQuery(v.name);
    }
  }, [vendorId, vendors]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery || !isVendorDropdownOpen) return vendors;
    const lowerQuery = vendorSearchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(lowerQuery) ||
        (v.phone && v.phone.includes(vendorSearchQuery))
    );
  }, [vendors, vendorSearchQuery, isVendorDropdownOpen]);

  const handleVendorSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVendors.length > 0) {
        setVendorId(filteredVendors[0].id);
        setVendorSearchQuery(filteredVendors[0].name);
        setIsVendorDropdownOpen(false);
      } else if (vendorSearchQuery.trim()) {
        setIsCreateVendorModalOpen(true);
        setIsVendorDropdownOpen(false);
      }
    }
  };

  useEffect(() => {
    if (poToEdit) {
      const matchedVendor = vendors.find((v) => v.name === poToEdit.vendorName);
      if (matchedVendor) setVendorId(matchedVendor.id);
      setPoNumberSearch(poToEdit.poNumber);
      setDate(poToEdit.date);
      setPaymentMode(poToEdit.paymentMode || 'Credit');
      setRemark(poToEdit.remark || '');
      setDiscountPercent(poToEdit.discountPercent || 0);
      setItems(poToEdit.items || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poToEdit]);

  const vendor = vendors.find((v) => v.id === vendorId);
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
      otherInfo: item.otherInfo || '',
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

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery || !isProductDropdownOpen) return products;
    const lowerQuery = productSearchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
        (p.barcode && p.barcode.includes(productSearchQuery))
    );
  }, [products, productSearchQuery, isProductDropdownOpen]);

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        handleProductSelect(filteredProducts[0].id);
        setProductSearchQuery(filteredProducts[0].name);
        setIsProductDropdownOpen(false);
      }
    }
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
    const match = purchaseOrders.find(
      (po) => po.poNumber.toLowerCase() === poNumberSearch.trim().toLowerCase()
    );
    if (!match) {
      if (poNumberSearch.trim()) alert('No Purchase Order found with that Invoice No.');
      return;
    }
    const matchedVendor = vendors.find((v) => v.name === match.vendorName);
    if (matchedVendor) setVendorId(matchedVendor.id);
    setDate(match.date);
    setPaymentMode(match.paymentMode || 'Credit');
    setRemark(match.remark || '');
    setDiscountPercent(match.discountPercent || 0);
    setItems(match.items || []);
    setLastSavedTotal(match.totalAmount);
  };

  const handleResetForm = () => {
    setVendorId(vendors[0]?.id || '');
    setPoNumberSearch('');
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

    const po: PurchaseOrder = {
      id: poToEdit?.id || `po-${Date.now()}`,
      poNumber: poToEdit?.poNumber || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: vendor.name,
      vendorGstin: vendor.gstin,
      date,
      expectedDate: poToEdit?.expectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      itemsCount: items.length,
      totalAmount: parseFloat(totals.grandTotal.toFixed(2)),
      status: poToEdit?.status || 'Issued',
      items,
      paymentMode,
      taxableAmount: parseFloat(totals.taxable.toFixed(2)),
      totalCgst: parseFloat(totals.cgst.toFixed(2)),
      totalSgst: parseFloat(totals.sgst.toFixed(2)),
      discountPercent,
      discountAmount: parseFloat(totals.discountAmount.toFixed(2)),
      remark,
      createdBy: poToEdit?.createdBy || 'Shiv Kumar (Admin)',
      payments: poToEdit?.payments,
      shippingParty: poToEdit?.shippingParty,
    };

    setPendingPO(po);
    setIsPaymentStatusOpen(true);
  };

  const handlePaymentStatusSave = (
    payments: PurchaseOrderPayment[],
    shippingParty: string,
    _attachmentName: string
  ) => {
    if (!pendingPO) return;
    const finalizedPO: PurchaseOrder = {
      ...pendingPO,
      payments,
      shippingParty: shippingParty || undefined,
    };

    if (poToEdit) {
      if (onUpdatePO) onUpdatePO(finalizedPO);
      setIsPaymentStatusOpen(false);
      setPendingPO(null);
      onClose();
    } else {
      onAddPO(finalizedPO);
      setLastSavedTotal(finalizedPO.totalAmount);
      setIsPaymentStatusOpen(false);
      setPendingPO(null);
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

    const today = new Date().toISOString().split('T')[0];
    const grandTotal = parseFloat(totals.grandTotal.toFixed(2));

    switch (target) {
      case 'company-purchase-order': {
        return;
      }
      case 'company-purchase': {
        onAddPurchase({
          id: `pur-${Date.now()}`,
          purchaseNumber: `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          vendorInvoiceNumber: poNumberSearch || `PO-REF-${Date.now().toString().slice(-6)}`,
          vendorName: vendor.name,
          vendorGstin: vendor.gstin || '',
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
          originalInvNumber: poToEdit?.poNumber || 'N/A',
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
          originalInvNumber: poToEdit?.poNumber || 'N/A',
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
        <h2 className="text-base font-bold text-white">{poToEdit ? 'Edit Purchase Order' : 'Purchase Order'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <span className={paymentMode === 'Credit' ? 'text-white' : 'text-teal-200'}>Credit</span>
            <button
              type="button"
              role="switch"
              aria-checked={paymentMode === 'Cash'}
              onClick={() => setPaymentMode(paymentMode === 'Cash' ? 'Credit' : 'Cash')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${paymentMode === 'Cash' ? 'bg-emerald-400' : 'bg-teal-900/60'
                }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${paymentMode === 'Cash' ? 'translate-x-5' : 'translate-x-1'
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
          #1 - {vendor?.name || 'SHIV SHANKER TYRES'}
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
            <div className="flex items-center gap-1.5 relative">
              <div className="relative w-full">
                <input
                  type="text"
                  value={isVendorDropdownOpen ? vendorSearchQuery : vendor?.name || ''}
                  onChange={(e) => {
                    setVendorSearchQuery(e.target.value);
                    setIsVendorDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setVendorSearchQuery('');
                    setIsVendorDropdownOpen(true);
                  }}
                  onKeyDown={handleVendorSearchKeyDown}
                  placeholder="Select Name or Enter Mobile No."
                  className="w-full py-2 px-3 rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                title="Search Vendor"
                className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shrink-0"
              >
                <Search className="h-4 w-4" />
              </button>

              {isVendorDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsVendorDropdownOpen(false)} />
                  <div className="absolute z-30 top-full mt-1 left-0 w-[450px] max-h-[400px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-b-lg">
                    {filteredVendors.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 flex flex-col items-center gap-2">
                        <span>No exact match found.</span>
                        <button
                          onClick={() => {
                            setIsCreateVendorModalOpen(true);
                            setIsVendorDropdownOpen(false);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm w-full"
                        >
                          + Create New Vendor: "{vendorSearchQuery}"
                        </button>
                      </div>
                    ) : (
                      filteredVendors.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => {
                            setVendorId(v.id);
                            setVendorSearchQuery(v.name);
                            setIsVendorDropdownOpen(false);
                          }}
                          className={`p-2 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${vendorId === v.id ? 'bg-sky-100 dark:bg-sky-900/40' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{v.name}</span>
                            <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{v.balance}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <div>
                              <span>City: {v.city || 'N/A'}</span>
                              <span className="mx-1">|</span>
                              <span>Mobile No: {v.phone || 'N/A'}</span>
                              {v.gstin && (
                                <>
                                  <span className="mx-1">|</span>
                                  <span>GSTIN: {v.gstin}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                              <Edit3 className="h-3.5 w-3.5 text-teal-600 hover:text-teal-500" />
                              <Trash2 className="h-3.5 w-3.5 text-rose-600 hover:text-rose-500" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
          >
            <Sparkles className="h-3.5 w-3.5" /> Import Invoice (AI)
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
                value={poNumberSearch}
                onChange={(e) => setPoNumberSearch(e.target.value)}
                placeholder=""
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
              />
              <button
                type="button"
                title="Load Purchase Order"
                onClick={handleSearchInvoice}
                className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white"
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
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
          <thead className="bg-slate-800 text-white font-bold">
            <tr>
              <th className="px-2 py-1 w-14 text-center border-r border-slate-700">S.NO.#</th>
              <th className="px-2 py-1 border-r border-slate-700">
                <div className="flex items-center justify-between">
                  <span>PRODUCT NAME</span>
                  <div className="flex items-center gap-1 bg-teal-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                    <Filter className="h-2.5 w-2.5" /> Product Name
                  </div>
                </div>
              </th>
              <th className="px-2 py-1 w-20 text-center border-r border-slate-700">GST %</th>
              <th className="px-2 py-1 w-24 text-center border-r border-slate-700">HSN/SAC</th>
              <th className="px-2 py-1 w-24 text-center border-r border-slate-700">QUANTITY</th>
              <th className="px-2 py-1 w-24 text-center border-r border-slate-700">MRP</th>
              <th className="px-2 py-1 w-24 text-center border-r border-slate-700">List Price</th>
              <th className="px-2 py-1 w-28 text-center border-r border-slate-700 leading-tight">
                (TAX EXCLUDED)
                <span className="block text-[10px] font-bold">PRICE</span>
              </th>
              <th className="px-2 py-1 w-28 text-center border-r border-slate-700">AMOUNT</th>
              <th className="px-2 py-1 w-20 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {/* Live entry row */}
            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <td className="px-2 py-2 text-center font-bold text-slate-500">{items.length + 1}</td>
              <td className="px-2 py-2 relative">
                <div className="flex items-center gap-2 min-w-[300px]">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={isProductDropdownOpen ? productSearchQuery : entryProduct?.name || ''}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setProductSearchQuery('');
                        setIsProductDropdownOpen(true);
                      }}
                      onKeyDown={handleProductSearchKeyDown}
                      placeholder="Enter Product Name"
                      className="w-full py-1.5 px-2 rounded bg-teal-50 dark:bg-slate-900 border border-teal-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {isProductDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsProductDropdownOpen(false)} />
                      <div className="absolute z-30 top-full mt-1 left-0 w-[550px] max-h-[500px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-b-lg">
                        {filteredProducts.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500 text-center">No exact match found.</div>
                        ) : (
                          filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                handleProductSelect(p.id);
                                setProductSearchQuery(p.name);
                                setIsProductDropdownOpen(false);
                              }}
                              className={`p-2 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors ${entry.productId === p.id ? 'bg-sky-100 dark:bg-sky-900/40' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {highlightMatch(p.name, productSearchQuery)} <span className="text-slate-500 ml-1">Qty : {p.autoQty || 1}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                                    {p.stock} {p.unit}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Edit3 className="h-3.5 w-3.5 text-teal-600 hover:text-teal-500" />
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600 hover:text-rose-500" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <span>Product Code : {p.sku}</span>
                                <span className="text-rose-600">MRP : {p.mrp?.toFixed(2) || '0.00'}</span>
                                <span className="text-emerald-600">PRICE : {p.salePrice?.toFixed(2) || '0.00'}</span>
                                <span className="text-slate-500">W-PRICE : {p.wholesalePrice?.toFixed(2) || '0.00'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTempOtherInfo(entry.otherInfo || '');
                      setOtherInfoTargetIdx(-1);
                      setIsOtherInfoModalOpen(true);
                    }}
                    title="Other Info"
                    className="text-teal-600 hover:text-teal-500 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
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
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${entry.taxExcluded ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${entry.taxExcluded ? 'translate-x-3.5' : 'translate-x-0.5'
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
                <td className="px-2 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <span>{item.productName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempOtherInfo(item.otherInfo || '');
                        setOtherInfoTargetIdx(idx);
                        setIsOtherInfoModalOpen(true);
                      }}
                      title="Other Info"
                      className="text-teal-600 hover:text-teal-500 transition-colors"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </td>
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
      <div className="mt-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-50 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 bg-slate-900 text-white shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.3)]">
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
                    const isCurrentType = opt.key === 'company-purchase-order';
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isCurrentType}
                        onClick={() => handleConvert(opt.key)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${isCurrentType
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

      {isCreateVendorModalOpen && (
        <AddEditVendorModal
          isOpen={isCreateVendorModalOpen}
          defaultType="Vendor"
          customerToEdit={{
            id: '',
            name: isNaN(Number(vendorSearchQuery)) ? vendorSearchQuery : '',
            phone: !isNaN(Number(vendorSearchQuery)) ? vendorSearchQuery : '',
            email: '',
            address: '',
            city: '',
            state: '',
            balance: 0,
            creditLimit: 0,
            type: 'Vendor',
            accountGroup: 'Sundry Creditors'
          } as Customer}
          onClose={() => setIsCreateVendorModalOpen(false)}
          onSave={(newVendor) => {
            if (onAddCustomer) {
              onAddCustomer(newVendor);
              setVendorId(newVendor.id);
              setVendorSearchQuery(newVendor.name);
            }
            setIsCreateVendorModalOpen(false);
          }}
        />
      )}

      {isOtherInfoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Other Info</h3>
              <button
                type="button"
                onClick={() => setIsOtherInfoModalOpen(false)}
                className="text-rose-500 hover:text-rose-700 transition-colors"
              >
                <X className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-800 mb-2">Other Informations</label>
              <input
                type="text"
                value={tempOtherInfo}
                onChange={(e) => setTempOtherInfo(e.target.value)}
                placeholder="ex. Additional Info"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="p-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (otherInfoTargetIdx === -1) {
                    setEntry({ ...entry, otherInfo: tempOtherInfo });
                  } else if (otherInfoTargetIdx !== null) {
                    const newItems = [...items];
                    newItems[otherInfoTargetIdx].otherInfo = tempOtherInfo;
                    setItems(newItems);
                  }
                  setIsOtherInfoModalOpen(false);
                }}
                className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
