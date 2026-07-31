import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_INVOICES,
  INITIAL_UNITS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_TAXES,
  INITIAL_BANKS,
  INITIAL_STAFF,
  INITIAL_ACCOUNTS,
  INITIAL_COMPANIES,
  INITIAL_EXPENSES,
  INITIAL_INCOMES,
  INITIAL_PAYMENTS,
  INITIAL_BOM,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASES,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_SALE_ORDERS,
  INITIAL_SALES_RETURNS,
  INITIAL_CHALLANS,
  INITIAL_QUOTATIONS,
  INITIAL_ADJUSTMENTS,
  INITIAL_BRANCH_TRANSFERS,
  INITIAL_CUSTOMER_LEDGER,
  INITIAL_COMPANY_LEDGER,
  INITIAL_BANK_BOOK,
  INITIAL_EMPLOYEE_LEDGER,
  INITIAL_EXPENSES_LEDGER,
  INITIAL_INCOMES_LEDGER,
  INITIAL_PAYMENT_LEDGER,
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOG,
} from '../lib/mockData';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_BOOK_TYPES = [
  'BANK BOOK',
  'CASH BOOK',
  'NON-PAYMENT BOOK',
  'LOAN ACCOUNT',
  'OD / CC ACCOUNT',
  'PETTY CASH BOOK',
];

async function main() {
  await prisma.unit.createMany({ data: INITIAL_UNITS, skipDuplicates: true });
  await prisma.category.createMany({ data: INITIAL_CATEGORIES, skipDuplicates: true });
  await prisma.brand.createMany({ data: INITIAL_BRANDS, skipDuplicates: true });
  await prisma.tax.createMany({ data: INITIAL_TAXES, skipDuplicates: true });
  await prisma.bank.createMany({ data: INITIAL_BANKS, skipDuplicates: true });
  await prisma.bookType.createMany({
    data: DEFAULT_BOOK_TYPES.map((name) => ({ name })),
    skipDuplicates: true,
  });
  await prisma.employee.createMany({ data: INITIAL_STAFF, skipDuplicates: true });
  await prisma.account.createMany({ data: INITIAL_ACCOUNTS, skipDuplicates: true });
  await prisma.company.createMany({ data: INITIAL_COMPANIES, skipDuplicates: true });
  await prisma.expense.createMany({ data: INITIAL_EXPENSES, skipDuplicates: true });
  await prisma.income.createMany({ data: INITIAL_INCOMES, skipDuplicates: true });
  await prisma.paymentModeMaster.createMany({
    data: INITIAL_PAYMENTS.map((p) => ({
      id: p.id,
      modeName: p.modeName,
      linkedAccount: p.linkedAccount,
      transactionFeePercent: p.transactionFeePercent,
      active: p.active,
    })),
    skipDuplicates: true,
  });

  for (const bom of INITIAL_BOM) {
    await prisma.bom.upsert({
      where: { id: bom.id },
      create: {
        id: bom.id,
        finishedGoodId: bom.finishedGoodId,
        finishedGoodName: bom.finishedGoodName,
        bomCode: bom.bomCode,
        laborCost: bom.laborCost,
        totalCost: bom.totalCost,
        active: bom.active ?? true,
        components: {
          create: bom.components.map((c) => ({
            productId: c.productId,
            productName: c.productName,
            productCode: c.productCode,
            quantity: c.quantity,
            unit: c.unit,
            unitCost: c.unitCost,
            mrp: c.mrp,
            salePrice: c.salePrice,
            wholesalePrice: c.wholesalePrice,
            image: c.image,
            customValues: c.customValues,
          })),
        },
      },
      update: {},
    });
  }

  await prisma.purchaseOrder.createMany({ data: INITIAL_PURCHASE_ORDERS, skipDuplicates: true });
  await prisma.purchaseInvoice.createMany({ data: INITIAL_PURCHASES, skipDuplicates: true });
  await prisma.returnDocument.createMany({
    data: INITIAL_PURCHASE_RETURNS.map((r) => ({ ...r, kind: 'Purchase' })),
    skipDuplicates: true,
  });
  await prisma.saleOrder.createMany({ data: INITIAL_SALE_ORDERS, skipDuplicates: true });
  await prisma.returnDocument.createMany({
    data: INITIAL_SALES_RETURNS.map((r) => ({ ...r, kind: 'Sales' })),
    skipDuplicates: true,
  });
  await prisma.deliveryChallan.createMany({ data: INITIAL_CHALLANS, skipDuplicates: true });
  await prisma.quotation.createMany({ data: INITIAL_QUOTATIONS, skipDuplicates: true });
  await prisma.stockAdjustment.createMany({ data: INITIAL_ADJUSTMENTS, skipDuplicates: true });
  await prisma.branchStockTransfer.createMany({ data: INITIAL_BRANCH_TRANSFERS, skipDuplicates: true });

  const ledgerBuckets: [string, typeof INITIAL_CUSTOMER_LEDGER][] = [
    ['customer', INITIAL_CUSTOMER_LEDGER],
    ['company', INITIAL_COMPANY_LEDGER],
    ['bank', INITIAL_BANK_BOOK],
    ['employee', INITIAL_EMPLOYEE_LEDGER],
    ['expenses', INITIAL_EXPENSES_LEDGER],
    ['incomes', INITIAL_INCOMES_LEDGER],
    ['payment', INITIAL_PAYMENT_LEDGER],
  ];
  for (const [ledgerType, entries] of ledgerBuckets) {
    await prisma.ledgerEntry.createMany({
      data: entries.map((e) => ({ ...e, ledgerType })),
      skipDuplicates: true,
    });
  }

  await prisma.attendance.createMany({ data: INITIAL_ATTENDANCE, skipDuplicates: true });
  await prisma.auditLog.createMany({ data: INITIAL_AUDIT_LOG, skipDuplicates: true });
  await prisma.customer.createMany({
    data: INITIAL_CUSTOMERS.map((c) => ({ ...c, tags: c.tags ?? [] })),
    skipDuplicates: true,
  });
  await prisma.product.createMany({
    data: INITIAL_PRODUCTS.map((p) => ({ ...p, productTags: p.productTags ?? [] })),
    skipDuplicates: true,
  });

  for (const inv of INITIAL_INVOICES) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      create: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        dueDate: inv.dueDate,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerGstin: inv.customerGstin,
        customerPhone: inv.customerPhone,
        salesmanId: inv.salesmanId,
        salesmanName: inv.salesmanName,
        subTotal: inv.subTotal,
        totalDiscount: inv.totalDiscount,
        totalCgst: inv.totalCgst,
        totalSgst: inv.totalSgst,
        totalIgst: inv.totalIgst,
        roundOff: inv.roundOff,
        grandTotal: inv.grandTotal,
        paymentMode: inv.paymentMode,
        bankAccountId: inv.bankAccountId,
        status: inv.status,
        isIgst: inv.isIgst,
        notes: inv.notes,
        items: {
          create: inv.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            hsnCode: it.hsnCode,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            mrp: it.mrp,
            discountPercent: it.discountPercent,
            taxRate: it.taxRate,
            taxableAmount: it.taxableAmount,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
      update: {},
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
