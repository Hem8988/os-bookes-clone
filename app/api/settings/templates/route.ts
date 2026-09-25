import { prisma } from '@/lib/db';
import { DEFAULT_TEMPLATES } from '@/lib/whatsapp';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { emailReady } from '@/lib/server/messaging/email';
import { pushConfigured } from '@/lib/server/messaging/push';
import { smsConfigured } from '@/lib/server/messaging/sms';
import { whatsappConfigured } from '@/lib/server/messaging/whatsapp';

/** WhatsApp notification templates (SRS §13.3) merged with the defaults. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage');
  const stored = await prisma.whatsAppTemplate.findMany({ where: { tenantId: auth.tenantId } });
  const templates = DEFAULT_TEMPLATES.map((d) => {
    const s = stored.find((t) => t.key === d.key);
    return { ...d, body: s?.body ?? d.body, metaTemplateName: s?.metaTemplateName ?? null, language: s?.language ?? 'en', active: s?.active ?? true, customised: !!s };
  });
  return ok({ templates, channels: { whatsapp: whatsappConfigured(), email: await emailReady(auth.tenantId), sms: smsConfigured(), push: pushConfigured() } });
});

export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage', { write: true });
  const body = await readJson(request);
  const key = str(body.key, 'Template', { required: true });
  const def = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!def) throw badRequest('Unknown template.');
  const data = {
    name: def.name,
    body: str(body.body, 'Message', { required: true, max: 1000 }),
    variables: def.variables,
    metaTemplateName: optStr(body.metaTemplateName),
    language: optStr(body.language) || 'en',
    active: body.active !== false,
  };
  const saved = await prisma.whatsAppTemplate.upsert({ where: { tenantId_key: { tenantId: auth.tenantId, key } }, create: { tenantId: auth.tenantId, key, ...data }, update: data });
  await audit(prisma, auth, { action: 'TEMPLATE_UPDATED', entityType: 'WhatsAppTemplate', entityId: saved.id, reference: key });
  return ok(saved, 'Template saved.');
});
