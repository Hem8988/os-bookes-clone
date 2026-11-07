import { prisma } from '@/lib/db';
import type { WhatsAppConversation } from '@/lib/generated/prisma/client';
import { INQUIRY_NEEDS } from '@/lib/inquiries';
import { phoneKey } from '@/lib/phone';
import { createInquiry, openInquiryFor } from './inquiries';
import { sendWhatsAppList, sendWhatsAppText } from './messaging/whatsapp';
import { getSetting } from './settings';

// WhatsApp bot for a number that is not a customer yet: a few short questions (what they need,
// name + business, area, cylinder, cylinders a month), then an inquiry for the team and the chat
// goes to a person. "team" / "agent" / "call" at any step hands over at once.

type Lead = { need?: string; name?: string; business?: string; area?: string; cylinder?: string; qty?: number; first?: string };
type Step = 'LEAD_NEED' | 'LEAD_NAME' | 'LEAD_AREA' | 'LEAD_CYL' | 'LEAD_QTY';

const MAX_ATTEMPTS = 3;
const STALE_MS = 24 * 3_600_000;
const HANDOFF = /^(agent|team|human|insaan|insan|executive|call|call me|call karo|baat karni hai|team se baat|support)[.!]*$/i;

const NEEDS: { id: string; title: string; description: string }[] = [
  { id: 'L:NEW_CONNECTION', title: 'Naya connection', description: 'Pehli baar cylinder lena hai' },
  { id: 'L:REGULAR_SUPPLY', title: 'Rate / monthly supply', description: 'Rate jaanna, regular supply' },
  { id: 'L:URGENT_REFILL', title: 'Urgent cylinder', description: 'Aaj hi chahiye' },
  { id: 'L:BULK', title: 'Bulk / factory', description: 'Industrial, bade cylinder' },
  { id: 'L:OTHER', title: 'Kuch aur', description: 'Koi aur sawaal' },
];

async function save(conv: WhatsAppConversation, step: Step | 'IDLE', lead: Lead | null, failedAttempts = 0) {
  return prisma.whatsAppConversation.update({
    where: { id: conv.id },
    data: { step, failedAttempts, draft: lead === null ? {} : (lead as object), lastMessageAt: new Date() },
  });
}

/** India time "HH:MM". */
const nowHm = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());

async function cylinderOptions() {
  const products = await prisma.product.findMany({ where: { tenantId: process.env.DEFAULT_TENANT_ID || 'default', active: true, productType: 'REFILLABLE_CYLINDER' }, select: { name: true }, orderBy: { name: 'asc' }, take: 6 });
  // Short title ("19 kg") with the full product name under it; sorted small to big.
  const kgOf = (name: string) => Number(name.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1] || Infinity);
  const rows = products
    .sort((a, b) => kgOf(a.name) - kgOf(b.name))
    .map((p) => {
      const kg = kgOf(p.name);
      return { id: `C:${p.name}`.slice(0, 200), title: (Number.isFinite(kg) ? `${kg} kg` : p.name).slice(0, 24), description: p.name.slice(0, 72) };
    });
  return [...rows, { id: 'C:Not sure', title: 'Pata nahi', description: 'Team suggest karegi' }];
}

const ask = {
  need: (tenantId: string, phone: string, greeting: string) =>
    sendWhatsAppList(tenantId, phone, `${greeting}\n\nAap kya chahte hain? Neeche se chunein (ya number bhejein):`, 'Chunein', NEEDS),
  name: (tenantId: string, phone: string) => sendWhatsAppText(tenantId, phone, '👤 Aapka naam aur business ka naam likhiye.\n(jaise: *Ramesh, Shiv Dhaba*)'),
  area: (tenantId: string, phone: string) => sendWhatsAppText(tenantId, phone, '📍 Kis area / shahar mein supply chahiye?\n(jaise: *Vijay Nagar, Indore*)'),
  cylinder: async (tenantId: string, phone: string) => sendWhatsAppList(tenantId, phone, '🛢️ Kaunsa cylinder chahiye?', 'Chunein', await cylinderOptions()),
  qty: (tenantId: string, phone: string) => sendWhatsAppText(tenantId, phone, '🔢 Mahine mein lagbhag kitne cylinder lagenge?\nSirf number bhejein (jaise *20*). Pata nahi to *0* bhejein.'),
};

