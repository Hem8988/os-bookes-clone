import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      invoiceNumber,
      transactionId,
      amount,
      paymentMode = 'UPI',
      customerPhone,
      customerName,
      status = 'SUCCESS'
    } = body;

    if (!invoiceNumber || !amount || status !== 'SUCCESS') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload or payment status not successful' },
        { status: 400 }
      );
    }

    // 1. Find Invoice by Number
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber }
    });

    if (invoice) {
      // 2. Mark Invoice as PAID
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'Paid', paymentMode }
      });

      // 3. Create Ledger Entries for Payment Realization
      await prisma.ledgerEntry.create({
        data: {
          ledgerType: 'customer',
          date: new Date().toISOString().split('T')[0],
          voucherNumber: `REC-${transactionId || Date.now()}`,
          accountName: invoice.customerName,
          particulars: `UPI Payment Received for Invoice #${invoiceNumber}`,
          debit: 0,
          credit: Number(amount),
          balance: Math.max(0, invoice.grandTotal - Number(amount))
        }
      });

      await prisma.ledgerEntry.create({
        data: {
          ledgerType: 'payment',
          date: new Date().toISOString().split('T')[0],
          voucherNumber: `REC-${transactionId || Date.now()}`,
          accountName: 'UPI Direct Gateway',
          particulars: `Auto-reconciled settlement for Invoice #${invoiceNumber}`,
          debit: Number(amount),
          credit: 0,
          balance: Number(amount)
        }
      });

      // 4. Dispatch WhatsApp Payment Confirmation Receipt
      const recipientPhone = customerPhone || invoice.customerPhone;
      if (recipientPhone) {
        await sendWhatsAppMessage(
          recipientPhone,
          `✅ *PAYMENT RECEIVED CONFIRMATION*\n\nNamaste *${customerName || invoice.customerName}*!\nAapki payment successfully receive ho gayi hai:\n\n📄 Invoice #: *${invoiceNumber}*\n💰 Amount Paid: *₹${amount}*\n🆔 Transaction ID: *${transactionId || 'UPI-' + Date.now()}*\n\nShukriya! — *Pramukh Indane Gas Agency*`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment reconciled for invoice #${invoiceNumber}`,
      data: { invoiceNumber, transactionId, amount, status: 'PAID' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
