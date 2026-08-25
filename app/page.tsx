'use client';
import CylinderBalanceModule from '../components/CylinderBalanceModule';
import ApprovalQueueModule from '../components/ApprovalQueueModule';
import DeliveryBoyModule from '../components/DeliveryBoyModule';
import DeliveryGpsTrackingModule from '../components/DeliveryGpsTrackingModule';
import SaasTenantModule from '../components/SaasTenantModule';
import WhatsAppInvoiceSenderModule from '../components/WhatsAppInvoiceSenderModule';


import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { LoginPage } from '../components/LoginPage';
import { Dashboard } from '../components/Dashboard';
import { BillingModule } from '../components/BillingModule';
import { InventoryModule } from '../components/InventoryModule';
import { InventoryHubModule } from '../components/InventoryHubModule';
import { AccountHubModule } from '../components/AccountHubModule';
import { ReportsAndToolsModule } from '../components/ReportsAndToolsModule';
import { CustomersModule } from '../components/CustomersModule';
import { GstReportsModule } from '../components/GstReportsModule';
import { SettingsModule } from '../components/SettingsModule';
import { MastersModule } from '../components/MastersModule';
import { AdminModule } from '../components/AdminModule';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';

import { 
  INITIAL_CUSTOMERS, 
  INITIAL_PRODUCTS, 
  INITIAL_INVOICES,
  INITIAL_UNITS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_TAXES,
  INITIAL_BANKS,
  INITIAL_NARRATIONS,
  INITIAL_STAFF,
  INITIAL_ACCOUNTS,
  INITIAL_COMPANIES,
  INITIAL_EXPENSES,
  INITIAL_INCOMES,
  INITIAL_PAYMENTS,
  INITIAL_BOM,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASES,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_SALE_ORDERS,
  INITIAL_SALES_RETURNS,
  INITIAL_CHALLANS,
  INITIAL_QUOTATIONS,
  INITIAL_ADJUSTMENTS,
  INITIAL_BRANCH_TRANSFERS,
  INITIAL_CUSTOMER_LEDGER,
  INITIAL_COMPANY_LEDGER,
  INITIAL_BANK_BOOK,
  INITIAL_EMPLOYEE_LEDGER,
  INITIAL_EXPENSES_LEDGER,
  INITIAL_INCOMES_LEDGER,
  INITIAL_PAYMENT_LEDGER,
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOG
} from '../lib/mockData';
import { 
  Customer, 
  Product, 
  Invoice, 
  UnitMaster, 
  CategoryMaster, 
  BrandMaster, 
  TaxMaster, 
  BankMaster,
  NarrationMaster,
  EmployeeMaster,
  AccountMaster,
  CompanyMaster,
  ExpenseMaster,
  IncomeMaster,
  PaymentMaster,
  BomMaster,
  PurchaseOrder,
  PurchaseInvoice,
  SaleOrder,
  Quotation,
  StockAdjustment,
  ReturnDocument,
  DeliveryChallan,
  AuditLogEntry,
  FollowUp
} from '../lib/types';
import { usePersistedState } from '../lib/usePersistedState';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = usePersistedState('osbooks.isLoggedIn', false);
  const [userEmail, setUserEmail] = usePersistedState('osbooks.userEmail', '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMastersSubTab, setActiveMastersSubTab] = useState('bank');
  const [activeInventorySubTab, setActiveInventorySubTab] = useState('stock');
  const [activeAccountSubTab, setActiveAccountSubTab] = useState('customer-ledger');

  const [reportsCategory, setReportsCategory] = useState('account-summary');
  const [reportsSubTab, setReportsSubTab] = useState('cust-outstanding');

  // Helper to sync tab and subTab into Browser URL Bar
  const updateUrlParams = (tab: string, subTab?: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    if (subTab) {
      params.set('subTab', subTab);
    } else {
      params.delete('subTab');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  };

  // Sync session & role redirection from API on Initial Mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated && json.user) {
          setIsLoggedIn(true);
          setUserEmail(json.user.email || json.user.name);
          if (json.user.role === 'CUSTOMER' && window.location.pathname !== '/customer') {
            window.location.href = '/customer';
          } else if (json.user.role === 'ACCOUNTANT' && window.location.pathname !== '/accountant') {
            window.location.href = '/accountant';
          } else if (json.user.role === 'DELIVERY_BOY' && window.location.pathname !== '/delivery') {
            window.location.href = '/delivery';
          }
        }
      })
      .catch(() => {});

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    const urlSubTab = params.get('subTab');

    if (urlTab) {
      if (urlTab === 'bank' || urlTab === 'bank-master') {
        setActiveTab('masters');
        setActiveMastersSubTab('bank');
      } else {
        setActiveTab(urlTab);
        if (urlTab === 'masters' && urlSubTab) {
          setActiveMastersSubTab(urlSubTab);
        } else if (urlTab === 'inventory-hub' && urlSubTab) {
          setActiveInventorySubTab(urlSubTab);
        } else if (urlTab === 'account-hub' && urlSubTab) {
          setActiveAccountSubTab(urlSubTab);
        }
      }
    }
  }, []);

  // Core Application State
  const [customers, setCustomers] = usePersistedState<Customer[]>('osbooks.customers', INITIAL_CUSTOMERS);
  const [followUps, setFollowUps] = usePersistedState<FollowUp[]>('osbooks.followUps', []);
  const [products, setProducts] = usePersistedState<Product[]>('osbooks.products', INITIAL_PRODUCTS);
  const [invoices, setInvoices] = usePersistedState<Invoice[]>('osbooks.invoices', INITIAL_INVOICES);

  // ERP Masters State
  const [units, setUnits] = usePersistedState<UnitMaster[]>('osbooks.units', INITIAL_UNITS);
  const [categories, setCategories] = usePersistedState<CategoryMaster[]>('osbooks.categories', INITIAL_CATEGORIES);
  const [brands, setBrands] = usePersistedState<BrandMaster[]>('osbooks.brands', INITIAL_BRANDS);
  const [taxes, setTaxes] = usePersistedState<TaxMaster[]>('osbooks.taxes', INITIAL_TAXES);
  const [banks, setBanks] = usePersistedState<BankMaster[]>('osbooks.banks', INITIAL_BANKS);
  const [narrations, setNarrations] = usePersistedState<NarrationMaster[]>('osbooks.narrations', INITIAL_NARRATIONS);
  const [bookTypes, setBookTypes] = usePersistedState<string[]>('osbooks.bookTypes', [
    'BANK BOOK',
    'CASH BOOK',
    'NON-PAYMENT BOOK',
    'LOAN ACCOUNT',
    'OD / CC ACCOUNT',
    'PETTY CASH BOOK',
  ]);

  const handleAddBookType = (newType: string) => {
    const formatted = newType.trim().toUpperCase();
    if (formatted && !bookTypes.includes(formatted)) {
      setBookTypes([...bookTypes, formatted]);
      addAuditEntry('Book Type Added', `Added custom Book Type: ${formatted}`);
    }
  };
  const [staff, setStaff] = usePersistedState<EmployeeMaster[]>('osbooks.staff', INITIAL_STAFF);
  const [accounts, setAccounts] = usePersistedState<AccountMaster[]>('osbooks.accounts', INITIAL_ACCOUNTS);
  const [companies, setCompanies] = usePersistedState<CompanyMaster[]>('osbooks.companies', INITIAL_COMPANIES);
  const [expenses, setExpenses] = usePersistedState<ExpenseMaster[]>('osbooks.expenses', INITIAL_EXPENSES);
  const [incomes, setIncomes] = usePersistedState<IncomeMaster[]>('osbooks.incomes', INITIAL_INCOMES);
  const [payments, setPayments] = usePersistedState<PaymentMaster[]>('osbooks.payments', INITIAL_PAYMENTS);
  const [boms, setBoms] = usePersistedState<BomMaster[]>('osbooks.boms', INITIAL_BOM);

  // OS-BOOKS Inventory State
  const [purchaseOrders, setPurchaseOrders] = usePersistedState<PurchaseOrder[]>('osbooks.purchaseOrders', INITIAL_PURCHASE_ORDERS);
  const [purchases, setPurchases] = usePersistedState<PurchaseInvoice[]>('osbooks.purchases', INITIAL_PURCHASES);
  const [purchaseReturns, setPurchaseReturns] = usePersistedState('osbooks.purchaseReturns', INITIAL_PURCHASE_RETURNS);
  const [saleOrders, setSaleOrders] = usePersistedState<SaleOrder[]>('osbooks.saleOrders', INITIAL_SALE_ORDERS);
  const [salesReturns, setSalesReturns] = usePersistedState('osbooks.salesReturns', INITIAL_SALES_RETURNS);
  const [challans, setChallans] = usePersistedState('osbooks.challans', INITIAL_CHALLANS);
  const [quotations, setQuotations] = usePersistedState<Quotation[]>('osbooks.quotations', INITIAL_QUOTATIONS);
  const [adjustments, setAdjustments] = usePersistedState<StockAdjustment[]>('osbooks.adjustments', INITIAL_ADJUSTMENTS);

  // OS-BOOKS Account State
  const [branchTransfers, setBranchTransfers] = usePersistedState('osbooks.branchTransfers', INITIAL_BRANCH_TRANSFERS);
  const [customerLedger, setCustomerLedger] = usePersistedState('osbooks.customerLedger', INITIAL_CUSTOMER_LEDGER);
  const [companyLedger, setCompanyLedger] = usePersistedState('osbooks.companyLedger', INITIAL_COMPANY_LEDGER);
  const [bankBook, setBankBook] = usePersistedState('osbooks.bankBook', INITIAL_BANK_BOOK);
  const [employeeLedger, setEmployeeLedger] = usePersistedState('osbooks.employeeLedger', INITIAL_EMPLOYEE_LEDGER);
  const [expensesLedger, setExpensesLedger] = usePersistedState('osbooks.expensesLedger', INITIAL_EXPENSES_LEDGER);
  const [incomesLedger, setIncomesLedger] = usePersistedState('osbooks.incomesLedger', INITIAL_INCOMES_LEDGER);
  const [paymentLedger, setPaymentLedger] = usePersistedState('osbooks.paymentLedger', INITIAL_PAYMENT_LEDGER);
  const [attendance, setAttendance] = usePersistedState('osbooks.attendance', INITIAL_ATTENDANCE);

  // Admin: Audit Log State
  const [auditLog, setAuditLog] = usePersistedState<AuditLogEntry[]>('osbooks.auditLog', INITIAL_AUDIT_LOG);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('reports-hub');
        setReportsCategory('account-summary');
        setReportsSubTab('stock-summary');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('billing');
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setActiveTab('reports-hub');
        setReportsCategory('tools-hub');
        setReportsSubTab('complaint');
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setActiveTab('account-hub');
        setActiveAccountSubTab('customer-ledger');
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setActiveTab('account-hub');
        setActiveAccountSubTab('company-ledger');
      } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setActiveTab('account-hub');
        setActiveAccountSubTab('expenses-ledger');
      } else if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setActiveTab('account-hub');
        setActiveAccountSubTab('incomes-ledger');
      } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setActiveTab('inventory-hub');
        setActiveInventorySubTab('purchase');
      } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setActiveTab('billing');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addAuditEntry = (action: string, details: string) => {
    setAuditLog((prev) => [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actorEmail: userEmail || 'unknown',
        action,
        details,
      },
      ...prev,
    ]);
  };

  const handleLoginSuccess = (userOrEmail: any, redirectPath?: string) => {
    const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
    const targetPath = redirectPath || (typeof userOrEmail === 'object' ? userOrEmail?.redirectPath : null);

    setUserEmail(email || 'user');
    setIsLoggedIn(true);

    if (targetPath) {
      window.location.href = targetPath;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setIsLoggedIn(false);
    window.location.href = '/login';
  };

  const handleTabChange = (tab: string, subTab?: string, cat?: string) => {
    if (tab === 'bank' || tab === 'bank-master') {
      setActiveTab('masters');
      setActiveMastersSubTab('bank');
      updateUrlParams('masters', 'bank');
      return;
    }

    setActiveTab(tab);

    if (tab === 'masters') {
      const targetSub = subTab || activeMastersSubTab || 'bank';
      setActiveMastersSubTab(targetSub);
      updateUrlParams('masters', targetSub);
    } else if (tab === 'inventory-hub') {
      const targetSub = subTab || activeInventorySubTab;
      if (subTab) setActiveInventorySubTab(subTab);
      updateUrlParams('inventory-hub', targetSub);
    } else if (tab === 'account-hub') {
      const targetSub = subTab || activeAccountSubTab;
      if (subTab) setActiveAccountSubTab(subTab);
      updateUrlParams('account-hub', targetSub);
    } else {
      if (subTab) updateUrlParams(tab, subTab);
      else updateUrlParams(tab);
    }

    if (tab === 'reports-hub') {
      if (subTab) setReportsSubTab(subTab);
      if (cat) setReportsCategory(cat);
    }
  };

  const handleAddInvoice = (newInv: Invoice) => {
    setInvoices([newInv, ...invoices]);
    const updatedProducts = products.map((prod) => {
      const invItem = newInv.items.find((item) => item.productId === prod.id);
      if (invItem) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - invItem.quantity),
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    addAuditEntry('Invoice Created', `Invoice ${newInv.invoiceNumber} for ${newInv.customerName} (₹${newInv.grandTotal.toLocaleString('en-IN')})`);
  };

  const handleAddProduct = (newProd: Product) => {
    setProducts([newProd, ...products]);
    addAuditEntry('Product Added', `Added product: ${newProd.name}`);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts(products.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    addAuditEntry('Product Updated', `Updated product: ${updatedProd.name}`);
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts(products.filter((p) => p.id !== productId));
    if (target) {
      addAuditEntry('Product Deleted', `Deleted product: ${target.name}`);
    }
  };

  // BOM Master Handlers
  const handleAddBom = (newBom: BomMaster) => {
    setBoms([newBom, ...boms]);
    addAuditEntry('BOM Added', `Added BOM recipe: ${newBom.finishedGoodName}`);
  };

  const handleUpdateBom = (updatedBom: BomMaster) => {
    setBoms(boms.map((b) => (b.id === updatedBom.id ? updatedBom : b)));
    addAuditEntry('BOM Updated', `Updated BOM recipe: ${updatedBom.finishedGoodName}`);
  };

  const handleDeleteBom = (bomId: string) => {
    const target = boms.find((b) => b.id === bomId);
    setBoms(boms.filter((b) => b.id !== bomId));
    if (target) {
      addAuditEntry('BOM Deleted', `Deleted BOM recipe: ${target.finishedGoodName}`);
    }
  };

  // Creation Handlers for Documents
  const handleAddPO = (po: PurchaseOrder) => {
    setPurchaseOrders([po, ...purchaseOrders]);
  };

  const handleUpdatePO = (updatedPO: PurchaseOrder) => {
    setPurchaseOrders(purchaseOrders.map((po) => (po.id === updatedPO.id ? updatedPO : po)));
  };

  const handleDeletePO = (poId: string) => {
    setPurchaseOrders(purchaseOrders.filter((po) => po.id !== poId));
  };

  const handleAddPurchase = (pur: PurchaseInvoice) => {
    setPurchases([pur, ...purchases]);
  };

  const handleUpdatePurchase = (updatedPur: PurchaseInvoice) => {
    setPurchases(purchases.map((pur) => (pur.id === updatedPur.id ? updatedPur : pur)));
  };

  const handleDeletePurchase = (purId: string) => {
    setPurchases(purchases.filter((pur) => pur.id !== purId));
  };

  const handleAddSO = (so: SaleOrder) => {
    setSaleOrders([so, ...saleOrders]);
  };

  const handleUpdateSO = (updatedSO: SaleOrder) => {
    setSaleOrders(saleOrders.map((so) => (so.id === updatedSO.id ? updatedSO : so)));
  };

  const handleDeleteSO = (soId: string) => {
    setSaleOrders(saleOrders.filter((so) => so.id !== soId));
  };

  const handleUpdateInvoice = (updatedInv: Invoice) => {
    setInvoices(invoices.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv)));
  };

  const handleDeleteInvoice = (invId: string) => {
    setInvoices(invoices.filter((inv) => inv.id !== invId));
  };

  const handleAddQuotation = (qt: Quotation) => {
    setQuotations([qt, ...quotations]);
  };

  const handleUpdateQuotation = (updatedQt: Quotation) => {
    setQuotations(quotations.map((qt) => (qt.id === updatedQt.id ? updatedQt : qt)));
  };

  const handleDeleteQuotation = (qtId: string) => {
    setQuotations(quotations.filter((qt) => qt.id !== qtId));
  };

  const handleAddAdjustment = (adj: StockAdjustment) => {
    setAdjustments([adj, ...adjustments]);
  };

  const handleUpdateAdjustment = (updatedAdj: StockAdjustment) => {
    setAdjustments(adjustments.map((adj) => (adj.id === updatedAdj.id ? updatedAdj : adj)));
  };

  const handleDeleteAdjustment = (adjId: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== adjId));
  };

  const handleAddChallan = (ch: DeliveryChallan) => {
    setChallans([ch, ...challans]);
  };

  const handleUpdateChallan = (updatedCh: DeliveryChallan) => {
    setChallans(challans.map((ch) => (ch.id === updatedCh.id ? updatedCh : ch)));
  };

  const handleDeleteChallan = (chId: string) => {
    setChallans(challans.filter((ch) => ch.id !== chId));
  };

  const handleAddPurchaseReturn = (ret: ReturnDocument) => {
    setPurchaseReturns([ret, ...purchaseReturns]);
  };

  const handleUpdatePurchaseReturn = (updatedRet: ReturnDocument) => {
    setPurchaseReturns(purchaseReturns.map((ret) => (ret.id === updatedRet.id ? updatedRet : ret)));
  };

  const handleDeletePurchaseReturn = (retId: string) => {
    setPurchaseReturns(purchaseReturns.filter((ret) => ret.id !== retId));
  };

  const handleAddSalesReturn = (ret: ReturnDocument) => {
    setSalesReturns([ret, ...salesReturns]);
  };

  const handleUpdateSalesReturn = (updatedRet: ReturnDocument) => {
    setSalesReturns(salesReturns.map((ret) => (ret.id === updatedRet.id ? updatedRet : ret)));
  };

  const handleDeleteSalesReturn = (retId: string) => {
    setSalesReturns(salesReturns.filter((ret) => ret.id !== retId));
  };

  // Admin Handlers
  const handleAddStaff = (newStaff: EmployeeMaster) => {
    setStaff([newStaff, ...staff]);
    addAuditEntry('Staff Added', `Created employee record: ${newStaff.name} (${newStaff.role})`);
  };

  const handleUpdateStaff = (updatedStaff: EmployeeMaster) => {
    setStaff(staff.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
    addAuditEntry('Staff Updated', `Updated employee record: ${updatedStaff.name}`);
  };

  const handleDeleteStaff = (id: string) => {
    const target = staff.find((s) => s.id === id);
    setStaff(staff.filter((s) => s.id !== id));
    if (target) {
      addAuditEntry('Staff Deleted', `Deleted employee record: ${target.name}`);
    }
  };

  const handleToggleStaffActive = (id: string) => {
    setStaff(staff.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
    const target = staff.find((s) => s.id === id);
    if (target) {
      addAuditEntry('Staff Status Changed', `${target.name} marked ${target.active ? 'inactive' : 'active'}`);
    }
  };

  // Company Master Handlers
  const handleAddCompany = (newCompany: CompanyMaster) => {
    setCompanies([newCompany, ...companies]);
    addAuditEntry('Company Added', `Added company/branch: ${newCompany.companyName}`);
  };

  const handleUpdateCompany = (updatedCompany: CompanyMaster) => {
    setCompanies(companies.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
    addAuditEntry('Company Updated', `Updated company/branch: ${updatedCompany.companyName}`);
  };

  const handleDeleteCompany = (companyId: string) => {
    const target = companies.find((c) => c.id === companyId);
    setCompanies(companies.filter((c) => c.id !== companyId));
    if (target) {
      addAuditEntry('Company Deleted', `Deleted company/branch: ${target.companyName}`);
    }
  };

  // Category Master Handlers
  const handleAddCategory = (newCategory: CategoryMaster) => {
    setCategories([newCategory, ...categories]);
    addAuditEntry('Category Added', `Added category: ${newCategory.name}`);
  };

  const handleUpdateCategory = (updatedCategory: CategoryMaster) => {
    setCategories(categories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c)));
    addAuditEntry('Category Updated', `Updated category: ${updatedCategory.name}`);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const target = categories.find((c) => c.id === categoryId);
    setCategories(categories.filter((c) => c.id !== categoryId));
    if (target) {
      addAuditEntry('Category Deleted', `Deleted category: ${target.name}`);
    }
  };

  // Expense Master Handlers
  const handleAddExpense = (newExpense: ExpenseMaster) => {
    setExpenses([newExpense, ...expenses]);
    addAuditEntry('Expense Added', `Added expense category: ${newExpense.categoryName}`);
  };

  const handleUpdateExpense = (updatedExpense: ExpenseMaster) => {
    setExpenses(expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
    addAuditEntry('Expense Updated', `Updated expense category: ${updatedExpense.categoryName}`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    setExpenses(expenses.filter((e) => e.id !== expenseId));
    if (target) {
      addAuditEntry('Expense Deleted', `Deleted expense category: ${target.categoryName}`);
    }
  };

  // Income Master Handlers
  const handleAddIncome = (newIncome: IncomeMaster) => {
    setIncomes([newIncome, ...incomes]);
    addAuditEntry('Income Added', `Added income source: ${newIncome.sourceName}`);
  };

  const handleUpdateIncome = (updatedIncome: IncomeMaster) => {
    setIncomes(incomes.map((i) => (i.id === updatedIncome.id ? updatedIncome : i)));
    addAuditEntry('Income Updated', `Updated income source: ${updatedIncome.sourceName}`);
  };

  const handleDeleteIncome = (incomeId: string) => {
    const target = incomes.find((i) => i.id === incomeId);
    setIncomes(incomes.filter((i) => i.id !== incomeId));
    if (target) {
      addAuditEntry('Income Deleted', `Deleted income source: ${target.sourceName}`);
    }
  };

  // Payment Master Handlers
  const handleAddPayment = (newPayment: PaymentMaster) => {
    setPayments([newPayment, ...payments]);
    addAuditEntry('Payment Mode Added', `Added payment mode: ${newPayment.modeName} (${newPayment.linkedAccount})`);
  };

  const handleUpdatePayment = (updatedPayment: PaymentMaster) => {
    setPayments(payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p)));
    addAuditEntry('Payment Mode Updated', `Updated payment mode: ${updatedPayment.modeName}`);
  };

  const handleDeletePayment = (paymentId: string) => {
    const target = payments.find((p) => p.id === paymentId);
    setPayments(payments.filter((p) => p.id !== paymentId));
    if (target) {
      addAuditEntry('Payment Mode Deleted', `Deleted payment mode: ${target.modeName}`);
    }
  };

  // Customer / Vendor Handlers
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers([newCust, ...customers]);
    addAuditEntry('Party Added', `Added ${newCust.type.toLowerCase()}: ${newCust.name}`);
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers(customers.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    addAuditEntry('Party Updated', `Updated ${updatedCust.type.toLowerCase()}: ${updatedCust.name}`);
  };

  const handleAddFollowUp = (followUp: FollowUp) => {
    setFollowUps([followUp, ...followUps]);
    const target = customers.find((c) => c.id === followUp.customerId);
    if (target) {
      addAuditEntry('Follow-up Logged', `Follow-up added for ${target.name}: ${followUp.note}`);
    }
  };

  const handleDeleteCustomer = (custId: string) => {
    const target = customers.find((c) => c.id === custId);
    setCustomers(customers.filter((c) => c.id !== custId));
    if (target) {
      addAuditEntry('Party Deleted', `Deleted ${target.type.toLowerCase()}: ${target.name}`);
    }
  };

  // Bank Master Handlers
  const handleAddBank = (newBank: BankMaster) => {
    setBanks([newBank, ...banks]);
    addAuditEntry('Bank Added', `Created bank master: ${newBank.accountName} (${newBank.bankName})`);
  };

  const handleUpdateBank = (updatedBank: BankMaster) => {
    setBanks(banks.map((b) => (b.id === updatedBank.id ? updatedBank : b)));
    addAuditEntry('Bank Updated', `Updated bank master: ${updatedBank.accountName}`);
  };

  const handleDeleteBank = (bankId: string) => {
    const target = banks.find((b) => b.id === bankId);
    setBanks(banks.filter((b) => b.id !== bankId));
    if (target) {
      addAuditEntry('Bank Deleted', `Deleted bank master: ${target.accountName}`);
    }
  };

  // Narration Master Handlers
  const handleAddNarration = (newNarration: NarrationMaster) => {
    setNarrations([newNarration, ...narrations]);
    addAuditEntry('Narration Added', `Created narration master: ${newNarration.text}`);
  };

  const handleUpdateNarration = (updatedNarration: NarrationMaster) => {
    setNarrations(narrations.map((n) => (n.id === updatedNarration.id ? updatedNarration : n)));
    addAuditEntry('Narration Updated', `Updated narration master: ${updatedNarration.text}`);
  };

  const handleDeleteNarration = (narrationId: string) => {
    const target = narrations.find((n) => n.id === narrationId);
    setNarrations(narrations.filter((n) => n.id !== narrationId));
    if (target) {
      addAuditEntry('Narration Deleted', `Deleted narration master: ${target.text}`);
    }
  };

  const handleResetDemoData = () => {
    if (typeof window === 'undefined') return;
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('osbooks.') && k !== 'osbooks.isLoggedIn' && k !== 'osbooks.userEmail')
      .forEach((k) => window.localStorage.removeItem(k));
    window.location.reload();
  };

  const exportAllData = () => ({
    customers, products, invoices, units, categories, brands, taxes, banks, staff,
    accounts, companies, expenses, incomes, payments, boms, purchaseOrders, purchases,
    purchaseReturns, saleOrders, salesReturns, challans, quotations, adjustments,
    branchTransfers, customerLedger, companyLedger, bankBook, employeeLedger,
    expensesLedger, incomesLedger, paymentLedger, attendance, auditLog,
  });

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;
  const unpaidCount = invoices.filter((i) => i.status === 'Unpaid').length;

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Navbar */}
      <Navbar
        userEmail={userEmail}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        customers={customers}
        products={products}
        invoices={invoices}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          lowStockCount={lowStockCount}
          unpaidCount={unpaidCount}
          activeMastersSubTab={activeMastersSubTab}
          activeInventorySubTab={activeInventorySubTab}
          activeAccountSubTab={activeAccountSubTab}
          reportsSubTab={reportsSubTab}
        />

        {/* Dynamic Content View Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-100 text-slate-900">
          {activeTab === 'cylinder-inventory' && <CylinderBalanceModule />}
          {activeTab === 'approval-queue' && <ApprovalQueueModule />}
          {activeTab === 'delivery-app' && <DeliveryBoyModule />}
          {activeTab === 'whatsapp-sender' && <WhatsAppInvoiceSenderModule />}
          {activeTab === 'customer-360' && <CustomersModule customers={customers} onAddCustomer={handleAddCustomer} />}
      {activeTab === 'dashboard' && (
            <Dashboard
              invoices={invoices}
              products={products}
              customers={customers}
              setActiveTab={handleTabChange}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
            />
          )}

          {activeTab === 'masters' && (
            <MastersModule
              units={units}
              categories={categories}
              brands={brands}
              taxes={taxes}
              banks={banks}
              staff={staff}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              accounts={accounts}
              products={products}
              customers={customers}
              companies={companies}
              expenses={expenses}
              incomes={incomes}
              payments={payments}
              boms={boms}
              narrations={narrations}
              onAddNarration={handleAddNarration}
              onUpdateNarration={handleUpdateNarration}
              onDeleteNarration={handleDeleteNarration}
              onAddBank={handleAddBank}
              onUpdateBank={handleUpdateBank}
              onDeleteBank={handleDeleteBank}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddIncome={handleAddIncome}
              onUpdateIncome={handleUpdateIncome}
              onDeleteIncome={handleDeleteIncome}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddBom={handleAddBom}
              onUpdateBom={handleUpdateBom}
              onDeleteBom={handleDeleteBom}
              followUps={followUps}
              onAddFollowUp={handleAddFollowUp}
              bookTypes={bookTypes}
              onAddBookType={handleAddBookType}
              initialSubTab={activeMastersSubTab}
              onSubTabChange={(st) => handleTabChange('masters', st)}
            />
          )}

          {(activeTab === 'inventory-hub' || activeTab === 'inventory') && (
            <InventoryHubModule
              purchaseOrders={purchaseOrders}
              purchases={purchases}
              purchaseReturns={purchaseReturns}
              saleOrders={saleOrders}
              sales={invoices}
              salesReturns={salesReturns}
              challans={challans}
              quotations={quotations}
              adjustments={adjustments}
              products={products}
              customers={customers}
              banks={banks}
              narrations={narrations}
              onAddNarration={handleAddNarration}
              onAddCustomer={handleAddCustomer}
              initialSubTab={activeInventorySubTab}
              setActiveTab={handleTabChange}
              onAddPO={handleAddPO}
              onUpdatePO={handleUpdatePO}
              onDeletePO={handleDeletePO}
              onAddPurchase={handleAddPurchase}
              onUpdatePurchase={handleUpdatePurchase}
              onDeletePurchase={handleDeletePurchase}
              onUpdateProduct={handleUpdateProduct}
              onAddSO={handleAddSO}
              onUpdateSO={handleUpdateSO}
              onDeleteSO={handleDeleteSO}
              onAddQuotation={handleAddQuotation}
              onUpdateQuotation={handleUpdateQuotation}
              onDeleteQuotation={handleDeleteQuotation}
              onAddAdjustment={handleAddAdjustment}
              onUpdateAdjustment={handleUpdateAdjustment}
              onDeleteAdjustment={handleDeleteAdjustment}
              onAddChallan={handleAddChallan}
              onUpdateChallan={handleUpdateChallan}
              onDeleteChallan={handleDeleteChallan}
              onAddPurchaseReturn={handleAddPurchaseReturn}
              onUpdatePurchaseReturn={handleUpdatePurchaseReturn}
              onDeletePurchaseReturn={handleDeletePurchaseReturn}
              onAddSalesReturn={handleAddSalesReturn}
              onUpdateSalesReturn={handleUpdateSalesReturn}
              onDeleteSalesReturn={handleDeleteSalesReturn}
              onAddInvoice={handleAddInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}

          {activeTab === 'account-hub' && (
            <AccountHubModule
              customerLedger={customerLedger}
              companyLedger={companyLedger}
              bankBook={bankBook}
              employeeLedger={employeeLedger}
              expensesLedger={expensesLedger}
              incomesLedger={incomesLedger}
              paymentLedger={paymentLedger}
              attendance={attendance}
              branchTransfers={branchTransfers}
              customers={customers}
              companies={companies}
              initialSubTab={activeAccountSubTab}
            />
          )}

          {activeTab === 'reports-hub' && (
            <ReportsAndToolsModule
              products={products}
              customers={customers}
              invoices={invoices}
              initialCategory={reportsCategory}
              initialSubTab={reportsSubTab}
              onUpdateProduct={handleUpdateProduct}
            />
          )}

          {activeTab === 'billing' && (
            <BillingModule
              customers={customers}
              products={products}
              onAddInvoice={handleAddInvoice}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersModule customers={customers} onAddCustomer={handleAddCustomer} />
          )}

          {activeTab === 'gst-reports' && <GstReportsModule invoices={invoices} />}

          {activeTab === 'settings' && <SettingsModule />}

          {activeTab === 'admin' && (
            <AdminModule
              staff={staff}
              companies={companies}
              taxes={taxes}
              auditLog={auditLog}
              onAddStaff={handleAddStaff}
              onToggleStaffActive={handleToggleStaffActive}
              onAddCompany={handleAddCompany}
              onResetDemoData={handleResetDemoData}
              exportAllData={exportAllData}
            />
          )}
        </main>
      </div>

      {/* Printable Invoice Modal */}
      <PrintInvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}