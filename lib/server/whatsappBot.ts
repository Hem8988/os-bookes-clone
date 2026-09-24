import { prisma, transaction } from '@/lib/db';
import type { Customer, WhatsAppConversation } from '@/lib/generated/prisma/client';
import { phoneKey } from '@/lib/phone';
import { PAYMENT_TERMS } from '@/lib/settings';
import { systemActor } from './audit';
import { Effects } from './effects';
import { addDays, ApiError, businessDate } from './http';
import { sendWhatsAppButtons, sendWhatsAppList, sendWhatsAppText } from './messaging/whatsapp';
import { createOrder } from './orders';
import { resolveRate } from './pricing';
import { getSetting } from './settings';

// Official-number ordering bot (SRS §7.3, §13). One conversation row per
// phone keeps the multi-step state so a flow survives across messages.

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';
const MAX_ATTEMPTS = 3;
const MAX_QTY = 500;

type Draft = { productIds?: string[]; qtys?: Record<string, number>; index?: number; date?: string };

const MENU_ROWS = [
  { id: 'M1', title: '1. Place Order', description: 'Naya cylinder order' },
  { id: 'M2', title: '2. Order History', description: 'Pichhle orders ka status' },
  { id: 'M3', title: '3. Account Balance', description: 'Outstanding amount' },
  { id: 'M4', title: '4. Cylinder Balance', description: 'Aapke paas kitne cylinder' },
  { id: 'M5', title: '5. Payment History', description: 'Pichhli payments' },
  { id: 'M6', title: '6. Invoice', description: 'Latest invoices' },
  { id: 'M7', title: '7. Contact Support', description: 'Office se baat karein' },
];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

async function findCustomer(phone: string) {
  const key = phoneKey(phone);
  if (key.length !== 10) return null;
  return prisma.customer.findFirst({
    where: { tenantId: TENANT, type: 'Customer', OR: [{ whatsappNumber: { endsWith: key } }, { phone: { endsWith: key } }] },
  });
}

async function save(conv: WhatsAppConversation, data: Partial<Pick<WhatsAppConversation, 'step' | 'failedAttempts' | 'customerId'>> & { draft?: Draft | null }) {
  return prisma.whatsAppConversation.update({
    where: { id: conv.id },
    data: { ...data, draft: data.draft === undefined ? undefined : data.draft === null ? {} : (data.draft as object), lastMessageAt: new Date() },
  });
}

async function showMenu(phone: string, customer: Customer) {
  const company = await getSetting(TENANT, 'company');
  await sendWhatsAppList(TENANT, phone, `Namaste ${customer.contactPerson || customer.name}! 🙏\n${company.name} mein aapka swagat hai.\nNeeche se option chunein (ya number bhejein):`, 'Menu', MENU_ROWS);
}

async function supportText() {
  const company = await getSetting(TENANT, 'company');
  return `📞 Support: ${company.supportPhone || company.phone || 'office'}\n${company.email ? `✉️ ${company.email}\n` : ''}Menu ke liye "Hi" bhejein.`;
}

/** Re-prompt the current step; after 3 failures offer support and reset. */
async function retry(conv: WhatsAppConversation, phone: string, prompt: () => Promise<unknown>, hint: string) {
  const attempts = conv.failedAttempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
    await sendWhatsAppText(TENANT, phone, `Maaf kijiye, samajh nahi aaya. 🙏\n${await supportText()}`);
    return;
  }
  await save(conv, { failedAttempts: attempts });
  await sendWhatsAppText(TENANT, phone, `⚠️ ${hint} (koshish ${attempts}/${MAX_ATTEMPTS})`);
  await prompt();
}

async function orderableProducts(customer: Customer) {
  const base = { tenantId: TENANT, active: true };
  if (customer.defaultProductIds.length) {
    const preferred = await prisma.product.findMany({ where: { ...base, id: { in: customer.defaultProductIds } }, orderBy: { name: 'asc' } });
    if (preferred.length) return preferred;
  }
  return prisma.product.findMany({ where: { ...base, productType: 'REFILLABLE_CYLINDER' }, orderBy: { name: 'asc' }, take: 9 });
}

