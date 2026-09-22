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
  CreditCard,
  Wallet,
  Calendar,
  Building2,
  Package,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Tag,
  Receipt,
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
  EmployeeMaster,
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
  staff?: EmployeeMaster[];
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

const CONVERT_OPTIONS: { key: ConvertTarget; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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

const QUICK_NARRATIONS = [
  'Payment due in 15 days',
  'Goods once sold cannot be returned',
  'Urgent dispatch requested',
  'Special corporate discount applied',
];

const emptyEntry = (products: Product[]) => ({
  productId: products[0]?.id || '',
  quantity: 1,
  mrp: products[0]?.mrp || products[0]?.salePrice || 0,
  listPrice: products[0]?.salePrice || 0,
  discountType: 'percent' as 'percent' | 'fixed',
  discountValue: 0,
  gstRate: products[0]?.taxRate ?? 18,
  taxExcluded: true,
});

export const SaleOrderModule: React.FC<SaleOrderModuleProps> = ({
  customers,
  products,
  banks,
  narrations,
  onAddNarration,
  staff = [],
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
  const [discountApplyOn, setDiscountApplyOn] = useState<'taxable' | 'total'>('taxable');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [entry, setEntry] = useState(emptyEntry(products));
  const [lastSavedTotal, setLastSavedTotal] = useState(0);

  // Delivery / Driver Assignment State
  const [deliveryBoyId, setDeliveryBoyId] = useState(soToEdit?.deliveryBoyId || '');
  const [deliveryBoyName, setDeliveryBoyName] = useState(soToEdit?.deliveryBoyName || '');
  const [driverPhone, setDriverPhone] = useState(soToEdit?.driverPhone || '');
  const [vehicleNumber, setVehicleNumber] = useState(soToEdit?.vehicleNumber || '');

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
      setDiscountApplyOn(soToEdit.discountApplyOn || 'taxable');
      setItems(soToEdit.items || []);
      setDeliveryBoyId(soToEdit.deliveryBoyId || '');
      setDeliveryBoyName(soToEdit.deliveryBoyName || '');
      setDriverPhone(soToEdit.driverPhone || '');
      setVehicleNumber(soToEdit.vehicleNumber || '');
    }
  }, [soToEdit, customers]);

  const customer = customers.find((c) => c.id === customerId);

  // Auto-fill driver from customer's default assigned delivery person if not manually set
  useEffect(() => {
    if (customer && !soToEdit && !deliveryBoyId) {
      if (customer.defaultDeliveryBoyId || customer.defaultDeliveryBoyName) {
        const dId = customer.defaultDeliveryBoyId || '';
        const dName = customer.defaultDeliveryBoyName || '';
        setDeliveryBoyId(dId);
        setDeliveryBoyName(dName);
        const matchedEmp = staff.find((s) => s.id === dId || s.name.toLowerCase() === dName.toLowerCase());
        if (matchedEmp) {
          setDriverPhone(matchedEmp.phone || '');
          if (matchedEmp.designation && matchedEmp.designation.includes('(') && matchedEmp.designation.includes(')')) {
            const vMatch = matchedEmp.designation.match(/\((.*?)\)/);
            if (vMatch) setVehicleNumber(vMatch[1]);
          }
        }
      }
    }
  }, [customerId, customer, staff, soToEdit, deliveryBoyId]);

  const handleDriverSelect = (empId: string) => {
    setDeliveryBoyId(empId);
    if (!empId) {
      setDeliveryBoyName('');
      setDriverPhone('');
      setVehicleNumber('');
      return;
    }
    const emp = staff.find((s) => s.id === empId);
    if (emp) {
      setDeliveryBoyName(emp.name);
      setDriverPhone(emp.phone || '');
      if (emp.designation && emp.designation.includes('(') && emp.designation.includes(')')) {
        const vMatch = emp.designation.match(/\((.*?)\)/);
        if (vMatch) setVehicleNumber(vMatch[1]);
      }
    }
  };
  const entryProduct = products.find((p) => p.id === entry.productId);

  const entryPriceExclTax = entry.taxExcluded
    ? entry.listPrice
    : entry.listPrice / (1 + entry.gstRate / 100);
  const entryGrossTaxable = entryPriceExclTax * entry.quantity;
  const entryDiscountAmount = entry.discountType === 'percent'
    ? (entryGrossTaxable * (Number(entry.discountValue) || 0)) / 100
    : (Number(entry.discountValue) || 0);
  const entryNetTaxable = Math.max(0, entryGrossTaxable - entryDiscountAmount);
  const entryGstAmount = (entryNetTaxable * entry.gstRate) / 100;
  const entryAmount = entryNetTaxable + entryGstAmount;

  const handleAddRow = () => {
    if (!entryProduct) return;
    const newItem: PurchaseOrderItem = {
      id: `soi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: entryProduct.id,
      productName: entryProduct.name,
      hsnCode: entryProduct.hsnCode,
      gstRate: entry.gstRate,
      quantity: Math.max(1, entry.quantity),
      mrp: entry.mrp,
      listPrice: entry.listPrice,
      taxExcluded: entry.taxExcluded,
      discountType: entry.discountType,
      discountValue: entry.discountValue || 0,
      discountPercent: entry.discountType === 'percent' ? (entry.discountValue || 0) : 0,
      discountAmount: parseFloat(entryDiscountAmount.toFixed(2)),
      taxableAmount: parseFloat(entryNetTaxable.toFixed(2)),
      cgstAmount: parseFloat((entryGstAmount / 2).toFixed(2)),
      sgstAmount: parseFloat((entryGstAmount / 2).toFixed(2)),
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
      discountType: item.discountType || (item.discountPercent ? 'percent' : 'percent'),
      discountValue: item.discountValue ?? item.discountPercent ?? (item.discountAmount || 0),
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
    const customPartyRate = customer?.partyRates?.find((pr) => pr.productId === productId);
    const defaultRate = (customPartyRate && ((customPartyRate.customRate || customPartyRate.price) > 0))
      ? (customPartyRate.customRate || customPartyRate.price)
      : (prod?.salePrice || 0);

    setEntry((prev) => ({
      ...prev,
      productId,
      mrp: prod?.mrp || prod?.salePrice || 0,
      listPrice: defaultRate,
      discountType: 'percent',
      discountValue: 0,
      gstRate: prod?.taxRate ?? 18,
    }));
  };

  const totals = useMemo(() => {
    let totalQty = 0;
    let grossTaxable = 0;
    let totalLineDiscount = 0;
    let netTaxable = 0;
    let totalGst = 0;
    let disOnListPrice = 0;

    items.forEach((item) => {
      const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
      const rowGrossTaxable = priceExclTax * item.quantity;
      
      const rowDiscountType = item.discountType || (item.discountPercent ? 'percent' : 'percent');
      const rowDiscountVal = item.discountValue ?? item.discountPercent ?? (item.discountAmount || 0);
      const rowDiscountAmt = item.discountAmount !== undefined && item.discountAmount > 0
        ? item.discountAmount
        : (rowDiscountType === 'percent' ? (rowGrossTaxable * rowDiscountVal) / 100 : rowDiscountVal);

      const rowNetTaxable = Math.max(0, rowGrossTaxable - rowDiscountAmt);
      const rowGst = (rowNetTaxable * item.gstRate) / 100;

      totalQty += item.quantity;
      grossTaxable += rowGrossTaxable;
      totalLineDiscount += rowDiscountAmt;
      netTaxable += rowNetTaxable;
      totalGst += rowGst;
      disOnListPrice += Math.max(0, item.mrp - priceExclTax) * item.quantity;
    });

    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const grandTotal = netTaxable + totalGst;

    return {
      totalQty,
      grossTaxable,
      totalLineDiscount,
      taxable: netTaxable,
      discountedTaxable: netTaxable,
      grossWithGst: netTaxable + totalGst,
      cgst,
      sgst,
      disOnListPrice,
      discountAmount: totalLineDiscount,
      grandTotal,
      discountApplyOn: 'taxable' as const,
    };
  }, [items]);

  const handleSearchInvoice = () => {
    const match = saleOrders.find(
      (so) => so.soNumber.toLowerCase() === soNumberSearch.trim().toLowerCase()
    );
    if (!match) {
      if (soNumberSearch.trim()) alert('No Sale Order found with that Invoice/SO No.');
      return;
    }
    const matched = customers.find((c) => c.name === match.customerName);
    if (matched) setCustomerId(matched.id);
    setDate(match.date);
    setPaymentMode(match.paymentMode || 'Credit');
    setRemark(match.remark || '');
    setDiscountType(match.discountAmount && !match.discountPercent ? 'fixed' : 'percent');
    setDiscountValue(match.discountAmount && !match.discountPercent ? match.discountAmount : (match.discountPercent || 0));
    setDiscountApplyOn(match.discountApplyOn || 'taxable');
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
    setDiscountApplyOn('taxable');
    setItems([]);
    setEntry(emptyEntry(products));
  };

  const handleSave = () => {
    if (!customer) {
      alert('Please select a Company / Customer Name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product line item to this order');
      return;
    }

    const so: SaleOrder = {
      id: soToEdit?.id || `so-${Date.now()}`,
      soNumber: soToEdit?.soNumber || `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || customer.city,
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
      discountPercent: 0,
      discountAmount: parseFloat(totals.totalLineDiscount.toFixed(2)),
      discountApplyOn: 'taxable',
      remark,
      createdBy: soToEdit?.createdBy || 'Shiv Kumar (Admin)',
      payments: soToEdit?.payments,
      shippingParty: soToEdit?.shippingParty,
      deliveryBoyId: deliveryBoyId || undefined,
      deliveryBoyName: deliveryBoyName || undefined,
      driverPhone: driverPhone || undefined,
      vehicleNumber: vehicleNumber || undefined,
      deliveryStatus: deliveryBoyId ? (soToEdit?.deliveryStatus || 'Assigned') : 'Unassigned',
      assignedAt: deliveryBoyId ? (soToEdit?.assignedAt || new Date().toISOString()) : undefined,
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

  const dueBalance = customer?.balance || 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col min-h-screen text-slate-800 dark:text-slate-100 font-sans -mx-4 -mt-4 md:-mx-6 md:-mt-6 -mb-24 md:-mb-24 transition-colors">
      {/* Sleek Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 md:px-6 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {soToEdit ? 'Edit Sale Order' : 'Sale Order'}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                soToEdit 
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${soToEdit ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                {soToEdit ? `Editing: ${soToEdit.soNumber}` : 'Draft Order'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create and dispatch B2B customer sale orders with realtime GST calculation
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Payment Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPaymentMode('Credit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                paymentMode === 'Credit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              Credit
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('Cash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                paymentMode === 'Cash'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Cash
            </button>
          </div>

          <button
            type="button"
            title="Customer AI Automation"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs transition-colors"
          >
            <Sparkles className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Reset Form"
            onClick={handleResetForm}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 shadow-xs transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 shadow-xs transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="p-4 md:p-6 space-y-5 max-w-[1700px] mx-auto w-full flex-1">
        
        {/* Section 1: Customer Info & Order Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Party Details Card (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Customer / Company Name <span className="text-rose-500">*</span>
                </label>
                {customer?.gstin && (
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    GSTIN: <span className="font-semibold text-slate-700 dark:text-slate-200">{customer.gstin}</span>
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <PartySearchDropdown
                  parties={customers}
                  selectedPartyId={customerId}
                  onSelect={setCustomerId}
                  createNewLabel="Customer"
                  placeholder="Search customer by name or phone..."
                />
              </div>
            </div>

            {/* Quick Customer Badges & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    dueBalance > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                  }`}
                >
                  <AlertCircle className={`h-3.5 w-3.5 ${dueBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                  Due Balance: ₹{dueBalance.toLocaleString('en-IN')}
                </div>
                {customer?.customerCode && (
                  <span className="inline-flex text-[11px] font-mono font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-lg">
                    ID: {customer.customerCode}
                  </span>
                )}
                {customer?.partyRates && customer.partyRates.length > 0 && (
                  <span className="inline-flex text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                    🏷️ {customer.partyRates.length} Monthly Rates
                  </span>
                )}
                {customer?.phone && (
                  <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    📞 {customer.phone}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" /> Hold Order
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Import AI Invoice
                </button>
              </div>
            </div>
          </div>

          {/* Order Details Card (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Order Number / Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Order / Invoice No.
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={soNumberSearch}
                      onChange={(e) => setSoNumberSearch(e.target.value)}
                      placeholder="Search SO# (e.g. SO-2026)"
                      className="w-full py-2 px-3 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                    <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    title="Find Existing SO"
                    onClick={handleSearchInvoice}
                    className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Order Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Order Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2 px-3 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Driver / Delivery Person Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Assign Driver / Delivery
                  </span>
                  {deliveryBoyName && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                      Assigned
                    </span>
                  )}
                </label>
                <select
                  value={deliveryBoyId}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                >
                  <option value="">-- No Driver (Unassigned) --</option>
                  {staff
                    .filter((s) => s.active !== false)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.role === 'Delivery Boy' || emp.role === 'Driver' ? '🚚 ' : '👤 '}
                        {emp.name} ({emp.role}) {emp.phone ? `- ${emp.phone}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Vehicle No. / Delivery Route
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MP-09-GF-4432 (Route 1)"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Driver:</span>
                {deliveryBoyName ? (
                  <span className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-md text-[11px]">
                    🚚 {deliveryBoyName} {vehicleNumber ? `(${vehicleNumber})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md text-[11px]">
                    ⚠️ Unassigned
                  </span>
                )}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                {paymentMode === 'Cash' ? 'Cash Settlement' : 'Net Credit'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Line Items Entry & Grid Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Fast Product Entry Toolbar */}
          <div className="p-4 bg-gradient-to-b from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Fast Line Item Entry
              </h3>
              <span className="text-[11px] text-slate-400">
                (Set item rate, per-item discount, quantity and click Add)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
              {/* Product Search (3 Cols) */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Product / Item Name <span className="text-rose-500">*</span>
                </label>
                <ProductSearchDropdown
                  products={products}
                  selectedProductId={entry.productId}
                  onSelect={handleProductSelect}
                  placeholder="Select or search product..."
                />
              </div>

              {/* GST Slab (1 Col) */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  GST %
                </label>
                <select
                  value={entry.gstRate}
                  onChange={(e) => setEntry({ ...entry, gstRate: Number(e.target.value) })}
                  className="w-full py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {GST_SLABS.map((rate) => (
                    <option key={rate} value={rate}>@{rate}%</option>
                  ))}
                </select>
              </div>

              {/* HSN/SAC (1 Col) */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  HSN/SAC
                </label>
                <div className="py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 text-center truncate">
                  {entryProduct?.hsnCode || '-'}
                </div>
              </div>

              {/* Quantity (1 Col) */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={(e) => setEntry({ ...entry, quantity: parseInt(e.target.value) || 1 })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRow();
                  }}
                  className="w-full py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Rate / List Price (1 Col) */}
              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Rate (₹)
                  </label>
                  {customer?.partyRates?.some(pr => pr.productId === entry.productId && ((pr.customRate ?? pr.price) > 0)) && (
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400" title="Custom Rate Active">
                      🏷️
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={entry.listPrice}
                  onChange={(e) => setEntry({ ...entry, listPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full py-2 px-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* MRP (1 Col) */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={entry.mrp}
                  onChange={(e) => setEntry({ ...entry, mrp: parseFloat(e.target.value) || 0 })}
                  className="w-full py-2 px-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Item Discount (Dis % / ₹) (2 Cols) */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Item Discount
                  </label>
                  {entryDiscountAmount > 0 && (
                    <span className="text-[10px] font-bold font-mono text-rose-600 dark:text-rose-400">
                      -₹{entryDiscountAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={entry.discountType}
                    onChange={(e) => setEntry({ ...entry, discountType: e.target.value as 'percent' | 'fixed' })}
                    className="w-14 py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">₹</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={entry.discountType === 'percent' ? 100 : undefined}
                    value={entry.discountValue || ''}
                    placeholder="0"
                    onChange={(e) => setEntry({ ...entry, discountValue: parseFloat(e.target.value) || 0 })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddRow();
                    }}
                    className="w-full py-2 px-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 text-xs font-bold font-mono text-right text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-rose-300"
                  />
                </div>
              </div>

              {/* Tax Mode Switch (1 Col) */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 text-center">
                  Tax Excl.
                </label>
                <div className="flex items-center justify-center py-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={entry.taxExcluded}
                    onClick={() => setEntry({ ...entry, taxExcluded: !entry.taxExcluded })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                      entry.taxExcluded ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        entry.taxExcluded ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Amount Preview & Add Action (1 Col) */}
              <div className="sm:col-span-2 md:col-span-1 flex flex-col items-stretch gap-1">
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Net Total</span>
                  <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 truncate block">
                    ₹{entryAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1050px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">#</th>
                  <th className="px-3 py-3">Product Name</th>
                  <th className="px-3 py-3 w-20 text-center">GST %</th>
                  <th className="px-3 py-3 w-24 text-center">HSN/SAC</th>
                  <th className="px-3 py-3 w-20 text-center">Qty</th>
                  <th className="px-3 py-3 w-24 text-right">Rate</th>
                  <th className="px-3 py-3 w-24 text-right">MRP</th>
                  <th className="px-3 py-3 w-36 text-center">Item Discount</th>
                  <th className="px-3 py-3 w-28 text-right">Taxable Val</th>
                  <th className="px-3 py-3 w-24 text-right">GST Amt</th>
                  <th className="px-3 py-3 w-28 text-right">Net Total</th>
                  <th className="px-3 py-3 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-sm">No items added to this order yet</p>
                        <p className="text-xs text-slate-400">Use the fast entry bar above to add products with individual discounts to your sale order.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const priceExclTax = item.taxExcluded ? item.listPrice : item.listPrice / (1 + item.gstRate / 100);
                    const rowGrossTaxable = priceExclTax * item.quantity;
                    const rowDiscountType = item.discountType || (item.discountPercent ? 'percent' : 'percent');
                    const rowDiscountVal = item.discountValue ?? item.discountPercent ?? (item.discountAmount || 0);
                    const rowDiscountAmt = item.discountAmount !== undefined && item.discountAmount > 0
                      ? item.discountAmount
                      : (rowDiscountType === 'percent' ? (rowGrossTaxable * rowDiscountVal) / 100 : rowDiscountVal);
                    const rowNetTaxable = Math.max(0, rowGrossTaxable - rowDiscountAmt);
                    const rowGst = (rowNetTaxable * item.gstRate) / 100;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {item.productName}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            @{item.gstRate}%
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-center text-slate-500 dark:text-slate-400">
                          {item.hsnCode || '-'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{item.listPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                          ₹{item.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {rowDiscountAmt > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-[11px] font-bold font-mono">
                              <Tag className="h-3 w-3 text-rose-500" />
                              {rowDiscountType === 'fixed' ? `₹${rowDiscountVal}` : `${rowDiscountVal}%`} (-₹{rowDiscountAmt.toFixed(2)})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">0%</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{rowNetTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          +₹{rowGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditRow(item)}
                              title="Edit Item"
                              className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item.id)}
                              title="Delete Item"
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Financial Summary Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Quantity</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {totals.totalQty} <span className="text-xs font-medium text-slate-400">Units</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Subtotal</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{totals.grossTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Item Discounts</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              -₹{totals.totalLineDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Taxable</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total GST</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              +₹{(totals.cgst + totals.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Section 4: Remarks & Commercial Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Remarks / Narration Box (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Remarks / Order Narration
              </label>
              <textarea
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter customer special instructions, delivery notes, or terms..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Preset Narration Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Quick Add:
              </span>
              {QUICK_NARRATIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRemark((prev) => (prev ? `${prev}. ${preset}` : preset))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Commercial Breakdown Card (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Commercial Summary
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Itemized GST Billing
              </span>
            </div>

            {/* Base Gross Subtotal */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Gross Subtotal (Before Discount):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                ₹{totals.grossTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Item Discounts Banner */}
            {totals.totalLineDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-rose-600" /> Total Item-Wise Discount:
                </span>
                <span className="font-mono font-black text-sm">-₹{totals.totalLineDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Net Taxable */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Net Taxable Value:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                ₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total GST */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Total GST (CGST + SGST):</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +₹{(totals.cgst + totals.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Grand Total Banner */}
            <div className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 p-3.5 text-white flex items-center justify-between shadow-md shadow-teal-600/20">
              <div>
                <span className="block text-[11px] font-medium text-teal-100 uppercase tracking-wider">Grand Total (Net Payable)</span>
                <span className="text-xl font-black font-mono tracking-tight">
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <CheckCircle2 className="h-6 w-6 text-teal-200" />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="sticky bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last Saved Total:</span>
          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            ₹{lastSavedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Convert Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsConvertMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
            >
              Convert Type <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {isConvertMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsConvertMenuOpen(false)} />
                <div className="absolute z-50 bottom-full mb-2 right-0 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden py-1.5">
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    Convert Document to:
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
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                          isCurrentType
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="h-4 w-4 text-blue-500" /> Print
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-bold text-xs shadow-xs transition-colors"
          >
            <X className="h-4 w-4" /> Cancel
          </button>

          {/* Save Order Primary Action */}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="h-4 w-4" /> Save Order
          </button>
        </div>
      </footer>

      {/* Payment Settlement Modal */}
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

