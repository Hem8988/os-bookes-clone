import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const status = searchParams.get('status') || 'PENDING';

    const where: any = { status };
    if (assignedTo) where.assignedTo = assignedTo;

    const items = await prisma.approvalQueueItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, action, actionBy = 'ADMIN', notes } = body; // action = 'APPROVE' | 'REJECT'

    if (!itemId || !action) {
      return NextResponse.json({ success: false, error: 'Missing itemId or action' }, { status: 400 });
    }

    const queueItem = await prisma.approvalQueueItem.findUnique({ where: { id: itemId } });
    if (!queueItem) {
      return NextResponse.json({ success: false, error: 'Queue item not found' }, { status: 404 });
    }

    if (action === 'REJECT') {
      await prisma.approvalQueueItem.update({
        where: { id: itemId },
        data: {
          status: 'REJECTED',
          actionBy,
          actionAt: new Date(),
          notes: notes || 'Rejected',
        },
      });

      if (queueItem.requestType === 'ORDER_APPROVAL') {
        await prisma.cylinderOrder.update({
          where: { id: queueItem.referenceId },
          data: { status: 'REJECTED', rejectionReason: notes || 'Rejected by manager' },
        });
      }

      return NextResponse.json({ success: true, message: 'Item rejected' });
    }

    if (action === 'APPROVE') {
      await prisma.approvalQueueItem.update({
        where: { id: itemId },
        data: {
          status: 'APPROVED',
          actionBy,
          actionAt: new Date(),
          notes: notes || 'Approved',
        },
      });

      if (queueItem.requestType === 'ORDER_APPROVAL') {
        await prisma.cylinderOrder.update({
          where: { id: queueItem.referenceId },
          data: { status: 'APPROVED', approvedBy: actionBy, approvedAt: new Date().toISOString() },
        });
      }

      if (queueItem.requestType === 'DELIVERY_VERIFICATION') {
        const delivery = await prisma.cylinderDelivery.findUnique({
          where: { id: queueItem.referenceId },
          include: { items: true, order: true },
        });

        if (delivery) {
          // 1. Mark delivery verified & order completed
          await prisma.cylinderDelivery.update({
            where: { id: delivery.id },
            data: { status: 'VERIFIED', verifiedBy: actionBy, verifiedAt: new Date().toISOString() },
          });

          await prisma.cylinderOrder.update({
            where: { id: delivery.orderId },
            data: { status: 'COMPLETED' },
          });

          // 2. Update Customer Cylinder Inventory Ledger
          for (const dItem of delivery.items) {
            const existingCyl = await prisma.customerCylinderInventory.findFirst({
              where: { customerId: delivery.customerId, productId: dItem.productId },
            });

            if (existingCyl) {
              await prisma.customerCylinderInventory.update({
                where: { id: existingCyl.id },
                data: {
                  deliveredQtyTotal: { increment: dItem.deliveredQty },
                  emptyReceivedTotal: { increment: dItem.emptyReceivedQty },
                  currentEmptyBalance: { increment: dItem.emptyReceivedQty },
                  currentFullBalance: { increment: dItem.deliveredQty },
                },
              });
            } else {
              await prisma.customerCylinderInventory.create({
                data: {
                  customerId: delivery.customerId,
                  productId: dItem.productId,
                  productName: dItem.productName,
                  deliveredQtyTotal: dItem.deliveredQty,
                  emptyReceivedTotal: dItem.emptyReceivedQty,
                  currentEmptyBalance: dItem.emptyReceivedQty,
                  currentFullBalance: dItem.deliveredQty,
                },
              });
            }
          }

          // 3. Post Deskshark Invoice
          const invCount = await prisma.invoice.count();
          const invoiceNumber = `INV-${String(invCount + 1).padStart(5, '0')}`;
          const grandTotal = delivery.items.reduce((sum, i) => sum + i.totalAmount, 0);

          await prisma.invoice.create({
            data: {
              id: `inv_${Date.now()}`,
              invoiceNumber,
              date: new Date().toISOString().split('T')[0],
              dueDate: new Date().toISOString().split('T')[0],
              customerId: delivery.customerId,
              customerName: delivery.customerName,
              customerPhone: delivery.order?.customerPhone || '',
              salesmanName: delivery.deliveryBoyName,
              grandTotal,
              subTotal: grandTotal,
              paymentMode: delivery.paymentMode,
              status: delivery.paymentMode === 'CREDIT' ? 'UNPAID' : 'PAID',
              notes: `Generated from Cylinder Delivery ${delivery.deliveryNumber}`,
              items: {
                create: delivery.items.map(i => ({
                  productId: i.productId,
                  productName: i.productName,
                  hsnCode: '27111200',
                  quantity: i.deliveredQty,
                  unit: 'PCS',
                  unitPrice: i.unitPrice,
                  totalAmount: i.totalAmount,
                })),
              },
            },
          });

          // 4. Post Ledger Entry
          await prisma.ledgerEntry.create({
            data: {
              ledgerType: 'customer',
              date: new Date().toISOString().split('T')[0],
              voucherNumber: invoiceNumber,
              accountName: delivery.customerName,
              particulars: `Cylinder Delivery ${delivery.deliveryNumber} (${delivery.deliveredQtyTotal} Delivered / ${delivery.emptyReceivedTotal} Empty Returned)`,
              debit: grandTotal,
              credit: delivery.paymentMode === 'CREDIT' ? 0 : delivery.paymentAmount,
              balance: grandTotal - (delivery.paymentMode === 'CREDIT' ? 0 : delivery.paymentAmount),
            },
          });

          // 5. Update Customer Balance
          if (delivery.paymentMode === 'CREDIT') {
            await prisma.customer.update({
              where: { id: delivery.customerId },
              data: { balance: { increment: grandTotal } },
            });
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Item approved successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
