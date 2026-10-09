// Outbound notification templates (SRS §13.3). The body text is used for
// session messages; `variables` gives the parameter order when a Meta
// pre-approved template name is configured in the admin panel.
//
// Layout (like a billing-app invoice message): an optional image `card` on top
// (big amount / number with a status pill), the greeting body, and an optional
// link `button` (e.g. View Invoice) under it.

/** Image header: label, big value and a status pill. Text fields may use {{placeholders}}. */
export interface TemplateCard {
  label: string;
  /** Variable shown big (amount or number). */
  value: string;
  /** Prefix ₹ to the value. */
  money?: boolean;
  badge?: string;
  note?: string;
}

/** Link button under the message; `url` is the variable holding the link (skipped when empty). */
export interface TemplateButton {
  label: string;
  url: string;
}

export interface TemplateDefinition {
  key: string;
  name: string;
  trigger: string;
  body: string;
  variables: string[];
  card?: TemplateCard;
  button?: TemplateButton;
  /** Short SMS version (register this exact text on DLT). Plain ASCII, so it bills as a normal SMS. */
  sms: string;
}

const SIGN_OFF = '\n\nHappy to serve you\n{{companyName}}';

/** Placeholders in the order they appear (Meta template parameter order). */
export const placeholdersOf = (text: string) => [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];

