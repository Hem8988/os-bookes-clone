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
    const auth = await validateAuthorization(request, ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const { itemId, action, actionBy = auth.role, notes } = body; // action = 'APPROVE' | 'REJECT'

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

      if (queueItem.requestType === 'STOCK_TRANSFER') {
        await prisma.stockTransfer.update({
          where: { id: queueItem.referenceId },
          data: { status: 'REJECTED' },
        });
      }

      return NextResponse.json({ success: true, message: 'Item rejected' });
    }

    if (action === 'APPROVE') {
      // Execute Atomic Prisma Transaction for Approval Workflow
      await prisma.$transaction(async (tx: any) => {
        // 1. Mark Queue Item as APPROVED
        await tx.approvalQueueItem.update({
          where: { id: itemId },
          data: {
            status: 'APPROVED',
            actionBy,
            actionAt: new Date(),
            notes: notes || 'Approved',
          },
        });

        // 2. Handle ORDER_APPROVAL
        if (queueItem.requestType === 'ORDER_APPROVAL') {
          await tx.cylinderOrder.update({
            where: { id: queueItem.referenceId },
            data: { status: 'APPROVED', approvedBy: actionBy, approvedAt: new Date().toISOString() },
          });
        }

        // 3. Handle DELIVERY_VERIFICATION
        if (queueItem.requestType === 'DELIVERY_VERIFICATION') {
          const delivery = await tx.cylinderDelivery.findUnique({
            where: { id: queueItem.referenceId },
            include: { items: true, order: true },
          });

          if (delivery) {
            // Mark delivery verified & order completed
            await tx.cylinderDelivery.update({
              where: { id: delivery.id },
              data: { status: 'VERIFIED', verifiedBy: actionBy, verifiedAt: new Date().toISOString() },
            });

            await tx.cylinderOrder.update({
              where: { id: delivery.orderId },
              data: { status: 'COMPLETED' },
            });

            // Update Customer Cylinder Inventory & Log Inventory Transactions
            for (const dItem of delivery.items) {
              const existingCyl = await tx.customerCylinderInventory.findFirst({
                where: { customerId: delivery.customerId, productId: dItem.productId },
              });

              if (existingCyl) {
                await tx.customerCylinderInventory.update({
                  where: { id: existingCyl.id },
                  data: {
                    deliveredQtyTotal: { increment: dItem.deliveredQty },
                    emptyReceivedTotal: { increment: dItem.emptyReceivedQty },
                    currentEmptyBalance: { increment: dItem.emptyReceivedQty },
                    currentFullBalance: { increment: dItem.deliveredQty },
                  },
                });
              } else {
                await tx.customerCylinderInventory.create({
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

              // Audit Log Inventory Transactions
              await tx.inventoryTransaction.create({
                data: {
                  referenceNumber: delivery.deliveryNumber,
                  transactionType: 'DRIVER_TO_CUSTOMER',
                  sourceType: 'DELIVERY_BOY',
                  sourceId: delivery.deliveryBoyId,
                  targetType: 'CUSTOMER',
                  targetId: delivery.customerId,
                  productId: dItem.productId,
                  productName: dItem.productName,
                  fullQty: dItem.deliveredQty,
                  emptyQty: 0,
                  performedBy: actionBy,
                  reason: `Delivery ${delivery.deliveryNumber} completed`,
                },
              });

              if (dItem.emptyReceivedQty > 0) {
                await tx.inventoryTransaction.create({
                  data: {
                    referenceNumber: delivery.deliveryNumber,
                    transactionType: 'CUSTOMER_EMPTY_RETURN',
                    sourceType: 'CUSTOMER',
                    sourceId: delivery.customerId,
                    targetType: 'DELIVERY_BOY',
                    targetId: delivery.deliveryBoyId,
                    productId: dItem.productId,
                    productName: dItem.productName,
                    fullQty: 0,
                    emptyQty: dItem.emptyReceivedQty,
                    performedBy: actionBy,
                    reason: `Empty cylinder return on delivery ${delivery.deliveryNumber}`,
                  },
                });
              }
            }

            // Post Deskshark Invoice
            const invCount = await tx.invoice.count();
            const invoiceNumber = `INV-${String(invCount + 1).padStart(5, '0')}`;
            const grandTotal = delivery.items.reduce((sum: number, i: any) => sum + i.totalAmount, 0);

            await tx.invoice.create({
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
                  create: delivery.items.map((i: any) => ({
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

            // Post Ledger Entry
            await tx.ledgerEntry.create({
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

            // Update Customer Balance if Credit
            if (delivery.paymentMode === 'CREDIT') {
              await tx.customer.update({
                where: { id: delivery.customerId },
                data: { balance: { increment: grandTotal } },
              });
            }
          }
        }

        // 4. Handle STOCK_TRANSFER
        if (queueItem.requestType === 'STOCK_TRANSFER') {
          const transfer = await tx.stockTransfer.findUnique({
            where: { id: queueItem.referenceId },
            include: { items: true },
          });

          if (transfer) {
            await tx.stockTransfer.update({
              where: { id: transfer.id },
              data: { status: 'APPROVED', approvedBy: actionBy, approvedAt: new Date() },
            });

            for (const tItem of transfer.items) {
              await tx.inventoryTransaction.create({
                data: {
                  referenceNumber: transfer.transferNumber,
                  transactionType: transfer.transferType,
                  sourceType: transfer.fromLocationType,
                  sourceId: transfer.fromLocationId,
                  targetType: transfer.toLocationType,
                  targetId: transfer.toLocationId,
                  productId: tItem.productId,
                  productName: tItem.productName,
                  fullQty: tItem.fullQty,
                  emptyQty: tItem.emptyQty,
                  performedBy: actionBy,
                  reason: transfer.notes || `Stock Transfer ${transfer.transferNumber}`,
                },
              });
            }
          }
        }

        // 5. Handle STOCK_ADJUSTMENT
        if (queueItem.requestType === 'STOCK_ADJUSTMENT') {
          const payload = queueItem.payload as any;
          if (payload && payload.customerId && payload.productId) {
            const existing = await tx.customerCylinderInventory.findFirst({
              where: { customerId: payload.customerId, productId: payload.productId },
            });

            if (existing) {
              await tx.customerCylinderInventory.update({
                where: { id: existing.id },
                data: {
                  currentFullBalance: payload.currentFullBalance !== undefined ? Number(payload.currentFullBalance) : existing.currentFullBalance,
                  currentEmptyBalance: payload.currentEmptyBalance !== undefined ? Number(payload.currentEmptyBalance) : existing.currentEmptyBalance,
                  adjustmentQty: { increment: Number(payload.adjustmentQty || 0) },
                },
              });
            }

            await tx.inventoryTransaction.create({
              data: {
                referenceNumber: `ADJ-${Date.now()}`,
                transactionType: 'MANUAL_ADJUSTMENT',
                sourceType: 'CUSTOMER',
                sourceId: payload.customerId,
                targetType: 'CUSTOMER',
                targetId: payload.customerId,
                productId: payload.productId,
                productName: payload.productName || 'Cylinder Product',
                fullQty: Number(payload.currentFullBalance || 0),
                emptyQty: Number(payload.currentEmptyBalance || 0),
                performedBy: actionBy,
                reason: payload.reason || notes || 'Manual Audit Adjustment',
              },
            });
          }
        }

        // 6. Handle CASH_SUBMISSION
        if (queueItem.requestType === 'CASH_SUBMISSION') {
          const payload = queueItem.payload as any;
          if (payload && payload.deliveryBoyId && payload.submissionAmount) {
            const today = payload.date || new Date().toISOString().split('T')[0];

            // 6.1 Update Delivery Boy Day Log submitted total
            const dayLog = await tx.deliveryBoyDayLog.findFirst({
              where: { deliveryBoyId: payload.deliveryBoyId, date: today },
            });

            if (dayLog) {
              await tx.deliveryBoyDayLog.update({
                where: { id: dayLog.id },
                data: {
                  totalCashSubmitted: { increment: Number(payload.submissionAmount) },
                },
              });
            }

            // 6.2 Post Company Cash-in-Hand Ledger Entry
            await tx.ledgerEntry.create({
              data: {
                ledgerType: 'payment',
                date: today,
                voucherNumber: queueItem.referenceId,
                accountName: 'Cash-in-Hand (Agency Wallet)',
                particulars: `Cash Deposit received from ${payload.deliveryBoyName} (${payload.deliveryBoyId}) to ${payload.receiver || 'Accountant'}`,
                debit: 0,
                credit: Number(payload.submissionAmount),
                balance: Number(payload.submissionAmount),
              },
            });

            // 6.3 Audit Log
            await tx.auditLog.create({
              data: {
                id: `audit_${Date.now()}`,
                timestamp: new Date().toISOString(),
                actorEmail: actionBy,
                action: 'CASH_SUBMISSION_APPROVED',
                details: `Cash Submission ${queueItem.referenceId} of ₹${payload.submissionAmount} from ${payload.deliveryBoyName} approved by ${actionBy}`,
              },
            });
          }
        }
      });

      await logAuditAction({
        actorEmail: auth.user,
        action: 'QUEUE_ITEM_APPROVED',
        details: `Queue item ${queueItem.id} (${queueItem.requestType}) approved by ${auth.role}`,
        ipAddress: auth.ip,
      });

      return NextResponse.json({ success: true, message: 'Item approved atomically with full inventory & cash ledger updates!' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
