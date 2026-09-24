'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '../lib/api';
import { logout, useSession } from '../lib/auth';
import type { Permission } from '../lib/permissions';
import { ROLE_LABELS } from '../lib/permissions';
import { useServerCollection } from '../lib/useServerCollection';
import type {
  AccountMaster,
  BankMaster,
  BrandMaster,
  CategoryMaster,
  CompanyMaster,
  Customer,
  DeliveryChallan,
  EmployeeMaster,
  ExpenseMaster,
  FollowUp,
  IncomeMaster,
  Invoice,
  NarrationMaster,
  PaymentMaster,
  Product,
  PurchaseInvoice,
  PurchaseOrder,
  Quotation,
  ReturnDocument,
  TaxMaster,
  UnitMaster,
} from '../lib/types';
import { AdminModule } from './AdminModule';
import ApprovalQueueModule from './ApprovalQueueModule';
import { BillingModule } from './BillingModule';
import CashWalletModule from './CashWalletModule';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { CustomersModule } from './CustomersModule';
import CylinderBalanceModule from './CylinderBalanceModule';
import { Dashboard } from './Dashboard';
import DayClosingModule from './DayClosingModule';
import DeliveryGpsTrackingModule from './DeliveryGpsTrackingModule';
import { GstReportsModule } from './GstReportsModule';
import { InventoryHubModule } from './InventoryHubModule';
import { InventoryModule } from './InventoryModule';
import LedgersModule from './LedgersModule';
import { MastersModule } from './MastersModule';
import { Navbar } from './Navbar';
import OrdersModule from './OrdersModule';
import PaymentsModule from './PaymentsModule';
import { InvoiceView, PrintInvoiceModal } from './PrintInvoiceModal';
import ReportsModule from './ReportsModule';
import RoutesModule from './RoutesModule';
import { SettingsModule } from './SettingsModule';
import { MENU, Sidebar } from './Sidebar';
import WhatsAppCenter from './WhatsAppInvoiceSenderModule';
import { useToast } from './ui';

// Back-office shell for Super Admin, Manager and Accountant. Screens and the
// data they load follow the user's permissions; everything is server-backed.

type Crud<T> = { add: (item: T) => void; update: (item: T) => void; remove: (id: string) => void };

