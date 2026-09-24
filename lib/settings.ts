// Admin-configurable settings with safe defaults. Shared between server
// (enforcement) and the Settings screen (editing).

export interface CompanyProfile {
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  address: string;
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
}

export interface SettingsMap {
  company: CompanyProfile;
  security: SecurityPolicy;
  operations: OperationsPolicy;
}

export type SettingKey = keyof SettingsMap;

export const DEFAULT_SETTINGS: SettingsMap = {
  company: {
    name: 'DeskShark Gas Distribution',
    legalName: '',
    gstin: '',
    stateCode: '',
    address: '',
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
  },
};

export const PAYMENT_TERMS = [
  { value: 'COD', label: 'Cash on Delivery', days: 0 },
  { value: 'NET_7', label: '7 days', days: 7 },
  { value: 'NET_15', label: '15 days', days: 15 },
  { value: 'NET_30', label: '30 days', days: 30 },
] as const;

export const CUSTOMER_SEGMENTS = ['Hotel', 'Restaurant', 'Industrial', 'Hospital', 'Retail', 'Institution', 'Other'] as const;
