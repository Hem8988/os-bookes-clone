import { prisma } from '@/lib/db';
import type { Tx } from '@/lib/db';
import { audit, Actor } from '../audit';
import { badRequest, notFound } from '../http';
import { getSetting } from '../settings';

// E-invoice (IRP, schema 1.1) and e-way bill (bulk JSON 1.0.0621) files built
// from DeskShark invoices. Without GSP / IRP API credentials the files are
// uploaded on the portals (einvoice1.gst.gov.in bulk tool, ewaybillgst.gov.in
// → Generate bulk); the IRN, Ack no. and signed QR the portal returns are then
// saved back on the invoice and printed on it.

type Inv = Awaited<ReturnType<typeof loadInvoices>>[number];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const pinOf = (s?: string | null) => Number(/\b(\d{6})\b/.exec(s || '')?.[1] || 0);
const uqc = (unit: string) => (/kg/i.test(unit) ? 'KGS' : /ltr|litre/i.test(unit) ? 'LTR' : 'NOS');
const clip = (s: string | null | undefined, n: number) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const lines = (address: string) => {
  const a = clip(address, 200);
  return { Addr1: a.slice(0, 100) || 'NA', ...(a.length > 100 ? { Addr2: a.slice(100, 200) } : {}) };
};

async function loadInvoices(tenantId: string, ids: string[]) {
  const invoices = await prisma.invoice.findMany({ where: { tenantId, id: { in: ids }, status: { not: 'Cancelled' } }, include: { items: true }, orderBy: [{ date: 'asc' }, { invoiceNumber: 'asc' }] });
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: invoices.map((i) => i.customerId) } } });
  const deliveries = await prisma.delivery.findMany({ where: { tenantId, id: { in: invoices.map((i) => i.deliveryId).filter(Boolean) as string[] } }, select: { id: true, deliveryBoyId: true } });
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId, active: true, driverUserId: { in: deliveries.map((d) => d.deliveryBoyId) } } });
  return invoices.map((i) => {
    const customer = customers.find((c) => c.id === i.customerId) || null;
    const boy = deliveries.find((d) => d.id === i.deliveryId)?.deliveryBoyId;
    return { ...i, customer, vehicleNo: vehicles.find((v) => v.driverUserId === boy)?.number || null };
  });
}

/** Invoices in a period with their e-invoice / e-way bill state. */
export async function einvoiceList(tenantId: string, from: string, to: string) {
  const invoices = await prisma.invoice.findMany({ where: { tenantId, date: { gte: from, lte: to }, status: { not: 'Cancelled' } }, orderBy: [{ date: 'desc' }, { invoiceNumber: 'desc' }], select: { id: true, invoiceNumber: true, date: true, customerName: true, customerGstin: true, grandTotal: true, isIgst: true, extra: true } });
  return invoices.map((i) => {
    const x = (i.extra as Record<string, unknown> | null) || {};
    return { id: i.id, invoiceNumber: i.invoiceNumber, date: i.date, customerName: i.customerName, gstin: i.customerGstin || '', b2b: !!i.customerGstin, grandTotal: i.grandTotal, isIgst: i.isIgst, irn: (x.irn as string) || '', ackNo: (x.ackNo as string) || '', ackDate: (x.ackDate as string) || '', hasQr: !!x.signedQr, ewbDate: (x.ewbDate as string) || '', ewbNo: (x.ewbNo as string) || '', ewbValidUpto: (x.ewbValidUpto as string) || '' };
  });
}

function problems(inv: Inv, company: Awaited<ReturnType<typeof getSetting<'company'>>>, kind: 'einvoice' | 'ewaybill') {
  const out: string[] = [];
  if (!/^\d{2}[A-Z0-9]{13}$/.test(company.gstin)) out.push('Company GSTIN is missing (Settings → Company)');
  if (!pinOf(company.pincode || company.address)) out.push('Company PIN code is missing (Settings → Company)');
  if (kind === 'einvoice' && !inv.customerGstin) out.push('Customer has no GSTIN — e-invoice is only for B2B');
  if (!pinOf(inv.customer?.pincode || inv.customer?.address)) out.push(`PIN code missing for ${inv.customerName}`);
  if (inv.items.some((it) => !/^\d{4,8}$/.test(it.hsnCode || ''))) out.push('An item has no valid HSN code');
  return out;
}

