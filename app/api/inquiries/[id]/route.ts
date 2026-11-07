import { prisma } from '@/lib/db';
import { INQUIRY_STATUSES, type InquiryStatus } from '@/lib/inquiries';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, notFound, ok, readJson, str } from '@/lib/server/http';

type Ctx = { params: Promise<{ id: string }> };

/** Follow up one website inquiry: { status?, notes? }. */
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request, 'inquiries.manage', { write: true });
  const { id } = await ctx.params;
  const inquiry = await prisma.inquiry.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!inquiry) throw notFound('Inquiry not found.');
  const body = await readJson(request);

  const data: { status?: InquiryStatus; notes?: string | null; handledById?: string; handledByName?: string; contactedAt?: Date } = {};
  if (body.status !== undefined) {
    if (!INQUIRY_STATUSES.includes(body.status as InquiryStatus)) throw badRequest('Unknown status.');
    data.status = body.status as InquiryStatus;
    data.handledById = auth.userId;
    data.handledByName = auth.name;
    if (data.status !== 'NEW' && !inquiry.contactedAt) data.contactedAt = new Date();
  }
  if (body.notes !== undefined) data.notes = str(body.notes, 'Notes', { max: 2000 }) || null;
  if (!Object.keys(data).length) throw badRequest('Nothing to change.');

  const saved = await prisma.inquiry.update({ where: { id: inquiry.id }, data });
  if (data.status && data.status !== inquiry.status) {
    await audit(prisma, auth, { action: 'INQUIRY_STATUS', entityType: 'Inquiry', entityId: inquiry.id, reference: `${inquiry.inquiryNumber} ${inquiry.status} → ${data.status}` });
  }
  return ok(saved, data.status ? `Marked ${data.status.toLowerCase()}.` : 'Notes saved.');
});
