import { prisma } from '@/lib/db';
import { ROLE_HOME, type Role } from '@/lib/permissions';
import { DEFAULT_TEMPLATES, renderTemplate } from '@/lib/whatsapp';
import { sendEmail } from './messaging/email';
import { sendPush } from './messaging/push';
import { sendSms } from './messaging/sms';
import { sendWhatsAppTemplate, sendWhatsAppText } from './messaging/whatsapp';
import { getSetting } from './settings';

type Vars = Record<string, string | number | null | undefined>;

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

/**
 * Send a templated message to a customer on WhatsApp (and email when the
 * customer has one). Called from Effects, i.e. after the DB commit.
 */
export async function notifyCustomer(tenantId: string, customer: CustomerContact, templateKey: string, vars: Vars, emailSubject?: string) {
  const template = await resolveTemplate(tenantId, templateKey);
  if (!template) return;
  const company = await getSetting(tenantId, 'company');
  const allVars: Vars = { companyName: company.name, supportPhone: company.supportPhone || company.phone, customerName: customer.name, ...vars };
  const text = renderTemplate(template.body, allVars);
  const phone = customer.whatsappNumber || customer.phone;

  if (phone) {
    const result = template.metaTemplateName
      ? await sendWhatsAppTemplate(tenantId, phone, template.metaTemplateName, template.language, template.variables.map((v) => String(allVars[v] ?? '')), text, templateKey)
      : await sendWhatsAppText(tenantId, phone, text, templateKey);
    // Critical alerts fall back to SMS when WhatsApp delivery fails.
    if (!result.ok && (templateKey === 'OTP' || templateKey === 'PAYMENT_RECEIVED')) {
      await sendSms(tenantId, phone, text, templateKey);
    }
  }
  if (customer.email && emailSubject) {
    await sendEmail(tenantId, customer.email, `${emailSubject} — ${company.name}`, text, templateKey);
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
