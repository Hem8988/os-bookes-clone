'use client';

import React, { useState } from 'react';
import { 
  Database, 
  Package, 
  Users, 
  Ruler, 
  Tag, 
  Building2, 
  UserCheck, 
  Plus, 
  Search, 
  X,
  CreditCard,
  Layers,
  DollarSign,
  TrendingUp,
  Receipt,
  Boxes,
  QrCode,
  Barcode,
  Edit3,
  Trash2,
  Download,
  GitMerge,
  Filter,
  LayoutGrid,
  Table,
  Landmark,
  Shield,
  MapPin,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import {
  UnitMaster,
  CategoryMaster,
  BrandMaster,
  TaxMaster,
  BankMaster,
  EmployeeMaster,
  AccountMaster,
  Product,
  Customer,
  CompanyMaster,
  ExpenseMaster,
  IncomeMaster,
  PaymentMaster,
  BomMaster,
  NarrationMaster,
  FollowUp
} from '../lib/types';
import { AddEditBankModal } from './AddEditBankModal';
import { AddEditCompanyModal } from './AddEditCompanyModal';
import { AddEditCategoryModal } from './AddEditCategoryModal';
import { AddEditVendorModal } from './AddEditVendorModal';
import { AddEditEmployeeModal } from './AddEditEmployeeModal';
import { AddEditExpenseModal } from './AddEditExpenseModal';
import { AddEditIncomeModal } from './AddEditIncomeModal';
import { AddEditPaymentModal } from './AddEditPaymentModal';
import { AddEditProductModal } from './AddEditProductModal';
import { AddEditBomModal } from './AddEditBomModal';
import { BankQrBarcodeModal } from './BankQrBarcodeModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';

interface MastersModuleProps {
  units: UnitMaster[];
  categories: CategoryMaster[];
  brands: BrandMaster[];
  taxes: TaxMaster[];
  banks: BankMaster[];
  staff: EmployeeMaster[];
  accounts: AccountMaster[];
  products: Product[];
  customers: Customer[];
  companies: CompanyMaster[];
  expenses: ExpenseMaster[];
  incomes: IncomeMaster[];
  payments: PaymentMaster[];
  boms: BomMaster[];
  narrations: NarrationMaster[];
  followUps?: FollowUp[];
  onAddFollowUp?: (followUp: FollowUp) => void;
  onAddBank?: (bank: BankMaster) => void;
  onUpdateBank?: (bank: BankMaster) => void;
  onDeleteBank?: (id: string) => void;
  onAddCompany?: (company: CompanyMaster) => void;
  onUpdateCompany?: (company: CompanyMaster) => void;
  onDeleteCompany?: (id: string) => void;
  onAddCategory?: (category: CategoryMaster) => void;
  onUpdateCategory?: (category: CategoryMaster) => void;
  onDeleteCategory?: (id: string) => void;
  onAddCustomer?: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
  onAddStaff?: (employee: EmployeeMaster) => void;
  onUpdateStaff?: (employee: EmployeeMaster) => void;
  onDeleteStaff?: (id: string) => void;
  onAddExpense?: (expense: ExpenseMaster) => void;
  onUpdateExpense?: (expense: ExpenseMaster) => void;
  onDeleteExpense?: (id: string) => void;
  onAddIncome?: (income: IncomeMaster) => void;
  onUpdateIncome?: (income: IncomeMaster) => void;
  onDeleteIncome?: (id: string) => void;
  onAddPayment?: (payment: PaymentMaster) => void;
  onUpdatePayment?: (payment: PaymentMaster) => void;
  onDeletePayment?: (id: string) => void;
  onAddProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
  onAddBom?: (bom: BomMaster) => void;
  onUpdateBom?: (bom: BomMaster) => void;
  onDeleteBom?: (id: string) => void;
  onAddNarration?: (narration: NarrationMaster) => void;
  onUpdateNarration?: (narration: NarrationMaster) => void;
  onDeleteNarration?: (id: string) => void;
  bookTypes?: string[];
  onAddBookType?: (newType: string) => void;
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const MastersModule: React.FC<MastersModuleProps> = ({
  units,
  categories,
  brands,
  taxes,
  banks,
  staff,
  accounts,
  products,
  customers,
  companies,
  expenses,
  incomes,
  payments,
  boms,
  narrations,
  followUps = [],
  onAddFollowUp,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddBom,
  onUpdateBom,
  onDeleteBom,
  onAddNarration,
  onUpdateNarration,
  onDeleteNarration,
  bookTypes = ['BANK BOOK', 'CASH BOOK', 'NON-PAYMENT BOOK', 'LOAN ACCOUNT', 'OD / CC ACCOUNT', 'PETTY CASH BOOK'],
  onAddBookType,
  initialSubTab = 'bank',
  onSubTabChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [narrationForm, setNarrationForm] = useState<{ id: string | null; text: string } | null>(null);
  const [narrationDeleteId, setNarrationDeleteId] = useState<string | null>(null);

  const handleSaveNarration = () => {
    if (!narrationForm || !narrationForm.text.trim()) return;
    if (narrationForm.id) {
      onUpdateNarration?.({ id: narrationForm.id, text: narrationForm.text.trim() });
    } else {
      onAddNarration?.({ id: `narr-${Date.now()}`, text: narrationForm.text.trim() });
    }
    setNarrationForm(null);
  };

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSubTabClick = (subTabId: string) => {
    setActiveSubTab(subTabId);
    setSearchTerm('');
    if (onSubTabChange) {
      onSubTabChange(subTabId);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  // View Modes (Table vs Cards) for Bank, Company, Customer
  const [bankViewMode, setBankViewMode] = useState<'table' | 'cards'>('table');
  const [companyViewMode, setCompanyViewMode] = useState<'table' | 'cards'>('table');
  const [customerViewMode, setCustomerViewMode] = useState<'table' | 'cards'>('table');

  // Filter States
  const [bankNameFilter, setBankNameFilter] = useState<string>('ALL');
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('ALL');

  // Bank Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankMaster | null>(null);
  const [qrModalBank, setQrModalBank] = useState<BankMaster | null>(null);

  // Company Specific UI States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyMaster | null>(null);

  // Category Specific UI States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryMaster | null>(null);

  // Vendor / Customer Specific UI States
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [vendorDefaultType, setVendorDefaultType] = useState<'Vendor' | 'Customer'>('Vendor');

  // Follow-up Modal State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpCustomer, setFollowUpCustomer] = useState<Customer | null>(null);

  // Employee Specific UI States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeMaster | null>(null);

  // Expense Specific UI States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseMaster | null>(null);

  // Income Specific UI States
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeMaster | null>(null);

  // Payment Specific UI States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMaster | null>(null);

  // Product Specific UI States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // BOM Specific UI States
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BomMaster | null>(null);

  // Delete Alert Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'bank' | 'company' | 'category' | 'customer' | 'employee' | 'expense' | 'income' | 'payment' | 'product' | 'bom'>('bank');
  const [bankToDelete, setBankToDelete] = useState<BankMaster | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyMaster | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryMaster | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeMaster | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseMaster | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<IncomeMaster | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentMaster | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [bomToDelete, setBomToDelete] = useState<BomMaster | null>(null);

  // Bank Handlers
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = (bk: BankMaster) => {
    setEditingBank(bk);
    setIsBankModalOpen(true);
  };

  const handleSaveBank = (savedBank: BankMaster) => {
    if (editingBank && onUpdateBank) {
      onUpdateBank(savedBank);
    } else if (onAddBank) {
      onAddBank(savedBank);
    }
  };

  const handleDeleteBankClick = (bk: BankMaster) => {
    setDeleteType('bank');
    setBankToDelete(bk);
    setIsDeleteModalOpen(true);
  };

  // Company Handlers
  const handleOpenAddCompany = () => {
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (comp: CompanyMaster) => {
    setEditingCompany(comp);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (savedCompany: CompanyMaster) => {
    if (editingCompany && onUpdateCompany) {
      onUpdateCompany(savedCompany);
    } else if (onAddCompany) {
      onAddCompany(savedCompany);
    }
  };

  const handleDeleteCompanyClick = (comp: CompanyMaster) => {
    setDeleteType('company');
    setCompanyToDelete(comp);
    setIsDeleteModalOpen(true);
  };

  // Category Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryMaster) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (savedCategory: CategoryMaster) => {
    if (editingCategory && onUpdateCategory) {
      onUpdateCategory(savedCategory);
    } else if (onAddCategory) {
      onAddCategory(savedCategory);
    }
  };

  const handleDeleteCategoryClick = (cat: CategoryMaster) => {
    setDeleteType('category');
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  // Vendor / Customer Handlers
  const handleOpenAddVendor = (type: 'Vendor' | 'Customer' = 'Vendor') => {
    setEditingCustomer(null);
    setVendorDefaultType(type);
    setIsVendorModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setVendorDefaultType(cust.type);
    setIsVendorModalOpen(true);
  };

  const handleSaveCustomer = (savedCust: Customer) => {
    if (editingCustomer && onUpdateCustomer) {
      onUpdateCustomer(savedCust);
    } else if (onAddCustomer) {
      onAddCustomer(savedCust);
    }
  };

  const handleDeleteCustomerClick = (cust: Customer) => {
    setDeleteType('customer');
    setCustomerToDelete(cust);
    setIsDeleteModalOpen(true);
  };

  const handleOpenFollowUp = (cust: Customer) => {
    setFollowUpCustomer(cust);
    setIsFollowUpModalOpen(true);
  };

  // Employee Handlers
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: EmployeeMaster) => {
    setEditingEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (savedEmployee: EmployeeMaster) => {
    if (editingEmployee && onUpdateStaff) {
      onUpdateStaff(savedEmployee);
    } else if (onAddStaff) {
      onAddStaff(savedEmployee);
    }
  };

  const handleDeleteEmployeeClick = (emp: EmployeeMaster) => {
    setDeleteType('employee');
    setEmployeeToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  // Expense Handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: ExpenseMaster) => {
    setEditingExpense(exp);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (savedExpense: ExpenseMaster) => {
    if (editingExpense && onUpdateExpense) {
      onUpdateExpense(savedExpense);
    } else if (onAddExpense) {
      onAddExpense(savedExpense);
    }
  };

  const handleDeleteExpenseClick = (exp: ExpenseMaster) => {
    setDeleteType('expense');
    setExpenseToDelete(exp);
    setIsDeleteModalOpen(true);
  };

  // Income Handlers
  const handleOpenAddIncome = () => {
    setEditingIncome(null);
    setIsIncomeModalOpen(true);
  };

  const handleOpenEditIncome = (inc: IncomeMaster) => {
    setEditingIncome(inc);
    setIsIncomeModalOpen(true);
  };

  const handleSaveIncome = (savedIncome: IncomeMaster) => {
    if (editingIncome && onUpdateIncome) {
      onUpdateIncome(savedIncome);
    } else if (onAddIncome) {
      onAddIncome(savedIncome);
    }
  };

  const handleDeleteIncomeClick = (inc: IncomeMaster) => {
    setDeleteType('income');
    setIncomeToDelete(inc);
    setIsDeleteModalOpen(true);
  };

  // Payment Handlers
  const handleOpenAddPayment = () => {
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (pay: PaymentMaster) => {
    setEditingPayment(pay);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (savedPayment: PaymentMaster) => {
    if (editingPayment && onUpdatePayment) {
      onUpdatePayment(savedPayment);
    } else if (onAddPayment) {
      onAddPayment(savedPayment);
    }
  };

  const handleDeletePaymentClick = (pay: PaymentMaster) => {
    setDeleteType('payment');
    setPaymentToDelete(pay);
    setIsDeleteModalOpen(true);
  };

  // Product Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (savedProduct: Product) => {
    if (editingProduct && onUpdateProduct) {
      onUpdateProduct(savedProduct);
    } else if (onAddProduct) {
      onAddProduct(savedProduct);
    }
  };

  const handleDeleteProductClick = (prod: Product) => {
    setDeleteType('product');
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  // BOM Handlers
  const handleOpenAddBom = () => {
    setEditingBom(null);
    setIsBomModalOpen(true);
  };

  const handleOpenEditBom = (bom: BomMaster) => {
    setEditingBom(bom);
    setIsBomModalOpen(true);
  };

  const handleSaveBom = (savedBom: BomMaster) => {
    if (editingBom && onUpdateBom) {
      onUpdateBom(savedBom);
    } else if (onAddBom) {
      onAddBom(savedBom);
    }
  };

  const handleDeleteBomClick = (bom: BomMaster) => {
    setDeleteType('bom');
    setBomToDelete(bom);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'bank' && bankToDelete && onDeleteBank) {
      onDeleteBank(bankToDelete.id);
      setBankToDelete(null);
    } else if (deleteType === 'company' && companyToDelete && onDeleteCompany) {
      onDeleteCompany(companyToDelete.id);
      setCompanyToDelete(null);
    } else if (deleteType === 'category' && categoryToDelete && onDeleteCategory) {
      onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } else if (deleteType === 'customer' && customerToDelete && onDeleteCustomer) {
      onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } else if (deleteType === 'employee' && employeeToDelete && onDeleteStaff) {
      onDeleteStaff(employeeToDelete.id);
      setEmployeeToDelete(null);
    } else if (deleteType === 'expense' && expenseToDelete && onDeleteExpense) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    } else if (deleteType === 'income' && incomeToDelete && onDeleteIncome) {
      onDeleteIncome(incomeToDelete.id);
      setIncomeToDelete(null);
    } else if (deleteType === 'payment' && paymentToDelete && onDeletePayment) {
      onDeletePayment(paymentToDelete.id);
      setPaymentToDelete(null);
    } else if (deleteType === 'product' && productToDelete && onDeleteProduct) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } else if (deleteType === 'bom' && bomToDelete && onDeleteBom) {
      onDeleteBom(bomToDelete.id);
      setBomToDelete(null);
    }
  };

  const handleExportBankCSV = () => {
    const headers = ['#', 'Bank Name', 'Address', 'Branch', 'IFSC Code', 'Account No', 'Book Type', 'Balance'];
    const rows = filteredBanks.map((b, i) => [
      i + 1,
      `"${b.accountName}"`,
      `"${b.address || b.branch || ''}"`,
      `"${b.branch}"`,
      `"${b.ifscCode}"`,
      `"${b.accountNumber}"`,
      `"${b.bookType || 'BANK BOOK'}"`,
      b.currentBalance
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OS-BOOKS_Bank_Details_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCompanyCSV = () => {
    const headers = ['#', 'Company Name', 'Trade Name', 'GSTIN', 'PAN', 'Phone', 'Address', 'City', 'State'];
    const rows = filteredCompanies.map((c, i) => [
      i + 1,
      `"${c.companyName}"`,
      `"${c.tradeName}"`,
      `"${c.gstin}"`,
      `"${c.pan}"`,
      `"${c.phone}"`,
      `"${c.address}"`,
      `"${c.city}"`,
      `"${c.state}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OS-BOOKS_Company_Details_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCustomerCSV = () => {
    const headers = ['#', 'Type', 'Party Name', 'Phone', 'Email', 'Account Group', 'GSTIN', 'City', 'State', 'Balance'];
    const rows = filteredCustomers.map((c, i) => [
      i + 1,
      `"${c.type}"`,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${c.accountGroup}"`,
      `"${c.gstin || ''}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      c.balance
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OS-BOOKS_Party_Details_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMergeBanks = () => {
    alert('Bank account merge wizard initialized. Select accounts to combine balances.');
  };

  // Filtered Banks
  const filteredBanks = banks.filter((bk) => {
    const matchesSearch = 
      bk.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bk.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bk.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bk.ifscCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bk.branch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      bankNameFilter === 'ALL' || 
      bk.bankName.toLowerCase().includes(bankNameFilter.toLowerCase()) ||
      (bk.bookType && bk.bookType.toLowerCase().includes(bankNameFilter.toLowerCase()));

    return matchesSearch && matchesFilter;
  });

  // Filtered Companies
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      companyTypeFilter === 'ALL' || 
      (companyTypeFilter === 'MAIN' && c.isMainBranch) ||
      (companyTypeFilter === 'BRANCH' && !c.isMainBranch);

    return matchesSearch && matchesFilter;
  });

  // Filtered Customers / Vendors
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      customerTypeFilter === 'ALL' || 
      c.type.toUpperCase() === customerTypeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">

      {/* MASTER DATA VIEWS */}

      {/* 1. BANK MASTER */}
      {activeSubTab === 'bank' && (
        <div className="space-y-4">
          
          {/* Top Teal Header Bar */}
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-teal-200" />
              Bank Details
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-teal-800/80 p-0.5 rounded-lg border border-teal-600/50">
                <button
                  onClick={() => setBankViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    bankViewMode === 'table' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" /> Table View
                </button>
                <button
                  onClick={() => setBankViewMode('cards')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    bankViewMode === 'cards' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards View
                </button>
              </div>

              <button
                onClick={handleMergeBanks}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <GitMerge className="h-3.5 w-3.5 text-teal-200" /> Merge
              </button>
              <button
                onClick={handleExportBankCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button
                onClick={handleOpenAddBank}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Create New
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <select
                value={bankNameFilter}
                onChange={(e) => setBankNameFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Records & Book Types</option>
                <optgroup label="Popular Institutions">
                  <option value="HDFC">HDFC Bank</option>
                  <option value="State Bank">State Bank of India</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="CASH">Cash Account</option>
                </optgroup>
                <optgroup label="Book Types">
                  {bookTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for Bank Name, Account No, IFSC..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* TABLE VIEW */}
          {bankViewMode === 'table' && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">#</th>
                    <th className="px-3 py-2.5">Bank Name</th>
                    <th className="px-3 py-2.5">Address</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5 font-mono">IFSC Code</th>
                    <th className="px-3 py-2.5 font-mono">Account No</th>
                    <th className="px-3 py-2.5">Book Type</th>
                    <th className="px-3 py-2.5 text-right font-mono">Balance</th>
                    <th className="px-3 py-2.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredBanks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                        No Bank Master records found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBanks.map((bk, idx) => (
                      <tr key={bk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {bk.accountName}
                          {bk.upiId && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal font-mono">
                              UPI: {bk.upiId}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{bk.address || bk.branch || '—'}</td>
                        <td className="px-3 py-2.5 font-medium">{bk.branch || '—'}</td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">{bk.ifscCode || 'N/A'}</td>
                        <td className="px-3 py-2.5 font-mono">{bk.accountNumber || '0'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            bk.bookType === 'CASH BOOK'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              : bk.bookType === 'NON-PAYMENT BOOK'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {bk.bookType || 'BANK BOOK'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                          {bk.currentBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setQrModalBank(bk)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all cursor-pointer"
                              title="Generate & View QR Code & Barcode"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditBank(bk)}
                              className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
                              title="Edit Bank Details"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBankClick(bk)}
                              className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                              title="Delete Bank Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CARDS VIEW */}
          {bankViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBanks.map((bk) => (
                <div key={bk.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{bk.accountName}</h3>
                      <div className="text-xs text-slate-500">{bk.bankName} • {bk.branch}</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      {bk.bookType || 'Bank Master A/c'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-mono space-y-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div>Account No: <strong className="text-slate-800 dark:text-slate-200">{bk.accountNumber}</strong></div>
                    <div>IFSC Code: <strong className="text-slate-800 dark:text-slate-200">{bk.ifscCode}</strong></div>
                    {bk.upiId && <div className="text-emerald-600 dark:text-emerald-400 font-bold">UPI ID: {bk.upiId}</div>}
                    {bk.address && <div className="text-slate-400 font-sans text-[11px]">Address: {bk.address}</div>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Current Ledger Balance</span>
                      <span className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                        ₹{bk.currentBalance.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQrModalBank(bk)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-cyan-300 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR / Barcode
                      </button>
                      <button
                        onClick={() => handleOpenEditBank(bk)}
                        className="p-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-500 transition-all cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBankClick(bk)}
                        className="p-1.5 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* 2. COMPANY MASTER */}
      {activeSubTab === 'company' && (
        <div className="space-y-4">
          
          {/* Top Teal Header Bar */}
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-200" />
              Company & Branch Details
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-teal-800/80 p-0.5 rounded-lg border border-teal-600/50">
                <button
                  onClick={() => setCompanyViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    companyViewMode === 'table' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" /> Table View
                </button>
                <button
                  onClick={() => setCompanyViewMode('cards')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    companyViewMode === 'cards' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards View
                </button>
              </div>

              <button
                onClick={handleExportCompanyCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>

              <button
                onClick={handleOpenAddCompany}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Create New Branch / Company
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <select
                value={companyTypeFilter}
                onChange={(e) => setCompanyTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Company Branches</option>
                <option value="MAIN">Main HQ Only</option>
                <option value="BRANCH">Branch Offices Only</option>
              </select>
            </div>

            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for Company Name, Trade Name, GSTIN..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* TABLE VIEW */}
          {companyViewMode === 'table' && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">#</th>
                    <th className="px-3 py-2.5">Company / Firm Name</th>
                    <th className="px-3 py-2.5">Trade Name</th>
                    <th className="px-3 py-2.5 font-mono">GSTIN / PAN</th>
                    <th className="px-3 py-2.5">Address & City</th>
                    <th className="px-3 py-2.5">Phone & Email</th>
                    <th className="px-3 py-2.5">Branch Status</th>
                    <th className="px-3 py-2.5 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                        No Company Master records found.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp, idx) => (
                      <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">
                          {comp.companyName}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">{comp.tradeName}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {comp.gstin}
                          <div className="text-[10px] font-normal text-slate-400">PAN: {comp.pan}</div>
                        </td>
                        <td className="px-3 py-2.5">{comp.address}, {comp.city}, {comp.state}</td>
                        <td className="px-3 py-2.5 font-mono">{comp.phone}</td>
                        <td className="px-3 py-2.5">
                          {comp.isMainBranch ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Indore HQ (Main)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Branch Office
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditCompany(comp)}
                              className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
                              title="Edit Branch"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompanyClick(comp)}
                              className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                              title="Delete Branch"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CARDS VIEW */}
          {companyViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCompanies.map((comp) => (
                <div key={comp.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{comp.companyName}</h3>
                      <div className="text-xs text-slate-500">Trade: {comp.tradeName}</div>
                    </div>
                    {comp.isMainBranch ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Indore HQ (Main)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Branch Office
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div>GSTIN: <strong className="text-emerald-600 dark:text-emerald-400">{comp.gstin}</strong> (State Code: {comp.stateCode})</div>
                    <div>PAN: {comp.pan} | Phone: {comp.phone}</div>
                    <div>Address: {comp.address}, {comp.city}, {comp.state} - {comp.pincode}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditCompany(comp)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Branch
                    </button>
                    <button
                      onClick={() => handleDeleteCompanyClick(comp)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* 3. CUSTOMER MASTER */}
      {activeSubTab === 'customer' && (
        <div className="space-y-4">
          
          {/* Top Teal Header Bar */}
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-200" />
              Customer Master Details
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-teal-800/80 p-0.5 rounded-lg border border-teal-600/50">
                <button
                  onClick={() => setCustomerViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    customerViewMode === 'table' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" /> Table View
                </button>
                <button
                  onClick={() => setCustomerViewMode('cards')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    customerViewMode === 'cards' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards View
                </button>
              </div>

              <button
                onClick={handleExportCustomerCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>

              <button
                onClick={() => handleOpenAddVendor('Customer')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Add Customer
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl flex items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for Customer Name, GSTIN, Phone, City..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* TABLE VIEW */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Customer Name</th>
                  <th className="px-3 py-2.5 font-mono">Mobile & Email</th>
                  <th className="px-3 py-2.5">Account Group</th>
                  <th className="px-3 py-2.5 font-mono">GSTIN</th>
                  <th className="px-3 py-2.5">City & State</th>
                  <th className="px-3 py-2.5 font-mono">Credit Limit</th>
                  <th className="px-3 py-2.5 text-right font-mono">Balance</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCustomers
                  .filter((c) => c.type === 'Customer')
                  .map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        <div>{c.phone}</div>
                        <div className="text-slate-400 text-[10px]">{c.email}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">{c.accountGroup}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.gstin || 'Unregistered'}
                      </td>
                      <td className="px-3 py-2.5">{c.city}, {c.state}</td>
                      <td className="px-3 py-2.5 font-mono font-bold">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{Math.abs(c.balance).toLocaleString('en-IN')} {c.balance > 0 ? '(Dr)' : '(Cr)'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenFollowUp(c)}
                            className="p-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer"
                            title="Add Follow-up"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditCustomer(c)}
                            className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomerClick(c)}
                            className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                            title="Delete Customer Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VENDOR MASTER - DEDICATED VENDOR VIEW */}
      {activeSubTab === 'vendor' && (
        <div className="space-y-4">
          
          {/* Top Teal Header Bar */}
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-200" />
              Vendor Master (Supplier) Details
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-teal-800/80 p-0.5 rounded-lg border border-teal-600/50">
                <button
                  onClick={() => setCustomerViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    customerViewMode === 'table' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" /> Table View
                </button>
                <button
                  onClick={() => setCustomerViewMode('cards')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    customerViewMode === 'cards' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards View
                </button>
              </div>

              <button
                onClick={handleExportCustomerCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>

              <button
                onClick={() => handleOpenAddVendor('Vendor')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Add Vendor (Supplier)
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl flex items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for Vendor Name, GSTIN, Phone, City..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* TABLE VIEW */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Vendor / Supplier Name</th>
                  <th className="px-3 py-2.5 font-mono">Mobile & Email</th>
                  <th className="px-3 py-2.5">Account Group</th>
                  <th className="px-3 py-2.5 font-mono">GSTIN</th>
                  <th className="px-3 py-2.5">City & State</th>
                  <th className="px-3 py-2.5 font-mono">Credit Limit</th>
                  <th className="px-3 py-2.5 text-right font-mono">Balance</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCustomers
                  .filter((c) => c.type === 'Vendor')
                  .map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        <div>{c.phone}</div>
                        <div className="text-slate-400 text-[10px]">{c.email}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">{c.accountGroup}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.gstin || 'Unregistered'}
                      </td>
                      <td className="px-3 py-2.5">{c.city}, {c.state}</td>
                      <td className="px-3 py-2.5 font-mono font-bold">₹{c.creditLimit.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{Math.abs(c.balance).toLocaleString('en-IN')} {c.balance > 0 ? '(Dr)' : '(Cr)'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditCustomer(c)}
                            className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
                            title="Edit Vendor Master"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomerClick(c)}
                            className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                            title="Delete Vendor Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CATEGORY MASTER */}
      {activeSubTab === 'category' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-200" />
              Category Details
            </h3>
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Create New Category
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Category Name</th>
                  <th className="px-3 py-2.5 font-mono">Default HSN Code</th>
                  <th className="px-3 py-2.5">Linked Items Count</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">{cat.name}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-emerald-600">{cat.hsnDefault || '8471'}</td>
                    <td className="px-3 py-2.5 font-bold">{cat.itemCount} Items</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEditCategory(cat)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer" title="Edit Category"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteCategoryClick(cat)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer" title="Delete Category"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. EMPLOYEE MASTER */}
      {activeSubTab === 'employee' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-200" />
              Employee & Staff Details
            </h3>
            <button
              onClick={handleOpenAddEmployee}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add Employee
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Employee Name</th>
                  <th className="px-3 py-2.5">Designation</th>
                  <th className="px-3 py-2.5">Phone & City</th>
                  <th className="px-3 py-2.5">Joining Date</th>
                  <th className="px-3 py-2.5 text-right">Paid Holiday</th>
                  <th className="px-3 py-2.5 font-mono text-right">Salary</th>
                  <th className="px-3 py-2.5 text-center">Balance</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {staff.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{st.name}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">{st.designation || st.role}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div>{st.phone}</div>
                      <div className="text-slate-400 text-[10px]">{st.city || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5">{st.joiningDate || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">{st.paidHoliday || 0}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      ₹{st.salary.toLocaleString('en-IN')}
                      <span className="text-slate-400 font-normal">/{st.salaryType === 'Day' ? 'day' : 'mo'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold">0</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditEmployee(st)}
                          className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployeeClick(st)}
                          className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. EXPENSE MASTER */}
      {activeSubTab === 'expense' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-200" />
              Expense Details
            </h3>
            <button
              onClick={handleOpenAddExpense}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add Expense Category
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Expense Name</th>
                  <th className="px-3 py-2.5">Expense Head</th>
                  <th className="px-3 py-2.5">Expense Type</th>
                  <th className="px-3 py-2.5">GST Rate</th>
                  <th className="px-3 py-2.5 text-right font-mono">Monthly Budget</th>
                  <th className="px-3 py-2.5 text-center">Active</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {expenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{exp.categoryName}</td>
                    <td className="px-3 py-2.5 font-semibold">{exp.expenseHead || '-'}</td>
                    <td className="px-3 py-2.5 font-semibold">{exp.expenseType || '-'}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">{exp.gstRate}%</td>
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold">₹{exp.monthlyBudget.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${exp.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {exp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEditExpense(exp)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteExpenseClick(exp)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. INCOME MASTER */}
      {activeSubTab === 'income' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-200" />
              Income Source Details
            </h3>
            <button
              onClick={handleOpenAddIncome}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add Income Source
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Source Name</th>
                  <th className="px-3 py-2.5 font-mono">SAC Code</th>
                  <th className="px-3 py-2.5">GST Rate</th>
                  <th className="px-3 py-2.5 text-right font-mono">YTD Revenue Earned</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {incomes.map((inc, idx) => (
                  <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{inc.sourceName}</td>
                    <td className="px-3 py-2.5 font-mono font-bold">{inc.hsnSac}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">{inc.gstRate}%</td>
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-600">₹{inc.ytdEarned.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEditIncome(inc)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteIncomeClick(inc)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. PAYMENT MASTER */}
      {activeSubTab === 'payment' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-teal-200" />
              Payment Mode Details
            </h3>
            <button
              onClick={handleOpenAddPayment}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add Payment Mode
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Payment Mode Name</th>
                  <th className="px-3 py-2.5">Linked Account</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{p.modeName}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">{p.linkedAccount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEditPayment(p)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeletePaymentClick(p)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. PRODUCT MASTER */}
      {activeSubTab === 'product' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-teal-200" />
              Product Catalog Details
            </h3>
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add New Product
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Item Name & SKU</th>
                  <th className="px-3 py-2.5">Category & Brand</th>
                  <th className="px-3 py-2.5 font-mono">HSN Code</th>
                  <th className="px-3 py-2.5 font-mono">Unit</th>
                  <th className="px-3 py-2.5 font-mono">Purchase Price</th>
                  <th className="px-3 py-2.5 font-mono">Selling Price</th>
                  <th className="px-3 py-2.5">GST Rate</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {products
                  .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.category}</div>
                        <div className="text-[11px] text-emerald-600 font-bold">{p.brand || 'Generic'}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold">{p.hsnCode}</td>
                      <td className="px-3 py-2.5 font-bold">{p.unit}</td>
                      <td className="px-3 py-2.5 font-mono">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{p.salePrice.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600">{p.taxRate}%</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProductClick(p)}
                            className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. UNIT CATALOG MASTER */}
      {activeSubTab === 'unit' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Ruler className="h-5 w-5 text-teal-200" />
              Unit Catalog Details
            </h3>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer">
              <Plus className="h-4 w-4" /> + Add Unit
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Unit Name</th>
                  <th className="px-3 py-2.5 font-mono">Code</th>
                  <th className="px-3 py-2.5">Symbol</th>
                  <th className="px-3 py-2.5">Decimal Option</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {units.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{u.name}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-emerald-600">{u.code}</td>
                    <td className="px-3 py-2.5 font-bold">{u.symbol}</td>
                    <td className="px-3 py-2.5">{u.isDecimalAllowed ? 'Decimal Allowed' : 'Whole Numbers Only'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NARRATION MASTER */}
      {activeSubTab === 'narration' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-teal-200" />
              Narration Master
            </h3>
            <button
              onClick={() => setNarrationForm({ id: null, text: '' })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Narration
            </button>
          </div>

          {narrationForm && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3">
              <input
                type="text"
                autoFocus
                value={narrationForm.text}
                onChange={(e) => setNarrationForm({ ...narrationForm, text: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNarration()}
                placeholder="Enter narration text"
                className="flex-1 py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleSaveNarration}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md"
              >
                Save
              </button>
              <button
                onClick={() => setNarrationForm(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Narration Text</th>
                  <th className="px-3 py-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {narrations.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">No narrations added yet.</td></tr>
                ) : (
                  narrations.map((n, idx) => (
                    <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{n.text}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setNarrationForm({ id: n.id, text: n.text })}
                            className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"
                            title="Edit Narration"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setNarrationDeleteId(n.id)}
                            className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                            title="Delete Narration"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {narrationDeleteId && (
            <ConfirmDeleteModal
              isOpen={!!narrationDeleteId}
              title="Delete Narration Confirmation"
              itemName={narrations.find((n) => n.id === narrationDeleteId)?.text}
              itemType="Narration"
              onConfirm={() => {
                onDeleteNarration?.(narrationDeleteId);
                setNarrationDeleteId(null);
              }}
              onClose={() => setNarrationDeleteId(null)}
            />
          )}
        </div>
      )}

      {/* 12. BOM MASTER (Bill of Materials) */}
      {activeSubTab === 'bom' && (
        <div className="space-y-4">
          <div className="bg-teal-700 dark:bg-teal-900 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-teal-200" />
              BOM Master Details (Bill of Materials)
            </h3>
            <button
              onClick={handleOpenAddBom}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Create BOM Recipe
            </button>
          </div>

          <div className="space-y-4">
            {boms.map((bom) => (
              <div key={bom.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{bom.finishedGoodName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bom.active === false ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                        {bom.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">BOM Code: {bom.bomCode}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Assembly Cost:</div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{bom.totalCost.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditBom(bom)} className="p-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteBomClick(bom)} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">Raw Material Components:</div>
                  <div className="space-y-1.5">
                    {bom.components.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono">
                        <div className="flex items-center gap-2">
                          {comp.image ? (
                            <img src={comp.image} alt="" className="h-6 w-6 object-cover rounded border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="h-6 w-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400">
                              <Package className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className="text-slate-700 dark:text-slate-300">
                            {comp.productName} ({comp.quantity} {comp.unit})
                            {comp.productCode && <span className="text-slate-400"> · Code: {comp.productCode}</span>}
                          </span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">₹{(comp.quantity * (comp.salePrice ?? comp.unitCost)).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-mono pt-1 text-slate-500 border-t border-slate-200 dark:border-slate-700">
                      <span>• Assembly Labor Charges</span>
                      <span>₹{bom.laborCost.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Bank Master Modal */}
      <AddEditBankModal
        isOpen={isBankModalOpen}
        bankToEdit={editingBank}
        availableBookTypes={bookTypes}
        onAddBookType={onAddBookType}
        onClose={() => setIsBankModalOpen(false)}
        onSave={handleSaveBank}
      />

      {/* Add / Edit Company Master Modal */}
      <AddEditCompanyModal
        isOpen={isCompanyModalOpen}
        companyToEdit={editingCompany}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={handleSaveCompany}
      />

      {/* Add / Edit Category Master Modal */}
      <AddEditCategoryModal
        isOpen={isCategoryModalOpen}
        categoryToEdit={editingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />

      {/* Add / Edit Vendor Master Modal */}
      <AddEditVendorModal
        isOpen={isVendorModalOpen}
        customerToEdit={editingCustomer}
        defaultType={vendorDefaultType}
        products={products}
        onClose={() => setIsVendorModalOpen(false)}
        onSave={handleSaveCustomer}
      />

      {/* Customer Follow-up Modal */}
      <CustomerFollowUpModal
        isOpen={isFollowUpModalOpen}
        customer={followUpCustomer}
        followUps={followUps.filter((f) => f.customerId === followUpCustomer?.id)}
        onClose={() => setIsFollowUpModalOpen(false)}
        onAddFollowUp={(f) => onAddFollowUp && onAddFollowUp(f)}
      />

      {/* Add / Edit Employee Master Modal */}
      <AddEditEmployeeModal
        isOpen={isEmployeeModalOpen}
        employeeToEdit={editingEmployee}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
      />

      {/* Add / Edit Expense Master Modal */}
      <AddEditExpenseModal
        isOpen={isExpenseModalOpen}
        expenseToEdit={editingExpense}
        expenseHeads={Array.from(new Set(expenses.map((e) => e.expenseHead).filter(Boolean)))}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
      />

      {/* Add / Edit Income Master Modal */}
      <AddEditIncomeModal
        isOpen={isIncomeModalOpen}
        incomeToEdit={editingIncome}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleSaveIncome}
      />

      {/* Add / Edit Payment Master Modal */}
      <AddEditPaymentModal
        isOpen={isPaymentModalOpen}
        paymentToEdit={editingPayment}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
      />

      {/* Add / Edit Product Master Modal */}
      <AddEditProductModal
        isOpen={isProductModalOpen}
        productToEdit={editingProduct}
        categories={categories}
        brands={brands}
        units={units}
        products={products}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
      />

      {/* Add / Edit BOM Master Modal */}
      <AddEditBomModal
        isOpen={isBomModalOpen}
        bomToEdit={editingBom}
        products={products}
        onClose={() => setIsBomModalOpen(false)}
        onSave={handleSaveBom}
      />

      {/* Bank QR Code & Barcode Generator Modal */}
      <BankQrBarcodeModal
        bank={qrModalBank}
        onClose={() => setQrModalBank(null)}
      />

      {/* Delete Confirmation Alert Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title={`Delete ${deleteType === 'bank' ? 'Bank Master' : deleteType === 'company' ? 'Company Master' : deleteType === 'category' ? 'Category Master' : deleteType === 'employee' ? 'Employee Master' : deleteType === 'expense' ? 'Expense Master' : deleteType === 'income' ? 'Income Master' : deleteType === 'payment' ? 'Payment Master' : deleteType === 'product' ? 'Product Master' : deleteType === 'bom' ? 'BOM Master' : 'Vendor / Customer'} Record`}
        itemName={deleteType === 'bank' ? bankToDelete?.accountName : deleteType === 'company' ? companyToDelete?.companyName : deleteType === 'category' ? categoryToDelete?.name : deleteType === 'employee' ? employeeToDelete?.name : deleteType === 'expense' ? expenseToDelete?.categoryName : deleteType === 'income' ? incomeToDelete?.sourceName : deleteType === 'payment' ? paymentToDelete?.modeName : deleteType === 'product' ? productToDelete?.name : deleteType === 'bom' ? bomToDelete?.finishedGoodName : customerToDelete?.name}
        itemType={deleteType === 'bank' ? 'Bank Master Account' : deleteType === 'company' ? 'Company Branch' : deleteType === 'category' ? 'Category Master Record' : deleteType === 'employee' ? 'Employee Master Record' : deleteType === 'expense' ? 'Expense Master Record' : deleteType === 'income' ? 'Income Master Record' : deleteType === 'payment' ? 'Payment Master Record' : deleteType === 'product' ? 'Product Master Record' : deleteType === 'bom' ? 'BOM Master Record' : 'Vendor / Customer Account'}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
};
