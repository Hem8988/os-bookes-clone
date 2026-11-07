import { prisma } from '@/lib/db';
import type { AuthContext } from '../auth';
import { forbidden } from '../http';
import { channelOf, liveStatus } from './gateway';

export type ChatChannel = { key: string; label: string; number: string | null; status: string; mine: boolean; company: boolean };

/**
 * The WhatsApp numbers whose chats this person may open:
 * - their own linked number;
 * - the company number ("main") if they linked it, or when no company number is linked yet
 *   (then "main" is the shared team inbox of the Meta / MSG91 number, as before);
 * - every number for the Super Admin.
 */
export async function chatChannels(auth: AuthContext): Promise<ChatChannel[]> {
  const sessions = await prisma.waSession.findMany({
    where: { tenantId: auth.tenantId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const isAdmin = auth.role === 'SUPER_ADMIN';
  const company = sessions.find((s) => s.isCompany);
  const out: ChatChannel[] = [];
  const status = (s: (typeof sessions)[number]) => liveStatus(s.id)?.status || s.status;

  const own = sessions.find((s) => s.userId === auth.userId && !s.isCompany);
  if (own) out.push({ key: channelOf(own), label: 'My WhatsApp', number: own.number, status: status(own), mine: true, company: false });

  if (isAdmin || !company || company.userId === auth.userId) {
    out.push({
      key: 'main',
      label: company ? `Company number${company.userId === auth.userId ? ' (mine)' : ` · ${company.user.name}`}` : 'Company inbox',
      number: company?.number ?? null,
      status: company ? status(company) : 'TEAM',
      mine: company?.userId === auth.userId,
      company: true,
    });
  }

  if (isAdmin) {
    for (const s of sessions) {
      if (s.isCompany || s.userId === auth.userId) continue;
      out.push({ key: channelOf(s), label: s.user.name, number: s.number, status: status(s), mine: false, company: false });
    }
  }
  return out;
}

/** The requested channel when allowed, else the person's first one. */
export async function resolveChannel(auth: AuthContext, requested?: string | null) {
  const channels = await chatChannels(auth);
  if (requested) {
    if (!channels.some((c) => c.key === requested)) throw forbidden('You cannot open the chats of this WhatsApp number.');
    return { channel: requested, channels };
  }
  return { channel: channels[0]?.key ?? null, channels };
}
