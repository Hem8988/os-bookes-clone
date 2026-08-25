import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthorization, logAuditAction } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const auth = await validateAuthorization(request, ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const tenantId = searchParams.get('tenantId') || 'tenant_default';

    const dayLock = await prisma.dayLock.findUnique({ where: { date } });

    // Calculate Reconciliation Metrics for Date
    const [deliveries, dayLogs, auditLogs] = await Promise.all([
      prisma.cylinderDelivery.findMany({ where: { deliveryDate: date, tenantId } }),
      prisma.deliveryBoyDayLog.findMany({ where: { date, tenantId } }),
      prisma.auditLog.findMany({
        where: { details: { contains: date } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    let expectedCash = 0;
    let actualCash = 0;
    let expectedStock = 0;
    let actualStock = 0;

    for (const d of deliveries) {
      if (d.paymentMode === 'CASH') expectedCash += d.paymentAmount;
      expectedStock += d.deliveredQtyTotal;
    }

    for (const log of dayLogs) {
      actualCash += log.totalCashSubmitted;
      actualStock += log.closingFullCylinders || 0;
    }

    const cashDifference = actualCash - expectedCash;
    const stockDifference = actualStock - expectedStock;

    return NextResponse.json({
      success: true,
      data: {
        date,
        isLocked: dayLock?.isLocked || false,
        dayLock,
        reconciliation: {
          expectedCash,
          actualCash,
          cashDifference,
          hasCashMismatch: Math.abs(cashDifference) > 0,
          expectedStock,
          actualStock,
          stockDifference,
          hasStockMismatch: Math.abs(stockDifference) > 0,
        },
        auditLogs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateAuthorization(request, ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const {
      action, // 'LOCK_DAY' | 'REOPEN_DAY'
      date = new Date().toISOString().split('T')[0],
      user = 'Chief Accountant',
      userRole = 'ACCOUNTANT',
      reopenReason,
      expectedCash = 0,
      actualCash = 0,
      expectedStock = 0,
      actualStock = 0,
      tenantId = 'tenant_default',
    } = body;

    if (action === 'LOCK_DAY') {
      const cashDifference = Number(actualCash) - Number(expectedCash);
      const stockDifference = Number(actualStock) - Number(expectedStock);

      const dayLock = await prisma.dayLock.upsert({
        where: { date },
        update: {
          isLocked: true,
          lockedBy: user,
          lockedAt: new Date(),
          expectedCash: Number(expectedCash),
          actualCash: Number(actualCash),
          cashDifference,
          expectedStock: Number(expectedStock),
          actualStock: Number(actualStock),
          stockDifference,
        },
        create: {
          tenantId,
          date,
          isLocked: true,
          lockedBy: user,
          expectedCash: Number(expectedCash),
          actualCash: Number(actualCash),
          cashDifference,
          expectedStock: Number(expectedStock),
          actualStock: Number(actualStock),
          stockDifference,
        },
      });

      // Audit Log Entry
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorEmail: user,
          action: 'DAY_LOCKED',
          details: `Day ${date} LOCKED by ${user}. Financial entries, payments, and inventory adjustments frozen.`,
        },
      });

      return NextResponse.json({
        success: true,
        data: dayLock,
        message: `🔒 Day ${date} has been LOCKED successfully! All entries frozen.`,
      });
    } else if (action === 'REOPEN_DAY') {
      // Security Enforcement: Only SUPER_ADMIN or ADMIN can reopen a locked day
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
      if (!allowedRoles.includes(userRole.toUpperCase())) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only Super Admin or Admin can reopen a locked day.' },
          { status: 403 }
        );
      }

      if (!reopenReason || !reopenReason.trim()) {
        return NextResponse.json(
          { success: false, error: 'Mandatory reason is required to reopen a locked day' },
          { status: 400 }
        );
      }

      const dayLock = await prisma.dayLock.update({
        where: { date },
        data: {
          isLocked: false,
          reopenedBy: user,
          reopenedAt: new Date(),
          reopenReason: reopenReason.trim(),
        },
      });

      // Audit Log Entry for Reopen
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorEmail: user,
          action: 'DAY_REOPENED',
          details: `Day ${date} REOPENED by ${user} (${userRole}). Reason: ${reopenReason.trim()}`,
        },
      });

      return NextResponse.json({
        success: true,
        data: dayLock,
        message: `🔓 Day ${date} REOPENED by Admin. Action audit logged.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
