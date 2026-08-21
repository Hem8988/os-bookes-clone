import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

let memoryInventoryStore: any[] = [
  {
    id: 'inv_1',
    customerId: 'cust_demo_1',
    customerName: 'Hotel Rajdhani (Connaught Place)',
    productName: '19 KG Commercial LPG Cylinder',
    currentEmptyBalance: 15,
    currentFullBalance: 5,
    updatedAt: new Date().toISOString(),
    customer: { name: 'Hotel Rajdhani (Connaught Place)' }
  },
  {
    id: 'inv_2',
    customerId: 'cust_demo_2',
    customerName: 'Apex Industrial Fabrics (Okhla)',
    productName: '47.5 KG Industrial LPG Cylinder',
    currentEmptyBalance: 8,
    currentFullBalance: 12,
    updatedAt: new Date().toISOString(),
    customer: { name: 'Apex Industrial Fabrics (Okhla)' }
  },
  {
    id: 'inv_3',
    customerId: 'cust_demo_3',
    customerName: 'Standard Bakers (Karol Bagh)',
    productName: '19 KG Commercial LPG Cylinder',
    currentEmptyBalance: 20,
    currentFullBalance: 2,
    updatedAt: new Date().toISOString(),
    customer: { name: 'Standard Bakers (Karol Bagh)' }
  }
];

export async function GET() {
  try {
    const balances = await prisma.customerCylinderInventory.findMany({
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (balances && balances.length > 0) {
      return NextResponse.json({ success: true, data: balances });
    }
  } catch (error: any) {
    console.warn('DB connection offline, using fallback store:', error.message);
  }

  return NextResponse.json({ success: true, data: memoryInventoryStore });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, productName, currentEmptyBalance, currentFullBalance } = body;

    const customerNames: any = {
      'cust_demo_1': 'Hotel Rajdhani (Connaught Place)',
      'cust_demo_2': 'Apex Industrial Fabrics (Okhla)',
      'cust_demo_3': 'Standard Bakers (Karol Bagh)'
    };
    const customerName = customerNames[customerId] || 'Valued Commercial Customer';

    try {
      let cust = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            id: customerId,
            name: customerName,
            phone: '9876543210',
            email: 'customer@agency.com',
            address: 'Central Commercial Area',
            city: 'New Delhi',
            state: 'Delhi',
            type: 'Commercial',
            accountGroup: 'Sundry Debtors',
            creditLimit: 50000,
          },
        });
      }

      const existing = await prisma.customerCylinderInventory.findFirst({
        where: { customerId, productName },
      });

      let dbResult;
      if (existing) {
        dbResult = await prisma.customerCylinderInventory.update({
          where: { id: existing.id },
          data: {
            currentEmptyBalance: Number(currentEmptyBalance || 0),
            currentFullBalance: Number(currentFullBalance || 0),
          },
        });
      } else {
        dbResult = await prisma.customerCylinderInventory.create({
          data: {
            customerId: cust.id,
            productId: 'prod_custom',
            productName,
            openingQty: Number(currentEmptyBalance || 0),
            currentEmptyBalance: Number(currentEmptyBalance || 0),
            currentFullBalance: Number(currentFullBalance || 0),
          },
        });
      }

      return NextResponse.json({ success: true, data: dbResult });
    } catch (dbErr: any) {
      console.warn('DB write fallback to memory store:', dbErr.message);
    }

    // In-memory update & save fallback
    const existingMem = memoryInventoryStore.find(
      i => (i.customerId === customerId || i.customerName === customerName) && i.productName === productName
    );

    if (existingMem) {
      existingMem.currentEmptyBalance = Number(currentEmptyBalance || 0);
      existingMem.currentFullBalance = Number(currentFullBalance || 0);
      existingMem.updatedAt = new Date().toISOString();
    } else {
      memoryInventoryStore.unshift({
        id: `inv_${Date.now()}`,
        customerId,
        customerName,
        productName,
        currentEmptyBalance: Number(currentEmptyBalance || 0),
        currentFullBalance: Number(currentFullBalance || 0),
        updatedAt: new Date().toISOString(),
        customer: { name: customerName }
      });
    }

    return NextResponse.json({ success: true, data: memoryInventoryStore });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
