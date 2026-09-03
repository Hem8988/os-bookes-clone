export interface DeliveryRequest {
  id: string;
  requestedAt: string;
  deliveryBoyName: string;
  requestType: 'EXTRA_CYLINDERS' | 'CASH_ADVANCE' | 'VEHICLE_ISSUE' | 'OTHER';
  requestNote: string;
  qty?: number;
  amount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  resolvedAt?: string;
}

export interface NarrationMaster {
  id: string;
  text: string;
}

export interface UnitMaster {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDecimalAllowed: boolean;
}

export interface CategoryMaster {
  id: string;
  name: string;
  hsnDefault?: string;
  itemCount: number;
  active?: boolean;
  purchaseDiscount?: number;
  saleDiscount?: number;
  image?: string;
}

export interface BrandMaster {
  id: string;
  name: string;
  manufacturer: string;
}

export interface TaxMaster {
  id: string;
  name: string;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface BankMaster {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  openingBalance: number;
  currentBalance: number;
  upiId?: string;
  qrCodeUrl?: string;
  address?: string;
  bookType?: string;
}

export interface EmployeeMaster {
  id: string;
  name: string;
  role: 'Admin' | 'Salesman' | 'Accountant' | 'Billing Executive' | 'Store Manager' | 'Delivery Boy' | 'Relationship Manager';
  phone: string;
  email: string;
  salary: number;
  commissionPercent: number;
  active: boolean;
  city?: string;
  joiningDate?: string;
  designation?: string;
  salaryType?: 'Day' | 'Month';
  paidHoliday?: number;
  specialCommission?: number;
  totalSaleCommission?: number;
  commissionOnManufacturing?: boolean;
}

export interface ExpenseMaster {
  id: string;
  categoryName: string;
  hsnSac?: string;
  gstRate: number;
  monthlyBudget: number;
  ytdSpent: number;
  active: boolean;
  expenseHead: string;
  expenseType: string;
}

export interface IncomeMaster {
  id: string;
  sourceName: string;
  hsnSac?: string;
  gstRate: number;
  ytdEarned: number;
  active?: boolean;
}

export interface PaymentMaster {
  id: string;
  modeName: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit';
  linkedAccount: string;
  transactionFeePercent: number;
  active: boolean;
}

export interface BomComponent {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  mrp?: number;
  salePrice?: number;
  wholesalePrice?: number;
  image?: string;
  customValues?: Record<string, number>;
}

export interface BomMaster {
  id: string;
  finishedGoodId: string;
  finishedGoodName: string;
  bomCode: string;
  components: BomComponent[];
  laborCost: number;
  totalCost: number;
  active?: boolean;
  remark?: string;
}

export interface CompanyMaster {
  id: string;
  companyName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  isMainBranch: boolean;
}

export interface AccountMaster {
  id: string;
  accountName: string;
  group: 'Sundry Debtors' | 'Sundry Creditors' | 'Bank Accounts' | 'Cash-in-Hand' | 'Direct Expenses' | 'Indirect Expenses' | 'Sales Account' | 'Purchase Account';
  openingBalance: number;
  currentBalance: number;
  gstin?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  sku: string;
  barcode?: string;
  hsnCode: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  mrp?: number;
  taxRate: number;
  stock: number;
  minStockAlert: number;
  maxStockLimit?: number;
  rackLocation?: string;
  batchNumber?: string;
  expiryDate?: string;
  groupCode?: string;
  active?: boolean;
  gstApplicable?: boolean;
  autoQty?: number;
  productType?: 'Product' | 'Service';
  gasType?: string;
  weightVolume?: number;
  emptyDepositValue?: number;
  isMoreInfo?: boolean;
  isRawMaterial?: boolean;
  isSubItem?: boolean;
  image?: string;
  size?: string;
  colour?: string;
  expiryMonth?: number;
  productHindiName?: string;
  description?: string;
  termsAndCondition?: string;
  productTags?: string[];
  rawMaterialComponents?: BomComponent[];
  parentProductId?: string;
  parentProductName?: string;
  subItemConversionQty?: number;
}

export interface CustomerAddress {
  id?: string;
  label: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  area?: string;
  route?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  tradeName?: string;
  contactPerson?: string;
  phone: string;
  email: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  balance: number;
  creditLimit: number;
  creditDays?: number;
  type: 'Customer' | 'Vendor';
  accountGroup: 'Sundry Debtors' | 'Sundry Creditors';
  active?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  internalNotes?: string;
  dueDays?: number;
  tags?: string[];
  isMoreInfo?: boolean;
  isWholeParty?: boolean;
  isSezParty?: boolean;
  isFocParty?: boolean;
  isShowPartyRate?: boolean;
  pincode?: string;
  gstApplicable?: string;
  partyType?: string;
  otherMobile?: string;
  interestRate?: number;
  loyaltyPoints?: number;
  joiningDate?: string;
  rateMode?: 'item' | 'company';
  whatsappNumber?: string;
  area?: string;
  route?: string;
  defaultDeliveryBoyId?: string;
  defaultDeliveryBoyName?: string;
  relationshipManagerId?: string;
  relationshipManagerName?: string;
  openingEmptyCylinderQty?: number;
  password?: string;
  portalAccessEnabled?: boolean;
  partyRates?: PartyRate[];
  deliveryAddresses?: CustomerAddress[];
  depositFeePerCylinder?: number;
  totalDepositAmount?: number;
  depositStatus?: 'Paid' | 'Refunded' | 'Adjusted';
  svVoucherNo?: string;
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr';
  assignedCylinderTypes?: string[];
}

export interface SubscriptionVoucher {
  id: string;
  svNumber: string;
  customerId: string;
  customerName: string;
  relationshipManagerId?: string;
  relationshipManagerName?: string;
  defaultDeliveryBoyId?: string;
  defaultDeliveryBoyName?: string;
  voucherReference?: string;
  svDate: string;
  cylinderQty: number;
  regulatorQty: number;
  depositFeePerCylinder: number;
  totalDepositAmount: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'TRANSFERRED';
  notes?: string;
}

export interface PartyRate {
  productId: string;
  productName: string;
  price: number;
}

export type FollowUpType = 'Call' | 'WhatsApp' | 'Email' | 'SMS' | 'Visit' | 'Meeting' | 'Other';

export interface FollowUp {
  id: string;
  customerId: string;
  type: FollowUpType;
  note: string;
  followUpDate: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  mrp?: number;
  discountPercent: number;
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerPhone: string;
  salesmanId?: string;
  salesmanName?: string;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit' | 'Multiple';
  bankAccountId?: string;
  status: 'Paid' | 'Unpaid' | 'Partial';
  isIgst: boolean;
  notes?: string;
}

// OS-BOOKS Inventory Documents
export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  hsnCode: string;
  gstRate: number;
  quantity: number;
  mrp: number;
  listPrice: number;
  taxExcluded: boolean;
  amount: number;
  otherInfo?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  vendorGstin?: string;
  date: string;
  expectedDate: string;
  itemsCount: number;
  totalAmount: number;
  status: 'Issued' | 'Received' | 'Cancelled';
  items?: PurchaseOrderItem[];
  paymentMode?: 'Cash' | 'Credit';
  taxableAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  discountPercent?: number;
  discountAmount?: number;
  remark?: string;
  createdBy?: string;
  payments?: PurchaseOrderPayment[];
  shippingParty?: string;
}

