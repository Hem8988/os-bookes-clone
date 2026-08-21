import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let balances = await prisma.customerCylinderInventory.findMany({
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (balances.length === 0) {
      let cust = await prisma.customer.findFirst();
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            id: 'cust_demo_1',
            name: 'Hotel Rajdhani',
            phone: '9876543210',
            email: 'rajdhani@hotel.com',
            address: '7 Barakhamba Road, Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            type: 'Hotel',
            accountGroup: 'Sundry Debtors',
            creditLimit: 50000,
          },
        });
      }

      await prisma.customerCylinderInventory.createMany({
        data: [
          {
            customerId: cust.id,
            productId: 'prod_19kg',
            productName: '19 KG Commercial LPG Cylinder',
            openingQty: 10,
            deliveredQtyTotal: 25,
            emptyReceivedTotal: 15,
            currentEmptyBalance: 15,
            currentFullBalance: 10,
          },
        ],
      });

      balances = await prisma.customerCylinderInventory.findMany({
        include: { customer: true },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return NextResponse.json({ success: true, data: balances });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, productId, productName, currentEmptyBalance, currentFullBalance } = body;

    if (!customerId || !productName) {
      return NextResponse.json({ success: false, error: 'Missing customerId or productName' }, { status: 400 });
    }

    const existing = await prisma.customerCylinderInventory.findFirst({
      where: { customerId, productName },
    });

    let result;
    if (existing) {
      result = await prisma.customerCylinderInventory.update({
        where: { id: existing.id },
        data: {
          currentEmptyBalance: Number(currentEmptyBalance || 0),
          currentFullBalance: Number(currentFullBalance || 0),
        },
      });
    } else {
      result = await prisma.customerCylinderInventory.create({
        data: {
          customerId,
          productId: productId || 'prod_custom',
          productName,
          openingQty: Number(currentEmptyBalance || 0),
          currentEmptyBalance: Number(currentEmptyBalance || 0),
          currentFullBalance: Number(currentFullBalance || 0),
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
