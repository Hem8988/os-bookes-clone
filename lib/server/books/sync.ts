import { prisma } from '@/lib/db';
import type { Invoice, LedgerEntry, Payment } from '@/lib/generated/prisma/client';
import { bankAccount, ensureChart, expenseAccount, partyAccount, systemAccount, walletAccount } from './accounts';
import { cancelSourceVoucher, VoucherLineInput, writeVoucher } from './vouchers';

// Turns business documents into double-entry vouchers. Idempotent: every
// source produces exactly one voucher (sourceType + sourceId), rewritten when
// the source changes and cancelled when the source is cancelled.
//
//   customer ledger line  → Sales / Receipt / Journal / Credit Note
//   approved cash handover → Contra (delivery-boy cash → receiver's cash)
//   purchase bill          → Purchase
//   credit note (ledger)   → Credit Note; refund → Payment
//   debit note             → Debit Note
//   expense entry          → Payment (paid) / Journal (on credit)

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Split an amount of an invoice into sales / GST / round off in the invoice's own proportions. */
function splitInvoice(inv: Invoice, amount: number) {
  const ratio = inv.grandTotal ? amount / inv.grandTotal : 0;
  const cgst = r2(inv.totalCgst * ratio);
  const sgst = r2(inv.totalSgst * ratio);
  const igst = r2(inv.totalIgst * ratio);
  const roundOff = r2(inv.roundOff * ratio);
  const sales = r2(amount - cgst - sgst - igst - roundOff);
  return { sales, cgst, sgst, igst, roundOff };
}

async function salesLines(tenantId: string, inv: Invoice, amount: number, partyId: string, sign: 1 | -1): Promise<VoucherLineInput[]> {
  const s = splitInvoice(inv, amount);
  const [sales, ocgst, osgst, oigst, round] = await Promise.all([
    systemAccount(prisma, tenantId, 'SALES'),
    systemAccount(prisma, tenantId, 'OUTPUT_CGST'),
    systemAccount(prisma, tenantId, 'OUTPUT_SGST'),
    systemAccount(prisma, tenantId, 'OUTPUT_IGST'),
    systemAccount(prisma, tenantId, 'ROUND_OFF'),
  ]);
  // sign  1: party Dr, income Cr (sale)   sign −1: reversed (credit note)
  const cr = (n: number) => (sign === 1 ? { credit: n } : { debit: n });
  const dr = (n: number) => (sign === 1 ? { debit: n } : { credit: n });
  return [
    { accountId: partyId, ...dr(amount) },
    { accountId: sales.id, ...cr(s.sales) },
    { accountId: ocgst.id, ...cr(s.cgst) },
    { accountId: osgst.id, ...cr(s.sgst) },
    { accountId: oigst.id, ...cr(s.igst) },
    // Round off added to the bill is income-side (credit); a negative one is a debit.
    { accountId: round.id, ...cr(s.roundOff) },
  ];
}

/** The cash / bank ledger a customer payment landed in. */
async function moneyAccountFor(tenantId: string, payment: Payment, invoice: Invoice | null) {
  if (payment.mode === 'CASH') {
    const walletTx =
      (await prisma.cashWalletTransaction.findFirst({ where: { referenceType: 'PAYMENT', referenceId: payment.id }, include: { wallet: true } })) ||
      (payment.deliveryId
        ? await prisma.cashWalletTransaction.findFirst({ where: { referenceType: 'DELIVERY', referenceId: payment.deliveryId, amount: { gt: 0 } }, include: { wallet: true }, orderBy: { createdAt: 'desc' } })
        : null);
    if (walletTx) return walletAccount(prisma, walletTx.wallet);
    return systemAccount(prisma, tenantId, 'CASH');
  }
  if (invoice?.bankAccountId) {
    const bank = await prisma.bank.findFirst({ where: { id: invoice.bankAccountId, tenantId } });
    if (bank) return bankAccount(prisma, bank);
  }
  const first = await prisma.bank.findFirst({ where: { tenantId }, orderBy: { accountName: 'asc' } });
  return first ? bankAccount(prisma, first) : systemAccount(prisma, tenantId, 'BANK');
}

