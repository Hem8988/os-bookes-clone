// Admin-configurable settings with safe defaults. Shared between server
// (enforcement) and the Settings screen (editing).

export interface CompanyProfile {
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  address: string;
  /** City and PIN code — required on e-invoice and e-way bill JSON. */
  city: string;
  pincode: string;
  phone: string;
  supportPhone: string;
  email: string;
  upiId: string;
  invoicePrefix: string;
  /** Logo as a small data: URL, printed on invoices and shown on the login screen. */
  logo: string;
  pan: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  /** Terms printed at the foot of every invoice, one per line. */
  invoiceTerms: string;
  /** Printed under the signature, e.g. PROPRIETOR / PARTNER / DIRECTOR. */
  signatoryTitle: string;
  /** Signature / stamp image as a small data: URL. */
  signature: string;
}

export interface SecurityPolicy {
  sessionIdleMinutes: number;
  sessionMaxHours: number;
  maxFailedLogins: number;
  lockoutMinutes: number;
  /** Roles that must enter a WhatsApp/SMS OTP after the password. */
  otpRequiredRoles: string[];
  /** Delivery boys may only log in from an approved device. */
  deviceBindingRequired: boolean;
  /** Delivery boys must pass a fingerprint/face check (WebAuthn) at login. */
  biometricRequired: boolean;
  loginLocationRequired: boolean;
  deliveryLocationRequired: boolean;
  /** Admin override: temporarily skip location checks for everybody. */
  locationOverride: boolean;
  workingHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
    roles: string[];
    /** ISO timestamp until which the admin override is active. */
    overrideUntil: string | null;
  };
  accountantIpRestriction: boolean;
}

export interface OperationsPolicy {
  autoAssignDefaultDeliveryBoy: boolean;
  /** Variance (%) between ordered and delivered qty that is highlighted for the accountant. */
  varianceTolerancePercent: number;
  whatsappSessionTimeoutMinutes: number;
  /** Day of week (0 = Sunday) the outstanding reminder job runs. */
  outstandingReminderWeekday: number;
  blockLockWithPendingItems: boolean;
  /** A customer holding cylinders with no empty returned for this many days is overdue. */
  emptyOverdueDays: number;
  /** WhatsApp customers when they are due for their usual refill. */
  refillReminders: boolean;
  /** Day of month (1–28) the monthly statement is sent; 0 = off. */
  statementDay: number;
}

/** Monthly budget per expense head (ledger name → rupees). */
export interface BudgetPolicy {
  heads: Record<string, number>;
}

/** Owner's end-of-day summary on WhatsApp / email. */
export interface OwnerReportPolicy {
  enabled: boolean;
  /** Comma separated mobile numbers. */
  phones: string;
  /** Comma separated emails. */
  emails: string;
  /** Hour of the day (India time, 0–23) the report goes out. */
  hour: number;
}

/** Books of accounts: where the monthly CA pack goes and the financial year. */
export interface BooksPolicy {
  caName: string;
  caEmail: string;
  /** Extra copies, comma separated. */
  ccEmails: string;
  /** Day of month (1–28) the previous month's pack is emailed automatically; 0 = only by hand. */
  autoSendDay: number;
  /** First month of the financial year (4 = April). */
  fyStartMonth: number;
}

/** Outgoing email (SMTP). The password is stored sealed (see lib/server/secretBox). */
export interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  passwordSealed: string;
  from: string;
}

export interface SettingsMap {
  company: CompanyProfile;
  security: SecurityPolicy;
  operations: OperationsPolicy;
  books: BooksPolicy;
  email: EmailSettings;
  owner: OwnerReportPolicy;
  budgets: BudgetPolicy;
}

export type SettingKey = keyof SettingsMap;

export const DEFAULT_SETTINGS: SettingsMap = {
  company: {
    name: 'DeskShark Gas Distribution',
    legalName: '',
    gstin: '',
    stateCode: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    supportPhone: '',
    email: '',
    upiId: '',
    invoicePrefix: 'INV',
    logo: '',
    pan: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
    invoiceTerms: 'Terms : Interest@24% P.A. will be charged if payment is not made within 30 days.\nThis is system Generated Invoice does not require signature.\nSUBJECT TO LOCAL JURISDICTION ONLY.',
    signatoryTitle: 'PROPRIETOR',
    signature: '',
  },
  security: {
    sessionIdleMinutes: 30,
    sessionMaxHours: 12,
    maxFailedLogins: 5,
    lockoutMinutes: 15,
    otpRequiredRoles: [],
    deviceBindingRequired: true,
    biometricRequired: false,
    loginLocationRequired: true,
    deliveryLocationRequired: true,
    locationOverride: false,
    workingHours: {
      enabled: false,
      start: '08:00',
      end: '20:00',
      roles: ['DELIVERY_BOY', 'ACCOUNTANT'],
      overrideUntil: null,
    },
    accountantIpRestriction: false,
  },
  operations: {
    autoAssignDefaultDeliveryBoy: true,
    varianceTolerancePercent: 1,
    whatsappSessionTimeoutMinutes: 10,
    outstandingReminderWeekday: 1,
    blockLockWithPendingItems: true,
    emptyOverdueDays: 30,
    refillReminders: false,
    statementDay: 0,
  },
  budgets: { heads: {} },
  owner: {
    enabled: false,
    phones: '',
    emails: '',
    hour: 21,
  },
  email: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    passwordSealed: '',
    from: '',
  },
  books: {
    caName: '',
    caEmail: '',
    ccEmails: '',
    autoSendDay: 0,
    fyStartMonth: 4,
  },
};

export const PAYMENT_TERMS = [
  { value: 'COD', label: 'Cash on Delivery', days: 0 },
  { value: 'NET_7', label: '7 days', days: 7 },
  { value: 'NET_15', label: '15 days', days: 15 },
  { value: 'NET_30', label: '30 days', days: 30 },
] as const;

export const CUSTOMER_SEGMENTS = ['Hotel', 'Restaurant', 'Industrial', 'Hospital', 'Retail', 'Institution', 'Other'] as const;
