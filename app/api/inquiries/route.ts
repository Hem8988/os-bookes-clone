import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { phoneKey } from '@/lib/phone';
import { rateLimit, requireAuth } from '@/lib/server/auth';
import { badRequest, clientIp, handle, ok, readJson, str } from '@/lib/server/http';
import { createInquiry } from '@/lib/server/inquiries';
import { INQUIRY_NEEDS } from '@/lib/inquiries';

/**
 * Website inquiry form (public, no login): POST saves the inquiry and sends it to the
 * Super Admin and managers (in the app and on WhatsApp from the company number).
 * GET lists inquiries for the team (?status=, ?q=).
 */

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';


export const POST = handle(async (request: Request) => {
  const ip = clientIp(request);
  rateLimit(`inquiry:${ip}`, 5, 10 * 60_000);
  const body = await readJson<Record<string, unknown>>(request);
  // Hidden "website" field: people never fill it, form-filling bots do.
  if (typeof body.website === 'string' && body.website.trim()) return ok({ inquiryNumber: null }, 'Thank you! We will call you soon.');

  const name = str(body.name, 'Name', { required: true, max: 80 });
  const phoneRaw = str(body.phone, 'Mobile number', { required: true, max: 20 });
  const phone = phoneKey(phoneRaw);
  if (phone.length !== 10 || !/^[6-9]/.test(phone)) throw badRequest('Enter a valid 10-digit mobile number.');
  rateLimit(`inquiry-phone:${phone}`, 3, 60 * 60_000);
  const email = str(body.email, 'Email', { max: 120 });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Enter a valid email address.');
  const need = typeof body.need === 'string' && INQUIRY_NEEDS[body.need] ? body.need : 'OTHER';
  const qty = Number(body.monthlyQty);
  const data = {
    name,
    phone,
    email: email || null,
    businessName: str(body.businessName, 'Business name', { max: 120 }) || null,
    city: str(body.city, 'City', { max: 80 }) || null,
    need,
    cylinderSize: str(body.cylinderSize, 'Cylinder size', { max: 60 }) || null,
    monthlyQty: Number.isInteger(qty) && qty > 0 && qty < 100_000 ? qty : null,
    message: str(body.message, 'Message', { max: 1000 }) || null,
  };

  const inquiry = await createInquiry(TENANT, { ...data, source: 'WEBSITE', ip });
  return ok({ inquiryNumber: inquiry.inquiryNumber }, 'Thank you! We will call you soon.');
});

export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'inquiries.manage');
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').trim();
  const where: Prisma.InquiryWhereInput = { tenantId: auth.tenantId };
  if (status && status !== 'ALL') where.status = status;
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { businessName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/\D/g, '') || q } }, { city: { contains: q, mode: 'insensitive' } }, { inquiryNumber: { contains: q, mode: 'insensitive' } }];
  const [rows, counts] = await Promise.all([
    prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.inquiry.groupBy({ by: ['status'], where: { tenantId: auth.tenantId }, _count: true }),
  ]);
  return ok({ inquiries: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])), needs: INQUIRY_NEEDS });
});
