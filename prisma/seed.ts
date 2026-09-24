import 'dotenv/config';
import { randomBytes } from 'crypto';
import { prisma, transaction } from '../lib/db';
import { systemActor } from '../lib/server/audit';
import { createCustomer } from '../lib/server/customers';
import { adjustLocationStock, getDefaultWarehouse } from '../lib/server/inventory';
import { hashPassword } from '../lib/server/password';
import { saveSetting } from '../lib/server/settings';
import { DEFAULT_SETTINGS } from '../lib/settings';

// Seeds a working LPG distribution setup: one user per role, a godown with
// opening stock, 19 KG / 47.5 KG cylinders, routes and three sample customers.
// Safe to re-run: it does nothing once users exist.

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

const password = (envKey: string) => process.env[envKey] || `${randomBytes(6).toString('base64url')}9a`;

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log('Database already has users — seed skipped.');
    return;
  }
  const actor = systemActor(TENANT, 'Seed');

  await saveSetting(TENANT, 'company', { ...DEFAULT_SETTINGS.company, name: process.env.SEED_COMPANY_NAME || DEFAULT_SETTINGS.company.name }, 'Seed');

  const credentials = [
    { name: 'Super Admin', email: 'admin@deskshark.local', mobile: '9000000001', role: 'SUPER_ADMIN', password: password('SEED_ADMIN_PASSWORD') },
    { name: 'Operations Manager', email: 'manager@deskshark.local', mobile: '9000000002', role: 'MANAGER', password: password('SEED_MANAGER_PASSWORD') },
    { name: 'Accountant', email: 'accountant@deskshark.local', mobile: '9000000003', role: 'ACCOUNTANT', password: password('SEED_ACCOUNTANT_PASSWORD') },
    { name: 'Ramesh Kumar', email: 'ramesh@deskshark.local', mobile: '9000000004', role: 'DELIVERY_BOY', password: password('SEED_DRIVER_PASSWORD') },
    { name: 'Suresh Verma', email: 'suresh@deskshark.local', mobile: '9000000005', role: 'DELIVERY_BOY', password: password('SEED_DRIVER_PASSWORD') },
  ];
  const users: Record<string, string> = {};
  for (const c of credentials) {
    const user = await prisma.user.create({ data: { tenantId: TENANT, name: c.name, email: c.email, mobile: c.mobile, role: c.role, passwordHash: hashPassword(c.password) } });
    users[c.email] = user.id;
  }
  const ramesh = users['ramesh@deskshark.local'];
  const suresh = users['suresh@deskshark.local'];

  // Masters
  await prisma.tax.createMany({
    data: [5, 12, 18, 28].map((rate) => ({ tenantId: TENANT, name: `GST ${rate}%`, rate, cgst: rate / 2, sgst: rate / 2, igst: rate })),
  });
  await prisma.unit.createMany({ data: [{ tenantId: TENANT, code: 'PCS', name: 'Pieces', symbol: 'pcs' }, { tenantId: TENANT, code: 'KG', name: 'Kilogram', symbol: 'kg', isDecimalAllowed: true }] });
  await prisma.category.createMany({ data: ['LPG', 'Industrial Gas', 'Accessory'].map((name) => ({ tenantId: TENANT, name, hsnDefault: name === 'Accessory' ? '84818090' : '27111900' })) });
  await prisma.paymentMode.createMany({
    data: [
      { tenantId: TENANT, modeName: 'Cash', linkedAccount: 'Company Cash' },
      { tenantId: TENANT, modeName: 'UPI', linkedAccount: 'Bank (Receipts)' },
      { tenantId: TENANT, modeName: 'Cheque', linkedAccount: 'Bank (Receipts)' },
      { tenantId: TENANT, modeName: 'Credit', linkedAccount: 'Sundry Debtors' },
    ],
  });
  await prisma.bookType.createMany({ data: ['BANK BOOK', 'CASH BOOK', 'PETTY CASH BOOK'].map((name) => ({ tenantId: TENANT, name })) });

  // Products (generic schema: more gases can be added later)
  const lpg19 = await prisma.product.create({
    data: { tenantId: TENANT, sku: 'LPG-19', name: '19 KG Commercial LPG Cylinder', productHindiName: '19 किलो कमर्शियल सिलेंडर', category: 'LPG', gasType: 'LPG', weightVolume: 19, salePrice: 1850, purchasePrice: 1650, taxRate: 18, emptyDepositValue: 2500, minStockAlert: 20 },
  });
  const lpg47 = await prisma.product.create({
    data: { tenantId: TENANT, sku: 'LPG-47.5', name: '47.5 KG Industrial LPG Cylinder', productHindiName: '47.5 किलो इंडस्ट्रियल सिलेंडर', category: 'LPG', gasType: 'LPG', weightVolume: 47.5, salePrice: 4400, purchasePrice: 3950, taxRate: 18, emptyDepositValue: 4500, minStockAlert: 10 },
  });

  // Godown with opening stock
  const warehouse = await getDefaultWarehouse(prisma, TENANT);
  await transaction(async (tx) => {
    const location = { type: 'WAREHOUSE' as const, id: warehouse.id, name: warehouse.name };
    for (const [product, full, empty] of [[lpg19, 100, 20], [lpg47, 50, 10]] as const) {
      await adjustLocationStock(tx, { tenantId: TENANT, location, productId: product.id, productName: product.name, fullDelta: full, emptyDelta: empty, defectiveDelta: 0, type: 'OPENING', reason: 'Opening stock', performedBy: 'Seed' });
    }
  });

  // Routes & areas
  const central = await prisma.route.create({ data: { tenantId: TENANT, code: 'RT-CENTRAL', name: 'Central Route', defaultDeliveryBoyId: ramesh } });
  const south = await prisma.route.create({ data: { tenantId: TENANT, code: 'RT-SOUTH', name: 'South Industrial Route', defaultDeliveryBoyId: suresh } });
  await prisma.area.createMany({
    data: [
      { tenantId: TENANT, code: 'CP', name: 'Connaught Place', routeId: central.id },
      { tenantId: TENANT, code: 'KB', name: 'Karol Bagh', routeId: central.id },
      { tenantId: TENANT, code: 'OKH', name: 'Okhla Industrial Area', routeId: south.id },
    ],
  });

  // Sample customers
  const samples = [
    { name: 'Hotel Rajdhani', contactPerson: 'Mr. Sharma', phone: '9811000001', address: '7 Barakhamba Road, Connaught Place, New Delhi', area: 'Connaught Place', route: 'Central Route', segment: 'Hotel', defaultDeliveryBoyId: ramesh, defaultProductIds: [lpg19.id], creditLimit: 50000, paymentTerms: 'NET_15', openingBalance: 12000, openingCylinders: [{ productId: lpg19.id, qty: 8 }] },
    { name: 'Standard Bakers', contactPerson: 'Mr. Gupta', phone: '9811000002', address: '12 Ajmal Khan Road, Karol Bagh, New Delhi', area: 'Karol Bagh', route: 'Central Route', segment: 'Restaurant', defaultDeliveryBoyId: ramesh, defaultProductIds: [lpg19.id], creditLimit: 25000, paymentTerms: 'COD', openingCylinders: [{ productId: lpg19.id, qty: 4 }] },
    { name: 'Apex Industrial Fabrics', contactPerson: 'Ms. Kapoor', phone: '9811000003', gstin: '07AAACA1234A1Z5', address: 'Plot 44, Okhla Phase 1, New Delhi', area: 'Okhla Industrial Area', route: 'South Industrial Route', segment: 'Industrial', defaultDeliveryBoyId: suresh, defaultProductIds: [lpg19.id, lpg47.id], creditLimit: 200000, paymentTerms: 'NET_30', openingBalance: 45000, openingCylinders: [{ productId: lpg47.id, qty: 12 }, { productId: lpg19.id, qty: 6 }] },
  ];
  for (const sample of samples) await transaction((tx) => createCustomer(tx, actor, { ...sample, type: 'Customer', deliveryAddresses: [{ label: 'Main', address: sample.address, isDefault: true }] }));

  const portalCustomer = await prisma.customer.findFirst({ where: { tenantId: TENANT, phone: '9811000001' } });
  const customerPassword = password('SEED_CUSTOMER_PASSWORD');
  await prisma.user.create({ data: { tenantId: TENANT, name: 'Hotel Rajdhani', email: 'rajdhani@customer.local', role: 'CUSTOMER', customerId: portalCustomer!.id, passwordHash: hashPassword(customerPassword) } });

  console.log('\nSeed complete. Login credentials (change them after first login):');
  for (const c of [...credentials, { email: 'rajdhani@customer.local', role: 'CUSTOMER', password: customerPassword }]) {
    console.log(`  ${c.role.padEnd(13)} ${c.email.padEnd(28)} ${c.password}`);
  }
  console.log('\nDelivery boys need their phone approved by the admin on first login (Admin → Security → Devices).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