async function askProduct(phone: string, customer: Customer) {
  const products = await orderableProducts(customer);
  if (products.length === 0) {
    await sendWhatsAppText(TENANT, phone, `Abhi koi product available nahi hai.\n${await supportText()}`);
    return false;
  }
  if (products.length === 1) return products;
  if (products.length === 2) {
    await sendWhatsAppButtons(TENANT, phone, 'Kaunsa cylinder chahiye?', [
      { id: `P:${products[0].id}`, title: products[0].name },
      { id: `P:${products[1].id}`, title: products[1].name },
      { id: 'P:BOTH', title: 'Both / Dono' },
    ]);
  } else {
    await sendWhatsAppList(TENANT, phone, 'Kaunsa cylinder chahiye?', 'Choose', products.map((p, i) => ({ id: `P:${p.id}`, title: `${i + 1}. ${p.name}` })));
  }
  return true;
}

async function askQty(phone: string, draft: Draft) {
  const productId = draft.productIds?.[draft.index || 0];
  const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;
  await sendWhatsAppText(TENANT, phone, `${product?.name || 'Cylinder'} — kitne cylinder chahiye? Sirf number bhejein (jaise 10).`);
}

async function askDate(phone: string) {
  await sendWhatsAppButtons(TENANT, phone, 'Delivery kab chahiye?', [
    { id: 'D:TODAY', title: 'Today / Aaj' },
    { id: 'D:TOMORROW', title: 'Tomorrow / Kal' },
    { id: 'D:PICK', title: 'Pick a date' },
  ]);
}

