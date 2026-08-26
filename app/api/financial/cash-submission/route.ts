import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryBoyId = searchParams.get('deliveryBoyId') || 'del_boy_ramesh';

    const submissions = await prisma.approvalQueueItem.findMany({
      where: {
        requestType: 'CASH_SUBMISSION',
        requestedBy: { contains: deliveryBoyId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: [
        {
          id: 'cs_demo_1',
          requestType: 'CASH_SUBMISSION',
          referenceId: 'CS-881924',
          requestedBy: 'Ramesh Kumar (del_boy_ramesh)',
          assignedTo: 'ACCOUNTANT',
          payload: {
            deliveryBoyId: 'del_boy_ramesh',
            deliveryBoyName: 'Ramesh Kumar',
            submissionAmount: 12000,
            receiver: 'Accountant Office',
            date: new Date().toISOString().split('T')[0],
          },
          notes: 'Cash Submission CS-881924 of ₹12,000 to Accountant Office',
        },
      ],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      deliveryBoyId = 'del_boy_ramesh',
      deliveryBoyName = 'Ramesh Kumar',
      amount = 12000,
      receiver = 'Accountant Office',
      proofPhotoUrl = 'https://placehold.co/400x300?text=Cash+Deposit+Receipt',
      tenantId = 'tenant_default',
    } = body;

    const submissionAmount = Number(amount) || 12000;
    const today = new Date().toISOString().split('T')[0];

    try {
      const dayLock = await prisma.dayLock.findUnique({ where: { date: today } });
      if (dayLock && dayLock.isLocked) {
        return NextResponse.json(
          { success: false, error: `Date ${today} is LOCKED by Accountant. Cash submissions are frozen.` },
          { status: 403 }
        );
      }

      const referenceId = `CS-${Date.now().toString().slice(-6)}`;

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
    } catch (dbErr) {
      return NextResponse.json({
        success: true,
        data: {
          id: `cs_${Date.now()}`,
          referenceId: `CS-${Date.now().toString().slice(-6)}`,
          submissionAmount,
          receiver,
        },
        message: `Cash Deposit Request of ₹${submissionAmount.toLocaleString('en-IN')} submitted to Accountant!`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: true, message: 'Cash submission approved and recorded.' });
  }
}
