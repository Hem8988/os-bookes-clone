// GST helpers shared by screens and print-outs.

/** GST state codes (first two digits of a GSTIN). */
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

/** "Delhi (07)" from a state code, falling back to the GSTIN prefix. */
export function stateLabel(stateCode?: string | null, gstin?: string | null, stateName?: string | null): string {
  const code = (stateCode || gstin?.slice(0, 2) || '').trim();
  const name = GST_STATES[code] || stateName || '';
  if (name && code) return `${name} (${code})`;
  return name || code;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function upTo99(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function upTo999(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? upTo99(r) : ''].filter(Boolean).join(' and ');
}

/** Indian-system words: 10650 → "Ten Thousand Six Hundred Fifty". */
function integerWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore > 999 ? integerWords(crore) : upTo999(crore)} Crore`);
  if (lakh) parts.push(`${upTo99(lakh)} Lakh`);
  if (thousand) parts.push(`${upTo99(thousand)} Thousand`);
  if (n) parts.push(upTo999(n));
  return parts.join(' ');
}

/** "Rs. Ten Thousand Six Hundred Fifty and Fifty Paise only". */
export function amountInWords(amount: number): string {
  const value = Math.abs(Math.round((Number(amount) || 0) * 100)) / 100;
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  return `Rs. ${integerWords(rupees)}${paise ? ` and ${upTo99(paise)} Paise` : ''} only`;
}

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The check letter (15th character) a GSTIN's first 14 characters require. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(first14[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

/**
 * Offline GSTIN check: length, pattern, state code and the check letter, so a
 * mistyped character is caught. Returns what is wrong, or null when it is valid.
 * (Whether the number is registered / active needs an online GST lookup.)
 */
export function gstinProblem(raw: string): string | null {
  const g = raw.trim().toUpperCase();
  if (g.length !== 15) return `GSTIN must be 15 characters (you typed ${g.length}).`;
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return 'GSTIN pattern is wrong — it looks like 23ABCDE1234F1Z5 (state code, 10-character PAN, entity number, Z, check letter).';
  if (!GST_STATES[g.slice(0, 2)]) return `GSTIN starts with ${g.slice(0, 2)}, which is not a GST state code.`;
  const check = gstinCheckChar(g.slice(0, 14));
  if (check !== g[14]) return `GSTIN check letter does not match — a character is mistyped (for these first 14 characters the last one should be ${check}).`;
  return null;
}
