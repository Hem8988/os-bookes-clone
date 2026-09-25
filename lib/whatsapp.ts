// Outbound notification templates (SRS §13.3). The body text is used for
// session messages; `variables` gives the parameter order when a Meta
// pre-approved template name is configured in the admin panel.

export interface TemplateDefinition {
  key: string;
  name: string;
  trigger: string;
  body: string;
  variables: string[];
}

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    key: 'ORDER_RECEIVED',
    name: 'Order Received',
    trigger: 'Order created (WhatsApp / manual)',
    body: 'Namaste {{customerName}}, aapka order {{orderNumber}} mil gaya hai.\n{{items}}\nDelivery date: {{deliveryDate}}\n— {{companyName}}',
    variables: ['customerName', 'orderNumber', 'items', 'deliveryDate', 'companyName'],
  },
  {
    key: 'ORDER_APPROVED',
    name: 'Order Approved',
    trigger: 'Manager/Admin approves',
    body: 'Order {{orderNumber}} approve ho gaya hai. Delivery date: {{deliveryDate}}.\n— {{companyName}}',
    variables: ['orderNumber', 'deliveryDate', 'companyName'],
  },
  {
    key: 'ORDER_REJECTED',
    name: 'Order Rejected',
    trigger: 'Manager/Admin rejects',
    body: 'Order {{orderNumber}} approve nahi ho saka.\nReason: {{reason}}\nSupport: {{supportPhone}}\n— {{companyName}}',
    variables: ['orderNumber', 'reason', 'supportPhone', 'companyName'],
  },
  {
    key: 'DELIVERY_ASSIGNED',
    name: 'Delivery Assigned',
    trigger: 'Delivery boy assigned',
    body: 'Order {{orderNumber}} ke liye delivery partner {{deliveryBoyName}} assign kiya gaya hai. Date: {{deliveryDate}}.\n— {{companyName}}',
    variables: ['orderNumber', 'deliveryBoyName', 'deliveryDate', 'companyName'],
  },
  {
    key: 'OUT_FOR_DELIVERY',
    name: 'Out for Delivery',
    trigger: 'Delivery boy starts route',
    body: 'Aapka order {{orderNumber}} delivery ke liye nikal chuka hai. Delivery partner: {{deliveryBoyName}}.\n— {{companyName}}',
    variables: ['orderNumber', 'deliveryBoyName', 'companyName'],
  },
  {
    key: 'DELIVERY_COMPLETED',
    name: 'Delivery Completed',
    trigger: 'Delivery boy submits delivery',
    body: 'Delivery {{deliveryNumber}} complete.\nDelivered: {{deliveredQty}} | Empty received: {{emptyQty}}\nPayment: {{paymentSummary}}\nOutstanding: Rs {{outstanding}}\n— {{companyName}}',
    variables: ['deliveryNumber', 'deliveredQty', 'emptyQty', 'paymentSummary', 'outstanding', 'companyName'],
  },
  {
    key: 'PAYMENT_RECEIVED',
    name: 'Payment Received',
    trigger: 'Accountant verifies a payment',
    body: 'Payment received: Rs {{amount}} ({{mode}}).\nUpdated outstanding: Rs {{outstanding}}\nReceipt: {{paymentNumber}}\n— {{companyName}}',
    variables: ['amount', 'mode', 'outstanding', 'paymentNumber', 'companyName'],
  },
  {
    key: 'INVOICE',
    name: 'Invoice',
    trigger: 'Delivery verified / invoice created',
    body: 'Invoice {{invoiceNumber}} dated {{date}} for Rs {{amount}}.\nPaid: Rs {{paid}} | Outstanding: Rs {{outstanding}}\n{{link}}\n— {{companyName}}',
    variables: ['invoiceNumber', 'date', 'amount', 'paid', 'outstanding', 'link', 'companyName'],
  },
  {
    key: 'OUTSTANDING_REMINDER',
    name: 'Outstanding Reminder',
    trigger: 'Weekly scheduled job',
    body: 'Namaste {{customerName}}, aapka current outstanding Rs {{outstanding}} hai. Payment terms: {{paymentTerms}}.\nSupport: {{supportPhone}}\n— {{companyName}}',
    variables: ['customerName', 'outstanding', 'paymentTerms', 'supportPhone', 'companyName'],
  },
  {
    key: 'EMPTY_CYLINDER_REMINDER',
    name: 'Empty Cylinder Reminder',
    trigger: 'Empty cylinders overdue (Books → Reports → Empty cylinders)',
    body: 'Namaste {{customerName}}, aapke paas hamare {{cylinders}} cylinder {{days}} din se hain. Kripya khali cylinder wapas kar dein ya humein bata dein.\nSupport: {{supportPhone}}\n— {{companyName}}',
    variables: ['customerName', 'cylinders', 'days', 'supportPhone', 'companyName'],
  },
  {
    key: 'REFILL_REMINDER',
    name: 'Refill Reminder',
    trigger: 'Customer is due for a refill (auto-reorder)',
    body: 'Namaste {{customerName}}, aapka {{items}} ka refill due hai. Order karne ke liye is message ka reply karein ya app se order karein.\nSupport: {{supportPhone}}\n— {{companyName}}',
    variables: ['customerName', 'items', 'supportPhone', 'companyName'],
  },
  {
    key: 'MONTHLY_STATEMENT',
    name: 'Monthly Statement',
    trigger: 'Monthly statement job (Settings → Operations)',
    body: 'Namaste {{customerName}}, {{month}} ka statement:\nOpening: Rs {{opening}}\nBills: Rs {{billed}}\nPaid: Rs {{paid}}\nClosing balance: Rs {{closing}}\n{{link}}\n— {{companyName}}',
    variables: ['customerName', 'month', 'opening', 'billed', 'paid', 'closing', 'link', 'companyName'],
  },
  {
    key: 'OTP',
    name: 'OTP / Account Activation',
    trigger: 'Login OTP or onboarding',
    body: 'Your {{companyName}} verification code is {{code}}. It is valid for 10 minutes. Do not share it with anyone.',
    variables: ['companyName', 'code'],
  },
];

export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
