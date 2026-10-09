import { prisma } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, badRequest, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { publicMediaUrl } from '@/lib/server/messaging/publicMedia';
import { sendWhatsAppMedia, sendWhatsAppText, whatsappReadyFor } from '@/lib/server/messaging/whatsapp';
import { prepareMessage, sendCustomerWhatsApp } from '@/lib/server/notify';
import { fileTenantFolder, isStoredFile } from '@/lib/server/storage';

type Ctx = { params: Promise<{ phone: string }> };

/** Free-form replies are allowed for 24 h after the customer's last message (WhatsApp rule). */
const WINDOW_MS = 24 * 3_600_000;

async function chatFor(tenantId: string, ctx: Ctx) {
  const phone = (await ctx.params).phone.replace(/\D/g, '');
  const chat = await prisma.whatsAppConversation.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
  if (!chat) throw notFound('Chat not found.');
  return chat;
}

/** One chat: the messages (oldest first), the 24 h window and the customer's account in short. Marks it read. */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'whatsapp.chat');
  const chat = await chatFor(auth.tenantId, ctx);
  const [rows, customer] = await Promise.all([
    prisma.messageLog.findMany({
      where: { tenantId: auth.tenantId, channel: 'WHATSAPP', recipient: chat.phone },
      select: { id: true, direction: true, body: true, status: true, error: true, mediaUrl: true, mediaType: true, sentBy: true, templateKey: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    chat.customerId
      ? prisma.customer.findFirst({
          where: { id: chat.customerId, tenantId: auth.tenantId },
          select: { id: true, name: true, contactPerson: true, phone: true, area: true, balance: true, creditLimit: true, paymentTerms: true, status: true },
        })
      : null,
  ]);
  const [orders, invoices] = customer
    ? await Promise.all([
        prisma.order.findMany({ where: { tenantId: auth.tenantId, customerId: customer.id }, select: { id: true, orderNumber: true, status: true, totalAmount: true, requestedDeliveryDate: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.invoice.findMany({ where: { tenantId: auth.tenantId, customerId: customer.id, status: { not: 'Cancelled' } }, select: { id: true, invoiceNumber: true, date: true, grandTotal: true, paidAmount: true, status: true }, orderBy: { date: 'desc' }, take: 5 }),
      ])
    : [[], []];
  if (chat.unread) await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: { unread: 0 } });
  const windowEndsAt = chat.lastInboundAt ? new Date(chat.lastInboundAt.getTime() + WINDOW_MS) : null;
  return ok({
    chat: { ...chat, unread: 0 },
    messages: rows.reverse(),
    windowOpen: !!windowEndsAt && windowEndsAt > new Date(),
    windowEndsAt,
    connected: await whatsappReadyFor(auth.tenantId),
    customer: customer ? { ...customer, orders, invoices } : null,
  });
});

/**
 * Chat actions: send (text), media (photo / PDF already uploaded), template, pauseBot,
 * resumeBot, assign (to me), unassign. Anything a person sends takes the chat over from the bot.
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'whatsapp.chat', { write: true });
  const chat = await chatFor(auth.tenantId, ctx);
  const body = await readJson(request);
  const action = String(body.action || '');
  const takeOver = { botPaused: true, unread: 0, ...(chat.assignedToId ? {} : { assignedToId: auth.userId, assignedToName: auth.name }) };

  if (action === 'pauseBot' || action === 'resumeBot') {
    await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: { botPaused: action === 'pauseBot' } });
    return ok({ botPaused: action === 'pauseBot' }, action === 'pauseBot' ? 'Bot paused — you are handling this chat.' : 'Bot is answering this chat again.');
  }
  if (action === 'assign' || action === 'unassign') {
    await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: action === 'assign' ? { assignedToId: auth.userId, assignedToName: auth.name } : { assignedToId: null, assignedToName: null } });
    return ok({ done: true }, action === 'assign' ? 'Chat assigned to you.' : 'Chat unassigned.');
  }

  const connected = await whatsappReadyFor(auth.tenantId);
  const windowOpen = !!chat.lastInboundAt && Date.now() - chat.lastInboundAt.getTime() < WINDOW_MS;
  // Without any WhatsApp set up messages are only logged, so the window doesn't matter.
  const needWindow = () => {
    if (connected && !windowOpen) throw new ApiError(409, 'The customer has not written in the last 24 hours, so WhatsApp only allows an approved template. Send a template instead.', 'WINDOW_CLOSED');
  };

  if (action === 'send') {
    needWindow();
    const text = str(body.text, 'Message', { required: true, max: 4000 });
    const r = await sendWhatsAppText(auth.tenantId, chat.phone, text, undefined, { sentBy: auth.name });
    await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: takeOver });
    if (!r.ok) throw new ApiError(502, `WhatsApp did not take the message: ${r.error || 'unknown error'}`, 'SEND_FAILED');
    return ok({ sent: true });
  }

  if (action === 'media') {
    needWindow();
    const fileUrl = str(body.fileUrl, 'File', { required: true });
    if (!isStoredFile(fileUrl) || fileTenantFolder(fileUrl.slice('/api/files/'.length)) !== auth.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-')) throw badRequest('Upload the file first.');
    const link = publicMediaUrl(fileUrl);
    if (!link && connected) throw badRequest('Set APP_URL to your public https:// address to send files on WhatsApp.');
    const kind = fileUrl.endsWith('.pdf') ? 'document' : 'image';
    const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, 1024) : '';
    const r = await sendWhatsAppMedia(auth.tenantId, chat.phone, { kind, link: link || fileUrl, storedUrl: fileUrl, caption, filename: typeof body.filename === 'string' ? body.filename.slice(0, 100) : undefined }, { sentBy: auth.name });
    await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: takeOver });
    if (!r.ok) throw new ApiError(502, `WhatsApp did not take the file: ${r.error || 'unknown error'}`, 'SEND_FAILED');
    return ok({ sent: true });
  }

  if (action === 'template') {
    // Works outside the 24 h window too, once the template is approved (MSG91 / Meta).
    const key = str(body.key, 'Template', { required: true });
    const vars = (body.vars && typeof body.vars === 'object' ? body.vars : {}) as Record<string, unknown>;
    const values = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'string' || typeof v === 'number' ? String(v) : '']));
    const m = await prepareMessage(auth.tenantId, key, chat.name || 'Customer', values);
    if (!m) throw badRequest('This message is switched off in the templates.');
    const r = await sendCustomerWhatsApp(auth.tenantId, chat.phone, key, m, { sentBy: auth.name });
    await prisma.whatsAppConversation.update({ where: { id: chat.id }, data: takeOver });
    await audit(prisma, auth, { action: 'WHATSAPP_TEMPLATE_SENT', entityType: 'WhatsAppConversation', entityId: chat.id, reference: `${key} → ${chat.phone}` });
    if (!r.ok) throw new ApiError(502, `WhatsApp did not take the template: ${('error' in r && r.error) || 'unknown error'}`, 'SEND_FAILED');
    return ok({ sent: true }, 'Template sent.');
  }
  throw badRequest('Unknown action.');
});
