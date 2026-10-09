import type { Msg91Settings, Msg91TemplateLink } from '@/lib/settings';
import { open } from '../secretBox';
import { getSetting, saveSetting } from '../settings';

/**
 * MSG91 (https://docs.msg91.com): SMS through DLT templates ("flow") and WhatsApp
 * through Meta-approved templates, plus creating those templates from the app.
 * Settings → WhatsApp → MSG91 holds the auth key; .env MSG91_* is the fallback.
 */

const CONTROL = 'https://control.msg91.com/api/v5';
const API = 'https://api.msg91.com/api/v5';

export type Msg91Config = Omit<Msg91Settings, 'authKeySealed'> & { authKey: string; source: 'settings' | 'env' | 'none' };

export async function msg91Config(tenantId: string): Promise<Msg91Config> {
  const s = await getSetting(tenantId, 'msg91');
  const stored = open(s.authKeySealed) || '';
  const authKey = stored || process.env.MSG91_AUTH_KEY || '';
  // Template ids from .env (MSG91_TEMPLATE_OTP…) for setups made before the settings screen.
  const templates: Record<string, Msg91TemplateLink> = { ...s.templates };
  for (const [name, value] of Object.entries(process.env)) {
    const key = name.match(/^MSG91_TEMPLATE_([A-Z_]+)$/)?.[1];
    if (key && value && !templates[key]?.smsTemplateId) templates[key] = { ...templates[key], smsTemplateId: value.trim() };
  }
  return {
    ...s,
    templates,
    authKey,
    senderId: s.senderId || process.env.MSG91_SENDER_ID || '',
    whatsappNumber: digits(s.whatsappNumber || process.env.MSG91_WHATSAPP_NUMBER || ''),
    source: stored ? 'settings' : authKey ? 'env' : 'none',
  };
}

export const digits = (v: string) => v.replace(/\D/g, '');
export const smsReady = (c: Msg91Config) => !!c.authKey && c.smsEnabled;
export const whatsappReady = (c: Msg91Config) => !!c.authKey && c.whatsappEnabled && !!c.whatsappNumber;

export type Msg91Result = { ok: boolean; data?: unknown; requestId?: string; error?: string };

/** One MSG91 call; their replies use either {type:'success'} or {status:'success', hasError:false}. */
async function call(authKey: string, method: 'GET' | 'POST' | 'DELETE', url: string, body?: unknown): Promise<Msg91Result> {
  if (!authKey) return { ok: false, error: 'MSG91 auth key is not set.' };
  try {
    const form = body instanceof FormData;
    const res = await fetch(url, {
      method,
      headers: { authkey: authKey, accept: 'application/json', ...(body && !form ? { 'content-type': 'application/json' } : {}) },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }
    const success = res.ok && (json.type === 'success' || json.status === 'success' || (json.hasError === false && json.status !== 'fail' && json.status !== 'error'));
    if (!success) return { ok: false, data: json, error: errorText(json) || `HTTP ${res.status}` };
    return { ok: true, data: json, requestId: String(json.request_id ?? (json.type === 'success' ? json.message : '') ?? '') || undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function errorText(json: Record<string, unknown>): string {
  const e = json.errors ?? json.message ?? json.error;
  if (!e) return '';
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e).slice(0, 300);
  } catch {
    return String(e);
  }
}

// ───────────────────────── SMS ─────────────────────────

/** Send one SMS through a template; `vars` fill its ##name## variables. */
export function smsSend(c: Msg91Config, templateId: string, to: string, vars: Record<string, string>) {
  return call(c.authKey, 'POST', `${CONTROL}/flow`, { template_id: templateId, short_url: '0', recipients: [{ mobiles: to, ...vars }] });
}

/** Create an SMS template (its text must match the DLT-approved one exactly). */
export async function smsAddTemplate(c: Msg91Config, input: { name: string; text: string; dltId: string }) {
  const form = new FormData();
  form.set('template', input.text);
  form.set('sender_id', c.senderId);
  form.set('template_name', input.name);
  form.set('dlt_template_id', input.dltId);
  form.set('smsType', /[^\x00-\x7F]/.test(input.text) ? 'UNICODE' : 'NORMAL');
  const r = await call(c.authKey, 'POST', `${CONTROL}/sms/addTemplate`, form);
  const id = (r.data as { data?: { template_id?: string } } | undefined)?.data?.template_id;
  return { ...r, templateId: id };
}

/** Approval state of an SMS template (its active version). */
export async function smsTemplateStatus(c: Msg91Config, templateId: string) {
  const r = await call(c.authKey, 'POST', `${CONTROL}/sms/getTemplateVersions`, { template_id: templateId });
  const versions = ((r.data as { data?: unknown[] } | undefined)?.data ?? []) as { active_status?: string; dlt_verified?: string; status?: string; DLT_ID?: string; reject_reason?: string; template_data?: string }[];
  const v = versions.find((x) => String(x.active_status) === '1') ?? versions[0];
  if (!r.ok || !v) return { ok: false, status: r.error || 'Not found' };
  const status = v.reject_reason ? `Rejected: ${v.reject_reason}` : String(v.status) === '1' ? 'Active' : 'Pending';
  return { ok: true, status, dltId: v.DLT_ID, text: v.template_data };
}

// ───────────────────────── WhatsApp ─────────────────────────

/** WhatsApp numbers connected to the MSG91 account. */
export async function whatsappNumbers(c: Msg91Config) {
  const r = await call(c.authKey, 'GET', `${CONTROL}/whatsapp/whatsapp-activation/`);
  const found = new Set<string>();
  const walk = (x: unknown, key = '') => {
    if (Array.isArray(x)) x.forEach((y) => walk(y, key));
    else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => walk(v, k));
    else if ((typeof x === 'string' || typeof x === 'number') && /number/i.test(key) && /^\d{10,15}$/.test(String(x))) found.add(String(x));
  };
  walk(r.data);
  return { ...r, numbers: [...found] };
}

/** Business-initiated message from an approved template. */
export function whatsappSendTemplate(c: Msg91Config, to: string, input: { name: string; language: string; params: string[]; imageUrl?: string | null; buttonParam?: string | null }) {
  const components: Record<string, Record<string, string>> = {};
  if (input.imageUrl) components.header_1 = { type: 'image', value: input.imageUrl };
  input.params.forEach((value, i) => (components[`body_${i + 1}`] = { type: 'text', value: value || '-' }));
  if (input.buttonParam) components.button_1 = { subtype: 'url', type: 'text', value: input.buttonParam };
  return call(c.authKey, 'POST', `${API}/whatsapp/whatsapp-outbound-message/bulk/`, {
    integrated_number: c.whatsappNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: { name: input.name, language: { code: input.language, policy: 'deterministic' }, namespace: null, to_and_components: [{ to: [to], components }] },
    },
  });
}

