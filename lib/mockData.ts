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
  ExpenseMaster,
  IncomeMaster,
  PaymentMaster,
  BomMaster,
  CompanyMaster,
  PurchaseOrder,
  PurchaseInvoice,
  ReturnDocument,
  SaleOrder,
  DeliveryChallan,
  Quotation,
  StockAdjustment,
  BranchStockTransfer,
  LedgerEntry,
  EmployeeAttendance,
  AuditLogEntry
} from './types';

export const INITIAL_COMPANIES: CompanyMaster[] = [
  {
    id: 'comp-1',
    companyName: 'PRAMUKH INDANE GAS AGENCY',
    tradeName: 'Pramukh Indane Main Agency',
    gstin: '24AAAFP1234F1Z5',
    pan: 'AAAFP1234F',
    phone: '+91 98765 43210',
    email: 'billing@pramukhindane.com',
    address: 'Indane Gas Godown Road, Main Market',
    city: 'Indore',
    state: 'Madhya Pradesh',
    stateCode: '23',
    pincode: '452001',
    isMainBranch: true,
  },
  {
    id: 'comp-2',
    companyName: 'PRAMUKH INDANE - Regional Depot',
    tradeName: 'Pramukh Indane Depot',
    gstin: '23AAAFP1234F2Z4',
    pan: 'AAAFP1234F',
    phone: '+91 98765 43211',
    email: 'depot@pramukhindane.com',
    address: '45 Industrial Area, Gas Plant Zone',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    stateCode: '23',
    pincode: '462011',
    isMainBranch: false,
  },
];

export const INITIAL_BRANCH_TRANSFERS: BranchStockTransfer[] = [
  { id: 'stk-1', transferNumber: 'STIN-2026-004', type: 'Stock In', fromBranch: 'Bhopal Branch Warehouse', toBranch: 'Indore HQ Store', date: '2026-07-26', itemsCount: 2, totalQty: 10, status: 'Received' },
  { id: 'stk-2', transferNumber: 'STOUT-2026-009', type: 'Stock Out', fromBranch: 'Indore HQ Store', toBranch: 'Bhopal Branch Warehouse', date: '2026-07-27', itemsCount: 4, totalQty: 25, status: 'Dispatched' },
];

export const INITIAL_CUSTOMER_LEDGER: LedgerEntry[] = [
  { id: 'led-1', date: '2026-07-01', voucherNumber: 'OB-2026', accountName: 'Sharma Electronics & Superstore', particulars: 'Opening Balance (Dr)', debit: 26049, credit: 0, balance: 26049 },
  { id: 'led-2', date: '2026-07-27', voucherNumber: 'OS-2026-0891', accountName: 'Sharma Electronics & Superstore', particulars: 'Sales Tax Invoice #0891', debit: 19751, credit: 0, balance: 45800 },
  { id: 'led-3', date: '2026-07-27', voucherNumber: 'REC-UPI-009', accountName: 'Sharma Electronics & Superstore', particulars: 'UPI Receipt (SBI Current A/c)', debit: 0, credit: 19751, balance: 26049 },
];

export const INITIAL_COMPANY_LEDGER: LedgerEntry[] = [
  { id: 'cled-1', date: '2026-07-01', voucherNumber: 'JNL-001', accountName: 'PRAMUKH INDANE GAS AGENCY', particulars: 'Capital Opening Reserve', debit: 0, credit: 5000000, balance: 5000000 },
  { id: 'cled-2', date: '2026-07-27', voucherNumber: 'OS-2026-0891', accountName: 'PRAMUKH INDANE GAS AGENCY', particulars: 'Daily Sales Realized', debit: 0, credit: 19751, balance: 5019751 },
];

export const INITIAL_BANK_BOOK: LedgerEntry[] = [
  { id: 'bb-1', date: '2026-07-01', voucherNumber: 'OB-BANK', accountName: 'SBI Current A/c (40982310055)', particulars: 'Opening Bank Balance', debit: 323139, credit: 0, balance: 323139 },
  { id: 'bb-2', date: '2026-07-27', voucherNumber: 'REC-UPI-009', accountName: 'SBI Current A/c (40982310055)', particulars: 'UPI Payment Recd - Invoice #0891', debit: 19751, credit: 0, balance: 342890 },
];

