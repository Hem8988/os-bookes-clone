import { NextResponse } from 'next/server';
import { handleIncomingWhatsAppMessage } from '@/lib/whatsapp';

// In-memory set for WhatsApp Message ID Deduplication
const processedMessageIds = new Set<string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'deskshark_whatsapp_secret';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support standard Meta Cloud API webhook & custom Deskshark simulation payloads
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0] || body.message;

    const from = message?.from || body.from;
    const text = message?.text?.body || message?.interactive?.button_reply?.id || body.text || '';
    const messageId = message?.id || body.messageId || `msg_${from}_${Date.now()}`;

    if (from && text) {
      // Deduplication Check
      if (processedMessageIds.has(messageId)) {
        console.log(`[WhatsApp Webhook] Duplicate message skipped: ${messageId}`);
        return NextResponse.json({ status: 'duplicate_skipped' });
      }

      processedMessageIds.add(messageId);
      // Keep deduplication set bounded to last 1000 messages
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      await handleIncomingWhatsAppMessage(from, text);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[WhatsApp Webhook Exception]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