/** IRP e-invoice JSON (array, one object per invoice). */
export async function buildEinvoiceJson(tenantId: string, ids: string[]) {
  const [company, invoices] = await Promise.all([getSetting(tenantId, 'company'), loadInvoices(tenantId, ids)]);
  const errors: { invoiceNumber: string; problems: string[] }[] = [];
  const docs: unknown[] = [];
  for (const inv of invoices) {
    const p = problems(inv, company, 'einvoice');
    if (p.length) {
      errors.push({ invoiceNumber: inv.invoiceNumber, problems: p });
      continue;
    }
    const c = inv.customer!;
    const buyerState = (inv.customerGstin || '').slice(0, 2) || c.stateCode || company.stateCode;
    docs.push({
      Version: '1.1',
      TranDtls: { TaxSch: 'GST', SupTyp: c.isSezParty ? 'SEZWOP' : 'B2B', RegRev: 'N', IgstOnIntra: 'N' },
      DocDtls: { Typ: 'INV', No: inv.invoiceNumber.slice(0, 16), Dt: dmy(inv.date) },
      SellerDtls: { Gstin: company.gstin, LglNm: clip(company.legalName || company.name, 100), TrdNm: clip(company.name, 100), ...lines(company.address), Loc: clip(company.city || 'NA', 50), Pin: pinOf(company.pincode || company.address), Stcd: company.gstin.slice(0, 2), ...(company.phone ? { Ph: company.phone.replace(/\D/g, '').slice(-12) } : {}), ...(company.email ? { Em: company.email } : {}) },
      BuyerDtls: { Gstin: inv.customerGstin, LglNm: clip(c.name, 100), ...(c.tradeName ? { TrdNm: clip(c.tradeName, 100) } : {}), Pos: buyerState, ...lines(c.address), Loc: clip(c.city || c.area || 'NA', 50), Pin: pinOf(c.pincode || c.address), Stcd: buyerState, ...(c.phone ? { Ph: c.phone.replace(/\D/g, '').slice(-12) } : {}) },
      ItemList: inv.items.map((it, n) => {
        const gross = r2(it.quantity * it.unitPrice);
        return { SlNo: String(n + 1), PrdDesc: clip(it.productName, 300), IsServc: 'N', HsnCd: it.hsnCode, Qty: it.quantity, Unit: uqc(it.unit), UnitPrice: r2(it.unitPrice), TotAmt: gross, Discount: r2(Math.max(0, gross - it.taxableAmount)), AssAmt: r2(it.taxableAmount), GstRt: it.taxRate, IgstAmt: r2(it.igstAmount), CgstAmt: r2(it.cgstAmount), SgstAmt: r2(it.sgstAmount), CesRt: 0, CesAmt: 0, TotItemVal: r2(it.totalAmount) };
      }),
      ValDtls: { AssVal: r2(inv.items.reduce((s, it) => s + it.taxableAmount, 0)), CgstVal: r2(inv.totalCgst), SgstVal: r2(inv.totalSgst), IgstVal: r2(inv.totalIgst), CesVal: 0, Discount: 0, RndOffAmt: r2(inv.roundOff), TotInvVal: r2(inv.grandTotal) },
    });
  }
  return { json: docs, count: docs.length, errors };
}

