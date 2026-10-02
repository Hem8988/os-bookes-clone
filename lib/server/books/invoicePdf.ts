import { badRequest } from '../http';

// Reads an Indian Oil (Indane) LPG tax invoice PDF — the SAP print from the
// bottling plant — into the fields of a purchase bill. The PDF carries a text
// layer, so no OCR is involved; anything not found is left for the user.
// The e-invoice QR (signed by the GST portal) is read too, to prove the PDF
// is the genuine invoice it claims to be.

export interface InvoiceLine {
  materialCode: string; // IOCL material code, e.g. M00450
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
  sapDocNo: string | null;
  deliveryNo: string | null;
  salesOrderNo: string | null;
  irn: string | null;
  date: string | null; // YYYY-MM-DD
  vehicleNumber: string | null;
  supplierGstin: string | null;
  supplierName: string;
  supplierAddress: string;
  supplierCity: string;
  lines: InvoiceLine[];
  total: number | null;
  /** "Provisional Balance … 1995.95- ( CR )": + = our money with the plant (CR on their books), − = we owe. */
  plantBalance: number | null;
}

/** Fields of the GST e-invoice QR (payload signed by NIC). */
export interface EinvoiceQr {
  raw: string; // the signed token as printed in the QR
  sellerGstin: string;
  buyerGstin: string;
  docNo: string;
  docDate: string; // DD/MM/YYYY
  total: number;
  itemCount: number;
  irn: string;
  irnDate: string;
}

const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
const GSTIN = /\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/g;
const TRUCK = /[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}/;
const ITEM = /^\d+\s+(M\d+)\s+(.+?)\s+([\d,]+\.\d+)\s+EA\b\s*(\d{4,8})?/;
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

/**
 * The e-invoice QR on page 1. It is drawn as vector shapes, so the page is
 * rendered to an image and scanned. Null when there is no readable QR.
 */
export async function readEinvoiceQr(data: Uint8Array): Promise<EinvoiceQr | null> {
  try {
    const [{ renderPageAsImage }, { createCanvas, loadImage }, { default: jsQR }] = await Promise.all([import('unpdf'), import('@napi-rs/canvas'), import('jsqr')]);
    const png = await renderPageAsImage(data, 1, { canvasImport: () => import('@napi-rs/canvas'), scale: 3 });
    const img = await loadImage(Buffer.from(png));
    const ctx = createCanvas(img.width, img.height).getContext('2d');
    ctx.drawImage(img, 0, 0);
    const code = jsQR(new Uint8ClampedArray(ctx.getImageData(0, 0, img.width, img.height).data), img.width, img.height);
    if (!code) return null;
    const payload = JSON.parse(Buffer.from(code.data.split('.')[1] || '', 'base64url').toString('utf8')) as { data?: string };
    const d = JSON.parse(payload.data || '{}') as Record<string, unknown>;
    if (!d.Irn) return null;
    return {
      raw: code.data,
      sellerGstin: String(d.SellerGstin || ''),
      buyerGstin: String(d.BuyerGstin || ''),
      docNo: String(d.DocNo || ''),
      docDate: String(d.DocDt || ''),
      total: Number(d.TotInvVal) || 0,
      itemCount: Number(d.ItemCnt) || 0,
      irn: String(d.Irn),
      irnDate: String(d.IrnDt || ''),
    };
  } catch {
    return null;
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
  // The text layer can print a label after its value ("7011459368SAP Doc no.").
  const sapDoc = text.match(/(\d{8,12})\s*SAP Doc no\./i) || text.match(/SAP Doc no\.\s*(\d{8,12})/i);
  const delivery = text.match(/Delivery no\.\s*(\d+)/i);
  const salesOrder = text.match(/Sales Order\s*(\d+)/i);
  const irn = text.match(/IRN\s*:\s*([0-9a-f]{20,64})\s*([0-9a-f]{0,64})/i);

  const lines: InvoiceLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i].match(ITEM);
    if (!item) continue;
    const line: InvoiceLine = { materialCode: item[1], description: item[2].trim(), quantity: num(item[3]), kgPerUnit: null, tonneRate: null, taxable: 0, taxRate: 0, hsnCode: item[4] || '' };
    for (let j = i + 1; j < rows.length && !ITEM.test(rows[j]); j++) {
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
  const provisional = text.match(/Provisional Balance[^:]*:\s*([\d,]+\.\d+)\s*-?\s*\(\s*(CR|DR)\s*\)/i);
  return {
    format: 'IOCL',
    invoiceNo: rows.find((r) => /^[A-Z]{2}\d{8,12}$/.test(r)) ?? null,
    sapDocNo: sapDoc ? sapDoc[1] : null,
    deliveryNo: delivery ? delivery[1] : null,
    salesOrderNo: salesOrder ? salesOrder[1] : null,
    irn: irn ? `${irn[1]}${irn[2]}`.toLowerCase() : null,
    date: date && month ? `${year}-${month}-${date[1]}` : null,
    vehicleNumber: truck ? truck[1] : null,
    supplierGstin,
    supplierName: `Indian Oil Corporation Ltd${plant ? ` - ${plant[1].trim()}` : ''}`,
    supplierAddress: at >= 0 ? [rows[at], pin ? `${pin[1]} ${pin[2]}` : ''].filter(Boolean).join(', ') : '',
    supplierCity: pin ? pin[1] : '',
    lines,
    total: total ? num(total[1]) : null,
    plantBalance: provisional ? (provisional[2].toUpperCase() === 'CR' ? 1 : -1) * num(provisional[1]) : null,
  };
}

/**
 * Does the signed QR agree with the printed invoice? Returns the problems
 * found (empty = genuine and consistent).
 */
export function checkAgainstQr(inv: ParsedInvoice, qr: EinvoiceQr | null) {
  if (!qr) return ['The e-invoice QR could not be read — check the PDF is the original from the plant.'];
  const problems: string[] = [];
  if (inv.invoiceNo && qr.docNo !== inv.invoiceNo) problems.push(`QR invoice no. ${qr.docNo} ≠ printed ${inv.invoiceNo}.`);
  if (inv.supplierGstin && qr.sellerGstin !== inv.supplierGstin) problems.push(`QR seller GSTIN ${qr.sellerGstin} ≠ printed ${inv.supplierGstin}.`);
  if (inv.irn && qr.irn.toLowerCase() !== inv.irn) problems.push('QR IRN does not match the IRN printed on the invoice.');
  if (inv.total != null && Math.abs(qr.total - inv.total) > 1) problems.push(`QR total ₹${qr.total} ≠ printed ₹${inv.total}.`);
  if (qr.itemCount && qr.itemCount !== inv.lines.length) problems.push(`QR has ${qr.itemCount} items, the invoice ${inv.lines.length}.`);
  const [d, m, y] = qr.docDate.split('/');
  if (inv.date && y && `${y}-${m}-${d}` !== inv.date) problems.push(`QR date ${qr.docDate} ≠ printed date.`);
  return problems;
}
