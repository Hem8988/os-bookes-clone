import { prisma } from '@/lib/db';
import { toWhatsAppNumber } from '@/lib/phone';
import { requireAuth } from '@/lib/server/auth';
import { handle, ok, readJson, str } from '@/lib/server/http';
import { handleIncomingMessage } from '@/lib/server/whatsappBot';

/** Admin tool: chat with the bot as a customer phone and see the replies. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage');
  const body = await readJson(request);
  const phone = toWhatsAppNumber(str(body.phone, 'Phone', { required: true }));
  const text = str(body.text, 'Message', { required: true, max: 500 });
  const since = new Date();
  await prisma.messageLog.create({ data: { tenantId: auth.tenantId, channel: 'WHATSAPP', direction: 'IN', recipient: phone, body: text, status: 'SIMULATED' } });
  await handleIncomingMessage(phone, text);
  const replies = await prisma.messageLog.findMany({ where: { channel: 'WHATSAPP', direction: 'OUT', recipient: phone, createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } });
  return ok(replies.map((r) => ({ body: r.body, status: r.status, at: r.createdAt })));
});

/** Recent WhatsApp / email / SMS traffic for the message log screen. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage');
  const logs = await prisma.messageLog.findMany({ where: { tenantId: auth.tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
  return ok(logs);
});