async function syncCustomerLedger(tenantId: string) {
  const done = await prisma.accountVoucher.findMany({ where: { tenantId, sourceType: 'CUSTOMER_LEDGER' }, select: { sourceId: true } });
  const seen = new Set(done.map((d) => d.sourceId));
  const entries = (await prisma.ledgerEntry.findMany({ where: { tenantId, ledgerType: 'CUSTOMER', NOT: { entryType: 'OPENING' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).filter((e) => !seen.has(e.id));
  let posted = 0;
  for (const e of entries) {
    await postLedgerEntry(tenantId, e);
    posted++;
  }
  return posted;
}

/** Credit note lines: Dr Sales Returns + output GST, Cr party (sign −1 reverses a cancelled note). */
async function creditNoteLines(tenantId: string, note: { subTotal: number; totalCgst: number; totalSgst: number; totalIgst: number; roundOff: number; grandTotal: number }, partyId: string, sign: 1 | -1): Promise<VoucherLineInput[]> {
  const [ret, ocgst, osgst, oigst, round] = await Promise.all([
    systemAccount(prisma, tenantId, 'SALES_RETURN'),
    systemAccount(prisma, tenantId, 'OUTPUT_CGST'),
    systemAccount(prisma, tenantId, 'OUTPUT_SGST'),
    systemAccount(prisma, tenantId, 'OUTPUT_IGST'),
    systemAccount(prisma, tenantId, 'ROUND_OFF'),
  ]);
  const dr = (n: number) => (sign === 1 ? { debit: n } : { credit: n });
  const cr = (n: number) => (sign === 1 ? { credit: n } : { debit: n });
  return [
    { accountId: ret.id, ...dr(note.subTotal) },
    { accountId: ocgst.id, ...dr(note.totalCgst) },
    { accountId: osgst.id, ...dr(note.totalSgst) },
    { accountId: oigst.id, ...dr(note.totalIgst) },
    { accountId: round.id, ...dr(note.roundOff) },
    { accountId: partyId, ...cr(note.grandTotal) },
  ];
}

async function postLedgerEntry(tenantId: string, e: LedgerEntry) {
  const customer = e.customerId ? await prisma.customer.findFirst({ where: { id: e.customerId, tenantId } }) : null;
  const party = customer ? await partyAccount(prisma, customer) : await systemAccount(prisma, tenantId, 'SUSPENSE');
  const amount = r2(e.debit || e.credit);
  const base = { tenantId, date: e.date, partyName: e.accountName, narration: e.particulars, sourceType: 'CUSTOMER_LEDGER', sourceId: e.id, createdBy: e.createdBy };
  const invoice = e.referenceType === 'INVOICE' && e.referenceId ? await prisma.invoice.findFirst({ where: { id: e.referenceId } }) : null;
  const payment = e.referenceType === 'PAYMENT' && e.referenceId ? await prisma.payment.findFirst({ where: { id: e.referenceId } }) : null;

  if ((e.referenceType === 'CREDIT_NOTE' || e.referenceType === 'CREDIT_NOTE_REFUND') && e.referenceId) {
    const note = await prisma.creditNote.findFirst({ where: { id: e.referenceId } });
    if (note && e.referenceType === 'CREDIT_NOTE') {
      return writeVoucher(prisma, { ...base, voucherType: e.entryType === 'REVERSAL' ? 'JOURNAL' : 'CREDIT_NOTE', lines: await creditNoteLines(tenantId, note, party.id, e.entryType === 'REVERSAL' ? -1 : 1) });
    }
    if (note) {
      const money = (note.refundAccountId && (await prisma.ledgerAccount.findFirst({ where: { id: note.refundAccountId, tenantId } }))) || (await systemAccount(prisma, tenantId, note.refundMode === 'BANK' ? 'BANK' : 'CASH'));
      return writeVoucher(prisma, { ...base, voucherType: 'PAYMENT', lines: [{ accountId: party.id, debit: amount }, { accountId: money.id, credit: amount }] });
    }
  }
  if (invoice && e.entryType === 'INVOICE') {
    return writeVoucher(prisma, { ...base, voucherType: 'SALES', narration: `${invoice.invoiceNumber} · ${e.particulars}`, lines: await salesLines(tenantId, invoice, amount, party.id, 1) });
  }
  if (invoice && (e.entryType === 'REVERSAL' || (e.entryType === 'ADJUSTMENT' && e.credit > 0))) {
    return writeVoucher(prisma, { ...base, voucherType: 'CREDIT_NOTE', lines: await salesLines(tenantId, invoice, amount, party.id, -1) });
  }
  if (invoice && e.entryType === 'ADJUSTMENT') {
    return writeVoucher(prisma, { ...base, voucherType: 'JOURNAL', lines: await salesLines(tenantId, invoice, amount, party.id, 1) });
  }
  if (payment) {
    const linkedInvoice = payment.invoiceId ? await prisma.invoice.findFirst({ where: { id: payment.invoiceId } }) : null;
    const money = await moneyAccountFor(tenantId, payment, linkedInvoice);
    const note = `${payment.paymentNumber} · ${e.particulars}`;
    if (e.credit > 0) {
      return writeVoucher(prisma, { ...base, voucherType: 'RECEIPT', narration: note, lines: [{ accountId: money.id, debit: amount }, { accountId: party.id, credit: amount }] });
    }
    return writeVoucher(prisma, { ...base, voucherType: 'PAYMENT', narration: note, lines: [{ accountId: party.id, debit: amount }, { accountId: money.id, credit: amount }] });
  }
  // Manual adjustments (approved) and anything unrecognised.
  const other = await systemAccount(prisma, tenantId, e.referenceType === 'CHEQUE_BOUNCE' ? 'BOUNCE_CHARGES' : e.referenceType === 'TDS' ? 'TDS_RECEIVABLE' : e.entryType === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'SUSPENSE');
  return writeVoucher(prisma, {
    ...base,
    voucherType: 'JOURNAL',
    lines: e.debit > 0 ? [{ accountId: party.id, debit: amount }, { accountId: other.id, credit: amount }] : [{ accountId: other.id, debit: amount }, { accountId: party.id, credit: amount }],
  });
}

async function syncCashSubmissions(tenantId: string) {
  const done = await prisma.accountVoucher.findMany({ where: { tenantId, sourceType: 'CASH_SUBMISSION' }, select: { sourceId: true } });
  const seen = new Set(done.map((d) => d.sourceId));
  const subs = (await prisma.cashSubmission.findMany({ where: { tenantId, status: 'APPROVED' } })).filter((s) => !seen.has(s.id));
  for (const s of subs) {
    const txs = await prisma.cashWalletTransaction.findMany({ where: { referenceId: s.id }, include: { wallet: true } });
    const lines: VoucherLineInput[] = [];
    for (const t of txs) {
      const acc = await walletAccount(prisma, t.wallet);
      lines.push(t.amount > 0 ? { accountId: acc.id, debit: t.amount } : { accountId: acc.id, credit: -t.amount });
    }
    if (lines.length < 2) {
      const boy = await prisma.cashWallet.findFirst({ where: { tenantId, ownerType: 'DELIVERY_BOY', ownerId: s.deliveryBoyId } });
      const from = boy ? await walletAccount(prisma, boy) : await systemAccount(prisma, tenantId, 'SUSPENSE');
      const to = await systemAccount(prisma, tenantId, 'CASH');
      lines.splice(0, lines.length, { accountId: to.id, debit: s.amount }, { accountId: from.id, credit: s.amount });
    }
    // Same wallet on both sides (handover inside one wallet) nets to nothing.
    const net = new Map<string, number>();
    lines.forEach((l) => net.set(l.accountId, r2((net.get(l.accountId) || 0) + (l.debit || 0) - (l.credit || 0))));
    const final = [...net.entries()].filter(([, v]) => v !== 0).map(([accountId, v]) => (v > 0 ? { accountId, debit: v } : { accountId, credit: -v }));
    if (final.length < 2) continue;
    await writeVoucher(prisma, {
      tenantId,
      voucherType: 'CONTRA',
      date: s.date,
      partyName: s.deliveryBoyName,
      narration: `${s.submissionNumber} · cash from ${s.deliveryBoyName} to ${s.receiverName}`,
      sourceType: 'CASH_SUBMISSION',
      sourceId: s.id,
      createdBy: s.verifiedBy || s.receiverName,
      lines: final,
    });
  }
}

async function syncPurchaseBills(tenantId: string) {
  const bills = await prisma.purchaseBill.findMany({ where: { tenantId } });
  const vouchers = await prisma.accountVoucher.findMany({ where: { tenantId, sourceType: 'PURCHASE_BILL' }, select: { sourceId: true, sourceStamp: true, cancelled: true } });
  const byId = new Map(vouchers.map((v) => [v.sourceId, v]));
  for (const b of bills) {
    const stamp = b.updatedAt.toISOString();
    const v = byId.get(b.id);
    if (b.status === 'Cancelled') {
      if (v && !v.cancelled) await cancelSourceVoucher(prisma, tenantId, 'PURCHASE_BILL', b.id);
      continue;
    }
    if (v && v.sourceStamp === stamp && !v.cancelled) continue;
    const supplier = await prisma.customer.findFirst({ where: { id: b.supplierId, tenantId } });
    const party = supplier ? await partyAccount(prisma, supplier) : await systemAccount(prisma, tenantId, 'SUSPENSE');
    const [purchase, icgst, isgst, iigst, round] = await Promise.all([
      systemAccount(prisma, tenantId, 'PURCHASE'),
      systemAccount(prisma, tenantId, 'INPUT_CGST'),
      systemAccount(prisma, tenantId, 'INPUT_SGST'),
      systemAccount(prisma, tenantId, 'INPUT_IGST'),
      systemAccount(prisma, tenantId, 'ROUND_OFF'),
    ]);
    const tax = b.totalCgst + b.totalSgst + b.totalIgst;
    const lines: VoucherLineInput[] = b.itcEligible
      ? [
          { accountId: purchase.id, debit: b.subTotal },
          { accountId: icgst.id, debit: b.totalCgst },
          { accountId: isgst.id, debit: b.totalSgst },
          { accountId: iigst.id, debit: b.totalIgst },
        ]
      : [{ accountId: purchase.id, debit: r2(b.subTotal + tax) }];
    lines.push({ accountId: round.id, debit: b.roundOff });
    lines.push({ accountId: party.id, credit: b.grandTotal });
    await writeVoucher(prisma, {
      tenantId,
      voucherType: 'PURCHASE',
      date: b.date,
      partyName: b.supplierName,
      narration: `${b.billNumber} · supplier bill ${b.supplierInvoiceNo}${b.notes ? ` · ${b.notes}` : ''}`,
      sourceType: 'PURCHASE_BILL',
      sourceId: b.id,
      sourceStamp: stamp,
      createdBy: b.createdBy,
      lines,
    });
  }
}

async function syncExpenses(tenantId: string) {
  const entries = await prisma.expenseEntry.findMany({ where: { tenantId } });
  const vouchers = await prisma.accountVoucher.findMany({ where: { tenantId, sourceType: 'EXPENSE' }, select: { sourceId: true, sourceStamp: true, cancelled: true } });
  const byId = new Map(vouchers.map((v) => [v.sourceId, v]));
  for (const x of entries) {
    const stamp = x.updatedAt.toISOString();
    const v = byId.get(x.id);
    if (x.cancelled) {
      if (v && !v.cancelled) await cancelSourceVoucher(prisma, tenantId, 'EXPENSE', x.id);
      continue;
    }
    if (v && v.sourceStamp === stamp && !v.cancelled) continue;
    const head = await expenseAccount(prisma, tenantId, x.headName);
    // GST on an expense is claimable only with the supplier's GSTIN on the bill.
    const itc = x.gstAmount > 0 && !!x.supplierGstin;
    const lines: VoucherLineInput[] = [{ accountId: head.id, debit: itc ? x.amount : x.totalAmount }];
    if (itc) {
      if (x.isIgst) lines.push({ accountId: (await systemAccount(prisma, tenantId, 'INPUT_IGST')).id, debit: x.gstAmount });
      else {
        const half = r2(x.gstAmount / 2);
        lines.push({ accountId: (await systemAccount(prisma, tenantId, 'INPUT_CGST')).id, debit: half });
        lines.push({ accountId: (await systemAccount(prisma, tenantId, 'INPUT_SGST')).id, debit: r2(x.gstAmount - half) });
      }
    }
    let credit;
    if (x.paidFrom === 'CREDIT' && x.supplierId) {
      const supplier = await prisma.customer.findFirst({ where: { id: x.supplierId, tenantId } });
      credit = supplier ? await partyAccount(prisma, supplier) : await systemAccount(prisma, tenantId, 'SUSPENSE');
    } else if (x.paidAccountId) {
      credit = (await prisma.ledgerAccount.findFirst({ where: { id: x.paidAccountId, tenantId } })) || (await systemAccount(prisma, tenantId, x.paidFrom === 'BANK' ? 'BANK' : 'CASH'));
    } else {
      credit = await systemAccount(prisma, tenantId, x.paidFrom === 'BANK' ? 'BANK' : 'CASH');
    }
    lines.push({ accountId: credit.id, credit: x.totalAmount });
    await writeVoucher(prisma, {
      tenantId,
      voucherType: x.paidFrom === 'CREDIT' ? 'JOURNAL' : 'PAYMENT',
      date: x.date,
      partyName: x.supplierName || x.headName,
      narration: `${x.entryNumber} · ${x.headName}${x.description ? ` · ${x.description}` : ''}${x.billNumber ? ` · bill ${x.billNumber}` : ''}`,
      sourceType: 'EXPENSE',
      sourceId: x.id,
      sourceStamp: stamp,
      createdBy: x.createdBy,
      lines,
    });
  }
}

async function syncDebitNotes(tenantId: string) {
  const notes = await prisma.debitNote.findMany({ where: { tenantId } });
  const vouchers = await prisma.accountVoucher.findMany({ where: { tenantId, sourceType: 'DEBIT_NOTE' }, select: { sourceId: true, sourceStamp: true, cancelled: true } });
  const byId = new Map(vouchers.map((v) => [v.sourceId, v]));
  for (const n of notes) {
    const stamp = n.updatedAt.toISOString();
    const v = byId.get(n.id);
    if (n.status === 'Cancelled') {
      if (v && !v.cancelled) await cancelSourceVoucher(prisma, tenantId, 'DEBIT_NOTE', n.id);
      continue;
    }
    if (v && v.sourceStamp === stamp && !v.cancelled) continue;
    const supplier = await prisma.customer.findFirst({ where: { id: n.supplierId, tenantId } });
    const party = supplier ? await partyAccount(prisma, supplier) : await systemAccount(prisma, tenantId, 'SUSPENSE');
    const [ret, icgst, isgst, iigst, round] = await Promise.all([
      systemAccount(prisma, tenantId, 'PURCHASE_RETURN'),
      systemAccount(prisma, tenantId, 'INPUT_CGST'),
      systemAccount(prisma, tenantId, 'INPUT_SGST'),
      systemAccount(prisma, tenantId, 'INPUT_IGST'),
      systemAccount(prisma, tenantId, 'ROUND_OFF'),
    ]);
    const tax = n.totalCgst + n.totalSgst + n.totalIgst;
    // ITC reversed → the GST comes off input tax; otherwise it stays in the return value.
    const lines: VoucherLineInput[] = n.itcReversed
      ? [{ accountId: ret.id, credit: n.subTotal }, { accountId: icgst.id, credit: n.totalCgst }, { accountId: isgst.id, credit: n.totalSgst }, { accountId: iigst.id, credit: n.totalIgst }]
      : [{ accountId: ret.id, credit: r2(n.subTotal + tax) }];
    lines.push({ accountId: round.id, credit: n.roundOff });
    lines.push({ accountId: party.id, debit: n.grandTotal });
    await writeVoucher(prisma, {
      tenantId,
      voucherType: 'DEBIT_NOTE',
      date: n.date,
      partyName: n.supplierName,
      narration: `${n.noteNumber}${n.billNumber ? ` against ${n.billNumber} (supplier bill ${n.supplierInvoiceNo})` : ''} · ${n.reason.replace('_', ' ').toLowerCase()}${n.notes ? ` · ${n.notes}` : ''}`,
      sourceType: 'DEBIT_NOTE',
      sourceId: n.id,
      sourceStamp: stamp,
      createdBy: n.createdBy,
      lines,
    });
  }
}

let running: Promise<void> | null = null;

/** Bring the books up to date with every business document. Safe to call often. */
export function syncBooks(tenantId: string): Promise<void> {
  // One sync at a time per process; concurrent callers share it.
  if (!running) {
    running = (async () => {
      await ensureChart(prisma, tenantId);
      await syncCustomerLedger(tenantId);
      await syncCashSubmissions(tenantId);
      await syncPurchaseBills(tenantId);
      await syncExpenses(tenantId);
      await syncDebitNotes(tenantId);
    })().finally(() => {
      running = null;
    });
  }
  return running;
}
