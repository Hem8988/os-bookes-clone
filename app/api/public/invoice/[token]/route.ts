import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/server/auth';
import { handle, notFound, ok } from '@/lib/server/http';
import { invoicePrintData } from '@/lib/server/invoicePrint';
import { verifyInvoiceViewToken } from '@/lib/server/payPage';

type Ctx = { params: Promise<{ token: string }> };

/**
 * The printed invoice for the public page (/i/<token>) opened from WhatsApp, without a login.
 * The token is the invoice id signed with SESSION_SECRET, so another invoice cannot be guessed.
 */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  rateLimit(`public-invoice:${ip}`, 60, 60_000);
  const { token } = await ctx.params;
  const id = verifyInvoiceViewToken(decodeURIComponent(token));
  const invoice = id ? await prisma.invoice.findUnique({ where: { id }, include: { items: true } }) : null;
  if (!invoice || invoice.status === 'Cancelled') throw notFound('This invoice link is not valid.');
  return ok(await invoicePrintData(invoice, { canEditRefs: false, attachments: false }));
});