export const INITIAL_EMPLOYEE_LEDGER: LedgerEntry[] = [
  { id: 'emp-1', date: '2026-07-05', voucherNumber: 'SAL-JUL-01', accountName: 'Rahul Sharma (Salesman)', particulars: 'Monthly Base Salary Credit', debit: 0, credit: 22000, balance: 22000 },
  { id: 'emp-2', date: '2026-07-05', voucherNumber: 'BANK-PAY-88', accountName: 'Rahul Sharma (Salesman)', particulars: 'Bank Transfer Salary Disbursement', debit: 22000, credit: 0, balance: 0 },
];

export const INITIAL_EXPENSES_LEDGER: LedgerEntry[] = [
  { id: 'expled-1', date: '2026-07-02', voucherNumber: 'EXP-RNT-07', accountName: 'Shop Rent Expense', particulars: 'Indore Store Monthly Rent', debit: 35000, credit: 0, balance: 35000 },
  { id: 'expled-2', date: '2026-07-10', voucherNumber: 'EXP-ELEC-07', accountName: 'Electricity & Utility Bills', particulars: 'MPPKVVCL Power Bill', debit: 8400, credit: 0, balance: 43400 },
];

export const INITIAL_INCOMES_LEDGER: LedgerEntry[] = [
  { id: 'incled-1', date: '2026-07-27', voucherNumber: 'INC-REV-99', accountName: 'Retail Product Sales Income', particulars: 'Net Sales Invoices Turnover', debit: 0, credit: 56174, balance: 56174 },
];

export const INITIAL_PAYMENT_LEDGER: LedgerEntry[] = [
  { id: 'payled-1', date: '2026-07-27', voucherNumber: 'PAY-REG-01', accountName: 'UPI Counter Gateway', particulars: 'Total UPI Direct Settlements', debit: 19751, credit: 0, balance: 19751 },
];

export const INITIAL_ATTENDANCE: EmployeeAttendance[] = [
  { id: 'att-1', employeeId: 'staff-1', employeeName: 'Shiv Kumar (Master Admin)', date: '2026-07-27', checkIn: '09:30 AM', checkOut: '07:30 PM', status: 'Present', overtimeHours: 1.5 },
  { id: 'att-2', employeeId: 'staff-2', employeeName: 'Rahul Sharma (Salesman)', date: '2026-07-27', checkIn: '09:45 AM', checkOut: '07:15 PM', status: 'Present', overtimeHours: 0.5 },
  { id: 'att-3', employeeId: 'staff-3', employeeName: 'Priya Verma (Accountant)', date: '2026-07-27', checkIn: '10:00 AM', checkOut: '06:30 PM', status: 'Present', overtimeHours: 0 },
  { id: 'att-4', employeeId: 'staff-4', employeeName: 'Amit Patel (Billing Exec)', date: '2026-07-27', checkIn: '09:30 AM', checkOut: '08:00 PM', status: 'Present', overtimeHours: 2.0 },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'po-101', poNumber: 'PO-2026-0012', vendorName: 'National Distributors Pvt Ltd', vendorGstin: '23AAACN9988K1Z9', date: '2026-07-25', expectedDate: '2026-08-02', itemsCount: 4, totalAmount: 85400, status: 'Issued' },
  { id: 'po-102', poNumber: 'PO-2026-0011', vendorName: 'Gujarat Tech Supplies Ltd', vendorGstin: '24AAACG1122E1Z4', date: '2026-07-20', expectedDate: '2026-07-27', itemsCount: 2, totalAmount: 42000, status: 'Received' },
];

export const INITIAL_PURCHASES: PurchaseInvoice[] = [
  { id: 'pur-201', purchaseNumber: 'PUR-2026-0089', vendorInvoiceNumber: 'ND/26-27/4491', vendorName: 'National Distributors Pvt Ltd', vendorGstin: '23AAACN9988K1Z9', date: '2026-07-24', subTotal: 54400, itcEligibleAmount: 9792, grandTotal: 64192, status: 'Pending' },
  { id: 'pur-202', purchaseNumber: 'PUR-2026-0088', vendorInvoiceNumber: 'GT/8841', vendorName: 'Gujarat Tech Supplies Ltd', vendorGstin: '24AAACG1122E1Z4', date: '2026-07-18', subTotal: 32500, itcEligibleAmount: 5850, grandTotal: 38350, status: 'Paid' },
];

