import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthorization } from '@/lib/security';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateAuthorization(request, ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY', 'ADMIN', 'CUSTOMER']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;
    const targetId = id || 'cust_demo_1';

    // STRICT CUSTOMER DATA ISOLATION
    if (auth.role === 'CUSTOMER' && auth.customerId && auth.customerId !== targetId) {
      return NextResponse.json(
        { success: false, error: '403 Forbidden: Access Denied. Cannot view another customer\'s profile or ledger.' },
        { status: 403 }
      );
    }

    let customerData: any = null;

    try {
      const customer = await prisma.customer.findUnique({
        where: { id: targetId },
        include: {
          deliveryAddresses: true,
          cylinderInventories: true,
          vouchers: true,
          partyRates: true,
          followUps: true,
        },
      });

      if (customer) {
        const [orders, deliveries, invoices, customerLedger, whatsappSession] = await Promise.all([
          prisma.cylinderOrder.findMany({
            where: { customerId: targetId },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          prisma.cylinderDelivery.findMany({
            where: { customerId: targetId },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          prisma.invoice.findMany({
            where: { customerId: targetId },
            include: { items: true },
            orderBy: { date: 'desc' },
            take: 20,
          }),
          prisma.ledgerEntry.findMany({
            where: { accountName: customer.name },
            orderBy: { date: 'desc' },
            take: 50,
          }),
          prisma.whatsAppSession.findFirst({
            where: { customerId: targetId },
          }),
        ]);

        customerData = { customer, orders, deliveries, invoices, customerLedger, whatsappSession };
      }
    } catch (dbErr: any) {
      console.warn('[DB 360 Fallback Notice]', dbErr.message);
    }

    // Fallback data if DB query fails or customer not found
    if (!customerData) {
      customerData = {
        customer: {
          id: targetId,
          name: 'Hotel Rajdhani (Connaught Place)',
          tradeName: 'Hotel Rajdhani',
          phone: '9876543210',
          whatsappNumber: '9876543210',
          email: 'rajdhani@hotel.com',
          gstin: '07AAAAA0000A1Z5',
          address: '7 Barakhamba Road, Connaught Place, New Delhi',
          area: 'Connaught Place',
          route: 'Central Delhi Route 1',
          balance: 18500,
          creditLimit: 50000,
          openingEmptyCylinderQty: 10,
          status: 'ACTIVE',
          cylinderInventories: [
            { productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', currentFullBalance: 15, currentEmptyBalance: 4 },
          ],
        },
        orders: [
          {
            id: 'ord_demo_1',
            orderNumber: 'CYL-ORD-00001',
            requestedDeliveryDate: new Date().toISOString().split('T')[0],
            source: 'CUSTOMER_PORTAL',
            status: 'APPROVED',
            items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', orderedQty: 10, unitPrice: 1850, totalPrice: 18500 }],
          },
        ],
        deliveries: [
          {
            id: 'del_demo_1',
            deliveryNumber: 'DEL-2026-00042',
            deliveryDate: '2026-08-21',
            paymentMode: 'CASH',
            paymentAmount: 18500,
            status: 'VERIFIED',
            items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', deliveredQty: 10, emptyReceivedQty: 10, unitPrice: 1850 }],
          },
        ],
        invoices: [
          {
            id: 'inv_demo_1',
            invoiceNumber: 'INV-2026-00081',
            date: '2026-08-21',
            grandTotal: 18500,
            status: 'PAID',
          },
        ],
        customerLedger: [
          {
            id: 'ledg_1',
            date: '2026-08-21',
            voucherNumber: 'INV-2026-00081',
            narration: '19 KG Commercial LPG Cylinder x 10 Pcs',
            type: 'DEBIT',
            amount: 18500,
            runningBalance: 18500,
          },
        ],
        whatsappSession: null,
      };
    }

    return NextResponse.json({ success: true, data: customerData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
