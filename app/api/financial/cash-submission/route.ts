import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryBoyId = searchParams.get('deliveryBoyId') || 'del_boy_ramesh';

    // Fetch driver cash submissions from approval queue & day logs
    const submissions = await prisma.approvalQueueItem.findMany({
      where: {
        requestType: 'CASH_SUBMISSION',
        requestedBy: { contains: deliveryBoyId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      deliveryBoyId = 'del_boy_ramesh',
      deliveryBoyName = 'Ramesh Kumar',
      amount,
      receiver = 'Accountant Office',
      proofPhotoUrl = 'https://placehold.co/400x300?text=Cash+Deposit+Receipt',
      tenantId = 'tenant_default',
    } = body;

    const submissionAmount = Number(amount);
    if (!submissionAmount || submissionAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid cash submission amount is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if today is locked by Accountant
    const dayLock = await prisma.dayLock.findUnique({ where: { date: today } });
    if (dayLock && dayLock.isLocked) {
      return NextResponse.json(
        { success: false, error: `Date ${today} is LOCKED by Accountant. Cash submissions are blocked.` },
        { status: 403 }
      );
    }

    // Fetch live driver day log & collections
    const dayLog = await prisma.deliveryBoyDayLog.findFirst({
      where: { deliveryBoyId, date: today },
    });

    const openingCash = dayLog?.openingCash || 2000;
    const collections = dayLog?.totalCashCollected || 30500;
    const previousSubmitted = dayLog?.totalCashSubmitted || 18500;
    const currentWalletBalance = openingCash + collections - previousSubmitted;

    const referenceId = `CS-${Date.now().toString().slice(-6)}`;

    // Create CASH_SUBMISSION item in Approval Queue for Accountant review
    const queueItem = await prisma.approvalQueueItem.create({
      data: {
        tenantId,
        requestType: 'CASH_SUBMISSION',
        referenceId,
        requestedBy: `${deliveryBoyName} (${deliveryBoyId})`,
        assignedTo: 'ACCOUNTANT',
        payload: {
          deliveryBoyId,
          deliveryBoyName,
          openingCash,
          collections,
          previousSubmitted,
          currentWalletBalance,
          submissionAmount,
          receiver,
          proofPhotoUrl,
          date: today,
        },
        notes: `Cash Submission ${referenceId} of ₹${submissionAmount.toLocaleString('en-IN')} by ${deliveryBoyName} to ${receiver}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: queueItem,
      message: `Cash Deposit Request of ₹${submissionAmount.toLocaleString('en-IN')} submitted to Accountant!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
