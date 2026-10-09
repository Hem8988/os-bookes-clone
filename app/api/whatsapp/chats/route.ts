import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { phoneKey, toWhatsAppNumber } from '@/lib/phone';
import { DEFAULT_TEMPLATES } from '@/lib/whatsapp';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { whatsappReadyFor } from '@/lib/server/messaging/whatsapp';

/** Values the team fills in when sending a template from a chat (the rest come from the company / customer). */
const AUTO_VARS = new Set(['companyName', 'supportPhone', 'customerName', 'portalLink', 'due', 'paymentStatus']);

/**
 * Team inbox list. ?filter=unread|mine|human, ?q= name / number search.
 * ?customers=<text> instead searches customers to start a new chat.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.chat');
  const url = new URL(request.url);

  const customerQuery = url.searchParams.get('customers');
  if (customerQuery !== null) {
    const q = customerQuery.trim();
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: auth.tenantId,
        type: 'Customer',
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/\D/g, '') || q } }, { whatsappNumber: { contains: q.replace(/\D/g, '') || q } }] } : {}),
      },
      select: { id: true, name: true, phone: true, whatsappNumber: true, area: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return ok(customers.filter((c) => phoneKey(c.whatsappNumber || c.phone).length === 10));
  }

  const filter = url.searchParams.get('filter') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const where: Prisma.WhatsAppConversationWhereInput = { tenantId: auth.tenantId };
  if (filter === 'unread') where.unread = { gt: 0 };
  if (filter === 'mine') where.assignedToId = auth.userId;
  if (filter === 'human') where.botPaused = true;
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/\D/g, '') || q } }];
  const [chats, unreadTotal] = await Promise.all([
    prisma.whatsAppConversation.findMany({
      where,
      select: { phone: true, name: true, customerId: true, lastPreview: true, lastActivityAt: true, lastInboundAt: true, unread: true, botPaused: true, assignedToName: true, assignedToId: true },
      orderBy: { lastActivityAt: 'desc' },
      take: 200,
    }),
    prisma.whatsAppConversation.aggregate({ where: { tenantId: auth.tenantId, unread: { gt: 0 } }, _count: true }),
  ]);
  return ok({
    chats,
    unreadChats: unreadTotal._count,
    connected: await whatsappReadyFor(auth.tenantId),
    templates: DEFAULT_TEMPLATES.filter((t) => t.key !== 'OTP').map((t) => ({ key: t.key, name: t.name, fields: t.variables.filter((v) => !AUTO_VARS.has(v)) })),
  });
});

/** Open (or start) a chat with a customer or any number. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.chat', { write: true });
  const body = await readJson(request);
  let name: string | null = null;
  let customerId: string | null = null;
  let phone = '';
  if (body.customerId) {
    const c = await prisma.customer.findFirst({ where: { id: str(body.customerId, 'Customer'), tenantId: auth.tenantId } });
    if (!c) throw notFound('Customer not found.');
    phone = toWhatsAppNumber(c.whatsappNumber || c.phone);
    name = c.name;
    customerId = c.id;
  } else phone = toWhatsAppNumber(str(body.phone, 'Mobile number', { required: true }));
  if (!/^\d{11,15}$/.test(phone)) throw badRequest('Enter a 10-digit mobile number.');
  const chat = await prisma.whatsAppConversation.upsert({
    where: { tenantId_phone: { tenantId: auth.tenantId, phone } },
    create: { tenantId: auth.tenantId, phone, name, customerId, lastActivityAt: new Date() },
    update: { ...(customerId ? { customerId } : {}), ...(name ? { name } : {}) },
  });
  return ok({ phone: chat.phone });
});