/**
 * Free-form message (only inside the 24 h window after the customer wrote to us):
 * `body` is { content_type: text | image | document | interactive, … } as in MSG91's docs.
 */
export function whatsappSessionRaw(c: Msg91Config, to: string, body: Record<string, unknown>) {
  return call(c.authKey, 'POST', `${CONTROL}/whatsapp/whatsapp-outbound-message/`, { integrated_number: c.whatsappNumber, recipient_number: to, ...body });
}

export function whatsappSendSession(c: Msg91Config, to: string, text: string, imageUrl?: string | null) {
  return whatsappSessionRaw(c, to, imageUrl ? { content_type: 'image', attachment_url: imageUrl, caption: text.slice(0, 1024) } : { content_type: 'text', text });
}

/** Upload a sample image; Meta needs its handle as the example of an IMAGE header. */
export async function whatsappSampleMedia(c: Msg91Config, png: Buffer) {
  const form = new FormData();
  form.set('whatsapp_number', c.whatsappNumber);
  form.set('media', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'card.png');
  const r = await call(c.authKey, 'POST', `${API}/whatsapp/sample-media-upload/`, form);
  return { ...r, handle: (r.data as { data?: { url?: string } } | undefined)?.data?.url };
}

export function whatsappCreateTemplate(c: Msg91Config, input: { name: string; language: string; category: string; components: unknown[]; hasUrlButton: boolean }) {
  return call(c.authKey, 'POST', `${API}/whatsapp/client-panel-template/`, {
    integrated_number: c.whatsappNumber,
    template_name: input.name,
    language: input.language,
    category: input.category,
    button_url: input.hasUrlButton,
    components: input.components,
  });
}

export function whatsappDeleteTemplate(c: Msg91Config, name: string) {
  return call(c.authKey, 'DELETE', `${CONTROL}/whatsapp/client-panel-template/?${new URLSearchParams({ integrated_number: c.whatsappNumber, template_name: name })}`);
}

/** Templates on the number with their approval state (name → status). */
export async function whatsappTemplates(c: Msg91Config) {
  const r = await call(c.authKey, 'GET', `${CONTROL}/whatsapp/get-template-client/${c.whatsappNumber}`);
  const list: { name: string; status: string; language: string; category: string }[] = [];
  const walk = (x: unknown) => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== 'object') return;
    const t = x as Record<string, unknown>;
    const name = t.name ?? t.template_name;
    if (typeof name === 'string' && (t.status || t.languages || t.category)) {
      const langs = Array.isArray(t.languages) ? (t.languages as Record<string, unknown>[]) : [t];
      for (const l of langs) list.push({ name, status: String(l.status ?? t.status ?? ''), language: String(l.language ?? t.language ?? ''), category: String(t.category ?? '') });
      return;
    }
    Object.values(t).forEach(walk);
  };
  walk(r.data);
  return { ...r, templates: list };
}

/** Save what we know about one of our templates on MSG91. */
export async function saveTemplateLink(tenantId: string, key: string, patch: Msg91TemplateLink, by: string) {
  const s = await getSetting(tenantId, 'msg91');
  const templates = { ...s.templates, [key]: { ...s.templates[key], ...patch } };
  await saveSetting(tenantId, 'msg91', { ...s, templates }, by);
  return templates[key];
}