const template = (t: Omit<TemplateDefinition, 'variables'>): TemplateDefinition => ({ ...t, variables: placeholdersOf(t.body) });

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  template({
    key: 'ORDER_RECEIVED',
    name: 'Order Received',
    trigger: 'Order created (WhatsApp / manual)',
    sms: 'Dear {{customerName}}, your order {{orderNumber}} is received. Delivery date {{deliveryDate}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nThank you for your order!\n\nWe have received it. Check the details below\n\nOrder No: {{orderNumber}}\nItems: {{items}}\nDelivery Date: {{deliveryDate}}\n\nWe will confirm it shortly.${SIGN_OFF}`,
    card: { label: 'Order Received', value: 'orderNumber', badge: 'Received', note: 'Delivery : {{deliveryDate}}' },
  }),
  template({
    key: 'ORDER_APPROVED',
    name: 'Order Approved',
    trigger: 'Manager/Admin approves',
    sms: 'Dear {{customerName}}, your order {{orderNumber}} is confirmed for {{deliveryDate}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nGood news! Your order is confirmed.\n\nOrder No: {{orderNumber}}\nDelivery Date: {{deliveryDate}}${SIGN_OFF}`,
    card: { label: 'Order Confirmed', value: 'orderNumber', badge: 'Confirmed', note: 'Delivery : {{deliveryDate}}' },
  }),
  template({
    key: 'ORDER_REJECTED',
    name: 'Order Rejected',
    trigger: 'Manager/Admin rejects',
    sms: 'Dear {{customerName}}, your order {{orderNumber}} could not be accepted: {{reason}}. Call {{supportPhone}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nSorry, we could not accept your order.\n\nOrder No: {{orderNumber}}\nReason: {{reason}}\n\nFor help, call us on {{supportPhone}}.${SIGN_OFF}`,
  }),
  template({
    key: 'DELIVERY_ASSIGNED',
    name: 'Delivery Assigned',
    trigger: 'Delivery boy assigned',
    sms: 'Dear {{customerName}}, order {{orderNumber}} will be delivered by {{deliveryBoyName}} on {{deliveryDate}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nYour order is scheduled for delivery.\n\nOrder No: {{orderNumber}}\nDelivery Partner: {{deliveryBoyName}}\nDelivery Date: {{deliveryDate}}${SIGN_OFF}`,
    card: { label: 'Delivery Scheduled', value: 'orderNumber', badge: 'Scheduled', note: 'Delivery : {{deliveryDate}}' },
  }),
  template({
    key: 'OUT_FOR_DELIVERY',
    name: 'Out for Delivery',
    trigger: 'Delivery boy starts route',
    sms: 'Dear {{customerName}}, your order {{orderNumber}} is out for delivery with {{deliveryBoyName}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nYour order is on the way!\n\nOrder No: {{orderNumber}}\nDelivery Partner: {{deliveryBoyName}}\n\nPlease keep the empty cylinders ready.${SIGN_OFF}`,
    card: { label: 'Out for Delivery', value: 'orderNumber', badge: 'On the way', note: 'Partner : {{deliveryBoyName}}' },
  }),
  template({
    key: 'DELIVERY_COMPLETED',
    name: 'Delivery Completed',
    trigger: 'Delivery boy submits delivery',
    sms: 'Dear {{customerName}}, delivery {{deliveryNumber}} done: {{deliveredQty}} delivered, {{emptyQty}} empty received. Outstanding Rs {{outstanding}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nYour delivery is complete. Check the details below\n\nDelivery No: {{deliveryNumber}}\nCylinders Delivered: {{deliveredQty}}\nEmpty Received: {{emptyQty}}\nPayment: {{paymentSummary}}\nBalance Outstanding: ₹{{outstanding}}${SIGN_OFF}`,
    card: { label: 'Cylinders Delivered', value: 'deliveredQty', badge: 'Delivered', note: 'Delivery No : {{deliveryNumber}}' },
  }),
  template({
    key: 'PAYMENT_RECEIVED',
    name: 'Payment Received',
    trigger: 'Accountant verifies a payment',
    sms: 'Dear {{customerName}}, payment of Rs {{amount}} ({{mode}}) received. Receipt {{paymentNumber}}. Outstanding Rs {{outstanding}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nThank you for your payment!\n\nReceipt No: {{paymentNumber}}\nAmount Paid: ₹{{amount}}\nMode: {{mode}}\nBalance Outstanding: ₹{{outstanding}}${SIGN_OFF}`,
    card: { label: 'Amount Paid', value: 'amount', money: true, badge: 'Received', note: 'Receipt : {{paymentNumber}}' },
  }),
  template({
    key: 'INVOICE',
    name: 'Invoice',
    trigger: 'Delivery verified / invoice created',
    sms: 'Dear {{customerName}}, invoice {{invoiceNumber}} for Rs {{amount}} is ready. Balance due Rs {{due}}. View: {{link}} - {{companyName}}',
    body: `Hey {{customerName}},\n\nThank you for your business\n\nYour Sales Invoice is ready! Check the details below\n\nSales Invoice No: {{invoiceNumber}}\nInvoice Amount: ₹{{amount}}\nBalance Due: ₹{{due}}\n\nClick the 'View Invoice' button to view your invoice${SIGN_OFF}`,
    card: { label: 'Amount Paid', value: 'paid', money: true, badge: '{{paymentStatus}}', note: 'Invoice Date : {{date}}' },
    button: { label: 'View Invoice', url: 'link' },
  }),
  template({
    key: 'OUTSTANDING_REMINDER',
    name: 'Outstanding Reminder',
    trigger: 'Weekly scheduled job',
    sms: 'Dear {{customerName}}, your outstanding balance is Rs {{outstanding}}. Please pay at the earliest. Call {{supportPhone}}. - {{companyName}}',
    body: `Hey {{customerName}},\n\nThis is a gentle reminder about your pending balance.\n\nBalance Outstanding: ₹{{outstanding}}\nPayment Terms: {{paymentTerms}}\n\nPlease clear it at the earliest. For help, call us on {{supportPhone}}.${SIGN_OFF}`,
    card: { label: 'Balance Due', value: 'outstanding', money: true, badge: 'Payment Due', note: 'Terms : {{paymentTerms}}' },
    button: { label: 'View Account', url: 'portalLink' },
  }),
  template({
    key: 'EMPTY_CYLINDER_REMINDER',
    name: 'Empty Cylinder Reminder',
    trigger: 'Empty cylinders overdue (Books → Reports → Empty cylinders)',
    sms: 'Dear {{customerName}}, {{cylinders}} of our cylinders are with you for {{days}} days. Please return the empties. - {{companyName}}',
    body: `Hey {{customerName}},\n\n{{cylinders}} of our cylinders have been with you for {{days}} days.\n\nPlease return the empty cylinders, or let us know if you still need them. For help, call us on {{supportPhone}}.${SIGN_OFF}`,
    card: { label: 'Cylinders with you', value: 'cylinders', badge: '{{days}} days', note: 'Please return the empties' },
  }),
  template({
    key: 'REFILL_REMINDER',
    name: 'Refill Reminder',
    trigger: 'Customer is due for a refill (auto-reorder)',
    sms: 'Dear {{customerName}}, your refill is due: {{items}}. Reply or call {{supportPhone}} to order. - {{companyName}}',
    body: `Hey {{customerName}},\n\nYour refill is due: {{items}}\n\nReply to this message or tap 'Order Now' to book it. For help, call us on {{supportPhone}}.${SIGN_OFF}`,
    button: { label: 'Order Now', url: 'portalLink' },
  }),
  template({
    key: 'MONTHLY_STATEMENT',
    name: 'Monthly Statement',
    trigger: 'Monthly statement job (Settings → Operations)',
    sms: 'Dear {{customerName}}, your {{month}} statement: closing balance Rs {{closing}}. View: {{link}} - {{companyName}}',
    body: `Hey {{customerName}},\n\nYour statement for {{month}} is ready.\n\nOpening Balance: ₹{{opening}}\nBills: ₹{{billed}}\nPaid: ₹{{paid}}\nClosing Balance: ₹{{closing}}\n\nClick the 'View Statement' button to see all entries${SIGN_OFF}`,
    card: { label: 'Closing Balance', value: 'closing', money: true, badge: '{{month}}', note: 'Monthly Statement' },
    button: { label: 'View Statement', url: 'link' },
  }),
  // Also sent by SMS (MSG91 template): keep it short and plain.
  template({
    key: 'OTP',
    name: 'OTP / Account Activation',
    trigger: 'Login OTP or onboarding',
    sms: 'Your {{companyName}} verification code is {{code}}. It is valid for 10 minutes. Do not share it with anyone.',
    body: 'Your {{companyName}} verification code is {{code}}. It is valid for 10 minutes. Do not share it with anyone.',
  }),
];

