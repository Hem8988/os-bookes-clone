import { badRequest } from '../http';

// Reads an Indian Oil (Indane) LPG tax invoice PDF — the SAP print from the
// bottling plant — into the fields of a purchase bill. The PDF carries a text
// layer, so no OCR is involved; anything not found is left for the user.

export interface InvoiceLine {
  description: string;
  quantity: number; // cylinders (EA)
  kgPerUnit: number | null; // from the KG line ÷ quantity
  tonneRate: number | null; // ₹ per tonne (TO), excl. GST
  taxable: number;
  taxRate: number; // total GST %, CGST + SGST or IGST
  hsnCode: string;
}

export interface ParsedInvoice {
  format: 'IOCL';
  invoiceNo: string | null;
  date: string | null; // YYYY-MM-DD
  vehicleNumber: string | null;
  supplierGstin: string | null;
  supplierName: string;
  supplierAddress: string;
  supplierCity: string;
  lines: InvoiceLine[];
  total: number | null;
}

const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
const GSTIN = /\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/g;
const TRUCK = /[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}/;
const num = (s: string) => Number(s.replace(/,/g, ''));

export async function pdfText(data: Uint8Array) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  try {
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    throw badRequest('Could not read this PDF. Upload the original invoice PDF from the plant, not a photo or scan.');
  }
}

export function parseIoclInvoice(text: string, ownGstin?: string | null): ParsedInvoice {
  if (!/Indian Oil Corporation/i.test(text)) throw badRequest('This does not look like an Indian Oil (Indane) invoice. Enter the bill by hand.');
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const date = text.match(/\b(\d{2})-([A-Za-z]{3})-(\d{2,4})\b/);
  const year = date ? (date[3].length === 2 ? `20${date[3]}` : date[3]) : '';
  const month = date ? MONTHS[date[2].toUpperCase()] : undefined;

  const truck = text.match(new RegExp(`(${TRUCK.source})\\s*T\\.T\\.No\\.`)) || text.match(new RegExp(`T\\.T\\.No\\.\\s*(${TRUCK.source})`)) || text.match(new RegExp(`PO ref:\\s*(${TRUCK.source})`));
  const own = ownGstin?.trim().toUpperCase();
  const supplierGstin = [...new Set(text.match(GSTIN) || [])].find((g) => g !== own && g.slice(2, 12) === 'AAACI1681G') ?? [...new Set(text.match(GSTIN) || [])].find((g) => g !== own) ?? null;
  const plant = text.match(/LPG BP\s*-?\s*([A-Z][A-Z .()]+)/);
  const at = rows.findIndex((r) => /^At Post\b/i.test(r));
  const pin = at >= 0 ? rows[at + 1]?.match(/^([A-Za-z .]+?)\s+(\d{6})$/) : null;

  const lines: InvoiceLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i].match(/^\d+\s+M\d+\s+(.+?)\s+([\d,]+\.\d+)\s+EA\b\s*(\d{4,8})?/);
    if (!item) continue;
    const line: InvoiceLine = { description: item[1].trim(), quantity: num(item[2]), kgPerUnit: null, tonneRate: null, taxable: 0, taxRate: 0, hsnCode: item[3] || '' };
    for (let j = i + 1; j < rows.length && !/^\d+\s+M\d+\s/.test(rows[j]); j++) {
      const taxable = rows[j].match(/Taxable Value\s+([\d,]+\.\d+)\s+KG\s+([\d,]+\.\d+)\s+TO\s+([\d,]+\.\d+)/);
      if (taxable) {
        line.kgPerUnit = line.quantity ? Math.round((num(taxable[1]) / line.quantity) * 1000) / 1000 : null;
        line.tonneRate = num(taxable[2]);
        line.taxable = num(taxable[3]);
      }
      const tax = rows[j].match(/(Central|State|Integrated) Tax\s+([\d.]+)\s*%/);
      if (tax) line.taxRate += num(tax[2]);
    }
    lines.push(line);
  }
  if (!lines.length) throw badRequest('No cylinder lines were found on this invoice. Enter the bill by hand.');

  const total = text.match(/\bTotal\s+([\d,]+\.\d{2})\s*$/m);
  return {
    format: 'IOCL',
    invoiceNo: rows.find((r) => /^[A-Z]{2}\d{8,12}$/.test(r)) ?? null,
    date: date && month ? `${year}-${month}-${date[1]}` : null,
    vehicleNumber: truck ? truck[1] : null,
    supplierGstin,
    supplierName: `Indian Oil Corporation Ltd${plant ? ` - ${plant[1].trim()}` : ''}`,
    supplierAddress: at >= 0 ? [rows[at], pin ? `${pin[1]} ${pin[2]}` : ''].filter(Boolean).join(', ') : '',
    supplierCity: pin ? pin[1] : '',
    lines,
    total: total ? num(total[1]) : null,
  };
}
