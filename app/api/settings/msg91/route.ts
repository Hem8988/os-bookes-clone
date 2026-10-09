import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { DEFAULT_TEMPLATES, SAMPLE_VARS } from '@/lib/whatsapp';
import { audit } from '@/lib/server/audit';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson, str } from '@/lib/server/http';
import { digits, msg91Config, saveTemplateLink, smsReady, whatsappNumbers, whatsappReady } from '@/lib/server/messaging/msg91';
import { createSmsTemplate, createWhatsAppTemplate, deleteWhatsAppTemplate, refreshTemplateStatus, smsText, whatsappBody } from '@/lib/server/messaging/msg91Templates';
import { sendSms } from '@/lib/server/messaging/sms';
import { prepareMessage, sendCustomerWhatsApp } from '@/lib/server/notify';
import { seal } from '@/lib/server/secretBox';
import { getSetting, saveSetting } from '@/lib/server/settings';

/** Secret for the MSG91 webhook URL (made on first visit, or again to cut off an old URL). */
async function newWebhookToken(tenantId: string, by: string) {
  const token = randomBytes(24).toString('base64url');
  const s = await getSetting(tenantId, 'msg91');
  await saveSetting(tenantId, 'msg91', { ...s, webhookToken: token }, by);
  return token;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** MSG91 settings (never the auth key itself) and every message template with its MSG91 state. */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage');
  const c = await msg91Config(auth.tenantId);
  const webhookToken = c.webhookToken || (await newWebhookToken(auth.tenantId, auth.name));
  const templates = await Promise.all(
    DEFAULT_TEMPLATES.map(async (d) => {
      const [wa, sms] = await Promise.all([whatsappBody(auth.tenantId, d.key), smsText(auth.tenantId, d.key)]);
      return { key: d.key, name: d.name, hasCard: !!d.card, button: d.button?.label ?? null, link: c.templates[d.key] ?? {}, waText: wa.text, waParams: wa.params, smsText: sms.text, dltText: sms.dltText };
    })
  );
  return ok({
    settings: {
      hasKey: !!c.authKey,
      source: c.source,
      senderId: c.senderId,
      smsEnabled: c.smsEnabled,
      smsKeys: c.smsKeys,
      whatsappEnabled: c.whatsappEnabled,
      whatsappNumber: c.whatsappNumber,
      smsReady: smsReady(c),
      whatsappReady: whatsappReady(c),
      appUrl: process.env.APP_URL || '',
      // Paste in MSG91 → WhatsApp → Webhook (New), for inbound messages and delivery reports.
      webhookUrl: `${(process.env.APP_URL || '').replace(/\/+$/, '')}/api/whatsapp/msg91?token=${webhookToken}`,
    },
    templates,
  });
});

/** Save the MSG91 settings. A blank auth key keeps the stored one; clearKey removes it. */
export const PUT = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const body = await readJson(request);
  const before = await getSetting(auth.tenantId, 'msg91');
  const senderId = text(body.senderId).toUpperCase();
  if (senderId && !/^[A-Z]{6}$/.test(senderId)) throw badRequest('Sender ID is the 6-letter DLT header, e.g. NEHRAG.');
  const whatsappNumber = digits(text(body.whatsappNumber));
  if (whatsappNumber && !/^\d{11,15}$/.test(whatsappNumber)) throw badRequest('WhatsApp number with country code, e.g. 919876543210.');
  const keys = new Set(DEFAULT_TEMPLATES.map((t) => t.key));
  const smsKeys = Array.isArray(body.smsKeys) ? body.smsKeys.map(String).filter((k: string) => keys.has(k)) : before.smsKeys;
  let authKeySealed = before.authKeySealed;
  try {
    if (body.clearKey === true) authKeySealed = '';
    else if (text(body.authKey)) authKeySealed = seal(text(body.authKey));
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : 'Could not store the auth key.');
  }
  const saved = await saveSetting(
    auth.tenantId,
    'msg91',
    { ...before, authKeySealed, senderId, whatsappNumber, smsKeys, smsEnabled: body.smsEnabled !== false, whatsappEnabled: body.whatsappEnabled === true },
    auth.name
  );
  // Never log the sealed key itself.
  const redact = (x: typeof saved) => ({ ...x, authKeySealed: x.authKeySealed ? '••••' : '', templates: undefined });
  await audit(prisma, auth, { action: 'SETTINGS_UPDATED', entityType: 'Setting', entityId: 'msg91', oldValue: redact(before), newValue: redact(saved), sensitive: true });
  return ok({ saved: true }, 'MSG91 settings saved.');
});