/** Example values for the admin preview. */
export const SAMPLE_VARS: Record<string, string> = {
  customerName: 'M/S. PRAMUKH INDANE',
  companyName: 'NEHRA ENTERPRISES',
  supportPhone: '98765 43210',
  orderNumber: 'ORD-1024',
  items: '2 × 19 kg Commercial',
  deliveryDate: '08-10-2026',
  reason: 'Credit limit crossed',
  deliveryBoyName: 'Ramesh',
  deliveryNumber: 'DLV-2210',
  deliveredQty: '2',
  emptyQty: '2',
  paymentSummary: 'Cash ₹3,300',
  outstanding: '0',
  amount: '3,300',
  mode: 'CASH',
  paymentNumber: 'RCP-512',
  invoiceNumber: 'BL/2026/7023114',
  date: '08-10-2026',
  paid: '3,300',
  due: '0',
  paymentStatus: 'Fully Paid',
  link: 'https://example.com/customer?invoice=1',
  portalLink: 'https://example.com/customer',
  paymentTerms: 'NET 15',
  cylinders: '4',
  days: '21',
  month: 'September 2026',
  opening: '12,000',
  billed: '9,900',
  closing: '8,400',
  code: '482913',
};

export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/** The card's texts filled in (null when the template has no card or its value is empty). */
export function renderCard(card: TemplateCard | undefined, vars: Record<string, string | number | null | undefined>) {
  if (!card) return null;
  const raw = vars[card.value];
  if (raw === undefined || raw === null || raw === '') return null;
  return {
    label: renderTemplate(card.label, vars),
    value: card.money ? `₹${raw}` : String(raw),
    badge: card.badge ? renderTemplate(card.badge, vars) : '',
    note: card.note ? renderTemplate(card.note, vars) : '',
  };
}