function parseDate(text: string): string | null {
  const today = businessDate();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  let date: string | null = null;
  if (iso) date = text;
  else if (dmy) {
    const year = dmy[3] ? (dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : today.slice(0, 4);
    date = `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  if (!date || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) return null;
  if (date < today || date > addDays(today, 30)) return null;
  return date;
}

async function showSummary(phone: string, customer: Customer, draft: Draft) {
  const lines: string[] = [];
  let total = 0;
  for (const id of draft.productIds || []) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) continue;
    const qty = draft.qtys?.[id] || 0;
    const rate = await resolveRate(prisma, customer.id, product, draft.date || businessDate());
    total += qty * rate;
    lines.push(`• ${product.name} × ${qty} @ ${inr(rate)}`);
  }
  await sendWhatsAppButtons(TENANT, phone, `🧾 Order Summary\n${lines.join('\n')}\nTotal: ${inr(total)}\nDelivery: ${draft.date}\n\nConfirm karein?`, [
    { id: 'C:YES', title: 'YES ✅' },
    { id: 'C:NO', title: 'NO ❌' },
  ]);
}

async function menuAction(choice: string, conv: WhatsAppConversation, phone: string, customer: Customer) {
  switch (choice) {
    case '1': {
      const result = await askProduct(phone, customer);
      if (result === false) return save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
      if (Array.isArray(result)) {
        const draft: Draft = { productIds: [result[0].id], qtys: {}, index: 0 };
        await save(conv, { step: 'ENTER_QTY', failedAttempts: 0, draft });
        return askQty(phone, draft);
      }
      return save(conv, { step: 'SELECT_PRODUCT', failedAttempts: 0, draft: {} });
    }
    case '2': {
      const orders = await prisma.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } });
      const text = orders.length
        ? orders.map((o) => `• ${o.orderNumber} (${o.requestedDeliveryDate}) — ${o.items.map((i) => `${i.productName} × ${i.orderedQty}`).join(', ')} — ${o.status.replace(/_/g, ' ')}`).join('\n')
        : 'Abhi tak koi order nahi hai.';
      await sendWhatsAppText(TENANT, phone, `📦 Recent Orders\n${text}`);
      break;
    }
    case '3': {
      const term = PAYMENT_TERMS.find((t) => t.value === customer.paymentTerms)?.label || customer.paymentTerms;
      await sendWhatsAppText(TENANT, phone, `💳 Account Balance\nOutstanding: ${inr(customer.balance)}\n${customer.creditLimit ? `Credit limit: ${inr(customer.creditLimit)}\n` : ''}Payment terms: ${term}`);
      break;
    }
    case '4': {
      const rows = await prisma.customerCylinderBalance.findMany({ where: { customerId: customer.id } });
      const text = rows.length ? rows.map((r) => `• ${r.productName}: ${r.currentBalance} cylinder`).join('\n') : 'Aapke paas hamare koi cylinder record mein nahi hain.';
      await sendWhatsAppText(TENANT, phone, `🛢️ Cylinder Balance\n${text}`);
      break;
    }
    case '5': {
      const payments = await prisma.payment.findMany({ where: { customerId: customer.id, status: 'VERIFIED' }, orderBy: { createdAt: 'desc' }, take: 5 });
      const text = payments.length ? payments.map((p) => `• ${p.paymentDate} — ${inr(p.amount)} (${p.mode}) — ${p.paymentNumber}`).join('\n') : 'Koi payment record nahi hai.';
      await sendWhatsAppText(TENANT, phone, `🧾 Payment History\n${text}`);
      break;
    }
    case '6': {
      const invoices = await prisma.invoice.findMany({ where: { customerId: customer.id, status: { not: 'Cancelled' } }, orderBy: { createdAt: 'desc' }, take: 3 });
      const base = process.env.APP_URL;
      const text = invoices.length
        ? invoices.map((i) => `• ${i.invoiceNumber} (${i.date}) — ${inr(i.grandTotal)} — ${i.status}${base ? `\n  ${base}/customer?invoice=${i.id}` : ''}`).join('\n')
        : 'Koi invoice nahi hai.';
      await sendWhatsAppText(TENANT, phone, `📄 Invoices\n${text}`);
      break;
    }
    case '7':
      await sendWhatsAppText(TENANT, phone, await supportText());
      break;
    default:
      return retry(conv, phone, () => showMenu(phone, customer), 'Menu se 1 se 7 tak koi option chunein.');
  }
  await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
}

/** Entry point for every inbound WhatsApp text or button/list reply. */
export async function handleIncomingMessage(phone: string, rawText: string) {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const customer = await findCustomer(phone);
  if (!customer) {
    await sendWhatsAppText(TENANT, phone, `Yeh number hamare registered customers mein nahi hai. 🙏\nOrder ke liye office se sampark karein.\n${await supportText()}`);
    return;
  }
  if (customer.status !== 'ACTIVE') {
    await sendWhatsAppText(TENANT, phone, `Aapka account abhi ${customer.status === 'BLOCKED' ? 'blocked' : 'inactive'} hai, isliye order nahi le sakte.\n${await supportText()}`);
    return;
  }

  let conv = await prisma.whatsAppConversation.upsert({
    where: { tenantId_phone: { tenantId: TENANT, phone } },
    create: { tenantId: TENANT, phone, customerId: customer.id },
    update: {},
  });

  const operations = await getSetting(TENANT, 'operations');
  const expired = conv.step !== 'IDLE' && Date.now() - conv.lastMessageAt.getTime() > operations.whatsappSessionTimeoutMinutes * 60_000;
  if (expired) {
    conv = await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
    await sendWhatsAppText(TENANT, phone, '⏱️ Pichhla session time-out ho gaya. Dobara shuru karte hain.');
  }

  if (['hi', 'hello', 'hii', 'menu', 'start', '0', 'namaste'].includes(lower) || conv.step === 'IDLE') {
    const menuPick = text.match(/^M?([1-7])$/i);
    if (conv.step === 'IDLE' && menuPick) {
      conv = await save(conv, { step: 'MENU', failedAttempts: 0, customerId: customer.id });
      return menuAction(menuPick[1], conv, phone, customer);
    }
    await save(conv, { step: 'MENU', failedAttempts: 0, customerId: customer.id, draft: null });
    return showMenu(phone, customer);
  }
  if (['cancel', 'stop', 'exit'].includes(lower)) {
    await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
    return sendWhatsAppText(TENANT, phone, 'Theek hai, cancel kar diya. Menu ke liye "Hi" bhejein.');
  }

  const draft = (conv.draft || {}) as Draft;

  switch (conv.step) {
    case 'MENU': {
      const pick = text.match(/^M?([1-7])\b/i);
      return menuAction(pick ? pick[1] : '', conv, phone, customer);
    }
    case 'SELECT_PRODUCT': {
      const products = await orderableProducts(customer);
      let ids: string[] = [];
      if (text === 'P:BOTH' || lower === 'both' || lower === 'dono') ids = products.slice(0, 2).map((p) => p.id);
      else if (text.startsWith('P:')) ids = products.filter((p) => p.id === text.slice(2)).map((p) => p.id);
      else if (/^\d+$/.test(text) && products[Number(text) - 1]) ids = [products[Number(text) - 1].id];
      if (ids.length === 0) return retry(conv, phone, () => askProduct(phone, customer), 'List mein se product chunein.');
      const next: Draft = { productIds: ids, qtys: {}, index: 0 };
      await save(conv, { step: 'ENTER_QTY', failedAttempts: 0, draft: next });
      return askQty(phone, next);
    }
    case 'ENTER_QTY': {
      const qty = Number(text);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return retry(conv, phone, () => askQty(phone, draft), `Quantity 1 se ${MAX_QTY} ke beech number mein bhejein.`);
      const productId = draft.productIds?.[draft.index || 0];
      const next: Draft = { ...draft, qtys: { ...(draft.qtys || {}), [productId || '']: qty }, index: (draft.index || 0) + 1 };
      if ((next.index || 0) < (draft.productIds?.length || 0)) {
        await save(conv, { failedAttempts: 0, draft: next });
        return askQty(phone, next);
      }
      await save(conv, { step: 'SELECT_DATE', failedAttempts: 0, draft: next });
      return askDate(phone);
    }
    case 'SELECT_DATE': {
      const today = businessDate();
      let date: string | null = null;
      if (text === 'D:TODAY' || lower === 'today' || lower === 'aaj') date = today;
      else if (text === 'D:TOMORROW' || lower === 'tomorrow' || lower === 'kal') date = addDays(today, 1);
      else if (text === 'D:PICK') {
        await save(conv, { step: 'ENTER_DATE', failedAttempts: 0 });
        return sendWhatsAppText(TENANT, phone, 'Date bhejein (DD-MM-YYYY), agle 30 din ke andar.');
      } else date = parseDate(text);
      if (!date) return retry(conv, phone, () => askDate(phone), 'Today, Tomorrow ya date (DD-MM-YYYY) chunein.');
      const next = { ...draft, date };
      await save(conv, { step: 'CONFIRM', failedAttempts: 0, draft: next });
      return showSummary(phone, customer, next);
    }
    case 'ENTER_DATE': {
      const date = parseDate(text);
      if (!date) return retry(conv, phone, () => sendWhatsAppText(TENANT, phone, 'Date bhejein (DD-MM-YYYY).'), 'Sahi date bhejein — aaj se 30 din ke andar.');
      const next = { ...draft, date };
      await save(conv, { step: 'CONFIRM', failedAttempts: 0, draft: next });
      return showSummary(phone, customer, next);
    }
    case 'CONFIRM': {
      if (text === 'C:NO' || ['no', 'nahi', 'n'].includes(lower)) {
        await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
        return sendWhatsAppText(TENANT, phone, '❌ Order cancel kar diya. Naye order ke liye "Hi" bhejein.');
      }
      if (text !== 'C:YES' && !['yes', 'haan', 'ha', 'y', 'confirm'].includes(lower)) {
        return retry(conv, phone, () => showSummary(phone, customer, draft), 'YES ya NO chunein.');
      }
      const effects = new Effects();
      try {
        await transaction((tx) =>
          createOrder(
            tx,
            systemActor(TENANT, `WhatsApp (${customer.name})`),
            {
              customerId: customer.id,
              source: 'WHATSAPP',
              items: (draft.productIds || []).map((id) => ({ productId: id, qty: draft.qtys?.[id] || 0 })),
              requestedDeliveryDate: draft.date,
            },
            effects
          )
        );
      } catch (error) {
        await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
        const message = error instanceof ApiError ? error.message : 'Order save nahi ho paya.';
        return sendWhatsAppText(TENANT, phone, `⚠️ ${message}\n${await supportText()}`);
      }
      await save(conv, { step: 'IDLE', failedAttempts: 0, draft: null });
      // The ORDER_RECEIVED template (sent after commit) is the confirmation.
      effects.schedule();
      return;
    }
    default:
      await save(conv, { step: 'MENU', failedAttempts: 0, draft: null });
      return showMenu(phone, customer);
  }
}
