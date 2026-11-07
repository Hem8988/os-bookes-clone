import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/server/auth';
import { handle, notFound } from '@/lib/server/http';
import { invoiceAttachments } from '@/lib/server/invoicePrint';
import { verifyInvoiceViewToken } from '@/lib/server/payPage';
import { isStoredFile, readStoredFile } from '@/lib/server/storage';

type Ctx = { params: Promise<{ token: string; n: string }> };

/**
 * The n-th paperwork photo of an invoice (challan, payment screenshot, cheque, delivery proof)
 * for the public invoice page. Only files attached to that invoice, and only with its signed link.
 */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  rateLimit(`public-invoice-file:${ip}`, 120, 60_000);
  const { token, n } = await ctx.params;
  const id = verifyInvoiceViewToken(decodeURIComponent(token));
  const invoice = id ? await prisma.invoice.findUnique({ where: { id } }) : null;
  if (!invoice || invoice.status === 'Cancelled') throw notFound('File not found.');
  const att = (await invoiceAttachments(invoice))[Number(n)];
  if (!att || !isStoredFile(att.url)) throw notFound('File not found.');
  const file = await readStoredFile(att.url.slice('/api/files/'.length));
  if (!file) throw notFound('File not found.');
  return new Response(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.mime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  });
});
