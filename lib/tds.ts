// TDS sections a gas distributor meets most often, with the usual rate (the
// rate stays editable per entry — PAN missing, lower-deduction certificate…).
// TCS on sale of goods (206C(1H)) was withdrawn from 1 April 2025, so only TDS is tracked.

export const TDS_SECTIONS: { code: string; label: string; rate: number }[] = [
  { code: '194Q', label: '194Q — Purchase of goods', rate: 0.1 },
  { code: '194C', label: '194C — Contractor / transport (company 2%, others 1%)', rate: 1 },
  { code: '194J', label: '194J — Professional fees (technical 2%)', rate: 10 },
  { code: '194I', label: '194-I — Rent (building 10%, machinery 2%)', rate: 10 },
  { code: '194H', label: '194H — Commission / brokerage', rate: 2 },
  { code: '194A', label: '194A — Interest (other than bank)', rate: 10 },
  { code: 'OTHER', label: 'Other', rate: 0 },
];

export const sectionLabel = (code: string) => TDS_SECTIONS.find((s) => s.code === code)?.label || code;

/** TDS deducted in a month is due on the 7th of the next month; March deductions by 30 April. */
export function tdsDueDate(date: string) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  if (m === 3) return `${y}-04-30`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-07`;
}

/** Quarter label used on the TDS return (26Q) and Form 16A: Q1 = Apr–Jun. */
export function tdsQuarter(date: string) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const fy = m >= 4 ? y : y - 1;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  return `FY ${fy}-${String(fy + 1).slice(2)} Q${q}`;
}
