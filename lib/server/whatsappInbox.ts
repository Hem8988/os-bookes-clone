import { prisma } from '@/lib/db';
import { phoneKey, toWhatsAppNumber } from '@/lib/phone';
import { preview } from './messaging/whatsapp';
import { notifyRoles, notifyUsers } from './notify';
import { storeFile } from './storage';
import { handleIncomingMessage } from './whatsappBot';

// Team inbox (WhatsApp → Chats): every incoming message lands here from the Meta or
// MSG91 webhook. While nobody has taken the chat over, the ordering bot answers it.

const BOT_TENANT = process.env.DEFAULT_TENANT_ID || 'default';

export type InboundMedia = { kind: 'image' | 'document' | 'video' | 'audio' | 'sticker'; download: () => Promise<Buffer | null>; caption?: string };
export type Inbound = { phone: string; text: string; providerId?: string | null; name?: string | null; media?: InboundMedia | null };

export function findCustomerByPhone(tenantId: string, phone: string) {
  const key = phoneKey(phone);
  if (key.length !== 10) return null;
  return prisma.customer.findFirst({ where: { tenantId, type: 'Customer', OR: [{ whatsappNumber: { endsWith: key } }, { phone: { endsWith: key } }] }, select: { id: true, name: true } });
}

/** Keep our own copy of a photo / PDF the customer sent (other kinds are only noted). */
async function keepMedia(tenantId: string, media: InboundMedia) {
  try {
    const data = await media.download();
    return data ? (await storeFile(tenantId, data)).url : null;
  } catch {
    return null;
  }
}

/** Store an incoming WhatsApp message, update its chat, then let the bot or a person answer. */
export async function receiveWhatsApp(tenantId: string, input: Inbound) {
  const phone = toWhatsAppNumber(input.phone);
  if (!phone) return { duplicate: false };
  const text = (input.text || input.media?.caption || '').trim();
  const mediaUrl = input.media ? await keepMedia(tenantId, input.media) : null;
  try {
    // The unique providerId makes webhook retries harmless.
    await prisma.messageLog.create({
      data: {
        tenantId,
        channel: 'WHATSAPP',
        direction: 'IN',
        recipient: phone,
        body: text || (input.media && !mediaUrl ? `[${input.media.kind} — open it in WhatsApp]` : ''),
        providerId: input.providerId || undefined,
        status: 'RECEIVED',
        mediaUrl: mediaUrl ?? undefined,
        mediaType: input.media?.kind,
      },
    });
  } catch {
    return { duplicate: true };
  }

  const before = await prisma.whatsAppConversation.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
  const customer = before?.customerId ? null : await findCustomerByPhone(tenantId, phone);
  const now = new Date();
  const conv = await prisma.whatsAppConversation.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: { tenantId, phone, customerId: customer?.id, name: input.name || customer?.name || null, lastPreview: preview(text, input.media?.kind), lastActivityAt: now, lastInboundAt: now, unread: 1 },
    update: {
      lastPreview: preview(text, input.media?.kind),
      lastActivityAt: now,
      lastInboundAt: now,
      unread: { increment: 1 },
      ...(customer ? { customerId: customer.id } : {}),
      ...(!before?.name && (input.name || customer?.name) ? { name: input.name || customer?.name } : {}),
    },
  });

  if (conv.botPaused) {
    // A person handles this chat: tell them (once per burst of messages, not for every line).
    const quiet = !before?.lastInboundAt || now.getTime() - before.lastInboundAt.getTime() > 10 * 60_000 || before.unread === 0;
    if (quiet) {
      const message = { title: `WhatsApp: ${conv.name || phone}`, body: preview(text, input.media?.kind) || 'New message', link: `/admin?tab=whatsapp&sub=chats&chat=${phone}` };
      await (conv.assignedToId ? notifyUsers(tenantId, [conv.assignedToId], message) : notifyRoles(tenantId, ['SUPER_ADMIN', 'MANAGER'], message));
    }
    return { duplicate: false, conversation: conv };
  }
  // The ordering bot works on text and button replies of the main company only.
  if (text && tenantId === BOT_TENANT) await handleIncomingMessage(phone, text);
  return { duplicate: false, conversation: conv };
}

const RANK: Record<string, number> = { SIMULATED: 0, FAILED: 0, SENT: 1, DELIVERED: 2, READ: 3 };

/** Delivery report from the provider: sent → delivered → read (never backwards), or failed. */
export async function updateWhatsAppStatus(providerIds: (string | null | undefined)[], rawStatus: string, error?: string | null) {
  const ids = [...new Set(providerIds.filter(Boolean) as string[])];
  const s = rawStatus.toLowerCase();
  const status = s.includes('read') ? 'READ' : s.includes('deliver') ? 'DELIVERED' : s.includes('fail') || s.includes('reject') ? 'FAILED' : s.includes('sent') || s.includes('submit') ? 'SENT' : null;
  if (!ids.length || !status) return;
  const rows = await prisma.messageLog.findMany({ where: { providerId: { in: ids }, direction: 'OUT' }, select: { id: true, status: true } });
  for (const r of rows) {
    if (status === 'FAILED' ? r.status !== 'READ' : (RANK[status] ?? 0) > (RANK[r.status] ?? 0)) {
      await prisma.messageLog.update({ where: { id: r.id }, data: { status, ...(status === 'FAILED' && error ? { error: error.slice(0, 500) } : {}) } });
    }
  }
}
