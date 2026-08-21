import { NextResponse } from 'next/server';
import { generateUpiQrCode } from '@/lib/paymentGateway';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, amount, invoiceNumber, upiId = 'agency@upi' } = body;

    const paymentInfo = generateUpiQrCode(upiId, customerName || 'Valued Customer', Number(amount || 0), invoiceNumber || 'INV-001');

    return NextResponse.json({ success: true, data: paymentInfo });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
