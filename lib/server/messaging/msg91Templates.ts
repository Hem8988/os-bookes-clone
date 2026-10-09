import { prisma } from '@/lib/db';
import { DEFAULT_TEMPLATES, placeholdersOf, renderCard, SAMPLE_VARS } from '@/lib/whatsapp';
import { badRequest, conflict } from '../http';
import { getSetting, saveSetting } from '../settings';
import { renderCardPng } from './card';
import {
  msg91Config,
  saveTemplateLink,
  smsAddTemplate,
  smsTemplateStatus,
  whatsappCreateTemplate,
  whatsappDeleteTemplate,
  whatsappSampleMedia,
  whatsappTemplates,
} from './msg91';

/**
 * Our message templates as MSG91 needs them. Company name and support phone are written
 * into the text (they never change per customer, and Meta rejects a body ending in a
 * variable); every other {{name}} becomes {{1}}, {{2}}… for WhatsApp or ##name## for SMS.
 */

const definition = (key: string) => {
  const def = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!def) throw badRequest('Unknown template.');
  return def;
};

async function fixedValues(tenantId: string) {
  const company = await getSetting(tenantId, 'company');
  return { companyName: company.name, supportPhone: company.supportPhone || company.phone };
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (k in values ? values[k] : m));

/** WhatsApp body with {{1}}, {{2}}… and our placeholder names in that order. */
export async function whatsappBody(tenantId: string, key: string) {
  const def = definition(key);
  const stored = await prisma.whatsAppTemplate.findUnique({ where: { tenantId_key: { tenantId, key } } });
  let text = fill(stored?.body ?? def.body, await fixedValues(tenantId));
  const params = placeholdersOf(text);
  params.forEach((p, i) => (text = text.replace(new RegExp(`\\{\\{\\s*${p}\\s*\\}\\}`, 'g'), `{{${i + 1}}}`)));
  return { def, text, params };
}

/** SMS text with ##name## variables (register exactly this on DLT, with {#var#} for each variable). */
export async function smsText(tenantId: string, key: string) {
  const def = definition(key);
  const text = fill(def.sms, await fixedValues(tenantId)).replace(/\{\{\s*(\w+)\s*\}\}/g, '##$1##');
  return { text, dltText: text.replace(/##\w+##/g, '{#var#}') };
}

const templateName = (key: string, taken?: string) => {
  const base = `ds_${key.toLowerCase()}`;
  // A new name each time it is made again (Meta keeps old names for a while after a delete).
  return taken ? `${base}_${Date.now().toString(36).slice(-5)}` : base;
};

/** Create our WhatsApp template on MSG91 (goes to Meta for approval). */
export async function createWhatsAppTemplate(tenantId: string, key: string, by: string) {
  const c = await msg91Config(tenantId);
  if (!c.authKey) throw badRequest('Save the MSG91 auth key first.');
  if (!c.whatsappNumber) throw badRequest('Save the MSG91 WhatsApp number first.');
  if (key === 'OTP') throw badRequest('OTP goes by SMS. A WhatsApp OTP needs an Authentication template — make it in the MSG91 panel.');
  const { def, text, params } = await whatsappBody(tenantId, key);
  const company = await fixedValues(tenantId);
  const components: unknown[] = [];

  const card = renderCard(def.card, { ...SAMPLE_VARS, ...company });
  if (card) {
    const upload = await whatsappSampleMedia(c, await renderCardPng({ company: company.companyName, ...card }));
    if (!upload.ok || !upload.handle) throw conflict(`MSG91 could not take the sample card image: ${upload.error || 'no handle returned'}`);
    components.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [upload.handle] } });
  }
  components.push({ type: 'BODY', text, ...(params.length ? { example: { body_text: [params.map((p) => SAMPLE_VARS[p] || p)] } } : {}) });

  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const withButton = !!def.button && /^https:\/\//.test(appUrl);
  if (withButton) {
    // The link's path after APP_URL/ is sent as the button variable (numbered after the body's, as in MSG91's docs).
    components.push({ type: 'BUTTONS', buttons: [{ type: 'URL', text: def.button!.label, url: `${appUrl}/{{${params.length + 1}}}`, example: [`${appUrl}/customer`] }] });
  }

  const previous = c.templates[key]?.waTemplateName;
  const name = templateName(key, previous);
  const r = await whatsappCreateTemplate(c, { name, language: 'en', category: 'UTILITY', components, hasUrlButton: withButton });
  if (!r.ok) throw conflict(`MSG91: ${r.error}`);
  await saveTemplateLink(tenantId, key, { waTemplateName: name, waLanguage: 'en', waStatus: 'PENDING', waParams: params }, by);
  return { name, note: def.button && !withButton ? `Made without the "${def.button.label}" button — set APP_URL to your https:// address and make it again to add it.` : null };
}

export async function deleteWhatsAppTemplate(tenantId: string, key: string, by: string) {
  const c = await msg91Config(tenantId);
  const name = c.templates[key]?.waTemplateName;
  if (!name) throw badRequest('No WhatsApp template is linked to this message.');
  const r = await whatsappDeleteTemplate(c, name);
  if (!r.ok) throw conflict(`MSG91: ${r.error}`);
  await saveTemplateLink(tenantId, key, { waTemplateName: '', waStatus: '', waParams: undefined }, by);
}

/** Create our SMS template on MSG91 against the DLT template the user registered. */
export async function createSmsTemplate(tenantId: string, key: string, dltId: string, by: string) {
  const c = await msg91Config(tenantId);
  if (!c.authKey) throw badRequest('Save the MSG91 auth key first.');
  if (!c.senderId) throw badRequest('Save the SMS sender ID (DLT header) first.');
  if (!/^\d{10,25}$/.test(dltId)) throw badRequest('Enter the DLT template ID (digits only) from your DLT portal.');
  const { text } = await smsText(tenantId, key);
  const r = await smsAddTemplate(c, { name: templateName(key, c.templates[key]?.smsTemplateId), text, dltId });
  if (!r.ok || !r.templateId) throw conflict(`MSG91: ${r.error || 'no template id returned'}`);
  await saveTemplateLink(tenantId, key, { smsTemplateId: r.templateId, smsDltId: dltId, smsStatus: 'Pending' }, by);
  return { templateId: r.templateId };
}

/** Pull the approval state of every linked template from MSG91. */
export async function refreshTemplateStatus(tenantId: string, by: string) {
  const c = await msg91Config(tenantId);
  if (!c.authKey) throw badRequest('Save the MSG91 auth key first.');
  const wa = c.whatsappNumber ? await whatsappTemplates(c) : null;
  const s = await getSetting(tenantId, 'msg91');
  const templates = { ...s.templates };
  for (const [key, link] of Object.entries(c.templates)) {
    const next = { ...templates[key] };
    if (link.waTemplateName && wa?.ok) next.waStatus = wa.templates.find((t) => t.name === link.waTemplateName)?.status || 'Not found on MSG91';
    if (link.smsTemplateId) next.smsStatus = (await smsTemplateStatus(c, link.smsTemplateId)).status;
    templates[key] = next;
  }
  await saveSetting(tenantId, 'msg91', { ...s, templates }, by);
  return { whatsappError: wa && !wa.ok ? wa.error : null, onMsg91: wa?.templates ?? [] };
}
