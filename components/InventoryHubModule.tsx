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
  DeliveryChallan,
  Quotation,
  Product,
  Invoice,
  Customer,
  BankMaster,
  NarrationMaster,
  EmployeeMaster,
} from '../lib/types';
import { PurchaseOrderModule } from './PurchaseOrderModule';
import { PurchaseOrderSummaryModule } from './PurchaseOrderSummaryModule';
import { PurchaseInvoiceModule } from './PurchaseInvoiceModule';
import { SalesInvoiceModule } from './SalesInvoiceModule';
import { PurchaseReturnModule } from './PurchaseReturnModule';
import { SalesReturnModule } from './SalesReturnModule';
import { ChallanModule } from './ChallanModule';
import { QuotationModule } from './QuotationModule';

interface InventoryHubModuleProps {
  purchaseOrders: PurchaseOrder[];
  purchases: PurchaseInvoice[];
  purchaseReturns: ReturnDocument[];
  sales: Invoice[];
  salesReturns: ReturnDocument[];
  challans: DeliveryChallan[];
  quotations: Quotation[];
  products: Product[];
  customers: Customer[];
  banks: BankMaster[];
  narrations: NarrationMaster[];
  onAddNarration?: (narration: NarrationMaster) => void;
  staff?: EmployeeMaster[];
  initialSubTab?: string;
  setActiveTab: (tab: string) => void;
  onAddPO: (po: PurchaseOrder) => void;
  onUpdatePO: (po: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
  onAddPurchase: (pur: PurchaseInvoice) => void;
  onUpdatePurchase: (pur: PurchaseInvoice) => void;
  onDeletePurchase: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
  onAddQuotation: (qt: Quotation) => void;
  onUpdateQuotation: (qt: Quotation) => void;
  onDeleteQuotation: (id: string) => void;
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
  sales,
  salesReturns,
  challans,
  quotations,
  products,
  customers,
  banks,
  narrations,
  onAddNarration,
  staff = [],
  initialSubTab = 'stock',
  setActiveTab,
  onAddPO,
  onUpdatePO,
  onDeletePO,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onUpdateProduct,
  onAddQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
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

  const [printPurchase, setPrintPurchase] = useState<PurchaseInvoice | null>(null);
  const [printPReturn, setPrintPReturn] = useState<ReturnDocument | null>(null);
  const [printSale, setPrintSale] = useState<Invoice | null>(null);
  const [printSReturn, setPrintSReturn] = useState<ReturnDocument | null>(null);
  const [printChallan, setPrintChallan] = useState<DeliveryChallan | null>(null);
  const [printCInvoice, setPrintCInvoice] = useState<Invoice | null>(null);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);