export const INITIAL_PURCHASE_RETURNS: ReturnDocument[] = [
  { id: 'pret-1', docNumber: 'DN-2026-004', originalInvNumber: 'ND/26-27/4491', partyName: 'National Distributors Pvt Ltd', date: '2026-07-26', returnReason: 'Damaged Goods', amount: 4800, status: 'Processed' },
];

export const INITIAL_SALE_ORDERS: SaleOrder[] = [
  { id: 'so-301', soNumber: 'SO-2026-0155', customerName: 'Sharma Electronics & Superstore', date: '2026-07-26', validUntil: '2026-08-05', totalAmount: 28500, status: 'Pending' },
  { id: 'so-302', soNumber: 'SO-2026-0154', customerName: 'Rajput Wholesale Traders', date: '2026-07-22', validUntil: '2026-07-30', totalAmount: 49900, status: 'Converted to Bill' },
];

export const INITIAL_SALES_RETURNS: ReturnDocument[] = [
  { id: 'sret-1', docNumber: 'CN-2026-011', originalInvNumber: 'OS-2026-0891', partyName: 'Sharma Electronics & Superstore', date: '2026-07-27', returnReason: 'Wrong Item', amount: 2499, status: 'Processed' },
];

export const INITIAL_CHALLANS: DeliveryChallan[] = [
  { id: 'chl-1', challanNumber: 'DC-2026-092', customerName: 'Sharma Electronics & Superstore', vehicleNumber: 'MP 09 AB 1234', dispatchDate: '2026-07-27', itemsCount: 3, totalQty: 15, status: 'Dispatched' },
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  { id: 'qt-1', quoteNumber: 'QT-2026-0081', customerName: 'Malwa Retail Mart & General Store', customerPhone: '+91 98270 99887', date: '2026-07-26', validDays: 15, grandTotal: 34900, status: 'Sent' },
];

export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [
  { id: 'adj-1', adjustCode: 'ADJ-2026-033', date: '2026-07-25', productName: 'Thermal Paper Roll 80mm x 50m', adjustmentType: 'Deduction (-)', qty: 2, reason: 'Damage/Breakage', approvedBy: 'Shiv Kumar (Admin)' },
];

export const INITIAL_UNITS: UnitMaster[] = [
  { id: 'unit-1', code: 'PCS', name: 'Pieces', symbol: 'Pcs', isDecimalAllowed: false },
  { id: 'unit-2', code: 'PKT', name: 'Packet', symbol: 'Pkt', isDecimalAllowed: false },
  { id: 'unit-3', code: 'BOX', name: 'Box', symbol: 'Box', isDecimalAllowed: false },
  { id: 'unit-4', code: 'KG', name: 'Kilogram', symbol: 'Kg', isDecimalAllowed: true },
  { id: 'unit-5', code: 'G', name: 'Gram', symbol: 'g', isDecimalAllowed: true },
  { id: 'unit-6', code: 'LTR', name: 'Litre', symbol: 'Ltr', isDecimalAllowed: true },
  { id: 'unit-7', code: 'MTR', name: 'Meter', symbol: 'Mtr', isDecimalAllowed: true },
  { id: 'unit-8', code: 'DOZ', name: 'Dozen', symbol: 'Doz', isDecimalAllowed: false },
  { id: 'unit-9', code: 'SET', name: 'Set', symbol: 'Set', isDecimalAllowed: false },
  { id: 'unit-10', code: 'BAG', name: 'Bag', symbol: 'Bag', isDecimalAllowed: false },
];

