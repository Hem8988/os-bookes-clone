import { prisma } from '@/lib/db';
import { ROLE_HOME, type Role } from '@/lib/permissions';
import { DEFAULT_TEMPLATES, renderCard, renderTemplate } from '@/lib/whatsapp';
import { cardUrl } from './messaging/card';
import { sendEmail } from './messaging/email';
import { sendPush } from './messaging/push';
import { sendSms } from './messaging/sms';
import { toWhatsAppNumber } from '@/lib/phone';
import { msg91Config, whatsappReady, whatsappSendSession, whatsappSendTemplate } from './messaging/msg91';
import { log as logWhatsApp, RichParts, sendWhatsAppRich, sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from './messaging/whatsapp';
import { getSetting } from './settings';

type Vars = Record<string, string | number | null | undefined>;

/** "3,300" / 3300 → 3300; anything else → null. */
const money = (v: Vars[string]) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

async function resolveTemplate(tenantId: string, key: string) {
  const stored = await prisma.whatsAppTemplate.findUnique({ where: { tenantId_key: { tenantId, key } } });
  if (stored) return stored.active ? stored : null;
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  return fallback ? { ...fallback, metaTemplateName: null, language: 'en', active: true } : null;
}

interface CustomerContact {
  name: string;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
}

/** Everything one message needs: the texts (WhatsApp + SMS), the card image and the link button. */
export async function prepareMessage(tenantId: string, templateKey: string, customerName: string, vars: Vars) {
  const template = await resolveTemplate(tenantId, templateKey);
  if (!template) return null;
  const def = DEFAULT_TEMPLATES.find((t) => t.key === templateKey);
  const company = await getSetting(tenantId, 'company');
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const allVars: Vars = { companyName: company.name, supportPhone: company.supportPhone || company.phone, customerName, portalLink: appUrl ? `${appUrl}/customer` : '', ...vars };
  // Invoice: what is still due on it, and the pill on the card (Fully Paid / Partly Paid / Unpaid).
  const amount = money(allVars.amount);
  const paid = money(allVars.paid);
  if (amount !== null && paid !== null) {
    const due = Math.max(0, Math.round((amount - paid) * 100) / 100);
    allVars.due ??= due.toLocaleString('en-IN');
    allVars.paymentStatus ??= due <= 0 ? 'Fully Paid' : paid > 0 ? 'Partly Paid' : 'Unpaid';
  }
  const card = renderCard(def?.card, allVars);
  const link = def?.button ? String(allVars[def.button.url] ?? '') : '';
  const parts: RichParts = {
    imageUrl: card ? cardUrl({ company: company.name, ...card }) : null,
    button: def?.button && /^https?:\/\//.test(link) ? { label: def.button.label, url: link } : null,
  };
  return {
    template,
    company,
    allVars,
    parts,
    text: renderTemplate(template.body, allVars),
    smsText: renderTemplate(def?.sms || template.body, allVars),
  };
}

type Prepared = NonNullable<Awaited<ReturnType<typeof prepareMessage>>>;

/** The part of a link after APP_URL/ — the variable of a URL button `<APP_URL>/{{n}}`. */
export const buttonSuffix = (url: string) => {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  return appUrl && url.startsWith(`${appUrl}/`) ? url.slice(appUrl.length + 1) : url;
};

/** WhatsApp through MSG91 when it is switched on, else the Meta Cloud API. */
export async function sendCustomerWhatsApp(tenantId: string, phone: string, templateKey: string, m: Prepared, extra: { sentBy?: string } = {}) {
  const c = await msg91Config(tenantId);
  if (!whatsappReady(c)) {
    return m.template.metaTemplateName
      ? sendWhatsAppTemplate(tenantId, phone, m.template.metaTemplateName, m.template.language, m.template.variables.map((v) => String(m.allVars[v] ?? '')), m.text, templateKey, m.parts)
      : sendWhatsAppRich(tenantId, phone, m.text, m.parts, templateKey);
  }
  const to = toWhatsAppNumber(phone);
  const linked = c.templates[templateKey];
  const r = linked?.waTemplateName
    ? await whatsappSendTemplate(c, to, {
        name: linked.waTemplateName,
        language: linked.waLanguage || 'en',
        params: (linked.waParams ?? m.template.variables).map((v) => String(m.allVars[v] ?? '')),
        imageUrl: m.parts.imageUrl,
        buttonParam: m.parts.button ? buttonSuffix(m.parts.button.url) : null,
      })
    : // No approved template yet: works only inside the customer's 24 h window; the link goes in the text.
      await whatsappSendSession(c, to, m.parts.button ? `${m.text}\n\n${m.parts.button.label}: ${m.parts.button.url}` : m.text, m.parts.imageUrl);
  const body = [m.parts.imageUrl ? '[Card image]' : '', m.text, m.parts.button ? `[${m.parts.button.label} → ${m.parts.button.url}]` : ''].filter(Boolean).join('\n');
  await logWhatsApp(tenantId, to, body, { ok: r.ok, providerId: r.requestId, error: r.error }, templateKey, { sentBy: extra.sentBy });
  return { ok: r.ok, error: r.error };
}

/** Messages that used to go by SMS only when WhatsApp failed. */
const SMS_FALLBACK = ['OTP', 'PAYMENT_RECEIVED'];

/**
 * Send a templated message to a customer on WhatsApp (and email when the
 * customer has one). Called from Effects, i.e. after the DB commit.
 */
export async function notifyCustomer(tenantId: string, customer: CustomerContact, templateKey: string, vars: Vars, emailSubject?: string) {
  const m = await prepareMessage(tenantId, templateKey, customer.name, vars);
  if (!m) return;
  const phone = customer.whatsappNumber || customer.phone;

  if (phone) {
    const c = await msg91Config(tenantId);
    const waReady = whatsappConfigured() || whatsappReady(c);
    // Without any WhatsApp set up this only logs the message (SIMULATED).
    const result = await sendCustomerWhatsApp(tenantId, phone, templateKey, m);
    // SMS: the messages chosen in WhatsApp → MSG91, and OTP / payment alerts whenever WhatsApp is off or failed.
    const smsPhone = customer.phone || phone;
    if ((c.smsEnabled && c.smsKeys.includes(templateKey)) || ((!result.ok || !waReady) && SMS_FALLBACK.includes(templateKey))) {
      await sendSms(tenantId, smsPhone, m.smsText, templateKey, m.allVars);
    }
  }
  if (customer.email && emailSubject) {
    await sendEmail(tenantId, customer.email, `${emailSubject} — ${m.company.name}`, m.text, templateKey);
  }
}

/** A staff alert (in-app + web push, plus WhatsApp when `whatsapp` is set). */
type StaffMessage = { title: string; body: string; link?: string; /** important: also WhatsApp it to the staff member */ whatsapp?: boolean };

export async function notifyRoles(tenantId: string, roles: Role[], message: StaffMessage) {
  const users = await prisma.user.findMany({ where: { tenantId, role: { in: roles }, status: 'ACTIVE' }, select: { id: true } });
  await notifyUsers(tenantId, users.map((u) => u.id), message);
}

export async function notifyUsers(tenantId: string, userIds: string[], message: StaffMessage) {
  if (userIds.length === 0) return;
  // Links are written for the admin portal; each person gets them on their own portal
  // (an accountant's "/admin?tab=…" becomes "/accountant?tab=…").
  const users = message.link?.startsWith('/admin') ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, role: true } }) : [];
  const linkFor = (userId: string) => {
    const role = users.find((u) => u.id === userId)?.role as Role | undefined;
    const home = role ? ROLE_HOME[role] : null;
    return home && home !== '/admin' && message.link ? message.link.replace(/^\/admin/, home) : message.link;
  };
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ tenantId, userId, title: message.title, body: message.body, link: linkFor(userId) })),
  });
  // Push goes out per portal so each phone opens the right page.
  const byLink = new Map<string | undefined, string[]>();
  for (const id of userIds) byLink.set(linkFor(id), [...(byLink.get(linkFor(id)) || []), id]);
  for (const [link, ids] of byLink) await sendPush(ids, { title: message.title, body: message.body, link });
  if (message.whatsapp) await whatsappStaff(tenantId, userIds, message, linkFor);
}

/** WhatsApp copy of an important staff alert, with a link that opens the right screen. */
async function whatsappStaff(tenantId: string, userIds: string[], message: StaffMessage, linkFor: (userId: string) => string | undefined) {
  const ops = await getSetting(tenantId, 'operations');
  if (ops.staffWhatsapp === false) return;
  const staff = await prisma.user.findMany({ where: { id: { in: userIds }, status: 'ACTIVE', mobile: { not: null } }, select: { id: true, mobile: true } });
  const base = (process.env.APP_URL || '').replace(/\/$/, '');
  for (const u of staff) {
    const link = linkFor(u.id);
    const text = `🔔 *${message.title}*\n${message.body}${base && link ? `\n${base}${link}` : ''}`;
    await sendWhatsAppText(tenantId, u.mobile!, text, 'STAFF_ALERT').catch(() => undefined);
  }
}