  const isFullScreenEntry =
    activeSubTab === 'po' ||
    (activeSubTab === 'purchase' && purchaseView === 'create') ||
    (activeSubTab === 'sales' && salesView === 'create') ||
    (activeSubTab === 'preturn' && preturnView === 'create') ||
    (activeSubTab === 'sreturn' && sreturnView === 'create') ||
    (activeSubTab === 'challan' && challanView === 'create') ||
    (activeSubTab === 'quotation' && quotationView === 'create');

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
          onAddQuotation={onAddQuotation}
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
          tableHeaders={['Date', 'Bill No', 'Vendor Name', 'Vendor Inv #', 'Amount', 'Balance', 'Actions']}
          renderTableRow={(pur) => {
            const paid = pur.status === 'Paid' ? pur.grandTotal : 0;
            const balance = pur.grandTotal - paid;
            return (
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{pur.date}</td>
                <td className="px-3 py-2 font-mono text-xs">{pur.purchaseNumber}</td>
                <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{pur.vendorName}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{pur.vendorInvoiceNumber || '-'}</td>
                <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{pur.grandTotal.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2">
                  <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${balance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    ₹{balance.toLocaleString('en-IN')}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setPrintPurchase(pur)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setEditingPurchase(pur); setPurchaseView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm(`Delete Purchase Bill ${pur.purchaseNumber}?`)) onDeletePurchase(pur.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
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
          onAddQuotation={onAddQuotation}
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
          tableHeaders={['Date', 'Debit Note', 'Vendor Name', 'Orig Invoice', 'Amount', 'Status', 'Actions']}
          renderTableRow={(pr) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{pr.date}</td>
              <td className="px-3 py-2 font-mono text-xs">{pr.docNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{pr.partyName}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{pr.originalInvNumber || '-'}</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{pr.amount.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${pr.status === 'Processed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                  {pr.status}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintPReturn(pr)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingPReturn(pr); setPreturnView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete Debit Note ${pr.docNumber}?`)) onDeletePurchaseReturn(pr.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          tableHeaders={['Date', 'Invoice No', 'Customer Name', 'Taxable', 'GST', 'Amount', 'Status', 'Actions']}
          renderTableRow={(s) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{s.date}</td>
              <td className="px-3 py-2 font-mono text-xs">{s.invoiceNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{s.customerName}</td>
              <td className="px-3 py-2 font-mono text-xs">₹{s.subTotal.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-500">₹{(s.totalCgst + s.totalSgst + s.totalIgst).toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{s.grandTotal.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${s.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {s.status} ({s.paymentMode})
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintSale(s)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingSale(s); setSalesView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete Invoice ${s.invoiceNumber}?`)) onDeleteInvoice(s.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          onAddQuotation={onAddQuotation}
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
          tableHeaders={['Date', 'Credit Note', 'Customer Name', 'Orig Invoice', 'Amount', 'Status', 'Actions']}
          renderTableRow={(sr) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{sr.date}</td>
              <td className="px-3 py-2 font-mono text-xs">{sr.docNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{sr.partyName}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{sr.originalInvNumber || '-'}</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{sr.amount.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${sr.status === 'Processed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                  {sr.status}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintSReturn(sr)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingSReturn(sr); setSreturnView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete Credit Note ${sr.docNumber}?`)) onDeleteSalesReturn(sr.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          tableHeaders={['Date', 'Challan No', 'Customer Name', 'Vehicle No', 'Qty', 'Status', 'Actions']}
          renderTableRow={(ch) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{ch.dispatchDate}</td>
              <td className="px-3 py-2 font-mono text-xs">{ch.challanNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{ch.customerName}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{ch.vehicleNumber || '-'}</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">{ch.totalQty} Units</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${ch.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                  {ch.status}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintChallan(ch)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingChallan(ch); setChallanView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete Challan ${ch.challanNumber}?`)) onDeleteChallan(ch.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          onAddQuotation={onAddQuotation}
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
          tableHeaders={['Date', 'Invoice No', 'Customer Name', 'GSTIN', 'Amount', 'Status', 'Actions']}
          renderTableRow={(inv) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{inv.date}</td>
              <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{inv.customerName}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{inv.customerGstin || 'Unregistered'}</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {inv.status}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintCInvoice(inv)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          tableHeaders={['Date', 'Quote No', 'Customer Name', 'Validity', 'Amount', 'Status', 'Actions']}
          renderTableRow={(qt) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{qt.date}</td>
              <td className="px-3 py-2 font-mono text-xs">{qt.quoteNumber}</td>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{qt.customerName}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{qt.validDays} Days</td>
              <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">₹{qt.grandTotal.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase inline-block ${qt.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {qt.status}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => setPrintQuotation(qt)} className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-sm" title="Print">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingQuotation(qt); setQuotationView('create'); }} className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete Quotation ${qt.quoteNumber}?`)) onDeleteQuotation(qt.id); }} className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
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
          onAddPurchaseReturn={onAddPurchaseReturn}
          onAddSalesReturn={onAddSalesReturn}
          onAddInvoice={onAddInvoice}
          onClose={() => {
            setEditingQuotation(null);
            setQuotationView('list');
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
          tableHeaders={['SKU', 'Category', 'Product Name', 'HSN', 'Stock', 'Valuation', 'Status']}
          renderTableRow={(p) => {
            const isLow = p.stock <= p.minStockAlert;
            return (
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.sku}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{p.category}</td>
                <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-slate-100">{p.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.hsnCode}</td>
                <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100">{p.stock} {p.unit}</td>
                <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">₹{(p.stock * p.purchasePrice).toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-right">
                  {isLow ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Low Stock Alert
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Optimal
                    </span>
                  )}
                </td>
              </tr>
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

    </div>
  );
};
