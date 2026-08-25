import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'customerId is required' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        cylinderInventories: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Fetch all inventory transactions for this customer
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        OR: [
          { sourceType: 'CUSTOMER', sourceId: customerId },
          { targetType: 'CUSTOMER', targetId: customerId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalOpening = customer.openingEmptyCylinderQty || 0;
    const totalDeliveredFull = customer.cylinderInventories.reduce((sum: number, i: any) => sum + (i.deliveredQtyTotal || 0), 0);
    const totalEmptyReceived = customer.cylinderInventories.reduce((sum: number, i: any) => sum + (i.emptyReceivedTotal || 0), 0);
    const totalAdjustments = customer.cylinderInventories.reduce((sum: number, i: any) => sum + (i.adjustmentQty || 0), 0);
    const currentBalance = totalOpening + totalDeliveredFull - totalEmptyReceived + totalAdjustments;

    // Calculate Running Balances
    let runningBalance = totalOpening;
    const formattedHistory = transactions.map((t: any) => {
      if (t.transactionType === 'DRIVER_TO_CUSTOMER') {
        runningBalance += t.fullQty;
      } else if (t.transactionType === 'CUSTOMER_EMPTY_RETURN') {
        runningBalance -= t.emptyQty;
      } else if (t.transactionType === 'MANUAL_ADJUSTMENT') {
        runningBalance += t.adjustmentQty;
      }

      return {
        id: t.id,
        date: t.createdAt.toISOString().split('T')[0],
        reference: t.referenceNumber,
        transactionType: t.transactionType,
        productName: t.productName,
        fullQty: t.fullQty,
        emptyQty: t.emptyQty,
        adjustmentQty: t.adjustmentQty,
        runningBalance,
        performedBy: t.performedBy,
        reason: t.reason,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        customerName: customer.name,
        kpis: {
          openingBalance: totalOpening,
          deliveredFull: totalDeliveredFull,
          emptyReceived: totalEmptyReceived,
          adjustments: totalAdjustments,
          currentBalance,
        },
        transactions: formattedHistory,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
