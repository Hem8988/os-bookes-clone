'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  Printer
} from 'lucide-react';
import { GenericSummaryList } from './GenericSummaryList';
import { PrintDocumentModal } from './PrintDocumentModal';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import {
  PurchaseOrder,
  PurchaseInvoice,
  ReturnDocument,
  SaleOrder,
  DeliveryChallan,
  Quotation,
  StockAdjustment,
  Product,
  Invoice,
  Customer,
  BankMaster,
  NarrationMaster
} from '../lib/types';
import { PurchaseOrderModule } from './PurchaseOrderModule';
import { PurchaseOrderSummaryModule } from './PurchaseOrderSummaryModule';
import { PurchaseInvoiceModule } from './PurchaseInvoiceModule';
import { SaleOrderModule } from './SaleOrderModule';
import { SalesInvoiceModule } from './SalesInvoiceModule';
import { PurchaseReturnModule } from './PurchaseReturnModule';
import { SalesReturnModule } from './SalesReturnModule';
import { ChallanModule } from './ChallanModule';
import { QuotationModule } from './QuotationModule';
import { StockAdjustmentModule } from './StockAdjustmentModule';

interface InventoryHubModuleProps {
  purchaseOrders: PurchaseOrder[];
  purchases: PurchaseInvoice[];
  purchaseReturns: ReturnDocument[];
  saleOrders: SaleOrder[];
  sales: Invoice[];
  salesReturns: ReturnDocument[];
  challans: DeliveryChallan[];
  quotations: Quotation[];
  adjustments: StockAdjustment[];
  products: Product[];
  customers: Customer[];
  banks: BankMaster[];
  narrations: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  initialSubTab?: string;
  setActiveTab: (tab: string) => void;
  onAddPO: (po: PurchaseOrder) => void;
  onUpdatePO: (po: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  onAddPurchase: (pur: PurchaseInvoice) => void;
  onUpdatePurchase: (pur: PurchaseInvoice) => void;
  onDeletePurchase: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
  onAddSO: (so: SaleOrder) => void;
  onUpdateSO: (so: SaleOrder) => void;
  onDeleteSO: (id: string) => void;
  onAddQuotation: (qt: Quotation) => void;
  onUpdateQuotation: (qt: Quotation) => void;
  onDeleteQuotation: (id: string) => void;
  onAddAdjustment: (adj: StockAdjustment) => void;
  onUpdateAdjustment: (adj: StockAdjustment) => void;
  onDeleteAdjustment: (id: string) => void;
  onAddChallan: (ch: DeliveryChallan) => void;
  onUpdateChallan: (ch: DeliveryChallan) => void;
  onDeleteChallan: (id: string) => void;
  onAddPurchaseReturn: (ret: ReturnDocument) => void;
  onUpdatePurchaseReturn: (ret: ReturnDocument) => void;
  onDeletePurchaseReturn: (id: string) => void;
  onAddSalesReturn: (ret: ReturnDocument) => void;
  onUpdateSalesReturn: (ret: ReturnDocument) => void;
  onDeleteSalesReturn: (id: string) => void;
  onAddInvoice: (inv: Invoice) => void;
  onUpdateInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onAddCustomer?: (customer: Customer) => void;
}

export const InventoryHubModule: React.FC<InventoryHubModuleProps> = ({
  purchaseOrders,
  purchases,
  purchaseReturns,
  saleOrders,
  sales,
  salesReturns,
  challans,
  quotations,
  adjustments,
  products,
  customers,
  banks,
  narrations,
  onAddNarration,
  initialSubTab = 'stock',
  setActiveTab,
  onAddPO,
  onUpdatePO,
  onDeletePO,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onUpdateProduct,
  onAddSO,
  onUpdateSO,
  onDeleteSO,
  onAddQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onAddAdjustment,
  onUpdateAdjustment,
  onDeleteAdjustment,
  onAddChallan,
  onUpdateChallan,
  onDeleteChallan,
  onAddPurchaseReturn,
  onUpdatePurchaseReturn,
  onDeletePurchaseReturn,
  onAddSalesReturn,
  onUpdateSalesReturn,
  onDeleteSalesReturn,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddCustomer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [poView, setPoView] = useState<'list' | 'create'>('list');
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [purchaseView, setPurchaseView] = useState<'list' | 'create'>('list');
  const [editingPurchase, setEditingPurchase] = useState<PurchaseInvoice | null>(null);
  const [soView, setSoView] = useState<'list' | 'create'>('list');
  const [editingSO, setEditingSO] = useState<SaleOrder | null>(null);
  const [salesView, setSalesView] = useState<'list' | 'create'>('list');
  const [editingSale, setEditingSale] = useState<Invoice | null>(null);
  const [preturnView, setPreturnView] = useState<'list' | 'create'>('list');
  const [editingPReturn, setEditingPReturn] = useState<ReturnDocument | null>(null);
  const [sreturnView, setSreturnView] = useState<'list' | 'create'>('list');
  const [editingSReturn, setEditingSReturn] = useState<ReturnDocument | null>(null);
  const [challanView, setChallanView] = useState<'list' | 'create'>('list');
  const [editingChallan, setEditingChallan] = useState<DeliveryChallan | null>(null);
  const [quotationView, setQuotationView] = useState<'list' | 'create'>('list');
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [adjustmentView, setAdjustmentView] = useState<'list' | 'create'>('list');
  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null);

  const [printPurchase, setPrintPurchase] = useState<PurchaseInvoice | null>(null);
  const [printPReturn, setPrintPReturn] = useState<ReturnDocument | null>(null);
  const [printSO, setPrintSO] = useState<SaleOrder | null>(null);
  const [printSale, setPrintSale] = useState<Invoice | null>(null);
  const [printSReturn, setPrintSReturn] = useState<ReturnDocument | null>(null);
  const [printChallan, setPrintChallan] = useState<DeliveryChallan | null>(null);
  const [printCInvoice, setPrintCInvoice] = useState<Invoice | null>(null);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const [printAdjustment, setPrintAdjustment] = useState<StockAdjustment | null>(null);

  const isFullScreenEntry =
    activeSubTab === 'po' ||
    (activeSubTab === 'purchase' && purchaseView === 'create') ||
    (activeSubTab === 'so' && soView === 'create') ||
    (activeSubTab === 'sales' && salesView === 'create') ||
    (activeSubTab === 'preturn' && preturnView === 'create') ||
    (activeSubTab === 'sreturn' && sreturnView === 'create') ||
    (activeSubTab === 'challan' && challanView === 'create') ||
    (activeSubTab === 'quotation' && quotationView === 'create') ||
    (activeSubTab === 'adjustment' && adjustmentView === 'create');

  return (
    <div className="space-y-6">
      {/* RENDER VIEW ACCORDING TO SELECTED TAB */}

      {/* 1. PURCHASE ORDER */}
      {activeSubTab === 'po' && poView === 'list' && (
        <PurchaseOrderSummaryModule
          vendors={customers.filter((c) => c.type === 'Vendor')}
          purchaseOrders={purchaseOrders}
          onCreateNew={() => {
            setEditingPO(null);
            setPoView('create');
          }}
          onEdit={(po) => {
            setEditingPO(po);
            setPoView('create');
          }}
          onDeletePO={onDeletePO}
          onClose={() => setActiveSubTab('stock')}
        />
      )}

      {activeSubTab === 'po' && poView === 'create' && (
        <PurchaseOrderModule
          vendors={customers.filter((c) => c.type === 'Vendor')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          purchaseOrders={purchaseOrders}
          poToEdit={editingPO}
          onAddPO={onAddPO}
          onUpdatePO={onUpdatePO}
          onAddPurchase={onAddPurchase}
          onAddSO={onAddSO}
          onAddQuotation={onAddQuotation}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onAddCustomer={onAddCustomer}
          onClose={() => {
            setEditingPO(null);
            setPoView('list');
          }}
        />
      )}

      {/* 2. PURCHASE */}
      {activeSubTab === 'purchase' && purchaseView === 'list' && (
        <GenericSummaryList
          title="Purchase Bill Summary"
          items={purchases}
          getId={(pur) => pur.id}
          getDate={(pur) => pur.date}
          partyLabel="Vendor Name"
          partyOptions={customers.filter((c) => c.type === 'Vendor').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(pur) => pur.vendorName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, pur) => sum + pur.grandTotal, 0);
            const totalPaid = list.reduce((sum, pur) => sum + (pur.status === 'Paid' ? pur.grandTotal : 0), 0);
            return [
              { label: 'TOTAL AMT', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'TOTAL PAID', value: `₹${totalPaid.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'BALANCE', value: `₹${(totalAmt - totalPaid).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingPurchase(null);
            setPurchaseView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Purchase Bills found for the selected filters."
          renderCard={(pur) => {
            const paid = pur.status === 'Paid' ? pur.grandTotal : 0;
            const balance = pur.grandTotal - paid;
            return (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">#Purchase Bill : {pur.purchaseNumber}</span>
                    <div className="text-sm">{pur.date}</div>
                  </div>
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{pur.vendorName}</div>
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{pur.grandTotal.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Vendor Invoice # : {pur.vendorInvoiceNumber}</div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                      <div>ITC Claimable : ₹{pur.itcEligibleAmount.toLocaleString('en-IN')}</div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">Balance : ₹{balance.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setPrintPurchase(pur)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPurchase(pur);
                      setPurchaseView('create');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete Purchase Bill ${pur.purchaseNumber}?`)) {
                        onDeletePurchase(pur.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      {activeSubTab === 'purchase' && purchaseView === 'create' && (
        <PurchaseInvoiceModule
          vendors={customers.filter((c) => c.type === 'Vendor')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          purchases={purchases}
          purchaseToEdit={editingPurchase}
          onAddPurchase={onAddPurchase}
          onUpdatePurchase={onUpdatePurchase}
          onUpdateProduct={onUpdateProduct}
          onAddPO={onAddPO}
          onAddSO={onAddSO}
          onAddQuotation={onAddQuotation}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onClose={() => {
            setEditingPurchase(null);
            setPurchaseView('list');
          }}
        />
      )}

      {/* 3. PURCHASE RETURN */}
      {activeSubTab === 'preturn' && preturnView === 'list' && (
        <GenericSummaryList
          title="Purchase Return Summary"
          items={purchaseReturns}
          getId={(pr) => pr.id}
          getDate={(pr) => pr.date}
          partyLabel="Vendor Name"
          partyOptions={customers.filter((c) => c.type === 'Vendor').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(pr) => pr.partyName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, pr) => sum + pr.amount, 0);
            const processedAmt = list.reduce((sum, pr) => sum + (pr.status === 'Processed' ? pr.amount : 0), 0);
            return [
              { label: 'TOTAL RETURN VALUE', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'PROCESSED', value: `₹${processedAmt.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'PENDING', value: `₹${(totalAmt - processedAmt).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingPReturn(null);
            setPreturnView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Purchase Returns found for the selected filters."
          renderCard={(pr) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Debit Note : {pr.docNumber}</span>
                  <div className="text-sm">{pr.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{pr.partyName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{pr.amount.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Original Invoice : {pr.originalInvNumber}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>Reason : {pr.returnReason}</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {pr.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintPReturn(pr)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPReturn(pr);
                    setPreturnView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Debit Note ${pr.docNumber}?`)) {
                      onDeletePurchaseReturn(pr.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'preturn' && preturnView === 'create' && (
        <PurchaseReturnModule
          vendors={customers.filter((c) => c.type === 'Vendor')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          purchases={purchases}
          purchaseReturns={purchaseReturns}
          returnToEdit={editingPReturn}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onUpdatePurchaseReturn={onUpdatePurchaseReturn}
          onClose={() => {
            setEditingPReturn(null);
            setPreturnView('list');
          }}
        />
      )}

      {/* 4. SALE ORDER */}
      {activeSubTab === 'so' && soView === 'list' && (
        <GenericSummaryList
          title="Sale Order Summary"
          items={saleOrders}
          getId={(so) => so.id}
          getDate={(so) => so.date}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(so) => so.customerName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, so) => sum + so.totalAmount, 0);
            const converted = list.reduce((sum, so) => sum + (so.status === 'Converted to Bill' ? so.totalAmount : 0), 0);
            return [
              { label: 'TOTAL ORDER VALUE', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'CONVERTED', value: `₹${converted.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'PENDING', value: `₹${(totalAmt - converted).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingSO(null);
            setSoView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Sale Orders found for the selected filters."
          renderCard={(so) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#SO No : {so.soNumber}</span>
                  <div className="text-sm">{so.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{so.customerName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{so.totalAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Valid Until : {so.validUntil}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {so.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintSO(so)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSO(so);
                    setSoView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Sale Order ${so.soNumber}?`)) {
                      onDeleteSO(so.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'so' && soView === 'create' && (
        <SaleOrderModule
          customers={customers.filter((c) => c.type === 'Customer')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          saleOrders={saleOrders}
          soToEdit={editingSO}
          onAddSO={onAddSO}
          onUpdateSO={onUpdateSO}
          onAddPO={onAddPO}
          onAddPurchase={onAddPurchase}
          onAddQuotation={onAddQuotation}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onClose={() => {
            setEditingSO(null);
            setSoView('list');
          }}
        />
      )}

      {/* 5. SALES */}
      {activeSubTab === 'sales' && salesView === 'list' && (
        <GenericSummaryList
          title="Sales Invoice Summary"
          items={sales}
          getId={(s) => s.id}
          getDate={(s) => s.date}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(s) => s.customerName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, s) => sum + s.grandTotal, 0);
            const totalPaid = list.reduce((sum, s) => sum + (s.status === 'Paid' ? s.grandTotal : 0), 0);
            return [
              { label: 'TOTAL AMT', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'TOTAL PAID', value: `₹${totalPaid.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'BALANCE', value: `₹${(totalAmt - totalPaid).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingSale(null);
            setSalesView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Sales Invoices found for the selected filters."
          renderCard={(s) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Invoice No : {s.invoiceNumber}</span>
                  <div className="text-sm">{s.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{s.customerName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{s.grandTotal.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Taxable : ₹{s.subTotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>GST : ₹{(s.totalCgst + s.totalSgst + s.totalIgst).toLocaleString('en-IN')}</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">{s.status} ({s.paymentMode})</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintSale(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSale(s);
                    setSalesView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Invoice ${s.invoiceNumber}?`)) {
                      onDeleteInvoice(s.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'sales' && salesView === 'create' && (
        <SalesInvoiceModule
          customers={customers.filter((c) => c.type === 'Customer')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          sales={sales}
          invoiceToEdit={editingSale}
          onAddInvoice={onAddInvoice}
          onUpdateInvoice={onUpdateInvoice}
          onAddPO={onAddPO}
          onAddPurchase={onAddPurchase}
          onAddSO={onAddSO}
          onAddQuotation={onAddQuotation}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onClose={() => {
            setEditingSale(null);
            setSalesView('list');
          }}
        />
      )}

      {/* 6. SALES RETURN */}
      {activeSubTab === 'sreturn' && sreturnView === 'list' && (
        <GenericSummaryList
          title="Sales Return Summary"
          items={salesReturns}
          getId={(sr) => sr.id}
          getDate={(sr) => sr.date}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(sr) => sr.partyName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, sr) => sum + sr.amount, 0);
            const processedAmt = list.reduce((sum, sr) => sum + (sr.status === 'Processed' ? sr.amount : 0), 0);
            return [
              { label: 'TOTAL REFUND VALUE', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'PROCESSED', value: `₹${processedAmt.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'PENDING', value: `₹${(totalAmt - processedAmt).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingSReturn(null);
            setSreturnView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Sales Returns found for the selected filters."
          renderCard={(sr) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Credit Note : {sr.docNumber}</span>
                  <div className="text-sm">{sr.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{sr.partyName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{sr.amount.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Original Invoice : {sr.originalInvNumber}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>Reason : {sr.returnReason}</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {sr.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintSReturn(sr)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSReturn(sr);
                    setSreturnView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Credit Note ${sr.docNumber}?`)) {
                      onDeleteSalesReturn(sr.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'sreturn' && sreturnView === 'create' && (
        <SalesReturnModule
          customers={customers.filter((c) => c.type === 'Customer')}
          products={products}
          banks={banks}
          narrations={narrations}
          onAddNarration={onAddNarration}
          sales={sales}
          salesReturns={salesReturns}
          returnToEdit={editingSReturn}
          onAddSalesReturn={onAddSalesReturn}
          onUpdateSalesReturn={onUpdateSalesReturn}
          onClose={() => {
            setEditingSReturn(null);
            setSreturnView('list');
          }}
        />
      )}

      {/* 7. CUSTOMER CHALLAN */}
      {activeSubTab === 'challan' && challanView === 'list' && (
        <GenericSummaryList
          title="Customer Challan Summary"
          items={challans}
          getId={(ch) => ch.id}
          getDate={(ch) => ch.dispatchDate}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(ch) => ch.customerName}
          computeStats={(list) => {
            const totalQty = list.reduce((sum, ch) => sum + ch.totalQty, 0);
            const dispatched = list.filter((ch) => ch.status === 'Dispatched').length;
            return [
              { label: 'TOTAL CHALLANS', value: `${list.length}` },
              { label: 'TOTAL QTY', value: `${totalQty}`, valueClassName: 'text-emerald-400' },
              { label: 'DISPATCHED', value: `${dispatched}`, valueClassName: 'text-blue-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingChallan(null);
            setChallanView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Customer Challans found for the selected filters."
          renderCard={(ch) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Challan No : {ch.challanNumber}</span>
                  <div className="text-sm">{ch.dispatchDate}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{ch.customerName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">{ch.totalQty} Units</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Vehicle No : {ch.vehicleNumber}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {ch.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintChallan(ch)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChallan(ch);
                    setChallanView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Challan ${ch.challanNumber}?`)) {
                      onDeleteChallan(ch.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'challan' && challanView === 'create' && (
        <ChallanModule
          customers={customers.filter((c) => c.type === 'Customer')}
          products={products}
          challans={challans}
          challanToEdit={editingChallan}
          onAddChallan={onAddChallan}
          onUpdateChallan={onUpdateChallan}
          onAddPO={onAddPO}
          onAddPurchase={onAddPurchase}
          onAddSO={onAddSO}
          onAddQuotation={onAddQuotation}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onClose={() => {
            setEditingChallan(null);
            setChallanView('list');
          }}
        />
      )}

      {/* 8. CUSTOMER INVOICE */}
      {activeSubTab === 'cinvoice' && (
        <GenericSummaryList
          title="Customer Invoice Summary"
          items={sales}
          getId={(inv) => inv.id}
          getDate={(inv) => inv.date}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(inv) => inv.customerName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, inv) => sum + inv.grandTotal, 0);
            const paid = list.reduce((sum, inv) => sum + (inv.status === 'Paid' ? inv.grandTotal : 0), 0);
            return [
              { label: 'TOTAL INVOICED', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'PAID', value: `₹${paid.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'BALANCE', value: `₹${(totalAmt - paid).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Customer Invoices found for the selected filters."
          renderCard={(inv) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Tax Invoice : {inv.invoiceNumber}</span>
                  <div className="text-sm">{inv.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{inv.customerName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{inv.grandTotal.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">GSTIN : {inv.customerGstin || 'Unregistered'}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {inv.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintCInvoice(inv)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              </div>
            </div>
          )}
        />
      )}

      {/* 9. QUOTATION */}
      {activeSubTab === 'quotation' && quotationView === 'list' && (
        <GenericSummaryList
          title="Quotation Summary"
          items={quotations}
          getId={(qt) => qt.id}
          getDate={(qt) => qt.date}
          partyLabel="Customer Name"
          partyOptions={customers.filter((c) => c.type === 'Customer').map((v) => ({ id: v.id, name: v.name }))}
          getItemPartyName={(qt) => qt.customerName}
          computeStats={(list) => {
            const totalAmt = list.reduce((sum, qt) => sum + qt.grandTotal, 0);
            const accepted = list.reduce((sum, qt) => sum + (qt.status === 'Accepted' ? qt.grandTotal : 0), 0);
            return [
              { label: 'TOTAL QUOTED', value: `₹${totalAmt.toLocaleString('en-IN')}` },
              { label: 'ACCEPTED', value: `₹${accepted.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
              { label: 'PENDING', value: `₹${(totalAmt - accepted).toLocaleString('en-IN')}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingQuotation(null);
            setQuotationView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Quotations found for the selected filters."
          renderCard={(qt) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Quotation No : {qt.quoteNumber}</span>
                  <div className="text-sm">{qt.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{qt.customerName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">₹{qt.grandTotal.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Validity : {qt.validDays} Days</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300">Status : {qt.status}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintQuotation(qt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuotation(qt);
                    setQuotationView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Quotation ${qt.quoteNumber}?`)) {
                      onDeleteQuotation(qt.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'quotation' && quotationView === 'create' && (
        <QuotationModule
          customers={customers.filter((c) => c.type === 'Customer')}
          products={products}
          quotations={quotations}
          quotationToEdit={editingQuotation}
          onAddQuotation={onAddQuotation}
          onUpdateQuotation={onUpdateQuotation}
          onAddPO={onAddPO}
          onAddPurchase={onAddPurchase}
          onAddSO={onAddSO}
          onAddAdjustment={onAddAdjustment}
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onClose={() => {
            setEditingQuotation(null);
            setQuotationView('list');
          }}
        />
      )}

      {/* 10. STOCK ADJUSTMENT */}
      {activeSubTab === 'adjustment' && adjustmentView === 'list' && (
        <GenericSummaryList
          title="Stock Adjustment Summary"
          items={adjustments}
          getId={(adj) => adj.id}
          getDate={(adj) => adj.date}
          computeStats={(list) => {
            const added = list.reduce((sum, adj) => sum + (adj.adjustmentType === 'Addition (+)' ? adj.qty : 0), 0);
            const deducted = list.reduce((sum, adj) => sum + (adj.adjustmentType === 'Deduction (-)' ? adj.qty : 0), 0);
            return [
              { label: 'TOTAL AUDITS', value: `${list.length}` },
              { label: 'QTY ADDED', value: `${added}`, valueClassName: 'text-emerald-400' },
              { label: 'QTY DEDUCTED', value: `${deducted}`, valueClassName: 'text-rose-400' },
            ];
          }}
          onCreateNew={() => {
            setEditingAdjustment(null);
            setAdjustmentView('create');
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Stock Adjustments found for the selected filters."
          renderCard={(adj) => (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">#Audit No : {adj.adjustCode}</span>
                  <div className="text-sm">{adj.date}</div>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{adj.productName}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">{adj.qty} Units</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{adj.adjustmentType}</div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>Reason : {adj.reason}</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Approved By : {adj.approvedBy}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPrintAdjustment(adj)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAdjustment(adj);
                    setAdjustmentView('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Stock Adjustment ${adj.adjustCode}?`)) {
                      onDeleteAdjustment(adj.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        />
      )}

      {activeSubTab === 'adjustment' && adjustmentView === 'create' && (
        <StockAdjustmentModule
          products={products}
          adjustments={adjustments}
          adjustmentToEdit={editingAdjustment}
          onAddAdjustment={onAddAdjustment}
          onUpdateAdjustment={onUpdateAdjustment}
          onUpdateProduct={onUpdateProduct}
          onClose={() => {
            setEditingAdjustment(null);
            setAdjustmentView('list');
          }}
        />
      )}

      {/* 11. STOCK INVENTORY */}
      {activeSubTab === 'stock' && (
        <GenericSummaryList
          title="Stock Inventory Summary"
          items={products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))}
          getId={(p) => p.id}
          partyLabel="Category"
          partyOptions={Array.from(new Set(products.map((p) => p.category))).map((c) => ({ id: c, name: c }))}
          getItemPartyName={(p) => p.category}
          computeStats={(list) => {
            const lowStockCount = list.filter((p) => p.stock <= p.minStockAlert).length;
            const totalValue = list.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0);
            return [
              { label: 'TOTAL PRODUCTS', value: `${list.length}` },
              { label: 'LOW STOCK', value: `${lowStockCount}`, valueClassName: 'text-rose-400' },
              { label: 'STOCK VALUE', value: `₹${totalValue.toLocaleString('en-IN')}`, valueClassName: 'text-emerald-400' },
            ];
          }}
          onClose={() => setActiveSubTab('stock')}
          emptyMessage="No Products found for the selected filters."
          renderCard={(p) => {
            const isLow = p.stock <= p.minStockAlert;
            return (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">SKU : {p.sku} | HSN : {p.hsnCode}</span>
                    <div className="text-sm">{p.category}</div>
                  </div>
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{p.name}</div>
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">{p.stock} {p.unit}</div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Valuation : ₹{(p.stock * p.purchasePrice).toLocaleString('en-IN')}
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Low Stock Alert
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Optimal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}

      {printPurchase && (
        <PrintDocumentModal
          docTypeLabel="Purchase Bill"
          docNumber={printPurchase.purchaseNumber}
          date={printPurchase.date}
          statusLabel={printPurchase.status}
          extraHeaderLines={[`Vendor Invoice #: ${printPurchase.vendorInvoiceNumber}`]}
          partyLabel="Vendor"
          partyName={printPurchase.vendorName}
          partyGstin={printPurchase.vendorGstin}
          items={printPurchase.items}
          totals={[
            { label: 'Sub Total', value: `₹${printPurchase.subTotal.toLocaleString('en-IN')}` },
            { label: 'ITC Eligible', value: `₹${printPurchase.itcEligibleAmount.toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printPurchase.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printPurchase.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printPurchase.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Grand Total', value: `₹${printPurchase.grandTotal.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printPurchase.remark}
          onClose={() => setPrintPurchase(null)}
        />
      )}

      {printPReturn && (
        <PrintDocumentModal
          docTypeLabel="Purchase Return / Debit Note"
          docNumber={printPReturn.docNumber}
          date={printPReturn.date}
          statusLabel={printPReturn.status}
          extraHeaderLines={[`Original Invoice: ${printPReturn.originalInvNumber}`, `Reason: ${printPReturn.returnReason}`]}
          partyLabel="Vendor"
          partyName={printPReturn.partyName}
          items={printPReturn.items}
          totals={[
            { label: 'Taxable Amount', value: `₹${(printPReturn.taxableAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printPReturn.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printPReturn.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printPReturn.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Return Value', value: `₹${printPReturn.amount.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printPReturn.remark}
          onClose={() => setPrintPReturn(null)}
        />
      )}

      {printSO && (
        <PrintDocumentModal
          docTypeLabel="Sale Order"
          docNumber={printSO.soNumber}
          date={printSO.date}
          statusLabel={printSO.status}
          extraHeaderLines={[`Valid Until: ${printSO.validUntil}`]}
          partyLabel="Customer"
          partyName={printSO.customerName}
          partyGstin={printSO.customerGstin}
          items={printSO.items}
          totals={[
            { label: 'Taxable Amount', value: `₹${(printSO.taxableAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printSO.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printSO.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printSO.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Order Value', value: `₹${printSO.totalAmount.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printSO.remark}
          onClose={() => setPrintSO(null)}
        />
      )}

      {printSale && <PrintInvoiceModal invoice={printSale} onClose={() => setPrintSale(null)} />}

      {printSReturn && (
        <PrintDocumentModal
          docTypeLabel="Sales Return / Credit Note"
          docNumber={printSReturn.docNumber}
          date={printSReturn.date}
          statusLabel={printSReturn.status}
          extraHeaderLines={[`Original Invoice: ${printSReturn.originalInvNumber}`, `Reason: ${printSReturn.returnReason}`]}
          partyLabel="Customer"
          partyName={printSReturn.partyName}
          items={printSReturn.items}
          totals={[
            { label: 'Taxable Amount', value: `₹${(printSReturn.taxableAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printSReturn.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printSReturn.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printSReturn.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Refund Value', value: `₹${printSReturn.amount.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printSReturn.remark}
          onClose={() => setPrintSReturn(null)}
        />
      )}

      {printChallan && (
        <PrintDocumentModal
          docTypeLabel="Delivery Challan"
          docNumber={printChallan.challanNumber}
          date={printChallan.dispatchDate}
          statusLabel={printChallan.status}
          extraHeaderLines={[`Vehicle No: ${printChallan.vehicleNumber}`]}
          partyLabel="Customer"
          partyName={printChallan.customerName}
          partyGstin={printChallan.customerGstin}
          items={printChallan.items}
          totals={[{ label: 'Total Quantity', value: `${printChallan.totalQty}`, emphasize: true }]}
          remark={printChallan.remark}
          onClose={() => setPrintChallan(null)}
        />
      )}

      {printCInvoice && <PrintInvoiceModal invoice={printCInvoice} onClose={() => setPrintCInvoice(null)} />}

      {printQuotation && (
        <PrintDocumentModal
          docTypeLabel="Quotation"
          docNumber={printQuotation.quoteNumber}
          date={printQuotation.date}
          statusLabel={printQuotation.status}
          extraHeaderLines={[`Validity: ${printQuotation.validDays} Days`]}
          partyLabel="Customer"
          partyName={printQuotation.customerName}
          partyGstin={printQuotation.customerGstin}
          partyPhone={printQuotation.customerPhone}
          items={printQuotation.items}
          totals={[
            { label: 'Taxable Amount', value: `₹${(printQuotation.taxableAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'CGST', value: `₹${(printQuotation.totalCgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'SGST', value: `₹${(printQuotation.totalSgst ?? 0).toLocaleString('en-IN')}` },
            { label: 'Discount', value: `₹${(printQuotation.discountAmount ?? 0).toLocaleString('en-IN')}` },
            { label: 'Grand Total', value: `₹${printQuotation.grandTotal.toLocaleString('en-IN')}`, emphasize: true },
          ]}
          remark={printQuotation.remark}
          onClose={() => setPrintQuotation(null)}
        />
      )}

      {printAdjustment && (
        <PrintDocumentModal
          docTypeLabel="Stock Adjustment"
          docNumber={printAdjustment.adjustCode}
          date={printAdjustment.date}
          detailRows={[
            { label: 'Product', value: printAdjustment.productName },
            { label: 'Adjustment Type', value: printAdjustment.adjustmentType },
            { label: 'Quantity', value: `${printAdjustment.qty}` },
            { label: 'Reason', value: printAdjustment.reason },
            { label: 'Approved By', value: printAdjustment.approvedBy },
          ]}
          totals={[]}
          remark={printAdjustment.remark}
          onClose={() => setPrintAdjustment(null)}
        />
      )}

    </div>
  );
};