/** MSG91 actions: fetch numbers, make / link / delete templates, refresh their status, send a test. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'whatsapp.manage', { write: true });
  const body = await readJson(request);
  const action = String(body.action || '');
  const key = text(body.key);

  if (action === 'numbers') {
    const r = await whatsappNumbers(await msg91Config(auth.tenantId));
    if (!r.ok) throw badRequest(`MSG91: ${r.error}`);
    return ok({ numbers: r.numbers });
  }
  if (action === 'createWhatsApp') {
    const r = await createWhatsAppTemplate(auth.tenantId, key, auth.name);
    await audit(prisma, auth, { action: 'MSG91_TEMPLATE_CREATED', entityType: 'WhatsAppTemplate', reference: `${key} → ${r.name}` });
    return ok(r, r.note || `WhatsApp template ${r.name} sent for approval.`);
  }
  if (action === 'deleteWhatsApp') {
    await deleteWhatsAppTemplate(auth.tenantId, key, auth.name);
    await audit(prisma, auth, { action: 'MSG91_TEMPLATE_DELETED', entityType: 'WhatsAppTemplate', reference: key });
    return ok({ deleted: true }, 'WhatsApp template deleted on MSG91.');
  }
  if (action === 'createSms') {
    const r = await createSmsTemplate(auth.tenantId, key, digits(str(body.dltId, 'DLT template ID', { required: true })), auth.name);
    await audit(prisma, auth, { action: 'MSG91_TEMPLATE_CREATED', entityType: 'SmsTemplate', reference: `${key} → ${r.templateId}` });
    return ok(r, 'SMS template added on MSG91.');
  }
  if (action === 'link') {
    // Templates already made in the MSG91 panel: just tell us their name / id.
    if (!DEFAULT_TEMPLATES.some((t) => t.key === key)) throw badRequest('Unknown template.');
    const params = Array.isArray(body.waParams) ? body.waParams.map((p: unknown) => text(p)).filter(Boolean) : undefined;
    const link = await saveTemplateLink(
      auth.tenantId,
      key,
      { waTemplateName: text(body.waTemplateName), waLanguage: text(body.waLanguage) || 'en', waParams: params, smsTemplateId: text(body.smsTemplateId), smsDltId: digits(text(body.smsDltId)) },
      auth.name
    );
    return ok(link, 'Template link saved.');
  }
  if (action === 'newWebhookToken') {
    await newWebhookToken(auth.tenantId, auth.name);
    return ok({ done: true }, 'New webhook URL made — update it in MSG91.');
  }
  if (action === 'refresh') return ok(await refreshTemplateStatus(auth.tenantId, auth.name), 'Status updated from MSG91.');
  if (action === 'test') {
    const phone = digits(str(body.phone, 'Mobile number', { required: true }));
    if (phone.length < 10) throw badRequest('Enter a 10-digit mobile number.');
    // Example values, but our real company name and support number.
    const vars: Record<string, string> = { ...SAMPLE_VARS };
    delete vars.companyName;
    delete vars.supportPhone;
    const m = await prepareMessage(auth.tenantId, key, SAMPLE_VARS.customerName, vars);
    if (!m) throw badRequest('This message is switched off.');
    const channel = text(body.channel) || 'whatsapp';
    if (channel === 'sms') {
      const sent = await sendSms(auth.tenantId, phone, m.smsText, key, m.allVars);
      return ok({ sent }, sent ? 'Test SMS sent — see the message log.' : 'SMS failed — see the message log for the reason.');
    }
    const r = await sendCustomerWhatsApp(auth.tenantId, phone, key, m);
    return ok({ sent: r.ok }, r.ok ? 'Test WhatsApp sent — see the message log.' : `WhatsApp failed: ${('error' in r && r.error) || 'see the message log'}`);
  }
  throw badRequest('Unknown action.');
});
