import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'tenant_default';

    const transfers = await prisma.stockTransfer.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: transfers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      transferType, // 'WAREHOUSE_TO_DRIVER' | 'DRIVER_TO_DRIVER' | 'DRIVER_TO_WAREHOUSE'
      fromLocationType,
      fromLocationId,
      toLocationType,
      toLocationId,
      notes,
      items = [],
      performedBy = 'Manager',
      tenantId = 'tenant_default',
    } = body;

    if (!transferType || !fromLocationId || !toLocationId || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: transferType, fromLocationId, toLocationId, items' },
        { status: 400 }
      );
    }

    const transferCount = await prisma.stockTransfer.count();
    const transferNumber = `ST-${String(transferCount + 1).padStart(5, '0')}`;

    // Create Stock Transfer Request in PENDING_APPROVAL status
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        tenantId,
        transferType,
        fromLocationType: fromLocationType || 'WAREHOUSE',
        fromLocationId,
        toLocationType: toLocationType || 'DELIVERY_BOY',
        toLocationId,
        notes: notes || null,
        status: 'PENDING_APPROVAL',
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            productName: i.productName,
            fullQty: Number(i.fullQty || 0),
            emptyQty: Number(i.emptyQty || 0),
          })),
        },
      },
      include: { items: true },
    });

    // Create Approval Queue Item for Manager / Admin
    await prisma.approvalQueueItem.create({
      data: {
        tenantId,
        requestType: 'STOCK_TRANSFER',
        referenceId: transfer.id,
        requestedBy: performedBy,
        assignedTo: 'MANAGER',
        payload: transfer,
        notes: `Stock Transfer ${transferNumber} (${transferType}): ${items.map((i: any) => `${i.productName}: ${i.fullQty} Full / ${i.emptyQty} Empty`).join(', ')}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: transfer,
      message: 'Stock Transfer submitted for Manager Approval!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
