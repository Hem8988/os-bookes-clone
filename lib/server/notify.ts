import { prisma } from '@/lib/db';
import type { Role } from '@/lib/permissions';
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

/** In-app + web-push notification to all active staff with the given roles. */
export async function notifyRoles(tenantId: string, roles: Role[], message: { title: string; body: string; link?: string }) {
  const users = await prisma.user.findMany({ where: { tenantId, role: { in: roles }, status: 'ACTIVE' }, select: { id: true } });
  await notifyUsers(tenantId, users.map((u) => u.id), message);
}

export async function notifyUsers(tenantId: string, userIds: string[], message: { title: string; body: string; link?: string }) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ tenantId, userId, title: message.title, body: message.body, link: message.link })),
  });
  await sendPush(userIds, message);
}
