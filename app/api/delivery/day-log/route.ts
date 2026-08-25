import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryBoyId = searchParams.get('deliveryBoyId') || 'del_boy_ramesh';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const dayLog = await prisma.deliveryBoyDayLog.findFirst({
      where: { deliveryBoyId, date },
      orderBy: { startedAt: 'desc' },
    });

    if (!dayLog) {
      return NextResponse.json({
        success: true,
        data: null,
        status: 'NOT_STARTED',
      });
    }

    return NextResponse.json({
      success: true,
      data: dayLog,
      status: dayLog.dayStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action, // 'START_DAY' | 'CLOSE_DAY'
      deliveryBoyId = 'del_boy_ramesh',
      deliveryBoyName = 'Ramesh Kumar',
      tenantId = 'tenant_default',
      openingFullCylinders = 0,
      openingEmptyCylinders = 0,
      openingCash = 0,
    } = body;

    const today = new Date().toISOString().split('T')[0];

    if (action === 'START_DAY') {
      const existing = await prisma.deliveryBoyDayLog.findFirst({
        where: { deliveryBoyId, date: today },
      });

      if (existing && existing.dayStatus === 'DAY_CLOSED') {
        return NextResponse.json(
          { success: false, error: 'Day has already been closed for today' },
          { status: 400 }
        );
      }

      const dayLog = await prisma.deliveryBoyDayLog.upsert({
        where: { id: existing?.id || `daylog_${deliveryBoyId}_${today}` },
        update: {
          openingFullCylinders: Number(openingFullCylinders),
          openingEmptyCylinders: Number(openingEmptyCylinders),
          openingCash: Number(openingCash),
          dayStatus: 'DAY_STARTED',
        },
        create: {
          id: `daylog_${deliveryBoyId}_${today}`,
          tenantId,
          deliveryBoyId,
          deliveryBoyName,
          date: today,
          dayStatus: 'DAY_STARTED',
          openingFullCylinders: Number(openingFullCylinders),
          openingEmptyCylinders: Number(openingEmptyCylinders),
          openingCash: Number(openingCash),
        },
      });

      return NextResponse.json({ success: true, data: dayLog, message: 'Day started successfully!' });
    } else if (action === 'CLOSE_DAY') {
      const dayLog = await prisma.deliveryBoyDayLog.findFirst({
        where: { deliveryBoyId, date: today },
      });

      if (!dayLog) {
        return NextResponse.json({ success: false, error: 'Day log not found for today' }, { status: 404 });
      }

      // Calculate totals from today's deliveries
      const deliveries = await prisma.cylinderDelivery.findMany({
        where: { deliveryBoyId, deliveryDate: today },
      });

      let totalCash = 0;
      let totalOnline = 0;
      let totalCredit = 0;
      let deliveredFullTotal = 0;
      let emptyReturnedTotal = 0;

      for (const del of deliveries) {
        deliveredFullTotal += del.deliveredQtyTotal;
        emptyReturnedTotal += del.emptyReceivedTotal;

        if (del.paymentMode === 'CASH') totalCash += del.paymentAmount;
        else if (del.paymentMode === 'ONLINE') totalOnline += del.paymentAmount;
        else if (del.paymentMode === 'CREDIT') totalCredit += del.deliveredQtyTotal * 1850;
      }

      const closingFullCylinders = dayLog.openingFullCylinders - deliveredFullTotal;
      const closingEmptyCylinders = dayLog.openingEmptyCylinders + emptyReturnedTotal;
      const closingCash = dayLog.openingCash + totalCash - dayLog.totalCashSubmitted;

      const closedLog = await prisma.deliveryBoyDayLog.update({
        where: { id: dayLog.id },
        data: {
          dayStatus: 'DAY_CLOSED',
          totalCashCollected: totalCash,
          totalOnlineCollected: totalOnline,
          totalCreditDelivered: totalCredit,
          closingFullCylinders,
          closingEmptyCylinders,
          closingCash,
          closedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: closedLog,
        message: 'Day closed and entries locked successfully!',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
