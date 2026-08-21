import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const deliveryBoyId = searchParams.get('deliveryBoyId');
    const customerId = searchParams.get('customerId');

    const where: any = {};
    if (status) where.status = status;
    if (deliveryBoyId) where.assignedDeliveryBoyId = deliveryBoyId;
    if (customerId) where.customerId = customerId;

    const orders = await prisma.cylinderOrder.findMany({
      where,
      include: {
        items: true,
        deliveries: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      whatsappNumber,
      source = 'MANUAL',
      requestedDeliveryDate,
      deliveryAddress,
      area,
      route,
      assignedDeliveryBoyId,
      assignedDeliveryBoyName,
      items = [],
    } = body;

    if (!customerId || !customerName || !requestedDeliveryDate || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (customer, requestedDeliveryDate, items)' },
        { status: 400 }
      );
    }

    const orderCount = await prisma.cylinderOrder.count();
    const orderNumber = `CYL-ORD-${String(orderCount + 1).padStart(5, '0')}`;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    let isCreditOverLimit = false;
    if (customer && customer.creditLimit > 0) {
      const totalOrderAmount = items.reduce((sum: number, item: any) => sum + (item.orderedQty * item.unitPrice), 0);
      if (customer.balance + totalOrderAmount > customer.creditLimit) {
        isCreditOverLimit = true;
      }
    }

    const newOrder = await prisma.cylinderOrder.create({
      data: {
        orderNumber,
        customerId,
        customerName,
        customerPhone: customerPhone || customer?.phone || '',
        whatsappNumber: whatsappNumber || customer?.whatsappNumber || customerPhone || '',
        source,
        status: 'PENDING_APPROVAL',
        requestedDeliveryDate,
        deliveryAddress: deliveryAddress || customer?.address || '',
        area: area || customer?.area || '',
        route: route || customer?.route || '',
        assignedDeliveryBoyId: assignedDeliveryBoyId || customer?.defaultDeliveryBoyId || null,
        assignedDeliveryBoyName: assignedDeliveryBoyName || null,
        isCreditOverLimit,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            orderedQty: Number(item.orderedQty),
            unitPrice: Number(item.unitPrice || 0),
            totalAmount: Number(item.orderedQty) * Number(item.unitPrice || 0),
          })),
        },
      },
      include: { items: true },
    });

    await prisma.approvalQueueItem.create({
      data: {
        requestType: 'ORDER_APPROVAL',
        referenceId: newOrder.id,
        requestedBy: source,
        assignedTo: 'MANAGER',
        payload: newOrder,
        notes: isCreditOverLimit ? 'Credit Limit Exceeded - Approval Required' : 'New Order Approval',
      },
    });

    return NextResponse.json({ success: true, data: newOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