export const INITIAL_CATEGORIES: CategoryMaster[] = [
  { id: 'cat-1', name: 'POS Hardware', hsnDefault: '84719000', itemCount: 12, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-2', name: 'POS Consumables', hsnDefault: '48119090', itemCount: 8, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-3', name: 'Computer Peripherals', hsnDefault: '84716060', itemCount: 15, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-4', name: 'Networking Equipment', hsnDefault: '85444999', itemCount: 9, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-5', name: 'Monitors & Display', hsnDefault: '85285200', itemCount: 6, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-6', name: 'Barcode & Thermal Printers', hsnDefault: '84433210', itemCount: 7, active: true, purchaseDiscount: 0, saleDiscount: 0 },
  { id: 'cat-7', name: 'Office Supplies & Stationeries', hsnDefault: '48201000', itemCount: 20, active: true, purchaseDiscount: 0, saleDiscount: 0 },
];

export const INITIAL_BRANDS: BrandMaster[] = [
  { id: 'brand-1', name: 'Epson', manufacturer: 'Seiko Epson Corporation' },
  { id: 'brand-2', name: 'Honeywell', manufacturer: 'Honeywell International Inc.' },
  { id: 'brand-3', name: 'Logitech', manufacturer: 'Logitech International S.A.' },
  { id: 'brand-4', name: 'TVS Electronics', manufacturer: 'TVS Electronics Ltd India' },
  { id: 'brand-5', name: 'Dell', manufacturer: 'Dell Technologies India' },
  { id: 'brand-6', name: 'D-Link', manufacturer: 'D-Link India Ltd' },
  { id: 'brand-7', name: 'Zebra Technologies', manufacturer: 'Zebra Technologies Corp' },
  { id: 'brand-8', name: 'HP', manufacturer: 'HP India Sales Pvt Ltd' },
];

export const INITIAL_TAXES: TaxMaster[] = [
  { id: 'tax-0', name: 'GST @ 0% (Exempt)', rate: 0, cgst: 0, sgst: 0, igst: 0 },
  { id: 'tax-5', name: 'GST @ 5%', rate: 5, cgst: 2.5, sgst: 2.5, igst: 5 },
  { id: 'tax-12', name: 'GST @ 12%', rate: 12, cgst: 6, sgst: 6, igst: 12 },
  { id: 'tax-18', name: 'GST @ 18%', rate: 18, cgst: 9, sgst: 9, igst: 18 },
  { id: 'tax-28', name: 'GST @ 28%', rate: 28, cgst: 14, sgst: 14, igst: 28 },
];

export const INITIAL_NARRATIONS: NarrationMaster[] = [
  { id: 'narr-1', text: 'Cash received against retail counter bill' },
  { id: 'narr-2', text: 'Card payment received against retail counter bill' },
  { id: 'narr-3', text: 'Payment received via bank transfer' },
  { id: 'narr-4', text: 'Payment received via UPI/QR' },
  { id: 'narr-5', text: 'Cheque received, deposited for clearance' },
  { id: 'narr-6', text: 'Balance adjusted against party ledger' },
  { id: 'narr-7', text: 'Advance payment received' },
  { id: 'narr-8', text: 'Full and final settlement' },
];

export const INITIAL_BANKS: BankMaster[] = [
  {
    id: 'bank-1',
    accountName: 'Cash Account',
    bankName: 'Cash In Hand',
    accountNumber: 'CASH-COUNTER-01',
    ifscCode: 'N/A',
    branch: 'Indore Store Counter 1',
    address: 'Indore Store Counter 1, MP Road',
    openingBalance: 15000,
    currentBalance: 42100,
    bookType: 'CASH BOOK',
  },
  {
    id: 'bank-2',
    accountName: 'Other Account',
    bankName: 'General Ledger',
    accountNumber: 'N/A',
    ifscCode: 'N/A',
    branch: 'HQ Office',
    address: 'HQ Business Center, Indore',
    openingBalance: 50000,
    currentBalance: 112860,
    bookType: 'NON-PAYMENT BOOK',
  },
  {
    id: 'bank-3',
    accountName: 'Hdfc Cr Ac.50200011521150',
    bankName: 'HDFC Bank',
    accountNumber: '50200011521150',
    ifscCode: 'HDFC0000543',
    branch: 'Vijay Nagar',
    address: 'Vijay Nagar Branch, Indore',
    openingBalance: 85000,
    currentBalance: 44800,
    upiId: 'ostech@hdfcbank',
    bookType: 'BANK BOOK',
  },
  {
    id: 'bank-4',
    accountName: 'Sbi Cr A/c. 62232218627',
    bankName: 'State Bank of India',
    accountNumber: '62232218627',
    ifscCode: 'SBIN0001234',
    branch: 'Main Branch',
    address: 'Main Branch, MG Road, Indore',
    openingBalance: 125000,
    currentBalance: 342890,
    upiId: 'ostech@sbi',
    bookType: 'BANK BOOK',
  },
  {
    id: 'bank-5',
    accountName: 'Icici Saving A/c 06180150377',
    bankName: 'ICICI Bank',
    accountNumber: '06180150377',
    ifscCode: 'ICIC0000618',
    branch: 'Old Palasia',
    address: 'Palasia Branch, Indore',
    openingBalance: 2000,
    currentBalance: 4295,
    upiId: 'ostech@icici',
    bookType: 'BANK BOOK',
  },
];

export const INITIAL_STAFF: EmployeeMaster[] = [
  {
    id: 'staff-1',
    name: 'Shiv Kumar (Master Admin)',
    role: 'Admin',
    phone: '+91 98260 55770',
    email: 'shivmrfxlu@gmail.com',
    salary: 75000,
    commissionPercent: 0,
    active: true,
  },
  {
    id: 'staff-2',
    name: 'Rahul Sharma',
    role: 'Salesman',
    phone: '+91 94250 11223',
    email: 'rahul.sales@os-books.com',
    salary: 22000,
    commissionPercent: 1.5,
    active: true,
  },
  {
    id: 'staff-3',
    name: 'Priya Verma',
    role: 'Accountant',
    phone: '+91 98930 44556',
    email: 'priya.accounts@os-books.com',
    salary: 32000,
    commissionPercent: 0,
    active: true,
  },
  {
    id: 'staff-4',
    name: 'Amit Patel',
    role: 'Billing Executive',
    phone: '+91 731 2998877',
    email: 'amit.billing@os-books.com',
    salary: 18000,
    commissionPercent: 1.0,
    active: true,
  },
];

export const INITIAL_EXPENSES: ExpenseMaster[] = [
  { id: 'exp-1', categoryName: 'Shop Rent', hsnSac: '997212', gstRate: 18, monthlyBudget: 35000, ytdSpent: 245000, active: true, expenseHead: 'Rent Expenses', expenseType: 'Operating Expenses' },
  { id: 'exp-2', categoryName: 'Electricity & Utility Charges', hsnSac: '996911', gstRate: 0, monthlyBudget: 10000, ytdSpent: 58400, active: true, expenseHead: 'Utility Expenses', expenseType: 'Operating Expenses' },
  { id: 'exp-3', categoryName: 'Staff Salary & Payroll', hsnSac: 'N/A', gstRate: 0, monthlyBudget: 150000, ytdSpent: 1050000, active: true, expenseHead: 'Salary & Wages', expenseType: 'Administrative Expenses' },
  { id: 'exp-4', categoryName: 'Goods Freight & Logistics', hsnSac: '996511', gstRate: 5, monthlyBudget: 15000, ytdSpent: 87500, active: true, expenseHead: 'Freight & Carriage', expenseType: 'Direct Expenses' },
  { id: 'exp-5', categoryName: 'Tea, Coffee & Pantry Refreshments', hsnSac: 'N/A', gstRate: 5, monthlyBudget: 4000, ytdSpent: 22800, active: true, expenseHead: 'Office Expenses', expenseType: 'Administrative Expenses' },
];

export const INITIAL_INCOMES: IncomeMaster[] = [
  { id: 'inc-1', sourceName: 'Retail Product Sales Income', hsnSac: '998811', gstRate: 18, ytdEarned: 1895000 },
  { id: 'inc-2', sourceName: 'POS Hardware Repair & Service Charges', hsnSac: '998713', gstRate: 18, ytdEarned: 142000 },
  { id: 'inc-3', sourceName: 'Software AMC Subscription Income', hsnSac: '998314', gstRate: 18, ytdEarned: 285000 },
  { id: 'inc-4', sourceName: 'Bank Interest Income', hsnSac: 'N/A', gstRate: 0, ytdEarned: 18400 },
];

export const INITIAL_PAYMENTS: PaymentMaster[] = [
  { id: 'pay-1', modeName: 'UPI', linkedAccount: 'SBI Current A/c (ostech@sbi)', transactionFeePercent: 0, active: true },
  { id: 'pay-2', modeName: 'Cash', linkedAccount: 'Main Store Cash Drawer', transactionFeePercent: 0, active: true },
  { id: 'pay-3', modeName: 'Bank Transfer', linkedAccount: 'HDFC Current A/c', transactionFeePercent: 0, active: true },
  { id: 'pay-4', modeName: 'Cheque', linkedAccount: 'SBI Current A/c', transactionFeePercent: 0, active: true },
  { id: 'pay-5', modeName: 'Credit', linkedAccount: 'Sundry Debtors Ledger', transactionFeePercent: 0, active: true },
];

export const INITIAL_BOM: BomMaster[] = [
  {
    id: 'bom-1',
    finishedGoodId: 'prod-combo-1',
    finishedGoodName: 'Complete Supermarket POS Counter Kit',
    bomCode: 'BOM-POS-KIT-01',
    laborCost: 1500,
    totalCost: 16339,
    components: [
      { productId: 'prod-1', productName: 'Wireless Barcode Scanner Handheld', quantity: 1, unit: 'PCS', unitCost: 1850 },
      { productId: 'prod-4', productName: 'Epson Thermal Receipt Printer', quantity: 1, unit: 'PCS', unitCost: 9400 },
      { productId: 'prod-7', productName: 'TVS-E Heavy Duty Cash Drawer', quantity: 1, unit: 'PCS', unitCost: 2600 },
      { productId: 'prod-2', productName: 'Thermal Paper Roll 80mm Pack', quantity: 2, unit: 'PKT', unitCost: 280 },
    ],
  },
];

export const INITIAL_ACCOUNTS: AccountMaster[] = [
  { id: 'acc-1', accountName: 'Sundry Debtors (Customers)', group: 'Sundry Debtors', openingBalance: 146250, currentBalance: 146250 },
  { id: 'acc-2', accountName: 'Sundry Creditors (Vendors)', group: 'Sundry Creditors', openingBalance: 64200, currentBalance: 64200 },
  { id: 'acc-3', accountName: 'Main Sales Account', group: 'Sales Account', openingBalance: 0, currentBalance: 894500 },
  { id: 'acc-4', accountName: 'Main Purchase Account', group: 'Purchase Account', openingBalance: 0, currentBalance: 512000 },
  { id: 'acc-5', accountName: 'Shop Rent Expense', group: 'Direct Expenses', openingBalance: 0, currentBalance: 35000 },
  { id: 'acc-6', accountName: 'Electricity & Utility Bills', group: 'Indirect Expenses', openingBalance: 0, currentBalance: 8400 },
  { id: 'acc-7', accountName: 'Freight & Transportation', group: 'Direct Expenses', openingBalance: 0, currentBalance: 12500 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sharma Electronics & Superstore',
    phone: '+91 98260 12345',
    email: 'sharma.store@gmail.com',
    gstin: '23AAACS1234F1Z5',
    address: '102 MG Road, Main Market',
    city: 'Indore',
    state: 'Madhya Pradesh',
    stateCode: '23',
    balance: 45800,
    creditLimit: 150000,
    creditDays: 30,
    type: 'Customer',
    accountGroup: 'Sundry Debtors',
  },
  {
    id: 'cust-2',
    name: 'Apex Infotech Solutions',
    phone: '+91 94250 67890',
    email: 'billing@apexinfotech.in',
    gstin: '23BBBCA5678G2Z1',
    address: '405 Scheme 54, Vijay Nagar',
    city: 'Indore',
    state: 'Madhya Pradesh',
    stateCode: '23',
    balance: 12450,
    creditLimit: 100000,
    creditDays: 15,
    type: 'Customer',
    accountGroup: 'Sundry Debtors',
  },
  {
    id: 'cust-3',
    name: 'Rajput Wholesale Traders',
    phone: '+91 98930 11223',
    email: 'rajput.traders@yahoo.com',
    gstin: '27CCCDE9012H3Z8',
    address: '88 Commerce Zone',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    balance: 89000,
    creditLimit: 250000,
    creditDays: 45,
    type: 'Customer',
    accountGroup: 'Sundry Debtors',
  },
  {
    id: 'cust-4',
    name: 'National Distributors Pvt Ltd',
    phone: '+91 731 400500',
    email: 'orders@nationaldist.com',
    gstin: '23AAACN9988K1Z9',
    address: 'Plot 14, Industrial Area Phase 1',
    city: 'Indore',
    state: 'Madhya Pradesh',
    stateCode: '23',
    balance: -64200,
    creditLimit: 500000,
    creditDays: 60,
    type: 'Vendor',
    accountGroup: 'Sundry Creditors',
  },
  {
    id: 'cust-5',
    name: 'Malwa Retail Mart & General Store',
    phone: '+91 98270 99887',
    email: 'malwa.retail@gmail.com',
    gstin: '23AAAFM5544J1Z3',
    address: '45 Jawahar Marg',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    stateCode: '23',
    balance: 22400,
    creditLimit: 75000,
    creditDays: 20,
    type: 'Customer',
    accountGroup: 'Sundry Debtors',
  },
  {
    id: 'cust-6',
    name: 'Gujarat Tech Supplies Ltd',
    phone: '+91 79 26543210',
    email: 'sales@gujtechsupplies.com',
    gstin: '24AAACG1122E1Z4',
    address: '102 SG Highway',
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    balance: -38500,
    creditLimit: 300000,
    creditDays: 30,
    type: 'Vendor',
    accountGroup: 'Sundry Creditors',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_19kg',
    name: '19 KG Commercial LPG Cylinder',
    category: 'LPG Cylinders',
    brand: 'Pramukh Indane',
    sku: 'LPG-19KG-COMM',
    barcode: '890123450019',
    hsnCode: '27111900',
    unit: 'PCS',
    purchasePrice: 1550,
    salePrice: 1850,
    mrp: 2000,
    taxRate: 18,
    stock: 250,
    minStockAlert: 50,
    rackLocation: 'Bay A-19',
  },
  {
    id: 'prod_47kg',
    name: '47.5 KG Industrial LPG Cylinder',
    category: 'LPG Cylinders',
    brand: 'Pramukh Indane',
    sku: 'LPG-47KG-IND',
    barcode: '890123450047',
    hsnCode: '27111900',
    unit: 'PCS',
    purchasePrice: 3800,
    salePrice: 4500,
    mrp: 4900,
    taxRate: 18,
    stock: 120,
    minStockAlert: 30,
    rackLocation: 'Bay B-47',
  },
  {
    id: 'prod_14kg',
    name: '14.2 KG Domestic LPG Cylinder',
    category: 'LPG Cylinders',
    brand: 'Pramukh Indane',
    sku: 'LPG-14KG-DOM',
    barcode: '890123450014',
    hsnCode: '27111900',
    unit: 'PCS',
    purchasePrice: 750,
    salePrice: 853,
    mrp: 900,
    taxRate: 5,
    stock: 500,
    minStockAlert: 100,
    rackLocation: 'Bay C-14',
  },
  {
    id: 'prod_5kg',
    name: '5 KG Commercial LPG Cylinder',
    category: 'LPG Cylinders',
    brand: 'Pramukh Indane',
    sku: 'LPG-5KG-COMM',
    barcode: '890123450005',
    hsnCode: '27111900',
    unit: 'PCS',
    purchasePrice: 400,
    salePrice: 490,
    mrp: 550,
    taxRate: 18,
    stock: 80,
    minStockAlert: 20,
    rackLocation: 'Bay D-05',
  },
  {
    id: 'prod_19vot',
    name: '19 KG VOT Commercial Cylinder',
    category: 'LPG Cylinders',
    brand: 'Pramukh Indane',
    sku: 'LPG-19KG-VOT',
    barcode: '890123450020',
    hsnCode: '27111900',
    unit: 'PCS',
    purchasePrice: 1650,
    salePrice: 1950,
    mrp: 2100,
    taxRate: 18,
    stock: 60,
    minStockAlert: 15,
    rackLocation: 'Bay A-VOT',
  },
  {
    id: 'prod_hp_reg',
    name: 'High Pressure Commercial Regulator (50 bar)',
    category: 'LPG Equipment',
    brand: 'Suraksha',
    sku: 'LPG-REG-HP',
    barcode: '890123450099',
    hsnCode: '84818090',
    unit: 'PCS',
    purchasePrice: 450,
    salePrice: 650,
    mrp: 750,
    taxRate: 18,
    stock: 45,
    minStockAlert: 10,
    rackLocation: 'Shelf E-01',
  },
  {
    id: 'prod_hose_15',
    name: 'Suraksha Heavy Rubber Gas Hose (1.5m)',
    category: 'LPG Equipment',
    brand: 'Suraksha',
    sku: 'LPG-HOSE-15',
    barcode: '890123450088',
    hsnCode: '40093100',
    unit: 'PCS',
    purchasePrice: 140,
    salePrice: 220,
    mrp: 280,
    taxRate: 18,
    stock: 100,
    minStockAlert: 25,
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1001',
    invoiceNumber: 'OS-2026-0891',
    date: '2026-07-27',
    dueDate: '2026-08-10',
    customerId: 'cust-1',
    customerName: 'Sharma Electronics & Superstore',
    customerGstin: '23AAACS1234F1Z5',
    customerPhone: '+91 98260 12345',
    salesmanId: 'staff-2',
    salesmanName: 'Rahul Sharma',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Wireless Barcode Scanner Handheld (2.4G Laser)',
        hsnCode: '84719000',
        quantity: 2,
        unit: 'PCS',
        unitPrice: 2499,
        mrp: 2999,
        discountPercent: 5,
        taxRate: 18,
        taxableAmount: 4748.1,
        cgstAmount: 427.33,
        sgstAmount: 427.33,
        igstAmount: 0,
        totalAmount: 5602.76,
      },
      {
        id: 'item-2',
        productId: 'prod-4',
        productName: 'Epson Thermal Receipt Printer TM-T82III (USB/LAN)',
        hsnCode: '84433210',
        quantity: 1,
        unit: 'PCS',
        unitPrice: 11990,
        mrp: 14500,
        discountPercent: 0,
        taxRate: 18,
        taxableAmount: 11990,
        cgstAmount: 1079.1,
        sgstAmount: 1079.1,
        igstAmount: 0,
        totalAmount: 14148.2,
      },
    ],
    subTotal: 16738.1,
    totalDiscount: 249.9,
    totalCgst: 1506.43,
    totalSgst: 1506.43,
    totalIgst: 0,
    roundOff: 0.04,
    grandTotal: 19751,
    paymentMode: 'UPI',
    bankAccountId: 'bank-1',
    status: 'Paid',
    isIgst: false,
    notes: 'Thank you for your business!',
  },
  {
    id: 'inv-1002',
    invoiceNumber: 'OS-2026-0892',
    date: '2026-07-26',
    dueDate: '2026-08-05',
    customerId: 'cust-3',
    customerName: 'Rajput Wholesale Traders',
    customerGstin: '27CCCDE9012H3Z8',
    customerPhone: '+91 98930 11223',
    salesmanId: 'staff-4',
    salesmanName: 'Amit Patel',
    items: [
      {
        id: 'item-3',
        productId: 'prod-5',
        productName: 'Dell 24" IPS Full HD Monitor (HDMI/VGA/Borderless)',
        hsnCode: '85285200',
        quantity: 3,
        unit: 'PCS',
        unitPrice: 10499,
        mrp: 12999,
        discountPercent: 2,
        taxRate: 18,
        taxableAmount: 30867.06,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 5556.07,
        totalAmount: 36423.13,
      },
    ],
    subTotal: 30867.06,
    totalDiscount: 629.94,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 5556.07,
    roundOff: -0.13,
    grandTotal: 36423,
    paymentMode: 'Credit',
    status: 'Unpaid',
    isIgst: true,
    notes: 'Inter-state IGST Supply to Mumbai',
  },
];

export const INITIAL_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'audit-1',
    timestamp: '2026-07-27 09:14',
    actorEmail: 'shivmrfxlu@gmail.com',
    action: 'Login',
    details: 'Signed in to OS-BOOKS Firm Dashboard',
  },
  {
    id: 'audit-2',
    timestamp: '2026-07-27 09:22',
    actorEmail: 'shivmrfxlu@gmail.com',
    action: 'Staff Added',
    details: 'Created employee record: Amit Patel (Salesman)',
  },
  {
    id: 'audit-3',
    timestamp: '2026-07-27 10:05',
    actorEmail: 'shivmrfxlu@gmail.com',
    action: 'Settings Updated',
    details: 'Updated firm GSTIN configuration',
  },
];
