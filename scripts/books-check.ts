// Books of accounts self-check: syncs the books and prints the key reports.
// Usage: npx tsx --env-file=.env scripts/books-check.ts [YYYY-MM]
import { writeFileSync } from 'fs';
import { monthRange } from '../lib/books';
import { prisma } from '../lib/db';
import { buildCaWorkbook, buildTallyMasters, buildTallyVouchers } from '../lib/server/books/capack';
import { balanceSheet, booksOverview, dayBook, gstr1, gstr3b, profitAndLoss, receivablesAgeing, stockSummary, trialBalance } from '../lib/server/books/reports';
import { syncBooks } from '../lib/server/books/sync';

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';
const month = process.argv[2] || new Date().toISOString().slice(0, 7);
const { from, to } = monthRange(month);

async function main() {
  const t0 = Date.now();
  await syncBooks(TENANT);
  console.log(`sync ${Date.now() - t0}ms`);
  const days = await dayBook(TENANT, from, to);
  console.log(`\nDay book ${from}..${to}: ${days.length} vouchers`);
  for (const v of days) {
    const dr = v.lines.reduce((s, l) => s + l.debit, 0);
    const cr = v.lines.reduce((s, l) => s + l.credit, 0);
    console.log(` ${v.voucherNumber} ${v.voucherType} ${v.date} ${v.cancelled ? '(cancelled) ' : ''}Dr ${dr.toFixed(2)} Cr ${cr.toFixed(2)} ${Math.abs(dr - cr) > 0.001 ? '❌ UNBALANCED' : '✓'}`);
    for (const l of v.lines) console.log(`     ${l.debit ? 'Dr' : 'Cr'} ${l.account.padEnd(32)} ${(l.debit || l.credit).toFixed(2)}`);
  }
  const tb = await trialBalance(TENANT, '2026-04-01', to);
  console.log(`\nTrial balance: Dr ${tb.totalDr} Cr ${tb.totalCr} opening diff ${tb.openingDifference}`);
  tb.groups.forEach((g) => console.log(` ${g.group}: ${g.closing}  ${g.accounts.map((a) => `${a.name}=${a.closing}`).join(', ')}`));
  const pl = await profitAndLoss(TENANT, from, to);
  console.log(`\nP&L: sales ${pl.totals.sales} purchases ${pl.totals.purchases} stock ${pl.trading.openingStock}→${pl.trading.closingStock} GP ${pl.grossProfit} NP ${pl.netProfit}`);
  const bs = await balanceSheet(TENANT, to);
  console.log(`Balance sheet: assets ${bs.assetsTotal} liabilities ${bs.liabilitiesTotal} opening diff ${bs.openingDifference}`);
  const g1 = await gstr1(TENANT, from, to);
  console.log(`GSTR-1: B2B ${g1.b2b.length} rows, B2C ${g1.b2c.length}, HSN ${g1.hsn.length}; totals ${JSON.stringify(g1.totals.all)}`);
  const g3 = await gstr3b(TENANT, from, to);
  console.log(`GSTR-3B: outward ${JSON.stringify(g3.outward)} payable ${g3.totalPayable}`);
  console.log('Ageing:', JSON.stringify(await receivablesAgeing(TENANT, to)));
  console.log('Stock:', (await stockSummary(TENANT, from, to)).map((p) => `${p.productName} ${p.openingFull}→${p.closingFull} (in ${p.inward}, sold ${p.sold}) = ₹${p.closingValue}`).join(' | '));
  console.log('Overview:', JSON.stringify(await booksOverview(TENANT, from, to)));
  const xlsx = await buildCaWorkbook(TENANT, month);
  const masters = await buildTallyMasters(TENANT, month);
  const tally = await buildTallyVouchers(TENANT, month);
  const out = process.env.OUT_DIR;
  if (out) {
    writeFileSync(`${out}/${xlsx.filename}`, xlsx.buffer);
    writeFileSync(`${out}/${tally.filename}`, tally.buffer);
    writeFileSync(`${out}/${masters.filename}`, masters.buffer);
  }
  console.log(`\nCA pack: ${xlsx.filename} ${xlsx.buffer.length} bytes · ${masters.filename} ${masters.buffer.length} bytes · ${tally.filename} ${tally.buffer.length} bytes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