/** Save the inquiry, thank them and hand the chat to the team. */
async function finish(tenantId: string, conv: WhatsAppConversation, phone: string, lead: Lead, reason?: string) {
  const company = await getSetting(tenantId, 'company');
  const security = await getSetting(tenantId, 'security');
  const key = phoneKey(phone);
  const name = lead.name || conv.name || `WhatsApp +${phone}`;
  const open = await openInquiryFor(tenantId, key);
  const message = [reason, lead.first ? `First message: ${lead.first}` : '', 'Came in through the WhatsApp bot.'].filter(Boolean).join('\n');
  const inquiry = open
    ? await prisma.inquiry.update({
        where: { id: open.id },
        data: {
          name: lead.name || open.name,
          businessName: lead.business || open.businessName,
          city: lead.area || open.city,
          need: lead.need || open.need,
          cylinderSize: lead.cylinder || open.cylinderSize,
          monthlyQty: lead.qty || open.monthlyQty,
          message: [open.message, message].filter(Boolean).join('\n').slice(0, 1000),
        },
      })
    : await createInquiry(tenantId, {
        name,
        phone: key,
        businessName: lead.business || null,
        city: lead.area || null,
        need: lead.need || 'OTHER',
        cylinderSize: lead.cylinder && lead.cylinder !== 'Not sure' ? lead.cylinder : null,
        monthlyQty: lead.qty || null,
        message: message.slice(0, 1000),
        source: 'WHATSAPP',
      });
  await prisma.whatsAppConversation.update({ where: { id: conv.id }, data: { step: 'IDLE', failedAttempts: 0, draft: {}, botPaused: true, lastMessageAt: new Date(), ...(lead.name && !conv.name ? { name: lead.name } : {}) } });

  const { start, end } = security.workingHours;
  const t = nowHm();
  const open_ = start < end ? t >= start && t < end : t >= start || t < end;
  const when = lead.need === 'URGENT_REFILL' && open_ ? 'turant' : open_ ? 'jaldi hi' : `kal subah ${start} ke baad`;
  const first = name.split(/[ ,]/)[0];
  const support = company.supportPhone || company.phone || '';
  await sendWhatsAppText(
    tenantId,
    phone,
    `✅ Dhanyavaad${lead.name ? ` ${first} ji` : ''}! Aapki inquiry *${inquiry.inquiryNumber}* ban gayi hai.\n\nHamari team ${when} aapko call ya WhatsApp karegi.${open_ ? '' : '\n(Abhi office band hai.)'}\n\n${support ? `📞 ${support}\n` : ''}${company.name}`.trim()
  );
}

async function retry(tenantId: string, conv: WhatsAppConversation, phone: string, lead: Lead, hint: string, again: () => Promise<unknown>) {
  const attempts = conv.failedAttempts + 1;
  if (attempts >= MAX_ATTEMPTS) return finish(tenantId, conv, phone, lead, 'The bot could not understand the answers; please call.');
  await save(conv, conv.step as Step, lead, attempts);
  await sendWhatsAppText(tenantId, phone, `⚠️ ${hint}`);
  await again();
}

