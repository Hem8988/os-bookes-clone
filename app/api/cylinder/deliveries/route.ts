import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      deliveryBoyId,
      deliveryBoyName,
      deliveryDate,
      paymentMode,
      paymentAmount,
      transactionId,
      chequeNumber,
      paymentProofPhotoUrl,
      deliveryProofPhotoUrl,
      remarks,
      items = [],
    } = body;

    if (!orderId || !deliveryBoyId || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (orderId, deliveryBoyId, items)' },
        { status: 400 }
      );
    }

    const order = await prisma.cylinderOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const deliveryCount = await prisma.cylinderDelivery.count();
    const deliveryNumber = `CYL-DEL-${String(deliveryCount + 1).padStart(5, '0')}`;

    const deliveredQtyTotal = items.reduce((sum: number, i: any) => sum + Number(i.deliveredQty || 0), 0);
    const emptyReceivedTotal = items.reduce((sum: number, i: any) => sum + Number(i.emptyReceivedQty || 0), 0);

    const delivery = await prisma.cylinderDelivery.create({
      data: {
        deliveryNumber,
        orderId,
        customerId: order.customerId,
        customerName: order.customerName,
        deliveryBoyId,
        deliveryBoyName,
        deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
        deliveredQtyTotal,
        emptyReceivedTotal,
        paymentMode: paymentMode || 'CASH',
        paymentAmount: Number(paymentAmount || 0),
        transactionId: transactionId || null,
        chequeNumber: chequeNumber || null,
        paymentProofPhotoUrl: paymentProofPhotoUrl || null,
        deliveryProofPhotoUrl: deliveryProofPhotoUrl || null,
        remarks: remarks || null,
        status: 'PENDING_VERIFICATION',
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            productName: i.productName,
            deliveredQty: Number(i.deliveredQty || 0),
            emptyReceivedQty: Number(i.emptyReceivedQty || 0),
            unitPrice: Number(i.unitPrice || 0),
            totalAmount: Number(i.deliveredQty || 0) * Number(i.unitPrice || 0),
          })),
        },
      },
      include: { items: true },
    });

    // Update order status to DELIVERED / PENDING_VERIFICATION
    await prisma.cylinderOrder.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });

    // Create Accountant Approval Queue Item
    await prisma.approvalQueueItem.create({
      data: {
        requestType: 'DELIVERY_VERIFICATION',
        referenceId: delivery.id,
        requestedBy: deliveryBoyName || deliveryBoyId,
        assignedTo: 'ACCOUNTANT',
        payload: delivery,
        notes: `Delivery ${deliveryNumber} verification required (${paymentMode}: ₹${paymentAmount})`,
      },
    });

    return NextResponse.json({ success: true, data: delivery });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
