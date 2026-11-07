import { prisma } from '@/lib/db';
import { can, ROLES } from '@/lib/permissions';
import { audit } from '@/lib/server/audit';
import { requireAuth, type AuthContext } from '@/lib/server/auth';
import { badRequest, forbidden, handle, notFound, ok, readJson, str } from '@/lib/server/http';
import { sendWhatsAppText } from '@/lib/server/messaging/whatsapp';
import { getSetting } from '@/lib/server/settings';
import { channelOf, liveStatus, requestPairingCode, startSession, stopSession } from '@/lib/server/waweb/gateway';

/**
 * WhatsApp → Numbers: every staff member the admin allows links ONE WhatsApp number by QR.
 * GET  → my number (+ live QR while linking); for the admin also every staff member. ?userId= one person (admin).
 * POST → { action: allow | link | logout | setCompany | unsetCompany | test, userId?, allowed?, to? }
 */

const CHAT_ROLES = ROLES.filter((r) => can(r, 'whatsapp.chat'));

type SessionRow = { id: string; status: string; number: string | null; name: string | null; isCompany: boolean; connectedAt: Date | null; lastError: string | null };

function view(s: SessionRow | null | undefined) {
  if (!s) return null;
  const live = liveStatus(s.id);
  return {
    id: s.id,
    status: live?.status || s.status,
    qr: live?.qr || '',
    number: live?.number || s.number,
    name: live?.name || s.name,
    isCompany: s.isCompany,
    connectedAt: s.connectedAt,
    lastError: s.lastError,
  };
}

const isAdminOf = (auth: AuthContext) => can(auth.role, 'whatsapp.manage');

async function target(auth: AuthContext, userId: unknown) {
  const id = typeof userId === 'string' && userId ? userId : auth.userId;
  if (id !== auth.userId && !isAdminOf(auth)) throw forbidden('Only the admin can manage another person’s WhatsApp.');
  const user = await prisma.user.findFirst({ where: { id, tenantId: auth.tenantId }, include: { waSession: true } });
  if (!user) throw notFound('User not found.');
  if (!CHAT_ROLES.includes(user.role as (typeof CHAT_ROLES)[number])) throw badRequest('This role cannot use WhatsApp chats.');
  return user;
}

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.chat');
  const isAdmin = isAdminOf(auth);
  const userId = new URL(request.url).searchParams.get('userId');

  if (userId) {
    const u = await target(auth, userId);
    return ok({ userId: u.id, name: u.name, mobile: u.mobile, allowed: u.whatsappAllowed || u.role === 'SUPER_ADMIN', session: view(u.waSession) });
  }

  const me = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, include: { waSession: true } });
  const staff = isAdmin
    ? await prisma.user.findMany({
        where: { tenantId: auth.tenantId, role: { in: CHAT_ROLES }, status: 'ACTIVE' },
        include: { waSession: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      })
    : [];
  return ok({
    isAdmin,
    me: { userId: me.id, name: me.name, mobile: me.mobile, allowed: me.whatsappAllowed || me.role === 'SUPER_ADMIN', session: view(me.waSession) },
    staff: staff.map((u) => ({ userId: u.id, name: u.name, role: u.role, mobile: u.mobile, allowed: u.whatsappAllowed || u.role === 'SUPER_ADMIN', session: view(u.waSession) })),
  });
});

export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.chat', { write: true });
  const body = await readJson(request);
  const action = String(body.action || '');
  const user = await target(auth, body.userId);
  const allowed = user.whatsappAllowed || user.role === 'SUPER_ADMIN';

  if (action === 'allow') {
    if (!isAdminOf(auth)) throw forbidden('Only the admin can allow WhatsApp.');
    const on = body.allowed === true;
    await prisma.user.update({ where: { id: user.id }, data: { whatsappAllowed: on } });
    if (!on && user.waSession && user.role !== 'SUPER_ADMIN') {
      await stopSession(user.waSession.id, true);
      await prisma.waSession.delete({ where: { id: user.waSession.id } });
    }
    await audit(prisma, auth, { action: on ? 'WHATSAPP_ALLOWED' : 'WHATSAPP_DISALLOWED', entityType: 'User', entityId: user.id, reference: user.name, sensitive: true });
    return ok({ allowed: on }, on ? `${user.name} can now link their WhatsApp.` : `${user.name} can no longer use WhatsApp here.`);
  }

  if (action === 'link') {
    // The admin opening the QR for someone also allows them.
    if (!allowed) {
      if (!isAdminOf(auth)) throw forbidden('Ask the admin to allow WhatsApp for you first.');
      await prisma.user.update({ where: { id: user.id }, data: { whatsappAllowed: true } });
    }
    const session = user.waSession ?? (await prisma.waSession.create({ data: { tenantId: auth.tenantId, userId: user.id } }));
    await startSession(session.id);
    await audit(prisma, auth, { action: 'WHATSAPP_LINK_STARTED', entityType: 'WaSession', entityId: session.id, reference: user.name });
    return ok({ session: view(session) }, 'Scan the QR with WhatsApp → Linked devices → Link a device.');
  }

  if (!user.waSession) throw badRequest('No WhatsApp number is linked for this person.');
  const session = user.waSession;

  if (action === 'pairCode') {
    // Link by typing a code on the phone instead of scanning the QR.
    const phone = str(body.phone, 'Mobile number', { required: true, max: 20 });
    try {
      const code = await requestPairingCode(session.id, phone);
      await audit(prisma, auth, { action: 'WHATSAPP_PAIR_CODE', entityType: 'WaSession', entityId: session.id, reference: user.name });
      return ok({ code }, 'Type this code on the phone.');
    } catch (e) {
      throw badRequest((e as Error).message || 'Could not get a code from WhatsApp.');
    }
  }

  if (action === 'logout') {
    await stopSession(session.id, true);
    await audit(prisma, auth, { action: 'WHATSAPP_LOGGED_OUT', entityType: 'WaSession', entityId: session.id, reference: `${user.name} ${session.number || ''}`.trim(), sensitive: true });
    return ok(null, 'WhatsApp logged out. Scan the QR again to link it.');
  }

  if (action === 'setCompany' || action === 'unsetCompany') {
    if (!isAdminOf(auth)) throw forbidden('Only the admin can choose the company number.');
    const on = action === 'setCompany';
    await prisma.$transaction([
      ...(on ? [prisma.waSession.updateMany({ where: { tenantId: auth.tenantId, isCompany: true }, data: { isCompany: false } })] : []),
      prisma.waSession.update({ where: { id: session.id }, data: { isCompany: on } }),
    ]);
    await audit(prisma, auth, { action: on ? 'WHATSAPP_COMPANY_SET' : 'WHATSAPP_COMPANY_UNSET', entityType: 'WaSession', entityId: session.id, reference: `${user.name} ${session.number || ''}`.trim(), sensitive: true });
    return ok(null, on ? `${user.name}’s number now sends the automatic messages and runs the bot.` : 'Company number removed.');
  }

  if (action === 'test') {
    const to = str(body.to, 'Mobile number', { required: true, max: 20 });
    const channel = channelOf(session);
    const r = await sendWhatsAppText(auth.tenantId, to, `✅ Test message from ${(await getSetting(auth.tenantId, 'company')).name} (${new Date().toLocaleString('en-IN')})`, 'TEST', { channel, sentBy: auth.name, priority: true });
    if (!r.ok) throw badRequest(r.error || 'WhatsApp did not take the message.');
    return ok(null, 'Test message sent.');
  }

  throw badRequest('Unknown action.');
});
