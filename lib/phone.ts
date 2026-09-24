/** Last 10 digits of an Indian mobile number — used for matching customers. */
export function phoneKey(phone: string | null | undefined): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/** E.164 without '+', as WhatsApp Cloud API expects (defaults to +91). */
export function toWhatsAppNumber(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function isValidMobile(phone: string | null | undefined): boolean {
  return /^[6-9]\d{9}$/.test(phoneKey(phone));
}

export function isValidGstin(gstin: string | null | undefined): boolean {
  if (!gstin) return true;
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase());
}