/** E-way bill bulk-generation JSON. Vehicle no. comes from the delivery boy's vehicle, else the one given. */
export async function buildEwayJson(tenantId: string, ids: string[], opts: { vehicleNo?: string | null; distanceKm?: number }) {
  const [company, invoices] = await Promise.all([getSetting(tenantId, 'company'), loadInvoices(tenantId, ids)]);
  const errors: { invoiceNumber: string; problems: string[] }[] = [];
  const billLists: unknown[] = [];
  for (const inv of invoices) {
    const p = problems(inv, company, 'ewaybill');
    const vehicleNo = (inv.vehicleNo || opts.vehicleNo || '').replace(/[\s-]/g, '').toUpperCase();
    if (!vehicleNo) p.push('No vehicle — assign a vehicle to the delivery boy or type one');
    if (p.length) {
      errors.push({ invoiceNumber: inv.invoiceNumber, problems: p });
      continue;
    }
    const c = inv.customer!;
    const toState = Number((inv.customerGstin || '').slice(0, 2) || c.stateCode || company.stateCode);
    const fromState = Number(company.gstin.slice(0, 2));
    billLists.push({
      userGstin: company.gstin,
      supplyType: 'O',
      subSupplyType: 1,
      subSupplyDesc: '',
      docType: 'INV',
      docNo: inv.invoiceNumber.slice(0, 16),
      docDate: dmy(inv.date),
      transType: 1,
      fromGstin: company.gstin,
      fromTrdName: clip(company.legalName || company.name, 100),
      fromAddr1: clip(company.address, 120) || 'NA',
      fromAddr2: '',
      fromPlace: clip(company.city || 'NA', 50),
      fromPincode: pinOf(company.pincode || company.address),
      fromStateCode: fromState,
      actualFromStateCode: fromState,
      toGstin: inv.customerGstin || 'URP',
      toTrdName: clip(c.name, 100),
      toAddr1: clip(c.address, 120) || 'NA',
      toAddr2: '',
      toPlace: clip(c.city || c.area || 'NA', 50),
      toPincode: pinOf(c.pincode || c.address),
      toStateCode: toState,
      actualToStateCode: toState,
      totalValue: r2(inv.items.reduce((s, it) => s + it.taxableAmount, 0)),
      cgstValue: r2(inv.totalCgst),
      sgstValue: r2(inv.totalSgst),
      igstValue: r2(inv.totalIgst),
      cessValue: 0,
      cessNonAdvolValue: 0,
      otherValue: r2(inv.roundOff),
      totInvValue: r2(inv.grandTotal),
      transMode: 1,
      transDistance: Math.max(0, Math.round(opts.distanceKm || 0)),
      transporterName: '',
      transporterId: '',
      transDocNo: '',
      transDocDate: '',
      vehicleNo,
      vehicleType: 'R',
      itemList: inv.items.map((it, n) => ({ itemNo: n + 1, productName: clip(it.productName, 100), productDesc: clip(it.productName, 100), hsnCode: Number(it.hsnCode), quantity: it.quantity, qtyUnit: uqc(it.unit), taxableAmount: r2(it.taxableAmount), sgstRate: inv.isIgst ? 0 : it.taxRate / 2, cgstRate: inv.isIgst ? 0 : it.taxRate / 2, igstRate: inv.isIgst ? it.taxRate : 0, cessRate: 0, cessNonAdvol: 0 })),
    });
  }
  return { json: { version: '1.0.0621', billLists }, count: billLists.length, errors };
}

/** Save what the IRP / EWB portal returned, so it prints on the invoice. */
export async function saveEinvoiceDetails(tx: Tx, actor: Actor, invoiceId: string, input: { irn?: string | null; ackNo?: string | null; ackDate?: string | null; signedQr?: string | null; ewbNo?: string | null; ewbDate?: string | null; ewbValidUpto?: string | null }) {
  const inv = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!inv) throw notFound('Invoice not found.');
  const irn = input.irn?.trim() || '';
  if (irn && !/^[0-9a-f]{64}$/i.test(irn)) throw badRequest('The IRN is the 64-character code the e-invoice portal shows.');
  if (input.ewbNo && !/^\d{12}$/.test(input.ewbNo.trim())) throw badRequest('The e-way bill number has 12 digits.');
  const extra = { ...((inv.extra as Record<string, unknown> | null) || {}) };
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const val = typeof v === 'string' ? v.trim() : v;
    if (val) extra[k] = val;
    else delete extra[k];
  }
  await tx.invoice.update({ where: { id: inv.id }, data: { extra: extra as object } });
  await audit(tx, actor, { action: 'EINVOICE_DETAILS_SAVED', entityType: 'Invoice', entityId: inv.id, reference: inv.invoiceNumber, newValue: { irn: extra.irn, ackNo: extra.ackNo, ewbNo: extra.ewbNo } });
}