/** Every message from a number that is not a customer yet (company number only). */
export async function handleNewContact(tenantId: string, phone: string, text: string) {
  let conv = await prisma.whatsAppConversation.upsert({
    where: { tenantId_channel_phone: { tenantId, channel: 'main', phone } },
    create: { tenantId, channel: 'main', phone },
    update: {},
  });
  const lead = (conv.draft || {}) as Lead;
  const inFlow = conv.step.startsWith('LEAD_') && Date.now() - conv.lastMessageAt.getTime() < STALE_MS;
  const lower = text.toLowerCase();

  // Start: greet and ask what they need.
  if (!inFlow) {
    const company = await getSetting(tenantId, 'company');
    const fresh: Lead = { first: text.slice(0, 500) };
    conv = await save(conv, 'LEAD_NEED', fresh);
    if (HANDOFF.test(text.trim())) return finish(tenantId, conv, phone, fresh, 'Asked to talk to the team.');
    return ask.need(tenantId, phone, `Namaste${conv.name ? ` ${conv.name}` : ''}! 🙏\n*${company.name}* mein aapka swagat hai.\nHum Indane LPG cylinder supply karte hain — hotel, restaurant, factory aur ghar ke liye.`);
  }

  // "team" / "agent" / "call": a person takes over now.
  if (HANDOFF.test(text.trim())) return finish(tenantId, conv, phone, lead, 'Asked to talk to the team.');

  switch (conv.step as Step) {
    case 'LEAD_NEED': {
      const pick = text.startsWith('L:') ? text.slice(2) : NEEDS[Number(text) - 1]?.id.slice(2) || (/(naya|new|connection)/i.test(text) ? 'NEW_CONNECTION' : /(rate|price|supply|monthly)/i.test(text) ? 'REGULAR_SUPPLY' : /(urgent|jaldi|abhi|aaj)/i.test(text) ? 'URGENT_REFILL' : /(bulk|factory|industr)/i.test(text) ? 'BULK' : '');
      if (!pick || !INQUIRY_NEEDS[pick]) return retry(tenantId, conv, phone, lead, '1 se 5 tak koi number bhejein.', () => ask.need(tenantId, phone, 'Kripya chunein:'));
      await save(conv, 'LEAD_NAME', { ...lead, need: pick });
      return ask.name(tenantId, phone);
    }
    case 'LEAD_NAME': {
      if (text.length < 2 || text.length > 120 || /^\d+$/.test(text)) return retry(tenantId, conv, phone, lead, 'Apna naam likhiye (jaise: Ramesh, Shiv Dhaba).', () => ask.name(tenantId, phone));
      const [name, ...rest] = text.split(/[,\n]| - /).map((s) => s.trim()).filter(Boolean);
      await save(conv, 'LEAD_AREA', { ...lead, name: name.slice(0, 80), business: rest.join(', ').slice(0, 120) || undefined });
      return ask.area(tenantId, phone);
    }
    case 'LEAD_AREA': {
      if (text.length < 2 || text.length > 120) return retry(tenantId, conv, phone, lead, 'Area ya shahar ka naam likhiye.', () => ask.area(tenantId, phone));
      await save(conv, 'LEAD_CYL', { ...lead, area: text.slice(0, 80) });
      return ask.cylinder(tenantId, phone);
    }
    case 'LEAD_CYL': {
      const options = await cylinderOptions();
      const byNumber = options[Number(text) - 1]?.id;
      const id = text.startsWith('C:') ? text : byNumber || (/(pata nahi|not sure|nahi pata)/i.test(lower) ? 'C:Not sure' : /\d+(\.\d+)?\s*kg/i.test(text) ? `C:${text.slice(0, 40)}` : '');
      if (!id) return retry(tenantId, conv, phone, lead, 'List mein se number bhejein.', () => ask.cylinder(tenantId, phone));
      const next = { ...lead, cylinder: id.slice(2) };
      // Urgent: no need for the monthly number, get the team on it now.
      if (lead.need === 'URGENT_REFILL') return finish(tenantId, conv, phone, next);
      await save(conv, 'LEAD_QTY', next);
      return ask.qty(tenantId, phone);
    }
    case 'LEAD_QTY': {
      const qty = Number(text.replace(/[^\d]/g, ''));
      if (!/\d/.test(text) || !Number.isInteger(qty) || qty < 0 || qty > 100_000) return retry(tenantId, conv, phone, lead, 'Sirf number bhejein (jaise 20).', () => ask.qty(tenantId, phone));
      return finish(tenantId, conv, phone, { ...lead, qty: qty || undefined });
    }
  }
}
