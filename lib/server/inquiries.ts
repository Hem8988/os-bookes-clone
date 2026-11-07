import { prisma } from '@/lib/db';
import { INQUIRY_NEEDS } from '@/lib/inquiries';
import { notifyRoles } from './notify';
import { nextNumber } from './sequence';

// Saving an inquiry and telling the team: used by the website form and by the WhatsApp bot
// (a number that is not a customer yet).

export type InquiryInput = {
  name: string;
  phone: string; // 10 digits
  email?: string | null;
  businessName?: string | null;
  city?: string | null;
  need: string;
  cylinderSize?: string | null;
  monthlyQty?: number | null;
  message?: string | null;
  source: 'WEBSITE' | 'WHATSAPP';
  ip?: string | null;
};

const SOURCE_LABEL = { WEBSITE: 'website', WHATSAPP: 'WhatsApp' } as const;

export async function createInquiry(tenantId: string, input: InquiryInput) {
  const inquiry = await prisma.$transaction(async (tx) =>
    tx.inquiry.create({ data: { tenantId, inquiryNumber: await nextNumber(tx, tenantId, 'INQ'), ...input } })
  );

  // The team hears about it at once; a WhatsApp problem must not lose the inquiry.
  const lines = [
    `${inquiry.name}${inquiry.businessName ? ` · ${inquiry.businessName}` : ''}`,
    `📞 +91 ${inquiry.phone}`,
    `Need: ${INQUIRY_NEEDS[inquiry.need] || inquiry.need}${inquiry.cylinderSize ? ` · ${inquiry.cylinderSize}` : ''}${inquiry.monthlyQty ? ` · ${inquiry.monthlyQty}/month` : ''}`,
    inquiry.city ? `City: ${inquiry.city}` : '',
    inquiry.message ? `“${inquiry.message.slice(0, 300)}”` : '',
  ].filter(Boolean);
  await notifyRoles(tenantId, ['SUPER_ADMIN', 'MANAGER'], {
    title: `New ${SOURCE_LABEL[input.source]} inquiry ${inquiry.inquiryNumber}`,
    body: lines.join('\n'),
    link: `/admin?tab=inquiries&id=${inquiry.id}`,
    whatsapp: true,
  }).catch((e) => console.error('[inquiry] notify failed:', (e as Error).message));
  return inquiry;
}

/** An inquiry from this number that the team is still handling (to avoid duplicates). */
export function openInquiryFor(tenantId: string, phone: string, withinDays = 30) {
  return prisma.inquiry.findFirst({
    where: { tenantId, phone, status: { in: ['NEW', 'CONTACTED'] }, createdAt: { gte: new Date(Date.now() - withinDays * 86_400_000) } },
    orderBy: { createdAt: 'desc' },
  });
}
