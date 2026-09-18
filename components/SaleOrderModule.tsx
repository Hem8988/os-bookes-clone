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
  SaleOrder,
  PurchaseOrderItem,
  PurchaseOrderPayment,
  PurchaseOrder,
  PurchaseInvoice,
  Quotation,
  StockAdjustment,
  ReturnDocument,
  Invoice,
  InvoiceItem,
  NarrationMaster,
} from '../lib/types';
import { PaymentStatusModal } from './PaymentStatusModal';
import { ProductSearchDropdown } from './ProductSearchDropdown';
import { PartySearchDropdown } from './PartySearchDropdown';

interface SaleOrderModuleProps {
  customers: Customer[];
  products: Product[];
  banks: BankMaster[];
  narrations: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  saleOrders: SaleOrder[];
  soToEdit?: SaleOrder | null;
  onAddSO: (so: SaleOrder) => void;
  onUpdateSO?: (so: SaleOrder) => void;
  onAddPO: (po: PurchaseOrder) => void;
  onAddPurchase: (pur: PurchaseInvoice) => void;
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
  mrp: products[0]?.mrp || products[0]?.salePrice || 0,
  listPrice: products[0]?.salePrice || 0,
  gstRate: products[0]?.taxRate ?? 0,
  taxExcluded: true,
});