export default function Workspace() {
  const { session, loading, can } = useSession();
  const [tab, setTab] = useState('dashboard');
  const [sub, setSub] = useState<string | undefined>();
  const [printInvoice, setPrintInvoice] = useState<InvoiceView | null>(null);
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  // ── navigation (kept in the URL so refresh / back work) ──
  const navigate = useCallback((nextTab: string, nextSub?: string) => {
    setTab(nextTab);
    setSub(nextSub);
    const params = new URLSearchParams({ tab: nextTab, ...(nextSub ? { sub: nextSub } : {}) });
    window.history.pushState(null, '', `${window.location.pathname}?${params}`);
  }, []);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(params.get('tab') || 'dashboard');
      setSub(params.get('sub') || undefined);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  // A tab is only reachable when the menu offers it to this role.
  const allowedTab = useMemo(() => {
    if (!session) return false;
    if (tab === 'dashboard') return can('dashboard.view');
    return MENU.some((s) => s.items.some((i) => i.tab === tab && can(i.permission)));
  }, [tab, session, can]);

  // ── server collections, loaded only for the screens that need them ──
  const need = (tabs: string[], permission: Permission) => !!session && tabs.includes(tab) && can(permission);
  const customers = useServerCollection<Customer>('customers', need(['customers', 'vendors', 'billing', 'documents', 'masters'], 'customers.view'));
  const products = useServerCollection<Product>('products', need(['customers', 'vendors', 'billing', 'documents', 'masters'], 'products.view'));
  const invoices = useServerCollection<Invoice>('invoices', need(['documents', 'gst'], 'invoices.view'));
  const followUps = useServerCollection<FollowUp>('followUps', need(['masters'], 'customers.view'));
  const units = useServerCollection<UnitMaster>('units', need(['masters'], 'masters.view'));
  const categories = useServerCollection<CategoryMaster>('categories', need(['masters'], 'masters.view'));
  const brands = useServerCollection<BrandMaster>('brands', need(['masters'], 'masters.view'));
  const taxes = useServerCollection<TaxMaster>('taxes', need(['masters'], 'masters.view'));
  const banks = useServerCollection<BankMaster>('banks', need(['masters', 'documents'], 'masters.view'));
  const narrations = useServerCollection<NarrationMaster>('narrations', need(['masters', 'documents'], 'masters.view'));
  const bookTypes = useServerCollection<{ id: string; name: string }>('bookTypes', need(['masters'], 'masters.view'));
  const staff = useServerCollection<EmployeeMaster>('staff', need(['masters', 'documents'], 'masters.view'));
  const accounts = useServerCollection<AccountMaster>('accounts', need(['masters'], 'masters.view'));
  const companies = useServerCollection<CompanyMaster>('companies', need(['masters'], 'masters.view'));
  const expenses = useServerCollection<ExpenseMaster>('expenses', need(['masters'], 'masters.view'));
  const incomes = useServerCollection<IncomeMaster>('incomes', need(['masters'], 'masters.view'));
  const paymentModes = useServerCollection<PaymentMaster>('paymentModes', need(['masters'], 'masters.view'));
  const purchaseOrders = useServerCollection<PurchaseOrder>('purchaseOrders', need(['documents'], 'masters.view'));
  const purchases = useServerCollection<PurchaseInvoice>('purchases', need(['documents'], 'masters.view'));
  const purchaseReturns = useServerCollection<ReturnDocument>('purchaseReturns', need(['documents'], 'masters.view'));
  const salesReturns = useServerCollection<ReturnDocument>('salesReturns', need(['documents'], 'masters.view'));
  const challans = useServerCollection<DeliveryChallan>('challans', need(['documents'], 'masters.view'));
  const quotations = useServerCollection<Quotation>('quotations', need(['documents'], 'masters.view'));

  /** Wrap a collection so screens get fire-and-forget handlers with error toasts. */
  const crud = <T extends { id: string }>(coll: ReturnType<typeof useServerCollection<T>>, label: string): Crud<T> => ({
    add: (item) => void coll.create(item).then(() => showToast(`${label} saved.`)).catch((e) => showToast(errorMessage(e), 'error')),
    update: (item) => void coll.update(item).then(() => showToast(`${label} updated.`)).catch((e) => showToast(errorMessage(e), 'error')),
    remove: (id) => void coll.remove(id).then(() => showToast(`${label} removed.`)).catch((e) => showToast(errorMessage(e), 'error')),
  });
  const cust = crud(customers, 'Party');
  const prod = crud(products, 'Product');

  const addInvoice = async (inv: Invoice) => {
    try {
      const saved = await invoices.create(inv);
      showToast(`Invoice ${saved.invoiceNumber} created and posted to the ledger.`);
      setPrintInvoice(saved as unknown as InvoiceView);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };
  const updateInvoice = async (inv: Invoice) => {
    try {
      const saved = await invoices.update(inv);
      showToast(saved ? 'Invoice updated.' : 'Edit sent to the admin for approval.');
      if (!saved) await invoices.reload();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };
  const cancelInvoice = async (id: string) => {
    const reason = window.prompt('Reason for cancelling this invoice?');
    if (!reason) return;
    try {
      await invoices.remove(id, reason);
      showToast('Invoice cancelled and reversed in the ledger.');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const activeCustomers = customers.items.filter((c) => c.type === 'Customer' && c.status !== 'BLOCKED');

  const screen = () => {
    if (!allowedTab) return <div className="p-10 text-center text-sm text-slate-500">This screen is not available for your role.</div>;
    switch (tab) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'orders':
        return <OrdersModule onOpenCustomer={setLedgerCustomerId} />;
      case 'approval-queue':
        return <ApprovalQueueModule />;
      case 'delivery-board':
        return <DeliveryGpsTrackingModule />;
      case 'inventory':
        return <InventoryModule key={sub || 'overview'} initialTab={(sub as 'overview' | 'transfers' | 'movements' | 'warehouses') || 'overview'} />;
      case 'cylinders':
        return <CylinderBalanceModule key={sub || 'customer'} initialSubTab={sub} />;
      case 'customers':
      case 'vendors':
        return (
          <CustomersModule
            customers={customers.items}
            products={products.items}
            defaultType={tab === 'vendors' ? 'Vendor' : 'Customer'}
            onAddCustomer={can('customers.manage') ? cust.add : () => showToast('Only the Super Admin can add parties.', 'error')}
            onUpdateCustomer={can('customers.manage') ? cust.update : undefined}
            onUpdateCustomers={can('customers.manage') ? customers.setItems : undefined}
            onDeleteCustomer={can('customers.manage') ? cust.remove : undefined}
          />
        );
      case 'routes':
        return <RoutesModule />;
      case 'payments':
        return <PaymentsModule />;
      case 'ledgers':
        return <LedgersModule />;
      case 'cash':
        return <CashWalletModule />;
      case 'day-closing':
        return <DayClosingModule />;
      case 'billing': {
        // The billing form picks its first product/customer when it mounts, so wait for both lists.
        const billable = products.items.filter((p) => p.active !== false);
        if (products.loading || customers.loading) return <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading products and customers…</div>;
        if (!billable.length || !activeCustomers.length)
          return (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">
              {!billable.length ? 'Add an active product in Masters → Products first.' : 'Add an active customer first.'}
            </div>
          );
        return <BillingModule key={`${billable.length}-${activeCustomers.length}`} customers={activeCustomers} products={billable} onAddInvoice={addInvoice} onOpenInvoiceModal={() => {}} />;
      }
      case 'gst':
        return <GstReportsModule invoices={invoices.items.filter((i) => (i.status as string) !== 'Cancelled')} />;
      case 'reports':
        return <ReportsModule key={sub || 'sales'} initialReport={sub || 'sales'} />;
      case 'whatsapp':
        return <WhatsAppCenter />;
      case 'admin':
        return <AdminModule key={sub || 'users'} initialTab={(sub as 'users' | 'devices' | 'audit') || 'users'} />;
      case 'settings':
        return <SettingsModule />;
      case 'documents': {
        const po = crud(purchaseOrders, 'Refill order');
        const pur = crud(purchases, 'Purchase bill');
        const pret = crud(purchaseReturns, 'Purchase return');
        const sret = crud(salesReturns, 'Sales return');
        const ch = crud(challans, 'Challan');
        const qt = crud(quotations, 'Quotation');
        return (
          <InventoryHubModule
            initialSubTab={sub || 'po'}
            setActiveTab={(t) => navigate('documents', t)}
            purchaseOrders={purchaseOrders.items}
            purchases={purchases.items}
            purchaseReturns={purchaseReturns.items}
            sales={invoices.items}
            salesReturns={salesReturns.items}
            challans={challans.items}
            quotations={quotations.items}
            products={products.items}
            customers={customers.items}
            banks={banks.items}
            narrations={narrations.items}
            staff={staff.items}
            onAddNarration={crud(narrations, 'Narration').add}
            onAddCustomer={cust.add}
            onUpdateProduct={prod.update}
            onAddPO={po.add}
            onUpdatePO={po.update}
            onDeletePO={po.remove}
            onAddPurchase={pur.add}
            onUpdatePurchase={pur.update}
            onDeletePurchase={pur.remove}
            onAddPurchaseReturn={pret.add}
            onUpdatePurchaseReturn={pret.update}
            onDeletePurchaseReturn={pret.remove}
            onAddSalesReturn={sret.add}
            onUpdateSalesReturn={sret.update}
            onDeleteSalesReturn={sret.remove}
            onAddChallan={ch.add}
            onUpdateChallan={ch.update}
            onDeleteChallan={ch.remove}
            onAddQuotation={qt.add}
            onUpdateQuotation={qt.update}
            onDeleteQuotation={qt.remove}
            onAddInvoice={addInvoice}
            onUpdateInvoice={updateInvoice}
            onDeleteInvoice={cancelInvoice}
          />
        );
      }
      case 'masters': {
        const bank = crud(banks, 'Bank');
        const company = crud(companies, 'Branch');
        const category = crud(categories, 'Category');
        const employee = crud(staff, 'Employee');
        const expense = crud(expenses, 'Expense head');
        const income = crud(incomes, 'Income head');
        const payment = crud(paymentModes, 'Payment mode');
        const narration = crud(narrations, 'Narration');
        return (
          <MastersModule
            initialSubTab={sub || 'product'}
            onSubTabChange={(s) => navigate('masters', s)}
            units={units.items}
            categories={categories.items}
            brands={brands.items}
            taxes={taxes.items}
            banks={banks.items}
            staff={staff.items}
            accounts={accounts.items}
            products={products.items}
            customers={customers.items}
            companies={companies.items}
            expenses={expenses.items}
            incomes={incomes.items}
            payments={paymentModes.items}
            narrations={narrations.items}
            followUps={followUps.items}
            onAddFollowUp={crud(followUps, 'Follow-up').add}
            bookTypes={bookTypes.items.map((b) => b.name)}
            onAddBookType={(name) => bookTypes.create({ id: '', name: name.trim().toUpperCase() }).catch((e) => showToast(errorMessage(e), 'error'))}
            onAddBank={bank.add}
            onUpdateBank={bank.update}
            onDeleteBank={bank.remove}
            onAddCompany={company.add}
            onUpdateCompany={company.update}
            onDeleteCompany={company.remove}
            onAddCategory={category.add}
            onUpdateCategory={category.update}
            onDeleteCategory={category.remove}
            onAddCustomer={cust.add}
            onUpdateCustomer={cust.update}
            onDeleteCustomer={cust.remove}
            onAddStaff={employee.add}
            onUpdateStaff={employee.update}
            onDeleteStaff={employee.remove}
            onAddExpense={expense.add}
            onUpdateExpense={expense.update}
            onDeleteExpense={expense.remove}
            onAddIncome={income.add}
            onUpdateIncome={income.update}
            onDeleteIncome={income.remove}
            onAddPayment={payment.add}
            onUpdatePayment={payment.update}
            onDeletePayment={payment.remove}
            onAddProduct={prod.add}
            onUpdateProduct={prod.update}
            onDeleteProduct={prod.remove}
            onAddNarration={narration.add}
            onUpdateNarration={narration.update}
            onDeleteNarration={narration.remove}
          />
        );
      }
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  const ledgerCustomer = ledgerCustomerId ? customers.items.find((c) => c.id === ledgerCustomerId) || ({ id: ledgerCustomerId, name: 'Customer', phone: '' } as Customer) : null;

  return (
    <div className="h-screen w-full bg-slate-100 text-slate-900 font-sans flex flex-col">
      {toast}
      <Navbar
        userEmail={session.user.name}
        roleLabel={ROLE_LABELS[session.user.role]}
        canInvoice={can('invoices.manage')}
        activeTab={tab}
        setActiveTab={(t, s) => navigate(t, s)}
        onLogout={() => void logout()}
        customers={customers.items}
        products={products.items}
        invoices={invoices.items}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={tab} activeSub={sub} can={can} onNavigate={navigate} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{screen()}</main>
      </div>
      <PrintInvoiceModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      <CustomerLedgerModal isOpen={!!ledgerCustomer} customer={ledgerCustomer} onClose={() => setLedgerCustomerId(null)} />
    </div>
  );
}