export interface PurchaseOrderPayment {
  id: string;
  bankAccountId: string;
  bankLabel: string;
  amount: number;
  byCheque: boolean;
  remark?: string;
}

export interface PurchaseInvoice {
  id: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string;
  vendorName: string;
  vendorGstin: string;
  date: string;
  subTotal: number;
  itcEligibleAmount: number;
  grandTotal: number;
  status: 'Paid' | 'Pending';
  items?: PurchaseOrderItem[];
  paymentMode?: 'Cash' | 'Credit';
  totalCgst?: number;
  totalSgst?: number;
  discountPercent?: number;
  discountAmount?: number;
  remark?: string;
  createdBy?: string;
  payments?: PurchaseOrderPayment[];
  shippingParty?: string;
}

export interface ReturnDocument {
  id: string;
  docNumber: string;
  originalInvNumber: string;
  partyName: string;
  date: string;
  returnReason: 'Damaged Goods' | 'Quality Issue' | 'Excess Supply' | 'Wrong Item';
  amount: number;
  status: 'Processed' | 'Pending';
  items?: PurchaseOrderItem[];
  paymentMode?: 'Cash' | 'Credit';
  taxableAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  discountPercent?: number;
  discountAmount?: number;
  remark?: string;
  createdBy?: string;
  payments?: PurchaseOrderPayment[];
}

export interface SaleOrder {
  id: string;
  soNumber: string;
  customerName: string;
  customerGstin?: string;
  date: string;
  validUntil: string;
  totalAmount: number;
  status: 'Pending' | 'Converted to Bill' | 'Expired';
  items?: PurchaseOrderItem[];
  paymentMode?: 'Cash' | 'Credit';
  taxableAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  discountPercent?: number;
  discountAmount?: number;
  remark?: string;
  createdBy?: string;
  payments?: PurchaseOrderPayment[];
  shippingParty?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  customerName: string;
  customerGstin?: string;
  vehicleNumber: string;
  dispatchDate: string;
  itemsCount: number;
  totalQty: number;
  status: 'Dispatched' | 'Delivered' | 'Invoiced';
  items?: PurchaseOrderItem[];
  remark?: string;
  createdBy?: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerGstin?: string;
  date: string;
  validDays: number;
  grandTotal: number;
  status: 'Sent' | 'Accepted' | 'Declined';
  items?: PurchaseOrderItem[];
  taxableAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  discountPercent?: number;
  discountAmount?: number;
  remark?: string;
  createdBy?: string;
}

export interface StockAdjustment {
  id: string;
  adjustCode: string;
  date: string;
  productId?: string;
  productName: string;
  adjustmentType: 'Addition (+)' | 'Deduction (-)';
  qty: number;
  reason: 'Damage/Breakage' | 'Physical Stock Count' | 'Sample Giveaway' | 'Expired Batch';
  approvedBy: string;
  remark?: string;
}

// Branch Management Documents
export interface BranchStockTransfer {
  id: string;
  transferNumber: string;
  type: 'Stock In' | 'Stock Out';
  fromBranch: string;
  toBranch: string;
  date: string;
  itemsCount: number;
  totalQty: number;
  status: 'Dispatched' | 'Received' | 'In Transit';
}

// Ledger Journal & Attendance Entities
export interface LedgerEntry {
  id: string;
  date: string;
  voucherNumber: string;
  accountName: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  details: string;
}

export interface EmployeeAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Late' | 'Half Day' | 'On Leave';
  overtimeHours: number;
}