export const SaleOrderModule: React.FC<SaleOrderModuleProps> = ({
  customers,
  products,
  banks,
  narrations,
  onAddNarration,
  saleOrders,
  soToEdit,
  onAddSO,
  onUpdateSO,
  onAddPO,
  onAddPurchase,
  onAddQuotation,
  onAddAdjustment,
  onAddPurchaseReturn,
  onAddSalesReturn,
  onAddInvoice,
  onClose,
}) => {
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const [pendingSO, setPendingSO] = useState<SaleOrder | null>(null);
  const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [soNumberSearch, setSoNumberSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit'>('Credit');
  const [remark, setRemark] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [entry, setEntry] = useState(emptyEntry(products));
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  useEffect(() => {
    if (soToEdit) {
      const matched = customers.find((c) => c.name === soToEdit.customerName);
      if (matched) setCustomerId(matched.id);
      setSoNumberSearch(soToEdit.soNumber);
      setDate(soToEdit.date);
      setPaymentMode(soToEdit.paymentMode || 'Credit');
      setRemark(soToEdit.remark || '');
      setDiscountType(soToEdit.discountAmount && !soToEdit.discountPercent ? 'fixed' : 'percent');
      setDiscountValue(soToEdit.discountAmount && !soToEdit.discountPercent ? soToEdit.discountAmount : (soToEdit.discountPercent || 0));
      setItems(soToEdit.items || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soToEdit]);

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
      id: `soi-${Date.now()}`,
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
    let baseTaxable = 0;
    let disOnListPrice = 0;

    // First pass to get total baseTaxable
    items.forEach((item) => {
      const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
      baseTaxable += priceExclTax * item.quantity;
      disOnListPrice += Math.max(0, item.mrp - priceExclTax) * item.quantity;
    });

    const discountAmount = discountType === 'fixed' 
      ? discountValue 
      : (baseTaxable * discountValue) / 100;
    
    // Safety check to avoid NaN
    const discountFactor = baseTaxable > 0 ? (1 - discountAmount / baseTaxable) : 1;

    let gstTotal = 0;
    let discountedTaxable = 0;

    items.forEach((item) => {
      const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
      const rowTaxable = priceExclTax * item.quantity;
      
      const discountedRowTaxable = rowTaxable * discountFactor;
      const rowGst = (discountedRowTaxable * item.gstRate) / 100;

      totalQty += item.quantity;
      discountedTaxable += discountedRowTaxable;
      gstTotal += rowGst;
    });

    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;
    const grandTotal = discountedTaxable + gstTotal;

    return { totalQty, taxable: baseTaxable, discountedTaxable, cgst, sgst, disOnListPrice, discountAmount, grandTotal };
  }, [items, discountType, discountValue]);

  const handleSearchInvoice = () => {
    const match = saleOrders.find(
      (so) => so.soNumber.toLowerCase() === soNumberSearch.trim().toLowerCase()
    );
    if (!match) {
      if (soNumberSearch.trim()) alert('No Sale Order found with that Invoice No.');
      return;
    }
    const matched = customers.find((c) => c.name === match.customerName);
    if (matched) setCustomerId(matched.id);
    setDate(match.date);
    setPaymentMode(match.paymentMode || 'Credit');
    setRemark(match.remark || '');
    setDiscountType(match.discountAmount && !match.discountPercent ? 'fixed' : 'percent');
    setDiscountValue(match.discountAmount && !match.discountPercent ? match.discountAmount : (match.discountPercent || 0));
    setItems(match.items || []);
    setLastSavedTotal(match.totalAmount);
  };

  const handleResetForm = () => {
    setCustomerId(customers[0]?.id || '');
    setSoNumberSearch('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Credit');
    setRemark('');
    setDiscountType('percent');
    setDiscountValue(0);
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

    const so: SaleOrder = {
      id: soToEdit?.id || `so-${Date.now()}`,
      soNumber: soToEdit?.soNumber || `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customer.name,
      customerGstin: customer.gstin,
      date,
      validUntil: soToEdit?.validUntil || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      totalAmount: parseFloat(totals.grandTotal.toFixed(2)),
      status: soToEdit?.status || 'Pending',
      items,
      paymentMode,
      taxableAmount: parseFloat(totals.taxable.toFixed(2)),
      totalCgst: parseFloat(totals.cgst.toFixed(2)),
      totalSgst: parseFloat(totals.sgst.toFixed(2)),
      discountPercent: discountType === 'percent' ? discountValue : 0,
      discountAmount: discountType === 'fixed' ? discountValue : parseFloat(totals.discountAmount.toFixed(2)),
      remark,
      createdBy: soToEdit?.createdBy || 'Shiv Kumar (Admin)',
      payments: soToEdit?.payments,
      shippingParty: soToEdit?.shippingParty,
    };

    setPendingSO(so);
    setIsPaymentStatusOpen(true);
  };

  const handlePaymentStatusSave = (
    payments: PurchaseOrderPayment[],
    shippingParty: string,
    _attachmentName: string
  ) => {
    if (!pendingSO) return;
    const finalized: SaleOrder = {
      ...pendingSO,
      payments,
      shippingParty: shippingParty || undefined,
    };

    if (soToEdit) {
      if (onUpdateSO) onUpdateSO(finalized);
      setIsPaymentStatusOpen(false);
      setPendingSO(null);
      onClose();
    } else {
      onAddSO(finalized);
      setLastSavedTotal(finalized.totalAmount);
      setIsPaymentStatusOpen(false);
      setPendingSO(null);
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
      case 'customer-sale-order': {
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
          items,
          paymentMode,
          taxableAmount: parseFloat(totals.taxable.toFixed(2)),
          totalCgst: parseFloat(totals.cgst.toFixed(2)),
          totalSgst: parseFloat(totals.sgst.toFixed(2)),
          discountPercent: discountType === 'percent' ? discountValue : 0,
          discountAmount: parseFloat(totals.discountAmount.toFixed(2)),
          remark,
        });
        alert('Converted to a Company Purchase Order.');
        onClose();
        return;
      }
      case 'company-purchase': {
        onAddPurchase({
          id: `pur-${Date.now()}`,
          purchaseNumber: `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          vendorInvoiceNumber: soNumberSearch || `SO-REF-${Date.now().toString().slice(-6)}`,
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
          originalInvNumber: soToEdit?.soNumber || 'N/A',
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
          originalInvNumber: soToEdit?.soNumber || 'N/A',
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
      case 'customer-quotation': {
        onAddQuotation({
          id: `qt-${Date.now()}`,
          quoteNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: customer.name,
          customerPhone: customer.phone || '',
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
        <h2 className="text-base font-bold text-white">{soToEdit ? 'Edit Sale Order' : 'Sale Order'}</h2>
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

          <div className="text-xs font-bold text-rose-600">
            Due Amount : {customer?.balance?.toLocaleString('en-IN') ?? 0}
          </div>

          <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-500 hover:bg-slate-400 text-white text-xs font-bold shadow">
            <Pause className="h-3.5 w-3.5" /> Hold
          </button>

          <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow">
            <Sparkles className="h-3.5 w-3.5" /> Import Invoice (AI)
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Invoice No :</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={soNumberSearch}
                onChange={(e) => setSoNumberSearch(e.target.value)}
                placeholder="Search existing SO number"
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button type="button" title="Load Sale Order" onClick={handleSearchInvoice} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
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
        <table className="w-full text-left text-[10px] text-slate-700 dark:text-slate-300 min-w-[900px]">
          <thead className="bg-slate-900 text-white font-bold">
            <tr>
              <th className="px-2 py-1 w-14 text-center">S.NO.#</th>
              <th className="px-2 py-1">Product Name</th>
              <th className="px-2 py-1 w-20">GST %</th>
              <th className="px-2 py-1 w-24">HSN/SAC</th>
              <th className="px-2 py-1 w-24">Quantity</th>
              <th className="px-2 py-1 w-24">MRP</th>
              <th className="px-2 py-1 w-24">List Price</th>
              <th className="px-2 py-1 w-28">
                Price
                <span className="block text-[9px] font-normal text-slate-300">(TAX EXCLUDED)</span>
              </th>
              <th className="px-2 py-1 w-28">Amount</th>
              <th className="px-2 py-1 w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <tr className="bg-sky-50/60 dark:bg-slate-800/40">
              <td className="px-2 py-1 text-center font-bold text-slate-500">{items.length + 1}</td>
              <td className="px-2 py-1 relative">
                <ProductSearchDropdown
                  products={products}
                  selectedProductId={entry.productId}
                  onSelect={handleProductSelect}
                />
              </td>
              <td className="px-2 py-1">
                <select
                  value={entry.gstRate}
                  onChange={(e) => setEntry({ ...entry, gstRate: Number(e.target.value) })}
                  className="w-full py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-center"
                >
                  {GST_SLABS.map((rate) => (
                    <option key={rate} value={rate}>@{rate} %</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1 font-mono text-slate-500 text-center">{entryProduct?.hsnCode || '-'}</td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={(e) => setEntry({ ...entry, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-center"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  min={0}
                  value={entry.mrp}
                  onChange={(e) => setEntry({ ...entry, mrp: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] text-right"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  min={0}
                  value={entry.listPrice}
                  onChange={(e) => setEntry({ ...entry, listPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] text-right"
                />
              </td>
              <td className="px-2 py-1">
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
              <td className="px-2 py-1 font-mono font-black text-right">
                ₹{entryAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-1 text-center">
                <button type="button" onClick={handleAddRow} title="Add Item" className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Plus className="h-3 w-3" />
                </button>
              </td>
            </tr>

            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-2 py-1 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="px-2 py-1 font-extrabold text-slate-900 dark:text-slate-100">{item.productName}</td>
                <td className="px-2 py-1 text-center font-bold text-emerald-600 dark:text-emerald-400">@{item.gstRate}%</td>
                <td className="px-2 py-1 font-mono text-center">{item.hsnCode}</td>
                <td className="px-2 py-1 text-center font-bold">{item.quantity}</td>
                <td className="px-2 py-1 text-right font-mono">₹{item.mrp.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1 text-right font-mono">₹{item.listPrice.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1 text-right font-mono text-[9px] text-slate-500">{item.taxExcluded ? 'Excl.' : 'Incl.'}</td>
                <td className="px-2 py-1 text-right font-mono font-black">₹{item.amount.toLocaleString('en-IN')}</td>
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEditRow(item)} className="p-1 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer">
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDeleteRow(item.id)} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer">
                      <Trash2 className="h-3 w-3" />
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
              <div className="font-black text-slate-900 dark:text-slate-100">₹{totals.discountedTaxable.toFixed(2)}</div>
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
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Dis. Type</label>
              <div className="relative">
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value as 'percent' | 'fixed');
                    setDiscountValue(0);
                  }}
                  className="w-full py-2 px-3 pr-8 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="percent">% Percent</option>
                  <option value="fixed">₹ Amount</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {discountType === 'percent' ? 'Dis. %' : 'Dis. ₹'}
              </label>
              <input
                type="number"
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-right font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          {discountType === 'percent' && totals.discountAmount > 0 && (
            <div className="text-right text-[10px] text-slate-500 font-bold -mt-1">
              Discount: -₹{totals.discountAmount.toFixed(2)}
            </div>
          )}
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
                    const isCurrentType = opt.key === 'customer-sale-order';
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

      <PaymentStatusModal
        isOpen={isPaymentStatusOpen}
        dueAmount={totals.grandTotal}
        banks={banks}
        narrations={narrations}
        onAddNarration={onAddNarration}
        parties={customers}
        defaultShippingParty={customer?.name || ''}
        onClose={() => setIsPaymentStatusOpen(false)}
        onSave={handlePaymentStatusSave}
      />
    </div>
  );
};
